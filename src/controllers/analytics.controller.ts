import { Request, Response } from 'express';
import pool from '../config/database';

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/dashboard-stats
   * Real KPI stats from kpi_values, kpi_definitions, risks, scheduled_reports
   */
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      // ── KPI Definitions (used as "reports") ───────────────
      const kpiTotal = await pool.query(
        'SELECT COUNT(*) AS total FROM kpi_definitions WHERE is_active = true'
      );
      const totalReports = parseInt(kpiTotal.rows[0].total);

      // ── Scheduled Reports ─────────────────────────────────
      const scheduledResult = await pool.query(`
        SELECT
          COUNT(*)                              AS total,
          COUNT(*) FILTER (WHERE is_active = true)  AS active
        FROM scheduled_reports
      `);
      const totalScheduled  = parseInt(scheduledResult.rows[0].total);
      const activeScheduled = parseInt(scheduledResult.rows[0].active);

      // ── Risks — compliance rate + risk score ──────────────
      const riskResult = await pool.query(`
        SELECT
          COUNT(*)                                                        AS total_risks,
          COUNT(*) FILTER (WHERE status IN ('closed','mitigated'))        AS resolved_risks,
          COUNT(*) FILTER (WHERE status = 'open')                        AS open_risks,
          ROUND(AVG(risk_score)::numeric, 1)                             AS avg_risk_score,
          ROUND(AVG(risk_score) FILTER (WHERE status = 'open')::numeric,1) AS open_risk_score
        FROM risks
      `);
      const riskRow       = riskResult.rows[0];
      const totalRisks    = parseInt(riskRow.total_risks);
      const resolvedRisks = parseInt(riskRow.resolved_risks);
      const complianceRate = totalRisks > 0
        ? parseFloat(((resolvedRisks / totalRisks) * 100).toFixed(1))
        : 0;
      const riskScore = parseFloat(riskRow.open_risk_score || riskRow.avg_risk_score || 0);

      // ── Active Domains (risk categories) ──────────────────
      const domainsResult = await pool.query(`
        SELECT COUNT(DISTINCT category) AS count FROM risks
      `);
      const activeDomains = parseInt(domainsResult.rows[0].count);

      // ── Domain Breakdown ───────────────────────────────────
      const domainBreakdown = await pool.query(`
        SELECT category AS domain, COUNT(*) AS count
        FROM risks
        GROUP BY category
        ORDER BY count DESC
      `);

      // ── Risk Status Breakdown ─────────────────────────────
      const riskStatusResult = await pool.query(`
        SELECT status, COUNT(*) AS count
        FROM risks
        GROUP BY status
        ORDER BY count DESC
      `);

      // ── Workflows ─────────────────────────────────────────
      const workflowResult = await pool.query(`
        SELECT
          COUNT(*)                                        AS total,
          COUNT(*) FILTER (WHERE status = 'active')      AS active
        FROM workflow_definitions
      `).catch(() => ({ rows: [{ total: 0, active: 0 }] }));
      const activeWorkflows = parseInt(workflowResult.rows[0].active);
      const totalWorkflows  = parseInt(workflowResult.rows[0].total);

      // ── Latest KPI Values ─────────────────────────────────
      const kpiValues = await pool.query(`
        SELECT
          kd.label,
          kd.key,
          kd.unit,
          kv.value,
          kv.prior_value,
          kv.delta_percent,
          kv.period_label
        FROM kpi_values kv
        JOIN kpi_definitions kd ON kv.kpi_def_id = kd.id
        WHERE kv.is_forecast = false
        ORDER BY kv.recorded_at DESC
        LIMIT 10
      `).catch(() => ({ rows: [] }));

      // ── Derived metrics ────────────────────────────────────
      const healthScore   = parseFloat(((complianceRate * 0.7) + ((100 - Math.min(riskScore, 100)) * 0.3)).toFixed(1));
      const automationRate = totalWorkflows > 0
        ? parseFloat(((activeWorkflows / totalWorkflows) * 100).toFixed(1)) : 0;

      res.json({
        // Core KPIs
        totalReports,
        activeReports:    totalReports,
        requiredReports:  activeScheduled,
        optionalReports:  totalScheduled - activeScheduled,
        activeDomains,

        // Risk & Compliance
        complianceRate,
        riskScore,
        totalRisks,
        openRisks:    parseInt(riskRow.open_risks),
        resolvedRisks,

        // Derived
        healthScore,
        automationRate,

        // Workflows
        activeWorkflows,
        totalWorkflows,

        // Breakdowns for charts
        domainBreakdown: domainBreakdown.rows.map((r: any) => ({
          domain: r.domain,
          count:  parseInt(r.count),
        })),
        riskStatusBreakdown: riskStatusResult.rows.map((r: any) => ({
          status: r.status,
          count:  parseInt(r.count),
        })),
        latestKpis: kpiValues.rows,
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error.message);
      res.status(500).json({ error: 'Failed to fetch dashboard stats', detail: error.message });
    }
  }

  /**
   * GET /api/v1/analytics/test
   */
  async test(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      message: 'Analytics routes are working!',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * GET /api/v1/analytics/summary
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const totalKpis = await pool.query('SELECT COUNT(*) as total FROM kpi_definitions WHERE is_active = true');
      const riskSummary = await pool.query(`
        SELECT category as name, COUNT(*) as count
        FROM risks GROUP BY category ORDER BY count DESC LIMIT 5
      `);
      const riskCompliance = await pool.query(`
        SELECT status as name, COUNT(*) as count FROM risks GROUP BY status
      `);
      const recentRisks = await pool.query(`
        SELECT COUNT(*) as count FROM risks
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);
      res.json({
        totalReports:        parseInt(totalKpis.rows[0].total),
        topDomains:          riskSummary.rows,
        complianceBreakdown: riskCompliance.rows,
        recentReports:       parseInt(recentRisks.rows[0].count),
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
        SELECT category as domain, COUNT(*) as count
        FROM risks GROUP BY category ORDER BY count DESC
      `);
      res.json({
        labels: result.rows.map((row: any) => row.domain),
        values: result.rows.map((row: any) => parseInt(row.count)),
        colors: result.rows.map(() => '#3B82F6'),
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
        SELECT period_type as frequency, COUNT(*) as count
        FROM kpi_values GROUP BY period_type ORDER BY count DESC
      `);
      res.json({
        labels: result.rows.map((row: any) => row.frequency),
        values: result.rows.map((row: any) => parseInt(row.count)),
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
        SELECT status as compliance_status, COUNT(*) as count,
          CASE status WHEN 'open' THEN '#EF4444' WHEN 'closed' THEN '#10B981'
            WHEN 'mitigated' THEN '#F59E0B' ELSE '#6B7280' END as color
        FROM risks GROUP BY status ORDER BY status
      `);
      res.json({
        labels: result.rows.map((row: any) => row.compliance_status),
        values: result.rows.map((row: any) => parseInt(row.count)),
        colors: result.rows.map((row: any) => row.color),
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
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*) as count
        FROM risks WHERE created_at >= NOW() - INTERVAL '12 months'
        AND is_active = true
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month
      `);

      res.json({
        labels: result.rows.map(row => row.month),
        values: result.rows.map(row => parseInt(row.count)),
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
        SELECT 
          stakeholder,
          COUNT(*) as count
        FROM (
          SELECT jsonb_array_elements_text(stakeholders) as stakeholder
          FROM kpi_definitions WHERE is_active = true'Error fetching reports by stakeholder:', error);
      res.status(500).json({ error: 'Failed to fetch stakeholder statistics' });
    }
  }

  /**
   * GET /api/v1/analytics/frequency-distribution
   */
  async getFrequencyDistribution(req: Request, res: Response): Promise<void> {
    try {
      const result = await pool.query(`
        WITH freq_counts AS (
          SELECT 
            frequency,
            COUNT(id) as count
          FROM kpi_definitions WHERE is_active = true'Error fetching frequency distribution:', error);
      res.status(500).json({ error: 'Failed to fetch frequency distribution' });
    }
  }

  /**
   * GET /api/v1/analytics/compliance-metrics
   */
  async getComplianceMetrics(req: Request, res: Response): Promise<void> {
    try {
      // Current compliance distribution
      const current = await pool.query(`
        SELECT 
          compliance_status as name,
          COUNT(id) as count,
          CASE compliance_status
            WHEN 'Required' THEN '#EF4444'
            WHEN 'Optional' THEN '#10B981'
            WHEN 'Recommended' THEN '#F59E0B'
            ELSE '#6B7280'
          END as color
        FROM kpi_definitions WHERE is_active = true'YYYY-MM') as month,
          compliance_status as status,
          COUNT(*) as count
        FROM risks WHERE created_at >= NOW() - INTERVAL '6 months'
        AND is_active = true
        GROUP BY TO_CHAR(created_at, 'YYYY-MM'), compliance_status
        ORDER BY month, compliance_status
      `);

      res.json({
        current: current.rows,
        trends: trends.rows,
      });
    } catch (error) {
      console.error('Error fetching compliance metrics:', error);
      res.status(500).json({ error: 'Failed to fetch compliance metrics' });
    }
  }
}
