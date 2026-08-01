import { Request, Response } from 'express';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';
import { onLeaveSubmitted, onLeaveStatusChanged } from '../services/events.service';

export const leaveController = {
  getRequests: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM leave_requests WHERE tenant_id=$1 ORDER BY created_at DESC', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  createRequest: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { employee_name, leave_type, start_date, end_date, days, reason } = req.body;
      const result = await pool.query(
        'INSERT INTO leave_requests (tenant_id,employee_name,leave_type,start_date,end_date,total_days,reason) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
        [db.id, employee_name, leave_type, start_date, end_date, days, reason]
      );
      onLeaveSubmitted({...result.rows[0], reason}, db.id).catch(console.error);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateStatus: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const { status, approved_by } = req.body;
      const result = await pool.query(
        'UPDATE leave_requests SET status=$1,approved_by=$2,updated_at=NOW() WHERE leave_id=$3 AND tenant_id=$4 RETURNING *',
        [status, approved_by, req.params.id, db.id]
      );
      onLeaveStatusChanged(result.rows[0], db.id, status).catch(console.error);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getTypes: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM leave_types ORDER BY type_name');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getBalance: async (req: Request, res: Response) => {
    try {
      const db = getTenantDB(req);
      const result = await pool.query('SELECT * FROM leave_balances WHERE tenant_id=$1', [db.id]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
