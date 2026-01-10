/**
 * AI Proxy Types
 * Sprint 2 - P1: AI Proxy Server-Side Implementation
 */

// Supported AI Providers
export type AIProvider = 'openai' | 'gemini' | 'claude';

// Model Whitelist (2025 models)
export const MODEL_WHITELIST = {
  openai: [
    'gpt-5',
    'gpt-5-mini',
    'gpt-5-nano',
    'gpt-4.1',
    'gpt-4o',
  ],
  gemini: [
    'gemini-3.0-flash',
    'gemini-3.0-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ],
  claude: [
    'claude-sonnet-4.5',
    'claude-opus-4',
    'claude-sonnet-4',
  ],
} as const;

// Parameter Limits
export const PARAMETER_LIMITS = {
  maxTokens: {
    openai: 8192,
    gemini: 32768,
    claude: 8192,
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
} as const;

// Request Types
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

// Response Types
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

// Provider-specific response types
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

// Error Types
export interface AIProxyError {
  type: 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'PROVIDER_ERROR' | 'TIMEOUT_ERROR' | 'RATE_LIMIT_ERROR';
  message: string;
  retryable: boolean;
  retryAfter?: number;
}
