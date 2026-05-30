import { Request, Response } from 'express';
import pool from '../config/database';

export const contractController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT c.*, v.vendor_name FROM contracts c LEFT JOIN vendors v ON c.vendor_id=v.vendor_id ORDER BY c.end_date ASC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { contract_name, contract_number, vendor_id, contract_type, department, start_date, end_date, value, status, auto_renewal, signed_by, description } = req.body;
      const result = await pool.query('INSERT INTO contracts (contract_name, contract_number, vendor_id, contract_type, department, start_date, end_date, value, status, auto_renewal, signed_by, description) VALUES (,,,,,,,,,,,) RETURNING *', [contract_name, contract_number, vendor_id, contract_type, department, start_date, end_date, value, status||'Active', auto_renewal||false, signed_by, description]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const { contract_name, status, end_date, value, auto_renewal } = req.body;
      const result = await pool.query('UPDATE contracts SET contract_name=, status=, end_date=, value=, auto_renewal= WHERE contract_id= RETURNING *', [contract_name, status, end_date, value, auto_renewal, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total, SUM(value) as total_value FROM contracts');
      const active = await pool.query("SELECT COUNT(*) as active FROM contracts WHERE status='Active'");
      const expiring = await pool.query("SELECT c.*, v.vendor_name FROM contracts c LEFT JOIN vendors v ON c.vendor_id=v.vendor_id WHERE c.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' AND c.status='Active' ORDER BY c.end_date");
      res.json({ status: 'success', data: { total: total.rows[0].total, totalValue: total.rows[0].total_value, active: active.rows[0].active, expiringSoon: expiring.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};