import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const performanceController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM performance_reviews WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, ROUND(AVG(overall_rating),1) as avg_rating FROM performance_reviews WHERE tenant_id=$1',
        [db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { employee_name, department, review_period, overall_rating, reviewer, comments } = req.body;
      const result = await pool.query(
        'INSERT INTO performance_reviews (tenant_id,employee_name,department,review_period,overall_rating,reviewer,comments) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [db.id, employee_name, department, review_period, overall_rating, reviewer, comments]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { overall_rating, comments, status } = req.body;
      const result = await pool.query(
        'UPDATE performance_reviews SET overall_rating=$1,comments=$2,status=$3 WHERE review_id=$4 AND tenant_id=$5 RETURNING *',
        [overall_rating, comments, status, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM performance_reviews WHERE review_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
