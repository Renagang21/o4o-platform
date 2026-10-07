/**
 * Local Experience 최소 저장 계약 — WO-O4O-AUTOMATION-LOCAL-EXPERIENCE-MINIMUM-STORAGE-V1 (Phase 1).
 * 정본: docs/baseline/O4O-AUTOMATION-EXPERIENCE-MODEL-V1.md (D1~D8 확정 2026-10-01).
 *
 * 자동화 run 의 각 segment(요청 1회) 끝에서 Cloud runtime 이 구조화된 Experience 를 만들어
 * `local.data.work_run_experience_record` 로 Local SQLite 에 **쓰기만** 한다(read-back · 동기화 없음 §5-1).
 *
 * 형상은 enum · 정수 · semantic locator 뿐이다 — 자유 텍스트 칸이 없다. 입력값(slot) · 사용자 답변 · 요청 원문 사본 ·
 * 화면 글 · DOM · 스크린샷 · prompt · 모델 근거 · 결과 데이터가 실릴 자리가 형상에 없다(§9).
 * agent(tools/o4o-local-agent/src/handlers.mjs `validateExperienceRecordArgs`)가 같은 규칙으로 다시 검사한다.
 *
 * 이 파일은 순수 모듈이다(DB · 명령 발행 없음). runId 형식 · 대상 등재 검사는 protocol 쪽 래퍼가 한다(순환 import 회피).
 */

import {
  AUTOMATION_FAILURE_CLASSES,
  RECOVERY_RESULTS,
  RECOVERY_TIERS,
  classifyFailure,
  type AutomationFailureClass,
  type RecoveryResult,
  type RecoveryTier,
} from './automation-recovery-contract.js';
import { buildWorkflowLocator, validateWorkflowLocator, type WorkflowLocator } from './workflow-candidate.js';
import type { TakeoverReason, WorkAction, WorkStepRecord } from './work-agent-contract.js';
import type { SafeDomElement } from '../local-agent/browser-dom-contract.js';

// ─── 어휘 (agent 와 동일) ──────────────────────────────────────────────────────

export const EXPERIENCE_END_STATES = Object.freeze(['completed', 'waiting_for_user', 'taken_over', 'stopped', 'resume_failed'] as const);
export type ExperienceEndState = (typeof EXPERIENCE_END_STATES)[number];
export const EXPERIENCE_TARGET_KINDS = Object.freeze(['browser_site', 'windows_app'] as const);
/** §7 Outcome 상태. Phase 1 runtime 은 CANCELLED · ABANDONED · USER_COMPLETED 를 만들지 않는다(정확한 근거가 없어 매핑하지 않음). */
export const EXPERIENCE_OUTCOME_STATUSES = Object.freeze(['SUCCESS', 'PARTIAL_SUCCESS', 'USER_COMPLETED', 'BLOCKED', 'FAILED', 'CANCELLED', 'ABANDONED'] as const);
export type ExperienceOutcomeStatus = (typeof EXPERIENCE_OUTCOME_STATUSES)[number];
/** 근거 3등급. LLM 이 "완료" 라고 판단한 것은 agent_inferred 이고 승격하지 않는다(D6). */
export const EXPERIENCE_EVIDENCE = Object.freeze(['system_verified', 'user_confirmed', 'agent_inferred'] as const);
export type ExperienceEvidence = (typeof EXPERIENCE_EVIDENCE)[number];
export const EXPERIENCE_STAGES = Object.freeze(['observe', 'read', 'input', 'activate'] as const);
export type ExperienceStage = (typeof EXPERIENCE_STAGES)[number];
export const EXPERIENCE_ACTION_KINDS = Object.freeze([
  'inspect', 'find', 'read_text', 'read_table', 'set_input', 'select_option', 'click', 'takeover', 'done', 'key', 'visual_click', 'visual_type', 'visual_key',
] as const);
export const EXPERIENCE_METHODS = Object.freeze(['browser_dom', 'windows_uia', 'computer_use'] as const);
export type ExperienceMethod = (typeof EXPERIENCE_METHODS)[number];
export const EXPERIENCE_ACTORS = Object.freeze(['deterministic', 'ai_normal', 'ai_strong'] as const);
export type ExperienceActor = (typeof EXPERIENCE_ACTORS)[number];
export const EXPERIENCE_RESULT_STATUSES = Object.freeze(['success', 'failed', 'denied', 'rejected'] as const);
/** 실패 원인 층(§4C). runtime 층 실패는 Procedure/Candidate 실패가 아니다(D7). */
export const EXPERIENCE_LAYERS = Object.freeze(['runtime', 'ui_change', 'business_knowledge', 'input_missing', 'judgment', 'policy_risk'] as const);
export type ExperienceLayer = (typeof EXPERIENCE_LAYERS)[number];

