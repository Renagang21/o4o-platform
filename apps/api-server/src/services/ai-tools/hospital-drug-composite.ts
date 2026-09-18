/**
 * Hospital Drug Composite — 한 문장을 원내약(Local SQLite) + 약학정보원(health.kr) 두 소스로
 * 내부 분해해 **하나의 답**으로 합친다 (deterministic · LLM 미호출)
 *
 * WO-O4O-HOSPITAL-DRUG-COMPOSITE-QUERY-ORCHESTRATION-V1 §2·§7·§9·§10
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 모듈이 하는 일 / 하지 않는 일
 *
 *   §9 — "우루사정 200mg 과 같은 성분의 원내약 있어?" 같은 **한 요청**을 받아
 *     ① 제품/성분 식별(health.kr 동일성분) → ② 원내 약품 조회(Local SQLite) 로
 *     내부에서 이어 실행하고, 그 결과를 **하나의 한국어 답**으로 합친다.
 *     "먼저 health.kr 답 → 다시 되묻기 → 두 번째로 로컬" 이 아니다(§9 금지).
 *
 *   §2 — 사용자는 실행 경로를 고르지 않는다. 이 오케스트레이터가 문장에서 의도를
 *     읽어 web+local / local-only / web-only 를 정한다.
 *
 *   §7 — 매칭 축은 성분 → 함량 → 제형 → 제조사/상품명 순. Excel 에 있는 canonical
 *     필드만 쓴다(LOCAL_DATASET_FIELDS). 없는 값은 지어내지 않고, 확신이 낮으면
 *     그 사실을 문장으로 밝힌다.
 *
 *   §10 — health.kr 실패는 지어내지 않는다. Local Data 미연결이면 "[원내 약품 파일
 *     연결]" 을 안내한다. 상품명이 모호하면(§13-E) 후보를 보여주고 사용자가 고르게 한다.
 *
 *   금지(WO §4) — 하드코딩된 약품별 workflow · 범용 workflow engine 을 만들지 않는다.
 *     이 모듈은 "제품식별 → 원내조회" 라는 **한 가지 결합**만 결정론으로 수행한다.
 *
 * 안전: 각 단계는 주입된 executor(`executeAiTool`)를 그대로 지나므로 Safety/Capability
 *   게이트가 단계마다 다시 걸린다. 이 모듈은 권한을 넓히지 않는다. health.kr 결과·원내
 *   raw row 를 저장하지 않는다(응답 렌더링에만 쓴다 — cloud 저장 금지 §4).
 */

import { AI_TOOL_NAMES } from './ai-tool-contract.js';
import { extractDrugNameToken } from './ai-tool-router.js';
import { resolvePharmacyWebIntent, PHARMACY_WEB_INTENT } from '../local-agent/pharmacy-web-core.js';
import { LOCAL_DATASET_NAMES, LOCAL_AGENT_ERROR } from '../local-agent/local-agent-protocol.js';
import { HEALTHKR_ERROR } from '../local-agent/healthkr-adapter.js';

/** 주입되는 tool 실행 결과(= ai-tool-router 의 ToolResult 형상 축약). */
export interface CompositeToolResult {
  ok: boolean;
  tool: string;
  data?: Record<string, unknown>;
  reason?: string;
}

/** 단계 실행자 — 실사용은 `executeAiTool` 을 감싸고, 테스트는 가짜를 주입한다. */
export type CompositeToolExecutor = (name: string, args: unknown) => Promise<CompositeToolResult>;

export type CompositePlan = 'web_and_local' | 'local_only' | 'web_only' | 'unsupported';

export interface CompositeStepTrace {
  source: 'healthkr' | 'local_data';
  tool: string;
  outcome: string;
}

export interface CompositeResult {
  /** 병동 사용자에게 보여줄 최종 한국어 답(결정론 · LLM 미호출). */
  answer: string;
  plan: CompositePlan;
  /** 문장에서 뽑은 제품 토큰(없으면 null). */
  product: string | null;
  /** health.kr 이 확정한 성분명(동일성분 성공 시). */
  ingredient: string | null;
  /** 요청에 담긴 함량(예: "200mg", 없으면 null). §7 함량 축. */
  strength: string | null;
  /** 각 단계가 무엇을 했는지 — smoke·로그 검증용(값 원문·raw row 없음). */
  steps: CompositeStepTrace[];
}

