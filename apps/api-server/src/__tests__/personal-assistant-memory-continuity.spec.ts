/**
 * WO-O4O-PERSONAL-ASSISTANT-PHASE-C-MEMORY-EXPERIENCE-CONTINUITY-V1 — Assistant Memory 연속성
 *
 *   ① 소유 · 배치 레지스트리 — Cloud 허용 / Gate 필요 / 금지(node · DO_NOT_STORE) 판정 · Gate 를 코드가 스스로 열지 않는다
 *   ② recall 경계 — USER Task 는 본인 USER Task 만, ORGANIZATION Task 는 그 조직 Task 만 · parameter binding · 키 형식 검사
 *   ③ 실패 · 대상 없음 · Gate 표시 — 기억이 없어도 실행은 계속
 *   ④ 새 노드 연속성(runtime) — 이 PC 의 Local 원장이 비어 있어도 Assistant Memory 의 업무 유형이 planner 에 이어진다
 *   ⑤ Assistant 경로 통합 — Task → Memory → Planning → 실행 지시 · 원문은 기억 조회에 쓰이지 않는다
 *   ⑥ Node 전용 정보는 기억으로 승격되지 않는다
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

let ownership: { scope: 'USER' | 'ORGANIZATION'; organizationId: string | null; serviceKey: string | null } = { scope: 'USER', organizationId: null, serviceKey: null };
jest.mock('../services/assistant/task-ownership.js', () => ({ resolveTaskOwnership: jest.fn(async () => ownership) }));

let seq = 0;
jest.mock('../services/assistant/assistant-task-store.js', () => {
  const actual = jest.requireActual('../services/assistant/assistant-task-store.js');
  return {
    ...actual,
    createAssistantTask: jest.fn(async (_ds: unknown, input: any) => {
      seq += 1;
      return {
        taskId: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
        requestedByUserId: input.requestedByUserId,
        ownershipScope: input.ownership.scope,
        organizationId: input.ownership.organizationId,
        serviceKey: input.ownership.serviceKey,
        targetKind: null, targetId: null, taskTypeKey: null, status: 'running',
      };
    }),
    getAssistantTaskForRequester: jest.fn(async () => null),
    findTaskIdByRun: jest.fn(async () => null),
    attachRunToTask: jest.fn(async () => true),
    updateAssistantTask: jest.fn(async () => null),
  };
});

import { LOCAL_AGENT_ACTIONS, parseLocalAction } from '../services/local-agent/local-agent-protocol.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import { runWorkAgent, type PlannerInput, type WorkPlanner } from '../services/ai-tools/work-agent-runtime.js';
import type { ExecutionIntent } from '../services/ai-tools/work-agent-contract.js';
import type { VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import {
  LEGAL_DATA_PROCESSING_GATE, MEMORY_KINDS, assertCloudPlacement, decideCloudPlacement, isNodeOnly, type MemoryKind,
} from '../services/assistant/memory-ownership.js';
import { recallAssistantMemory, ASSISTANT_MEMORY_TASK_TYPE_LIMIT } from '../services/assistant/assistant-memory.js';
import { planAssistantTask } from '../services/assistant/assistant-planning.js';
import { runAssistantWorkTask, type WorkExecutionReply } from '../services/assistant/personal-assistant.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';

jest.setTimeout(180_000);

const ME = '00000000-0000-4000-8000-0000000000e1';
const ORG = '00000000-0000-4000-8000-0000000000aa';
const SENTINEL = '게보린 SENTINEL_RAW_TEXT';

/** assistant_tasks 조회만 흉내 내는 DataSource — SQL · params 를 기록한다. */
function fakeDs(rows: { task_type_key: string }[] | Error) {
  const calls: { sql: string; params: unknown[] }[] = [];
  return {
    calls,
    query: jest.fn(async (sql: string, params: unknown[]) => {
      calls.push({ sql, params });
      if (rows instanceof Error) throw rows;
      return sql.includes('FROM assistant_tasks') ? rows : [];
    }),
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  ownership = { scope: 'USER', organizationId: null, serviceKey: null };
});

