import { BaseService } from './base.service';
import { query } from '../config/database';
import bcrypt from 'bcrypt';
import { conflict, notFound } from '../middleware/errorHandler';

export interface User {
  user_id: number;
  tenant_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  password_hash: string;
  role_id: number;
  status: 'active' | 'inactive' | 'suspended';
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserDto {
  tenant_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  password: string;
  role_id: number;
}

export class UserService extends BaseService<User> {
  constructor() {
    super('users', 'user_id');
  }

  // Create user with password hashing
  async createUser(data: CreateUserDto): Promise<Omit<User, 'password_hash'>> {
    // Check if email already exists
    const existing = await query(
      'SELECT user_id FROM users WHERE email = $1',
      [data.email]
    );

    if (existing.rows.length > 0) {
      throw conflict('Email already exists');
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const password_hash = await bcrypt.hash(data.password, saltRounds);

    // Create user
    const { password, ...userData } = data;
    const result = await query(
      `INSERT INTO users (tenant_id, first_name, last_name, email, phone_number, password_hash, role_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING user_id, tenant_id, first_name, last_name, email, phone_number, role_id, status, created_at, updated_at`,
      [
        userData.tenant_id,
        userData.first_name,
        userData.last_name,
        userData.email,
        userData.phone_number,
        password_hash,
        userData.role_id,
      ]
    );

    return result.rows[0];
  }

  // Get user by email
  async findByEmail(email: string): Promise<User> {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw notFound('User not found');
    }

    return result.rows[0] as User;
  }

  // Verify password
  async verifyPassword(email: string, password: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return await bcrypt.compare(password, user.password_hash);
  }

  // Update password
  async updatePassword(userId: number, newPassword: string): Promise<void> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
      [password_hash, userId]
    );
  }

  // Get user with role and permissions
  async getUserWithPermissions(userId: number, tenantId: number) {
    const result = await query(
      `SELECT 
        u.user_id,
        u.tenant_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone_number,
        u.status,
        u.last_login,
        r.role_id,
        r.role_name,
        json_agg(DISTINCT p.perm_code) as permissions
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
       LEFT JOIN permissions p ON rp.perm_id = p.perm_id
       WHERE u.user_id = $1 AND u.tenant_id = $2
       GROUP BY u.user_id, u.tenant_id, u.first_name, u.last_name, 
                u.email, u.phone_number, u.status, u.last_login,
                r.role_id, r.role_name`,
      [userId, tenantId]
    );

    if (result.rows.length === 0) {
      throw notFound('User not found');
    }

    return result.rows[0];
  }

  // Update last login
  async updateLastLogin(userId: number): Promise<void> {
    await query(
      'UPDATE users SET last_login = NOW() WHERE user_id = $1',
      [userId]
    );
  }
}
