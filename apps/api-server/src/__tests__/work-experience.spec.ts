/**
 * WO-O4O-AUTOMATION-LOCAL-EXPERIENCE-MINIMUM-STORAGE-V1 — Phase 1 Local Experience 최소 저장
 *
 *   A. 순수 규칙 — 단계 · 수단 · 원인 층 · Outcome 매핑 · locator 값 차단
 *   B. protocol 경계 — local.data.work_run_experience_record 검증기(정해진 키 · enum · 정수 · 등재 대상 · runId 형식)
 *   C. runtime — 성공 / runtime 실패 / QUESTION→재개 / 재생 이탈 run 이 구조화 Experience 를 한 번 쓴다.
 *      민감 원문(요청 · 입력값 · 답변 · 화면 글)은 싣지 않는다. runtime 실패는 Candidate 실패 통계에 넣지 않는다(D7).
 *
 * Planner 는 scripted(결정적). agent 응답은 DB stub harness(workflow-candidate.spec 과 같은 방식). 실 PC 는 smoke 가 본다.
 */

jest.setTimeout(30_000);

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { LOCAL_AGENT_ACTIONS, parseLocalAction, validateLocalCommandArgs } from '../services/local-agent/local-agent-protocol.js';
import {
  experienceLayerOf,
  experienceLocatorOf,
  experienceOutcomeOf,
  experienceStageOf,
  validateWorkExperienceRecordShape,
  type DataWorkRunExperienceRecordArgs,
} from '../services/ai-tools/work-experience.js';
import { runWorkAgent, type WorkPlanner, type PlannerInput } from '../services/ai-tools/work-agent-runtime.js';
import type { VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

const EXP = LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_EXPERIENCE_RECORD;

// ─── A. 순수 규칙 ─────────────────────────────────────────────────────────────

describe('A. 순수 규칙', () => {
  it('단계 — 관찰/읽기/입력/활성화, 판단 불가는 null', () => {
    expect(['inspect', 'find', 'read_table', 'set_input', 'visual_type', 'click', 'key', 'done'].map(experienceStageOf)).toEqual([
      'observe', 'read', 'read', 'input', 'input', 'activate', 'activate', null,
    ]);
  });

  it('원인 층 — runtime 코드 · site_not_ready 는 runtime, 자격/확정은 policy_risk, 근거 없으면 null', () => {
    expect(experienceLayerOf(null, 'DOM_CONTENT_UNAVAILABLE')).toBe('runtime');
    expect(experienceLayerOf('site_not_ready', null)).toBe('runtime');
    expect(experienceLayerOf('credential_required', 'DOM_USER_ACTION_REQUIRED')).toBe('policy_risk');
    expect(experienceLayerOf('user_judgment_required', null, { inputMissing: true })).toBe('input_missing');
    expect(experienceLayerOf('user_judgment_required', null)).toBe('judgment');
    expect(experienceLayerOf('no_progress', null)).toBeNull();
    expect(experienceLayerOf(null, 'DOM_ELEMENT_NOT_FOUND')).toBeNull();
  });

  it('Outcome — LLM 완료 판단은 agent_inferred 그대로 · 대기 segment 는 결과 없음 · runtime 판정은 system_verified', () => {
    expect(experienceOutcomeOf({ endState: 'completed', reason: null, plannerProposed: false })).toEqual({ status: 'SUCCESS', evidence: 'agent_inferred' });
    expect(experienceOutcomeOf({ endState: 'completed', reason: 'goal_sufficiently_advanced', plannerProposed: true })).toEqual({ status: 'PARTIAL_SUCCESS', evidence: 'agent_inferred' });
    expect(experienceOutcomeOf({ endState: 'waiting_for_user', reason: 'user_judgment_required', plannerProposed: true })).toBeNull();
    expect(experienceOutcomeOf({ endState: 'taken_over', reason: 'site_not_ready', plannerProposed: false })).toEqual({ status: 'FAILED', evidence: 'system_verified' });
    expect(experienceOutcomeOf({ endState: 'taken_over', reason: 'credential_required', plannerProposed: false })).toEqual({ status: 'BLOCKED', evidence: 'system_verified' });
  });

  it('locator — 입력값이 이름/글에 비치면 버린다 · visual · uia 는 locator 없음', () => {
    const el = { role: 'searchbox', name: '약물 검색', text: undefined };
    expect(experienceLocatorOf('dom', { kind: 'set_input', elementRef: 'e_2', text: '타이레놀' }, el)).toEqual({ role: 'searchbox', name: '약물 검색' });
    expect(experienceLocatorOf('dom', { kind: 'set_input', elementRef: 'e_2', text: '타이레놀' }, { role: 'searchbox', name: '타이레놀', text: undefined })).toBeNull();
    expect(experienceLocatorOf('uia', { kind: 'click', elementRef: 'e_2' }, el)).toBeNull();
    expect(experienceLocatorOf('dom', { kind: 'visual_click', x: 0.2, y: 0.3 }, el)).toBeNull();
  });
});

// ─── B. protocol 경계 ─────────────────────────────────────────────────────────

const METRIC = { totalMs: 4200, aiMs: 1800, aiCalls: 2, commandWaitMs: null, executionMs: null, settleMs: 300, actionCount: 1, stepCount: 3, retryCount: 0 };
const STEP = {
  seq: 1, stage: 'activate', actionKind: 'click', method: 'browser_dom', locator: { role: 'button', name: '검 색' }, actor: 'ai_normal',
  resultStatus: 'success', resultEvidence: 'system_verified', errorCode: null, durationMs: 120,
};
const ARGS = (over: Record<string, unknown> = {}) => ({
  runId: 'g_exp1',
  segment: { startedAt: '2026-10-01T01:00:00.000Z', endedAt: '2026-10-01T01:00:04.200Z', endState: 'completed', resumed: false },
  target: { targetId: 'healthkr', targetKind: 'browser_site' },
  outcome: { status: 'SUCCESS', evidence: 'agent_inferred' },
  metric: METRIC,
  steps: [STEP],
  failures: [],
  ...over,
});

describe('B. protocol 경계 — experience_record 검증기', () => {
  it('정상 형상은 통과한다(대상 등재 · runId 형식 확인)', () => {
    const r = validateLocalCommandArgs(EXP, ARGS());
    expect(r.ok).toBe(true);
  });

  it('형상 밖 인자는 거부 — 원문 · 값 · 좌표 · elementRef · 미등재 대상 · 잘못된 runId · 대기 segment 의 결과', () => {
    const bad = [
      ARGS({ note: '사용자 답변 원문' }),
      ARGS({ goal: '약학정보원에서 타이레놀 검색해줘' }),
      ARGS({ steps: [{ ...STEP, value: '타이레놀' }] }),
      ARGS({ steps: [{ ...STEP, locator: { role: 'button', name: '검 색', x: 0.3 } }] }),
      ARGS({ steps: [{ ...STEP, elementRef: 'e_2' }] }),
      ARGS({ steps: [{ ...STEP, errorCode: 'password=1234' }] }),
      ARGS({ failures: [{ stepSeq: null, stage: null, layer: 'network', failureClass: null, errorCode: null, method: null, recoveryTier: null, recoveryResult: null, uiChangeSuspected: false }] }),
      ARGS({ target: { targetId: 'evil.example', targetKind: 'browser_site' } }),
      ARGS({ runId: '../../etc' }),
      ARGS({ segment: { startedAt: '2026-10-01T01:00:00.000Z', endedAt: '2026-10-01T01:00:04.200Z', endState: 'waiting_for_user', resumed: false } }),
      ARGS({ outcome: { status: 'SUCCESS', evidence: 'llm_said_so' } }),
      ARGS({ metric: { ...METRIC, prompt: 'x' } }),
      ARGS({ metric: { ...METRIC, aiMs: 1.5 } }),
    ];
    for (const a of bad) expect([JSON.stringify(a).slice(0, 120), validateLocalCommandArgs(EXP, a).ok]).toEqual([JSON.stringify(a).slice(0, 120), false]);
  });

  it('검증을 통과한 인자는 정해진 키만 남긴다(복사본)', () => {
    const r = validateWorkExperienceRecordShape(ARGS());
    expect(Object.keys(r.args as object).sort()).toEqual(['failures', 'metric', 'outcome', 'runId', 'segment', 'steps', 'target']);
  });
});

// ─── C. runtime ───────────────────────────────────────────────────────────────

const SITE = 'healthkr';
const SNAP = 's_abcd1234';
const ctx = (): VerifiedToolContext => ({ userId: 'user-1', workspace: 'home', localAgentStatus: 'connected', localDeviceId: 'dev-1' });
type Outcome = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: unknown };
type Script = Record<string, Outcome[]>;
const OK = (data: Record<string, unknown>): Outcome => ({ status: 'success', data: { siteId: SITE, ...data } });
const FAIL = (errorCode: string): Outcome => ({ status: 'failed', errorCode });
const CTX = (path: string) => OK({ active: true, ready: true, path });
const EL = (elementRef: string, role: string, name: string, extra: Record<string, unknown> = {}) => ({ elementRef, role, name, ...extra });
const HOME = [EL('e_1', 'heading', '약학정보원'), EL('e_2', 'searchbox', '약물의 제품명 또는 성분명을 입력하세요.'), EL('e_3', 'button', '검 색')];
const RESULT = [EL('e_1', 'heading', '검색결과 리스트 ( 2개 )'), EL('e_2', 'table', '', { text: '제품명 성분/함량' })];
const INSPECT = (elements: Record<string, unknown>[]) => OK({ snapshotId: SNAP, elements, elementCount: elements.length });

