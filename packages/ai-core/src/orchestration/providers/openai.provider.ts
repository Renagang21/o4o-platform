/**
 * OpenAI Provider (Fallback)
 *
 * WO-PLATFORM-AI-ORCHESTRATION-LAYER-V1 — Phase 2
 *
 * 보조 Provider. Gemini 불가 시 또는 특정 모델 필요 시 사용.
 *
 * 설계 원칙:
 * 1. JSON 모드 강제 (response_format: json_object)
 * 2. Temperature 0.2~0.4 (예측 가능성 유지)
 * 3. Max tokens 제한 (비용 통제)
 * 4. JSON 파싱 실패 시 1회 재시도
 * 5. 10초 타임아웃
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

export class OpenAIProvider implements AIProvider {
  readonly id = 'openai' as const;

  async complete(
    systemPrompt: string,
    userPrompt: string,
    config: AIProviderConfig,
  ): Promise<AIProviderResponse> {
    if (!config.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const model = config.model || 'gpt-4o-mini';

    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: config.maxTokens ?? 2048,
      temperature: config.temperature ?? 0.3,
      response_format: { type: 'json_object' },
    };

    // Attempt with retry on parse failure
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const data = await this.callAPI(config.apiKey, body);
        return this.parseResponse(data, model);
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

  private async callAPI(apiKey: string, body: object): Promise<OpenAIAPIResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
        throw new Error(`OpenAI API timeout after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseResponse(data: OpenAIAPIResponse, model: string): AIProviderResponse {
    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message} (${data.error.type})`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned empty response — no choices');
    }

    // Validate JSON parsability
    try {
      JSON.parse(content);
    } catch {
      throw new Error(`OpenAI JSON parse failed: ${content.slice(0, 200)}`);
    }

    return {
      content,
      model,
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
    };
  }
}
