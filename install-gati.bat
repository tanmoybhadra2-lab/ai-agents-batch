@echo off
echo.
echo ============================================
echo  Installing Gati dependencies
echo ============================================
cd /d "%~dp0agents\gati"
call npm install
echo.
echo Done. Run test-gati.bat to verify.
pause
