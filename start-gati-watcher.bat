@echo off
echo.
echo ============================================
echo  Gati — Persistent Watcher
echo  Watching: prism-decisions.json
echo  Press Ctrl+C to stop
echo ============================================
echo.
cd /d "%~dp0"
node agents\gati\index.js