describe('① 소유 · 배치 레지스트리', () => {
  it('Gate 는 PENDING — 코드가 스스로 열지 않는다', () => {
    expect(LEGAL_DATA_PROCESSING_GATE).toBe('PENDING');
  });

  it('이미 승인된 Cloud 구조(Task · Task type 이력)만 지금 허용 · 절차 기억 등은 Gate 대기', () => {
    expect(decideCloudPlacement('assistant_task')).toEqual({ ok: true, kind: 'assistant_task' });
    expect(decideCloudPlacement('task_type_history').ok).toBe(true);
    for (const k of ['procedural_memory', 'assistant_experience', 'execution_experience', 'run_resume_frame', 'request_summary']) {
      expect(decideCloudPlacement(k)).toMatchObject({ ok: false, reason: 'LEGAL_GATE_PENDING' });
      expect(decideCloudPlacement(k, 'PASSED').ok).toBe(true); // Gate 통과 후에는 소유 주체 쪽으로 옮길 수 있는 종류다
    }
  });

  it('Node 전용 · 저장 금지는 Gate 를 통과해도 Cloud 기억이 되지 않는다', () => {
    for (const k of ['node_environment', 'slot_values', 'raw_content']) {
      expect(decideCloudPlacement(k, 'PASSED')).toMatchObject({ ok: false, reason: 'NODE_ONLY' });
      expect(isNodeOnly(k as MemoryKind)).toBe(true);
    }
    expect(MEMORY_KINDS.node_environment.basis).toMatch(/credential/);
    expect(MEMORY_KINDS.node_environment.basis).toMatch(/로그인 세션/);
    expect(MEMORY_KINDS.node_environment.basis).toMatch(/현재 화면/);
  });

  it('등록되지 않은 종류는 거절 · assert 는 코드로 던진다', () => {
    expect(decideCloudPlacement('cookie_jar')).toMatchObject({ ok: false, reason: 'UNREGISTERED_KIND' });
    expect(() => assertCloudPlacement('node_environment')).toThrow('ASSISTANT_MEMORY_PLACEMENT_REJECTED:NODE_ONLY');
    expect(() => assertCloudPlacement('procedural_memory')).toThrow('LEGAL_GATE_PENDING');
    expect(() => assertCloudPlacement('task_type_history')).not.toThrow();
  });
});

describe('② recall 경계', () => {
  it('USER Task — 본인 USER Task · 같은 대상만 · parameter binding · 잘못된 키 제거', async () => {
    const ds = fakeDs([{ task_type_key: 'drug_info.search' }, { task_type_key: 'Bad Key' }, { task_type_key: 'drug_info.same_ingredient' }]);
    const m = await recallAssistantMemory(ds, { userId: ME, ownership: { scope: 'USER', organizationId: null, serviceKey: null }, targetId: 'healthkr' });
    expect(m.knownTaskTypes).toEqual(['drug_info.search', 'drug_info.same_ingredient']);
    const { sql, params } = ds.calls[0];
    expect(sql).toMatch(/requested_by_user_id = \$1 AND ownership_scope = 'USER'/);
    expect(sql).not.toMatch(/organization_id/);
    expect(sql).toMatch(/target_id = \$2/);
    expect(params).toEqual([ME, 'healthkr', ASSISTANT_MEMORY_TASK_TYPE_LIMIT]);
    expect(sql).not.toContain(ME);
    expect(sql).not.toContain('healthkr');
  });

  it('ORGANIZATION Task — 그 조직의 ORGANIZATION Task 만(요청자 조건 없음)', async () => {
    const ds = fakeDs([{ task_type_key: 'store.restock_review' }]);
    await recallAssistantMemory(ds, { userId: ME, ownership: { scope: 'ORGANIZATION', organizationId: ORG, serviceKey: 'kpa-society' }, targetId: 'healthkr' });
    expect(ds.calls[0].sql).toMatch(/organization_id = \$1 AND ownership_scope = 'ORGANIZATION'/);
    expect(ds.calls[0].sql).not.toMatch(/requested_by_user_id/);
    expect(ds.calls[0].params[0]).toBe(ORG);
  });
});

describe('③ 실패 · 대상 없음 · Gate 표시', () => {
  it('대상이 없으면 조회하지 않는다 · 형식이 이상한 대상도', async () => {
    const ds = fakeDs([{ task_type_key: 'drug_info.search' }]);
    const a = await recallAssistantMemory(ds, { userId: ME, ownership, targetId: null });
    const b = await recallAssistantMemory(ds, { userId: ME, ownership, targetId: "x'; DROP TABLE" });
    expect(ds.calls).toHaveLength(0);
    expect(a.knownTaskTypes).toEqual([]);
    expect(b.sources[0]).toMatchObject({ kind: 'task_type_history', readByAssistant: false, note: 'NO_TARGET' });
  });

  it('조회 실패는 빈 기억(READ_FAILED) · 절차 기억은 node 에 있다고 표시(LEGAL_GATE_PENDING)', async () => {
    const m = await recallAssistantMemory(fakeDs(new Error('boom')), { userId: ME, ownership, targetId: 'healthkr' });
    expect(m.knownTaskTypes).toEqual([]);
    expect(m.sources).toEqual([
      { kind: 'task_type_history', placement: 'cloud', readByAssistant: false, note: 'READ_FAILED' },
      { kind: 'procedural_memory', placement: 'node', readByAssistant: false, note: 'LEGAL_GATE_PENDING' },
    ]);
  });
});

