/**
 * AI Query Service
 * Phase 1 - 서비스 맥락 기반 AI 질의 처리
 *
 * 핵심 원칙:
 * - Gemini Flash 단일 모델
 * - 무료/유료 차이: 일 사용 상한선만
 * - 토큰 단위 X, 질문 횟수 기준
 * - AI 응답에 항상 서비스 맥락/정보/제품/카테고리 포함
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../database/connection.js';
import { AiQueryPolicy } from '../entities/AiQueryPolicy.js';
import { AiQueryLog } from '../entities/AiQueryLog.js';
import type { AiQueryContextType } from '../entities/AiQueryLog.js';
import { AiSettings } from '../entities/AiSettings.js';
import { googleAI } from './google-ai.service.js';
import logger from '../utils/logger.js';

// Re-export type for consumers
export type { AiQueryContextType };

export interface AiQueryRequest {
  userId: string;
  question: string;
  contextType: AiQueryContextType;
  contextId?: string | null;
  contextData?: Record<string, any> | null;
  isPaidUser?: boolean;
  // Phase 2: B2C 컨텍스트 정보
  serviceId?: string;
  storeId?: string;
  productId?: string;
  categoryId?: string;
  pageType?: 'home' | 'store' | 'product' | 'category' | 'content';
}

// Phase 2: 맥락 정보 UI 데이터 구조
export interface ContextInfoPanel {
  store?: {
    id: string;
    name: string;
    url?: string;
    description?: string;
  };
  products?: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    price?: number;
    url?: string;
  }>;
  category?: {
    id: string;
    name: string;
    description?: string;
  };
  additionalInfo?: {
    title: string;
    content: string;
  }[];
}

export interface AiQueryResponse {
  success: boolean;
  answer?: string;
  attachedInfo?: Record<string, any>;
  remainingQueries?: number;
  error?: string;
  errorCode?: 'LIMIT_EXCEEDED' | 'AI_DISABLED' | 'AI_ERROR' | 'NO_API_KEY';
  // Phase 2: 맥락 정보 UI 데이터
  contextPanel?: ContextInfoPanel;
}

export interface DailyUsageInfo {
  used: number;
  limit: number;
  remaining: number;
}

class AiQueryService {
  private static instance: AiQueryService;
  private policyRepo!: Repository<AiQueryPolicy>;
  private logRepo!: Repository<AiQueryLog>;
  private settingsRepo!: Repository<AiSettings>;
  private initialized = false;

  private constructor() {}

  static getInstance(): AiQueryService {
    if (!AiQueryService.instance) {
      AiQueryService.instance = new AiQueryService();
    }
    return AiQueryService.instance;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    if (!AppDataSource.isInitialized) {
      throw new Error('Database not initialized');
    }

    this.policyRepo = AppDataSource.getRepository(AiQueryPolicy);
    this.logRepo = AppDataSource.getRepository(AiQueryLog);
    this.settingsRepo = AppDataSource.getRepository(AiSettings);
    this.initialized = true;
  }

  /**
   * Get current AI policy settings
   */
  async getPolicy(): Promise<AiQueryPolicy> {
    await this.ensureInitialized();

    let policy = await this.policyRepo.findOne({ where: { id: 1 } });

    if (!policy) {
      // Create default policy if not exists
      policy = this.policyRepo.create({
        freeDailyLimit: 10,
        paidDailyLimit: 100,
        aiEnabled: true,
        defaultModel: 'gemini-3.0-flash',
        systemPrompt: `당신은 O4O 플랫폼의 AI 어시스턴트입니다.
사용자의 질문에 친절하고 정확하게 답변해주세요.
제공된 맥락 정보(상품, 카테고리, 서비스 정보)를 적극 활용하여 답변하세요.
한국어로 답변해주세요.`
      });
      await this.policyRepo.save(policy);
    }

    return policy;
  }

  /**
   * Update AI policy settings
   */
  async updatePolicy(updates: Partial<AiQueryPolicy>): Promise<AiQueryPolicy> {
    await this.ensureInitialized();

    const policy = await this.getPolicy();
    Object.assign(policy, updates);
    return await this.policyRepo.save(policy);
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get daily usage for a user
   */
  async getDailyUsage(userId: string, isPaidUser: boolean = false): Promise<DailyUsageInfo> {
    await this.ensureInitialized();

    const policy = await this.getPolicy();
    const today = this.getTodayDate();

    const usedCount = await this.logRepo.count({
      where: {
        userId,
        queryDate: today,
        success: true
      }
    });

    const limit = isPaidUser ? policy.paidDailyLimit : policy.freeDailyLimit;
    const remaining = Math.max(0, limit - usedCount);

    return {
      used: usedCount,
      limit,
      remaining
    };
  }

  /**
   * Check if user can make AI query
   */
  async canQuery(userId: string, isPaidUser: boolean = false): Promise<{ allowed: boolean; reason?: string }> {
    await this.ensureInitialized();

    const policy = await this.getPolicy();

    if (!policy.aiEnabled) {
      return { allowed: false, reason: 'AI 기능이 비활성화되어 있습니다.' };
    }

    const usage = await this.getDailyUsage(userId, isPaidUser);

    if (usage.remaining <= 0) {
      return {
        allowed: false,
        reason: `오늘의 AI 질문 횟수(${usage.limit}회)를 모두 사용했습니다. 내일 다시 이용해주세요.`
      };
    }

    return { allowed: true };
  }

  /**
   * Get Gemini API key
   */
  private async getApiKey(): Promise<string | null> {
    await this.ensureInitialized();

    // Try database first
    const setting = await this.settingsRepo.findOne({
      where: { provider: 'gemini', isActive: true }
    });

    if (setting?.apiKey) {
      return setting.apiKey;
    }

    // Fallback to environment
    return process.env.GEMINI_API_KEY || null;
  }

  /**
   * Build system prompt with context
   */
  private buildSystemPrompt(
    basePrompt: string,
    contextData?: Record<string, any> | null
  ): string {
    let prompt = basePrompt;

    if (contextData) {
      prompt += '\n\n[참조 정보]\n';

      if (contextData.product) {
        prompt += `상품: ${JSON.stringify(contextData.product, null, 2)}\n`;
      }
      if (contextData.category) {
        prompt += `카테고리: ${contextData.category}\n`;
      }
      if (contextData.pageTitle) {
        prompt += `페이지: ${contextData.pageTitle}\n`;
      }
      if (contextData.serviceInfo) {
        prompt += `서비스 정보: ${JSON.stringify(contextData.serviceInfo, null, 2)}\n`;
      }
    }

    return prompt;
  }

  /**
   * Phase 2: Build context panel data for UI
   * 맥락 정보 UI 패널 데이터 생성
   */
  private buildContextPanel(request: AiQueryRequest): ContextInfoPanel {
    const panel: ContextInfoPanel = {};

    // 매장 정보
    if (request.storeId && request.contextData?.store) {
      panel.store = {
        id: request.storeId,
        name: request.contextData.store.name || '매장',
        url: request.contextData.store.url,
        description: request.contextData.store.description
      };
    }

    // 상품 정보
    if (request.contextData?.products && Array.isArray(request.contextData.products)) {
      panel.products = request.contextData.products.slice(0, 3).map((p: any) => ({
        id: p.id || '',
        name: p.name || p.title || '',
        imageUrl: p.imageUrl || p.image,
        price: p.price,
        url: p.url
      }));
    } else if (request.productId && request.contextData?.product) {
      panel.products = [{
        id: request.productId,
        name: request.contextData.product.name || request.contextData.product.title || '',
        imageUrl: request.contextData.product.imageUrl || request.contextData.product.image,
        price: request.contextData.product.price,
        url: request.contextData.product.url
      }];
    }

    // 카테고리 정보
    if (request.categoryId && request.contextData?.category) {
      panel.category = {
        id: request.categoryId,
        name: typeof request.contextData.category === 'string'
          ? request.contextData.category
          : request.contextData.category.name || '',
        description: typeof request.contextData.category === 'object'
          ? request.contextData.category.description
          : undefined
      };
    }

    // 추가 정보 (서비스 정보 등)
    const additionalInfo: { title: string; content: string }[] = [];

    if (request.contextData?.serviceInfo) {
      additionalInfo.push({
        title: '서비스 정보',
        content: typeof request.contextData.serviceInfo === 'string'
          ? request.contextData.serviceInfo
          : request.contextData.serviceInfo.description || ''
      });
    }

    if (request.pageType) {
      const pageTypeLabels: Record<string, string> = {
        home: '홈페이지',
        store: '매장 페이지',
        product: '상품 상세',
        category: '카테고리',
        content: '컨텐츠'
      };
      additionalInfo.push({
        title: '현재 페이지',
        content: pageTypeLabels[request.pageType] || request.pageType
      });
    }

    if (additionalInfo.length > 0) {
      panel.additionalInfo = additionalInfo;
    }

    return panel;
  }

  /**
   * Process AI query
   */
  async query(request: AiQueryRequest): Promise<AiQueryResponse> {
    await this.ensureInitialized();

    const startTime = Date.now();
    const today = this.getTodayDate();

    // 1. Check if query is allowed
    const canQueryResult = await this.canQuery(request.userId, request.isPaidUser);
    if (!canQueryResult.allowed) {
      return {
        success: false,
        error: canQueryResult.reason,
        errorCode: 'LIMIT_EXCEEDED'
      };
    }

    // 2. Get policy and API key
    const policy = await this.getPolicy();
    const apiKey = await this.getApiKey();

    if (!apiKey) {
      return {
        success: false,
        error: 'AI API 키가 설정되지 않았습니다. 관리자에게 문의하세요.',
        errorCode: 'NO_API_KEY'
      };
    }

    // 3. Build prompt with context
    const systemPrompt = this.buildSystemPrompt(
      policy.systemPrompt || '',
      request.contextData
    );

    const fullPrompt = `${systemPrompt}\n\n[사용자 질문]\n${request.question}`;

    try {
      // 4. Call Gemini API
      const response = await googleAI.executeGemini(apiKey, {
        prompt: fullPrompt,
        model: policy.defaultModel,
        temperature: 0.7,
        maxOutputTokens: 2048
      });

      const answer = response.data.text;
      const durationMs = Date.now() - startTime;

      // 5. Save log
      const log = this.logRepo.create({
        userId: request.userId,
        question: request.question,
        answer,
        contextType: request.contextType,
        contextId: request.contextId || null,
        contextData: request.contextData || null,
        attachedInfo: request.contextData || null,
        queryDate: today,
        success: true,
        durationMs
      });
      await this.logRepo.save(log);

      // 6. Get remaining queries
      const usage = await this.getDailyUsage(request.userId, request.isPaidUser);

      // 7. Phase 2: Build context panel for UI
      const contextPanel = this.buildContextPanel(request);

      return {
        success: true,
        answer,
        attachedInfo: request.contextData || undefined,
        remainingQueries: usage.remaining,
        contextPanel: Object.keys(contextPanel).length > 0 ? contextPanel : undefined
      };

    } catch (error: any) {
      const durationMs = Date.now() - startTime;

      // Save error log
      const log = this.logRepo.create({
        userId: request.userId,
        question: request.question,
        answer: null,
        contextType: request.contextType,
        contextId: request.contextId || null,
        contextData: request.contextData || null,
        queryDate: today,
        success: false,
        errorMessage: error.message,
        durationMs
      });
      await this.logRepo.save(log);

      logger.error('AI Query error:', error);

      return {
        success: false,
        error: 'AI 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        errorCode: 'AI_ERROR'
      };
    }
  }

  /**
   * Get query logs for a user
   */
  async getUserLogs(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ logs: AiQueryLog[]; total: number }> {
    await this.ensureInitialized();

    const [logs, total] = await this.logRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset
    });

    return { logs, total };
  }
}

export const aiQueryService = AiQueryService.getInstance();
export default AiQueryService;
