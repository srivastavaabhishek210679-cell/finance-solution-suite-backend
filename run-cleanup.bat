@echo off
echo ============================================================================
echo  DUPLICATE REPORT CLEANUP TOOL
echo ============================================================================
echo.
echo This script will:
echo  1. Scan all 500 reports across 13 domains
echo  2. Find duplicate reports (same name, domain, description)
echo  3. Delete duplicates (keeping the one with lowest ID)
echo.
echo ⚠️  WARNING: This will permanently delete duplicate data!
echo.
pause
echo.
echo Starting cleanup...
echo.

cd /d C:\finance-solution-suite\deemona-api

node find-and-delete-duplicates.js

echo.
echo ============================================================================
echo.
pause
