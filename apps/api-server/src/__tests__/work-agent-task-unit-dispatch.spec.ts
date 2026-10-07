/**
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-E-TASK-UNIT-DISPATCH-V1 — 작업 단위 dispatch (V2 §11-2)
 *
 *   A. 경계 — heartbeat `taskUnit` · run_unit 인자 검증 · 결과 화이트리스트(입력값 미반환)
 *   B. runtime 동등성 — 같은 화면 · 같은 계획에서 단발 경로와 단위 경로의 결과(상태 · 인계 · 기록 · 예산 계산)가 같다
 *      (검색 · 배치 · 재생 · COMMIT · 자격 · 다른 사이트 · 모호 · 이동 불일치)
 *   C. 왕복 — 단위 경로가 서버↔노드 명령 왕복을 줄인다 · capability 없음/형상 거절이면 단발 경로 · 전송 상실이면 다시 보내지 않는다
 *   D. 왕복/시간 비교 — 명령당 노드 측 지연을 둔 같은 시나리오의 단발 vs 단위 (CHECK 수치)
 *
 * 노드는 TS 페이지 시뮬레이터다 — 단발 DOM 명령에 답하고, run_unit 은 agent `browser-dom-unit.mjs` 의 단계 loop 와 같은 규칙
 * (단계별 검증 · 화면 변화 시 ref 단계 중단 · find_act 재탐색 · 예상 이동 불일치 · 이동 뒤 대기 · 최종 관찰)으로 같은 단발 처리기를
 * **노드 안에서** 부른다(왕복 없음). agent 단위 loop 자체의 검증은 agent `test/browser-dom-unit.test.mjs` 가 본다.
 */

jest.setTimeout(60_000);

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import logger from '../utils/logger.js';
import {
  LOCAL_AGENT_ACTIONS,
  parseLocalAction,
  pickSafeResultData,
  validateLocalCommandArgs,
} from '../services/local-agent/local-agent-protocol.js';
import { DOM_UNIT_KIND_ROLES, DOM_UNIT_MAX_STEPS } from '../services/local-agent/browser-dom-contract.js';
import { runWorkAgent, type WorkPlanner, type PlannerInput, type WorkAgentRunResult } from '../services/ai-tools/work-agent-runtime.js';
import type { VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import { parseHeartbeatReport, submitCommandResult } from '../services/local-agent/local-agent-service.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

const SITE = 'healthkr';
const ctx = (): VerifiedToolContext => ({ userId: 'user-1', workspace: 'home', localAgentStatus: 'connected', localDeviceId: 'dev-1' });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─── 페이지 시뮬레이터 ──────────────────────────────────────────────────────────

interface SimEl {
  role: string;
  name: string;
  /** click → 이 path 로 이동(같은 사이트). 'external' 이면 다른 사이트로 넘어간다. */
  to?: string;
  /** click 하면 화면 안 내용만 바뀐다(이동 없음). */
  changes?: boolean;
  commit?: boolean;
  credential?: boolean;
}
type Pages = Record<string, SimEl[]>;
type Reply = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: Record<string, unknown> };

const HOME: SimEl[] = [
  { role: 'heading', name: '약학정보원' },
  { role: 'searchbox', name: '약물의 제품명 또는 성분명을 입력하세요.' },
  { role: 'button', name: '검 색', to: '/searchDrug/search_total_result.asp' },
  { role: 'link', name: '식별검색', to: '/ident' },
  { role: 'button', name: '주문하기', commit: true },
  { role: 'textbox', name: '비밀번호', credential: true },
  { role: 'link', name: '외부 안내', to: 'external' },
  { role: 'button', name: '상세', changes: true },
  { role: 'button', name: '상세' },
  { role: 'combobox', name: '구분' },
];
const PAGES: Pages = {
  '/': HOME,
  '/searchDrug/search_total_result.asp': [{ role: 'heading', name: '검색결과 리스트 ( 2개 )' }, { role: 'table', name: '' }],
  '/ident': [{ role: 'heading', name: '식별검색' }],
};

class SimSite {
  path = '/';
  doc = 1;
  snap = 0;
  external = false;
  /** 노드에서 실제로 실행된 행동(클릭 · 입력 · 선택) — 같은 행동이 두 번 실행되지 않았는지 본다. */
  executed: string[] = [];
  constructor(private pages: Pages) {}

  private els(): SimEl[] {
    return this.pages[this.path] ?? [];
  }
  private toWire(el: SimEl, i: number) {
    return { elementRef: `e_${i + 1}`, role: el.role, name: el.name, ...(el.commit ? { riskLevel: 'COMMIT' } : {}) };
  }
  private byRef(ref: unknown): SimEl | null {
    const m = /^e_(\d+)$/.exec(String(ref));
    return m ? this.els()[Number(m[1]) - 1] ?? null : null;
  }
  private ok(data: Record<string, unknown>): Reply {
    return { status: 'success', data: { siteId: SITE, ...data } };
  }

