import { AppDataSource } from '../database/connection';
import { DatabaseChecker } from '../utils/database-checker';
import { MaterializedViewScheduler } from './MaterializedViewScheduler';
import settlementScheduler from './SettlementScheduler';
import { backupService } from './BackupService';
import { errorAlertService } from './ErrorAlertService';
import { env } from '../utils/env-validator';
import logger from '../utils/logger';

/**
 * Startup Service
 * Handles all initialization logic for the application
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
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`Database connection attempt ${attempt}/${maxRetries}`);

        const dbConnectionPromise = AppDataSource.initialize();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database connection timeout')), 10000);
        });

        await Promise.race([dbConnectionPromise, timeoutPromise]);
        logger.info('✅ Database connection successful');
        dbConnected = true;
        break;
      } catch (connectionError) {
        logger.warn(`Database connection attempt ${attempt} failed:`, connectionError);

        if (attempt < maxRetries) {
          logger.info(`Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!dbConnected) {
      const errorMessage = 'Failed to connect to database after multiple attempts';
      logger.error(errorMessage);

      if (process.env.NODE_ENV === 'development') {
        logger.warn('Continuing without database in development mode');
        return;
      } else {
        throw new Error(errorMessage);
      }
    }

    // Database health check
    if (AppDataSource.isInitialized) {
      const dbChecker = new DatabaseChecker(AppDataSource);
      const healthCheck = await dbChecker.performHealthCheck();
      if (!healthCheck.healthy) {
        logger.error('Database health check failed', healthCheck.details);
        if (env.isProduction()) {
          throw new Error('Database health check failed');
        }
      }
    }

    // Run migrations (production only)
    if (env.isProduction() && AppDataSource.isInitialized) {
      try {
        await AppDataSource.runMigrations();
        logger.info('✅ Database migrations completed');
      } catch (migrationError) {
        logger.warn('Migration error (non-critical):', migrationError);
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
      const { appRegistry } = await import('./app-registry.service');
      const { googleAI } = await import('./google-ai.service');

      appRegistry.initialize(AppDataSource);
      await googleAI.initializeApps();
      logger.info('✅ App System initialized (Google AI ready)');
    } catch (appError) {
      logger.error('Failed to initialize App System:', appError);
      throw appError; // Critical error - App System is core functionality
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
      // Materialized View Scheduler
      const refreshInterval = env.isProduction() ? '*/5 * * * *' : '*/10 * * * *';
      MaterializedViewScheduler.start(refreshInterval);
      logger.info('✅ Materialized View Scheduler started');

      // Settlement Scheduler (daily at midnight)
      settlementScheduler.start('0 0 * * *');
      logger.info('✅ Settlement Scheduler started');
    } catch (schedulerError) {
      logger.warn('Scheduler initialization failed (non-critical):', schedulerError);
    }
  }

  /**
   * Initialize upload directories
   */
  private async initializeUploadDirectories(): Promise<void> {
    try {
      const { ensureUploadDirectories } = await import('../middleware/upload.middleware');
      ensureUploadDirectories();
      logger.info('✅ Upload directories initialized');
    } catch (uploadError) {
      logger.error('Failed to initialize upload directories:', uploadError);
      // Don't throw - directories might already exist
    }
  }

  /**
   * Initialize email service (graceful, non-blocking)
   */
  private async initializeEmailService(): Promise<void> {
    try {
      const { emailService } = await import('./email.service');
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
      await import('../workers/ai-job.worker');
      logger.info('✅ AI job worker started (BullMQ)');
    } catch (workerError) {
      logger.error('Failed to start AI job worker:', workerError);
      // Non-critical: server can still start without worker
    }
  }

  /**
   * Initialize image processing folders
   */
  private async initializeImageProcessing(): Promise<void> {
    try {
      const { imageProcessingService } = await import('./image-processing.service');
      await imageProcessingService.initializeFolders();
      logger.info('✅ Image processing folders initialized');
    } catch (folderError) {
      logger.warn('Failed to initialize image processing folders:', folderError);
    }
  }

  /**
   * Graceful shutdown handler
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down services...');

    try {
      MaterializedViewScheduler.stop();
      settlementScheduler.stop();
      logger.info('✅ Schedulers stopped');
    } catch (error) {
      logger.error('Error during shutdown:', error);
    }
  }
}

export const startupService = new StartupService();
