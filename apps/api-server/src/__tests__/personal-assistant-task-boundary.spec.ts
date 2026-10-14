/**
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-V1 — Assistant → Task → Execution 경계
 *
 * 저장소는 메모리 fake 로 바꾸고(구조 · 소유 · run 연결 규칙만 재현), 실행 본체는 주입한다.
 *   ① 새 work 요청 → Task 1건 · run 이 그 Task 에 붙는다
 *   ② 같은 run 재개(runId) → 같은 Task (run 의 Task 가 우선)
 *   ③ 미종결 Task 재시도(taskId) → 같은 Task 에 두 번째 run (Task 1 : N run)
 *   ④ 종결 Task · 남의 Task 의 taskId → 새 Task
 *   ⑤ 실행 결과 → Task 상태 매핑 (run 없음 · 403 = blocked)
 *   ⑥ sentinel — 요청 원문 · 이미지 · 힌트가 Task 저장 경로에 닿지 않는다
 *   ⑦ Task 저장 실패 → 실행은 그대로 · task=null
 *   ⑧ 기존 run(Task 없음) 재개 → 새 Task 를 만들어 그 run 을 붙인다
 */

type Row = {
  taskId: string;
  requestedByUserId: string;
  ownershipScope: 'USER' | 'ORGANIZATION';
  organizationId: string | null;
  serviceKey: string | null;
  targetKind: string | null;
  targetId: string | null;
  taskTypeKey: string | null;
  status: string;
};

const tasks = new Map<string, Row>();
const runs = new Map<string, { userId: string; taskId: string | null }>();
const storeCalls: unknown[] = [];
let failCreate = false;
let seq = 0;

jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../services/assistant/task-ownership.js', () => ({
  resolveTaskOwnership: jest.fn(async () => ({ scope: 'USER', organizationId: null, serviceKey: null })),
}));
jest.mock('../services/assistant/assistant-task-store.js', () => {
  const actual = jest.requireActual('../services/assistant/assistant-task-store.js');
  return {
    ...actual,
    createAssistantTask: jest.fn(async (_ds: unknown, input: any) => {
      storeCalls.push(['create', input]);
      if (failCreate) throw new Error('relation "assistant_tasks" does not exist');
      seq += 1;
      const row: Row = {
        taskId: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
        requestedByUserId: input.requestedByUserId,
        ownershipScope: input.ownership.scope,
        organizationId: input.ownership.organizationId,
        serviceKey: input.ownership.serviceKey,
        targetKind: null,
        targetId: null,
        taskTypeKey: null,
        status: 'running',
      };
      tasks.set(row.taskId, row);
      return row;
    }),
    getAssistantTaskForRequester: jest.fn(async (_ds: unknown, taskId: string, userId: string) => {
      storeCalls.push(['get', taskId, userId]);
      const t = tasks.get(taskId);
      return t && t.requestedByUserId === userId ? { ...t } : null;
    }),
    findTaskIdByRun: jest.fn(async (_ds: unknown, runId: string, userId: string) => {
      storeCalls.push(['findByRun', runId, userId]);
      const r = runs.get(runId);
      return r && r.userId === userId ? r.taskId : null;
    }),
    attachRunToTask: jest.fn(async (_ds: unknown, input: any) => {
      storeCalls.push(['attach', input]);
      const r = runs.get(input.runId);
      if (!r || r.userId !== input.userId || (r.taskId && r.taskId !== input.taskId)) return false;
      r.taskId = input.taskId;
      return true;
    }),
    updateAssistantTask: jest.fn(async (_ds: unknown, input: any) => {
      storeCalls.push(['update', input]);
      const t = tasks.get(input.taskId);
      if (!t || t.requestedByUserId !== input.requestedByUserId) return null;
      t.status = input.status;
      return { ...t };
    }),
  };
});

import { runAssistantWorkTask, taskStatusFromWorkReply, type WorkExecutionReply } from '../services/assistant/personal-assistant.js';

const ME = '00000000-0000-4000-8000-0000000000e1';
const OTHER = '00000000-0000-4000-8000-0000000000e2';
const SENTINEL = '게보린 SENTINEL_RAW_TEXT 처방 내용';
const ds = {} as any;

/** run 을 여는 실행 본체 흉내 — 실제 runtime 처럼 coordination row 를 만든다(Task 없이). */
function executor(goalStatus: string, runId: string | null = `g_${++seq}`, status = 200) {
  return jest.fn(async (userId: string): Promise<WorkExecutionReply> => {
    if (status !== 200) return { status, body: { success: false, code: 'WORK_AGENT_NOT_AVAILABLE' } };
    if (runId && !runs.has(runId)) runs.set(runId, { userId, taskId: null });
    return {
      status: 200,
      body: { success: true, data: { runId, goal: { status: goalStatus, siteId: 'healthkr' }, target: { targetType: 'browser_site', targetId: 'healthkr' } } },
      execution: { taskKey: 'pharmacy.drug_search' },
    };
  });
}

beforeEach(() => {
  tasks.clear();
  runs.clear();
  storeCalls.length = 0;
  failCreate = false;
});