  /** 단발 DOM 명령 하나(서버에서 오든, 단위 안에서 노드가 부르든 같은 처리). */
  single(base: string, args: Record<string, unknown>): Reply {
    if (this.external) return { status: 'failed', errorCode: 'DOM_CROSS_ORIGIN_BLOCKED' };
    if (base === 'get_context') return this.ok({ active: true, ready: true, path: this.path, docId: `d_doc${this.doc}` });
    if (base === 'inspect') {
      const elements = this.els().map((e, i) => this.toWire(e, i));
      return this.ok({ snapshotId: `s_snap${++this.snap}`, elements, elementCount: elements.length });
    }
    if (base === 'find') {
      const q = (args.query ?? {}) as { role?: string; name?: string; text?: string };
      const matches = this.els()
        .map((e, i) => ({ e, i }))
        .filter(({ e }) => (!q.role || e.role === q.role) && (q.name === undefined || e.name === q.name) && (q.text === undefined || e.name === q.text))
        .map(({ e, i }) => this.toWire(e, i));
      return this.ok({ snapshotId: `s_snap${++this.snap}`, matches });
    }
    const el = this.byRef(args.elementRef);
    if (!el) return { status: 'failed', errorCode: 'DOM_ELEMENT_NOT_FOUND' };
    if (base === 'set_input') {
      if (el.credential) return { status: 'failed', errorCode: 'DOM_USER_ACTION_REQUIRED' };
      this.executed.push(`set_input:${el.name}`);
      return this.ok({ elementRef: args.elementRef, hasValue: true });
    }
    if (base === 'select_option') {
      this.executed.push(`select_option:${el.name}`);
      return this.ok({ elementRef: args.elementRef, changed: true });
    }
    if (base === 'click') {
      if (el.commit) return { status: 'failed', errorCode: 'DOM_ACTION_NOT_ALLOWED' };
      this.executed.push(`click:${el.name}`);
      if (el.to === 'external') {
        this.external = true;
        return this.ok({ elementRef: args.elementRef, navigated: true, changed: true, role: el.role, riskLevel: 'REVERSIBLE' });
      }
      if (el.to) {
        this.path = el.to;
        this.doc += 1;
        return this.ok({ elementRef: args.elementRef, navigated: true, changed: true, role: el.role, riskLevel: 'REVERSIBLE' });
      }
      return this.ok({ elementRef: args.elementRef, navigated: false, changed: el.changes === true, role: el.role, riskLevel: 'REVERSIBLE' });
    }
    return { status: 'failed', errorCode: 'DOM_ACTION_NOT_ALLOWED' };
  }
}

/**
 * run_unit — agent `executeDomUnit` 와 같은 규칙의 간이 사본. 단발 처리기를 노드 안에서 부른다.
 * `localMs` 는 노드 안 명령 하나의 실행 시간, `settleMs` 는 이동 뒤 대기(agent DOM_UNIT_SETTLE_MS).
 */
