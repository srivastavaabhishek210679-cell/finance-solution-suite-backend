import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

const router = Router();
router.use(authenticate);

// Helper: convert array to CSV
function toCSV(rows: any[], columns?: string[]): string {
  if (!rows.length) return '';
  const cols = columns || Object.keys(rows[0]);
  const header = cols.join(',');
  const body = rows.map(row =>
    cols.map(col => {
      const val = row[col] ?? '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('\n') || str.includes('"') ? '"' + str + '"' : str;
    }).join(',')
  ).join('\n');
  return header + '\n' + body;
}

// Export any module data as CSV
router.get('/:module', async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const module = req.params.module;
    const format = (req.query.format as string || 'csv').toLowerCase();
    const startDate = req.query.start_date as string;
    const endDate = req.query.end_date as string;

    let rows: any[] = [];
    let filename = module;

    const dateFilter = (col: string) =>
      startDate && endDate ? ' AND ' + col + ' BETWEEN $2 AND $3' : '';
    const dateParams = (base: any[]) =>
      startDate && endDate ? [...base, startDate, endDate] : base;

    switch (module) {
      case 'orders':
        rows = (await pool.query(
          'SELECT order_number,customer_name,total_amount,tax_amount,status,payment_status,payment_method,order_date,delivery_date,shipping_address,notes FROM orders WHERE tenant_id=$1' + dateFilter('order_date') + ' ORDER BY order_date DESC',
          dateParams([db.id])
        )).rows;
        break;
      case 'expenses':
        rows = (await pool.query(
          'SELECT title,category,department,amount,expense_date,employee_name,payment_method,status,approved_by,notes FROM expenses WHERE tenant_id=$1' + dateFilter('expense_date') + ' ORDER BY expense_date DESC',
          dateParams([db.id])
        )).rows;
        break;
      case 'employees':
        rows = (await pool.query(
          'SELECT employee_code,first_name,last_name,email,phone,department,designation,employment_type,basic_salary,status,date_of_joining FROM employees WHERE tenant_id=$1 ORDER BY department,first_name',
          [db.id]
        )).rows;
        break;
      case 'invoices':
        rows = (await pool.query(
          'SELECT invoice_number,customer_name,customer_email,subtotal,tax_amount,total_amount,status,due_date,notes FROM generated_invoices WHERE tenant_id=$1' + dateFilter('created_at') + ' ORDER BY created_at DESC',
          dateParams([db.id])
        )).rows;
        break;
      case 'attendance':
        rows = (await pool.query(
          'SELECT employee_name,department,date,status,check_in,check_out,working_hours,overtime_hours FROM attendance_records WHERE tenant_id=$1' + dateFilter('date') + ' ORDER BY date DESC',
          dateParams([db.id])
        )).rows;
        break;
      case 'inventory':
        rows = (await pool.query(
          'SELECT item_name,item_code,category,unit,current_stock,minimum_stock,maximum_stock,unit_price,supplier,status FROM inventory_items WHERE tenant_id=$1 ORDER BY category,item_name',
          [db.id]
        )).rows;
        break;
      case 'vendors':
        rows = (await pool.query(
          'SELECT vendor_name,category,contact_person,email,phone,address,payment_terms,rating,status FROM vendors WHERE tenant_id=$1 ORDER BY vendor_name',
          [db.id]
        )).rows;
        break;
      case 'payroll':
        rows = (await pool.query(
          'SELECT month,year,total_gross,total_deductions,total_net,employee_count,status FROM payroll_runs WHERE tenant_id=$1 ORDER BY year DESC,month DESC',
          [db.id]
        )).rows;
        break;
      case 'leaves':
        rows = (await pool.query(
          'SELECT employee_name,leave_type,start_date,end_date,total_days,reason,status,approved_by FROM leave_requests WHERE tenant_id=$1' + dateFilter('start_date') + ' ORDER BY start_date DESC',
          dateParams([db.id])
        )).rows;
        break;
      case 'budgets':
        rows = (await pool.query(
          'SELECT department,allocated_amount,spent_amount,allocated_amount-spent_amount as remaining,period,fiscal_year,status FROM budgets WHERE tenant_id=$1 ORDER BY department',
          [db.id]
        )).rows;
        break;
      case 'contracts':
        rows = (await pool.query(
          'SELECT contract_name,contract_number,vendor_name,department,value,start_date,end_date,status FROM contracts WHERE tenant_id=$1 ORDER BY end_date',
          [db.id]
        )).rows;
        break;
      case 'risks':
        rows = (await pool.query(
          'SELECT risk_name,category,impact,likelihood,risk_score,owner,status,mitigation_plan FROM risks WHERE tenant_id=$1 ORDER BY risk_score DESC',
          [db.id]
        )).rows;
        break;
      case 'assets':
        rows = (await pool.query(
          'SELECT asset_name,asset_code,category,purchase_date,purchase_value,assigned_to,location,status FROM assets WHERE tenant_id=$1 ORDER BY category,asset_name',
          [db.id]
        )).rows;
        break;
      case 'crm':
        rows = (await pool.query(
          'SELECT company_name,contact_name,email,phone,industry,status,notes FROM customers WHERE tenant_id=$1 ORDER BY company_name',
          [db.id]
        )).rows;
        break;
      case 'deals':
        rows = (await pool.query(
          'SELECT deal_name,customer_name,deal_value,stage,probability,expected_close,assigned_to FROM deals WHERE tenant_id=$1 ORDER BY deal_value DESC',
          [db.id]
        )).rows;
        break;
      case 'helpdesk':
        rows = (await pool.query(
          'SELECT ticket_number,title,category,priority,status,requester_name,assigned_to,resolution,created_at FROM helpdesk_tickets WHERE tenant_id=$1 ORDER BY created_at DESC',
          [db.id]
        )).rows;
        break;
      case 'training':
        rows = (await pool.query(
          'SELECT employee_name,department,course_name,category,duration_hours,status,completion_date,score FROM training_enrollments WHERE tenant_id=$1 ORDER BY employee_name',
          [db.id]
        )).rows;
        break;
      default:
        return res.status(400).json({ status: 'error', message: 'Unknown module: ' + module + '. Supported: orders,expenses,employees,invoices,attendance,inventory,vendors,payroll,leaves,budgets,contracts,risks,assets,crm,deals,helpdesk,training' });
    }

    if (!rows.length) {
      return res.json({ status: 'success', message: 'No data to export', data: [] });
    }

    const date = new Date().toISOString().split('T')[0];
    filename = module + '-export-' + date;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=' + filename + '.json');
      return res.json({ status: 'success', exported_at: new Date(), count: rows.length, data: rows });
    }

    // Default CSV
    const csv = toCSV(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=' + filename + '.csv');
    res.send(csv);

  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Get export summary (what can be exported and record counts)
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const modules = [
      { module: 'orders', table: 'orders' },
      { module: 'expenses', table: 'expenses' },
      { module: 'employees', table: 'employees' },
      { module: 'invoices', table: 'generated_invoices' },
      { module: 'attendance', table: 'attendance_records' },
      { module: 'inventory', table: 'inventory_items' },
      { module: 'vendors', table: 'vendors' },
      { module: 'leaves', table: 'leave_requests' },
      { module: 'budgets', table: 'budgets' },
      { module: 'contracts', table: 'contracts' },
      { module: 'risks', table: 'risks' },
      { module: 'assets', table: 'assets' },
      { module: 'crm', table: 'customers' },
      { module: 'deals', table: 'deals' },
      { module: 'helpdesk', table: 'helpdesk_tickets' },
      { module: 'training', table: 'training_enrollments' },
    ];

    const counts = await Promise.all(
      modules.map(async m => {
        const r = await pool.query('SELECT COUNT(*) as c FROM ' + m.table + ' WHERE tenant_id=$1', [db.id]);
        return { module: m.module, records: parseInt(r.rows[0].c), url: '/api/v1/export/' + m.module + '?format=csv' };
      })
    );

    res.json({ status: 'success', data: counts });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

export default router;
