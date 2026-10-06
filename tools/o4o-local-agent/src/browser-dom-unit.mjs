/**
 * Browser DOM 작업 단위 실행 — `local.browser.dom.run_unit#siteId` (Execution Node 쪽)
 *
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-E-TASK-UNIT-DISPATCH-V1
 *
 * Assistant(서버)가 "판단이 끝난" 짧은 단계 묶음을 한 번에 맡기면, 이 노드가 **허용된 범위 안에서만** 이어서
 * 실행하고 단계별 결과 + 최종 관찰을 한 번에 돌려준다. 화면 행동 하나마다 cloud 를 왕복하던 것을 줄이는 축이다.
 *
 * 이 파일이 하지 않는 것:
 *   - 단계를 만들거나 바꾸지 않는다. 받은 단계를 순서대로 실행하거나, 멈춘다. 목적을 바꿀 자리가 없다.
 *   - 새 실행 수단이 없다. 각 단계는 기존 `local.browser.dom.*` 명령(get_context · inspect · find · click ·
 *     set_input · select_option)을 같은 검증 · 같은 bridge 로 부른다 — 확장의 COMMIT · 자격 · 다른 사이트 차단이 그대로 걸린다.
 *   - 판단하지 않는다. 예상 밖(실패 · 화면 바뀜 · 대상 없음/모호 · 대상 부적합 · 예상 이동 불일치 · 다른 사이트 ·
 *     준비 안 됨 · 예산 · 시간)이면 **즉시 멈추고** 이유를 돌려준다. 그 다음은 Assistant 가 정한다.
 *
 * 서버 `browser-dom-contract.ts` 의 DOM_UNIT_* 와 상수 · 원인 목록이 같다(테스트가 대조).
 * 이 파일은 `chrome.*` · `fs` · `child_process` 를 쓰지 않는다. 실행은 주입받은 `call(base, args)` 뿐이다.
 */

import { validateTextArgs as validateComputerTextArgs } from './computer-use-limits.mjs';
import {
  DOM_INPUT_MAX_LENGTH,
  DOM_QUERY_VALUE_MAX,
  DOM_RESULT_MAX_BYTES,
  isDomElementRef,
  isDomSnapshotId,
  trimDomElement,
  validateDomFindQuery,
} from './browser-dom-limits.mjs';

export const DOM_UNIT_MAX_STEPS = 12;
export const DOM_UNIT_MAX_COMMANDS = 60;
export const DOM_UNIT_MAX_DURATION_MS = 30000;
export const DOM_UNIT_COMMAND_TTL_MS = 45000;
export const DOM_UNIT_OBSERVE_ATTEMPTS = 3;
export const DOM_UNIT_OBSERVE_ATTEMPTS_AFTER_NAVIGATION = 10;
export const DOM_UNIT_SETTLE_MS = 700;
/** 명령 만료 전에 결과를 제출할 여유(ms). 단위는 이 시점 전에 멈춘다. */
export const DOM_UNIT_EXPIRY_MARGIN_MS = 3000;

export const DOM_UNIT_OPS = Object.freeze(['act', 'find_act']);
export const DOM_UNIT_ACT_KINDS = Object.freeze(['click', 'set_input', 'select_option']);
export const DOM_UNIT_KIND_ROLES = Object.freeze({
  click: Object.freeze(['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem']),
  set_input: Object.freeze(['textbox', 'searchbox', 'textarea']),
  select_option: Object.freeze(['combobox']),
});
export const DOM_UNIT_STOP_CAUSES = Object.freeze([
  'step_failed',
  'reobserve',
  'find_failed',
  'locator_not_found',
  'validation_rejected',
  'expect_mismatch',
  'cross_origin',
  'not_ready',
  'budget',
  'time',
]);
const DOM_DOC_ID_RE = /^d_[a-z0-9]{4,32}$/;

