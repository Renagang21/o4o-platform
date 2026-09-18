/**
 * Gemini Provider (Google AI)
 *
 * WO-PLATFORM-AI-ORCHESTRATION-LAYER-V1 — Phase 2
 * WO-O4O-AI-STREAMING-SSE-IMPLEMENTATION-V1 — streamComplete() 추가
 *
 * 기본 Provider. Gemini Flash 모델로 비용 효율적 AI 인사이트 생성.
 *
 * 설계 원칙:
 * 1. JSON 모드 강제 (responseMimeType: "application/json")
 * 2. Temperature 0.2~0.4 (예측 가능성 유지)
 * 3. Max tokens 제한 (비용 통제)
 * 4. JSON 파싱 실패 시 1회 재시도
 * 5. 10초 타임아웃 (execute 기본, streaming은 config.timeoutMs 사용)
 */

import type { AIGroundingMetadata, AIProviderConfig, AIProviderResponse, AIStreamChunk, AIStreamProvider } from '../types.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

interface GeminiAPIResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    /** Grounding with Google Search 메타데이터 (grounding 요청 시에만 존재) */
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

export class GeminiProvider implements AIStreamProvider {
  readonly id = 'gemini' as const;
  readonly supportsStreaming = true;

  async complete(
    systemPrompt: string,
    userPrompt: string,
    config: AIProviderConfig,
  ): Promise<AIProviderResponse> {
    if (!config.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const model = config.model || 'gemini-2.5-flash';
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${config.apiKey}`;

    // ── Grounding (범용 Web Research) ──
    // grounding 은 Google Search tool 사용을 요구하며, JSON 강제(responseMimeType)와 병용할 수 없다.
    // 명시적으로 'json' 을 요청하면서 grounding 을 켜는 것은 계약 위반이므로 즉시 거부한다(금지).
    // 그 외에는 grounding = text 경로로 분리한다(명시적 분리).
    const useGrounding = config.grounding === true;
    if (useGrounding && config.responseMode === 'json') {
      throw new Error(
        "INVALID_ARGUMENT: grounding cannot combine with responseMode 'json' — use responseMode 'text'",
      );
    }
    // grounding 이면 응답 파싱·body 모두 text 경로로 취급한다.
    const effectiveMode: 'json' | 'text' | undefined = useGrounding ? 'text' : config.responseMode;

    const body = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [{
        parts: [{ text: userPrompt }],
      }],
      generationConfig: {
        temperature: config.temperature ?? 0.3,
        maxOutputTokens: config.maxTokens ?? 2048,
        ...(effectiveMode !== 'text' ? { responseMimeType: 'application/json' } : {}),
      },
      ...(useGrounding ? { tools: [{ google_search: {} }] } : {}),
    };

    // Attempt with retry on parse failure
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const data = await this.callAPI(url, body, config.timeoutMs);
        return this.parseResponse(data, model, effectiveMode, useGrounding);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Only retry on JSON parse failures, not API errors
        if (attempt < MAX_RETRIES && lastError.message.includes('JSON')) {
          console.warn(`[GEMINI] JSON parse failed, retrying (attempt ${attempt + 1})`);
          continue;
        }
        break;
      }
    }

    throw lastError ?? new Error('Gemini provider failed');
  }

  // ── Streaming (WO-O4O-AI-STREAMING-SSE-IMPLEMENTATION-V1) ──

  async *streamComplete(
    systemPrompt: string,
    userPrompt: string,
    config: AIProviderConfig,
  ): AsyncGenerator<AIStreamChunk, AIProviderResponse, undefined> {
    if (!config.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const model = config.model || 'gemini-2.5-flash';
    const url = `${GEMINI_API_BASE}/${model}:streamGenerateContent?alt=sse&key=${config.apiKey}`;

    const body = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [{
        parts: [{ text: userPrompt }],
      }],
      generationConfig: {
        temperature: config.temperature ?? 0.3,
        maxOutputTokens: config.maxTokens ?? 2048,
        ...(config.responseMode !== 'text' ? { responseMimeType: 'application/json' } : {}),
      },
    };

    const timeoutMs = config.timeoutMs ?? REQUEST_TIMEOUT_MS;
    const controller = new AbortController();
    let timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let accumulated = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`Gemini API error ${response.status}: ${errorBody.slice(0, 200)}`);
      }

      if (!response.body) {
        throw new Error('Gemini streaming response has no body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Reset timeout on each chunk received
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr) as GeminiAPIResponse;

            // Extract text chunk
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (text) {
              accumulated += text;
              yield { text, done: false };
            }

            // Capture usage metadata (usually in last chunk)
            if (parsed.usageMetadata) {
              promptTokens = parsed.usageMetadata.promptTokenCount ?? promptTokens;
              completionTokens = parsed.usageMetadata.candidatesTokenCount ?? completionTokens;
            }
          } catch {
            // Skip unparseable SSE lines
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Gemini streaming timeout after ${timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    // Final done chunk
    yield { text: '', done: true };

    // Return the aggregated response
    return {
      content: accumulated,
      model,
      promptTokens,
      completionTokens,
    };
  }

  // ── Private helpers (unchanged) ──

  private async callAPI(url: string, body: object, timeoutMs?: number): Promise<GeminiAPIResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs ?? REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`Gemini API error ${response.status}: ${errorBody.slice(0, 200)}`);
      }

      return await response.json() as GeminiAPIResponse;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Gemini API timeout after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseResponse(
    data: GeminiAPIResponse,
    model: string,
    responseMode?: string,
    grounding?: boolean,
  ): AIProviderResponse {
    // Check for API-level error
    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message} (${data.error.status})`);
    }

    // Extract content
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error('Gemini returned empty response — no candidates');
    }

    // Validate JSON parsability (skip for text mode)
    if (responseMode !== 'text') {
      try {
        JSON.parse(content);
      } catch {
        throw new Error(`Gemini JSON parse failed: ${content.slice(0, 200)}`);
      }
    }

    const response: AIProviderResponse = {
      content,
      model,
      promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    };

    // Grounding metadata (additive) — grounding 요청 시에만 채운다.
    // groundingMetadata 가 실제로 없으면 used:false 로 정직하게 반영한다
    // (citation 없는 응답을 grounded research 로 간주하지 않는다).
    if (grounding) {
      const gm = data.candidates?.[0]?.groundingMetadata;
      const meta: AIGroundingMetadata = {
        used: !!gm,
        queries: gm?.webSearchQueries ?? [],
        sources: (gm?.groundingChunks ?? [])
          .map((c) => ({ uri: c.web?.uri ?? '', title: c.web?.title }))
          .filter((s) => s.uri.length > 0),
      };
      response.grounding = meta;
    }

    return response;
  }
}
