Write-Host "===================================================" -ForegroundColor Magenta
Write-Host "  AGRI-SYNAPSE: Smart Agriculture IoT Dashboard" -ForegroundColor Red
Write-Host "===================================================" -ForegroundColor White
Write-Host "Launching server on http://localhost:3000..." -ForegroundColor Green
Start-Process "http://localhost:3000"
node server.js