const KIND_ACTION = Object.freeze({
  click: 'local.browser.dom.click',
  set_input: 'local.browser.dom.set_input',
  select_option: 'local.browser.dom.select_option',
});
const GET_CONTEXT = 'local.browser.dom.get_context';
const INSPECT = 'local.browser.dom.inspect';
const FIND = 'local.browser.dom.find';
const CONTENT_UNAVAILABLE = 'DOM_CONTENT_UNAVAILABLE';
const CROSS_ORIGIN = 'DOM_CROSS_ORIGIN_BLOCKED';

// ─── 인자 검증 (서버 validateDomRunUnitArgs 사본) ─────────────────────────────

const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f-\u009f]/;
function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function isShortText(v, max) {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= max && !CONTROL_CHAR_RE.test(v);
}
function exactKeys(obj, expected) {
  // 객체 키는 중복이 없다 — 개수가 같고 모두 기대 집합 안이면 같은 집합.
  const keys = Object.keys(obj);
  const want = new Set(expected);
  return keys.length === want.size && keys.every((k) => want.has(k));
}
function intIn(v, lo, hi) {
  return typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
}

/** set_input 값 — 단발 set_input 과 같은 규칙(입력 거절 규칙 · 500자) + 비어 있지 않음 · HTML 문자 없음. */
export function isDomUnitText(v) {
  if (typeof v !== 'string' || v.trim().length === 0 || v.length > DOM_INPUT_MAX_LENGTH) return false;
  if (/[<>{}]/.test(v)) return false;
  return validateComputerTextArgs({ text: v }).ok === true;
}

function validateStep(raw) {
  if (!isPlainObject(raw)) return null;
  const kind = raw.kind;
  if (typeof kind !== 'string' || !DOM_UNIT_ACT_KINDS.includes(kind)) return null;
  const valueKey = kind === 'set_input' ? 'text' : kind === 'select_option' ? 'option' : null;
  const value = valueKey ? raw[valueKey] : undefined;
  if (valueKey === 'text' && !isDomUnitText(value)) return null;
  if (valueKey === 'option' && !isShortText(value, DOM_QUERY_VALUE_MAX)) return null;
  const extra = valueKey ? { [valueKey]: value } : {};
  if (raw.op === 'act') {
    if (!exactKeys(raw, ['op', 'kind', 'elementRef', 'snapshotId', ...(valueKey ? [valueKey] : [])])) return null;
    if (!isDomElementRef(raw.elementRef) || !isDomSnapshotId(raw.snapshotId)) return null;
    return { op: 'act', kind, elementRef: raw.elementRef, snapshotId: raw.snapshotId, ...extra };
  }
  if (raw.op === 'find_act') {
    if (!exactKeys(raw, ['op', 'kind', 'query', 'expectNavigated', ...(valueKey ? [valueKey] : [])])) return null;
    if (typeof raw.expectNavigated !== 'boolean') return null;
    const q = validateDomFindQuery(raw.query);
    if (!q.ok) return null;
    return { op: 'find_act', kind, query: q.query, expectNavigated: raw.expectNavigated, ...extra };
  }
  return null;
}

export function validateDomRunUnitArgs(args) {
  if (!isPlainObject(args)) return { ok: false };
  const allowed = ['steps', 'observe', 'maxCommands', 'maxDurationMs', 'docId', 'afterNavigation'];
  if (Object.keys(args).some((k) => !allowed.includes(k))) return { ok: false };
  if (!Array.isArray(args.steps) || args.steps.length > DOM_UNIT_MAX_STEPS) return { ok: false };
  if (typeof args.observe !== 'boolean') return { ok: false };
  if (args.steps.length === 0 && args.observe !== true) return { ok: false };
  if (!intIn(args.maxCommands, 1, DOM_UNIT_MAX_COMMANDS)) return { ok: false };
  if (!intIn(args.maxDurationMs, 1000, DOM_UNIT_MAX_DURATION_MS)) return { ok: false };
  if (args.docId !== undefined && !(typeof args.docId === 'string' && DOM_DOC_ID_RE.test(args.docId))) return { ok: false };
  if (args.afterNavigation !== undefined && typeof args.afterNavigation !== 'boolean') return { ok: false };
  const steps = [];
  for (const raw of args.steps) {
    const s = validateStep(raw);
    if (!s) return { ok: false };
    steps.push(s);
  }
  if (new Set(steps.map((s) => s.op)).size > 1) return { ok: false };
  const out = { steps, observe: args.observe, maxCommands: args.maxCommands, maxDurationMs: args.maxDurationMs };
  if (typeof args.docId === 'string') out.docId = args.docId;
  if (typeof args.afterNavigation === 'boolean') out.afterNavigation = args.afterNavigation;
  return { ok: true, args: out };
}

