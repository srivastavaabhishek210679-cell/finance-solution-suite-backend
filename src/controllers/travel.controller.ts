import { Request, Response } from 'express';
import pool from '../config/database';

export const travelController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM travel_requests ORDER BY created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const { employee_name, department, destination, purpose, departure_date, return_date, travel_mode, estimated_cost, hotel_required, advance_required, notes } = req.body;
      const safeDeparture = departure_date || null;
      const safeReturn = return_date || null;
      const safeHotel = hotel_required === true || hotel_required === 'true' ? true : false;
      const result = await pool.query('INSERT INTO travel_requests (employee_name, department, destination, purpose, departure_date, return_date, travel_mode, estimated_cost, hotel_required, advance_required, notes) VALUES (,,,,,,,,,,) RETURNING *', [employee_name, department, destination, purpose, safeDeparture, safeReturn, travel_mode, estimated_cost||0, safeHotel, advance_required||0, notes]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateStatus: async (req: Request, res: Response) => {
    try {
      const { status, approved_by, actual_cost } = req.body;
      const result = await pool.query('UPDATE travel_requests SET status=, approved_by=, actual_cost= WHERE travel_id= RETURNING *', [status, approved_by, actual_cost||0, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getStats: async (req: Request, res: Response) => {
    try {
      const total = await pool.query('SELECT COUNT(*) as total FROM travel_requests');
      const pending = await pool.query("SELECT COUNT(*) as pending FROM travel_requests WHERE status='Pending'");
      const approved = await pool.query("SELECT COUNT(*) as approved, SUM(estimated_cost) as total_cost FROM travel_requests WHERE status='Approved'");
      const byDept = await pool.query('SELECT department, COUNT(*) as count, SUM(estimated_cost) as total FROM travel_requests GROUP BY department ORDER BY total DESC');
      res.json({ status: 'success', data: { total: total.rows[0].total, pending: pending.rows[0].pending, approved: approved.rows[0].approved, totalCost: approved.rows[0].total_cost, byDepartment: byDept.rows } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
