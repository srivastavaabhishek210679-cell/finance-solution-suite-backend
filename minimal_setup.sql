-- Minimal setup for API to work
-- Run this first, then use API to create users

-- Insert tenant
INSERT INTO tenants (tenant_id, tenant_name, domain, plan, status, created_at, updated_at)
VALUES (1, 'Demo Company', 'demo.deemona.com', 'enterprise', 'active', NOW(), NOW())
ON CONFLICT (tenant_id) DO NOTHING;

-- Insert roles
INSERT INTO roles (role_id, tenant_id, role_name, description, is_system, created_at)
VALUES 
(1, 1, 'Admin', 'Full system access', true, NOW()),
(2, 1, 'User', 'Standard user access', true, NOW())
ON CONFLICT (role_id) DO NOTHING;

-- Check results
SELECT 'Setup complete! Now use the API to register users.' as message;
SELECT * FROM tenants;
SELECT * FROM roles;
