import * as cron from 'node-cron';
import pool from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

const BACKUP_DIR = '/tmp/db_backups';

const runBackup = async () => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(BACKUP_DIR, 'backup-' + timestamp + '.json');
    const tables = ['users','tenants','user_report_history','ftp_configs','orders','suppliers','purchase_orders'];
    const backup: any = { timestamp: new Date().toISOString(), tables: {} };
    for (const table of tables) {
      try {
        const result = await pool.query('SELECT * FROM ' + table + ' LIMIT 1000');
        backup.tables[table] = { count: result.rows.length, data: result.rows };
      } catch (e) { backup.tables[table] = { error: String(e) }; }
    }
    fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
    const files = fs.readdirSync(BACKUP_DIR).filter((f: string) => f.startsWith('backup-')).sort();
    if (files.length > 7) files.slice(0, files.length - 7).forEach((f: string) => fs.unlinkSync(path.join(BACKUP_DIR, f)));
    console.log('[DBBackup] Backup completed:', filename);
  } catch (e) { console.error('[DBBackup] Failed:', e); }
};

export const startDBBackup = () => {
  cron.schedule('0 2 * * *', runBackup);
  console.log('[DBBackup] Scheduled daily at 2 AM');
  runBackup();
};
export const runDBBackup = runBackup;