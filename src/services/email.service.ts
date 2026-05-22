import * as nodemailer from 'nodemailer';
import { query } from '../config/database';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: any = null;
  private fromAddress: string;

  constructor() {
    this.fromAddress = process.env.SMTP_FROM || 'noreply@financesuite.com';
    this.initTransporter();
  }

  private initTransporter(): void {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('[EmailService] SMTP not configured — demo mode');
      return;
    }

    this.transporter = nodemailer.createTransporter({
      host,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    console.log('[EmailService] SMTP transporter initialised ?', host);
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter) {
      console.log('[EmailService] Demo mode — would send to:', options.to);
      return { success: true, messageId: `demo-${Date.now()}` };
    }
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]+>/g, ''),
      });
      console.log('[EmailService] Sent:', info.messageId, '?', options.to);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('[EmailService] Send failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    if (!this.transporter) return { connected: false, message: 'SMTP not configured' };
    try {
      await this.transporter.verify();
      return { connected: true, message: 'SMTP connection verified' };
    } catch (err: any) {
      return { connected: false, message: err.message };
    }
  }
}

export const emailService = new EmailService();

