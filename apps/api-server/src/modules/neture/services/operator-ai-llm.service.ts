/**
 * Operator AI LLM Service
 *
 * WO-O4O-AI-ACTION-LLM-UPGRADE-V3
 *
 * @o4o/ai-core의 execute()를 사용하여 OperatorContext를 LLM에 전달,
 * 동적 Action 추천을 JSON으로 생성한다.
 *
 * 안전장치:
 *  - 최대 3개 Action 제한
 *  - confidence < 0.6 필터
 *  - 3초 타임아웃 → 빈 배열 반환 (fallback)
 *  - JSON 스키마 검증
 *  - 60초 인메모리 캐시 (비용 절감)
 */

import type { OperatorContext, AiActionItem } from './operator-ai-action.service.js';
import logger from '../../../utils/logger.js';

// ─── LLM Output Schema ───

interface LlmAction {
  type: 'curation' | 'inquiry' | 'product' | 'supplier';
  priority: 'high' | 'medium' | 'low';
  reason: string;
  confidence: number;
}

// ─── Action Type → Execute API mapping ───

const ACTION_MAP: Record<string, {
  actionType: 'EXECUTE' | 'NAVIGATE';
  actionUrl: string;
  actionLabel: string;
  actionApi?: string;
  actionMethod?: string;
}> = {
  // WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1: curation 액션 매핑 제거
  inquiry: {
    actionType: 'EXECUTE',
    actionUrl: '/operator/contact-messages',
    actionLabel: '일괄 확인처리',
    actionApi: '/neture/operator/actions/execute/inquiries-mark-read',
    actionMethod: 'POST',
  },
  product: {
    actionType: 'EXECUTE',
    actionUrl: '/operator/product-service-approvals',
    actionLabel: '일괄 승인',
    actionApi: '/neture/operator/actions/execute/approve-pending-products',
    actionMethod: 'POST',
  },
  supplier: {
    actionType: 'NAVIGATE',
    actionUrl: '/operator/admin-suppliers',
    actionLabel: '공급사 관리',
  },
};

// ─── Prompt v2 ───

const SYSTEM_PROMPT = `You are an operator assistant for the Neture commerce platform.
Given the current store operational context, suggest up to 3 priority actions.

Rules:
- Return ONLY a JSON array, no explanation outside JSON
- Each item must include: type, priority, reason, confidence
- confidence must be between 0 and 1
- Available action types: inquiry, product, supplier
- Only suggest actions where the context data shows a clear need
- Use Korean for the reason field`;

function buildUserPrompt(ctx: OperatorContext): string {
  return `Current operator context:
${JSON.stringify(ctx, null, 2)}

Based on this data, suggest up to 3 actions as a JSON array.
Example format:
[{"type":"inquiry","priority":"high","reason":"미처리 문의가 많아 응답이 지연되고 있습니다","confidence":0.82}]`;
}

// ─── In-memory cache ───

interface CacheEntry {
  actions: AiActionItem[];
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
let cache: CacheEntry | null = null;

// ─── Validation ───

// WO-NETURE-CURATION-PHASE1-DECISION-PRESSURE-REMOVE-V1: 'curation' 타입 제거
const VALID_TYPES = new Set(['inquiry', 'product', 'supplier']);
const VALID_PRIORITIES = new Set(['high', 'medium', 'low']);

function isValidLlmAction(item: unknown): item is LlmAction {
  if (!item || typeof item !== 'object') return false;
  const a = item as Record<string, unknown>;
  return (
    typeof a.type === 'string' && VALID_TYPES.has(a.type) &&
    typeof a.priority === 'string' && VALID_PRIORITIES.has(a.priority) &&
    typeof a.reason === 'string' && a.reason.length > 0 &&
    typeof a.confidence === 'number' && a.confidence >= 0 && a.confidence <= 1
  );
}

function mapLlmToActionItem(llm: LlmAction, index: number): AiActionItem | null {
  const mapping = ACTION_MAP[llm.type];
  if (!mapping) return null;

  // LLM type 'supplier' → internal type 'approval'
  const internalType = llm.type === 'supplier' ? 'approval' : llm.type;

  return {
    id: `llm-${llm.type}-${index}`,
    source: 'AI',
    type: internalType as AiActionItem['type'],
    title: llm.reason.length > 30 ? llm.reason.slice(0, 30) + '...' : llm.reason,
    description: llm.reason,
    priority: llm.priority,
    confidence: llm.confidence,
    ...mapping,
  };
}

// ─── Service ───

export class OperatorAiLlmService {
  /**
   * LLM 기반 Action 추천 생성.
   * 실패 시 빈 배열 반환 (caller가 Rule fallback 처리).
   */
  async generate(ctx: OperatorContext): Promise<AiActionItem[]> {
    // Check cache
    if (cache && Date.now() < cache.expiresAt) {
      return cache.actions;
    }

    try {
      // Dynamic import to avoid startup failure if ai-core not built
      const { execute } = await import('@o4o/ai-core');

      const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return [];
      }

      const provider = process.env.GEMINI_API_KEY ? 'gemini' : 'openai';
      const model = provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini';

      const result = await execute({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(ctx),
        provider,
        responseMode: 'json',
        config: {
          apiKey,
          model,
          maxTokens: 500,
          temperature: 0.2,
        },
        timeoutMs: 3000,
        retry: { maxAttempts: 1, delayMs: 0 },
        meta: { service: 'neture', callerName: 'OperatorAiLlm' },
      });

      // Parse and validate
      const parsed = JSON.parse(result.content);
      const rawActions: unknown[] = Array.isArray(parsed) ? parsed : [];

      const actions = rawActions
        .filter(isValidLlmAction)
        .filter((a) => a.confidence >= 0.6)
        .slice(0, 3)
        .map((a, i) => mapLlmToActionItem(a, i))
        .filter((a): a is AiActionItem => a !== null);

      // Cache
      cache = { actions, expiresAt: Date.now() + CACHE_TTL_MS };

      logger.info(`[OperatorAiLlm] Generated ${actions.length} actions via ${provider}/${model} (${result.durationMs}ms, ${result.promptTokens + result.completionTokens} tokens)`);

      return actions;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`[OperatorAiLlm] LLM call failed, returning empty: ${msg}`);
      return [];
    }
  }
}
