import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { parseTallyXML } from '../services/tallyParser.service';
import pool from '../config/database';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();
router.use(authenticate);

// Configure multer for XML file uploads
const upload = multer({
  dest: '/tmp/tally-uploads/',
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xml|XML)$/)) cb(null, true);
    else cb(new Error('Only XML files are allowed'));
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// ?? Upload and parse Tally XML ?????????????????????????????????????????????
router.post('/upload', upload.single('tallyFile'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ status: 'error', message: 'No XML file uploaded' });

  const tenantId = (req as any).user?.tenantId || 1;
  const filePath = req.file.path;

  try {
    // Create import job record
    const job = await pool.query(
      `INSERT INTO bulk_import_jobs (tenant_id, module, status, total_rows)
       VALUES ($1,$2,$3,$4) RETURNING job_id`,
      [tenantId, 'tally_xml', 'Processing', 0]
    );
    const jobId = job.rows[0].job_id;

    // Read XML file
    const xmlContent = fs.readFileSync(filePath, 'utf-8');
    fs.unlinkSync(filePath); // Clean up temp file

    // Parse in background
    res.json({
      status: 'success',
      message: 'Tally XML upload received. Processing started.',
      job_id: jobId
    });

    // Process asynchronously
    parseTallyXML(xmlContent, tenantId).then(async (result) => {
      const total = Object.values(result.summary).reduce((a: any, b: any) => a + b, 0);
      await pool.query(
        `UPDATE bulk_import_jobs SET status=$1, processed_rows=$2, errors=$3 WHERE job_id=$4`,
        [result.success ? 'Completed' : 'Failed', total, JSON.stringify(result.errors), jobId]
      );

      // Create notification
      const users = await pool.query('SELECT user_id FROM users WHERE tenant_id=$1 AND status=$2', [tenantId, 'active']);
      for (const u of users.rows) {
        await pool.query(
          'INSERT INTO app_notifications (user_id,tenant_id,title,message,type,link) VALUES ($1,$2,$3,$4,$5,$6)',
          [u.user_id, tenantId,
           result.success ? '? Tally Import Complete' : '? Tally Import Failed',
           `Expenses: ${result.summary.expenses_created}, Invoices: ${result.summary.invoices_created}, POs: ${result.summary.purchase_orders_created}, Vendors: ${result.summary.vendors_created}, Customers: ${result.summary.customers_created}, Inventory: ${result.summary.inventory_created}`,
           result.success ? 'success' : 'error', '/bulk-import']
        );
      }
      console.log('[Tally] Import complete:', result.summary);
    }).catch(async (err) => {
      await pool.query(`UPDATE bulk_import_jobs SET status='Failed', errors=$1 WHERE job_id=$2`, [JSON.stringify([err.message]), jobId]);
      console.error('[Tally] Import failed:', err.message);
    });

  } catch (e: any) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// ?? Get import job status ??????????????????????????????????????????????????
