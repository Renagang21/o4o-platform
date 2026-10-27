@echo off
setlocal DisableDelayedExpansion
if not exist "%~dp0runtime\node.exe" (
  echo Extract all files first, then run Install.cmd.
  pause
  exit /b 1
)
"%~dp0runtime\node.exe" "%~dp0install.mjs"
set "O4O_INSTALL_EXIT=%ERRORLEVEL%"
pause
exit /b %O4O_INSTALL_EXIT%
