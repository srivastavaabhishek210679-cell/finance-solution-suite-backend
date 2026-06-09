import { Request, Response } from 'express';
import pool from '../config/database';
const q = (n: number) => '$' + n;

export const calendarController = {
  getEvents: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { month, year } = req.query;
      let query = 'SELECT * FROM calendar_events WHERE (user_id=' + q(1) + ' OR user_id IS NULL)';
      const params: any[] = [userId];
      if (month && year) {
        query += ' AND EXTRACT(MONTH FROM start_date)=' + q(2) + ' AND EXTRACT(YEAR FROM start_date)=' + q(3);
        params.push(month, year);
      }
      query += ' ORDER BY start_date, start_time';
      const result = await pool.query(query, params);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { title, description, event_type, start_date, end_date, start_time, end_time, all_day, color, reference_id, reference_table } = req.body;
      const result = await pool.query(
        'INSERT INTO calendar_events (title, description, event_type, start_date, end_date, start_time, end_time, all_day, color, reference_id, reference_table, user_id) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',' + q(4) + ',' + q(5) + ',' + q(6) + ',' + q(7) + ',' + q(8) + ',' + q(9) + ',' + q(10) + ',' + q(11) + ',' + q(12) + ') RETURNING *',
        [title, description, event_type||'general', start_date, end_date||start_date, start_time, end_time, all_day!==false, color||'#3b82f6', reference_id, reference_table, userId]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const { title, description, event_type, start_date, end_date, start_time, end_time, color } = req.body;
      const result = await pool.query(
        'UPDATE calendar_events SET title=' + q(1) + ', description=' + q(2) + ', event_type=' + q(3) + ', start_date=' + q(4) + ', end_date=' + q(5) + ', start_time=' + q(6) + ', end_time=' + q(7) + ', color=' + q(8) + ' WHERE event_id=' + q(9) + ' RETURNING *',
        [title, description, event_type, start_date, end_date, start_time, end_time, color, req.params.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM calendar_events WHERE event_id=' + q(1), [req.params.id]);
      res.json({ status: 'success', message: 'Event deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  syncLeaves: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM calendar_events WHERE event_type=' + "'leave'");
      await pool.query('INSERT INTO calendar_events (title, event_type, start_date, end_date, color, user_id) SELECT ' + "'Leave: '" + ' || leave_type, ' + "'leave'" + ', start_date, end_date, ' + "'#f59e0b'" + ', 3 FROM leave_requests WHERE status=' + "'Approved'");
      await pool.query('DELETE FROM calendar_events WHERE event_type=' + "'project'");
      await pool.query('INSERT INTO calendar_events (title, event_type, start_date, end_date, color, user_id) SELECT project_name, ' + "'project'" + ', start_date, end_date, ' + "'#8b5cf6'" + ', 3 FROM pm_projects WHERE status=' + "'Active'");
      res.json({ status: 'success', message: 'Calendar synced' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};