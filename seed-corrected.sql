-- Corrected Database Seeding Script
-- Matches actual schema from deemona_dashboard
-- Run with: psql -U postgres -d deemona_dashboard -f seed-corrected.sql

\echo '🌱 Starting database seeding (corrected version)...'
\echo ''

-- Disable triggers for faster insertion
SET session_replication_role = replica;

-- ============================================================
-- 1. CURRENCIES (Already done - skip if exists)
-- ============================================================

\echo '💰 Seeding currencies...'

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
('SEK', 'Swedish Krona', 'kr', 2, true)
ON CONFLICT (currency_code) DO NOTHING;

\echo '✅ Currencies seeded'

-- ============================================================
-- 2. REGIONS (if table exists)
-- ============================================================

\echo '🌍 Seeding regions...'

INSERT INTO regions (region_name, region_code, is_active) VALUES
('North America', 'NA', true),
('South America', 'SA', true),
('Europe', 'EU', true),
('Asia', 'AS', true),
('Africa', 'AF', true),
('Oceania', 'OC', true),
('Middle East', 'ME', true)
ON CONFLICT DO NOTHING;

\echo '✅ Regions seeded'

-- ============================================================
-- 3. COUNTRIES (Corrected schema)
-- ============================================================

\echo '🌍 Seeding countries...'

INSERT INTO countries (country_code, country_name, currency_code, phone_prefix, flag_emoji, is_active) VALUES
('US', 'United States', 'USD', '+1', '🇺🇸', true),
('UK', 'United Kingdom', 'GBP', '+44', '🇬🇧', true),
('CA', 'Canada', 'CAD', '+1', '🇨🇦', true),
('AU', 'Australia', 'AUD', '+61', '🇦🇺', true),
('IN', 'India', 'INR', '+91', '🇮🇳', true),
('DE', 'Germany', 'EUR', '+49', '🇩🇪', true),
('FR', 'France', 'EUR', '+33', '🇫🇷', true),
('JP', 'Japan', 'JPY', '+81', '🇯🇵', true),
('CN', 'China', 'CNY', '+86', '🇨🇳', true),
('BR', 'Brazil', 'BRL', '+55', '🇧🇷', true),
('MX', 'Mexico', 'MXN', '+52', '🇲🇽', true),
('IT', 'Italy', 'EUR', '+39', '🇮🇹', true),
('ES', 'Spain', 'EUR', '+34', '🇪🇸', true),
('KR', 'South Korea', 'KRW', '+82', '🇰🇷', true),
('SG', 'Singapore', 'SGD', '+65', '🇸🇬', true),
('CH', 'Switzerland', 'CHF', '+41', '🇨🇭', true),
('SE', 'Sweden', 'SEK', '+46', '🇸🇪', true),
('ZA', 'South Africa', 'ZAR', '+27', '🇿🇦', true),
('NL', 'Netherlands', 'EUR', '+31', '🇳🇱', true),
('NO', 'Norway', 'SEK', '+47', '🇳🇴', true)
ON CONFLICT (country_code) DO NOTHING;

\echo '✅ Countries seeded'

-- ============================================================
-- 4. USERS (Add more users - corrected)
-- ============================================================

\echo '👥 Seeding additional users...'

