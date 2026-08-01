import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const travelController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM travel_requests WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as pending, COUNT(CASE WHEN status=$2 THEN 1 END) as approved, COALESCE(SUM(estimated_cost),0) as total_cost FROM travel_requests WHERE tenant_id=$3',
        ['Pending', 'Approved', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { employee_name, destination, travel_date, return_date, purpose, estimated_cost, status } = req.body;
      const result = await pool.query(
        'INSERT INTO travel_requests (tenant_id,employee_name,destination,travel_date,return_date,purpose,estimated_cost,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
        [db.id, employee_name, destination, travel_date, return_date, purpose, estimated_cost||0, status||'Pending']
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateStatus: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { status, approved_by, notes } = req.body;
      const result = await pool.query(
        'UPDATE travel_requests SET status=$1,approved_by=$2,notes=$3,updated_at=NOW() WHERE travel_id=$4 AND tenant_id=$5 RETURNING *',
        [status, approved_by, notes, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM travel_requests WHERE travel_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
