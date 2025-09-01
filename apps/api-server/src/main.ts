import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
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
import { SessionSyncService } from './services/sessionSyncService';
import { WebSocketSessionSync } from './websocket/sessionSync';
import { errorHandler } from './middleware/errorHandler';
import { performanceMonitor } from './middleware/performanceMonitor';
import { securityMiddleware, sqlInjectionDetection } from './middleware/securityMiddleware';
import { startCrowdfundingSchedules } from './schedules/crowdfundingSchedule';
import { startInventorySchedules } from './schedules/inventorySchedule';

// Monitoring services
import { backupService } from './services/BackupService';
import { errorAlertService } from './services/ErrorAlertService';
import { securityAuditService } from './services/SecurityAuditService';

// Email service
import { emailService } from './services/email.service';

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
import shortcodeV1Routes from './routes/v1/shortcodes.routes';
import { affiliateRoutes, commissionRoutes, phase3Routes } from './modules/affiliate';
import { AffiliateSocketManager } from './modules/affiliate/websocket/socket.manager';

// 중복 제거 - 이미 상단에서 로드됨

const app: Application = express();

// IMPORTANT: Set trust proxy IMMEDIATELY after creating the app
// This must be done before any middleware that uses req.ip
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
}

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
  max: 300, // 최대 300 요청 (public endpoints need more)
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
      "http://api.neture.co.kr", // API server (http)
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
      logger.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
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

// Explicit CORS header handling to ensure headers are always set
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string;
  const allowedOrigins = [
    "https://admin.neture.co.kr",
    "https://shop.neture.co.kr", 
    "https://neture.co.kr",
    "https://www.neture.co.kr",
    "https://api.neture.co.kr",
    "http://admin.neture.co.kr",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:5173",
    "http://localhost:5174"
  ];
  
  // Set CORS headers explicitly if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Page-Count');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  
  // Handle OPTIONS preflight requests immediately
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// Apply CORS before any other middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Serve static files for uploads (EARLY in middleware chain)
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Add performance monitoring middleware early in the chain
app.use(performanceMonitor);

// Security middleware
app.use(securityMiddleware);
app.use(sqlInjectionDetection);

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

// Use Redis store in production
if (process.env.NODE_ENV === 'production') {
  const sessionRedisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  });
  
  sessionConfig.store = new RedisStore({
    client: sessionRedisClient,
    prefix: 'sess:'
  });
}

// Session middleware for passport (required for OAuth)
app.use(session(sessionConfig) as any);

// Initialize passport
app.use(passport.initialize() as any);

// Static file serving for uploads
const uploadsPath = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(uploadsPath));

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
app.use('/api/v1/auth', authRoutes); // v1 compatibility - this MUST be the first /api/v1/auth route

// Other specialized auth routes come AFTER basic auth
app.use('/api/v1/auth/v2', authV2Routes); // Cookie-based auth routes
app.use('/api/v1/accounts', linkedAccountsRoutes); // Linked accounts routes (moved to avoid conflict)
app.use('/api/v1/social', socialAuthRoutes); // Social auth routes (moved to avoid conflict)

// Apply standard rate limiting to authenticated endpoints
app.use('/api/', limiter);

