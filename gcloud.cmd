@echo off
REM O4O Platform - gcloud CLI wrapper
REM Usage: gcloud.cmd [gcloud commands...]
REM PATH 에 gcloud 가 있으면 그대로 사용하고, 없으면 기본 설치 경로를 시도한다.

where gcloud >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    gcloud %*
    exit /b %ERRORLEVEL%
)

if exist "%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" (
    "%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" %*
    exit /b %ERRORLEVEL%
)

if exist "%ProgramFiles(x86)%\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" (
    "%ProgramFiles(x86)%\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" %*
    exit /b %ERRORLEVEL%
)

echo ERROR: gcloud CLI not found.
echo Install from https://cloud.google.com/sdk/docs/install and re-open the terminal.
exit /b 1
