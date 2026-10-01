/**
 * Workflow Candidate — semantic trajectory · 요청 템플릿 · 재생 단계 (순수 계층)
 *
 * WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1 PHASE 2
 * IR-O4O-WEB-AUTOMATION-RESUME-AND-WORKFLOW-STORE-PREFLIGHT-V1 §8(semantic 저장 형태) · §9-2 · §9-3
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇을 저장하는가 — 클릭 매크로가 아니라 **의미 있는 작업 단계**
 *
 *   step = { actionKind, locator(role · name|text), value(요청의 몇 번째 값 자리) | option, expect(navigated · changed), path }
 *   좌표 · elementRef · snapshotId · DOM 전문 · 화면 캡처는 **재생 단위로 저장하지 않는다**(elementRef 는 snapshot 마다 바뀐다).
 *
 * 입력값은 저장하지 않는다 — 요청 템플릿으로 일반화
 *
 *   첫 성공 run 의 요청 "타이레놀 검색해줘" 에서 입력한 값 "타이레놀" 을 값 자리로 바꿔 `{{1}} 검색해줘` 를 만든다.
 *   다음 요청 "아스피린 검색해줘" 가 템플릿과 맞으면 값 자리에 "아스피린" 을 채워 재생한다. 입력값이 요청 문장에서 온 게
 *   아니면(사용자 답변 · 화면에서 읽은 값 등) 일반화할 수 없으므로 Candidate 를 만들지 않는다(not_generalizable).
 *   → Local 에 남는 것은 템플릿(요청에서 값만 뺀 문장) + semantic 단계뿐이다. 업무 값 자체는 저장되지 않는다.
 *
 * 정본은 사용자 PC Local SQLite 다(Cloud 테이블 0). 템플릿 대조도 **Local 이 한다** — 서버는 과거 요청 문장을 돌려받지 않고,
 * 이번 요청의 값을 채운 단계만 받는다(원문 read-back 없음 · IR §9-3).
 *
 * 이 모듈은 DB·네트워크·DOM 의존이 없다. 같은 규칙이 tools/o4o-local-agent/src/local-db.mjs(template 대조 · 저장 형상)에 손으로 복제돼 있다.
 */

import type { SafeDomElement } from '../local-agent/browser-dom-contract.js';
import { DOM_FIND_ROLES } from '../local-agent/browser-dom-contract.js';
import type { WorkAction } from './work-agent-contract.js';

// ─── 상한 (agent local-db.mjs 와 같은 값) ─────────────────────────────────────
export const WORKFLOW_LIMITS = Object.freeze({
  maxSteps: 12,
  maxSlots: 4,
  locatorTextMax: 100,
  templateMax: 300,
  optionMax: 100,
  valueMax: 200,
  pathMax: 120,
  /** 템플릿에서 값 자리를 뺀 나머지 글자(공백 제외) 최소 길이 — "{{1}}" 하나뿐인 템플릿은 모든 요청과 맞아 버린다. */
  literalMin: 2,
});

export const WORKFLOW_ACTION_KINDS: readonly string[] = Object.freeze(['set_input', 'select_option', 'click']);
export type WorkflowActionKind = 'set_input' | 'select_option' | 'click';

export interface WorkflowLocator {
  /** DOM find 가 받는 role 부분집합일 때만. 없으면 name/text 로만 찾는다. */
  role?: string;
  name?: string;
  text?: string;
}

/** 저장 형상(값 없음). value 는 요청 템플릿의 값 자리 번호(1부터). */
export interface WorkflowStep {
  actionKind: WorkflowActionKind;
  locator: WorkflowLocator;
  /** set_input: 템플릿 값 자리 번호. */
  slot?: number;
  /** select_option: 요청에 없는 고정 선택지(UI 라벨). 요청에서 온 값이면 slot 을 쓴다. */
  option?: string;
  expect: { navigated: boolean; changed: boolean };
  /** 행동 전 화면 경로(pathname 만 · query 없음). 재생 관찰 참고용. */
  path?: string;
}

