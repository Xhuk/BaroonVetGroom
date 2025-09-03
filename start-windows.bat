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

REM TODO: Replace [YOUR-PASSWORD] with your actual Supabase password
set DATABASE_URL=postgresql://postgres.sssexhgbxkvqmddozvqv:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

echo ✅ Environment variables set for Windows development
echo 🚀 Starting server on http://localhost:3000
echo ✅ Server will bind to localhost (Windows compatible)
echo Press Ctrl+C to stop the server
echo.
echo 📋 First run checklist:
echo    1. Make sure you have your Supabase DATABASE_URL in .env
echo    2. Run: npm install (if not done already)
echo    3. Run: npm run db:push (to sync database schema)
echo.

REM Start the server with tsx
npx tsx server/index.ts

pause