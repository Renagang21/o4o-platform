/**
 * AI Execute Stream — Streaming LLM Execution Entry Point
 *
 * WO-O4O-AI-STREAMING-SSE-IMPLEMENTATION-V1
 *
 * Streaming counterpart of execute(). Returns an AsyncGenerator
 * that yields text chunks as they arrive from the provider.
 *
 * 설계 원칙:
 * 1. Config 해결: execute()와 동일 (직접 객체 또는 async callback)
 * 2. Retry 없음: streaming은 부분 전달 후 retry 불가
 * 3. Provider가 streaming 미지원 시 complete() fallback → 단일 chunk
 * 4. 실패 시 항상 throw
 */

import { randomUUID } from 'crypto';
import type { AIProviderConfig, AIProvider as AIProviderInterface } from './types.js';
import { isStreamProvider } from './types.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { OpenAIProvider } from './providers/openai.provider.js';
import type { ExecuteRequest } from './execute.js';

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

export interface StreamChunk {
  text: string;
  done: boolean;
}

export interface StreamResult {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
  requestId: string;
}

// ─────────────────────────────────────────────────────
// Provider Registry (same instances as execute.ts)
// ─────────────────────────────────────────────────────

const providers: Record<string, AIProviderInterface> = {
  gemini: new GeminiProvider(),
  openai: new OpenAIProvider(),
};

// ─────────────────────────────────────────────────────
// Execute Stream
// ─────────────────────────────────────────────────────

/**
 * Streaming LLM 호출. 텍스트 청크를 yield하고 최종 결과를 return.
 *
 * @throws config 에러, provider 에러, timeout 시 throw
 */
export async function* executeStream(
  request: ExecuteRequest,
): AsyncGenerator<StreamChunk, StreamResult, undefined> {
  const requestId = randomUUID();
  const start = Date.now();
  const providerId = request.provider ?? 'gemini';
  const provider = providers[providerId];

  if (!provider) {
    throw new Error(`INVALID_PROVIDER: Unknown provider '${providerId}'`);
  }

  // ── Config 해결 (execute()와 동일) ──
  const config: AIProviderConfig =
    typeof request.config === 'function'
      ? await request.config()
      : request.config;

  if (!config.apiKey) {
    throw new Error(`AI_NOT_CONFIGURED: ${providerId} API key missing`);
  }

  const providerConfig: AIProviderConfig = {
    ...config,
    responseMode: request.responseMode ?? config.responseMode ?? 'json',
    timeoutMs: request.timeoutMs ?? config.timeoutMs,
  };

  // ── Streaming provider → streamComplete() ──
  if (isStreamProvider(provider)) {
    let accumulated = '';

    for await (const chunk of provider.streamComplete(
      request.systemPrompt,
      request.userPrompt,
      providerConfig,
    )) {
      accumulated += chunk.text;
      yield { text: chunk.text, done: chunk.done } as StreamChunk;
    }

    return {
      content: accumulated,
      model: providerConfig.model ?? providerId,
      promptTokens: 0,
      completionTokens: 0,
      durationMs: Date.now() - start,
      requestId,
    };
  }

  // ── Non-streaming fallback → complete() + 단일 chunk ──
  const response = await provider.complete(
    request.systemPrompt,
    request.userPrompt,
    providerConfig,
  );

  yield { text: response.content, done: false };
  yield { text: '', done: true };

  return {
    content: response.content,
    model: response.model,
    promptTokens: response.promptTokens,
    completionTokens: response.completionTokens,
    durationMs: Date.now() - start,
    requestId,
  };
}