/** 재생 형상 — Local 이 이번 요청의 값을 채워 돌려준다. */
export interface ReplayStep {
  actionKind: WorkflowActionKind;
  locator: WorkflowLocator;
  /** set_input 값 또는 select_option 선택지. click 은 없다. */
  value?: string;
  expect: { navigated: boolean; changed: boolean };
}

/** run 중에 모으는 성공 행동 하나(서버 메모리 전용 — 값은 템플릿 만들 때만 쓰고 저장하지 않는다). */
export interface TrajectoryEntry {
  actionKind: WorkflowActionKind;
  locator: WorkflowLocator | null;
  /** set_input 텍스트 / select_option 선택지 — 템플릿 일반화에만 쓴다. */
  value?: string;
  expect: { navigated: boolean; changed: boolean };
  path?: string;
}

// ─── 텍스트 정규화 ────────────────────────────────────────────────────────────

/** 제어문자 → 공백, 연속 공백 1칸, 앞뒤 공백 제거. 정규식 리터럴에 제어문자를 두지 않는다(no-control-regex). */
export function normalizeWorkflowText(value: unknown): string {
  if (typeof value !== 'string') return '';
  const cleaned = Array.from(value)
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x20 || code === 0x7f ? ' ' : ch;
    })
    .join('');
  return cleaned.replace(/\s+/g, ' ').trim();
}

/** locator 값 — 짧은 일반 문자열 · find 조건 금지 문자(`<>{}`) 없음. 아니면 undefined. */
function locatorText(value: unknown): string | undefined {
  const t = normalizeWorkflowText(value);
  if (!t || /[<>{}]/.test(t)) return undefined;
  return t.slice(0, WORKFLOW_LIMITS.locatorTextMax);
}

