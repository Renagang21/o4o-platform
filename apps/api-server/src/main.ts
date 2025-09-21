import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
// Force rebuild for Settings API deployment - trigger GitHub Actions v2
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';

// 환경변수 로드 (우선순위: .env.production > .env.development > .env)
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : process.env.NODE_ENV === 'development' 
    ? '.env.development' 
    : '.env';

// Try multiple paths for .env file
const possiblePaths = [
  path.resolve(__dirname, '..', envFile),      // apps/api-server/.env
  path.resolve(__dirname, '..', '.env'),       // apps/api-server/.env (fallback)
  path.resolve(process.cwd(), envFile),        // Current working directory
  path.resolve(process.cwd(), '.env'),         // Current working directory (fallback)
];

let envLoaded = false;
for (const envPath of possiblePaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  // Warning: No .env file found, using system environment variables
}

// 환경변수 검증

import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import passport from './config/passport';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import logger from './utils/logger';

// Database connection
import { AppDataSource } from './database/connection';
import { Post } from './entities/Post';
import { Page } from './entities/Page';
import { SessionSyncService } from './services/sessionSyncService';
import { WebSocketSessionSync } from './websocket/sessionSync';
import { errorHandler } from './middleware/errorHandler';
import { performanceMonitor } from './middleware/performanceMonitor';
import { securityMiddleware, sqlInjectionDetection } from './middleware/securityMiddleware';
import { authenticateToken } from './middleware/auth';
import { startCrowdfundingSchedules } from './schedules/crowdfundingSchedule';
// import { startInventorySchedules } from './schedules/inventorySchedule'; // Disabled: unnecessary complex feature

// Monitoring services
import { backupService } from './services/BackupService';
import { errorAlertService } from './services/ErrorAlertService';
import { securityAuditService } from './services/SecurityAuditService';

// Email service - import moved to runtime to avoid blocking

// 라우트 imports 
import authRoutes from './routes/auth';
import authV2Routes from './routes/auth-v2';
import socialAuthRoutes from './routes/social-auth';
import userRoutes from './routes/user';
import userManagementRoutes from './routes/users.routes';
import usersV1Routes from './routes/v1/users.routes';
import adminRoutes from './routes/admin';
import ecommerceRoutes from './routes/ecommerce';
import ecommerceSettingsRoutes from './routes/ecommerce/settingsRoutes';
import cptRoutes from './routes/cpt';
import postCreationRoutes from './routes/post-creation';
import servicesRoutes from './routes/services';
import signageRoutes from './routes/signage';
import contentRoutes from './routes/content';
import cmsRoutes from './routes/content/index';
import publicRoutes from './routes/public';
import settingsRoutes from './routes/settingsRoutes';
import oauthSettingsRoutes from './routes/settings.routes';
import emailAuthRoutes from './routes/email-auth.routes';
import crowdfundingRoutes from './routes/crowdfundingRoutes';
import forumRoutes from './routes/forum';
import linkedAccountsRoutes from './routes/linked-accounts';
import accountLinkingRoutes from './routes/account-linking.routes';
import unifiedAuthRoutes from './routes/unified-auth.routes';
import vendorRoutes from './routes/vendor';
import supplierRoutes from './routes/supplier';
import inventoryRoutes from './routes/inventory';
import formsRoutes from './routes/forms';
import monitoringRoutes from './routes/monitoring';
import sessionsRoutes from './routes/sessions';
import postsRoutes from './routes/posts';
import reusableBlocksRoutes from './routes/reusable-blocks.routes';
import blockPatternsRoutes from './routes/block-patterns.routes';
import templatePartsRoutes from './routes/template-parts.routes';
import categoriesRoutes from './routes/categories';
import customPostTypesRoutes from './routes/custom-post-types';
import menusRoutes from './routes/menus';
import menuItemsRoutes from './routes/menu-items';