// ─── 문장 파싱 (한글은 문자열 includes — 정규식 리터럴에 한글 금지) ────────────────

function compact(s: string): string {
  return String(s ?? '').replace(/\s+/g, '').toLowerCase();
}

/** 원내(in-hospital) 지시가 있는 문장인가. */
const HOSPITAL_TOKENS: readonly string[] = ['원내'];

/** 동일성분 지시가 있는 문장인가(§13-A). */
const SAME_INGREDIENT_TOKENS: readonly string[] = ['동일성분', '같은성분', '성분같은', '동일한성분'];

export function mentionsHospital(message: string): boolean {
  const c = compact(message);
  return HOSPITAL_TOKENS.some((t) => c.includes(t));
}

export function mentionsSameIngredient(message: string): boolean {
  const c = compact(message);
  return SAME_INGREDIENT_TOKENS.some((t) => c.includes(t));
}

/** 따옴표 구절 → 제품명 토큰 순으로 제품 하나를 뽑는다. 없으면 null. */
export function extractProduct(message: string): string | null {
  const m = /["'“”‘’]([^"'“”‘’]{1,80})["'“”‘’]/.exec(String(message ?? ''));
  if (m && m[1].trim().length > 0) return m[1].trim();
  return extractDrugNameToken(message);
}

/** 문장에서 함량 하나를 뽑는다(§7 함량 축). "200mg" · "5 mg" · "1.5g" → 공백 없는 소문자. */
export function extractStrength(message: string): string | null {
  const m = /(\d+(?:\.\d+)?)\s?(mg|mcg|g|ml|iu|%)\b/i.exec(String(message ?? ''));
  return m ? `${m[1]}${m[2].toLowerCase()}` : null;
}

/**
 * 원내약 + 약학정보원 **결합 요청**인가(WO-O4O-HOSPITAL-DRUG-COMPOSITE-QUERY-ORCHESTRATION-V1 §9).
 *   제품 토큰이 있고, "원내"(원내 보유 조회) 또는 "동일성분"(성분 결합) 지시가 있을 때.
 *   composite 가부는 이 술어로 보되, **어느 요청을 composite 로 볼지의 경계는 호출측(ai-proxy)이
 *   `surface==='hospital-drug'` 로 명시적으로 건다.** 전역 Router 는 병원 특수 규칙을 갖지 않는다
 *   (WO-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1 §16 — Source 가 아니라 Context 를 고정).
 */
export function isCompositeHospitalDrugRequest(message: string): boolean {
  if (!extractProduct(message)) return false;
  return mentionsHospital(message) || mentionsSameIngredient(message);
}

// ─── 계획 판정 (§2·§9) ────────────────────────────────────────────────────────

/**
 * 문장 의도 → 실행 계획.
 *   - 동일성분 의도  → web_and_local (health.kr 로 성분 확정 → 원내 성분 조회)
 *   - 원내 지시      → local_only    (원내 상품명 보유 조회)
 *   - 그 외 웹 의도  → web_only      (health.kr 검색/상세)
 *   - 제품도 못 뽑으면 unsupported
 */
export function planForMessage(message: string): CompositePlan {
  const product = extractProduct(message);
  if (!product) return 'unsupported';
  if (mentionsSameIngredient(message)) return 'web_and_local';
  if (mentionsHospital(message)) return 'local_only';
  const intent = resolvePharmacyWebIntent(message).intent;
  if (intent === PHARMACY_WEB_INTENT.DRUG_SEARCH || intent === PHARMACY_WEB_INTENT.DRUG_DETAIL) return 'web_only';
  // 제품은 있으나 소스가 분명치 않으면 원내 보유 조회로 본다(병동 화면의 기본 관심).
  return 'local_only';
}

// ─── 렌더 helpers (§7 · §10) ──────────────────────────────────────────────────

const ANSWER_HEADER = '';

