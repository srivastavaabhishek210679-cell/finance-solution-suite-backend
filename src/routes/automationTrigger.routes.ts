import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import pool from '../config/database';
import { emailService } from '../services/email.service';

const router = Router();
router.use(authenticate);

// Manual trigger for automation checks — for testing
router.post('/trigger/:job', async (req: Request, res: Response) => {
  const { job } = req.params;
  const tenantId = (req as any).user?.tenantId || 1;

  try {
    switch (job) {
      case 'contract-expiry': {
        const result = await pool.query(
          `SELECT * FROM contracts WHERE tenant_id=$1 AND status='Active'
           AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`,
          [tenantId]
        );
        for (const c of result.rows) {
          const days = Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000);
          const users = await pool.query('SELECT user_id FROM users WHERE tenant_id=$1 AND status=$2', [tenantId,'active']);
          for (const u of users.rows) {
            await pool.query(
              'INSERT INTO app_notifications (user_id,tenant_id,title,message,type,link) VALUES ($1,$2,$3,$4,$5,$6)',
              [u.user_id, tenantId, `⚠️ Contract Expiring in ${days} Days`,
               `"${c.contract_name}" with ${c.vendor_name} expires on ${new Date(c.end_date).toLocaleDateString('en-IN')}`,
               days <= 7 ? 'error' : 'warning', '/contract-mgmt']
            );
          }
        }
        return res.json({ status: 'success', message: `Contract expiry check done. Found ${result.rows.length} expiring contracts.` });
      }

      case 'budget-overrun': {
        const result = await pool.query(
          `SELECT *, ROUND((spent_amount/NULLIF(allocated_amount,0)*100)::numeric,1) as pct
           FROM budgets WHERE tenant_id=$1 AND status='Active' AND allocated_amount > 0`,
          [tenantId]
        );
        let alerts = 0;
        for (const b of result.rows) {
          const pct = parseFloat(b.pct);
          if (pct >= 80) {
            const users = await pool.query('SELECT user_id FROM users WHERE tenant_id=$1 AND status=$2', [tenantId,'active']);
            for (const u of users.rows) {
              await pool.query(
                'INSERT INTO app_notifications (user_id,tenant_id,title,message,type,link) VALUES ($1,$2,$3,$4,$5,$6)',
                [u.user_id, tenantId,
                 pct >= 100 ? '🚨 Budget Exceeded' : '⚠️ Budget Warning',
                 `${b.department} has used ${pct}% of budget. ₹${(parseFloat(b.allocated_amount)-parseFloat(b.spent_amount)).toLocaleString('en-IN')} remaining.`,
                 pct >= 100 ? 'error' : 'warning', '/budget-mgmt']
              );
            }
            alerts++;
          }
        }
        return res.json({ status: 'success', message: `Budget check done. ${alerts} alerts created.` });
      }

      case 'low-stock': {
        const result = await pool.query(
          `SELECT * FROM inventory_items WHERE tenant_id=$1 AND current_stock <= minimum_stock`,
          [tenantId]
        );
        if (result.rows.length > 0) {
          const users = await pool.query('SELECT user_id FROM users WHERE tenant_id=$1 AND status=$2', [tenantId,'active']);
          for (const u of users.rows) {
            await pool.query(
              'INSERT INTO app_notifications (user_id,tenant_id,title,message,type,link) VALUES ($1,$2,$3,$4,$5,$6)',
              [u.user_id, tenantId,
               `⚠️ ${result.rows.length} Items Low/Out of Stock`,
               `Low stock items: ${result.rows.slice(0,3).map((i: any) => i.item_name).join(', ')}${result.rows.length > 3 ? ` +${result.rows.length-3} more` : ''}`,
               'warning', '/inventory-mgmt']
            );
          }
        }
        return res.json({ status: 'success', message: `Stock check done. ${result.rows.length} items flagged.` });
      }

      case 'pending-leaves': {
        const result = await pool.query(
          `SELECT COUNT(*) as count FROM leave_requests WHERE tenant_id=$1 AND status='Pending'`,
          [tenantId]
        );
        const count = parseInt(result.rows[0].count);
        if (count > 0) {
          const users = await pool.query('SELECT user_id FROM users WHERE tenant_id=$1 AND status=$2', [tenantId,'active']);
          for (const u of users.rows) {
            await pool.query(
              'INSERT INTO app_notifications (user_id,tenant_id,title,message,type,link) VALUES ($1,$2,$3,$4,$5,$6)',
              [u.user_id, tenantId,
               `📋 ${count} Leave Request${count > 1 ? 's' : ''} Pending`,
               `${count} leave request${count > 1 ? 's are' : ' is'} awaiting your approval.`,
               'info', '/leave-mgmt']
            );
          }
        }
        return res.json({ status: 'success', message: `Leave check done. ${count} pending leaves.` });
      }

      case 'overdue-tickets': {
        const result = await pool.query(
          `SELECT COUNT(*) as count FROM helpdesk_tickets
           WHERE tenant_id=$1 AND status IN ('Open','In Progress')
           AND created_at < NOW() - INTERVAL '48 hours'`,
          [tenantId]
        );
        const count = parseInt(result.rows[0].count);
        if (count > 0) {
          const users = await pool.query('SELECT user_id FROM users WHERE tenant_id=$1 AND status=$2', [tenantId,'active']);
          for (const u of users.rows) {
            await pool.query(
              'INSERT INTO app_notifications (user_id,tenant_id,title,message,type,link) VALUES ($1,$2,$3,$4,$5,$6)',
              [u.user_id, tenantId,
               `🔴 ${count} Overdue Ticket${count > 1 ? 's' : ''}`,
               `${count} support ticket${count > 1 ? 's have' : ' has'} been open for over 48 hours.`,
               'error', '/helpdesk']
            );
          }
        }
        return res.json({ status: 'success', message: `Ticket check done. ${count} overdue.` });
      }

      case 'all': {
        // Run all checks
        const jobs = ['contract-expiry','budget-overrun','low-stock','pending-leaves','overdue-tickets'];
        const results: any[] = [];
        for (const j of jobs) {
          const r = await fetch(`http://localhost:${process.env.PORT||10000}/api/v1/automation/trigger/${j}`, {
            method: 'POST',
            headers: { 'Authorization': req.headers.authorization || '' }
          });
          const d = await r.json() as any;
          results.push({ job: j, result: d.message });
        }
        return res.json({ status: 'success', data: results });
      }

      default:
        return res.status(400).json({ status: 'error', message: `Unknown job: ${job}. Use: contract-expiry, budget-overrun, low-stock, pending-leaves, overdue-tickets, all` });
    }
  } catch (e: any) {
    return res.status(500).json({ status: 'error', message: e.message });
  }
});

