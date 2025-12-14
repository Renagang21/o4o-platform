// MUST be first: Load environment variables before anything else
import './env-loader.js';

// Initialize OpenTelemetry before any other imports
import { initTelemetry } from './utils/telemetry.js';
const telemetrySDK = initTelemetry();

import 'reflect-metadata';
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
import passport, { initializePassport } from './config/passportDynamic.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Environment variables are loaded by env-loader (imported first)
// Environment validation
import { env } from './utils/env-validator.js';
import logger from './utils/logger.js';

// Middleware
import { performanceMonitor } from './middleware/performanceMonitor.js';
import { securityMiddleware, sqlInjectionDetection } from './middleware/securityMiddleware.js';
import { tenantContextEnhanced } from './middleware/tenant-context.middleware.js';

// Services
import { startupService } from './services/startup.service.js';
import { SessionSyncService } from './services/sessionSyncService.js';
import { WebSocketSessionSync } from './websocket/sessionSync.js';

// Configuration
// setupRoutes removed - legacy routes.config.js deleted
import { setupSwagger } from './config/swagger-enhanced.js';

// Module Loader (Phase 5 — AppStore + Module Loader)
import { moduleLoader } from './modules/module-loader.js';
import { AppDataSource } from './database/connection.js';

// AppStore Routes
import appstoreRoutes from './routes/appstore.routes.js';

// Navigation Routes (Phase P0 Task A - Dynamic Navigation)
import navigationRoutes from './routes/navigation.routes.js';

// Service Provisioning Routes (Phase 7)
import serviceProvisioningRoutes from './routes/service-provisioning.routes.js';

// Service Admin Routes (Phase 8)
import serviceAdminRoutes from './routes/service-admin.routes.js';

// Public Routes (no auth required)
import publicRoutes from './routes/public.routes.js';

// User Role Routes
import userRoleRoutes from './routes/user-role.routes.js';

// NOTE: authRoutes, adminAppsRoutes, forumRoutes are imported in CORE ROUTES SETUP section below

// Linked Accounts Routes (SSO check, sessions)
import linkedAccountsRoutes from './routes/linked-accounts.js';

// Service Template Registry (Phase 7)
import { templateRegistry } from './service-templates/template-registry.js';

// Init Pack Registry (Phase 8)
import { initPackRegistry } from './service-templates/init-pack-registry.js';

const app: Application = express();

// IMPORTANT: Set trust proxy for nginx reverse proxy
app.set('trust proxy', true);

const httpServer = createServer(app);
const port = env.getNumber('PORT', 4000);

// ============================================================================
// SOCKET.IO CONFIGURATION
// ============================================================================
const io = new Server(httpServer, {
  cors: {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      const allowedOrigins = [
        process.env.FRONTEND_URL || "http://localhost:3011",
        "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003",
        "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177",
        "http://13.125.144.8:3000", "http://13.125.144.8:3001", "http://13.125.144.8", "https://13.125.144.8",
        "https://neture.co.kr", "https://www.neture.co.kr", "https://admin.neture.co.kr", "https://dev-admin.neture.co.kr", "http://admin.neture.co.kr",
        "https://shop.neture.co.kr", "https://forum.neture.co.kr", "https://signage.neture.co.kr",
        "https://funding.neture.co.kr", "https://auth.neture.co.kr", "https://api.neture.co.kr", "http://api.neture.co.kr"
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  socket.on('join_admin', () => {
    socket.join('admin_notifications');
  });

  socket.on('new_user_registered', (data) => {
    io.to('admin_notifications').emit('new_registration', {
      message: '새로운 사용자가 등록되었습니다.',
      user: data,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    // Handle disconnect
  });
});

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

// Security headers
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

// Compression
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
}) as any);

// CORS configuration
const corsOptions: CorsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o: any) => o.trim()) : [];

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
    ];

    const allowedOrigins = [...devOrigins, ...ipOrigins, ...prodOrigins, ...envOrigins];

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
app.options('*', cors(corsOptions));

// Static file serving
const projectRoot = path.resolve(__dirname, '../../../');
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
  setHeaders: (res, path) => {
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif') || path.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/' + path.split('.').pop());
    }
  }
}));

// Fallback uploads path
const fallbackUploadsPath = path.join(__dirname, '../public', 'uploads');
if (fallbackUploadsPath !== staticUploadsPath) {
  app.use('/uploads', express.static(fallbackUploadsPath, {
    maxAge: '7d',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.gif') || path.endsWith('.webp')) {
        res.setHeader('Content-Type', 'image/' + path.split('.').pop());
      }
    }
  }));
}

// Performance monitoring
app.use(performanceMonitor as any);