export const EXPERIENCE_LIMITS = Object.freeze({ maxSteps: 60, maxFailures: 20, msMax: 86_400_000, countMax: 10_000 });
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const ERROR_CODE_RE = /^[A-Z][A-Z0-9_]{1,63}$/;
export const EXPERIENCE_METRIC_KEYS = Object.freeze([
  'totalMs', 'aiMs', 'aiCalls', 'commandWaitMs', 'executionMs', 'settleMs', 'actionCount', 'stepCount', 'retryCount',
] as const);
export type ExperienceMetricKey = (typeof EXPERIENCE_METRIC_KEYS)[number];

// ─── 형상 ─────────────────────────────────────────────────────────────────────

export interface ExperienceStep {
  seq: number;
  stage: ExperienceStage | null;
  actionKind: string;
  method: ExperienceMethod | null;
  locator: WorkflowLocator | null;
  actor: ExperienceActor | null;
  resultStatus: WorkStepRecord['status'];
  resultEvidence: ExperienceEvidence | null;
  errorCode: string | null;
  durationMs: number | null;
}
export interface ExperienceFailure {
  stepSeq: number | null;
  stage: ExperienceStage | null;
  layer: ExperienceLayer | null;
  failureClass: AutomationFailureClass | null;
  errorCode: string | null;
  method: ExperienceMethod | null;
  recoveryTier: RecoveryTier | null;
  recoveryResult: RecoveryResult | null;
  uiChangeSuspected: boolean;
}
/** 근거 없는 값은 null — 추정하지 않는다(§4D). */
export type ExperienceMetric = Record<ExperienceMetricKey, number | null>;
export interface DataWorkRunExperienceRecordArgs {
  runId: string;
  segment: { startedAt: string; endedAt: string; endState: ExperienceEndState; resumed: boolean };
  target: { targetId: string; targetKind: (typeof EXPERIENCE_TARGET_KINDS)[number] };
  outcome: { status: ExperienceOutcomeStatus; evidence: ExperienceEvidence } | null;
  metric: ExperienceMetric;
  steps: ExperienceStep[];
  failures: ExperienceFailure[];
}

// ─── 검증 (서버 ↔ agent 경계 양쪽에서 같은 형상) ─────────────────────────────

const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const exactKeys = (v: Record<string, unknown>, keys: readonly string[]) => {
  const own = Object.keys(v);
  return own.length === keys.length && own.every((k) => keys.includes(k));
};
const enumOrNull = (v: unknown, list: readonly string[]) => v === null || (typeof v === 'string' && list.includes(v));
const intOrNull = (v: unknown, max: number) => v === null || (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max);
const codeOrNull = (v: unknown) => v === null || (typeof v === 'string' && ERROR_CODE_RE.test(v));

const STEP_KEYS = ['seq', 'stage', 'actionKind', 'method', 'locator', 'actor', 'resultStatus', 'resultEvidence', 'errorCode', 'durationMs'];
const FAILURE_KEYS = ['stepSeq', 'stage', 'layer', 'failureClass', 'errorCode', 'method', 'recoveryTier', 'recoveryResult', 'uiChangeSuspected'];

