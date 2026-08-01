import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const approvalController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const userId = (req as any).user?.userId;
      const result = await pool.query(
        'SELECT * FROM approval_requests WHERE tenant_id=$1 ORDER BY created_at DESC',
        [db.id]
      );
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT * FROM approval_requests WHERE approval_id=$1 AND tenant_id=$2',
        [req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  approve: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { comments } = req.body;
      const userId = (req as any).user?.userId;
      const result = await pool.query(
        'UPDATE approval_requests SET status=$1,approved_by=$2,comments=$3,approved_at=NOW() WHERE approval_id=$4 AND tenant_id=$5 RETURNING *',
        ['Approved', userId, comments, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  reject: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { comments } = req.body;
      const userId = (req as any).user?.userId;
      const result = await pool.query(
        'UPDATE approval_requests SET status=$1,approved_by=$2,comments=$3,approved_at=NOW() WHERE approval_id=$4 AND tenant_id=$5 RETURNING *',
        ['Rejected', userId, comments, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as pending, COUNT(CASE WHEN status=$2 THEN 1 END) as approved, COUNT(CASE WHEN status=$3 THEN 1 END) as rejected FROM approval_requests WHERE tenant_id=$4',
        ['Pending', 'Approved', 'Rejected', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { type, title, description, amount } = req.body;
      const userId = (req as any).user?.userId;
      const result = await pool.query(
        'INSERT INTO approval_requests (tenant_id,type,title,description,requested_by,amount,status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [db.id, type, title, description, userId, amount||0, 'Pending']
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
