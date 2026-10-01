/**
 * User Assistance · Correction 경계 검사 — WO-O4O-AUTOMATION-USER-ASSISTANCE-AND-CORRECTION-V1 (Experience Model V1 Phase 2).
 *
 * 서버 apps/api-server/src/services/ai-tools/work-assistance.ts 와 같은 규칙(손 복제 — agent 는 TS 를 import 하지 않는다).
 * 형상은 enum · 키 · 정수 · 방법 구조뿐이다. 사용자 답변 원문 · slot 값 · 화면 글이 실릴 자리가 없다.
 * 유일한 예외는 context_recall 의 slotValue — 막힌 재생 단계를 채우는 데만 쓰고 저장하지 않는다.
 */

import { WORK_RUN_ID_RE, WORKFLOW_CANDIDATE_ID_RE } from './local-db.mjs';
import { resolveRegisteredTarget } from './work-target.mjs';

const TASK_KEY_RE = /^[a-z][a-z0-9_]{1,23}(\.[a-z][a-z0-9_]{1,23}){1,3}$/;
const STAGE_KEY_RE = /^[a-z][a-z0-9_]{1,31}$/;
const ASK_KINDS = Object.freeze([
  'value_confirmation', 'target_confirmation', 'menu_location', 'procedure_order', 'manual_request',
  'login_required', 'correction', 'success_confirmation', 'takeover',
]);
const PROVIDED_KINDS = Object.freeze(['value', 'target', 'path', 'procedure', 'document', 'confirmation', 'takeover', 'correction']);
const RESOLUTIONS = Object.freeze(['resolved', 'partially', 'not_resolved']);
const REUSABILITY = Object.freeze(['reusable_knowledge', 'per_run_value', 'personal_preference', 'not_reusable']);
const CORRECTION_TYPES = Object.freeze(['task_intent', 'target', 'procedure_method', 'outcome']);
const CORRECTION_REASONS = Object.freeze(['inaccurate_results', 'site_feature_exists', 'wrong_target', 'wrong_intent', 'inefficient', 'incomplete_result', 'other']);
const VALIDATION_RESULTS = Object.freeze(['verified', 'not_verified', 'failed']);
const STRATEGY_OPS = Object.freeze([
  'search', 'open_detail', 'open_tab', 'open_menu', 'select_filter', 'read_result', 'extract_field', 're_search', 'return_to_list', 'compare',
]);
const LABELED_OPS = Object.freeze(['open_tab', 'open_menu', 'select_filter']);
const MAX_OPS = 8;
const LABEL_MAX = 40;
const MAX_SLOTS = 4;
const SLOT_VALUE_MAX = 200;

const plain = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const exactKeys = (v, keys) => {
  const own = Object.keys(v);
  return own.length === keys.length && own.every((k) => keys.includes(k));
};
const inList = (v, list) => typeof v === 'string' && list.includes(v);
const taskKeyOrNull = (v) => v === null || (typeof v === 'string' && TASK_KEY_RE.test(v));
const stageKeyOrNull = (v) => v === null || (typeof v === 'string' && STAGE_KEY_RE.test(v));

function normalize(value) {
  if (typeof value !== 'string') return '';
  let s = '';
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    s += code < 0x20 || code === 0x7f ? ' ' : ch;
  }
  return s.replace(/\s+/g, ' ').trim();
}

/** 방법 구조 엄격 검사 — 어휘 밖 op · 허용 안 된 label · 형식 위반은 거절(경계에서는 고치지 않는다). */
export function validateStrategy(raw) {
  if (!plain(raw) || !exactKeys(raw, ['ops']) || !Array.isArray(raw.ops)) return null;
  if (raw.ops.length === 0 || raw.ops.length > MAX_OPS) return null;
  const ops = [];
  for (const o of raw.ops) {
    if (!plain(o) || !inList(o.op, STRATEGY_OPS)) return null;
    const keys = Object.keys(o);
    if (!keys.every((k) => k === 'op' || k === 'label')) return null;
    if (o.label !== undefined) {
      if (!LABELED_OPS.includes(o.op)) return null;
      if (typeof o.label !== 'string' || o.label.length === 0 || o.label.length > LABEL_MAX || normalize(o.label) !== o.label || /[<>{}]/.test(o.label)) return null;
      ops.push({ op: o.op, label: o.label });
    } else ops.push({ op: o.op });
  }
  return { ops };
}
const strategyOrNull = (v) => (v === null ? { ok: true, value: null } : (() => {
  const s = validateStrategy(v);
  return s ? { ok: true, value: s } : { ok: false };
})());

