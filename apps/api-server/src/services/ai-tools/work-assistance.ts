/**
 * User Assistance · Correction 계약 — WO-O4O-AUTOMATION-USER-ASSISTANCE-AND-CORRECTION-V1 (Experience Model V1 Phase 2).
 * 정본: docs/baseline/O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md §7-1·§7-2·§7-5·§7-6 (D4·D5).
 *
 * 사용자 도움(질문에 대한 답 · 교정)을 **구조**로만 남긴다. 원문 · slot 값 · 화면 글은 형상에 자리가 없다.
 *   - 업무 키(task) · 단계 키(stage)는 Planner 가 선언하는 짧은 snake_case 식별자다(값이 들어갈 수 없는 형식).
 *   - 방법(strategy)은 정해진 op 어휘의 나열이다. label 은 탭 · 메뉴 · 필터 이름에만 붙고, 이번 run 의 입력값을 담으면 버린다.
 *   - 검증 전에는 label 을 저장하지 않는다 — 실제로 성공한 단계의 semantic locator 와 맞은 label 만 남는다(D5).
 *
 * 이 파일은 순수 모듈이다(DB · 명령 발행 없음). agent(tools/o4o-local-agent/src/work-assistance.mjs)가 같은 규칙으로 다시 검사한다.
 */

import { normalizeWorkflowText, type WorkflowLocator } from './workflow-candidate.js';

// ─── 어휘 (agent 와 동일) ──────────────────────────────────────────────────────

export const TASK_KEY_RE = /^[a-z][a-z0-9_]{1,23}(\.[a-z][a-z0-9_]{1,23}){1,3}$/;
export const STAGE_KEY_RE = /^[a-z][a-z0-9_]{1,31}$/;

/** §7-2 도움의 의미. */
export const ASK_KINDS = Object.freeze([
  'value_confirmation', 'target_confirmation', 'menu_location', 'procedure_order', 'manual_request',
  'login_required', 'correction', 'success_confirmation', 'takeover',
] as const);
export type AskKind = (typeof ASK_KINDS)[number];
/** §7-1 사용자가 준 정보 종류(+ correction). */
export const PROVIDED_KINDS = Object.freeze(['value', 'target', 'path', 'procedure', 'document', 'confirmation', 'takeover', 'correction'] as const);
export type ProvidedKind = (typeof PROVIDED_KINDS)[number];
export const RESOLUTIONS = Object.freeze(['resolved', 'partially', 'not_resolved'] as const);
export type Resolution = (typeof RESOLUTIONS)[number];
export const REUSABILITY = Object.freeze(['reusable_knowledge', 'per_run_value', 'personal_preference', 'not_reusable'] as const);
export type Reusability = (typeof REUSABILITY)[number];
/** §7-5 교정 유형. 단순 값 확인은 교정이 아니다(Assistance). */
export const CORRECTION_TYPES = Object.freeze(['task_intent', 'target', 'procedure_method', 'outcome'] as const);
export type CorrectionType = (typeof CORRECTION_TYPES)[number];
export const CORRECTION_REASONS = Object.freeze([
  'inaccurate_results', 'site_feature_exists', 'wrong_target', 'wrong_intent', 'inefficient', 'incomplete_result', 'other',
] as const);
export type CorrectionReason = (typeof CORRECTION_REASONS)[number];
export const VALIDATION_RESULTS = Object.freeze(['verified', 'not_verified', 'failed'] as const);
export type ValidationResult = (typeof VALIDATION_RESULTS)[number];

/** 방법 op 어휘. label 은 LABELED_OPS 에만. */
export const STRATEGY_OPS = Object.freeze([
  'search', 'open_detail', 'open_tab', 'open_menu', 'select_filter', 'read_result', 'extract_field', 're_search', 'return_to_list', 'compare',
] as const);
export type StrategyOpKind = (typeof STRATEGY_OPS)[number];
export const LABELED_OPS: readonly StrategyOpKind[] = Object.freeze(['open_tab', 'open_menu', 'select_filter']);
export interface StrategyOp { op: StrategyOpKind; label?: string }
export interface Strategy { ops: StrategyOp[] }

export const ASSISTANCE_LIMITS = Object.freeze({ maxOps: 8, labelMax: 40, maxSlots: 4, maxTaskKeys: 10, maxPatterns: 8 });

// ─── 정규화 · 검사 (잘못된 칸은 버린다 — 제안 전체를 거절하지 않는다) ─────────────

const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const inList = <T extends string>(v: unknown, list: readonly T[]): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);

