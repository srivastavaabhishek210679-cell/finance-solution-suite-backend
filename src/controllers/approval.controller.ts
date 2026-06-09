import { Request, Response } from 'express';
import pool from '../config/database';
const q = (n: number) => '$' + n;

export const approvalController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const result = await pool.query('SELECT r.*, u.email as requester_email FROM approval_requests r LEFT JOIN users u ON r.requested_by=u.user_id WHERE r.requested_by=' + q(1) + ' OR r.current_approver=' + q(1) + ' ORDER BY r.created_at DESC', [userId]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getById: async (req: Request, res: Response) => {
    try {
      const [req2, steps] = await Promise.all([
        pool.query('SELECT * FROM approval_requests WHERE request_id=' + q(1), [req.params.id]),
        pool.query('SELECT * FROM approval_steps WHERE request_id=' + q(1) + ' ORDER BY step_number', [req.params.id])
      ]);
      res.json({ status: 'success', data: { ...req2.rows[0], steps: steps.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { request_type, title, description, amount, priority, due_date, approvers, reference_id, reference_table } = req.body;
      const result = await pool.query(
        'INSERT INTO approval_requests (request_type, reference_id, reference_table, title, description, amount, requested_by, current_approver, priority, due_date) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',' + q(4) + ',' + q(5) + ',' + q(6) + ',' + q(7) + ',' + q(8) + ',' + q(9) + ',' + q(10) + ') RETURNING *',
        [request_type, reference_id, reference_table, title, description, amount, userId, (approvers||[])[0]||userId, priority||'Normal', due_date]
      );
      const approval = result.rows[0];
      for (let i = 0; i < (approvers||[]).length; i++) {
        await pool.query('INSERT INTO approval_steps (request_id, step_number, approver_id, approver_name) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',' + q(4) + ')',
          [approval.request_id, i+1, approvers[i], 'Approver '+(i+1)]);
      }
      res.json({ status: 'success', data: approval });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  approve: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { comments } = req.body;
      await pool.query('UPDATE approval_steps SET status=' + q(1) + ', comments=' + q(2) + ', action_date=NOW() WHERE request_id=' + q(3) + ' AND approver_id=' + q(4) + ' AND status=' + q(5),
        ['Approved', comments, req.params.id, userId, 'Pending']);
      const nextStep = await pool.query('SELECT * FROM approval_steps WHERE request_id=' + q(1) + ' AND status=' + q(2) + ' ORDER BY step_number LIMIT 1', [req.params.id, 'Pending']);
      if (nextStep.rows.length > 0) {
        await pool.query('UPDATE approval_requests SET current_approver=' + q(1) + ' WHERE request_id=' + q(2), [nextStep.rows[0].approver_id, req.params.id]);
      } else {
        await pool.query('UPDATE approval_requests SET status=' + q(1) + ', updated_at=NOW() WHERE request_id=' + q(2), ['Approved', req.params.id]);
      }
      res.json({ status: 'success', message: 'Approved' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  reject: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { comments } = req.body;
      await pool.query('UPDATE approval_steps SET status=' + q(1) + ', comments=' + q(2) + ', action_date=NOW() WHERE request_id=' + q(3) + ' AND approver_id=' + q(4),
        ['Rejected', comments, req.params.id, userId]);
      await pool.query('UPDATE approval_requests SET status=' + q(1) + ', updated_at=NOW() WHERE request_id=' + q(2), ['Rejected', req.params.id]);
      res.json({ status: 'success', message: 'Rejected' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const result = await pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status=' + "'Pending'" + ' THEN 1 END) as pending, COUNT(CASE WHEN status=' + "'Approved'" + ' THEN 1 END) as approved, COUNT(CASE WHEN status=' + "'Rejected'" + ' THEN 1 END) as rejected FROM approval_requests WHERE requested_by=' + q(1) + ' OR current_approver=' + q(1), [userId]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};