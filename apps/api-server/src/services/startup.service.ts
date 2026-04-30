import { AppDataSource } from '../database/connection.js';
import { DatabaseChecker } from '../utils/database-checker.js';
// MaterializedViewScheduler removed — mv_product_listings view/function never created in DB
// settlementScheduler removed (Phase 8-3 - legacy commerce)
import { backupService } from './BackupService.js';
import { errorAlertService } from './ErrorAlertService.js';
import { env } from '../utils/env-validator.js';
import logger from '../utils/logger.js';

/**
 * ============================================================================
 * Startup Service - Phase 2.5 GRACEFUL_STARTUP Policy
 * ============================================================================
 *
 * GRACEFUL_STARTUP Policy:
 * - Default: true (GRACEFUL_STARTUP !== 'false')
 * - When true: DB/Redis/external service failures are logged but don't crash
 * - When false: Fail-fast behavior for strict production requirements
 *
 * Responsibilities:
 * 1. "기동 책임" (Startup Responsibility):
 *    - Express server MUST start and listen on PORT
 *    - /health endpoint MUST always respond
 *
 * 2. "의존성 책임" (Dependency Responsibility):
 *    - DB/Redis/external services are optional
 *    - Failures are logged with warnings
 *    - Server continues with degraded functionality
 *
 * Usage:
 * - Cloud Run: GRACEFUL_STARTUP=true (default) - server always starts
 * - Production with DB: GRACEFUL_STARTUP=false - fail-fast if DB unavailable
 *
 * ============================================================================
 * Phase 5-B: Auth ↔ Infra Separation
 * ============================================================================
 *
 * StartupService는 Infra 계층의 책임을 담당한다:
 * - DB 초기화 / 연결 상태 관리
 * - Health Check를 통한 서비스 가용성 판단
 *
 * Auth 계층은 StartupService의 결과에 의존하지 않는다:
 * - Auth는 503을 반환하지 않음
 * - DB 실패 시 Auth는 자연스럽게 500 반환
 * - 503 판단은 Health Check의 책임
 *
 * @see docs/architecture/auth-infra-separation.md
 * ============================================================================
 */
export class StartupService {
  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    logger.info('Starting initialization sequence...');

    await this.initializeDatabase();
    await this.initializeAppSystem();
    await this.initializeMonitoring();
    await this.initializeSchedulers();
    await this.initializeWebhooksAndBatchJobs();
    await this.initializeUploadDirectories();
    await this.initializeEmailService();
    await this.initializeWorkers();
    await this.initializeImageProcessing();