export function sanitizeTaskKey(v: unknown): string | null {
  return typeof v === 'string' && TASK_KEY_RE.test(v) ? v : null;
}
export function sanitizeStageKey(v: unknown): string | null {
  return typeof v === 'string' && STAGE_KEY_RE.test(v) ? v : null;
}

/** label 형식: 짧은 화면 이름. 꺾쇠 · 중괄호 · 줄바꿈 없음. 입력값(forbidden)을 담으면 null. */
export function sanitizeLabel(v: unknown, forbidden: readonly string[] = []): string | null {
  if (typeof v !== 'string') return null;
  const s = normalizeWorkflowText(v);
  if (!s || s.length > ASSISTANCE_LIMITS.labelMax || /[<>{}\n\r]/.test(s)) return null;
  for (const f of forbidden) {
    const n = normalizeWorkflowText(f);
    if (n.length >= 2 && (s.includes(n) || n === s)) return null;
  }
  return s;
}

/**
 * 방법 정규화. op 가 어휘 밖이면 그 op 를 버린다. label 은 LABELED_OPS 에만 · 입력값을 담으면 label 만 버린다.
 * `keepLabels=false` 면 label 을 모두 버린다(검증 전 저장용).
 */
export function sanitizeStrategy(raw: unknown, forbidden: readonly string[] = [], keepLabels = true): Strategy | null {
  if (!plain(raw) || !Array.isArray(raw.ops)) return null;
  const ops: StrategyOp[] = [];
  for (const o of raw.ops.slice(0, ASSISTANCE_LIMITS.maxOps)) {
    if (!plain(o) || !inList(o.op, STRATEGY_OPS)) continue;
    const out: StrategyOp = { op: o.op };
    if (keepLabels && LABELED_OPS.includes(o.op)) {
      const label = sanitizeLabel(o.label, forbidden);
      if (label) out.label = label;
    }
    ops.push(out);
  }
  return ops.length ? { ops } : null;
}

/** 방법 서명 — 같은 방법을 같은 행으로 묶는다(label 포함). */
export function strategySignature(s: Strategy): string {
  return s.ops.map((o) => (o.label ? `${o.op}:${o.label}` : o.op)).join('>');
}

/** `avoid` 의 op 순서가 `proposed` 안에 (부분열로) 나타나는가. label 이 있으면 label 도 같아야 한다. */
export function strategyContains(proposed: Strategy, avoid: Strategy): boolean {
  if (!avoid.ops.length) return false;
  let j = 0;
  for (const o of proposed.ops) {
    const a = avoid.ops[j];
    if (o.op === a.op && (!a.label || a.label === o.label)) j += 1;
    if (j === avoid.ops.length) return true;
  }
  return false;
}

/** Planner 가 질문할 때 선언하는 구조: 무엇을 묻는가 + 채울 자리(slot 키). */
export interface ProposalAsk { kind: AskKind; slots: string[] }
export function sanitizeAsk(raw: unknown): ProposalAsk | null {
  if (!plain(raw) || !inList(raw.kind, ASK_KINDS)) return null;
  const slots = Array.isArray(raw.slots)
    ? [...new Set(raw.slots.map(sanitizeStageKey).filter((s): s is string => !!s))].slice(0, ASSISTANCE_LIMITS.maxSlots)
    : [];
  return { kind: raw.kind, slots };
}

/**
 * Planner 가 사용자 입력(재개 답변 · 요청 안의 방법 지시)을 분류한 구조. 원문을 담지 않는다.
 *   - 값 확인(provided=value)은 언제나 Assistance · per_run_value 로 고정한다(교정 아님 · 재사용 지식 아님).
 *   - 교정은 유형이 있어야 한다. 유형이 없으면 Assistance 로 낮춘다.
 *   - wrong / alternative 는 방법 구조. 입력값을 담은 label 은 버린다.
 */