// Protected API routes (after rate limiter)
app.use('/api/users', userRoutes);
app.use('/api/v1/users', usersV1Routes); // V1 user management routes with comprehensive functionality
app.use('/api/admin', adminRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.use('/ecommerce', ecommerceSettingsRoutes); // Direct ecommerce settings route
app.use('/api/cpt', cptRoutes);
app.use('/api/post-creation', postCreationRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/signage', signageRoutes);
app.use('/api/crowdfunding', crowdfundingRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/public', publicRoutes); // Public routes (no auth required)
app.use('/api/v1/sessions', sessionsRoutes); // Session management routes

// ACF and Shortcode routes
import acfRoutes from './routes/acf';
import shortcodeRoutes from './routes/shortcodes';
app.use('/admin', acfRoutes);

// API v1 compatibility for media routes
app.use('/api/v1/media/folders', (req: Request, res: Response, next: NextFunction) => {
  req.url = '/folders';
  acfRoutes(req, res, next);
});
app.use('/api/v1/shortcodes', shortcodeRoutes);

// Dashboard endpoints with real data
import { DashboardController } from './controllers/dashboardController';
app.get('/ecommerce/dashboard/stats', DashboardController.getEcommerceStats);
app.get('/api/users/stats', DashboardController.getUserStats);
app.get('/api/admin/notifications', DashboardController.getNotifications);
app.get('/api/admin/activities', DashboardController.getActivities);
app.get('/api/system/health', DashboardController.getSystemHealth);
app.get('/api/admin/stats', DashboardController.getContentStats);
app.get('/api/dashboard/overview', DashboardController.getDashboardOverview);

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
app.use('/api/settings', oauthSettingsRoutes);
app.use('/api/settings', settingsRoutes);

// Email settings routes
import emailSettingsRoutes from './routes/email-settings.routes';
import smtpRoutes from './routes/v1/smtp.routes';
app.use('/api/v1/settings', emailSettingsRoutes);
app.use('/api/v1/smtp', smtpRoutes); // SMTP management routes
app.use('/api/auth', emailAuthRoutes);
app.use('/api/auth/accounts', accountLinkingRoutes); // Account linking routes
app.use('/api/auth/unified', unifiedAuthRoutes); // Unified auth routes
app.use('/api/vendor', vendorRoutes); // Vendor management routes
app.use('/api/suppliers', supplierRoutes); // Supplier management routes
app.use('/api/inventory', inventoryRoutes); // Inventory management routes
app.use('/api/forms', formsRoutes); // Form builder routes
app.use('/api/v1/monitoring', monitoringRoutes); // Monitoring routes
app.use('/api/posts', postsRoutes); // Posts routes (WordPress-compatible)
app.use('/api/reusable-blocks', reusableBlocksRoutes); // Reusable blocks routes (WordPress-compatible)
app.use('/api/block-patterns', blockPatternsRoutes); // Block patterns routes (WordPress-compatible)
app.use('/api/template-parts', templatePartsRoutes); // Template parts routes (WordPress FSE)
app.use('/api/content', contentRoutes); // Content routes - moved to specific path to avoid conflicts
app.use('/api/cms', cmsRoutes); // New CMS routes (Posts, Pages, Media with full features)

// V1 API routes (new standardized endpoints)
app.use('/api/v1/posts', postsRoutes); // Posts routes (WordPress-compatible)
app.use('/api/v1/categories', categoriesRoutes); // Categories routes (fixed)
app.use('/api/v1/custom-post-types', customPostTypesRoutes); // Custom post types (fixed)

// Tag routes
import tagRoutes from './routes/content/tagRoutes';
app.use('/api', tagRoutes); // Tags at /api/tags
app.use('/api/v1/menus', menusRoutes); // Menus routes
app.use('/api/v1/menu-items', menuItemsRoutes); // Menu items routes

// Advanced menu features (Phase 2)
import menuAdvancedRoutes from './routes/menu-advanced';
app.use('/api/v1', menuAdvancedRoutes); // Advanced menu APIs
app.use('/api/v1/content', contentV1Routes);
app.use('/api/v1/platform', platformV1Routes);
app.use('/api/v1/ecommerce', ecommerceV1Routes);
app.use('/api/v1/forum', forumV1Routes);
app.use('/api/v1/media', mediaV1Routes);
app.use('/api/media/gallery', galleryRoutes); // Gallery-specific routes
app.use('/api/media', galleryRoutes); // Standard media routes for gallery block
app.use('/api/v1/apps', appsV1Routes);
app.use('/api/v1/apps/plugins', pluginsV1Routes);
app.use('/api/v1/coupons', couponV1Routes);
app.use('/api/v1/themes', themeRoutes);
app.use('/api/v1/export', exportV1Routes);
app.use('/api/v1/shipping', shippingV1Routes);
app.use('/api/v1/dropshipping', dropshippingV1Routes);
app.use('/api/v1/affiliate', affiliateRoutes); // Affiliate Marketing routes
app.use('/api/v1/affiliate', commissionRoutes); // Affiliate Commission Management routes
app.use('/api/v1/affiliate', phase3Routes); // Affiliate Phase 3 (Analytics, Notifications) routes
app.use('/api/v1', productVariationRoutes); // 상품 변형 라우트
app.use('/api/v1', tossPaymentsRoutes); // 토스페이먼츠 결제 라우트
app.use('/api/v1/settings', settingsV1Routes); // 설정 라우트
app.use('/api/v1/acf', acfV1Routes); // ACF v1 라우트
app.use('/api/v1/shortcodes', shortcodeV1Routes); // Shortcode v1 라우트

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
app.use(errorHandler);

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
setupSwagger(app);

// 서버 시작
const startServer = async () => {
  try {
    // 데이터베이스 초기화 전 상태 확인
    if (AppDataSource.isInitialized) {
      logger.info('Database already initialized');
    } else {
      
      // 환경변수 재확인
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'o4o_platform'
      };
      
      //   ...dbConfig,
      //   password: dbConfig.password ? '***' : 'NOT SET'
      // });
      
      // 데이터베이스 초기화
      await AppDataSource.initialize();
      
      // 마이그레이션 실행 (프로덕션 환경)
      if (process.env.NODE_ENV === 'production') {
        try {
          await AppDataSource.runMigrations();
        } catch (migrationError) {
          logger.warn('Migration error (non-critical):', migrationError);
        }
      }

      // Initialize monitoring services
      try {
        await backupService.initialize();
        await errorAlertService.initialize();
      } catch (serviceError) {
        console.error('⚠️  Failed to initialize monitoring services:', serviceError);
      }

      // Initialize tracking updater job
      try {
        const { trackingUpdaterJob } = await import('./jobs/trackingUpdater');
        trackingUpdaterJob.start();
        logger.info('Tracking updater job started');
      } catch (jobError) {
        console.error('⚠️  Failed to start tracking updater job:', jobError);
      }

      // Initialize email service (graceful, non-blocking)
      try {
        await emailService.initialize();
        const status = emailService.getServiceStatus();
        if (status.available) {
          logger.info('Email service initialized successfully');
        } else if (status.enabled && !status.available) {
          logger.warn('Email service enabled but not available (check SMTP config)');
        } else {
          logger.info('Email service disabled');
        }
      } catch (emailError: any) {
        logger.error('Failed to initialize email service:', {
          error: emailError.message || emailError,
          hint: 'Email functionality will be disabled. Set EMAIL_SERVICE_ENABLED=false to suppress this error.'
        });
        // Don't throw - let the app continue without email
      }
    }
  } catch (dbError) {
    console.error('❌ Database connection failed:', dbError);
    
    // 프로덕션에서는 종료, 개발에서는 계속 실행
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  // Redis 초기화
  let webSocketSessionSync: WebSocketSessionSync | null = null;
  try {
    const redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    // Initialize SessionSyncService
    SessionSyncService.initialize(redisClient);
    
    // Initialize WebSocket session sync if enabled
    if (process.env.SESSION_SYNC_ENABLED === 'true') {
      webSocketSessionSync = new WebSocketSessionSync(io);
    }
    
    // Start crowdfunding schedules
    startCrowdfundingSchedules();
    startInventorySchedules();
  } catch (redisError) {
    logger.warn('Redis connection failed (non-critical):', redisError);
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

startServer().catch(console.error);

// Export services for other modules
export { RealtimeFeedbackService } from './services/realtimeFeedbackService';
export { io }; // Export io instance for use in other modules
export { affiliateSocketManager }; // Export affiliate socket manager for services to use
// Note: realtimeFeedbackService should be initialized after server starts, not here
