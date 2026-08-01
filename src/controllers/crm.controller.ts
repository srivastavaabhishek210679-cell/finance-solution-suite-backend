import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const crmController = {
  getCustomers: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM customers WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getDeals: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM deals WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const [customers, deals] = await Promise.all([
        pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as active FROM customers WHERE tenant_id=$2', ['Active', db.id]),
        pool.query('SELECT COUNT(*) as total, COALESCE(SUM(deal_value),0) as pipeline_value, COUNT(CASE WHEN stage=$1 THEN 1 END) as won FROM deals WHERE tenant_id=$2', ['Closed Won', db.id])
      ]);
      res.json({ status: 'success', data: { customers: customers.rows[0], deals: deals.rows[0] } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createCustomer: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { company_name, contact_name, email, phone, industry, status } = req.body;
      const result = await pool.query(
        'INSERT INTO customers (tenant_id,company_name,contact_name,email,phone,industry,status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [db.id, company_name, contact_name, email, phone, industry, status||'Lead']
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createDeal: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { deal_name, customer_name, deal_value, stage, expected_close, assigned_to } = req.body;
      const result = await pool.query(
        'INSERT INTO deals (tenant_id,deal_name,customer_name,deal_value,stage,expected_close,assigned_to) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [db.id, deal_name, customer_name, deal_value, stage||'Prospecting', expected_close, assigned_to]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateDeal: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { stage, deal_value, expected_close, assigned_to } = req.body;
      const result = await pool.query(
        'UPDATE deals SET stage=$1,deal_value=$2,expected_close=$3,assigned_to=$4,updated_at=NOW() WHERE deal_id=$5 AND tenant_id=$6 RETURNING *',
        [stage, deal_value, expected_close, assigned_to, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  deleteCustomer: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM customers WHERE customer_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