// Import v1 API routes
import contentV1Routes from './routes/v1/content.routes';
import platformV1Routes from './routes/v1/platform.routes';
import ecommerceV1Routes from './routes/v1/ecommerce.routes';
import forumV1Routes from './routes/v1/forum.routes';
import adminV1Routes from './routes/v1/admin.routes';
import mediaV1Routes from './routes/v1/media.routes';
import couponRoutes from './routes/v1/coupon.routes';
import themeRoutes from './routes/v1/theme.routes';
import appsV1Routes from './routes/v1/apps.routes';
import pluginsV1Routes from './routes/v1/plugins.routes';
import couponV1Routes from './routes/v1/coupon.routes';
import exportV1Routes from './routes/v1/export.routes';
import shippingV1Routes from './routes/v1/shipping.routes';
import dropshippingV1Routes from './routes/v1/dropshipping.routes';
import productVariationRoutes from './routes/v1/product-variation.routes';
import tossPaymentsRoutes from './routes/v1/toss-payments.routes';
import healthRoutes from './routes/health';
import settingsV1Routes from './routes/v1/settings.routes';
import galleryRoutes from './routes/gallery.routes';
import acfV1Routes from './routes/v1/acf.routes';
import pagesV1Routes from './routes/v1/pages.routes';
import previewRoutes from './routes/preview';
import { affiliateRoutes, commissionRoutes, phase3Routes } from './modules/affiliate';
import { AffiliateSocketManager } from './modules/affiliate/websocket/socket.manager';

// 중복 제거 - 이미 상단에서 로드됨

const app: Application = express();

// IMPORTANT: Set trust proxy IMMEDIATELY after creating the app
// This must be done before any middleware that uses req.ip
// Enable for both development and production since we're behind nginx proxy
app.set('trust proxy', true);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      const allowedOrigins = [
        process.env.FRONTEND_URL || "http://localhost:3011",
        "http://localhost:3000", // main-site
        "http://localhost:3001", // admin dashboard
        "http://localhost:3002", // ecommerce
        "http://localhost:3003", // crowdfunding
        "http://localhost:5173", // vite dev server - main site
        "http://localhost:5174", // vite dev server - admin dashboard
        "http://localhost:5175", // vite dev server - ecommerce
        "http://localhost:5176", // vite dev server - crowdfunding
        "http://localhost:5177", // vite dev server - signage
        // Web server IPs
        "http://13.125.144.8:3000", // web server main-site
        "http://13.125.144.8:3001", // web server admin-dashboard
        "http://13.125.144.8", // web server direct IP
        "https://13.125.144.8", // web server direct IP (https)
        // Production domains
        "https://neture.co.kr",
        "https://www.neture.co.kr",
        "https://admin.neture.co.kr",
        "http://admin.neture.co.kr", // Allow both http and https for admin
        "https://shop.neture.co.kr",
        "https://forum.neture.co.kr",
        "https://signage.neture.co.kr",
        "https://funding.neture.co.kr",
        "https://auth.neture.co.kr",
        "https://api.neture.co.kr",
        "http://api.neture.co.kr"
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

const port = process.env.PORT || 4000;

// Rate limiting for authenticated endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use custom key generator for proxy environments
  keyGenerator: (req) => {
    // In production with proxy, use X-Forwarded-For
    if (process.env.NODE_ENV === 'production') {
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded) {
        // Get the first IP in the chain (original client IP)
        return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
      }
    }
    return req.ip || 'unknown';
  },
  // Skip localhost
  skip: (req) => {
    const ip = req.ip || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  }
});

// More lenient rate limiting for public endpoints
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 1000, // 최대 1000 요청 (increased for bulk operations)
  message: {
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (process.env.NODE_ENV === 'production') {
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded) {
        return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
      }
    }
    return req.ip || 'unknown';
  },
  skip: (req) => {
    const ip = req.ip || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  }
});


// 미들웨어 설정
app.use(helmet({
  contentSecurityPolicy: false, // React 개발 서버와의 호환성을 위해
  frameguard: false, // Disable X-Frame-Options for iframe preview support
}));

// Enable compression for all responses
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      // Don't compress responses if this header is present
      return false;
    }
    // Use compression filter function
    return compression.filter(req, res);
  },
  level: 6, // Compression level (0-9, where 9 is best compression but slowest)
}) as any);

