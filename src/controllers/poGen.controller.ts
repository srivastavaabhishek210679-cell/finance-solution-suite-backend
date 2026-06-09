import { Request, Response } from 'express';
import pool from '../config/database';
const q = (n: number) => '$' + n;

export const poGenController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const result = await pool.query('SELECT p.*, s.supplier_name as sup_name FROM generated_pos p LEFT JOIN suppliers s ON p.supplier_id=s.supplier_id WHERE p.created_by=' + q(1) + ' ORDER BY p.created_at DESC', [userId]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getById: async (req: Request, res: Response) => {
    try {
      const [po, items] = await Promise.all([
        pool.query('SELECT p.*, s.supplier_name, s.email as supplier_email, s.phone as supplier_phone FROM generated_pos p LEFT JOIN suppliers s ON p.supplier_id=s.supplier_id WHERE p.po_id=' + q(1), [req.params.id]),
        pool.query('SELECT * FROM generated_po_items WHERE po_id=' + q(1), [req.params.id])
      ]);
      res.json({ status: 'success', data: { ...po.rows[0], items: items.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { supplier_id, delivery_address, expected_delivery, notes, terms, items } = req.body;
      const poNum = 'PO-GEN-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*9000)+1000);
      const subtotal = (items||[]).reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0);
      const tax = subtotal * 0.18;
      const total = subtotal + tax;
      const sup = supplier_id ? await pool.query('SELECT supplier_name FROM suppliers WHERE supplier_id=' + q(1), [supplier_id]) : { rows: [{ supplier_name: '' }] };
      const result = await pool.query(
        'INSERT INTO generated_pos (po_number, supplier_id, supplier_name, delivery_address, expected_delivery, subtotal, tax_amount, total_amount, notes, terms, created_by) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',' + q(4) + ',' + q(5) + ',' + q(6) + ',' + q(7) + ',' + q(8) + ',' + q(9) + ',' + q(10) + ',' + q(11) + ') RETURNING *',
        [poNum, supplier_id, sup.rows[0]?.supplier_name, delivery_address, expected_delivery, subtotal, tax, total, notes, terms, userId]
      );
      const po = result.rows[0];
      for (const item of (items||[])) {
        await pool.query('INSERT INTO generated_po_items (po_id, description, quantity, unit_price, total_price) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',' + q(4) + ',' + q(5) + ')',
          [po.po_id, item.description, item.quantity, item.unit_price, item.quantity*item.unit_price]);
      }
      res.json({ status: 'success', data: po });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateStatus: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('UPDATE generated_pos SET status=' + q(1) + ' WHERE po_id=' + q(2) + ' RETURNING *', [req.body.status, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM generated_pos WHERE po_id=' + q(1), [req.params.id]);
      res.json({ status: 'success', message: 'PO deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};