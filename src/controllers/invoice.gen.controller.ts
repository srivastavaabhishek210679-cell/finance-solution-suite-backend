import { Request, Response } from 'express';
import pool from '../config/database';

const q = (n: number) => '$' + n;

export const invoiceController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const result = await pool.query('SELECT i.*, COUNT(ii.item_id) as item_count FROM generated_invoices i LEFT JOIN invoice_items ii ON i.invoice_id=ii.invoice_id WHERE i.created_by=' + q(1) + ' GROUP BY i.invoice_id ORDER BY i.created_at DESC', [userId]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const [inv, items] = await Promise.all([
        pool.query('SELECT * FROM generated_invoices WHERE invoice_id=' + q(1), [req.params.id]),
        pool.query('SELECT * FROM invoice_items WHERE invoice_id=' + q(1) + ' ORDER BY item_id', [req.params.id])
      ]);
      res.json({ status: 'success', data: { ...inv.rows[0], items: items.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  createFromOrder: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { order_id } = req.body;
      const order = await pool.query('SELECT * FROM orders WHERE order_id=' + q(1), [order_id]);
      if (!order.rows.length) return res.status(404).json({ status: 'error', message: 'Order not found' });
      const o = order.rows[0];
      const invNum = 'INV-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);
      const due = new Date(); due.setDate(due.getDate() + 30);
      const result = await pool.query(
        'INSERT INTO generated_invoices (invoice_number, order_id, customer_name, customer_email, customer_phone, billing_address, due_date, subtotal, tax_percent, tax_amount, total_amount, notes, created_by) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',' + q(4) + ',' + q(5) + ',' + q(6) + ',' + q(7) + ',' + q(8) + ',18,' + q(9) + ',' + q(10) + ',' + q(11) + ',' + q(12) + ') RETURNING *',
        [invNum, order_id, o.customer_name, o.customer_email, o.customer_phone, o.shipping_address, due.toISOString().split('T')[0], o.total_amount - (o.tax_amount || 0), o.tax_amount || 0, o.total_amount, o.notes, userId]
      );
      const inv = result.rows[0];
      const orderItems = await pool.query('SELECT * FROM order_items WHERE order_id=' + q(1), [order_id]);
      for (const item of orderItems.rows) {
        await pool.query('INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',' + q(4) + ',' + q(5) + ')',
          [inv.invoice_id, item.product_name, item.quantity, item.unit_price, item.total_price]);
      }
      res.json({ status: 'success', data: inv });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  create: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { customer_name, customer_email, customer_phone, billing_address, due_date, notes, terms, items } = req.body;
      const invNum = 'INV-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);
      const subtotal = (items || []).reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0);
      const tax = subtotal * 0.18;
      const total = subtotal + tax;
      const result = await pool.query(
        'INSERT INTO generated_invoices (invoice_number, customer_name, customer_email, customer_phone, billing_address, due_date, subtotal, tax_percent, tax_amount, total_amount, notes, terms, created_by) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',' + q(4) + ',' + q(5) + ',' + q(6) + ',' + q(7) + ',18,' + q(8) + ',' + q(9) + ',' + q(10) + ',' + q(11) + ',' + q(12) + ') RETURNING *',
        [invNum, customer_name, customer_email, customer_phone, billing_address, due_date, subtotal, tax, total, notes, terms, userId]
      );
      const inv = result.rows[0];
      for (const item of (items || [])) {
        await pool.query('INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',' + q(4) + ',' + q(5) + ')',
          [inv.invoice_id, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]);
      }
      res.json({ status: 'success', data: inv });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateStatus: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('UPDATE generated_invoices SET status=' + q(1) + ' WHERE invoice_id=' + q(2) + ' RETURNING *', [req.body.status, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  delete: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM generated_invoices WHERE invoice_id=' + q(1), [req.params.id]);
      res.json({ status: 'success', message: 'Invoice deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};