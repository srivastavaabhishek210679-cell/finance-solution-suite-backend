import { Request, Response } from 'express';
import pool from '../config/database';

export const helpdeskController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM helpdesk_tickets ORDER BY created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { title, description, category, priority, raised_by, department } = req.body;
      const ticketNumber = 'TKT-' + Date.now().toString().slice(-6);
      const result = await pool.query('INSERT INTO helpdesk_tickets (ticket_number, title, description, category, priority, raised_by, department) VALUES (,,,,,,) RETURNING *', [ticketNumber, title, description, category, priority||'Medium', raised_by, department]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const { status, assigned_to, resolution } = req.body;
      const resolved_at = status === 'Resolved' ? 'NOW()' : 'NULL';
      const result = await pool.query('UPDATE helpdesk_tickets SET status=, assigned_to=, resolution=, resolved_at=' + resolved_at + ' WHERE ticket_id= RETURNING *', [status, assigned_to, resolution, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total FROM helpdesk_tickets');
      const open = await pool.query("SELECT COUNT(*) as open FROM helpdesk_tickets WHERE status='Open'");
      const inProgress = await pool.query("SELECT COUNT(*) as in_progress FROM helpdesk_tickets WHERE status='In Progress'");
      const resolved = await pool.query("SELECT COUNT(*) as resolved FROM helpdesk_tickets WHERE status='Resolved'");
      const byCategory = await pool.query('SELECT category, COUNT(*) as count FROM helpdesk_tickets GROUP BY category ORDER BY count DESC');
      const byPriority = await pool.query('SELECT priority, COUNT(*) as count FROM helpdesk_tickets GROUP BY priority ORDER BY count DESC');
      res.json({ status: 'success', data: { total: total.rows[0].total, open: open.rows[0].open, inProgress: inProgress.rows[0].in_progress, resolved: resolved.rows[0].resolved, byCategory: byCategory.rows, byPriority: byPriority.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};