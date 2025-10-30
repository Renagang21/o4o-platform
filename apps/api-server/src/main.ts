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
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import passport, { initializePassport } from './config/passportDynamic.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';

// Environment variables are loaded by env-loader (imported first)
// Environment validation
import { env } from './utils/env-validator.js';
import logger from './utils/logger.js';

// Middleware
import { performanceMonitor } from './middleware/performanceMonitor.js';
import { securityMiddleware, sqlInjectionDetection } from './middleware/securityMiddleware.js';

// Services
import { startupService } from './services/startup.service.js';
import { SessionSyncService } from './services/sessionSyncService.js';
import { WebSocketSessionSync } from './websocket/sessionSync.js';

// Configuration
import { setupRoutes } from './config/routes.config.js';
import { setupSwagger } from './config/swagger-enhanced.js';

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
        "https://neture.co.kr", "https://www.neture.co.kr", "https://admin.neture.co.kr", "http://admin.neture.co.kr",
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
      "https://neture.co.kr", "https://www.neture.co.kr", "https://admin.neture.co.kr",
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
// ROUTES SETUP
// ============================================================================
setupRoutes(app);

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

  // Initialize dynamic Passport strategies
  try {
    await initializePassport();
    logger.info('✅ Dynamic Passport strategies initialized');
  } catch (passportError) {
    logger.error('Failed to initialize Passport strategies:', passportError);
  }

  // Initialize all services
  try {
    await startupService.initialize();
  } catch (error) {
    logger.error('Service initialization failed:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
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
export { RealtimeFeedbackService } from './services/realtimeFeedbackService.js';
export { io };
