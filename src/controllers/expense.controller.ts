import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';
import { onExpenseSubmitted, onExpenseApproved } from '../services/events.service';

export const expenseController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM expenses WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        `SELECT COUNT(*) as total, COALESCE(SUM(amount),0) as total_amount,
         COUNT(CASE WHEN status='Pending' THEN 1 END) as pending,
         COUNT(CASE WHEN status='Approved' THEN 1 END) as approved,
         COUNT(CASE WHEN status='Rejected' THEN 1 END) as rejected
         FROM expenses WHERE tenant_id=$1`,
        [db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { title, category, department, amount, expense_date, submitted_by, payment_method, notes } = req.body;
      const safeDate = expense_date || new Date().toISOString().split('T')[0];
      const result = await pool.query(
        `INSERT INTO expenses (tenant_id,title,category,department,amount,expense_date,employee_name,payment_method,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [db.id, title, category, department, amount, safeDate, submitted_by, payment_method, notes]
      );
      onExpenseSubmitted({...result.rows[0], employee_name: submitted_by}, db.id).catch(console.error);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateStatus: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { status, approved_by } = req.body;
      const result = await pool.query(
        'UPDATE expenses SET status=$1,approved_by=$2,updated_at=NOW() WHERE expense_id=$3 AND tenant_id=$4 RETURNING *',
        [status, approved_by, req.params.id, db.id]
      );
      if (status === 'Approved') {
        onExpenseApproved(result.rows[0], db.id).catch(console.error);
      }
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM expenses WHERE expense_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
