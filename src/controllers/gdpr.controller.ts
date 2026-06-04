import { Request, Response } from 'express';
import pool from '../config/database';
import { emailService } from '../services/email.service';

const p1 = '$1', p2 = '$2', p3 = '$3', p4 = '$4';

export const gdprController = {

  getUserData: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const [userRes, workspaceRes, historyRes, consentRes] = await Promise.all([
        pool.query('SELECT user_id, first_name, last_name, email, phone_number, status, role, created_at, last_login FROM users WHERE user_id=' + p1, [userId]),
        pool.query('SELECT selected_modules, selected_domains, selected_reports, onboarding_complete, created_at FROM user_workspace WHERE user_id=' + p1, [userId]),
        pool.query('SELECT report_name, domain_name, run_at, status FROM user_report_history WHERE user_id=' + p1 + ' ORDER BY run_at DESC LIMIT 50', [userId]),
        pool.query('SELECT consent_type, consented, consented_at FROM gdpr_consents WHERE user_id=' + p1, [userId])
      ]);
      res.json({ status: 'success', data: { profile: userRes.rows[0]||{}, workspace: workspaceRes.rows[0]||{}, reportHistory: historyRes.rows, consents: consentRes.rows }});
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  exportUserData: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const [userRes, workspaceRes, historyRes] = await Promise.all([
        pool.query('SELECT user_id, first_name, last_name, email, phone_number, status, role, created_at, last_login FROM users WHERE user_id=' + p1, [userId]),
        pool.query('SELECT selected_modules, selected_domains, selected_reports FROM user_workspace WHERE user_id=' + p1, [userId]),
        pool.query('SELECT report_name, domain_name, run_at, status FROM user_report_history WHERE user_id=' + p1 + ' ORDER BY run_at DESC', [userId])
      ]);
      const exportData = { exportedAt: new Date().toISOString(), profile: userRes.rows[0], workspace: workspaceRes.rows[0], reportHistory: historyRes.rows };
      await pool.query('INSERT INTO gdpr_requests (user_id, request_type, status) VALUES (' + p1 + ', ' + p2 + ', ' + p3 + ')', [userId, 'export', 'completed']);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=my-data-export.json');
      res.json(exportData);
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  requestDeletion: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { reason } = req.body;
      const existing = await pool.query('SELECT * FROM gdpr_requests WHERE user_id=' + p1 + ' AND request_type=' + p2 + ' AND status=' + p3, [userId, 'deletion', 'pending']);
      if (existing.rows.length) return res.status(400).json({ status: 'error', message: 'Deletion request already pending' });
      await pool.query('INSERT INTO gdpr_requests (user_id, request_type, status, notes) VALUES (' + p1 + ', ' + p2 + ', ' + p3 + ', ' + p4 + ')', [userId, 'deletion', 'pending', reason]);
      const userRes = await pool.query('SELECT email, first_name FROM users WHERE user_id=' + p1, [userId]);
      if (userRes.rows.length) {
        await emailService.send({ to: 'abhishek240575@gmail.com', subject: 'GDPR Deletion Request', html: '<p>User ' + userRes.rows[0].email + ' requested deletion. Reason: ' + (reason||'Not specified') + '</p>' });
      }
      res.json({ status: 'success', message: 'Deletion request submitted. We will process it within 30 days.' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateConsent: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { consent_type, consented } = req.body;
      await pool.query('INSERT INTO gdpr_consents (user_id, consent_type, consented, consented_at) VALUES (' + p1 + ',' + p2 + ',' + p3 + ',NOW()) ON CONFLICT (user_id, consent_type) DO UPDATE SET consented=' + p3 + ', consented_at=NOW(), updated_at=NOW()', [userId, consent_type, consented]);
      res.json({ status: 'success', message: 'Consent updated' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getConsents: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const result = await pool.query('SELECT * FROM gdpr_consents WHERE user_id=' + p1, [userId]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getRequests: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const result = await pool.query('SELECT * FROM gdpr_requests WHERE user_id=' + p1 + ' ORDER BY created_at DESC', [userId]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  saveCookieConsent: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId || null;
      const { analytics, marketing, functional } = req.body;
      await pool.query('INSERT INTO cookie_consents (user_id, analytics, marketing, functional) VALUES (' + p1 + ',' + p2 + ',' + p3 + ',' + p4 + ')', [userId, analytics||false, marketing||false, functional||true]);
      res.json({ status: 'success', message: 'Cookie preferences saved' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};