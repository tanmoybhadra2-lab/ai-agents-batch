@echo off
title AI Agents Startup
color 0A

echo.
echo =============================================
echo      AI AGENT BATCH SYSTEM - STARTUP
echo =============================================
echo.
echo [1/4] Launching OpenClaw (Orchestrator)...
echo [2/4] Launching OpenCode (Code Agent)...
echo [3/4] Launching Node Server (API Bridge)...
echo [4/4] Launching Hermes (Research Agent)...
echo.
echo Opening all agents in separate tabs...
echo.

REM Launch all 4 agents in Windows Terminal tabs
REM Run daily report on startup
cd /d C:\Users\tanmo\ai-agents-batch\agents\code-agent && node daily-report.js
wt new-tab --title "OpenClaw" cmd /k "ollama launch openclaw" ^
; new-tab --title "OpenCode" cmd /k "ollama launch opencode" ^
; new-tab --title "Node-Server" --startingDirectory "C:\Users\tanmo\ai-agents-batch\server" cmd /k "node index.js" ^
; new-tab --title "Hermes-WSL" wsl -e bash -c "ollama launch hermes"

echo.
echo =============================================
echo  All agents launched!
echo.
echo  OpenClaw  ^> http://127.0.0.1:18789
echo  Node API  ^> http://localhost:3000
echo  OpenCode  ^> check OpenCode tab
echo  Hermes    ^> check Hermes-WSL tab
echo =============================================
echo.
pause