async function simUnit(site: SimSite, args: Record<string, any>, timing: { localMs: number; settleMs: number }): Promise<Reply> {
  const call = async (base: string, a: Record<string, unknown>) => {
    if (timing.localMs) await sleep(timing.localMs);
    return site.single(base, a);
  };
  let commands = 0;
  let lastNavigated = false;
  const reports: Record<string, unknown>[] = [];
  let stop: Record<string, unknown> | null = null;
  const reserve = args.observe ? 2 : 0;
  const waitReady = async (afterNavigation: boolean) => {
    if (afterNavigation) await sleep(timing.settleMs);
    const c = await call('get_context', {});
    if (c.status !== 'success') return { ok: false, cause: c.errorCode === 'DOM_CROSS_ORIGIN_BLOCKED' ? 'cross_origin' : 'not_ready', errorCode: c.errorCode };
    return { ok: true };
  };
  for (let index = 0; index < args.steps.length; index += 1) {
    const step = args.steps[index];
    const need = (step.op === 'find_act' ? 2 : 1) + reserve;
    if (args.maxCommands - commands < need) { stop = { cause: 'budget', stepIndex: index }; break; }
    const extra = step.kind === 'set_input' ? { text: step.text } : step.kind === 'select_option' ? { option: step.option } : {};
    let r: Reply;
    let target: Record<string, unknown> | null = null;
    if (step.op === 'act') {
      r = await call(step.kind, { elementRef: step.elementRef, snapshotId: step.snapshotId, ...extra });
      commands += 1;
    } else {
      const f = await call('find', { query: step.query });
      commands += 1;
      if (f.status !== 'success') { stop = { cause: 'find_failed', stepIndex: index, ...(f.errorCode ? { errorCode: f.errorCode } : {}) }; break; }
      const matches = (f.data?.matches ?? []) as Record<string, unknown>[];
      const want = String(step.query.name ?? step.query.text).replace(/\s+/g, '');
      const exact = matches.filter((m) => String(m.name).replace(/\s+/g, '') === want);
      target = exact.length === 1 ? exact[0] : exact.length === 0 && matches.length === 1 ? matches[0] : null;
      if (!target) { stop = { cause: 'locator_not_found', stepIndex: index }; break; }
      if (!DOM_UNIT_KIND_ROLES[step.kind].includes(String(target.role)) || (step.kind === 'click' && target.riskLevel === 'COMMIT')) {
        stop = { cause: 'validation_rejected', stepIndex: index };
        break;
      }
      r = await call(step.kind, { elementRef: target.elementRef, snapshotId: f.data?.snapshotId, ...extra });
      commands += 1;
    }
    const d = r.data ?? {};
    const rep: Record<string, unknown> = { index, op: step.op, kind: step.kind, status: r.status };
    if (r.errorCode) rep.errorCode = r.errorCode;
    for (const k of ['navigated', 'changed', 'riskLevel']) if (d[k] !== undefined) rep[k] = d[k];
    if (target) rep.target = target;
    reports.push(rep);
    if (r.status !== 'success') { lastNavigated = false; stop = { cause: 'step_failed', stepIndex: index, ...(r.errorCode ? { errorCode: r.errorCode } : {}) }; break; }
    lastNavigated = d.navigated === true;
    const changed = step.kind === 'click' || d.navigated === true || d.changed === true;
    if (step.op === 'find_act' && step.expectNavigated && d.navigated !== true) { stop = { cause: 'expect_mismatch', stepIndex: index }; break; }
    if (index === args.steps.length - 1 || !changed) continue;
    if (step.op === 'act') { stop = { cause: 'reobserve', stepIndex: index }; break; }
    const w = await waitReady(d.navigated === true);
    if (!w.ok) { stop = { cause: w.cause, stepIndex: index, ...(w.errorCode ? { errorCode: w.errorCode } : {}) }; break; }
    lastNavigated = false;
  }
  const data: Record<string, unknown> = { siteId: SITE, reports, stop };
  const skip = stop && ['cross_origin', 'time', 'not_ready'].includes(String(stop.cause));
  if (args.observe && !skip) {
    const afterNavigation = args.steps.length === 0 ? args.afterNavigation === true : lastNavigated;
    if (afterNavigation) await sleep(timing.settleMs);
    if (args.maxCommands - commands < 2) data.observeErrorCode = 'DOM_UNIT_BUDGET';
    else {
      const c = await call('get_context', {});
      if (c.status !== 'success') data.observeErrorCode = c.errorCode;
      else {
        const i = await call('inspect', {});
        commands += 2;
        data.observation = { siteId: SITE, path: c.data?.path, docId: c.data?.docId, ready: true, snapshotId: i.data?.snapshotId, elements: i.data?.elements, elementCount: i.data?.elementCount };
      }
    }
  }
  data.commandCount = commands;
  data.probeCount = 0;
  return { status: 'success', data };
}

// ─── 노드 구동 ──────────────────────────────────────────────────────────────────

interface NodeOpts {
  /** run_unit 응답을 바꾼다(형상 거절 · 전송 상실 · 예산 멈춤 등). null 이면 시뮬레이터. */
  unitOverride?: (args: Record<string, any>, n: number) => Reply | null;
  matchReply?: Record<string, unknown>;
  /** 서버↔노드 명령 왕복 하나에 더하는 지연(노드 polling · 네트워크 모사). */
  rtLatencyMs?: number;
  localMs?: number;
  settleMs?: number;
}
interface Seen { base: string; args: Record<string, any> }

