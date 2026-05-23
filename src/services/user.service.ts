import { BaseService } from './base.service';
import { query } from '../config/database';
import bcrypt from 'bcrypt';
import { conflict, notFound } from '../middleware/errorHandler';

export interface User {
  user_id:       number;
  tenant_id:     number;
  first_name:    string;
  last_name:     string;
  email:         string;
  phone_number?: string;
  password_hash: string;
  role_id:       number;
  status:        'active' | 'inactive' | 'suspended';
  last_login?:   Date;
  created_at:    Date;
  updated_at:    Date;
}

export interface CreateUserDto {
  tenant_id:     number;
  first_name:    string;
  last_name:     string;
  email:         string;
  phone_number?: string;
  password:      string;
  role_id:       number;
}

export interface RegisterWithCompanyDto {
  company_name:  string;
  first_name:    string;
  last_name:     string;
  email:         string;
  password:      string;
  phone_number?: string;
}

export class UserService extends BaseService<User> {
  constructor() {
    super('users', 'user_id');
  }

  // ── Create user (legacy — requires existing tenant_id) ────────────────────
  async createUser(data: CreateUserDto): Promise<Omit<User, 'password_hash'>> {
    const existing = await query('SELECT user_id FROM users WHERE email = $1', [data.email]);
    if (existing.rows.length > 0) throw conflict('Email already exists');

    const saltRounds   = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const password_hash = await bcrypt.hash(data.password, saltRounds);

    const { password, ...userData } = data;
    const result = await query(
      `INSERT INTO users (tenant_id, first_name, last_name, email, phone_number, password_hash, role_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING user_id, tenant_id, first_name, last_name, email, phone_number, role_id, status, created_at, updated_at`,
      [userData.tenant_id, userData.first_name, userData.last_name,
       userData.email, userData.phone_number, password_hash, userData.role_id],
    );
    return result.rows[0];
  }

  // ── Create tenant + user together (new self-service registration) ─────────
  async createUserWithTenant(data: RegisterWithCompanyDto): Promise<{
    user:      Omit<User, 'password_hash'>;
    tenant_id: number;
    tenant_name: string;
  }> {
    // Check email uniqueness first
    const existing = await query('SELECT user_id FROM users WHERE email = $1', [data.email]);
    if (existing.rows.length > 0) throw conflict('Email already exists');

    // 1. Create the tenant
    const tenantResult = await query(
      `INSERT INTO tenants (tenant_name, plan, status, created_at, updated_at)
       VALUES ($1, 'starter', 'active', NOW(), NOW())
       RETURNING tenant_id, tenant_name`,
      [data.company_name],
    );
    const { tenant_id, tenant_name } = tenantResult.rows[0];

    // 2. Hash password
    const saltRounds    = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const password_hash = await bcrypt.hash(data.password, saltRounds);

    // 3. Create user as tenant admin (role_id = 1)
    const userResult = await query(
      `INSERT INTO users (tenant_id, first_name, last_name, email, phone_number, password_hash, role_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 1, 'active')
       RETURNING user_id, tenant_id, first_name, last_name, email, phone_number, role_id, status, created_at, updated_at`,
      [tenant_id, data.first_name, data.last_name, data.email, data.phone_number || null, password_hash],
    );

    console.log(`[Auth] New tenant created: "${tenant_name}" (ID: ${tenant_id}), admin: ${data.email}`);

    return { user: userResult.rows[0], tenant_id, tenant_name };
  }

  // ── Find by email ─────────────────────────────────────────────────────────
  async findByEmail(email: string): Promise<User> {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) throw notFound('User not found');
    return result.rows[0] as User;
  }

  // ── Find by ID ────────────────────────────────────────────────────────────
  async findById(userId: number, tenantId: number | null): Promise<User> {
    const result = tenantId
      ? await query('SELECT * FROM users WHERE user_id = $1 AND tenant_id = $2', [userId, tenantId])
      : await query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (!result.rows.length) throw notFound('User not found');
    return result.rows[0] as User;
  }

  // ── Verify password ───────────────────────────────────────────────────────
  async verifyPassword(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return bcrypt.compare(password, user.password_hash);
  }

  // ── Update password ───────────────────────────────────────────────────────
  async updatePassword(userId: number, newPassword: string): Promise<void> {
    const saltRounds    = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const password_hash = await bcrypt.hash(newPassword, saltRounds);
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
      [password_hash, userId],
    );
  }

  // ── Get user with role + permissions ──────────────────────────────────────
  async getUserWithPermissions(userId: number, tenantId: number) {
    const result = await query(
      `SELECT
         u.user_id, u.tenant_id, u.first_name, u.last_name,
         u.email, u.phone_number, u.status, u.last_login,
         r.role_id, r.role_name,
         json_agg(DISTINCT p.perm_code) AS permissions
       FROM users u
       LEFT JOIN roles r          ON u.role_id = r.role_id
       LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
       LEFT JOIN permissions p    ON rp.perm_id = p.perm_id
       WHERE u.user_id = $1 AND u.tenant_id = $2
       GROUP BY u.user_id, u.tenant_id, u.first_name, u.last_name,
                u.email, u.phone_number, u.status, u.last_login,
                r.role_id, r.role_name`,
      [userId, tenantId],
    );
    if (!result.rows.length) throw notFound('User not found');
    return result.rows[0];
  }

  // ── Update last login ─────────────────────────────────────────────────────
  async updateLastLogin(userId: number): Promise<void> {
    await query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [userId]);
  }
}
