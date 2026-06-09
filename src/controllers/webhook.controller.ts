import { Request, Response } from 'express';
import pool from '../config/database';
const q = (n: number) => '$' + n;

export const webhookController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT * FROM app_webhooks ORDER BY created_at DESC');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  create: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { name, url, events, secret } = req.body;
      const result = await pool.query('INSERT INTO app_webhooks (name, url, events, secret, created_by) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',' + q(4) + ',' + q(5) + ') RETURNING *', [name, url, events, secret, userId]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  toggle: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('UPDATE app_webhooks SET is_active=NOT is_active WHERE webhook_id=' + q(1) + ' RETURNING *', [req.params.id]);
      res.json({ status: 'success', data: result.rows[0] });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  delete: async (req: Request, res: Response) => {
    try {
      await pool.query('DELETE FROM app_webhooks WHERE webhook_id=' + q(1), [req.params.id]);
      res.json({ status: 'success', message: 'Webhook deleted' });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  getLogs: async (req: Request, res: Response) => {
    try {
      const result = await pool.query('SELECT l.*, w.name as webhook_name FROM webhook_logs l JOIN app_webhooks w ON l.webhook_id=w.webhook_id ORDER BY l.triggered_at DESC LIMIT 50');
      res.json({ status: 'success', data: result.rows });
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  },
  test: async (req: Request, res: Response) => {
    try {
      const webhook = await pool.query('SELECT * FROM app_webhooks WHERE webhook_id=' + q(1), [req.params.id]);
      if (!webhook.rows.length) return res.status(404).json({ status: 'error', message: 'Webhook not found' });
      const w = webhook.rows[0];
      const payload = { event: 'test', timestamp: new Date().toISOString(), data: { message: 'Test webhook from Finance Suite' } };
      try {
        const resp = await fetch(w.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Webhook-Secret': w.secret||'' }, body: JSON.stringify(payload) });
        await pool.query('INSERT INTO webhook_logs (webhook_id, event, payload, response_status) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',' + q(4) + ')', [w.webhook_id, 'test', JSON.stringify(payload), resp.status]);
        await pool.query('UPDATE app_webhooks SET last_triggered=NOW(), trigger_count=trigger_count+1 WHERE webhook_id=' + q(1), [w.webhook_id]);
        res.json({ status: 'success', response_status: resp.status });
      } catch (fetchErr) {
        await pool.query('INSERT INTO webhook_logs (webhook_id, event, payload, response_status) VALUES (' + q(1) + ',' + q(2) + ',' + q(3) + ',0)', [w.webhook_id, 'test', JSON.stringify(payload)]);
        res.json({ status: 'error', message: 'Webhook delivery failed: ' + String(fetchErr) });
      }
    } catch (e) { res.status(500).json({ status: 'error', message: String(e) }); }
  }
};