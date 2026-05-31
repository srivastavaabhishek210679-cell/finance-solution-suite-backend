import { Request, Response } from 'express';
import pool from '../config/database';

export const inventoryController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM inventory_items ORDER BY category, item_name');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { item_name, item_code, category, unit, current_stock, minimum_stock, maximum_stock, unit_price, supplier, location } = req.body;
      const result = await pool.query('INSERT INTO inventory_items (item_name, item_code, category, unit, current_stock, minimum_stock, maximum_stock, unit_price, supplier, location) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *', [item_name, item_code, category, unit, current_stock||0, minimum_stock||0, maximum_stock||0, unit_price||0, supplier, location]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  update: async (req: Request, res: Response) => {
    try {
      const { item_name, current_stock, minimum_stock, maximum_stock, unit_price, supplier, location, status } = req.body;
      const result = await pool.query('UPDATE inventory_items SET item_name=, current_stock=, minimum_stock=, maximum_stock=, unit_price=, supplier=, location=, status= WHERE item_id= RETURNING *', [item_name, current_stock, minimum_stock, maximum_stock, unit_price, supplier, location, status, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  restock: async (req: Request, res: Response) => {
    try {
      const { quantity, reference, notes, created_by } = req.body;
      await pool.query('INSERT INTO inventory_transactions (item_id, txn_type, quantity, reference, notes, created_by) VALUES ($1,$2,$3,$4,$5,$6)', [req.params.id, 'Restock', quantity, reference, notes, created_by||'Admin']);
      await pool.query('UPDATE inventory_items SET current_stock=current_stock+, last_restocked=CURRENT_DATE WHERE item_id=', [quantity, req.params.id]);
      res.json({ status: 'success', message: 'Restocked successfully' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total, SUM(current_stock*unit_price) as total_value FROM inventory_items');
      const low = await pool.query('SELECT COUNT(*) as low_stock FROM inventory_items WHERE current_stock <= minimum_stock');
      const byCategory = await pool.query('SELECT category, COUNT(*) as count, SUM(current_stock) as total_stock FROM inventory_items GROUP BY category ORDER BY count DESC');
      res.json({ status: 'success', data: { total: total.rows[0].total, totalValue: total.rows[0].total_value, lowStock: low.rows[0].low_stock, byCategory: byCategory.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
