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

class AIProxyService {
  private static instance: AIProxyService;

  // API Keys from environment
  private readonly OPENAI_API_KEY: string;
  private readonly GEMINI_API_KEY: string;
  private readonly CLAUDE_API_KEY: string;

  // Timeout and retry configuration
  private readonly DEFAULT_TIMEOUT = 15000; // 15 seconds
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 1000; // 1 second
  private readonly MAX_DELAY = 20000; // 20 seconds
  private readonly RETRY_FACTOR = 2;

  private constructor() {
    // Load API keys from environment
    this.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
    this.GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
    this.CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';

    // Warn if keys are missing in production
    if (process.env.NODE_ENV === 'production') {
      if (!this.OPENAI_API_KEY) logger.warn('⚠️ OPENAI_API_KEY not configured');
      if (!this.GEMINI_API_KEY) logger.warn('⚠️ GEMINI_API_KEY not configured');
      if (!this.CLAUDE_API_KEY) logger.warn('⚠️ CLAUDE_API_KEY not configured');
    }
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
    if (!this.OPENAI_API_KEY) {
      throw this.createError('AUTH_ERROR', 'OpenAI API key not configured', false);
    }

    const { model, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 4000 } = request;

    // Create AbortSignal with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
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

      return {
        success: true,
        provider: 'openai',
        model,
        usage: {
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens,
        },
        result: parsed.blocks ? { blocks: parsed.blocks } : parsed,
        requestId,
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw this.createError('TIMEOUT_ERROR', 'OpenAI request timeout (15s)', true);
      }

      throw error;
    }
  }

  /**
   * Call Gemini API
   */
  private async callGemini(
    request: AIGenerateRequest,
    requestId: string
  ): Promise<AIGenerateResponse> {
    if (!this.GEMINI_API_KEY) {
      throw this.createError('AUTH_ERROR', 'Gemini API key not configured', false);
    }

    const { model, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 8192, topP = 0.95, topK = 40 } = request;

    // Determine API version
    const apiVersion = model.includes('2.5') ? 'v1' : 'v1beta';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${this.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            }],
            generationConfig: {
              temperature,
              topK,
              topP,
              maxOutputTokens: maxTokens,
            },
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

      // Extract JSON from response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonContent = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;

      const parsed = JSON.parse(jsonContent);

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
        throw this.createError('TIMEOUT_ERROR', 'Gemini request timeout (15s)', true);
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
    if (!this.CLAUDE_API_KEY) {
      throw this.createError('AUTH_ERROR', 'Claude API key not configured', false);
    }

    const { model, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 4000 } = request;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.CLAUDE_API_KEY,
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
        throw this.createError('TIMEOUT_ERROR', 'Claude request timeout (15s)', true);
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