// ─── 대상 고르기 (서버 workflow-candidate.pickReplayTarget 사본) ───────────────

/** 제어문자 → 공백, 연속 공백 1칸, 앞뒤 공백 제거(서버 normalizeWorkflowText 와 같다). */
export function normalizeWorkflowText(value) {
  if (typeof value !== 'string') return '';
  const cleaned = Array.from(value)
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return code < 0x20 || code === 0x7f ? ' ' : ch;
    })
    .join('');
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * find 결과에서 대상 하나. 찾기 조건(name, 없으면 text)과 **정확히 같은** 요소가 하나면 그것,
 * 같은 것이 없고 결과가 하나뿐이면 그것, 그 밖(없음 · 모호)은 null — 추측하지 않는다.
 */
export function pickUnitTarget(query, matches) {
  const compact = (v) => normalizeWorkflowText(v).replace(/\s+/g, '').toLowerCase();
  const want = compact(query.name ?? query.text);
  const exact = matches.filter((m) => compact(query.name ? m.name : (m.text ?? m.name)) === want);
  if (exact.length === 1) return exact[0];
  if (exact.length === 0 && matches.length === 1) return matches[0];
  return null;
}

/** 고른 요소가 행동과 맞는가 — role · disabled · (click 이면) COMMIT. 단발 경로의 제안 검증과 같은 기준. */
function targetFits(kind, el) {
  if (!el || !isDomElementRef(el.elementRef)) return false;
  if (!DOM_UNIT_KIND_ROLES[kind].includes(el.role)) return false;
  if (el.disabled === true) return false;
  if (kind === 'click' && el.riskLevel === 'COMMIT') return false;
  return true;
}

// ─── 실행 ────────────────────────────────────────────────────────────────────

/**
 * 단위 하나를 실행한다.
 *
 * @param site      등재 사이트 `{ siteId, displayName }`
 * @param args      validateDomRunUnitArgs 를 통과한 인자
 * @param deps.call     `(base, args) => Promise<{ status, errorCode?, data? }>` — 기존 단발 DOM 실행(runDomAction)
 * @param deps.now      시계(테스트 주입)
 * @param deps.sleep    대기(테스트 주입)
 * @param deps.expiresAt 명령 만료 시각(ms) — 없으면 단위 상한만 쓴다
 */
