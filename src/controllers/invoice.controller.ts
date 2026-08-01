import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const invoiceController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM generated_invoices WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COALESCE(SUM(total_amount),0) as total_amount, COUNT(CASE WHEN status=$1 THEN 1 END) as paid, COUNT(CASE WHEN status=$2 THEN 1 END) as overdue, COUNT(CASE WHEN status=$3 THEN 1 END) as sent FROM generated_invoices WHERE tenant_id=$4',
        ['Paid', 'Overdue', 'Sent', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getById: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM generated_invoices WHERE invoice_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { customer_name, customer_email, due_date, subtotal, tax_percent, tax_amount, total_amount, notes, terms } = req.body;
      const year = new Date().getFullYear();
      const count = await pool.query('SELECT COUNT(*) as c FROM generated_invoices WHERE tenant_id=$1', [db.id]);
      const invNum = 'INV-' + year + '-' + String(parseInt(count.rows[0].c)+1).padStart(4,'0');
      const result = await pool.query(
        'INSERT INTO generated_invoices (tenant_id,invoice_number,customer_name,customer_email,due_date,subtotal,tax_percent,tax_amount,total_amount,notes,terms,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
        [db.id, invNum, customer_name, customer_email, due_date, subtotal||0, tax_percent||18, tax_amount||0, total_amount||0, notes, terms, 'Draft']
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateStatus: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { status } = req.body;
      const result = await pool.query(
        'UPDATE generated_invoices SET status=$1,updated_at=NOW() WHERE invoice_id=$2 AND tenant_id=$3 RETURNING *',
        [status, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM generated_invoices WHERE invoice_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
