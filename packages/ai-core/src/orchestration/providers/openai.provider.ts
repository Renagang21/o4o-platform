/**
 * OpenAI Provider
 *
 * WO-PLATFORM-AI-ORCHESTRATION-LAYER-V1 — Phase 2
 * WO-O4O-AI-MULTI-PROVIDER-RUNTIME-V0 — 현행 세대 모델 파라미터 호환
 *
 * 설계 원칙:
 * 1. JSON 모드 강제 (response_format: json_object) — responseMode 'text' 면 해제
 * 2. Max tokens 제한 (비용 통제)
 * 3. JSON 파싱 실패 시 1회 재시도
 * 4. 타임아웃은 config.timeoutMs 우선
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ 세대별 파라미터 차이 (2026-09 공식 문서 확인)
 *
 *   현행 세대(gpt-5.x / gpt-6.x / o-series)는 reasoning 모델이라 파라미터가 다르다:
 *     - `max_tokens` 를 받지 않는다 → **`max_completion_tokens`** 를 써야 한다.
 *       (구 파라미터는 조용히 실패한다 — 400 이 아니라 무시되는 경우가 있어 더 위험하다)
 *     - `temperature` · `top_p` 를 **거부한다**. gpt-6-astra 공식 가이드가 제거를 명시한다.
 *   구세대(gpt-4o / gpt-4.1 등)는 종전대로 `max_tokens` + `temperature` 를 받는다.
 *
 *   그래서 모델 id 로 세대를 판별해 body 를 나눈다. 호출부는 종전과 동일하게
 *   `maxTokens` / `temperature` 를 넘기면 되고, 지원되지 않는 모델에서는 조용히 생략된다.
 */

import type { AIProvider, AIProviderConfig, AIProviderResponse } from '../types.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

interface OpenAIAPIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

/**
 * reasoning 세대 모델인가 (gpt-5.x / gpt-6.x / o-series).
 *
 * 이 세대는 `max_completion_tokens` 를 쓰고 `temperature`·`top_p` 를 거부한다.
 * 접두사로만 판별한다 — 모델 목록을 여기 하드코딩하면 새 모델이 나올 때마다 깨진다.
 */
export function isReasoningGenerationModel(model: string): boolean {
  return /^(gpt-[56]|o[1-9])/i.test(model.trim());
}

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai' as const;
  readonly supportsStreaming = false;

  async complete(
    systemPrompt: string,
    userPrompt: string,
    config: AIProviderConfig,
  ): Promise<AIProviderResponse> {
    if (!config.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const model = config.model || 'gpt-4o-mini';
    const maxTokens = config.maxTokens ?? 2048;
    const jsonMode = config.responseMode !== 'text' ? { response_format: { type: 'json_object' } } : {};

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 세대별 파라미터 분기 — 파일 상단 주석 참조.
    const body = isReasoningGenerationModel(model)
      ? {
          model,
          messages,
          max_completion_tokens: maxTokens,
          // temperature / top_p 는 넘기지 않는다 (현행 세대가 거부한다).
          ...jsonMode,
        }
      : {
          model,
          messages,
          max_tokens: maxTokens,
          temperature: config.temperature ?? 0.3,
          ...jsonMode,
        };

    // Attempt with retry on parse failure
    let lastError: Error | null = null;
    const responseMode = config.responseMode;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const data = await this.callAPI(config.apiKey, body, config.timeoutMs);
        return this.parseResponse(data, model, responseMode);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < MAX_RETRIES && lastError.message.includes('JSON')) {
          console.warn(`[OPENAI] JSON parse failed, retrying (attempt ${attempt + 1})`);
          continue;
        }
        break;
      }
    }

    throw lastError ?? new Error('OpenAI provider failed');
  }

  private async callAPI(apiKey: string, body: object, timeoutMs?: number): Promise<OpenAIAPIResponse> {
    const controller = new AbortController();
    const effectiveTimeout = timeoutMs ?? REQUEST_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`OpenAI API error ${response.status}: ${errorBody.slice(0, 200)}`);
      }

      return await response.json() as OpenAIAPIResponse;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // 실제 적용된 타임아웃을 알린다 (상수를 그대로 찍으면 진단이 어긋난다).
        throw new Error(`OpenAI API timeout after ${effectiveTimeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseResponse(data: OpenAIAPIResponse, model: string, responseMode?: string): AIProviderResponse {
    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message} (${data.error.type})`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response — no choices');
    }

    // Validate JSON parsability (skip for text mode)
    if (responseMode !== 'text') {
      try {
        JSON.parse(content);
      } catch {
        throw new Error(`OpenAI JSON parse failed: ${content.slice(0, 200)}`);
      }
    }

    return {
      content,
      model,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
    };
  }
}
