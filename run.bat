@echo off
title LogMyTime Launcher
echo =========================================
echo          Starting LogMyTime App
echo =========================================
echo.

echo Starting FastAPI Backend (Port 8000)...
start "LogMyTime Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Vite Frontend (Port 5173)...
start "LogMyTime Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Application instances launched in separate windows!
echo Backend API:  http://127.0.0.1:8000
echo Frontend SPA: http://localhost:5173
echo.
