import { Request, Response } from 'express';
import pool from '../config/database';

export const supplyController = {
  getSuppliers: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT s.*, COUNT(po.po_id) as total_orders, SUM(po.total_amount) as total_spend FROM suppliers s LEFT JOIN purchase_orders po ON s.supplier_id=po.supplier_id GROUP BY s.supplier_id ORDER BY s.supplier_name');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getSupplierStats: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status=\\'Active\\' THEN 1 END) as active, COUNT(CASE WHEN status=\\'Inactive\\' THEN 1 END) as inactive FROM suppliers');
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createSupplier: async (req: Request, res: Response) => {
    try {
      const { supplier_name, contact_person, email, phone, address, city, country, category, payment_terms, lead_time_days } = req.body;
      const code = 'SUP' + String(Math.floor(Math.random()*9000)+1000);
      const result = await pool.query('INSERT INTO suppliers (supplier_name, supplier_code, contact_person, email, phone, address, city, country, category, payment_terms, lead_time_days) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
        [supplier_name, code, contact_person, email, phone, address, city, country, category, payment_terms, lead_time_days||7]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateSupplier: async (req: Request, res: Response) => {
    try {
      const { supplier_name, contact_person, email, phone, address, city, country, category, status, payment_terms, lead_time_days, rating } = req.body;
      const result = await pool.query('UPDATE suppliers SET supplier_name=$1, contact_person=$2, email=$3, phone=$4, address=$5, city=$6, country=$7, category=$8, status=$9, payment_terms=$10, lead_time_days=$11, rating=$12, updated_at=NOW() WHERE supplier_id=$13 RETURNING *',
        [supplier_name, contact_person, email, phone, address, city, country, category, status, payment_terms, lead_time_days, rating, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  deleteSupplier: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM suppliers WHERE supplier_id=$1', [req.params.id]);
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
      const result = await pool.query('SELECT COUNT(*) as total, SUM(total_amount) as total_spend, COUNT(CASE WHEN status=\\'Pending\\' THEN 1 END) as pending, COUNT(CASE WHEN status=\\'Received\\' THEN 1 END) as received FROM purchase_orders');
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createPO: async (req: Request, res: Response) => {
    try {
      const { supplier_id, expected_delivery, notes, items } = req.body;
      const poNum = 'PO-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*9000)+1000);
      const totalAmount = (items||[]).reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0);
      const taxAmount = totalAmount * 0.18;
      const result = await pool.query('INSERT INTO purchase_orders (po_number, supplier_id, expected_delivery, total_amount, tax_amount, notes) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [poNum, supplier_id, expected_delivery, totalAmount, taxAmount, notes]);
      const po = result.rows[0];
      for (const item of (items||[])) {
        await pool.query('INSERT INTO po_items (po_id, product_name, sku, quantity, unit_price, total_price) VALUES ($1,$2,$3,$4,$5,$6)',
          [po.po_id, item.product_name, item.sku, item.quantity, item.unit_price, item.quantity * item.unit_price]);
      }
      res.json({ status: 'success', data: po });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updatePOStatus: async (req: Request, res: Response) => {
    try {
      const { status, payment_status } = req.body;
      const result = await pool.query('UPDATE purchase_orders SET status=$1, payment_status=$2, updated_at=NOW() WHERE po_id=$3 RETURNING *', [status, payment_status, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};