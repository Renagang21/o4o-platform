/**
 * O4O Platform API Server — Bootstrap Entry Point
 *
 * This file is the slim orchestrator for server startup.
 * Heavy logic is delegated to bootstrap/ modules:
 *   - bootstrap/setup-middlewares.ts  — Express middleware chain
 *   - bootstrap/register-routes.ts   — Route registration (core + domain)
 *   - bootstrap/setup-shutdown.ts    — Graceful shutdown handlers
 *
 * WO-O4O-MAIN-TS-BOOTSTRAP-SPLIT-V1
 */

// MUST be first: Load environment variables before anything else
import './env-loader.js';

// Initialize OpenTelemetry before any other imports
import { initTelemetry } from './utils/telemetry.js';
const telemetrySDK = initTelemetry();

import 'reflect-metadata';
import express, { Application } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';

import { env } from './utils/env-validator.js';
import logger from './utils/logger.js';

// Services
import { startupService } from './services/startup.service.js';
import { SessionSyncService } from './services/sessionSyncService.js';
import { WebSocketSessionSync } from './websocket/sessionSync.js';

// Configuration
import { initializePassport } from './config/passportDynamic.js';
import { setupSwagger } from './config/swagger-enhanced.js';
import { AppDataSource } from './database/connection.js';

// Bootstrap modules
import { setupMiddlewares, getAllowedOrigins } from './bootstrap/setup-middlewares.js';
import { registerCoreRoutes, registerDomainRoutes } from './bootstrap/register-routes.js';
import { setupGracefulShutdown } from './bootstrap/setup-shutdown.js';

// ============================================================================
// APP & SERVER CREATION
// ============================================================================
const app: Application = express();
app.set('trust proxy', true);

const httpServer = createServer(app);

// CLOUD RUN PORT CONFIGURATION
const port = Number(process.env.PORT) || 8080;
logger.info(`[STARTUP] PORT configuration: process.env.PORT=${process.env.PORT}, resolved port=${port}`);

// Redis enabled flag (used for session store + session sync)
const redisEnabled = env.getString('REDIS_ENABLED', 'false') !== 'false' && env.isProduction();

// ============================================================================
// SOCKET.IO CONFIGURATION
// ============================================================================
const io = new Server(httpServer, {
  cors: {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      const allowedOrigins = getAllowedOrigins();
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
// IMMEDIATE HEALTH ENDPOINT — CLOUD RUN STARTUP PROBE
// ============================================================================
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

app.get('/', (req, res, next) => {
  if (req.headers['user-agent']?.includes('GoogleHC') || req.query.health === 'true') {
    return res.status(200).json({ status: 'alive', port: port });
  }
  next();
});

logger.info(`[STARTUP] Immediate health endpoint registered on port ${port}`);

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================
setupMiddlewares(app, { redisEnabled });

// ============================================================================
// CORE ROUTES (before server listen)
// ============================================================================
await registerCoreRoutes(app);

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

  // CLOUD RUN CRITICAL: START LISTENING IMMEDIATELY
  const host = process.env.HOST || '0.0.0.0';
  await new Promise<void>((resolve) => {
    httpServer.listen(port as number, host as string, () => {
      logger.info(`🚀 API Server listening on ${host}:${port} (Cloud Run ready)`);
      resolve();
    });
  });

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
  }

  // GRACEFUL_STARTUP Policy (Phase 2.5)
  const gracefulStartup = process.env.GRACEFUL_STARTUP !== 'false';

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

  // Initialize dynamic Passport strategies (AFTER database is initialized)
  try {
    await initializePassport();
    logger.info('✅ Dynamic Passport strategies initialized');
  } catch (passportError) {
    logger.error('Failed to initialize Passport strategies:', passportError);
  }

  // Register domain routes (modules + all domain APIs)
  await registerDomainRoutes(app, AppDataSource);

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

  logger.info('✅ Background initialization complete');
};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
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
setupGracefulShutdown(httpServer, startupService);

// Export services for other modules
// NOTE: RealtimeFeedbackService removed in v1 - beta feature deprecated
