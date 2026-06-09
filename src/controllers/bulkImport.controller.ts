import { Request, Response } from 'express';
import pool from '../config/database';
const q = (n: number) => '$' + n;

const MODULE_TABLES: Record<string, {table: string, columns: string[]}> = {
  orders: { table: 'orders', columns: ['customer_name','customer_email','customer_phone','order_date','total_amount','status','payment_status','shipping_address'] },
  suppliers: { table: 'suppliers', columns: ['supplier_name','contact_person','email','phone','city','country','category','payment_terms'] },
  inventory: { table: 'inventory_items', columns: ['item_name','category','current_stock','minimum_stock','unit_price','unit'] },
  expenses: { table: 'expenses', columns: ['category','amount','description','expense_date','status'] },
  vendors: { table: 'vendors', columns: ['vendor_name','contact_person','email','phone','category','status'] },
  customers: { table: 'crm_customers', columns: ['company_name','contact_name','email','phone','industry','status'] }
};

export const bulkImportController = {
  getJobs: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const result = await pool.query('SELECT * FROM bulk_import_jobs WHERE created_by=' + q(1) + ' ORDER BY created_at DESC LIMIT 20', [userId]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getModules: async (req: Request, res: Response) => {
    const modules = Object.keys(MODULE_TABLES).map(key => ({
      module: key,
      table: MODULE_TABLES[key].table,
      columns: MODULE_TABLES[key].columns,
      sample: MODULE_TABLES[key].columns.join(',')
    }));
    res.json({ status: 'success', data: modules });
  },
  importData: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { module, data } = req.body;
      if (!MODULE_TABLES[module]) return res.status(400).json({ status: 'error', message: 'Invalid module' });
      const { table, columns } = MODULE_TABLES[module];
      const job = await pool.query(
        'INSERT INTO bulk_import_jobs (module, total_records, status, created_by, started_at) VALUES (' + q(1) + ',' + q(2) + ',' + "'processing'" + ',' + q(3) + ',NOW()) RETURNING *',
        [module, (data||[]).length, userId]
      );
      const jobId = job.rows[0].job_id;
      let processed = 0, failed = 0;
      const errors: any[] = [];
      for (const row of (data||[])) {
        try {
          const vals = columns.map(c => row[c] !== undefined ? row[c] : null);
          const placeholders = columns.map((_,i) => q(i+1)).join(',');
          await pool.query('INSERT INTO ' + table + ' (' + columns.join(',') + ') VALUES (' + placeholders + ')', vals);
          processed++;
        } catch (e) {
          failed++;
          errors.push({ row, error: String(e) });
        }
      }
      await pool.query(
        'UPDATE bulk_import_jobs SET processed_records=' + q(1) + ', failed_records=' + q(2) + ', error_log=' + q(3) + ', status=' + q(4) + ', completed_at=NOW() WHERE job_id=' + q(5),
        [processed, failed, JSON.stringify(errors.slice(0,10)), failed===0?'completed':'partial', jobId]
      );
      res.json({ status: 'success', data: { job_id: jobId, processed, failed, errors: errors.slice(0,5) } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  exportData: async (req: Request, res: Response) => {
    try {
      const { module } = req.params;
      if (!MODULE_TABLES[module]) return res.status(400).json({ status: 'error', message: 'Invalid module' });
      const { table } = MODULE_TABLES[module];
      const result = await pool.query('SELECT * FROM ' + table + ' LIMIT 1000');
      res.json({ status: 'success', data: result.rows, count: result.rows.length });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};