@echo off
REM O4O Platform - Cloud SQL Auth Proxy (v2) Setup Script
REM Downloads the v2 proxy binary used by start-cloud-sql-proxy.cmd.
REM 바이너리는 Git 에 커밋하지 않는다 (bin/ 은 .gitignore 대상).

echo ============================================================
echo O4O Platform - Cloud SQL Auth Proxy (v2) Setup
echo ============================================================
echo.

REM Pin the version that start-cloud-sql-proxy.cmd is verified against.
set PROXY_VERSION=v2.14.3
set PROXY_URL=https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/%PROXY_VERSION%/cloud-sql-proxy.x64.exe
set PROXY_BIN=%~dp0bin\cloud-sql-proxy-v2.exe

REM Check if curl is available
where curl >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: curl is not available. Please install curl or download manually.
    echo Download URL: %PROXY_URL%
    pause
    exit /b 1
)

REM Create bin directory if not exists
if not exist "%~dp0bin" mkdir "%~dp0bin"

if exist "%PROXY_BIN%" (
    echo Already installed: %PROXY_BIN%
    "%PROXY_BIN%" --version
    echo.
    echo Delete the file first if you want to re-download.
    pause
    exit /b 0
)

echo Downloading Cloud SQL Auth Proxy %PROXY_VERSION% ...
curl -fL -o "%PROXY_BIN%" "%PROXY_URL%"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to download Cloud SQL Auth Proxy
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Cloud SQL Auth Proxy installed successfully!
echo ============================================================
echo Location: %PROXY_BIN%
"%PROXY_BIN%" --version
echo.
echo Next steps:
echo 1. Authenticate once:  gcloud auth application-default login
echo 2. Run: start-cloud-sql-proxy.cmd
echo 3. Keep the proxy window open while developing
echo 4. Connect to 127.0.0.1:5442  (local PostgreSQL keeps 5432)
echo.
pause
