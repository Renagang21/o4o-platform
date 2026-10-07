/**
 * WO-O4O-PERSONAL-ASSISTANT-MEMORY-CLOUD-CONTINUITY-V1 — Assistant Memory Cloud 연속성
 *
 *   A. 파생 규칙 — 서버가 만든 구조화 도움 · 교정 이벤트 → 검증 방법(노드 local-db derivePatterns 와 같은 규칙) · 합치기
 *   B. Cloud store 경계 — 소유 주체(USER = user_id · ORGANIZATION = organization_id) · parameter binding · 1년 미사용 제외 ·
 *      반대 극성 retired · 재개 구조는 본인 run · 대기 중일 때만
 *   C. remember — 공개 대상만 방법 저장 · 사설 대상(Windows 앱) 제외 · 질문 대기면 재개 구조 저장 · 그 밖 종결이면 삭제 · Assistant 경로 통합
 *   D. runtime 노드 간 연속성 — PC A 의 검증 교정이 report.memory 로 올라오고, 노드 원장이 빈 PC B 에서 같은 방법이 근거가 된다
 *      (Avoid 차단 · Experienced) · 다른 PC 에서 질문 대기 run 을 이어갈 때 Cloud 재개 구조를 쓴다
 *   E. 설계 경계 — 새 테이블 칼럼 allowlist(원문 · 값 · Provider 칼럼 없음) · 기억은 Provider 와 무관하다
 */

jest.setTimeout(60_000);

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

let ownership: { scope: 'USER' | 'ORGANIZATION'; organizationId: string | null; serviceKey: string | null } = { scope: 'USER', organizationId: null, serviceKey: null };
jest.mock('../services/assistant/task-ownership.js', () => ({ resolveTaskOwnership: jest.fn(async () => ownership) }));
jest.mock('../services/assistant/assistant-task-store.js', () => {
  const actual = jest.requireActual('../services/assistant/assistant-task-store.js');
  return {
    ...actual,
    createAssistantTask: jest.fn(async (_ds: unknown, input: any) => ({
      taskId: '00000000-0000-4000-8000-000000000101',
      requestedByUserId: input.requestedByUserId,
      ownershipScope: input.ownership.scope,
      organizationId: input.ownership.organizationId,
      serviceKey: input.ownership.serviceKey,
      targetKind: null, targetId: null, taskTypeKey: null, status: 'running',
    })),
    getAssistantTaskForRequester: jest.fn(async () => null),
    findTaskIdByRun: jest.fn(async () => null),
    attachRunToTask: jest.fn(async () => true),
    updateAssistantTask: jest.fn(async (_ds: unknown, input: any) => ({ status: input.status })),
  };
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOCAL_AGENT_ACTIONS, parseLocalAction } from '../services/local-agent/local-agent-protocol.js';
import { submitCommandResult } from '../services/local-agent/local-agent-service.js';
import { runWorkAgent, type PlannerInput, type WorkPlanner } from '../services/ai-tools/work-agent-runtime.js';
import type { ExecutionMemoryReport } from '../services/ai-tools/work-agent-contract.js';
import type { VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import {
  deriveVerifiedPatterns,
  failedAlternativeOf,
  mergeRecalledPatterns,
  type WorkAssistanceEvent,
} from '../services/ai-tools/work-assistance.js';
import {
  memoryOwnerOf,
  patternSig,
  readRunFrame,
  readVerifiedPatterns,
  saveRunFrame,
  upsertVerifiedPatterns,
  PROCEDURAL_MEMORY_UNUSED_EXPIRY_DAYS,
} from '../services/assistant/procedural-memory-store.js';
import { recallAssistantMemory, rememberExecution } from '../services/assistant/assistant-memory.js';
import { planAssistantTask } from '../services/assistant/assistant-planning.js';
import { runAssistantWorkTask, type WorkExecutionReply } from '../services/assistant/personal-assistant.js';
import { makeDb, connected, pairAndRegister, type LocalAgentDb } from './helpers/local-agent-db-stub.js';
import { nodeLedgerOwnerKey } from '../services/ai-tools/node-ledger-owner.js';
import { NODE_LEDGER_OWNER_KEY_RE, validateLocalCommandArgs } from '../services/local-agent/local-agent-protocol.js';

const ME = '00000000-0000-4000-8000-0000000000e1';
const ORG = '00000000-0000-4000-8000-0000000000aa';
const TASK = '00000000-0000-4000-8000-000000000101';
const OLD = { ops: [{ op: 'search' as const }, { op: 'extract_field' as const }, { op: 're_search' as const }] };
const ALT = { ops: [{ op: 'open_detail' as const }, { op: 'open_tab' as const, label: '동일성분' }] };
const USER_OWN = { scope: 'USER' as const, organizationId: null, serviceKey: null };
const ORG_OWN = { scope: 'ORGANIZATION' as const, organizationId: ORG, serviceKey: 'kpa-society' };

const ev = (over: Partial<WorkAssistanceEvent> = {}): WorkAssistanceEvent => ({
  kind: 'correction', stageKey: 'find_same_ingredient', askKind: 'procedure_order', providedKind: 'correction', structured: null,
  resolution: 'resolved', progressedSteps: 1, reusability: 'reusable_knowledge',
  correction: { type: 'procedure_method', reason: 'site_feature_exists', wrong: OLD, alternative: ALT },
  validation: { result: 'verified', evidence: 'agent_inferred' },
  ...over,
});

/** SQL · params 를 기록하고 정해진 결과를 돌려주는 DataSource. */
function recordingDs(responder: (sql: string, params: unknown[]) => unknown = () => []) {
  const calls: { sql: string; params: unknown[] }[] = [];
  return {
    calls,
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      return responder(sql, params);
    }),
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  ownership = { scope: 'USER', organizationId: null, serviceKey: null };
});

// ─── A. 파생 규칙 ─────────────────────────────────────────────────────────────

