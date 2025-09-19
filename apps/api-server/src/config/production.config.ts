import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Express } from 'express';
import { specs, swaggerUi } from '../swagger/swagger.config';
import { performanceMiddleware } from '../middleware/performance.middleware';
import errorHandler from '../middleware/errorHandler.middleware';
import { cacheService } from '../services/cache.service';
import logger from '../utils/logger';

// Rate limiting configurations
export const rateLimitConfig = {
  // General API rate limiting
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Strict rate limiting for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
    message: {
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Commission and financial operations
  financial: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 requests per minute for financial operations
    message: {
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many financial operation requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Webhook endpoints
  webhook: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 50, // Allow more requests for webhooks
    message: {
      success: false,
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many webhook requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

// Security configuration
export const securityConfig: {
  helmet: ReturnType<typeof helmet>;
  cors: any;
  compression: ReturnType<typeof compression>;
} = {
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for dashboard
    frameguard: false, // Disable X-Frame-Options for iframe preview support
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }),
  
  cors: {
    origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  
  compression: compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Compression level (1-9, 6 is good balance)
    threshold: 1024, // Only compress responses larger than 1KB
  }),
};

// Performance optimization configurations
export const performanceConfig = {
  // Connection pool settings (for database)
  database: {
    maxConnections: 20,
    minConnections: 5,
    acquireTimeout: 60000,
    timeout: 30000,
    logQueries: false, // Disable in production
  },

  // Redis cache settings
  cache: {
    defaultTTL: 300, // 5 minutes
    maxMemoryUsage: '256mb',
    keyPrefix: 'o4o:',
    enableCompression: true,
  },

  // Request timeout settings
  timeout: {
    server: 30000, // 30 seconds
    keepAlive: 65000, // 65 seconds (should be longer than server timeout)
  },
};

// Monitoring and health check configurations
export const monitoringConfig = {
  healthCheck: {
    interval: 30000, // Check every 30 seconds
    timeout: 5000, // 5 second timeout for checks
  },
  
  metrics: {
    collectInterval: 60000, // Collect metrics every minute
    retentionPeriod: 86400000, // Keep metrics for 24 hours
  },
};

// Production middleware setup
export const setupProductionMiddleware = (app: Express) => {
  // Security middleware
  app.use(securityConfig.helmet as any);
  app.use(securityConfig.compression as any);

  // Performance monitoring
  app.use(performanceMiddleware);

  // Rate limiting
  app.use('/api/auth', rateLimitConfig.auth);
  app.use('/api/webhooks', rateLimitConfig.webhook);
  app.use('/api/vendors/*/commission', rateLimitConfig.financial);
  app.use('/api/suppliers/*/settlement', rateLimitConfig.financial);
  app.use('/api/admin', rateLimitConfig.financial);
  app.use('/api', rateLimitConfig.general);

  // API Documentation (only in development or with specific flag)
  if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DOCS === 'true') {
    app.use('/api-docs', swaggerUi.serve as any);
    app.get('/api-docs', swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'O4O Platform API Documentation',
    }) as any);
  }

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    });
  });

  // Detailed health check endpoint
  app.get('/health/detailed', async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: { status: 'unknown' },
        redis: { status: 'unknown' },
        memory: { status: 'healthy' },
        disk: { status: 'healthy' },
      },
      performance: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    };

    try {
      // Check database connection
      const dbCheck = await checkDatabaseHealth();
      health.services.database = dbCheck;
      
      // Check Redis connection
      const redisCheck = await checkRedisHealth();
      health.services.redis = redisCheck;

      // Check memory usage
      const memCheck = checkMemoryHealth();
      health.services.memory = memCheck;

      // Determine overall status
      const allServicesHealthy = Object.values(health.services)
        .every(service => service.status === 'healthy');
      
      health.status = allServicesHealthy ? 'healthy' : 'degraded';

      res.status(allServicesHealthy ? 200 : 503).json(health);
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        ...health,
        status: 'unhealthy',
        error: error.message,
      });
    }
  });

  // Error handling middleware (should be last)
  app.use(errorHandler);
};

// Health check functions
async function checkDatabaseHealth() {
  try {
    const { AppDataSource } = await import('../database/connection');
    if (!AppDataSource.isInitialized) {
      return { status: 'unhealthy', message: 'Database not initialized' };
    }

    // Simple query to check connection
    await AppDataSource.query('SELECT 1');
    return { status: 'healthy', message: 'Database connected' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

async function checkRedisHealth() {
  try {
    const stats = await cacheService.getCacheStats();
    if (!stats.connected) {
      return { status: 'unhealthy', message: 'Redis disconnected' };
    }

    return { 
      status: 'healthy', 
      message: 'Redis connected',
      keyCount: stats.keyCount,
      memoryUsed: stats.memoryUsed,
    };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

function checkMemoryHealth() {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
  const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;

  if (heapUsagePercent > 90) {
    return { 
      status: 'critical', 
      message: `High memory usage: ${heapUsagePercent.toFixed(1)}%`,
      heapUsed: `${heapUsedMB.toFixed(1)}MB`,
      heapTotal: `${heapTotalMB.toFixed(1)}MB`,
    };
  } else if (heapUsagePercent > 75) {
    return { 
      status: 'warning', 
      message: `Elevated memory usage: ${heapUsagePercent.toFixed(1)}%`,
      heapUsed: `${heapUsedMB.toFixed(1)}MB`,
      heapTotal: `${heapTotalMB.toFixed(1)}MB`,
    };
  }

  return { 
    status: 'healthy', 
    message: `Memory usage normal: ${heapUsagePercent.toFixed(1)}%`,
    heapUsed: `${heapUsedMB.toFixed(1)}MB`,
    heapTotal: `${heapTotalMB.toFixed(1)}MB`,
  };
}

// Graceful shutdown handler
export const setupGracefulShutdown = (server: any) => {
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close database connection
        const { AppDataSource } = await import('../database/connection');
        if (AppDataSource.isInitialized) {
          await AppDataSource.destroy();
          logger.info('Database connection closed');
        }

        // Stop cache service
        // cacheService.disconnect(); // Implement this method

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });

    // Force close after timeout
    setTimeout(() => {
      logger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, 30000); // 30 seconds timeout
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

const config = {
  rateLimitConfig,
  securityConfig,
  performanceConfig,
  monitoringConfig,
  setupProductionMiddleware,
  setupGracefulShutdown,
} as const;

export default config;