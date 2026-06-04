import { Request, Response } from 'express';
import pool from '../config/database';
import { emailService } from '../services/email.service';
import crypto from 'crypto';

export const emailVerifyController = {
  sendVerification: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await pool.query('UPDATE users SET email_verify_token=$1, email_verify_expires=$2 WHERE email=$3', [token, expires, email]);
      const verifyUrl = 'https://finance-frontend-2l6b.onrender.com/verify-email?token=' + token + '&email=' + encodeURIComponent(email);
      const html = '<div style="font-family:Arial,sans-serif"><h2 style="color:#10b981">Finance Solution Suite</h2><p>Please verify your email: <a href="' + verifyUrl + '">Click here to verify</a></p><p>Link expires in 24 hours.</p></div>';
      await emailService.send({ to: email, subject: 'Verify your Finance Suite email', html });
      res.json({ status: 'success', message: 'Verification email sent' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  verifyEmail: async (req: Request, res: Response) => {
    try {
      const { token, email } = req.query;
      const result = await pool.query('SELECT * FROM users WHERE email=$1 AND email_verify_token=$2', [email, token]);
      if (!result.rows.length) return res.status(400).json({ status: 'error', message: 'Invalid or expired link' });
      const user = result.rows[0];
      if (new Date() > new Date(user.email_verify_expires)) return res.status(400).json({ status: 'error', message: 'Link expired' });
      await pool.query('UPDATE users SET email_verified=true, email_verify_token=NULL, email_verify_expires=NULL WHERE email=$1', [email]);
      res.json({ status: 'success', message: 'Email verified! You can now login.' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  checkVerification: async (req: Request, res: Response) => {
    try {
      const { email } = req.query;
      const result = await pool.query('SELECT email_verified FROM users WHERE email=$1', [email]);
      if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });
      res.json({ status: 'success', data: { verified: result.rows[0].email_verified } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};