import cron from 'node-cron';
import pool from '../config/database';
import { emailService } from './email.service';

const getNextSendDate = (frequency: string, sendTime: string): Date => {
  const now = new Date();
  const [hours, minutes] = sendTime.split(':').map(Number);
  const next = new Date(now);
  next.setHours(hours, minutes, 0, 0);
  if (next <= now) {
    switch (frequency.toLowerCase()) {
      case 'daily': next.setDate(next.getDate() + 1); break;
      case 'weekly': next.setDate(next.getDate() + 7); break;
      case 'monthly': next.setMonth(next.getMonth() + 1); break;
      case 'quarterly': next.setMonth(next.getMonth() + 3); break;
      case 'yearly': next.setFullYear(next.getFullYear() + 1); break;
      default: next.setDate(next.getDate() + 1);
    }
  }
  return next;
};

const isDue = (schedule: any): boolean => {
  const now = new Date();
  const [hours, minutes] = schedule.send_time.split(':').map(Number);
  const isRightTime = now.getHours() === hours && now.getMinutes() === minutes;
  if (!isRightTime) return false;
  if (!schedule.last_sent_at) return true;
  const last = new Date(schedule.last_sent_at);
  const diffMs = now.getTime() - last.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  switch (schedule.frequency.toLowerCase()) {
    case 'daily': return diffDays >= 1;
    case 'weekly': return diffDays >= 7;
    case 'monthly': return diffDays >= 28;
    case 'quarterly': return diffDays >= 84;
    case 'yearly': return diffDays >= 365;
    default: return false;
  }
};

export const startScheduler = () => {
  console.log('[Scheduler] Starting cron job...');
  cron.schedule('* * * * *', async () => {
    try {
      const result = await pool.query('SELECT * FROM report_schedules WHERE is_active = true');
      const schedules = result.rows;
      for (const schedule of schedules) {
        if (!isDue(schedule)) continue;
        console.log(`[Scheduler] Sending: ${schedule.name}`);
        const recipients = schedule.recipients || [];
        for (const email of recipients) {
          await emailService.send({
            to: email,
            subject: `${schedule.name} — ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f172a;color:#e2e8f0;padding:32px;border-radius:12px;"><h2 style="color:#60a5fa;">📊 ${schedule.name}</h2><p style="color:#94a3b8;">Domain: ${schedule.domain} | Format: ${schedule.format} | Frequency: ${schedule.frequency}</p><div style="background:#1e293b;border-radius:8px;padding:20px;margin-bottom:24px;"><p>Your scheduled report is ready.</p></div><a href="https://finance-frontend-2l6b.onrender.com/executive-reporting" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View Report →</a></div>`
          });
        }
        const nextSend = getNextSendDate(schedule.frequency, schedule.send_time);
        await pool.query(
          'UPDATE report_schedules SET last_sent_at=NOW(), sent_count=sent_count+1, next_send_at= WHERE schedule_id=',
          [nextSend, schedule.schedule_id]
        );
        console.log(`[Scheduler] Sent ${schedule.name} to ${recipients.length} recipients`);
      }
    } catch (err) {
      console.error('[Scheduler] Error:', err);
    }
  });
  console.log('[Scheduler] Cron job started - checking every minute');
};