/** context_save — `{ runId, targetId, taskKey, stageKey, ask, strategy, replay }`. */
export function validateContextSaveArgs(args) {
  if (!plain(args) || !exactKeys(args, ['runId', 'targetId', 'taskKey', 'stageKey', 'ask', 'strategy', 'replay'])) return { ok: false };
  if (typeof args.runId !== 'string' || !WORK_RUN_ID_RE.test(args.runId)) return { ok: false };
  if (!resolveRegisteredTarget(args.targetId)) return { ok: false };
  if (!taskKeyOrNull(args.taskKey) || !stageKeyOrNull(args.stageKey)) return { ok: false };
  let ask = null;
  if (args.ask !== null) {
    const a = args.ask;
    if (!plain(a) || !exactKeys(a, ['kind', 'slots']) || !inList(a.kind, ASK_KINDS)) return { ok: false };
    if (!Array.isArray(a.slots) || a.slots.length > MAX_SLOTS || !a.slots.every((s) => typeof s === 'string' && STAGE_KEY_RE.test(s))) return { ok: false };
    ask = { kind: a.kind, slots: [...a.slots] };
  }
  const st = strategyOrNull(args.strategy);
  if (!st.ok) return { ok: false };
  let replay = null;
  if (args.replay !== null) {
    const r = args.replay;
    if (!plain(r) || !exactKeys(r, ['candidateId', 'stepIndex'])) return { ok: false };
    if (typeof r.candidateId !== 'string' || !WORKFLOW_CANDIDATE_ID_RE.test(r.candidateId)) return { ok: false };
    if (!Number.isInteger(r.stepIndex) || r.stepIndex < 0 || r.stepIndex > 63) return { ok: false };
    replay = { candidateId: r.candidateId, stepIndex: r.stepIndex };
  }
  return {
    ok: true,
    args: { runId: args.runId, targetId: args.targetId, taskKey: args.taskKey, stageKey: args.stageKey, ask, strategy: st.value, replay },
  };
}

/** context_recall — `{ runId, targetId, slotValue }`. slotValue 는 null 이거나 짧은 값(저장하지 않음). */
export function validateContextRecallArgs(args) {
  if (!plain(args) || !exactKeys(args, ['runId', 'targetId', 'slotValue'])) return { ok: false };
  if (typeof args.runId !== 'string' || !WORK_RUN_ID_RE.test(args.runId)) return { ok: false };
  if (!resolveRegisteredTarget(args.targetId)) return { ok: false };
  if (args.slotValue !== null) {
    if (typeof args.slotValue !== 'string' || args.slotValue.length === 0 || args.slotValue.length > SLOT_VALUE_MAX) return { ok: false };
    if (normalize(args.slotValue) !== args.slotValue || /[<>{}]/.test(args.slotValue)) return { ok: false };
  }
  return { ok: true, args: { runId: args.runId, targetId: args.targetId, slotValue: args.slotValue } };
}