/** §10 — 원내 데이터가 연결되지 않았을 때의 표준 안내. */
const LOCAL_NOT_CONNECTED =
  '원내 약품 파일이 연결되어 있지 않습니다. [원내 약품 파일 연결]이 필요합니다.';

const LOCAL_UNAVAILABLE_CODES: readonly string[] = [
  LOCAL_AGENT_ERROR.NO_DEVICE,
  LOCAL_AGENT_ERROR.OFFLINE,
  LOCAL_AGENT_ERROR.DATA_DB_NOT_AVAILABLE,
  LOCAL_AGENT_ERROR.DATA_DB_NOT_READY,
];

interface LocalRow {
  code?: string;
  product_name?: string;
  ingredient?: string;
  strength?: string;
  dosage_form?: string;
  manufacturer?: string;
  status?: string;
}

/** §7 — 함량이 지정되면 그 함량과 일치하는 행을 앞으로 정렬한다(성분→함량 축). */
function orderRows(rows: LocalRow[], strength: string | null): LocalRow[] {
  if (!strength) return rows;
  const want = compact(strength);
  const match = (r: LocalRow) => compact(r.strength ?? '').includes(want);
  return [...rows].sort((a, b) => (match(a) === match(b) ? 0 : match(a) ? -1 : 1));
}

/** 원내 행 한 줄. canonical 필드만 — 없는 값은 비운다(§7 지어내지 않음). */
function renderRow(row: LocalRow): string {
  const parts: string[] = [];
  if (row.product_name) parts.push(row.product_name);
  if (row.ingredient) parts.push(`성분 ${row.ingredient}`);
  if (row.strength) parts.push(`함량 ${row.strength}`);
  if (row.dosage_form) parts.push(`제형 ${row.dosage_form}`);
  if (row.manufacturer) parts.push(`제조사 ${row.manufacturer}`);
  return `- ${parts.join(' · ') || '(표시 가능한 항목 없음)'}`;
}

/** 원내 조회 결과 블록(§7·§10). 반환: { text, ok, unavailable, rowCount }. */
function renderLocalBlock(
  data: Record<string, unknown> | undefined,
  strength: string | null,
): { text: string; unavailable: boolean; rowCount: number } {
  if (!data || data.available !== true) {
    const code = String(data?.errorCode ?? '');
    if (LOCAL_UNAVAILABLE_CODES.includes(code)) {
      return { text: `[원내 약품] ${LOCAL_NOT_CONNECTED}`, unavailable: true, rowCount: 0 };
    }
    if (code === LOCAL_AGENT_ERROR.AMBIGUOUS) {
      return { text: '[원내 약품] 연결된 PC가 여러 대여서 어느 PC인지 확정할 수 없습니다.', unavailable: true, rowCount: 0 };
    }
    return { text: '[원내 약품] 원내 데이터를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.', unavailable: true, rowCount: 0 };
  }
  const rowsRaw = Array.isArray(data.rows) ? (data.rows as LocalRow[]) : [];
  if (rowsRaw.length === 0) {
    return { text: '[원내 약품] 원내 목록에서 일치하는 항목을 찾지 못했습니다.', unavailable: false, rowCount: 0 };
  }
  const rows = orderRows(rowsRaw, strength);
  const shown = rows.slice(0, 20).map(renderRow);
  const head = `[원내 약품] ${rows.length}건 확인`;
  let note = '';
  if (strength) {
    const anyMatch = rows.some((r) => compact(r.strength ?? '').includes(compact(strength)));
    if (!anyMatch) note = `\n(참고: 요청하신 함량 ${strength} 과(와) 정확히 일치하는 항목은 확인되지 않았습니다.)`;
  }
  return { text: `${head}\n${shown.join('\n')}${note}`, unavailable: false, rowCount: rows.length };
}

/** health.kr 실패 사유 → 병동 문장(§10 — 지어내지 않는다). */
function healthkrFailureLine(code: string): string {
  if (code === HEALTHKR_ERROR.DRUG_NOT_FOUND) return '[약학정보원] 해당 제품을 약학정보원에서 찾지 못했습니다.';
  if (code === HEALTHKR_ERROR.SAME_INGREDIENT_UNAVAILABLE) return '[약학정보원] 동일성분 정보를 확인할 수 없었습니다.';
  if (LOCAL_UNAVAILABLE_CODES.includes(code)) return '[약학정보원] 조회를 위한 브라우저 연결이 준비되지 않았습니다.';
  return '[약학정보원] 약학정보원 조회에 실패했습니다. 화면 구성이 바뀌었을 수 있어 직접 확인이 필요합니다.';
}

