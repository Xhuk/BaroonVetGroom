@echo off
echo 🗺️ Starting Vite MapTiler Demo
echo ===================================
echo.
echo React + TypeScript + Vite + MapTiler demo
echo Using same tech stack as main application
echo.
echo Installing dependencies first...
echo.

cd /d "%~dp0"
call npm install

echo.
echo Starting Vite dev server on http://localhost:8080
echo Press Ctrl+C to stop
echo.

call npm run dev

pause