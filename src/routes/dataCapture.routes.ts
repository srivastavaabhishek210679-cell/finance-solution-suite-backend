import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { fetchGSTR1, fetchGSTR2A, validateGSTIN, decodeGSTIN, saveGSTIN, getGSTIN } from '../services/gstSync.service';
import { parseAttendanceCSV, parseAttendanceExcel, processBiometricFile } from '../services/attendanceImporter.service';
import pool from '../config/database';
import multer from 'multer';
import fs from 'fs';

const router = Router();
router.use(authenticate);

const upload = multer({
  dest: '/tmp/imports/',
  limits: { fileSize: 20 * 1024 * 1024 }
});

// ??????????????????????????????????????????????????????????????????????????
// GST PORTAL ENDPOINTS
// ??????????????????????????????????????????????????????????????????????????

// Save GSTIN for tenant
router.post('/gst/setup', async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || 1;
  const { gstin, legal_name } = req.body;
  if (!gstin) return res.status(400).json({ status: 'error', message: 'GSTIN required' });
  if (!validateGSTIN(gstin)) return res.status(400).json({ status: 'error', message: 'Invalid GSTIN format' });

  try {
    await saveGSTIN(tenantId, gstin.toUpperCase(), legal_name || '');
    const info = decodeGSTIN(gstin.toUpperCase());
    res.json({ status: 'success', message: 'GSTIN saved', data: { gstin: gstin.toUpperCase(), ...info } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Validate and decode GSTIN
router.get('/gst/validate/:gstin', async (req: Request, res: Response) => {
  const gstin = req.params.gstin.toUpperCase();
  if (!validateGSTIN(gstin)) return res.json({ status: 'success', data: { valid: false, gstin } });
  const info = decodeGSTIN(gstin);
  res.json({ status: 'success', data: { valid: true, gstin, ...info } });
});

// Sync GSTR-1 (sales invoices) from GST portal
router.post('/gst/sync/gstr1', async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || 1;
  const { gstin, period } = req.body; // period: MMYYYY

  try {
    const gstinToUse = gstin || await getGSTIN(tenantId);
    if (!gstinToUse) return res.status(400).json({ status: 'error', message: 'GSTIN not configured. Use /api/v1/datacapture/gst/setup first.' });

    const result = await fetchGSTR1(gstinToUse, period || getCurrentPeriod(), tenantId);

    // Notify users
    const users = await pool.query('SELECT user_id FROM users WHERE tenant_id=$1 AND status=$2', [tenantId, 'active']);
    for (const u of users.rows) {
      await pool.query(
        'INSERT INTO app_notifications (user_id,tenant_id,title,message,type,link) VALUES ($1,$2,$3,$4,$5,$6)',
        [u.user_id, tenantId,
         result.success ? '? GSTR-1 Synced' : '?? GSTR-1 Sync Issue',
         `${result.imported} sales invoices imported from GST portal${result.errors.length > 0 ? '. ' + result.errors[0] : ''}`,
         result.success ? 'success' : 'warning', '/invoices']
      );
    }

    res.json({ status: 'success', data: result });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Sync GSTR-2A (purchase invoices from suppliers)
router.post('/gst/sync/gstr2a', async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || 1;
  const { gstin, period } = req.body;

  try {
    const gstinToUse = gstin || await getGSTIN(tenantId);
    if (!gstinToUse) return res.status(400).json({ status: 'error', message: 'GSTIN not configured' });

    const result = await fetchGSTR2A(gstinToUse, period || getCurrentPeriod(), tenantId);
    res.json({ status: 'success', data: result });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Get current GST setup
router.get('/gst/setup', async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || 1;
  try {
    const gstin = await getGSTIN(tenantId);
    if (!gstin) return res.json({ status: 'success', data: { configured: false } });
    const info = decodeGSTIN(gstin);
    res.json({ status: 'success', data: { configured: true, gstin, ...info } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// ??????????????????????????????????????????????????????????????????????????
// ATTENDANCE IMPORT ENDPOINTS
// ??????????????????????????????????????????????????????????????????????????

// Upload Excel attendance file
router.post('/attendance/excel', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });
  const tenantId = (req as any).user?.tenantId || 1;
  const filePath = req.file.path;

  try {
    const result = req.file.originalname.endsWith('.csv') || req.file.originalname.endsWith('.CSV')
      ? await parseAttendanceCSV(fs.readFileSync(filePath, 'utf-8'), tenantId, { source: 'CSV Upload' })
      : await parseAttendanceExcel(filePath, tenantId);

    fs.unlinkSync(filePath);

    // Notify
    const users = await pool.query('SELECT user_id FROM users WHERE tenant_id=$1 AND status=$2', [tenantId,'active']);
    for (const u of users.rows) {
      await pool.query(
        'INSERT INTO app_notifications (user_id,tenant_id,title,message,type,link) VALUES ($1,$2,$3,$4,$5,$6)',
        [u.user_id, tenantId,
         '? Attendance Import Complete',
         `${result.imported} attendance records imported, ${result.skipped} skipped.${result.errors.length > 0 ? ' Some rows had errors.' : ''}`,
         'success', '/attendance']
      );
    }

    res.json({ status: 'success', data: result });
  } catch (e: any) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Upload biometric device export
router.post('/attendance/biometric', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });
  const tenantId = (req as any).user?.tenantId || 1;
  const deviceType = req.body.device_type || 'auto'; // zkteco, essl, realand, generic
  const filePath = req.file.path;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    fs.unlinkSync(filePath);
    const result = await processBiometricFile(content, tenantId, deviceType);

    // Notify
    const users = await pool.query('SELECT user_id FROM users WHERE tenant_id=$1 AND status=$2', [tenantId,'active']);
    for (const u of users.rows) {
      await pool.query(
        'INSERT INTO app_notifications (user_id,tenant_id,title,message,type,link) VALUES ($1,$2,$3,$4,$5,$6)',
        [u.user_id, tenantId,
         '? Biometric Data Imported',
         `${result.imported} records imported from ${deviceType} device. ${result.skipped} skipped.`,
         'success', '/attendance']
      );
    }

    res.json({ status: 'success', data: { ...result, device_type: deviceType } });
  } catch (e: any) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Download attendance template
router.get('/attendance/template', async (req: Request, res: Response) => {
  const format = req.query.format || 'generic';

  const templates: {[k:string]: string} = {
    generic: 'Employee Name,Date,Status,Check In,Check Out,Department\nRahul Sharma,01/07/2026,Present,09:00,18:00,Engineering\nPriya Patel,01/07/2026,WFH,09:30,17:30,HR\nAmit Kumar,01/07/2026,Absent,,,Finance',
    zkteco: 'UserID,Name,DateTime,Status,Verify\n1001,Rahul Sharma,2026-07-01 09:00:23,0,1\n1001,Rahul Sharma,2026-07-01 18:02:45,1,1\n1002,Priya Patel,2026-07-01 09:15:11,0,1',
    essl: 'EnrollNo,Name,Date,Time,Status\n1001,Rahul Sharma,01/07/2026,09:00:00,P\n1001,Rahul Sharma,01/07/2026,18:00:00,P\n1002,Priya Patel,01/07/2026,09:15:00,P',
  };

  const csv = templates[format as string] || templates.generic;
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=attendance_template_${format}.csv`);
  res.send(csv);
});

// ??????????????????????????????????????????????????????????????????????????
// FTP BIOMETRIC AUTO-WATCHER
// Polls FTP directory for new biometric CSV files
// ??????????????????????????????????????????????????????????????????????????
router.post('/ftp/setup', async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || 1;
  const { host, port, username, password, watch_directory, device_type, target_module } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO ftp_configs (tenant_id, host, port, username, password_encrypted, watch_directory, target_module, status, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING RETURNING id`,
      [tenantId, host, port || 21, username,
       Buffer.from(password || '').toString('base64'), // Simple encoding
       watch_directory || '/attendance', target_module || 'attendance', 'Active', true]
    );

    // Save device type in settings
    await pool.query(
      `INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
       VALUES ($1,$2,$3) ON CONFLICT (tenant_id, setting_key) DO UPDATE SET setting_value=$3`,
      [tenantId, 'biometric_device_type', device_type || 'generic']
    );

    res.json({
      status: 'success',
      message: 'FTP watcher configured. Biometric files will be auto-imported every 2 hours.',
      data: result.rows[0]
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

router.get('/ftp/status', async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || 1;
  try {
    const configs = await pool.query('SELECT id, host, watch_directory, status, last_checked, is_active FROM ftp_configs WHERE tenant_id=$1', [tenantId]);
    const logs = await pool.query('SELECT * FROM ftp_import_logs ORDER BY imported_at DESC LIMIT 10');
    res.json({ status: 'success', data: { configs: configs.rows, recent_imports: logs.rows } });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// ??????????????????????????????????????????????????????????????????????????
// DATA CAPTURE DASHBOARD ? overview of all data sources
// ??????????????????????????????????????????????????????????????????????????
router.get('/dashboard', async (req: Request, res: Response) => {
  const tenantId = (req as any).user?.tenantId || 1;
  try {
    const [gstin, ftpConfigs, importJobs, attRecords] = await Promise.all([
      getGSTIN(tenantId),
      pool.query('SELECT COUNT(*) as c FROM ftp_configs WHERE tenant_id=$1 AND is_active=true', [tenantId]),
      pool.query(`SELECT module, status, created_at FROM bulk_import_jobs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 5`, [tenantId]),
      pool.query(`SELECT COUNT(*) as c, MAX(date) as last_date FROM attendance_records WHERE tenant_id=$1`, [tenantId]),
    ]);

    res.json({
      status: 'success',
      data: {
        data_sources: {
          tally_xml: { configured: true, endpoint: 'POST /api/v1/tally/upload' },
          bank_statement: { configured: true, endpoint: 'POST /api/v1/tally/bank-statement' },
          gst_portal: { configured: !!gstin, gstin: gstin || null, endpoint: 'POST /api/v1/datacapture/gst/sync/gstr1' },
          attendance_excel: { configured: true, endpoint: 'POST /api/v1/datacapture/attendance/excel' },
          biometric_ftp: { configured: parseInt(ftpConfigs.rows[0].c) > 0, ftp_watchers: parseInt(ftpConfigs.rows[0].c) },
        },
        recent_imports: importJobs.rows,
        attendance_stats: {
          total_records: parseInt(attRecords.rows[0].c),
          last_imported: attRecords.rows[0].last_date
        }
      }
    });
  } catch (e: any) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

function getCurrentPeriod(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${month}${year}`;
}

export default router;
