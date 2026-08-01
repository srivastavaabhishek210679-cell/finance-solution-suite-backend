import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const attendanceController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM attendance_records WHERE tenant_id=$1 ORDER BY date DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as present, COUNT(CASE WHEN status=$2 THEN 1 END) as absent, COUNT(CASE WHEN status=$3 THEN 1 END) as late FROM attendance_records WHERE tenant_id=$4',
        ['Present', 'Absent', 'Late', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { employee_name, date, status, check_in, check_out, working_hours, department } = req.body;
      const result = await pool.query(
        'INSERT INTO attendance_records (tenant_id,employee_name,date,status,check_in,check_out,working_hours,department) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
        [db.id, employee_name, date, status||'Present', check_in, check_out, working_hours||8, department]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { status, check_in, check_out, working_hours } = req.body;
      const result = await pool.query(
        'UPDATE attendance_records SET status=$1,check_in=$2,check_out=$3,working_hours=$4 WHERE id=$5 AND tenant_id=$6 RETURNING *',
        [status, check_in, check_out, working_hours, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM attendance_records WHERE id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
