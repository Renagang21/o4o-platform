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
import { AIGenerateRequest, AIGenerateResponse } from '../types/ai-proxy.types';
declare class AIProxyService {
    private static instance;
    private readonly OPENAI_API_KEY;
    private readonly GEMINI_API_KEY;
    private readonly CLAUDE_API_KEY;
    private readonly DEFAULT_TIMEOUT;
    private readonly MAX_RETRIES;
    private readonly BASE_DELAY;
    private readonly MAX_DELAY;
    private readonly RETRY_FACTOR;
    private constructor();
    static getInstance(): AIProxyService;
    /**
     * Main proxy method: validate, call provider, retry on errors
     */
    generateContent(request: AIGenerateRequest, userId: string, requestId: string): Promise<AIGenerateResponse>;
    /**
     * Validate request against whitelist and parameter limits
     */
    private validateRequest;
    /**
     * Call provider with retry logic
     */
    private callProviderWithRetry;
    /**
     * Call provider API
     */
    private callProvider;
    /**
     * Call OpenAI API
     */
    private callOpenAI;
    /**
     * Call Gemini API
     */
    private callGemini;
    /**
     * Call Claude API
     */
    private callClaude;
    /**
     * Calculate exponential backoff with jitter
     */
    private calculateBackoff;
    /**
     * Parse Retry-After header
     */
    private parseRetryAfter;
    /**
     * Sleep utility
     */
    private sleep;
    /**
     * Create standardized error
     */
    private createError;
}
export declare const aiProxyService: AIProxyService;
export {};
//# sourceMappingURL=ai-proxy.service.d.ts.map