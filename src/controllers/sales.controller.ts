import { Request, Response } from 'express';
import pool from '../config/database';

export const salesController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM sales_deals ORDER BY updated_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { deal_name, company_name, contact_name, deal_value, stage, probability, expected_close, assigned_to, source, notes } = req.body;
      const safeClose = expected_close || null;
      const result = await pool.query('INSERT INTO sales_deals (deal_name, company_name, contact_name, deal_value, stage, probability, expected_close, assigned_to, source, notes) VALUES (,,,,,,,,,) RETURNING *', [deal_name, company_name, contact_name, deal_value||0, stage||'Prospecting', probability||0, safeClose, assigned_to, source, notes]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const { deal_name, deal_value, stage, probability, expected_close, assigned_to, notes } = req.body;
      const safeClose = expected_close || null;
      const result = await pool.query('UPDATE sales_deals SET deal_name=, deal_value=, stage=, probability=, expected_close=, assigned_to=, notes=, updated_at=NOW() WHERE deal_id= RETURNING *', [deal_name, deal_value, stage, probability, safeClose, assigned_to, notes, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total, SUM(deal_value) as pipeline_value FROM sales_deals');
      const won = await pool.query("SELECT COUNT(*) as won, SUM(deal_value) as won_value FROM sales_deals WHERE stage='Closed Won'");
      const byStage = await pool.query('SELECT stage, COUNT(*) as count, SUM(deal_value) as value FROM sales_deals GROUP BY stage ORDER BY count DESC');
      const forecast = await pool.query('SELECT SUM(deal_value * probability / 100) as forecast FROM sales_deals WHERE stage != ', ['Closed Won']);
      res.json({ status: 'success', data: { total: total.rows[0].total, pipelineValue: total.rows[0].pipeline_value, won: won.rows[0].won, wonValue: won.rows[0].won_value, byStage: byStage.rows, forecast: forecast.rows[0].forecast } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};

