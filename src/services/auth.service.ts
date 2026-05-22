import jwt       from 'jsonwebtoken';
import crypto    from 'crypto';
import { UserService }  from './user.service';
import { emailService } from './email.service';
import { unauthorized, badRequest } from '../middleware/errorHandler';
import { query } from '../config/database';

export interface LoginDto {
  email:    string;
  password: string;
}

export interface AuthResponse {
  user: {
    userId:    number;
    tenantId:  number;
    email:     string;
    firstName: string;
    lastName:  string;
    role:      string;
  };
  token:        string;
  refreshToken: string;
  expiresIn:    string;
}

export class AuthService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(data: LoginDto): Promise<AuthResponse> {
    const user = await this.userService.findByEmail(data.email);

    const isValid = await this.userService.verifyPassword(data.email, data.password);
    if (!isValid) throw unauthorized('Invalid credentials');

    if (user.status !== 'active') throw unauthorized('Account is not active');

    await this.userService.updateLastLogin(user.user_id);

    const userWithRole = await this.userService.getUserWithPermissions(
      user.user_id,
      user.tenant_id,
    );

    const { token, refreshToken } = this.generateTokenPair(user);

    return {
      user: {
        userId:    user.user_id,
        tenantId:  user.tenant_id,
        email:     user.email,
        firstName: user.first_name,
        lastName:  user.last_name,
        role:      userWithRole.role_name,
      },
      token,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    };
  }

  // ── Token helpers ─────────────────────────────────────────────────────────
  private generateTokenPair(user: any): { token: string; refreshToken: string } {
    const secret        = process.env.JWT_SECRET        || 'default-secret';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || secret + '_refresh';
    const expiresIn     = process.env.JWT_EXPIRES_IN    || '24h';

    // @ts-ignore
    const token = jwt.sign(
      { userId: user.user_id, tenantId: user.tenant_id, roleId: user.role_id, email: user.email },
      secret,
      { expiresIn },
    );

    // @ts-ignore
    const refreshToken = jwt.sign(
      { userId: user.user_id, tenantId: user.tenant_id, type: 'refresh' },
      refreshSecret,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
    );

    return { token, refreshToken };
  }

  // ── Verify access token ───────────────────────────────────────────────────
  verifyToken(token: string): any {
    try {
      const secret = process.env.JWT_SECRET || 'default-secret';
      return jwt.verify(token, secret);
    } catch {
      throw unauthorized('Invalid token');
    }
  }

  // ── Refresh token ─────────────────────────────────────────────────────────
  async refreshToken(oldToken: string): Promise<AuthResponse> {
    let decoded: any;
    try {
      const refreshSecret = process.env.JWT_REFRESH_SECRET ||
        (process.env.JWT_SECRET || 'default-secret') + '_refresh';
      decoded = jwt.verify(oldToken, refreshSecret);
    } catch {
      // Fall back to verifying as access token (backward compat)
      decoded = this.verifyToken(oldToken);
    }

    const user = await this.userService.findById(decoded.userId, decoded.tenantId);
    const { token, refreshToken } = this.generateTokenPair(user);

    return {
      user: {
        userId:    user.user_id,
        tenantId:  user.tenant_id,
        email:     user.email,
        firstName: user.first_name,
        lastName:  user.last_name,
        role:      '',
      },
      token,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    };
  }

  // ── Forgot password ───────────────────────────────────────────────────────
  async forgotPassword(email: string): Promise<{ message: string }> {
    // Always return success to prevent email enumeration attacks
    const SUCCESS_MSG = 'If an account exists with that email, a reset link has been sent.';

    try {
      const user = await this.userService.findByEmail(email);
      if (!user) return { message: SUCCESS_MSG };

      // Generate secure random token
      const rawToken  = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Invalidate any existing tokens for this user
      await query(
        `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
        [user.user_id],
      ).catch(() => {}); // non-fatal if column doesn't exist

      // Store hashed token
      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [user.user_id, tokenHash, expiresAt],
      );

      // Send email
      const frontendUrl = process.env.FRONTEND_URL || 'https://finance-frontend-2l6b.onrender.com';
      const resetLink   = `${frontendUrl}/reset-password?token=${rawToken}`;

      const html = `
<!DOCTYPE html><html>
<head><meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
  .wrap { max-width: 560px; margin: 0 auto; background: #fff; }
  .hdr  { background: #0f172a; padding: 24px 32px; }
  .hdr h1 { color: #3b82f6; margin: 0; font-size: 20px; }
  .hdr p  { color: #94a3b8; margin: 6px 0 0; font-size: 13px; }
  .body { padding: 32px; }
  .body p { color: #475569; font-size: 14px; line-height: 1.6; }
  .btn  { display: inline-block; background: #3b82f6; color: #fff; padding: 12px 28px;
          border-radius: 7px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 20px 0; }
  .note { font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; }
  .ftr  { background: #f1f5f9; padding: 16px 32px; font-size: 11px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr"><h1>Finance Solution Suite</h1><p>Password Reset Request</p></div>
  <div class="body">
    <p>Hi ${user.first_name || 'there'},</p>
    <p>We received a request to reset your password for your Finance Suite account (<strong>${user.email}</strong>).</p>
    <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
    <a class="btn" href="${resetLink}">Reset My Password →</a>
    <div class="note">
      <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
      <p>Or copy this link into your browser:<br/><small>${resetLink}</small></p>
    </div>
  </div>
  <div class="ftr">Finance Solution Suite &nbsp;·&nbsp; This is an automated message</div>
</div>
</body></html>`;

      await emailService.send({
        to:      user.email,
        subject: 'Reset your Finance Suite password',
        html,
      });

      console.log(`[Auth] Password reset email sent to ${user.email}`);
    } catch (err: any) {
      // Log but don't expose errors — always return success message
      console.error('[Auth] forgotPassword error:', err.message);
    }

    return { message: SUCCESS_MSG };
  }

  // ── Reset password ────────────────────────────────────────────────────────
  async resetPassword(rawToken: string, newPassword: string): Promise<{ message: string }> {
    if (!rawToken || !newPassword) {
      throw badRequest('Token and new password are required');
    }

    if (newPassword.length < 8) {
      throw badRequest('Password must be at least 8 characters');
    }

    // Hash the incoming token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Look up token
    const tokenResult = await query(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = $1 AND expires_at > NOW()
         AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [tokenHash],
    );

    if (!tokenResult.rows.length) {
      throw badRequest('This reset link is invalid or has expired. Please request a new one.');
    }

    const resetRecord = tokenResult.rows[0];

    // Get user
    const user = await this.userService.findById(resetRecord.user_id, null);
    if (!user) throw badRequest('User not found');

    // Hash new password using bcrypt (via UserService or directly)
    const bcrypt = require('bcryptjs');
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const hashedPassword = await bcrypt.hash(newPassword, rounds);

    // Update password
    await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2`,
      [hashedPassword, user.user_id],
    );

    // Mark token as used
    await query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1`,
      [tokenHash],
    );

    // Send confirmation email
    await emailService.send({
      to:      user.email,
      subject: 'Your Finance Suite password has been changed',
      html: `<p>Hi ${user.first_name || 'there'},</p>
             <p>Your password was successfully changed. If you didn't do this, contact support immediately.</p>`,
    }).catch(() => {}); // non-fatal

    console.log(`[Auth] Password reset successful for ${user.email}`);
    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }
}