router.get('/status/:jobId', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM bulk_import_jobs WHERE job_id=$1', [req.params.jobId]);
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Job not found' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// ?? Get all Tally import history ???????????????????????????????????????????
router.get('/history', async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || 1;
  try {
    const result = await pool.query(
      `SELECT * FROM bulk_import_jobs WHERE tenant_id=$1 AND module='tally_xml' ORDER BY created_at DESC LIMIT 20`,
      [tenantId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// ?? Get Tally import guide (what to export from Tally) ?????????????????????
router.get('/guide', async (req: Request, res: Response) => {
  res.json({
    status: 'success',
    data: {
      title: 'How to Export XML from Tally',
      steps: [
        { step: 1, action: 'Open Tally Prime or Tally ERP 9' },
        { step: 2, action: 'Go to Gateway of Tally ? Display ? Day Book' },
        { step: 3, action: 'Set date range (e.g., current month or year)' },
        { step: 4, action: 'Press Alt+E to Export' },
        { step: 5, action: 'Select Format: XML' },
        { step: 6, action: 'Click Export and save the .xml file' },
        { step: 7, action: 'Upload the .xml file here' }
      ],
      supported_voucher_types: [
        'Payment Vouchers ? imported as Expenses',
        'Sales Vouchers ? imported as Invoices + Orders',
        'Purchase Vouchers ? imported as Purchase Orders',
        'Receipt Vouchers ? marks matching invoices as Paid',
        'Journal Entries ? imported as Budget Transactions'
      ],
      supported_masters: [
        'Stock Items ? imported as Inventory',
        'Sundry Debtors ? imported as Customers',
        'Sundry Creditors ? imported as Vendors'
      ],
      tips: [
        'Export Day Book for transaction data',
        'Export Ledger Masters for customer/vendor data',
        'Export Stock Summary for inventory data',
        'You can upload multiple XML files ? duplicates are skipped automatically'
      ]
    }
  });
});

// ?? Bank Statement CSV Parser ??????????????????????????????????????????????
const bankUpload = multer({
  dest: '/tmp/bank-uploads/',
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(csv|CSV|xlsx|XLSX)$/)) cb(null, true);
    else cb(new Error('Only CSV or Excel files allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/bank-statement', bankUpload.single('bankFile'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });

  const tenantId = (req as any).user?.tenantId || 1;
  const bankName = req.body.bank || 'Unknown Bank';
  const filePath = req.file.path;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    fs.unlinkSync(filePath);

    const lines = content.split('\n').filter(l => l.trim());
    let imported = 0;
    let skipped = 0;

    // Auto-detect bank format by header
    const header = lines[0].toLowerCase();
    let dateCol = 0, descCol = 1, debitCol = 2, creditCol = 3;

    if (header.includes('narration') || header.includes('description')) {
      // HDFC/SBI format
      const cols = header.split(',');
      dateCol = cols.findIndex((c: string) => c.includes('date'));
      descCol = cols.findIndex((c: string) => c.includes('narration') || c.includes('description') || c.includes('particulars'));
      debitCol = cols.findIndex((c: string) => c.includes('debit') || c.includes('withdrawal'));
      creditCol = cols.findIndex((c: string) => c.includes('credit') || c.includes('deposit'));
    }

    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = lines[i].split(',').map((c: string) => c.trim().replace(/"/g, ''));
        if (cols.length < 3) { skipped++; continue; }

        const dateStr = cols[dateCol];
        const description = cols[descCol] || 'Bank Transaction';
        const debit = parseFloat(cols[debitCol]?.replace(/,/g, '') || '0') || 0;
        const credit = parseFloat(cols[creditCol]?.replace(/,/g, '') || '0') || 0;

        if (!dateStr || (debit === 0 && credit === 0)) { skipped++; continue; }

        // Parse date
        let txDate = new Date();
        try {
          const parts = dateStr.split(/[\/\-]/);
          if (parts.length === 3) {
            if (parts[2].length === 4) txDate = new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`);
            else txDate = new Date(dateStr);
          }
        } catch { txDate = new Date(); }

        if (debit > 0) {
          // Outgoing payment ? create expense
          const category = categoriseBankTransaction(description);
          await pool.query(
            `INSERT INTO expenses (tenant_id, title, category, department, amount, expense_date, employee_name, payment_method, status, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
            [tenantId, description.substring(0, 100), category, 'Finance',
             debit, txDate.toISOString().split('T')[0],
             'Bank Import', 'Bank Transfer', 'Approved',
             `Bank: ${bankName}`]
          );
        } else if (credit > 0) {
          // Incoming payment ? could be invoice payment
          await pool.query(
            `UPDATE generated_invoices SET status='Paid'
             WHERE tenant_id=$1 AND ABS(total_amount - $2) < 1 AND status IN ('Sent','Overdue')
             LIMIT 1`,
            [tenantId, credit]
          );
        }
        imported++;
      } catch (rowErr: any) {
        skipped++;
      }
    }

    // Notify
    const users = await pool.query('SELECT user_id FROM users WHERE tenant_id=$1 AND status=$2', [tenantId, 'active']);
    for (const u of users.rows) {
      await pool.query(
        'INSERT INTO app_notifications (user_id,tenant_id,title,message,type,link) VALUES ($1,$2,$3,$4,$5,$6)',
        [u.user_id, tenantId,
         '? Bank Statement Imported',
         `${bankName}: ${imported} transactions imported, ${skipped} skipped. Expenses auto-categorised.`,
         'success', '/expense-mgmt']
      );
    }

    res.json({
      status: 'success',
      message: `Bank statement imported: ${imported} transactions, ${skipped} skipped`,
      data: { imported, skipped, bank: bankName }
    });

  } catch (e: any) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// ?? Categorise bank transaction ????????????????????????????????????????????
function categoriseBankTransaction(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('salary') || d.includes('payroll')) return 'Payroll';
  if (d.includes('rent') || d.includes('lease')) return 'Rent';
  if (d.includes('aws') || d.includes('azure') || d.includes('google') || d.includes('software')) return 'Software';
  if (d.includes('swiggy') || d.includes('zomato') || d.includes('food')) return 'Meals';
  if (d.includes('uber') || d.includes('ola') || d.includes('irctc') || d.includes('airline')) return 'Travel';
  if (d.includes('electricity') || d.includes('bescom') || d.includes('tesco')) return 'Utilities';
  if (d.includes('airtel') || d.includes('jio') || d.includes('vodafone') || d.includes('bsnl')) return 'Communication';
  if (d.includes('insurance') || d.includes('lic')) return 'Insurance';
  if (d.includes('nsdl') || d.includes('tds') || d.includes('gst') || d.includes('income tax')) return 'Tax';
  if (d.includes('neft') || d.includes('rtgs') || d.includes('imps') || d.includes('upi')) return 'Transfer';
  return 'General';
}

export default router;
