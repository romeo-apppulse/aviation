import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

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
  { maxAge: 3600 * 1000 }
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

  // Get domains from environment variable and ensure we include the current domain
  const envDomains = process.env.REPLIT_DOMAINS!.split(",").map(d => d.trim());
  
  // Add common deployment domains that might not be in REPLIT_DOMAINS
  const allDomains = new Set([
    ...envDomains,
    'portal.aviationape.com',
    'localhost:5000',
    'localhost'
  ]);

  const domains = Array.from(allDomains);
  console.log('Setting up auth strategies for domains:', domains);

  for (const domain of domains) {
    try {
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
      console.log(`Registered auth strategy for domain: ${domain}`);
    } catch (error) {
      console.error(`Failed to register auth strategy for domain ${domain}:`, error);
    }
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    const hostname = req.hostname;
    const strategyName = `replitauth:${hostname}`;
    
    // Check if strategy exists, if not, log available strategies
    const strategies = (passport as any)._strategies || {};
    if (!strategies[strategyName]) {
      console.error(`Strategy ${strategyName} not found. Available strategies:`, Object.keys(strategies));
      console.error(`Request hostname: ${hostname}, REPLIT_DOMAINS: ${process.env.REPLIT_DOMAINS}`);
      
      // Try to find the first available replitauth strategy as fallback
      const availableStrategies = Object.keys(strategies);
      const fallbackStrategy = availableStrategies.find(name => name.startsWith('replitauth:'));
      
      if (fallbackStrategy) {
        console.log(`Using fallback strategy: ${fallbackStrategy}`);
        return passport.authenticate(fallbackStrategy, {
          prompt: "login consent",
          scope: ["openid", "email", "profile", "offline_access"],
        })(req, res, next);
      } else {
        return res.status(500).json({ 
          message: `No authentication strategy found for domain: ${hostname}`,
          available: availableStrategies 
        });
      }
    }
    
    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    const hostname = req.hostname;
    const strategyName = `replitauth:${hostname}`;
    
    // Check if strategy exists, if not, use fallback
    const strategies = (passport as any)._strategies || {};
    if (!strategies[strategyName]) {
      const availableStrategies = Object.keys(strategies);
      const fallbackStrategy = availableStrategies.find(name => name.startsWith('replitauth:'));
      
      if (fallbackStrategy) {
        return passport.authenticate(fallbackStrategy, {
          successReturnToOrRedirect: "/",
          failureRedirect: "/api/login",
        })(req, res, next);
      } else {
        return res.status(500).json({ message: `No callback strategy found for domain: ${hostname}` });
      }
    }
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Check if user is approved
    const dbUser = await storage.getUser(user.claims.sub);
    if (!dbUser || dbUser.status !== 'approved') {
      return res.status(403).json({ message: "Account pending approval", status: dbUser?.status || 'pending' });
    }
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    
    // Check if user is approved after token refresh
    const dbUser = await storage.getUser(user.claims.sub);
    if (!dbUser || dbUser.status !== 'approved') {
      return res.status(403).json({ message: "Account pending approval", status: dbUser?.status || 'pending' });
    }
    
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  if (!user || !user.claims) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const dbUser = await storage.getUser(user.claims.sub);
  if (!dbUser || (dbUser.role !== 'admin' && dbUser.role !== 'super_admin')) {
    return res.status(403).json({ message: "Admin access required" });
  }

  return next();
};

export const isSuperAdmin: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  if (!user || !user.claims) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const dbUser = await storage.getUser(user.claims.sub);
  if (!dbUser || dbUser.role !== 'super_admin') {
    return res.status(403).json({ message: "Super admin access required" });
  }

  return next();
};