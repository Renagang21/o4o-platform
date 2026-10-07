/**
 * WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1 — PHASE 2
 * Workflow Candidate & Deterministic Replay (IR §8·§9-2·§9-3)
 *
 *   A. 순수 규칙 — 요청 템플릿 일반화 · 대조 · semantic 단계(좌표·elementRef·값 없음) · 재생 대상 선택
 *   B. 경계 — protocol 검증기(save/match/result) · match 응답 화이트리스트(템플릿·통계 미통과) · 서버↔agent 규칙 복제 정합
 *   C. runtime — 첫 성공 → Candidate 저장 / 같은 형태 요청 → 결정론적 재생(AI 계획 감소) / 어긋나면 AI 가 이어받음 /
 *      재개·일반화 불가 run 은 저장하지 않음
 *
 * Planner 는 scripted(결정적). agent 응답은 DB stub harness(work-agent.spec 과 같은 방식). 실 Chrome 재생은 smoke 가 본다.
 */

jest.setTimeout(30_000);

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  LOCAL_AGENT_ACTIONS,
  parseLocalAction,
  pickSafeResultData,
  validateLocalCommandArgs,
} from '../services/local-agent/local-agent-protocol.js';
import {
  WORKFLOW_LIMITS,
  assessReplayValue,
  replayPreflight,
  buildRequestTemplate,
  buildTrajectoryEntry,
  buildWorkflowCandidate,
  isValidRequestTemplate,
  matchRequestTemplate,
  pickReplayTarget,
  validateReplaySteps,
  validateWorkflowSteps,
  type TrajectoryEntry,
} from '../services/ai-tools/workflow-candidate.js';
import { runWorkAgent, type WorkPlanner, type PlannerInput } from '../services/ai-tools/work-agent-runtime.js';
import { AI_TOOL_NAMES, type VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

describe('A-2. replay preflight — 값의 의미 검증', () => {
  it('지시·불특정 표현은 ambiguous', () => {
    for (const v of ['내가 먹을 약', '이 약', '어떤 영양제', '그거', '아무거나', '평소 먹는 약', '약?', '약']) {
      expect([v, assessReplayValue(v)]).toEqual([v, 'ambiguous']);
    }
  });

  it('구체적인 이름·번호는 concrete', () => {
    for (const v of ['아모디핀', '게보린', '타이레놀 500mg', '뉴로케이', '아스피린 프로텍트']) {
      expect([v, assessReplayValue(v)]).toEqual([v, 'concrete']);
    }
  });

  it('요청에서 온 입력값만 본다 — 요청에 없는 고정 선택값은 무시', () => {
    const steps = [
      { actionKind: 'select_option', locator: { role: 'combobox', name: '구분' }, value: '전체', expect: { navigated: false, changed: false } },
      { actionKind: 'set_input', locator: { role: 'searchbox', name: 'q' }, value: '아모디핀', expect: { navigated: false, changed: false } },
    ] as any;
    expect(replayPreflight('약학정보원에서 아모디핀 검색해줘', steps)).toBe('ok');
    const bad = [{ ...steps[1], value: '내가 먹을 약' }] as any;
    expect(replayPreflight('약학정보원에서 내가 먹을 약 검색해줘', bad)).toBe('ambiguous');
  });
});

const agentSrc = (f: string) => readFileSync(join(__dirname, '..', '..', '..', '..', 'tools', 'o4o-local-agent', 'src', f), 'utf8');

// ─── A. 순수 규칙 ─────────────────────────────────────────────────────────────

describe('A. 요청 템플릿 · semantic 단계', () => {
  it('입력값을 값 자리로 바꾼 템플릿 — 값이 요청에 없으면 일반화하지 않는다', () => {
    expect(buildRequestTemplate('약학정보원에서 타이레놀 검색해줘', ['타이레놀'])).toEqual({ template: '약학정보원에서 {{1}} 검색해줘', slots: [1] });
    expect(buildRequestTemplate('약학정보원에서 아스피린 500mg 검색', ['500mg', '아스피린'])).toEqual({ template: '약학정보원에서 {{1}} {{2}} 검색', slots: [2, 1] });
    expect(buildRequestTemplate('약학정보원에서 검색해줘', ['타이레놀'])).toBeNull(); // 값이 요청에서 오지 않음
    expect(buildRequestTemplate('타이레놀', ['타이레놀'])).toBeNull(); // 남는 글자 없음 → 모든 요청과 맞아 버린다
    expect(buildRequestTemplate('타이레놀정 타이레놀 검색', ['타이레놀정', '타이레놀'])).toBeNull(); // 값끼리 포함 → 경계 모호
    expect(buildRequestTemplate('{{1}} 검색', ['x'])).toBeNull();
  });

  it('템플릿 대조 — 공백 정규화 · 같은 자리는 같은 값 · 형태가 다르면 null', () => {
    expect(matchRequestTemplate('약학정보원에서 {{1}} 검색해줘', ' 약학정보원에서   아스피린 검색해줘 ')).toEqual(['아스피린']);
    expect(matchRequestTemplate('{{1}}에서 {{2}} 찾아줘', '약학정보원에서 아스피린 찾아줘')).toEqual(['약학정보원', '아스피린']);
    expect(matchRequestTemplate('약학정보원에서 {{1}} 검색해줘', '아스피린 부작용 알려줘')).toBeNull();
    expect(matchRequestTemplate('{{1}} 과 {{1}} 비교', '타이레놀 과 아스피린 비교')).toBeNull();
  });

  it('trajectory 항목 = 행동 종류 · role·name|text · 예상 변화 · pathname — 좌표·elementRef·snapshot 은 없다', () => {
    const e = buildTrajectoryEntry(
      { kind: 'click', elementRef: 'e_3' },
      { role: 'button', name: '검 색', text: undefined },
      { navigated: true, changed: true },
      '/search?q=secret',
    ) as TrajectoryEntry;
    expect(e).toEqual({ actionKind: 'click', locator: { role: 'button', name: '검 색' }, expect: { navigated: true, changed: true } }); // query 있는 path 는 버림
    expect(JSON.stringify(e)).not.toContain('e_3');
    expect(buildTrajectoryEntry({ kind: 'find', query: { text: 'x' } }, null, {}, '/')).toBeNull();
    expect(buildTrajectoryEntry({ kind: 'visual_click', x: 0.3, y: 0.4 }, null, {}, '/')).toBeNull();
  });

  it('Candidate — set_input 값은 요청에서 와야 하고, 저장 단계에는 값이 없다(slot 번호만)', () => {
    const traj: TrajectoryEntry[] = [
      { actionKind: 'set_input', locator: { role: 'searchbox', name: '검색어' }, value: '타이레놀', expect: { navigated: false, changed: false }, path: '/' },
      { actionKind: 'select_option', locator: { role: 'combobox', name: '구분' }, value: '제품명', expect: { navigated: false, changed: true } },
      { actionKind: 'click', locator: { role: 'button', name: '검 색' }, expect: { navigated: true, changed: true } },
    ];
    const built = buildWorkflowCandidate('약학정보원에서 타이레놀 검색해줘', traj);
    expect(built.ok).toBe(true);
    const ok = built as Extract<typeof built, { ok: true }>;
    expect(ok.template).toBe('약학정보원에서 {{1}} 검색해줘');
    expect(ok.steps[0]).toEqual({ actionKind: 'set_input', locator: { role: 'searchbox', name: '검색어' }, slot: 1, expect: { navigated: false, changed: false }, path: '/' });
    expect(ok.steps[1].option).toBe('제품명'); // 요청에 없는 UI 선택지는 고정 라벨로
    expect(JSON.stringify(ok.steps)).not.toContain('타이레놀');
    expect(validateWorkflowSteps(ok.steps)).toEqual(ok.steps);
    // 입력값이 사용자 답변 등 요청 밖에서 왔으면 일반화 불가.
    expect(buildWorkflowCandidate('약학정보원에서 검색해줘', traj)).toEqual({ ok: false, reason: 'not_generalizable' });
    // locator 를 못 만든 단계가 있으면 재생이 어긋난다 — 만들지 않는다.
    expect(buildWorkflowCandidate('약학정보원에서 타이레놀 검색해줘', [{ ...traj[0] }, { ...traj[2], locator: null }])).toEqual({ ok: false, reason: 'locator_missing' });
    expect(buildWorkflowCandidate('x', [])).toEqual({ ok: false, reason: 'empty' });
  });

  it('재생 대상 선택 — 정확히 같은 이름이 하나면 그것, 모호하면 null(추측 재생 금지)', () => {
    const loc = { role: 'button', name: '검 색' };
    expect(pickReplayTarget(loc, [{ elementRef: 'e_1', role: 'button', name: '상세 검색' }, { elementRef: 'e_2', role: 'button', name: '검 색' }])).toBe('e_2');
    expect(pickReplayTarget(loc, [{ elementRef: 'e_1', role: 'button', name: '검색 버튼' }])).toBe('e_1');
    expect(pickReplayTarget(loc, [{ elementRef: 'e_1', role: 'button', name: '검 색' }, { elementRef: 'e_2', role: 'button', name: '검 색' }])).toBeNull();
    expect(pickReplayTarget(loc, [])).toBeNull();
  });
});

// ─── B. 경계 ──────────────────────────────────────────────────────────────────

const STEPS = [
  { actionKind: 'set_input', locator: { role: 'searchbox', name: '검색어' }, slot: 1, expect: { navigated: false, changed: false }, path: '/' },
  { actionKind: 'click', locator: { role: 'button', name: '검 색' }, expect: { navigated: true, changed: true } },
];

describe('B. protocol 경계 · 서버↔agent 정합', () => {
  it('save 검증 — 값 없는 단계 + 유효 템플릿 + 등재 대상 + 자리 정합만', () => {
    const v = (args: unknown) => validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_SAVE, args).ok;
    expect(v({ runId: 'g_1', targetId: 'healthkr', template: '약학정보원에서 {{1}} 검색해줘', steps: STEPS })).toBe(true);
    expect(v({ runId: 'g_1', targetId: 'healthkr', template: '{{1}} 검색', steps: STEPS, replayedCandidateId: 'wc_abc123' })).toBe(true);
    expect(v({ runId: 'g_1', targetId: 'healthkr', template: '{{1}} 검색', steps: [{ ...STEPS[0], value: '타이레놀' }, STEPS[1]] })).toBe(false); // 값 금지
    expect(v({ runId: 'g_1', targetId: 'healthkr', template: '{{1}} 검색', steps: [{ ...STEPS[1], elementRef: 'e_3' }] })).toBe(false); // elementRef 금지
    expect(v({ runId: 'g_1', targetId: 'healthkr', template: '{{1}} 검색', steps: [{ ...STEPS[1], x: 0.1, y: 0.2 }] })).toBe(false); // 좌표 금지
    expect(v({ runId: 'g_1', targetId: 'evil.example', template: '{{1}} 검색', steps: STEPS })).toBe(false);
    expect(v({ runId: 'g_1', targetId: 'healthkr', template: '{{2}} 검색', steps: STEPS })).toBe(false); // 자리 불일치
    expect(v({ runId: 'g_1', targetId: 'healthkr', template: '{{1}} 검색', steps: [STEPS[1]] })).toBe(false); // 안 쓰이는 자리
    expect(v({ runId: 'g_1', targetId: 'healthkr', template: '{{1}}', steps: STEPS })).toBe(false);
    expect(v({ runId: 'g_1', targetId: 'healthkr', template: '{{1}} 검색', steps: new Array(WORKFLOW_LIMITS.maxSteps + 1).fill(STEPS[1]) })).toBe(false);
    expect(isValidRequestTemplate('약학정보원에서 {{1}} 검색해줘')).toBe(true);
    expect(isValidRequestTemplate('{{9}} 검색')).toBe(false);
  });

  it('match · result 검증 — 정해진 키 · enum 만', () => {
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_MATCH, { targetId: 'healthkr', request: '타이레놀 검색해줘' }).ok).toBe(true);
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_MATCH, { targetId: 'healthkr', request: '타이레놀', sql: 'x' }).ok).toBe(false);
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_RESULT, { candidateId: 'wc_abc123', outcome: 'replay_completed' }).ok).toBe(true);
    expect(validateLocalCommandArgs(LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_RESULT, { candidateId: 'wc_abc123', outcome: 'delete' }).ok).toBe(false);
  });

  it('match 응답 화이트리스트 — 재생 단계만 통과, 템플릿 · 통계 · 형상 밖 단계는 버린다', () => {
    const safe = pickSafeResultData(LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_MATCH, {
      matched: true, candidateId: 'wc_abc123', template: '{{1}} 검색', successCount: 3,
      steps: [{ actionKind: 'set_input', locator: { role: 'searchbox', name: '검색어' }, value: '아스피린', expect: { navigated: false, changed: false } }],
    });
    expect(safe).toEqual({
      matched: true, candidateId: 'wc_abc123',
      steps: [{ actionKind: 'set_input', locator: { role: 'searchbox', name: '검색어' }, value: '아스피린', expect: { navigated: false, changed: false } }],
    });
    // 단계에 형상 밖 필드(elementRef)가 있으면 재생 자체를 하지 않는다.
    expect(pickSafeResultData(LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_MATCH, {
      matched: true, candidateId: 'wc_abc123', steps: [{ actionKind: 'click', locator: { name: '검 색' }, elementRef: 'e_3', expect: { navigated: true, changed: true } }],
    })).toEqual({ matched: false });
    expect(validateReplaySteps([{ actionKind: 'click', locator: { name: '검 색' }, value: 'x', expect: { navigated: true, changed: true } }])).toBeNull();
  });

  it('agent 복제 규칙 — action 이름 · 상한 · role 목록 · 테이블이 서버 계약과 같다', () => {
    const handlers = agentSrc('handlers.mjs');
    const localDb = agentSrc('local-db.mjs');
    for (const a of [LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_SAVE, LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_MATCH, LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_RESULT]) {
      expect(handlers).toContain(`'${a}'`);
    }
    expect(handlers).toContain(`const WORKFLOW_MAX_STEPS = ${WORKFLOW_LIMITS.maxSteps};`);
    expect(handlers).toContain(`const WORKFLOW_MAX_SLOTS = ${WORKFLOW_LIMITS.maxSlots};`);
    expect(handlers).toContain(`const WORKFLOW_LOCATOR_MAX = ${WORKFLOW_LIMITS.locatorTextMax};`);
    expect(handlers).toContain(`const WORKFLOW_TEMPLATE_MAX = ${WORKFLOW_LIMITS.templateMax};`);
    expect(localDb).toContain(`const WORKFLOW_VALUE_MAX = ${WORKFLOW_LIMITS.valueMax};`);
    expect(localDb).toContain("name: 'workflow_candidates_v1'");
    expect(localDb).toContain('CREATE TABLE IF NOT EXISTS local_workflow_candidates');
    // 저장 테이블에 값 · 좌표 · 화면 컬럼이 없다.
    const ddl = localDb.slice(localDb.indexOf('local_work_run_steps ('), localDb.indexOf('idx_local_workflow_candidates_target'));
    for (const forbidden of ['value', 'x REAL', 'screenshot', 'dom_', 'element_ref', 'snapshot']) expect(ddl).not.toContain(forbidden);
  });
});

