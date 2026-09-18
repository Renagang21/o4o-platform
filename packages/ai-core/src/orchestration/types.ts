/**
 * AI Orchestration Layer — Core Types
 *
 * WO-PLATFORM-AI-ORCHESTRATION-LAYER-V1
 *
 * AI는 "실행"이 아니라 판단·요약·추천을 담당한다.
 * 실행은 기존 Operator Engine(Trigger) 시스템이 수행한다.
 */

// ─────────────────────────────────────────────────────
// Service & Provider
// ─────────────────────────────────────────────────────

/** Services that can request AI insights */
export type AIServiceId = 'kpa' | 'neture' | 'cosmetics';

/** Supported AI provider backends */
export type AIProviderId = 'gemini' | 'openai';

// ─────────────────────────────────────────────────────
// Orchestration Request
// ─────────────────────────────────────────────────────

/** Entry point for all AI insight requests */
export interface AIOrchestrationRequest {
  /** Which service is requesting the insight */
  service: AIServiceId;
  /** The type of insight being requested */
  insightType: string;
  /** Service-specific context data (KPI, metrics, signals) */
  contextData: Record<string, unknown>;
  /** Requesting user info (for audit + policy enforcement) */
  user: {
    id: string;
    role: string;
    organizationId?: string;
  };
  /** Optional overrides */
  options?: {
    provider?: AIProviderId;
    maxTokens?: number;
    temperature?: number;
  };
}

// ─────────────────────────────────────────────────────
// AI Insight (Output)
// ─────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high';

/** Structured AI output — no free-form text, always machine-readable */
export interface AIInsight {
  /** Human-readable summary */
  summary: string;
  /** Risk assessment */
  riskLevel?: RiskLevel;
  /** Recommended actions (human-readable) */
  recommendedActions: string[];
  /** Trigger IDs that the Operator Engine could fire */
  suggestedTriggers?: string[];
  /** 0.0-1.0 confidence in the analysis */
  confidenceScore: number;
  /** Optional structured details per service */
  details?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────
// Orchestration Result
// ─────────────────────────────────────────────────────

export interface AIOrchestrationResult {
  success: boolean;
  insight?: AIInsight;
  error?: {
    code: string;
    message: string;
  };
  meta: {
    provider: AIProviderId;
    model: string;
    promptTokens: number;
    completionTokens: number;
    durationMs: number;
    requestId: string;
  };
}

// ─────────────────────────────────────────────────────
// Provider Interface
// ─────────────────────────────────────────────────────

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  /** 'json' (default) — JSON 모드 강제 / 'text' — free-text 응답 */
  responseMode?: 'json' | 'text';
  /** Provider 타임아웃 override (ms) */
  timeoutMs?: number;
  /**
   * true 면 Gemini 네이티브 Google Search grounding 활성화(범용 Web Research capability).
   * 명시하지 않으면(undefined/false) 기존 동작 그대로 — grounding 미사용.
   * grounding 은 text 응답 경로에서만 동작한다(JSON 강제와 병용 불가). gemini provider 전용.
   */
  grounding?: boolean;
}

/** Provider adapter — all LLM backends implement this */
export interface AIProvider {
  readonly id: AIProviderId;

  /** Send a prompt and get structured JSON response */
  complete(
    systemPrompt: string,
    userPrompt: string,
    config: AIProviderConfig,
  ): Promise<AIProviderResponse>;
}

/**
 * Web Research(grounding) 근거 메타데이터 — grounding 요청에서만 채워진다(additive).
 * `used` 는 응답에 실제 groundingMetadata 가 있었는지를 정직하게 반영한다 —
 * false 면 모델이 검색을 수행하지 않은 것이므로 grounded research 로 간주하면 안 된다.
 */
export interface AIGroundingMetadata {
  /** 모델이 실제로 검색 도구를 사용했는가(groundingMetadata 존재 여부) */
  used: boolean;
  /** 모델이 실행한 검색 질의 */
  queries: string[];
  /** 인용 출처 */
  sources: Array<{ uri: string; title?: string }>;
}

export interface AIProviderResponse {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  /** grounding 요청 시 근거 메타데이터(additive · 비-grounding 응답에는 없음) */
  grounding?: AIGroundingMetadata;
}

// ── Streaming Support (WO-O4O-AI-STREAMING-SSE-IMPLEMENTATION-V1) ──

export interface AIStreamChunk {
  text: string;
  done: boolean;
}

export interface AIStreamProvider extends AIProvider {
  readonly supportsStreaming: boolean;
  streamComplete(
    systemPrompt: string,
    userPrompt: string,
    config: AIProviderConfig,
  ): AsyncGenerator<AIStreamChunk, AIProviderResponse, undefined>;
}

export function isStreamProvider(p: AIProvider): p is AIStreamProvider {
  return 'supportsStreaming' in p && (p as any).supportsStreaming === true;
}

// ─────────────────────────────────────────────────────
// Context & Prompt
// ─────────────────────────────────────────────────────

/** Built context for a specific service insight request */
export interface AIContext {
  service: AIServiceId;
  insightType: string;
  /** Extracted and validated data points */
  dataPoints: Record<string, unknown>;
  /** Constraints for the AI (e.g., "do not provide medical advice") */
  constraints: string[];
  /** Temporal context */
  periodDays?: number;
  generatedAt: string;
}

/** Composed prompt ready for the provider */
export interface ComposedPrompt {
  systemPrompt: string;
  userPrompt: string;
  /** Expected JSON schema description for response parsing */
  responseSchema: string;
}

// ─────────────────────────────────────────────────────
// Action Mapping
// ─────────────────────────────────────────────────────

/** Maps AI recommendations to executable triggers */
export interface ActionMapping {
  /** The recommended action text from AI */
  recommendation: string;
  /** Mapped Operator Engine trigger ID (if exists) */
  triggerId?: string;
  /** Whether this can be auto-executed or needs human approval */
  requiresApproval: boolean;
  /** Priority: 1 = immediate, 2 = soon, 3 = when convenient */
  priority: 1 | 2 | 3;
}

// ─────────────────────────────────────────────────────
// Audit
// ─────────────────────────────────────────────────────

export interface AIAuditEntry {
  requestId: string;
  userId: string;
  service: AIServiceId;
  insightType: string;
  provider: AIProviderId;
  promptHash: string;
  responseHash: string;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  durationMs: number;
  success: boolean;
  timestamp: string;
}

// ─────────────────────────────────────────────────────
// Usage Policy
// ─────────────────────────────────────────────────────

export interface UsagePolicy {
  /** Max calls per day per user */
  dailyLimitPerUser: number;
  /** Max calls per day per service */
  dailyLimitPerService: number;
  /** Roles that are allowed to invoke AI */
  allowedRoles: string[];
  /** Services where AI is enabled */
  enabledServices: AIServiceId[];
}
