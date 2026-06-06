import * as cron from 'node-cron';
import * as XLSX from 'xlsx';
import pool from '../config/database';
import { parse } from 'csv-parse/sync';

// Dynamic import for sftp
let SftpClient: any = null;
let FtpClient: any = null;

const loadClients = async () => {
  if (!SftpClient) SftpClient = (await import('ssh2-sftp-client')).default;
  if (!FtpClient) FtpClient = (await import('ftp')).default;
};

interface FTPConfig {
  config_id: number;
  name: string;
  protocol: string;
  host: string;
  port: number;
  username: string;
  password: string;
  remote_path: string;
  user_id: number;
  is_active: boolean;
}

const detectReportType = (headers: string[]): string => {
  const h = headers.map(h => h.toLowerCase()).join(' ');
  if (h.match(/salary|payroll|wage|compensation/)) return 'payroll';
  if (h.match(/revenue|profit|expense|budget|invoice/)) return 'financial';
  if (h.match(/sales|deal|customer|lead/)) return 'sales';
  if (h.match(/inventory|stock|warehouse|sku/)) return 'inventory';
  if (h.match(/employee|attendance|leave|performance/)) return 'hr';
  if (h.match(/project|milestone|task/)) return 'project';
  return 'general';
};

const generateSummary = (data: any[], headers: string[]) => {
  const summary: any = { totalRecords: data.length };
  headers.forEach(h => {
    const vals = data.map(r => parseFloat(r[h])).filter(v => !isNaN(v));
    if (vals.length > 0) {
      summary['total_' + h] = vals.reduce((a, b) => a + b, 0).toFixed(2);
      summary['avg_' + h] = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
    }
  });
  return summary;
};

const parseFileContent = (buffer: Buffer, fileName: string): any[] => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'csv' || ext === 'txt') {
    const content = buffer.toString('utf-8');
    return parse(content, { columns: true, skip_empty_lines: true, trim: true });
  } else if (ext === 'xlsx' || ext === 'xls') {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: '' });
  }
  return [];
};

const processAndSaveReport = async (fileBuffer: Buffer, fileName: string, userId: number, configName: string) => {
  try {
    const data = parseFileContent(fileBuffer, fileName);
    if (!data || data.length === 0) {
      console.log('[FTPWatcher] Empty file:', fileName);
      return;
    }
    const headers = Object.keys(data[0]);
    const reportType = detectReportType(headers);
    const summary = generateSummary(data, headers);
    const reportName = fileName.replace(/\.[^.]+$/, '') + ' Report';

    await pool.query(
      'INSERT INTO user_report_history (user_id, report_name, domain_name, template_id, total_records, file_name, report_data, notes, status) VALUES (' +
      '$1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [
        userId,
        reportName,
        configName + ' - ' + reportType.charAt(0).toUpperCase() + reportType.slice(1),
        reportType,
        data.length,
        fileName,
        JSON.stringify({ summary, data: data.slice(0, 100) }),
        'Auto-imported from FTP: ' + configName,
        'Completed'
      ]
    );
    console.log('[FTPWatcher] Report saved:', reportName, '(' + data.length + ' records)');
  } catch (e) {
    console.error('[FTPWatcher] Error processing file:', fileName, e);
  }
};

const processedFiles = new Set<string>();

const watchSFTP = async (config: FTPConfig) => {
  await loadClients();
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      readyTimeout: 10000
    });
    const files = await sftp.list(config.remote_path);
    const csvFiles = files.filter((f: any) => f.type === '-' && /\.(csv|xlsx|xls|txt)$/i.test(f.name));

    for (const file of csvFiles) {
      const fileKey = config.config_id + ':' + file.name + ':' + file.modifyTime;
      if (processedFiles.has(fileKey)) continue;

      console.log('[FTPWatcher] Processing:', file.name);
      const buffer = await sftp.get(config.remote_path + '/' + file.name) as Buffer;
      await processAndSaveReport(buffer, file.name, config.user_id, config.name);
      processedFiles.add(fileKey);

      // Mark file as processed in DB
      await pool.query(
        'INSERT INTO ftp_processed_files (config_id, file_name, processed_at) VALUES ($1,$2,NOW()) ON CONFLICT (config_id, file_name) DO UPDATE SET processed_at=NOW()',
        [config.config_id, file.name]
      );
    }
    await sftp.end();
  } catch (e) {
    console.error('[FTPWatcher] SFTP error for config:', config.name, e);
    try { await sftp.end(); } catch {}
  }
};

const watchFTP = async (config: FTPConfig) => {
  await loadClients();
  return new Promise<void>((resolve) => {
    const ftp = new FtpClient();
    ftp.on('ready', () => {
      ftp.list(config.remote_path, async (err: any, files: any[]) => {
        if (err) { console.error('[FTPWatcher] FTP list error:', err); ftp.end(); resolve(); return; }
        const csvFiles = files.filter(f => /\.(csv|xlsx|xls|txt)$/i.test(f.name));
        for (const file of csvFiles) {
          const fileKey = config.config_id + ':' + file.name;
          if (processedFiles.has(fileKey)) continue;
          await new Promise<void>((res) => {
            ftp.get(config.remote_path + '/' + file.name, async (err2: any, stream: any) => {
              if (err2) { res(); return; }
              const chunks: Buffer[] = [];
              stream.on('data', (chunk: Buffer) => chunks.push(chunk));
              stream.on('end', async () => {
                const buffer = Buffer.concat(chunks);
                await processAndSaveReport(buffer, file.name, config.user_id, config.name);
                processedFiles.add(fileKey);
                res();
              });
            });
          });
        }
        ftp.end();
        resolve();
      });
    });
    ftp.on('error', (err: any) => { console.error('[FTPWatcher] FTP error:', err); resolve(); });
    ftp.connect({ host: config.host, port: config.port || 21, user: config.username, password: config.password });
  });
};

const runWatcher = async () => {
  try {
    const result = await pool.query('SELECT * FROM ftp_configs WHERE is_active=true');
    const configs: FTPConfig[] = result.rows;
    if (configs.length === 0) return;
    console.log('[FTPWatcher] Checking', configs.length, 'FTP configs...');
    for (const config of configs) {
      if (config.protocol === 'sftp') await watchSFTP(config);
      else await watchFTP(config);
    }
  } catch (e) {
    console.error('[FTPWatcher] Error:', e);
  }
};

export const runFTPWatcher = runWatcher;
export const startFTPWatcher = () => {
  // Run every 120 minutes
  cron.schedule('0 */2 * * *', runWatcher);
  console.log('[FTPWatcher] Started - checking every 120 minutes');
  // Also run immediately on start
  runWatcher();
};