function validateStep(raw: unknown, index: number): ExperienceStep | null {
  if (!plain(raw) || !exactKeys(raw, STEP_KEYS)) return null;
  if (raw.seq !== index + 1) return null;
  if (!enumOrNull(raw.stage, EXPERIENCE_STAGES)) return null;
  if (typeof raw.actionKind !== 'string' || !(EXPERIENCE_ACTION_KINDS as readonly string[]).includes(raw.actionKind)) return null;
  if (!enumOrNull(raw.method, EXPERIENCE_METHODS) || !enumOrNull(raw.actor, EXPERIENCE_ACTORS)) return null;
  if (typeof raw.resultStatus !== 'string' || !(EXPERIENCE_RESULT_STATUSES as readonly string[]).includes(raw.resultStatus)) return null;
  if (!enumOrNull(raw.resultEvidence, EXPERIENCE_EVIDENCE) || !codeOrNull(raw.errorCode) || !intOrNull(raw.durationMs, EXPERIENCE_LIMITS.msMax)) return null;
  let locator: WorkflowLocator | null = null;
  if (raw.locator !== null) {
    // semantic locator 는 DOM 단계에만(역할 + 접근 이름/보이는 이름). 좌표 · elementRef · 입력 내용은 형상에 없다.
    if (raw.method !== 'browser_dom') return null;
    locator = validateWorkflowLocator(raw.locator);
    if (!locator) return null;
  }
  return {
    seq: raw.seq as number, stage: raw.stage as ExperienceStage | null, actionKind: raw.actionKind, method: raw.method as ExperienceMethod | null,
    locator, actor: raw.actor as ExperienceActor | null, resultStatus: raw.resultStatus as WorkStepRecord['status'],
    resultEvidence: raw.resultEvidence as ExperienceEvidence | null, errorCode: raw.errorCode as string | null, durationMs: raw.durationMs as number | null,
  };
}

function validateFailure(raw: unknown, stepCount: number): ExperienceFailure | null {
  if (!plain(raw) || !exactKeys(raw, FAILURE_KEYS)) return null;
  if (raw.stepSeq !== null && !(Number.isInteger(raw.stepSeq) && (raw.stepSeq as number) >= 1 && (raw.stepSeq as number) <= stepCount)) return null;
  if (!enumOrNull(raw.stage, EXPERIENCE_STAGES) || !enumOrNull(raw.layer, EXPERIENCE_LAYERS)) return null;
  if (!enumOrNull(raw.failureClass, AUTOMATION_FAILURE_CLASSES) || !codeOrNull(raw.errorCode) || !enumOrNull(raw.method, EXPERIENCE_METHODS)) return null;
  if (!enumOrNull(raw.recoveryTier, RECOVERY_TIERS) || !enumOrNull(raw.recoveryResult, RECOVERY_RESULTS)) return null;
  if (typeof raw.uiChangeSuspected !== 'boolean') return null;
  return {
    stepSeq: raw.stepSeq as number | null, stage: raw.stage as ExperienceStage | null, layer: raw.layer as ExperienceLayer | null,
    failureClass: raw.failureClass as AutomationFailureClass | null, errorCode: raw.errorCode as string | null, method: raw.method as ExperienceMethod | null,
    recoveryTier: raw.recoveryTier as RecoveryTier | null, recoveryResult: raw.recoveryResult as RecoveryResult | null, uiChangeSuspected: raw.uiChangeSuspected,
  };
}

/**
 * `{ runId, segment, target, outcome, metric, steps, failures }` 형상 검사. runId 형식 · targetId 등재 여부는 호출자(protocol)가 본다.
 * 정규화된 사본을 돌려준다.
 */
