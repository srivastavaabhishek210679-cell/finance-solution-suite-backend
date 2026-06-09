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
      const result = await pool.query('SELECT u.user_id, u.email, u.first_name, u.last_name, u.status, u.created_at, u.last_login, t.tenant_name, array_agg(r.role_name) as roles FROM users u LEFT JOIN tenants t ON u.tenant_id=t.tenant_id LEFT JOIN user_app_roles ur ON u.user_id=ur.user_id LEFT JOIN app_roles r ON ur.role_id=r.role_id GROUP BY u.user_id, t.tenant_name ORDER BY u.created_at DESC');
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
  },

  // Broadcast notification to all users
  broadcastNotification: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { title, message, type, link } = req.body;
      const users = await pool.query('SELECT user_id FROM users WHERE status=' + "'active'");
      for (const u of users.rows) {
        await pool.query('INSERT INTO app_notifications (user_id, title, message, type, link) VALUES ($1,$2,$3,$4,$5)',
          [u.user_id, title, message, type||'info', link||'/dashboard']);
      }
      res.json({ status: 'success', message: 'Broadcast sent to ' + users.rows.length + ' users' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Get database table stats
  getDBStats: async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT t.table_name, s.n_live_tup as row_count,
        pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name))) as total_size
        FROM information_schema.tables t
        LEFT JOIN pg_stat_user_tables s ON t.table_name = s.relname
        WHERE t.table_schema = 'public'
        ORDER BY s.n_live_tup DESC NULLS LAST
      `);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Get user activity - recent logins
  getUserActivity: async (req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT u.user_id, u.email, u.first_name, u.last_name, u.last_login, u.status,
        COUNT(a.log_id) as action_count
        FROM users u
        LEFT JOIN audit_logs a ON u.user_id=a.user_id AND a.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY u.user_id
        ORDER BY u.last_login DESC NULLS LAST LIMIT 20
      `);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Impersonate user - generate token for any user
  impersonateUser: async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user?.userId;
      const admin = await pool.query('SELECT role FROM users WHERE user_id=$1', [adminId]);
      if (admin.rows[0]?.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Admin only' });
      const target = await pool.query('SELECT * FROM users WHERE user_id=$1', [req.params.id]);
      if (!target.rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { userId: target.rows[0].user_id, email: target.rows[0].email, role: target.rows[0].role, tenantId: target.rows[0].tenant_id, impersonatedBy: adminId },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '1h' }
      );
      res.json({ status: 'success', data: { token, user: { email: target.rows[0].email, role: target.rows[0].role } } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Get system stats - storage, connections
  getSystemStats: async (req: Request, res: Response) => {
    try {
      const [dbSize, connections, tableCount, indexCount] = await Promise.all([
        pool.query('SELECT pg_size_pretty(pg_database_size(current_database())) as size, pg_database_size(current_database()) as bytes'),
        pool.query('SELECT count(*) as total, count(CASE WHEN state=' + "'active'" + ' THEN 1 END) as active FROM pg_stat_activity'),
        pool.query('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema=' + "'public'"),
        pool.query('SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname=' + "'public'")
      ]);
      res.json({ status: 'success', data: {
        db_size: dbSize.rows[0].size,
        db_bytes: dbSize.rows[0].bytes,
        connections: connections.rows[0],
        table_count: tableCount.rows[0].count,
        index_count: indexCount.rows[0].count,
        node_version: process.version,
        uptime_seconds: process.uptime(),
        memory: process.memoryUsage()
      }});
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Create new user
  createUser: async (req: Request, res: Response) => {
    try {
      const bcrypt = require('bcrypt');
      const { email, first_name, last_name, role, tenant_id, password } = req.body;
      const existing = await pool.query('SELECT user_id FROM users WHERE email=$1', [email]);
      if (existing.rows.length) return res.status(400).json({ status: 'error', message: 'Email already exists' });
      const hashed = await bcrypt.hash(password || 'Welcome@2026', 10);
      const result = await pool.query(
        'INSERT INTO users (email, first_name, last_name, role, tenant_id, password_hash, status) VALUES ($1,$2,$3,$4,$5,$6,' + "'active'" + ') RETURNING user_id, email, first_name, last_name, role, status',
        [email, first_name, last_name, role||'user', tenant_id||1, hashed]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Update user
  updateUser: async (req: Request, res: Response) => {
    try {
      const { first_name, last_name, role, status } = req.body;
      const result = await pool.query(
        'UPDATE users SET first_name=COALESCE($1,first_name), last_name=COALESCE($2,last_name), role=COALESCE($3,role), status=COALESCE($4,status), updated_at=NOW() WHERE user_id=$5 RETURNING *',
        [first_name, last_name, role, status, req.params.id]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Cleanup old data
  runCleanup: async (req: Request, res: Response) => {
    try {
      const { days } = req.body;
      const retainDays = parseInt(days) || 90;
      const [notifs, logs] = await Promise.all([
        pool.query('DELETE FROM app_notifications WHERE created_at < NOW() - INTERVAL ' + "'" + retainDays + " days" + "' AND is_read=true"),
        pool.query('DELETE FROM webhook_logs WHERE triggered_at < NOW() - INTERVAL ' + "'" + retainDays + " days" + "'")
      ]);
      res.json({ status: 'success', message: 'Cleaned ' + notifs.rowCount + ' notifications and ' + logs.rowCount + ' webhook logs' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};