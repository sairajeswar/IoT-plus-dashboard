@echo off
title AGRI-SYNAPSE IoT Dashboard Launcher
echo ===================================================
echo   AGRI-SYNAPSE: Smart Agriculture IoT Dashboard
echo ===================================================
echo [1/2] Launching server on http://localhost:3000 ...
start "" http://localhost:3000
node server.js
pause