async function drive(db: LocalAgentDb, site: SimSite, opts: NodeOpts, done: () => boolean) {
  const seen: Seen[] = [];
  let k = 0;
  let units = 0;
  for (;;) {
    for (let i = 0; i < 400 && db.commands.length <= k && !done(); i += 1) await sleep(5);
    const cmd = db.commands[k];
    if (!cmd) break;
    k += 1;
    const base = parseLocalAction(String(cmd.action)).base.replace('local.browser.dom.', '');
    const args = cmd.result_data ? JSON.parse(String(cmd.result_data)) : {};
    const submit = (r: Reply) => submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, ...r } as any);
    if (base === 'local.target.prepare') {
      await submit({ status: 'success', data: { targetId: SITE, targetType: 'browser_site', state: 'ready', reusedExisting: true, openedByO4O: false, tabCount: 1, path: '/' } });
      continue;
    }
    if (base === LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_MATCH) { await submit({ status: 'success', data: opts.matchReply ?? { matched: false } }); continue; }
    if (base === LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_SAVE) { await submit({ status: 'success', data: { saved: true, candidateId: 'wc_saved01', candidateStatus: 'active' } }); continue; }
    if (base === LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_RESULT) { await submit({ status: 'success', data: { saved: true, candidateId: String(args.candidateId), candidateStatus: 'active' } }); continue; }
    if (base.startsWith('local.data.')) { await submit({ status: 'success', data: { runId: 'r_test', runStatus: 'active', saved: true } }); continue; }
    seen.push({ base, args });
    if (opts.rtLatencyMs) await sleep(opts.rtLatencyMs);
    if (base === 'run_unit') {
      units += 1;
      const o = opts.unitOverride?.(args, units) ?? null;
      await submit(o ?? (await simUnit(site, args, { localMs: opts.localMs ?? 0, settleMs: opts.settleMs ?? 0 })));
      continue;
    }
    if (opts.localMs) await sleep(opts.localMs);
    await submit(site.single(base, args));
  }
  return seen;
}

function scripted(proposals: unknown[]): WorkPlanner & { calls: PlannerInput[] } {
  const calls: PlannerInput[] = [];
  let i = 0;
  return {
    kind: 'scripted',
    calls,
    async plan(input) {
      calls.push(input);
      const p = proposals[Math.min(i, proposals.length - 1)];
      i += 1;
      return p;
    },
  };
}

interface Outcome {
  result: WorkAgentRunResult;
  seen: Seen[];
  site: SimSite;
  ms: number;
  dispatch: Record<string, unknown> | null;
}

async function run(request: string, proposals: unknown[], taskUnit: boolean, opts: NodeOpts = {}): Promise<Outcome> {
  (logger.info as jest.Mock).mockClear();
  const db = makeDb();
  await pairAndRegister(db);
  await connected(db);
  for (const d of db.devices) d.capabilities = { browser: true, windowsUia: false, localData: true, ownerScopedLedger: false, taskUnit };
  const site = new SimSite(PAGES);
  let finished = false;
  const t0 = Date.now();
  const [result, seen] = await Promise.all([
    runWorkAgent(db.dataSource, ctx(), { request }, scripted(proposals)).finally(() => { finished = true; }),
    drive(db, site, opts, () => finished),
  ]);
  const ms = Date.now() - t0;
  const log = (logger.info as jest.Mock).mock.calls.find((c) => c[0] === 'work-agent dispatch');
  return { result, seen, site, ms, dispatch: log ? (log[1] as Record<string, unknown>) : null };
}

/** 두 경로가 같아야 하는 것 — 결과 상태 · 인계 · 오류 · 예산 계산 · 행동 기록 · 재생 요약 · 노드에서 실제로 실행된 행동. */
function essence(o: Outcome) {
  const r = o.result;
  return {
    ok: r.ok,
    errorCode: r.errorCode ?? null,
    goal: r.goal.status,
    progress: r.progress,
    takeover: r.takeover?.reason ?? null,
    stepCount: r.stepCount,
    aiPlanCount: r.aiPlanCount,
    path: r.path,
    history: r.history.map((h) => ({ kind: h.action.kind, status: h.status, errorCode: h.errorCode ?? null })),
    workflow: r.workflow ?? null,
    executed: o.site.executed,
  };
}
const domRT = (o: Outcome) => o.seen.length;
const units = (o: Outcome) => o.seen.filter((s) => s.base === 'run_unit').length;

const takeoverDone = { assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } };
const SEARCH_PLAN = [
  { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: '타이레놀' } },
  { assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } },
  takeoverDone,
];
const BATCH_PLAN = [
  {
    assessment: 'progress',
    action: { kind: 'set_input', elementRef: 'e_2', text: '타이레놀' },
    actions: [{ kind: 'set_input', elementRef: 'e_2', text: '타이레놀' }, { kind: 'click', elementRef: 'e_3' }],
  },
  takeoverDone,
];
const replayOf = (steps: Record<string, unknown>[]) => ({ matched: true, candidateId: 'wc_replay01', steps });
const R_INPUT = { actionKind: 'set_input', locator: { role: 'searchbox', name: '약물의 제품명 또는 성분명을 입력하세요.' }, value: '아스피린', expect: { navigated: false, changed: false } };
const R_SEARCH = { actionKind: 'click', locator: { role: 'button', name: '검 색' }, expect: { navigated: true, changed: true } };
const REQ = '약학정보원에서 아스피린 검색해줘';

async function both(request: string, proposals: unknown[], opts: NodeOpts = {}) {
  const single = await run(request, proposals, false, opts);
  const unit = await run(request, proposals, true, opts);
  return { single, unit };
}

