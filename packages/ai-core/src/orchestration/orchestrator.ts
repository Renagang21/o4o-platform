/**
 * AI Orchestrator — Main Entry Point
 *
 * WO-PLATFORM-AI-ORCHESTRATION-LAYER-V1
 *
 * Pipeline:
 *   Request → Context Builder → Prompt Composer → AI Provider → Response Normalizer → Action Mapper → Result
 *
 * 핵심 원칙:
 * - AI는 실행하지 않는다
 * - AI는 구조화된 출력(JSON)만 반환한다
 * - 실행은 기존 Action/Trigger 계층이 담당한다
 * - 모든 호출은 감사 로그에 기록된다
 */

import { randomUUID } from 'crypto';
import type {
  AIOrchestrationRequest,
  AIOrchestrationResult,
  AIProvider,
  AIProviderId,
  AIAuditEntry,
} from './types.js';
import { buildContext } from './context-builder.js';
import { composePrompt } from './prompt-composer.js';
import { normalizeResponse } from './response-normalizer.js';
import { mapActions } from './action-mapper.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';

// ─────────────────────────────────────────────────────
// Provider Registry
// ─────────────────────────────────────────────────────

const providers: Record<AIProviderId, AIProvider> = {
  gemini: new GeminiProvider(),
  openai: new OpenAIProvider(),
};

/** Default provider */
const DEFAULT_PROVIDER: AIProviderId = 'gemini';

// ─────────────────────────────────────────────────────
// Audit callback (injectable)
// ─────────────────────────────────────────────────────

type AuditCallback = (entry: AIAuditEntry) => void | Promise<void>;
let auditCallback: AuditCallback | null = null;

/**
 * Register a callback that will be called for every AI invocation.
 * Used by the application layer to persist audit entries.
 */
export function onAudit(callback: AuditCallback): void {
  auditCallback = callback;
}

// ─────────────────────────────────────────────────────
// Main Orchestrator
// ─────────────────────────────────────────────────────

/**
 * Execute an AI insight request through the full pipeline.
 *
 * @example
 * ```ts
 * const result = await runAIInsight({
 *   service: 'glycopharm',
 *   insightType: 'store-summary',
 *   contextData: { kpiData, patientCount, revenue },
 *   user: { id: 'user-1', role: 'glycopharm:operator' },
 * });
 *
 * if (result.success) {
 *   console.log(result.insight.summary);
 *   console.log(result.insight.recommendedActions);
 * }
 * ```
 */
export async function runAIInsight(
  request: AIOrchestrationRequest,
): Promise<AIOrchestrationResult> {
  const requestId = randomUUID();
  const startTime = Date.now();
  const providerId = request.options?.provider ?? DEFAULT_PROVIDER;
  const provider = providers[providerId];

  if (!provider) {
    return {
      success: false,
      error: { code: 'INVALID_PROVIDER', message: `Unknown provider: ${providerId}` },
      meta: {
        provider: providerId,
        model: 'unknown',
        promptTokens: 0,
        completionTokens: 0,
        durationMs: Date.now() - startTime,
        requestId,
      },
    };
  }

  try {
    // 1. Build context
    const context = buildContext(request);

    // 2. Compose prompt
    const prompt = composePrompt(context);

    // 3. Call provider
    const apiKey = getApiKey(providerId);
    const providerResponse = await provider.complete(
      prompt.systemPrompt,
      prompt.userPrompt,
      {
        apiKey,
        model: getDefaultModel(providerId),
        maxTokens: request.options?.maxTokens ?? 2048,
        temperature: request.options?.temperature ?? 0.3,
      },
    );

    // 4. Normalize response
    const insight = normalizeResponse(providerResponse.content);

    // 5. Map actions
    const actionMappings = mapActions(request.service, insight);
    if (actionMappings.length > 0) {
      insight.suggestedTriggers = actionMappings
        .filter(m => m.triggerId)
        .map(m => m.triggerId!);
    }

    const durationMs = Date.now() - startTime;

    // 6. Audit
    await emitAudit({
      requestId,
      userId: request.user.id,
      service: request.service,
      insightType: request.insightType,
      provider: providerId,
      promptHash: simpleHash(prompt.systemPrompt + prompt.userPrompt),
      responseHash: simpleHash(providerResponse.content),
      tokenUsage: {
        prompt: providerResponse.promptTokens,
        completion: providerResponse.completionTokens,
        total: providerResponse.promptTokens + providerResponse.completionTokens,
      },
      durationMs,
      success: true,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      insight,
      meta: {
        provider: providerId,
        model: providerResponse.model,
        promptTokens: providerResponse.promptTokens,
        completionTokens: providerResponse.completionTokens,
        durationMs,
        requestId,
      },
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Audit the failure
    await emitAudit({
      requestId,
      userId: request.user.id,
      service: request.service,
      insightType: request.insightType,
      provider: providerId,
      promptHash: '',
      responseHash: '',
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      durationMs,
      success: false,
      timestamp: new Date().toISOString(),
    });

    return {
      success: false,
      error: { code: 'AI_ERROR', message: errorMessage },
      meta: {
        provider: providerId,
        model: 'unknown',
        promptTokens: 0,
        completionTokens: 0,
        durationMs,
        requestId,
      },
    };
  }
}

// ─────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────

function getApiKey(provider: AIProviderId): string {
  const envKey = provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
  return process.env[envKey] || '';
}

function getDefaultModel(provider: AIProviderId): string {
  return provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini';
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(16);
}

async function emitAudit(entry: AIAuditEntry): Promise<void> {
  if (auditCallback) {
    try {
      await auditCallback(entry);
    } catch {
      console.error('[AI_AUDIT] Failed to emit audit entry:', entry.requestId);
    }
  }
}
