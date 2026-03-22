/**
 * Claude Provider (Anthropic)
 *
 * WO-O4O-AI-PROXY-CORE-INTEGRATION-V1 — Phase A4
 *
 * Claude API adapter. Same pattern as GeminiProvider / OpenAIProvider.
 *
 * Notes:
 * - Claude has no native JSON mode flag — JSON is enforced via prompt
 * - Supports both topP and topK
 * - Auth via x-api-key header (not Bearer)
 */

import type { AIProvider, AIProviderConfig, AIProviderResponse } from '../types.js';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;
const ANTHROPIC_VERSION = '2025-01-01';

interface ClaudeAPIResponse {
  content?: Array<{
    type: string;
    text?: string;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  model?: string;
  error?: {
    type: string;
    message: string;
  };
}

export class ClaudeProvider implements AIProvider {
  readonly id = 'claude' as const;

  async complete(
    systemPrompt: string,
    userPrompt: string,
    config: AIProviderConfig,
  ): Promise<AIProviderResponse> {
    if (!config.apiKey) {
      throw new Error('CLAUDE_API_KEY is not configured');
    }

    const model = config.model || 'claude-sonnet-4-5-20250514';

    const body: Record<string, unknown> = {
      model,
      max_tokens: config.maxTokens ?? 2048,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
      temperature: config.temperature ?? 0.3,
    };

    if (config.topP !== undefined) {
      body.top_p = config.topP;
    }
    if (config.topK !== undefined) {
      body.top_k = config.topK;
    }

    // Attempt with retry on parse failure
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const data = await this.callAPI(config.apiKey, body, config.timeoutMs);
        return this.parseResponse(data, model, config.responseMode);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < MAX_RETRIES && lastError.message.includes('JSON')) {
          console.warn(`[CLAUDE] JSON parse failed, retrying (attempt ${attempt + 1})`);
          continue;
        }
        break;
      }
    }

    throw lastError ?? new Error('Claude provider failed');
  }

  private async callAPI(apiKey: string, body: object, timeoutMs?: number): Promise<ClaudeAPIResponse> {
    const effectiveTimeout = timeoutMs ?? REQUEST_TIMEOUT_MS;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`Claude API error ${response.status}: ${errorBody.slice(0, 200)}`);
      }

      return await response.json() as ClaudeAPIResponse;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Claude API timeout after ${effectiveTimeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseResponse(data: ClaudeAPIResponse, model: string, responseMode?: string): AIProviderResponse {
    if (data.error) {
      throw new Error(`Claude API error: ${data.error.message} (${data.error.type})`);
    }

    const textBlock = data.content?.find(c => c.type === 'text');
    const content = textBlock?.text;
    if (!content) {
      throw new Error('Claude returned empty response — no text content');
    }

    // Validate JSON parsability (skip for text mode)
    if (responseMode !== 'text') {
      try {
        JSON.parse(content);
      } catch {
        throw new Error(`Claude JSON parse failed: ${content.slice(0, 200)}`);
      }
    }

    return {
      content,
      model: data.model || model,
      promptTokens: data.usage?.input_tokens ?? 0,
      completionTokens: data.usage?.output_tokens ?? 0,
    };
  }
}
