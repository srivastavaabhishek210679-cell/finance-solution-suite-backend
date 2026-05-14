#!/usr/bin/env node

/**
 * Route Generator for All 127 Tables
 * Generates standardized route files for all database tables
 */

const fs = require('fs');
const path = require('path');

// All 127 tables organized by module
const tablesByModule = {
  'User Management': [
    { name: 'tenants', pk: 'tenant_id', hasAuth: false },
    { name: 'users', pk: 'user_id', hasAuth: true },
    { name: 'roles', pk: 'role_id', hasAuth: true },
    { name: 'permissions', pk: 'perm_id', hasAuth: true },
    { name: 'role_permissions', pk: 'role_id,perm_id', hasAuth: true },
    { name: 'sessions', pk: 'session_id', hasAuth: true },
    { name: 'api_keys', pk: 'api_key_id', hasAuth: true },
    { name: 'user_roles', pk: 'user_id,role_id', hasAuth: true },
    { name: 'preferences', pk: 'pref_id', hasAuth: true },
    { name: 'localization', pk: 'loc_id', hasAuth: true },
  ],
  'Reports Core': [
    { name: 'domains', pk: 'domain_id', hasAuth: true },
    { name: 'reports_master', pk: 'report_id', hasAuth: true },
    { name: 'report_data', pk: 'data_id', hasAuth: true },
    { name: 'report_kpis', pk: 'kpi_id', hasAuth: true },
    { name: 'report_filters', pk: 'filter_id', hasAuth: true },
    { name: 'report_templates', pk: 'template_id', hasAuth: true },
    { name: 'report_versions', pk: 'version_id', hasAuth: true },
    { name: 'report_comments', pk: 'comment_id', hasAuth: true },
    { name: 'report_tags', pk: 'tag_id', hasAuth: true },
    { name: 'report_subscriptions', pk: 'subscription_id', hasAuth: true },
    { name: 'export_history', pk: 'export_id', hasAuth: true },
    { name: 'kpi_benchmarks', pk: 'benchmark_id', hasAuth: true },
  ],
  'Dashboard': [
    { name: 'dashboards', pk: 'dashboard_id', hasAuth: true },
    { name: 'dashboard_widgets', pk: 'widget_id', hasAuth: true },
  ],
  'Data Integration': [
    { name: 'data_sources', pk: 'source_id', hasAuth: true },
    { name: 'data_uploads', pk: 'upload_id', hasAuth: true },
    { name: 'etl_jobs', pk: 'job_id', hasAuth: true },
    { name: 'source_mappings', pk: 'mapping_id', hasAuth: true },
    { name: 'data_validation_rules', pk: 'rule_id', hasAuth: true },
    { name: 'upload_validation_rules', pk: 'rule_id', hasAuth: true },
    { name: 'data_ingestion_logs', pk: 'log_id', hasAuth: true },
    { name: 'attachments', pk: 'attachment_id', hasAuth: true },
    { name: 'data_quality_scores', pk: 'score_id', hasAuth: true },
  ],
  'AI & Analytics': [
    { name: 'forecast_models', pk: 'model_id', hasAuth: true },
    { name: 'ai_insights', pk: 'insight_id', hasAuth: true },
    { name: 'recommendations', pk: 'recommendation_id', hasAuth: true },
    { name: 'anomaly_logs', pk: 'anomaly_id', hasAuth: true },
    { name: 'trend_analysis', pk: 'trend_id', hasAuth: true },
    { name: 'correlation_matrix', pk: 'correlation_id', hasAuth: true },
    { name: 'scenario_simulations', pk: 'simulation_id', hasAuth: true },
    { name: 'benchmarking_data', pk: 'benchmark_id', hasAuth: true },
    { name: 'esg_scores', pk: 'esg_id', hasAuth: true },
    { name: 'executive_narratives', pk: 'narrative_id', hasAuth: true },
  ],
  'Compliance': [
    { name: 'compliance_rules', pk: 'rule_id', hasAuth: true },
    { name: 'compliance_calendar', pk: 'event_id', hasAuth: true },
    { name: 'regulatory_contacts', pk: 'contact_id', hasAuth: true },
    { name: 'compliance_submissions', pk: 'submission_id', hasAuth: true },
    { name: 'compliance_audit', pk: 'audit_id', hasAuth: true },
    { name: 'compliance_documents', pk: 'doc_id', hasAuth: true },
    { name: 'blockchain_audit', pk: 'chain_id', hasAuth: true },
  ],
  'Automation': [
    { name: 'scheduled_tasks', pk: 'task_id', hasAuth: true },
    { name: 'workflow_definitions', pk: 'workflow_id', hasAuth: true },
    { name: 'workflow_instances', pk: 'instance_id', hasAuth: true },
    { name: 'task_history', pk: 'history_id', hasAuth: true },
    { name: 'alert_rules', pk: 'alert_id', hasAuth: true },
    { name: 'notifications', pk: 'notification_id', hasAuth: true },
    { name: 'alert_logs', pk: 'log_id', hasAuth: true },
  ],
  'Chatbot': [
    { name: 'chat_intents', pk: 'intent_id', hasAuth: true },
    { name: 'chat_sessions', pk: 'session_id', hasAuth: true },
    { name: 'chat_queries', pk: 'query_id', hasAuth: true },
    { name: 'chat_responses', pk: 'response_id', hasAuth: true },
    { name: 'chat_feedback', pk: 'feedback_id', hasAuth: true },
  ],
  'Admin & Observability': [
    { name: 'settings', pk: 'setting_id', hasAuth: true },
    { name: 'feature_flags', pk: 'flag_id', hasAuth: true },
    { name: 'system_metrics', pk: 'metric_id', hasAuth: true },
    { name: 'audit_logs', pk: 'log_id', hasAuth: true },
    { name: 'activity_logs', pk: 'activity_id', hasAuth: true },
    { name: 'error_logs', pk: 'error_id', hasAuth: true },
    { name: 'deployment_logs', pk: 'deployment_id', hasAuth: true },
  ],
  'Integrations': [
    { name: 'external_feeds', pk: 'feed_id', hasAuth: true },
    { name: 'webhooks', pk: 'webhook_id', hasAuth: true },
    { name: 'message_streams', pk: 'stream_id', hasAuth: true },
    { name: 'integration_logs', pk: 'log_id', hasAuth: true },
    { name: 'partner_integrations', pk: 'integration_id', hasAuth: true },
  ],
  'Billing': [
    { name: 'billing_accounts', pk: 'account_id', hasAuth: true },
    { name: 'usage_metrics', pk: 'usage_id', hasAuth: true },
  ],
  'Authentication & Security': [
    { name: 'password_reset_tokens', pk: 'token_id', hasAuth: true },
    { name: 'mfa_settings', pk: 'mfa_id', hasAuth: true },
    { name: 'oauth_providers', pk: 'provider_id', hasAuth: true },
    { name: 'ip_allowlist', pk: 'allowlist_id', hasAuth: true },
    { name: 'user_devices', pk: 'device_id', hasAuth: true },
  ],
  'Teams & Onboarding': [
    { name: 'tenant_invitations', pk: 'invitation_id', hasAuth: true },
    { name: 'teams', pk: 'team_id', hasAuth: true },
    { name: 'team_members', pk: 'member_id', hasAuth: true },
  ],
  'Report Lifecycle': [
    { name: 'report_run_history', pk: 'run_id', hasAuth: true },
    { name: 'report_approvals', pk: 'approval_id', hasAuth: true },
    { name: 'report_sharing', pk: 'share_id', hasAuth: true },
  ],
  'Additional Tables': [
    { name: 'notification_templates', pk: 'template_id', hasAuth: true },
    { name: 'email_queue', pk: 'queue_id', hasAuth: true },
    { name: 'report_bookmarks', pk: 'bookmark_id', hasAuth: true },
    { name: 'saved_filters', pk: 'filter_id', hasAuth: true },
    { name: 'announcements', pk: 'announcement_id', hasAuth: true },
    { name: 'metric_definitions', pk: 'metric_id', hasAuth: true },
    { name: 'data_retention_policies', pk: 'policy_id', hasAuth: true },
    { name: 'report_access_policies', pk: 'policy_id', hasAuth: true },
    { name: 'model_training_history', pk: 'training_id', hasAuth: true },
    { name: 'llm_usage_logs', pk: 'usage_id', hasAuth: true },
    { name: 'report_annotations', pk: 'annotation_id', hasAuth: true },
    { name: 'subscription_plans', pk: 'plan_id', hasAuth: true },
    { name: 'plan_features', pk: 'feature_id', hasAuth: true },
    { name: 'tenant_subscriptions', pk: 'subscription_id', hasAuth: true },
    { name: 'fiscal_calendars', pk: 'calendar_id', hasAuth: true },
    { name: 'currencies', pk: 'currency_code', hasAuth: true },
    { name: 'exchange_rates', pk: 'rate_id', hasAuth: true },
    { name: 'job_queue', pk: 'job_id', hasAuth: true },
    { name: 'gdpr_requests', pk: 'request_id', hasAuth: true },
    { name: 'data_consent', pk: 'consent_id', hasAuth: true },
    { name: 'data_lineage', pk: 'lineage_id', hasAuth: true },
    { name: 'data_masking_rules', pk: 'rule_id', hasAuth: true },
    { name: 'security_events', pk: 'event_id', hasAuth: true },
    { name: 'custom_report_definitions', pk: 'custom_report_id', hasAuth: true },
    { name: 'report_fields', pk: 'field_id', hasAuth: true },
    { name: 'report_join_definitions', pk: 'join_id', hasAuth: true },
    { name: 'approval_workflows', pk: 'workflow_id', hasAuth: true },
    { name: 'approval_steps', pk: 'step_id', hasAuth: true },
    { name: 'distribution_lists', pk: 'list_id', hasAuth: true },
    { name: 'distribution_members', pk: 'member_id', hasAuth: true },
    { name: 'scorecard_definitions', pk: 'scorecard_id', hasAuth: true },
    { name: 'scorecard_kpis', pk: 'scorecard_kpi_id', hasAuth: true },
    { name: 'kpi_history', pk: 'history_id', hasAuth: true },
    { name: 'api_usage_logs', pk: 'log_id', hasAuth: true },
    { name: 'rate_limit_config', pk: 'config_id', hasAuth: true },
    { name: 'translations', pk: 'translation_id', hasAuth: true },
    { name: 'regions', pk: 'region_id', hasAuth: true },
    { name: 'countries', pk: 'country_code', hasAuth: true },
    { name: 'report_themes', pk: 'theme_id', hasAuth: true },
    { name: 'export_templates', pk: 'template_id', hasAuth: true },
    { name: 'connector_types', pk: 'type_id', hasAuth: true },
    { name: 'connector_sync_logs', pk: 'sync_id', hasAuth: true },
    { name: 'report_view_logs', pk: 'view_id', hasAuth: true },
    { name: 'search_history', pk: 'search_id', hasAuth: true },
  ],
};

