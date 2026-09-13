/**
 * Graceful shutdown setup extracted from main.ts
 * WO-O4O-MAIN-TS-BOOTSTRAP-SPLIT-V1
 */
import { Server as HttpServer } from 'http';
import logger from '../utils/logger.js';
import { transitionStartupState, getStartupState } from './startup-state.js';

interface ShutdownableService {
  shutdown(): Promise<void>;
}

const SHUTDOWN_TIMEOUT_MS = 10000; // 10 seconds for graceful shutdown

export function setupGracefulShutdown(
  httpServer: HttpServer,
  startupService: ShutdownableService,
): void {
  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} signal received: initiating graceful shutdown`);
    // WO-O4O-API-DATABASE-READINESS-AND-COLD-START-TRAFFIC-GATE-FINAL-CLOSURE-V1:
    //   readiness 를 즉시 503 으로 내린다. httpServer.close() 가 신규 연결을 거부하는 것과 별개로,
    //   이미 열린 keep-alive 연결로 들어오는 /health/ready 가 200 을 돌려주지 않게 한다.
    if (getStartupState() !== 'SHUTTING_DOWN') {
      transitionStartupState('SHUTTING_DOWN', signal);
    }

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
}
