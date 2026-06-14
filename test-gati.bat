@echo off
echo.
echo ============================================
echo  Gati — One-shot test patch
echo ============================================
cd /d "%~dp0"
node agents\gati\index.js --once
echo.
pause