describe('A. 파생 규칙 (노드 derivePatterns 와 같음)', () => {
  it('방법 교정 + verified + reusable → 대안 preferred · 틀린 방법 avoid', () => {
    expect(deriveVerifiedPatterns('drug_info.same_ingredient', ev())).toEqual([
      { stageKey: 'find_same_ingredient', polarity: 'preferred', strategy: ALT },
      { stageKey: 'find_same_ingredient', polarity: 'avoid', strategy: OLD },
    ]);
  });

  it('메뉴 위치 · 업무 순서 도움 → 경로 preferred 만', () => {
    const e = ev({ kind: 'assistance', askKind: 'menu_location', providedKind: 'path', correction: null, structured: { strategy: ALT } });
    expect(deriveVerifiedPatterns('drug_info.same_ingredient', e)).toEqual([{ stageKey: 'find_same_ingredient', polarity: 'preferred', strategy: ALT }]);
  });

  it('검증 안 됨 · 재사용 지식 아님 · 방법 교정 아님 · task/stage 없음 → 만들지 않는다', () => {
    const none = [
      ['not_verified', 'drug_info.x', ev({ validation: { result: 'not_verified', evidence: null } })],
      ['failed', 'drug_info.x', ev({ validation: { result: 'failed', evidence: null } })],
      ['per_run_value', 'drug_info.x', ev({ reusability: 'per_run_value' })],
      ['personal_preference', 'drug_info.x', ev({ reusability: 'personal_preference' })],
      ['task_intent', 'drug_info.x', ev({ correction: { type: 'task_intent', reason: null, wrong: OLD, alternative: ALT } })],
      ['no task', null, ev()],
      ['no stage', 'drug_info.x', ev({ stageKey: null })],
      ['value assistance', 'drug_info.x', ev({ kind: 'assistance', askKind: 'value_confirmation', providedKind: 'value', correction: null, structured: { slots: ['drug_name'] } })],
      ['no event', 'drug_info.x', null],
    ] as const;
    for (const [name, task, e] of none) expect([name, deriveVerifiedPatterns(task, e as WorkAssistanceEvent | null)]).toEqual([name, []]);
  });

  it('검증 실패한 대안은 실패 횟수 근거로만', () => {
    expect(failedAlternativeOf('drug_info.x', ev({ validation: { result: 'failed', evidence: null } }))).toEqual({ stageKey: 'find_same_ingredient', strategy: ALT });
    expect(failedAlternativeOf('drug_info.x', ev())).toBeNull();
  });

  it('Cloud + 노드 합치기(Phase D) — Cloud 가 앞 · 같은 stage 의 같은 방법은 하나(극성 충돌 시 Cloud — 오래된 노드 avoid 가 최신 Cloud preferred 를 가리지 않는다)', () => {
    const node = [
      { stageKey: 's1', polarity: 'avoid' as const, strategy: ALT, verifiedCount: 1 },
      { stageKey: 's2', polarity: 'preferred' as const, strategy: OLD, verifiedCount: 1 }, // Cloud 에 없는 노드 기억(사설 대상 등) — 그대로 쓴다
    ];
    const cloud = [
      { stageKey: 's1', polarity: 'preferred' as const, strategy: ALT, verifiedCount: 5 },
      { stageKey: 's1', polarity: 'avoid' as const, strategy: OLD, verifiedCount: 2 },
    ];
    expect(mergeRecalledPatterns(node, cloud)).toEqual([cloud[0], cloud[1], node[1]]);
    expect(mergeRecalledPatterns([], cloud)).toEqual(cloud);
    expect(mergeRecalledPatterns(node, [])).toEqual(node);
  });
});

// ─── B. Cloud store 경계 ──────────────────────────────────────────────────────