// ─── A. 경계 ────────────────────────────────────────────────────────────────────

describe('A. 경계 — capability · 인자 · 결과 화이트리스트', () => {
  it('heartbeat taskUnit — 없으면 false(Phase D 에이전트) · boolean 이 아니면 보고 전체를 버린다', () => {
    const base = { browser: true, windowsUia: false, localData: true, ownerScopedLedger: true };
    expect(parseHeartbeatReport({ agentVersion: '0.2.0', capabilities: base })?.capabilities.taskUnit).toBe(false);
    expect(parseHeartbeatReport({ agentVersion: '0.3.0', capabilities: { ...base, taskUnit: true } })?.capabilities.taskUnit).toBe(true);
    expect(parseHeartbeatReport({ agentVersion: '0.3.0', capabilities: { ...base, taskUnit: 'yes' } })).toBeNull();
  });

  it('run_unit 인자 — 형상 · 상한 · op 혼합 · 입력 거절 값은 단계 하나도 통과하지 않는다', () => {
    const v = (a: unknown) => validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.DOM_RUN_UNIT, a).ok;
    const act = { op: 'act', kind: 'click', elementRef: 'e_3', snapshotId: 's_snap1' };
    const fa = { op: 'find_act', kind: 'click', query: { role: 'button', name: '검 색' }, expectNavigated: true };
    const ok = { steps: [act], observe: true, maxCommands: 10, maxDurationMs: 5000 };
    expect(v(ok)).toBe(true);
    expect(v({ steps: [], observe: true, maxCommands: 2, maxDurationMs: 5000, afterNavigation: true })).toBe(true);
    expect(v({ ...ok, steps: [], observe: false })).toBe(false); // 아무것도 안 하는 단위
    expect(v({ ...ok, steps: [act, fa] })).toBe(false); // op 혼합
    expect(v({ ...ok, steps: Array(DOM_UNIT_MAX_STEPS + 1).fill(act) })).toBe(false);
    expect(v({ ...ok, maxCommands: 61 })).toBe(false);
    expect(v({ ...ok, maxDurationMs: 30001 })).toBe(false);
    expect(v({ ...ok, workflow: 'x' })).toBe(false); // 절차 · 목적 같은 키는 받지 않는다
    expect(v({ ...ok, steps: [{ ...act, url: 'https://x' }] })).toBe(false);
    expect(v({ ...ok, steps: [{ op: 'act', kind: 'set_input', elementRef: 'e_2', snapshotId: 's_snap1', text: '<script>' }] })).toBe(false);
    expect(v({ ...ok, steps: [{ op: 'act', kind: 'submit', elementRef: 'e_2', snapshotId: 's_snap1' }] })).toBe(false);
  });

  it('run_unit 결과 — 입력값 · 찾기 조건은 돌아오지 않고 알 수 없는 멈춤 원인은 버린다', () => {
    const safe = pickSafeResultData(LOCAL_AGENT_ACTIONS.DOM_RUN_UNIT, {
      siteId: SITE,
      text: '타이레놀',
      query: { name: 'x' },
      reports: [{ index: 0, op: 'act', kind: 'set_input', status: 'success', text: '타이레놀', value: '타이레놀' }],
      stop: { cause: 'whatever' },
      commandCount: 3,
    }) as Record<string, unknown>;
    expect(JSON.stringify(safe)).not.toContain('타이레놀');
    expect(safe.query).toBeUndefined();
    expect(safe.stop).toBeNull();
    expect(safe.reports).toEqual([{ index: 0, op: 'act', kind: 'set_input', status: 'success' }]);
  });
});

// ─── B. 동등성 ──────────────────────────────────────────────────────────────────