interface Ledger {
  experiences: DataWorkRunExperienceRecordArgs[];
  results: Record<string, unknown>[];
  saves: Record<string, unknown>[];
  matchReply: Record<string, unknown>;
  prepare: Record<string, unknown>;
}

async function drive(db: LocalAgentDb, script: Script, ledger: Ledger, max = 60) {
  const seen: { base: string; args: Record<string, unknown> }[] = [];
  const cursors: Record<string, number> = {};
  let k = 0;
  while (k < max) {
    for (let i = 0; i < 200 && db.commands.length <= k; i += 1) await new Promise((r) => setTimeout(r, 5));
    const cmd = db.commands[k];
    if (!cmd) break;
    k += 1;
    const base = parseLocalAction(String(cmd.action)).base.replace('local.browser.dom.', '');
    const args = cmd.result_data ? JSON.parse(String(cmd.result_data)) : {};
    const reply = (data: unknown) => submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: 'success', data } as any);
    if (base === 'local.target.prepare') { await reply(ledger.prepare); continue; }
    if (base === EXP) { ledger.experiences.push(args); await reply({ saved: true }); continue; }
    if (base === LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_SAVE) { ledger.saves.push(args); await reply({ saved: true, candidateId: 'wc_saved01', candidateStatus: 'active' }); continue; }
    if (base === LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_MATCH) { await reply(ledger.matchReply); continue; }
    if (base === LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_RESULT) { ledger.results.push(args); await reply({ saved: true, candidateId: args.candidateId, candidateStatus: 'active' }); continue; }
    if (base.startsWith('local.data.work_run_')) { await reply({ runId: 'r_test', runStatus: 'active', saved: true }); continue; }
    seen.push({ base, args });
    const queue = script[base] ?? [FAIL('DOM_ELEMENT_NOT_FOUND')];
    const idx = Math.min(cursors[base] ?? 0, queue.length - 1);
    cursors[base] = (cursors[base] ?? 0) + 1;
    const o = queue[idx];
    await submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: o.status, errorCode: o.errorCode, data: o.data } as any);
  }
  return seen;
}

