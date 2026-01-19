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

// Routes API (Phase P0 Task B - Dynamic Routing)
import routesRoutes from './routes/routes.routes.js';

// Service Provisioning Routes (Phase 7)
import serviceProvisioningRoutes from './routes/service-provisioning.routes.js';

// Service Admin Routes (Phase 8)
import serviceAdminRoutes from './routes/service-admin.routes.js';

// Public Routes (no auth required)
import publicRoutes from './routes/public.routes.js';

// SiteGuide Routes (independent service - siteguide.co.kr)
// WO-SITEGUIDE-CORE-EXECUTION-V1: 새로운 모듈 기반 라우터
import { createSiteGuideRoutes } from './routes/siteguide/index.js';

// SiteGuide Entities (for DataSource registration)
import {
  SiteGuideBusiness,
  SiteGuideApiKey,
  SiteGuideUsageSummary,
  SiteGuideExecutionLog,
} from './routes/siteguide/entities/index.js';

// User Role Routes
import userRoleRoutes from './routes/user-role.routes.js';

// Organization Routes (Phase R3.5: Organization Core Absorption)
import organizationRoutes from './routes/organization.routes.js';

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

// CLOUD RUN PORT CONFIGURATION
// Cloud Run injects PORT=8080 - read directly from process.env for reliability
// Do NOT use env wrapper which may have timing/proxy issues
const port = Number(process.env.PORT) || 8080;
logger.info(`[STARTUP] PORT configuration: process.env.PORT=${process.env.PORT}, resolved port=${port}`);

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
        "https://funding.neture.co.kr", "https://auth.neture.co.kr", "https://api.neture.co.kr", "http://api.neture.co.kr",
        "https://glycopharm.co.kr", "https://www.glycopharm.co.kr",
        "https://glucoseview.co.kr", "https://www.glucoseview.co.kr",
        "https://kpa-society.co.kr", "https://www.kpa-society.co.kr",
        "https://k-cosmetics.site", "https://www.k-cosmetics.site"
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
// IMMEDIATE HEALTH ENDPOINT - CLOUD RUN STARTUP PROBE
// ============================================================================
// This endpoint MUST respond immediately without any DB or heavy dependencies
// Cloud Run requires container to listen on PORT within startup timeout
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    port: port,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '0.5.0'
  });
});

// Alias for /health - also required by some load balancers
app.get('/', (req, res, next) => {
  // Allow root path health check for Cloud Run startup probe
  if (req.headers['user-agent']?.includes('GoogleHC') || req.query.health === 'true') {
    return res.status(200).json({ status: 'alive', port: port });
  }
  next();
});

logger.info(`[STARTUP] Immediate health endpoint registered on port ${port}`);

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
      "https://glycopharm.co.kr", "https://www.glycopharm.co.kr",
      "https://glucoseview.co.kr", "https://www.glucoseview.co.kr",
      "https://kpa-society.co.kr", "https://www.kpa-society.co.kr",
      "https://k-cosmetics.site", "https://www.k-cosmetics.site",
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
// CMS routes - REMOVED (Phase R1: Domain separation)
// import cmsRoutes from './modules/cms/routes/cms.routes.js';
// LMS routes - REMOVED (Phase R1: Domain separation)
// import lmsRoutes from './modules/lms/routes/lms.routes.js';
import usersRoutes from './routes/users.routes.js';
import cptRoutes from './routes/cpt.js';
import healthRoutes from './routes/health.js';
// Forum routes - REMOVED (Phase R1: Domain separation)
// import forumRoutes from './routes/forum/forum.routes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import adminAppsRoutes from './routes/admin/apps.routes.js';
import serviceMonitorRoutes from './routes/service-monitor.routes.js';
// ============================================================================
// DOMAIN ROUTES REMOVED (Phase R1: Execution Boundary Cleanup)
// ============================================================================
// The following domain route factories have been removed from api-server:
// - @o4o/membership-yaksa (createMembershipRoutes)
// - @o4o/reporting-yaksa (createReportingRoutes)
// - @o4o/annualfee-yaksa (createAnnualfeeRoutes)
// - @o4o/cosmetics-seller-extension (createSellerExtensionRoutes)
// - @o4o/cosmetics-sample-display-extension
// - @o4o/cosmetics-supplier-extension
// - @o4o/groupbuy-yaksa
// These will be handled in Phase R2 (domain service separation).
// ============================================================================

