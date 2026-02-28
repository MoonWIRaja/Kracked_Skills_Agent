# KD System - Kracked_Skills Agent Start Script (PowerShell)
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║   Kracked_Skills Agent (KD) — Start System   ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Check backend node_modules
if (-not (Test-Path "$root\backend\node_modules")) {
    Write-Host "  [*] Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location "$root\backend"
    npm install
    Pop-Location
    Write-Host "  [OK] Backend dependencies installed!" -ForegroundColor Green
    Write-Host ""
}

# Check frontend node_modules
if (-not (Test-Path "$root\frontend\node_modules")) {
    Write-Host "  [*] Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location "$root\frontend"
    npm install
    Pop-Location
    Write-Host "  [OK] Frontend dependencies installed!" -ForegroundColor Green
    Write-Host ""
}

# Start Backend
Write-Host "  [*] Starting Backend API on port 4891..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/c cd /d `"$root\backend`" && node server.js" -WindowStyle Normal
Write-Host "  [OK] Backend launched!" -ForegroundColor Green
Write-Host ""

# Start Frontend
Write-Host "  [*] Starting Frontend UI on port 4892..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/c cd /d `"$root\frontend`" && npm run dev" -WindowStyle Normal
Write-Host "  [OK] Frontend launched!" -ForegroundColor Green

Write-Host ""
Write-Host "  ══════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host "   Backend:  " -NoNewline; Write-Host "http://localhost:4891/api/health" -ForegroundColor Blue
Write-Host "   Frontend: " -NoNewline; Write-Host "http://localhost:4892" -ForegroundColor Blue
Write-Host "  ══════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Services are running in separate windows." -ForegroundColor Gray