describe('B. Cloud store 경계', () => {
  it('소유 주체 — USER = 요청자 · ORGANIZATION = 조직(기여자 없음) · 형식 밖이면 null', () => {
    expect(memoryOwnerOf(ME, USER_OWN)).toEqual({ scope: 'USER', ownerId: ME });
    expect(memoryOwnerOf(ME, ORG_OWN)).toEqual({ scope: 'ORGANIZATION', ownerId: ORG });
    expect(memoryOwnerOf('not-a-uuid', USER_OWN)).toBeNull();
    expect(memoryOwnerOf(ME, { scope: 'ORGANIZATION', organizationId: null, serviceKey: null })).toBeNull();
  });

  it('USER 쓰기 — user_id 경계 · USER 부분 인덱스 conflict · 값은 bind · avoid 는 label 없이 · 반대 극성 retired', async () => {
    const ds = recordingDs();
    const n = await upsertVerifiedPatterns(ds, {
      owner: { scope: 'USER', ownerId: ME }, targetId: 'healthkr', taskKey: 'drug_info.same_ingredient',
      patterns: [
        { stageKey: 'find_same_ingredient', polarity: 'preferred', strategy: ALT },
        { stageKey: 'find_same_ingredient', polarity: 'avoid', strategy: { ops: [{ op: 'open_tab', label: '허가정보' }] } },
      ],
    });
    expect(n).toBe(2);
    const [ins1, ret1, ins2] = ds.calls;
    expect(ins1.sql).toMatch(/INSERT INTO assistant_procedural_patterns \(ownership_scope, user_id,/);
    expect(ins1.sql).toMatch(/ON CONFLICT \(user_id, target_id, task_type_key, stage_key, polarity, pattern_sig\) WHERE ownership_scope = 'USER'/);
    expect(ins1.sql).not.toMatch(/organization_id/);
    expect(ins1.params).toEqual(['USER', ME, 'healthkr', 'drug_info.same_ingredient', 'find_same_ingredient', 'preferred', patternSig(ALT), JSON.stringify(ALT)]);
    expect(ret1.sql).toMatch(/SET status = 'retired'/);
    expect(ret1.params[5]).toBe('avoid'); // preferred 를 쓰면 같은 방법의 avoid 를 내린다
    expect(ins2.params[7]).toBe(JSON.stringify({ ops: [{ op: 'open_tab' }] }));
    for (const c of ds.calls) {
      expect(c.sql).not.toContain(ME);
      expect(c.sql).not.toContain('healthkr');
      expect(c.sql).not.toContain('동일성분');
    }
  });

  it('ORGANIZATION 쓰기 — organization_id 경계 · 요청자 칼럼 없음', async () => {
    const ds = recordingDs();
    await upsertVerifiedPatterns(ds, { owner: { scope: 'ORGANIZATION', ownerId: ORG }, targetId: 'healthkr', taskKey: 'drug_info.lookup', patterns: [{ stageKey: 's1', polarity: 'preferred', strategy: ALT }] });
    expect(ds.calls[0].sql).toMatch(/\(ownership_scope, organization_id,/);
    expect(ds.calls[0].sql).toMatch(/WHERE ownership_scope = 'ORGANIZATION'/);
    expect(ds.calls[0].sql).not.toMatch(/user_id/);
    expect(ds.calls[0].params.slice(0, 2)).toEqual(['ORGANIZATION', ORG]);
  });

  it('형식 밖 키 · 대상은 쓰지 않는다', async () => {
    const ds = recordingDs();
    expect(await upsertVerifiedPatterns(ds, { owner: { scope: 'USER', ownerId: ME }, targetId: 'healthkr', taskKey: 'DROP TABLE', patterns: [{ stageKey: 's1', polarity: 'preferred', strategy: ALT }] })).toBe(0);
    expect(await upsertVerifiedPatterns(ds, { owner: { scope: 'USER', ownerId: ME }, targetId: "x'; --", taskKey: 'drug_info.lookup', patterns: [{ stageKey: 's1', polarity: 'preferred', strategy: ALT }] })).toBe(0);
    expect(ds.calls).toHaveLength(0);
  });

  it('읽기 — 소유 주체 · 대상 · verified · 1년 미사용 제외 · 돌려준 것만 마지막 사용 갱신 · id 는 밖으로 안 나감', async () => {
    const ID = '00000000-0000-4000-8000-00000000c0de';
    const ds = recordingDs((sql) => (sql.includes('SELECT id') ? [
      { id: ID, task_type_key: 'drug_info.same_ingredient', stage_key: 'find_same_ingredient', polarity: 'preferred', strategy: ALT, verified_count: 3 },
      { id: 'x', task_type_key: 'Bad Key', stage_key: 's', polarity: 'preferred', strategy: ALT, verified_count: 1 },
    ] : [[], 1]));
    const out = await readVerifiedPatterns(ds, { owner: { scope: 'ORGANIZATION', ownerId: ORG }, targetId: 'healthkr' });
    expect(out).toEqual([{ taskKey: 'drug_info.same_ingredient', stageKey: 'find_same_ingredient', polarity: 'preferred', strategy: ALT, verifiedCount: 3 }]);
    expect(ds.calls[0].sql).toMatch(/ownership_scope = \$1 AND organization_id = \$2 AND target_id = \$3 AND status = 'verified'/);
    expect(ds.calls[0].sql).toMatch(/last_used_at > now\(\) - \(\$4 \|\| ' days'\)::interval/);
    expect(ds.calls[0].params[3]).toBe(String(PROCEDURAL_MEMORY_UNUSED_EXPIRY_DAYS));
    expect(PROCEDURAL_MEMORY_UNUSED_EXPIRY_DAYS).toBe(365);
    expect(ds.calls[1].sql).toMatch(/SET last_used_at = now\(\) WHERE ownership_scope = \$1 AND organization_id = \$2 AND id = ANY/);
    expect(ds.calls[1].params[2]).toEqual([ID]);
    expect(JSON.stringify(out)).not.toContain(ID);
  });

  it('재개 구조 저장 — 본인 run(coordination.user_id)에만 · 방법 label 제거 · 대기 중 아닌 다른 run 의 구조는 정리', async () => {
    const ds = recordingDs((sql) => (sql.includes('INSERT INTO assistant_run_frames') ? [{ run_id: 'g_q1' }] : [[], 0]));
    const ok = await saveRunFrame(ds, {
      runId: 'g_q1', userId: ME, taskId: TASK, targetId: 'healthkr',
      frame: { taskKey: 'drug_info.lookup', stageKey: 'search_product', ask: { kind: 'value_confirmation', slots: ['drug_name'] }, strategy: ALT },
    });
    expect(ok).toBe(true);
    expect(ds.calls[0].sql).toMatch(/FROM work_run_coordination c WHERE c.run_id = \$1 AND c.user_id = \$2/);
    expect(ds.calls[0].sql).toMatch(/WHERE assistant_run_frames.user_id = EXCLUDED.user_id/);
    expect(ds.calls[0].params[7]).toBe(JSON.stringify({ ops: [{ op: 'open_detail' }, { op: 'open_tab' }] }));
    expect(ds.calls[1].sql).toMatch(/DELETE FROM assistant_run_frames f WHERE f.user_id = \$1 AND f.run_id <> \$2/);
    expect(ds.calls[1].sql).toMatch(/c.status = 'waiting_for_user'/);
  });

  it('재개 구조 읽기 — 본인 · 대기 중 · 만료 전 run 만', async () => {
    const ds = recordingDs(() => [{ task_type_key: 'drug_info.lookup', stage_key: 'search_product', ask: { kind: 'value_confirmation', slots: ['drug_name'] }, strategy: { ops: [{ op: 'search' }] } }]);
    const f = await readRunFrame(ds, { runId: 'g_q1', userId: ME });
    expect(f).toEqual({ taskKey: 'drug_info.lookup', stageKey: 'search_product', ask: { kind: 'value_confirmation', slots: ['drug_name'] }, strategy: { ops: [{ op: 'search' }] } });
    expect(ds.calls[0].sql).toMatch(/f.run_id = \$1 AND f.user_id = \$2 AND c.status = 'waiting_for_user' AND c.expires_at > now\(\)/);
    expect(await readRunFrame(recordingDs(), { runId: "x' OR 1=1", userId: ME })).toBeNull();
  });
});

// ─── C. remember · Assistant 경로 ─────────────────────────────────────────────

const MEM = (over: Partial<ExecutionMemoryReport> = {}): ExecutionMemoryReport => ({
  targetId: 'healthkr', targetKind: 'browser_site', taskKey: 'drug_info.same_ingredient',
  verifiedPatterns: [{ stageKey: 'find_same_ingredient', polarity: 'preferred', strategy: ALT }],
  failedAlternative: null, resumeFrame: null, ...over,
});

describe('C. remember — 소유 주체 기억 반영', () => {
  it('공개 대상 + 완료 → 방법 저장 · 재개 구조 삭제', async () => {
    const ds = recordingDs();
    const out = await rememberExecution(ds, { userId: ME, taskId: TASK, ownership: USER_OWN, runId: 'g_r1', taskStatus: 'completed', memory: MEM() });
    expect(out).toEqual({ patternsWritten: 1, failedRecorded: false, frame: 'deleted' });
    expect(ds.calls.some((c: any) => c.sql.startsWith('INSERT INTO assistant_procedural_patterns'))).toBe(true);
    expect(ds.calls.at(-1).sql).toBe('DELETE FROM assistant_run_frames WHERE run_id = $1 AND user_id = $2');
  });

  it('사설 대상(Windows 앱)의 방법은 Cloud 에 두지 않는다', async () => {
    const ds = recordingDs();
    const out = await rememberExecution(ds, { userId: ME, taskId: TASK, ownership: USER_OWN, runId: null, taskStatus: 'completed', memory: MEM({ targetId: 'windows.notepad', targetKind: 'windows_app' }) });
    expect(out.patternsWritten).toBe(0);
    expect(ds.calls).toHaveLength(0);
  });

  it('질문 대기 → 재개 구조 저장', async () => {
    const ds = recordingDs((sql) => (sql.includes('INSERT INTO assistant_run_frames') ? [{ run_id: 'g_q2' }] : [[], 0]));
    const frame = { taskKey: 'drug_info.lookup', stageKey: 'search_product', ask: { kind: 'value_confirmation' as const, slots: ['drug_name'] }, strategy: { ops: [{ op: 'search' as const }] } };
    const out = await rememberExecution(ds, { userId: ME, taskId: TASK, ownership: USER_OWN, runId: 'g_q2', taskStatus: 'waiting_for_user', memory: MEM({ verifiedPatterns: [], resumeFrame: frame }) });
    expect(out.frame).toBe('saved');
  });

  it('쓰기 실패는 결과를 바꾸지 않는다', async () => {
    const ds = recordingDs(() => { throw new Error('db down'); });
    await expect(rememberExecution(ds, { userId: ME, taskId: TASK, ownership: USER_OWN, runId: 'g_r1', taskStatus: 'completed', memory: MEM() }))
      .resolves.toEqual({ patternsWritten: 0, failedRecorded: false, frame: 'none' });
  });

  it('Assistant 경로 — 실행 보고의 기억 후보가 Task 소유 주체(조직) 기억으로 · 다음 Task 에서 recall 되어 실행 지시로', async () => {
    ownership = ORG_OWN;
    const stored: any[] = [];
    const ds = recordingDs((sql, params) => {
      if (sql.includes('INSERT INTO assistant_procedural_patterns')) { stored.push(params); return []; }
      if (sql.includes('SELECT id, task_type_key')) {
        return stored.map((p, i) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, task_type_key: p[3], stage_key: p[4], polarity: p[5], strategy: JSON.parse(p[7]), verified_count: 1 }));
      }
      return [];
    });
    const report = { claim: 'execution_complete', runOpened: true, resultObserved: true, replayVerified: false, plannerMode: 'discovery', taskTypeProposal: 'drug_info.same_ingredient', memory: MEM() };
    const exec = jest.fn(async (): Promise<WorkExecutionReply> => ({
      status: 200,
      body: { success: true, data: { runId: 'g_r9', goal: { status: 'completed', siteId: 'healthkr' }, target: { targetId: 'healthkr', targetType: 'browser_site' } } },
      execution: { taskKey: 'drug_info.same_ingredient', report: report as any },
    }));
    await runAssistantWorkTask(ds, { userId: ME, workBody: { request: '약학정보원에서 동일성분 찾아줘' }, workScope: { workspace: 'store' } }, exec);
    expect(stored).toHaveLength(1);
    expect(stored[0].slice(0, 2)).toEqual(['ORGANIZATION', ORG]);

    // 다음 Task(다른 직원이어도 같은 조직) — Assistant Memory 가 같은 방법을 실행 지시에 싣는다.
    await runAssistantWorkTask(ds, { userId: '00000000-0000-4000-8000-0000000000e2', workBody: { request: '약학정보원에서 동일성분 찾아줘' }, workScope: { workspace: 'store' } }, exec);
    const intent = (exec.mock.calls[1] as unknown[])[2] as any;
    expect(intent.memory.patterns).toEqual([{ taskKey: 'drug_info.same_ingredient', stageKey: 'find_same_ingredient', polarity: 'preferred', strategy: ALT, verifiedCount: 1 }]);
    expect(intent.memory.resumeFrame).toBeNull();
  });

  it('recall — 재개 요청이면 본인 run 의 재개 구조를 돌려준다', async () => {
    const ds = recordingDs((sql) => (sql.includes('FROM assistant_run_frames') ? [{ task_type_key: 'drug_info.lookup', stage_key: 'search_product', ask: null, strategy: null }] : []));
    const m = await recallAssistantMemory(ds, { userId: ME, ownership: USER_OWN, targetId: 'healthkr', runId: 'g_q3' });
    expect(m.resumeFrame).toEqual({ taskKey: 'drug_info.lookup', stageKey: 'search_product', ask: null, strategy: null });
    expect(m.sources.find((s) => s.kind === 'run_resume_frame')).toEqual({ kind: 'run_resume_frame', placement: 'cloud', readByAssistant: true });
  });

  it('recall — 사설 대상이면 방법 기억을 찾지 않는다(노드)', async () => {
    const ds = recordingDs();
    const m = await recallAssistantMemory(ds, { userId: ME, ownership: USER_OWN, targetId: 'windows.notepad' });
    expect(m.sources.find((s) => s.kind === 'procedural_memory')).toMatchObject({ placement: 'node', note: 'PRIVATE_TARGET' });
    expect(ds.calls.some((c: any) => c.sql.includes('assistant_procedural_patterns'))).toBe(false);
  });
});

