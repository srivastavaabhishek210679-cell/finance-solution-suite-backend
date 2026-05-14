-- Essential tables for Finance Solution Suite

-- 1. Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id SERIAL PRIMARY KEY,
    tenant_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    plan VARCHAR(50) DEFAULT 'free',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Roles table
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(tenant_id),
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Users table
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

-- 4. User Roles table
CREATE TABLE IF NOT EXISTS user_roles (
    user_role_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    role_id INTEGER REFERENCES roles(role_id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert demo tenant
INSERT INTO tenants (tenant_name, domain, plan, status)
VALUES ('Demo Company', 'demo.deemona.com', 'enterprise', 'active')
ON CONFLICT (domain) DO NOTHING;

-- Insert roles
INSERT INTO roles (tenant_id, role_name, description, is_system)
VALUES 
    (1, 'Admin', 'Full system access', true),
    (1, 'User', 'Standard user access', true)
ON CONFLICT DO NOTHING;

-- Insert demo user (password: password123)
-- Password hash for 'password123' using bcrypt
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

-- Assign admin role to demo user
INSERT INTO user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM users u, roles r
WHERE u.email = 'alice.smith@demo.com' AND r.role_name = 'Admin'
ON CONFLICT DO NOTHING;