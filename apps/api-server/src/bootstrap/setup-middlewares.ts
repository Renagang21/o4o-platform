/**
 * Middleware setup extracted from main.ts
 * WO-O4O-MAIN-TS-BOOTSTRAP-SPLIT-V1
 *
 * IMPORTANT: Middleware registration ORDER is critical.
 * Do NOT reorder any app.use() calls.
 */
import express, { Application } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import passport from '../config/passportDynamic.js';
import Redis from 'ioredis';

import { env } from '../utils/env-validator.js';
import logger from '../utils/logger.js';

import { performanceMonitor } from '../middleware/performanceMonitor.js';
import { securityMiddleware, sqlInjectionDetection } from '../middleware/securityMiddleware.js';
import { tenantContextEnhanced } from '../middleware/tenant-context.middleware.js';
import { prometheusMetrics } from '../services/prometheus-metrics.service.js';
import HttpMetricsService from '../middleware/metrics.middleware.js';
import { slowThresholdMiddleware } from '../middleware/slow-threshold.middleware.js';

// ESM equivalent of __dirname (for static file paths)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root: from dist/bootstrap/ → 4 levels up
const projectRoot = path.resolve(__dirname, '../../../../');

/**
 * Shared CORS origins — used by both Express CORS and Socket.IO
 */
export const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [];

  const devOrigins = [
    process.env.FRONTEND_URL || "http://localhost:3011",
    "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003",
    "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177",
  ];

  const ipOrigins = process.env.NODE_ENV !== 'production' ? [
    "http://13.125.144.8:3000", "http://13.125.144.8:3001", "http://13.125.144.8", "https://13.125.144.8",
  ] : [];

  const prodOrigins = [
    "https://neture.co.kr", "https://www.neture.co.kr", "https://admin.neture.co.kr", "https://dev-admin.neture.co.kr",
    "https://shop.neture.co.kr", "https://forum.neture.co.kr", "https://signage.neture.co.kr",
    "https://funding.neture.co.kr", "https://auth.neture.co.kr", "https://api.neture.co.kr",
    "https://glycopharm.co.kr", "https://www.glycopharm.co.kr",
    "https://glucoseview.co.kr", "https://www.glucoseview.co.kr",
    "https://kpa-society.co.kr", "https://www.kpa-society.co.kr",
    "https://k-cosmetics.site", "https://www.k-cosmetics.site",
    "https://siteguide.co.kr", "https://www.siteguide.co.kr",
    // Cloud Run service URLs (GCP asia-northeast3)
    "https://glycopharm-web-3e3aws7zqa-du.a.run.app",
    "https://neture-web-3e3aws7zqa-du.a.run.app",
    "https://glucoseview-web-3e3aws7zqa-du.a.run.app",
    "https://kpa-society-web-3e3aws7zqa-du.a.run.app",
    "https://k-cosmetics-web-3e3aws7zqa-du.a.run.app",
  ];

  return [...devOrigins, ...ipOrigins, ...prodOrigins, ...envOrigins];
};

/**
 * Setup all Express middlewares in correct order.
 *
 * Order:
 *   1. helmet (security headers)
 *   2. compression
 *   3. CORS
 *   4. Static file serving (/uploads)
 *   5. Performance monitor
 *   6. Security middleware + SQL injection detection
 *   7. Tenant context
 *   8. Cookie parser + body parsing
 *   9. Session (with optional Redis store)
 *  10. Passport initialization
 *  11. HTTP metrics + slow request threshold
 */
export function setupMiddlewares(app: Application, options: { redisEnabled: boolean }): void {
  // 1. Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "https:", "http:"],
        fontSrc: ["'self'", "data:", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https:", "http:"],
        frameSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }));

  // 2. Compression
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6,
  }) as any);

  // 3. CORS configuration (uses shared getAllowedOrigins function)
  const corsOptions: CorsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      const allowedOrigins = getAllowedOrigins();

      if (!origin) {
        callback(null, true);
        return;
      }

      if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_CORS === 'true') {
        logger.debug(`[CORS] Request from origin: ${origin}`);
        logger.debug(`[CORS] Allowed: ${allowedOrigins.includes(origin)}`);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`[CORS] Blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
  };

  app.use(cors(corsOptions));

  // 4. Static file serving
  const staticUploadsPath = path.join(projectRoot, 'public', 'uploads');

  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.header('Cache-Control', 'public, max-age=604800, immutable');
    next();
  });

  app.use('/uploads', express.static(staticUploadsPath, {
    maxAge: '7d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png') || filePath.endsWith('.gif') || filePath.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/' + filePath.split('.').pop());
      }
    }
  }));

  // Fallback uploads path
  const fallbackUploadsPath = path.join(projectRoot, 'apps', 'api-server', 'public', 'uploads');
  if (fallbackUploadsPath !== staticUploadsPath) {
    app.use('/uploads', express.static(fallbackUploadsPath, {
      maxAge: '7d',
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png') || filePath.endsWith('.gif') || filePath.endsWith('.webp')) {
          res.setHeader('Content-Type', 'image/' + filePath.split('.').pop());
        }
      }
    }));
  }

  // 5. Performance monitoring
  app.use(performanceMonitor as any);

  // 6. Security middleware
  app.use(securityMiddleware as any);
  app.use(sqlInjectionDetection as any);

  // 7. Tenant context middleware (Phase 6 - Multi-Tenancy)
  app.use(tenantContextEnhanced);

  // 8. Body parsing
  app.use(cookieParser() as any);
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 9. Session configuration
  let sessionConfig: any = {
    secret: env.getString('SESSION_SECRET', 'o4o-platform-session-secret'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.isProduction(),
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      domain: env.getString('COOKIE_DOMAIN', undefined),
      sameSite: 'lax'
    }
  };

  // Use Redis store conditionally (production + REDIS_ENABLED)
  if (options.redisEnabled) {
    try {
      const sessionRedisClient = new Redis({
        host: env.getString('REDIS_HOST', 'localhost'),
        port: env.getNumber('REDIS_PORT', 6379),
        password: env.getString('REDIS_PASSWORD', undefined),
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000
      });

      sessionConfig.store = new RedisStore({
        client: sessionRedisClient,
        prefix: 'sess:'
      });

      logger.info('Redis session store configured');
    } catch (redisError) {
      logger.warn('Redis session store configuration failed, using memory store:', redisError);
    }
  } else {
    logger.info('Redis disabled, using memory session store');
  }

  // Session middleware for passport (required for OAuth)
  app.use(session(sessionConfig) as any);

  // 10. Initialize passport
  app.use(passport.initialize() as any);

  // 11. HTTP Metrics
  const httpMetrics = HttpMetricsService.getInstance(prometheusMetrics.registry);
  app.use(httpMetrics.middleware());

  // 12. Slow request threshold logging — WO-O4O-INTERNAL-BETA-ROLL-OUT-V1
  app.use(slowThresholdMiddleware);
}
