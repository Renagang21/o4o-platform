"use strict";
/**
 * AI Proxy Types
 * Sprint 2 - P1: AI Proxy Server-Side Implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARAMETER_LIMITS = exports.MODEL_WHITELIST = void 0;
// Model Whitelist (2025 models)
exports.MODEL_WHITELIST = {
    openai: [
        'gpt-5',
        'gpt-5-mini',
        'gpt-5-nano',
        'gpt-4.1',
        'gpt-4o',
    ],
    gemini: [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-2.0-flash',
    ],
    claude: [
        'claude-sonnet-4.5',
        'claude-opus-4',
        'claude-sonnet-4',
    ],
};
// Parameter Limits
exports.PARAMETER_LIMITS = {
    maxTokens: {
        openai: 4000,
        gemini: 8192,
        claude: 4000,
    },
    temperature: {
        min: 0,
        max: 2,
    },
    topP: {
        min: 0,
        max: 1,
    },
    topK: {
        min: 1,
        max: 100,
    },
    maxRequestSize: 256 * 1024, // 256KB
};
//# sourceMappingURL=ai-proxy.types.js.map