export interface ProposalUserInput {
  kind: 'assistance' | 'correction';
  askKind: AskKind;
  providedKind: ProvidedKind;
  correctionType: CorrectionType | null;
  stage: string | null;
  reason: CorrectionReason | null;
  wrong: Strategy | null;
  alternative: Strategy | null;
  reusability: Reusability;
}
const DEFAULT_REUSABILITY: Record<AskKind, Reusability> = {
  value_confirmation: 'per_run_value', target_confirmation: 'personal_preference', menu_location: 'reusable_knowledge',
  procedure_order: 'reusable_knowledge', manual_request: 'reusable_knowledge', login_required: 'not_reusable',
  correction: 'reusable_knowledge', success_confirmation: 'reusable_knowledge', takeover: 'not_reusable',
};
export function sanitizeUserInput(raw: unknown, forbidden: readonly string[] = []): ProposalUserInput | null {
  if (!plain(raw)) return null;
  const providedKind: ProvidedKind | null = inList(raw.providedKind, PROVIDED_KINDS) ? raw.providedKind : null;
  if (!providedKind) return null;
  let askKind: AskKind = inList(raw.askKind, ASK_KINDS) ? raw.askKind : providedKind === 'correction' ? 'correction' : 'value_confirmation';
  const correctionType: CorrectionType | null = inList(raw.correctionType, CORRECTION_TYPES) ? raw.correctionType : null;
  let kind: 'assistance' | 'correction' = raw.kind === 'correction' && correctionType ? 'correction' : 'assistance';
  let reusability: Reusability = inList(raw.reusability, REUSABILITY) ? raw.reusability : DEFAULT_REUSABILITY[askKind];
  if (providedKind === 'value') {
    // 값 확인은 교정이 아니다 — 이번 run 값(§7-2). 다음 run 에서 다시 묻는 것이 정상.
    kind = 'assistance';
    askKind = askKind === 'correction' ? 'value_confirmation' : askKind;
    reusability = 'per_run_value';
  }
  const isCorrection = kind === 'correction';
  return {
    kind,
    askKind,
    providedKind,
    correctionType: isCorrection ? correctionType : null,
    stage: sanitizeStageKey(raw.stage),
    reason: isCorrection && inList(raw.reason, CORRECTION_REASONS) ? raw.reason : null,
    wrong: isCorrection ? sanitizeStrategy(raw.wrong, forbidden) : null,
    alternative: providedKind === 'value' ? null : sanitizeStrategy(raw.alternative, forbidden),
    reusability,
  };
}

// ─── 짧은 답변 판정 · 검증 ──────────────────────────────────────────────────────

/** 서술 어미로 끝나면 값이 아니라 지시 · 설명이다("~써", "~해줘"). */
const PREDICATE_ENDING = /(요|다|어|아|해|줘|써|라|지|까)[.!]?$/;
/**
 * 재개 답변이 "값 하나" 인가 — 결정적 재생에 slot 으로 넣을 수 있는가. 2 토큰 이하 · 서술 어미 없음.
 * 구체성(assessReplayValue)은 호출자가 따로 본다.
 */
export function isPlainValueAnswer(answer: string): boolean {
  const v = normalizeWorkflowText(answer);
  if (!v || v.length > 40) return false;
  if (v.split(' ').length > 2) return false;
  return !PREDICATE_ENDING.test(v);
}

/**
 * 대안 방법 검증(D5) — 실제로 성공했는가.
 *   - run 결과가 FAILED · BLOCKED 면 failed, 결과가 없거나(대기) 성공 근거가 없으면 not_verified.
 *   - 결과가 성공이면 label 있는 op 가 모두 이번 segment 의 **성공한** 클릭/선택 단계 locator 와 맞아야 verified.
 *     label 이 하나도 없으면 무엇으로 성공했는지 근거가 없다 → not_verified.
 * 돌려주는 strategy 는 검증된 label 만 남긴다.
 */
export function verifyAlternative(
  alternative: Strategy | null,
  outcomeStatus: string | null,
  successfulLocators: readonly WorkflowLocator[],
): { result: ValidationResult; strategy: Strategy | null } {
  if (!alternative) return { result: 'not_verified', strategy: null };
  const stripped: Strategy = { ops: alternative.ops.map((o) => ({ op: o.op })) };
  if (outcomeStatus === 'FAILED' || outcomeStatus === 'BLOCKED') return { result: 'failed', strategy: stripped };
  if (outcomeStatus !== 'SUCCESS' && outcomeStatus !== 'PARTIAL_SUCCESS') return { result: 'not_verified', strategy: stripped };
  const labeled = alternative.ops.filter((o) => o.label);
  if (!labeled.length) return { result: 'not_verified', strategy: stripped };
  const names = successfulLocators.flatMap((l) => [l.name, l.text]).filter((n): n is string => !!n).map(normalizeWorkflowText);
  const hit = (label: string) => names.some((n) => n === label || n.includes(label) || (n.length >= 2 && label.includes(n)));
  if (!labeled.every((o) => hit(o.label as string))) return { result: 'not_verified', strategy: stripped };
  return { result: 'verified', strategy: alternative };
}