describe('⑤ Assistant 경로 통합', () => {
  it('Task → Memory → Planning → 실행 지시 knownTaskTypes · 기억 조회에 원문이 쓰이지 않는다', async () => {
    const ds = fakeDs([{ task_type_key: 'drug_info.search' }]);
    const exec = jest.fn(async (): Promise<WorkExecutionReply> => ({ status: 403, body: { success: false } }));
    const out = await runAssistantWorkTask(ds, { userId: ME, workBody: { request: `약학정보원에서 ${SENTINEL} 찾아줘` } }, exec);
    const intent = exec.mock.calls[0][2] as ExecutionIntent;
    expect(intent.knownTaskTypes).toEqual(['drug_info.search']);
    expect(out.plan.intent.knownTaskTypes).toEqual(['drug_info.search']);
    expect(ds.calls[0].params).toEqual([ME, 'healthkr', ASSISTANT_MEMORY_TASK_TYPE_LIMIT]);
    expect(JSON.stringify(ds.calls)).not.toContain('SENTINEL_RAW_TEXT');
    expect(JSON.stringify(intent)).not.toContain('SENTINEL_RAW_TEXT');
  });

  it('ORGANIZATION Task 는 조직 기억을 쓴다 — 소유 범위는 기억의 경계일 뿐 절차가 아니다', async () => {
    ownership = { scope: 'ORGANIZATION', organizationId: ORG, serviceKey: 'kpa-society' };
    const ds = fakeDs([{ task_type_key: 'store.restock_review' }]);
    const exec = jest.fn(async (): Promise<WorkExecutionReply> => ({ status: 403, body: { success: false } }));
    await runAssistantWorkTask(ds, { userId: ME, workBody: { request: '약학정보원에서 찾아줘' }, workScope: { workspace: 'store' } }, exec);
    expect(ds.calls[0].params[0]).toBe(ORG);
    const intent = exec.mock.calls[0][2] as ExecutionIntent;
    expect(intent.knownTaskTypes).toEqual(['store.restock_review']);
    expect(JSON.stringify(intent)).not.toMatch(/workflow|procedure|steps/i);
  });

  it('기억 조회가 실패해도 실행은 그대로 위임된다', async () => {
    const exec = jest.fn(async (): Promise<WorkExecutionReply> => ({ status: 403, body: { success: false } }));
    const out = await runAssistantWorkTask(fakeDs(new Error('db down')), { userId: ME, workBody: { request: '약학정보원에서 찾아줘' } }, exec);
    expect(exec).toHaveBeenCalledTimes(1);
    expect(out.plan.intent.knownTaskTypes).toEqual([]);
  });
});

describe('⑥ Node 전용 정보는 기억으로 승격되지 않는다', () => {
  it('recall 결과에는 node_environment · slot · 원문 출처가 없다', async () => {
    const m = await recallAssistantMemory(fakeDs([]), { userId: ME, ownership, targetId: 'healthkr' });
    const kinds = m.sources.map((s) => s.kind);
    expect(kinds).not.toContain('node_environment');
    expect(kinds).not.toContain('slot_values');
    expect(kinds).not.toContain('raw_content');
    const intent = planAssistantTask({ taskId: null, resuming: false, priorTaskTypeKey: null, userMethodHint: false, nodeExperienceReachable: true, knownTaskTypes: m.knownTaskTypes }).intent;
    // 승인 경계(approval.credential = 'user_only')는 정책 표시라 제외하고, 기억 · 근거 칸에 node 정보가 없는지 본다.
    const { approval: _approval, ...memoryAndEvidence } = intent;
    expect(_approval).toEqual({ commit: 'user_only', credential: 'user_only' });
    expect(JSON.stringify(memoryAndEvidence)).not.toMatch(/deviceId|cookie|credential|session|screenshot|password/i);
  });
});

// ── ④ 새 노드 연속성 (runtime 실 harness) ───────────────────────────────────

