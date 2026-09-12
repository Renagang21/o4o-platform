/**
 * Goal-Driven Multimodal Work Agent V0 — Goal · Observation · Plan · Action · Result · Takeover 계약 (순수)
 *
 * WO-O4O-GOAL-DRIVEN-MULTIMODAL-WORK-AGENT-V0 §3·§5·§7~§11·§13·§16~§19·§22·§23·§34~§36·§40·§45~§47
 * 상위 원칙: docs/baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 정하는 것
 *
 *   Work Loop 의 **형상과 검증 규칙**이다. 실행(DOM 명령 발행 · AI 호출)은 work-agent-runtime.ts 가 한다.
 *
 *   Goal          사용자의 자연어 목적. 메뉴명 · URL · 클릭 순서를 요구하지 않는다(§5).
 *   Observation   등재 site 탭의 구조화 요약(get_context + inspect). 전체 HTML 은 없다(§7). source=webpage · UNTRUSTED.
 *   Proposal      AI Planner 가 제안한 **다음 행동 하나**. 기존 DOM tool 어휘 안에서만 표현된다(§10).
 *   Validation    Runtime 이 proposal 을 검증한다 — 행동 종류 allowlist · elementRef 는 직전 관찰에 있던 것 ·
 *                 입력 텍스트는 DOM 입력 거절 규칙 · find 조건은 DOM 5키 · takeover 사유는 등재분(§9·§10).
 *   Progress      행동 성공 ≠ 목적 달성(§17). progress · no_progress · needs_user · completed · failed(§18).
 *   Takeover      실패가 아니다(§21). 사유를 등재분으로 남긴다(§19).
 *   Loop safety   maxSteps · maxAiPlans · maxDuration · 반복 행동 · 무진전(§34~§36).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ AI 는 실행 권한이 없다 (§9·§10·§47)
 *
 *   URL · CSS selector · XPath · JavaScript · shell · credential 을 실을 칸이 이 계약에 없다. Planner 가 그런 키를
 *   돌려주면 `validateWorkProposal` 이 거절한다. elementRef 는 확장이 발급한 것이며 직전 관찰에 없으면 거절된다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ 실행 상태는 runtime/session 수준이다 (§37~§41)
 *
 *   WorkAgentState 는 요청 안에서만 산다. `automation_jobs`(VIDEO P0 트랙, 장기 작업의 얇은 persistence record)에
 *   Goal · step · observation 을 넣지 않는다. scheduler · executor · workflow engine · agent loop · retry · step
 *   orchestration · planner state machine · tool execution queue · background worker 를 여기서도, 거기서도 만들지 않는다.
 *   `automation_jobs is a lightweight persistent work record. It is not a scheduler, executor, workflow engine,
 *    agent runtime, or tool execution queue.`
 */

import type { DomFindQuery, SafeDomElement } from '../local-agent/browser-dom-contract.js';
import { DOM_QUERY_VALUE_MAX, domInputDenyReason, isDomElementRef, validateDomFindQuery } from '../local-agent/browser-dom-contract.js';
import type { AutomationRiskLevel, ContentProvenance } from './automation-execution-contract.js';

// ─── Goal (§5) ──────────────────────────────────────────────────────────────

export type WorkGoalStatus = 'active' | 'waiting_for_user' | 'completed' | 'stopped';

export interface WorkGoal {
  goalId: string;
  /** 사용자의 자연어 목적. 프롬프트 · 결과에는 쓰지만 로그에는 싣지 않는다(§23). */
  request: string;
  /** 등재 site 힌트(siteId). 문장의 별칭으로도 정해진다. */
  targetHint?: string;
  status: WorkGoalStatus;
}

export const WORK_GOAL_MAX_LENGTH = 2000;

export function isValidWorkGoalRequest(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= WORK_GOAL_MAX_LENGTH;
}

// ─── 입력 · 출처 (§11·§45·§46) ──────────────────────────────────────────────

/** 명령 권한이 있는 출처는 user · system 뿐. 나머지는 데이터다(§45). */
export type WorkInputProvenance = ContentProvenance | 'user_image' | 'user_file';

export const UNTRUSTED_PROVENANCE: readonly WorkInputProvenance[] = Object.freeze(['webpage', 'local_app_ui', 'user_image', 'user_file']);

