/**
 * AI Execute — Generic LLM Execution Entry Point
 *
 * WO-O4O-AI-CORE-SERVICE-UNIFICATION-V1
 *
 * Unlike runAIInsight() which runs the full orchestration pipeline
 * (Context Builder → Prompt Composer → Provider → Normalizer → Action Mapper),
 * execute() is a direct "prompt → provider → response" function.
 *
 * 설계 원칙:
 * 1. Config 해결: 직접 객체 또는 async callback (DB 접근은 호출측 책임)
 * 2. Retry: 기본 2회, 2초 delay, non-retryable 에러 즉시 중단
 * 3. 실패 시 항상 throw (호출측이 에러 전략 결정)
 * 4. Provider 추상화: gemini / openai
 * 5. responseMode: 'json' (기본) / 'text' (free-text)
 */

import { randomUUID } from 'crypto';
import type { AIProviderConfig, AIProviderResponse, AIProvider as AIProviderInterface } from './types.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

export type AIExecuteProviderId = 'gemini' | 'openai';
export type ResponseMode = 'json' | 'text';

export interface ExecuteRequest {
  /** System prompt */
  systemPrompt: string;
  /** User prompt (데이터 + 질문) */
  userPrompt: string;
  /** Provider 선택 (기본값: 'gemini') */
  provider?: AIExecuteProviderId;
  /** 응답 모드: 'json' (기본) 또는 'text' (free-text) */
  responseMode?: ResponseMode;
  /** 설정 — 직접 객체 또는 async resolver callback */
  config: AIProviderConfig | (() => Promise<AIProviderConfig>);
  /** Retry 설정 override */
  retry?: {
    maxAttempts?: number;  // default 2
    delayMs?: number;      // default 2000
  };
  /** Provider 타임아웃 override (ms) */
  timeoutMs?: number;
  /** 감사/로깅 메타 */
  meta?: {
    service?: string;
    callerName?: string;
  };
}

export interface ExecuteResult {
  /** LLM 응답 본문 (JSON 문자열 또는 free-text) */
  content: string;
  /** 사용된 모델명 */
  model: string;
  /** 입력 토큰 수 */
  promptTokens: number;
  /** 출력 토큰 수 */
  completionTokens: number;
  /** 총 소요 시간 (ms) */
  durationMs: number;
  /** 요청 고유 ID */
  requestId: string;
}

// ─────────────────────────────────────────────────────
// Provider Registry
// ─────────────────────────────────────────────────────

const providers: Record<string, AIProviderInterface> = {
  gemini: new GeminiProvider(),
  openai: new OpenAIProvider(),
};

// ─────────────────────────────────────────────────────
// Execute
// ─────────────────────────────────────────────────────

/**
 * 범용 LLM 호출 함수.
 *
 * @example
 * ```ts
 * const result = await execute({
 *   systemPrompt: CARE_SYSTEM,
 *   userPrompt: buildUserPrompt(data),
 *   config: buildConfigResolver(dataSource, 'care'),
 *   meta: { service: 'care', callerName: 'CareLlmInsight' },
 * });
 * const parsed = JSON.parse(result.content);
 * ```
 *
 * @throws 실패 시 항상 throw — 호출측이 try/catch로 에러 전략 결정
 */
export async function execute(request: ExecuteRequest): Promise<ExecuteResult> {
  const requestId = randomUUID();
  const start = Date.now();
  const providerId = request.provider ?? 'gemini';
  const provider = providers[providerId];

  if (!provider) {
    throw new Error(`INVALID_PROVIDER: Unknown provider '${providerId}'`);
  }

  // ── Config 해결 ──
  const config: AIProviderConfig =
    typeof request.config === 'function'
      ? await request.config()
      : request.config;

  if (!config.apiKey) {
    throw new Error(`AI_NOT_CONFIGURED: ${providerId} API key missing`);
  }

  // ── Provider config 조립 ──
  const providerConfig: AIProviderConfig = {
    ...config,
    responseMode: request.responseMode ?? config.responseMode ?? 'json',
    timeoutMs: request.timeoutMs ?? config.timeoutMs,
  };

  // ── Retry loop ──
  const maxAttempts = request.retry?.maxAttempts ?? 2;
  const delayMs = request.retry?.delayMs ?? 2_000;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await provider.complete(
        request.systemPrompt,
        request.userPrompt,
        providerConfig,
      );

      return {
        content: response.content,
        model: response.model,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        durationMs: Date.now() - start,
        requestId,
      };
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);

      // Non-retryable errors — 즉시 중단
      if (
        msg.includes('not configured') ||
        msg.includes('NOT_CONFIGURED') ||
        msg.includes('INVALID_ARGUMENT') ||
        msg.includes('AUTH_ERROR')
      ) {
        break;
      }

      // Retryable — delay 후 재시도
      if (attempt < maxAttempts) {
        const caller = request.meta?.callerName ?? 'AI';
        console.warn(
          `[${caller}] attempt ${attempt} failed, retrying in ${delayMs}ms: ${msg}`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  // 모든 시도 실패
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