// ─── D. runtime 노드 간 연속성 ─────────────────────────────────────────────────

const A = LOCAL_AGENT_ACTIONS;
const SITE = 'healthkr';
const SNAP = 's_abcd1234';
type Outcome = { status: 'success' | 'failed' | 'denied'; errorCode?: string; data?: unknown };
type Script = Record<string, Outcome[]>;
const OK = (data: Record<string, unknown>): Outcome => ({ status: 'success', data: { siteId: SITE, ...data } });
const CTX = (path: string) => OK({ active: true, ready: true, path });
const EL = (elementRef: string, role: string, name: string, extra: Record<string, unknown> = {}) => ({ elementRef, role, name, ...extra });
const HOME = [EL('e_1', 'heading', '약학정보원'), EL('e_2', 'searchbox', '약물의 제품명 또는 성분명을 입력하세요.'), EL('e_3', 'button', '검 색')];
const DETAIL = [EL('e_1', 'heading', '의약품 상세'), EL('e_4', 'tab', '허가정보'), EL('e_5', 'tab', '동일성분')];
const SAME = [EL('e_1', 'heading', '동일성분 의약품'), EL('e_6', 'table', '', { text: '제품명 업체명' })];
const INSPECT = (elements: Record<string, unknown>[]) => OK({ snapshotId: SNAP, elements, elementCount: elements.length });
const READY = { targetId: SITE, targetType: 'browser_site', state: 'ready', reusedExisting: true, openedByO4O: false, tabCount: 1, path: '/' };
const DONE = { assessment: 'progress', action: { kind: 'takeover', reason: 'goal_sufficiently_advanced' } };