// Convert table name to route filename
function toRouteName(tableName) {
  return tableName
    .split('_')
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join('');
}

// Generate route file content
function generateRouteFile(table) {
  const routeName = toRouteName(table.name);
  const authMiddleware = table.hasAuth
    ? `\nimport { authenticate } from '../middleware/auth';\n`
    : '';
  const authUse = table.hasAuth ? '\n// Require authentication\nrouter.use(authenticate);\n' : '';

  return `import { Router } from 'express';
import { BaseController } from '../controllers/base.controller';
import { BaseService } from '../services/base.service';${authMiddleware}
const router = Router();
const ${table.name}Service = new BaseService('${table.name}', '${table.pk}');
const ${table.name}Controller = new BaseController(${table.name}Service);
${authUse}
// CRUD routes for ${table.name}
router.get('/', ${table.name}Controller.getAll);
router.get('/search', ${table.name}Controller.search);
router.get('/:id', ${table.name}Controller.getById);
router.post('/', ${table.name}Controller.create);
router.put('/:id', ${table.name}Controller.update);
router.delete('/:id', ${table.name}Controller.delete);

export default router;
`;
}

// Generate all route files
function generateAllRoutes() {
  const routesDir = path.join(__dirname, '../src/routes');

  // Create routes directory if it doesn't exist
  if (!fs.existsSync(routesDir)) {
    fs.mkdirSync(routesDir, { recursive: true });
  }

  let totalGenerated = 0;

  // Generate routes for each module
  Object.entries(tablesByModule).forEach(([module, tables]) => {
    console.log(`\n📁 Module: ${module}`);

    tables.forEach((table) => {
      const routeName = toRouteName(table.name);
      const filename = `${routeName}.routes.ts`;
      const filepath = path.join(routesDir, filename);

      // Skip if file already exists (don't overwrite custom routes)
      if (fs.existsSync(filepath)) {
        console.log(`   ⏭️  Skipped: ${filename} (already exists)`);
        return;
      }

      const content = generateRouteFile(table);
      fs.writeFileSync(filepath, content);
      console.log(`   ✅ Generated: ${filename}`);
      totalGenerated++;
    });
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Route generation complete!`);
  console.log(`📊 Total routes generated: ${totalGenerated}`);
  console.log(`${'='.repeat(60)}\n`);
}

// Run the generator
generateAllRoutes();
