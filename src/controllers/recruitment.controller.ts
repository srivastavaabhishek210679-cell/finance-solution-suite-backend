import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const recruitmentController = {
  getJobs: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM job_postings WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.json({ status: 'success', data: [] }); }
  },
  createJob: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { title, department, location, type, description, requirements, status } = req.body;
      const result = await pool.query(
        'INSERT INTO job_postings (tenant_id,title,department,location,type,description,requirements,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
        [db.id, title, department, location, type||'Full Time', description, requirements, status||'Open']
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateJob: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { title, department, status } = req.body;
      const result = await pool.query(
        'UPDATE job_postings SET title=$1,department=$2,status=$3,updated_at=NOW() WHERE job_id=$4 AND tenant_id=$5 RETURNING *',
        [title, department, status, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getApplications: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM recruitment_applications WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createApplication: async (req: Request, res: Response) => {
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
  updateApplicationStatus: async (req: Request, res: Response) => {
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
  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as shortlisted, COUNT(CASE WHEN status=$2 THEN 1 END) as hired, COUNT(CASE WHEN status=$3 THEN 1 END) as rejected FROM recruitment_applications WHERE tenant_id=$4',
        ['Shortlisted', 'Hired', 'Rejected', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
