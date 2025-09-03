@echo off
echo 🏥 Starting Veterinary Clinic Management SaaS on Windows
echo ============================================================

REM Set environment variables for Windows development
set NODE_ENV=development
set PORT=3000
set LOCAL_DEVELOPMENT=true
set REPLIT_DOMAINS=localhost:3000
set REPL_ID=local-development
set REPL_SLUG=veterinary-clinic-local
set REPL_OWNER=local-user
set CORS_ORIGIN=http://localhost:3000

echo ✅ Environment variables set for Windows development
echo 🚀 Starting server on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

REM Start the server with tsx
npx tsx server/index.ts

pause