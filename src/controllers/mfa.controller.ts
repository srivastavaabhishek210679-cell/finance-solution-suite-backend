import { Request, Response } from 'express';
import pool from '../config/database';
import { emailService } from '../services/email.service';
import https from 'https';

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendSMSOTP = (mobile: string, otp: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const apiKey = process.env.FAST2SMS_API_KEY || '';
    const message = 'Your Finance Suite OTP is ' + otp + '. Valid for 10 minutes. Do not share with anyone.';
    const url = 'https://www.fast2sms.com/dev/bulkV2?authorization=' + apiKey + '&route=otp&variables_values=' + otp + '&flash=0&numbers=' + mobile;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log('[Fast2SMS]', parsed);
          resolve(parsed.return === true);
        } catch(e) { resolve(false); }
      });
    }).on('error', (e) => { console.error('[Fast2SMS Error]', e); resolve(false); });
  });
};

const otpEmailTemplate = (otp: string) => {
  return '<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;background:#0f172a;color:#f1f5f9;padding:30px;border-radius:12px;"><h2 style="color:#10b981;margin-bottom:20px;">Finance Solution Suite</h2><p style="color:#94a3b8;margin-bottom:20px;">Your One-Time Password (OTP) for login:</p><div style="background:#1e293b;border:2px solid #10b981;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;"><span style="font-size:36px;font-weight:700;color:#10b981;letter-spacing:8px;">' + otp + '</span></div><p style="color:#64748b;font-size:13px;">This OTP expires in 10 minutes. Do not share it with anyone.</p></div>';
};

export const mfaController = {
  sendOTP: async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const userResult = await pool.query('SELECT * FROM users WHERE email = ' + String.fromCharCode(36) + '1', [email]);
      if (!userResult.rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });
      const user = userResult.rows[0];
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await pool.query('UPDATE users SET otp_code = ' + String.fromCharCode(36) + '1, otp_expires_at = ' + String.fromCharCode(36) + '2 WHERE email = ' + String.fromCharCode(36) + '3', [otp, expiresAt, email]);

      let smsSent = false;
      let emailSent = false;
      let deliveryMethod = '';

      // Try SMS first if mobile number exists
      if (user.mobile_number) {
        const mobile = user.mobile_number.replace(/\D/g, '').slice(-10);
        smsSent = await sendSMSOTP(mobile, otp);
        if (smsSent) deliveryMethod = 'SMS to ' + user.mobile_number.slice(-4).padStart(user.mobile_number.length, '*');
      }

      // Fallback to email if SMS failed or no mobile
      if (!smsSent) {
        try {
          await emailService.send({ to: email, subject: 'Your Finance Suite OTP Code', html: otpEmailTemplate(otp) });
          emailSent = true;
          deliveryMethod = 'email to ' + email.replace(/(.{2}).*(@.*)/, '***');
        } catch(e) { console.error('[Email OTP Error]', e); }
      }

      if (!smsSent && !emailSent) {
        // Last resort - log OTP for admin testing
        console.log('[OTP FALLBACK] Email:', email, 'OTP:', otp);
        return res.json({ status: 'success', message: 'OTP generated. Check server logs.', debug: process.env.NODE_ENV !== 'production' ? otp : undefined });
      }

      res.json({ status: 'success', message: 'OTP sent via ' + deliveryMethod });
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
      const result = await pool.query('SELECT mfa_enabled, role, mobile_number FROM users WHERE email = ' + String.fromCharCode(36) + '1', [email]);
      if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'User not found' });
      res.json({ status: 'success', data: { mfa_enabled: result.rows[0].mfa_enabled, role: result.rows[0].role, has_mobile: !!result.rows[0].mobile_number } });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  toggleMFA: async (req: Request, res: Response) => {
    try {
      const { email, enabled } = req.body;
      await pool.query('UPDATE users SET mfa_enabled = ' + String.fromCharCode(36) + '1 WHERE email = ' + String.fromCharCode(36) + '2', [enabled, email]);
      res.json({ status: 'success', message: enabled ? 'MFA enabled' : 'MFA disabled' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateMobile: async (req: Request, res: Response) => {
    try {
      const { email, mobile_number } = req.body;
      await pool.query('UPDATE users SET mobile_number = ' + String.fromCharCode(36) + '1 WHERE email = ' + String.fromCharCode(36) + '2', [mobile_number, email]);
      res.json({ status: 'success', message: 'Mobile number updated' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};