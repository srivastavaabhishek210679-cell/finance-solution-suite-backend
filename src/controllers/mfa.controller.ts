import { Request, Response } from 'express';
import pool from '../config/database';
import { emailService } from '../services/email.service';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const otpEmailTemplate = (otp: string) => {
  const divStyle = 'font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#f1f5f9;padding:30px;border-radius:12px;';
  const h2Style = 'color:#10b981;margin-bottom:20px;';
  const pStyle = 'color:#94a3b8;margin-bottom:20px;';
  const boxStyle = 'background:#1e293b;border:2px solid #10b981;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;';
  const spanStyle = 'font-size:36px;font-weight:700;color:#10b981;letter-spacing:8px;';
  const footStyle = 'color:#64748b;font-size:13px;';
  return '<div style="' + divStyle + '"><h2 style="' + h2Style + '">Finance Solution Suite</h2><p style="' + pStyle + '">Your One-Time Password (OTP) for login:</p><div style="' + boxStyle + '"><span style="' + spanStyle + '">' + otp + '</span></div><p style="' + footStyle + '">This OTP expires in 10 minutes. Do not share it with anyone.</p></div>';
};

export const mfaController = {
  sendOTP: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const userResult = await pool.query('SELECT * FROM users WHERE email=' + "''", [email]);
      if (!userResult.rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await pool.query('UPDATE users SET otp_code=' + "''" + ', otp_expires_at=' + "''" + ' WHERE email=' + "''", [otp, expiresAt, email]);
      await emailService.sendEmail({ to: email, subject: 'Your Finance Suite OTP Code', html: otpEmailTemplate(otp) });
      res.json({ status: 'success', message: 'OTP sent to your email' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  verifyOTP: async (req: Request, res: Response) => {
    try {
      const { email, otp } = req.body;
      const result = await pool.query('SELECT * FROM users WHERE email=' + "''", [email]);
      if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });
      const user = result.rows[0];
      if (!user.otp_code || user.otp_code !== otp) return res.status(400).json({ status: 'error', message: 'Invalid OTP' });
      if (new Date() > new Date(user.otp_expires_at)) return res.status(400).json({ status: 'error', message: 'OTP expired. Please request a new OTP.' });
      await pool.query('UPDATE users SET otp_code=NULL, otp_expires_at=NULL WHERE email=' + "''", [email]);
      res.json({ status: 'success', message: 'OTP verified successfully' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getMFAStatus: async (req: Request, res: Response) => {
    try {
      const { email } = req.query;
      const result = await pool.query('SELECT mfa_enabled, role FROM users WHERE email=' + "''", [email]);
      if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });
      res.json({ status: 'success', data: { mfa_enabled: result.rows[0].mfa_enabled, role: result.rows[0].role } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  toggleMFA: async (req: Request, res: Response) => {
    try {
      const { email, enabled } = req.body;
      await pool.query('UPDATE users SET mfa_enabled=' + "''" + ' WHERE email=' + "''", [enabled, email]);
      res.json({ status: 'success', message: enabled ? 'MFA enabled' : 'MFA disabled' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};