interface Node { contextReply: Record<string, unknown>; patterns: Record<string, unknown>[]; contextSaves: unknown[]; ledger: { base: string; args: Record<string, unknown> }[] }

async function drive(db: LocalAgentDb, script: Script, node: Node, max = 60) {
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
    if (base.startsWith('local.data.work_run_')) node.ledger.push({ base, args });
    if (base === 'local.target.prepare') { await reply(READY); continue; }
    if (base === A.DATA_WORK_RUN_CONTEXT_SAVE) { node.contextSaves.push(args); await reply({ saved: true }); continue; }
    if (base === A.DATA_WORK_RUN_CONTEXT_RECALL) { await reply(node.contextReply); continue; }
    if (base === A.DATA_WORK_RUN_ASSISTANCE_RECORD) { await reply({ saved: true, patternCount: 0 }); continue; }
    if (base === A.DATA_WORK_RUN_EXPERIENCE_RECALL) { await reply(args.taskKey === null ? { taskKeys: [] } : { patterns: node.patterns }); continue; }
    if (base === A.DATA_WORK_RUN_CANDIDATE_MATCH) { await reply({ matched: false }); continue; }
    if (base.startsWith('local.data.work_run_')) { await reply({ runId: 'r_test', runStatus: 'active', saved: true }); continue; }
    seen.push({ base, args });
    const queue = script[base] ?? [{ status: 'failed', errorCode: 'DOM_ELEMENT_NOT_FOUND' } as Outcome];
    const idx = Math.min(cursors[base] ?? 0, queue.length - 1);
    cursors[base] = (cursors[base] ?? 0) + 1;
    const o = queue[idx];
    await submitCommandResult(db.dataSource, cmd.device_id, { commandId: cmd.command_id, status: o.status, errorCode: o.errorCode, data: o.data } as any);
  }
  return seen;
}

