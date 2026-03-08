@echo off
REM O4O Platform - GCP Application Default Credentials Setup
REM This script sets up authentication for Cloud SQL Proxy

echo ============================================================
echo O4O Platform - GCP Authentication
echo ============================================================
echo.
echo This will authenticate your local environment with GCP.
echo A browser window will open for you to sign in.
echo.
echo Press any key to continue...
pause >nul

"C:\Users\sohae\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" auth application-default login

echo.
echo ============================================================
if %ERRORLEVEL% EQU 0 (
    echo Authentication successful!
    echo You can now use Cloud SQL Proxy.
) else (
    echo Authentication failed!
    echo Please try again or contact your project administrator.
)
echo ============================================================
echo.
pause
