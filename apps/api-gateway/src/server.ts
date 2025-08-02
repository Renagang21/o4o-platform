import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import responseTime from 'response-time';
import cookieParser from 'cookie-parser';
import Redis from 'ioredis';

import { gatewayConfig, validateConfig } from './config/gateway.config.js';
import { logger, requestLogger } from './utils/logger.js';
import { ServiceRegistry } from './services/ServiceRegistry.js';
import { RouteManager } from './services/RouteManager.js';
import { AuthMiddleware } from './middleware/auth.middleware.js';
import { RateLimitMiddleware } from './middleware/rateLimit.middleware.js';
import { ProxyMiddleware } from './middleware/proxy.middleware.js';

// Validate configuration on startup
try {
  validateConfig();
} catch (error) {
  logger.error('Invalid configuration', { error: error.message });
  process.exit(1);
}

// Create Express app
const app: any = express();

// Initialize Redis client
let redis: Redis | undefined;
if (gatewayConfig.redis.host) {
  redis = new Redis({
    host: gatewayConfig.redis.host,
    port: gatewayConfig.redis.port,
    password: gatewayConfig.redis.password,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  redis.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
  });
}

// Initialize services
const serviceRegistry = new ServiceRegistry(redis);
const authMiddleware = new AuthMiddleware(redis);
const rateLimitMiddleware = new RateLimitMiddleware(redis);
const proxyMiddleware = new ProxyMiddleware(serviceRegistry);
const routeManager = new RouteManager(
  app,
  authMiddleware,
  rateLimitMiddleware,
  proxyMiddleware
);

// Global middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API gateway
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (gatewayConfig.cors.origins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: gatewayConfig.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

app.use(compression() as any);
app.use(responseTime() as any);
app.use(cookieParser() as any);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Global rate limiting
app.use(rateLimitMiddleware.global());

// Initialize routes
routeManager.initializeRoutes();

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Don't leak error details in production
  const message = gatewayConfig.env === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(err.status || 500).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use((req: any, res: any) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.path
  });
});

// Start server
const server = app.listen(gatewayConfig.port, () => {
  logger.info(`API Gateway started`, {
    port: gatewayConfig.port,
    env: gatewayConfig.env,
    services: Object.keys(gatewayConfig.services).length,
    routes: gatewayConfig.routes.length
  });

  // Start health checks
  serviceRegistry.startHealthChecks(30000); // Every 30 seconds
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Stop health checks
  serviceRegistry.stopHealthChecks();

  // Close Redis connection
  if (redis) {
    await redis.quit();
    logger.info('Redis connection closed');
  }

  // Exit
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});

export { app, server };