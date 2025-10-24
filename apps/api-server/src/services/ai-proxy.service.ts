/**
 * AI Proxy Service
 * Sprint 2 - P1: Server-side LLM proxy with security, retry, and timeout
 *
 * Security:
 * - API keys loaded from environment variables (never exposed to client)
 * - Model and parameter whitelist enforcement
 * - Request size limits
 *
 * Reliability:
 * - AbortSignal.timeout() for request cancellation
 * - Exponential backoff with jitter for 429/503 errors
 * - Retry-After header respect
 * - Max 3-5 retry attempts
 */

import logger from '../utils/logger';
import { startLLMCallSpan, endSpanSuccess, endSpanError } from '../utils/telemetry';
import {
  AIProvider,
  AIGenerateRequest,
  AIGenerateResponse,
  AIProxyError,
  MODEL_WHITELIST,
  PARAMETER_LIMITS,
  OpenAIResponse,
  GeminiResponse,
  ClaudeResponse,
} from '../types/ai-proxy.types';
import { AppDataSource } from '../database/connection';
import { AiSettings } from '../entities/AiSettings';

class AIProxyService {
  private static instance: AIProxyService;

  // Timeout and retry configuration
  private readonly DEFAULT_TIMEOUT = 120000; // 120 seconds (increased from 60s)
  private readonly MAX_RETRIES = 2; // 2 retries (decreased from 3 for faster failure)
  private readonly BASE_DELAY = 1000; // 1 second
  private readonly MAX_DELAY = 20000; // 20 seconds
  private readonly RETRY_FACTOR = 2;

  private constructor() {
    // API keys are now loaded from database per-request
  }

  /**
   * Get API key for provider
   * 1. Check database (user-configured keys)
   * 2. Fallback to environment variables
   * 3. Throw error if not found
   */
  private async getApiKey(provider: AIProvider): Promise<string> {
    try {
      // Try to load from database first
      if (AppDataSource.isInitialized) {
        const aiSettingsRepo = AppDataSource.getRepository(AiSettings);
        const setting = await aiSettingsRepo.findOne({
          where: { provider, isActive: true }
        });

        if (setting?.apiKey) {
          logger.debug(`Using database API key for ${provider}`);
          return setting.apiKey;
        }
      }
    } catch (error) {
      logger.warn(`Failed to load API key from database for ${provider}:`, error);
    }

    // Fallback to environment variables
    const envKey = provider === 'openai'
      ? process.env.OPENAI_API_KEY
      : provider === 'gemini'
      ? process.env.GEMINI_API_KEY
      : process.env.CLAUDE_API_KEY;

    if (envKey) {
      logger.debug(`Using environment API key for ${provider}`);
      return envKey;
    }

    // No key found
    throw this.createError(
      'AUTH_ERROR',
      `${provider} API key not configured. Please add it in Settings → AI API.`,
      false
    );
  }

  static getInstance(): AIProxyService {
    if (!AIProxyService.instance) {
      AIProxyService.instance = new AIProxyService();
    }
    return AIProxyService.instance;
  }

  /**
   * Main proxy method: validate, call provider, retry on errors
   */
  async generateContent(
    request: AIGenerateRequest,
    userId: string,
    requestId: string
  ): Promise<AIGenerateResponse> {
    const startTime = Date.now();

    try {
      // 1. Validate request
      this.validateRequest(request);

      // 2. Estimate prompt size for logging
      const promptSize = (request.systemPrompt + request.userPrompt).length;

      logger.info('AI proxy request started', {
        requestId,
        userId,
        provider: request.provider,
        model: request.model,
        promptSize,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });

      // 3. Call provider with retry
      const response = await this.callProviderWithRetry(request, requestId);

      const duration = Date.now() - startTime;

      logger.info('AI proxy request completed', {
        requestId,
        userId,
        provider: request.provider,
        model: request.model,
        status: 'success',
        duration: `${duration}ms`,
        usage: response.usage,
      });

      return response;

    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('AI proxy request failed', {
        requestId,
        userId,
        provider: request.provider,
        model: request.model,
        error: error.message,
        duration: `${duration}ms`,
      });

      throw error;
    }
  }

