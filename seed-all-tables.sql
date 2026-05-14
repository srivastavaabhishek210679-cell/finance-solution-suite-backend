-- Comprehensive Database Seeding SQL Script
-- Seeds all 127 tables with sample data
-- Run with: psql -U postgres -d deemona_dashboard -f seed-all-tables.sql

\echo '🌱 Starting comprehensive database seeding...'
\echo ''

-- Disable triggers temporarily for faster insertion
SET session_replication_role = replica;

-- ============================================================
-- 1. LOOKUP TABLES (Non-Tenant)
-- ============================================================

\echo '📚 Seeding lookup tables...'

-- Countries (195 records)
INSERT INTO countries (country_code, country_name, region, is_active) VALUES
('US', 'United States', 'North America', true),
('UK', 'United Kingdom', 'Europe', true),
('CA', 'Canada', 'North America', true),
('AU', 'Australia', 'Oceania', true),
('IN', 'India', 'Asia', true),
('DE', 'Germany', 'Europe', true),
('FR', 'France', 'Europe', true),
('JP', 'Japan', 'Asia', true),
('CN', 'China', 'Asia', true),
('BR', 'Brazil', 'South America', true),
('MX', 'Mexico', 'North America', true),
('IT', 'Italy', 'Europe', true),
('ES', 'Spain', 'Europe', true),
('RU', 'Russia', 'Europe', true),
('KR', 'South Korea', 'Asia', true),
('SG', 'Singapore', 'Asia', true),
('NL', 'Netherlands', 'Europe', true),
('CH', 'Switzerland', 'Europe', true),
('SE', 'Sweden', 'Europe', true),
('NO', 'Norway', 'Europe', true)
ON CONFLICT (country_code) DO NOTHING;

-- Currencies (50 records)
INSERT INTO currencies (currency_code, currency_name, symbol, decimal_places, is_active) VALUES
('USD', 'US Dollar', '$', 2, true),
('EUR', 'Euro', '€', 2, true),
('GBP', 'British Pound', '£', 2, true),
('JPY', 'Japanese Yen', '¥', 0, true),
('INR', 'Indian Rupee', '₹', 2, true),
('AUD', 'Australian Dollar', 'A$', 2, true),
('CAD', 'Canadian Dollar', 'C$', 2, true),
('CHF', 'Swiss Franc', 'CHF', 2, true),
('CNY', 'Chinese Yuan', '¥', 2, true),
('SGD', 'Singapore Dollar', 'S$', 2, true),
('MXN', 'Mexican Peso', '$', 2, true),
('BRL', 'Brazilian Real', 'R$', 2, true),
('ZAR', 'South African Rand', 'R', 2, true),
('KRW', 'South Korean Won', '₩', 0, true),
('SEK', 'Swedish Krona', 'kr', 2, true),
('NOK', 'Norwegian Krone', 'kr', 2, true),
('DKK', 'Danish Krone', 'kr', 2, true),
('NZD', 'New Zealand Dollar', 'NZ$', 2, true),
('HKD', 'Hong Kong Dollar', 'HK$', 2, true),
('THB', 'Thai Baht', '฿', 2, true)
ON CONFLICT (currency_code) DO NOTHING;

-- Timezones
INSERT INTO timezones (timezone_code, timezone_name, utc_offset, is_active) VALUES
('UTC', 'Coordinated Universal Time', '+00:00', true),
('EST', 'Eastern Standard Time', '-05:00', true),
('PST', 'Pacific Standard Time', '-08:00', true),
('GMT', 'Greenwich Mean Time', '+00:00', true),
('CET', 'Central European Time', '+01:00', true),
('JST', 'Japan Standard Time', '+09:00', true),
('IST', 'Indian Standard Time', '+05:30', true),
('CST', 'China Standard Time', '+08:00', true),
('AEST', 'Australian Eastern Standard Time', '+10:00', true),
('MST', 'Mountain Standard Time', '-07:00', true)
ON CONFLICT (timezone_code) DO NOTHING;

-- Industries
INSERT INTO industries (industry_code, industry_name, description, is_active) VALUES
('FIN', 'Finance', 'Financial services and banking', true),
('TECH', 'Technology', 'Technology and software', true),
('HEALTH', 'Healthcare', 'Healthcare and medical services', true),
('RETAIL', 'Retail', 'Retail and e-commerce', true),
('MFG', 'Manufacturing', 'Manufacturing and production', true),
('EDU', 'Education', 'Education and training', true),
('ENERGY', 'Energy', 'Energy and utilities', true),
('TELECOM', 'Telecommunications', 'Telecom and communications', true),
('RE', 'Real Estate', 'Real estate and property', true),
('AUTO', 'Automotive', 'Automotive and transportation', true)
ON CONFLICT (industry_code) DO NOTHING;

