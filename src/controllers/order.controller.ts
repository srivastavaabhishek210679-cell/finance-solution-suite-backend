import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

export const orderController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        `SELECT o.*, COUNT(oi.item_id) as item_count FROM orders o
         LEFT JOIN order_items oi ON o.order_id=oi.order_id
         WHERE o.tenant_id=$1 GROUP BY o.order_id ORDER BY o.created_at DESC`,
        [db.id]
      );
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount),0) as total_revenue,
         COUNT(CASE WHEN status='Pending' THEN 1 END) as pending,
         COUNT(CASE WHEN status='Processing' THEN 1 END) as processing,
         COUNT(CASE WHEN status='Delivered' THEN 1 END) as delivered,
         COUNT(CASE WHEN status='Cancelled' THEN 1 END) as cancelled
         FROM orders WHERE tenant_id=$1`,
        [db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const [order, items] = await Promise.all([
        pool.query('SELECT * FROM orders WHERE order_id=$1 AND tenant_id=$2', [req.params.id, db.id]),
        pool.query('SELECT * FROM order_items WHERE order_id=$1 ORDER BY item_id', [req.params.id])
      ]);
      res.json({ status: 'success', data: { ...order.rows[0], items: items.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  create: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { customer_name, customer_email, customer_phone, delivery_date, payment_method, shipping_address, notes, items } = req.body;
      const year = new Date().getFullYear();
      const count = await pool.query('SELECT COUNT(*) as c FROM orders WHERE tenant_id=$1', [db.id]);
      const orderNum = `ORD-${year}-${String(parseInt(count.rows[0].c)+1).padStart(4,'0')}`;
      const totalAmount = (items||[]).reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price), 0);
      const taxAmount = totalAmount * 0.18;
      const result = await pool.query(
        `INSERT INTO orders (tenant_id,order_number,customer_name,customer_email,customer_phone,delivery_date,total_amount,tax_amount,payment_method,shipping_address,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [db.id, orderNum, customer_name, customer_email, customer_phone, delivery_date, totalAmount, taxAmount, payment_method, shipping_address, notes]
      );
      const ord = result.rows[0];
      for (const item of (items||[])) {
        await pool.query(
          'INSERT INTO order_items (order_id,product_name,sku,quantity,unit_price,total_price) VALUES ($1,$2,$3,$4,$5,$6)',
          [ord.order_id, item.product_name, item.sku, item.quantity, item.unit_price, item.quantity * item.unit_price]
        );
      }
      const { onOrderCreated } = await import('../services/events.service');
      onOrderCreated(ord.order_id, db.id, items||[]).catch(console.error);
      res.json({ status: 'success', data: ord });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateStatus: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { status, payment_status } = req.body;
      const result = await pool.query(
        'UPDATE orders SET status=$1,payment_status=$2,updated_at=NOW() WHERE order_id=$3 AND tenant_id=$4 RETURNING *',
        [status, payment_status, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM orders WHERE order_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Order deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
