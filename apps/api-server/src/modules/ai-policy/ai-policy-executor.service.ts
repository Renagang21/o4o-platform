import {
  ModelControlService,
  type ModelProvider,
} from "../../services/ai-management/model-controls.js";
/**
 * AiPolicyExecutorService — WO-O4O-AI-POLICY-SYSTEM-V1
 *
 * Scope 기반 LLM 정책 실행기.
 * ai_llm_policies 테이블에서 scope별 설정을 캐시·해결 → ai-core execute() 호출.
 *
 * 해결 우선순위:
 *   1. 인메모리 캐시 (60초 TTL)
 *   2. ai_llm_policies 테이블 (scope = ?)
 *   3. 하드코딩 기본값 fallback (gemini-2.5-flash, 0.3, 2048)
 *
 * API key 해결:
 *   1. ai_settings 테이블 (provider = ?, "isEnabled" = true)
 *   2. process.env.{PROVIDER}_API_KEY
 */

import type { DataSource } from "typeorm";
import type { ExecuteResult, AIExecuteProviderId } from "@o4o/ai-core";
import type { AiPolicyScope } from "./ai-policy-scope.js";
import { AiLlmPolicy } from "./entities/ai-llm-policy.entity.js";
import { AiQuotaService } from "./ai-quota.service.js";
import { AiAccountedExecution } from "./ai-accounted-execution.js";
import { resolveAiApiKey } from "../../utils/ai-key.util.js";
import { GEMINI_CANONICAL_MODEL } from "../../types/ai-proxy.types.js";

// ─────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────

interface CachedPolicy {
  policy: AiLlmPolicy;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 1분

// ─────────────────────────────────────────────────────
// Overrides (서비스가 호출 시 개별 설정 변경 가능)
// ─────────────────────────────────────────────────────

export interface PolicyExecuteOverrides {
  maxTokens?: number;
  temperature?: number;
  /** Used only until this logical usage has an administrator model selection. */
  model?: string;
  responseMode?: "json" | "text";
  userId?: string;
  /** Server-owned logical usage; never forwarded from a client model override. */
  usage?: "store.translation" | "pharmacy.consultation" | "supplier.overview" | "cooperative.overview";
  /** Domain host supplies the verified catalogue binding for dynamic scopes only. */
  serviceKey?: string;
}

// ─────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────

export class AiPolicyExecutorService {
  private cache: Map<string, CachedPolicy> = new Map();

  constructor(
    private dataSource: DataSource,
    private quotaService = new AiQuotaService(dataSource),
  ) {}

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
    const policy = await this.resolvePolicy(scope);
    if (!policy.isEnabled)
      throw new Error(`AI_DISABLED: scope '${scope}' is disabled`);
    if (overrides?.usage &&
      (['supplier.overview', 'cooperative.overview'].includes(overrides.usage) ? scope !== 'OPERATOR_INSIGHT' : scope !== 'CONTENT_TRANSLATION'))
      throw new Error('AI_POLICY_USAGE_MISMATCH');
    const usage = overrides?.usage ?? (
      scope === "PRODUCT_CONTENT"
        ? "product.content"
        : scope === "CONTENT_TRANSLATION"
          ? (overrides?.usage ?? "store.translation")
          : scope === 'STORE_INSIGHT'
            ? 'store.overview'
          : undefined);
    const selected = usage
      ? await new ModelControlService(this.dataSource).resolve(usage, {
          provider: policy.provider as ModelProvider,
          model: overrides?.model ?? policy.model,
        })
      : {
          provider: policy.provider,
          model: overrides?.model ?? policy.model,
          managed: false,
        };
    if (
      !["gemini", "openai"].includes(selected.provider) ||
      (!selected.managed &&
        policy.fallbackProvider &&
        !["gemini", "openai"].includes(policy.fallbackProvider))
    )
      throw new Error("AI_PROVIDER_UNSUPPORTED");
    const maxTokens = overrides?.maxTokens ?? policy.maxTokens;
    if (
      !Number.isSafeInteger(maxTokens) ||
      maxTokens <= 0 ||
      !Number.isSafeInteger(policy.retryMax) ||
      policy.retryMax < 1
    )
      throw new Error("AI_POLICY_INVALID");
    const apiKey = await this.resolveApiKey(selected.provider);
    const responseMode = (overrides?.responseMode ??
      policy.responseMode ??
      "json") as "json" | "text";
    const config = {
      apiKey,
      model: selected.model,
      temperature: overrides?.temperature ?? Number(policy.temperature),
      maxTokens,
      timeoutMs: policy.timeoutMs,
      responseMode,
      ...(policy.topP != null ? { topP: Number(policy.topP) } : {}),
      ...(policy.topK != null ? { topK: policy.topK } : {}),
    };
    const primary = {
      systemPrompt,
      userPrompt,
      provider: selected.provider as AIExecuteProviderId,
      responseMode,
      config,
      retry: { maxAttempts: policy.retryMax, delayMs: policy.retryDelayMs },
      meta: { service: scope, callerName: `Policy:${scope}` },
    };
    const fallback =
      !selected.managed && policy.fallbackProvider && policy.fallbackModel
        ? {
            ...primary,
            provider: policy.fallbackProvider as AIExecuteProviderId,
            config: {
              ...config,
              apiKey: await this.resolveApiKey(policy.fallbackProvider),
              model: policy.fallbackModel,
            },
            retry: { maxAttempts: 1, delayMs: 1000 },
            meta: { service: scope, callerName: `Policy:${scope}:fallback` },
          }
        : undefined;
    return new AiAccountedExecution(this.dataSource, this.quotaService).invoke(
      primary,
      { scope, userId: overrides?.userId, ...(overrides?.serviceKey ? { serviceKey: overrides.serviceKey } : {}) },
      fallback,
    );
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
    } catch (error) {
      if ((error as { code?: string }).code !== "42P01")
        throw new Error("AI_POLICY_UNAVAILABLE");
      // Missing legacy policy table alone retains the documented canonical fallback.
    }

    // 3. Hardcoded fallback
    // WO-O4O-AI-MODEL-SETTINGS-CLEANUP-V1: 'gemini-3.0-flash' (non-existent) → 'gemini-2.5-flash' (canonical).
    const fallback = Object.assign(new AiLlmPolicy(), {
      scope,
      provider: "gemini",
      model: GEMINI_CANONICAL_MODEL,
      temperature: 0.3,
      maxTokens: 2048,
      topP: null,
      topK: null,
      timeoutMs: 10000,
      responseMode: "json",
      fallbackProvider: null,
      fallbackModel: null,
      isEnabled: true,
      retryMax: 2,
      retryDelayMs: 2000,
    });

    this.cache.set(scope, {
      policy: fallback,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return fallback;
  }

  private async resolveApiKey(provider: string): Promise<string> {
    return resolveAiApiKey(this.dataSource, provider);
  }
}
