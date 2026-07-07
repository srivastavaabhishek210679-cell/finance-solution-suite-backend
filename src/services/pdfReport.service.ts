import pool from '../config/database';
import { emailService } from './email.service';

// ??????????????????????????????????????????????????????????????????????????
// PDF REPORT GENERATOR + AUTO-EMAIL SERVICE
// Uses HTML ? PDF conversion via Puppeteer
// Falls back to HTML email if PDF generation fails
// ??????????????????????????????????????????????????????????????????????????

// ?? Convert markdown to HTML ???????????????????????????????????????????????
function markdownToHTML(markdown: string): string {
  return markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[h|u|o|l|p])/gm, '<p>')
    .replace(/?/g, '&#x2705;')
    .replace(/?/g, '&#x274C;')
    .replace(/??/g, '&#x26A0;')
    .replace(/??/g, '&#x1F6A8;')
    .replace(/??/g, '&#x1F4B0;')
    .replace(/??/g, '&#x1F4CA;')
    .replace(/??/g, '&#x1F3AF;')
    .replace(/??/g, '&#x1F7E2;')
    .replace(/??/g, '&#x1F7E1;')
    .replace(/??/g, '&#x1F534;');
}

// ?? Generate styled HTML report ????????????????????????????????????????????
export function generateReportHTML(
  reportType: string,
  period: string,
  content: string,
  companyName: string = 'Deemona Technologies'
): string {
  const contentHTML = markdownToHTML(content);
  const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportType} - ${period}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; font-size: 13px; line-height: 1.6; }

    .header { background: linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 100%); color: white; padding: 32px 40px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .company-name { font-size: 24px; font-weight: 800; letter-spacing: 1px; }
    .company-tagline { font-size: 11px; opacity: 0.8; margin-top: 2px; }
    .report-badge { background: rgba(255,255,255,0.15); border-radius: 20px; padding: 6px 16px; font-size: 11px; border: 1px solid rgba(255,255,255,0.3); }
    .report-title { margin-top: 20px; }
    .report-title h1 { font-size: 28px; font-weight: 700; }
    .report-title .period { font-size: 14px; opacity: 0.85; margin-top: 4px; }
    .header-meta { display: flex; gap: 24px; margin-top: 16px; font-size: 11px; opacity: 0.8; }
    .header-meta span { display: flex; align-items: center; gap: 4px; }

    .content { padding: 32px 40px; }
    h1 { font-size: 22px; color: #1e3a5f; border-bottom: 3px solid #0ea5e9; padding-bottom: 8px; margin: 24px 0 16px; }
    h2 { font-size: 17px; color: #1e40af; margin: 20px 0 12px; padding-left: 12px; border-left: 4px solid #0ea5e9; }
    h3 { font-size: 14px; color: #334155; margin: 16px 0 8px; font-weight: 600; }
    p { margin: 8px 0; color: #334155; }
    ul, ol { margin: 8px 0 8px 24px; }
    li { margin: 4px 0; color: #334155; }
    strong { color: #1e293b; font-weight: 700; }
    em { color: #475569; }

    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
    th { background: #1e3a5f; color: white; padding: 10px 12px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    tr:hover td { background: #eff6ff; }

    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
    .kpi-card { background: #f8fafc; border-radius: 10px; padding: 16px; border-left: 4px solid #0ea5e9; }
    .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; }
    .kpi-value { font-size: 22px; font-weight: 800; color: #1e3a5f; margin: 4px 0; }
    .kpi-sub { font-size: 11px; color: #64748b; }

    .alert-box { border-radius: 8px; padding: 14px 16px; margin: 12px 0; display: flex; gap: 12px; }
    .alert-error { background: #fef2f2; border-left: 4px solid #ef4444; }
    .alert-warning { background: #fffbeb; border-left: 4px solid #f59e0b; }
    .alert-success { background: #f0fdf4; border-left: 4px solid #22c55e; }
    .alert-info { background: #eff6ff; border-left: 4px solid #3b82f6; }

    .footer { background: #f8fafc; border-top: 2px solid #e2e8f0; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; margin-top: 40px; }
    .footer-left { font-size: 11px; color: #64748b; }
    .footer-right { font-size: 11px; color: #64748b; text-align: right; }
    .confidential { background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 4px 10px; font-size: 10px; color: #dc2626; font-weight: 600; text-transform: uppercase; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .header { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div>
        <div class="company-name">${companyName}</div>
        <div class="company-tagline">Enterprise Finance Solution Suite</div>
      </div>
      <div class="report-badge">CONFIDENTIAL</div>
    </div>
    <div class="report-title">
      <h1>${reportType}</h1>
      <div class="period">${period}</div>
    </div>
    <div class="header-meta">
      <span>Generated: ${now}</span>
      <span>Powered by Deemona AI Copilot</span>
    </div>
  </div>

  <div class="content">
    ${contentHTML}
  </div>

  <div class="footer">
    <div class="footer-left">
      <div>${companyName} | Enterprise Finance Suite</div>
      <div>Generated by Deemona AI Copilot on ${now}</div>
    </div>
    <div class="footer-right">
      <div class="confidential">Confidential</div>
      <div style="margin-top:4px;">For authorized personnel only</div>
    </div>
  </div>
</body>
</html>`;
}

// ?? Generate PDF using Puppeteer ????????????????????????????????????????????
export async function generatePDF(html: string): Promise<Buffer | null> {
  try {
    let chromium: any, puppeteer: any;

    // Try @sparticuz/chromium for serverless (Render)
    try {
      chromium = require('@sparticuz/chromium');
      puppeteer = require('puppeteer-core');
    } catch {
      console.log('[PDF] Chromium not available, using HTML fallback');
      return null;
    }

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    await browser.close();
    return Buffer.from(pdf);
  } catch (e: any) {
    console.error('[PDF] Generation error:', e.message);
    return null;
  }
}

// ?? Send report via email ??????????????????????????????????????????????????
export async function emailReport(
  recipients: string[],
  reportType: string,
  period: string,
  htmlContent: string,
  pdfBuffer?: Buffer | null
): Promise<boolean> {
  try {
    for (const email of recipients) {
      await emailService.send({
        to: email,
        subject: `${reportType} ? ${period} | Deemona Enterprise`,
        html: htmlContent,
        // attachments would go here if email service supports it
      });
    }
    console.log(`[ReportEmail] Sent ${reportType} to ${recipients.length} recipients`);
    return true;
  } catch (e: any) {
    console.error('[ReportEmail] Error:', e.message);
    return false;
  }
}

// ?? Schedule and send auto-reports ????????????????????????????????????????
export async function sendScheduledReports(tenantId: number): Promise<void> {
  try {
    const admins = await pool.query(
      'SELECT email, first_name FROM users WHERE tenant_id=$1 AND role_id=1 AND status=$2',
      [tenantId, 'active']
    );
    if (!admins.rows.length) return;

    const recipients = admins.rows.map((u: any) => u.email);
    const now = new Date();
    const period = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    // Import AI report generation
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Get business context
    const [orders, expenses, leaves, tickets] = await Promise.all([
      pool.query('SELECT COUNT(*) as c, COALESCE(SUM(total_amount),0) as rev FROM orders WHERE tenant_id=$1', [tenantId]),
      pool.query('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE tenant_id=$1 AND status=$2', [tenantId, 'Approved']),
      pool.query('SELECT COUNT(*) as c FROM leave_requests WHERE tenant_id=$1 AND status=$2', [tenantId, 'Pending']),
      pool.query('SELECT COUNT(*) as c FROM helpdesk_tickets WHERE tenant_id=$1 AND status=$2', [tenantId, 'Open']),
    ]);

    const context = `Orders: ${orders.rows[0].c}, Revenue: Rs.${parseFloat(orders.rows[0].rev).toLocaleString('en-IN')}, Expenses: Rs.${parseFloat(expenses.rows[0].total).toLocaleString('en-IN')}, Pending leaves: ${leaves.rows[0].c}, Open tickets: ${tickets.rows[0].c}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Generate a concise monthly executive report for ${period}. Business data: ${context}. Include executive summary, key metrics, top 3 concerns, and 5 recommended actions. Use Rs. for currency.`
      }]
    });

    const reportContent = response.content[0].type === 'text' ? response.content[0].text : '';
    const reportHTML = generateReportHTML('Monthly Executive Summary', period, reportContent);

    // Try PDF, fall back to HTML email
    const pdf = await generatePDF(reportHTML);

    // Send email
    await emailReport(recipients, 'Monthly Executive Summary', period, reportHTML, pdf);

    // Save to report history
    await pool.query(
      'INSERT INTO user_report_history (user_id, report_name, domain_name, notes) VALUES ($1,$2,$3,$4)',
      [1, 'Monthly Executive Summary - ' + period, 'General', `Auto-sent to ${recipients.length} recipients`]
    );

    console.log(`[AutoReport] Monthly report sent to ${recipients.join(', ')}`);
  } catch (e: any) {
    console.error('[AutoReport] Error:', e.message);
  }
}