/** 재개 테스트용 — cloud coordination 원장에 waiting_for_user run 하나(workflow-candidate.spec 과 같은 방식). */
function waitingRun(db: LocalAgentDb, runId: string) {
  const row: Record<string, unknown> = {
    run_id: runId, user_id: 'user-1', device_id: null, status: 'waiting_for_user', version: 3,
    created_at: new Date(), updated_at: new Date(), expires_at: new Date(Date.now() + 600_000),
  };
  const base = (db.dataSource.query as jest.Mock).getMockImplementation()!;
  (db.dataSource.query as jest.Mock).mockImplementation(async (sql: string, params: any[] = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (s.startsWith('SELECT run_id, user_id') && s.includes('FROM work_run_coordination') && params[0] === runId) return [{ ...row }];
    if (s.startsWith('UPDATE work_run_coordination') && params[0] === runId) {
      if (['completed', 'taken_over', 'expired'].includes(String(row.status))) return [[], 0];
      row.status = params[1];
      row.version = Number(row.version) + 1;
      return [[{ ...row }], 1];
    }
    return base(sql, params);
  });
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

const READY = { targetId: SITE, targetType: 'browser_site', state: 'ready', reusedExisting: true, openedByO4O: false, tabCount: 1, path: '/' };

async function run(
  request: string,
  planner: WorkPlanner,
  script: Script,
  opts: { matchReply?: Record<string, unknown>; prepare?: Record<string, unknown>; runId?: string; targetHint?: string } = {},
) {
  const db = makeDb();
  await pairAndRegister(db);
  await connected(db);
  if (opts.runId) waitingRun(db, opts.runId);
  const ledger: Ledger = { experiences: [], results: [], saves: [], matchReply: opts.matchReply ?? { matched: false }, prepare: opts.prepare ?? READY };
  const input = { request, ...(opts.runId ? { runId: opts.runId } : {}), ...(opts.targetHint ? { targetHint: opts.targetHint } : {}) };
  const [result, seen] = await Promise.all([runWorkAgent(db.dataSource, ctx(), input, planner), drive(db, script, ledger)]);
  return { result, seen, ledger };
}

const searchScript = (): Script => ({
  get_context: [CTX('/'), CTX('/searchDrug/search_total_result.asp')],
  inspect: [INSPECT(HOME), INSPECT(RESULT)],
  set_input: [OK({ elementRef: 'e_2', hasValue: true })],
  click: [OK({ elementRef: 'e_3', navigated: true, changed: true, role: 'button', riskLevel: 'REVERSIBLE' })],
});
const aiSearchPlan = [
  { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: '타이레놀' } },
  { assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } },
  { assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } },
];
const REPLAY_REPLY = {
  matched: true,
  candidateId: 'wc_replay01',
  steps: [
    { actionKind: 'set_input', locator: { role: 'searchbox', name: '약물의 제품명 또는 성분명을 입력하세요.' }, value: '아스피린', expect: { navigated: false, changed: false } },
    { actionKind: 'click', locator: { role: 'button', name: '검 색' }, expect: { navigated: true, changed: true } },
  ],
};
/** 기록된 Experience 는 protocol 검증기를 그대로 통과해야 한다(실제 명령 발행 경로와 같은 검사). */
const expectValid = (e: DataWorkRunExperienceRecordArgs) => expect(validateLocalCommandArgs(EXP, e).ok).toBe(true);
const SENSITIVE = ['타이레놀', '아스피린', '게보린', '내가 먹을 약', '검색해줘', 'e_2', 'e_3', SNAP, '검색결과 리스트', '제품명 성분'];
const expectNoSensitive = (e: unknown) => {
  const json = JSON.stringify(e);
  for (const s of SENSITIVE) expect([s, json.includes(s)]).toEqual([s, false]);
};

