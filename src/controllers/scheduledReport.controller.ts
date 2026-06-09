import { Request, Response } from 'express';
import pool from '../config/database';
const q = (n: number) => '$' + n;

export const scheduledReportController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const result = await pool.query('SELECT * FROM scheduled_reports WHERE created_by=' + q(1) + ' ORDER BY created_at DESC', [userId]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { report_name, report_type, frequency, send_time, send_day, recipients, filters } = req.body;
      const nextSend = new Date();
      nextSend.setDate(nextSend.getDate() + (frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : 30));
      const result = await pool.query(
        'INSERT INTO scheduled_reports (report_name, report_type, frequency, send_time, send_day, recipients, filters, next_send, created_by) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',' + q(4) + ',' + q(5) + ',' + q(6) + ',' + q(7) + ',' + q(8) + ',' + q(9) + ') RETURNING *',
        [report_name, report_type, frequency||'weekly', send_time||'08:00:00', send_day||1, recipients, JSON.stringify(filters||{}), nextSend.toISOString(), userId]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  toggle: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('UPDATE scheduled_reports SET is_active=NOT is_active WHERE schedule_id=' + q(1) + ' RETURNING *', [req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM scheduled_reports WHERE schedule_id=' + q(1), [req.params.id]);
      res.json({ status: 'success', message: 'Schedule deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  sendNow: async (req: Request, res: Response) => {
    try {
      const schedule = await pool.query('SELECT * FROM scheduled_reports WHERE schedule_id=' + q(1), [req.params.id]);
      if (!schedule.rows.length) return res.status(404).json({ status: 'error', message: 'Schedule not found' });
      await pool.query('UPDATE scheduled_reports SET last_sent=NOW() WHERE schedule_id=' + q(1), [req.params.id]);
      res.json({ status: 'success', message: 'Report sent to ' + (schedule.rows[0].recipients||[]).join(', ') });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};