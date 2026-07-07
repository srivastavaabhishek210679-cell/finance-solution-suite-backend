import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';
import { generateReportHTML, generatePDF, emailReport } from '../services/pdfReport.service';
import pool from '../config/database';

const router = Router();
router.use(authenticate);

router.post('/narrative', aiController.generateNarrative);
router.post('/chat', aiController.chat);
router.post('/insights', aiController.insights);
router.post('/report', aiController.generateReport);
router.get('/conversations', aiController.getConversations);
router.get('/conversations/:id', aiController.getConversation);

// ?? Generate and download PDF report ??????????????????????????????????????
router.post('/report/pdf', async (req: any, res: any) => {
  const { report_type, period, content, email_recipients } = req.body;
  const tenantId = req.user?.tenantId || 1;

  try {
    // Get company name
    const tenant = await pool.query('SELECT tenant_name FROM tenants WHERE tenant_id=$1', [tenantId]);
    const companyName = tenant.rows[0]?.tenant_name || 'Deemona Technologies';

    // Generate HTML
    const html = generateReportHTML(report_type || 'Business Report', period || new Date().toLocaleDateString('en-IN', {month:'long',year:'numeric'}), content, companyName);

    // Try PDF generation
    const pdf = await generatePDF(html);

    // Email if recipients provided
    if (email_recipients && email_recipients.length > 0) {
      await emailReport(email_recipients, report_type, period, html, pdf);
    }

    if (pdf) {
      // Return PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${report_type.replace(/\s+/g,'-')}-${period}.pdf"`);
      return res.send(pdf);
    } else {
      // Return HTML if PDF not available
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${report_type.replace(/\s+/g,'-')}-${period}.html"`);
      return res.send(html);
    }
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// ?? Email report to stakeholders ???????????????????????????????????????????
router.post('/report/email', async (req: any, res: any) => {
  const { report_type, period, content, recipients } = req.body;
  const tenantId = req.user?.tenantId || 1;

  if (!recipients || !recipients.length) {
    return res.status(400).json({ status: 'error', message: 'recipients array required' });
  }

  try {
    const tenant = await pool.query('SELECT tenant_name FROM tenants WHERE tenant_id=$1', [tenantId]);
    const companyName = tenant.rows[0]?.tenant_name || 'Deemona Technologies';
    const html = generateReportHTML(report_type || 'Business Report', period || 'Current Period', content, companyName);
    const pdf = await generatePDF(html);
    const sent = await emailReport(recipients, report_type, period, html, pdf);

    // Log to report history
    await pool.query(
      'INSERT INTO user_report_history (user_id, report_name, domain_name, notes) VALUES ($1,$2,$3,$4)',
      [req.user?.userId || 1, report_type, 'General', `Emailed to: ${recipients.join(', ')}`]
    );

    res.json({
      status: sent ? 'success' : 'error',
      message: sent ? `Report emailed to ${recipients.length} recipient(s)` : 'Email failed',
      data: { recipients, report_type, period, pdf_generated: !!pdf }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// ?? Get report history ?????????????????????????????????????????????????????
router.get('/report/history', async (req: any, res: any) => {
  const userId = req.user?.userId || 1;
  try {
    const result = await pool.query(
      'SELECT * FROM user_report_history WHERE user_id=$1 ORDER BY run_at DESC LIMIT 20',
      [userId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

export default router;
