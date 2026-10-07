/**
 * WO-O4O-PERSONAL-ASSISTANT-TASK-UNDERSTANDING-AND-COMPLETION-V1
 *
 *   "무엇을 해야 하는지와 언제 업무가 끝났는지는 Execution Runtime 이 아니라 Personal Assistant 가 책임진다."
 *
 *   ① 업무 이해 — 실행 전에 목표 · 결과 형태 · 완료조건 · 빠진 정보 · 확정 경계를 세운다(AI 실패 → 결정적 기본 이해)
 *   ② 완료 판정기 — 조건 ↔ 근거 비교: complete · continue(이유 반환) · ask(사용자 확인)
 *   ③ runtime — planner 의 done 은 주장일 뿐: 근거 없으면 이어서 일한다 · 근거가 이번 run 에서 읽은 글이어야 한다
 *   ④ 사용자 확인 조건 · 사용자 "됐어요" 선언 → Task 완료(실행 호출 없음)
 *   ⑤ 회귀 — 판정기 없음(직접 /work-agent/run) · 판정기 장애 → 종전 동작
 *   ⑥ §17 — 이해 · 인용 · 원문은 로그 · 저장 경로에 닿지 않는다
 *   ⑦ 계측 — 실행 비용(AI 호출 · 왕복 · 단계 · 시간)과 Assistant 판정 수치가 남는다
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

jest.mock('../services/assistant/task-ownership.js', () => ({
  resolveTaskOwnership: jest.fn(async () => ({ scope: 'USER', organizationId: null, serviceKey: null })),
}));

type Row = { taskId: string; requestedByUserId: string; taskTypeKey: string | null; status: string; ownershipScope: string; targetId: string | null };
const tasks = new Map<string, Row>();
const storeCalls: unknown[] = [];
let seq = 0;
jest.mock('../services/assistant/assistant-task-store.js', () => {
  const actual = jest.requireActual('../services/assistant/assistant-task-store.js');
  const view = (t: Row) => ({ ...t, organizationId: null, serviceKey: null, targetKind: null });
  return {
    ...actual,
    createAssistantTask: jest.fn(async (_ds: unknown, input: any) => {
      storeCalls.push(['create', input]);
      seq += 1;
      const row: Row = {
        taskId: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
        requestedByUserId: input.requestedByUserId, taskTypeKey: null, status: 'running', ownershipScope: input.ownership.scope, targetId: null,
      };
      tasks.set(row.taskId, row);
      return view(row);
    }),
    getAssistantTaskForRequester: jest.fn(async (_ds: unknown, taskId: string, userId: string) => {
      const t = tasks.get(taskId);
      return t && t.requestedByUserId === userId ? view(t) : null;
    }),
    findTaskIdByRun: jest.fn(async () => null),
    attachRunToTask: jest.fn(async () => true),
    recentTaskNodeIds: jest.fn(async () => []),
    updateAssistantTask: jest.fn(async (_ds: unknown, input: any) => {
      storeCalls.push(['update', input]);
      const t = tasks.get(input.taskId);
      if (!t) return null;
      t.status = input.status;
      if (input.taskTypeKey) t.taskTypeKey = input.taskTypeKey;
      if (typeof input.targetId === 'string') t.targetId = input.targetId;
      return view(t);
    }),
  };
});

// 사용자 완료 선언 경로만 coordination 을 가로챈다 — runtime 은 실제 구현을 그대로 쓴다.
const coord = { mock: false, row: null as any, transitioned: [] as any[] };
jest.mock('../services/ai-tools/work-run-coordination-service.js', () => {
  const actual = jest.requireActual('../services/ai-tools/work-run-coordination-service.js');
  return {
    ...actual,
    checkResumable: jest.fn((...a: any[]) => (coord.mock
      ? Promise.resolve(coord.row ? { ok: true, row: coord.row } : { ok: false, reason: 'terminal' })
      : actual.checkResumable(...a))),
    transitionWorkRun: jest.fn((...a: any[]) => {
      if (!coord.mock) return actual.transitionWorkRun(...a);
      coord.transitioned.push(a[1]);
      return Promise.resolve({ ...coord.row, status: a[1].status });
    }),
  };
});

const executeMock = jest.fn();
jest.mock('../utils/ai-provider-runtime.js', () => {
  const actual = jest.requireActual('../utils/ai-provider-runtime.js');
  return { ...actual, resolveAiTarget: jest.fn(async () => ({ provider: 'gemini', model: 'gemini-test', apiKey: 'k' })) };
});
jest.mock('@o4o/ai-core', () => ({ __esModule: true, execute: (...a: unknown[]) => executeMock(...a) }));

import logger from '../utils/logger.js';
import { LOCAL_AGENT_ACTIONS, parseLocalAction } from '../services/local-agent/local-agent-protocol.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import { runWorkAgent, buildPlannerUserPrompt, describeExecutionIntent, type PlannerInput, type WorkPlanner } from '../services/ai-tools/work-agent-runtime.js';
import { validateWorkProposal, WORK_GOAL_MAX_LENGTH, type CompletionJudge, type ExecutionIntent, type ExecutionReport, type TaskUnderstanding } from '../services/ai-tools/work-agent-contract.js';
import type { VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import { judgeTaskStatus, planAssistantTask } from '../services/assistant/assistant-planning.js';
import {
  __resetUnderstandingCacheForTest,
  cachedUnderstanding,
  createCompletionJudge,
  createLlmTaskUnderstander,
  fallbackUnderstanding,
  isCompletionDeclaration,
  newJudgeCounters,
  resumeFallbackUnderstanding,
  sanitizeUnderstanding,
} from '../services/assistant/assistant-understanding.js';
import { runAssistantWorkTask, type WorkExecutionReply } from '../services/assistant/personal-assistant.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

jest.setTimeout(180_000);

const ME = '00000000-0000-4000-8000-0000000000e1';
const SENTINEL = '게보린 SENTINEL_RAW_TEXT 처방';
const ds = {} as any;
const BASE = { taskId: null, resuming: false, priorTaskTypeKey: null, userMethodHint: false, nodeExperienceReachable: true };

const U = (criteria: TaskUnderstanding['criteria'], extra: Partial<TaskUnderstanding> = {}): TaskUnderstanding => ({
  version: 1, source: 'ai', goal: '아모디핀정 5mg 의 검색 결과 확인', outcome: 'information', criteria, missing: [], commitBoundary: false, ...extra,
});
const C1 = { id: 'c1', text: '아모디핀정 5mg 검색 결과가 보인다', evidence: 'observed' as const };
const C2_USER = { id: 'c2', text: '최종 저장은 사용자가 했다', evidence: 'user' as const };

beforeEach(() => {
  jest.clearAllMocks();
  tasks.clear();
  storeCalls.length = 0;
  coord.mock = false;
  coord.row = null;
  coord.transitioned = [];
  __resetUnderstandingCacheForTest();
});

describe('① 업무 이해(실행 전)', () => {
  it('결정적 기본 이해 — 요청이 목표 · "결과가 보인다" 조건 1개 · 결과 형태/확정 경계는 말 모양으로만', () => {
    const info = fallbackUnderstanding('약학정보원에서 아모디핀 찾아줘');
    expect(info).toMatchObject({ source: 'fallback', outcome: 'information', commitBoundary: false, missing: [] });
    expect(info.criteria).toEqual([{ id: 'c1', text: expect.stringContaining('아모디핀'), evidence: 'observed' }]);
    const change = fallbackUnderstanding('네뚜레에 신제품 등록해줘');
    expect(change).toMatchObject({ outcome: 'change', commitBoundary: true });
    // 확정은 사용자 — 변경 + 확정이 들어 있으면 사용자 확인 조건이 붙는다.
    expect(change.criteria.map((c) => c.evidence)).toEqual(['observed', 'user']);
    expect(fallbackUnderstanding('약학정보원 검색 페이지 열어줘').outcome).toBe('screen');
  });

  it('AI 이해 sanitize — 조건 최대 4 · id 재부여 · 형식 밖 slot 버림 · 필수 칸 없으면 null', () => {
    const u = sanitizeUnderstanding({
      goal: '  암로디핀 동일성분 제품 목록 확인 ', outcome: 'information', commitBoundary: 'yes',
      criteria: [{ text: 'a', evidence: 'observed' }, { text: 'b', evidence: 'user' }, { text: '' }, { text: 'c' }, { text: 'd' }, { text: 'e' }],
      missing: [{ slot: 'drug_name', question: '어떤 약인가요?' }, { slot: 'DROP TABLE', question: 'x' }],
    });
    expect(u).toMatchObject({ source: 'ai', goal: '암로디핀 동일성분 제품 목록 확인', commitBoundary: false });
    expect(u!.criteria.map((c) => `${c.id}:${c.text}:${c.evidence}`)).toEqual(['c1:a:observed', 'c2:b:user', 'c3:c:observed', 'c4:d:observed']);
    expect(u!.missing).toEqual([{ slot: 'drug_name', question: '어떤 약인가요?' }]);
    expect(sanitizeUnderstanding({ goal: 'x', outcome: 'other', criteria: [{ text: 'a' }] })).toBeNull();
    expect(sanitizeUnderstanding({ goal: 'x', outcome: 'screen', criteria: [] })).toBeNull();
  });

  it('확정 경계(commitBoundary) — AI 가 user 조건을 빠뜨려도 결정적으로 붙는다 · 상한 4 안에서(마지막 observed 를 대신한다)', () => {
    const one = sanitizeUnderstanding({ goal: '신제품 등록', outcome: 'change', commitBoundary: true, criteria: [{ text: '입력 값이 폼에 보인다', evidence: 'observed' }] });
    expect(one!.criteria.map((c) => `${c.id}:${c.evidence}`)).toEqual(['c1:observed', 'c2:user']);
    expect(one!.commitBoundary).toBe(true);
    const full = sanitizeUnderstanding({
      goal: '신제품 등록', outcome: 'change', commitBoundary: true,
      criteria: [{ text: 'a' }, { text: 'b' }, { text: 'c' }, { text: 'd' }],
    });
    expect(full!.criteria.map((c) => `${c.id}:${c.text.length > 3 ? 'U' : c.text}:${c.evidence}`)).toEqual(['c1:a:observed', 'c2:b:observed', 'c3:c:observed', 'c4:U:user']);
    // 이미 user 조건이 있으면 그대로 · 확정 경계가 없으면 붙이지 않는다.
    const has = sanitizeUnderstanding({ goal: 'x', outcome: 'change', commitBoundary: true, criteria: [{ text: 'a' }, { text: '저장은 사용자', evidence: 'user' }] });
    expect(has!.criteria).toHaveLength(2);
    const none = sanitizeUnderstanding({ goal: 'x', outcome: 'change', commitBoundary: false, criteria: [{ text: 'a' }] });
    expect(none!.criteria.map((c) => c.evidence)).toEqual(['observed']);
    // 판정 — observed 근거가 다 있어도 확정 경계 업무는 complete 가 아니라 사용자 확인.
    return createCompletionJudge(one!)({ evidence: [{ criterionId: 'c1', source: 'screen', quote: 'x', grounded: true }] } as any)
      .then((v) => expect(v).toMatchObject({ decision: 'ask', askKind: 'success_confirmation', unmet: ['c2'] }));
  });

  it('AI 이해 — 실행이 받는 요청 전체(작업 목표 상한)를 넘긴다 · 뒤쪽 지시가 잘리지 않는다', async () => {
    executeMock.mockResolvedValueOnce({ content: JSON.stringify({ goal: 'g', outcome: 'information', criteria: [{ text: 'a' }] }) });
    const tail = '마지막에 결과 표를 확인해줘';
    const request = `${'가'.repeat(1500)} ${tail}`;
    const u = await createLlmTaskUnderstander(ds)({ request });
    expect(u).toMatchObject({ source: 'ai', goal: 'g' });
    const sent = executeMock.mock.calls[0][0] as { userPrompt: string; meta: { callerName: string } };
    expect(sent.meta.callerName).toBe('TaskUnderstanding');
    expect(sent.userPrompt).toContain(tail);
    // 상한은 실행 목표 상한과 같다(그 이상은 실행도 받지 않는다).
    executeMock.mockResolvedValueOnce({ content: '{}' });
    await createLlmTaskUnderstander(ds)({ request: 'x'.repeat(WORK_GOAL_MAX_LENGTH + 500) });
    expect((executeMock.mock.calls[1][0] as { userPrompt: string }).userPrompt).toContain('x'.repeat(WORK_GOAL_MAX_LENGTH));
    expect((executeMock.mock.calls[1][0] as { userPrompt: string }).userPrompt).not.toContain('x'.repeat(WORK_GOAL_MAX_LENGTH + 1));
  });

  it('이해가 있으면 완료 계약은 criteria_evidence · 실행 지시 프롬프트에 목표 · 조건 · 빠진 정보 · 확정 경계가 실린다', () => {
    const u = U([C1, C2_USER], { missing: [{ slot: 'drug_name', question: '어떤 약인가요?' }], commitBoundary: true });
    const { intent } = planAssistantTask({ ...BASE, understanding: u });
    expect(intent.completion).toEqual({ requires: 'criteria_evidence', acceptsUserCompletion: true });
    const text = describeExecutionIntent(intent);
    expect(text).toContain('## 업무 이해 (Assistant · 실행 전)');
    expect(text).toContain('c1: 아모디핀정 5mg 검색 결과가 보인다');
    expect(text).toContain('사용자 확인');
    expect(text).toContain('어떤 약인가요?');
    // 이해가 없으면 종전 계약 · 키 그대로.
    expect(planAssistantTask(BASE).intent).not.toHaveProperty('understanding');
    expect(planAssistantTask(BASE).intent.completion.requires).toBe('result_observed');
  });

  it('planner 제안의 evidence — 조건 id 형식 · 개수 · 길이 상한(형식 밖은 버린다)', () => {
    const p = validateWorkProposal({
      assessment: 'completed', action: { kind: 'done' },
      evidence: [{ criterion: 'c1', source: 'read', quote: 'x'.repeat(500) }, { criterion: 'c9', source: 'read', quote: 'y' }, { criterion: 'c2', source: 'other', quote: 'z' }],
    });
    expect(p.ok).toBe(true);
    const ev = p.ok ? p.proposal.evidence : null;
    expect(ev).toHaveLength(1);
    expect(ev![0].quote.length).toBeLessThanOrEqual(120);
  });
});

describe('② 완료 판정기', () => {
  const G = (criterionId: string, grounded = true) => ({ criterionId, source: 'read' as const, quote: 'q', grounded });
  it('모든 화면 조건 근거 + 사용자 조건 없음 → complete', async () => {
    const judge = createCompletionJudge(U([C1]));
    expect(await judge({ evidence: [G('c1')], via: 'done' })).toMatchObject({ decision: 'complete', met: ['c1'], unmet: [] });
  });
  it('근거 없음 → continue(조건 문장으로 이유) · 반복되면 ask(success_confirmation)', async () => {
    const counters = newJudgeCounters();
    const judge = createCompletionJudge(U([C1]), { counters });
    const v1 = await judge({ evidence: [], via: 'done' });
    expect(v1).toMatchObject({ decision: 'continue', unmet: ['c1'] });
    expect(v1.note).toContain('아모디핀정 5mg 검색 결과가 보인다');
    expect((await judge({ evidence: [G('c1', false)], via: 'done' })).decision).toBe('continue');
    expect(await judge({ evidence: [], via: 'done' })).toMatchObject({ decision: 'ask', askKind: 'success_confirmation' });
    expect(counters).toMatchObject({ judgeCalls: 3, continuations: 2 });
  });
  it('화면 조건 충족 + 사용자 조건 → ask(success_confirmation) — 확정은 사용자가 말한다', async () => {
    const judge = createCompletionJudge(U([C1, C2_USER]));
    expect(await judge({ evidence: [G('c1')], via: 'done' })).toMatchObject({ decision: 'ask', met: ['c1'], unmet: ['c2'], askKind: 'success_confirmation' });
  });
  it('의미 검증 — 거절한 조건은 미충족 · 검증기 장애는 결정적 결과 유지', async () => {
    const counters = newJudgeCounters();
    const rejecting = createCompletionJudge(U([C1]), { verify: async () => ['c1'], counters });
    expect((await rejecting({ evidence: [G('c1')], via: 'done' })).decision).toBe('continue');
    expect(counters.aiCalls).toBe(1);
    const broken = createCompletionJudge(U([C1]), { verify: async () => { throw new Error('provider down'); } });
    expect((await broken({ evidence: [G('c1')], via: 'done' })).decision).toBe('complete');
  });
  it('Task 상태 — criteria_evidence 는 Assistant 판정이 정한다 · 판정 없으면 종전 결과 근거 규칙', () => {
    const c = planAssistantTask({ ...BASE, understanding: U([C1]) }).intent.completion;
    const r = (x: Partial<ExecutionReport>): ExecutionReport => ({
      claim: 'execution_complete', runOpened: true, resultObserved: true, replayVerified: false, plannerMode: 'discovery', taskTypeProposal: null, ...x,
    });
    expect(judgeTaskStatus(c, r({ verdict: { decision: 'complete', met: ['c1'], unmet: [] } }))).toBe('completed');
    // 화면 이동 성공(resultObserved)이 있어도 판정이 complete 가 아니면 완료가 아니다.
    expect(judgeTaskStatus(c, r({ verdict: { decision: 'continue', met: [], unmet: ['c1'] } }))).toBe('handed_over');
    expect(judgeTaskStatus(c, r({ verdict: null }))).toBe('completed');
    expect(judgeTaskStatus(c, r({ verdict: null, resultObserved: false }))).toBe('handed_over');
  });
});

describe('사용자 완료 선언 판별', () => {
  it('강한 표현은 질문 종류 무관 · "네" 는 성공 확인 질문에만 · 부정 · 긴 문장은 아니다', () => {
    expect(isCompletionDeclaration('됐어요', null)).toBe(true);
    expect(isCompletionDeclaration('완료했습니다', 'value_confirmation')).toBe(true);
    expect(isCompletionDeclaration('다 했어요!', null)).toBe(true);
    expect(isCompletionDeclaration('네', 'success_confirmation')).toBe(true);
    expect(isCompletionDeclaration('네', 'value_confirmation')).toBe(false);
    expect(isCompletionDeclaration('안 됐어요', 'success_confirmation')).toBe(false);
    expect(isCompletionDeclaration('아직 못 했어요', null)).toBe(false);
    expect(isCompletionDeclaration('됐고 이제 두 번째 제품도 등록해줘', null)).toBe(false);
    expect(isCompletionDeclaration('게보린', 'value_confirmation')).toBe(false);
  });
});

// ── ③ runtime ──────────────────────────────────────────────────────────────

const A = LOCAL_AGENT_ACTIONS;
const SITE = 'healthkr';
const SNAP = 's_abcd1234';
const REQUEST = '약학정보원에서 아모디핀 찾아줘';
const ctx = (): VerifiedToolContext => ({ userId: 'user-1', workspace: 'home', localAgentStatus: 'connected', localDeviceId: 'dev-1' });
type Outcome = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: unknown };
const OK = (data: Record<string, unknown>): Outcome => ({ status: 'success', data: { siteId: SITE, ...data } });
const CTX = (path: string, docId: string): Outcome => OK({ active: true, ready: true, path, docId });
const EL = (elementRef: string, role: string, name: string) => ({ elementRef, role, name });
const HOME = [EL('e_1', 'heading', '약학정보원'), EL('e_2', 'searchbox', '약물명'), EL('e_3', 'button', '검 색')];
const RESULTS = [...HOME, EL('e_9', 'link', '아모디핀정 5mg')];
const INSPECT = (els: ReturnType<typeof EL>[]) => OK({ snapshotId: SNAP, elements: els, elementCount: els.length });
const CLICK = { assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } };
const DONE = { assessment: 'completed', action: { kind: 'done' } };
const DONE_EV = (quote: string, criterion = 'c1') => ({ assessment: 'completed', action: { kind: 'done' }, evidence: [{ criterion, source: 'screen', quote }] });

async function drive(db: LocalAgentDb, script: Record<string, Outcome[]>, max = 80) {
  const cursors: Record<string, number> = {};
  let k = 0;
  while (k < max) {
    for (let i = 0; i < 400 && db.commands.length <= k; i += 1) await new Promise((r) => setTimeout(r, 5));
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
    if (base === A.DATA_WORK_RUN_EXPERIENCE_RECALL) { await reply(args.taskKey === null ? { taskKeys: [] } : { patterns: [] }); continue; }
    if (base === A.DATA_WORK_RUN_CONTEXT_RECALL) { await reply({ found: false }); continue; }
    if (base === A.DATA_WORK_RUN_CANDIDATE_MATCH) { await reply({ matched: false }); continue; }
    if (base.startsWith('local.data.work_run_')) { await reply({ runId: 'r_test', runStatus: 'active', saved: true }); continue; }
    const queue = script[base] ?? [{ status: 'failed', errorCode: 'DOM_ELEMENT_NOT_FOUND' }];
    const idx = Math.min(cursors[base] ?? 0, queue.length - 1);
    cursors[base] = (cursors[base] ?? 0) + 1;
    const o = queue[idx];
    await submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: o.status, errorCode: o.errorCode, data: o.data } as any);
  }
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

async function run(planner: WorkPlanner, script: Record<string, Outcome[]>, intent?: ExecutionIntent, judge?: CompletionJudge) {
  const db = makeDb();
  await pairAndRegister(db);
  await connected(db);
  const [result] = await Promise.all([
    runWorkAgent(db.dataSource, ctx(), { request: REQUEST, ...(intent ? { intent } : {}), ...(judge ? { judge } : {}) }, planner),
    drive(db, script),
  ]);
  return result;
}

const SEARCH = {
  get_context: [CTX('/', 'd_1'), CTX('/search', 'd_2')],
  inspect: [INSPECT(HOME), INSPECT(RESULTS)],
  click: [OK({ elementRef: 'e_3', changed: true, navigated: true, role: 'button', riskLevel: 'REVERSIBLE' })],
  read_text: [OK({ elementRef: 'e_9', role: 'link', text: '아모디핀정 5mg 성분: 암로디핀베실산염 6.94mg', textLength: 26 })],
};

describe('③ runtime — done 은 주장일 뿐 · Assistant 가 조건과 근거로 판정', () => {
  it('근거 없는 done → continue(이유가 다음 계획에 실린다) → 실제 읽은 글 인용 → complete', async () => {
    const u = U([{ id: 'c1', text: '아모디핀정 5mg 의 성분이 보인다', evidence: 'observed' }]);
    const intent = planAssistantTask({ ...BASE, understanding: u }).intent;
    const counters = newJudgeCounters();
    const planner = scripted([
      CLICK,
      DONE, // 화면 이동 성공 직후 "완료" — 성분은 아직 읽지 않았다
      { assessment: 'progress', action: { kind: 'read_text', elementRef: 'e_9' } },
      DONE_EV('성분: 암로디핀베실산염'),
    ]);
    const result = await run(planner, SEARCH, intent, createCompletionJudge(u, { counters }));
    expect(planner.calls[2].assistantFeedback).toMatchObject({ unmet: ['c1'] });
    expect(buildPlannerUserPrompt(planner.calls[2])).toContain('## Assistant 판정');
    expect(planner.calls[3].assistantFeedback).toBeUndefined();
    expect(result.goal.status).toBe('completed');
    expect(result.report?.verdict).toMatchObject({ decision: 'complete', met: ['c1'] });
    expect(result.report?.evidence).toEqual([{ criterionId: 'c1', source: 'screen', quote: '성분: 암로디핀베실산염', grounded: true }]);
    expect(judgeTaskStatus(intent.completion, result.report!)).toBe('completed');
    expect(counters).toMatchObject({ judgeCalls: 2, continuations: 1 });
    // ⑦ 계측
    expect(result.report?.metrics).toMatchObject({ aiCalls: 4, stepCount: expect.any(Number), totalMs: expect.any(Number) });
    expect(result.report!.metrics!.roundTrips).toBeGreaterThan(0);
  });

  it('지어낸 인용 · 내가 입력한 값의 인용은 근거가 아니다 → 이어서 일하다 사용자 확인으로', async () => {
    const u = U([C1]);
    const intent = planAssistantTask({ ...BASE, understanding: u }).intent;
    const planner = scripted([
      { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: '아모디핀정' } },
      CLICK,
      DONE_EV('아모디핀정'), // 내가 입력한 값 그대로
      DONE_EV('아모디핀정 10mg 품절'), // 화면에 없던 글
      DONE_EV('아모디핀정 10mg 품절'),
    ]);
    const result = await run(planner, { ...SEARCH, set_input: [OK({ elementRef: 'e_2', hasValue: true })] }, intent, createCompletionJudge(u));
    expect(result.report?.evidence?.every((e) => e.grounded === false)).toBe(true);
    expect(result.goal.status).toBe('waiting_for_user');
    expect(result.report).toMatchObject({ claim: 'needs_user', verdict: { decision: 'ask', askKind: 'success_confirmation' } });
    expect(result.report?.memory?.resumeFrame?.ask).toEqual({ kind: 'success_confirmation', slots: [] });
    // 화면 이동은 성공했지만(resultObserved) Task 는 완료가 아니다.
    expect(result.report?.resultObserved).toBe(true);
    expect(judgeTaskStatus(intent.completion, result.report!)).toBe('waiting_for_user');
  });

  it('사용자 확인 조건 — 화면 조건이 충족돼도 Assistant 가 성공 확인을 묻는다', async () => {
    const u = U([{ id: 'c1', text: '아모디핀정 5mg 이 결과에 보인다', evidence: 'observed' }, C2_USER]);
    const intent = planAssistantTask({ ...BASE, understanding: u }).intent;
    const result = await run(scripted([CLICK, DONE_EV('아모디핀정 5mg')]), SEARCH, intent, createCompletionJudge(u));
    expect(result.report?.evidence?.[0].grounded).toBe(true); // 관찰 요소 이름도 이번 run 에서 본 글이다
    expect(result.goal.status).toBe('waiting_for_user');
    expect(result.report?.verdict).toMatchObject({ decision: 'ask', met: ['c1'], unmet: ['c2'] });
  });

  it('goal_sufficiently_advanced 인계도 판정기를 거친다 — complete 면 실행 완료 보고', async () => {
    const u = U([{ id: 'c1', text: '아모디핀정 5mg 이 결과에 보인다', evidence: 'observed' }]);
    const intent = planAssistantTask({ ...BASE, understanding: u }).intent;
    const takeover = { assessment: 'blocked', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' }, evidence: [{ criterion: 'c1', source: 'screen', quote: '아모디핀정 5mg' }] };
    const result = await run(scripted([CLICK, takeover]), SEARCH, intent, createCompletionJudge(u));
    expect(result.report?.claim).toBe('execution_complete');
    expect(judgeTaskStatus(intent.completion, result.report!)).toBe('completed');
  });
});

describe('⑤ 회귀', () => {
  it('판정기 없음(/work-agent/run 직접) — 이해가 있어도 done 은 종전처럼 완료 · 판정 없음', async () => {
    const intent = planAssistantTask({ ...BASE, understanding: U([C1]) }).intent;
    const result = await run(scripted([CLICK, DONE]), SEARCH, intent);
    expect(result.goal.status).toBe('completed');
    expect(result.report?.verdict ?? null).toBeNull();
    expect(judgeTaskStatus(intent.completion, result.report!)).toBe('completed'); // 종전 결과 근거 규칙
  });

  it('판정기 장애 — 완료를 막지도 꾸며내지도 않는다(종전 경로)', async () => {
    const intent = planAssistantTask({ ...BASE, understanding: U([C1]) }).intent;
    const broken: CompletionJudge = async () => { throw new Error('judge down'); };
    const result = await run(scripted([CLICK, DONE]), SEARCH, intent, broken);
    expect(result.goal.status).toBe('completed');
    expect(result.report?.verdict).toBeNull();
    expect((logger.warn as jest.Mock).mock.calls.some((c) => c[0] === 'work-agent completion judge failed')).toBe(true);
  });
});

// ── ④ Assistant 경로 ─────────────────────────────────────────────────────────

describe('④ Assistant — 이해 → 판정기 위임 → 질문 → 사용자 "됐어요"', () => {
  const waiting = (runId: string): WorkExecutionReply => ({
    status: 200,
    body: { success: true, data: { runId, goal: { status: 'waiting_for_user', siteId: SITE }, target: { targetId: SITE, targetType: 'browser_site' } } },
    execution: {
      taskKey: null,
      report: {
        claim: 'needs_user', runOpened: true, resultObserved: true, replayVerified: false, plannerMode: 'discovery', taskTypeProposal: null,
        verdict: { decision: 'ask', met: ['c1'], unmet: ['c2'], askKind: 'success_confirmation' },
      },
    },
  });

  it('새 요청 — Assistant 가 이해를 세우고(주입 understander) 판정기를 실행에 넘긴다 · 재개는 같은 이해를 이어 쓴다', async () => {
    const understand = jest.fn(async () => U([C1, C2_USER]));
    const exec = jest.fn(async (): Promise<WorkExecutionReply> => waiting('g_u1'));
    const out = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: REQUEST } }, exec, { understand });
    expect(understand).toHaveBeenCalledTimes(1);
    const [, , intent, judge] = exec.mock.calls[0] as unknown as [string, unknown, ExecutionIntent, CompletionJudge];
    expect(intent.understanding).toMatchObject({ source: 'ai', criteria: [C1, C2_USER] });
    expect(intent.completion.requires).toBe('criteria_evidence');
    expect(typeof judge).toBe('function');
    expect(out.task?.status).toBe('waiting_for_user');
    expect(cachedUnderstanding(out.task!.taskId)).toMatchObject({ goal: U([]).goal });

    // 재개(사용자가 값을 답함) — 이해를 다시 세우지 않고 캐시를 쓴다.
    const exec2 = jest.fn(async (): Promise<WorkExecutionReply> => waiting('g_u1'));
    await runAssistantWorkTask(ds, { userId: ME, workBody: { request: '5mg 로', runId: 'g_u1' }, requestedTaskId: out.task!.taskId }, exec2, { understand });
    expect(understand).toHaveBeenCalledTimes(1);
    expect((exec2.mock.calls[0] as any)[2].understanding).toMatchObject({ criteria: [C1, C2_USER] });
  });

  it('다른 인스턴스 재개(캐시 없음) — 종전 결과 근거로 조용히 닫지 않고 사용자 확인 조건 하나로 판정한다', async () => {
    const understand = jest.fn(async () => U([C1]));
    const out = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: REQUEST } }, jest.fn(async () => waiting('g_r1')), { understand });
    // 이해를 세운 인스턴스가 사라졌다(재시작 · 다른 인스턴스) — 프로세스 메모리 캐시만 비운다.
    __resetUnderstandingCacheForTest();
    const exec2 = jest.fn(async (): Promise<WorkExecutionReply> => waiting('g_r1'));
    await runAssistantWorkTask(ds, { userId: ME, workBody: { request: '5mg 로', runId: 'g_r1' }, requestedTaskId: out.task!.taskId }, exec2, { understand });
    expect(understand).toHaveBeenCalledTimes(1); // 원래 요청은 재개에 오지 않는다 — 다시 세우지 않는다
    const [, , intent, judge] = exec2.mock.calls[0] as unknown as [string, unknown, ExecutionIntent, CompletionJudge];
    expect(intent.understanding).toEqual(resumeFallbackUnderstanding());
    expect(intent.completion.requires).toBe('criteria_evidence');
    // 실행이 "끝났다" 고 해도 complete 가 아니라 사용자 성공 확인.
    await expect(judge({ evidence: [] } as any)).resolves.toMatchObject({ decision: 'ask', askKind: 'success_confirmation' });
    expect(logger.info).toHaveBeenCalledWith('assistant plan', expect.objectContaining({ understandingSource: 'resume_fallback', criteria: 1 }));
  });

  it('이해 호출 실패 → 결정적 기본 이해로 진행(업무를 막지 않는다)', async () => {
    const exec = jest.fn(async (): Promise<WorkExecutionReply> => ({ status: 403, body: { success: false } }));
    await runAssistantWorkTask(ds, { userId: ME, workBody: { request: REQUEST } }, exec, { understand: async () => { throw new Error('provider down'); } });
    expect((exec.mock.calls[0] as any)[2].understanding).toMatchObject({ source: 'fallback' });
  });

  it('질문 대기 중 "됐어요" — 실행을 다시 돌리지 않고 run 을 완료로 닫고 Task completed', async () => {
    const first = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: REQUEST } }, jest.fn(async () => waiting('g_d1')));
    expect(first.task?.status).toBe('waiting_for_user');
    coord.mock = true;
    coord.row = { runId: 'g_d1', userId: ME, status: 'waiting_for_user', version: 3 };
    const exec = jest.fn();
    const out = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: '됐어요', runId: 'g_d1' }, requestedTaskId: first.task!.taskId }, exec);
    expect(exec).not.toHaveBeenCalled();
    expect(coord.transitioned).toEqual([{ runId: 'g_d1', status: 'completed', expectedVersion: 3 }]);
    expect(out.task?.status).toBe('completed');
    expect(out.reply.body.data).toMatchObject({ runId: 'g_d1', resumable: false, progress: 'completed', goal: { status: 'completed' } });
    expect(cachedUnderstanding(first.task!.taskId)).toBeNull();
    const done = (logger.info as jest.Mock).mock.calls.find((c) => c[0] === 'assistant task completion' && c[1].completedBy === 'user_declared');
    expect(done).toBeTruthy();
  });

  it('"됐어요" 여도 run 이 이미 종결 · 만료면 선언으로 닫지 않고 일반 재개 경로로 간다', async () => {
    const first = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: REQUEST } }, jest.fn(async () => waiting('g_d2')));
    coord.mock = true;
    coord.row = null;
    const exec = jest.fn(async (): Promise<WorkExecutionReply> => ({ status: 200, body: { success: true, data: { runId: null } } }));
    await runAssistantWorkTask(ds, { userId: ME, workBody: { request: '됐어요', runId: 'g_d2' }, requestedTaskId: first.task!.taskId }, exec);
    expect(exec).toHaveBeenCalledTimes(1);
    expect(coord.transitioned).toEqual([]);
  });

  it('값 답변("게보린")은 선언이 아니다 — 실행으로 이어간다', async () => {
    const first = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: REQUEST } }, jest.fn(async () => waiting('g_d3')));
    coord.mock = true;
    coord.row = { runId: 'g_d3', userId: ME, status: 'waiting_for_user', version: 1 };
    const exec = jest.fn(async (): Promise<WorkExecutionReply> => waiting('g_d3'));
    await runAssistantWorkTask(ds, { userId: ME, workBody: { request: '게보린', runId: 'g_d3' }, requestedTaskId: first.task!.taskId }, exec);
    expect(exec).toHaveBeenCalledTimes(1);
    expect(coord.transitioned).toEqual([]);
  });

  it('Assistant 판정 complete → completedBy=criteria · 계측 한 줄(수치 · enum 만)', async () => {
    const exec = jest.fn(async (): Promise<WorkExecutionReply> => ({
      status: 200,
      body: { success: true, data: { runId: 'g_c1', goal: { status: 'completed', siteId: SITE }, target: { targetId: SITE, targetType: 'browser_site' } } },
      execution: {
        taskKey: null,
        report: {
          claim: 'execution_complete', runOpened: true, resultObserved: true, replayVerified: false, plannerMode: 'discovery', taskTypeProposal: null,
          verdict: { decision: 'complete', met: ['c1'], unmet: [] },
          metrics: { aiCalls: 3, aiMs: 1200, roundTrips: 7, stepCount: 4, totalMs: 9000 },
        },
      },
    }));
    const out = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: REQUEST } }, exec);
    expect(out.task?.status).toBe('completed');
    const line = (logger.info as jest.Mock).mock.calls.find((c) => c[0] === 'assistant task completion')?.[1];
    expect(line).toMatchObject({
      outcome: 'completed', completedBy: 'criteria', understandingSource: 'fallback', criteria: 1, verdict: 'complete',
      executionAiCalls: 3, executionAiMs: 1200, roundTrips: 7, stepCount: 4, questions: 0, totalMs: expect.any(Number),
    });
  });
});

describe('⑥ §17 — 이해 · 원문은 로그 · 저장 경로에 닿지 않는다', () => {
  it('sentinel 요청 — 실행 지시(메모리)에는 이해가 있지만 로그 · Task 저장 호출에는 없다', async () => {
    const exec = jest.fn(async (): Promise<WorkExecutionReply> => ({ status: 403, body: { success: false } }));
    await runAssistantWorkTask(ds, { userId: ME, workBody: { request: SENTINEL } }, exec, {
      understand: async () => U([{ id: 'c1', text: `${SENTINEL} 결과가 보인다`, evidence: 'observed' }], { goal: SENTINEL }),
    });
    expect(JSON.stringify((exec.mock.calls[0] as any)[2].understanding)).toContain('SENTINEL_RAW_TEXT');
    const logged = JSON.stringify([
      (logger.info as jest.Mock).mock.calls, (logger.warn as jest.Mock).mock.calls, (logger.error as jest.Mock).mock.calls, storeCalls,
    ]);
    expect(logged).not.toContain('SENTINEL_RAW_TEXT');
    expect(logged).not.toContain('게보린');
  });

  it('runtime — 인용 · 조건 글은 run 로그에 실리지 않는다', async () => {
    const u = U([{ id: 'c1', text: 'SENTINEL_CRITERION 이 보인다', evidence: 'observed' }]);
    const intent = planAssistantTask({ ...BASE, understanding: u }).intent;
    await run(scripted([CLICK, { assessment: 'progress', action: { kind: 'read_text', elementRef: 'e_9' } }, DONE_EV('암로디핀베실산염')]), SEARCH, intent, createCompletionJudge(u));
    const logged = JSON.stringify([(logger.info as jest.Mock).mock.calls, (logger.warn as jest.Mock).mock.calls]);
    expect(logged).not.toContain('SENTINEL_CRITERION');
    expect(logged).not.toContain('암로디핀베실산염');
  });
});