export function isUntrustedProvenance(p: WorkInputProvenance): boolean {
  return UNTRUSTED_PROVENANCE.includes(p);
}

/** 사용자가 Goal 과 함께 준 이미지(§11·§12). 메모리에서만 다루고 저장하지 않는다(§23). */
export interface WorkImageInput {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** 순수 base64. */
  base64: string;
  provenance: 'user_image';
}

export const WORK_IMAGE_MIME_TYPES: readonly string[] = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);
export const WORK_IMAGE_MAX_BASE64_LENGTH = 10 * 1024 * 1024;

export function validateWorkImageInput(v: unknown): { ok: boolean; image?: WorkImageInput } {
  if (v === undefined || v === null) return { ok: true };
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { ok: false };
  const r = v as Record<string, unknown>;
  if (typeof r.mimeType !== 'string' || !WORK_IMAGE_MIME_TYPES.includes(r.mimeType)) return { ok: false };
  if (typeof r.base64 !== 'string' || r.base64.length === 0 || r.base64.length > WORK_IMAGE_MAX_BASE64_LENGTH) return { ok: false };
  const payload = r.base64.replace(/^data:[^;]+;base64,/, '');
  if (!/^[A-Za-z0-9+/=\s]+$/.test(payload)) return { ok: false };
  return { ok: true, image: { mimeType: r.mimeType as WorkImageInput['mimeType'], base64: payload, provenance: 'user_image' } };
}

// ─── Observation (§7) ───────────────────────────────────────────────────────

export interface WorkObservation {
  siteId: string;
  /** pathname 만(query 없음). */
  path: string;
  ready: boolean;
  /** inspect 요약 — 전체 HTML 이 아니다. 80개 상한은 DOM 계약. */
  elements: SafeDomElement[];
  elementCount: number;
  source: 'webpage';
  /** 무진전 판정용 지문(§35). 경로 + 요소 role/name/text 의 요약. */
  fingerprint: string;
  /** content script 의 문서 인스턴스 id. 이동 뒤 "새 문서를 봤는가" 판정용(무작위 값, 내용 무관). */
  docId?: string;
}

export function fingerprintObservation(path: string, elements: readonly SafeDomElement[]): string {
  const parts = elements.slice(0, 80).map((e) => `${e.role}:${e.name ?? e.text ?? ''}${e.disabled ? '!' : ''}`);
  return `${path}|${parts.join(',')}`;
}

/** Planner 에게 보여줄 한 줄 요약. ref · role · 이름/텍스트 · 상태만. */
export function describeObservationElement(e: SafeDomElement): string {
  const bits = [e.elementRef, e.role];
  if (e.name) bits.push(`name="${e.name}"`);
  else if (e.text) bits.push(`text="${e.text}"`);
  if (e.hasValue) bits.push('has-value');
  if (e.disabled) bits.push('disabled');
  if (e.riskLevel === 'COMMIT') bits.push('COMMIT(자동 클릭 금지)');
  return bits.join(' ');
}

// ─── Proposal (§8·§10) ──────────────────────────────────────────────────────

/** Planner 가 제안할 수 있는 행동 종류 — 전부 기존 DOM tool 또는 loop 제어다. 새 실행 수단은 없다. */
export const WORK_ACTION_KINDS = Object.freeze([
  'inspect', 'find', 'read_text', 'read_table', 'set_input', 'select_option', 'click', 'takeover', 'done',
] as const);
export type WorkActionKind = (typeof WORK_ACTION_KINDS)[number];

export type WorkProgress = 'progress' | 'no_progress' | 'needs_user' | 'completed' | 'failed';
export const WORK_PROGRESS_VALUES: readonly string[] = Object.freeze(['progress', 'no_progress', 'needs_user', 'completed', 'failed']);

/** Takeover 사유(§19). 등재분 밖은 거절된다. */
export const TAKEOVER_REASONS = Object.freeze([
  'goal_sufficiently_advanced',
  'user_judgment_required',
  'ambiguous_result',
  'unsupported_control',
  'review_required',
  'commit_required',
  'credential_required',
  'site_not_ready',
  'no_progress',
  'loop_limit',
  'planner_unavailable',
] as const);
export type TakeoverReason = (typeof TAKEOVER_REASONS)[number];

