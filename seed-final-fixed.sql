-- Final Patch (Fixed): Seed remaining 3 tables using ACTUAL existing IDs
-- Run with: psql -U postgres -d deemona_dashboard -f seed-final-fixed.sql

\echo '🔧 Seeding remaining tables with actual tenant/user IDs...'
\echo ''

-- ============================================================
-- 1. DATA SOURCES (Using actual tenant IDs)
-- ============================================================

\echo '🔌 Seeding data_sources...'

INSERT INTO data_sources (
    tenant_id, source_name, source_type, config, credentials,
    is_active, last_sync, created_at, updated_at
)
SELECT 
    (SELECT tenant_id FROM tenants ORDER BY random() LIMIT 1), -- Random existing tenant
    (ARRAY['PostgreSQL DB', 'MySQL DB', 'SQL Server', 'Oracle DB', 'MongoDB', 'REST API', 'CSV File', 'Excel File'])[((i - 1) % 8) + 1] || ' ' || i,
    (ARRAY['database', 'api', 'file'])[((i - 1) % 3) + 1],
    jsonb_build_object(
        'host', 'localhost',
        'port', 5432,
        'database', 'db_' || i,
        'schema', 'public'
    ),
    jsonb_build_object(
        'username', 'user_' || i,
        'encrypted', true
    ),
    true,
    NOW() - (random() * 7 || ' days')::interval,
    NOW() - (random() * 180 || ' days')::interval,
    NOW()
FROM generate_series(1, 200) AS i;

\echo '✅ Data sources seeded (200 records)'

-- ============================================================
-- 2. METRIC DEFINITIONS (Using actual tenant/domain IDs)
-- ============================================================

\echo '📊 Seeding metric_definitions...'

INSERT INTO metric_definitions (
    tenant_id, domain_id, metric_name, display_name, description,
    formula, unit, data_type, category, is_active, created_at
)
SELECT 
    (SELECT tenant_id FROM tenants ORDER BY random() LIMIT 1), -- Random existing tenant
    (SELECT domain_id FROM domains ORDER BY random() LIMIT 1), -- Random existing domain
    'metric_' || i || '_' || floor(random() * 1000000),
    (ARRAY['Revenue', 'Profit', 'Growth Rate', 'Conversion Rate', 'Customer Satisfaction', 'Efficiency Score'])[((i - 1) % 6) + 1] || ' ' || i,
    'Metric for measuring ' || (ARRAY['revenue', 'profit', 'growth', 'conversion', 'satisfaction', 'efficiency'])[((i - 1) % 6) + 1],
    'SUM(value) / COUNT(*)',
    (ARRAY['USD', '%', 'count', 'ratio', 'score', 'index'])[((i - 1) % 6) + 1],
    (ARRAY['numeric', 'percentage', 'integer', 'decimal'])[((i - 1) % 4) + 1],
    (ARRAY['Financial', 'Operational', 'Customer', 'Performance', 'Quality', 'Efficiency'])[((i - 1) % 6) + 1],
    true,
    NOW()
FROM generate_series(1, 500) AS i
ON CONFLICT (tenant_id, metric_name) DO NOTHING;

\echo '✅ Metric definitions seeded (500 records)'

-- ============================================================
-- 3. NOTIFICATIONS (Using actual tenant/user IDs)
-- ============================================================

\echo '🔔 Seeding notifications...'

INSERT INTO notifications (
    tenant_id, user_id, channel, title, message,
    status, data_json, created_at, sent_at, read_at
)
SELECT 
    (SELECT tenant_id FROM tenants ORDER BY random() LIMIT 1), -- Random existing tenant
    (SELECT user_id FROM users ORDER BY random() LIMIT 1), -- Random existing user
    (ARRAY['in-app', 'email', 'sms', 'push'])[((i - 1) % 4) + 1],
    'Notification ' || i,
    'This is a sample notification message for testing purposes. ' ||
    (ARRAY['Your report is ready', 'New data available', 'Alert triggered', 'System update'])[((i - 1) % 4) + 1],
    CASE 
        WHEN i % 3 = 0 THEN 'read'
        WHEN i % 3 = 1 THEN 'sent'
        ELSE 'pending'
    END,
    jsonb_build_object(
        'type', (ARRAY['info', 'warning', 'success', 'error'])[((i - 1) % 4) + 1],
        'priority', (ARRAY['low', 'medium', 'high'])[((i - 1) % 3) + 1],
        'action_url', '/reports/' || ((i - 1) % 500) + 1
    ),
    NOW() - (random() * 30 || ' days')::interval,
    CASE WHEN i % 3 != 2 THEN NOW() - (random() * 29 || ' days')::interval ELSE NULL END,
    CASE WHEN i % 3 = 0 THEN NOW() - (random() * 28 || ' days')::interval ELSE NULL END
FROM generate_series(1, 2000) AS i;

\echo '✅ Notifications seeded (2000 records)'

\echo ''
\echo '✅ Final patch completed successfully!'
\echo ''
\echo '📊 Additional Records Seeded:'
\echo '   - Data Sources: 200'
\echo '   - Metric Definitions: 500'
\echo '   - Notifications: 2000'
\echo ''
\echo '   Total New Records: 2,700'
\echo ''
\echo '🎉 TOTAL DATABASE RECORDS: ~15,000+'
\echo ''
