import { Request, Response } from 'express';
import pool from '../config/database';
import { emailService } from '../services/email.service';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const otpEmailTemplate = (otp: string) => {
  return '<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#f1f5f9;padding:30px;border-radius:12px;"><h2 style="color:#10b981;margin-bottom:20px;">Finance Solution Suite</h2><p style="color:#94a3b8;margin-bottom:20px;">Your One-Time Password (OTP) for login:</p><div style="background:#1e293b;border:2px solid #10b981;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;"><span style="font-size:36px;font-weight:700;color:#10b981;letter-spacing:8px;">' + otp + '</span></div><p style="color:#64748b;font-size:13px;">This OTP expires in 10 minutes. Do not share it with anyone.</p></div>';
};

export const mfaController = {
  sendOTP: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const userResult = await pool.query('SELECT * FROM users WHERE email = ' + String.fromCharCode(36) + '1', [email]);
      if (!userResult.rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await pool.query('UPDATE users SET otp_code = ' + String.fromCharCode(36) + '1, otp_expires_at = ' + String.fromCharCode(36) + '2 WHERE email = ' + String.fromCharCode(36) + '3', [otp, expiresAt, email]);
      await emailService.sendEmail({ to: email, subject: 'Your Finance Suite OTP Code', html: otpEmailTemplate(otp) });
      res.json({ status: 'success', message: 'OTP sent to your email' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  verifyOTP: async (req: Request, res: Response) => {
    try {
      const { email, otp } = req.body;
      const result = await pool.query('SELECT * FROM users WHERE email = ' + String.fromCharCode(36) + '1', [email]);
      if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });
      const user = result.rows[0];
      if (!user.otp_code || user.otp_code !== otp) return res.status(400).json({ status: 'error', message: 'Invalid OTP. Please try again.' });
      if (new Date() > new Date(user.otp_expires_at)) return res.status(400).json({ status: 'error', message: 'OTP expired. Please request a new one.' });
      await pool.query('UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE email = ' + String.fromCharCode(36) + '1', [email]);
      res.json({ status: 'success', message: 'OTP verified successfully' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getMFAStatus: async (req: Request, res: Response) => {
    try {
      const { email } = req.query;
      const result = await pool.query('SELECT mfa_enabled, role FROM users WHERE email = ' + String.fromCharCode(36) + '1', [email]);
      if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });
      res.json({ status: 'success', data: { mfa_enabled: result.rows[0].mfa_enabled, role: result.rows[0].role } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  toggleMFA: async (req: Request, res: Response) => {
    try {
      const { email, enabled } = req.body;
      await pool.query('UPDATE users SET mfa_enabled = ' + String.fromCharCode(36) + '1 WHERE email = ' + String.fromCharCode(36) + '2', [enabled, email]);
      res.json({ status: 'success', message: enabled ? 'MFA enabled' : 'MFA disabled' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};