const A = LOCAL_AGENT_ACTIONS;
const SITE = 'healthkr';
type Outcome = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: unknown };
const EL = (elementRef: string, role: string, name: string) => ({ elementRef, role, name });
const HOME = [EL('e_1', 'heading', '약학정보원'), EL('e_2', 'searchbox', '약물명'), EL('e_3', 'button', '검 색')];
const ctx = (): VerifiedToolContext => ({ userId: 'user-1', workspace: 'home', localAgentStatus: 'connected', localDeviceId: 'dev-new-pc' });

async function drive(db: LocalAgentDb, nodeTaskKeys: string[], max = 40) {
  let k = 0;
  while (k < max) {
    for (let i = 0; i < 400 && db.commands.length <= k; i += 1) await new Promise((r) => setTimeout(r, 5));
    const cmd = db.commands[k];
    if (!cmd) break;
    k += 1;
    const base = parseLocalAction(String(cmd.action)).base.replace('local.browser.dom.', '');
    const args = cmd.result_data ? JSON.parse(String(cmd.result_data)) : {};
    const reply = (data: unknown, status: Outcome['status'] = 'success') =>
      submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status, data } as any);
    if (base === 'local.target.prepare') { await reply({ targetId: SITE, targetType: 'browser_site', state: 'ready', reusedExisting: true, openedByO4O: false, tabCount: 1, path: '/' }); continue; }
    if (base === A.DATA_WORK_RUN_EXPERIENCE_RECALL) { await reply(args.taskKey === null ? { taskKeys: nodeTaskKeys } : { patterns: [] }); continue; }
    if (base === A.DATA_WORK_RUN_CONTEXT_RECALL) { await reply({ found: false }); continue; }
    if (base === A.DATA_WORK_RUN_CANDIDATE_MATCH) { await reply({ matched: false }); continue; }
    if (base.startsWith('local.data.work_run_')) { await reply({ runId: 'r_test', runStatus: 'active', saved: true }); continue; }
    if (base === 'get_context') { await reply({ siteId: SITE, active: true, ready: true, path: '/', docId: 'd_1' }); continue; }
    if (base === 'inspect') { await reply({ siteId: SITE, snapshotId: 's_abcd1234', elements: HOME, elementCount: HOME.length }); continue; }
    await submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: 'failed', errorCode: 'DOM_ELEMENT_NOT_FOUND' } as any);
  }
}

function scripted(): WorkPlanner & { calls: PlannerInput[] } {
  const calls: PlannerInput[] = [];
  return { kind: 'scripted', calls, async plan(input) { calls.push(input); return { assessment: 'completed', action: { kind: 'done' } }; } };
}

async function runOnNode(intent: ExecutionIntent | undefined, nodeTaskKeys: string[]) {
  const db = makeDb();
  await pairAndRegister(db);
  await connected(db);
  const planner = scripted();
  await Promise.all([
    runWorkAgent(db.dataSource, ctx(), { request: '약학정보원에서 아모디핀 찾아줘', ...(intent ? { intent } : {}) }, planner),
    drive(db, nodeTaskKeys),
  ]);
  return planner;
}

const base = { taskId: null, resuming: false, priorTaskTypeKey: null, userMethodHint: false, nodeExperienceReachable: true };

describe('④ 새 노드 연속성 (runtime)', () => {
  it('새 PC(Local 원장 비어 있음) — Assistant Memory 의 업무 유형이 planner 의 확인된 업무 키로 이어진다', async () => {
    const intent = planAssistantTask({ ...base, knownTaskTypes: ['drug_info.search'] }).intent;
    const planner = await runOnNode(intent, []);
    expect(planner.calls[0].knownTaskKeys).toEqual(['drug_info.search']);
  });

  it('노드가 아는 키가 앞 · Cloud 기억은 뒤(중복 제거)', async () => {
    const intent = planAssistantTask({ ...base, knownTaskTypes: ['drug_info.search', 'drug_info.dosage'] }).intent;
    const planner = await runOnNode(intent, ['drug_info.dosage', 'local.only_task']);
    expect(planner.calls[0].knownTaskKeys).toEqual(['drug_info.dosage', 'local.only_task', 'drug_info.search']);
  });

  it('비교 — 기억 없이 새 PC 에서 시작하면 확인된 업무 키가 없다(학습이 처음부터 시작되는 종전 상태)', async () => {
    const planner = await runOnNode(planAssistantTask(base).intent, []);
    expect(planner.calls[0].knownTaskKeys).toBeUndefined();
  });
});