// ─── 오케스트레이션 ───────────────────────────────────────────────────────────

const LOCAL_DATASET = LOCAL_DATASET_NAMES[0];
const SAME_INGREDIENT_ENTRYPOINT = 'healthkr.same_ingredient';
const DRUG_SEARCH_ENTRYPOINT = 'healthkr.drug_search';

async function queryLocal(
  exec: CompositeToolExecutor,
  field: string,
  value: string,
): Promise<CompositeToolResult> {
  return exec(AI_TOOL_NAMES.DATA_LOCAL_QUERY, {
    dataset: LOCAL_DATASET,
    field,
    value,
    match: 'contains',
    limit: 50,
  });
}

/**
 * 한 요청 → 두 소스 결합 → 하나의 답.
 * `exec` 는 반드시 `executeAiTool`(권한·인자 게이트 포함)을 지나야 한다.
 */
export async function runHospitalDrugComposite(
  exec: CompositeToolExecutor,
  message: string,
): Promise<CompositeResult> {
  const product = extractProduct(message);
  const strength = extractStrength(message);
  const plan = planForMessage(message);
  const steps: CompositeStepTrace[] = [];

  if (plan === 'unsupported' || !product) {
    return {
      answer:
        '찾으시는 약품 이름을 확인하지 못했습니다. 제품명을 넣어 다시 입력해 주세요. 예) "우루사정 200mg 원내에 있어?"',
      plan: 'unsupported',
      product: null,
      ingredient: null,
      strength,
      steps,
    };
  }

  // ── local_only (§13-B) — 원내 보유 여부를 상품명으로 조회 ──────────────────
  if (plan === 'local_only') {
    const local = await queryLocal(exec, 'product_name', product);
    const block = renderLocalBlock(local.data, strength);
    steps.push({ source: 'local_data', tool: AI_TOOL_NAMES.DATA_LOCAL_QUERY, outcome: local.ok ? (block.unavailable ? 'unavailable' : `rows:${block.rowCount}`) : (local.reason ?? 'denied') });
    const head = `'${product}' 의 원내 보유 여부를 조회했습니다.`;
    return { answer: `${ANSWER_HEADER}${head}\n\n${block.text}`, plan, product, ingredient: null, strength, steps };
  }

  // ── web_only (§13-C) — health.kr 검색만 ────────────────────────────────────
  if (plan === 'web_only') {
    const web = await exec(AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT, {
      entryPointId: DRUG_SEARCH_ENTRYPOINT,
      input: { query: product },
    });
    const d = web.data ?? {};
    if (web.ok && d.available === true && (d.outcome === 'one' || d.outcome === 'list')) {
      const item = (d.item ?? {}) as { productName?: string; ingredient?: string };
      steps.push({ source: 'healthkr', tool: AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT, outcome: 'one' });
      const ing = item.ingredient ? `\n[약학정보원] 성분: ${item.ingredient}` : '';
      const name = item.productName ? ` (${item.productName})` : '';
      return {
        answer: `${ANSWER_HEADER}'${product}'${name} 을(를) 약학정보원에서 조회했습니다.${ing}`,
        plan,
        product,
        ingredient: item.ingredient ?? null,
        strength,
        steps,
      };
    }
    if (web.ok && d.available === true && d.outcome === 'multiple') {
      steps.push({ source: 'healthkr', tool: AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT, outcome: 'multiple' });
      return {
        answer: `${ANSWER_HEADER}${renderAmbiguous(product, d)}`,
        plan,
        product,
        ingredient: null,
        strength,
        steps,
      };
    }
    const code = String(d.errorCode ?? web.reason ?? '');
    steps.push({ source: 'healthkr', tool: AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT, outcome: code || 'failed' });
    return { answer: `${ANSWER_HEADER}${healthkrFailureLine(code)}`, plan, product, ingredient: null, strength, steps };
  }

  // ── web_and_local (§13-A) — 동일성분 식별 → 원내 성분 조회 ──────────────────
  const web = await exec(AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT, {
    entryPointId: SAME_INGREDIENT_ENTRYPOINT,
    input: { query: product },
  });
  const d = web.data ?? {};

  // §13-E — 상품명 모호: 확정하지 않고 후보를 보여 준다(원내 조회로 넘어가지 않는다).
  if (web.ok && d.available === true && d.outcome === 'multiple') {
    steps.push({ source: 'healthkr', tool: AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT, outcome: 'multiple' });
    return { answer: `${ANSWER_HEADER}${renderAmbiguous(product, d)}`, plan, product, ingredient: null, strength, steps };
  }

  // 성분 확정 성공 → 원내 성분 조회로 결합
  if (web.ok && d.available === true && d.outcome === 'list' && typeof d.ingredient === 'string' && d.ingredient.length > 0) {
    const ingredient = d.ingredient as string;
    const sameCount = typeof d.sameIngredientCount === 'number' ? d.sameIngredientCount : 0;
    steps.push({ source: 'healthkr', tool: AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT, outcome: `list:${sameCount}` });

    const local = await queryLocal(exec, 'ingredient', ingredient);
    const block = renderLocalBlock(local.data, strength);
    steps.push({ source: 'local_data', tool: AI_TOOL_NAMES.DATA_LOCAL_QUERY, outcome: local.ok ? (block.unavailable ? 'unavailable' : `rows:${block.rowCount}`) : (local.reason ?? 'denied') });

    const head = `'${product}' 과(와) 같은 성분(${ingredient})의 원내 약품을 조회했습니다.`;
    const webLine = `[약학정보원] '${product}' 의 성분은 ${ingredient} 이며, 동일성분 의약품 ${sameCount}건을 확인했습니다.`;
    return {
      answer: `${ANSWER_HEADER}${head}\n\n${webLine}\n\n${block.text}`,
      plan,
      product,
      ingredient,
      strength,
      steps,
    };
  }

  // §10·§13-F — health.kr 실패: 지어내지 않는다. 대신 원내에 그 제품(상품명)이 있는지만 알려 준다.
  const code = String(d.errorCode ?? web.reason ?? '');
  steps.push({ source: 'healthkr', tool: AI_TOOL_NAMES.PHARMACY_WEB_ENTRYPOINT, outcome: code || 'failed' });
  const local = await queryLocal(exec, 'product_name', product);
  const block = renderLocalBlock(local.data, strength);
  steps.push({ source: 'local_data', tool: AI_TOOL_NAMES.DATA_LOCAL_QUERY, outcome: local.ok ? (block.unavailable ? 'unavailable' : `rows:${block.rowCount}`) : (local.reason ?? 'denied') });
  const head = `동일성분 조회는 완료하지 못했습니다. 원내에 '${product}' 이(가) 있는지만 확인했습니다.`;
  return {
    answer: `${ANSWER_HEADER}${head}\n\n${healthkrFailureLine(code)}\n\n${block.text}`,
    plan,
    product,
    ingredient: null,
    strength,
    steps,
  };
}

/** §13-E — 상품명 모호. 후보를 보여 주고 사용자가 고르게 한다(같은-run 안에서 되묻기). */
function renderAmbiguous(product: string, data: Record<string, unknown>): string {
  const candidates = Array.isArray(data.candidates) ? (data.candidates as { productName?: string; ingredient?: string }[]) : [];
  const lines = candidates
    .slice(0, 10)
    .map((c) => `- ${c.productName ?? ''}${c.ingredient ? ` (성분 ${c.ingredient})` : ''}`.trim())
    .filter((l) => l !== '-');
  const count = typeof data.candidateCount === 'number' ? data.candidateCount : candidates.length;
  const list = lines.length > 0 ? `\n${lines.join('\n')}` : '';
  return (
    `'${product}' 에 해당하는 제품이 여러 건(${count}건) 확인되어 하나로 특정하지 못했습니다. ` +
    `아래 중 어느 제품인지 정확한 상품명으로 다시 입력해 주세요.${list}`
  );
}
