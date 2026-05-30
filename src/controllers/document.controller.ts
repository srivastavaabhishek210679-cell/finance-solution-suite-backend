import { Request, Response } from 'express';
import pool from '../config/database';

export const documentController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM documents ORDER BY updated_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { title, category, department, file_type, file_size, version, author, tags, description } = req.body;
      const result = await pool.query('INSERT INTO documents (title, category, department, file_type, file_size, version, author, tags, description) VALUES (,,,,,,,,) RETURNING *', [title, category, department, file_type, file_size, version||'v1.0', author, JSON.stringify(tags||[]), description]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const { title, category, status, version, description } = req.body;
      const result = await pool.query('UPDATE documents SET title=, category=, status=, version=, description=, updated_at=NOW() WHERE doc_id= RETURNING *', [title, category, status, version, description, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM documents WHERE doc_id=', [req.params.id]);
      res.json({ status: 'success', message: 'Document deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total FROM documents');
      const byCategory = await pool.query('SELECT category, COUNT(*) as count FROM documents GROUP BY category ORDER BY count DESC');
      const byDept = await pool.query('SELECT department, COUNT(*) as count FROM documents GROUP BY department ORDER BY count DESC');
      res.json({ status: 'success', data: { total: total.rows[0].total, byCategory: byCategory.rows, byDepartment: byDept.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};