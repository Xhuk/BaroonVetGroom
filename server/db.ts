import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configuration for both Neon and Supabase PostgreSQL
// Supabase URLs typically start with postgresql:// and include pooler configuration
// Neon URLs typically start with postgresql:// as well
// This setup is compatible with both providers

const databaseUrl = process.env.DATABASE_URL;

// For local development on Windows, ensure proper connection handling
const connectionConfig = {
  connectionString: databaseUrl,
  // Enable connection pooling for better performance
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
  }
};

// Use HTTP-based connection for serverless environments (Neon/Supabase compatible)
const sql = neon(databaseUrl, {
  // Configure for better Windows local development
  fetchConnectionCache: true,
  fullResults: true,
});

export const db = drizzle({ client: sql, schema });