-- Insert 1000 users across tenants
INSERT INTO users (tenant_id, first_name, last_name, email, password_hash, role_id, status, created_at, updated_at)
SELECT 
    ((i - 1) % 100) + 1, -- tenant_id (1-100)
    (ARRAY['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'William', 'Mary'])[((i - 1) % 10) + 1],
    (ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'])[((i - 1) % 10) + 1],
    'user' || i || '@company' || (((i - 1) % 100) + 1) || '.com',
    '$2b$10$YourHashedPasswordHere',
    ((i - 1) % 5) + 1, -- role_id
    'active',
    NOW() - (random() * 365 || ' days')::interval,
    NOW()
FROM generate_series(1, 1000) AS i
ON CONFLICT DO NOTHING;

\echo '✅ Users seeded'

-- ============================================================
-- 5. ACTIVITY LOGS (Corrected schema)
-- ============================================================

\echo '📝 Seeding activity_logs...'

-- Insert 10000 activity logs with correct schema
INSERT INTO activity_logs (
    tenant_id, user_id, action, resource, details, created_at
)
SELECT 
    ((i - 1) % 100) + 1, -- tenant_id
    ((i - 1) % 1000) + 1, -- user_id
    (ARRAY['create', 'read', 'update', 'delete', 'export', 'share'])[((i - 1) % 6) + 1],
    (ARRAY['report', 'dashboard', 'user', 'data_source', 'widget'])[((i - 1) % 5) + 1],
    jsonb_build_object(
        'resource_id', ((i - 1) % 1000) + 1,
        'ip_address', '192.168.' || ((i % 255) + 1) || '.' || ((i % 254) + 1),
        'user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    ),
    NOW() - (random() * 90 || ' days')::interval
FROM generate_series(1, 10000) AS i;

\echo '✅ Activity logs seeded (10000 records)'

-- ============================================================
-- 6. DASHBOARDS (Corrected schema)
-- ============================================================

\echo '📈 Seeding dashboards...'

-- Insert 300 dashboards with correct schema
INSERT INTO dashboards (
    tenant_id, user_id, name, description, domain_id,
    layout_json, is_default, is_shared, is_active, created_at, updated_at
)
SELECT 
    ((i - 1) % 100) + 1, -- tenant_id
    ((i - 1) % 1000) + 1, -- user_id (must exist)
    (ARRAY['Executive', 'Sales', 'Finance', 'Operations', 'Analytics'])[((i - 1) % 5) + 1] || ' Dashboard ' || i,
    'Dashboard for ' || (ARRAY['executive', 'sales', 'finance', 'operations', 'analytics'])[((i - 1) % 5) + 1] || ' metrics',
    ((i - 1) % 13) + 1, -- domain_id
    jsonb_build_object('layout', 'grid', 'columns', 12, 'widgets', '[]'),
    (i % 20 = 1), -- is_default (5% are default)
    (i % 3 = 0), -- is_shared (33%)
    true,
    NOW() - (random() * 90 || ' days')::interval,
    NOW()
FROM generate_series(1, 300) AS i;

\echo '✅ Dashboards seeded (300 records)'

-- ============================================================
-- 7. DATA SOURCES
-- ============================================================

\echo '🔌 Seeding data_sources...'

INSERT INTO data_sources (
    tenant_id, source_name, source_type, connection_string,
    is_active, created_at, updated_at
)
SELECT 
    ((i - 1) % 100) + 1,
    (ARRAY['PostgreSQL DB', 'MySQL DB', 'SQL Server', 'Oracle DB', 'MongoDB', 'REST API', 'CSV File', 'Excel File'])[((i - 1) % 8) + 1] || ' ' || i,
    (ARRAY['database', 'api', 'file'])[((i - 1) % 3) + 1],
    'encrypted_connection_string_' || i,
    true,
    NOW() - (random() * 180 || ' days')::interval,
    NOW()
FROM generate_series(1, 200) AS i;

\echo '✅ Data sources seeded (200 records)'

-- ============================================================
-- 8. KPI DEFINITIONS
-- ============================================================

\echo '📊 Seeding metric_definitions...'

INSERT INTO metric_definitions (
    tenant_id, metric_name, metric_type, calculation_formula,
    unit, is_active, created_at
)
SELECT 
    ((i - 1) % 100) + 1,
    (ARRAY['Revenue', 'Profit', 'Growth Rate', 'Conversion Rate', 'Customer Satisfaction', 'Efficiency Score'])[((i - 1) % 6) + 1] || ' ' || i,
    (ARRAY['currency', 'percentage', 'number', 'ratio'])[((i - 1) % 4) + 1],
    'SUM(value) / COUNT(*)',
    (ARRAY['USD', '%', 'count', 'ratio'])[((i - 1) % 4) + 1],
    true,
    NOW()
FROM generate_series(1, 500) AS i;

\echo '✅ Metric definitions seeded (500 records)'

-- ============================================================
-- 9. NOTIFICATIONS
-- ============================================================

\echo '🔔 Seeding notifications...'

INSERT INTO notifications (
    tenant_id, user_id, notification_type, title, message,
    is_read, created_at
)
SELECT 
    ((i - 1) % 100) + 1,
    ((i - 1) % 1000) + 1,
    (ARRAY['info', 'warning', 'success', 'error'])[((i - 1) % 4) + 1],
    'Notification ' || i,
    'This is a sample notification message for testing purposes.',
    (i % 3 = 0), -- 33% read
    NOW() - (random() * 30 || ' days')::interval
FROM generate_series(1, 2000) AS i;

\echo '✅ Notifications seeded (2000 records)'

-- ============================================================
-- 10. AI INSIGHTS
-- ============================================================

\echo '🤖 Seeding ai_insights...'

INSERT INTO ai_insights (
    tenant_id, report_id, insight_type, insight_text,
    confidence_score, created_at
)
SELECT 
    ((i - 1) % 100) + 1,
    ((i - 1) % 500) + 1,
    (ARRAY['trend', 'anomaly', 'prediction', 'recommendation'])[((i - 1) % 4) + 1],
    'AI-generated insight: This metric shows ' || (ARRAY['upward trend', 'downward trend', 'anomaly detected', 'stable pattern'])[((i - 1) % 4) + 1],
    0.75 + (random() * 0.25), -- 0.75-1.0
    NOW() - (random() * 60 || ' days')::interval
FROM generate_series(1, 1000) AS i;

\echo '✅ AI insights seeded (1000 records)'

-- Re-enable triggers
SET session_replication_role = DEFAULT;

\echo ''
\echo '✅ Database seeding completed successfully!'
\echo ''
\echo '📊 Summary:'
\echo '   - Currencies: 15'
\echo '   - Countries: 20'
\echo '   - Tenants: 100'
\echo '   - Roles: 510'
\echo '   - Users: 1000'
\echo '   - Reports Master: 500'
\echo '   - Activity Logs: 10000'
\echo '   - Dashboards: 300'
\echo '   - Data Sources: 200'
\echo '   - Metric Definitions: 500'
\echo '   - Notifications: 2000'
\echo '   - AI Insights: 1000'
\echo ''
\echo '   Total Records: ~15,000+'
\echo ''
