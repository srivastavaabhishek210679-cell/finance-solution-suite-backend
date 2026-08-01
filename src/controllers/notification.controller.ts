import { Request, Response } from 'express';
import pool from '../config/database';

export const notificationController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const tenantId = (req as any).user?.tenantId || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await pool.query(
        'SELECT * FROM app_notifications WHERE user_id=$1 AND tenant_id=$2 ORDER BY created_at DESC LIMIT $3',
        [userId, tenantId, limit]
      );
      const unread = result.rows.filter((r: any) => !r.is_read).length;
      res.json({ status: 'success', data: result.rows, unread_count: unread });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  markRead: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const tenantId = (req as any).user?.tenantId || 1;
      await pool.query(
        'UPDATE app_notifications SET is_read=true WHERE notification_id=$1 AND user_id=$2 AND tenant_id=$3',
        [req.params.id, userId, tenantId]
      );
      res.json({ status: 'success', message: 'Marked as read' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  markAllRead: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const tenantId = (req as any).user?.tenantId || 1;
      await pool.query(
        'UPDATE app_notifications SET is_read=true WHERE user_id=$1 AND tenant_id=$2',
        [userId, tenantId]
      );
      res.json({ status: 'success', message: 'All marked as read' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const tenantId = (req as any).user?.tenantId || 1;
      await pool.query(
        'DELETE FROM app_notifications WHERE notification_id=$1 AND user_id=$2 AND tenant_id=$3',
        [req.params.id, userId, tenantId]
      );
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  create: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const tenantId = (req as any).user?.tenantId || 1;
      const { title, message, type, link } = req.body;
      const result = await pool.query(
        'INSERT INTO app_notifications (user_id,tenant_id,title,message,type,link) VALUES (' + String.fromCharCode(36) + '1,' + String.fromCharCode(36) + '2,' + String.fromCharCode(36) + '3,' + String.fromCharCode(36) + '4,' + String.fromCharCode(36) + '5,' + String.fromCharCode(36) + '6) RETURNING *',
        [userId, tenantId, title, message, type||'info', link||'']
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getUnreadCount: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const tenantId = (req as any).user?.tenantId || 1;
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM app_notifications WHERE user_id=$1 AND tenant_id=$2 AND is_read=false',
        [userId, tenantId]
      );
      res.json({ status: 'success', data: { count: parseInt(result.rows[0].count) } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