function safePath(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || /[?#\s]/.test(value)) return undefined;
  return value.slice(0, WORKFLOW_LIMITS.pathMax);
}

// ─── 기록 ─────────────────────────────────────────────────────────────────────

/** 행동 전 요소 → semantic locator. name 우선, 없으면 text. 둘 다 없으면 null(재생 때 다시 찾을 방법이 없다). */
export function buildWorkflowLocator(element: Pick<SafeDomElement, 'role' | 'name' | 'text'> | null | undefined): WorkflowLocator | null {
  if (!element) return null;
  const name = locatorText(element.name);
  const text = name ? undefined : locatorText(element.text);
  if (!name && !text) return null;
  const locator: WorkflowLocator = {};
  if (typeof element.role === 'string' && DOM_FIND_ROLES.includes(element.role)) locator.role = element.role;
  if (name) locator.name = name;
  if (text) locator.text = text;
  return locator;
}

/**
 * 성공한 DOM 행동 하나 → trajectory 항목. 행동 종류가 재생 대상(set_input · select_option · click)이 아니면 null.
 * element 는 **행동 전 관찰**의 요소다(같은 elementRef).
 */
export function buildTrajectoryEntry(
  action: WorkAction,
  element: Pick<SafeDomElement, 'role' | 'name' | 'text'> | null | undefined,
  outcome: { navigated?: boolean; changed?: boolean },
  path?: string,
): TrajectoryEntry | null {
  if (!WORKFLOW_ACTION_KINDS.includes(action.kind)) return null;
  const entry: TrajectoryEntry = {
    actionKind: action.kind as WorkflowActionKind,
    locator: buildWorkflowLocator(element),
    expect: { navigated: outcome.navigated === true, changed: outcome.changed === true },
  };
  if (action.kind === 'set_input' && typeof action.text === 'string') entry.value = action.text;
  if (action.kind === 'select_option' && typeof action.option === 'string') entry.value = action.option;
  const p = safePath(path);
  if (p) entry.path = p;
  return entry;
}

// ─── 요청 템플릿 ──────────────────────────────────────────────────────────────

/**
 * 요청 문장 + 입력값들 → 템플릿. 각 값은 요청 안에 그대로 있어야 한다(정규화 기준). 긴 값부터 `{{n}}` 으로 바꾼다.
 * 일반화할 수 없으면(값이 요청에 없음 · 값 자리 과다 · 남는 글자 부족 · 요청에 `{{`/`}}`) null.
 * 반환 slots[i] = 값 values[i] 의 자리 번호.
 */
export function buildRequestTemplate(request: string, values: string[]): { template: string; slots: number[] } | null {
  const req = normalizeWorkflowText(request);
  if (!req || req.includes('{{') || req.includes('}}')) return null;
  const norm = values.map(normalizeWorkflowText);
  if (norm.some((v) => !v || v.length > WORKFLOW_LIMITS.valueMax)) return null;
  const distinct = [...new Set(norm)];
  if (distinct.length > WORKFLOW_LIMITS.maxSlots) return null;
  // 값끼리 포함 관계면 자리 경계가 모호하다 — 일반화하지 않는다.
  for (const a of distinct) for (const b of distinct) if (a !== b && a.includes(b)) return null;
  let template = req;
  const slotOf = new Map<string, number>();
  // 요청 안 등장 순서대로 자리 번호를 매긴다(재생 때 사람이 읽는 순서와 같게).
  const ordered = distinct
    .map((v) => ({ v, at: req.indexOf(v) }))
    .sort((x, y) => x.at - y.at);
  if (ordered.some((o) => o.at < 0)) return null;
  ordered.forEach((o, i) => slotOf.set(o.v, i + 1));
  for (const o of [...ordered].sort((x, y) => y.v.length - x.v.length)) {
    template = template.split(o.v).join(`{{${slotOf.get(o.v)}}}`);
  }
  const literal = template.replace(/\{\{\d\}\}/g, '').replace(/\s+/g, '');
  if (literal.length < WORKFLOW_LIMITS.literalMin) return null;
  if (template.length > WORKFLOW_LIMITS.templateMax) return null;
  return { template, slots: norm.map((v) => slotOf.get(v) as number) };
}

/**
 * 템플릿 대조(참조 구현 — 정본 대조는 Local agent 가 한다). 맞으면 자리 번호 순 값 배열(1번 → [0]), 아니면 null.
 * 공백은 1칸으로 정규화해 비교한다. 같은 자리 번호가 여러 번 나오면 같은 값이어야 한다.
 */
export function matchRequestTemplate(template: string, request: string): string[] | null {
  const req = normalizeWorkflowText(request);
  if (!req || typeof template !== 'string' || !template) return null;
  const parts = template.split(/(\{\{\d\}\})/);
  const order: number[] = [];
  const pattern = parts
    .map((p) => {
      const m = /^\{\{(\d)\}\}$/.exec(p);
      if (m) {
        order.push(Number(m[1]));
        return '(.+?)';
      }
      return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  const hit = new RegExp(`^${pattern}$`).exec(req);
  if (!hit) return null;
  const values: string[] = [];
  for (let i = 0; i < order.length; i += 1) {
    const slot = order[i];
    const v = hit[i + 1].trim();
    if (!v || v.length > WORKFLOW_LIMITS.valueMax) return null;
    if (values[slot - 1] !== undefined && values[slot - 1] !== v) return null;
    values[slot - 1] = v;
  }
  return values.some((v) => v === undefined) ? null : values;
}

// ─── Candidate 조립 ───────────────────────────────────────────────────────────

export type CandidateBuildResult =
  | { ok: true; template: string; steps: WorkflowStep[] }
  | { ok: false; reason: 'empty' | 'too_many_steps' | 'locator_missing' | 'not_generalizable' };

/**
 * 성공 run 의 trajectory → Candidate(템플릿 + 값 없는 semantic 단계).
 * 재생할 수 없는 단계(locator 없음)가 하나라도 있으면 만들지 않는다 — 중간이 빈 workflow 는 재생이 어긋난다.
 */
export function buildWorkflowCandidate(request: string, trajectory: TrajectoryEntry[]): CandidateBuildResult {
  if (trajectory.length === 0) return { ok: false, reason: 'empty' };
  if (trajectory.length > WORKFLOW_LIMITS.maxSteps) return { ok: false, reason: 'too_many_steps' };
  if (trajectory.some((t) => !t.locator)) return { ok: false, reason: 'locator_missing' };
  const req = normalizeWorkflowText(request);
  // set_input 값은 반드시 요청에서, select_option 은 요청에 있으면 값 자리 · 없으면 고정 선택지(UI 라벨)로 둔다.
  const slotValues: string[] = [];
  for (const t of trajectory) {
    const v = normalizeWorkflowText(t.value);
    if (t.actionKind === 'set_input') {
      if (!v || !req.includes(v)) return { ok: false, reason: 'not_generalizable' };
      slotValues.push(v);
    } else if (t.actionKind === 'select_option' && v && req.includes(v)) {
      slotValues.push(v);
    }
  }
  const built = buildRequestTemplate(request, slotValues);
  if (!built) return { ok: false, reason: 'not_generalizable' };
  const slotFor = new Map<string, number>();
  slotValues.forEach((v, i) => slotFor.set(v, built.slots[i]));
  const steps: WorkflowStep[] = trajectory.map((t) => {
    const step: WorkflowStep = { actionKind: t.actionKind, locator: t.locator as WorkflowLocator, expect: { ...t.expect } };
    const v = normalizeWorkflowText(t.value);
    if (t.actionKind === 'set_input') step.slot = slotFor.get(v);
    if (t.actionKind === 'select_option') {
      if (slotFor.has(v)) step.slot = slotFor.get(v);
      else if (v) step.option = v.slice(0, WORKFLOW_LIMITS.optionMax);
    }
    if (t.path) step.path = t.path;
    return step;
  });
  if (steps.some((s) => s.actionKind === 'select_option' && s.slot === undefined && !s.option)) return { ok: false, reason: 'not_generalizable' };
  return { ok: true, template: built.template, steps };
}

// ─── 검증 (서버 ↔ agent 경계 양쪽에서 같은 형상) ─────────────────────────────

function validateLocator(raw: unknown): WorkflowLocator | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;
  for (const k of Object.keys(src)) if (!['role', 'name', 'text'].includes(k)) return null;
  const out: WorkflowLocator = {};
  if (src.role !== undefined) {
    if (typeof src.role !== 'string' || !DOM_FIND_ROLES.includes(src.role)) return null;
    out.role = src.role;
  }
  for (const k of ['name', 'text'] as const) {
    if (src[k] === undefined) continue;
    const t = locatorText(src[k]);
    if (!t || t !== src[k]) return null;
    out[k] = t;
  }
  if (!out.name && !out.text) return null;
  return out;
}

function validateExpect(raw: unknown): { navigated: boolean; changed: boolean } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;
  const keys = Object.keys(src).sort();
  if (keys.length !== 2 || keys[0] !== 'changed' || keys[1] !== 'navigated') return null;
  if (typeof src.navigated !== 'boolean' || typeof src.changed !== 'boolean') return null;
  return { navigated: src.navigated, changed: src.changed };
}

/** 저장 형상(값 없음) 검증 — 서버가 save 인자를 보낼 때 · agent 가 받을 때 같은 규칙. 정규화된 사본을 돌려준다. */
export function validateWorkflowSteps(raw: unknown): WorkflowStep[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > WORKFLOW_LIMITS.maxSteps) return null;
  const out: WorkflowStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const src = item as Record<string, unknown>;
    for (const k of Object.keys(src)) if (!['actionKind', 'locator', 'slot', 'option', 'expect', 'path'].includes(k)) return null;
    if (typeof src.actionKind !== 'string' || !WORKFLOW_ACTION_KINDS.includes(src.actionKind)) return null;
    const locator = validateLocator(src.locator);
    const expect = validateExpect(src.expect);
    if (!locator || !expect) return null;
    const step: WorkflowStep = { actionKind: src.actionKind as WorkflowActionKind, locator, expect };
    if (src.slot !== undefined) {
      if (typeof src.slot !== 'number' || !Number.isInteger(src.slot) || src.slot < 1 || src.slot > WORKFLOW_LIMITS.maxSlots) return null;
      step.slot = src.slot;
    }
    if (src.option !== undefined) {
      const o = normalizeWorkflowText(src.option);
      if (!o || o !== src.option || o.length > WORKFLOW_LIMITS.optionMax || /[<>{}]/.test(o)) return null;
      step.option = o;
    }
    if (src.path !== undefined) {
      const p = safePath(src.path);
      if (!p || p !== src.path) return null;
      step.path = p;
    }
    if (step.actionKind === 'set_input' && (step.slot === undefined || step.option !== undefined)) return null;
    if (step.actionKind === 'select_option' && (step.slot === undefined) === (step.option === undefined)) return null;
    if (step.actionKind === 'click' && (step.slot !== undefined || step.option !== undefined)) return null;
    out.push(step);
  }
  return out;
}

