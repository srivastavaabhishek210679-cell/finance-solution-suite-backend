import { Request, Response } from 'express';
import pool from '../config/database';

const s = String.fromCharCode(39);

export const orderController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT o.*, COUNT(oi.item_id) as item_count FROM orders o LEFT JOIN order_items oi ON o.order_id=oi.order_id GROUP BY o.order_id ORDER BY o.created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const q = 'SELECT COUNT(*) as total_orders, SUM(total_amount) as total_revenue, COUNT(CASE WHEN status=' + s + 'Pending' + s + ' THEN 1 END) as pending, COUNT(CASE WHEN status=' + s + 'Processing' + s + ' THEN 1 END) as processing, COUNT(CASE WHEN status=' + s + 'Delivered' + s + ' THEN 1 END) as delivered, COUNT(CASE WHEN status=' + s + 'Cancelled' + s + ' THEN 1 END) as cancelled FROM orders';
      const result = await pool.query(q);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getById: async (req: Request, res: Response) => {
    try {
      const [order, items] = await Promise.all([
        pool.query('SELECT * FROM orders WHERE order_id=', [req.params.id]),
        pool.query('SELECT * FROM order_items WHERE order_id= ORDER BY item_id', [req.params.id])
      ]);
      res.json({ status: 'success', data: { ...order.rows[0], items: items.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { customer_name, customer_email, customer_phone, delivery_date, payment_method, shipping_address, notes, items } = req.body;
      const orderNum = 'ORD-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*9000)+1000);
      const totalAmount = (items||[]).reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price), 0);
      const taxAmount = totalAmount * 0.18;
      const result = await pool.query(
        'INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, delivery_date, total_amount, tax_amount, payment_method, shipping_address, notes) VALUES (,,,,,,,,,) RETURNING *',
        [orderNum, customer_name, customer_email, customer_phone, delivery_date, totalAmount, taxAmount, payment_method, shipping_address, notes]
      );
      const ord = result.rows[0];
      for (const item of (items||[])) {
        await pool.query('INSERT INTO order_items (order_id, product_name, sku, quantity, unit_price, total_price) VALUES (,,,,,)',
          [ord.order_id, item.product_name, item.sku, item.quantity, item.unit_price, item.quantity * item.unit_price]);
      }
      res.json({ status: 'success', data: ord });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateStatus: async (req: Request, res: Response) => {
    try {
      const { status, payment_status } = req.body;
      const result = await pool.query('UPDATE orders SET status=, payment_status=, updated_at=NOW() WHERE order_id= RETURNING *', [status, payment_status, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM orders WHERE order_id=', [req.params.id]);
      res.json({ status: 'success', message: 'Order deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};