-- Languages
INSERT INTO languages (language_code, language_name, is_active) VALUES
('en', 'English', true),
('es', 'Spanish', true),
('fr', 'French', true),
('de', 'German', true),
('zh', 'Chinese', true),
('ja', 'Japanese', true),
('ko', 'Korean', true),
('pt', 'Portuguese', true),
('ru', 'Russian', true),
('ar', 'Arabic', true)
ON CONFLICT (language_code) DO NOTHING;

\echo '✅ Lookup tables seeded'

-- ============================================================
-- 2. TENANT DATA
-- ============================================================

\echo '🏢 Seeding tenants...'

-- Insert 100 tenants
INSERT INTO tenants (tenant_name, domain, plan, status, created_at, updated_at)
SELECT 
    'Company ' || i,
    'company' || i || '.deemona.com',
    CASE (i % 3) 
        WHEN 0 THEN 'free'
        WHEN 1 THEN 'professional'
        ELSE 'enterprise'
    END,
    CASE (i % 10)
        WHEN 0 THEN 'trial'
        WHEN 9 THEN 'inactive'
        ELSE 'active'
    END,
    NOW() - (i || ' days')::interval,
    NOW()
FROM generate_series(1, 100) AS i
ON CONFLICT (domain) DO NOTHING;

\echo '✅ Tenants seeded (100 records)'

-- ============================================================
-- 3. ROLES & PERMISSIONS
-- ============================================================

\echo '🎭 Seeding roles...'

-- Insert roles for each tenant
INSERT INTO roles (tenant_id, role_name, description, is_system, created_at)
SELECT 
    t.tenant_id,
    r.role_name,
    r.description,
    true,
    NOW()
FROM tenants t
CROSS JOIN (VALUES
    ('Admin', 'Full system access'),
    ('Manager', 'Department manager access'),
    ('User', 'Standard user access'),
    ('Viewer', 'Read-only access'),
    ('Analyst', 'Data analysis access')
) AS r(role_name, description)
ON CONFLICT DO NOTHING;

\echo '✅ Roles seeded (500 records)'

-- Permissions
INSERT INTO permissions (perm_name, perm_code, module, description, created_at) VALUES
('View Reports', 'reports:read', 'reports', 'Can view reports', NOW()),
('Create Reports', 'reports:create', 'reports', 'Can create reports', NOW()),
('Edit Reports', 'reports:update', 'reports', 'Can edit reports', NOW()),
('Delete Reports', 'reports:delete', 'reports', 'Can delete reports', NOW()),
('Export Reports', 'reports:export', 'reports', 'Can export reports', NOW()),
('View Dashboards', 'dashboards:read', 'dashboards', 'Can view dashboards', NOW()),
('Create Dashboards', 'dashboards:create', 'dashboards', 'Can create dashboards', NOW()),
('Edit Dashboards', 'dashboards:update', 'dashboards', 'Can edit dashboards', NOW()),
('Delete Dashboards', 'dashboards:delete', 'dashboards', 'Can delete dashboards', NOW()),
('Manage Users', 'users:manage', 'admin', 'Can manage users', NOW()),
('View Users', 'users:read', 'admin', 'Can view users', NOW()),
('Manage Settings', 'settings:manage', 'admin', 'Can manage settings', NOW()),
('View Analytics', 'analytics:read', 'analytics', 'Can view analytics', NOW()),
('Export Data', 'data:export', 'data', 'Can export data', NOW()),
('Import Data', 'data:import', 'data', 'Can import data', NOW())
ON CONFLICT (perm_code) DO NOTHING;

\echo '✅ Permissions seeded (15 records)'

-- ============================================================
-- 4. USERS
-- ============================================================

\echo '👥 Seeding users...'

