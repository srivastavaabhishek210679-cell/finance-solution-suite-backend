import { Request, Response } from 'express';
import pool from '../config/database';

export const riskController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM risks ORDER BY risk_score DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { risk_name, category, department, description, likelihood, impact, owner, mitigation, due_date } = req.body;
      const score = (likelihood||3) * (impact||3);
      const result = await pool.query('INSERT INTO risks (risk_name, category, department, description, likelihood, impact, risk_score, owner, mitigation, due_date) VALUES (,,,,,,,,,) RETURNING *', [risk_name, category, department, description, likelihood||3, impact||3, score, owner, mitigation, due_date]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const { risk_name, likelihood, impact, status, owner, mitigation, due_date } = req.body;
      const score = (likelihood||3) * (impact||3);
      const result = await pool.query('UPDATE risks SET risk_name=, likelihood=, impact=, risk_score=, status=, owner=, mitigation=, due_date= WHERE risk_id= RETURNING *', [risk_name, likelihood, impact, score, status, owner, mitigation, due_date, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total FROM risks');
      const open = await pool.query("SELECT COUNT(*) as open FROM risks WHERE status='Open'");
      const high = await pool.query('SELECT COUNT(*) as high FROM risks WHERE risk_score >= 15');
      const byCategory = await pool.query('SELECT category, COUNT(*) as count, AVG(risk_score) as avg_score FROM risks GROUP BY category ORDER BY avg_score DESC');
      res.json({ status: 'success', data: { total: total.rows[0].total, open: open.rows[0].open, highRisk: high.rows[0].high, byCategory: byCategory.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};