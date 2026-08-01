import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const crmController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM customers WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
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
  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { company_name, contact_name, email, phone, industry, status, notes } = req.body;
      const result = await pool.query(
        'INSERT INTO customers (tenant_id,company_name,contact_name,email,phone,industry,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
        [db.id, company_name, contact_name, email, phone, industry, status||'Lead', notes]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { company_name, contact_name, email, phone, industry, status, notes } = req.body;
      const result = await pool.query(
        'UPDATE customers SET company_name=$1,contact_name=$2,email=$3,phone=$4,industry=$5,status=$6,notes=$7,updated_at=NOW() WHERE customer_id=$8 AND tenant_id=$9 RETURNING *',
        [company_name, contact_name, email, phone, industry, status, notes, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  addInteraction: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { customer_id, type, notes, date, outcome } = req.body;
      const result = await pool.query(
        'INSERT INTO customer_interactions (tenant_id,customer_id,type,notes,date,outcome) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [db.id, customer_id, type||'Call', notes, date||new Date(), outcome]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getInteractions: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT * FROM customer_interactions WHERE customer_id=$1 AND tenant_id=$2 ORDER BY date DESC',
        [req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.json({ status: 'success', data: [] }); }
  }
};