// CORS configuration for multiple origins
const corsOptions: CorsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Get allowed origins from environment variable
    const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o: any) => o.trim()) : [];
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:3011",
      "http://localhost:3000", // main-site
      "http://localhost:3001", // admin dashboard
      "http://localhost:3002", // ecommerce
      "http://localhost:3003", // crowdfunding
      "http://localhost:5173", // vite dev server - main site
      "http://localhost:5174", // vite dev server - admin dashboard
      "http://localhost:5175", // vite dev server - ecommerce
      "http://localhost:5176", // vite dev server - crowdfunding
      "http://localhost:5177", // vite dev server - signage
      // Web server IPs
      "http://13.125.144.8:3000", // web server main-site
      "http://13.125.144.8:3001", // web server admin-dashboard
      "http://13.125.144.8", // web server direct IP
      "https://13.125.144.8", // web server direct IP (https)
      // Production domains
      "https://neture.co.kr",
      "https://www.neture.co.kr",
      "https://admin.neture.co.kr",
      "http://admin.neture.co.kr", // Allow both http and https for admin
      "https://shop.neture.co.kr",
      "https://forum.neture.co.kr",
      "https://signage.neture.co.kr",
      "https://funding.neture.co.kr",
      "https://auth.neture.co.kr",
      "https://api.neture.co.kr", // API server itself
      "http://api.neture.co.kr",
      // Add environment-defined origins
      ...envOrigins
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Debug logging in development
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_CORS === 'true') {
      logger.debug(`[CORS] Request from origin: ${origin}`);
      logger.debug(`[CORS] Allowed: ${allowedOrigins.includes(origin)}`);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, allow any *.neture.co.kr subdomain
      if (process.env.NODE_ENV === 'production' && origin && origin.endsWith('.neture.co.kr')) {
        logger.info(`[CORS] Allowing subdomain: ${origin}`);
        callback(null, true);
      } else {
        logger.warn(`[CORS] Blocked origin: ${origin}`);
        logger.warn(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS before any other middleware
app.use(cors(corsOptions));

// Explicit OPTIONS request handler for better preflight support
app.options('*', cors(corsOptions));

// Serve static files for uploads (EARLY in middleware chain)
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Add performance monitoring middleware early in the chain
app.use(performanceMonitor as any);

// Security middleware
app.use(securityMiddleware as any);
app.use(sqlInjectionDetection as any);

app.use(cookieParser() as any);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure session store
let sessionConfig: any = {
  secret: process.env.SESSION_SECRET || 'o4o-platform-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.COOKIE_DOMAIN || undefined, // Enable cross-subdomain cookies
    sameSite: 'lax'
  }
};

// Use Redis store conditionally (production + REDIS_ENABLED)
const redisEnabled = process.env.REDIS_ENABLED !== 'false' && process.env.NODE_ENV === 'production';

if (redisEnabled) {
  try {
    const sessionRedisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      lazyConnect: true, // 지연 연결로 에러 방지
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

// Static file serving for uploads
const uploadsPath = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(uploadsPath));

// Settings API rate limiter - very lenient for admin operations
const settingsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 2000, // 최대 2000 요청 (설정은 자주 읽고 쓰기 때문)
  message: {
    error: 'Too many settings requests',
    code: 'SETTINGS_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (process.env.NODE_ENV === 'production') {
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded) {
        return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
      }
    }
    return req.ip || 'unknown';
  },
  skip: (req) => {
    const ip = req.ip || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  }
});

// Special rate limit for SSO check endpoint (more lenient to prevent 429 errors)
const ssoCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 500, // 최대 500 요청 (SSO 체크는 자주 발생)
  message: {
    error: 'Too many SSO check requests',
    code: 'SSO_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (process.env.NODE_ENV === 'production') {
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded) {
        // Get the first IP in the chain (original client IP)
        return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
      }
    }
    return req.ip || 'unknown';
  },
  skip: (req) => {
    const ip = req.ip || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  }
});

// 헬스체크 엔드포인트 (rate limit 전에 위치해야 함)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    service: 'api-server'
  });
});

// Use the health router for comprehensive health checks
app.use('/api/health', healthRoutes);

// Additional health endpoints for specific services
app.get('/api/auth/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'auth',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ecommerce/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    service: 'ecommerce',
    timestamp: new Date().toISOString()
  });
});

// Apply rate limiting to specific endpoints  
app.use('/api/v1/accounts/sso/check', ssoCheckLimiter);
app.use('/accounts/sso/check', ssoCheckLimiter); // Direct route for frontend
app.use('/api/public', publicLimiter);

// Direct frontend routes (without /api prefix)
app.use('/accounts', linkedAccountsRoutes);
app.use('/settings', settingsRoutes);
app.use('/v1/content', contentV1Routes);

