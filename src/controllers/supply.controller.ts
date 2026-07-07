import { onPOCreated, generatePONumber } from '../services/events.service';
import { Request, Response } from 'express';
import pool from '../config/database';

const q1 = 'Active';
const q2 = 'Inactive';
const q3 = 'Pending';
const q4 = 'Received';

export const supplyController = {
  getSuppliers: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT s.*, COUNT(po.po_id) as total_orders, COALESCE(SUM(po.total_amount),0) as total_spend FROM suppliers s LEFT JOIN purchase_orders po ON s.supplier_id=po.supplier_id GROUP BY s.supplier_id ORDER BY s.supplier_name');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getSupplierStats: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status= THEN 1 END) as active, COUNT(CASE WHEN status= THEN 1 END) as inactive FROM suppliers', [q1, q2]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createSupplier: async (req: Request, res: Response) => {
    try {
      const { supplier_name, contact_person, email, phone, address, city, country, category, payment_terms, lead_time_days } = req.body;
      const code = 'SUP' + String(Math.floor(Math.random()*9000)+1000);
      const result = await pool.query('INSERT INTO suppliers (supplier_name, supplier_code, contact_person, email, phone, address, city, country, category, payment_terms, lead_time_days) VALUES (,,,,,,,,,,) RETURNING *',
        [supplier_name, code, contact_person, email, phone, address, city, country, category, payment_terms, lead_time_days||7]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateSupplier: async (req: Request, res: Response) => {
    try {
      const { supplier_name, contact_person, email, phone, address, city, country, category, status, payment_terms, lead_time_days, rating } = req.body;
      const result = await pool.query('UPDATE suppliers SET supplier_name=, contact_person=, email=, phone=, address=, city=, country=, category=, status=, payment_terms=, lead_time_days=, rating=, updated_at=NOW() WHERE supplier_id= RETURNING *',
        [supplier_name, contact_person, email, phone, address, city, country, category, status, payment_terms, lead_time_days, rating, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  deleteSupplier: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM suppliers WHERE supplier_id=', [req.params.id]);
      res.json({ status: 'success', message: 'Supplier deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getPOs: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT po.*, s.supplier_name, s.supplier_code FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id=s.supplier_id ORDER BY po.created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getPOStats: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT COUNT(*) as total, COALESCE(SUM(total_amount),0) as total_spend, COUNT(CASE WHEN status= THEN 1 END) as pending, COUNT(CASE WHEN status= THEN 1 END) as received FROM purchase_orders', [q3, q4]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createPO: async (req: Request, res: Response) => {
    try {
      const { supplier_id, expected_delivery, notes, items } = req.body;
      const poNum = 'PO-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*9000)+1000);
      const totalAmount = (items||[]).reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price), 0);
      const tenantId = (req as any).user?.tenantId || 1;
      const autoPONum = await generatePONumber(tenantId);
      const result = await pool.query('INSERT INTO purchase_orders (po_number, supplier_id, expected_delivery, total_amount, notes) VALUES (,,,,) RETURNING *',
        [poNum, supplier_id, expected_delivery, totalAmount, notes]);
      const po = result.rows[0];
      for (const item of (items||[])) {
        await pool.query('INSERT INTO po_items (po_id, product_name, sku, quantity, unit_price, total_price) VALUES (,,,,,)',
          [po.po_id, item.product_name, item.sku, item.quantity, item.unit_price, item.quantity * item.unit_price]);
      }
      res.json({ status: 'success', data: po });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updatePOStatus: async (req: Request, res: Response) => {
    try {
      const { status, payment_status } = req.body;
      const result = await pool.query('UPDATE purchase_orders SET status=, payment_status=, updated_at=NOW() WHERE po_id= RETURNING *', [status, payment_status, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};