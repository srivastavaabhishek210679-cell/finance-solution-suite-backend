import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const contractController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM contracts WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as active, COUNT(CASE WHEN status=$2 THEN 1 END) as expired, COALESCE(SUM(value),0) as total_value, COUNT(CASE WHEN end_date BETWEEN CURRENT_DATE AND CURRENT_DATE+30 THEN 1 END) as expiring_soon FROM contracts WHERE tenant_id=$3',
        ['Active', 'Expired', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { contract_name, contract_number, contract_type, vendor_name, department, value, start_date, end_date, signed_by, description } = req.body;
      const result = await pool.query(
        'INSERT INTO contracts (tenant_id,contract_name,contract_number,contract_type,vendor_name,department,value,start_date,end_date,signed_by,description,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
        [db.id, contract_name, contract_number, contract_type, vendor_name, department, value||0, start_date, end_date, signed_by, description, 'Active']
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { contract_name, vendor_name, value, start_date, end_date, status, description } = req.body;
      const result = await pool.query(
        'UPDATE contracts SET contract_name=$1,vendor_name=$2,value=$3,start_date=$4,end_date=$5,status=$6,description=$7 WHERE contract_id=$8 AND tenant_id=$9 RETURNING *',
        [contract_name, vendor_name, value, start_date, end_date, status, description, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM contracts WHERE contract_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