  /**
   * Validate request against whitelist and parameter limits
   */
  private validateRequest(request: AIGenerateRequest): void {
    const { provider, model, temperature, maxTokens, topP, topK } = request;

    // Check provider
    if (!['openai', 'gemini', 'claude'].includes(provider)) {
      throw this.createError(
        'VALIDATION_ERROR',
        `Unsupported provider: ${provider}. Allowed: openai, gemini, claude`,
        false
      );
    }

    // Check model whitelist
    const allowedModels = MODEL_WHITELIST[provider] as readonly string[];
    if (!(allowedModels as string[]).includes(model)) {
      throw this.createError(
        'VALIDATION_ERROR',
        `Model "${model}" not allowed for ${provider}. Allowed models: ${allowedModels.join(', ')}`,
        false
      );
    }

    // Check maxTokens
    if (maxTokens && maxTokens > PARAMETER_LIMITS.maxTokens[provider]) {
      throw this.createError(
        'VALIDATION_ERROR',
        `maxTokens ${maxTokens} exceeds limit ${PARAMETER_LIMITS.maxTokens[provider]} for ${provider}`,
        false
      );
    }

    // Check temperature
    if (temperature !== undefined && (temperature < PARAMETER_LIMITS.temperature.min || temperature > PARAMETER_LIMITS.temperature.max)) {
      throw this.createError(
        'VALIDATION_ERROR',
        `temperature ${temperature} out of range [${PARAMETER_LIMITS.temperature.min}, ${PARAMETER_LIMITS.temperature.max}]`,
        false
      );
    }

    // Check topP
    if (topP !== undefined && (topP < PARAMETER_LIMITS.topP.min || topP > PARAMETER_LIMITS.topP.max)) {
      throw this.createError(
        'VALIDATION_ERROR',
        `topP ${topP} out of range [${PARAMETER_LIMITS.topP.min}, ${PARAMETER_LIMITS.topP.max}]`,
        false
      );
    }

    // Check topK (Gemini only)
    if (provider === 'gemini' && topK !== undefined && (topK < PARAMETER_LIMITS.topK.min || topK > PARAMETER_LIMITS.topK.max)) {
      throw this.createError(
        'VALIDATION_ERROR',
        `topK ${topK} out of range [${PARAMETER_LIMITS.topK.min}, ${PARAMETER_LIMITS.topK.max}]`,
        false
      );
    }
  }

