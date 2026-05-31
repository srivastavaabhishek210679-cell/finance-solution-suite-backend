import { Request, Response } from 'express';
import pool from '../config/database';

export class ComplianceCalendarController {
  async getAll(req: Request, res: Response): Promise<void> {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const page  = Math.max(parseInt(req.query.page  as string) || 1, 1);
    const offset = (page - 1) * limit;
    try {
      const result = await pool.query(
        `SELECT compliance_id AS event_id, title, regulator AS category, due_date, status, priority, description, frequency, created_at FROM compliance_calendar ORDER BY due_date ASC NULLS LAST LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      const countResult = await pool.query('SELECT COUNT(*) FROM compliance_calendar');
      const total = parseInt(countResult.rows[0].count);
      res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error: any) {
      console.error('compliance_calendar error:', error.message);
      res.json({ data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
    }
  }
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query('SELECT * FROM compliance_calendar WHERE compliance_id = $1', [req.params.id]);
      if (!result.rows.length) { res.status(404).json({ error: 'Not found' }); return; }
      res.json(result.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  }
  async create(req: Request, res: Response): Promise<void> {
    try {
      const { title, regulator, due_date, status, priority, description, frequency, tenant_id } = req.body;
      const result = await pool.query(
        'INSERT INTO compliance_calendar (title,regulator,due_date,status,priority,description,frequency,tenant_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING *',
        [title, regulator, due_date, status||'upcoming', priority||'medium', description, frequency, tenant_id]
      );
      res.status(201).json(result.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  }
  async update(req: Request, res: Response): Promise<void> {
    try {
      const allowed = ['title','regulator','due_date','status','priority','description','frequency'];
      const fields = Object.keys(req.body).filter(k => allowed.includes(k));
      if (!fields.length) { res.status(400).json({ error: 'No valid fields' }); return; }
      const set = fields.map((f, i) => `${f}=$${i+2}`).join(',');
      const result = await pool.query(
        `UPDATE compliance_calendar SET ${set},updated_at=NOW() WHERE compliance_id=$1 RETURNING *`,
        [req.params.id, ...fields.map(f => req.body[f])]
      );
      if (!result.rows.length) { res.status(404).json({ error: 'Not found' }); return; }
      res.json(result.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  }
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query('DELETE FROM compliance_calendar WHERE compliance_id=$1 RETURNING compliance_id', [req.params.id]);
      if (!result.rows.length) { res.status(404).json({ error: 'Not found' }); return; }
      res.json({ message: 'Deleted' });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  }
}

