import { Request, Response } from 'express';
import pool from '../config/database';

export const vendorController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM vendors ORDER BY vendor_name');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { vendor_name, vendor_code, category, contact_person, email, phone, address, payment_terms } = req.body;
      const result = await pool.query('INSERT INTO vendors (vendor_name, vendor_code, category, contact_person, email, phone, address, payment_terms) VALUES (,,,,,,,) RETURNING *', [vendor_name, vendor_code, category, contact_person, email, phone, address, payment_terms]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const { vendor_name, category, contact_person, email, phone, payment_terms, rating, status } = req.body;
      const result = await pool.query('UPDATE vendors SET vendor_name=, category=, contact_person=, email=, phone=, payment_terms=, rating=, status= WHERE vendor_id= RETURNING *', [vendor_name, category, contact_person, email, phone, payment_terms, rating, status, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total FROM vendors');
      const active = await pool.query("SELECT COUNT(*) as active FROM vendors WHERE status='Active'");
      const topVendors = await pool.query('SELECT vendor_name, total_value, rating, category FROM vendors ORDER BY total_value DESC LIMIT 5');
      res.json({ status: 'success', data: { total: total.rows[0].total, active: active.rows[0].active, topVendors: topVendors.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};