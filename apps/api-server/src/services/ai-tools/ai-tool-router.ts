/**
 * AI Tool Router — 실행 계층
 *
 * WO-O4O-AI-CAPABILITY-TOOL-ROUTING-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 실행 경계 (§10)
 *
 *   Gemini/OpenAI 는 **도구를 직접 실행하지 않는다.** provider 는 텍스트만 만든다.
 *   모든 실행은 이 라우터를 통과한다:
 *
 *     요청 → 서버 scope 재확정 → capability 파생 → eligibility → 인자 검증
 *          → executor(read-only) → 민감 필드 제거 → 프롬프트 컨텍스트
 *
 *   provider 가 DB·브라우저·로컬 PC 에 닿는 경로는 존재하지 않는다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * V0 는 provider-native function calling 을 쓰지 않는다 (§19-B)
 *
 *   `AIProvider.complete(systemPrompt, userPrompt, config)` 에는 tools 인자가 없고
 *   `AIProviderConfig` 에도 tools 필드가 없다. 즉 provider-native tool calling 을 하려면
 *   **F1 Frozen 인 `@o4o/ai-core` 의 provider 인터페이스를 구조 변경**해야 한다.
 *   §19 가 "과도한 변경이면 B 로 닫아도 된다" 고 했고 §20 이 agent loop 를 금지하므로,
 *   V0 는 **결정론적 사전 실행(deterministic pre-tool)** 으로 간다:
 *
 *     tool 을 최대 1회 서버에서 실행 → 결과를 컨텍스트로 주입 → LLM 1회 호출 → 텍스트 응답
 *
 *   tool 계약은 provider 중립이라(§11) 나중에 native function calling 을 붙일 때
 *   adapter 가 변환만 하면 된다.
 */

import type { DataSource } from 'typeorm';
import { getCapabilityLabel } from '@o4o/capabilities';
import logger from '../../utils/logger.js';
import {
  AI_TOOL_NAMES,
  assertToolAllowed,
  deriveAiCapabilities,
  resolveAvailableTools,
  validateToolArguments,
  type AiToolName,
  type ToolResult,
  type VerifiedToolContext,
} from './ai-tool-contract.js';

// ─── Executors (read-only) ───────────────────────────────────────────────────

/**
 * `workscope.get_context` — 현재 작업 컨텍스트.
 *
 * 식별자(userId·organizationId·storeId)를 **반환하지 않는다**. AI 가 사용자에게
 * 내부 UUID 를 그대로 뱉지 못하게 하는 기존 계약을 그대로 유지한다(§8·§16).
 */
function executeGetWorkScopeContext(ctx: VerifiedToolContext): ToolResult {
  return {
    ok: true,
    tool: AI_TOOL_NAMES.GET_WORK_SCOPE_CONTEXT,
    data: {
      workspace: ctx.workspace,
      serviceKey: ctx.serviceKey ?? null,
      storeResolved: ctx.storeStatus === 'resolved',
      storeStatus: ctx.storeStatus ?? null,
      capabilities: deriveAiCapabilities(ctx),
    },
  };
}

/**
 * `store.get_context` — 확정된 매장에서 **사용 가능한 기능 목록**.
 *
 * 기존 `store_capabilities`(매장 기능 등재부)를 read-only 로 읽어 라벨로 바꾼다.
 * 새 테이블·새 등재부를 만들지 않는다(§24).
 *
 * **반환하지 않는 것** — 사업자번호 · 주소 · 대표자 · 전화번호 · 조직명 · UUID,
 * 그리고 처방 · 환자 · 보험청구 · 개인정보 계열 일체(§8·§23).
 * 이 executor 는 애초에 그런 테이블을 조회하지 않는다.
 */
async function executeGetStoreContext(
  dataSource: DataSource,
  ctx: VerifiedToolContext,
): Promise<ToolResult> {
  const tool = AI_TOOL_NAMES.GET_STORE_CONTEXT;
  // capability 판정에서 이미 걸러지지만, executor 도 스스로 방어한다.
  if (ctx.storeStatus !== 'resolved' || !ctx.organizationId) {
    return { ok: false, tool, reason: 'CAPABILITY_MISSING' };
  }

  const rows = (await dataSource.query(
    `SELECT capability_key, enabled
       FROM store_capabilities
      WHERE organization_id = $1
      ORDER BY capability_key ASC`,
    [ctx.organizationId],
  )) as Array<{ capability_key: string; enabled: boolean }>;

  const enabled = rows.filter((r) => r.enabled).map((r) => getCapabilityLabel(r.capability_key));

  return {
    ok: true,
    tool,
    data: {
      storeResolved: true,
      serviceKey: ctx.serviceKey ?? null,
      // 라벨만 담는다(내부 key 대신). 사용자에게 그대로 읽어줘도 안전한 형태다.
      enabledFeatures: enabled,
      enabledFeatureCount: enabled.length,
    },
  };
}

