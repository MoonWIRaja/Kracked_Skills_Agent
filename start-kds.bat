@echo off
title KD System - Kracked_Skills Agent
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║   Kracked_Skills Agent (KD) — Start System   ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: Check backend node_modules
if not exist "%~dp0backend\node_modules" (
    echo  [*] Installing backend dependencies...
    cd /d "%~dp0backend"
    npm install
    cd /d "%~dp0"
    echo  [OK] Backend dependencies installed!
    echo.
)

:: Check frontend node_modules
if not exist "%~dp0frontend\node_modules" (
    echo  [*] Installing frontend dependencies...
    cd /d "%~dp0frontend"
    npm install
    cd /d "%~dp0"
    echo  [OK] Frontend dependencies installed!
    echo.
)

:: Start Backend
echo  [*] Starting Backend API on port 4891...
cd /d "%~dp0backend"
start "KD-Backend" cmd /c "node server.js"
cd /d "%~dp0"
echo  [OK] Backend launched!
echo.

:: Start Frontend
echo  [*] Starting Frontend UI on port 4892...
cd /d "%~dp0frontend"
start "KD-Frontend" cmd /c "npm run dev"
cd /d "%~dp0"
echo  [OK] Frontend launched!
echo.

echo  ══════════════════════════════════════════════
echo   Backend:  http://localhost:4891/api/health
echo   Frontend: http://localhost:4892
echo  ══════════════════════════════════════════════
echo.
echo  Press any key to exit this window (services keep running)...
pause >nul