/** wrong 방법은 label 없이(op 순서만) 저장한다 — 검증할 근거가 없는 label 은 남기지 않는다. */
export function stripLabels(s: Strategy | null): Strategy | null {
  return s ? { ops: s.ops.map((o) => ({ op: o.op })) } : null;
}

// ─── Local 기록 형상 (서버 ↔ agent 경계) ───────────────────────────────────────

export interface WorkAssistanceEvent {
  kind: 'assistance' | 'correction';
  stageKey: string | null;
  askKind: AskKind;
  providedKind: ProvidedKind;
  /** 정보 종류별 정규형: 값 확인 → slot 키 목록 / 경로 · 절차 · 교정 → 방법 구조. 값 자체는 없다. */
  structured: { slots: string[] } | { strategy: Strategy } | null;
  resolution: Resolution;
  progressedSteps: number;
  reusability: Reusability;
  correction: {
    type: CorrectionType;
    reason: CorrectionReason | null;
    wrong: Strategy | null;
    alternative: Strategy | null;
  } | null;
  validation: { result: ValidationResult; evidence: 'system_verified' | 'user_confirmed' | 'agent_inferred' | null };
}
export interface DataWorkRunAssistanceRecordArgs {
  runId: string;
  targetId: string;
  taskKey: string | null;
  event: WorkAssistanceEvent;
}
export interface DataWorkRunContextSaveArgs {
  runId: string;
  targetId: string;
  taskKey: string | null;
  stageKey: string | null;
  ask: ProposalAsk | null;
  strategy: Strategy | null;
  replay: { candidateId: string; stepIndex: number } | null;
}

const strictStrategy = (v: unknown): Strategy | null | undefined => {
  if (v === null) return null;
  const s = sanitizeStrategy(v);
  // 정규화 결과가 원본과 다르면(버린 op · label) 형상 위반으로 본다 — 경계에서는 고치지 않고 거절한다.
  if (!s || JSON.stringify(s) !== JSON.stringify(v)) return undefined;
  return s;
};
const exactKeys = (v: Record<string, unknown>, keys: readonly string[]) => {
  const own = Object.keys(v);
  return own.length === keys.length && own.every((k) => keys.includes(k));
};

/** 기록 형상 엄격 검사. runId 형식 · 대상 등재는 protocol 쪽이 본다. */
export function validateAssistanceRecordShape(args: unknown): { ok: boolean; args?: DataWorkRunAssistanceRecordArgs } {
  if (!plain(args) || !exactKeys(args, ['runId', 'targetId', 'taskKey', 'event'])) return { ok: false };
  if (typeof args.runId !== 'string' || typeof args.targetId !== 'string') return { ok: false };
  if (args.taskKey !== null && !sanitizeTaskKey(args.taskKey)) return { ok: false };
  const e = args.event;
  const EVENT_KEYS = ['kind', 'stageKey', 'askKind', 'providedKind', 'structured', 'resolution', 'progressedSteps', 'reusability', 'correction', 'validation'];
  if (!plain(e) || !exactKeys(e, EVENT_KEYS)) return { ok: false };
  if (e.kind !== 'assistance' && e.kind !== 'correction') return { ok: false };
  if (e.stageKey !== null && !sanitizeStageKey(e.stageKey)) return { ok: false };
  if (!inList(e.askKind, ASK_KINDS) || !inList(e.providedKind, PROVIDED_KINDS) || !inList(e.resolution, RESOLUTIONS) || !inList(e.reusability, REUSABILITY)) return { ok: false };
  if (!Number.isInteger(e.progressedSteps) || (e.progressedSteps as number) < 0 || (e.progressedSteps as number) > 1000) return { ok: false };
  if (e.providedKind === 'value' && (e.kind !== 'assistance' || e.reusability !== 'per_run_value')) return { ok: false };
  let structured: WorkAssistanceEvent['structured'] = null;
  if (e.structured !== null) {
    const st = e.structured;
    if (!plain(st)) return { ok: false };
    if (exactKeys(st, ['slots'])) {
      if (!Array.isArray(st.slots) || st.slots.length > ASSISTANCE_LIMITS.maxSlots || !st.slots.every((s) => sanitizeStageKey(s))) return { ok: false };
      structured = { slots: st.slots as string[] };
    } else if (exactKeys(st, ['strategy'])) {
      const s = strictStrategy(st.strategy);
      if (!s) return { ok: false };
      structured = { strategy: s };
    } else return { ok: false };
  }
  let correction: WorkAssistanceEvent['correction'] = null;
  if (e.kind === 'correction') {
    const c = e.correction;
    if (!plain(c) || !exactKeys(c, ['type', 'reason', 'wrong', 'alternative'])) return { ok: false };
    if (!inList(c.type, CORRECTION_TYPES)) return { ok: false };
    if (c.reason !== null && !inList(c.reason, CORRECTION_REASONS)) return { ok: false };
    const wrong = strictStrategy(c.wrong);
    const alternative = strictStrategy(c.alternative);
    if (wrong === undefined || alternative === undefined) return { ok: false };
    correction = { type: c.type, reason: c.reason as CorrectionReason | null, wrong, alternative };
  } else if (e.correction !== null) return { ok: false };
  const v = e.validation;
  if (!plain(v) || !exactKeys(v, ['result', 'evidence']) || !inList(v.result, VALIDATION_RESULTS)) return { ok: false };
  if (v.evidence !== null && v.evidence !== 'system_verified' && v.evidence !== 'user_confirmed' && v.evidence !== 'agent_inferred') return { ok: false };
  // 검증 전 방법에는 label 이 없어야 한다 — 검증되지 않은 화면 이름은 저장하지 않는다(D5). wrong 은 언제나 op 순서만.
  const hasLabel = (s: Strategy | null | undefined) => !!s && s.ops.some((o) => o.label !== undefined);
  if (v.result !== 'verified' && (hasLabel(structured && 'strategy' in structured ? structured.strategy : null) || hasLabel(correction?.alternative))) return { ok: false };
  if (hasLabel(correction?.wrong)) return { ok: false };
  return {
    ok: true,
    args: {
      runId: args.runId,
      targetId: args.targetId,
      taskKey: args.taskKey as string | null,
      event: {
        kind: e.kind, stageKey: e.stageKey as string | null, askKind: e.askKind, providedKind: e.providedKind, structured,
        resolution: e.resolution, progressedSteps: e.progressedSteps as number, reusability: e.reusability, correction,
        validation: { result: v.result, evidence: v.evidence as WorkAssistanceEvent['validation']['evidence'] },
      },
    },
  };
}

