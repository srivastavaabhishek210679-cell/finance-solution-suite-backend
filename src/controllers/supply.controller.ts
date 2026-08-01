import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import { onPOCreated, generatePONumber } from '../services/events.service';
import pool from '../config/database';

export const supplyController = {
  getSuppliers: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM suppliers WHERE tenant_id=$1 ORDER BY supplier_name', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getSupplierStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as active, ROUND(AVG(rating)::numeric,1) as avg_rating FROM suppliers WHERE tenant_id=$2',
        ['Active', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  createSupplier: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { supplier_name, supplier_code, contact_person, email, phone, address, city, country, category, payment_terms, lead_time_days } = req.body;
      const result = await pool.query(
        'INSERT INTO suppliers (tenant_id,supplier_name,supplier_code,contact_person,email,phone,address,city,country,category,payment_terms,lead_time_days,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',
        [db.id, supplier_name, supplier_code, contact_person, email, phone, address, city, country||'India', category, payment_terms||'Net 30', lead_time_days||7, 'Active']
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateSupplier: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { supplier_name, contact_person, email, phone, address, city, country, category, status, payment_terms, lead_time_days, rating } = req.body;
      const result = await pool.query(
        'UPDATE suppliers SET supplier_name=$1,contact_person=$2,email=$3,phone=$4,address=$5,city=$6,country=$7,category=$8,status=$9,payment_terms=$10,lead_time_days=$11,rating=$12,updated_at=NOW() WHERE supplier_id=$13 AND tenant_id=$14 RETURNING *',
        [supplier_name, contact_person, email, phone, address, city, country, category, status, payment_terms, lead_time_days, rating, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  deleteSupplier: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      await pool.query('DELETE FROM suppliers WHERE supplier_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
      res.json({ status: 'success', message: 'Supplier deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getPOs: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT po.*, s.supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id=s.supplier_id WHERE po.tenant_id=$1 ORDER BY po.created_at DESC',
        [db.id]
      );
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getPOStats: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query(
        'SELECT COUNT(*) as total, COALESCE(SUM(total_amount),0) as total_value, COUNT(CASE WHEN status=$1 THEN 1 END) as pending, COUNT(CASE WHEN status=$2 THEN 1 END) as received FROM purchase_orders WHERE tenant_id=$3',
        ['Pending', 'Received', db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  createPO: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { supplier_id, expected_delivery, items, notes } = req.body;
      const totalAmount = (items||[]).reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price), 0);
      const autoPONum = await generatePONumber(db.id);
      const result = await pool.query(
        'INSERT INTO purchase_orders (tenant_id,po_number,supplier_id,expected_delivery,total_amount,notes,status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [db.id, autoPONum, supplier_id, expected_delivery, totalAmount, notes, 'Pending']
      );
      const po = result.rows[0];
      for (const item of (items||[])) {
        await pool.query(
          'INSERT INTO po_items (po_id,item_name,quantity,unit_price,total_price) VALUES ($1,$2,$3,$4,$5)',
          [po.po_id, item.item_name, item.quantity, item.unit_price, item.quantity * item.unit_price]
        );
      }
      onPOCreated(po, db.id).catch(console.error);
      res.json({ status: 'success', data: po });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updatePOStatus: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { status, payment_status } = req.body;
      const result = await pool.query(
        'UPDATE purchase_orders SET status=$1,payment_status=$2,updated_at=NOW() WHERE po_id=$3 AND tenant_id=$4 RETURNING *',
        [status, payment_status, req.params.id, db.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