describe('runAssistantWorkTask', () => {
  it('① 새 요청 → Task 1건 · run 연결 · 상태 갱신', async () => {
    const exec = executor('completed', 'g_new');
    const out = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: SENTINEL } }, exec);
    expect(out.task?.status).toBe('completed');
    expect(tasks.size).toBe(1);
    expect(runs.get('g_new')?.taskId).toBe(out.task?.taskId);
    // 실행 본체에는 원문이 그대로 간다 + Phase B: Assistant 의 실행 지시(구조만)가 함께 간다
    //   + Task 이해 · 완료 판정: 이해가 있으면 Assistant 완료 판정기가 4번째 인자로 간다
    expect(exec).toHaveBeenCalledWith(ME, { request: SENTINEL }, expect.objectContaining({ version: 1, taskId: out.task?.taskId }), expect.any(Function));
    const upd = storeCalls.find((c: any) => c[0] === 'update' && c[1].status === 'completed') as any;
    expect(upd[1]).toMatchObject({ targetKind: 'browser_site', targetId: 'healthkr', taskTypeKey: 'pharmacy.drug_search' });
  });

  it('② 질문 → 같은 run 재개 → 같은 Task', async () => {
    const first = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x' } }, executor('waiting_for_user', 'g_q'));
    expect(first.task?.status).toBe('waiting_for_user');
    const again = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: '답', runId: 'g_q' } }, executor('completed', 'g_q'));
    expect(again.task?.taskId).toBe(first.task?.taskId);
    expect(again.task?.status).toBe('completed');
    expect(tasks.size).toBe(1);
  });

  it('③ 미종결(blocked) Task 를 taskId 로 재시도 → 같은 Task 에 두 번째 run (1 : N)', async () => {
    const blocked = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x' } }, executor('waiting_for_user', null));
    expect(blocked.task?.status).toBe('blocked'); // run 이 열리지 않았다
    await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x' }, requestedTaskId: blocked.task?.taskId }, executor('waiting_for_user', 'g_r1'));
    const a = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x' }, requestedTaskId: blocked.task?.taskId }, executor('completed', 'g_r2'));
    expect(a.task?.taskId).toBe(blocked.task?.taskId);
    const linked = [...runs.entries()].filter(([, r]) => r.taskId === blocked.task?.taskId).map(([id]) => id).sort();
    expect(linked).toEqual(['g_r1', 'g_r2']);
    expect(tasks.size).toBe(1);
  });

  it('④ 종결 Task · 남의 Task 의 taskId 는 이어받지 않는다 → 새 Task', async () => {
    const done = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x' } }, executor('completed'));
    const next = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x' }, requestedTaskId: done.task?.taskId }, executor('completed'));
    expect(next.task?.taskId).not.toBe(done.task?.taskId);

    const theirs = await runAssistantWorkTask(ds, { userId: OTHER, workBody: { request: 'x' } }, executor('waiting_for_user'));
    const mine = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x' }, requestedTaskId: theirs.task?.taskId }, executor('completed'));
    expect(mine.task?.taskId).not.toBe(theirs.task?.taskId);
    expect(tasks.get(theirs.task!.taskId)?.status).toBe('waiting_for_user'); // 남의 Task 는 건드리지 않았다
  });

  it('④-b 남의 run 의 runId 로는 그 사람 Task 를 이어받지 못한다', async () => {
    const theirs = await runAssistantWorkTask(ds, { userId: OTHER, workBody: { request: 'x' } }, executor('waiting_for_user', 'g_theirs'));
    const mine = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x', runId: 'g_theirs' } }, executor('waiting_for_user', null));
    expect(mine.task?.taskId).not.toBe(theirs.task?.taskId);
    expect(runs.get('g_theirs')?.taskId).toBe(theirs.task?.taskId);
  });

  it('⑤ 상태 매핑', () => {
    const ok = (status: string, runId: string | null = 'g_1'): WorkExecutionReply => ({ status: 200, body: { data: { runId, goal: { status } } } });
    expect(taskStatusFromWorkReply(ok('completed'))).toBe('completed');
    expect(taskStatusFromWorkReply(ok('waiting_for_user'))).toBe('waiting_for_user');
    expect(taskStatusFromWorkReply(ok('taken_over'))).toBe('handed_over');
    expect(taskStatusFromWorkReply(ok('stopped'))).toBe('stopped');
    expect(taskStatusFromWorkReply(ok('waiting_for_user', null))).toBe('blocked');
    expect(taskStatusFromWorkReply({ status: 403, body: {} })).toBe('blocked');
    expect(taskStatusFromWorkReply({ status: 400, body: {} })).toBe('stopped');
  });

  it('⑥ sentinel — 원문 · 이미지 · 힌트는 Task 저장 경로에 한 번도 닿지 않는다', async () => {
    const workBody = { request: SENTINEL, image: { base64: 'SENTINEL_IMAGE' }, recoveryHint: `${SENTINEL} 힌트`, targetHint: 'healthkr' };
    await runAssistantWorkTask(ds, { userId: ME, workBody, workScope: { workspace: 'home', note: SENTINEL } }, executor('completed'));
    const serialized = JSON.stringify(storeCalls);
    expect(serialized).not.toContain('SENTINEL_RAW_TEXT');
    expect(serialized).not.toContain('SENTINEL_IMAGE');
    expect(serialized).not.toContain('게보린');
  });

  it('⑦ Task 저장 실패 → 실행은 그대로, task=null', async () => {
    failCreate = true;
    const exec = executor('completed');
    const out = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: 'x' } }, exec);
    expect(exec).toHaveBeenCalledTimes(1);
    expect(out.task).toBeNull();
    expect(out.reply.status).toBe(200);
  });

  it('⑧ Task 없는 기존 run 재개 → 새 Task 가 그 run 을 가진다', async () => {
    runs.set('g_legacy', { userId: ME, taskId: null });
    const out = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: '답', runId: 'g_legacy' } }, executor('completed', 'g_legacy'));
    expect(runs.get('g_legacy')?.taskId).toBe(out.task?.taskId);
  });
});