// ─── C. runtime ───────────────────────────────────────────────────────────────

const SITE = 'healthkr';
const SNAP = 's_abcd1234';
const ctx = (): VerifiedToolContext => ({ userId: 'user-1', workspace: 'home', localAgentStatus: 'connected', localDeviceId: 'dev-1' });
type Outcome = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: unknown };
type Script = Record<string, Outcome[]>;
const OK = (data: Record<string, unknown>): Outcome => ({ status: 'success', data: { siteId: SITE, ...data } });
const CTX = (path: string) => OK({ active: true, ready: true, path });
const EL = (elementRef: string, role: string, name: string, extra: Record<string, unknown> = {}) => ({ elementRef, role, name, ...extra });
const HOME = [EL('e_1', 'heading', '약학정보원'), EL('e_2', 'searchbox', '약물의 제품명 또는 성분명을 입력하세요.'), EL('e_3', 'button', '검 색'), EL('e_4', 'link', '식별검색')];
const RESULT = [EL('e_1', 'heading', '검색결과 리스트 ( 2개 )'), EL('e_2', 'table', '', { text: '제품명 성분/함량' })];
const INSPECT = (elements: Record<string, unknown>[]) => OK({ snapshotId: SNAP, elements, elementCount: elements.length });

interface Ledger {
  saves: Record<string, unknown>[];
  matches: Record<string, unknown>[];
  results: Record<string, unknown>[];
  /** match 에 돌려줄 응답. */
  matchReply: Record<string, unknown>;
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
    if (base === 'local.target.prepare') {
      await reply({ targetId: SITE, targetType: 'browser_site', state: 'ready', reusedExisting: true, openedByO4O: false, tabCount: 1, path: '/' });
      continue;
    }
    if (base === LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_SAVE) { ledger.saves.push(args); await reply({ saved: true, candidateId: 'wc_saved01', candidateStatus: 'active' }); continue; }
    if (base === LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_MATCH) { ledger.matches.push(args); await reply(ledger.matchReply); continue; }
    if (base === LOCAL_AGENT_ACTIONS.DATA_WORK_RUN_CANDIDATE_RESULT) { ledger.results.push(args); await reply({ saved: true, candidateId: args.candidateId, candidateStatus: 'active' }); continue; }
    if (base.startsWith('local.data.work_run_')) { await reply({ runId: 'r_test', runStatus: 'active', saved: true }); continue; }
    seen.push({ base, args });
    const queue = script[base] ?? [{ status: 'failed', errorCode: 'DOM_ELEMENT_NOT_FOUND' }];
    const idx = Math.min(cursors[base] ?? 0, queue.length - 1);
    cursors[base] = (cursors[base] ?? 0) + 1;
    const o = queue[idx];
    await submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: o.status, errorCode: o.errorCode, data: o.data } as any);
  }
  return seen;
}