function waitingRun(db: LocalAgentDb, runId: string, lastAskedDeviceId: string | null = null) {
  const row: Record<string, unknown> = {
    run_id: runId, user_id: 'user-1', device_id: lastAskedDeviceId, status: 'waiting_for_user', version: 3,
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

function scripted(proposals: unknown[], kind = 'scripted'): WorkPlanner & { calls: PlannerInput[] } {
  const calls: PlannerInput[] = [];
  let i = 0;
  return {
    kind,
    calls,
    async plan(input) {
      calls.push({ ...input, history: [...input.history] });
      const p = proposals[Math.min(i, proposals.length - 1)];
      i += 1;
      return p;
    },
  } as WorkPlanner & { calls: PlannerInput[] };
}

async function runOn(
  deviceId: string, request: string, planner: WorkPlanner, script: Script,
  opts: { runId?: string; intent?: any; node?: Partial<Node>; lastAsked?: 'self' | 'other' | null; nodeCaps?: Record<string, boolean> | null } = {},
) {
  const db = makeDb();
  await pairAndRegister(db);
  const self = await connected(db);
  // Phase D — 이 노드가 보고한 capability(heartbeat). 없으면 업데이트 전 에이전트.
  if (opts.nodeCaps) db.devices.find((d) => d.id === self.deviceId)!.capabilities = opts.nodeCaps;
  const lastAsked = opts.lastAsked === 'self' ? self.deviceId : opts.lastAsked === 'other' ? '00000000-0000-4000-8000-0000000000ff' : null;
  if (opts.runId) waitingRun(db, opts.runId, lastAsked);
  const node: Node = { contextReply: { found: false }, patterns: [], contextSaves: [], ledger: [], ...opts.node };
  const ctx: VerifiedToolContext = { userId: 'user-1', workspace: 'home', localAgentStatus: 'connected', localDeviceId: deviceId };
  const input = { request, ...(opts.runId ? { runId: opts.runId, targetHint: SITE } : {}), ...(opts.intent ? { intent: opts.intent } : {}) };
  const [result, seen] = await Promise.all([runWorkAgent(db.dataSource, ctx, input, planner), drive(db, script, node)]);
  return { result, seen, node };
}

const BASE = { taskId: TASK, resuming: false, priorTaskTypeKey: null, userMethodHint: false, nodeExperienceReachable: true };

describe('D. runtime 노드 간 연속성', () => {
  it('PC A — 검증된 방법 교정이 report.memory 의 Preferred/Avoid 로 올라온다(원문 없음)', async () => {
    const planner = scripted([
      {
        assessment: 'progress', action: { kind: 'click', elementRef: 'e_5' }, task: 'drug_info.same_ingredient', stage: 'find_same_ingredient', strategy: ALT,
        userInput: {
          kind: 'correction', askKind: 'procedure_order', providedKind: 'correction', correctionType: 'procedure_method', stage: 'find_same_ingredient',
          reason: 'site_feature_exists', wrong: OLD, alternative: ALT, reusability: 'reusable_knowledge',
        },
      },
      DONE,
    ]);
    const { result } = await runOn('dev-pc-a', '그 방법 말고 제품 상세의 동일성분 탭을 써', planner, {
      get_context: [CTX('/drug/detail'), CTX('/drug/detail')],
      inspect: [INSPECT(DETAIL), INSPECT(SAME)],
      click: [OK({ elementRef: 'e_5', navigated: false, changed: true, role: 'tab', riskLevel: 'REVERSIBLE' })],
    }, {
      runId: 'g_same01',
      node: { contextReply: { found: true, taskKey: 'drug_info.same_ingredient', stageKey: 'find_same_ingredient', ask: { kind: 'procedure_order', slots: [] }, strategy: OLD } },
    });
    const memory = result.report?.memory;
    expect(memory).toEqual({
      targetId: SITE, targetKind: 'browser_site', taskKey: 'drug_info.same_ingredient',
      verifiedPatterns: [
        { stageKey: 'find_same_ingredient', polarity: 'preferred', strategy: ALT },
        { stageKey: 'find_same_ingredient', polarity: 'avoid', strategy: OLD },
      ],
      failedAlternative: null,
      resumeFrame: null,
    });
    expect(JSON.stringify(memory)).not.toMatch(/그 방법 말고|e_5|제품명 업체명/);
  });

  it('PC B(노드 원장 비어 있음) — 소유 주체 Cloud 기억의 방법이 근거가 된다: Avoid 차단 · Preferred 표시 · Experienced', async () => {
    const memory = {
      patterns: [
        { taskKey: 'drug_info.same_ingredient', stageKey: 'find_same_ingredient', polarity: 'preferred' as const, strategy: ALT, verifiedCount: 1 },
        { taskKey: 'drug_info.same_ingredient', stageKey: 'find_same_ingredient', polarity: 'avoid' as const, strategy: OLD, verifiedCount: 1 },
        { taskKey: 'drug_info.other', stageKey: 'x_stage', polarity: 'preferred' as const, strategy: OLD, verifiedCount: 9 },
      ],
      resumeFrame: null,
    };
    const intent = planAssistantTask({ ...BASE, knownTaskTypes: ['drug_info.same_ingredient'], memory }).intent;
    const oldWay = { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: '아세트아미노펜' }, task: 'drug_info.same_ingredient', stage: 'find_same_ingredient', strategy: OLD };
    const planner = scripted([
      oldWay, // 업무 첫 선언 → 기억 recall 후 다시 계획
      oldWay, // 그래도 옛 방법 → AVOID_PATTERN
      { assessment: 'progress', action: { kind: 'click', elementRef: 'e_5' }, stage: 'find_same_ingredient', strategy: ALT },
      DONE,
    ]);
    const { result, seen } = await runOn('dev-pc-b', '약학정보원에서 타이레놀 동일성분 제품 찾아줘', planner, {
      get_context: [CTX('/drug/detail'), CTX('/drug/detail')],
      inspect: [INSPECT([...HOME, ...DETAIL.slice(1)]), INSPECT(SAME)],
      click: [OK({ elementRef: 'e_5', navigated: false, changed: true, role: 'tab', riskLevel: 'REVERSIBLE' })],
    }, { intent });
    expect(result.goal.status).toBe('completed');
    expect(planner.calls[1].patterns).toEqual([
      { stageKey: 'find_same_ingredient', polarity: 'preferred', strategy: ALT, verifiedCount: 1 },
      { stageKey: 'find_same_ingredient', polarity: 'avoid', strategy: OLD, verifiedCount: 1 },
    ]); // 다른 업무 키의 기억은 섞이지 않는다
    expect(planner.calls[2].lastRejectReason).toBe('AVOID_PATTERN');
    expect(seen.filter((s) => s.base === 'set_input')).toEqual([]);
    expect(result.report?.plannerMode).toBe('experienced');
  });

  it('비교 — Cloud 기억 없이 PC B 에서 시작하면 옛 방법이 그대로 실행된다(종전 상태)', async () => {
    const planner = scripted([
      { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: '아세트아미노펜' }, task: 'drug_info.same_ingredient', stage: 'find_same_ingredient', strategy: OLD },
      DONE,
    ]);
    const { seen } = await runOn('dev-pc-b', '약학정보원에서 타이레놀 동일성분 제품 찾아줘', planner, {
      get_context: [CTX('/'), CTX('/')], inspect: [INSPECT(HOME), INSPECT(HOME)], set_input: [OK({ elementRef: 'e_2', hasValue: true })],
    }, { intent: planAssistantTask(BASE).intent });
    expect(seen.filter((s) => s.base === 'set_input')).toHaveLength(1);
  });

  it('질문으로 멈추면 report.memory.resumeFrame — 노드 저장과 같은 구조(label 없음)', async () => {
    const ask = { kind: 'value_confirmation', slots: ['drug_name'] };
    const planner = scripted([{
      assessment: 'needs_user', action: { kind: 'inspect' }, neededInput: '어떤 약을 검색할까요?',
      task: 'drug_info.lookup', stage: 'search_product', strategy: { ops: [{ op: 'open_menu', label: '의약품검색' }, { op: 'search' }] }, ask,
    }]);
    const { result, node } = await runOn('dev-pc-a', '약학정보원에서 내가 먹을 약 검색해줘', planner, { get_context: [CTX('/')], inspect: [INSPECT(HOME)] });
    expect(result.goal.status).toBe('waiting_for_user');
    const frame = { taskKey: 'drug_info.lookup', stageKey: 'search_product', ask, strategy: { ops: [{ op: 'open_menu' }, { op: 'search' }] } };
    expect(result.report?.memory?.resumeFrame).toEqual(frame);
    expect(node.contextSaves[0]).toMatchObject(frame);
  });

  it('다른 PC 에서 재개 — 노드 원장에 원래 업무 구조가 없으면 Cloud 재개 구조로 이어간다', async () => {
    const frame = { taskKey: 'drug_info.lookup', stageKey: 'search_product', ask: { kind: 'value_confirmation' as const, slots: ['drug_name'] }, strategy: { ops: [{ op: 'search' as const }] } };
    const intent = planAssistantTask({ ...BASE, resuming: true, memory: { patterns: [], resumeFrame: frame } }).intent;
    const planner = scripted([
      { assessment: 'progress', action: { kind: 'set_input', elementRef: 'e_2', text: '게보린' }, userInput: { kind: 'assistance', askKind: 'value_confirmation', providedKind: 'value', reusability: 'per_run_value' } },
      { assessment: 'progress', action: { kind: 'click', elementRef: 'e_3' } },
      DONE,
    ]);
    const { result } = await runOn('dev-pc-b', '게보린', planner, {
      get_context: [CTX('/'), CTX('/searchDrug/search_total_result.asp')],
      inspect: [INSPECT(HOME), INSPECT(SAME)],
      set_input: [OK({ elementRef: 'e_2', hasValue: true })],
      click: [OK({ elementRef: 'e_3', navigated: true, changed: true, role: 'button', riskLevel: 'REVERSIBLE' })],
    }, { runId: 'g_q9', intent, node: { contextReply: { found: false } } });
    expect(result.goal.runId).toBe('g_q9');
    expect(planner.calls[0].resumeFrame).toEqual(frame);
    expect(planner.calls[0].userAnswer).toBe('게보린');
    expect(result.report?.memory?.resumeFrame).toBeNull(); // 완료 — Assistant 가 재개 구조를 지운다
  });

  it('노드 원장에 구조가 있으면 그것이 우선(Cloud 구조로 덮지 않는다)', async () => {
    const cloudFrame = { taskKey: 'drug_info.cloud', stageKey: 'cloud_stage', ask: null, strategy: null };
    const intent = planAssistantTask({ ...BASE, resuming: true, memory: { patterns: [], resumeFrame: cloudFrame } }).intent;
    const planner = scripted([DONE]);
    await runOn('dev-pc-a', '게보린', planner, { get_context: [CTX('/')], inspect: [INSPECT(HOME)] }, {
      runId: 'g_q10', intent, node: { contextReply: { found: true, taskKey: 'drug_info.lookup', stageKey: 'search_product', ask: null, strategy: null } },
    });
    expect(planner.calls[0].resumeFrame).toMatchObject({ taskKey: 'drug_info.lookup', stageKey: 'search_product' });
  });
});

