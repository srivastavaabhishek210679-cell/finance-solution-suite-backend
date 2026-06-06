import { Request, Response } from 'express';
import pool from '../config/database';

const p1='$1', p2='$2', p3='$3', p4='$4', p5='$5', p6='$6', p7='$7', p8='$8';

export const ftpController = {
  getConfigs: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const result = await pool.query('SELECT config_id, name, protocol, host, port, username, remote_path, is_active, last_checked, files_processed, created_at FROM ftp_configs WHERE user_id='+p1+' ORDER BY created_at DESC', [userId]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  createConfig: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { name, protocol, host, port, username, password, remote_path } = req.body;
      const result = await pool.query('INSERT INTO ftp_configs (user_id, name, protocol, host, port, username, password, remote_path) VALUES ('+p1+','+p2+','+p3+','+p4+','+p5+','+p6+','+p7+','+p8+') RETURNING *', [userId, name, protocol||'sftp', host, port||22, username, password, remote_path||'/']);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  updateConfig: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { id } = req.params;
      const { name, protocol, host, port, username, password, remote_path, is_active } = req.body;
      const result = await pool.query('UPDATE ftp_configs SET name='+p1+', protocol='+p2+', host='+p3+', port='+p4+', username='+p5+', remote_path='+p6+', is_active='+p7+' WHERE config_id='+p8+' AND user_id='+p1+' RETURNING *', [name, protocol, host, port, username, remote_path, is_active, id, userId]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  deleteConfig: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      await pool.query('DELETE FROM ftp_configs WHERE config_id='+p1+' AND user_id='+p2, [req.params.id, userId]);
      res.json({ status: 'success', message: 'Config deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  getProcessedFiles: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT f.*, c.name as config_name FROM ftp_processed_files f JOIN ftp_configs c ON f.config_id=c.config_id WHERE c.user_id='+p1+' ORDER BY f.processed_at DESC LIMIT 50', [(req as any).user?.userId]);
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },

  triggerManual: async (req: Request, res: Response) => {
    try {
      const { runFTPWatcher } = await import('../services/ftpWatcher.service');
      await runFTPWatcher();
      res.json({ status: 'success', message: 'FTP watch triggered manually' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};