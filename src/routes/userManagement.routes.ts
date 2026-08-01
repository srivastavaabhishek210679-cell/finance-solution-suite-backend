import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate);

// Get all users in tenant
router.get('/', authorize('users:read'), async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const result = await pool.query(
      'SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone_number, u.status, u.last_login, u.created_at, r.role_name, r.role_id FROM users u LEFT JOIN roles r ON u.role_id=r.role_id WHERE u.tenant_id=$1 ORDER BY u.created_at DESC',
      [db.id]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Get single user
router.get('/:id', authorize('users:read'), async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const result = await pool.query(
      'SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone_number, u.status, u.last_login, r.role_name, r.role_id FROM users u LEFT JOIN roles r ON u.role_id=r.role_id WHERE u.user_id=$1 AND u.tenant_id=$2',
      [req.params.id, db.id]
    );
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Invite/create new user in tenant
router.post('/', authorize('users:create'), async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const { first_name, last_name, email, phone_number, role_id, password } = req.body;
    if (!first_name || !last_name || !email) return res.status(400).json({ status: 'error', message: 'first_name, last_name and email are required' });

    // Check email not already used
    const existing = await pool.query('SELECT user_id FROM users WHERE email=$1', [email]);
    if (existing.rows.length) return res.status(409).json({ status: 'error', message: 'Email already registered' });

    const tempPassword = password || Math.random().toString(36).slice(-8) + 'A1!';
    const hash = await bcrypt.hash(tempPassword, 10);

    const result = await pool.query(
      'INSERT INTO users (tenant_id,first_name,last_name,email,phone_number,role_id,password_hash,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING user_id,first_name,last_name,email,status',
      [db.id, first_name, last_name, email, phone_number||'', role_id||3, hash, 'active']
    );

    // Send welcome email
    const { emailService } = await import('../services/email.service');
    const frontendUrl = process.env.FRONTEND_URL || 'https://finance-frontend-2l6b.onrender.com';
    await emailService.send({
      to: email,
      subject: 'Welcome to Deemona Enterprise Finance Suite',
      html: '<div style="font-family:Arial,sans-serif"><h2 style="color:#1e3a5f">Welcome to Deemona ERP!</h2><p>Your account has been created.</p><p><strong>Email:</strong> ' + email + '</p><p><strong>Password:</strong> ' + tempPassword + '</p><p><a href="' + frontendUrl + '/login" style="background:#1e3a5f;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;">Login Now</a></p><p>Please change your password after first login.</p></div>'
    }).catch(console.error);

    res.json({
      status: 'success',
      message: 'User created and welcome email sent',
      data: result.rows[0],
      temp_password: tempPassword
    });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Update user
router.put('/:id', authorize('users:update'), async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const { first_name, last_name, phone_number, role_id, status } = req.body;
    const result = await pool.query(
      'UPDATE users SET first_name=$1,last_name=$2,phone_number=$3,role_id=$4,status=$5,updated_at=NOW() WHERE user_id=$6 AND tenant_id=$7 RETURNING user_id,first_name,last_name,email,status,role_id',
      [first_name, last_name, phone_number, role_id, status, req.params.id, db.id]
    );
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Delete user (soft delete)
router.delete('/:id', authorize('users:delete'), async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const currentUser = (req as any).user?.userId;
    if (parseInt(req.params.id) === currentUser) return res.status(400).json({ status: 'error', message: 'Cannot delete your own account' });
    await pool.query('UPDATE users SET status=$1 WHERE user_id=$2 AND tenant_id=$3', ['inactive', req.params.id, db.id]);
    res.json({ status: 'success', message: 'User deactivated' });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Reset user password (admin action)
router.post('/:id/reset-password', authorize('users:update'), async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const user = await pool.query('SELECT email FROM users WHERE user_id=$1 AND tenant_id=$2', [req.params.id, db.id]);
    if (!user.rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const hash = await bcrypt.hash(tempPassword, 10);
    await pool.query('UPDATE users SET password_hash=$1 WHERE user_id=$2 AND tenant_id=$3', [hash, req.params.id, db.id]);
    const { emailService } = await import('../services/email.service');
    await emailService.send({
      to: user.rows[0].email,
      subject: 'Password Reset - Deemona ERP',
      html: '<p>Your password has been reset by an administrator.</p><p><strong>New Password:</strong> ' + tempPassword + '</p><p>Please change your password after login.</p>'
    }).catch(console.error);
    res.json({ status: 'success', message: 'Password reset and email sent', temp_password: tempPassword });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Get tenant user stats
router.get('/stats/summary', authorize('users:read'), async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const result = await pool.query(
      'SELECT COUNT(*) as total, COUNT(CASE WHEN status=$1 THEN 1 END) as active, COUNT(CASE WHEN status=$2 THEN 1 END) as inactive, COUNT(CASE WHEN role_id=$3 THEN 1 END) as admins FROM users WHERE tenant_id=$4',
      ['active', 'inactive', 1, db.id]
    );
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

export default router;