// API 라우트 - auth routes MUST be before general rate limiter
// IMPORTANT: Basic auth routes must come FIRST before any other auth-related routes
app.use('/api/auth', authRoutes);

// V1 auth routes with more specific paths to avoid conflicts
app.use('/api/v1/auth/cookie', authV2Routes); // Cookie-based auth routes (moved to specific sub-path)
app.use('/api/v1/auth', authRoutes); // v1 compatibility - JWT-based auth routes
app.use('/api/v1/accounts', linkedAccountsRoutes); // Linked accounts routes (moved to avoid conflict)
app.use('/api/v1/social', socialAuthRoutes); // Social auth routes (moved to avoid conflict)

// Settings routes with lenient rate limiting (BEFORE general rate limiter)
app.use('/api/v1/settings', settingsLimiter, settingsV1Routes);
app.use('/v1/settings', settingsLimiter, settingsV1Routes);
app.use('/api/settings', settingsLimiter, oauthSettingsRoutes);
app.use('/api/settings', settingsLimiter, settingsRoutes);
app.use('/settings', settingsLimiter, settingsRoutes);

// Apply standard rate limiting to authenticated endpoints (exclude public routes)
// Note: Public routes (/api/public) should not have rate limiting
// Non-existent routes should return 404, not 401

// Protected API routes (with individual rate limiting)
app.use('/api/users', limiter, userRoutes);
app.use('/api/v1/users', limiter, usersV1Routes); // V1 user management routes with comprehensive functionality
app.use('/api/admin', limiter, adminRoutes);
app.use('/api/ecommerce', limiter, ecommerceRoutes);
app.use('/ecommerce', ecommerceSettingsRoutes); // Direct ecommerce settings route
app.use('/api/cpt', limiter, cptRoutes);
app.use('/api/post-creation', limiter, postCreationRoutes);
app.use('/api/services', limiter, servicesRoutes);
app.use('/api/signage', limiter, signageRoutes);
app.use('/api/crowdfunding', limiter, crowdfundingRoutes);
app.use('/api/forum', limiter, forumRoutes);
app.use('/api/public', publicRoutes); // Public routes (no auth required)
// Compatibility: expose public routes under v1 prefix for frontend consistency
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/sessions', limiter, sessionsRoutes); // Session management routes

// Categories routes (public access)
app.use('/api/categories', categoriesRoutes);

// Gutenberg Content Management Routes
import postsApiRoutes from './routes/api/posts';
import pagesApiRoutes from './routes/api/pages';
import categoriesApiRoutes from './routes/api/categories';
import tagsApiRoutes from './routes/api/tags';

// Canonical posts API - Apply publicLimiter for read operations
app.use('/api/posts', publicLimiter, postsApiRoutes);
app.use('/api/pages', publicLimiter, pagesApiRoutes);
app.use('/api/categories', publicLimiter, categoriesApiRoutes);
app.use('/api/tags', publicLimiter, tagsApiRoutes);

// ACF routes
import acfRoutes from './routes/acf';
app.use('/admin', acfRoutes);

// API v1 compatibility for media routes
app.use('/api/v1/media/folders', (req: Request, res: Response, next: NextFunction) => {
  req.url = '/folders';
  acfRoutes(req, res, next);
});

// Dashboard endpoints with real data
import { DashboardController } from './controllers/dashboardController';
app.get('/ecommerce/dashboard/stats', DashboardController.getEcommerceStats as any);
app.get('/api/users/stats', DashboardController.getUserStats as any);
app.get('/api/admin/notifications', DashboardController.getNotifications as any);
app.get('/api/admin/activities', DashboardController.getActivities as any);
app.get('/api/system/health', DashboardController.getSystemHealth as any);
app.get('/api/admin/stats', DashboardController.getContentStats as any);
app.get('/api/dashboard/overview', DashboardController.getDashboardOverview as any);

