@echo off
REM O4O Platform - Start Cloud SQL Auth Proxy (v2)
REM 운영 DB 접근은 이 프록시를 경유한다. 로컬 PostgreSQL(5432)과 포트를 분리한다.

echo ============================================================
echo O4O Platform - Starting Cloud SQL Auth Proxy (v2)
echo ============================================================
echo.

set PROXY_BIN=%~dp0bin\cloud-sql-proxy-v2.exe

REM Check if Cloud SQL Auth Proxy exists
if not exist "%PROXY_BIN%" (
    echo ERROR: Cloud SQL Auth Proxy not found!
    echo   expected: %PROXY_BIN%
    echo Please run: setup-cloud-sql-proxy.cmd first
    pause
    exit /b 1
)

REM Cloud SQL Connection Details
set INSTANCE_CONNECTION_NAME=netureyoutube:asia-northeast3:o4o-platform-db
REM 로컬 PostgreSQL 이 5432 를 점유하므로 프록시는 5442 를 사용한다.
set LOCAL_PORT=5442

echo Instance   : %INSTANCE_CONNECTION_NAME%
echo Local Port : %LOCAL_PORT%
echo.
echo Prerequisite: gcloud auth application-default login   (ADC)
echo   the proxy authenticates with Application Default Credentials.
echo.
echo NOTE: Keep this window open while developing
echo Press Ctrl+C to stop the proxy
echo.

REM v2 syntax: --port=PORT INSTANCE_CONNECTION_NAME
"%PROXY_BIN%" --port=%LOCAL_PORT% %INSTANCE_CONNECTION_NAME%

pause
