/**
 * Gemini API Helper
 *
 * WO-O4O-AI-LLM-PATH-CONSOLIDATION
 *
 * Lightweight Gemini call helper for api-server consumers that need free-text responses.
 *
 * Why not use GeminiProvider from @o4o/ai-core?
 * - GeminiProvider hardcodes responseMimeType: 'application/json'
 * - These consumers expect free-text Korean language responses
 * - ai-core is frozen (Operator OS Baseline F1) — cannot add responseMimeType option
 *
 * Adopts GeminiProvider's better patterns:
 * - system_instruction separation (proper Gemini API usage)
 * - 10s timeout (vs 30s in old google-ai.service)
 * - 1 retry on transient failure
 */

import logger from './logger.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;
const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2048;

export interface GeminiCallOptions {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GeminiCallResult {
  text: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}

interface GeminiAPIResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: { code: number; message: string; status: string };
}

/**
 * Call Gemini API with system/user prompt separation, timeout, and retry.
 * Returns free-text (no JSON mode enforced).
 */
export async function callGemini(
  apiKey: string,
  options: GeminiCallOptions,
): Promise<GeminiCallResult> {
  const {
    systemPrompt,
    userPrompt,
    model = DEFAULT_MODEL,
    temperature = DEFAULT_TEMPERATURE,
    maxTokens = DEFAULT_MAX_TOKENS,
  } = options;

  if (!apiKey) {
    throw new Error('Gemini API key is not configured');
  }

  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };

  // system_instruction only when systemPrompt is non-empty
  if (systemPrompt) {
    body.system_instruction = { parts: [{ text: systemPrompt }] };
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(`Gemini API error ${response.status}: ${errBody.slice(0, 200)}`);
      }

      const data = (await response.json()) as GeminiAPIResponse;

      if (data.error) {
        throw new Error(`Gemini API error: ${data.error.message} (${data.error.status})`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('AI 응답을 생성하지 못했습니다.');
      }

      return {
        text,
        model,
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.name === 'AbortError') {
        lastError = new Error('AI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      }

      // Only retry on transient errors
      const retryable =
        lastError.message.includes('시간이 초과') ||
        lastError.message.includes('500') ||
        lastError.message.includes('503') ||
        lastError.message.includes('fetch failed');

      if (attempt < MAX_RETRIES && retryable) {
        logger.warn(`[Gemini] attempt ${attempt + 1} failed, retrying: ${lastError.message}`);
        continue;
      }
      break;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error('Gemini call failed');
}