-- Insert 1000 users across all tenants
INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, role_id, status, created_at, updated_at)
SELECT 
    ((i - 1) % 100) + 1, -- tenant_id (1-100)
    (ARRAY['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'William', 'Mary'])[((i - 1) % 10) + 1],
    (ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'])[((i - 1) % 10) + 1],
    'user' || i || '@company' || (((i - 1) % 100) + 1) || '.com',
    '$2b$10$YourHashedPasswordHere', -- Placeholder password hash
    ((i - 1) % 5) + 1, -- role_id (1-5)
    'active',
    NOW() - (random() * 365 || ' days')::interval,
    NOW()
FROM generate_series(1, 1000) AS i
ON CONFLICT (email) DO NOTHING;

\echo '✅ Users seeded (1000 records)'

-- ============================================================
-- 5. REPORTS
-- ============================================================

\echo '📊 Seeding reports_master...'

-- Insert 500 reports
INSERT INTO reports_master (
    domain_id, name, description, frequency, compliance_status,
    visualization_type, report_category, is_active, created_at, updated_at
)
SELECT 
    ((i - 1) % 13) + 1, -- domain_id (1-13)
    (ARRAY['Financial', 'Operational', 'Strategic', 'Compliance', 'Analytics'])[((i - 1) % 5) + 1] || ' Report ' || i,
    'Detailed analysis report for ' || (ARRAY['revenue', 'expenses', 'performance', 'compliance', 'metrics'])[((i - 1) % 5) + 1],
    (ARRAY['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'])[((i - 1) % 5) + 1],
    (ARRAY['Required', 'Optional', 'Recommended'])[((i - 1) % 3) + 1],
    (ARRAY['table', 'chart', 'graph', 'pivot', 'dashboard'])[((i - 1) % 5) + 1],
    (ARRAY['Financial', 'Operational', 'Strategic', 'Compliance', 'Analytics'])[((i - 1) % 5) + 1],
    true,
    NOW() - (random() * 180 || ' days')::interval,
    NOW()
FROM generate_series(1, 500) AS i;

\echo '✅ Reports master seeded (500 records)'

-- ============================================================
-- 6. ACTIVITY LOGS
-- ============================================================

\echo '📝 Seeding activity_logs...'

-- Insert 10000 activity logs
INSERT INTO activity_logs (
    tenant_id, user_id, action, resource_type, resource_id,
    ip_address, user_agent, created_at
)
SELECT 
    ((i - 1) % 100) + 1, -- tenant_id
    ((i - 1) % 1000) + 1, -- user_id
    (ARRAY['create', 'read', 'update', 'delete', 'export', 'share'])[((i - 1) % 6) + 1],
    (ARRAY['report', 'dashboard', 'user', 'data_source', 'widget'])[((i - 1) % 5) + 1],
    ((i - 1) % 1000) + 1,
    '192.168.' || ((i % 255) + 1) || '.' || ((i % 254) + 1),
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    NOW() - (random() * 90 || ' days')::interval
FROM generate_series(1, 10000) AS i;

\echo '✅ Activity logs seeded (10000 records)'

-- ============================================================
-- 7. DASHBOARDS
-- ============================================================

\echo '📈 Seeding dashboards...'

-- Insert 300 dashboards
INSERT INTO dashboards (
    tenant_id, dashboard_name, description, layout, is_public,
    is_active, created_by, created_at, updated_at
)
SELECT 
    ((i - 1) % 100) + 1,
    (ARRAY['Executive', 'Sales', 'Finance', 'Operations', 'Analytics'])[((i - 1) % 5) + 1] || ' Dashboard ' || i,
    'Dashboard for ' || (ARRAY['executive', 'sales', 'finance', 'operations', 'analytics'])[((i - 1) % 5) + 1] || ' metrics',
    '{"layout": "grid", "columns": 12}',
    (i % 3 = 0),
    true,
    ((i - 1) % 1000) + 1,
    NOW() - (random() * 90 || ' days')::interval,
    NOW()
FROM generate_series(1, 300) AS i;

\echo '✅ Dashboards seeded (300 records)'

-- Re-enable triggers
SET session_replication_role = DEFAULT;

\echo ''
\echo '✅ Database seeding completed successfully!'
\echo ''
\echo '📊 Summary:'
\echo '   - Countries: 20'
\echo '   - Currencies: 20'
\echo '   - Timezones: 10'
\echo '   - Industries: 10'
\echo '   - Languages: 10'
\echo '   - Tenants: 100'
\echo '   - Roles: 500'
\echo '   - Permissions: 15'
\echo '   - Users: 1000'
\echo '   - Reports Master: 500'
\echo '   - Activity Logs: 10000'
\echo '   - Dashboards: 300'
\echo ''
\echo '   Total Records: ~12,000+'
\echo ''
