@echo off
echo Fixing route stub files...

cd C:\finance-solution-suite\deemona-api\src\routes

echo export { default } from './forecastModels.routes'; > forecast.routes.ts
echo export { default } from './aiInsights.routes'; > insight.routes.ts
echo export { default } from './domains.routes'; > domain.routes.ts
echo export { default } from './dataUploads.routes'; > dataUpload.routes.ts
echo export { default } from './etlJobs.routes'; > etlJob.routes.ts
echo export { default } from './scheduledTasks.routes'; > automation.routes.ts
echo export { default } from './workflowDefinitions.routes'; > workflow.routes.ts
echo export { default } from './alertRules.routes'; > alert.routes.ts
echo export { default } from './settings.routes'; > admin.routes.ts
echo export { default } from './auditLogs.routes'; > audit.routes.ts
echo export { default } from './externalFeeds.routes'; > integration.routes.ts

echo.
echo ✅ All route files fixed!
echo.
echo The server should restart automatically now.
echo If not, run: npm run dev
pause
