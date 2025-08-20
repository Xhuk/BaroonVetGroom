import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { getUserInfo } from "@replit/repl-auth";
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

// Official Replit authentication middleware for development mode
app.use(async (req: any, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment && req.path === '/api/user') {
    console.log('🔐 Starting Replit Auth Check...');
    try {
      // Use official Replit getUserInfo
      const userInfo = await getUserInfo(req);
      console.log('🔐 getUserInfo result:', userInfo);
      if (userInfo) {
        // Set up user object in Replit's expected format
        req.user = {
          claims: {
            sub: userInfo.id,
            name: userInfo.name
          }
        };
        console.log('🔐 Replit Auth Success:', { id: userInfo.id, name: userInfo.name });
      } else {
        console.log('🔐 No user info returned');
      }
    } catch (error: any) {
      console.log('🔐 Replit Auth Error:', error.message || error);
      // Continue without auth - let the app handle it
    }
  } else if (isDevelopment && !req.user) {
    // For non-user endpoints, try auth without logging
    try {
      const userInfo = await getUserInfo(req);
      if (userInfo) {
        req.user = {
          claims: {
            sub: userInfo.id,
            name: userInfo.name
          }
        };
      }
    } catch (error) {
      // Silent fail for non-user endpoints
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