/** 요청 템플릿 검증 — 값 자리 1..maxSlots · 길이 · 남는 글자. */
export function isValidRequestTemplate(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > WORKFLOW_LIMITS.templateMax) return false;
  if (normalizeWorkflowText(value) !== value) return false;
  const slots = [...value.matchAll(/\{\{(\d)\}\}/g)].map((m) => Number(m[1]));
  if (slots.some((n) => n < 1 || n > WORKFLOW_LIMITS.maxSlots)) return false;
  const rest = value.replace(/\{\{\d\}\}/g, '');
  if (rest.includes('{') || rest.includes('}')) return false;
  return rest.replace(/\s+/g, '').length >= WORKFLOW_LIMITS.literalMin;
}

/** Local 이 돌려준 재생 단계(값 채움) 검증 — 이 형상 밖은 재생하지 않는다. */
export function validateReplaySteps(raw: unknown): ReplayStep[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > WORKFLOW_LIMITS.maxSteps) return null;
  const out: ReplayStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const src = item as Record<string, unknown>;
    for (const k of Object.keys(src)) if (!['actionKind', 'locator', 'value', 'expect'].includes(k)) return null;
    if (typeof src.actionKind !== 'string' || !WORKFLOW_ACTION_KINDS.includes(src.actionKind)) return null;
    const locator = validateLocator(src.locator);
    const expect = validateExpect(src.expect);
    if (!locator || !expect) return null;
    const step: ReplayStep = { actionKind: src.actionKind as WorkflowActionKind, locator, expect };
    if (src.value !== undefined) {
      const v = normalizeWorkflowText(src.value);
      if (!v || v !== src.value || v.length > WORKFLOW_LIMITS.valueMax) return null;
      step.value = v;
    }
    if (step.actionKind === 'click' ? step.value !== undefined : step.value === undefined) return null;
    out.push(step);
  }
  return out;
}