// ─── Router ──────────────────────────────────────────────────────────────────

/**
 * tool 1개를 실행한다. **agent loop 없음** — 호출부가 최대 1회만 부른다(§20).
 *
 * 실행 직전 재검증 순서(§14): 등록부 확인 → capability 재확인 → 인자 검증 → executor.
 */
export async function executeAiTool(
  dataSource: DataSource,
  name: string,
  args: unknown,
  ctx: VerifiedToolContext,
): Promise<ToolResult> {
  const auth = assertToolAllowed(name, ctx);
  if (!auth.allowed) {
    logger.info('ai-tool denied', { tool: name, reason: auth.reason, workspace: ctx.workspace });
    return { ok: false, tool: name, reason: auth.reason };
  }

  const argCheck = validateToolArguments(args);
  if (!argCheck.ok) {
    logger.info('ai-tool denied', { tool: name, reason: argCheck.reason, workspace: ctx.workspace });
    return { ok: false, tool: name, reason: argCheck.reason ?? 'INVALID_ARGUMENTS' };
  }

  switch (name as AiToolName) {
    case AI_TOOL_NAMES.GET_WORK_SCOPE_CONTEXT:
      return executeGetWorkScopeContext(ctx);
    case AI_TOOL_NAMES.GET_STORE_CONTEXT:
      return executeGetStoreContext(dataSource, ctx);
    default:
      // 등록부에는 있으나 executor 가 없는 경우 — 열려 있는 척하지 않는다.
      return { ok: false, tool: name, reason: 'UNKNOWN_TOOL' };
  }
}

// ─── Deterministic selection (§12) ───────────────────────────────────────────

/**
 * "내 매장 기준으로 …" 류의 매장 지시어.
 *
 * V0 는 모델이 tool 을 자유 선택하게 하지 않는다. 이 목록에 걸리고 **자격도 통과할 때만**
 * 매장 컨텍스트를 붙인다. 자격이 없으면 tool 을 고르지 않고 그대로 텍스트 응답으로 간다.
 */
const STORE_INTENT_PATTERNS: readonly RegExp[] = [
  /내\s*매장/,
  /우리\s*매장/,
  /our\s+store/i,
  /my\s+store/i,
  /내\s*약국/,
  /우리\s*약국/,
];

export function looksLikeStoreScopedRequest(message: string): boolean {
  return STORE_INTENT_PATTERNS.some((re) => re.test(message));
}

/**
 * 이번 요청에서 실행할 tool 을 **결정론적으로** 고른다. 없으면 null.
 *
 * 자격 없는 tool 은 후보에 들어오지 않는다(`resolveAvailableTools`).
 */
export function selectToolForRequest(message: string, ctx: VerifiedToolContext): AiToolName | null {
  const available = new Set(resolveAvailableTools(ctx).map((t) => t.name));
  if (looksLikeStoreScopedRequest(message) && available.has(AI_TOOL_NAMES.GET_STORE_CONTEXT)) {
    return AI_TOOL_NAMES.GET_STORE_CONTEXT;
  }
  return null;
}

/**
 * tool 결과를 system prompt 에 덧붙일 문장으로 바꾼다.
 *
 * 구조체를 통째로 넘기지 않는다(§17) — 사람이 읽는 요약만 넣는다.
 */
export function renderToolContext(result: ToolResult): string | null {
  if (!result.ok || !result.data) return null;
  if (result.tool === AI_TOOL_NAMES.GET_STORE_CONTEXT) {
    const features = (result.data.enabledFeatures as string[] | undefined) ?? [];
    if (features.length === 0) {
      return '## 조회된 매장 정보\n- 현재 매장에서 활성화된 기능이 없습니다.';
    }
    return `## 조회된 매장 정보\n- 현재 매장에서 사용 가능한 기능: ${features.join(', ')}`;
  }
  if (result.tool === AI_TOOL_NAMES.GET_WORK_SCOPE_CONTEXT) {
    return `## 조회된 작업 컨텍스트\n- 업무 공간: ${String(result.data.workspace)}`;
  }
  return null;
}