export function validateWorkExperienceRecordShape(args: unknown): { ok: boolean; args?: DataWorkRunExperienceRecordArgs } {
  if (!plain(args) || !exactKeys(args, ['runId', 'segment', 'target', 'outcome', 'metric', 'steps', 'failures'])) return { ok: false };
  if (typeof args.runId !== 'string') return { ok: false };
  const seg = args.segment;
  if (!plain(seg) || !exactKeys(seg, ['startedAt', 'endedAt', 'endState', 'resumed'])) return { ok: false };
  if (typeof seg.startedAt !== 'string' || !ISO_RE.test(seg.startedAt) || typeof seg.endedAt !== 'string' || !ISO_RE.test(seg.endedAt)) return { ok: false };
  if (Date.parse(seg.endedAt) < Date.parse(seg.startedAt)) return { ok: false };
  if (typeof seg.endState !== 'string' || !(EXPERIENCE_END_STATES as readonly string[]).includes(seg.endState) || typeof seg.resumed !== 'boolean') return { ok: false };
  const tg = args.target;
  if (!plain(tg) || !exactKeys(tg, ['targetId', 'targetKind'])) return { ok: false };
  if (typeof tg.targetId !== 'string' || typeof tg.targetKind !== 'string' || !(EXPERIENCE_TARGET_KINDS as readonly string[]).includes(tg.targetKind)) return { ok: false };
  let outcome: DataWorkRunExperienceRecordArgs['outcome'] = null;
  if (args.outcome !== null) {
    const oc = args.outcome;
    if (!plain(oc) || !exactKeys(oc, ['status', 'evidence'])) return { ok: false };
    if (typeof oc.status !== 'string' || !(EXPERIENCE_OUTCOME_STATUSES as readonly string[]).includes(oc.status)) return { ok: false };
    if (typeof oc.evidence !== 'string' || !(EXPERIENCE_EVIDENCE as readonly string[]).includes(oc.evidence)) return { ok: false };
    // 최종 결과는 종료 segment 에만 붙는다 — 사용자 대기 · 재개 실패 segment 는 결과가 아니다.
    if (seg.endState === 'waiting_for_user' || seg.endState === 'resume_failed') return { ok: false };
    outcome = { status: oc.status as ExperienceOutcomeStatus, evidence: oc.evidence as ExperienceEvidence };
  }
  const mt = args.metric;
  if (!plain(mt) || !exactKeys(mt, EXPERIENCE_METRIC_KEYS)) return { ok: false };
  for (const k of EXPERIENCE_METRIC_KEYS) {
    if (!intOrNull(mt[k], k.endsWith('Ms') ? EXPERIENCE_LIMITS.msMax : EXPERIENCE_LIMITS.countMax)) return { ok: false };
  }
  if (!Array.isArray(args.steps) || args.steps.length > EXPERIENCE_LIMITS.maxSteps) return { ok: false };
  const steps: ExperienceStep[] = [];
  for (let i = 0; i < args.steps.length; i += 1) {
    const s = validateStep(args.steps[i], i);
    if (!s) return { ok: false };
    steps.push(s);
  }
  if (!Array.isArray(args.failures) || args.failures.length > EXPERIENCE_LIMITS.maxFailures) return { ok: false };
  const failures: ExperienceFailure[] = [];
  for (const f of args.failures) {
    const v = validateFailure(f, steps.length);
    if (!v) return { ok: false };
    failures.push(v);
  }
  return {
    ok: true,
    args: {
      runId: args.runId,
      segment: { startedAt: seg.startedAt, endedAt: seg.endedAt, endState: seg.endState as ExperienceEndState, resumed: seg.resumed },
      target: { targetId: tg.targetId, targetKind: tg.targetKind as DataWorkRunExperienceRecordArgs['target']['targetKind'] },
      outcome,
      metric: Object.fromEntries(EXPERIENCE_METRIC_KEYS.map((k) => [k, mt[k] as number | null])) as ExperienceMetric,
      steps,
      failures,
    },
  };
}

// ─── runtime → Experience 매핑 (순수) ─────────────────────────────────────────

/** 행동 종류 → 단계(stage). 판단 불가(takeover · done)는 null. */
export function experienceStageOf(kind: string): ExperienceStage | null {
  if (kind === 'inspect') return 'observe';
  if (kind === 'find' || kind === 'read_text' || kind === 'read_table') return 'read';
  if (kind === 'set_input' || kind === 'select_option' || kind === 'visual_type') return 'input';
  if (kind === 'click' || kind === 'key' || kind === 'visual_click' || kind === 'visual_key') return 'activate';
  return null;
}

/** 표면 + 행동 종류 → 실행 수단. visual_* 는 computer_use. */
export function experienceMethodOf(surface: 'dom' | 'uia', kind: string): ExperienceMethod {
  if (kind.startsWith('visual_')) return 'computer_use';
  return surface === 'uia' ? 'windows_uia' : 'browser_dom';
}

/**
 * runtime 층 오류 코드 — Procedure/Candidate 의 결함이 아니라 실행 환경(연결 · 확장 · 탭 · 문서 준비)의 상태다(D7).
 * 이 코드로 끝난 실패는 Candidate failure_count 에 넣지 않는다.
 */
