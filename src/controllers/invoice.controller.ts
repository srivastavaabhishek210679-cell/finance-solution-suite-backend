import { Request, Response } from 'express';
import pool from '../config/database';

export const invoiceController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { invoice_number, invoice_type, party_name, party_email, department, amount, tax_amount, total_amount, issue_date, due_date, notes } = req.body;
      const safeIssueDate = issue_date || null;
      const safeDueDate = due_date || null;
      const result = await pool.query('INSERT INTO invoices (invoice_number, invoice_type, party_name, party_email, department, amount, tax_amount, total_amount, issue_date, due_date, notes) VALUES (,,,,,,,,,,) RETURNING *', [invoice_number, invoice_type, party_name, party_email, department, amount, tax_amount||0, total_amount, safeIssueDate, safeDueDate, notes]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateStatus: async (req: Request, res: Response) => {
    try {
      const { status, payment_method, payment_date } = req.body;
      const result = await pool.query('UPDATE invoices SET status=, payment_method=, payment_date= WHERE invoice_id= RETURNING *', [status, payment_method, payment_date, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const receivable = await pool.query("SELECT COUNT(*) as count, SUM(total_amount) as total FROM invoices WHERE invoice_type='Receivable'");
      const payable = await pool.query("SELECT COUNT(*) as count, SUM(total_amount) as total FROM invoices WHERE invoice_type='Payable'");
      const overdue = await pool.query("SELECT COUNT(*) as count FROM invoices WHERE status='Overdue'");
      const pending = await pool.query("SELECT COUNT(*) as count, SUM(total_amount) as total FROM invoices WHERE status='Pending'");
      res.json({ status: 'success', data: { receivable: receivable.rows[0], payable: payable.rows[0], overdue: overdue.rows[0].count, pending: pending.rows[0] } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
