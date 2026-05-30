import { Request, Response } from 'express';
import pool from '../config/database';

export const expenseController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM expenses ORDER BY created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { title, category, department, amount, expense_date, submitted_by, payment_method, notes } = req.body;
      const result = await pool.query('INSERT INTO expenses (title, category, department, amount, expense_date, submitted_by, payment_method, notes) VALUES (,,,,,,,) RETURNING *', [title, category, department, amount, expense_date, submitted_by, payment_method, notes]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateStatus: async (req: Request, res: Response) => {
    try {
      const { status, approved_by } = req.body;
      const result = await pool.query('UPDATE expenses SET status=, approved_by= WHERE expense_id= RETURNING *', [status, approved_by, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total, SUM(amount) as total_amount FROM expenses');
      const pending = await pool.query("SELECT COUNT(*) as pending, SUM(amount) as pending_amount FROM expenses WHERE status='Pending'");
      const approved = await pool.query("SELECT COUNT(*) as approved, SUM(amount) as approved_amount FROM expenses WHERE status='Approved'");
      const byCategory = await pool.query('SELECT category, COUNT(*) as count, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC');
      res.json({ status: 'success', data: { total: total.rows[0].total, totalAmount: total.rows[0].total_amount, pending: pending.rows[0].pending, pendingAmount: pending.rows[0].pending_amount, approved: approved.rows[0].approved, approvedAmount: approved.rows[0].approved_amount, byCategory: byCategory.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};