describe('B. 단발 ≡ 단위 — 판단 지점 · 안전 경계 · 기록이 같다', () => {
  it('AI 검색(입력 → 검색 → 완료 확인)', async () => {
    const { single, unit } = await both('약학정보원에서 타이레놀 검색해줘', SEARCH_PLAN);
    expect(single.result.goal.status).toBe('completed');
    expect(essence(unit)).toEqual(essence(single));
    expect(units(single)).toBe(0);
    expect(units(unit)).toBeGreaterThan(0);
  });

  it('Fast Loop 배치(입력+검색 한 계획)', async () => {
    const { single, unit } = await both('약학정보원에서 타이레놀 검색해줘', BATCH_PLAN);
    expect(single.result.goal.status).toBe('completed');
    expect(essence(unit)).toEqual(essence(single));
  });

  it('배치 중 화면이 바뀌면 남은 ref 행동은 실행하지 않고 Assistant 가 다시 본다', async () => {
    const plan = [
      {
        assessment: 'progress', action: { kind: 'click', elementRef: 'e_8' },
        actions: [{ kind: 'click', elementRef: 'e_8' }, { kind: 'set_input', elementRef: 'e_2', text: '타이레놀' }],
      },
      takeoverDone,
    ];
    const { single, unit } = await both('약학정보원에서 타이레놀 검색해줘', plan);
    expect(essence(unit)).toEqual(essence(single));
    expect(unit.site.executed).toEqual(['click:상세']); // 입력은 실행되지 않았다
  });

  it('결정론적 재생(찾기+입력 → 찾기+검색) — Planner 는 완료 확인 1회', async () => {
    const opts = { matchReply: replayOf([R_INPUT, R_SEARCH]) };
    const { single, unit } = await both(REQ, [takeoverDone], opts);
    expect(single.result.workflow?.replay).toBe('completed');
    expect(single.result.workflow?.replayedSteps).toBe(2);
    expect(single.result.aiPlanCount).toBe(1);
    expect(essence(unit)).toEqual(essence(single));
  });

  it('COMMIT 대상 — 노드는 누르지 않고 멈춘다(재생 validation_rejected → AI 가 이어받음)', async () => {
    const opts = { matchReply: replayOf([R_INPUT, { actionKind: 'click', locator: { role: 'button', name: '주문하기' }, expect: { navigated: true, changed: true } }]) };
    const { single, unit } = await both('약학정보원에서 아스피린 주문해줘', [takeoverDone], opts);
    expect(single.result.workflow?.replay).toBe('diverged');
    expect(essence(unit)).toEqual(essence(single));
    expect(unit.site.executed).not.toContain('click:주문하기');
  });

  it('COMMIT 은 노드 실행기에서도 막힌다 — 실패 보고 그대로 같은 인계', async () => {
    // 서버 검증을 지나 노드까지 간 경우(관찰에 COMMIT 표시가 없던 요소)를 모사: 노드 click 이 DOM_ACTION_NOT_ALLOWED.
    const pages: Pages = { ...PAGES, '/': HOME.map((e) => (e.name === '주문하기' ? { role: 'button', name: '확인', commit: true } : e)) };
    const plan = [{ assessment: 'progress', action: { kind: 'click', elementRef: 'e_5' } }, takeoverDone];
    const runOn = async (taskUnit: boolean) => {
      (logger.info as jest.Mock).mockClear();
      const db = makeDb();
      await pairAndRegister(db);
      await connected(db);
      for (const d of db.devices) d.capabilities = { browser: true, windowsUia: false, localData: true, ownerScopedLedger: false, taskUnit };
      const site = new SimSite(pages);
      // 관찰에는 COMMIT 표시를 싣지 않는다(서버 사전 거절을 피해 노드 안전층을 본다).
      const orig = site.single.bind(site);
      site.single = (b, a) => {
        const r = orig(b, a);
        if (b === 'inspect' && r.data) r.data.elements = (r.data.elements as Record<string, unknown>[]).map(({ riskLevel: _r, ...rest }) => rest);
        return r;
      };
      let finished = false;
      const [result, seen] = await Promise.all([
        runWorkAgent(db.dataSource, ctx(), { request: '약학정보원에서 확인 눌러줘' }, scripted(plan)).finally(() => { finished = true; }),
        drive(db, site, {}, () => finished),
      ]);
      return { result, seen, site, ms: 0, dispatch: null } as Outcome;
    };
    const single = await runOn(false);
    const unit = await runOn(true);
    expect(single.result.history.some((h) => h.errorCode === 'DOM_ACTION_NOT_ALLOWED')).toBe(true);
    expect(essence(unit)).toEqual(essence(single));
    expect(unit.site.executed).toEqual([]);
  });

  it('자격(비밀번호) — 노드가 멈추고 사용자에게 넘긴다(credential_required)', async () => {
    const opts = { matchReply: replayOf([{ actionKind: 'set_input', locator: { role: 'textbox', name: '비밀번호' }, value: '아스피린', expect: { navigated: false, changed: false } }]) };
    const { single, unit } = await both(REQ, [takeoverDone], opts);
    expect(single.result.takeover?.reason).toBe('credential_required');
    expect(essence(unit)).toEqual(essence(single));
  });

  it('다른 사이트로 넘어가면 멈춘다(cross_origin) — 다음 단계 없이 사용자에게 인계', async () => {
    const opts = { matchReply: replayOf([{ actionKind: 'click', locator: { role: 'link', name: '외부 안내' }, expect: { navigated: true, changed: true } }, R_INPUT]) };
    const { single, unit } = await both(REQ, [takeoverDone], opts);
    expect(single.result.takeover?.reason).toBe('site_not_ready');
    expect(essence(unit)).toEqual(essence(single));
    expect(unit.site.executed).toEqual(['click:외부 안내']); // 다음 단계(입력)는 실행되지 않았다
  });

  it('대상이 모호하면(같은 이름 2개) 고르지 않는다 — locator_not_found', async () => {
    const opts = { matchReply: replayOf([R_INPUT, { actionKind: 'click', locator: { role: 'button', name: '상세' }, expect: { navigated: false, changed: true } }]) };
    const { single, unit } = await both(REQ, [takeoverDone], opts);
    expect(single.result.workflow?.replay).toBe('diverged');
    expect(essence(unit)).toEqual(essence(single));
    expect(unit.site.executed).toEqual(['set_input:약물의 제품명 또는 성분명을 입력하세요.']);
  });

  it('저장 때 이동했던 단계가 이번엔 이동하지 않으면 멈춘다 — expect_mismatch', async () => {
    const opts = { matchReply: replayOf([{ actionKind: 'click', locator: { role: 'button', name: '검 색' }, expect: { navigated: true, changed: true } }, R_INPUT]) };
    const pages: Pages = { ...PAGES, '/': HOME.map((e) => (e.name === '검 색' ? { role: 'button', name: '검 색', changes: true } : e)) };
    const runOn = async (taskUnit: boolean) => {
      const db = makeDb();
      await pairAndRegister(db);
      await connected(db);
      for (const d of db.devices) d.capabilities = { browser: true, windowsUia: false, localData: true, ownerScopedLedger: false, taskUnit };
      const site = new SimSite(pages);
      let finished = false;
      const [result, seen] = await Promise.all([
        runWorkAgent(db.dataSource, ctx(), { request: REQ }, scripted([takeoverDone])).finally(() => { finished = true; }),
        drive(db, site, opts, () => finished),
      ]);
      return { result, seen, site, ms: 0, dispatch: null } as Outcome;
    };
    const single = await runOn(false);
    const unit = await runOn(true);
    expect(single.result.workflow?.replay).toBe('diverged');
    expect(essence(unit)).toEqual(essence(single));
    expect(unit.site.executed).toEqual(['click:검 색']);
  });
});

