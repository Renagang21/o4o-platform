/**
 * Graceful shutdown setup extracted from main.ts
 * WO-O4O-MAIN-TS-BOOTSTRAP-SPLIT-V1
 */
import { Server as HttpServer } from 'http';
import logger from '../utils/logger.js';

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
