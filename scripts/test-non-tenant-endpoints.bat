@echo off
REM Test Non-Tenant Endpoints - Windows Version
REM This script tests all 41 non-tenant table endpoints

echo =========================================
echo Testing Non-Tenant Table Endpoints
echo =========================================
echo.

REM Configuration - UPDATE YOUR TOKEN HERE
set API_URL=http://localhost:3000/api/v1
set TOKEN=YOUR_JWT_TOKEN_HERE

set total=0
set passed=0
set failed=0

echo [Report and Analytics Routes]
call :test_endpoint "Reports Master" "reports/master"
call :test_endpoint "Report Bookmarks" "report-bookmarks"
call :test_endpoint "Report Categories" "report-categories"
call :test_endpoint "Report Comments" "report-comments"
call :test_endpoint "Report Filters" "report-filters"
call :test_endpoint "Report Formats" "report-formats"
call :test_endpoint "Report KPIs" "report-kpis"
call :test_endpoint "Report Schedules" "report-schedules"
call :test_endpoint "Report Subscriptions" "report-subscriptions"
call :test_endpoint "Report Tags" "report-tags"
call :test_endpoint "Report Templates" "report-templates"
call :test_endpoint "Report Types" "report-types"
call :test_endpoint "Report Versions" "report-versions"
call :test_endpoint "Saved Filters" "saved-filters"
call :test_endpoint "Trend Analysis" "trend-analysis"
call :test_endpoint "Domains" "domains"
echo.

echo [Dashboard and Visualization Routes]
call :test_endpoint "Dashboard Themes" "dashboard-themes"
call :test_endpoint "Dashboard Widgets" "dashboard-widgets"
call :test_endpoint "Chart Types" "chart-types"
echo.

echo [Data Integration Routes]
call :test_endpoint "Data Types" "data-types"
call :test_endpoint "Source Mappings" "source-mappings"
call :test_endpoint "Attachments" "attachments"
call :test_endpoint "Attachment Types" "attachment-types"
echo.

echo [Analytics and KPI Routes]
call :test_endpoint "KPI Categories" "kpi-categories"
call :test_endpoint "Metric Categories" "metric-categories"
call :test_endpoint "Metric Units" "metric-units"
call :test_endpoint "Model Types" "model-types"
echo.

echo [Compliance Routes]
call :test_endpoint "Regulations" "regulations"
call :test_endpoint "Approvals" "approvals"
echo.

echo [System Configuration Routes]
call :test_endpoint "Permissions" "permissions"
call :test_endpoint "Countries" "countries"
call :test_endpoint "Currencies" "currencies"
call :test_endpoint "Exchange Rates" "exchange-rates"
call :test_endpoint "Industries" "industries"
call :test_endpoint "Languages" "languages"
call :test_endpoint "Timezones" "timezones"
echo.

echo [Notification and Template Routes]
call :test_endpoint "Email Templates" "email-templates"
call :test_endpoint "Notification Channels" "notification-channels"
echo.

echo [User Experience Routes]
call :test_endpoint "User Preferences" "user-preferences"
call :test_endpoint "Login History" "login-history"
call :test_endpoint "Query Cache" "query-cache"
echo.

echo =========================================
echo Test Summary
echo =========================================
echo Total Tests: %total%
echo Passed: %passed%
echo Failed: %failed%
echo.

if %failed% EQU 0 (
    echo [SUCCESS] ALL TESTS PASSED!
) else (
    echo [FAILURE] SOME TESTS FAILED
)

goto :end

:test_endpoint
set /a total+=1
set name=%~1
set endpoint=%~2

echo | set /p="Testing %name%... "

curl -s -o nul -w "%%{http_code}" -H "Authorization: Bearer %TOKEN%" "%API_URL%/%endpoint%" > temp_status.txt
set /p status=<temp_status.txt
del temp_status.txt

if "%status%"=="200" (
    echo [PASS] 200
    set /a passed+=1
) else (
    echo [FAIL] %status%
    set /a failed+=1
)
goto :eof

:end