export function validateContextSaveShape(args: unknown): { ok: boolean; args?: DataWorkRunContextSaveArgs } {
  if (!plain(args) || !exactKeys(args, ['runId', 'targetId', 'taskKey', 'stageKey', 'ask', 'strategy', 'replay'])) return { ok: false };
  if (typeof args.runId !== 'string' || typeof args.targetId !== 'string') return { ok: false };
  if (args.taskKey !== null && !sanitizeTaskKey(args.taskKey)) return { ok: false };
  if (args.stageKey !== null && !sanitizeStageKey(args.stageKey)) return { ok: false };
  let ask: ProposalAsk | null = null;
  if (args.ask !== null) {
    const a = sanitizeAsk(args.ask);
    if (!a || !plain(args.ask) || !exactKeys(args.ask, ['kind', 'slots']) || JSON.stringify(a) !== JSON.stringify(args.ask)) return { ok: false };
    ask = a;
  }
  const strategy = strictStrategy(args.strategy);
  if (strategy === undefined) return { ok: false };
  let replay: DataWorkRunContextSaveArgs['replay'] = null;
  if (args.replay !== null) {
    const r = args.replay;
    if (!plain(r) || !exactKeys(r, ['candidateId', 'stepIndex'])) return { ok: false };
    if (typeof r.candidateId !== 'string' || !/^wc_[a-z0-9]{6,32}$/.test(r.candidateId)) return { ok: false };
    if (!Number.isInteger(r.stepIndex) || (r.stepIndex as number) < 0 || (r.stepIndex as number) > 63) return { ok: false };
    replay = { candidateId: r.candidateId, stepIndex: r.stepIndex as number };
  }
  return {
    ok: true,
    args: {
      runId: args.runId, targetId: args.targetId, taskKey: args.taskKey as string | null, stageKey: args.stageKey as string | null,
      ask, strategy, replay,
    },
  };
}

/** recall 결과의 패턴 한 줄(verified 만). */
export interface RecalledPattern { stageKey: string; polarity: 'preferred' | 'avoid'; strategy: Strategy; verifiedCount: number }

