@echo off
setlocal
chcp 65001 >nul
set "PWSH=powershell.exe"
where pwsh.exe >nul 2>nul
if not errorlevel 1 set "PWSH=pwsh.exe"
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe" set "PWSH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe"
if "%~1"=="" (
  echo Tip: RUN_TESTCASES_LOCAL.cmd TC-FUNC-001 TC-FUNC-126
  "%PWSH%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Run-Testcases-Local.ps1" -Menu
) else (
  "%PWSH%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Run-Testcases-Local.ps1" %*
)
set "RUN_EXIT=%ERRORLEVEL%"
echo.
pause
exit /b %RUN_EXIT%
