import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// 환경변수 로드 (우선순위: .env.production > .env)
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';

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
      console.log(`✅ Successfully loaded env from: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.warn('⚠️ No .env file found, using system environment variables');
}

// 환경변수 검증
console.log('🔧 Environment Configuration:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   Config file: ${envFile}`);
console.log(`   DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
console.log(`   DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || 'NOT SET'}`);

import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from './config/passport';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';

// Database connection
import { AppDataSource } from './database/connection';
import { SessionSyncService } from './services/sessionSyncService';
import { WebSocketSessionSync } from './websocket/sessionSync';
import { errorHandler } from './middleware/errorHandler';
import { performanceMonitor } from './middleware/performanceMonitor';
import { securityMiddleware, sqlInjectionDetection } from './middleware/securityMiddleware';
import logger from './utils/simpleLogger';

// Monitoring services
import { backupService } from './services/BackupService';
import { errorAlertService } from './services/ErrorAlertService';
import { securityAuditService } from './services/SecurityAuditService';

// 라우트 imports 
import authRoutes from './routes/auth';
import authV2Routes from './routes/auth-v2';
import socialAuthRoutes from './routes/social-auth';
import userRoutes from './routes/user';
import userManagementRoutes from './routes/users.routes';
import adminRoutes from './routes/admin';
import ecommerceRoutes from './routes/ecommerce';
import cptRoutes from './routes/cpt';
import postCreationRoutes from './routes/post-creation';
import servicesRoutes from './routes/services';
import signageRoutes from './routes/signage';
import contentRoutes from './routes/content';
import publicRoutes from './routes/public';
import settingsRoutes from './routes/settingsRoutes';
import crowdfundingRoutes from './routes/crowdfunding';
import linkedAccountsRoutes from './routes/linked-accounts';
import vendorRoutes from './routes/vendor';
import formsRoutes from './routes/forms';
import monitoringRoutes from './routes/monitoring';

// 중복 제거 - 이미 상단에서 로드됨

const app: Application = express();

// IMPORTANT: Set trust proxy IMMEDIATELY after creating the app
// This must be done before any middleware that uses req.ip
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
  console.log('✅ Trust proxy enabled for production environment');
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
        // Production domains
        "https://neture.co.kr",
        "https://www.neture.co.kr",
        "https://admin.neture.co.kr",
        "https://shop.neture.co.kr",
        "https://forum.neture.co.kr",
        "https://signage.neture.co.kr",
        "https://funding.neture.co.kr",
        "https://auth.neture.co.kr"
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
console.log('🚀 Starting server on port:', port);

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

// CORS configuration for multiple origins
const corsOptions: CorsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Get allowed origins from environment variable
    const envOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [];
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:3011",
      "http://localhost:3000", // main-site
      "http://localhost:3001", // admin dashboard
      "http://localhost:3002", // ecommerce
      "http://localhost:3003", // crowdfunding
      // Web server IPs
      "http://13.125.144.8:3000", // web server main-site
      "http://13.125.144.8:3001", // web server admin-dashboard
      // Production domains
      "https://neture.co.kr",
      "https://www.neture.co.kr",
      "https://admin.neture.co.kr",
      "https://shop.neture.co.kr",
      "https://forum.neture.co.kr",
      "https://signage.neture.co.kr",
      "https://funding.neture.co.kr",
      "https://auth.neture.co.kr",
      // Port 8443 URLs
      "https://neture.co.kr:8443",
      "https://www.neture.co.kr:8443",
      "https://admin.neture.co.kr:8443",
      // Add environment-defined origins
      ...envOrigins
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Add performance monitoring middleware early in the chain
app.use(performanceMonitor);

// Security middleware
app.use(securityMiddleware);
app.use(sqlInjectionDetection);

app.use(cookieParser() as any);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware for passport (required for OAuth)
app.use(session({
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
}) as any);

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
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    service: 'api-server'
  });
});

// Apply rate limiting to specific endpoints
app.use('/api/v1/auth/sso/check', ssoCheckLimiter);
app.use('/api/public', publicLimiter);

// Apply standard rate limiting to other endpoints
app.use('/api/', limiter);

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth/v2', authV2Routes); // Cookie-based auth routes
app.use('/api/v1/auth', socialAuthRoutes); // Social auth routes
app.use('/api/v1/auth', linkedAccountsRoutes); // Linked accounts routes
app.use('/api/users', userRoutes);
app.use('/api/v1/users', userManagementRoutes); // New user management routes
app.use('/api/admin', adminRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.use('/api/cpt', cptRoutes);
app.use('/api/post-creation', postCreationRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/signage', signageRoutes);
app.use('/api/crowdfunding', crowdfundingRoutes);
app.use('/api/public', publicRoutes); // Public routes (no auth required)

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
    console.error('Error fetching posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts'
    });
  }
});

app.use('/api/settings', settingsRoutes);
app.use('/api/vendor', vendorRoutes); // Vendor management routes
app.use('/api/forms', formsRoutes); // Form builder routes
app.use('/api/v1/monitoring', monitoringRoutes); // Monitoring routes
app.use('/api', contentRoutes);


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

// Socket.IO 연결 처리 (기존 기능 유지)
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_admin', () => {
    socket.join('admin_notifications');
    console.log('Admin joined notifications room');
  });

  socket.on('new_user_registered', (data) => {
    io.to('admin_notifications').emit('new_registration', {
      message: '새로운 사용자가 등록되었습니다.',
      user: data,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
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

// 서버 시작
const startServer = async () => {
  try {
    // 데이터베이스 초기화 전 상태 확인
    if (AppDataSource.isInitialized) {
      console.log('✅ Database already initialized');
    } else {
      console.log('🔄 Initializing database connection...');
      
      // 환경변수 재확인
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'o4o_platform'
      };
      
      console.log('📊 Database config:', {
        ...dbConfig,
        password: dbConfig.password ? '***' : 'NOT SET'
      });
      
      // 데이터베이스 초기화
      await AppDataSource.initialize();
      console.log('✅ Database connection established');
      
      // 마이그레이션 실행 (프로덕션 환경)
      if (process.env.NODE_ENV === 'production') {
        try {
          await AppDataSource.runMigrations();
          console.log('✅ Database migrations completed');
        } catch (migrationError) {
          console.log('⚠️  Migration error:', (migrationError as Error).message);
        }
      }

      // Initialize monitoring services
      try {
        await backupService.initialize();
        await errorAlertService.initialize();
        console.log('✅ Monitoring services initialized');
      } catch (serviceError) {
        console.error('⚠️  Failed to initialize monitoring services:', serviceError);
      }
    }
  } catch (dbError) {
    console.error('❌ Database connection failed:', dbError);
    console.log('📌 Check your database configuration and ensure PostgreSQL is running');
    
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
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      console.log('⚠️  Redis connection error:', err.message);
    });

    // Initialize SessionSyncService
    SessionSyncService.initialize(redisClient);
    
    // Initialize WebSocket session sync if enabled
    if (process.env.SESSION_SYNC_ENABLED === 'true') {
      webSocketSessionSync = new WebSocketSessionSync(io);
      console.log('✅ WebSocket session sync initialized');
    }
  } catch (redisError) {
    console.log('⚠️  Redis initialization failed:', (redisError as Error).message);
    console.log('📌 Running without session synchronization');
  }
  
  httpServer.listen(port, () => {
    console.log(`🚀 Neture API Server running on port ${port}`);
    console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API Base URL: http://localhost:${port}/api`);
    console.log(`🎨 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3011'}`);
    console.log(`📡 Health check: http://localhost:${port}/api/health`);
    console.log(`🍪 Cookie Domain: ${process.env.COOKIE_DOMAIN || 'none (default)'}`);
    console.log(`🔄 Session Sync: ${process.env.SESSION_SYNC_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
  });
};

startServer().catch(console.error);

// Export services for other modules
export { RealtimeFeedbackService } from './services/realtimeFeedbackService';
export { io }; // Export io instance for use in other modules
// Note: realtimeFeedbackService should be initialized after server starts, not here
