import { Request, Response } from 'express';
import pool from '../config/database';

export const assetController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM assets ORDER BY created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { asset_name, asset_code, category, department, assigned_to, purchase_date, purchase_price, current_value, depreciation_rate, status, location, warranty_expiry } = req.body;
      const result = await pool.query('INSERT INTO assets (asset_name, asset_code, category, department, assigned_to, purchase_date, purchase_price, current_value, depreciation_rate, status, location, warranty_expiry) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *', [asset_name, asset_code, category, department, assigned_to, purchase_date, purchase_price, current_value, depreciation_rate, status||'Active', location, warranty_expiry]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const { asset_name, department, assigned_to, current_value, status, location, last_maintenance } = req.body;
      const result = await pool.query('UPDATE assets SET asset_name=, department=, assigned_to=, current_value=, status=, location=, last_maintenance= WHERE asset_id= RETURNING *', [asset_name, department, assigned_to, current_value, status, location, last_maintenance, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total, SUM(current_value) as total_value FROM assets');
      const byCategory = await pool.query('SELECT category, COUNT(*) as count, SUM(current_value) as value FROM assets GROUP BY category ORDER BY value DESC');
      const expiring = await pool.query("SELECT * FROM assets WHERE warranty_expiry BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' ORDER BY warranty_expiry");
      res.json({ status: 'success', data: { total: total.rows[0].total, totalValue: total.rows[0].total_value, byCategory: byCategory.rows, expiringWarranty: expiring.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