// ─── C. 왕복 · 호환 · 상실 ────────────────────────────────────────────────────────

describe('C. 왕복 감소 · 호환 · 전송 상실', () => {
  it('왕복 수 — 검색 6→3 · 배치 6→2 · 재생 8→2 (dispatch 로그에 같은 수)', async () => {
    const s = await both('약학정보원에서 타이레놀 검색해줘', SEARCH_PLAN);
    const b = await both('약학정보원에서 타이레놀 검색해줘', BATCH_PLAN);
    const r = await both(REQ, [takeoverDone], { matchReply: replayOf([R_INPUT, R_SEARCH]) });
    expect([domRT(s.single), domRT(s.unit)]).toEqual([6, 3]);
    expect([domRT(b.single), domRT(b.unit)]).toEqual([6, 2]);
    expect([domRT(r.single), domRT(r.unit)]).toEqual([8, 2]);
    expect(r.unit.dispatch).toEqual({ roundTrips: 2, unitDispatches: 2, stepCount: r.unit.result.stepCount, taskUnit: true });
    expect(r.single.dispatch).toEqual({ roundTrips: 8, unitDispatches: 0, stepCount: r.single.result.stepCount, taskUnit: false });
  });

  it('taskUnit 이 없는 노드(Phase D 에이전트)는 단발 명령만 받는다', async () => {
    const o = await run(REQ, [takeoverDone], false, { matchReply: replayOf([R_INPUT, R_SEARCH]) });
    expect(o.seen.map((x) => x.base)).toEqual(['get_context', 'inspect', 'find', 'set_input', 'find', 'click', 'get_context', 'inspect']);
  });

  it('노드가 단위 형상을 거절하면(denied — 실행 없음) 같은 일을 단발로 하고 이번 run 에선 다시 보내지 않는다', async () => {
    const opts: NodeOpts = { unitOverride: () => ({ status: 'denied', errorCode: 'LOCAL_ACTION_NOT_ALLOWED' }) };
    const single = await run('약학정보원에서 타이레놀 검색해줘', SEARCH_PLAN, false);
    const unit = await run('약학정보원에서 타이레놀 검색해줘', SEARCH_PLAN, true, opts);
    expect(units(unit)).toBe(1);
    expect(essence(unit)).toEqual(essence(single));
  });

  it('단위 결과를 잃으면(만료) 다시 보내지 않는다 — 지금 화면을 보고 Assistant 가 이어간다', async () => {
    // 두 번째 단위(입력)가 노드에서 실행된 뒤 결과가 사라진 경우.
    let site: SimSite | null = null;
    const opts: NodeOpts = {
      unitOverride: (args, n) => {
        if (n !== 2) return null;
        site!.single('set_input', { elementRef: args.steps[0].elementRef, text: args.steps[0].text });
        return { status: 'failed', errorCode: 'LOCAL_COMMAND_EXPIRED' };
      },
    };
    (logger.info as jest.Mock).mockClear();
    const db = makeDb();
    await pairAndRegister(db);
    await connected(db);
    for (const d of db.devices) d.capabilities = { browser: true, windowsUia: false, localData: true, ownerScopedLedger: false, taskUnit: true };
    site = new SimSite(PAGES);
    let finished = false;
    const plan = [SEARCH_PLAN[0], SEARCH_PLAN[1], takeoverDone];
    const [result, seen] = await Promise.all([
      runWorkAgent(db.dataSource, ctx(), { request: '약학정보원에서 타이레놀 검색해줘' }, scripted(plan)).finally(() => { finished = true; }),
      drive(db, site, opts, () => finished),
    ]);
    expect(seen.filter((s) => s.base === 'run_unit')).toHaveLength(2); // 관찰 단위 · 잃은 입력 단위 — 그 뒤는 단발
    expect(seen.slice(2).map((s) => s.base)).toEqual(['get_context', 'inspect', 'click', 'get_context', 'inspect']);
    expect(site.executed.filter((x) => x.startsWith('set_input'))).toHaveLength(1); // 입력은 한 번만
    expect(result.goal.status).toBe('completed');
  });

  it('노드 예산 멈춤 — 행동을 더 하지 않고 loop 한도로 인계한다', async () => {
    const opts: NodeOpts = {
      unitOverride: (_a, n) => (n === 2 ? { status: 'success', data: { siteId: SITE, reports: [], stop: { cause: 'budget', stepIndex: 0 }, commandCount: 0 } } : null),
    };
    const o = await run('약학정보원에서 타이레놀 검색해줘', SEARCH_PLAN, true, opts);
    expect(o.result.takeover?.reason).toBe('loop_limit');
    expect(o.site.executed).toEqual([]);
  });

  it('노드 시간 멈춤(재생) — 재생을 멈추고 지금 화면에서 AI 가 이어받는다', async () => {
    const opts: NodeOpts = {
      matchReply: replayOf([R_INPUT, R_SEARCH]),
      unitOverride: (_a, n) => (n === 2 ? { status: 'success', data: { siteId: SITE, reports: [], stop: { cause: 'time', stepIndex: 0 }, commandCount: 0, observeErrorCode: 'DOM_UNIT_TIME' } } : null),
    };
    const o = await run(REQ, [takeoverDone], true, opts);
    expect(o.result.workflow?.replay).toBe('diverged');
    expect(o.result.goal.status).toBe('completed'); // Planner 가 새 관찰을 보고 판단
    expect(o.seen.map((s) => s.base)).toEqual(['run_unit', 'run_unit', 'run_unit']); // 관찰 · 재생(멈춤) · 새 관찰
  });
});

