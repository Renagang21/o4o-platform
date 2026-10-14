import type { AiBusinessExtension } from '@o4o/ai-core';
import type { OperatorContext, AiActionItem } from './operator-ai-action.service.js';

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
  // WO-NETURE-OSA-PHASEA-DECISION-PRESSURE-REMOVE-V1: product (OSA 일괄 승인) 액션 매핑 제거
  supplier: {
    actionType: 'NAVIGATE',
    // WO-O4O-NETURE-SUPPLIER-ACTIVATION-VISIBILITY-AND-ACTION-QUEUE-FIX-V1: dead link 정정
    actionUrl: '/operator/suppliers',
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
- Available action types: inquiry, supplier
- Only suggest actions where the context data shows a clear need
- Use Korean for the reason field`;

function buildUserPrompt(ctx: OperatorContext): string {
  return `Current operator context:
${JSON.stringify(ctx, null, 2)}

Based on this data, suggest up to 3 actions as a JSON array.
Example format:
[{"type":"inquiry","priority":"high","reason":"미처리 문의가 많아 응답이 지연되고 있습니다","confidence":0.82}]`;
}

// ─── Validation ───

// WO-NETURE-CURATION-PHASE1: 'curation' 제거
// WO-NETURE-OSA-PHASEA-DECISION-PRESSURE-REMOVE-V1: 'product' 제거
const VALID_TYPES = new Set(['inquiry', 'supplier']);
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


export const operatorActionsExtension: AiBusinessExtension<OperatorContext, AiActionItem[]> = {
  id: 'neture.operator-actions', operation: 'read',
  prepare(ctx) { return { systemPrompt: SYSTEM_PROMPT, userPrompt: buildUserPrompt(ctx) }; },
  parse(content) {
    const parsed = JSON.parse(content);
    const raw: unknown[] = Array.isArray(parsed) ? parsed : [];
    return raw.filter(isValidLlmAction).filter(a => a.confidence >= 0.6).slice(0, 3)
      .map((action, index) => mapLlmToActionItem(action, index)).filter((a): a is AiActionItem => a !== null);
  },
};