export function sanitizeRecalledPatterns(raw: unknown): RecalledPattern[] {
  if (!Array.isArray(raw)) return [];
  const out: RecalledPattern[] = [];
  for (const p of raw.slice(0, ASSISTANCE_LIMITS.maxPatterns)) {
    if (!plain(p)) continue;
    const stageKey = sanitizeStageKey(p.stageKey);
    const strategy = sanitizeStrategy(p.strategy);
    if (!stageKey || !strategy || (p.polarity !== 'preferred' && p.polarity !== 'avoid')) continue;
    const verifiedCount = Number.isInteger(p.verifiedCount) && (p.verifiedCount as number) >= 0 ? Math.min(p.verifiedCount as number, 10_000) : 0;
    out.push({ stageKey, polarity: p.polarity, strategy, verifiedCount });
  }
  return out;
}

/** Planner 에게 보여 줄 방법 한 줄(사람이 읽는 형태). */
export function describeStrategy(s: Strategy): string {
  return s.ops.map((o) => (o.label ? `${o.op}("${o.label}")` : o.op)).join(' → ');
}

// ─── recall 경계 (인자 · 응답 화이트리스트) ─────────────────────────────────────

export interface DataWorkRunContextRecallArgs { runId: string; targetId: string; slotValue: string | null }
export interface DataExperienceRecallArgs { targetId: string; taskKey: string | null }
const SLOT_VALUE_MAX = 200;

/** context_recall — slotValue 는 막힌 재생 단계를 채우는 데만 쓰고 Local 이 저장하지 않는다. */
export function validateContextRecallShape(args: unknown): { ok: boolean; args?: DataWorkRunContextRecallArgs } {
  if (!plain(args) || !exactKeys(args, ['runId', 'targetId', 'slotValue'])) return { ok: false };
  if (typeof args.runId !== 'string' || typeof args.targetId !== 'string') return { ok: false };
  if (args.slotValue !== null) {
    if (typeof args.slotValue !== 'string' || !args.slotValue || args.slotValue.length > SLOT_VALUE_MAX) return { ok: false };
    if (normalizeWorkflowText(args.slotValue) !== args.slotValue || /[<>{}]/.test(args.slotValue)) return { ok: false };
  }
  return { ok: true, args: { runId: args.runId, targetId: args.targetId, slotValue: args.slotValue as string | null } };
}

export function validateExperienceRecallShape(args: unknown): { ok: boolean; args?: DataExperienceRecallArgs } {
  if (!plain(args) || !exactKeys(args, ['targetId', 'taskKey'])) return { ok: false };
  if (typeof args.targetId !== 'string') return { ok: false };
  if (args.taskKey !== null && !sanitizeTaskKey(args.taskKey)) return { ok: false };
  return { ok: true, args: { targetId: args.targetId, taskKey: args.taskKey as string | null } };
}

/** recall 된 원래 업무 구조. 재생 단계는 호출자가 validateReplaySteps 로 따로 본다. */
export interface RecalledContext {
  found: boolean;
  taskKey: string | null;
  stageKey: string | null;
  ask: ProposalAsk | null;
  strategy: Strategy | null;
  candidateId: string | null;
  steps: unknown;
}
export function pickRecalledContext(data: unknown): RecalledContext {
  const none: RecalledContext = { found: false, taskKey: null, stageKey: null, ask: null, strategy: null, candidateId: null, steps: undefined };
  if (!plain(data) || data.found !== true) return none;
  return {
    found: true,
    taskKey: sanitizeTaskKey(data.taskKey),
    stageKey: sanitizeStageKey(data.stageKey),
    ask: sanitizeAsk(data.ask),
    strategy: sanitizeStrategy(data.strategy),
    candidateId: typeof data.candidateId === 'string' && /^wc_[a-z0-9]{6,32}$/.test(data.candidateId) ? data.candidateId : null,
    steps: data.steps,
  };
}

/** experience_recall 응답: taskKey 목록 또는 verified 패턴만. 출처 run · 시각 · id 는 통과하지 않는다. */
export function pickSafeExperienceRecall(data: unknown): { taskKeys?: string[]; patterns?: RecalledPattern[] } {
  if (!plain(data)) return {};
  const out: { taskKeys?: string[]; patterns?: RecalledPattern[] } = {};
  if (Array.isArray(data.taskKeys)) {
    out.taskKeys = [...new Set(data.taskKeys.map(sanitizeTaskKey).filter((k): k is string => !!k))].slice(0, ASSISTANCE_LIMITS.maxTaskKeys);
  }
  if (Array.isArray(data.patterns)) out.patterns = sanitizeRecalledPatterns(data.patterns);
  return out;
}
