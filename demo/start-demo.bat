@echo off
echo 🗺️ Starting MapTiler Demo Server
echo ===================================
echo.
echo This will serve the demo map on a simple HTTP server
echo No database, authentication, or complex setup needed!
echo.
echo Starting server on http://localhost:8080
echo Press Ctrl+C to stop
echo.

REM Start a simple Python HTTP server
python -m http.server 8080

pause