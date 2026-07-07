import pool from '../config/database';
import { emailService } from './email.service';

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
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      return '<tr>' + cells.map(c => '<td>' + c.trim() + '</td>').join('') + '</tr>';
    });
}

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
<title>${reportType} - ${period}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; color:#1e293b; background:#fff; font-size:13px; line-height:1.6; }
.header { background:#1e3a5f; color:white; padding:32px 40px; }
.company { font-size:22px; font-weight:800; }
.report-title { font-size:26px; font-weight:700; margin-top:16px; }
.period { font-size:13px; opacity:0.8; margin-top:4px; }
.meta { font-size:11px; opacity:0.7; margin-top:12px; }
.content { padding:32px 40px; }
h1 { font-size:20px; color:#1e3a5f; border-bottom:3px solid #0ea5e9; padding-bottom:8px; margin:24px 0 16px; }
h2 { font-size:16px; color:#1e40af; margin:20px 0 12px; padding-left:12px; border-left:4px solid #0ea5e9; }
h3 { font-size:14px; color:#334155; margin:14px 0 8px; font-weight:600; }
p { margin:8px 0; color:#334155; }
ul { margin:8px 0 8px 24px; }
li { margin:4px 0; color:#334155; }
strong { color:#1e293b; font-weight:700; }
table { width:100%; border-collapse:collapse; margin:16px 0; font-size:12px; }
th { background:#1e3a5f; color:white; padding:10px 12px; text-align:left; font-weight:600; }
td { padding:9px 12px; border-bottom:1px solid #e2e8f0; }
tr:nth-child(even) td { background:#f8fafc; }
.footer { background:#f8fafc; border-top:2px solid #e2e8f0; padding:20px 40px; margin-top:40px; display:flex; justify-content:space-between; }
.footer-text { font-size:11px; color:#64748b; }
.confidential { color:#dc2626; font-weight:700; font-size:10px; text-transform:uppercase; }
</style>
</head>
<body>
<div class="header">
  <div class="company">${companyName}</div>
  <div style="font-size:11px;opacity:0.7;">Enterprise Finance Solution Suite</div>
  <div class="report-title">${reportType}</div>
  <div class="period">${period}</div>
  <div class="meta">Generated: ${now} | Powered by Deemona AI Copilot | CONFIDENTIAL</div>
</div>
<div class="content">${contentHTML}</div>
<div class="footer">
  <div class="footer-text">
    <div>${companyName} | Deemona Enterprise Finance Suite</div>
    <div>Generated on ${now}</div>
  </div>
  <div class="footer-text" style="text-align:right;">
    <div class="confidential">Confidential</div>
    <div>For authorized personnel only</div>
  </div>
</div>
</body>
</html>`;
}

export async function generatePDF(html: string): Promise<Buffer | null> {
  const pdfShiftKey = process.env.PDFSHIFT_API_KEY || '';
  if (pdfShiftKey) {
    try {
      console.log('[PDF] Using PDFShift API...');
      const credentials = Buffer.from('api:' + pdfShiftKey).toString('base64');
      const res = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + credentials,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ source: html })
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        console.log('[PDF] PDFShift success, size:', buf.byteLength);
        return Buffer.from(buf);
      }
      const err = await res.text();
      console.error('[PDF] PDFShift error:', err);
    } catch (e: any) {
      console.error('[PDF] PDFShift exception:', e.message);
    }
  }
  console.log('[PDF] No PDF provider available, returning null');
  return null;
}

  // Try html2pdf.app as fallback (free: 100/month)
  const html2pdfKey = process.env.HTML2PDF_API_KEY || '';
  if (html2pdfKey) {
    try {
      console.log('[PDF] Using html2pdf.app API...');
      const response = await fetch('https://api.html2pdf.app/v1/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html,
          apiKey: html2pdfKey,
          format: 'A4',
          printBackground: true
        })
      });
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        console.log('[PDF] html2pdf.app success');
        return Buffer.from(buffer);
      }
    } catch (e: any) {
      console.error('[PDF] html2pdf.app error:', e.message);
    }
  }

  // Try local Puppeteer as last resort
  try {
    const chromium = require('@sparticuz/chromium');
    const puppeteer = require('puppeteer-core');
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();
    console.log('[PDF] Puppeteer success');
    return Buffer.from(pdf);
  } catch (e: any) {
    console.log('[PDF] All PDF methods failed, using HTML fallback');
    return null;
  }
}

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
        subject: reportType + ' -- ' + period + ' | Deemona Enterprise',
        html: htmlContent,
      });
    }
    console.log('[ReportEmail] Sent ' + reportType + ' to ' + recipients.length + ' recipients');
    return true;
  } catch (e: any) {
    console.error('[ReportEmail] Error:', e.message);
    return false;
  }
}

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

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const [orders, expenses, leaves, tickets] = await Promise.all([
      pool.query('SELECT COUNT(*) as c, COALESCE(SUM(total_amount),0) as rev FROM orders WHERE tenant_id=$1', [tenantId]),
      pool.query('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE tenant_id=$1 AND status=$2', [tenantId, 'Approved']),
      pool.query('SELECT COUNT(*) as c FROM leave_requests WHERE tenant_id=$1 AND status=$2', [tenantId, 'Pending']),
      pool.query('SELECT COUNT(*) as c FROM helpdesk_tickets WHERE tenant_id=$1 AND status=$2', [tenantId, 'Open']),
    ]);

    const context = 'Orders: ' + orders.rows[0].c + ', Revenue: Rs.' + parseFloat(orders.rows[0].rev).toLocaleString('en-IN') + ', Expenses: Rs.' + parseFloat(expenses.rows[0].total).toLocaleString('en-IN') + ', Pending leaves: ' + leaves.rows[0].c + ', Open tickets: ' + tickets.rows[0].c;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: 'Generate a concise monthly executive report for ' + period + '. Business data: ' + context + '. Include executive summary, key metrics, top 3 concerns, and 5 recommended actions. Use Rs. for currency.'
      }]
    });

    const reportContent = response.content[0].type === 'text' ? response.content[0].text : '';
    const tenant = await pool.query('SELECT tenant_name FROM tenants WHERE tenant_id=$1', [tenantId]);
    const companyName = tenant.rows[0]?.tenant_name || 'Deemona Technologies';
    const reportHTML = generateReportHTML('Monthly Executive Summary', period, reportContent, companyName);
    const pdf = await generatePDF(reportHTML);
    await emailReport(recipients, 'Monthly Executive Summary', period, reportHTML, pdf);

    await pool.query(
      'INSERT INTO user_report_history (user_id, report_name, domain_name, notes) VALUES ($1,$2,$3,$4)',
      [1, 'Monthly Executive Summary - ' + period, 'General', 'Auto-sent to ' + recipients.length + ' recipients']
    );

    console.log('[AutoReport] Monthly report sent to ' + recipients.join(', '));
  } catch (e: any) {
    console.error('[AutoReport] Error:', e.message);
  }
}