// Add publish endpoint directly at /api/posts level
app.post('/api/posts/:id/publish', authenticateToken as any, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if database is connected
    if (!AppDataSource.isInitialized) {
      logger.error('Database not initialized');
      return res.status(503).json({
        error: { code: 'DB_NOT_READY', message: 'Database connection not available' }
      });
    }
    
    const postRepository = AppDataSource.getRepository(Post);
    
    const post = await postRepository.findOne({ 
      where: { id },
      relations: ['author', 'categories', 'tags']
    });
    
    if (!post) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Post not found' }
      });
    }

    post.status = 'publish';
    post.published_at = new Date();
    const updatedPost = await postRepository.save(post);

    return res.json({
      success: true,
      data: updatedPost
    });
  } catch (error) {
    logger.error('Error publishing post:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to publish post', details: (error as Error).message }
    });
  }
});

// Direct public endpoints for main site
app.get('/api/posts', publicLimiter, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string || 'published';
    const orderBy = req.query.orderBy as string || 'createdAt';
    const order = req.query.order as string || 'DESC';
    const offset = (page - 1) * limit;

    // For now, return mock data until we have proper posts entity
    const mockPosts = [
      {
        id: '1',
        title: 'Neture 플랫폼 출시',
        slug: 'neture-platform-launch',
        excerpt: 'O4O 비즈니스를 위한 통합 플랫폼이 출시되었습니다.',
        content: '<p>Neture 플랫폼이 공식 출시되었습니다...</p>',
        status: 'published',
        author: {
          id: '1',
          name: 'Admin',
          avatar: null
        },
        featuredImage: null,
        categories: ['공지사항'],
        tags: ['플랫폼', '출시'],
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    res.json({
      data: mockPosts,
      pagination: {
        current: page,
        total: 1,
        count: limit,
        totalItems: 1
      }
    });
  } catch (error) {
    logger.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts'
    });
  }
});

// OAuth routes must be registered BEFORE general settings routes
// Settings routes moved before rate limiter

// Email settings routes
import emailSettingsRoutes from './routes/email-settings.routes';
import smtpRoutes from './routes/v1/smtp.routes';
app.use('/api/v1/email', emailSettingsRoutes);
app.use('/api/v1/smtp', smtpRoutes); // SMTP management routes
app.use('/api/auth', emailAuthRoutes);
app.use('/api/auth/accounts', accountLinkingRoutes); // Account linking routes
app.use('/api/auth/unified', unifiedAuthRoutes); // Unified auth routes
app.use('/api/vendor', vendorRoutes); // Vendor management routes
app.use('/api/suppliers', supplierRoutes); // Supplier management routes
app.use('/api/inventory', inventoryRoutes); // Inventory management routes
app.use('/api/forms', formsRoutes); // Form builder routes
app.use('/api/v1/monitoring', monitoringRoutes); // Monitoring routes
// Removed duplicate mount to ensure a single canonical router for /api/posts
// app.use('/api/posts', postsRoutes);
app.use('/api/reusable-blocks', reusableBlocksRoutes); // Reusable blocks routes (WordPress-compatible)
app.use('/api/block-patterns', blockPatternsRoutes); // Block patterns routes (WordPress-compatible)
app.use('/api/template-parts', templatePartsRoutes); // Template parts routes (WordPress FSE)
app.use('/api/preview', publicLimiter, previewRoutes); // Preview routes for theme customization
app.use('/api/content', contentRoutes); // Content routes - moved to specific path to avoid conflicts
app.use('/api/cms', cmsRoutes); // New CMS routes (Posts, Pages, Media with full features)

// V1 API routes (new standardized endpoints)
// Removed v1 posts duplicate mounting to avoid policy conflicts
// app.use('/api/v1/posts', postsRoutes);
app.use('/api/v1/categories', categoriesRoutes); // Categories routes (fixed)
app.use('/api/categories', categoriesRoutes); // Backward compatibility for old API path
app.use('/api/v1/custom-post-types', customPostTypesRoutes); // Custom post types (fixed)

// Tag routes
import tagRoutes from './routes/content/tagRoutes';
app.use('/api', tagRoutes); // Tags at /api/tags (mounted at specific paths in the router)
app.use('/api/v1/menus', menusRoutes); // Menus routes
app.use('/api/v1/menu-items', menuItemsRoutes); // Menu items routes

// Advanced menu features (Phase 2)
import menuAdvancedRoutes from './routes/menu-advanced';
app.use('/api/v1/menus-advanced', menuAdvancedRoutes); // Advanced menu APIs

