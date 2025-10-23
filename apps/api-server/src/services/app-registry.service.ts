/**
 * App Registry Service
 * Manages app registration, instances, and execution
 */

import { Repository, DataSource } from 'typeorm';
import { App } from '../entities/App';
import { AppInstance } from '../entities/AppInstance';
import { AppUsageLog } from '../entities/AppUsageLog';
import { googleAI } from './google-ai.service';
import logger from '../utils/logger';

interface ExecuteOptions {
  appSlug: string;
  action: string;
  payload: any;
  userId?: string;
  businessId?: string | null;
}

interface ExecuteResult {
  success: boolean;
  data?: any;
  error?: {
    type: string;
    message: string;
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    durationMs: number;
  };
}

class AppRegistryService {
  private static instance: AppRegistryService;
  private appRepository!: Repository<App>;
  private instanceRepository!: Repository<AppInstance>;
  private usageLogRepository!: Repository<AppUsageLog>;
  private dataSource!: DataSource;

  private constructor() {}

  static getInstance(): AppRegistryService {
    if (!AppRegistryService.instance) {
      AppRegistryService.instance = new AppRegistryService();
    }
    return AppRegistryService.instance;
  }

  /**
   * Initialize with data source
   */
  initialize(dataSource: DataSource): void {
    this.dataSource = dataSource;
    this.appRepository = dataSource.getRepository(App);
    this.instanceRepository = dataSource.getRepository(AppInstance);
    this.usageLogRepository = dataSource.getRepository(AppUsageLog);
    logger.info('✅ App Registry Service initialized');
  }

  /**
   * Register a new app
   */
  async register(appData: Partial<App>): Promise<App> {
    const app = this.appRepository.create(appData);
    await this.appRepository.save(app);

    logger.info(`📦 App registered: ${app.slug} (${app.provider}/${app.category})`);
    return app;
  }

  /**
   * Get app by slug
   */
  async getBySlug(slug: string): Promise<App | null> {
    return await this.appRepository.findOne({ where: { slug } });
  }

  /**
   * Get all apps by provider
   */
  async getByProvider(provider: string, status: 'active' | 'inactive' | 'deprecated' = 'active'): Promise<App[]> {
    return await this.appRepository.find({
      where: { provider, status }
    });
  }

  /**
   * Get all apps by category
   */
  async getByCategory(category: string, status: 'active' | 'inactive' | 'deprecated' = 'active'): Promise<App[]> {
    return await this.appRepository.find({
      where: { category, status }
    });
  }

  /**
   * Get all active apps
   */
  async getAllActive(): Promise<App[]> {
    return await this.appRepository.find({
      where: { status: 'active' }
    });
  }

  /**
   * Install app (create instance)
   */
  async install(appSlug: string, businessId: string | null = null, config?: Record<string, any>): Promise<AppInstance> {
    const app = await this.getBySlug(appSlug);
    if (!app) {
      throw new Error(`App not found: ${appSlug}`);
    }

    // Check if already installed
    const existing = await this.instanceRepository.findOne({
      where: { appId: app.id, businessId }
    });

    if (existing) {
      throw new Error(`App already installed: ${appSlug}`);
    }

    const instance = this.instanceRepository.create({
      appId: app.id,
      businessId,
      config,
      status: 'active'
    });

    await this.instanceRepository.save(instance);
    logger.info(`✅ App installed: ${appSlug} (business: ${businessId || 'global'})`);

    return instance;
  }

  /**
   * Get app instance
   */
  async getInstance(appSlug: string, businessId: string | null = null): Promise<AppInstance | null> {
    const app = await this.getBySlug(appSlug);
    if (!app) {
      return null;
    }

    return await this.instanceRepository.findOne({
      where: { appId: app.id, businessId },
      relations: ['app']
    });
  }

  /**
   * Update app instance config
   */
  async updateConfig(appSlug: string, config: Record<string, any>, businessId: string | null = null): Promise<AppInstance> {
    const instance = await this.getInstance(appSlug, businessId);
    if (!instance) {
      throw new Error(`App instance not found: ${appSlug}`);
    }

    instance.config = { ...instance.config, ...config };
    await this.instanceRepository.save(instance);

    logger.info(`⚙️  App config updated: ${appSlug}`);
    return instance;
  }

