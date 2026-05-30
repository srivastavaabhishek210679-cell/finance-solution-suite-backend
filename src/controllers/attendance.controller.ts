import { Request, Response } from 'express';
import pool from '../config/database';

export const attendanceController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const date = req.query.date || new Date().toISOString().slice(0,10);
      const result = await pool.query('SELECT * FROM attendance_records WHERE date= ORDER BY department, employee_name', [date]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { employee_name, department, date, check_in, check_out, working_hours, status, overtime_hours, notes } = req.body;
      const result = await pool.query('INSERT INTO attendance_records (employee_name, department, date, check_in, check_out, working_hours, status, overtime_hours, notes) VALUES (,,,,,,,,) RETURNING *', [employee_name, department, date, check_in, check_out, working_hours||0, status||'Present', overtime_hours||0, notes]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const { check_in, check_out, working_hours, status, overtime_hours } = req.body;
      const result = await pool.query('UPDATE attendance_records SET check_in=, check_out=, working_hours=, status=, overtime_hours= WHERE attendance_id= RETURNING *', [check_in, check_out, working_hours, status, overtime_hours||0, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const today = new Date().toISOString().slice(0,10);
      const present = await pool.query("SELECT COUNT(*) as present FROM attendance_records WHERE date= AND status='Present'", [today]);
      const absent = await pool.query("SELECT COUNT(*) as absent FROM attendance_records WHERE date= AND status='Absent'", [today]);
      const late = await pool.query("SELECT COUNT(*) as late FROM attendance_records WHERE date= AND status='Late'", [today]);
      const avgHours = await pool.query('SELECT AVG(working_hours) as avg_hours FROM attendance_records WHERE date=', [today]);
      res.json({ status: 'success', data: { present: present.rows[0].present, absent: absent.rows[0].absent, late: late.rows[0].late, avgHours: avgHours.rows[0].avg_hours } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};