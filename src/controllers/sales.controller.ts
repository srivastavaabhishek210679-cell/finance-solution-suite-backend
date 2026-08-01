import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const salesController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM deals WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COALESCE(SUM(deal_value),0) as pipeline_value, COUNT(CASE WHEN stage=$1 THEN 1 END) as won, COUNT(CASE WHEN stage=$2 THEN 1 END) as lost FROM deals WHERE tenant_id=$3',
        ['Closed Won', 'Closed Lost', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { deal_name, customer_name, deal_value, stage, expected_close, assigned_to, probability } = req.body;
      const result = await pool.query(
        'INSERT INTO deals (tenant_id,deal_name,customer_name,deal_value,stage,expected_close,assigned_to,probability) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
        [db.id, deal_name, customer_name, deal_value||0, stage||'Prospecting', expected_close, assigned_to, probability||50]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { stage, deal_value, expected_close, assigned_to, probability } = req.body;
      const result = await pool.query(
        'UPDATE deals SET stage=$1,deal_value=$2,expected_close=$3,assigned_to=$4,probability=$5,updated_at=NOW() WHERE deal_id=$6 AND tenant_id=$7 RETURNING *',
        [stage, deal_value, expected_close, assigned_to, probability, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM deals WHERE deal_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
