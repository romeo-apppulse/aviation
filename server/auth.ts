import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import bcrypt from "bcrypt";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import type { User } from "@shared/schema";

const SALT_ROUNDS = 12;

export function getSession() {
  const sessionSecret = process.env.SESSION_SECRET;
  
  // In production, require a strong SESSION_SECRET
  if (process.env.NODE_ENV === "production") {
    if (!sessionSecret || sessionSecret.length < 32) {
      throw new Error("SESSION_SECRET must be at least 32 characters in production");
    }
  } else if (!sessionSecret || sessionSecret.length < 32) {
    console.warn("⚠️  WARNING: Using default SESSION_SECRET (INSECURE - set SESSION_SECRET in production!)");
  }

  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: sessionSecret || "aviation-ape-dev-secret-CHANGE-IN-PRODUCTION-12345678",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          const normalizedEmail = email.toLowerCase().trim();
          const user = await storage.getUserByEmail(normalizedEmail);

          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValid = await verifyPassword(password, user.passwordHash);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (user.status !== "approved") {
            return done(null, false, { 
              message: user.status === "pending" 
                ? "Your account is pending approval" 
                : "Your account has been blocked" 
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as User;
  if (user.status !== "approved") {
    return res.status(403).json({ 
      message: "Account pending approval", 
      status: user.status 
    });
  }

  return next();
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as User;
  if (user.role !== "admin" && user.role !== "super_admin") {
    return res.status(403).json({ message: "Admin access required" });
  }

  return next();
};

export const isSuperAdmin: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as User;
  if (user.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin access required" });
  }

  return next();
};