// ─── D. 왕복 / 시간 비교 ──────────────────────────────────────────────────────────

describe('D. 왕복 · 시간 비교 (명령당 노드 지연 모사)', () => {
  it('같은 시나리오에서 단위 경로가 왕복 · 시간을 줄인다', async () => {
    // rtLatencyMs: 노드가 명령을 가져가고 결과를 올리기까지의 지연(서버 결과 polling 250ms 는 runtime 그대로).
    // localMs: 노드 안 DOM 명령 하나의 실행 시간 · settleMs: 이동 뒤 대기(서버 · 노드 모두 700ms).
    const timing: NodeOpts = { rtLatencyMs: 150, localMs: 20, settleMs: 700 };
    const rows: Record<string, unknown>[] = [];
    for (const [name, req, plan, extra] of [
      ['AI 검색(3 계획)', '약학정보원에서 타이레놀 검색해줘', SEARCH_PLAN, {}],
      ['AI 배치(2 계획)', '약학정보원에서 타이레놀 검색해줘', BATCH_PLAN, {}],
      ['재생 2단계', REQ, [takeoverDone], { matchReply: replayOf([R_INPUT, R_SEARCH]) }],
    ] as const) {
      const single = await run(req, plan as unknown[], false, { ...timing, ...extra });
      const unit = await run(req, plan as unknown[], true, { ...timing, ...extra });
      expect(essence(unit)).toEqual(essence(single));
      expect(domRT(unit)).toBeLessThan(domRT(single));
      expect(unit.ms).toBeLessThan(single.ms);
      rows.push({ name, rtSingle: domRT(single), rtUnit: domRT(unit), msSingle: single.ms, msUnit: unit.ms });
    }
    // CHECK 문서 수치용 — 실행 환경에 따라 ms 는 달라진다(왕복 수는 고정).
    // eslint-disable-next-line no-console
    console.log('PHASE-E RT/TIME', JSON.stringify(rows));
  });
});
