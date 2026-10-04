/**
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-B-PLANNING-SEPARATION-V1 — Assistant Planning ≠ Execution Planning
 *
 *   ① Assistant Planning 은 Task 수행 방향(ExecutionIntent)을 정한다 — 재개 · 이어받기 · 사용자 방법 힌트 · 새 업무
 *   ② ExecutionIntent 에는 절차(Workflow)를 지정하는 칸이 없고, Task type 은 이어받기 힌트일 뿐이다
 *   ③ 모든 근거는 비구속이며, 결정적 실행을 허락할 수 있는 근거는 자기 Experience 뿐 — Shared Candidate 는 못 한다(P3)
 *   ④ Task 소유 범위(USER / ORGANIZATION)는 수행 방향을 바꾸지 않는다
 *   ⑤ Task 완료는 Execution 의 주장이 아니라 완료 계약 + 실행 근거로 Assistant 가 판정한다
 *   ⑥ runtime — planner 는 실행 지시를 받고, 결과로 ExecutionReport 를 돌려준다 · 지시가 없으면 종전과 같다
 *   ⑦ sentinel — 요청 원문은 실행 지시 · Task 저장 경로에 닿지 않는다
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

let ownershipScope: 'USER' | 'ORGANIZATION' = 'USER';
jest.mock('../services/assistant/task-ownership.js', () => ({
  resolveTaskOwnership: jest.fn(async () =>
    ownershipScope === 'ORGANIZATION'
      ? { scope: 'ORGANIZATION', organizationId: '00000000-0000-4000-8000-0000000000aa', serviceKey: 'kpa-society' }
      : { scope: 'USER', organizationId: null, serviceKey: null }),
}));

type Row = { taskId: string; requestedByUserId: string; taskTypeKey: string | null; status: string; ownershipScope: string };
const tasks = new Map<string, Row>();
const storeCalls: unknown[] = [];
let seq = 0;
jest.mock('../services/assistant/assistant-task-store.js', () => {
  const actual = jest.requireActual('../services/assistant/assistant-task-store.js');
  return {
    ...actual,
    createAssistantTask: jest.fn(async (_ds: unknown, input: any) => {
      storeCalls.push(['create', input]);
      seq += 1;
      const row: Row = {
        taskId: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
        requestedByUserId: input.requestedByUserId,
        taskTypeKey: null,
        status: 'running',
        ownershipScope: input.ownership.scope,
      };
      tasks.set(row.taskId, row);
      return { ...row, organizationId: null, serviceKey: null, targetKind: null, targetId: null };
    }),
    getAssistantTaskForRequester: jest.fn(async (_ds: unknown, taskId: string, userId: string) => {
      const t = tasks.get(taskId);
      return t && t.requestedByUserId === userId ? { ...t, organizationId: null, serviceKey: null, targetKind: null, targetId: null } : null;
    }),
    findTaskIdByRun: jest.fn(async () => null),
    attachRunToTask: jest.fn(async () => true),
    updateAssistantTask: jest.fn(async (_ds: unknown, input: any) => {
      storeCalls.push(['update', input]);
      const t = tasks.get(input.taskId);
      if (!t) return null;
      t.status = input.status;
      if (input.taskTypeKey) t.taskTypeKey = input.taskTypeKey;
      return { ...t, organizationId: null, serviceKey: null, targetKind: null, targetId: null };
    }),
  };
});

import { LOCAL_AGENT_ACTIONS, parseLocalAction } from '../services/local-agent/local-agent-protocol.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import {
  runWorkAgent, buildPlannerUserPrompt, describeExecutionIntent,
  type PlannerInput, type WorkPlanner,
} from '../services/ai-tools/work-agent-runtime.js';
import type { ExecutionIntent, ExecutionReport } from '../services/ai-tools/work-agent-contract.js';
import type { VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import { judgeTaskStatus, planAssistantTask, planningEvidence } from '../services/assistant/assistant-planning.js';
import { runAssistantWorkTask, type WorkExecutionReply } from '../services/assistant/personal-assistant.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

jest.setTimeout(180_000);

const SENTINEL = '게보린 SENTINEL_RAW_TEXT 처방 내용';
const ME = '00000000-0000-4000-8000-0000000000e1';
const ds = {} as any;
const BASE = { taskId: null, resuming: false, priorTaskTypeKey: null, userMethodHint: false, nodeExperienceReachable: true };
const report = (r: Partial<ExecutionReport>): ExecutionReport => ({
  claim: 'execution_complete', runOpened: true, resultObserved: false, replayVerified: false, plannerMode: 'discovery', taskTypeProposal: null, ...r,
});

beforeEach(() => {
  jest.clearAllMocks();
  tasks.clear();
  storeCalls.length = 0;
  ownershipScope = 'USER';
});

describe('① Assistant Planning — 수행 방향', () => {
  it('새 업무 → Discovery 로 시작 · 재개 → resume · 이어받기 → 이전 Task type 힌트 · 사용자 방법 힌트 → user_method_hint', () => {
    expect(planAssistantTask(BASE)).toMatchObject({ reason: 'new_task', intent: { startMode: 'discovery', taskTypeHint: null } });
    expect(planAssistantTask({ ...BASE, resuming: true })).toMatchObject({ reason: 'resume_same_run', intent: { startMode: 'resume' } });
    expect(planAssistantTask({ ...BASE, priorTaskTypeKey: 'drug_info.search' }))
      .toMatchObject({ reason: 'continue_task', intent: { startMode: 'discovery', taskTypeHint: 'drug_info.search' } });
    expect(planAssistantTask({ ...BASE, userMethodHint: true, priorTaskTypeKey: 'drug_info.search' }).reason).toBe('user_method_hint');
  });

  it('완료 계약과 승인 경계는 언제나 같다 — 결과 근거 필요 · 사용자 완료 인정 · 확정 · 인증은 사용자', () => {
    const { intent } = planAssistantTask(BASE);
    expect(intent.completion).toEqual({ requires: 'result_observed', acceptsUserCompletion: true });
    expect(intent.approval).toEqual({ commit: 'user_only', credential: 'user_only' });
  });
});

describe('② 실행 지시는 Workflow 선택이 아니다', () => {
  it('ExecutionIntent 에 절차 · workflow · candidate · skill 을 지정하는 칸이 없다', () => {
    const { intent } = planAssistantTask({ ...BASE, priorTaskTypeKey: 'drug_info.search' });
    expect(Object.keys(intent).sort()).toEqual(['approval', 'completion', 'evidence', 'startMode', 'taskId', 'taskTypeHint', 'version']);
    expect(JSON.stringify(intent)).not.toMatch(/workflow|procedure|candidateId|skillId|steps/i);
  });

  it('같은 Task type 이어도 지시는 절차를 고정하지 않는다 — 힌트는 프롬프트에서 "절차를 고정하는 키가 아니다" 로 전달된다', () => {
    const text = describeExecutionIntent(planAssistantTask({ ...BASE, priorTaskTypeKey: 'drug_info.search' }).intent);
    expect(text).toContain('drug_info.search');
    expect(text).toContain('절차를 고정하는 키가 아니다');
  });
});

describe('③ 근거는 비구속 · Shared 는 결정적 실행을 허락하지 않는다 (P3)', () => {
  it('모든 근거 binding=false · mayAuthorizeExperienced 는 own_experience 만', () => {
    const ev = planningEvidence(true);
    expect(ev.map((e) => e.source)).toEqual(['own_experience', 'knowledge', 'shared_candidate', 'discovery']);
    expect(ev.every((e) => e.binding === false)).toBe(true);
    expect(ev.filter((e) => e.mayAuthorizeExperienced).map((e) => e.source)).toEqual(['own_experience']);
  });

  it('Shared Candidate 가 배선되더라도 프롬프트에는 "참고만(강제 아님)" 으로만 들어간다', () => {
    const { intent } = planAssistantTask(BASE);
    const withShared: ExecutionIntent = {
      ...intent,
      evidence: intent.evidence.map((e) => (e.source === 'shared_candidate' ? { ...e, available: true } : e)),
    };
    expect(describeExecutionIntent(withShared)).toContain('다른 사용자 후보는 참고만(강제 아님)');
    expect(describeExecutionIntent(intent)).not.toContain('다른 사용자 후보');
  });
});

describe('④ Task 소유 범위는 수행 방향을 바꾸지 않는다', () => {
  const exec = (): jest.Mock => jest.fn(async (): Promise<WorkExecutionReply> => ({ status: 403, body: { success: false } }));
  it('USER 와 ORGANIZATION Task 의 실행 지시는 taskId 외에 같다', async () => {
    const e1 = exec();
    const u = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x' } }, e1);
    ownershipScope = 'ORGANIZATION';
    const e2 = exec();
    const o = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x' }, workScope: { workspace: 'store' } }, e2);
    expect(tasks.get(o.task!.taskId)?.ownershipScope).toBe('ORGANIZATION');
    const strip = (i: ExecutionIntent) => ({ ...i, taskId: null });
    expect(strip(e2.mock.calls[0][2])).toEqual(strip(e1.mock.calls[0][2]));
    expect(u.plan.intent.taskId).toBe(u.task?.taskId);
  });
});

describe('⑤ 완료는 Assistant 가 판정한다', () => {
  const c = planAssistantTask(BASE).intent.completion;
  it('실행 완료 주장 + 결과 근거 → completed · 근거 없음 → handed_over', () => {
    expect(judgeTaskStatus(c, report({ resultObserved: true }))).toBe('completed');
    expect(judgeTaskStatus(c, report({ replayVerified: true }))).toBe('completed');
    expect(judgeTaskStatus(c, report({}))).toBe('handed_over');
  });
  it('질문 · 인계 · 중지 · run 미개시', () => {
    expect(judgeTaskStatus(c, report({ claim: 'needs_user' }))).toBe('waiting_for_user');
    expect(judgeTaskStatus(c, report({ claim: 'handed_over' }))).toBe('handed_over');
    expect(judgeTaskStatus(c, report({ claim: 'stopped' }))).toBe('stopped');
    expect(judgeTaskStatus(c, report({ claim: 'not_started', runOpened: false }))).toBe('blocked');
  });

  it('runAssistantWorkTask — planner 가 done 을 냈어도 결과 근거가 없으면 Task 는 completed 가 아니다', async () => {
    const exec = jest.fn(async (): Promise<WorkExecutionReply> => ({
      status: 200,
      body: { success: true, data: { runId: 'g_1', goal: { status: 'completed', siteId: 'healthkr' } } },
      execution: { taskKey: 'drug_info.search', report: report({ taskTypeProposal: 'drug_info.search' }) },
    }));
    const out = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x' } }, exec);
    expect(out.task?.status).toBe('handed_over');

    const exec2 = jest.fn(async (): Promise<WorkExecutionReply> => ({
      status: 200,
      body: { success: true, data: { runId: 'g_2', goal: { status: 'completed', siteId: 'healthkr' } } },
      execution: { taskKey: 'drug_info.search', report: report({ resultObserved: true, taskTypeProposal: 'drug_info.search' }) },
    }));
    const out2 = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x' } }, exec2);
    expect(out2.task?.status).toBe('completed');
    expect(tasks.get(out2.task!.taskId)?.taskTypeKey).toBe('drug_info.search');
  });

  it('미종결 Task 를 이어받으면 이전 Task type 이 다음 실행 지시의 힌트가 된다', async () => {
    const first = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x' } }, jest.fn(async (): Promise<WorkExecutionReply> => ({
      status: 200,
      body: { success: true, data: { runId: 'g_3', goal: { status: 'waiting_for_user' } } },
      execution: { taskKey: 'drug_info.search', report: report({ claim: 'needs_user', taskTypeProposal: 'drug_info.search' }) },
    })));
    expect(first.task?.status).toBe('waiting_for_user');
    const exec = jest.fn(async (): Promise<WorkExecutionReply> => ({ status: 403, body: { success: false } }));
    await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x' }, requestedTaskId: first.task?.taskId }, exec);
    expect(exec.mock.calls[0][2]).toMatchObject({ taskTypeHint: 'drug_info.search', startMode: 'discovery' });
  });
});

describe('⑦ sentinel — 원문은 실행 지시 · Task 저장 경로에 닿지 않는다', () => {
  it('실행 본체에는 원문이 그대로 가지만 intent · plan · 저장 호출에는 없다', async () => {
    const exec = jest.fn(async (): Promise<WorkExecutionReply> => ({ status: 403, body: { success: false } }));
    const workBody = { request: SENTINEL, recoveryHint: `${SENTINEL} 힌트` };
    const out = await runAssistantWorkTask(ds, { userId: ME, workBody }, exec);
    expect(exec.mock.calls[0][1]).toEqual(workBody);
    const serialized = JSON.stringify([out.plan, exec.mock.calls[0][2], storeCalls]);
    expect(serialized).not.toContain('SENTINEL_RAW_TEXT');
    expect(serialized).not.toContain('게보린');
    expect(out.plan.reason).toBe('user_method_hint');
  });
});

// ── ⑥ runtime ───────────────────────────────────────────────────────────────

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
const RESULTS = [...HOME, EL('e_9', 'button', '아모디핀정 5mg')];
const INSPECT = (els: ReturnType<typeof EL>[]) => OK({ snapshotId: SNAP, elements: els, elementCount: els.length });
const DONE = { assessment: 'completed', action: { kind: 'done' } };

async function drive(db: LocalAgentDb, script: Record<string, Outcome[]>, taskKeys: string[], max = 60) {
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
    if (base === A.DATA_WORK_RUN_EXPERIENCE_RECALL) { await reply(args.taskKey === null ? { taskKeys } : { patterns: [] }); continue; }
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

async function run(planner: WorkPlanner, script: Record<string, Outcome[]>, intent?: ExecutionIntent, taskKeys: string[] = []) {
  const db = makeDb();
  await pairAndRegister(db);
  await connected(db);
  const [result] = await Promise.all([
    runWorkAgent(db.dataSource, ctx(), { request: REQUEST, ...(intent ? { intent } : {}) }, planner),
    drive(db, script, taskKeys),
  ]);
  return result;
}

const SEARCH_SCRIPT = {
  get_context: [CTX('/', 'd_1'), CTX('/search', 'd_2')],
  inspect: [INSPECT(HOME), INSPECT(RESULTS)],
  // 검색 제출 — content script 는 pagehide 로 navigated:true 를 돌려준다(실 health.kr 폼 제출과 같다).
  click: [OK({ elementRef: 'e_3', changed: true, navigated: true, role: 'button', riskLevel: 'REVERSIBLE' })],
};

describe('⑥ runtime — 실행 지시 수신 · 실행 보고', () => {
  it('planner 는 실행 지시를 받고 · Task type 힌트가 확인된 업무 키 앞에 온다 · 결과 화면 도달 → resultObserved', async () => {
    const intent = planAssistantTask({ ...BASE, priorTaskTypeKey: 'drug_info.search' }).intent;
    const planner = scripted([{ assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' }, task: 'drug_info.search' }, DONE]);
    const result = await run(planner, SEARCH_SCRIPT, intent, ['other.task']);
    expect(planner.calls[0].intent).toEqual(intent);
    expect(planner.calls[0].knownTaskKeys).toEqual(['drug_info.search', 'other.task']);
    expect(buildPlannerUserPrompt(planner.calls[0])).toContain('## 실행 지시 (Assistant · 구조)');
    expect(result.report).toMatchObject({ claim: 'execution_complete', runOpened: true, resultObserved: true, taskTypeProposal: 'drug_info.search' });
    expect(judgeTaskStatus(intent.completion, result.report!)).toBe('completed');
  });

  it('행동 없이 곧바로 done → 실행은 완료를 주장하지만 결과 근거 없음 → Assistant 판정 handed_over', async () => {
    const intent = planAssistantTask(BASE).intent;
    const result = await run(scripted([DONE]), { get_context: [CTX('/', 'd_1')], inspect: [INSPECT(HOME)] }, intent);
    expect(result.goal.status).toBe('completed'); // 실행 계층의 주장(사용자 응답)은 종전 그대로
    expect(result.report).toMatchObject({ claim: 'execution_complete', resultObserved: false });
    expect(judgeTaskStatus(intent.completion, result.report!)).toBe('handed_over');
  });

  it('회귀 — 실행 지시 없이 호출(/work-agent/run)하면 planner 입력 · 프롬프트에 지시가 없다', async () => {
    const planner = scripted([{ assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } }, DONE]);
    const result = await run(planner, SEARCH_SCRIPT);
    expect(planner.calls[0].intent).toBeUndefined();
    expect(buildPlannerUserPrompt(planner.calls[0])).not.toContain('실행 지시');
    expect(result.progress).toBe('completed');
    expect(result.report?.claim).toBe('execution_complete');
  });
});
