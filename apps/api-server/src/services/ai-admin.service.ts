/**
 * AI Admin Service
 * WO-AI-ADMIN-CONTROL-PLANE-V1
 *
 * 관리자 AI 제어 서비스
 * - AI 엔진 관리
 * - AI 정책 관리
 * - AI 대시보드 데이터
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { AiEngine } from '../entities/AiEngine.js';
import { AiQueryPolicy } from '../entities/AiQueryPolicy.js';
import { AiQueryLog } from '../entities/AiQueryLog.js';
import { aiOperationsService } from './ai-operations.service.js';
import logger from '../utils/logger.js';

// ============================================================
// Types
// ============================================================

export interface AiEngineInfo {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  provider: string;
  isActive: boolean;
  isAvailable: boolean;
}

export interface AiPolicySettings {
  freeDailyLimit: number;
  paidDailyLimit: number;
  globalDailyLimit: number;
  warningThreshold: number;
  aiEnabled: boolean;
  defaultModel: string;
  activeEngineId: number | null;
}

export interface AiAdminDashboard {
  // 현재 상태
  activeEngine: AiEngineInfo | null;
  aiEnabled: boolean;
  // 오늘 사용량
  todayUsage: {
    totalQueries: number;
    globalLimit: number;
    usagePercent: number;
  };
  // 가드레일 상태
  operationsStatus: {
    overallStatus: string;
    errorRate: number;
    circuitBreakerState: string;
  };
  // 정책 요약
  policy: {
    freeDailyLimit: number;
    paidDailyLimit: number;
    warningThreshold: number;
  };
}

// ============================================================
// AI Admin Service
// ============================================================

class AiAdminService {
  private static instance: AiAdminService;
  private engineRepo!: Repository<AiEngine>;
  private policyRepo!: Repository<AiQueryPolicy>;
  private logRepo!: Repository<AiQueryLog>;
  private initialized = false;

  private constructor() {}

  static getInstance(): AiAdminService {
    if (!AiAdminService.instance) {
      AiAdminService.instance = new AiAdminService();
    }
    return AiAdminService.instance;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    this.engineRepo = AppDataSource.getRepository(AiEngine);
    this.policyRepo = AppDataSource.getRepository(AiQueryPolicy);
    this.logRepo = AppDataSource.getRepository(AiQueryLog);
    this.initialized = true;

    // Seed default engines if none exist
    await this.seedDefaultEngines();
  }

  /**
   * Seed default AI engines
   */
  private async seedDefaultEngines(): Promise<void> {
    try {
      const count = await this.engineRepo.count();
      if (count > 0) return;

      const defaultEngines: Partial<AiEngine>[] = [
        {
          slug: 'gemini-2.0-flash',
          name: 'Gemini 2.0 Flash',
          description: '빠른 응답 속도와 비용 효율적인 모델. 일반적인 질의에 적합합니다.',
          provider: 'google',
          isActive: true,
          isAvailable: true,
          sortOrder: 1,
        },
        {
          slug: 'gemini-3.0-flash',
          name: 'Gemini 3.0 Flash',
          description: '최신 Gemini 모델. 향상된 추론 능력과 응답 품질을 제공합니다.',
          provider: 'google',
          isActive: false,
          isAvailable: true,
          sortOrder: 2,
        },
      ];

      for (const engine of defaultEngines) {
        await this.engineRepo.save(this.engineRepo.create(engine));
      }

      logger.info('AI Admin: Default engines seeded');
    } catch (error) {
      logger.error('AI Admin: Failed to seed default engines', error);
    }
  }

  // ============================================================
  // Engine Management
  // ============================================================

  /**
   * Get all engines
   */
  async getEngines(): Promise<AiEngineInfo[]> {
    await this.ensureInitialized();

    const engines = await this.engineRepo.find({
      order: { sortOrder: 'ASC' },
    });

    return engines.map(e => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      description: e.description,
      provider: e.provider,
      isActive: e.isActive,
      isAvailable: e.isAvailable,
    }));
  }

  /**
   * Get active engine
   */
  async getActiveEngine(): Promise<AiEngineInfo | null> {
    await this.ensureInitialized();

    const engine = await this.engineRepo.findOne({
      where: { isActive: true },
    });

    if (!engine) return null;

    return {
      id: engine.id,
      slug: engine.slug,
      name: engine.name,
      description: engine.description,
      provider: engine.provider,
      isActive: engine.isActive,
      isAvailable: engine.isAvailable,
    };
  }

  /**
   * Activate an engine (deactivates all others)
   */
  async activateEngine(engineId: number): Promise<AiEngineInfo | null> {
    await this.ensureInitialized();

    const engine = await this.engineRepo.findOne({
      where: { id: engineId },
    });

    if (!engine) {
      throw new Error('엔진을 찾을 수 없습니다.');
    }

    if (!engine.isAvailable) {
      throw new Error('사용할 수 없는 엔진입니다.');
    }

    // Deactivate all engines
    await this.engineRepo.update({}, { isActive: false });

    // Activate selected engine
    engine.isActive = true;
    await this.engineRepo.save(engine);

    // Update policy
    const policy = await this.getOrCreatePolicy();
    policy.activeEngineId = engine.id;
    policy.defaultModel = engine.slug;
    await this.policyRepo.save(policy);

    logger.info(`AI Admin: Engine activated - ${engine.name}`);

    return {
      id: engine.id,
      slug: engine.slug,
      name: engine.name,
      description: engine.description,
      provider: engine.provider,
      isActive: engine.isActive,
      isAvailable: engine.isAvailable,
    };
  }

  // ============================================================
  // Policy Management
  // ============================================================

  /**
   * Get or create policy
   */
  private async getOrCreatePolicy(): Promise<AiQueryPolicy> {
    let policy = await this.policyRepo.findOne({ where: {} });

    if (!policy) {
      policy = this.policyRepo.create({
        freeDailyLimit: 10,
        paidDailyLimit: 100,
        globalDailyLimit: 1000,
        warningThreshold: 80,
        aiEnabled: true,
        defaultModel: 'gemini-2.0-flash',
      });
      await this.policyRepo.save(policy);
    }

    return policy;
  }

  /**
   * Get current policy settings
   */
  async getPolicySettings(): Promise<AiPolicySettings> {
    await this.ensureInitialized();
    const policy = await this.getOrCreatePolicy();

    return {
      freeDailyLimit: policy.freeDailyLimit,
      paidDailyLimit: policy.paidDailyLimit,
      globalDailyLimit: policy.globalDailyLimit,
      warningThreshold: policy.warningThreshold,
      aiEnabled: policy.aiEnabled,
      defaultModel: policy.defaultModel,
      activeEngineId: policy.activeEngineId,
    };
  }

  /**
   * Update policy settings
   */
  async updatePolicySettings(updates: Partial<AiPolicySettings>): Promise<AiPolicySettings> {
    await this.ensureInitialized();
    const policy = await this.getOrCreatePolicy();

    // Apply updates
    if (updates.freeDailyLimit !== undefined) {
      policy.freeDailyLimit = updates.freeDailyLimit;
    }
    if (updates.paidDailyLimit !== undefined) {
      policy.paidDailyLimit = updates.paidDailyLimit;
    }
    if (updates.globalDailyLimit !== undefined) {
      policy.globalDailyLimit = updates.globalDailyLimit;
    }
    if (updates.warningThreshold !== undefined) {
      policy.warningThreshold = Math.max(1, Math.min(100, updates.warningThreshold));
    }
    if (updates.aiEnabled !== undefined) {
      policy.aiEnabled = updates.aiEnabled;
    }

    await this.policyRepo.save(policy);
    logger.info('AI Admin: Policy settings updated');

    return this.getPolicySettings();
  }

  // ============================================================
  // Dashboard
  // ============================================================

  /**
   * Get admin dashboard data
   */
  async getDashboardData(): Promise<AiAdminDashboard> {
    await this.ensureInitialized();

    const [activeEngine, policy] = await Promise.all([
      this.getActiveEngine(),
      this.getOrCreatePolicy(),
    ]);

    // Get today's usage from logs
    const today = new Date().toISOString().split('T')[0];
    const todayQueries = await this.logRepo.count({
      where: { queryDate: today },
    });

    // Get operations status
    const opsSummary = aiOperationsService.getTodaySummary();

    return {
      activeEngine,
      aiEnabled: policy.aiEnabled,
      todayUsage: {
        totalQueries: todayQueries,
        globalLimit: policy.globalDailyLimit,
        usagePercent: policy.globalDailyLimit > 0
          ? Math.round((todayQueries / policy.globalDailyLimit) * 100 * 100) / 100
          : 0,
      },
      operationsStatus: {
        overallStatus: opsSummary.overallStatus,
        errorRate: opsSummary.errorMetrics.errorRate,
        circuitBreakerState: opsSummary.circuitBreaker.state,
      },
      policy: {
        freeDailyLimit: policy.freeDailyLimit,
        paidDailyLimit: policy.paidDailyLimit,
        warningThreshold: policy.warningThreshold,
      },
    };
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(days: number = 7): Promise<{
    daily: Array<{ date: string; queries: number; successRate: number }>;
    total: { queries: number; successCount: number; errorCount: number };
  }> {
    await this.ensureInitialized();

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Get logs for the period
    const logs = await this.logRepo
      .createQueryBuilder('log')
      .where('log.queryDate >= :startDate', { startDate: startDateStr })
      .getMany();

    // Group by date
    const dailyMap = new Map<string, { total: number; success: number }>();
    for (let i = 0; i < days; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyMap.set(dateStr, { total: 0, success: 0 });
    }

    let totalQueries = 0;
    let successCount = 0;

    logs.forEach(log => {
      const dateStr = log.queryDate;
      const dayData = dailyMap.get(dateStr);
      if (dayData) {
        dayData.total++;
        if (log.success) {
          dayData.success++;
        }
      }
      totalQueries++;
      if (log.success) successCount++;
    });

    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        queries: data.total,
        successRate: data.total > 0 ? Math.round((data.success / data.total) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      daily,
      total: {
        queries: totalQueries,
        successCount,
        errorCount: totalQueries - successCount,
      },
    };
  }
}

export const aiAdminService = AiAdminService.getInstance();
export default AiAdminService;