export const RUNTIME_LAYER_ERROR_CODES: readonly string[] = Object.freeze([
  'LOCAL_AGENT_TIMEOUT', 'LOCAL_AGENT_OFFLINE', 'LOCAL_AGENT_NO_DEVICE', 'LOCAL_DEVICE_AMBIGUOUS',
  'DOM_CONTENT_UNAVAILABLE', 'O4O_EXTENSION_NOT_CONNECTED', 'DOM_TAB_NOT_FOUND',
  'WORK_TARGET_NOT_READY', 'WORK_TARGET_TIMEOUT', 'WORK_AGENT_SITE_NOT_READY',
]);
export function isRuntimeLayerCode(code: string | null | undefined): boolean {
  return !!code && RUNTIME_LAYER_ERROR_CODES.includes(code);
}

/**
 * 실패 원인 층. 근거가 있는 것만 정한다 — 모르면 null(추정 금지).
 *   runtime: site_not_ready 인계 · runtime 코드 / policy_risk: 자격·확정 단계 / ui_change: 예상 밖 창
 *   judgment: 사용자 판단 요청(QUESTION) / input_missing: 요청 값이 대상을 정하지 못함(재생 전 의미 검증)
 */
export function experienceLayerOf(reason: TakeoverReason | null, code: string | null | undefined, opts: { inputMissing?: boolean } = {}): ExperienceLayer | null {
  if (opts.inputMissing) return 'input_missing';
  if (isRuntimeLayerCode(code) || reason === 'site_not_ready') return 'runtime';
  if (reason === 'credential_required' || reason === 'commit_required') return 'policy_risk';
  if (reason === 'unexpected_window') return 'ui_change';
  if (reason === 'user_judgment_required') return 'judgment';
  return null;
}

/** 인계 사유 → 실패 종류(코드가 없을 때). 코드가 있으면 classifyFailure 가 우선한다. */
const REASON_CLASS: Partial<Record<TakeoverReason, AutomationFailureClass>> = {
  credential_required: 'RISK_BLOCKED', commit_required: 'RISK_BLOCKED', review_required: 'RISK_BLOCKED',
  site_not_ready: 'TARGET_FAILURE',
  unsupported_control: 'UNSUPPORTED_UI', uia_hidden_control: 'UNSUPPORTED_UI', key_semantics_unknown: 'UNSUPPORTED_UI', vision_uncertain: 'UNSUPPORTED_UI',
  user_active: 'USER_INTERFERENCE',
  target_changed: 'EXTERNAL_CHANGE', submit_not_verified: 'EXTERNAL_CHANGE', unexpected_window: 'EXTERNAL_CHANGE',
  target_identity_uncertain: 'AMBIGUOUS_STATE', uia_target_ambiguous: 'AMBIGUOUS_STATE', ambiguous_result: 'AMBIGUOUS_STATE', user_judgment_required: 'AMBIGUOUS_STATE',
  no_progress: 'NO_PROGRESS', loop_limit: 'NO_PROGRESS', planner_unavailable: 'PLANNING_FAILURE',
};
export function experienceFailureClassOf(reason: TakeoverReason | null, code: string | null | undefined): AutomationFailureClass | null {
  if (code) return classifyFailure({ errorCode: code });
  return reason ? REASON_CLASS[reason] ?? null : null;
}

/**
 * 종료 segment 의 Outcome(§7). 정확히 맞는 것만 매핑한다.
 *   완료(Planner 판단) → SUCCESS · agent_inferred (LLM 완료 판단은 승격하지 않는다 — D6)
 *   goal_sufficiently_advanced → PARTIAL_SUCCESS · agent_inferred
 *   자격·확정 인계 → BLOCKED / 그 밖 인계·중지 → FAILED
 *     근거: runtime 이 코드 · 예산으로 판정했으면 system_verified, Planner 가 인계를 제안했으면 agent_inferred
 *   대기(QUESTION) · 재개 실패 segment → null(최종 결과가 아니다)
 */
export function experienceOutcomeOf(input: {
  endState: ExperienceEndState;
  reason: TakeoverReason | null;
  plannerProposed: boolean;
}): DataWorkRunExperienceRecordArgs['outcome'] {
  const { endState, reason, plannerProposed } = input;
  if (endState === 'waiting_for_user' || endState === 'resume_failed') return null;
  if (endState === 'completed') {
    return reason === 'goal_sufficiently_advanced' ? { status: 'PARTIAL_SUCCESS', evidence: 'agent_inferred' } : { status: 'SUCCESS', evidence: 'agent_inferred' };
  }
  const evidence: ExperienceEvidence = plannerProposed ? 'agent_inferred' : 'system_verified';
  if (reason === 'credential_required' || reason === 'commit_required') return { status: 'BLOCKED', evidence };
  return { status: 'FAILED', evidence };
}

