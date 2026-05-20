import { Request, Response } from 'express';
import pool from '../config/database';

export class AnalyticsController {

  /**
   * GET /api/v1/analytics/dashboard-stats
   * Uses reports_master (461 rows) + domains (12 rows) + workflow_definitions (8 rows)
   */
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      // ── Total reports ──────────────────────────────────────
      const totalResult = await pool.query(
        'SELECT COUNT(*) AS total FROM reports_master WHERE is_active = true'
      );
      const totalReports = parseInt(totalResult.rows[0].total);

      // ── Compliance breakdown ───────────────────────────────
      const complianceResult = await pool.query(`
        SELECT compliance_status, COUNT(*) AS count
        FROM reports_master WHERE is_active = true
        GROUP BY compliance_status
      `);
      let requiredReports = 0;
      let optionalReports = 0;
      complianceResult.rows.forEach((row: any) => {
        if (row.compliance_status === 'Required') requiredReports = parseInt(row.count);
        else optionalReports += parseInt(row.count);
      });

      // ── Active domains ─────────────────────────────────────
      const domainsResult = await pool.query(
        'SELECT COUNT(DISTINCT domain_id) AS count FROM reports_master WHERE is_active = true'
      );
      const activeDomains = parseInt(domainsResult.rows[0].count);

      // ── Domain breakdown ───────────────────────────────────
      const domainBreakdown = await pool.query(`
        SELECT d.domain_name AS domain, COUNT(r.report_id) AS count, d.color
        FROM reports_master r
        JOIN domains d ON r.domain_id = d.domain_id
        WHERE r.is_active = true
        GROUP BY d.domain_id, d.domain_name, d.color
        ORDER BY count DESC
      `);

      // ── Frequency breakdown ────────────────────────────────
      const frequencyResult = await pool.query(`
        SELECT frequency, COUNT(*) AS count
        FROM reports_master WHERE is_active = true
        GROUP BY frequency ORDER BY count DESC
      `);

      // ── Recent reports (last 30 days) ──────────────────────
      const recentResult = await pool.query(`
        SELECT COUNT(*) AS count FROM reports_master
        WHERE created_at >= NOW() - INTERVAL '30 days' AND is_active = true
      `);

      // ── Workflows ─────────────────────────────────────────
      const workflowResult = await pool.query(`
        SELECT
          COUNT(*)                                     AS total,
          COUNT(*) FILTER (WHERE status = 'active')   AS active,
          COUNT(*) FILTER (WHERE status = 'paused')   AS paused,
          COALESCE(SUM(run_count), 0)                 AS total_runs,
          COALESCE(SUM(success_count), 0)             AS success_runs
        FROM workflow_definitions
      `).catch(() => ({ rows: [{ total:0, active:0, paused:0, total_runs:0, success_runs:0 }] }));
      const wf = workflowResult.rows[0];

      // ── Derived metrics ────────────────────────────────────
      const complianceRate = totalReports > 0
        ? parseFloat(((requiredReports / totalReports) * 100).toFixed(1)) : 0;
      const riskScore    = parseFloat((25 - (complianceRate * 0.05)).toFixed(1));
      const healthScore  = parseFloat((complianceRate * 0.92).toFixed(1));
      const automationRate = parseInt(wf.total) > 0
        ? parseFloat(((parseInt(wf.active) / parseInt(wf.total)) * 100).toFixed(1)) : 0;

