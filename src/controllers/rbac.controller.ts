import { Request, Response } from 'express';
import pool from '../config/database';
const q = (n: number) => '$' + n;

export const rbacController = {
  getRoles: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT r.*, COUNT(ur.id) as user_count FROM app_roles r LEFT JOIN user_app_roles ur ON r.role_id=ur.role_id GROUP BY r.role_id ORDER BY r.role_id');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  createRole: async (req: Request, res: Response) => {
    try {
      const { role_name, description, permissions } = req.body;
      const result = await pool.query('INSERT INTO app_roles (role_name, description, permissions) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ') RETURNING *', [role_name, description, JSON.stringify(permissions||{})]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  updateRole: async (req: Request, res: Response) => {
    try {
      const { role_name, description, permissions } = req.body;
      const result = await pool.query('UPDATE app_roles SET role_name=' + q(1) + ', description=' + q(2) + ', permissions=' + q(3) + ' WHERE role_id=' + q(4) + ' AND is_system=false RETURNING *', [role_name, description, JSON.stringify(permissions||{}), req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  deleteRole: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM app_roles WHERE role_id=' + q(1) + ' AND is_system=false', [req.params.id]);
      res.json({ status: 'success', message: 'Role deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getUserRoles: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT u.user_id, u.email, u.first_name, u.last_name, array_agg(r.role_name) as roles FROM users u LEFT JOIN user_app_roles ur ON u.user_id=ur.user_id LEFT JOIN app_roles r ON ur.role_id=r.role_id GROUP BY u.user_id ORDER BY u.email');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  assignRole: async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user?.userId;
      const { user_id, role_id } = req.body;
      await pool.query('INSERT INTO user_app_roles (user_id, role_id, assigned_by) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ') ON CONFLICT (user_id, role_id) DO NOTHING', [user_id, role_id, adminId]);
      res.json({ status: 'success', message: 'Role assigned' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  removeRole: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM user_app_roles WHERE user_id=' + q(1) + ' AND role_id=' + q(2), [req.body.user_id, req.params.id]);
      res.json({ status: 'success', message: 'Role removed' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};