// ─── F. Phase D — Execution Node · Runtime State 조정 ─────────────────────────

describe('F. Phase D — 노드 원장 소유 주체 · 재개 구조 최신성', () => {
  const SCOPED = { browser: true, windowsUia: true, localData: false, ownerScopedLedger: true };
  const OWNER_ORG = nodeLedgerOwnerKey('ORGANIZATION', '00000000-0000-4000-8000-0000000000a1');
  const frameOf = (taskKey: string, stageKey: string) => ({ taskKey, stageKey, ask: null, strategy: null });

  it('소유 주체 키 — 형식(에이전트와 같은 규칙) · 같은 소유 주체면 같은 키 · 다르면 다른 키 · 원 id 를 담지 않는다', () => {
    const u = nodeLedgerOwnerKey('USER', 'user-1');
    expect(u).toMatch(NODE_LEDGER_OWNER_KEY_RE);
    expect(nodeLedgerOwnerKey('USER', 'user-1')).toBe(u);
    expect(nodeLedgerOwnerKey('ORGANIZATION', 'user-1')).not.toBe(u);
    expect(u).not.toContain('user-1');
  });

  it('원장 명령 검증 — ownerKey 는 선택 · 형식이 아니면 명령 전체 거절 · 다른 추가 키는 여전히 거절', () => {
    const ok = validateLocalCommandArgs(A.DATA_WORK_RUN_EXPERIENCE_RECALL, { targetId: SITE, taskKey: null, ownerKey: OWNER_ORG });
    expect(ok).toEqual({ ok: true, args: { targetId: SITE, taskKey: null, ownerKey: OWNER_ORG } });
    expect(validateLocalCommandArgs(A.DATA_WORK_RUN_EXPERIENCE_RECALL, { targetId: SITE, taskKey: null })).toEqual({ ok: true, args: { targetId: SITE, taskKey: null } });
    expect(validateLocalCommandArgs(A.DATA_WORK_RUN_EXPERIENCE_RECALL, { targetId: SITE, taskKey: null, ownerKey: 'U:user-1' }).ok).toBe(false);
    expect(validateLocalCommandArgs(A.DATA_WORK_RUN_EXPERIENCE_RECALL, { targetId: SITE, taskKey: null, ownerKey: OWNER_ORG, extra: 1 }).ok).toBe(false);
    // 소유 주체를 받지 않는 명령(재개 구조 저장)에는 실을 수 없다.
    expect(validateLocalCommandArgs(A.DATA_WORK_RUN_CONTEXT_RECALL, { runId: 'g_1', targetId: SITE, slotValue: null, ownerKey: OWNER_ORG }).ok).toBe(false);
  });

  it('소유 주체 원장 노드 — 경험 회상 · Candidate 대조 · run 기록에 Task 소유 주체 키가 실린다(재개 구조 · 상태에는 없다)', async () => {
    const intent = { ...planAssistantTask(BASE).intent, node: { ownerKey: OWNER_ORG, preferredDeviceIds: [] } };
    const planner = scripted([DONE]);
    const { node } = await runOn('dev-pc-a', '약학정보원에서 게보린 검색해줘', planner, { get_context: [CTX('/')], inspect: [INSPECT(HOME)] }, { intent, nodeCaps: SCOPED });
    const by = (b: string) => node.ledger.filter((l) => l.base === b);
    expect(by(A.DATA_WORK_RUN_EXPERIENCE_RECALL).length).toBeGreaterThan(0);
    for (const l of by(A.DATA_WORK_RUN_EXPERIENCE_RECALL)) expect(l.args.ownerKey).toBe(OWNER_ORG);
    for (const l of by(A.DATA_WORK_RUN_CANDIDATE_MATCH)) expect(l.args.ownerKey).toBe(OWNER_ORG);
    for (const l of by(A.DATA_WORK_RUN_UPSERT)) expect(l.args.ownerKey).toBe(OWNER_ORG);
    for (const l of node.ledger.filter((x) => x.base === A.DATA_WORK_RUN_SET_STATUS || x.base === A.DATA_WORK_RUN_EXPERIENCE_RECORD)) expect(l.args).not.toHaveProperty('ownerKey');
  });

  it('Task 없이 온 실행 + 소유 주체 원장 노드 — 요청자 개인(USER) 키로 나눈다', async () => {
    const planner = scripted([DONE]);
    const { node } = await runOn('dev-pc-a', '약학정보원에서 게보린 검색해줘', planner, { get_context: [CTX('/')], inspect: [INSPECT(HOME)] }, { nodeCaps: SCOPED });
    const recall = node.ledger.find((l) => l.base === A.DATA_WORK_RUN_EXPERIENCE_RECALL);
    expect(recall?.args.ownerKey).toBe(nodeLedgerOwnerKey('USER', 'user-1'));
  });

  it('업데이트 전 에이전트(capability 미보고) — ownerKey 를 보내지 않는다(거절 방지) · 기능은 예전대로', async () => {
    const intent = { ...planAssistantTask(BASE).intent, node: { ownerKey: OWNER_ORG, preferredDeviceIds: [] } };
    const planner = scripted([DONE]);
    const { node } = await runOn('dev-pc-a', '약학정보원에서 게보린 검색해줘', planner, { get_context: [CTX('/')], inspect: [INSPECT(HOME)] }, { intent });
    expect(node.ledger.length).toBeGreaterThan(0);
    for (const l of node.ledger) expect(l.args).not.toHaveProperty('ownerKey');
    expect(node.ledger.some((l) => l.base === A.DATA_WORK_RUN_EXPERIENCE_RECALL)).toBe(true);
  });

  it('A→B→A — 마지막 질문을 받은 노드가 지금 노드가 아니면 노드 원장의 (오래된) 재개 구조를 읽지 않고 Cloud 구조로 잇는다', async () => {
    const cloudFrame = frameOf('drug_info.lookup', 'stage_from_b');
    const intent = planAssistantTask({ ...BASE, resuming: true, memory: { patterns: [], resumeFrame: cloudFrame } }).intent;
    const planner = scripted([DONE]);
    const { node } = await runOn('dev-pc-a', '게보린', planner, { get_context: [CTX('/')], inspect: [INSPECT(HOME)] }, {
      runId: 'g_aba', intent, lastAsked: 'other',
      node: { contextReply: { found: true, taskKey: 'drug_info.lookup', stageKey: 'stale_stage_from_a', ask: null, strategy: null } },
    });
    expect(node.ledger.some((l) => l.base === A.DATA_WORK_RUN_CONTEXT_RECALL)).toBe(false);
    expect(planner.calls[0].resumeFrame).toMatchObject({ stageKey: 'stage_from_b' });
  });

  it('같은 노드에서 질문하고 같은 노드에서 이어가면 노드 원장 구조(재생 단계 포함 가능)를 쓴다', async () => {
    const intent = planAssistantTask({ ...BASE, resuming: true, memory: { patterns: [], resumeFrame: frameOf('drug_info.cloud', 'cloud_stage') } }).intent;
    const planner = scripted([DONE]);
    const { node } = await runOn('dev-pc-a', '게보린', planner, { get_context: [CTX('/')], inspect: [INSPECT(HOME)] }, {
      runId: 'g_same', intent, lastAsked: 'self',
      node: { contextReply: { found: true, taskKey: 'drug_info.lookup', stageKey: 'search_product', ask: null, strategy: null } },
    });
    expect(node.ledger.some((l) => l.base === A.DATA_WORK_RUN_CONTEXT_RECALL)).toBe(true);
    expect(planner.calls[0].resumeFrame).toMatchObject({ stageKey: 'search_product' });
  });
});

