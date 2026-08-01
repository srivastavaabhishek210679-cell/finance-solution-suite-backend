import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const recruitmentController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM recruitment_applications WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as shortlisted, COUNT(CASE WHEN status=$2 THEN 1 END) as hired FROM recruitment_applications WHERE tenant_id=$3',
        ['Shortlisted', 'Hired', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { candidate_name, position, department, email, phone, status } = req.body;
      const result = await pool.query(
        'INSERT INTO recruitment_applications (tenant_id,candidate_name,position,department,email,phone,status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [db.id, candidate_name, position, department, email, phone, status||'Applied']
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { status, notes, interview_date } = req.body;
      const result = await pool.query(
        'UPDATE recruitment_applications SET status=$1,notes=$2,interview_date=$3,updated_at=NOW() WHERE application_id=$4 AND tenant_id=$5 RETURNING *',
        [status, notes, interview_date, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM recruitment_applications WHERE application_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
