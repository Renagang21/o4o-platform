import { AppDataSource } from '../database/connection.js';
// MaterializedViewScheduler removed — mv_product_listings view/function never created in DB
// settlementScheduler removed (Phase 8-3 - legacy commerce)
import { backupService } from './BackupService.js';
import { errorAlertService } from './ErrorAlertService.js';
import { marketTrialLifecycleJob } from '../jobs/market-trial-lifecycle.job.js';
import { spdRevisionExpiryJob } from '../jobs/spd-revision-expiry.job.js';
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
 *
 * ============================================================================
 * WO-O4O-DATABASE-MIGRATION-OWNERSHIP-STARTUP-HEALTH-AND-LEGACY-DEPLOY-TOOLING-FINAL-CLOSURE-V1
 * ============================================================================
 *
 * **API startup 은 migration 을 실행하지 않는다.** 운영 migration 의 단일 소유자는
 * deploy workflow 의 Cloud Run Job `o4o-api-migrations`(`dist/migrate.js`) 이며,
 * 그 Job 이 성공한 뒤에만 API revision 이 배포된다 (`.github/workflows/deploy-api.yml`).
 *
 * 제거한 것 (2026-09-12, 30일 프로덕션 로그 실측 근거):
 *   - `showMigrations()` → `runMigrations({transaction:'each'})` — 서비스 인스턴스가 부팅마다 실행,
 *     실제로 17회 스키마를 변경했다 (Job 과 경쟁).
 *   - migration 실패를 `warn` 으로 삼키고 기동 계속 — 3회 발생.
 *   - 실패 시 Seed* migration 의 `up(queryRunner)` 직접 호출 fallback — 45회 실행,
 *     `typeorm_migrations` 를 우회해 비멱등 · 실패 시 queryRunner 미release.
 *   - `DatabaseChecker` health check — requiredTables=[] 라 항상 healthy 인 no-op.
 *
 * startup 은 **DB 연결과 서비스 초기화만** 담당한다. readiness 계약은 `routes/health.ts` 의
 * `/health/ready`(`SELECT 1`) 가 담당하고, liveness 는 `main.ts` 의 즉시 `/health` 가 담당한다.
 * ============================================================================
 */
export class StartupService {
  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    logger.info('Starting initialization sequence...');

    await this.initializeDatabase();
    // initializeAppSystem (legacy `apps` 테이블 · google-gemini-text 자기 seed) retired — WO-O4O-UNPROVISIONED-FORM-AND-LEGACY-APP-AXIS-FINAL-DISPOSITION-V1
    //   읽기 소비자 0 · AI 실행 정본은 서버측 AI proxy(@o4o/ai-core) · 앱 정본은 AppRegistry(app_registry).
    await this.initializeMonitoring();
    await this.initializeSchedulers();
    await this.initializeWebhooksAndBatchJobs();
    await this.initializeUploadDirectories();
    await this.initializeEmailService();
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

    // migration 은 여기서 실행하지 않는다 — 소유자는 deploy workflow 의 Cloud Run Job (헤더 주석 참조).
    logger.info('Database ready — migrations are owned by the deploy migration job, not by API startup');
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

      // WO-NETURE-MARKET-TRIAL-LIFECYCLE-AUTO-TRANSITION-V1
      // Auto-advance RECRUITING trials whose fundingEndAt has elapsed.
      marketTrialLifecycleJob.start();
      logger.info('✅ Market Trial Lifecycle Job started');

      // WO-O4O-SPD-REVISION-REQUEST-EXPIRY-SCHEDULER-V1
      // 공급자 STORE 설명서 수정 요청(revision_requested) 만료(due<now) 자동 hard delete — 매일(부팅+24h).
      spdRevisionExpiryJob.start();
      logger.info('✅ SPD Revision Expiry Job started');
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
      marketTrialLifecycleJob.stop();
      spdRevisionExpiryJob.stop();
      logger.info('✅ Schedulers stopped');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

export const startupService = new StartupService();
