/**
 * AiPolicyExecutorService — WO-O4O-AI-POLICY-SYSTEM-V1
 *
 * Scope 기반 LLM 정책 실행기.
 * ai_llm_policies 테이블에서 scope별 설정을 캐시·해결 → ai-core execute() 호출.
 *
 * 해결 우선순위:
 *   1. 인메모리 캐시 (60초 TTL)
 *   2. ai_llm_policies 테이블 (scope = ?)
 *   3. 하드코딩 기본값 fallback (gemini-3.0-flash, 0.3, 2048)
 *
 * API key 해결:
 *   1. ai_settings 테이블 (provider = ?, isactive = true)
 *   2. process.env.{PROVIDER}_API_KEY
 */

import type { DataSource } from 'typeorm';
import { execute } from '@o4o/ai-core';
import type { ExecuteResult, AIExecuteProviderId } from '@o4o/ai-core';
import type { AiPolicyScope } from './ai-policy-scope.js';
import { AiLlmPolicy } from './entities/ai-llm-policy.entity.js';
import { AIUsageLog, AIProvider, AIUsageStatus } from '../../entities/AIUsageLog.js';
import type { AiQuotaService } from './ai-quota.service.js';

// ─────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────

interface CachedPolicy {
  policy: AiLlmPolicy;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 1분

// Provider → env key 매핑
const API_KEY_ENV: Record<string, string> = {
  gemini: 'GEMINI_API_KEY',
  openai: 'OPENAI_API_KEY',
  claude: 'CLAUDE_API_KEY',
};

// ─────────────────────────────────────────────────────
// Overrides (서비스가 호출 시 개별 설정 변경 가능)
// ─────────────────────────────────────────────────────

export interface PolicyExecuteOverrides {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  responseMode?: 'json' | 'text';
  userId?: string;
}

// ─────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────

export class AiPolicyExecutorService {
  private cache: Map<string, CachedPolicy> = new Map();

  constructor(private dataSource: DataSource, private quotaService?: AiQuotaService) {}

  /**
   * Scope 기반 LLM 호출.
   *
   * @param scope     - 정책 scope (CARE_CHAT, STORE_INSIGHT 등)
   * @param systemPrompt - 시스템 프롬프트
   * @param userPrompt   - 유저 프롬프트
   * @param overrides    - 호출별 설정 오버라이드
   * @returns ExecuteResult (content, model, tokens, durationMs, requestId)
   */
  async execute(
    scope: AiPolicyScope,
    systemPrompt: string,
    userPrompt: string,
    overrides?: PolicyExecuteOverrides,
  ): Promise<ExecuteResult> {
    // 1. Policy 해결
    const policy = await this.resolvePolicy(scope);

    if (!policy.isEnabled) {
      throw new Error(`AI_DISABLED: scope '${scope}' is disabled`);
    }

    // 2. Quota check
    if (this.quotaService) {
      const quotaResult = await this.quotaService.checkQuota(scope, overrides?.userId);
      if (!quotaResult.allowed) {
        const detail = quotaResult.exceeded.map(e =>
          `${e.layer}/${e.layerKey} ${e.limitType} ${e.period}: ${e.currentValue}/${e.limitValue}`
        ).join('; ');
        throw new Error(`QUOTA_EXCEEDED: ${detail}`);
      }
      if (quotaResult.warnings.length > 0) {
        console.warn(`[AiPolicy] Quota warnings for ${scope}:`, quotaResult.warnings);
      }
    }

    // 3. API key 해결
    const apiKey = await this.resolveApiKey(policy.provider);

    // 3. Config 조립
    const responseMode = (overrides?.responseMode ?? policy.responseMode ?? 'json') as 'json' | 'text';
    const config = {
      apiKey,
      model: overrides?.model ?? policy.model,
      temperature: overrides?.temperature ?? Number(policy.temperature),
      maxTokens: overrides?.maxTokens ?? policy.maxTokens,
      timeoutMs: policy.timeoutMs,
      responseMode,
      ...(policy.topP != null ? { topP: Number(policy.topP) } : {}),
      ...(policy.topK != null ? { topK: policy.topK } : {}),
    };

    // 4. ai-core execute()
    const startMs = Date.now();
    try {
      const result = await execute({
        systemPrompt,
        userPrompt,
        provider: policy.provider as AIExecuteProviderId,
        responseMode,
        config,
        retry: {
          maxAttempts: policy.retryMax,
          delayMs: policy.retryDelayMs,
        },
        meta: { service: scope, callerName: `Policy:${scope}` },
      });

      // Fire-and-forget: log success + increment quotas
      const pTokens = result.promptTokens ?? 0;
      const cTokens = result.completionTokens ?? 0;
      this.logUsage({
        scope,
        provider: policy.provider,
        model: result.model,
        requestId: result.requestId,
        promptTokens: pTokens,
        completionTokens: cTokens,
        durationMs: result.durationMs,
        status: 'success',
        userId: overrides?.userId,
      }).catch(() => {});
      if (this.quotaService) {
        const cost = this.calculateCost(policy.provider, pTokens, cTokens);
        this.quotaService.incrementAggregates(scope, overrides?.userId, 1, pTokens + cTokens, cost).catch(() => {});
      }

      return result;
    } catch (primaryError) {
      // 5. Fallback provider (설정 시 1회 시도)
      if (policy.fallbackProvider && policy.fallbackModel) {
        try {
          const fallbackApiKey = await this.resolveApiKey(policy.fallbackProvider);
          const fallbackResult = await execute({
            systemPrompt,
            userPrompt,
            provider: policy.fallbackProvider as AIExecuteProviderId,
            responseMode,
            config: {
              ...config,
              apiKey: fallbackApiKey,
              model: policy.fallbackModel,
            },
            retry: { maxAttempts: 1, delayMs: 1000 },
            meta: { service: scope, callerName: `Policy:${scope}:fallback` },
          });

          // Fire-and-forget: log fallback success + increment quotas
          const fbPTokens = fallbackResult.promptTokens ?? 0;
          const fbCTokens = fallbackResult.completionTokens ?? 0;
          this.logUsage({
            scope,
            provider: policy.fallbackProvider,
            model: fallbackResult.model,
            requestId: fallbackResult.requestId,
            promptTokens: fbPTokens,
            completionTokens: fbCTokens,
            durationMs: fallbackResult.durationMs,
            status: 'success',
            userId: overrides?.userId,
          }).catch(() => {});
          if (this.quotaService) {
            const fbCost = this.calculateCost(policy.fallbackProvider!, fbPTokens, fbCTokens);
            this.quotaService.incrementAggregates(scope, overrides?.userId, 1, fbPTokens + fbCTokens, fbCost).catch(() => {});
          }

          return fallbackResult;
        } catch (fallbackError) {
          // Fallback도 실패 → primary error throw
          console.warn(`[AiPolicy] Fallback failed for ${scope}:`, fallbackError);
        }
      }

      // Fire-and-forget: log error
      const errMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);
      this.logUsage({
        scope,
        provider: policy.provider,
        model: config.model,
        durationMs: Date.now() - startMs,
        status: 'error',
        errorMessage: errMsg.slice(0, 500),
        errorType: primaryError instanceof Error ? primaryError.constructor.name : 'Unknown',
        userId: overrides?.userId,
      }).catch(() => {});

      throw primaryError;
    }
  }