/**
 * 행동 전 요소 → 단계 locator(DOM 만). 입력 행동에서 locator 가 입력 내용을 담게 되면(이름/글에 값이 보임) 버린다 —
 * Experience 에 값이 남지 않게 한다(§9).
 */
export function experienceLocatorOf(
  surface: 'dom' | 'uia',
  action: WorkAction,
  element: Pick<SafeDomElement, 'role' | 'name' | 'text'> | null | undefined,
): WorkflowLocator | null {
  if (surface !== 'dom' || action.kind.startsWith('visual_')) return null;
  const loc = buildWorkflowLocator(element);
  if (!loc) return null;
  const typed = [action.text, action.option].filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.replace(/\s+/g, ' ').trim());
  if (typed.length && typed.some((v) => (loc.name ?? '').includes(v) || (loc.text ?? '').includes(v))) return null;
  return loc;
}

/** 단계 기록 부가 정보 — runtime 이 history 를 쌓을 때 함께 남긴다(요청 메모리 전용). */
export interface ExperienceStepMeta {
  actor: ExperienceActor | null;
  locator: WorkflowLocator | null;
  durationMs: number | null;
}

/** history(+meta) → Experience 단계. 상한을 넘으면 앞에서부터 상한까지만 싣는다. */
export function buildExperienceSteps(
  surface: 'dom' | 'uia',
  history: readonly WorkStepRecord[],
  metaOf: (r: WorkStepRecord) => ExperienceStepMeta | undefined,
): ExperienceStep[] {
  return history.slice(0, EXPERIENCE_LIMITS.maxSteps).map((r, i) => {
    const meta = metaOf(r);
    const rejected = r.status === 'rejected';
    const code = r.errorCode && ERROR_CODE_RE.test(r.errorCode) ? r.errorCode : null;
    return {
      seq: i + 1,
      // 거절된 제안은 실행되지 않았다 — 단계 · 수단을 붙이지 않는다.
      stage: rejected ? null : experienceStageOf(r.action.kind),
      actionKind: (EXPERIENCE_ACTION_KINDS as readonly string[]).includes(r.action.kind) ? r.action.kind : 'inspect',
      method: rejected ? null : experienceMethodOf(surface, r.action.kind),
      locator: rejected ? null : meta?.locator ?? null,
      actor: meta?.actor ?? null,
      resultStatus: r.status,
      // 명령 결과(success/failed/denied)는 agent 가 돌려준 상태 — system_verified. 거절은 실행 결과가 아니다.
      resultEvidence: rejected ? null : 'system_verified',
      errorCode: code,
      durationMs: meta?.durationMs ?? null,
    };
  });
}

/** 실패 단계 → 실패 이벤트. 근거 없는 층은 null. */
export function buildStepFailures(steps: readonly ExperienceStep[]): ExperienceFailure[] {
  return steps
    .filter((s) => (s.resultStatus === 'failed' || s.resultStatus === 'denied') && s.errorCode)
    .map((s) => ({
      stepSeq: s.seq, stage: s.stage, layer: experienceLayerOf(null, s.errorCode), failureClass: experienceFailureClassOf(null, s.errorCode),
      errorCode: s.errorCode, method: s.method, recoveryTier: null, recoveryResult: null, uiChangeSuspected: false,
    }));
}

export function safeErrorCode(code: string | null | undefined): string | null {
  return code && ERROR_CODE_RE.test(code) ? code : null;
}

/** ms 정수 · 상한 안으로. 근거가 없으면(null/NaN/음수) null. */
export function experienceMs(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !Number.isFinite(v) || v < 0) return null;
  return Math.min(Math.round(v), EXPERIENCE_LIMITS.msMax);
}
export function experienceCount(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !Number.isFinite(v) || v < 0) return null;
  return Math.min(Math.round(v), EXPERIENCE_LIMITS.countMax);
}
