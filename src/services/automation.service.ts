import cron from 'node-cron';
import pool from '../config/database';
import { emailService } from './email.service';

// ── Helper: create in-app notification ─────────────────────────────────────
async function createNotification(tenantId: number, title: string, message: string, type: string, link?: string) {
  try {
    const users = await pool.query('SELECT user_id FROM users WHERE tenant_id=$1 AND status=$2', [tenantId, 'active']);
    for (const u of users.rows) {
      await pool.query(
        'INSERT INTO app_notifications (user_id, tenant_id, title, message, type, link) VALUES ($1,$2,$3,$4,$5,$6)',
        [u.user_id, tenantId, title, message, type, link || null]
      );
    }
  } catch (e: any) { console.error('[Automation] Notification error:', e.message); }
}

// ── Helper: get all active tenants ─────────────────────────────────────────
async function getActiveTenants(): Promise<number[]> {
  const r = await pool.query('SELECT tenant_id FROM tenants WHERE is_active=true');
  return r.rows.map((r: any) => r.tenant_id);
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. PAYROLL AUTO-RUN
// Runs on last day of every month at 9 AM
// ══════════════════════════════════════════════════════════════════════════════
async function autoRunPayroll() {
  console.log('[AutoPayroll] Starting monthly payroll run...');
  try {
    const tenants = await getActiveTenants();
    for (const tenantId of tenants) {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Check if payroll already run this month
      const existing = await pool.query(
        'SELECT run_id FROM payroll_runs WHERE tenant_id=$1 AND month=$2 AND year=$3',
        [tenantId, month, year]
      );
      if (existing.rows.length > 0) {
        console.log(`[AutoPayroll] Tenant ${tenantId}: already run for ${month}/${year}`);
        continue;
      }

      // Get active employees
      const employees = await pool.query(
        'SELECT * FROM employees WHERE tenant_id=$1 AND status=$2',
        [tenantId, 'Active']
      );
      if (!employees.rows.length) continue;

      // Calculate totals
      const totalGross = employees.rows.reduce((sum: number, e: any) => sum + parseFloat(e.salary), 0);
      const totalDeductions = Math.round(totalGross * 0.15);
      const totalNet = totalGross - totalDeductions;

      // Create payroll run
      const run = await pool.query(
        'INSERT INTO payroll_runs (tenant_id,month,year,total_gross,total_net,total_deductions,employee_count,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING run_id',
        [tenantId, month, year, totalGross, totalNet, totalDeductions, employees.rows.length, 'Completed']
      );
      const runId = run.rows[0].run_id;

      // Create payslips
      for (const emp of employees.rows) {
        const gross = parseFloat(emp.salary);
        const pf = Math.round(gross * 0.08);
        const tax = Math.round(gross * 0.07);
        const ded = pf + tax;
        await pool.query(
          'INSERT INTO payslips (run_id,employee_name,department,gross_pay,basic_pay,hra,pf_deduction,tax_deduction,total_deductions,net_pay) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
          [runId, emp.name, emp.department, gross, Math.round(gross*0.5), Math.round(gross*0.3), pf, tax, ded, gross-ded]
        );
      }

      // Notify HR and Finance
      await createNotification(tenantId,
        '✅ Payroll Auto-Run Complete',
        `Payroll for ${now.toLocaleString('en-IN',{month:'long'})} ${year} processed for ${employees.rows.length} employees. Total: ₹${totalNet.toLocaleString('en-IN')}`,
        'success', '/payroll'
      );
      console.log(`[AutoPayroll] Tenant ${tenantId}: payroll run ${runId} created for ${month}/${year}`);
    }
  } catch (e: any) { console.error('[AutoPayroll] Error:', e.message); }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. CONTRACT EXPIRY ALERTS
// Runs daily at 8 AM — alerts for contracts expiring in 30, 15, 7 days
// ══════════════════════════════════════════════════════════════════════════════
async function checkContractExpiry() {
  console.log('[ContractAlert] Checking contract expiry...');
  try {
    const tenants = await getActiveTenants();
    for (const tenantId of tenants) {
      const result = await pool.query(
        `SELECT * FROM contracts WHERE tenant_id=$1 AND status='Active'
         AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
         ORDER BY end_date ASC`,
        [tenantId]
      );
      for (const contract of result.rows) {
        const daysLeft = Math.ceil((new Date(contract.end_date).getTime() - Date.now()) / 86400000);
        let urgency = daysLeft <= 7 ? 'error' : daysLeft <= 15 ? 'warning' : 'info';
        await createNotification(tenantId,
          `⚠️ Contract Expiring in ${daysLeft} Days`,
          `"${contract.contract_name}" with ${contract.vendor_name} expires on ${new Date(contract.end_date).toLocaleDateString('en-IN')}. Value: ₹${parseFloat(contract.value).toLocaleString('en-IN')}`,
          urgency, '/contract-mgmt'
        );
      }
      if (result.rows.length > 0)
        console.log(`[ContractAlert] Tenant ${tenantId}: ${result.rows.length} contracts expiring soon`);
    }
  } catch (e: any) { console.error('[ContractAlert] Error:', e.message); }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. BUDGET OVERRUN ALERTS
// Runs daily at 7 AM — alerts when spend > 80% or > 100% of budget
// ══════════════════════════════════════════════════════════════════════════════
async function checkBudgetOverruns() {
  console.log('[BudgetAlert] Checking budget utilisation...');
  try {
    const tenants = await getActiveTenants();
    for (const tenantId of tenants) {
      const result = await pool.query(
        `SELECT *, ROUND((spent_amount/NULLIF(allocated_amount,0)*100)::numeric, 1) as utilisation_pct
         FROM budgets WHERE tenant_id=$1 AND status='Active' AND allocated_amount > 0`,
        [tenantId]
      );
      for (const budget of result.rows) {
        const pct = parseFloat(budget.utilisation_pct);
        if (pct >= 100) {
          await createNotification(tenantId,
            '🚨 Budget Exceeded',
            `${budget.department} budget has been exceeded! Spent ₹${parseFloat(budget.spent_amount).toLocaleString('en-IN')} of ₹${parseFloat(budget.allocated_amount).toLocaleString('en-IN')} (${pct}%)`,
            'error', '/budget-mgmt'
          );
        } else if (pct >= 80) {
          await createNotification(tenantId,
            '⚠️ Budget Warning',
            `${budget.department} has used ${pct}% of budget. ₹${(parseFloat(budget.allocated_amount)-parseFloat(budget.spent_amount)).toLocaleString('en-IN')} remaining.`,
            'warning', '/budget-mgmt'
          );
        }
      }
    }
  } catch (e: any) { console.error('[BudgetAlert] Error:', e.message); }
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. LOW STOCK ALERTS
// Runs daily at 7 AM — alerts when stock <= minimum
// ══════════════════════════════════════════════════════════════════════════════
async function checkLowStock() {
  console.log('[StockAlert] Checking inventory levels...');
  try {
    const tenants = await getActiveTenants();
    for (const tenantId of tenants) {
      const result = await pool.query(
        `SELECT * FROM inventory_items WHERE tenant_id=$1 AND current_stock <= minimum_stock AND status='Active'`,
        [tenantId]
      );
      if (!result.rows.length) continue;
      const outOfStock = result.rows.filter((i: any) => i.current_stock === 0);
      const lowStock = result.rows.filter((i: any) => i.current_stock > 0);
      if (outOfStock.length > 0) {
        await createNotification(tenantId,
          `🚨 ${outOfStock.length} Items Out of Stock`,
          `Out of stock: ${outOfStock.slice(0,3).map((i: any) => i.item_name).join(', ')}${outOfStock.length > 3 ? ` and ${outOfStock.length-3} more` : ''}`,
          'error', '/inventory-mgmt'
        );
      }
      if (lowStock.length > 0) {
        await createNotification(tenantId,
          `⚠️ ${lowStock.length} Items Running Low`,
          `Low stock: ${lowStock.slice(0,3).map((i: any) => i.item_name).join(', ')}${lowStock.length > 3 ? ` and ${lowStock.length-3} more` : ''}`,
          'warning', '/inventory-mgmt'
        );
      }
    }
  } catch (e: any) { console.error('[StockAlert] Error:', e.message); }
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. LEAVE PENDING APPROVAL ALERTS
// Runs every weekday at 9 AM — reminds managers of pending leave requests
// ══════════════════════════════════════════════════════════════════════════════
async function checkPendingLeaves() {
  console.log('[LeaveAlert] Checking pending leaves...');
  try {
    const tenants = await getActiveTenants();
    for (const tenantId of tenants) {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM leave_requests WHERE tenant_id=$1 AND status='Pending'`,
        [tenantId]
      );
      const count = parseInt(result.rows[0].count);
      if (count > 0) {
        await createNotification(tenantId,
          `📋 ${count} Leave Request${count > 1 ? 's' : ''} Pending Approval`,
          `${count} leave request${count > 1 ? 's are' : ' is'} awaiting approval. Please review and action.`,
          'info', '/leave-mgmt'
        );
      }
    }
  } catch (e: any) { console.error('[LeaveAlert] Error:', e.message); }
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. OVERDUE HELPDESK TICKETS
// Runs daily at 10 AM — alerts for tickets open > 48 hours
// ══════════════════════════════════════════════════════════════════════════════
async function checkOverdueTickets() {
  console.log('[TicketAlert] Checking overdue tickets...');
  try {
    const tenants = await getActiveTenants();
    for (const tenantId of tenants) {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM helpdesk_tickets
         WHERE tenant_id=$1 AND status IN ('Open','In Progress')
         AND created_at < NOW() - INTERVAL '48 hours'`,
        [tenantId]
      );
      const count = parseInt(result.rows[0].count);
      if (count > 0) {
        await createNotification(tenantId,
          `🔴 ${count} Overdue Support Ticket${count > 1 ? 's' : ''}`,
          `${count} ticket${count > 1 ? 's have' : ' has'} been open for more than 48 hours. Immediate attention required.`,
          'error', '/helpdesk'
        );
      }
    }
  } catch (e: any) { console.error('[TicketAlert] Error:', e.message); }
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. WARRANTY EXPIRY ALERTS
// Runs weekly on Monday at 8 AM
// ══════════════════════════════════════════════════════════════════════════════
async function checkWarrantyExpiry() {
  console.log('[WarrantyAlert] Checking asset warranties...');
  try {
    const tenants = await getActiveTenants();
    for (const tenantId of tenants) {
      const result = await pool.query(
        `SELECT * FROM assets WHERE tenant_id=$1
         AND warranty_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
         AND status='Active'`,
        [tenantId]
      );
      if (!result.rows.length) continue;
      await createNotification(tenantId,
        `⚠️ ${result.rows.length} Asset Warrant${result.rows.length > 1 ? 'ies' : 'y'} Expiring Soon`,
        `Warranties expiring: ${result.rows.slice(0,3).map((a: any) => a.asset_name).join(', ')}${result.rows.length > 3 ? ` and ${result.rows.length-3} more` : ''}`,
        'warning', '/asset-mgmt'
      );
    }
  } catch (e: any) { console.error('[WarrantyAlert] Error:', e.message); }
}

// ══════════════════════════════════════════════════════════════════════════════
// 8. RISK OVERDUE ACTIONS
// Runs every Monday at 9 AM
// ══════════════════════════════════════════════════════════════════════════════
async function checkOverdueRisks() {
  console.log('[RiskAlert] Checking overdue risk actions...');
  try {
    const tenants = await getActiveTenants();
    for (const tenantId of tenants) {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM risks
         WHERE tenant_id=$1 AND status IN ('Open','In Progress')
         AND due_date < CURRENT_DATE`,
        [tenantId]
      );
      const count = parseInt(result.rows[0].count);
      if (count > 0) {
        await createNotification(tenantId,
          `🚨 ${count} Overdue Risk Action${count > 1 ? 's' : ''}`,
          `${count} risk mitigation action${count > 1 ? 's are' : ' is'} past due date. Review immediately.`,
          'error', '/risk-mgmt'
        );
      }
    }
  } catch (e: any) { console.error('[RiskAlert] Error:', e.message); }
}

// ══════════════════════════════════════════════════════════════════════════════
// 9. MONTHLY EMAIL REPORT TO ADMIN
// Runs on 1st of every month at 6 AM
// ══════════════════════════════════════════════════════════════════════════════
async function sendMonthlyEmailReport() {
  console.log('[MonthlyReport] Sending monthly summary emails...');
  try {
    const tenants = await getActiveTenants();
    for (const tenantId of tenants) {
      const tenant = await pool.query('SELECT * FROM tenants WHERE tenant_id=$1', [tenantId]);
      const admins = await pool.query(
        'SELECT email, first_name FROM users WHERE tenant_id=$1 AND role_id=1 AND status=$2',
        [tenantId, 'active']
      );
      if (!admins.rows.length) continue;

      // Gather stats
      const [empR, orderR, expR, ticketR] = await Promise.all([
        pool.query('SELECT COUNT(*) as c FROM employees WHERE tenant_id=$1 AND status=$2', [tenantId,'Active']),
        pool.query('SELECT COUNT(*) as c, COALESCE(SUM(total_amount),0) as rev FROM orders WHERE tenant_id=$1 AND order_date >= date_trunc($2, CURRENT_DATE)', [tenantId,'month']),
        pool.query('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE tenant_id=$1 AND expense_date >= date_trunc($2, CURRENT_DATE)', [tenantId,'month']),
        pool.query('SELECT COUNT(*) as c FROM helpdesk_tickets WHERE tenant_id=$1 AND status=$2', [tenantId,'Open']),
      ]);

      const now = new Date();
      const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

      for (const admin of admins.rows) {
        await emailService.send({
          to: admin.email,
          subject: `📊 Monthly Summary — ${monthName} | ${tenant.rows[0]?.tenant_name}`,
          html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
            <h1 style="color:#60a5fa;margin-bottom:4px;">📊 Monthly Business Summary</h1>
            <p style="color:#94a3b8;margin-top:0;">${monthName} | ${tenant.rows[0]?.tenant_name}</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0;">
              <div style="background:#1e293b;border-radius:8px;padding:16px;border-left:4px solid #10b981;">
                <div style="color:#94a3b8;font-size:12px;">ACTIVE EMPLOYEES</div>
                <div style="font-size:28px;font-weight:bold;color:#10b981;">${empR.rows[0].c}</div>
              </div>
              <div style="background:#1e293b;border-radius:8px;padding:16px;border-left:4px solid #3b82f6;">
                <div style="color:#94a3b8;font-size:12px;">MONTHLY REVENUE</div>
                <div style="font-size:28px;font-weight:bold;color:#3b82f6;">₹${parseFloat(orderR.rows[0].rev).toLocaleString('en-IN')}</div>
              </div>
              <div style="background:#1e293b;border-radius:8px;padding:16px;border-left:4px solid #f59e0b;">
                <div style="color:#94a3b8;font-size:12px;">TOTAL EXPENSES</div>
                <div style="font-size:28px;font-weight:bold;color:#f59e0b;">₹${parseFloat(expR.rows[0].total).toLocaleString('en-IN')}</div>
              </div>
              <div style="background:#1e293b;border-radius:8px;padding:16px;border-left:4px solid #ef4444;">
                <div style="color:#94a3b8;font-size:12px;">OPEN TICKETS</div>
                <div style="font-size:28px;font-weight:bold;color:#ef4444;">${ticketR.rows[0].c}</div>
              </div>
            </div>
            <a href="https://finance-frontend-2l6b.onrender.com/live-dashboard"
               style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">
              View Full Dashboard →
            </a>
            <p style="color:#475569;font-size:12px;margin-top:24px;">Deemona Enterprise Suite — Automated Monthly Report</p>
          </div>`
        });
      }
      console.log(`[MonthlyReport] Sent to ${admins.rows.length} admins for tenant ${tenantId}`);
    }
  } catch (e: any) { console.error('[MonthlyReport] Error:', e.message); }
}


// ══════════════════════════════════════════════════════════════════════════════
// WHATSAPP via TWILIO REST API
// ══════════════════════════════════════════════════════════════════════════════
export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const sid   = process.env.TWILIO_ACCOUNT_SID  || '';
  const token = process.env.TWILIO_AUTH_TOKEN   || '';
  const from  = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (!sid || !token) {
    console.log('[WhatsApp] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set');
    return false;
  }

  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  const toPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;

  try {
    const formData = [
      `From=${encodeURIComponent(from)}`,
      `To=${encodeURIComponent('whatsapp:' + toPhone)}`,
      `Body=${encodeURIComponent(message)}`
    ].join('&');

    const credentials = Buffer.from(`${sid}:${token}`).toString('base64');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const data = await res.json() as any;
    if (data.sid) {
      console.log(`[WhatsApp/Twilio] Sent to ${toPhone} - SID: ${data.sid}`);
      return true;
    } else {
      console.error('[WhatsApp/Twilio] Failed:', data.message || data.code || JSON.stringify(data));
      return false;
    }
  } catch (e: any) {
    console.error('[WhatsApp/Twilio] Exception:', e.message);
    return false;
  }
}

export async function sendLeaveApprovalWhatsApp(managerPhone: string, employeeName: string, leaveType: string, days: number, leaveId: number): Promise<boolean> {
  const message = `*Deemona ERP - Leave Approval Required*\n\nEmployee: *${employeeName}*\nLeave Type: ${leaveType}\nDuration: ${days} day(s)\n\nApprove/Reject: https://finance-frontend-2l6b.onrender.com/leave-mgmt\nLeave ID: ${leaveId}`;
  return sendWhatsApp(managerPhone, message);
}

export async function sendPOApprovalWhatsApp(managerPhone: string, supplierName: string, amount: number, poId: number): Promise<boolean> {
  const message = `*Deemona ERP - PO Approval Required*\n\nSupplier: *${supplierName}*\nAmount: *Rs.${amount.toLocaleString('en-IN')}*\n\nReview: https://finance-frontend-2l6b.onrender.com/supply-mgmt\nPO ID: ${poId}`;
  return sendWhatsApp(managerPhone, message);
}

export async function sendBudgetAlertWhatsApp(managerPhone: string, department: string, pct: number): Promise<boolean> {
  const message = `*Deemona ERP - Budget Alert*\n\nDepartment: *${department}*\nUtilisation: *${pct}%*\n\nImmediate action required.\nhttps://finance-frontend-2l6b.onrender.com/budget-mgmt`;
  return sendWhatsApp(managerPhone, message);
}