// Menu Phase 3 features (Caching, Analytics, Widgets)
import menuPhase3Routes from './routes/menu-phase3';
app.use('/api/v1/menus-phase3', menuPhase3Routes); // Phase 3 menu APIs
app.use('/api/media/gallery', galleryRoutes); // Gallery-specific routes (PUBLIC ACCESS)
app.use('/api/media', galleryRoutes); // Standard media routes for gallery block (PUBLIC ACCESS)
app.use('/api/v1/content', contentV1Routes);
app.use('/api/v1/platform', platformV1Routes);
app.use('/api/v1/ecommerce', ecommerceV1Routes);
app.use('/api/v1/forum', forumV1Routes);
app.use('/api/v1/media', mediaV1Routes); // V1 media routes (AUTHENTICATED ACCESS)
app.use('/api/v1/pages', pagesV1Routes); // V1 pages API with full authentication

// Preview proxy routes (for X-Frame-Options bypass)
import previewProxyRoutes from './routes/v1/preview.routes';
app.use('/api/v1/preview', previewProxyRoutes); // Preview proxy routes
app.use('/api/v1/apps', appsV1Routes);
app.use('/api/v1/apps/plugins', pluginsV1Routes);
app.use('/api/v1/coupons', couponV1Routes);
app.use('/api/v1/themes', themeRoutes);
app.use('/api/v1/export', exportV1Routes);
app.use('/api/v1/shipping', shippingV1Routes);
// import dropshippingV1Routes from './routes/v1/dropshipping.routes'; // Already imported above
app.use('/api/v1/dropshipping', dropshippingV1Routes);
app.use('/api/v1/products', productVariationRoutes); // 상품 변형 라우트
app.use('/api/v1/payments', tossPaymentsRoutes); // 토스페이먼츠 결제 라우트
app.use('/v1/settings', settingsV1Routes); // 설정 라우트 - 자동 배포 재테스트
app.use('/api/v1/acf', acfV1Routes); // ACF v1 라우트

// Admin routes with correct paths
app.use('/api/admin', adminV1Routes);
app.use('/api/admin', adminRoutes); // Add original admin routes for backwards compatibility
// Settings routes already registered above

// 루트 접근 시 API 서버임을 알림
app.get('/', (req, res) => {
  res.json({
    message: 'Neture API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      admin: '/api/admin',
      ecommerce: '/api/ecommerce',
      cpt: '/api/cpt',
      postCreation: '/api/post-creation',
      services: '/api/services',
      signage: '/api/signage',
      content: {
        pages: '/api/admin/pages',
        media: '/api/admin/media',
        templates: '/api/admin/templates',
        customFields: '/api/admin/custom-field-groups'
      },
      forms: '/api/forms'
    },
    frontend: process.env.FRONTEND_URL || 'http://localhost:3011'
  });
});

// Initialize Affiliate WebSocket Manager
let affiliateSocketManager: AffiliateSocketManager | null = null;
try {
  affiliateSocketManager = new AffiliateSocketManager(httpServer);
  logger.info('Affiliate WebSocket Manager initialized');
} catch (error) {
  logger.error('Failed to initialize Affiliate WebSocket Manager:', error);
}

// Socket.IO 연결 처리 (기존 기능 유지)
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
  });
});

// 중앙화된 에러 핸들러 (모든 라우트 뒤에 위치해야 함)
app.use(errorHandler as any);

// 404 핸들러 (API 전용)
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    requestedPath: req.originalUrl
  });
});

// Swagger documentation
import { setupSwagger } from './config/swagger-enhanced';

// Setup Swagger API documentation
logger.info('Setting up Swagger documentation...');
try {
  setupSwagger(app);
  logger.info('Swagger documentation setup completed');
} catch (swaggerError) {
  logger.error('Swagger setup failed:', swaggerError);
}

