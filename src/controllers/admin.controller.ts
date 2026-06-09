import { Request, Response } from 'express';
import pool from '../config/database';
const q = (n: number) => '$' + n;

export const adminController = {

  getDashboardStats: async (req: Request, res: Response) => {
    try {
      const [users, tenants, reports, orders, invoices, notifications, approvals, webhooks] = await Promise.all([
        pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status=' + "'active'" + ' THEN 1 END) as active, COUNT(CASE WHEN created_at >= NOW() - INTERVAL ' + "'7 days'" + ' THEN 1 END) as new_this_week FROM users'),
        pool.query('SELECT COUNT(*) as total FROM tenants'),
        pool.query('SELECT COUNT(*) as total FROM report_run_history'),
        pool.query('SELECT COUNT(*) as total, COALESCE(SUM(total_amount),0) as revenue FROM orders'),
        pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status=' + "'Paid'" + ' THEN 1 END) as paid FROM generated_invoices'),
        pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN is_read=false THEN 1 END) as unread FROM app_notifications'),
        pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN status=' + "'Pending'" + ' THEN 1 END) as pending FROM approval_requests'),
        pool.query('SELECT COUNT(*) as total, COUNT(CASE WHEN is_active=true THEN 1 END) as active FROM app_webhooks')
      ]);
      res.json({ status: 'success', data: {
        users: users.rows[0], tenants: tenants.rows[0], reports: reports.rows[0],
        orders: orders.rows[0], invoices: invoices.rows[0], notifications: notifications.rows[0],
        approvals: approvals.rows[0], webhooks: webhooks.rows[0]
      }});
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getAllUsers: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT u.user_id, u.email, u.first_name, u.last_name, u.status, u.created_at, u.last_login, t.company_name as tenant_name, array_agg(r.role_name) as roles FROM users u LEFT JOIN tenants t ON u.tenant_id=t.tenant_id LEFT JOIN user_app_roles ur ON u.user_id=ur.user_id LEFT JOIN app_roles r ON ur.role_id=r.role_id GROUP BY u.user_id, t.company_name ORDER BY u.created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  toggleUserStatus: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('UPDATE users SET status=CASE WHEN status=' + "'active'" + ' THEN ' + "'inactive'" + ' ELSE ' + "'active'" + ' END WHERE user_id=' + q(1) + ' RETURNING user_id, email, status', [req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  resetUserPassword: async (req: Request, res: Response) => {
    try {
      const bcrypt = require('bcrypt');
      const newPassword = 'Reset@' + Math.floor(1000 + Math.random() * 9000);
      const hashed = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password_hash=' + q(1) + ' WHERE user_id=' + q(2), [hashed, req.params.id]);
      res.json({ status: 'success', data: { temporary_password: newPassword } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  deleteUser: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM users WHERE user_id=' + q(1), [req.params.id]);
      res.json({ status: 'success', message: 'User deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getSettings: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM admin_settings ORDER BY category, setting_key');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateSetting: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const result = await pool.query('UPDATE admin_settings SET setting_value=' + q(1) + ', updated_by=' + q(2) + ', updated_at=NOW() WHERE setting_key=' + q(3) + ' RETURNING *', [req.body.setting_value, userId, req.params.key]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getModules: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM tenant_modules ORDER BY module_name');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  toggleModule: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const result = await pool.query('UPDATE tenant_modules SET is_enabled=NOT is_enabled, enabled_by=' + q(1) + ', enabled_at=NOW() WHERE id=' + q(2) + ' RETURNING *', [userId, req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getPlans: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT p.*, s.status as sub_status, s.start_date, s.end_date FROM subscription_plans p LEFT JOIN tenant_subscriptions s ON p.plan_id=s.plan_id ORDER BY p.price_monthly ASC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getAuditLog: async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const result = await pool.query('SELECT a.log_id, a.action, a.table_name as module, a.event_details as details, a.ip_address, a.created_at, u.email FROM audit_logs a LEFT JOIN users u ON a.user_id=u.user_id ORDER BY a.created_at DESC LIMIT ' + q(1) + ' OFFSET ' + q(2), [limit, offset]);
      const count = await pool.query('SELECT COUNT(*) FROM audit_logs');
      res.json({ status: 'success', data: result.rows, total: parseInt(count.rows[0].count) });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getSystemHealth: async (req: Request, res: Response) => {
    try {
      const dbStart = Date.now();
      await pool.query('SELECT 1');
      const dbLatency = Date.now() - dbStart;
      const [tableCount, totalRows, storageEst] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=' + "'public'"),
        pool.query('SELECT SUM(n_live_tup) as total FROM pg_stat_user_tables'),
        pool.query('SELECT pg_size_pretty(pg_database_size(current_database())) as size')
      ]);
      res.json({ status: 'success', data: {
        db_latency_ms: dbLatency,
        db_status: dbLatency < 500 ? 'healthy' : 'slow',
        table_count: parseInt(tableCount.rows[0].count),
        total_rows: parseInt(totalRows.rows[0].total || 0),
        db_size: storageEst.rows[0].size,
        server_time: new Date().toISOString(),
        uptime: process.uptime()
      }});
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getTenants: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT t.*, COUNT(u.user_id) as user_count, s.status as sub_status, p.plan_name FROM tenants t LEFT JOIN users u ON t.tenant_id=u.tenant_id LEFT JOIN tenant_subscriptions s ON t.tenant_id=s.tenant_id LEFT JOIN subscription_plans p ON s.plan_id=p.plan_id GROUP BY t.tenant_id, s.status, p.plan_name ORDER BY t.created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};