describe('C. runtime — run 마다 구조화 Experience 1건(write only)', () => {
  it('성공 run — 전 단계(입력 · 활성화) · 행위자 · semantic locator · Outcome(agent_inferred) · Metric, 원문 없음', async () => {
    const { result, ledger } = await run('약학정보원에서 타이레놀 검색해줘', scripted(aiSearchPlan), searchScript());
    expect(result.goal.status).toBe('completed');
    expect(ledger.experiences).toHaveLength(1);
    const e = ledger.experiences[0];
    expectValid(e);
    expect(e.runId).toBe(result.goal.runId);
    expect(e.segment.endState).toBe('completed');
    expect(e.segment.resumed).toBe(false);
    expect(e.target).toEqual({ targetId: SITE, targetKind: 'browser_site' });
    expect(e.outcome).toEqual({ status: 'PARTIAL_SUCCESS', evidence: 'agent_inferred' });
    expect(e.steps.map((s) => [s.seq, s.stage, s.actionKind, s.method, s.actor, s.resultStatus, s.resultEvidence])).toEqual([
      [1, 'input', 'set_input', 'browser_dom', 'ai_normal', 'success', 'system_verified'],
      [2, 'activate', 'click', 'browser_dom', 'ai_normal', 'success', 'system_verified'],
    ]);
    expect(e.steps[0].locator).toEqual({ role: 'searchbox', name: '약물의 제품명 또는 성분명을 입력하세요.' });
    expect(e.steps[1].locator).toEqual({ role: 'button', name: '검 색' });
    for (const s of e.steps) expect(typeof s.durationMs).toBe('number');
    expect(e.failures).toEqual([]);
    expect(e.metric.aiCalls).toBe(3);
    expect(e.metric.actionCount).toBe(2);
    expect(typeof e.metric.totalMs).toBe('number');
    expect(typeof e.metric.settleMs).toBe('number');
    // 명령 시각 근거가 없으면(stub) 추정하지 않고 null.
    expect(e.metric.commandWaitMs).toBeNull();
    expect(e.metric.executionMs).toBeNull();
    expectNoSensitive(e);
  });

  it('runtime 실패(대상 준비 실패) — run 을 열기 전이라도 FAILED · system_verified · runtime 층 실패 이벤트', async () => {
    const prepare = { targetId: SITE, targetType: 'browser_site', state: 'failed', errorCode: 'O4O_EXTENSION_NOT_CONNECTED' };
    const { result, ledger } = await run('약학정보원에서 타이레놀 검색해줘', scripted(aiSearchPlan), searchScript(), { prepare });
    expect(result.progress).toBe('needs_user');
    expect(ledger.experiences).toHaveLength(1);
    const e = ledger.experiences[0];
    expectValid(e);
    expect(e.segment.endState).toBe('taken_over');
    expect(e.outcome).toEqual({ status: 'FAILED', evidence: 'system_verified' });
    expect(e.steps).toEqual([]);
    expect(e.failures).toHaveLength(1);
    expect(e.failures[0]).toMatchObject({ layer: 'runtime', failureClass: 'TARGET_FAILURE' });
    expect(e.metric.aiCalls).toBe(0);
    expect(e.metric.aiMs).toBeNull();
    expectNoSensitive(e);
  });

  it('runtime 실패(첫 관찰 불가) — 문서가 서지 않으면 runtime 층 · 오류 코드 · probe 재시도 횟수', async () => {
    const script: Script = { get_context: [FAIL('DOM_CONTENT_UNAVAILABLE')] };
    const { result, ledger } = await run('약학정보원에서 타이레놀 검색해줘', scripted(aiSearchPlan), script);
    expect(result.takeover?.reason).toBe('site_not_ready');
    const e = ledger.experiences[0];
    expectValid(e);
    expect(e.outcome).toEqual({ status: 'FAILED', evidence: 'system_verified' });
    expect(e.failures).toEqual([expect.objectContaining({ layer: 'runtime', errorCode: 'WORK_AGENT_SITE_NOT_READY', uiChangeSuspected: false })]);
    expect(e.metric.retryCount).toBeGreaterThanOrEqual(1);
  });

  it('D7 — 재생 뒤 runtime 실패로 끝나면 Candidate 실패(replay_diverged)로 세지 않는다', async () => {
    const planner = scripted([{ assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } }]);
    const script: Script = {
      ...searchScript(),
      get_context: [CTX('/'), FAIL('DOM_TAB_NOT_FOUND')],
      find: [
        OK({ snapshotId: 's_find0001', matches: [EL('e_7', 'searchbox', '약물의 제품명 또는 성분명을 입력하세요.')] }),
        OK({ snapshotId: 's_find0002', matches: [EL('e_9', 'button', '검 색')] }),
      ],
    };
    const { result, ledger } = await run('약학정보원에서 아스피린 검색해줘', planner, script, { matchReply: REPLAY_REPLY });
    expect(result.takeover?.reason).toBe('site_not_ready');
    expect(ledger.results).toEqual([]); // runtime 실패 — Candidate failure_count 불변
    const e = ledger.experiences[0];
    expectValid(e);
    // 재생 단계는 deterministic 행위자.
    expect(e.steps.map((s) => [s.actionKind, s.actor])).toEqual([['set_input', 'deterministic'], ['click', 'deterministic']]);
    expect(e.failures).toEqual([expect.objectContaining({ layer: 'runtime', errorCode: 'DOM_TAB_NOT_FOUND' })]);
    expectNoSensitive(e);
  });

  it('회귀 — 재생 뒤 사용자 판단으로 멈추면(runtime 아님) 종전대로 replay_diverged 를 반영한다', async () => {
    const planner = scripted([{ assessment: 'needs_user', action: { kind: 'inspect' }, neededInput: '검색 구분을 알려 주세요.' }]);
    const script: Script = {
      ...searchScript(),
      find: [
        OK({ snapshotId: 's_find0001', matches: [EL('e_7', 'searchbox', '약물의 제품명 또는 성분명을 입력하세요.')] }),
        OK({ snapshotId: 's_find0002', matches: [EL('e_9', 'button', '검 색')] }),
      ],
    };
    const { result, ledger } = await run('약학정보원에서 아스피린 검색해줘', planner, script, { matchReply: REPLAY_REPLY });
    expect(result.goal.status).toBe('waiting_for_user');
    expect(ledger.results).toEqual([{ candidateId: 'wc_replay01', outcome: 'replay_diverged' }]);
    const e = ledger.experiences[0];
    expect(e.segment.endState).toBe('waiting_for_user');
    expect(e.outcome).toBeNull();
    expect(e.failures).toEqual([expect.objectContaining({ layer: 'judgment' })]);
  });

  it('재생 이탈(locator 없음) 뒤 AI 완료 — 화면 변경 의심만 표시 · 복구됨 · Candidate 는 저장 경로 유지', async () => {
    const planner = scripted([
      { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: '아스피린' } },
      { assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } },
      { assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } },
    ]);
    const script: Script = {
      ...searchScript(),
      get_context: [CTX('/'), CTX('/'), CTX('/searchDrug/search_total_result.asp')],
      inspect: [INSPECT(HOME), INSPECT(HOME), INSPECT(RESULT)],
      find: [OK({ snapshotId: 's_find0001', matches: [] })],
    };
    const { result, ledger } = await run('약학정보원에서 아스피린 검색해줘', planner, script, { matchReply: REPLAY_REPLY });
    expect(result.goal.status).toBe('completed');
    expect(ledger.saves).toHaveLength(1);
    const e = ledger.experiences[0];
    expectValid(e);
    expect(e.failures).toEqual([expect.objectContaining({ stage: 'read', layer: null, uiChangeSuspected: true, recoveryResult: 'recovered_by_normal_retry' })]);
    expect(e.steps.every((s) => s.actor === 'ai_normal')).toBe(true);
  });

  it('QUESTION → 재개 — 같은 runId 의 segment 2개(대기 segment 는 결과 없음 · input_missing), 답변 원문 없음', async () => {
    const reply = { ...REPLAY_REPLY, steps: [{ ...REPLAY_REPLY.steps[0], value: '내가 먹을 약' }, REPLAY_REPLY.steps[1]] };
    const first = await run('약학정보원에서 내가 먹을 약 검색해줘', scripted(aiSearchPlan), searchScript(), { matchReply: reply });
    expect(first.result.goal.status).toBe('waiting_for_user');
    const w = first.ledger.experiences[0];
    expectValid(w);
    expect(w.segment).toMatchObject({ endState: 'waiting_for_user', resumed: false });
    expect(w.outcome).toBeNull();
    expect(w.failures).toEqual([expect.objectContaining({ layer: 'input_missing' })]);
    expectNoSensitive(w);

    const runId = first.result.goal.runId as string;
    const planner = scripted([
      { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: '게보린' } },
      { assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } },
      { assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } },
    ]);
    const second = await run('게보린', planner, searchScript(), { runId, targetHint: SITE });
    expect(second.result.goal.runId).toBe(runId);
    const r = second.ledger.experiences[0];
    expectValid(r);
    expect(r.runId).toBe(runId);
    expect(r.segment).toMatchObject({ endState: 'completed', resumed: true });
    expect(r.outcome).toEqual({ status: 'PARTIAL_SUCCESS', evidence: 'agent_inferred' });
    expect(r.steps.map((s) => s.actionKind)).toEqual(['set_input', 'click']);
    expectNoSensitive(r);
  });
});
