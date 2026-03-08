@echo off
REM O4O Platform - Start Cloud SQL Proxy
REM This script starts Cloud SQL Proxy to connect to GCP Cloud SQL

echo ============================================================
echo O4O Platform - Starting Cloud SQL Proxy
echo ============================================================
echo.

REM Check if Cloud SQL Proxy exists
if not exist "%~dp0bin\cloud-sql-proxy.exe" (
    echo ERROR: Cloud SQL Proxy not found!
    echo Please run: setup-cloud-sql-proxy.cmd first
    pause
    exit /b 1
)

REM Cloud SQL Connection Details
set INSTANCE_CONNECTION_NAME=netureyoutube:asia-northeast3:o4o-platform-db
set LOCAL_PORT=5432

echo Starting Cloud SQL Proxy...
echo Instance: %INSTANCE_CONNECTION_NAME%
echo Local Port: %LOCAL_PORT%
echo.
echo NOTE: Keep this window open while developing
echo Press Ctrl+C to stop the proxy
echo.

REM Start Cloud SQL Proxy
"%~dp0bin\cloud-sql-proxy.exe" --port=%LOCAL_PORT% %INSTANCE_CONNECTION_NAME%

pause
