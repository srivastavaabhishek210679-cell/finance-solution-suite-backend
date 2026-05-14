import express, { Request, Response } from 'express';
import pool from '../config/database';
import bcrypt from 'bcrypt';

const router = express.Router();

// Database setup endpoint
router.get('/run', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Starting database setup...');

    // SQL embedded directly (no file reading!)
    const schemaSQL = `
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id SERIAL PRIMARY KEY,
    tenant_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    plan VARCHAR(50) DEFAULT 'free',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(tenant_id),
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(tenant_id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_role_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    role_id INTEGER REFERENCES roles(role_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tenants (tenant_name, domain, plan, status)
VALUES ('Demo Company', 'demo.deemona.com', 'enterprise', 'active')
ON CONFLICT (domain) DO NOTHING;

INSERT INTO roles (tenant_id, role_name, description, is_system)
VALUES 
    (1, 'Admin', 'Full system access', true),
    (1, 'User', 'Standard user access', true);

INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status)
VALUES (
    1,
    'alice.smith@demo.com',
    '$2b$10$rKvW8Z9mHxQ7LZ7xJ3vZZeYhX5yN6pK8QxW4tR9sE1wK2fH3vL4nO',
    'Alice',
    'Smith',
    'active'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM users u, roles r
WHERE u.email = 'alice.smith@demo.com' AND r.role_name = 'Admin';
`;

    console.log('📦 Executing SQL statements...');

    // Split and execute
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < statements.length; i++) {
      try {
        if (statements[i].trim().length === 0) continue;
        
        await pool.query(statements[i]);
        successCount++;
        console.log(`✅ Statement ${i + 1} executed`);
      } catch (error: any) {
        errorCount++;
        errors.push(`Statement ${i + 1}: ${error.message.substring(0, 100)}`);
        console.error(`⚠️ Skipped statement ${i + 1}:`, error.message);
      }
    }

    console.log(`✅ Setup complete! Success: ${successCount}, Errors: ${errorCount}`);

    // Verify tables
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);

    res.json({
      success: true,
      message: 'Database setup completed!',
      tables: result.rows.map(r => r.tablename),
      totalTables: result.rows.length,
      totalStatements: statements.length,
      successfulStatements: successCount,
      failedStatements: errorCount,
      sampleErrors: errors.slice(0, 5)
    });

  } catch (error: any) {
    console.error('❌ Database setup failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Create demo user with proper password hash
router.get('/create-user', async (req: Request, res: Response) => {
  try {
    console.log('Creating demo user with proper password...');
    
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Delete existing user and their roles
    await pool.query(`
      DELETE FROM user_roles 
      WHERE user_id IN (SELECT user_id FROM users WHERE email = 'alice.smith@demo.com')
    `);
    
    await pool.query(`DELETE FROM users WHERE email = 'alice.smith@demo.com'`);

    // Insert user with correct hash
    const userResult = await pool.query(`
      INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, status)
      VALUES (1, 'alice.smith@demo.com', $1, 'Alice', 'Smith', 'active')
      RETURNING user_id
    `, [hashedPassword]);

    const userId = userResult.rows[0].user_id;

    // Assign admin role
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, 1)
    `, [userId]);

    res.json({
      success: true,
      message: 'Demo user created with proper password hash!',
      credentials: {
        email: 'alice.smith@demo.com',
        password: 'password123'
      }
    });

  } catch (error: any) {
    console.error('Failed to create user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add missing columns to users table
router.get('/fix-schema', async (req: Request, res: Response) => {
  try {
    console.log('Adding missing columns to users table...');

    // Add last_login column if missing
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
    `);

    res.json({
      success: true,
      message: 'Schema updated successfully! Added last_login column.'
    });

  } catch (error: any) {
    console.error('Failed to update schema:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;