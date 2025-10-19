/**
 * AI Proxy Types
 * Sprint 2 - P1: AI Proxy Server-Side Implementation
 */
export type AIProvider = 'openai' | 'gemini' | 'claude';
export declare const MODEL_WHITELIST: {
    readonly openai: readonly ["gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4.1", "gpt-4o"];
    readonly gemini: readonly ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"];
    readonly claude: readonly ["claude-sonnet-4.5", "claude-opus-4", "claude-sonnet-4"];
};
export declare const PARAMETER_LIMITS: {
    readonly maxTokens: {
        readonly openai: 4000;
        readonly gemini: 8192;
        readonly claude: 4000;
    };
    readonly temperature: {
        readonly min: 0;
        readonly max: 2;
    };
    readonly topP: {
        readonly min: 0;
        readonly max: 1;
    };
    readonly topK: {
        readonly min: 1;
        readonly max: 100;
    };
    readonly maxRequestSize: number;
};
export interface AIGenerateRequest {
    provider: AIProvider;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
}
export interface AIGenerateResponse {
    success: boolean;
    provider: AIProvider;
    model: string;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
    result?: {
        blocks: any[];
    };
    error?: string;
    requestId?: string;
}
export interface OpenAIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
export interface GeminiResponse {
    candidates: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
        };
    }>;
    usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    };
}
export interface ClaudeResponse {
    content: Array<{
        text: string;
    }>;
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
}
export interface AIProxyError {
    type: 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'PROVIDER_ERROR' | 'TIMEOUT_ERROR' | 'RATE_LIMIT_ERROR';
    message: string;
    retryable: boolean;
    retryAfter?: number;
}
//# sourceMappingURL=ai-proxy.types.d.ts.map