  /**
   * 캐시 무효화.
   * @param scope - 특정 scope만 무효화. 미지정 시 전체.
   */
  invalidateCache(scope?: string): void {
    if (scope) {
      this.cache.delete(scope);
    } else {
      this.cache.clear();
    }
  }

  // ── Private ──

  private async resolvePolicy(scope: string): Promise<AiLlmPolicy> {
    // 1. Cache hit
    const cached = this.cache.get(scope);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.policy;
    }

    // 2. DB lookup
    try {
      const repo = this.dataSource.getRepository(AiLlmPolicy);
      const policy = await repo.findOne({ where: { scope } });
      if (policy) {
        this.cache.set(scope, { policy, expiresAt: Date.now() + CACHE_TTL_MS });
        return policy;
      }
    } catch {
      // Table may not exist yet — fall through to default
    }

    // 3. Hardcoded fallback
    const fallback = Object.assign(new AiLlmPolicy(), {
      scope,
      provider: 'gemini',
      model: 'gemini-3.0-flash',
      temperature: 0.3,
      maxTokens: 2048,
      topP: null,
      topK: null,
      timeoutMs: 10000,
      responseMode: 'json',
      fallbackProvider: null,
      fallbackModel: null,
      isEnabled: true,
      retryMax: 2,
      retryDelayMs: 2000,
    });

    this.cache.set(scope, { policy: fallback, expiresAt: Date.now() + CACHE_TTL_MS });
    return fallback;
  }

  // ── Usage Logging ──

  private async logUsage(params: {
    scope: string;
    provider: string;
    model: string;
    requestId?: string;
    promptTokens?: number;
    completionTokens?: number;
    durationMs?: number;
    status: 'success' | 'error';
    errorMessage?: string;
    errorType?: string;
    userId?: string;
  }): Promise<void> {
    try {
      const repo = this.dataSource.getRepository(AIUsageLog);
      const providerEnum = (params.provider as keyof typeof AIProvider) in AIProvider
        ? AIProvider[params.provider.toUpperCase() as keyof typeof AIProvider]
        : params.provider as AIProvider;

      const promptTokens = params.promptTokens ?? 0;
      const completionTokens = params.completionTokens ?? 0;
      const costEstimated = this.calculateCost(params.provider, promptTokens, completionTokens);

      const log = repo.create({
        scope: params.scope,
        provider: providerEnum,
        model: params.model,
        requestId: params.requestId,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        costEstimated,
        durationMs: params.durationMs,
        status: params.status === 'success' ? AIUsageStatus.SUCCESS : AIUsageStatus.ERROR,
        errorMessage: params.errorMessage,
        errorType: params.errorType,
        ...(params.userId ? { userId: params.userId } : {}),
      });
      await repo.save(log);
    } catch (err) {
      console.warn('[AiPolicy] logUsage failed:', err);
    }
  }

  private calculateCost(provider: string, promptTokens: number, completionTokens: number): number {
    const costs: Record<string, { prompt: number; completion: number }> = {
      gemini:  { prompt: 0.0005,  completion: 0.0015 },
      openai:  { prompt: 0.03,    completion: 0.06 },
      claude:  { prompt: 0.015,   completion: 0.075 },
    };
    const c = costs[provider];
    if (!c) return 0;
    return (promptTokens / 1000) * c.prompt + (completionTokens / 1000) * c.completion;
  }

  private async resolveApiKey(provider: string): Promise<string> {
    // 1. ai_settings 테이블
    try {
      const rows = await this.dataSource.query(
        `SELECT apikey FROM ai_settings WHERE provider = $1 AND isactive = true LIMIT 1`,
        [provider],
      );
      if (rows[0]?.apikey) {
        return rows[0].apikey;
      }
    } catch {
      // DB read failed — fall through to env
    }

    // 2. Environment variable
    const envKey = API_KEY_ENV[provider];
    if (envKey) {
      const value = process.env[envKey];
      if (value) return value;
    }

    return '';
  }
}