    logger.info('✅ Initialization sequence completed');
  }

  /**
   * Initialize database connection with retry logic
   */
  private async initializeDatabase(): Promise<void> {
    logger.info('Initializing database...');

    if (AppDataSource.isInitialized) {
      logger.info('Database already initialized');
      return;
    }

    const dbConfig = {
      host: env.getString('DB_HOST'),
      port: env.getNumber('DB_PORT'),
      username: env.getString('DB_USERNAME'),
      password: env.getString('DB_PASSWORD'),
      database: env.getString('DB_NAME')
    };

    logger.info('Database configuration:', {
      ...dbConfig,
      password: dbConfig.password ? '***' : 'NOT SET'
    });

    let dbConnected = false;
    const maxRetries = 5;
    const retryDelayMs = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Database connection attempt ${attempt}/${maxRetries}`);

        const dbConnectionPromise = AppDataSource.initialize();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database connection timeout')), 15000);
        });

        await Promise.race([dbConnectionPromise, timeoutPromise]);
        logger.info('✅ Database connection successful');
        dbConnected = true;
        break;
      } catch (connectionError) {
        logger.warn(`Database connection attempt ${attempt} failed:`, connectionError);

        if (attempt < maxRetries) {
          const delay = retryDelayMs * attempt;
          logger.info(`Retrying in ${delay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (!dbConnected) {
      const errorMessage = 'Failed to connect to database after multiple attempts';
      logger.error(`⚠️ ${errorMessage}`);

      // GRACEFUL_STARTUP Policy: Default to true (only false when explicitly set)
      const gracefulStartup = process.env.GRACEFUL_STARTUP !== 'false';

      if (gracefulStartup) {
        logger.warn('🔄 GRACEFUL_STARTUP=true: Continuing without database');
        logger.warn('   → /health will respond, but DB-dependent features are unavailable');
        return;
      } else {
        logger.error('GRACEFUL_STARTUP=false: Failing due to database connection failure');
        throw new Error(errorMessage);
      }
    }

    // Database health check
    if (AppDataSource.isInitialized) {
      try {
        const dbChecker = new DatabaseChecker(AppDataSource);
        const healthCheck = await dbChecker.performHealthCheck();
        if (!healthCheck.healthy) {
          logger.error('Database health check failed', healthCheck.details);
          // GRACEFUL_STARTUP Policy: Only throw if explicitly disabled
          const gracefulStartup = process.env.GRACEFUL_STARTUP !== 'false';
          if (!gracefulStartup) {
            throw new Error('Database health check failed');
          }
          logger.warn('🔄 GRACEFUL_STARTUP=true: Continuing despite health check failure');
        }
      } catch (healthCheckError) {
        logger.error('Database health check error:', healthCheckError);
        const gracefulStartup = process.env.GRACEFUL_STARTUP !== 'false';
        if (!gracefulStartup) {
          throw healthCheckError;
        }
        logger.warn('🔄 GRACEFUL_STARTUP=true: Continuing despite health check error');
      }
    }

    // Run migrations (production only) - with individual error handling
    if (env.isProduction() && AppDataSource.isInitialized) {
      try {
        // Get pending migrations
        const pendingMigrations = await AppDataSource.showMigrations();
        if (pendingMigrations) {
          logger.info('📋 Pending migrations detected, running...');
        }

        // Try to run all migrations first
        const executedMigrations = await AppDataSource.runMigrations({ transaction: 'each' });
        logger.info(`✅ Database migrations completed (${executedMigrations.length} executed)`);
      } catch (migrationError) {
        // Log the error but continue - migrations may have partially succeeded
        logger.warn('⚠️ Migration error (continuing):', (migrationError as Error).message);

        // Try to run Seed migrations individually (high priority)
        try {
          const seedMigrations = AppDataSource.migrations.filter(m =>
            m.name?.includes('Seed') && parseInt(m.name?.match(/\d+/)?.[0] || '0') >= 9900000000000
          );

          for (const migration of seedMigrations) {
            try {
              const queryRunner = AppDataSource.createQueryRunner();
              // MigrationInterface has up() method directly
              await (migration as { up: (qr: typeof queryRunner) => Promise<void> }).up(queryRunner);
              await queryRunner.release();
              logger.info(`✅ Seed migration executed: ${migration.name}`);
            } catch (seedError) {
              logger.debug(`Seed migration skipped: ${migration.name} - ${(seedError as Error).message}`);
            }
          }
        } catch {
          logger.debug('Seed migration fallback skipped');
        }
      }
    }
  }

  /**
   * Initialize App Registry Service (Google AI, future OpenAI, etc.)
   */
  private async initializeAppSystem(): Promise<void> {
    if (!AppDataSource.isInitialized) {
      logger.warn('Skipping App System initialization (database not connected)');
      return;
    }

    try {
      const { appRegistry } = await import('./app-registry.service.js');

      appRegistry.initialize(AppDataSource);

      // App registration (WO-O4O-AI-LLM-PATH-CONSOLIDATION: moved from google-ai.service.ts)
      const geminiApp = await appRegistry.getBySlug('google-gemini-text');
      if (!geminiApp) {
        await appRegistry.register({
          slug: 'google-gemini-text',
          name: 'Gemini 텍스트 생성',
          provider: 'google',
          category: 'text-generation',
          type: 'integration',
          description: 'Google Gemini API를 사용한 텍스트 생성',
          icon: 'sparkles',
          version: '1.0.0',
          status: 'active',
          isSystem: true,
          manifest: {
            displayName: 'Gemini Text Generation',
            category: 'AI Text',
            provides: {
              apis: [{ path: '/execute', method: 'POST', description: 'Generate text using Gemini' }],
            },
            settingsSchema: {
              apiKey: { type: 'string', required: true, description: 'Google AI API Key', secret: true },
              model: {
                type: 'select',
                options: ['gemini-3.0-flash', 'gemini-3.0-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
                default: 'gemini-3.0-flash',
                description: 'Gemini model to use',
              },
              temperature: { type: 'number', default: 0.7, min: 0, max: 2, description: 'Sampling temperature' },
            },
          },
        });
        logger.info('Gemini app registered');
      }

      logger.info('✅ App System initialized');
    } catch (appError) {
      logger.error('Failed to initialize App System:', appError);
      // Temporarily non-critical during clean DB reset + app installation
      // Will be re-enabled after core apps are installed
      logger.warn('⚠️  Continuing without App System (clean DB mode)');
      // throw appError; // Critical error - App System is core functionality
    }
  }

  /**
   * Initialize monitoring services (production only)
   */
  private async initializeMonitoring(): Promise<void> {
    if (!env.isProduction()) {
      logger.info('Skipping monitoring services (development mode)');
      return;
    }

    try {
      await backupService.initialize();
      await errorAlertService.initialize();
      logger.info('✅ Monitoring services initialized');
    } catch (serviceError) {
      logger.warn('Monitoring services initialization failed (non-critical):', serviceError);
    }
  }

  /**
   * Initialize schedulers
   */
  private async initializeSchedulers(): Promise<void> {
    if (!AppDataSource.isInitialized) {
      logger.warn('Skipping schedulers (database not connected)');
      return;
    }

    try {
      // Materialized View Scheduler removed — mv_product_listings does not exist in DB

      // Settlement Scheduler removed (Phase 8-3 - legacy commerce)
      logger.info('✅ Settlement Scheduler skipped (legacy commerce removed)');
    } catch (schedulerError) {
      logger.warn('Scheduler initialization failed (non-critical):', schedulerError);
    }
  }

  /**
   * Initialize webhook subscribers and commission batch jobs
   */
  private async initializeWebhooksAndBatchJobs(): Promise<void> {
    if (!AppDataSource.isInitialized) {
      logger.warn('Skipping webhooks and batch jobs (database not connected)');
      return;
    }

    // Webhook subscribers and commission batch job removed (Phase 8-3 - legacy commerce)
    logger.info('✅ Webhook/batch jobs skipped (legacy commerce removed)');
  }

  /**
   * Initialize upload directories
   * NOTE: Skipped in Cloud Run (read-only filesystem, uses memory storage)
   */
  private async initializeUploadDirectories(): Promise<void> {
    // Cloud Run uses read-only filesystem - skip directory creation
    // K_SERVICE is set by Cloud Run to identify the service
    if (process.env.K_SERVICE) {
      logger.info('✅ Upload directories skipped (Cloud Run uses memory storage)');
      return;
    }

    try {
      const { ensureUploadDirectories } = await import('../middleware/upload.middleware.js');
      ensureUploadDirectories();
      logger.info('✅ Upload directories initialized');
    } catch (uploadError) {
      logger.warn('Failed to initialize upload directories (non-critical):', uploadError);
      // Don't throw - directories might already exist or filesystem is read-only
    }
  }

  /**
   * Initialize email service (graceful, non-blocking)
   */
  private async initializeEmailService(): Promise<void> {
    try {
      const { emailService } = await import('./email.service.js');
      await emailService.initialize();
      const status = emailService.getServiceStatus();
      if (status.available) {
        logger.info('✅ Email service initialized');
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
  }

  /**
   * Initialize AI job worker (BullMQ)
   */
  private async initializeWorkers(): Promise<void> {
    try {
      await import('../workers/ai-job.worker.js');
      logger.info('✅ AI job worker started (BullMQ)');
    } catch (workerError) {
      logger.error('Failed to start AI job worker:', workerError);
      // Non-critical: server can still start without worker
    }
  }

  /**
   * Initialize image processing folders
   * NOTE: Legacy image processing removed in Phase 8-3
   */
  private async initializeImageProcessing(): Promise<void> {
    // Image processing service removed (Phase 8-3 - legacy CMS)
    logger.info('✅ Image processing skipped (legacy CMS removed)');
  }

  /**
   * Graceful shutdown handler
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down services...');

    try {
      // settlementScheduler removed (Phase 8-3 - legacy commerce)
      // MaterializedViewScheduler removed — mv_product_listings does not exist in DB
      logger.info('✅ Schedulers stopped');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

export const startupService = new StartupService();
