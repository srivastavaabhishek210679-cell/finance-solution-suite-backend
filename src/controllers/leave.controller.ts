import { onLeaveSubmitted, onLeaveStatusChanged } from '../services/events.service';
import { Request, Response } from 'express';
import pool from '../config/database';

export const leaveController = {
  getRequests: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM leave_requests ORDER BY created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createRequest: async (req: Request, res: Response) => {
    try {
      const { employee_name, leave_type, start_date, end_date, days, reason } = req.body;
      const result = await pool.query('INSERT INTO leave_requests (employee_name, leave_type, start_date, end_date, days, reason) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [employee_name, leave_type, start_date, end_date, days, reason]);
      const tenantId = (req as any).user?.tenantId || 1;
      onLeaveSubmitted({...result.rows[0], reason}, tenantId).catch(console.error);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateStatus: async (req: Request, res: Response) => {
    try {
      const { status, approved_by } = req.body;
      const result = await pool.query('UPDATE leave_requests SET status=, approved_by= WHERE leave_id= RETURNING *', [status, approved_by, req.params.id]);
      const tenantId = (req as any).user?.tenantId || 1;
      onLeaveStatusChanged(result.rows[0], tenantId, status).catch(console.error);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getTypes: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM leave_types ORDER BY type_name');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total FROM leave_requests');
      const pending = await pool.query("SELECT COUNT(*) as pending FROM leave_requests WHERE status='Pending'");
      const approved = await pool.query("SELECT COUNT(*) as approved FROM leave_requests WHERE status='Approved'");
      const byType = await pool.query('SELECT leave_type, COUNT(*) as count, SUM(days) as total_days FROM leave_requests GROUP BY leave_type ORDER BY count DESC');
      res.json({ status: 'success', data: { total: total.rows[0].total, pending: pending.rows[0].pending, approved: approved.rows[0].approved, byType: byType.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
