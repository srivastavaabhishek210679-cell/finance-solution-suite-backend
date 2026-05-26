import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { emailService } from '../services/email.service';

export const scheduleController = {

  getAll: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const result = await pool.query(
      'SELECT * FROM report_schedules WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );
    res.json({ status: 'success', data: result.rows });
  },

  create: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const userId = authReq.user?.userId;
    const { name, domain, frequency, send_time, recipients, format } = req.body;
    const result = await pool.query(
      `INSERT INTO report_schedules (tenant_id, name, domain, frequency, send_time, recipients, format, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [tenantId, name, domain, frequency, send_time || '09:00', recipients, format || 'PDF', userId]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  },

  update: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const { id } = req.params;
    const { name, domain, frequency, send_time, recipients, format, is_active } = req.body;
    const result = await pool.query(
      `UPDATE report_schedules SET name=$1, domain=$2, frequency=$3, send_time=$4,
       recipients=$5, format=$6, is_active=$7, updated_at=NOW()
       WHERE schedule_id=$8 AND tenant_id=$9 RETURNING *`,
      [name, domain, frequency, send_time, recipients, format, is_active, id, tenantId]
    );
    res.json({ status: 'success', data: result.rows[0] });
  },

  toggle: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE report_schedules SET is_active = NOT is_active, updated_at = NOW()
       WHERE schedule_id=$1 AND tenant_id=$2 RETURNING *`,
      [id, tenantId]
    );
    res.json({ status: 'success', data: result.rows[0] });
  },

  delete: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const { id } = req.params;
    await pool.query(
      'DELETE FROM report_schedules WHERE schedule_id=$1 AND tenant_id=$2',
      [id, tenantId]
    );
    res.json({ status: 'success', message: 'Schedule deleted' });
  },

  sendNow: async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const tenantId = authReq.user?.tenantId;
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM report_schedules WHERE schedule_id=$1 AND tenant_id=$2',
      [id, tenantId]
    );
    const schedule = result.rows[0];
    if (!schedule) {
      return res.status(404).json({ status: 'error', message: 'Schedule not found' });
    }
    const recipients = schedule.recipients || [];
    for (const email of recipients) {
      await emailService.send({
        to: email,
        subject: `${schedule.name} — ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;">
            <h2 style="color:#60a5fa;margin:0 0 8px;">?? ${schedule.name}</h2>
            <p style="color:#94a3b8;margin:0 0 24px;">Domain: ${schedule.domain} | Format: ${schedule.format} | Frequency: ${schedule.frequency}</p>
            <div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="margin:0;color:#e2e8f0;">Your scheduled executive report is ready. Please log in to the Finance Platform to download the full ${schedule.format} report.</p>
            </div>
            <a href="https://finance-frontend-2l6b.onrender.com/executive-reporting" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Report ?</a>
            <p style="color:#475569;font-size:12px;margin-top:24px;">Enterprise Finance Platform | Automated Report Delivery</p>
          </div>
        `
      });
    }
    await pool.query(
      'UPDATE report_schedules SET last_sent_at=NOW(), sent_count=sent_count+1 WHERE schedule_id=$1',
      [id]
    );
    res.json({ status: 'success', message: `Report sent to ${recipients.length} recipient(s)` });
  }
};