export async function runDomUnit(site, args, deps) {
  const now = deps.now ?? (() => Date.now());
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const startedAt = now();
  const expiry = Number.isFinite(deps.expiresAt) ? deps.expiresAt - DOM_UNIT_EXPIRY_MARGIN_MS : Infinity;
  const deadline = Math.min(startedAt + args.maxDurationMs, expiry);
  let commands = 0;
  let probes = 0;
  const reports = [];
  let stop = null;
  let docId = args.docId;
  let lastNavigated = false;
  const reserve = args.observe ? 2 : 0;

  const call = async (base, a) => deps.call(base, a);
  /** 대기가 시간 안에 끝나는가. 아니면 false(호출자가 time 으로 멈춘다). */
  const settle = async () => {
    if (now() + DOM_UNIT_SETTLE_MS > deadline) return false;
    await sleep(DOM_UNIT_SETTLE_MS);
    return true;
  };

  /**
   * 화면이 다시 쓸 수 있게 될 때까지 get_context 만으로 기다린다(중간 단계 — inspect 하지 않는다).
   * 이동 뒤엔 옛 문서를 받아들이지 않는다(서버 observe 와 같은 규칙). 모든 시도는 probe 로 센다.
   */
  const waitReady = async (afterNavigation) => {
    const attempts = afterNavigation ? DOM_UNIT_OBSERVE_ATTEMPTS_AFTER_NAVIGATION : DOM_UNIT_OBSERVE_ATTEMPTS;
    if (afterNavigation && !(await settle())) return { ok: false, cause: 'time' };
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (attempt > 0 && !(await settle())) return { ok: false, cause: 'time' };
      const c = await call(GET_CONTEXT, {});
      probes += 1;
      if (c.status !== 'success') {
        if (c.errorCode === CONTENT_UNAVAILABLE) continue;
        return { ok: false, cause: c.errorCode === CROSS_ORIGIN ? 'cross_origin' : 'not_ready', errorCode: c.errorCode };
      }
      const d = c.data ?? {};
      if (typeof d.siteId === 'string' && d.siteId !== site.siteId) return { ok: false, cause: 'cross_origin', errorCode: CROSS_ORIGIN };
      if (d.ready !== true) continue;
      if (afterNavigation && docId && d.docId === docId && attempt < attempts - 1) continue;
      if (typeof d.docId === 'string') docId = d.docId;
      return { ok: true };
    }
    return { ok: false, cause: 'not_ready' };
  };

  /** 최종 관찰 — 서버 observe() 와 같은 재시도 · 문서 규칙. 유효 관찰은 명령 2, 대기 probe 는 세지 않는다. */
  const observeFull = async (afterNavigation) => {
    const attempts = afterNavigation ? DOM_UNIT_OBSERVE_ATTEMPTS_AFTER_NAVIGATION : DOM_UNIT_OBSERVE_ATTEMPTS;
    const previousDocId = docId;
    if (afterNavigation && !(await settle())) return { ok: false, errorCode: 'DOM_UNIT_TIME' };
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (attempt > 0 && !(await settle())) return { ok: false, errorCode: 'DOM_UNIT_TIME' };
      if (args.maxCommands - commands < 2) return { ok: false, errorCode: 'DOM_UNIT_BUDGET' };
      const c = await call(GET_CONTEXT, {});
      if (c.status !== 'success') {
        if (c.errorCode === CONTENT_UNAVAILABLE) { probes += 1; continue; }
        return { ok: false, errorCode: c.errorCode };
      }
      const d = c.data ?? {};
      if (typeof d.siteId === 'string' && d.siteId !== site.siteId) return { ok: false, errorCode: CROSS_ORIGIN };
      if (d.ready !== true) { probes += 1; continue; }
      if (afterNavigation && previousDocId && d.docId === previousDocId && attempt < attempts - 1) { probes += 1; continue; }
      const i = await call(INSPECT, {});
      if (i.status !== 'success') {
        if (i.errorCode === CONTENT_UNAVAILABLE) { probes += 2; continue; }
        return { ok: false, errorCode: i.errorCode };
      }
      commands += 2;
      const e = i.data ?? {};
      const elements = Array.isArray(e.elements) ? e.elements : [];
      const observation = {
        siteId: site.siteId,
        path: typeof d.path === 'string' ? d.path : '',
        ready: true,
        elementCount: Number.isInteger(e.elementCount) ? e.elementCount : elements.length,
        elements,
      };
      if (typeof d.docId === 'string') observation.docId = d.docId;
      if (typeof e.snapshotId === 'string') observation.snapshotId = e.snapshotId;
      return { ok: true, observation };
    }
    return { ok: false, errorCode: 'DOM_UNIT_NOT_READY' };
  };

  const actArgs = (step, elementRef, snapshotId) => {
    const a = { elementRef, snapshotId };
    if (step.kind === 'set_input') a.text = step.text;
    if (step.kind === 'select_option') a.option = step.option;
    return a;
  };
  const reportOf = (index, step, r, target) => {
    const d = r.data ?? {};
    const rep = {
      index,
      op: step.op,
      kind: step.kind,
      status: r.status === 'success' ? 'success' : r.status === 'denied' ? 'denied' : 'failed',
    };
    if (typeof r.errorCode === 'string') rep.errorCode = r.errorCode;
    if (typeof d.navigated === 'boolean') rep.navigated = d.navigated;
    if (typeof d.changed === 'boolean') rep.changed = d.changed;
    if (typeof d.riskLevel === 'string') rep.riskLevel = d.riskLevel;
    if (target) {
      const t = trimDomElement(target);
      if (t) rep.target = t;
    }
    return rep;
  };

  for (let index = 0; index < args.steps.length; index += 1) {
    const step = args.steps[index];
    if (now() >= deadline) { stop = { cause: 'time', stepIndex: index }; break; }
    const need = (step.op === 'find_act' ? 2 : 1) + reserve;
    if (args.maxCommands - commands < need) { stop = { cause: 'budget', stepIndex: index }; break; }

    let r;
    let target = null;
    if (step.op === 'act') {
      r = await call(KIND_ACTION[step.kind], actArgs(step, step.elementRef, step.snapshotId));
      commands += 1;
    } else {
      const f = await call(FIND, { query: step.query });
      commands += 1;
      if (f.status !== 'success') {
        stop = { cause: 'find_failed', stepIndex: index };
        if (typeof f.errorCode === 'string') stop.errorCode = f.errorCode;
        break;
      }
      const fd = f.data ?? {};
      const matches = Array.isArray(fd.matches) ? fd.matches : [];
      target = pickUnitTarget(step.query, matches);
      if (!target || !isDomSnapshotId(fd.snapshotId)) { stop = { cause: 'locator_not_found', stepIndex: index }; break; }
      if (!targetFits(step.kind, target)) { stop = { cause: 'validation_rejected', stepIndex: index }; break; }
      r = await call(KIND_ACTION[step.kind], actArgs(step, target.elementRef, fd.snapshotId));
      commands += 1;
    }
    const rep = reportOf(index, step, r, target);
    reports.push(rep);
    if (rep.status !== 'success') {
      lastNavigated = false;
      stop = { cause: 'step_failed', stepIndex: index };
      if (rep.errorCode) stop.errorCode = rep.errorCode;
      break;
    }
    lastNavigated = rep.navigated === true;
    const screenChanged = step.kind === 'click' || rep.navigated === true || rep.changed === true;
    if (step.op === 'find_act' && step.expectNavigated && rep.navigated !== true) {
      stop = { cause: 'expect_mismatch', stepIndex: index };
      break;
    }
    const more = index < args.steps.length - 1;
    if (!more || !screenChanged) continue;
    // ref 단계는 같은 snapshot 의 ref 다 — 화면이 바뀌면 남은 ref 는 더는 유효하지 않다. Assistant 가 다시 본다.
    if (step.op === 'act') { stop = { cause: 'reobserve', stepIndex: index }; break; }
    // find_act 는 다음 단계가 현재 화면에서 다시 찾는다 — 화면이 설 때까지만 기다린다.
    const w = await waitReady(rep.navigated === true);
    if (!w.ok) {
      stop = { cause: w.cause, stepIndex: index };
      if (w.errorCode) stop.errorCode = w.errorCode;
      break;
    }
    lastNavigated = false;
  }

  const data = { siteId: site.siteId, displayName: site.displayName, reports, stop };
  const skipObserve = stop && ['cross_origin', 'time', 'not_ready'].includes(stop.cause);
  if (args.observe && !skipObserve) {
    const afterNavigation = args.steps.length === 0 ? args.afterNavigation === true : lastNavigated;
    const o = await observeFull(afterNavigation);
    if (o.ok) data.observation = o.observation;
    else if (typeof o.errorCode === 'string') data.observeErrorCode = o.errorCode;
  }
  data.commandCount = commands;
  data.probeCount = probes;
  data.durationMs = Math.max(0, Math.round(now() - startedAt));
  // 결과 상한 — 관찰이 너무 크면 관찰만 뺀다(서버가 단발 관찰로 다시 본다).
  if (JSON.stringify(data).length > DOM_RESULT_MAX_BYTES + 16 * 1024) {
    delete data.observation;
    data.observeErrorCode = CONTENT_UNAVAILABLE;
  }
  return { status: 'success', data };
}
