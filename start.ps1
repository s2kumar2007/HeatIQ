# start.ps1 — Start both HeatIQ services together for local development/demo

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " HeatIQ — Starting both services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend  -> http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Frontend -> http://localhost:3000" -ForegroundColor Green
Write-Host ""

# Activate virtualenv if present (optional, usually uvicorn in .venv/Scripts/uvicorn works)
$UvicornCmd = "uvicorn"
if (Test-Path ".venv\Scripts\uvicorn.exe") {
    $UvicornCmd = ".\.venv\Scripts\uvicorn.exe"
}

Write-Host "Starting FastAPI backend..." -ForegroundColor Yellow
$BackendProcess = Start-Process -NoNewWindow -PassThru -FilePath $UvicornCmd -ArgumentList "app.main:app","--host","127.0.0.1","--port","8000"

Write-Host "Starting React frontend..." -ForegroundColor Yellow
$FrontendProcess = Start-Process -NoNewWindow -PassThru -FilePath "npm.cmd" -ArgumentList "run","dev","--prefix","frontend"

Write-Host ""
Write-Host "Both services started." -ForegroundColor Green
Write-Host "  Backend PID:  $($BackendProcess.Id)"
Write-Host "  Frontend PID: $($FrontendProcess.Id)"
Write-Host ""
Write-Host "Press Ctrl+C to stop both." -ForegroundColor Yellow

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`nStopping services..." -ForegroundColor Yellow
    if ($BackendProcess -and -not $BackendProcess.HasExited) {
        Stop-Process -Id $BackendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($FrontendProcess -and -not $FrontendProcess.HasExited) {
        Stop-Process -Id $FrontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "Done." -ForegroundColor Green
}
