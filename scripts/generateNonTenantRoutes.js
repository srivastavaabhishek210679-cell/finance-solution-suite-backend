#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of all non-tenant tables (tables without tenant_id)
const nonTenantTables = [
  'approvals',
  'attachment_types',
  'attachments',
  'chart_types',
  'countries',
  'currencies',
  'dashboard_themes',
  'dashboard_widgets',
  'data_types',
  'domains',
  'email_templates',
  'exchange_rates',
  'industries',
  'integrations',
  'kpi_categories',
  'languages',
  'login_history',
  'metric_categories',
  'metric_units',
  'model_types',
  'notification_channels',
  'permissions',
  'query_cache',
  'regulations',
  'report_bookmarks',
  'report_categories',
  'report_comments',
  'report_filters',
  'report_formats',
  'report_kpis',
  'report_schedules',
  'report_subscriptions',
  'report_tags',
  'report_templates',
  'report_types',
  'report_versions',
  'reports_master',
  'saved_filters',
  'source_mappings',
  'timezones',
  'trend_analysis',
  'user_preferences'
];

// Route template
const routeTemplate = (tableName) => `import { Router } from 'express';
import { NonTenantBaseController } from '../controllers/nonTenant.base.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new NonTenantBaseController('${tableName}');

// All routes require authentication
router.use(authenticate);

// CRUD routes for ${tableName}
router.get('/', controller.getAll);
router.get('/search', controller.search);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

export default router;
`;

// Generate routes for each non-tenant table
const routesDir = path.join(__dirname, '../src/routes');

console.log('🔧 Generating routes for non-tenant tables...\n');

let generated = 0;
let skipped = 0;

nonTenantTables.forEach(tableName => {
  const routeFileName = `${tableName}.routes.ts`;
  const routeFilePath = path.join(routesDir, routeFileName);

  // Check if file already exists
  if (fs.existsSync(routeFilePath)) {
    console.log(`⏭️  Skipped: ${routeFileName} (already exists)`);
    skipped++;
  } else {
    // Create the route file
    fs.writeFileSync(routeFilePath, routeTemplate(tableName));
    console.log(`✅ Created: ${routeFileName}`);
    generated++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   ✅ Generated: ${generated} files`);
console.log(`   ⏭️  Skipped: ${skipped} files`);
console.log(`   📁 Total non-tenant tables: ${nonTenantTables.length}`);
console.log(`\n✨ Done! All non-tenant routes are ready.`);