// ─── 재생 전 의미 검증(preflight) ─────────────────────────────────────────────
//
// WO-O4O-MAIN-AUTOMATION-RESUME-AND-REPLAY-PREFLIGHT-FIX-V1 §2-A — 템플릿이 맞았다고 바로 재생하지 않는다.
// 값 자리에 들어온 요청 값이 **무엇을 가리키는지 스스로 정해진 값**(이름 · 명칭 · 번호)일 때만 재생한다.
// "내가 먹을 약" · "이 약" · "어떤 영양제" 처럼 사용자 맥락 없이는 대상을 알 수 없는 값은 실행 전에 묻는다(QUESTION).
// 사이트 · 업무별 사전이 아니라 한국어 지시 · 부정 · 관형 표현만 본다(AUTOMATION-EVOLUTION 원칙: 사이트별 업무 사전 정의 금지).
// 오판은 안전한 쪽(묻기)으로 기운다 — 구체 값을 모호로 보면 한 번 더 물을 뿐이고, 모호 값을 실행하지는 않는다.

/** 가리키는 대상이 사용자 맥락에 달린 말(인칭 · 지시 · 시점). 뒤에 붙은 조사는 떼고 본다. */
const REFERENTIAL_WORDS: ReadonlySet<string> = new Set([
  '나', '내', '제', '저', '저희', '우리', '너', '네', '당신', '본인', '자기',
  '이', '그', '이거', '그거', '저거', '이것', '그것', '저것', '여기', '거기', '저기',
  '그때', '아까', '전에', '평소', '늘', '항상',
]);
/** 대상을 정하지 않는 말(부정 · 의문 · 평가). */
const INDEFINITE_WORDS: ReadonlySet<string> = new Set([
  '어떤', '어느', '아무', '아무거나', '무슨', '뭐', '뭔가', '뭐든', '무엇', '무엇이든', '누구', '어디', '몇',
  '적당한', '알맞은', '좋은', '괜찮은', '필요한', '추천', '비슷한', '다른', '여러', '특정',
]);
const TRAILING_PARTICLE = /(가|이|의|는|은|를|을|도|만|께서|에게)$/;
/** 관형형 어미(먹을 · 먹는 · 먹은 · 복용할 · 쓰던) — 뒤 명사를 사용자 행동으로 한정한다. 마지막 낱말에는 적용하지 않는다. */
const MODIFIER_ENDING = /(는|을|은|할|한|될|된|던)$/;

