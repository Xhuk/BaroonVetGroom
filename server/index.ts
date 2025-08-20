import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { webhookMonitor } from "./webhookMonitor";
import { deliveryMonitor } from "./deliveryMonitor";
import { scalableAppointmentService } from './scalableAppointmentService';
import { reservationCleanup } from "./reservationCleanup";
// Removed autoStatusService - now using database cron functions

// Extend session data type
declare module 'express-session' {
  interface SessionData {
    isAuthenticated?: boolean;
    userId?: string;
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration for email/password authentication (using in-memory store to avoid conflicts)
app.use(session({
  secret: process.env.SESSION_SECRET || 'vetclinic-default-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Replit authentication middleware for development mode
app.use((req: any, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // Try to get Replit user from headers
    const replitUserId = req.get('X-Replit-User-Id');
    const replitUserName = req.get('X-Replit-User-Name');
    
    // Also check environment variables that Replit might provide
    const replitEnvUserId = process.env.REPL_OWNER;
    const replitSlug = process.env.REPL_SLUG;
    
    // Debug logging for auth setup
    if (req.path === '/api/user') {
      console.log('🔐 Auth Debug:', {
        headers: {
          userId: replitUserId,
          userName: replitUserName,
        },
        env: {
          owner: replitEnvUserId,
          slug: replitSlug,
          nodeEnv: process.env.NODE_ENV
        },
        session: req.session?.isAuthenticated
      });
    }
    
    if (replitUserId && replitUserName) {
      // Set up user object similar to Replit's expected format
      req.user = {
        claims: {
          sub: replitUserId,
          name: replitUserName
        }
      };
    } else if (replitEnvUserId) {
      // Fallback to environment-based auth
      req.user = {
        claims: {
          sub: replitEnvUserId,
          name: replitEnvUserId
        }
      };
    }
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Initialize WebSocket service for scalable appointment updates
  scalableAppointmentService.initializeWebSocketServer(server);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start webhook monitoring service
    webhookMonitor.start();
    log('Webhook monitoring service started');

    // Start delivery monitoring service
    deliveryMonitor.start();
    log('Delivery monitoring service started');

    // Start reservation cleanup service
    reservationCleanup.start();
    log('Reservation cleanup service started');

    // Start subscription email scheduler
    import('./subscriptionEmailScheduler').then(({ subscriptionEmailScheduler }) => {
      subscriptionEmailScheduler.start();
      log('Subscription email scheduler started');
    });

    // Start follow-up auto-generator
    import('./followUpAutoGenerator').then(async ({ followUpAutoGenerator }) => {
      await followUpAutoGenerator.start();
      log('Follow-up auto-generator service started');
    });

    // Auto status updates now handled by database functions
    log('Database auto-status functions ready');
    
    // Log WebSocket service stats
    const wsStats = scalableAppointmentService.getConnectionStats();
    log(`WebSocket service ready - ${wsStats.totalConnections} connections across ${wsStats.totalTenants} tenants`);
  });
})();
