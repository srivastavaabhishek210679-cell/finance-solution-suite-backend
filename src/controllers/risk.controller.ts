import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const riskController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM risks WHERE tenant_id=$1 ORDER BY risk_score DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as open, COUNT(CASE WHEN impact=$2 THEN 1 END) as critical, COUNT(CASE WHEN status=$3 THEN 1 END) as mitigated FROM risks WHERE tenant_id=$4',
        ['Open', 'Critical', 'Mitigated', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { risk_name, category, impact, likelihood, risk_score, owner, mitigation_plan, status } = req.body;
      const result = await pool.query(
        'INSERT INTO risks (tenant_id,risk_name,category,impact,likelihood,risk_score,owner,mitigation_plan,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
        [db.id, risk_name, category, impact||'Medium', likelihood||'Medium', risk_score||5, owner, mitigation_plan, status||'Open']
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { risk_name, impact, likelihood, risk_score, status, mitigation_plan, owner } = req.body;
      const result = await pool.query(
        'UPDATE risks SET risk_name=$1,impact=$2,likelihood=$3,risk_score=$4,status=$5,mitigation_plan=$6,owner=$7,updated_at=NOW() WHERE risk_id=$8 AND tenant_id=$9 RETURNING *',
        [risk_name, impact, likelihood, risk_score, status, mitigation_plan, owner, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM risks WHERE risk_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