/** assistance_record — `{ runId, targetId, taskKey, event }`. 서버 validateAssistanceRecordShape 와 같은 규칙. */
export function validateAssistanceRecordArgs(args) {
  if (!plain(args) || !exactKeys(args, ['runId', 'targetId', 'taskKey', 'event'])) return { ok: false };
  if (typeof args.runId !== 'string' || !WORK_RUN_ID_RE.test(args.runId)) return { ok: false };
  if (!resolveRegisteredTarget(args.targetId)) return { ok: false };
  if (!taskKeyOrNull(args.taskKey)) return { ok: false };
  const e = args.event;
  const EVENT_KEYS = ['kind', 'stageKey', 'askKind', 'providedKind', 'structured', 'resolution', 'progressedSteps', 'reusability', 'correction', 'validation'];
  if (!plain(e) || !exactKeys(e, EVENT_KEYS)) return { ok: false };
  if (e.kind !== 'assistance' && e.kind !== 'correction') return { ok: false };
  if (!stageKeyOrNull(e.stageKey)) return { ok: false };
  if (!inList(e.askKind, ASK_KINDS) || !inList(e.providedKind, PROVIDED_KINDS) || !inList(e.resolution, RESOLUTIONS) || !inList(e.reusability, REUSABILITY)) return { ok: false };
  if (!Number.isInteger(e.progressedSteps) || e.progressedSteps < 0 || e.progressedSteps > 1000) return { ok: false };
  // 값 확인은 언제나 이번 run 값 — 교정 · 재사용 지식이 될 수 없다(§7-2).
  if (e.providedKind === 'value' && (e.kind !== 'assistance' || e.reusability !== 'per_run_value')) return { ok: false };
  let structured = null;
  if (e.structured !== null) {
    const st = e.structured;
    if (!plain(st)) return { ok: false };
    if (exactKeys(st, ['slots'])) {
      if (!Array.isArray(st.slots) || st.slots.length > MAX_SLOTS || !st.slots.every((s) => typeof s === 'string' && STAGE_KEY_RE.test(s))) return { ok: false };
      structured = { slots: [...st.slots] };
    } else if (exactKeys(st, ['strategy'])) {
      const s = validateStrategy(st.strategy);
      if (!s) return { ok: false };
      structured = { strategy: s };
    } else return { ok: false };
  }
  let correction = null;
  if (e.kind === 'correction') {
    const c = e.correction;
    if (!plain(c) || !exactKeys(c, ['type', 'reason', 'wrong', 'alternative'])) return { ok: false };
    if (!inList(c.type, CORRECTION_TYPES)) return { ok: false };
    if (c.reason !== null && !inList(c.reason, CORRECTION_REASONS)) return { ok: false };
    const wrong = strategyOrNull(c.wrong);
    const alternative = strategyOrNull(c.alternative);
    if (!wrong.ok || !alternative.ok) return { ok: false };
    correction = { type: c.type, reason: c.reason, wrong: wrong.value, alternative: alternative.value };
  } else if (e.correction !== null) return { ok: false };
  const v = e.validation;
  if (!plain(v) || !exactKeys(v, ['result', 'evidence']) || !inList(v.result, VALIDATION_RESULTS)) return { ok: false };
  if (v.evidence !== null && v.evidence !== 'system_verified' && v.evidence !== 'user_confirmed' && v.evidence !== 'agent_inferred') return { ok: false };
  // 검증 전 방법에는 label 이 없어야 한다 — 검증되지 않은 화면 이름은 저장하지 않는다(D5).
  if (v.result !== 'verified') {
    const hasLabel = (s) => !!s && s.ops.some((o) => o.label !== undefined);
    if (hasLabel(structured && structured.strategy) || hasLabel(correction && correction.alternative)) return { ok: false };
  }
  if (correction && correction.wrong && correction.wrong.ops.some((o) => o.label !== undefined)) return { ok: false };
  return {
    ok: true,
    args: {
      runId: args.runId,
      targetId: args.targetId,
      taskKey: args.taskKey,
      event: {
        kind: e.kind, stageKey: e.stageKey, askKind: e.askKind, providedKind: e.providedKind, structured, resolution: e.resolution,
        progressedSteps: e.progressedSteps, reusability: e.reusability, correction, validation: { result: v.result, evidence: v.evidence },
      },
    },
  };
}

/** experience_recall — `{ targetId, taskKey }`(taskKey null = 업무 키 목록). */
export function validateExperienceRecallArgs(args) {
  if (!plain(args) || !exactKeys(args, ['targetId', 'taskKey'])) return { ok: false };
  if (!resolveRegisteredTarget(args.targetId)) return { ok: false };
  if (!taskKeyOrNull(args.taskKey)) return { ok: false };
  return { ok: true, args: { targetId: args.targetId, taskKey: args.taskKey } };
}
