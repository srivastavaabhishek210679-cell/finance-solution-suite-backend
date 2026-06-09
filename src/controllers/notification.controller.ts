import { Request, Response } from 'express';
import pool from '../config/database';
const q = (n: number) => '$' + n;

export const notificationController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const result = await pool.query('SELECT * FROM app_notifications WHERE user_id=' + q(1) + ' ORDER BY created_at DESC LIMIT 50', [userId]);
      const unread = result.rows.filter((r: any) => !r.is_read).length;
      res.json({ status: 'success', data: result.rows, unread });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  markRead: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      await pool.query('UPDATE app_notifications SET is_read=true WHERE notif_id=' + q(1) + ' AND user_id=' + q(2), [req.params.id, userId]);
      res.json({ status: 'success' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  markAllRead: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      await pool.query('UPDATE app_notifications SET is_read=true WHERE user_id=' + q(1), [userId]);
      res.json({ status: 'success' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { user_id, title, message, type, link } = req.body;
      const result = await pool.query('INSERT INTO app_notifications (user_id, title, message, type, link) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',' + q(4) + ',' + q(5) + ') RETURNING *', [user_id, title, message, type||'info', link]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      await pool.query('DELETE FROM app_notifications WHERE notif_id=' + q(1) + ' AND user_id=' + q(2), [req.params.id, userId]);
      res.json({ status: 'success' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};