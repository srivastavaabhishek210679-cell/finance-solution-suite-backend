#!/bin/bash

# Test Non-Tenant Endpoints
# This script tests all 41 non-tenant table endpoints

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3000/api/v1"
TOKEN="YOUR_JWT_TOKEN_HERE"

echo "========================================="
echo "Testing Non-Tenant Table Endpoints"
echo "========================================="
echo ""

# Function to test an endpoint
test_endpoint() {
    local name=$1
    local endpoint=$2
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $TOKEN" \
        "$API_URL/$endpoint")
    
    if [ "$response" -eq 200 ]; then
        echo -e "${GREEN}✓ PASS (200)${NC}"
        return 0
    else
        echo -e "${RED}✗ FAIL ($response)${NC}"
        return 1
    fi
}

# Test counters
total=0
passed=0
failed=0

# Report & Analytics Routes
echo "📊 Report & Analytics Routes:"
test_endpoint "Reports Master" "reports/master" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Report Bookmarks" "report-bookmarks" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Report Categories" "report-categories" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Report Comments" "report-comments" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Report Filters" "report-filters" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Report Formats" "report-formats" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Report KPIs" "report-kpis" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Report Schedules" "report-schedules" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Report Subscriptions" "report-subscriptions" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Report Tags" "report-tags" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Report Templates" "report-templates" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Report Types" "report-types" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Report Versions" "report-versions" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Saved Filters" "saved-filters" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Trend Analysis" "trend-analysis" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Domains" "domains" && ((passed++)) || ((failed++)); ((total++))
echo ""

# Dashboard Routes
echo "📈 Dashboard & Visualization Routes:"
test_endpoint "Dashboard Themes" "dashboard-themes" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Dashboard Widgets" "dashboard-widgets" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Chart Types" "chart-types" && ((passed++)) || ((failed++)); ((total++))
echo ""

# Data Integration Routes
echo "🔌 Data Integration Routes:"
test_endpoint "Data Types" "data-types" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Source Mappings" "source-mappings" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Attachments" "attachments" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Attachment Types" "attachment-types" && ((passed++)) || ((failed++)); ((total++))
echo ""

# Analytics & KPI Routes
echo "📊 Analytics & KPI Routes:"
test_endpoint "KPI Categories" "kpi-categories" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Metric Categories" "metric-categories" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Metric Units" "metric-units" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Model Types" "model-types" && ((passed++)) || ((failed++)); ((total++))
echo ""

# Compliance Routes
echo "✅ Compliance Routes:"
test_endpoint "Regulations" "regulations" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Approvals" "approvals" && ((passed++)) || ((failed++)); ((total++))
echo ""

# System Configuration Routes
echo "⚙️ System Configuration Routes:"
test_endpoint "Permissions" "permissions" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Countries" "countries" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Currencies" "currencies" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Exchange Rates" "exchange-rates" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Industries" "industries" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Languages" "languages" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Timezones" "timezones" && ((passed++)) || ((failed++)); ((total++))
echo ""

# Notification Routes
echo "📧 Notification & Template Routes:"
test_endpoint "Email Templates" "email-templates" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Notification Channels" "notification-channels" && ((passed++)) || ((failed++)); ((total++))
echo ""

# User Experience Routes
echo "👤 User Experience Routes:"
test_endpoint "User Preferences" "user-preferences" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Login History" "login-history" && ((passed++)) || ((failed++)); ((total++))
test_endpoint "Query Cache" "query-cache" && ((passed++)) || ((failed++)); ((total++))
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Total Tests: $total"
echo -e "${GREEN}Passed: $passed${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
