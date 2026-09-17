import { AppDataSource } from '../database/connection.js';
// MaterializedViewScheduler removed — mv_product_listings view/function never created in DB
// settlementScheduler removed (Phase 8-3 - legacy commerce)
import { backupService } from './BackupService.js';
import { errorAlertService } from './ErrorAlertService.js';
import { marketTrialLifecycleJob } from '../jobs/market-trial-lifecycle.job.js';
import { privacyRetentionJob } from '../jobs/privacy-retention.job.js';
import { spdRevisionExpiryJob } from '../jobs/spd-revision-expiry.job.js';
import { videoTempOutputExpiryJob } from '../jobs/video-temp-output-expiry.job.js';
import { env } from '../utils/env-validator.js';
import logger from '../utils/logger.js';
import {
  transitionStartupState,
  isGracefulStartupAllowed,
  DB_CONNECT_MAX_ATTEMPTS,
  DB_CONNECT_ATTEMPT_TIMEOUT_MS,
  DB_CONNECT_RETRY_BASE_DELAY_MS,
} from '../bootstrap/startup-state.js';

/**
 * ============================================================================
 * Startup Service - Phase 2.5 GRACEFUL_STARTUP Policy
 * ============================================================================
 *
 * GRACEFUL_STARTUP Policy — WO-O4O-API-DATABASE-READINESS-AND-COLD-START-TRAFFIC-GATE-FINAL-CLOSURE-V1 로 개정:
 * - **프로덕션(NODE_ENV=production)에서는 무시된다.** DB 연결이 예산 안에 성공하지 못하면 throw 하고
 *   main.ts 가 process exit non-zero 로 끝낸다. HTTP port 는 열리지 않으므로 Cloud Run TCP startup probe 가
 *   성공하지 않고, 해당 revision 은 트래픽을 받지 않는다.
 * - 비프로덕션(로컬 개발 · 테스트)에서만 `GRACEFUL_STARTUP !== 'false'` 이면 DB 없이 기동을 계속한다
 *   (`bootstrap/startup-state.ts` 의 isGracefulStartupAllowed 가 단일 판정 지점).
 *
 * 폐기한 옛 계약: "Express server MUST start and listen on PORT / DB is optional / Server continues with
 * degraded functionality". 프로덕션에서 DB 없이 port 를 여는 것은 모든 DB 의존 route 를 500 으로 만들 뿐이며,
 * 정식 degraded mode 계약은 존재하지 않는다.
 *
 * DB 연결 예산: 5회 × (연결 timeout 15s) + 백오프 3·6·9·12s = 최대 약 105s.
 * Cloud Run startup probe(TCP · timeout 240s · failureThreshold 1) 안에 들어온다.
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
    transitionStartupState('DB_CONNECTING');

    if (AppDataSource.isInitialized) {
      logger.info('Database already initialized');
      return;
    }

    // 접속 문자열(host · username · database)은 로그에 남기지 않는다 — 설정 존재 여부만 확인한다.
    const dbConfigured = {
      host: !!env.getString('DB_HOST'),
      port: !!env.getNumber('DB_PORT'),
      username: !!env.getString('DB_USERNAME'),
      password: !!env.getString('DB_PASSWORD'),
      database: !!env.getString('DB_NAME'),
    };
    logger.info('Database configuration presence:', dbConfigured);

    let dbConnected = false;
    const maxRetries = DB_CONNECT_MAX_ATTEMPTS;
    const retryDelayMs = DB_CONNECT_RETRY_BASE_DELAY_MS;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Database connection attempt ${attempt}/${maxRetries}`);

        const dbConnectionPromise = AppDataSource.initialize();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database connection timeout')), DB_CONNECT_ATTEMPT_TIMEOUT_MS);
        });

        await Promise.race([dbConnectionPromise, timeoutPromise]);
        logger.info('✅ Database connection successful');
        dbConnected = true;
        break;
      } catch (connectionError) {
        // 에러 객체 전체(address · port · 메시지 속 host:port)를 남기지 않는다 — 코드 · 이름만 기록.
        const err = connectionError as { code?: string; name?: string } | undefined;
        logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed`, {
          code: err?.code ?? 'UNKNOWN',
          name: err?.name ?? 'Error',
        });

        if (attempt < maxRetries) {
          const delay = retryDelayMs * attempt;
          logger.info(`Retrying in ${delay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (!dbConnected) {
      const errorMessage = `Failed to connect to database after ${maxRetries} attempts`;
      logger.error(`⚠️ ${errorMessage}`);

      if (isGracefulStartupAllowed()) {
        // 비프로덕션 전용 — 프로덕션에서는 isGracefulStartupAllowed() 가 항상 false 다.
        logger.warn('🔄 GRACEFUL_STARTUP (non-production): Continuing without database');
        logger.warn('   → DB-dependent features are unavailable in this process');
        return;
      }
      transitionStartupState('FAILED', 'database-connect');
      throw new Error(errorMessage);
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

      // WO-O4O-AUTOMATION-VIDEO-JOB-TEMP-OUTPUT-DOWNLOAD-AND-AUTO-CLEANUP-V1
      // VIDEO Job 완성본 임시 output TTL 만료 → storage object 삭제 + EXPIRED 기록 (부팅+매시간).
      videoTempOutputExpiryJob.start();
      logger.info('✅ Video Temp Output Expiry Job started');

      // WO-O4O-PRIVACY-DATA-RETENTION-ENFORCEMENT-V1
      // 개인정보 보유기간 집행(6 테이블 · 부팅+24h). PRIVACY_RETENTION_MODE=apply 일 때만 실삭제, 기본 dry-run.
      privacyRetentionJob.start();
      logger.info('✅ Privacy Retention Job started');
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
      videoTempOutputExpiryJob.stop();
      privacyRetentionJob.stop();
      logger.info('✅ Schedulers stopped');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

export const startupService = new StartupService();