// Market Trial Routes (Phase L-1)
import marketTrialRoutes from './routes/market-trial.routes.js';

// AI Query Routes (Phase AI-1)
import aiQueryRoutes from './routes/ai-query.routes.js';

// AI Admin Routes (WO-AI-ADMIN-CONTROL-PLANE-V1)
import aiAdminRoutes from './routes/ai-admin.routes.js';

// Trial Extensions (H8-2, H8-3)
import trialShippingRoutes from './extensions/trial-shipping/index.js';
import trialFulfillmentRoutes from './extensions/trial-fulfillment/index.js';
import { TrialFulfillmentController } from './extensions/trial-fulfillment/trialFulfillment.controller.js';

// Partner Routes (Phase K)
import partnerRoutes from './routes/partner.routes.js';

// Partner Dashboard Routes (WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1)
import { partnerDashboardRoutes, partnerApplicationRoutes } from './modules/partner/index.js';

// Checkout Routes (Phase N-1)
import checkoutRoutes from './routes/checkout.routes.js';

// Admin Order Routes (Phase N-2)
import adminOrderRoutes from './routes/admin-orders.routes.js';

// Admin Dashboard Routes (WO-ADMIN-API-IMPLEMENT-P0)
import adminDashboardRoutes from './routes/admin/dashboard.routes.js';

// Cosmetics Routes (Phase 7-A-1)
import { createCosmeticsRoutes } from './routes/cosmetics/cosmetics.routes.js';

// Yaksa Routes (Phase A-1)
import { createYaksaRoutes } from './routes/yaksa/yaksa.routes.js';

// Glycopharm Routes (Phase B-1)
import { createGlycopharmRoutes } from './routes/glycopharm/glycopharm.routes.js';

// KPA Routes (Pharmacist Association SaaS)
import { createKpaRoutes } from './routes/kpa/kpa.routes.js';

// GlucoseView Routes (Phase C-1)
import { createGlucoseViewRoutes } from './routes/glucoseview/glucoseview.routes.js';

// Neture Routes (Phase D-1)
import { createNetureRoutes } from './routes/neture/neture.routes.js';

// Neture Supplier Routes (modules/neture - supplier dashboard APIs)
import netureSupplierRoutes from './modules/neture/neture.routes.js';

// Dropshipping Admin Routes (DS-3)
import { createDropshippingAdminRoutes } from './routes/dropshipping-admin/dropshipping-admin.routes.js';

// CMS Content Routes (WO-P2-IMPLEMENT-CONTENT)
import { createCmsContentRoutes } from './routes/cms-content/cms-content.routes.js';

// Content Assets Routes (WO-O4O-CONTENT-ASSETS-DB-READONLY-V1)
import { createContentAssetsRoutes } from './routes/content/content-assets.routes.js';

// Signage Routes (Phase 2 Production Build - Sprint 2-2)
import { createSignageRoutes } from './routes/signage/index.js';

// Channel Routes (WO-P4-CHANNEL-IMPLEMENT-P0)
import { createChannelRoutes } from './routes/channels/channels.routes.js';

// Admin Channel Playback Logs Routes (WO-P5-CHANNEL-PLAYBACK-LOG-P0)
import { createAdminPlaybackLogRoutes } from './routes/admin/channel-playback-logs.routes.js';

// Admin Channel Heartbeat Routes (WO-P5-CHANNEL-HEARTBEAT-P1)
import { createAdminHeartbeatRoutes } from './routes/admin/channel-heartbeat.routes.js';

// Admin Channel Ops Routes (WO-P6-CHANNEL-OPS-DASHBOARD-P0)
import { createAdminChannelOpsRoutes } from './routes/admin/channel-ops.routes.js';

// Admin Ops Metrics Routes (WO-NEXT-OPS-METRICS-P0)
import { createAdminOpsMetricsRoutes } from './routes/admin/ops-metrics.routes.js';

