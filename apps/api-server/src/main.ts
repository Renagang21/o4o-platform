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

import { env } from './utils/env-validator.js';
import logger from './utils/logger.js';

// Services
import { startupService } from './services/startup.service.js';
import { transitionStartupState, isGracefulStartupAllowed, logStartupPhase } from './bootstrap/startup-state.js';

// Configuration
import { initializePassport } from './config/passportDynamic.js';
import { setupSwagger } from './config/swagger-enhanced.js';
import { AppDataSource } from './database/connection.js';

// Bootstrap modules
import { setupMiddlewares, getAllowedOrigins } from './bootstrap/setup-middlewares.js';
import { registerCoreRoutes, registerDomainRoutes } from './bootstrap/register-routes.js';
import { setupGracefulShutdown } from './bootstrap/setup-shutdown.js';
import { globalErrorHandler } from './common/middleware/global-error.middleware.js';
// WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1
import { resolveTrustedProxyHops } from './utils/trusted-client-ip.js';

// ============================================================================
// APP & SERVER CREATION
// ============================================================================
const app: Application = express();
// WO-O4O-TRUSTED-CLIENT-IP-AND-SECURITY-LOG-REDACTION-V1:
//   기존 `true` 는 req.ip 를 X-Forwarded-For **최좌측**(클라이언트가 주입 가능한 위치)으로 만든다.
//   프로덕션 실측 결과 체인은 [<주입값>,] <client-ip>, <lb-ip> 이므로 신뢰 hop 수는 2 다.
//   상세 근거는 utils/trusted-client-ip.ts 주석 참조.
app.set('trust proxy', resolveTrustedProxyHops());

const httpServer = createServer(app);

// CLOUD RUN PORT CONFIGURATION
const port = Number(process.env.PORT) || 8080;
logger.info(`[STARTUP] PORT configuration: process.env.PORT=${process.env.PORT}, resolved port=${port}`);


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
// LIVENESS ENDPOINT (/health) — 프로세스 생존만 뜻한다. DB 상태를 반영하지 않는다.
//   WO-O4O-API-DATABASE-READINESS-AND-COLD-START-TRAFFIC-GATE-FINAL-CLOSURE-V1:
//   HTTP listen 은 아래 startServer() 에서 DB 연결·라우트 등록이 끝나 READY 로 전환된 뒤에만 호출된다.
//   따라서 이 핸들러가 "등록" 됐다는 것과 port 가 "열렸다" 는 것은 다르다 — Cloud Run TCP startup probe 는
//   listen 이후에만 성공한다. 준비 여부는 /health/ready (routes/health.ts) 가 답한다.
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

logger.info(`[STARTUP] Liveness handler registered (port ${port} is NOT open yet — listen happens after READY)`);

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================
setupMiddlewares(app);

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
  logStartupPhase('process_start', { nodeEnv: process.env.NODE_ENV || 'development' });
  const host = process.env.HOST || '0.0.0.0';

  // ── Phase 1: Non-DB initialization ──

  try {
    const { validatePaymentConfig } = await import('./config/payment.config.js');
    validatePaymentConfig();
  } catch (paymentConfigError) {
    logger.warn('Payment config validation skipped:', paymentConfigError);
  }

  try {
    const { initializeCPT } = await import('./init/cpt.init.js');
    await initializeCPT();
  } catch (cptError) {
    logger.error('CPT Registry initialization failed:', cptError);
  }

  // ── Phase 2: Database + Service initialization ──

  try {
    await startupService.initialize();
  } catch (error) {
    logger.error('⚠️ Service initialization failed:', error);
    if (!isGracefulStartupAllowed()) {
      // 프로덕션: port 를 열지 않고 non-zero 로 종료한다. TCP startup probe 가 성공하지 않으므로
      // 이 revision 은 트래픽을 받지 않고, 기존 serving revision 이 유지된다.
      logger.error('💀 Startup FAILED (production): exiting without opening the HTTP port');
      process.exit(1);
    }
    logger.warn('🔄 GRACEFUL_STARTUP (non-production): Continuing with degraded functionality');
  }

  try {
    await initializePassport();
    logger.info('✅ Dynamic Passport strategies initialized');
  } catch (passportError) {
    logger.error('Failed to initialize Passport strategies:', passportError);
  }

  // ── Phase 3: Domain routes — BEFORE listen (eliminates 404 window) ──
  // WO-O4O-CARE-AI-CHAT-STABILITY-FIX-V1

  await registerDomainRoutes(app, AppDataSource);

  // ── Global error handler — AFTER all routes, BEFORE listen ──
  // WO-O4O-GLOBAL-ERROR-HANDLER-ENABLEMENT-V1
  app.use(globalErrorHandler);

  // ── Phase 4: READY → listen — DB 연결 · 라우트 등록이 끝난 뒤에만 port 를 연다 ──
  //   (WO-O4O-API-DATABASE-READINESS-AND-COLD-START-TRAFFIC-GATE-FINAL-CLOSURE-V1)
  //   비프로덕션 graceful 경로에서는 DB 없이 여기 도달할 수 있다. 그 경우 상태는 DB_CONNECTING 에 머물고
  //   /health/ready 는 503 을 유지한다 — 준비 안 됨을 200 으로 위장하지 않는다.

  if (AppDataSource.isInitialized) {
    transitionStartupState('READY');
  }

  await new Promise<void>((resolve) => {
    httpServer.listen(port as number, host as string, () => {
      logStartupPhase('http_listen', { host, port });
      logger.info(`🚀 API Server listening on ${host}:${port} (all routes registered)`);
      resolve();
    });
  });

  // ── Phase 5: Post-listen (non-critical services) ──

  logger.info('✅ Server fully initialized — all routes active');
};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  if (!isGracefulStartupAllowed()) {
    logger.error('💀 Startup FAILED (production): exiting process, HTTP port stays closed');
    process.exit(1);
  }
  logger.warn('🔄 Server startup failed but GRACEFUL_STARTUP (non-production) enabled: Process will continue');
  logger.warn('   Note: Some features may not work. Check logs for details.');
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================
setupGracefulShutdown(httpServer, startupService);

// Export services for other modules
// NOTE: RealtimeFeedbackService removed in v1 - beta feature deprecated