/** 재생할 요청 값 하나가 구체적인가. */
export function assessReplayValue(value: unknown): 'concrete' | 'ambiguous' {
  const v = normalizeWorkflowText(value);
  if (v.replace(/\s+/g, '').length < 2 || /[?？]/.test(v)) return 'ambiguous';
  const tokens = v.split(' ');
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    const base = t.length >= 2 ? t.replace(TRAILING_PARTICLE, '') : t;
    if (REFERENTIAL_WORDS.has(t) || REFERENTIAL_WORDS.has(base) || INDEFINITE_WORDS.has(t) || INDEFINITE_WORDS.has(base)) return 'ambiguous';
    if (i < tokens.length - 1 && t.length >= 2 && MODIFIER_ENDING.test(t)) return 'ambiguous';
  }
  return 'concrete';
}

/**
 * 재생 단계 중 **요청에서 온 값**(set_input 값 · 요청 문장에 들어 있는 select_option 값)이 모두 구체적이어야 재생한다.
 * 요청에 없는 고정 선택지(UI 라벨)는 사용자가 준 값이 아니므로 보지 않는다.
 */
export function replayPreflight(request: string, steps: readonly ReplayStep[]): 'ok' | 'ambiguous' {
  const req = normalizeWorkflowText(request);
  for (const s of steps) {
    if (s.value === undefined) continue;
    const fromRequest = s.actionKind === 'set_input' || req.includes(s.value);
    if (fromRequest && assessReplayValue(s.value) === 'ambiguous') return 'ambiguous';
  }
  return 'ok';
}

/** DOM find 조건 — role(있으면) + name 또는 text. */
export function replayFindQuery(locator: WorkflowLocator): Record<string, string> {
  const q: Record<string, string> = {};
  if (locator.role) q.role = locator.role;
  if (locator.name) q.name = locator.name;
  else if (locator.text) q.text = locator.text;
  return q;
}

/**
 * find 결과에서 재생 대상 하나를 고른다. locator 값과 **정확히 같은** 요소가 하나면 그것, 아니면 결과가 하나뿐일 때만 그것.
 * 모호하면 null — 재생은 추측하지 않는다(어긋나면 AI 가 이어받는다).
 */
export function pickReplayTarget(locator: WorkflowLocator, matches: Pick<SafeDomElement, 'elementRef' | 'role' | 'name' | 'text'>[]): string | null {
  const compact = (v: unknown) => normalizeWorkflowText(v).replace(/\s+/g, '').toLowerCase();
  const want = compact(locator.name ?? locator.text);
  const exact = matches.filter((m) => compact(locator.name ? m.name : (m.text ?? m.name)) === want);
  if (exact.length === 1) return exact[0].elementRef;
  if (exact.length === 0 && matches.length === 1) return matches[0].elementRef;
  return null;
}
