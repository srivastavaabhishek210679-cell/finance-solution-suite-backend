import { Request, Response } from 'express';
import pool from '../config/database';

export const workspaceController = {
  // Get user workspace
  getWorkspace: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const result = await pool.query('SELECT * FROM user_workspace WHERE user_id=' + String.fromCharCode(36) + '1', [userId]);
      if (!result.rows.length) {
        return res.json({ status: 'success', data: { onboarding_complete: false, selected_modules: [], selected_domains: [], selected_reports: [] } });
      }
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Save workspace after onboarding
  saveWorkspace: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { selected_modules, selected_domains, selected_reports } = req.body;
      const result = await pool.query(
        'INSERT INTO user_workspace (user_id, selected_modules, selected_domains, selected_reports, onboarding_complete) VALUES (' + String.fromCharCode(36) + '1,' + String.fromCharCode(36) + '2,' + String.fromCharCode(36) + '3,' + String.fromCharCode(36) + '4,true) ON CONFLICT (user_id) DO UPDATE SET selected_modules=' + String.fromCharCode(36) + '2, selected_domains=' + String.fromCharCode(36) + '3, selected_reports=' + String.fromCharCode(36) + '4, onboarding_complete=true, updated_at=NOW() RETURNING *',
        [userId, JSON.stringify(selected_modules||[]), JSON.stringify(selected_domains||[]), JSON.stringify(selected_reports||[])]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Get all modules with domain info
  getModules: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT m.*, d.domain_name, d.color as domain_color FROM module_domain_mapping m JOIN domains d ON m.domain_id=d.domain_id ORDER BY d.domain_name, m.module_name');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Get reports filtered by selected domains
  getFilteredReports: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const workspace = await pool.query('SELECT selected_domains FROM user_workspace WHERE user_id=' + String.fromCharCode(36) + '1', [userId]);
      if (!workspace.rows.length) return res.json({ status: 'success', data: [] });
      const domains = workspace.rows[0].selected_domains || [];
      if (!domains.length) return res.json({ status: 'success', data: [] });
      const result = await pool.query('SELECT r.report_id, r.name, r.description, r.frequency, r.report_category, d.domain_name, d.domain_id FROM reports_master r JOIN domains d ON r.domain_id=d.domain_id WHERE r.domain_id=ANY(' + String.fromCharCode(36) + '1) AND r.is_active=true ORDER BY d.domain_name, r.name', [domains]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Get reports by specific domain IDs (for onboarding preview)
  getReportsByDomains: async (req: Request, res: Response) => {
    try {
      const domainIds = req.query.domains ? String(req.query.domains).split(',').map(Number) : [];
      if (!domainIds.length) return res.json({ status: 'success', data: [] });
      const result = await pool.query('SELECT r.report_id, r.name, r.description, r.frequency, r.report_category, d.domain_name, d.domain_id FROM reports_master r JOIN domains d ON r.domain_id=d.domain_id WHERE r.domain_id=ANY(' + String.fromCharCode(36) + '1) AND r.is_active=true ORDER BY d.domain_name, r.name', [domainIds]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Save report to history
  saveReportHistory: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { report_id, report_name, domain_name, domain_id, file_name, notes } = req.body;
      const result = await pool.query('INSERT INTO user_report_history (user_id, report_id, report_name, domain_name, domain_id, file_name, notes) VALUES (' + String.fromCharCode(36) + '1,' + String.fromCharCode(36) + '2,' + String.fromCharCode(36) + '3,' + String.fromCharCode(36) + '4,' + String.fromCharCode(36) + '5,' + String.fromCharCode(36) + '6,' + String.fromCharCode(36) + '7) RETURNING *', [userId, report_id, report_name, domain_name, domain_id, file_name, notes]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Get report history for user
  getReportHistory: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { domain, search, limit } = req.query;
      let query = 'SELECT * FROM user_report_history WHERE user_id=' + String.fromCharCode(36) + '1';
      const params: any[] = [userId];
      if (domain) { params.push(domain); query += ' AND domain_name=' + String.fromCharCode(36) + params.length; }
      if (search) { params.push('%'+search+'%'); query += ' AND (report_name ILIKE ' + String.fromCharCode(36) + params.length + ' OR domain_name ILIKE ' + String.fromCharCode(36) + params.length + ')'; }
      query += ' ORDER BY run_at DESC LIMIT ' + (limit || 50);
      const result = await pool.query(query, params);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Get all domains
  getDomains: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM domains WHERE is_active=true ORDER BY sort_order, domain_name');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
,

  // Save full report with data
  saveFullReport: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { report_name, domain_name, domain_id, template_id, total_records, file_name, report_data, notes } = req.body;
      const result = await pool.query(
        'INSERT INTO user_report_history (user_id, report_name, domain_name, domain_id, template_id, total_records, file_name, report_data, notes) VALUES (' + String.fromCharCode(36) + '1,' + String.fromCharCode(36) + '2,' + String.fromCharCode(36) + '3,' + String.fromCharCode(36) + '4,' + String.fromCharCode(36) + '5,' + String.fromCharCode(36) + '6,' + String.fromCharCode(36) + '7,' + String.fromCharCode(36) + '8,' + String.fromCharCode(36) + '9) RETURNING *',
        [userId, report_name, domain_name, domain_id||null, template_id, total_records||0, file_name, JSON.stringify(report_data||{}), notes]
      );
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  // Get single report with full data
  getReportById: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const result = await pool.query(
        'SELECT * FROM user_report_history WHERE history_id=' + String.fromCharCode(36) + '1 AND user_id=' + String.fromCharCode(36) + '2',
        [req.params.id, userId]
      );
      if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Report not found' });
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};