export interface WorkAction {
  kind: WorkActionKind;
  elementRef?: string;
  query?: DomFindQuery;
  text?: string;
  option?: string;
  reason?: TakeoverReason;
}

export interface WorkProposal {
  /** 직전 결과 · 현재 상태에 대한 판단(§17·§18). */
  assessment: WorkProgress;
  action: WorkAction;
  /** 짧은 근거(프롬프트 표시용 · 로그 미기록). */
  rationale?: string;
  /** 지금 필요한 사용자 입력이 무엇인지(§11 need-based). */
  neededInput?: string;
}

export type ProposalRejectReason =
  | 'SHAPE'
  | 'UNKNOWN_ACTION'
  | 'FORBIDDEN_KEY'
  | 'ELEMENT_NOT_IN_OBSERVATION'
  | 'ELEMENT_ROLE_MISMATCH'
  | 'TEXT_DENIED'
  | 'QUERY_INVALID'
  | 'TAKEOVER_REASON_INVALID'
  | 'COMMIT_TARGET';

/** URL · selector · JS · shell · credential 을 실어 오는 키 — 있으면 proposal 전체를 거절한다(§10·§47). */
export const FORBIDDEN_PROPOSAL_KEYS: readonly string[] = Object.freeze([
  'url', 'href', 'navigate', 'selector', 'css', 'xpath', 'js', 'javascript', 'script', 'eval', 'shell', 'command', 'cmd',
  'password', 'otp', 'token', 'cookie', 'credential', 'capability', 'permission', 'riskLevel', 'computer', 'coordinates',
]);

const INPUT_ROLES: readonly string[] = Object.freeze(['textbox', 'searchbox', 'textarea']);
const CLICK_ROLES: readonly string[] = Object.freeze(['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem']);
const SELECT_ROLES: readonly string[] = Object.freeze(['combobox']);

function hasForbiddenKey(obj: unknown, depth = 0): boolean {
  if (!obj || typeof obj !== 'object' || depth > 3) return false;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (FORBIDDEN_PROPOSAL_KEYS.includes(k)) return true;
    if (v && typeof v === 'object' && hasForbiddenKey(v, depth + 1)) return true;
  }
  return false;
}

function shortText(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= DOM_QUERY_VALUE_MAX && !/[<>{}]/.test(v);
}

/**
 * Planner 응답 → 검증된 proposal(§9·§10). Runtime 이 실행 직전에 부른다.
 *   - 형상 · 행동 종류 · 금지 키.
 *   - elementRef 는 **직전 관찰에 있던 것**이어야 하고 행동에 맞는 role 이어야 한다.
 *   - click 대상이 관찰에서 COMMIT 으로 표시됐으면 제안 단계에서 거절한다(확장도 다시 막는다).
 *   - set_input 텍스트는 DOM 입력 거절 규칙(비밀번호 · 명령어 성격 · 500자 초과)을 통과해야 한다.
 */
