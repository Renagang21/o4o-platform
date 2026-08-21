/**
 * App Registry Service
 * Manages `apps` (App) registration and usage statistics read.
 *
 * WO-O4O-APP-INSTANCES-LIFECYCLE-CENSUS-AND-CANONICAL-DISPOSITION-V1 (retire):
 *   테넌트별 앱 설치 instance (`app_instances` / AppInstance) 계약을 제거했다.
 *   - production 0 row · inbound/outbound FK 0 · runtime read/write consumer 0
 *   - 이 계약을 노출하던 `routes/apps.ts` + `controllers/apps.controller.ts` 는
 *     이미 8d58243bf · 32273509a 에서 제거되어 `/api/v1/apps/:slug/install|instance|config|execute`
 *     엔드포인트가 존재하지 않았다(= install/getInstance/updateConfig/execute 는 도달 불가).
 *   - 앱 설치·활성 상태의 정본은 `app_registry` (AppManager · `/api/v1/admin/apps`) 이며
 *     본 서비스와 무관하다. AI 실행 경로의 정본은 서버측 AI proxy(`@o4o/ai-core`) 다.
 *
 * 주의(명칭 충돌): 본 서비스 이름은 "AppRegistry" 지만 `app_registry` 테이블을 다루지 않는다.
 *   본 서비스 = `apps` 테이블 / `AppManager` = `app_registry` 테이블.
 */

import { Repository, DataSource } from 'typeorm';
import { App } from '../entities/App.js';
import { AppUsageLog } from '../entities/AppUsageLog.js';
import { AIUsageLog, AIProvider } from '../entities/AIUsageLog.js';
import logger from '../utils/logger.js';

class AppRegistryService {
  private static instance: AppRegistryService;
  private appRepository!: Repository<App>;
  private usageLogRepository!: Repository<AppUsageLog>;
  private aiUsageLogRepository!: Repository<AIUsageLog>;
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
    this.usageLogRepository = dataSource.getRepository(AppUsageLog);
    this.aiUsageLogRepository = dataSource.getRepository(AIUsageLog);
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
   * Get usage statistics
   * Combines both AppUsageLog (for app execute actions) and AIUsageLog (for direct AI generation)
   */
  async getUsageStats(options: {
    appSlug?: string;
    businessId?: string | null;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any> {
    // Query AppUsageLog (app system logs)
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

    const appLogs = await queryBuilder.getMany();

    // Also query AIUsageLog (AI Proxy logs) for AI apps
    let aiLogs: AIUsageLog[] = [];

    // Map app slug to AI provider
    const aiProviderMap: Record<string, AIProvider> = {
      'google-gemini-text': AIProvider.GEMINI,
      'openai': AIProvider.OPENAI,
      'anthropic-claude': AIProvider.CLAUDE,
    };

    const aiProvider = options.appSlug ? aiProviderMap[options.appSlug] : undefined;

    if (aiProvider || !options.appSlug) {
      const aiQueryBuilder = this.aiUsageLogRepository.createQueryBuilder('log');

      if (aiProvider) {
        aiQueryBuilder.andWhere('log.provider = :provider', { provider: aiProvider });
      }

      if (options.userId) {
        aiQueryBuilder.andWhere('log.userId = :userId', { userId: options.userId });
      }

      if (options.startDate) {
        aiQueryBuilder.andWhere('log.createdAt >= :startDate', { startDate: options.startDate });
      }

      if (options.endDate) {
        aiQueryBuilder.andWhere('log.createdAt <= :endDate', { endDate: options.endDate });
      }

      aiLogs = await aiQueryBuilder.getMany();
    }

    // Combine statistics from both sources
    const appTotalCalls = appLogs.length;
    const appSuccessCalls = appLogs.filter(log => log.status === 'success').length;
    const appErrorCalls = appLogs.filter(log => log.status === 'error').length;
    const appInputTokens = appLogs.reduce((sum, log) => sum + (log.inputTokens || 0), 0);
    const appOutputTokens = appLogs.reduce((sum, log) => sum + (log.outputTokens || 0), 0);
    const appDurations = appLogs.map(log => log.durationMs || 0);

    const aiTotalCalls = aiLogs.length;
    const aiSuccessCalls = aiLogs.filter(log => log.status === 'success').length;
    const aiErrorCalls = aiLogs.filter(log => log.status === 'error').length;
    const aiInputTokens = aiLogs.reduce((sum, log) => sum + (log.promptTokens || 0), 0);
    const aiOutputTokens = aiLogs.reduce((sum, log) => sum + (log.completionTokens || 0), 0);
    const aiDurations = aiLogs.map(log => log.durationMs || 0);

    const totalCalls = appTotalCalls + aiTotalCalls;
    const successCalls = appSuccessCalls + aiSuccessCalls;
    const errorCalls = appErrorCalls + aiErrorCalls;
    const totalInputTokens = appInputTokens + aiInputTokens;
    const totalOutputTokens = appOutputTokens + aiOutputTokens;

    const allDurations = [...appDurations, ...aiDurations];
    const avgDuration = allDurations.length > 0
      ? allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length
      : 0;

    return {
      totalCalls,
      successCalls,
      errorCalls,
      successRate: totalCalls > 0 ? ((successCalls / totalCalls) * 100).toFixed(2) : '0.00',
      totalInputTokens,
      totalOutputTokens,
      avgDuration: Math.round(avgDuration)
    };
  }
}

export const appRegistry = AppRegistryService.getInstance();
export default AppRegistryService;
