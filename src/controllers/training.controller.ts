import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const trainingController = {
  getCourses: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT DISTINCT course_name, category, duration_hours FROM training_enrollments WHERE tenant_id=$1 ORDER BY course_name', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.json({ status: 'success', data: [] }); }
  },
  createCourse: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { course_name, category, duration_hours, description } = req.body;
      res.json({ status: 'success', data: { course_name, category, duration_hours, description, tenant_id: db.id } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getEnrollments: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM training_enrollments WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  enroll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { employee_name, department, course_name, category, duration_hours } = req.body;
      const result = await pool.query(
        'INSERT INTO training_enrollments (tenant_id,employee_name,department,course_name,category,duration_hours,status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [db.id, employee_name, department, course_name, category||'General', duration_hours||8, 'Enrolled']
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateEnrollment: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { status, completion_date, score } = req.body;
      const result = await pool.query(
        'UPDATE training_enrollments SET status=$1,completion_date=$2,score=$3 WHERE enrollment_id=$4 AND tenant_id=$5 RETURNING *',
        [status, completion_date, score, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as completed, COUNT(CASE WHEN status=$2 THEN 1 END) as enrolled, COUNT(DISTINCT course_name) as courses FROM training_enrollments WHERE tenant_id=$3',
        ['Completed', 'Enrolled', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