export function validateWorkProposal(raw: unknown, observation: WorkObservation | null): { ok: boolean; proposal?: WorkProposal; reason?: ProposalRejectReason } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'SHAPE' };
  if (hasForbiddenKey(raw)) return { ok: false, reason: 'FORBIDDEN_KEY' };
  const r = raw as Record<string, unknown>;
  const assessment = typeof r.assessment === 'string' && WORK_PROGRESS_VALUES.includes(r.assessment) ? (r.assessment as WorkProgress) : 'progress';
  const a = r.action;
  if (!a || typeof a !== 'object' || Array.isArray(a)) return { ok: false, reason: 'SHAPE' };
  const act = a as Record<string, unknown>;
  const kind = act.kind;
  if (typeof kind !== 'string' || !(WORK_ACTION_KINDS as readonly string[]).includes(kind)) return { ok: false, reason: 'UNKNOWN_ACTION' };
  const out: WorkProposal = { assessment, action: { kind: kind as WorkActionKind } };
  if (typeof r.rationale === 'string') out.rationale = r.rationale.slice(0, 200);
  if (typeof r.neededInput === 'string') out.neededInput = r.neededInput.slice(0, 200);

  const byRef = new Map<string, SafeDomElement>();
  for (const e of observation?.elements ?? []) byRef.set(e.elementRef, e);
  const requireRef = (roles: readonly string[] | null): { ok: boolean; reason?: ProposalRejectReason } => {
    if (!isDomElementRef(act.elementRef)) return { ok: false, reason: 'SHAPE' };
    const el = byRef.get(act.elementRef);
    if (!el) return { ok: false, reason: 'ELEMENT_NOT_IN_OBSERVATION' };
    if (roles && !roles.includes(el.role)) return { ok: false, reason: 'ELEMENT_ROLE_MISMATCH' };
    if (el.disabled) return { ok: false, reason: 'ELEMENT_ROLE_MISMATCH' };
    out.action.elementRef = act.elementRef;
    return { ok: true };
  };

  switch (kind) {
    case 'inspect':
    case 'done':
      return { ok: true, proposal: out };
    case 'takeover': {
      if (typeof act.reason !== 'string' || !(TAKEOVER_REASONS as readonly string[]).includes(act.reason)) return { ok: false, reason: 'TAKEOVER_REASON_INVALID' };
      out.action.reason = act.reason as TakeoverReason;
      return { ok: true, proposal: out };
    }
    case 'find': {
      const q = validateDomFindQuery(act.query);
      if (!q.ok || !q.query) return { ok: false, reason: 'QUERY_INVALID' };
      out.action.query = q.query;
      return { ok: true, proposal: out };
    }
    case 'read_table': {
      if (act.elementRef === undefined) return { ok: true, proposal: out };
      const r2 = requireRef(['table']);
      return r2.ok ? { ok: true, proposal: out } : { ok: false, reason: r2.reason };
    }
    case 'read_text': {
      const r2 = requireRef(null);
      return r2.ok ? { ok: true, proposal: out } : { ok: false, reason: r2.reason };
    }
    case 'set_input': {
      const r2 = requireRef(INPUT_ROLES);
      if (!r2.ok) return { ok: false, reason: r2.reason };
      if (typeof act.text !== 'string' || act.text.trim().length === 0 || domInputDenyReason(act.text) !== null || /[<>{}]/.test(act.text)) {
        return { ok: false, reason: 'TEXT_DENIED' };
      }
      out.action.text = act.text.trim().slice(0, DOM_QUERY_VALUE_MAX);
      return { ok: true, proposal: out };
    }
    case 'select_option': {
      const r2 = requireRef(SELECT_ROLES);
      if (!r2.ok) return { ok: false, reason: r2.reason };
      if (!shortText(act.option)) return { ok: false, reason: 'TEXT_DENIED' };
      out.action.option = act.option;
      return { ok: true, proposal: out };
    }
    case 'click': {
      const r2 = requireRef(CLICK_ROLES);
      if (!r2.ok) return { ok: false, reason: r2.reason };
      const el = byRef.get(String(act.elementRef));
      if (el?.riskLevel === 'COMMIT') return { ok: false, reason: 'COMMIT_TARGET' };
      return { ok: true, proposal: out };
    }
    default:
      return { ok: false, reason: 'UNKNOWN_ACTION' };
  }
}

/** 같은 행동인지(반복 감지 §36). */
export function sameWorkAction(a: WorkAction | undefined, b: WorkAction | undefined): boolean {
  if (!a || !b) return false;
  return a.kind === b.kind && a.elementRef === b.elementRef && a.text === b.text && a.option === b.option && JSON.stringify(a.query ?? null) === JSON.stringify(b.query ?? null);
}

// ─── Loop safety (§34~§36) ──────────────────────────────────────────────────

export const WORK_LOOP_LIMITS = Object.freeze({
  /** DOM 명령 상한(관찰 포함). */
  maxSteps: 14,
  /** AI Planner 호출 상한. */
  maxAiPlans: 8,
  maxDurationMs: 90_000,
  /** 같은 행동이 이 횟수 반복되면 no_progress. */
  maxRepeatedAction: 2,
  /** 같은 관찰 지문이 이 횟수 연속되면 no_progress. */
  maxSameObservation: 3,
  /** Planner 가 검증에 연속으로 이만큼 실패하면 takeover(planner_unavailable). */
  maxInvalidProposals: 2,
});