      res.json({
        // Core KPIs
        totalReports,
        activeReports:   totalReports,
        requiredReports,
        optionalReports,
        activeDomains,
        recentReports:   parseInt(recentResult.rows[0].count),

        // Calculated metrics
        complianceRate,
        riskScore,
        healthScore,
        automationRate,

        // Workflows
        totalWorkflows:  parseInt(wf.total),
        activeWorkflows: parseInt(wf.active),
        pausedWorkflows: parseInt(wf.paused),
        totalRuns:       parseInt(wf.total_runs),
        successRuns:     parseInt(wf.success_runs),

        // Breakdowns
        domainBreakdown: domainBreakdown.rows.map((r: any) => ({
          domain: r.domain, count: parseInt(r.count), color: r.color,
        })),
        frequencyBreakdown: frequencyResult.rows.map((r: any) => ({
          frequency: r.frequency, count: parseInt(r.count),
        })),
        complianceBreakdown: complianceResult.rows.map((r: any) => ({
          status: r.compliance_status, count: parseInt(r.count),
        })),
      });
    } catch (error: any) {
      console.error('dashboard-stats error:', error.message);
      res.status(500).json({ error: 'Failed to fetch dashboard stats', detail: error.message });
    }
  }

  /**
   * GET /api/v1/analytics/test
   */
  async test(req: Request, res: Response): Promise<void> {
    res.json({ success: true, message: 'Analytics routes are working!', timestamp: new Date().toISOString() });
  }

  /**
   * GET /api/v1/analytics/summary
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const totalResult = await pool.query(
        'SELECT COUNT(*) as total FROM reports_master WHERE is_active = true'
      );
      const total = parseInt(totalResult.rows[0].total);

      const domainResult = await pool.query(`
        SELECT d.domain_name, COUNT(r.report_id) as count
        FROM reports_master r
        JOIN domains d ON r.domain_id = d.domain_id
        WHERE r.is_active = true
        GROUP BY d.domain_name ORDER BY count DESC LIMIT 5
      `);

      const complianceResult = await pool.query(`
        SELECT compliance_status as name, COUNT(report_id) as count
        FROM reports_master WHERE is_active = true GROUP BY compliance_status
      `);

      const recentResult = await pool.query(`
        SELECT COUNT(*) as count FROM reports_master
        WHERE created_at >= NOW() - INTERVAL '30 days' AND is_active = true
      `);

      res.json({
        totalReports:        total,
        topDomains:          domainResult.rows,
        complianceBreakdown: complianceResult.rows,
        recentReports:       parseInt(recentResult.rows[0].count),
      });
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      res.status(500).json({ error: 'Failed to fetch analytics summary' });
    }
  }

  /**
   * GET /api/v1/analytics/reports-by-domain
   */
  async getReportsByDomain(req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT d.domain_name as domain, COUNT(r.report_id) as count, d.color
        FROM reports_master r
        JOIN domains d ON r.domain_id = d.domain_id
        WHERE r.is_active = true
        GROUP BY d.domain_id, d.domain_name, d.color ORDER BY count DESC
      `);
      res.json({
        labels: result.rows.map((r: any) => r.domain),
        values: result.rows.map((r: any) => parseInt(r.count)),
        colors: result.rows.map((r: any) => r.color || '#3B82F6'),
      });
    } catch (error) {
      console.error('Error fetching reports by domain:', error);
      res.status(500).json({ error: 'Failed to fetch domain statistics' });
    }
  }

  /**
   * GET /api/v1/analytics/reports-by-frequency
   */
  async getReportsByFrequency(req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT frequency, COUNT(report_id) as count
        FROM reports_master WHERE is_active = true
        GROUP BY frequency
        ORDER BY CASE frequency
          WHEN 'Daily' THEN 1 WHEN 'Weekly' THEN 2 WHEN 'Monthly' THEN 3
          WHEN 'Quarterly' THEN 4 WHEN 'Annually' THEN 5 ELSE 6 END
      `);
      res.json({
        labels: result.rows.map((r: any) => r.frequency),
        values: result.rows.map((r: any) => parseInt(r.count)),
      });
    } catch (error) {
      console.error('Error fetching reports by frequency:', error);
      res.status(500).json({ error: 'Failed to fetch frequency statistics' });
    }
  }

  /**
   * GET /api/v1/analytics/reports-by-compliance
   */
  async getReportsByCompliance(req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT compliance_status, COUNT(report_id) as count,
          CASE compliance_status
            WHEN 'Required'    THEN '#EF4444'
            WHEN 'Optional'    THEN '#10B981'
            WHEN 'Recommended' THEN '#F59E0B'
            ELSE '#6B7280'
          END as color
        FROM reports_master WHERE is_active = true
        GROUP BY compliance_status ORDER BY compliance_status
      `);
      res.json({
        labels: result.rows.map((r: any) => r.compliance_status),
        values: result.rows.map((r: any) => parseInt(r.count)),
        colors: result.rows.map((r: any) => r.color),
      });
    } catch (error) {
      console.error('Error fetching reports by compliance:', error);
      res.status(500).json({ error: 'Failed to fetch compliance statistics' });
    }
  }

  /**
   * GET /api/v1/analytics/submission-trends
   */
  async getSubmissionTrends(req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
        FROM reports_master
        WHERE created_at >= NOW() - INTERVAL '12 months' AND is_active = true
        GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY month
      `);
      res.json({
        labels: result.rows.map((r: any) => r.month),
        values: result.rows.map((r: any) => parseInt(r.count)),
      });
    } catch (error) {
      console.error('Error fetching submission trends:', error);
      res.status(500).json({ error: 'Failed to fetch submission trends' });
    }
  }

  /**
   * GET /api/v1/analytics/reports-by-stakeholder
   */
  async getReportsByStakeholder(req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT jsonb_array_elements_text(stakeholders) as stakeholder, COUNT(*) as count
        FROM reports_master WHERE is_active = true AND jsonb_array_length(stakeholders) > 0
        GROUP BY stakeholder ORDER BY count DESC LIMIT 10
      `);
      res.json({
        labels: result.rows.map((r: any) => r.stakeholder),
        values: result.rows.map((r: any) => parseInt(r.count)),
      });
    } catch (error) {
      console.error('Error fetching reports by stakeholder:', error);
      res.status(500).json({ error: 'Failed to fetch stakeholder statistics' });
    }
  }

  /**
   * GET /api/v1/analytics/frequency-distribution
   */
  async getFrequencyDistribution(req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(`
        SELECT frequency, COUNT(report_id) as count,
          ROUND(COUNT(report_id) * 100.0 / SUM(COUNT(report_id)) OVER(), 2) as percentage
        FROM reports_master WHERE is_active = true
        GROUP BY frequency ORDER BY count DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching frequency distribution:', error);
      res.status(500).json({ error: 'Failed to fetch frequency distribution' });
    }
  }

  /**
   * GET /api/v1/analytics/compliance-metrics
   */
  async getComplianceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const current = await pool.query(`
        SELECT compliance_status as name, COUNT(report_id) as count,
          CASE compliance_status
            WHEN 'Required'    THEN '#EF4444'
            WHEN 'Optional'    THEN '#10B981'
            WHEN 'Recommended' THEN '#F59E0B'
            ELSE '#6B7280'
          END as color
        FROM reports_master WHERE is_active = true GROUP BY compliance_status
      `);
      const trends = await pool.query(`
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month,
               compliance_status as status, COUNT(*) as count
        FROM reports_master
        WHERE created_at >= NOW() - INTERVAL '6 months' AND is_active = true
        GROUP BY TO_CHAR(created_at, 'YYYY-MM'), compliance_status
        ORDER BY month, compliance_status
      `);
      res.json({ current: current.rows, trends: trends.rows });
    } catch (error) {
      console.error('Error fetching compliance metrics:', error);
      res.status(500).json({ error: 'Failed to fetch compliance metrics' });
    }
  }
}
