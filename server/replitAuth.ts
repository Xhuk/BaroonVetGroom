import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 12 * 3600 * 1000 } // Cache for 12 hours instead of 1 hour
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiry on each request
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  // Local strategy for demo AND vanilla users
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      console.log('🔐 Local login attempt:', email);
      
      // Look up user's tenant type from the database
      let tenantType = null;
      let userType = '';
      
      // First, try to determine tenant type from database
      try {
        const userTenantInfo = await storage.getUserTenantInfo(email);
        if (userTenantInfo && userTenantInfo.tenantId) {
          // Demo tenants have IDs starting with "demo-"
          if (userTenantInfo.tenantId.startsWith('demo-')) {
            tenantType = 'demo';
            console.log(`📋 Database lookup: Demo tenant "${userTenantInfo.tenantId}" for:`, email);
          } else {
            tenantType = 'vanilla';
            console.log(`📋 Database lookup: Vanilla tenant "${userTenantInfo.tenantId}" for:`, email);
          }
        } else {
          throw new Error('No tenant found for user');
        }
      } catch (dbError) {
        console.error('Database lookup failed, using email pattern fallback:', dbError);
        // Fallback to email pattern matching
        const isDemoUser = email.includes('demo');
        const isVanillaUser = !isDemoUser && email.startsWith('admin@');
        
        if (isDemoUser) {
          tenantType = 'demo';
          console.log(`🔍 Email pattern fallback: Demo user detected for:`, email);
        } else if (isVanillaUser) {
          tenantType = 'vanilla';
          console.log(`🔍 Email pattern fallback: Vanilla user detected for:`, email);
        }
      }
      
      if (!tenantType || (tenantType !== 'demo' && tenantType !== 'vanilla')) {
        return done(null, false, { message: 'Only demo and vanilla tenant users can use local login' });
      }

      // Validate actual password against database for demo/vanilla users
      const storedUser = await storage.getUserByEmail(email);
      if (!storedUser) {
        console.log(`❌ User not found in database: ${email}`);
        return done(null, false, { message: 'User not found' });
      }
      
      console.log(`🔐 Password validation: provided="${password}" stored="${storedUser.password}"`);
      
      // Verify password against stored hash
      const isValidPassword = await storage.verifyPassword(password, storedUser.password);
      if (!isValidPassword) {
        console.log(`❌ Password mismatch for ${email}: provided="${password}" stored="${storedUser.password}"`);
        return done(null, false, { message: 'Invalid password' });
      }
      
      console.log(`✅ Password validated successfully for ${email}`);
      
      if (tenantType === 'demo') {
        userType = 'Demo';
      } else if (tenantType === 'vanilla') {
        userType = 'Vanilla Admin';
      }
      
      if (tenantType) {
        // Create a user object for local authentication
        const user = {
          isLocalUser: true,
          isDemoUser: tenantType === 'demo',
          isVanillaUser: tenantType === 'vanilla',
          tenantType: tenantType,
          claims: {
            sub: `local-${email.replace('@', '-').replace(/\./g, '-')}`,
            email: email,
            first_name: tenantType === 'demo'
              ? email.split('@')[0].split('.').map((s: string) => 
                  s.charAt(0).toUpperCase() + s.slice(1)
                ).join(' ')
              : 'Admin',
            last_name: tenantType === 'demo' ? 'Demo User' : 'Administrator'
          },
          expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        };
        
        console.log(`✅ ${userType} authentication successful:`, email);
        return done(null, user);
      } else {
        console.log(`❌ ${userType} authentication failed - invalid password:`, email);
        return done(null, false, { message: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('❌ Local authentication error:', error);
      return done(error);
    }
  }));

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Local login endpoint for demo and vanilla users
  app.post("/api/login-local", (req, res, next) => {
    console.log('🔑 Local login request received:', req.body.email);
    
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.error('Local auth error:', err);
        return res.status(500).json({ error: 'Authentication error' });
      }
      
      if (!user) {
        console.log('Local auth failed:', info?.message || 'Invalid credentials');
        return res.status(401).json({ error: info?.message || 'Invalid credentials' });
      }
      
      req.logIn(user, (loginErr: any) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return res.status(500).json({ error: 'Login failed' });
        }
        
        // Determine proper redirect based on user type and tenant
        let redirectUrl = '/';
        
        // For demo/vanilla users, redirect to their tenant dashboard
        if (user.isDemoUser || user.isVanillaUser) {
          // Try to find their tenant ID from the database
          storage.getUserTenantInfo(user.claims.email).then(tenantInfo => {
            if (tenantInfo && tenantInfo.tenantId) {
              console.log(`🎯 Redirecting ${user.isDemoUser ? 'demo' : 'vanilla'} user to tenant: ${tenantInfo.tenantId}`);
            }
          }).catch(err => {
            console.error('Error getting tenant info for redirect:', err);
          });
        }
        
        console.log('✅ Local login successful, redirecting to dashboard');
        res.json({ 
          success: true, 
          message: 'Login successful',
          user: {
            email: user.claims.email,
            name: `${user.claims.first_name} ${user.claims.last_name}`,
            isDemoUser: user.isDemoUser,
            isVanillaUser: user.isVanillaUser
          },
          redirect: redirectUrl
        });
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    // Clear session immediately without external redirect
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      
      // Destroy session
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error('Session destruction error:', sessionErr);
        }
        
        // Clear all cookies
        res.clearCookie('connect.sid', { path: '/' });
        res.clearCookie('session', { path: '/' });
        
        // Send HTML page that clears all client-side data and redirects to landing page
        res.setHeader('Content-Type', 'text/html');
        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Cerrando sesión...</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="display: flex; justify-content: center; align-items: center; height: 100vh;">
                <div style="text-align: center; color: white;">
                  <div style="margin-bottom: 30px; font-size: 24px; font-weight: 300;">Cerrando sesión...</div>
                  <div style="width: 50px; height: 50px; border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                  <div style="margin-top: 20px; font-size: 14px; opacity: 0.8;">Redirigiendo a la página principal</div>
                </div>
              </div>
              <style>
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
              <script>
                console.log('🚪 Clearing all authentication data...');
                
                // Clear all storage
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                  console.log('✅ Storage cleared');
                } catch (e) {
                  console.error('Storage clear error:', e);
                }
                
                // Set logout flag
                try {
                  localStorage.setItem('auth_logged_out', 'true');
                  console.log('✅ Logout flag set');
                } catch (e) {
                  console.error('Logout flag error:', e);
                }
                
                // Redirect to landing page
                setTimeout(() => {
                  console.log('🏠 Redirecting to landing page...');
                  window.location.replace('/');
                }, 2000);
              </script>
            </body>
          </html>
        `);
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Skip expensive token validation for fresh sessions (within 5 minutes)
  if (!user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  
  // Add a 5-minute buffer to avoid unnecessary refresh calls
  if (now <= (user.expires_at - 300)) {
    return next();
  }

  // Only refresh if token is actually expired (not just close to expiry)
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    // Use Promise.race to timeout slow refresh requests
    const refreshPromise = (async () => {
      const config = await getOidcConfig();
      return await client.refreshTokenGrant(config, refreshToken);
    })();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Token refresh timeout')), 5000)
    );
    
    const tokenResponse = await Promise.race([refreshPromise, timeoutPromise]) as any;
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    console.error('Token refresh failed:', error);
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
