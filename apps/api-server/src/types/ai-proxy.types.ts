/**
 * AI Proxy Types
 * Sprint 2 - P1: AI Proxy Server-Side Implementation
 */

// Supported AI Providers
export type AIProvider = 'openai' | 'gemini' | 'claude';

// Model Whitelist (2025 models)
// WO-O4O-AI-MODEL-SETTINGS-CLEANUP-V1: gemini-3.0-flash / gemini-3.0-pro removed —
// Google API does not recognise these identifiers (per migration 20260323600000-FixGeminiModelName).
// Canonical Gemini model: gemini-2.5-flash.
export const MODEL_WHITELIST = {
  openai: [
    // WO-O4O-AI-MULTI-PROVIDER-RUNTIME-V0: 2026-09 공식 문서 기준 현행 라인업.
    // 단가 차이가 크므로(입력/출력 per 1M) 선택은 env 로 바꿀 수 있게 둔다.
    'gpt-6-astra',   // 플래그십  $10 / $50
    'gpt-5.6-sol',   //           $4  / $20
    'gpt-5.6-terra', //           $2  / $12
    'gpt-5.6-luna',  // 경제형    $0.20 / $1.20
    // 구세대 — 기존 호출부 호환을 위해 남긴다(파라미터 계약이 다르다: max_tokens + temperature).
    'gpt-5',
    'gpt-5-mini',
    'gpt-5-nano',
    'gpt-4.1',
    'gpt-4o',
  ],
  gemini: [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    // WO-O4O-AI-GEMINI-MODEL-UPGRADE-V1: 저비용/짧은 문구(POP/QR) 후보. 공식 id 확인됨
    // (ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite, 1M ctx / 65K out).
    'gemini-2.5-flash-lite',
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

// Raw content response (for non-block outputType routes)
export interface AIRawContentResponse {
  success: boolean;
  provider: AIProvider;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  parsed: Record<string, any>;
  rawText: string;
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