// ─── E. 설계 경계 ─────────────────────────────────────────────────────────────

describe('E. 설계 경계', () => {
  const src = readFileSync(join(__dirname, '..', 'database', 'migrations', '1791100000000-CreateAssistantProceduralMemory.ts'), 'utf8');
  const columnsOf = (table: string): string[] => {
    const m = src.match(new RegExp(`CREATE TABLE ${table} \\(([\\s\\S]*?)\\n      \\)`));
    if (!m) throw new Error(`table ${table} not found`);
    return m[1].split('\n').map((l) => l.trim()).filter((l) => /^[a-z_]+ (uuid|character|varchar|text|integer|bigint|numeric|boolean|bytea|json|jsonb|timestamp)\b/.test(l))
      .map((l) => l.split(/\s+/)[0]);
  };

  it('검증 방법 테이블 칼럼 allowlist — 원문 · 값 · 화면 글 · Provider 칼럼 없음 · 범용 metadata 없음', () => {
    expect(columnsOf('assistant_procedural_patterns')).toEqual([
      'id', 'ownership_scope', 'user_id', 'organization_id', 'target_id', 'task_type_key', 'stage_key', 'polarity', 'pattern_sig',
      'strategy', 'verified_count', 'failed_count', 'status', 'last_used_at', 'created_at', 'updated_at',
    ]);
  });

  it('재개 구조 테이블 칼럼 allowlist — slot 값 · 답변 · 화면 · device 칼럼 없음', () => {
    expect(columnsOf('assistant_run_frames')).toEqual([
      'run_id', 'user_id', 'task_id', 'target_id', 'task_type_key', 'stage_key', 'ask', 'strategy', 'created_at', 'updated_at',
    ]);
  });

  it('소유 주체 삭제 · run 정리 시 CASCADE — 삭제 가능한 구조', () => {
    expect(src).toMatch(/fk_app_user FOREIGN KEY \(user_id\) REFERENCES users\(id\) ON DELETE CASCADE/);
    expect(src).toMatch(/fk_app_organization FOREIGN KEY \(organization_id\) REFERENCES organizations\(id\) ON DELETE CASCADE/);
    expect(src).toMatch(/fk_arf_run FOREIGN KEY \(run_id\) REFERENCES work_run_coordination\(run_id\) ON DELETE CASCADE/);
    expect(src).toMatch(/fk_arf_task FOREIGN KEY \(task_id\) REFERENCES assistant_tasks\(id\) ON DELETE CASCADE/);
  });

  it('Provider 독립 — 수행자(planner)가 바뀌어도 같은 기억이 같은 근거로 쓰인다', async () => {
    const memory = { patterns: [{ taskKey: 'drug_info.same_ingredient', stageKey: 'find_same_ingredient', polarity: 'preferred' as const, strategy: ALT, verifiedCount: 2 }], resumeFrame: null };
    const intent = planAssistantTask({ ...BASE, memory }).intent;
    expect(JSON.stringify(intent)).not.toMatch(/openai|gemini|anthropic|model|prompt|conversation|thread/i);
    const seenBy: unknown[] = [];
    for (const kind of ['provider-a', 'provider-b']) {
      const p = scripted([{ assessment: 'progress', action: { kind: 'inspect' }, task: 'drug_info.same_ingredient', stage: 'find_same_ingredient' }, DONE], kind);
      await runOn('dev-pc-b', '약학정보원에서 동일성분 찾아줘', p, { get_context: [CTX('/'), CTX('/')], inspect: [INSPECT(HOME), INSPECT(HOME)] }, { intent });
      seenBy.push(p.calls[1]?.patterns);
    }
    expect(seenBy[0]).toEqual([{ stageKey: 'find_same_ingredient', polarity: 'preferred', strategy: ALT, verifiedCount: 2 }]);
    expect(seenBy[1]).toEqual(seenBy[0]);
  });
});
