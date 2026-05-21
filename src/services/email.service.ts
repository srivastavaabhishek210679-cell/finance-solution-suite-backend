import { query } from '../config/database';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EmailOptions {
  to:      string | string[];
  subject: string;
  html:    string;
  text?:   string;
}

interface ReportEmailData {
  reportName:  string;
  domain:      string;
  frequency:   string;
  reportCount: number;
  generatedAt: string;
  previewRows: any[];
}

// ─── Email Service ────────────────────────────────────────────────────────────
export class EmailService {

  private transporter: any = null;
  private fromAddress: string;

  constructor() {
    this.fromAddress = process.env.SMTP_FROM || 'noreply@financesuite.com';
    this.initTransporter();
  }

  private initTransporter(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require('nodemailer');

      const host = process.env.SMTP_HOST;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (!host || !user || !pass) {
        console.warn('[EmailService] SMTP_HOST / SMTP_USER / SMTP_PASS not set — email delivery disabled');
        return;
      }

      this.transporter = nodemailer.createTransporter({
        host,
        port:   parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
        tls:  { rejectUnauthorized: false },
      });

      console.log('[EmailService] SMTP transporter initialised →', host);
    } catch (err: any) {
      console.warn('[EmailService] nodemailer not installed:', err.message);
    }
  }

  // ── Core send ──────────────────────────────────────────────────────────────
  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter) {
      console.log('[EmailService] Demo mode — would send to:', options.to);
      return { success: true, messageId: `demo-${Date.now()}` };
    }

    try {
      const info = await this.transporter.sendMail({
        from:    this.fromAddress,
        to:      Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html:    options.html,
        text:    options.text || options.html.replace(/<[^>]+>/g, ''),
      });

      console.log('[EmailService] Sent:', info.messageId, '→', options.to);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('[EmailService] Send failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ── Report summary email ───────────────────────────────────────────────────
  async sendReportSummary(to: string | string[], data: ReportEmailData): Promise<{ success: boolean }> {
    const subject = `[Finance Suite] ${data.reportName} — ${data.frequency} Report`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body        { font-family: -apple-system, Arial, sans-serif; background:#f8fafc; margin:0; padding:0; }
    .wrapper    { max-width:600px; margin:0 auto; background:#fff; }
    .header     { background:#0f172a; padding:24px 32px; }
    .header h1  { color:#3b82f6; margin:0; font-size:20px; }
    .header p   { color:#94a3b8; margin:6px 0 0; font-size:13px; }
    .body       { padding:28px 32px; }
    .stat-row   { display:flex; gap:16px; margin:20px 0; }
    .stat-box   { flex:1; background:#f1f5f9; border-radius:8px; padding:14px; text-align:center; }
    .stat-val   { font-size:24px; font-weight:700; color:#1e293b; }
    .stat-lbl   { font-size:11px; color:#64748b; margin-top:4px; }
    .table      { width:100%; border-collapse:collapse; margin-top:20px; font-size:13px; }
    .table th   { background:#1e293b; color:#fff; padding:8px 12px; text-align:left; }
    .table td   { padding:8px 12px; border-bottom:1px solid #e2e8f0; color:#334155; }
    .table tr:nth-child(even) td { background:#f8fafc; }
    .badge      { display:inline-block; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; }
    .badge-req  { background:#fef3c7; color:#92400e; }
    .badge-rec  { background:#d1fae5; color:#065f46; }
    .badge-opt  { background:#e0e7ff; color:#3730a3; }
    .footer     { background:#f1f5f9; padding:16px 32px; font-size:11px; color:#94a3b8; text-align:center; }
    .btn        { display:inline-block; background:#3b82f6; color:#fff; padding:10px 24px;
                  border-radius:6px; text-decoration:none; font-weight:600; font-size:13px; }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>Finance Solution Suite</h1>
    <p>${data.reportName} &nbsp;·&nbsp; ${data.frequency} Report</p>
  </div>

  <div class="body">
    <p style="color:#475569; font-size:14px; margin-top:0">
      Your scheduled <strong>${data.frequency.toLowerCase()}</strong> report for the
      <strong>${data.domain}</strong> domain is ready.
    </p>

    <div class="stat-row">
      <div class="stat-box">
        <div class="stat-val">${data.reportCount}</div>
        <div class="stat-lbl">Total Reports</div>
      </div>
      <div class="stat-box">
        <div class="stat-val">${data.previewRows.filter((r: any) => r.compliance_status === 'Required').length}</div>
        <div class="stat-lbl">Required</div>
      </div>
      <div class="stat-box">
        <div class="stat-val">${data.previewRows.filter((r: any) => r.compliance_status === 'Optional').length}</div>
        <div class="stat-lbl">Optional</div>
      </div>
    </div>

    <h3 style="color:#1e293b; font-size:14px; margin-bottom:8px;">Recent Reports</h3>
    <table class="table">
      <thead>
        <tr>
          <th>Report Name</th>
          <th>Frequency</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${data.previewRows.slice(0, 8).map((r: any) => `
        <tr>
          <td>${r.name}</td>
          <td>${r.frequency || '—'}</td>
          <td>
            <span class="badge ${
              r.compliance_status === 'Required'    ? 'badge-req' :
              r.compliance_status === 'Recommended' ? 'badge-rec' : 'badge-opt'
            }">${r.compliance_status || '—'}</span>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>

    <p style="margin-top:24px; text-align:center;">
      <a class="btn" href="${process.env.FRONTEND_URL || 'https://finance-frontend-2l6b.onrender.com'}/dashboard">
        View Full Dashboard →
      </a>
    </p>
  </div>

  <div class="footer">
    Generated: ${data.generatedAt} &nbsp;·&nbsp;
    Finance Solution Suite &nbsp;·&nbsp;
    <a href="${process.env.FRONTEND_URL || 'https://finance-frontend-2l6b.onrender.com'}" style="color:#3b82f6">Open Platform</a>
  </div>
</div>
</body>
</html>`;

    return this.send({ to, subject, html });
  }

  // ── Send scheduled report (called by scheduler) ───────────────────────────
  async sendScheduledReport(scheduleId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Get schedule details
      const schedResult = await query(
        `SELECT * FROM scheduled_reports WHERE id = $1 AND is_active = true`,
        [scheduleId],
      );

      if (!schedResult.rows.length) {
        return { success: false, message: 'Schedule not found or inactive' };
      }

      const schedule = schedResult.rows[0];
      const recipients: string[] = Array.isArray(schedule.recipients)
        ? schedule.recipients
        : JSON.parse(schedule.recipients || '[]');

      if (!recipients.length) {
        return { success: false, message: 'No recipients configured' };
      }

      // Fetch report data
      const reportsResult = await query(`
        SELECT rm.name, rm.frequency, rm.compliance_status, d.domain_name
        FROM  reports_master rm
        LEFT  JOIN domains d ON d.domain_id = rm.domain_id
        WHERE rm.is_active = true
        ORDER BY rm.name
        LIMIT 50
      `);

      const data: ReportEmailData = {
        reportName:  schedule.title || 'Finance Report',
        domain:      schedule.category || 'All',
        frequency:   schedule.schedule_cron ? 'Scheduled' : 'On-Demand',
        reportCount: reportsResult.rows.length,
        generatedAt: new Date().toLocaleString(),
        previewRows: reportsResult.rows,
      };

      const result = await this.sendReportSummary(recipients, data);

      // Update last_sent_at
      await query(
        `UPDATE scheduled_reports SET last_sent_at = NOW() WHERE id = $1`,
        [scheduleId],
      );

      // Log to audit
      await query(
        `INSERT INTO audit_logs (action, table_name, resource_id, event_details, created_at)
         VALUES ('email_sent', 'scheduled_reports', $1, $2, NOW())`,
        [String(scheduleId), JSON.stringify({ recipients, success: result.success })],
      ).catch(() => {}); // non-fatal

      return {
        success: result.success,
        message: result.success
          ? `Email sent to ${recipients.length} recipient(s)`
          : `Failed: ${result.error}`,
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // ── Test connection ────────────────────────────────────────────────────────
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    if (!this.transporter) {
      return { connected: false, message: 'SMTP not configured — set SMTP_HOST, SMTP_USER, SMTP_PASS in environment' };
    }
    try {
      await this.transporter.verify();
      return { connected: true, message: 'SMTP connection verified' };
    } catch (err: any) {
      return { connected: false, message: err.message };
    }
  }
}

// Singleton
export const emailService = new EmailService();