// Security middleware
app.use(securityMiddleware as any);
app.use(sqlInjectionDetection as any);

// Tenant context middleware (Phase 6 - Multi-Tenancy)
// Extracts tenant ID from headers/subdomain and service group
app.use(tenantContextEnhanced);

// Body parsing
app.use(cookieParser() as any);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
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
const redisEnabled = env.getString('REDIS_ENABLED', 'false') !== 'false' && env.isProduction();

if (redisEnabled) {
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

// Initialize passport
app.use(passport.initialize() as any);

// ============================================================================
// METRICS MIDDLEWARE
// ============================================================================
import { prometheusMetrics } from './services/prometheus-metrics.service.js';
import HttpMetricsService from './middleware/metrics.middleware.js';

const httpMetrics = HttpMetricsService.getInstance(prometheusMetrics.registry);
app.use(httpMetrics.middleware());

// ============================================================================
// CORE ROUTES SETUP (Phase 8-4 - Core Routes Registration)
// ============================================================================
// Core routes are registered here, while dynamic app routes are registered via module loader
import authRoutes from './modules/auth/routes/auth.routes.js';
import cmsRoutes from './modules/cms/routes/cms.routes.js';
import lmsRoutes from './modules/lms/routes/lms.routes.js';
import usersRoutes from './routes/users.routes.js';
import cptRoutes from './routes/cpt.js';
import healthRoutes from './routes/health.js';
import forumRoutes from './routes/forum/forum.routes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import adminAppsRoutes from './routes/admin/apps.routes.js';
import serviceMonitorRoutes from './routes/service-monitor.routes.js';

// Register core API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);  // Legacy path for backward compatibility
app.use('/api/v1/cms', cmsRoutes);
app.use('/api/v1/lms', lmsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/cpt', cptRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/v1/forum', forumRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/admin/apps', adminAppsRoutes);
app.use('/api/v1/service/monitor', serviceMonitorRoutes);

logger.info('✅ Core API routes registered');

// ============================================================================
// SWAGGER DOCUMENTATION
// ============================================================================
logger.info('Setting up Swagger documentation...');
try {
  setupSwagger(app);
  logger.info('Swagger documentation setup completed');
} catch (swaggerError) {
  logger.error('Swagger setup failed:', swaggerError);
}

// ============================================================================
// SERVER STARTUP
// ============================================================================
const startServer = async () => {
  logger.info('Starting server...');

  // Validate payment configuration (Phase PG-1)
  try {
    const { validatePaymentConfig } = await import('./config/payment.config.js');
    validatePaymentConfig();
  } catch (paymentConfigError) {
    logger.warn('Payment config validation skipped:', paymentConfigError);
  }

  // Initialize CPT Registry (Phase 5)
  try {
    const { initializeCPT } = await import('./init/cpt.init.js');
    await initializeCPT();
  } catch (cptError) {
    logger.error('CPT Registry initialization failed:', cptError);
    // Continue server startup even if CPT init fails
  }

  // Initialize all services (including database)
  try {
    await startupService.initialize();
  } catch (error) {
    logger.error('Service initialization failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  // Channel Connectors removed - legacy commerce system (Phase 8-3)

  // Initialize dynamic Passport strategies (AFTER database is initialized)
  try {
    await initializePassport();
    logger.info('✅ Dynamic Passport strategies initialized');
  } catch (passportError) {
    logger.error('Failed to initialize Passport strategies:', passportError);
  }

  // ============================================================================
  // MODULE LOADER — Load and Activate Apps (Phase 5)
  // ============================================================================
  logger.info('📦 Loading app modules...');
  try {
    // 1. Scan workspace and load all app manifests
    await moduleLoader.loadAll();
    const loadedModules = Array.from(moduleLoader.getRegistry().keys());
    logger.info(`✅ Loaded ${loadedModules.length} app modules: ${loadedModules.join(', ')}`);

    // 2. Activate all modules (with dependency resolution)
    let activatedCount = 0;
    for (const moduleId of loadedModules) {
      try {
        await moduleLoader.activateModule(moduleId);
        activatedCount++;
      } catch (activationError) {
        logger.error(`Failed to activate module ${moduleId}:`, activationError);
      }
    }
    logger.info(`✅ Activated ${activatedCount}/${loadedModules.length} modules`);

    // 3. Register dynamic routes from activated modules
    const routesRegistered: string[] = [];
    for (const moduleId of loadedModules) {
      const router = moduleLoader.getModuleRouter(moduleId, AppDataSource);
      if (router) {
        const basePath = `/api/v1/${moduleId}`;
        app.use(basePath, router);
        routesRegistered.push(`${basePath} → ${moduleId}`);
      }
    }
    logger.info(`✅ Registered ${routesRegistered.length} dynamic routes:`);
    routesRegistered.forEach(route => logger.info(`   - ${route}`));

    // 4. Register AppStore routes for app lifecycle management
    app.use('/api/v1/appstore', appstoreRoutes);
    logger.info('✅ AppStore routes registered at /api/v1/appstore');

    // 4.1 Register Navigation routes (Phase P0 Task A - Dynamic Navigation)
    app.use('/api/v1/navigation', navigationRoutes);
    logger.info('✅ Navigation routes registered at /api/v1/navigation');

    // 5. Load Service Templates and register provisioning routes (Phase 7)
    try {
      await templateRegistry.loadAll();
      app.use('/api/v1/service', serviceProvisioningRoutes);
      logger.info(`✅ Service Templates loaded: ${templateRegistry.getStats().total} templates`);
      logger.info('✅ Service Provisioning routes registered at /api/v1/service');
    } catch (templateError) {
      logger.error('Service Template loading failed:', templateError);
    }

    // 6. Load Init Packs (Phase 8 - Service Environment Initialization)
    try {
      await initPackRegistry.loadAll();
      logger.info(`✅ Init Packs loaded: ${initPackRegistry.getStats().total} packs`);
    } catch (initPackError) {
      logger.error('Init Pack loading failed:', initPackError);
    }

    // 7. Register Service Admin routes (Phase 8)
    app.use('/api/v1/service-admin', serviceAdminRoutes);
    logger.info('✅ Service Admin routes registered at /api/v1/service-admin');

    // 8. Register Public routes (no auth required)
    app.use('/api/v1/public', publicRoutes);
    logger.info('✅ Public routes registered at /api/v1/public');

    // 9. Register User Role routes
    app.use('/api/v1/userRole', userRoleRoutes);
    logger.info('✅ User Role routes registered at /api/v1/userRole');

    // 10. Register Auth routes
    app.use('/api/auth', authRoutes);
    logger.info('✅ Auth routes registered at /api/auth');

    // 11. Register Admin Apps routes (v1 prefix for auth-client compatibility)
    app.use('/api/v1/admin/apps', adminAppsRoutes);
    logger.info('✅ Admin Apps routes registered at /api/v1/admin/apps');

    // 12. Register Forum routes (Phase 17 - AI Recommendations)
    app.use('/api/v1/forum', forumRoutes);
    logger.info('✅ Forum routes registered at /api/v1/forum');

    // 13. Register Linked Accounts routes (SSO check, sessions)
    app.use('/api/accounts', linkedAccountsRoutes);
    logger.info('✅ Linked Accounts routes registered at /api/accounts');

    // 6. Core routes now registered via dynamic module loader
    // setupRoutes removed - legacy routes.config.js deleted
    logger.info('✅ Routes registered via module loader');

    // 7. Get all entities from modules (for future TypeORM integration)
    const moduleEntities = moduleLoader.getAllEntities();
    if (moduleEntities.length > 0) {
      logger.info(`📊 Collected ${moduleEntities.length} entities from modules`);
    }

  } catch (moduleLoaderError) {
    logger.error('Module Loader initialization failed:', moduleLoaderError);
    // Continue server startup even if module loading fails
  }

  // Initialize Redis for session sync (if enabled)
  let webSocketSessionSync: WebSocketSessionSync | null = null;

  if (redisEnabled) {
    try {
      logger.info('Initializing Redis connection...');

      const redisClient = new Redis({
        host: env.getString('REDIS_HOST', 'localhost'),
        port: env.getNumber('REDIS_PORT', 6379),
        password: env.getString('REDIS_PASSWORD', undefined),
        lazyConnect: true,
        maxRetriesPerRequest: 3,
        connectTimeout: 5000
      });

      redisClient.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      redisClient.on('error', (err) => {
        logger.warn('Redis connection error (non-critical):', err);
      });

      SessionSyncService.initialize(redisClient);

      if (env.getString('SESSION_SYNC_ENABLED', 'false') === 'true') {
        webSocketSessionSync = new WebSocketSessionSync(io);
        logger.info('WebSocket session sync initialized');
      }

      logger.info('Redis initialization completed');
    } catch (redisError) {
      logger.warn('Redis initialization failed (non-critical), continuing without Redis:', redisError);
    }
  } else {
    logger.info('Redis disabled, skipping Redis initialization');
  }

  // Start server
  const host = env.getString('HOST', '0.0.0.0');
  httpServer.listen(port as number, host as string, () => {
    logger.info(`🚀 API Server running on ${host}:${port}`);
  });
};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await startupService.shutdown();
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await startupService.shutdown();
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Export services for other modules
// NOTE: RealtimeFeedbackService removed in v1 - beta feature deprecated
export { io };