// Get automation status
router.get('/status', async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || 1;
  try {
    const [contracts, budgets, stocks, leaves, tickets] = await Promise.all([
      pool.query(`SELECT COUNT(*) as c FROM contracts WHERE tenant_id=$1 AND status='Active' AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`, [tenantId]),
      pool.query(`SELECT COUNT(*) as c FROM budgets WHERE tenant_id=$1 AND spent_amount/NULLIF(allocated_amount,0)*100 >= 80`, [tenantId]),
      pool.query(`SELECT COUNT(*) as c FROM inventory_items WHERE tenant_id=$1 AND current_stock <= minimum_stock`, [tenantId]),
      pool.query(`SELECT COUNT(*) as c FROM leave_requests WHERE tenant_id=$1 AND status='Pending'`, [tenantId]),
      pool.query(`SELECT COUNT(*) as c FROM helpdesk_tickets WHERE tenant_id=$1 AND status IN ('Open','In Progress') AND created_at < NOW() - INTERVAL '48 hours'`, [tenantId]),
    ]);
    res.json({ status: 'success', data: {
      contracts_expiring_30d: parseInt(contracts.rows[0].c),
      budgets_over_80pct: parseInt(budgets.rows[0].c),
      low_stock_items: parseInt(stocks.rows[0].c),
      pending_leaves: parseInt(leaves.rows[0].c),
      overdue_tickets: parseInt(tickets.rows[0].c),
    }});
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

export default router;