// Register core API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/auth', authRoutes);  // Legacy path for backward compatibility
// CMS/LMS/Forum routes - REMOVED (Phase R1: Domain separation)
// app.use('/api/v1/cms', cmsRoutes);
// app.use('/api/v1/lms', lmsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/cpt', cptRoutes);
app.use('/api/health', healthRoutes);
app.use('/health', healthRoutes); // Cloud Run HEALTHCHECK compatibility
// app.use('/api/v1/forum', forumRoutes);
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

  // ============================================================================
  // CLOUD RUN CRITICAL: START LISTENING IMMEDIATELY
  // ============================================================================
  // Cloud Run requires the container to listen on PORT within startup timeout.
  // We MUST start the HTTP server BEFORE any heavy initialization (DB, modules, etc.)
  // The /health endpoint is already registered above, so it will respond immediately.
  // ============================================================================
  const host = process.env.HOST || '0.0.0.0';
  await new Promise<void>((resolve) => {
    httpServer.listen(port as number, host as string, () => {
      logger.info(`🚀 API Server listening on ${host}:${port} (Cloud Run ready)`);
      resolve();
    });
  });

  // Now do heavy initialization in background
  // Server is already accepting health check requests

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

  // ============================================================================
  // GRACEFUL_STARTUP Policy (Phase 2.5)
  // ============================================================================
  // When GRACEFUL_STARTUP=true (default in Cloud Run):
  //   - DB/Redis connection failures are logged but don't crash the server
  //   - Server continues with degraded functionality
  //   - /health endpoint always responds
  // When GRACEFUL_STARTUP=false:
  //   - Fail-fast behavior for production with strict requirements
  // ============================================================================
  const gracefulStartup = process.env.GRACEFUL_STARTUP !== 'false';

  // Initialize all services (including database)
  try {
    await startupService.initialize();
  } catch (error) {
    logger.error('⚠️ Service initialization failed:', error);
    if (!gracefulStartup) {
      logger.error('GRACEFUL_STARTUP=false: Exiting due to initialization failure');
      process.exit(1);
    }
    logger.warn('🔄 GRACEFUL_STARTUP=true: Continuing with degraded functionality');
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
  // WO-APPSTORE-CONTEXT-FIX: install → activate 순서 적용, dataSource 전달
  // ============================================================================
  logger.info('📦 Loading app modules...');
  try {
    // 1. Scan workspace and load all app manifests
    await moduleLoader.loadAll();
    const loadedModules = Array.from(moduleLoader.getRegistry().keys());
    logger.info(`✅ Loaded ${loadedModules.length} app modules: ${loadedModules.join(', ')}`);

    // 2. WO-APPSTORE-CONTEXT-FIX: Install all modules (멱등성 전제)
    let installedCount = 0;
    for (const moduleId of loadedModules) {
      try {
        await moduleLoader.installModule(moduleId, AppDataSource);
        installedCount++;
      } catch (installError) {
        // Install 실패는 경고만 남기고 계속 진행 (이미 설치된 경우 등)
        logger.warn(`Install hook failed for ${moduleId}, continuing:`, installError);
      }
    }
    logger.info(`✅ Install hooks ran for ${installedCount}/${loadedModules.length} modules`);

    // 3. Activate all modules (with dependency resolution and dataSource)
    let activatedCount = 0;
    for (const moduleId of loadedModules) {
      try {
        // WO-APPSTORE-CONTEXT-FIX: dataSource 전달
        await moduleLoader.activateModule(moduleId, AppDataSource);
        activatedCount++;
      } catch (activationError) {
        logger.error(`Failed to activate module ${moduleId}:`, activationError);
      }
    }
    logger.info(`✅ Activated ${activatedCount}/${loadedModules.length} modules`);

    // 4. Register dynamic routes from activated modules
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

    // 4.2 Register Routes API (Phase P0 Task B - Dynamic Routing)
    app.use('/api/v1/routes', routesRoutes);
    logger.info('✅ Routes API registered at /api/v1/routes');

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

    // 8.5. Register SiteGuide routes (independent service - siteguide.co.kr, no auth)
    // WO-SITEGUIDE-CORE-EXECUTION-V1: DataSource 기반 모듈 라우터
    const siteguideRoutes = createSiteGuideRoutes(AppDataSource);
    app.use('/api/siteguide', siteguideRoutes);
    logger.info('✅ SiteGuide routes registered at /api/siteguide (independent service)');

    // 9. Register User Role routes
    app.use('/api/v1/userRole', userRoleRoutes);
    logger.info('✅ User Role routes registered at /api/v1/userRole');

    // 9.5. Register Organization routes (Phase R3.5: Organization Core Absorption)
    app.use('/api/v1/organizations', organizationRoutes);
    logger.info('✅ Organization routes registered at /api/v1/organizations');

    // 10. Register Auth routes
    app.use('/api/auth', authRoutes);
    logger.info('✅ Auth routes registered at /api/auth');

    // 11. Register Admin Apps routes (v1 prefix for auth-client compatibility)
    app.use('/api/v1/admin/apps', adminAppsRoutes);
    logger.info('✅ Admin Apps routes registered at /api/v1/admin/apps');

    // 12. Forum routes - REMOVED (Phase R1: Domain separation)
    // app.use('/api/v1/forum', forumRoutes);
    // logger.info('✅ Forum routes registered at /api/v1/forum');

    // 13. Register Linked Accounts routes (SSO check, sessions)
    app.use('/api/accounts', linkedAccountsRoutes);
    logger.info('✅ Linked Accounts routes registered at /api/accounts');

    // ============================================================================
    // DOMAIN ROUTES REMOVED (Phase R1: Execution Boundary Cleanup)
    // ============================================================================
    // 14. Membership routes (/api/v1/membership) - @o4o/membership-yaksa
    // 15. Reporting routes (/api/reporting) - @o4o/reporting-yaksa
    // 16. AnnualFee routes (/api/annualfee) - @o4o/annualfee-yaksa
    // 17. Cosmetics Seller routes (/api/v1/cosmetics-seller) - @o4o/cosmetics-seller-extension
    // 18. Cosmetics Sample Display routes - @o4o/cosmetics-sample-display-extension
    // 19. Cosmetics Supplier routes - @o4o/cosmetics-supplier-extension
    // 20. Groupbuy-Yaksa routes - @o4o/groupbuy-yaksa
    // These will be handled in Phase R2 (domain service separation).
    // ============================================================================
    logger.info('⚠️ Domain routes disabled (Phase R1: Execution Boundary Cleanup)');

    // 21. Register Partner routes (Phase K)
    app.use('/api/partner', partnerRoutes);
    logger.info('✅ Partner routes registered at /api/partner');

    // 21-a. Register Partner Dashboard API v1 (WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1)
    app.use('/api/v1/partner', partnerDashboardRoutes);
    logger.info('✅ Partner Dashboard API v1 registered at /api/v1/partner');

    // 21-b. Register Partner Application API (WO-PARTNER-APPLICATION-V1) - PUBLIC ENDPOINT
    app.use('/api/v1/partner/applications', partnerApplicationRoutes);
    logger.info('✅ Partner Application API registered at /api/v1/partner/applications');

    // 22. Register Market Trial routes (Phase L-1)
    app.use('/api/market-trial', marketTrialRoutes);
    logger.info('✅ Market Trial routes registered at /api/market-trial');

    // 22-ai. Register AI Query routes (Phase AI-1)
    app.use('/api/ai', aiQueryRoutes);
    logger.info('✅ AI Query routes registered at /api/ai');

    // 22-ai-admin. Register AI Admin routes (WO-AI-ADMIN-CONTROL-PLANE-V1)
    app.use('/api/ai/admin', aiAdminRoutes);
    logger.info('✅ AI Admin routes registered at /api/ai/admin');

    // 22-a. Register Trial Shipping Extension (H8-2)
    app.use('/api/trial-shipping', trialShippingRoutes);
    logger.info('✅ Trial Shipping Extension registered at /api/trial-shipping');

    // 22-b. Register Trial Fulfillment Extension (H8-3)
    TrialFulfillmentController.setDataSource(AppDataSource);
    app.use('/api/trial-fulfillment', trialFulfillmentRoutes);
    logger.info('✅ Trial Fulfillment Extension registered at /api/trial-fulfillment');

    // 23. Register Checkout routes (Phase N-1)
    app.use('/api/checkout', checkoutRoutes);
    app.use('/api/orders', checkoutRoutes); // Also mount orders endpoint
    logger.info('✅ Checkout routes registered at /api/checkout and /api/orders');

    // 24. Register Admin Order routes (Phase N-2)
    app.use('/api/admin/orders', adminOrderRoutes);
    logger.info('✅ Admin Order routes registered at /api/admin/orders');

    // 24-b. Register Admin Dashboard routes (WO-ADMIN-API-IMPLEMENT-P0)
    app.use('/api/v1/admin', adminDashboardRoutes);
    logger.info('✅ Admin Dashboard routes registered at /api/v1/admin');

    // 25. Register Cosmetics routes (Phase 7-A-1)
    try {
      const cosmeticsRoutes = createCosmeticsRoutes(AppDataSource);
      app.use('/api/v1/cosmetics', cosmeticsRoutes);
      logger.info('✅ Cosmetics routes registered at /api/v1/cosmetics');
    } catch (cosmeticsError) {
      logger.error('Failed to register Cosmetics routes:', cosmeticsError);
    }

    // 26. Register Yaksa routes (Phase A-1)
    try {
      const yaksaRoutes = createYaksaRoutes(AppDataSource);
      app.use('/api/v1/yaksa', yaksaRoutes);
      logger.info('✅ Yaksa routes registered at /api/v1/yaksa');
    } catch (yaksaError) {
      logger.error('Failed to register Yaksa routes:', yaksaError);
    }

    // 27. Register Glycopharm routes (Phase B-1)
    try {
      const glycopharmRoutes = createGlycopharmRoutes(AppDataSource);
      app.use('/api/v1/glycopharm', glycopharmRoutes);
      logger.info('✅ Glycopharm routes registered at /api/v1/glycopharm');
    } catch (glycopharmError) {
      logger.error('Failed to register Glycopharm routes:', glycopharmError);
    }

    // 28. Register GlucoseView routes (Phase C-1)
    try {
      const glucoseviewRoutes = createGlucoseViewRoutes(AppDataSource);
      app.use('/api/v1/glucoseview', glucoseviewRoutes);
      logger.info('✅ GlucoseView routes registered at /api/v1/glucoseview');
    } catch (glucoseviewError) {
      logger.error('Failed to register GlucoseView routes:', glucoseviewError);
    }

    // 29. Register Neture routes (Phase D-1)
    try {
      const netureRoutes = createNetureRoutes(AppDataSource);
      app.use('/api/v1/neture', netureRoutes);
      logger.info('✅ Neture routes registered at /api/v1/neture');
    } catch (netureError) {
      logger.error('Failed to register Neture routes:', netureError);
    }

    // 29b. Register Neture Supplier routes (modules/neture - supplier dashboard)
    try {
      app.use('/api/v1/neture', netureSupplierRoutes);
      logger.info('✅ Neture Supplier routes registered at /api/v1/neture/supplier/*');
    } catch (netureSupplierError) {
      logger.error('Failed to register Neture Supplier routes:', netureSupplierError);
    }

    // 30. Register Dropshipping Admin routes (DS-3)
    try {
      const dropshippingAdminRoutes = createDropshippingAdminRoutes(AppDataSource);
      app.use('/api/v1/dropshipping', dropshippingAdminRoutes);
      logger.info('✅ Dropshipping Admin routes registered at /api/v1/dropshipping/admin');
    } catch (dropshippingError) {
      logger.error('Failed to register Dropshipping Admin routes:', dropshippingError);
    }

    // 31. Register KPA routes (Pharmacist Association SaaS)
    try {
      const kpaRoutes = createKpaRoutes(AppDataSource);
      app.use('/api/v1/kpa', kpaRoutes);
      logger.info('✅ KPA routes registered at /api/v1/kpa');
    } catch (kpaError) {
      logger.error('Failed to register KPA routes:', kpaError);
    }

    // 32. Register CMS Content routes (WO-P2-IMPLEMENT-CONTENT)
    try {
      const cmsContentRoutes = createCmsContentRoutes(AppDataSource);
      app.use('/api/v1/cms', cmsContentRoutes);
      logger.info('✅ CMS Content routes registered at /api/v1/cms');
    } catch (cmsContentError) {
      logger.error('Failed to register CMS Content routes:', cmsContentError);
    }

    // 32-b. Register Content Assets routes (WO-O4O-CONTENT-ASSETS-DB-READONLY-V1)
    // ⚠️ READ-ONLY: cms_media 데이터를 Content Core 관점으로 읽기만 함
    try {
      const contentAssetsRoutes = createContentAssetsRoutes(AppDataSource);
      app.use('/api/v1/content/assets', contentAssetsRoutes);
      logger.info('✅ Content Assets routes registered at /api/v1/content/assets (READ-ONLY)');
    } catch (contentAssetsError) {
      logger.error('Failed to register Content Assets routes:', contentAssetsError);
    }

    // 33. Register Channel routes (WO-P4-CHANNEL-IMPLEMENT-P0)
    try {
      const channelRoutes = createChannelRoutes(AppDataSource);
      app.use('/api/v1/channels', channelRoutes);
      logger.info('✅ Channel routes registered at /api/v1/channels');
    } catch (channelError) {
      logger.error('Failed to register Channel routes:', channelError);
    }

    // 33-b. Register Signage routes (Phase 2 Production Build - Sprint 2-2)
    try {
      const signageRoutes = createSignageRoutes(AppDataSource);
      app.use('/api/signage/:serviceKey', signageRoutes);
      logger.info('✅ Signage routes registered at /api/signage/:serviceKey');
    } catch (signageError) {
      logger.error('Failed to register Signage routes:', signageError);
    }

    // 34. Register Admin Channel Playback Logs routes (WO-P5-CHANNEL-PLAYBACK-LOG-P0)
    try {
      const adminPlaybackLogRoutes = createAdminPlaybackLogRoutes(AppDataSource);
      app.use('/api/v1/admin/channel-playback-logs', adminPlaybackLogRoutes);
      logger.info('✅ Admin Playback Log routes registered at /api/v1/admin/channel-playback-logs');
    } catch (playbackLogError) {
      logger.error('Failed to register Admin Playback Log routes:', playbackLogError);
    }

    // 35. Register Admin Channel Heartbeat routes (WO-P5-CHANNEL-HEARTBEAT-P1)
    try {
      const adminHeartbeatRoutes = createAdminHeartbeatRoutes(AppDataSource);
      app.use('/api/v1/admin/channels/heartbeat', adminHeartbeatRoutes);
      logger.info('✅ Admin Heartbeat routes registered at /api/v1/admin/channels/heartbeat');
    } catch (heartbeatError) {
      logger.error('Failed to register Admin Heartbeat routes:', heartbeatError);
    }

    // 36. Register Admin Channel Ops routes (WO-P6-CHANNEL-OPS-DASHBOARD-P0)
    try {
      const adminChannelOpsRoutes = createAdminChannelOpsRoutes(AppDataSource);
      app.use('/api/v1/admin/channels/ops', adminChannelOpsRoutes);
      logger.info('✅ Admin Channel Ops routes registered at /api/v1/admin/channels/ops');
    } catch (channelOpsError) {
      logger.error('Failed to register Admin Channel Ops routes:', channelOpsError);
    }

    // 37. Register Admin Ops Metrics routes (WO-NEXT-OPS-METRICS-P0)
    try {
      const adminOpsMetricsRoutes = createAdminOpsMetricsRoutes(AppDataSource);
      app.use('/api/v1/admin/ops', adminOpsMetricsRoutes);
      logger.info('✅ Admin Ops Metrics routes registered at /api/v1/admin/ops');
    } catch (opsMetricsError) {
      logger.error('Failed to register Admin Ops Metrics routes:', opsMetricsError);
    }

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

  // Server is already listening (started at the beginning of startServer)
  logger.info('✅ Background initialization complete');
};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  // GRACEFUL_STARTUP Policy: Only exit if explicitly disabled
  // This allows the server to attempt recovery or at least respond to health checks
  const gracefulStartup = process.env.GRACEFUL_STARTUP !== 'false';
  if (!gracefulStartup) {
    logger.error('💀 GRACEFUL_STARTUP=false: Exiting process due to startup failure');
    process.exit(1);
  }
  logger.warn('🔄 Server startup failed but GRACEFUL_STARTUP enabled: Process will continue');
  logger.warn('   Note: Some features may not work. Check logs for details.');
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================
const SHUTDOWN_TIMEOUT_MS = 10000; // 10 seconds for graceful shutdown

const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal received: initiating graceful shutdown`);

  // Set a timeout to force exit if shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    logger.error(`💀 Shutdown timeout (${SHUTDOWN_TIMEOUT_MS}ms) exceeded, forcing exit`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    // Stop accepting new connections
    httpServer.close(() => {
      logger.info('✅ HTTP server closed');
    });

    // Shutdown services (DB connections, etc.)
    await startupService.shutdown();
    logger.info('✅ Services shutdown complete');

    clearTimeout(forceExitTimeout);
    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('💀 Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💀 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit for unhandled rejections in dev mode, but log them
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('unhandledRejection');
  }
});

// Export services for other modules
// NOTE: RealtimeFeedbackService removed in v1 - beta feature deprecated
export { io };
