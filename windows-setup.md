# Windows Development Setup Guide
## Veterinary Clinic Management SaaS

This guide will help you set up the application for local development on Windows to avoid CORS issues experienced in cloud environments.

## Prerequisites

### Required Software
1. **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)
2. **Python 3.8+**: Download from [python.org](https://python.org/)
3. **Git**: Download from [git-scm.com](https://git-scm.com/)
4. **Supabase CLI** (optional): `npm install -g supabase`

### Database Options
Choose one of the following database options:

#### Option A: Supabase Cloud (Recommended)
1. Create account at [supabase.com](https://supabase.com/)
2. Create a new project
3. Go to Settings > Database > Connection string
4. Copy the URI (Transaction mode recommended)
5. Replace `[YOUR-PASSWORD]` with your database password

#### Option B: Local PostgreSQL
1. Install PostgreSQL from [postgresql.org](https://www.postgresql.org/)
2. Create a database for the application
3. Use connection string: `postgresql://username:password@localhost:5432/database_name`

## Quick Start

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd veterinary-clinic-saas
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Run the Python setup script which will guide you through configuration:
```bash
python start.py
```

Or manually create a `.env` file:
```env
# Database Configuration
DATABASE_URL=your_supabase_or_postgresql_url_here

# Development Settings
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:5000

# API Keys (optional)
MAPTILER_API_KEY=your_maptiler_key_here
RESEND_API_KEY=your_resend_key_here
```

### 4. Database Setup
Push the database schema:
```bash
npm run db:push
```

### 5. Start Development Server
Using the Python script (recommended):
```bash
python start.py
```

Or manually:
```bash
npm run dev
```

The application will be available at: `http://localhost:5000`

## Supabase Edge Functions (Optional)

If you want to use Supabase Edge Functions for additional CORS handling:

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Link Your Project
```bash
supabase link --project-ref your-project-reference
```

### 4. Deploy Edge Functions
```bash
supabase functions deploy api-proxy
```

### 5. Set Environment Variables
```bash
supabase secrets set MAPTILER_API_KEY=your_api_key_here
```

## Troubleshooting

### Common Issues

#### CORS Errors
- The application includes a built-in tile proxy to handle CORS issues
- Supabase Edge Functions provide additional CORS handling
- Ensure your browser isn't blocking requests

#### Database Connection Issues
- Verify your DATABASE_URL is correct
- For Supabase, ensure you're using the pooler URL (recommended for serverless)
- Check firewall settings if using local PostgreSQL

#### Node.js/npm Issues
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Use Node.js version 18+ (check with `node --version`)

#### Python Script Issues
- Ensure Python 3.8+ is installed: `python --version`
- Install required packages if missing: `pip install requests`

### Performance Tips
- Use SSD storage for better database performance
- Ensure adequate RAM (8GB+ recommended)
- Close unnecessary applications while developing

### Development Workflow
1. Make code changes
2. The development server automatically reloads
3. Test in browser at `http://localhost:5000`
4. Use browser developer tools for debugging

## Features Included

### MapTiler Integration
- Automatic fallback to OpenStreetMap on API failures
- Built-in tile proxy to bypass CORS restrictions
- Multiple map styles (Streets, Basic, Satellite, Topo)

### Database Features
- Full PostgreSQL schema with Drizzle ORM
- Compatible with both Supabase and local PostgreSQL
- Automatic schema migration support

### Development Tools
- Hot reload for both frontend and backend
- TypeScript support with type checking
- Cross-platform environment variable handling
- Comprehensive error handling and logging

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [MapTiler API Documentation](https://docs.maptiler.com/)
- [Node.js Documentation](https://nodejs.org/docs/)

## Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure database connectivity
4. Check that all required ports are available (5000 for the app)

Happy coding! 🚀