  /**
   * Call provider with retry logic
   */
  private async callProviderWithRetry(
    request: AIGenerateRequest,
    requestId: string
  ): Promise<AIGenerateResponse> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.callProvider(request, requestId);
      } catch (error: any) {
        lastError = error;

        // Don't retry on validation or non-retryable errors
        if (error.retryable === false) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.MAX_RETRIES) {
          break;
        }

        // Calculate backoff with jitter
        const backoff = this.calculateBackoff(attempt, error.retryAfter);

        logger.warn('AI proxy retry', {
          requestId,
          attempt: attempt + 1,
          maxRetries: this.MAX_RETRIES,
          backoffMs: backoff,
          error: error.message,
        });

        // Wait before retry
        await this.sleep(backoff);
      }
    }

    // All retries failed
    throw lastError;
  }

  /**
   * Call provider API
   */
  private async callProvider(
    request: AIGenerateRequest,
    requestId: string
  ): Promise<AIGenerateResponse> {
    const { provider } = request;

    switch (provider) {
      case 'openai':
        return await this.callOpenAI(request, requestId);
      case 'gemini':
        return await this.callGemini(request, requestId);
      case 'claude':
        return await this.callClaude(request, requestId);
      default:
        throw this.createError('VALIDATION_ERROR', `Unsupported provider: ${provider}`, false);
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(
    request: AIGenerateRequest,
    requestId: string
  ): Promise<AIGenerateResponse> {
    const apiKey = await this.getApiKey('openai');
    const { model, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 8192 } = request;

    // Sprint 3: Start tracing span for LLM call
    const span = startLLMCallSpan('openai', model, requestId);

    // Create AbortSignal with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limit and server errors
      if (response.status === 429) {
        const retryAfter = this.parseRetryAfter(response.headers.get('Retry-After'));
        throw this.createError('RATE_LIMIT_ERROR', 'OpenAI rate limit exceeded', true, retryAfter);
      }

      if (response.status === 503) {
        throw this.createError('PROVIDER_ERROR', 'OpenAI service unavailable', true);
      }

      if (!response.ok) {
        const error = await response.json();
        throw this.createError('PROVIDER_ERROR', error.error?.message || 'OpenAI API error', false);
      }

      const data: OpenAIResponse = await response.json();
      const content = data.choices[0].message.content;

      // Parse JSON response
      const parsed = JSON.parse(content);

      const result: AIGenerateResponse = {
        success: true,
        provider: 'openai' as AIProvider,
        model,
        usage: {
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens,
        },
        result: parsed.blocks ? { blocks: parsed.blocks } : parsed,
        requestId,
      };

      // Sprint 3: End span with success
      endSpanSuccess(span, {
        'ai.tokens.prompt': data.usage?.prompt_tokens,
        'ai.tokens.completion': data.usage?.completion_tokens,
        'ai.tokens.total': data.usage?.total_tokens,
      });

      return result;

    } catch (error: any) {
      clearTimeout(timeoutId);

      // Sprint 3: End span with error
      endSpanError(span, error);

      if (error.name === 'AbortError') {
        throw this.createError('TIMEOUT_ERROR', 'OpenAI request timeout (120s)', true);
      }

      throw error;
    }
  }

  /**
   * Call Gemini API with Structured Output (Gemini 2.5+)
   *
   * Uses response_schema to enforce JSON structure and prevent:
   * - Truncated responses
   * - Markdown-wrapped JSON
   * - Inconsistent output formats
   *
   * References:
   * - https://ai.google.dev/gemini-api/docs/structured-output
   * - https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/control-generated-output
   */
  private async callGemini(
    request: AIGenerateRequest,
    requestId: string
  ): Promise<AIGenerateResponse> {
    const apiKey = await this.getApiKey('gemini');
    const { model, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 32000, topP = 0.95, topK = 40 } = request;

    // Determine API version (v1beta for structured output support)
    const apiVersion = model.includes('2.5') ? 'v1beta' : 'v1beta';
    const useStructuredOutput = model.includes('2.5');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

    try {
      // Build generation config
      const generationConfig: any = {
        temperature,
        topK,
        topP,
        maxOutputTokens: maxTokens,
      };

      // Add structured output for Gemini 2.5+ (use v1beta for full support)
      // Only use responseMimeType to enforce JSON format
      // Don't use responseSchema - it's too restrictive and causes empty content
      if (useStructuredOutput) {
        generationConfig.responseMimeType = 'application/json';
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            }],
            generationConfig,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfter = this.parseRetryAfter(response.headers.get('Retry-After'));
        throw this.createError('RATE_LIMIT_ERROR', 'Gemini rate limit exceeded', true, retryAfter);
      }

      if (response.status === 503) {
        throw this.createError('PROVIDER_ERROR', 'Gemini service unavailable', true);
      }

      if (!response.ok) {
        const error = await response.json();
        throw this.createError('PROVIDER_ERROR', error.error?.message || 'Gemini API error', false);
      }

      const data: GeminiResponse = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
        throw this.createError('PROVIDER_ERROR', 'No response from Gemini', false);
      }

      // With structured output, response is guaranteed to be valid JSON
      let parsed: any;
      try {
        if (useStructuredOutput) {
          // Direct parse - no regex needed with structured output
          parsed = JSON.parse(content);
        } else {
          // Fallback for older models - extract JSON from markdown
          const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
          const jsonContent = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
          parsed = JSON.parse(jsonContent);
        }
      } catch (parseError: any) {
        logger.error('Failed to parse Gemini response', {
          requestId,
          model,
          content: content.substring(0, 500),
          error: parseError.message,
        });
        throw this.createError(
          'PROVIDER_ERROR',
          `Invalid JSON response from Gemini: ${parseError.message}`,
          false
        );
      }

      return {
        success: true,
        provider: 'gemini',
        model,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount,
          completionTokens: data.usageMetadata?.candidatesTokenCount,
          totalTokens: data.usageMetadata?.totalTokenCount,
        },
        result: parsed.blocks ? { blocks: parsed.blocks } : (Array.isArray(parsed) ? { blocks: parsed } : parsed),
        requestId,
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw this.createError('TIMEOUT_ERROR', 'Gemini request timeout (120s)', true);
      }

      throw error;
    }
  }

  /**
   * Call Claude API
   */
  private async callClaude(
    request: AIGenerateRequest,
    requestId: string
  ): Promise<AIGenerateResponse> {
    const apiKey = await this.getApiKey('claude');
    const { model, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 8192 } = request;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2025-01-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: userPrompt,
          }],
          temperature,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfter = this.parseRetryAfter(response.headers.get('Retry-After'));
        throw this.createError('RATE_LIMIT_ERROR', 'Claude rate limit exceeded', true, retryAfter);
      }

      if (response.status === 503) {
        throw this.createError('PROVIDER_ERROR', 'Claude service unavailable', true);
      }

      if (!response.ok) {
        const error = await response.json();
        throw this.createError('PROVIDER_ERROR', error.error?.message || 'Claude API error', false);
      }

      const data: ClaudeResponse = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        throw this.createError('PROVIDER_ERROR', 'No response from Claude', false);
      }

      const parsed = JSON.parse(content);

      return {
        success: true,
        provider: 'claude',
        model,
        usage: {
          promptTokens: data.usage?.input_tokens,
          completionTokens: data.usage?.output_tokens,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
        result: parsed.blocks ? { blocks: parsed.blocks } : parsed,
        requestId,
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw this.createError('TIMEOUT_ERROR', 'Claude request timeout (120s)', true);
      }

      throw error;
    }
  }

  /**
   * Calculate exponential backoff with jitter
   */
  private calculateBackoff(attempt: number, retryAfter?: number): number {
    // If Retry-After is provided, use it
    if (retryAfter) {
      return retryAfter * 1000; // Convert to milliseconds
    }

    // Exponential backoff: baseDelay * (factor ^ attempt)
    const exponential = this.BASE_DELAY * Math.pow(this.RETRY_FACTOR, attempt);

    // Add jitter (±20%)
    const jitter = exponential * (0.8 + Math.random() * 0.4);

    // Cap at max delay
    return Math.min(jitter, this.MAX_DELAY);
  }

  /**
   * Parse Retry-After header
   */
  private parseRetryAfter(header: string | null): number | undefined {
    if (!header) return undefined;

    // Try to parse as seconds
    const seconds = parseInt(header, 10);
    if (!isNaN(seconds)) {
      return seconds;
    }

    // Try to parse as HTTP date
    const date = new Date(header);
    if (!isNaN(date.getTime())) {
      return Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
    }

    return undefined;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create standardized error
   */
  private createError(
    type: AIProxyError['type'],
    message: string,
    retryable: boolean,
    retryAfter?: number
  ): AIProxyError {
    return {
      type,
      message,
      retryable,
      retryAfter,
    };
  }
}

export const aiProxyService = AIProxyService.getInstance();
