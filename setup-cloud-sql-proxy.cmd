@echo off
REM O4O Platform - Cloud SQL Proxy Setup Script
REM This script downloads and configures Cloud SQL Proxy for local development

echo ============================================================
echo O4O Platform - Cloud SQL Proxy Setup
echo ============================================================
echo.

REM Check if curl is available
where curl >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: curl is not available. Please install curl or download manually.
    echo Download URL: https://dl.google.com/cloudsql/cloud_sql_proxy_x64.exe
    pause
    exit /b 1
)

REM Create bin directory if not exists
if not exist "%~dp0bin" mkdir "%~dp0bin"

REM Download Cloud SQL Proxy
echo Downloading Cloud SQL Proxy...
curl -o "%~dp0bin\cloud-sql-proxy.exe" https://dl.google.com/cloudsql/cloud_sql_proxy_x64.exe

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to download Cloud SQL Proxy
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Cloud SQL Proxy installed successfully!
echo ============================================================
echo Location: %~dp0bin\cloud-sql-proxy.exe
echo.
echo Next steps:
echo 1. Run: start-cloud-sql-proxy.cmd
echo 2. Keep the proxy running in the background
echo 3. Connect your application to localhost:5432
echo.
pause
