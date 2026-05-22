import https from 'https';
import { query } from '../config/database';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private apiKey: string | null = null;
  private fromAddress: string;

  constructor() {
    this.fromAddress = process.env.SMTP_FROM || process.env.RESEND_FROM || 'onboarding@resend.dev';
    this.apiKey = process.env.RESEND_API_KEY || null;
    if (this.apiKey) {
      console.log('[EmailService] Resend API initialised');
    } else {
      console.warn('[EmailService] No RESEND_API_KEY — demo mode');
    }
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.apiKey) {
      console.log('[EmailService] Demo mode — would send to:', options.to);
      return { success: true, messageId: `demo-${Date.now()}` };
    }

    return new Promise((resolve) => {
      const payload = JSON.stringify({
        from: this.fromAddress,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
      });

      const req = https.request({
        hostname: 'api.resend.com',
        port: 443,
        path: '/emails',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            console.log('[EmailService] Sent via Resend:', parsed.id, '->', options.to);
            resolve({ success: true, messageId: parsed.id });
          } else {
            console.error('[EmailService] Resend error:', res.statusCode, data);
            resolve({ success: false, error: `HTTP ${res.statusCode}: ${data}` });
          }
        });
      });

      req.on('error', (err) => {
        console.error('[EmailService] Request failed:', err.message);
        resolve({ success: false, error: err.message });
      });

      req.write(payload);
      req.end();
    });
  }

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    if (!this.apiKey) return { connected: false, message: 'RESEND_API_KEY not configured' };
    return { connected: true, message: 'Resend API configured' };
  }
}

export const emailService = new EmailService();