// ─── State (§3·§40) — 요청 안에서만 산다 ─────────────────────────────────────

export interface WorkStepRecord {
  step: number;
  action: WorkAction;
  status: 'success' | 'failed' | 'denied' | 'rejected';
  errorCode?: string;
  /** 행동 뒤 관찰에서 문서가 바뀌었는가. */
  navigated?: boolean;
  changed?: boolean;
  rejectReason?: ProposalRejectReason;
}

export interface WorkAgentState {
  goal: WorkGoal;
  siteId: string;
  observation: WorkObservation | null;
  plannedAction: WorkAction | null;
  lastResult: WorkStepRecord | null;
  stepCount: number;
  aiPlanCount: number;
  invalidProposals: number;
  history: WorkStepRecord[];
  progress: WorkProgress;
  takeover: { reason: TakeoverReason; step: number } | null;
  startedAt: number;
}

export function createWorkAgentState(goal: WorkGoal, siteId: string, now = Date.now()): WorkAgentState {
  return {
    goal, siteId, observation: null, plannedAction: null, lastResult: null, stepCount: 0, aiPlanCount: 0, invalidProposals: 0,
    history: [], progress: 'progress', takeover: null, startedAt: now,
  };
}

// ─── Usage signal (§22·§23) ─────────────────────────────────────────────────

/** 로그에 남는 키 — 이것뿐이다. goal 원문 · 관찰 텍스트 · 입력값 · 이미지 · 페이지 텍스트는 칸이 없다. */
export const WORK_AGENT_USAGE_KEYS: readonly string[] = Object.freeze([
  'siteId', 'inputMode', 'actionCount', 'aiPlanCount', 'takeoverReason', 'takeoverStep', 'userCorrectionCount', 'completionState', 'durationMs', 'timestamp',
]);

export interface WorkAgentUsageEvent {
  siteId: string;
  inputMode: 'text' | 'text+image';
  actionCount: number;
  aiPlanCount: number;
  takeoverReason: TakeoverReason | null;
  takeoverStep: number | null;
  /** V0 는 클라이언트가 보고하지 않으므로 0. 계약만 둔다(§22). */
  userCorrectionCount: number;
  completionState: WorkProgress;
  durationMs: number;
  timestamp: string;
}

export function buildWorkAgentUsageEvent(state: WorkAgentState, inputMode: 'text' | 'text+image', now = new Date()): WorkAgentUsageEvent {
  return {
    siteId: state.siteId,
    inputMode,
    actionCount: state.history.filter((h) => !['inspect', 'find', 'read_text', 'read_table'].includes(h.action.kind)).length,
    aiPlanCount: state.aiPlanCount,
    takeoverReason: state.takeover?.reason ?? null,
    takeoverStep: state.takeover?.step ?? null,
    userCorrectionCount: 0,
    completionState: state.progress,
    durationMs: Math.max(0, now.getTime() - state.startedAt),
    timestamp: now.toISOString(),
  };
}

// ─── Risk (§16) ─────────────────────────────────────────────────────────────

/** 행동 종류 → 위험 등급. read 계열 READ, 입력/클릭 REVERSIBLE(요소별 COMMIT 판정은 확장이 한다). */
export function workActionRisk(kind: WorkActionKind): AutomationRiskLevel {
  return kind === 'set_input' || kind === 'select_option' || kind === 'click' ? 'REVERSIBLE' : 'READ';
}

// ─── 오류 코드 ──────────────────────────────────────────────────────────────

export const WORK_AGENT_ERROR = Object.freeze({
  GOAL_INVALID: 'WORK_AGENT_GOAL_INVALID',
  SITE_UNRESOLVED: 'WORK_AGENT_SITE_UNRESOLVED',
  SITE_NOT_READY: 'WORK_AGENT_SITE_NOT_READY',
  IMAGE_INVALID: 'WORK_AGENT_IMAGE_INVALID',
  PLANNER_FAILED: 'WORK_AGENT_PLANNER_FAILED',
  NO_PROGRESS: 'WORK_AGENT_NO_PROGRESS',
  LOOP_LIMIT: 'WORK_AGENT_LOOP_LIMIT',
} as const);
