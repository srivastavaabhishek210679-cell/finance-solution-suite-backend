import { Request, Response } from 'express';
import pool from '../config/database';

export const crmController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM crm_customers ORDER BY company_name');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { company_name, contact_name, email, phone, industry, country, status, customer_type, assigned_to, notes } = req.body;
      const result = await pool.query('INSERT INTO crm_customers (company_name, contact_name, email, phone, industry, country, status, customer_type, assigned_to, notes) VALUES (,,,,,,,,,) RETURNING *', [company_name, contact_name, email, phone, industry, country, status||'Active', customer_type||'B2B', assigned_to, notes]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const { company_name, contact_name, email, phone, industry, status, assigned_to, notes, total_revenue } = req.body;
      const result = await pool.query('UPDATE crm_customers SET company_name=, contact_name=, email=, phone=, industry=, status=, assigned_to=, notes=, total_revenue=, last_contact=CURRENT_DATE WHERE customer_id= RETURNING *', [company_name, contact_name, email, phone, industry, status, assigned_to, notes, total_revenue||0, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  addInteraction: async (req: Request, res: Response) => {
    try {
      const { customer_id, type, subject, notes, created_by } = req.body;
      const result = await pool.query('INSERT INTO crm_interactions (customer_id, type, subject, notes, created_by) VALUES (,,,,) RETURNING *', [customer_id, type, subject, notes, created_by||'Admin']);
      await pool.query('UPDATE crm_customers SET last_contact=CURRENT_DATE WHERE customer_id=', [customer_id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getInteractions: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM crm_interactions WHERE customer_id= ORDER BY created_at DESC', [req.params.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total, SUM(total_revenue) as total_revenue FROM crm_customers');
      const active = await pool.query("SELECT COUNT(*) as active FROM crm_customers WHERE status='Active'");
      const byIndustry = await pool.query('SELECT industry, COUNT(*) as count, SUM(total_revenue) as revenue FROM crm_customers GROUP BY industry ORDER BY revenue DESC');
      res.json({ status: 'success', data: { total: total.rows[0].total, totalRevenue: total.rows[0].total_revenue, active: active.rows[0].active, byIndustry: byIndustry.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};