/** 재개 테스트용 — cloud coordination 원장에 이 사용자의 waiting_for_user run 하나를 둔다(stub 은 이 테이블을 모른다). */
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
  return row;
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

async function run(request: string, planner: WorkPlanner, script: Script, matchReply: Record<string, unknown> = { matched: false }, extra: { runId?: string; recoveryHint?: string; targetHint?: string } = {}) {
  const db = makeDb();
  await pairAndRegister(db);
  await connected(db);
  if (extra.runId) waitingRun(db, extra.runId);
  const ledger: Ledger = { saves: [], matches: [], results: [], matchReply };
  const [result, seen] = await Promise.all([runWorkAgent(db.dataSource, ctx(), { request, ...extra }, planner), drive(db, script, ledger)]);
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

describe('C. runtime — 첫 성공은 AI · 반복은 Workflow · 예외에서만 AI', () => {
  it('첫 성공(AI 3계획) → 값 없는 semantic Candidate 를 Local 에 저장한다', async () => {
    const planner = scripted(aiSearchPlan);
    const { result, ledger } = await run('약학정보원에서 타이레놀 검색해줘', planner, searchScript());
    expect(result.goal.status).toBe('completed');
    expect(result.aiPlanCount).toBe(3);
    expect(ledger.matches).toHaveLength(1); // 먼저 대조했지만 없었다
    expect(ledger.saves).toHaveLength(1);
    const save = ledger.saves[0];
    expect(save.template).toBe('약학정보원에서 {{1}} 검색해줘');
    expect(save.steps).toEqual([
      { actionKind: 'set_input', locator: { role: 'searchbox', name: '약물의 제품명 또는 성분명을 입력하세요.' }, slot: 1, expect: { navigated: false, changed: false }, path: '/' },
      { actionKind: 'click', locator: { role: 'button', name: '검 색' }, expect: { navigated: true, changed: true }, path: '/' },
    ]);
    expect(JSON.stringify(save)).not.toContain('타이레놀'); // 입력값 저장 없음
    expect(JSON.stringify(save)).not.toContain('e_2'); // elementRef 저장 없음
    expect(result.workflow).toEqual({ replay: 'none', replayedSteps: 0, candidate: 'saved' });
  });

  it('같은 형태 요청 → Local 대조 → 결정론적 재생(Planner 는 행동하지 않고 완료 확인만 1회)', async () => {
    const planner = scripted([{ assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } }]);
    const script: Script = {
      ...searchScript(),
      find: [
        OK({ snapshotId: 's_find0001', matches: [EL('e_7', 'searchbox', '약물의 제품명 또는 성분명을 입력하세요.')] }),
        OK({ snapshotId: 's_find0002', matches: [EL('e_9', 'button', '검 색'), EL('e_10', 'button', '상세 검색')] }),
      ],
    };
    const { result, seen, ledger } = await run('약학정보원에서 아스피린 검색해줘', planner, script, REPLAY_REPLY);
    expect(result.goal.status).toBe('completed');
    expect(result.aiPlanCount).toBe(1); // 첫 성공 3 → 재생 1
    expect(result.workflow?.replay).toBe('completed');
    expect(result.workflow?.replayedSteps).toBe(2);
    // 현재 화면에서 locator 로 다시 찾아 실행 — 저장된 elementRef 가 아니라 이번 find 의 ref 다.
    const acts = seen.filter((s) => s.base === 'set_input' || s.base === 'click');
    expect(acts.map((a) => [a.base, a.args.elementRef])).toEqual([['set_input', 'e_7'], ['click', 'e_9']]);
    expect(acts[0].args.text).toBe('아스피린');
    expect(seen.filter((s) => s.base === 'find').map((f) => f.args.query)).toEqual([
      { role: 'searchbox', name: '약물의 제품명 또는 성분명을 입력하세요.' },
      { role: 'button', name: '검 색' },
    ]);
    // 완료 → 같은 템플릿으로 갱신 저장 + 재생 Candidate 성공 반영.
    expect(ledger.saves).toHaveLength(1);
    expect(ledger.saves[0].replayedCandidateId).toBe('wc_replay01');
    expect(ledger.results).toHaveLength(0);
  });

  it('재생이 어긋나면(대상 없음) 즉시 멈추고 AI 가 현재 화면에서 이어받는다 — 추측 재생 없음', async () => {
    const planner = scripted([
      { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: '아스피린' } },
      { assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } },
      { assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } },
    ]);
    const script: Script = {
      ...searchScript(),
      get_context: [CTX('/'), CTX('/'), CTX('/searchDrug/search_total_result.asp')],
      inspect: [INSPECT(HOME), INSPECT(HOME), INSPECT(RESULT)],
      find: [OK({ snapshotId: 's_find0001', matches: [] })], // 화면이 바뀌어 저장된 입력창을 못 찾음
    };
    const { result, seen, ledger } = await run('약학정보원에서 아스피린 검색해줘', planner, script, REPLAY_REPLY);
    expect(result.goal.status).toBe('completed');
    expect(result.workflow?.replay).toBe('diverged');
    expect(result.workflow?.replayedSteps).toBe(0);
    expect(result.aiPlanCount).toBe(3);
    // 어긋난 뒤 전체 화면을 새로 관찰하고 AI 가 행동했다.
    expect(seen.filter((s) => s.base === 'set_input').map((s) => s.args.elementRef)).toEqual(['e_2']);
    // AI 가 고친 경로로 Candidate 를 갱신(self-healing) — 재생했던 Candidate id 를 함께 보낸다.
    expect(ledger.saves).toHaveLength(1);
    expect(ledger.saves[0].replayedCandidateId).toBe('wc_replay01');
  });

  it('재생 후 run 이 완료되지 않으면 재생 실패를 Local 에 반영한다', async () => {
    const planner = scripted([{ assessment: 'needs_user', action: { kind: 'inspect' }, neededInput: '검색 구분을 알려 주세요.' }]);
    const script: Script = {
      ...searchScript(),
      find: [
        OK({ snapshotId: 's_find0001', matches: [EL('e_7', 'searchbox', '약물의 제품명 또는 성분명을 입력하세요.')] }),
        OK({ snapshotId: 's_find0002', matches: [EL('e_9', 'button', '검 색')] }),
      ],
    };
    const { result, ledger } = await run('약학정보원에서 아스피린 검색해줘', planner, script, REPLAY_REPLY);
    expect(result.goal.status).toBe('waiting_for_user');
    expect(ledger.saves).toHaveLength(0);
    expect(ledger.results).toEqual([{ candidateId: 'wc_replay01', outcome: 'replay_diverged' }]);
  });

  it('입력값이 요청에서 오지 않으면 저장하지 않는다(not_generalizable) · 사용자 힌트 run 은 대조·저장 모두 안 한다', async () => {
    const a = await run('약학정보원에서 검색해줘', scripted(aiSearchPlan), searchScript());
    expect(a.result.goal.status).toBe('completed');
    expect(a.ledger.saves).toHaveLength(0);
    expect(a.result.workflow?.candidate).toBe('not_generalizable');

    const b = await run('약학정보원에서 타이레놀 검색해줘', scripted(aiSearchPlan), searchScript(), REPLAY_REPLY, { recoveryHint: '검색창은 위쪽에 있어요' });
    expect(b.result.goal.status).toBe('completed');
    expect(b.ledger.matches).toHaveLength(0);
    expect(b.ledger.saves).toHaveLength(0);
    expect(b.result.workflow?.candidate).toBe('skipped');
  });

  it('preflight — 재생 값이 지시적·불특정이면 어떤 입력/클릭도 하기 전에 QUESTION(재개 가능)', async () => {
    const planner = scripted([{ assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } }]);
    const reply = { ...REPLAY_REPLY, steps: [{ ...REPLAY_REPLY.steps[0], value: '내가 먹을 약' }, REPLAY_REPLY.steps[1]] };
    const { result, seen, ledger } = await run('약학정보원에서 내가 먹을 약 검색해줘', planner, searchScript(), reply);
    expect(result.goal.status).toBe('waiting_for_user');
    expect(result.progress).toBe('needs_user');
    expect(result.resumable).toBe(true);
    expect(result.goal.runId).toBeTruthy();
    expect(result.neededInput).toBeTruthy();
    expect(seen.filter((s) => ['find', 'set_input', 'click', 'select_option'].includes(s.base))).toHaveLength(0);
    expect(planner.calls).toHaveLength(0); // 실행 후 AI 판단이 아니라 실행 전 차단
    expect(ledger.results).toHaveLength(0);
    expect(ledger.saves).toHaveLength(0);
  });

  it('재개 — 짧은 답("게보린") + runId 는 답에서 대상을 찾지 않고 원래 run 대상을 상속, 같은 runId 로 현재 화면을 새로 관찰한다', async () => {
    const planner = scripted([
      { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: '게보린' } },
      { assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } },
      { assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } },
    ]);
    const { result, seen, ledger } = await run('게보린', planner, searchScript(), REPLAY_REPLY, { runId: 'g_wait01', targetHint: SITE });
    expect(result.errorCode ?? null).not.toBe('WORK_AGENT_SITE_UNRESOLVED');
    expect(result.goal.runId).toBe('g_wait01'); // 같은 logical run
    expect(result.siteId).toBe(SITE); // 원래 대상 상속
    expect(result.goal.status).toBe('completed');
    // 과거 관찰 재사용 없음 — 재개 run 에서 새로 get_context · inspect 한 뒤 행동했다.
    const bases = seen.map((s) => s.base);
    expect(bases.indexOf('inspect')).toBeGreaterThanOrEqual(0);
    expect(bases.indexOf('inspect')).toBeLessThan(bases.indexOf('set_input'));
    expect(seen.find((s) => s.base === 'set_input')?.args.text).toBe('게보린');
    // 재개 run 은 Candidate 대조·재생을 하지 않는다(기존 규칙 유지).
    expect(ledger.matches).toHaveLength(0);
    expect(seen.filter((s) => s.base === 'find')).toHaveLength(0);
  });

  it('재개 — 상속할 대상이 없으면 답변 문장으로 대상을 추측하지 않고 재개를 거부한다', async () => {
    const planner = scripted([{ assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } }]);
    const { result, seen } = await run('약학정보원 게보린', planner, searchScript(), { matched: false }, { runId: 'g_wait02' });
    expect(result.errorCode).toBe('WORK_AGENT_RESUME_REJECTED');
    expect(result.resumable).toBe(false);
    expect(seen).toHaveLength(0);
    expect(planner.calls).toHaveLength(0);
  });

  it('회귀 — Candidate 대조가 없으면(matched:false) 기존 AI loop 와 같다', async () => {
    const planner = scripted(aiSearchPlan);
    const { result, seen } = await run('약학정보원에서 타이레놀 검색해줘', planner, searchScript());
    expect(seen.filter((s) => s.base === 'find')).toHaveLength(0);
    expect(result.history.map((h) => h.action.kind)).toEqual(['set_input', 'click']);
    expect(AI_TOOL_NAMES.WORK_AGENT_PERFORM).toBeTruthy();
  });
});
