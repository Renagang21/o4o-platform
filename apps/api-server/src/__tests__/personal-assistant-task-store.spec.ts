/**
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-V1 — assistant_tasks 저장소 계약
 *
 * 고정하려는 것:
 *   ① 모든 조회 · 갱신에 요청자/사용자 조건이 붙는다 (Boundary Guard Rule 1 — UUID 단독 조회 금지)
 *   ② 값은 전부 parameter binding (문자열 보간 없음)
 *   ③ USER 소유면 organization_id 는 클라이언트 입력과 무관하게 NULL
 *   ④ 식별자 칸(target · task type · serviceKey)에 자유 문자열(원문 · slot 값)이 들어가지 않는다 — sentinel
 *   ⑤ run 연결은 run 소유자 조건 + "아직 Task 없음 또는 같은 Task" 일 때만
 *   ⑥ 종결 상태에서만 completed_at
 */

import {
  attachRunToTask,
  createAssistantTask,
  findTaskIdByRun,
  getAssistantTaskForRequester,
  isTerminalTaskStatus,
  TASK_RETENTION_POLICY,
  updateAssistantTask,
} from '../services/assistant/assistant-task-store.js';

const USER = '00000000-0000-4000-8000-000000000001';
const OTHER_ORG = '00000000-0000-4000-8000-0000000000aa';
const TASK = '11111111-1111-4111-8111-111111111111';
const SENTINEL = '게보린 SENTINEL_RAW_TEXT 010-0000-0000';

const ROW = {
  id: TASK,
  requested_by_user_id: USER,
  ownership_scope: 'USER',
  organization_id: null,
  service_key: null,
  target_kind: null,
  target_id: null,
  task_type_key: null,
  status: 'running',
  created_at: new Date(),
  updated_at: new Date(),
  completed_at: null,
};

function fakeDs(rows: unknown[] = [ROW]) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const ds = {
    query: jest.fn(async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      return rows;
    }),
  };
  return { ds: ds as any, calls };
}

describe('assistant-task-store', () => {
  it('보존 정책은 Gate 대기로 명시된다', () => {
    expect(TASK_RETENTION_POLICY).toBe('PENDING_LEGAL_DATA_PROCESSING_GATE');
  });

  it('③ USER 소유는 organization_id 를 넣지 않는다 · 상태는 running 으로 시작', async () => {
    const { ds, calls } = fakeDs();
    await createAssistantTask(ds, {
      requestedByUserId: USER,
      ownership: { scope: 'USER', organizationId: OTHER_ORG, serviceKey: 'kpa-society' },
    });
    const [{ sql, params }] = calls;
    expect(sql).toMatch(/INSERT INTO assistant_tasks/);
    expect(sql).toMatch(/'running'/);
    expect(params).toEqual([USER, 'USER', null, 'kpa-society']);
  });

  it('ORGANIZATION 소유는 서버가 준 조직을 그대로 쓴다', async () => {
    const { ds, calls } = fakeDs();
    await createAssistantTask(ds, {
      requestedByUserId: USER,
      ownership: { scope: 'ORGANIZATION', organizationId: OTHER_ORG, serviceKey: 'kpa-society' },
    });
    expect(calls[0].params).toEqual([USER, 'ORGANIZATION', OTHER_ORG, 'kpa-society']);
  });

  it('① 조회 · 갱신 · run 조회는 요청자/사용자 조건을 함께 건다 · ② 값은 binding', async () => {
    const { ds, calls } = fakeDs();
    await getAssistantTaskForRequester(ds, TASK, USER);
    await updateAssistantTask(ds, { taskId: TASK, requestedByUserId: USER, status: 'completed' });
    await findTaskIdByRun(ds, 'g_abc', USER);
    expect(calls[0].sql).toMatch(/WHERE id = \$1 AND requested_by_user_id = \$2/);
    expect(calls[1].sql).toMatch(/WHERE id = \$1 AND requested_by_user_id = \$2/);
    expect(calls[2].sql).toMatch(/WHERE run_id = \$1 AND user_id = \$2/);
    for (const c of calls) {
      expect(c.sql).not.toContain(TASK);
      expect(c.sql).not.toContain(USER);
    }
  });

  it('형식이 아닌 taskId · runId 는 DB 에 묻지 않는다', async () => {
    const { ds, calls } = fakeDs();
    expect(await getAssistantTaskForRequester(ds, 'not-a-uuid', USER)).toBeNull();
    expect(await findTaskIdByRun(ds, "x' OR 1=1 --", USER)).toBeNull();
    expect(await attachRunToTask(ds, { taskId: 'nope', runId: 'g_1', userId: USER })).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('④ sentinel — 원문 · 값이 식별자 칸으로 새지 않는다(형식 불일치 → NULL)', async () => {
    const { ds, calls } = fakeDs();
    await updateAssistantTask(ds, {
      taskId: TASK,
      requestedByUserId: USER,
      status: 'waiting_for_user',
      targetKind: SENTINEL,
      targetId: SENTINEL,
      taskTypeKey: SENTINEL,
    });
    await createAssistantTask(ds, { requestedByUserId: USER, ownership: { scope: 'USER', organizationId: null, serviceKey: SENTINEL } });
    const serialized = JSON.stringify(calls);
    expect(serialized).not.toContain('SENTINEL_RAW_TEXT');
    expect(serialized).not.toContain('게보린');
    expect(calls[0].params.slice(3, 6)).toEqual([null, null, null]);
  });

  it('형식에 맞는 구조 키는 저장된다', async () => {
    const { ds, calls } = fakeDs();
    await updateAssistantTask(ds, {
      taskId: TASK,
      requestedByUserId: USER,
      status: 'completed',
      targetKind: 'browser_site',
      targetId: 'healthkr',
      taskTypeKey: 'pharmacy.drug_search',
    });
    expect(calls[0].params).toEqual([TASK, USER, 'completed', 'browser_site', 'healthkr', 'pharmacy.drug_search', true]);
  });

  it('⑥ completed_at 은 종결 상태에서만 — blocked · waiting_for_user 는 종결이 아니다', async () => {
    expect(isTerminalTaskStatus('completed')).toBe(true);
    expect(isTerminalTaskStatus('handed_over')).toBe(true);
    expect(isTerminalTaskStatus('stopped')).toBe(true);
    expect(isTerminalTaskStatus('blocked')).toBe(false);
    expect(isTerminalTaskStatus('waiting_for_user')).toBe(false);
    expect(isTerminalTaskStatus('running')).toBe(false);
    const { ds, calls } = fakeDs();
    await updateAssistantTask(ds, { taskId: TASK, requestedByUserId: USER, status: 'blocked' });
    expect(calls[0].params[6]).toBe(false);
  });

  it('⑤ run 연결은 run 소유자 + (Task 없음 또는 같은 Task) 조건', async () => {
    const { ds, calls } = fakeDs([{ run_id: 'g_1' }]);
    expect(await attachRunToTask(ds, { taskId: TASK, runId: 'g_1', userId: USER })).toBe(true);
    expect(calls[0].sql).toMatch(/WHERE run_id = \$2 AND user_id = \$3 AND \(task_id IS NULL OR task_id = \$1\)/);
    const none = fakeDs([]);
    expect(await attachRunToTask(none.ds, { taskId: TASK, runId: 'g_1', userId: USER })).toBe(false);
  });
});
