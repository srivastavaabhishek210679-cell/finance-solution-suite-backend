import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const assetController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM assets WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COALESCE(SUM(purchase_value),0) as total_value, COUNT(CASE WHEN status=$1 THEN 1 END) as active FROM assets WHERE tenant_id=$2',
        ['Active', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { asset_name, asset_code, category, purchase_date, purchase_value, assigned_to, location, status } = req.body;
      const result = await pool.query(
        'INSERT INTO assets (tenant_id,asset_name,asset_code,category,purchase_date,purchase_value,assigned_to,location,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
        [db.id, asset_name, asset_code, category, purchase_date, purchase_value||0, assigned_to, location, status||'Active']
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { asset_name, category, assigned_to, location, status } = req.body;
      const result = await pool.query(
        'UPDATE assets SET asset_name=$1,category=$2,assigned_to=$3,location=$4,status=$5,updated_at=NOW() WHERE asset_id=$6 AND tenant_id=$7 RETURNING *',
        [asset_name, category, assigned_to, location, status, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM assets WHERE asset_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