// 서버 시작
const startServer = async () => {
  logger.info('Starting server...');
  try {
    logger.info('Checking database initialization status...');
    // 데이터베이스 초기화 전 상태 확인
    if (AppDataSource.isInitialized) {
      logger.info('Database already initialized');
    } else {
      
      // 환경변수 재확인
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'), // PostgreSQL 기본 포트로 수정
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'o4o_platform'
      };
      
      logger.info('Database configuration:', {
        ...dbConfig,
        password: dbConfig.password ? '***' : 'NOT SET'
      });
      
      // 데이터베이스 초기화 (재시도 로직 포함)
      logger.info('Attempting database connection...');
      
      let dbConnected = false;
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`Database connection attempt ${attempt}/${maxRetries}`);
          
          const dbConnectionPromise = AppDataSource.initialize();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Database connection timeout')), 10000); // 타임아웃 연장
          });
          
          await Promise.race([dbConnectionPromise, timeoutPromise]);
          logger.info('Database connection successful');
          dbConnected = true;
          break;
        } catch (connectionError) {
          logger.warn(`Database connection attempt ${attempt} failed:`, connectionError);
          
          if (attempt < maxRetries) {
            logger.info(`Retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (!dbConnected) {
        const errorMessage = 'Failed to connect to database after multiple attempts';
        logger.error(errorMessage);
        
        if (process.env.NODE_ENV === 'development') {
          logger.warn('Continuing without database in development mode');
        } else {
          throw new Error(errorMessage);
        }
      }
      
      // 마이그레이션 실행 (프로덕션 환경, DB 연결된 경우만)
      if (process.env.NODE_ENV === 'production' && AppDataSource.isInitialized) {
        try {
          await AppDataSource.runMigrations();
        } catch (migrationError) {
          logger.warn('Migration error (non-critical):', migrationError);
        }
      }

      // Initialize monitoring services - skip in development
      if (process.env.NODE_ENV === 'production') {
        try {
          await backupService.initialize();
          await errorAlertService.initialize();
        } catch (serviceError) {
          logger.warn('Monitoring services initialization failed (non-critical)');
        }
      }

      // Initialize tracking updater job
      try {
        const { trackingUpdaterJob } = await import('./jobs/trackingUpdater');
        trackingUpdaterJob.start();
        logger.info('Tracking updater job started');
      } catch (jobError) {
        // Error log removed
      }

      // Initialize email service (graceful, non-blocking)
      logger.info('Initializing email service...');
      try {
        const { emailService } = await import('./services/email.service');
        await emailService.initialize();
        const status = emailService.getServiceStatus();
        if (status.available) {
          logger.info('Email service initialized successfully');
        } else if (status.enabled && !status.available) {
          logger.warn('Email service enabled but not available (check SMTP config)');
        }
      } catch (emailError: any) {
        logger.error('Failed to initialize email service:', {
          error: emailError.message || emailError,
          hint: 'Email functionality will be disabled. Set EMAIL_SERVICE_ENABLED=false to suppress this error.'
        });
        // Don't throw - let the app continue without email
      }
      logger.info('Email service initialization completed');
    }
  } catch (dbError) {
    // Error log removed
    
    // 프로덕션에서는 종료, 개발에서는 계속 실행
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  // Redis 초기화 (조건부)
  let webSocketSessionSync: WebSocketSessionSync | null = null;
  
  if (redisEnabled) {
    try {
      logger.info('Initializing Redis connection...');
      
      const redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
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

      // Initialize SessionSyncService
      SessionSyncService.initialize(redisClient);
      
      // Initialize WebSocket session sync if enabled
      if (process.env.SESSION_SYNC_ENABLED === 'true') {
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
  
  // Start scheduled jobs
  try {
    startCrowdfundingSchedules();
    // startInventorySchedules(); // Disabled: unnecessary complex feature per CLAUDE.md
    logger.info('Scheduled jobs started');
  } catch (scheduleError) {
    logger.warn('Failed to start some scheduled jobs (non-critical):', scheduleError);
  }
  
  // Initialize image processing folders
  try {
    const { imageProcessingService } = await import('./services/image-processing.service');
    await imageProcessingService.initializeFolders();
    logger.info('✅ Image processing folders initialized');
  } catch (folderError) {
    logger.warn('Failed to initialize image processing folders:', folderError);
  }

  // Bind to IPv4 explicitly (0.0.0.0) to avoid IPv6 issues
  const host = process.env.HOST || '0.0.0.0';
  httpServer.listen(port as number, host as string, () => {
    logger.info(`🚀 API Server running on ${host}:${port}`);
  });
};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

// Export services for other modules
export { RealtimeFeedbackService } from './services/realtimeFeedbackService';
export { io }; // Export io instance for use in other modules
export { affiliateSocketManager }; // Export affiliate socket manager for services to use
// Note: realtimeFeedbackService should be initialized after server starts, not here
