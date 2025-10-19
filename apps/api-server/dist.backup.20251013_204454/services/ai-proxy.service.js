"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProxyService = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const telemetry_1 = require("../utils/telemetry");
const ai_proxy_types_1 = require("../types/ai-proxy.types");
class AIProxyService {
    constructor() {
        // Timeout and retry configuration
        this.DEFAULT_TIMEOUT = 15000; // 15 seconds
        this.MAX_RETRIES = 3;
        this.BASE_DELAY = 1000; // 1 second
        this.MAX_DELAY = 20000; // 20 seconds
        this.RETRY_FACTOR = 2;
        // Load API keys from environment
        this.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
        this.GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
        this.CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
        // Warn if keys are missing in production
        if (process.env.NODE_ENV === 'production') {
            if (!this.OPENAI_API_KEY)
                logger_1.default.warn('⚠️ OPENAI_API_KEY not configured');
            if (!this.GEMINI_API_KEY)
                logger_1.default.warn('⚠️ GEMINI_API_KEY not configured');
            if (!this.CLAUDE_API_KEY)
                logger_1.default.warn('⚠️ CLAUDE_API_KEY not configured');
        }
    }
    static getInstance() {
        if (!AIProxyService.instance) {
            AIProxyService.instance = new AIProxyService();
        }
        return AIProxyService.instance;
    }
    /**
     * Main proxy method: validate, call provider, retry on errors
     */
    async generateContent(request, userId, requestId) {
        const startTime = Date.now();
        try {
            // 1. Validate request
            this.validateRequest(request);
            // 2. Estimate prompt size for logging
            const promptSize = (request.systemPrompt + request.userPrompt).length;
            logger_1.default.info('AI proxy request started', {
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
            logger_1.default.info('AI proxy request completed', {
                requestId,
                userId,
                provider: request.provider,
                model: request.model,
                status: 'success',
                duration: `${duration}ms`,
                usage: response.usage,
            });
            return response;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.default.error('AI proxy request failed', {
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
    validateRequest(request) {
        const { provider, model, temperature, maxTokens, topP, topK } = request;
        // Check provider
        if (!['openai', 'gemini', 'claude'].includes(provider)) {
            throw this.createError('VALIDATION_ERROR', `Unsupported provider: ${provider}. Allowed: openai, gemini, claude`, false);
        }
        // Check model whitelist
        const allowedModels = ai_proxy_types_1.MODEL_WHITELIST[provider];
        if (!allowedModels.includes(model)) {
            throw this.createError('VALIDATION_ERROR', `Model "${model}" not allowed for ${provider}. Allowed models: ${allowedModels.join(', ')}`, false);
        }
        // Check maxTokens
        if (maxTokens && maxTokens > ai_proxy_types_1.PARAMETER_LIMITS.maxTokens[provider]) {
            throw this.createError('VALIDATION_ERROR', `maxTokens ${maxTokens} exceeds limit ${ai_proxy_types_1.PARAMETER_LIMITS.maxTokens[provider]} for ${provider}`, false);
        }
        // Check temperature
        if (temperature !== undefined && (temperature < ai_proxy_types_1.PARAMETER_LIMITS.temperature.min || temperature > ai_proxy_types_1.PARAMETER_LIMITS.temperature.max)) {
            throw this.createError('VALIDATION_ERROR', `temperature ${temperature} out of range [${ai_proxy_types_1.PARAMETER_LIMITS.temperature.min}, ${ai_proxy_types_1.PARAMETER_LIMITS.temperature.max}]`, false);
        }
        // Check topP
        if (topP !== undefined && (topP < ai_proxy_types_1.PARAMETER_LIMITS.topP.min || topP > ai_proxy_types_1.PARAMETER_LIMITS.topP.max)) {
            throw this.createError('VALIDATION_ERROR', `topP ${topP} out of range [${ai_proxy_types_1.PARAMETER_LIMITS.topP.min}, ${ai_proxy_types_1.PARAMETER_LIMITS.topP.max}]`, false);
        }
        // Check topK (Gemini only)
        if (provider === 'gemini' && topK !== undefined && (topK < ai_proxy_types_1.PARAMETER_LIMITS.topK.min || topK > ai_proxy_types_1.PARAMETER_LIMITS.topK.max)) {
            throw this.createError('VALIDATION_ERROR', `topK ${topK} out of range [${ai_proxy_types_1.PARAMETER_LIMITS.topK.min}, ${ai_proxy_types_1.PARAMETER_LIMITS.topK.max}]`, false);
        }
    }
    /**
     * Call provider with retry logic
     */
    async callProviderWithRetry(request, requestId) {
        let lastError;
        for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                return await this.callProvider(request, requestId);
            }
            catch (error) {
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
                logger_1.default.warn('AI proxy retry', {
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
    async callProvider(request, requestId) {
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
    async callOpenAI(request, requestId) {
        var _a, _b, _c, _d, _e, _f, _g;
        if (!this.OPENAI_API_KEY) {
            throw this.createError('AUTH_ERROR', 'OpenAI API key not configured', false);
        }
        const { model, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 4000 } = request;
        // Sprint 3: Start tracing span for LLM call
        const span = (0, telemetry_1.startLLMCallSpan)('openai', model, requestId);
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
                throw this.createError('PROVIDER_ERROR', ((_a = error.error) === null || _a === void 0 ? void 0 : _a.message) || 'OpenAI API error', false);
            }
            const data = await response.json();
            const content = data.choices[0].message.content;
            // Parse JSON response
            const parsed = JSON.parse(content);
            const result = {
                success: true,
                provider: 'openai',
                model,
                usage: {
                    promptTokens: (_b = data.usage) === null || _b === void 0 ? void 0 : _b.prompt_tokens,
                    completionTokens: (_c = data.usage) === null || _c === void 0 ? void 0 : _c.completion_tokens,
                    totalTokens: (_d = data.usage) === null || _d === void 0 ? void 0 : _d.total_tokens,
                },
                result: parsed.blocks ? { blocks: parsed.blocks } : parsed,
                requestId,
            };
            // Sprint 3: End span with success
            (0, telemetry_1.endSpanSuccess)(span, {
                'ai.tokens.prompt': (_e = data.usage) === null || _e === void 0 ? void 0 : _e.prompt_tokens,
                'ai.tokens.completion': (_f = data.usage) === null || _f === void 0 ? void 0 : _f.completion_tokens,
                'ai.tokens.total': (_g = data.usage) === null || _g === void 0 ? void 0 : _g.total_tokens,
            });
            return result;
        }
        catch (error) {
            clearTimeout(timeoutId);
            // Sprint 3: End span with error
            (0, telemetry_1.endSpanError)(span, error);
            if (error.name === 'AbortError') {
                throw this.createError('TIMEOUT_ERROR', 'OpenAI request timeout (15s)', true);
            }
            throw error;
        }
    }
    /**
     * Call Gemini API
     */
    async callGemini(request, requestId) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        if (!this.GEMINI_API_KEY) {
            throw this.createError('AUTH_ERROR', 'Gemini API key not configured', false);
        }
        const { model, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 8192, topP = 0.95, topK = 40 } = request;
        // Determine API version
        const apiVersion = model.includes('2.5') ? 'v1' : 'v1beta';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT);
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${this.GEMINI_API_KEY}`, {
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
            });
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
                throw this.createError('PROVIDER_ERROR', ((_a = error.error) === null || _a === void 0 ? void 0 : _a.message) || 'Gemini API error', false);
            }
            const data = await response.json();
            const content = (_f = (_e = (_d = (_c = (_b = data.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text;
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
                    promptTokens: (_g = data.usageMetadata) === null || _g === void 0 ? void 0 : _g.promptTokenCount,
                    completionTokens: (_h = data.usageMetadata) === null || _h === void 0 ? void 0 : _h.candidatesTokenCount,
                    totalTokens: (_j = data.usageMetadata) === null || _j === void 0 ? void 0 : _j.totalTokenCount,
                },
                result: parsed.blocks ? { blocks: parsed.blocks } : (Array.isArray(parsed) ? { blocks: parsed } : parsed),
                requestId,
            };
        }
        catch (error) {
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
    async callClaude(request, requestId) {
        var _a, _b, _c, _d, _e, _f, _g;
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
                throw this.createError('PROVIDER_ERROR', ((_a = error.error) === null || _a === void 0 ? void 0 : _a.message) || 'Claude API error', false);
            }
            const data = await response.json();
            const content = (_c = (_b = data.content) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.text;
            if (!content) {
                throw this.createError('PROVIDER_ERROR', 'No response from Claude', false);
            }
            const parsed = JSON.parse(content);
            return {
                success: true,
                provider: 'claude',
                model,
                usage: {
                    promptTokens: (_d = data.usage) === null || _d === void 0 ? void 0 : _d.input_tokens,
                    completionTokens: (_e = data.usage) === null || _e === void 0 ? void 0 : _e.output_tokens,
                    totalTokens: (((_f = data.usage) === null || _f === void 0 ? void 0 : _f.input_tokens) || 0) + (((_g = data.usage) === null || _g === void 0 ? void 0 : _g.output_tokens) || 0),
                },
                result: parsed.blocks ? { blocks: parsed.blocks } : parsed,
                requestId,
            };
        }
        catch (error) {
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
    calculateBackoff(attempt, retryAfter) {
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
    parseRetryAfter(header) {
        if (!header)
            return undefined;
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
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Create standardized error
     */
    createError(type, message, retryable, retryAfter) {
        return {
            type,
            message,
            retryable,
            retryAfter,
        };
    }
}
exports.aiProxyService = AIProxyService.getInstance();
//# sourceMappingURL=ai-proxy.service.js.map