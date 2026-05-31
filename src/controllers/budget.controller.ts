import { Request, Response } from 'express';
import pool from '../config/database';

export const budgetController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM budgets ORDER BY fiscal_year DESC, department');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { department, fiscal_year, fiscal_quarter, category, allocated_amount } = req.body;
      const result = await pool.query('INSERT INTO budgets (department, fiscal_year, fiscal_quarter, category, allocated_amount) VALUES ($1,$2,$3,$4,$5) RETURNING *', [department, fiscal_year, fiscal_quarter, category, allocated_amount]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const { spent_amount, committed_amount, status } = req.body;
      const result = await pool.query('UPDATE budgets SET spent_amount=, committed_amount=, status=, updated_at=NOW() WHERE budget_id= RETURNING *', [spent_amount, committed_amount, status, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  addTransaction: async (req: Request, res: Response) => {
    try {
      const { budget_id, description, amount, transaction_type, created_by } = req.body;
      const result = await pool.query('INSERT INTO budget_transactions (budget_id, description, amount, transaction_type, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *', [budget_id, description, amount, transaction_type, created_by]);
      await pool.query('UPDATE budgets SET spent_amount = spent_amount +  WHERE budget_id = ', [amount, budget_id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getTransactions: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM budget_transactions WHERE budget_id= ORDER BY created_at DESC', [req.params.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT SUM(allocated_amount) as total_budget, SUM(spent_amount) as total_spent, SUM(committed_amount) as total_committed FROM budgets');
      const byDept = await pool.query('SELECT department, SUM(allocated_amount) as allocated, SUM(spent_amount) as spent FROM budgets GROUP BY department ORDER BY allocated DESC');
      res.json({ status: 'success', data: { ...result.rows[0], byDepartment: byDept.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
