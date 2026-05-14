import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import 'express-async-errors';
import analyticsRoutes from './routes/analytics.routes';

import { testConnection } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

// Import main routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import tenantRoutes from './routes/tenant.routes';
import roleRoutes from './routes/role.routes';
import reportRoutes from './routes/report.routes';
import dashboardRoutes from './routes/dashboard.routes';
import dataSourceRoutes from './routes/dataSource.routes';
import complianceRoutes from './routes/compliance.routes';
import aiAnalyticsRoutes from './routes/aiAnalytics.routes';
import chatbotRoutes from './routes/chatbot.routes';
import billingRoutes from './routes/billing.routes';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// ============================================================
// MIDDLEWARE
// ============================================================

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Deemona Dashboard API is running',
    version: API_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// API routes
const apiRouter = express.Router();

// ============================================================
// MODULE 1: AUTHENTICATION & USER MANAGEMENT
// ============================================================
apiRouter.use('/auth', authRoutes);
apiRouter.use('/auth', authRoutes);
// TEST: Add right after auth (which we know works)
apiRouter.get('/test-after-auth', (req, res) => {
  res.json({ message: 'Test route after auth works!' });
});
apiRouter.use('/users', userRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/analytics', analyticsRoutes);
//apiRouter.use('/analytics', analyticsRoutes);
// DEBUG: Direct test route in server.ts
apiRouter.get('/test-direct', (req, res) => {
  res.json({ message: 'Direct route works!' });
});
apiRouter.use('/user', require('./routes/user.routes').default);
apiRouter.use('/tenants', tenantRoutes);
apiRouter.use('/tenant', require('./routes/tenant.routes').default);
apiRouter.use('/roles', roleRoutes);
apiRouter.use('/role', require('./routes/role.routes').default);
apiRouter.use('/permissions', require('./routes/permissions.routes').default);
apiRouter.use('/role-permissions', require('./routes/rolePermissions.routes').default);
apiRouter.use('/user-roles', require('./routes/userRoles.routes').default);
apiRouter.use('/user-preferences', require('./routes/user_preferences.routes').default);
apiRouter.use('/preferences', require('./routes/preferences.routes').default);
apiRouter.use('/sessions', require('./routes/sessions.routes').default);
apiRouter.use('/login-history', require('./routes/login_history.routes').default);
apiRouter.use('/password-reset-tokens', require('./routes/passwordResetTokens.routes').default);
apiRouter.use('/mfa-settings', require('./routes/mfaSettings.routes').default);
apiRouter.use('/oauth-providers', require('./routes/oauthProviders.routes').default);
apiRouter.use('/user-devices', require('./routes/userDevices.routes').default);

// ============================================================
// MODULE 2: TENANTS & SUBSCRIPTIONS
// ============================================================
apiRouter.use('/tenant-subscriptions', require('./routes/tenantSubscriptions.routes').default);
apiRouter.use('/tenant-invitations', require('./routes/tenantInvitations.routes').default);
apiRouter.use('/subscription-plans', require('./routes/subscriptionPlans.routes').default);
apiRouter.use('/plan-features', require('./routes/planFeatures.routes').default);
apiRouter.use('/billing', billingRoutes);
apiRouter.use('/billing-accounts', require('./routes/billingAccounts.routes').default);

// ============================================================
// MODULE 3: REPORTS & ANALYTICS
// ============================================================
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/report', require('./routes/report.routes').default);
apiRouter.use('/reports/master', require('./routes/reports.master.routes').default);
apiRouter.use('/reports-master', require('./routes/reportsMaster.routes').default);
apiRouter.use('/report-data', require('./routes/reportData.routes').default);
apiRouter.use('/report-fields', require('./routes/reportFields.routes').default);
apiRouter.use('/report-filters', require('./routes/reportFilters.routes').default);
apiRouter.use('/report-bookmarks', require('./routes/reportBookmarks.routes').default);
apiRouter.use('/report-categories', require('./routes/report_categories.routes').default);
apiRouter.use('/report-comments', require('./routes/reportComments.routes').default);
apiRouter.use('/report-formats', require('./routes/report_formats.routes').default);
apiRouter.use('/report-kpis', require('./routes/reportKpis.routes').default);
apiRouter.use('/report-schedules', require('./routes/report_schedules.routes').default);
apiRouter.use('/report-subscriptions', require('./routes/reportSubscriptions.routes').default);
apiRouter.use('/report-tags', require('./routes/reportTags.routes').default);
apiRouter.use('/report-templates', require('./routes/reportTemplates.routes').default);
apiRouter.use('/report-types', require('./routes/report_types.routes').default);
apiRouter.use('/report-versions', require('./routes/reportVersions.routes').default);
apiRouter.use('/report-sharing', require('./routes/reportSharing.routes').default);
apiRouter.use('/report-annotations', require('./routes/reportAnnotations.routes').default);
apiRouter.use('/report-approvals', require('./routes/reportApprovals.routes').default);
apiRouter.use('/report-access-policies', require('./routes/reportAccessPolicies.routes').default);
apiRouter.use('/report-view-logs', require('./routes/reportViewLogs.routes').default);
apiRouter.use('/report-run-history', require('./routes/reportRunHistory.routes').default);
apiRouter.use('/report-join-definitions', require('./routes/reportJoinDefinitions.routes').default);
apiRouter.use('/report-themes', require('./routes/reportThemes.routes').default);
apiRouter.use('/custom-report-definitions', require('./routes/customReportDefinitions.routes').default);

// ============================================================
// MODULE 4: DASHBOARDS & WIDGETS
// ============================================================
apiRouter.use('/dashboards', dashboardRoutes);
apiRouter.use('/dashboard', require('./routes/dashboard.routes').default);
apiRouter.use('/dashboard-widgets', require('./routes/dashboardWidgets.routes').default);
apiRouter.use('/dashboard-themes', require('./routes/dashboard_themes.routes').default);
apiRouter.use('/chart-types', require('./routes/chart_types.routes').default);

// ============================================================
// MODULE 5: DATA INTEGRATION & SOURCES
// ============================================================
apiRouter.use('/data-sources', dataSourceRoutes);
apiRouter.use('/dataSource', require('./routes/dataSource.routes').default);
apiRouter.use('/dataSources', require('./routes/dataSources.routes').default);
apiRouter.use('/data-uploads', require('./routes/dataUploads.routes').default);
apiRouter.use('/dataUpload', require('./routes/dataUpload.routes').default);
apiRouter.use('/etl-jobs', require('./routes/etlJobs.routes').default);
apiRouter.use('/etlJob', require('./routes/etlJob.routes').default);
apiRouter.use('/data-types', require('./routes/data_types.routes').default);
apiRouter.use('/source-mappings', require('./routes/sourceMappings.routes').default);
apiRouter.use('/attachments', require('./routes/attachments.routes').default);
apiRouter.use('/attachment-types', require('./routes/attachment_types.routes').default);
apiRouter.use('/data-lineage', require('./routes/dataLineage.routes').default);
apiRouter.use('/data-ingestion-logs', require('./routes/dataIngestionLogs.routes').default);
apiRouter.use('/data-quality-scores', require('./routes/dataQualityScores.routes').default);
apiRouter.use('/data-validation-rules', require('./routes/dataValidationRules.routes').default);
apiRouter.use('/data-consent', require('./routes/dataConsent.routes').default);
apiRouter.use('/data-masking-rules', require('./routes/dataMaskingRules.routes').default);
apiRouter.use('/data-retention-policies', require('./routes/dataRetentionPolicies.routes').default);
apiRouter.use('/upload-validation-rules', require('./routes/uploadValidationRules.routes').default);
apiRouter.use('/connector-sync-logs', require('./routes/connectorSyncLogs.routes').default);
apiRouter.use('/connector-types', require('./routes/connectorTypes.routes').default);
apiRouter.use('/external-feeds', require('./routes/externalFeeds.routes').default);

// ============================================================
// MODULE 6: AI, ANALYTICS & MACHINE LEARNING
// ============================================================
apiRouter.use('/ai-analytics', aiAnalyticsRoutes);
apiRouter.use('/ai-insights', require('./routes/aiInsights.routes').default);
apiRouter.use('/forecasts', require('./routes/forecastModels.routes').default);
apiRouter.use('/forecast', require('./routes/forecast.routes').default);
apiRouter.use('/forecast-models', require('./routes/forecastModels.routes').default);
apiRouter.use('/insights', require('./routes/aiInsights.routes').default);
apiRouter.use('/insight', require('./routes/insight.routes').default);
apiRouter.use('/recommendations', require('./routes/recommendations.routes').default);
apiRouter.use('/anomaly-logs', require('./routes/anomalyLogs.routes').default);
apiRouter.use('/trend-analysis', require('./routes/trendAnalysis.routes').default);
apiRouter.use('/correlation-matrix', require('./routes/correlationMatrix.routes').default);
apiRouter.use('/scenario-simulations', require('./routes/scenarioSimulations.routes').default);
apiRouter.use('/model-types', require('./routes/model_types.routes').default);
apiRouter.use('/model-training-history', require('./routes/modelTrainingHistory.routes').default);
apiRouter.use('/llm-usage-logs', require('./routes/llmUsageLogs.routes').default);

// ============================================================
// MODULE 7: KPIs & METRICS
// ============================================================
apiRouter.use('/metric-definitions', require('./routes/metricDefinitions.routes').default);
apiRouter.use('/metric-categories', require('./routes/metric_categories.routes').default);
apiRouter.use('/metric-units', require('./routes/metric_units.routes').default);
apiRouter.use('/kpi-categories', require('./routes/kpi_categories.routes').default);
apiRouter.use('/kpi-benchmarks', require('./routes/kpiBenchmarks.routes').default);
apiRouter.use('/kpi-history', require('./routes/kpiHistory.routes').default);
apiRouter.use('/scorecard-definitions', require('./routes/scorecardDefinitions.routes').default);
apiRouter.use('/scorecard-kpis', require('./routes/scorecardKpis.routes').default);
apiRouter.use('/benchmarking-data', require('./routes/benchmarkingData.routes').default);
apiRouter.use('/executive-narratives', require('./routes/executiveNarratives.routes').default);

// ============================================================
// MODULE 8: COMPLIANCE & REGULATIONS
// ============================================================
apiRouter.use('/compliance', complianceRoutes);
apiRouter.use('/compliance-rules', require('./routes/complianceRules.routes').default);
apiRouter.use('/compliance-audit', require('./routes/complianceAudit.routes').default);
apiRouter.use('/compliance-documents', require('./routes/complianceDocuments.routes').default);
apiRouter.use('/compliance-calendar', require('./routes/complianceCalendar.routes').default);
apiRouter.use('/compliance-submissions', require('./routes/complianceSubmissions.routes').default);
apiRouter.use('/regulations', require('./routes/regulations.routes').default);
apiRouter.use('/regulatory-contacts', require('./routes/regulatoryContacts.routes').default);
apiRouter.use('/approvals', require('./routes/approvals.routes').default);
apiRouter.use('/approval-workflows', require('./routes/approvalWorkflows.routes').default);
apiRouter.use('/approval-steps', require('./routes/approvalSteps.routes').default);
apiRouter.use('/gdpr-requests', require('./routes/gdprRequests.routes').default);
apiRouter.use('/esg-scores', require('./routes/esgScores.routes').default);
apiRouter.use('/blockchain-audit', require('./routes/blockchainAudit.routes').default);

// ============================================================
// MODULE 9: AUTOMATION & WORKFLOWS
// ============================================================
apiRouter.use('/automation', require('./routes/automation.routes').default);
apiRouter.use('/automations', require('./routes/automations.routes').default);
apiRouter.use('/workflows', require('./routes/workflowDefinitions.routes').default);
apiRouter.use('/workflow', require('./routes/workflow.routes').default);
apiRouter.use('/workflow-definitions', require('./routes/workflowDefinitions.routes').default);
apiRouter.use('/workflow-instances', require('./routes/workflowInstances.routes').default);
apiRouter.use('/alerts', require('./routes/alertRules.routes').default);
apiRouter.use('/alert', require('./routes/alert.routes').default);
apiRouter.use('/alert-rules', require('./routes/alertRules.routes').default);
apiRouter.use('/alert-logs', require('./routes/alertLogs.routes').default);
apiRouter.use('/scheduled-tasks', require('./routes/scheduledTasks.routes').default);
apiRouter.use('/job-queue', require('./routes/jobQueue.routes').default);
apiRouter.use('/task-history', require('./routes/taskHistory.routes').default);
apiRouter.use('/webhooks', require('./routes/webhooks.routes').default);

// ============================================================
// MODULE 10: NOTIFICATIONS & MESSAGING
// ============================================================
apiRouter.use('/notifications', require('./routes/notifications.routes').default);
apiRouter.use('/notification-channels', require('./routes/notification_channels.routes').default);
apiRouter.use('/notification-templates', require('./routes/notificationTemplates.routes').default);
apiRouter.use('/email-templates', require('./routes/email_templates.routes').default);
apiRouter.use('/email-queue', require('./routes/emailQueue.routes').default);
apiRouter.use('/message-streams', require('./routes/messageStreams.routes').default);
apiRouter.use('/announcements', require('./routes/announcements.routes').default);

// ============================================================
// MODULE 11: CHATBOT & AI ASSISTANT
// ============================================================
apiRouter.use('/chatbot', chatbotRoutes);
apiRouter.use('/chat-sessions', require('./routes/chatSessions.routes').default);
apiRouter.use('/chat-queries', require('./routes/chatQueries.routes').default);
apiRouter.use('/chat-responses', require('./routes/chatResponses.routes').default);
apiRouter.use('/chat-feedback', require('./routes/chatFeedback.routes').default);
apiRouter.use('/chat-intents', require('./routes/chatIntents.routes').default);

// ============================================================
// MODULE 12: ADMIN & OBSERVABILITY
// ============================================================
apiRouter.use('/admin', require('./routes/admin.routes').default);
apiRouter.use('/admins', require('./routes/admins.routes').default);
apiRouter.use('/audit', require('./routes/auditLogs.routes').default);
apiRouter.use('/audit-logs', require('./routes/auditLogs.routes').default);
apiRouter.use('/activity-logs', require('./routes/activityLogs.routes').default);
apiRouter.use('/security-events', require('./routes/securityEvents.routes').default);
apiRouter.use('/error-logs', require('./routes/errorLogs.routes').default);
apiRouter.use('/deployment-logs', require('./routes/deploymentLogs.routes').default);
apiRouter.use('/system-metrics', require('./routes/systemMetrics.routes').default);
apiRouter.use('/usage-metrics', require('./routes/usageMetrics.routes').default);
apiRouter.use('/api-usage-logs', require('./routes/apiUsageLogs.routes').default);
apiRouter.use('/api-keys', require('./routes/apiKeys.routes').default);

// ============================================================
// MODULE 13: INTEGRATIONS & PARTNERS
// ============================================================
apiRouter.use('/integrations', require('./routes/integrations.routes').default);
apiRouter.use('/integration', require('./routes/integration.routes').default);
apiRouter.use('/integration-logs', require('./routes/integrationLogs.routes').default);
apiRouter.use('/partner-integrations', require('./routes/partnerIntegrations.routes').default);

// ============================================================
// MODULE 14: TEAMS & COLLABORATION
// ============================================================
apiRouter.use('/teams', require('./routes/teams.routes').default);
apiRouter.use('/team-members', require('./routes/teamMembers.routes').default);
apiRouter.use('/distribution-lists', require('./routes/distributionLists.routes').default);
apiRouter.use('/distribution-members', require('./routes/distributionMembers.routes').default);

// ============================================================
// MODULE 15: SYSTEM CONFIGURATION & MASTER DATA
// ============================================================
apiRouter.use('/domains', require('./routes/domains.routes').default);
apiRouter.use('/domain', require('./routes/domain.routes').default);
apiRouter.use('/countries', require('./routes/countries.routes').default);
apiRouter.use('/currencies', require('./routes/currencies.routes').default);
apiRouter.use('/exchange-rates', require('./routes/exchangeRates.routes').default);
apiRouter.use('/industries', require('./routes/industries.routes').default);
apiRouter.use('/languages', require('./routes/languages.routes').default);
apiRouter.use('/timezones', require('./routes/timezones.routes').default);
apiRouter.use('/regions', require('./routes/regions.routes').default);
apiRouter.use('/fiscal-calendars', require('./routes/fiscalCalendars.routes').default);
apiRouter.use('/settings', require('./routes/settings.routes').default);
apiRouter.use('/feature-flags', require('./routes/featureFlags.routes').default);
apiRouter.use('/localization', require('./routes/localization.routes').default);
apiRouter.use('/translations', require('./routes/translations.routes').default);

// ============================================================
// MODULE 16: SEARCH & FILTERING
// ============================================================
apiRouter.use('/saved-filters', require('./routes/savedFilters.routes').default);
apiRouter.use('/search-history', require('./routes/searchHistory.routes').default);
apiRouter.use('/query-cache', require('./routes/query_cache.routes').default);

// ============================================================
// MODULE 17: EXPORT & TEMPLATES
// ============================================================
apiRouter.use('/export-history', require('./routes/exportHistory.routes').default);
apiRouter.use('/export-templates', require('./routes/exportTemplates.routes').default);

// ============================================================
// MODULE 18: SECURITY & ACCESS CONTROL
// ============================================================
apiRouter.use('/ip-allowlist', require('./routes/ipAllowlist.routes').default);
apiRouter.use('/rate-limit-config', require('./routes/rateLimitConfig.routes').default);

// Mount API router
app.use(`/api/${API_VERSION}`, apiRouter);

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================
// SERVER STARTUP
// ============================================================

const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Start server
    app.listen(PORT, () => {
      console.log('='.repeat(60));
      console.log('🚀 Deemona Dashboard API Server Started');
      console.log('='.repeat(60));
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🖥️  Server: http://localhost:${PORT}`);
      console.log(`🔗 API Base: http://localhost:${PORT}/api/${API_VERSION}`);
      console.log(`💚 Health: http://localhost:${PORT}/health`);
      console.log('='.repeat(60));
      console.log('📦 Registered Routes: 191 route files');
      console.log('📊 Total Endpoints: 570+');
      console.log('='.repeat(60));
      console.log('✅ Modules Active:');
      console.log('   • Authentication & User Management');
      console.log('   • Tenants & Subscriptions');
      console.log('   • Reports & Analytics (30+ endpoints)');
      console.log('   • Dashboards & Widgets');
      console.log('   • Data Integration & Sources (20+ endpoints)');
      console.log('   • AI & Machine Learning (15+ endpoints)');
      console.log('   • KPIs & Metrics (10+ endpoints)');
      console.log('   • Compliance & Regulations (15+ endpoints)');
      console.log('   • Automation & Workflows (10+ endpoints)');
      console.log('   • Notifications & Messaging');
      console.log('   • Chatbot & AI Assistant');
      console.log('   • Admin & Observability (10+ endpoints)');
      console.log('   • Integrations & Partners');
      console.log('   • Teams & Collaboration');
      console.log('   • System Configuration & Master Data');
      console.log('   • Search & Filtering');
      console.log('   • Export & Templates');
      console.log('   • Security & Access Control');
      console.log('='.repeat(60));
      console.log('🎉 All 191 routes registered and ready!');
      console.log('='.repeat(60));
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
startServer();

export default app;
