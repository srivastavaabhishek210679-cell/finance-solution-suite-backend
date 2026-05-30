import { Request, Response } from 'express';
import pool from '../config/database';

export const complianceController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM compliance_items ORDER BY due_date ASC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { title, category, department, description, due_date, owner, priority, regulatory_body, penalty } = req.body;
      const result = await pool.query('INSERT INTO compliance_items (title, category, department, description, due_date, owner, priority, regulatory_body, penalty) VALUES (,,,,,,,,) RETURNING *', [title, category, department, description, due_date, owner, priority||'Medium', regulatory_body, penalty]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const { title, status, due_date, owner, priority, description } = req.body;
      const result = await pool.query('UPDATE compliance_items SET title=, status=, due_date=, owner=, priority=, description= WHERE compliance_id= RETURNING *', [title, status, due_date, owner, priority, description, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total FROM compliance_items');
      const pending = await pool.query("SELECT COUNT(*) as pending FROM compliance_items WHERE status='Pending'");
      const completed = await pool.query("SELECT COUNT(*) as completed FROM compliance_items WHERE status='Completed'");
      const overdue = await pool.query("SELECT COUNT(*) as overdue FROM compliance_items WHERE due_date < CURRENT_DATE AND status != 'Completed'");
      const byCategory = await pool.query('SELECT category, COUNT(*) as count FROM compliance_items GROUP BY category ORDER BY count DESC');
      res.json({ status: 'success', data: { total: total.rows[0].total, pending: pending.rows[0].pending, completed: completed.rows[0].completed, overdue: overdue.rows[0].overdue, byCategory: byCategory.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};