  /**
   * Execute app action
   */
  async execute(options: ExecuteOptions): Promise<ExecuteResult> {
    const startTime = Date.now();
    const { appSlug, action, payload, userId, businessId = null } = options;

    try {
      // Get app instance
      const instance = await this.getInstance(appSlug, businessId);
      if (!instance) {
        throw new Error(`App not installed: ${appSlug}`);
      }

      if (instance.status !== 'active') {
        throw new Error(`App is not active: ${appSlug}`);
      }

      // Validate config (e.g., API key)
      if (!instance.config || Object.keys(instance.config).length === 0) {
        throw new Error(`App not configured: ${appSlug}. Please set API keys in settings.`);
      }

      // Execute app-specific logic
      // This will be delegated to provider-specific services
      const result = await this.executeAppLogic(instance, action, payload);

      const durationMs = Date.now() - startTime;

      // Log usage
      await this.logUsage({
        appId: instance.appId,
        userId,
        businessId,
        action,
        status: 'success',
        inputTokens: result.usage?.inputTokens,
        outputTokens: result.usage?.outputTokens,
        durationMs,
        model: result.model,
        metadata: { payload, result: result.data }
      });

      // Increment usage count
      instance.usageCount += 1;
      await this.instanceRepository.save(instance);

      return {
        success: true,
        data: result.data,
        usage: {
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
          durationMs
        }
      };

    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      const errorType = this.categorizeError(error);

      // Log error
      await this.logUsage({
        appId: (await this.getBySlug(appSlug))?.id || '',
        userId,
        businessId,
        action,
        status: 'error',
        errorType,
        errorMessage: error.message,
        durationMs,
        metadata: { payload }
      });

      logger.error(`❌ App execution failed: ${appSlug}/${action}`, error);

      return {
        success: false,
        error: {
          type: errorType,
          message: error.message
        }
      };
    }
  }

  /**
   * Execute app-specific logic (to be overridden by provider services)
   */
  private async executeAppLogic(instance: AppInstance, action: string, payload: any): Promise<any> {
    const app = instance.app;

    // Delegate to provider-specific services
    switch (app.provider) {
      case 'google':
        return await googleAI.execute(instance.config || {}, action, payload);

      default:
        throw new Error(`App execution not implemented for provider: ${app.provider}`);
    }
  }

  /**
   * Log usage
   */
  private async logUsage(data: Partial<AppUsageLog>): Promise<void> {
    const log = this.usageLogRepository.create(data);
    await this.usageLogRepository.save(log);
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('api key') || message.includes('unauthorized') || message.includes('authentication')) {
      return 'AUTH';
    }
    if (message.includes('quota') || message.includes('limit exceeded')) {
      return 'QUOTA';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT';
    }
    if (message.includes('not configured') || message.includes('not installed')) {
      return 'CONFIG';
    }

    return 'PROVIDER_ERROR';
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(options: {
    appSlug?: string;
    businessId?: string | null;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    const queryBuilder = this.usageLogRepository.createQueryBuilder('log')
      .leftJoinAndSelect('log.app', 'app');

    if (options.appSlug) {
      queryBuilder.andWhere('app.slug = :slug', { slug: options.appSlug });
    }

    if (options.businessId !== undefined) {
      queryBuilder.andWhere('log.businessId = :businessId', { businessId: options.businessId });
    }

    if (options.userId) {
      queryBuilder.andWhere('log.userId = :userId', { userId: options.userId });
    }

    if (options.startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate: options.endDate });
    }

    const logs = await queryBuilder.getMany();

    // Calculate statistics
    const totalCalls = logs.length;
    const successCalls = logs.filter(log => log.status === 'success').length;
    const errorCalls = logs.filter(log => log.status === 'error').length;
    const totalInputTokens = logs.reduce((sum, log) => sum + (log.inputTokens || 0), 0);
    const totalOutputTokens = logs.reduce((sum, log) => sum + (log.outputTokens || 0), 0);
    const avgDuration = logs.length > 0
      ? logs.reduce((sum, log) => sum + (log.durationMs || 0), 0) / logs.length
      : 0;

    return {
      totalCalls,
      successCalls,
      errorCalls,
      successRate: totalCalls > 0 ? (successCalls / totalCalls * 100).toFixed(2) : 0,
      totalInputTokens,
      totalOutputTokens,
      avgDuration: Math.round(avgDuration)
    };
  }
}

export const appRegistry = AppRegistryService.getInstance();
export default AppRegistryService;
