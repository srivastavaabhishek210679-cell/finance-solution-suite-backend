import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const projectController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM projects WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as active, COUNT(CASE WHEN status=$2 THEN 1 END) as completed, COALESCE(SUM(budget),0) as total_budget FROM projects WHERE tenant_id=$3',
        ['Active', 'Completed', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getById: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM projects WHERE project_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { project_name, project_code, client, department, start_date, end_date, status, priority, budget, description } = req.body;
      const result = await pool.query(
        'INSERT INTO projects (tenant_id,project_name,project_code,client,department,start_date,end_date,status,priority,budget,description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
        [db.id, project_name, project_code, client, department, start_date, end_date, status||'Active', priority||'Medium', budget||0, description]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { project_name, client, status, priority, budget, progress, end_date } = req.body;
      const result = await pool.query(
        'UPDATE projects SET project_name=$1,client=$2,status=$3,priority=$4,budget=$5,progress=$6,end_date=$7,updated_at=NOW() WHERE project_id=$8 AND tenant_id=$9 RETURNING *',
        [project_name, client, status, priority, budget, progress, end_date, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM projects WHERE project_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
