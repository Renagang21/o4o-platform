/** Connected runtime regression with synthetic nodes/providers; no real commands, paid calls or DB writes. */
jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn() },
}));
jest.mock('../services/local-agent/local-agent-service.js', () => ({
  resolveTargetDevice: jest.fn(),
}));
jest.mock('../services/ai-tools/work-target-executor.js', () => ({
  issueTargetPrepare: jest.fn(),
}));
jest.mock('../services/ai-tools/work-run-coordination-service.js', () => ({
  ...jest.requireActual(
    '../services/ai-tools/work-run-coordination-service.js',
  ),
  createWorkRun: jest.fn(),
  checkResumable: jest.fn(),
  transitionWorkRun: jest.fn(),
}));
jest.mock('../services/ai-tools/work-run-executor.js', () => ({
  issueWorkRunUpsert: jest.fn(),
  issueWorkRunSetStatus: jest.fn(),
  issueWorkflowCandidateMatch: jest.fn(),
  issueWorkRunContextSave: jest.fn(),
  issueWorkRunContextRecall: jest.fn(),
  issueWorkRunAssistanceRecord: jest.fn(),
  issueExperienceRecall: jest.fn(),
  issueWorkRunExperienceRecord: jest.fn(),
  measureSegmentCommandTiming: jest.fn(),
}));
jest.mock('../services/ai-tools/work-observation-session.js', () => ({
  ...jest.requireActual('../services/ai-tools/work-observation-session.js'),
  createWorkObservationSession: jest.fn(),
}));

import logger from '../utils/logger.js';
import { resolveTargetDevice } from '../services/local-agent/local-agent-service.js';
import { issueTargetPrepare } from '../services/ai-tools/work-target-executor.js';
import {
  createWorkRun,
  checkResumable,
  transitionWorkRun,
} from '../services/ai-tools/work-run-coordination-service.js';
import * as executor from '../services/ai-tools/work-run-executor.js';
import { createWorkObservationSession } from '../services/ai-tools/work-observation-session.js';
import {
  runWorkAgent,
  type WorkPlanner,
  type PlannerInput,
} from '../services/ai-tools/work-agent-runtime.js';
import type { ExecutionIntent } from '../services/ai-tools/work-agent-contract.js';
import { nodeLedgerOwnerKey } from '../services/ai-tools/node-ledger-owner.js';

const trace: string[] = [];
const contexts: Record<
  string,
  ReturnType<typeof createWorkObservationSession>
> = {};
const request = '약학정보원에서 자료를 찾아줘';
const done = { assessment: 'completed', action: { kind: 'done' } };
const ask = { kind: 'value_confirmation', slots: ['item_name'] };
const valueInput = {
  kind: 'assistance',
  askKind: 'value_confirmation',
  providedKind: 'value',
};
const preferred = {
  stageKey: 'search_item',
  polarity: 'preferred',
  strategy: { ops: [{ op: 'search' }] },
  verifiedCount: 2,
};
const frame = (taskKey = 'item.search') => ({
  taskKey,
  stageKey: 'search_item',
  ask,
  strategy: { ops: [{ op: 'search', label: 'Synthetic menu' }] },
});
const ctx = (userId = 'actor-a') => ({ userId, workspace: 'home' });
const db = {} as any;
const m = (fn: unknown): jest.Mock => fn as jest.Mock;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
function scripted(proposals: unknown[]) {
  let index = 0;
  const calls: PlannerInput[] = [];
  const planner: WorkPlanner = {
    kind: 'scripted',
    plan: jest.fn(async (input) => {
      calls.push(input);
      const p = proposals[Math.min(index++, proposals.length - 1)];
      if (p instanceof Error) throw p;
      return p;
    }),
  };
  return { planner, calls };
}
function resume(previousNode = 'node-a') {
  m(checkResumable).mockResolvedValue({
    ok: true,
    row: {
      runId: 'g_resume123',
      userId: 'actor-a',
      deviceId: previousNode,
      version: 4,
    },
  });
}
function intent(
  memory: ExecutionIntent['memory'],
  taskTypeHint: string | null = null,
): ExecutionIntent {
  return {
    memory,
    taskTypeHint,
    knownTaskTypes: [],
    node: { ownerKey: 'owner-a', preferredDeviceIds: [] },
  } as ExecutionIntent;
}
beforeEach(() => {
  jest.resetAllMocks();
  trace.length = 0;
  for (const key of Object.keys(contexts)) delete contexts[key];
  m(logger.info).mockImplementation((name) => {
    if (name === 'work-agent run') trace.push('usage');
  });
  m(resolveTargetDevice).mockImplementation(async (_db, actor) => ({
    status: 'ok',
    onlineCount: 1,
    device: {
      id: actor === 'actor-b' ? 'node-b' : 'node-a',
      capabilities: { ownerScopedLedger: true },
    },
  }));
  m(issueTargetPrepare).mockResolvedValue({
    state: 'ready',
    targetId: 'healthkr',
    targetType: 'browser_site',
  });
  m(createWorkRun).mockResolvedValue({ version: 1 });
  m(transitionWorkRun).mockImplementation(async (_db, args) => {
    if (args.status !== 'active') trace.push('terminal_cloud');
    return { version: 5 };
  });
  m(executor.issueWorkRunUpsert).mockResolvedValue({
    status: 'success',
    safe: {},
  });
  m(executor.issueWorkRunSetStatus).mockImplementation(async () => {
    trace.push('terminal_local');
    return { status: 'success', safe: {} };
  });
  m(executor.issueWorkflowCandidateMatch).mockResolvedValue({
    candidateId: null,
  });
  m(executor.issueWorkRunContextRecall).mockResolvedValue({
    status: 'success',
    safe: { found: false },
  });
  m(executor.issueExperienceRecall).mockImplementation(
    async (_db, _owner, args) => ({
      status: 'success',
      safe: args.taskKey === null ? { taskKeys: [] } : { patterns: [] },
    }),
  );
  m(executor.issueWorkRunContextSave).mockImplementation(async () => {
    trace.push('context');
    return { status: 'success', safe: {} };
  });
  m(executor.issueWorkRunAssistanceRecord).mockImplementation(async () => {
    trace.push('assistance');
    return { status: 'success', safe: {} };
  });
  m(executor.measureSegmentCommandTiming).mockResolvedValue({
    commandWaitMs: 0,
    executionMs: 0,
  });
  m(executor.issueWorkRunExperienceRecord).mockImplementation(async () => {
    trace.push('experience');
    return { status: 'success', safe: {} };
  });
  m(createWorkObservationSession).mockImplementation(({ state, deviceId }) => {
    let same = 0;
    const session = {
      budgetLeft: () => 10,
      overTime: () => false,
      observe: jest.fn(async () => {
        state.observation = {
          siteId: 'healthkr',
          path: '/current',
          ready: true,
          elements: [],
          elementCount: 0,
          source: 'webpage',
          fingerprint: deviceId,
          docId: deviceId,
        };
        state.stepCount += 1;
        same += 1;
        return { ok: true };
      }),
      // Keep the no-progress signal below the existing loop threshold; assertion checks resets/restores explicitly.
      sameObservationRun: () => Math.min(same, 1),
      resetSameObservationRun: jest.fn(() => {
        same = 0;
      }),
      restoreSameObservationRun: jest.fn((value) => {
        same = value;
      }),
      isVisualFallback: () => false,
      plannerImage: () => undefined,
      unitCapable: () => false,
      dom: jest.fn(),
      uia: jest.fn(),
      computer: jest.fn(),
    };
    contexts[deviceId] = session as any;
    return session;
  });
});

it('organization execution matches procedures only in the requesting user ledger', async () => {
  const p = scripted([done]);
  await runWorkAgent(db, ctx(), { request }, p.planner, { intent: intent(undefined) });
  expect(executor.issueWorkflowCandidateMatch).toHaveBeenCalledWith(
    db, expect.objectContaining({ ownerKey: nodeLedgerOwnerKey('USER', ctx().userId) }), expect.anything(),
  );
});

it('recalls declarations before execution, switches role after await, preserves first input and terminal recording order', async () => {
  const gate = deferred<any>(),
    recalled = deferred<void>();
  m(executor.issueExperienceRecall).mockImplementation(
    async (_db, _owner, args) => {
      if (args.taskKey === null)
        return { status: 'success', safe: { taskKeys: ['item.search'] } };
      recalled.resolve();
      return gate.promise;
    },
  );
  const strong = scripted([
    {
      ...done,
      task: 'item.search',
      stage: 'search_item',
      strategy: frame().strategy,
      ask,
      userInput: valueInput,
    },
  ]);
  const normal = scripted([
    {
      assessment: 'needs_user',
      action: { kind: 'takeover', reason: 'user_judgment_required' },
      ask,
      neededInput: 'Synthetic question',
      userInput: {
        kind: 'correction',
        providedKind: 'correction',
        correctionType: 'procedure_method',
      },
    },
  ]);
  const running = runWorkAgent(db, ctx(), { request }, normal.planner, {
    strongPlanner: strong.planner,
  });
  await recalled.promise;
  expect(normal.calls).toHaveLength(0);
  expect(executor.issueWorkRunSetStatus).not.toHaveBeenCalled();
  gate.resolve({ status: 'success', safe: { patterns: [preferred] } });
  const result = await running;
  expect(normal.calls[0].patterns).toEqual([preferred]);
  expect(result).toMatchObject({
    resumable: true,
    taskKey: 'item.search',
    report: {
      claim: 'needs_user',
      plannerMode: 'experienced',
      resultObserved: false,
    },
  });
  expect(trace).toEqual([
    'terminal_cloud',
    'terminal_local',
    'experience',
    'context',
    'assistance',
    'usage',
  ]);
  const event = m(executor.issueWorkRunAssistanceRecord).mock.calls[0][2].event;
  expect(event).toMatchObject({
    kind: 'assistance',
    providedKind: 'value',
    correction: null,
    structured: { slots: ['item_name'] },
  });
  expect(result.report?.memory?.resumeFrame?.strategy).toEqual({
    ops: [{ op: 'search' }],
  });
  expect(m(executor.issueWorkRunContextSave).mock.calls[0][2].strategy).toEqual(
    result.report?.memory?.resumeFrame?.strategy,
  );
  expect(
    JSON.stringify({
      event,
      memory: result.report?.memory,
      logs: m(logger.info).mock.calls,
    }),
  ).not.toContain(request);
});

it('keeps concurrent task keys, node/owner recall, planner roles and plan counters isolated', async () => {
  const gate = deferred<any>(),
    started = deferred<void>();
  m(executor.issueExperienceRecall).mockImplementation(
    async (_db, owner, args) => {
      if (args.taskKey === null)
        return { status: 'success', safe: { taskKeys: [] } };
      if (owner.userId === 'actor-a') {
        started.resolve();
        return gate.promise;
      }
      return { status: 'success', safe: { patterns: [] } };
    },
  );
  const aStrong = scripted([{ ...done, task: 'task.alpha' }]),
    aNormal = scripted([done]);
  const bStrong = scripted([{ ...done, task: 'task.beta' }]),
    bNormal = scripted([done]);
  const a = runWorkAgent(
    db,
    ctx(),
    { request, intent: intent({ patterns: [], resumeFrame: null }) },
    aNormal.planner,
    { strongPlanner: aStrong.planner },
  );
  await started.promise;
  const b = await runWorkAgent(
    db,
    ctx('actor-b'),
    { request },
    bNormal.planner,
    { strongPlanner: bStrong.planner },
  );
  gate.resolve({ status: 'success', safe: { patterns: [preferred] } });
  const resultA = await a;
  expect([resultA.taskKey, b.taskKey]).toEqual(['task.alpha', 'task.beta']);
  expect([resultA.report?.plannerMode, b.report?.plannerMode]).toEqual([
    'experienced',
    'discovery',
  ]);
  expect([resultA.aiPlanCount, b.aiPlanCount]).toEqual([2, 1]);
  expect(aNormal.calls[0].patterns).toEqual([preferred]);
  expect(bNormal.calls).toHaveLength(0);
  const calls = m(executor.issueExperienceRecall).mock.calls;
  // 업무 키 목록은 Task 소유 원장, 그 업무의 방법 패턴(개인 교정에서 나온다)은 요청자 개인 원장이다(P3 ·
  // WO-O4O-PERSONAL-ASSISTANT-TASK-UNDERSTANDING-AND-COMPLETION-V1). 조직 Task 여도 개인 교정이 조직 규칙이 되지 않는다.
  expect(calls.find((c) => c[1].userId === 'actor-a' && c[2].taskKey === null)[1]).toEqual({
    userId: 'actor-a',
    deviceId: 'node-a',
    ownerKey: 'owner-a',
  });
  expect(calls.find((c) => c[2].taskKey === 'task.alpha')[1]).toEqual({
    userId: 'actor-a',
    deviceId: 'node-a',
    ownerKey: nodeLedgerOwnerKey('USER', 'actor-a'),
  });
  expect(calls.find((c) => c[2].taskKey === 'task.beta')[1]).toMatchObject({
    userId: 'actor-b',
    deviceId: 'node-b',
  });
  expect(resultA.history).not.toBe(b.history);
  expect(aStrong.calls[0].goal).not.toBe(bStrong.calls[0].goal);
});

it('skips stale node resume and uses owner Cloud frame/patterns instead', async () => {
  resume('previous-node');
  const cloud = {
    ...preferred,
    taskKey: 'item.search',
    strategy: { ops: [{ op: 'navigate' as const }] },
  };
  m(executor.issueExperienceRecall).mockImplementation(
    async (_db, _owner, args) => ({
      status: 'success',
      safe:
        args.taskKey === null
          ? { taskKeys: ['node.task'] }
          : { patterns: [preferred] },
    }),
  );
  const normal = scripted([done]),
    strong = scripted([done]);
  const result = await runWorkAgent(
    db,
    ctx(),
    {
      request: 'Synthetic answer',
      targetHint: 'healthkr',
      runId: 'g_resume123',
      intent: {
        ...intent({ patterns: [cloud], resumeFrame: frame() }, 'hint.task'),
        knownTaskTypes: ['cloud.task', 'node.task'],
      },
    },
    normal.planner,
    { strongPlanner: strong.planner },
  );
  expect(executor.issueWorkRunContextRecall).not.toHaveBeenCalled();
  expect(normal.calls[0]).toMatchObject({
    userAnswer: 'Synthetic answer',
    resumeFrame: frame(),
    knownTaskKeys: ['hint.task', 'node.task', 'cloud.task'],
    patterns: [{ ...preferred, strategy: cloud.strategy }, preferred],
  });
  expect(result).toMatchObject({
    taskKey: 'item.search',
    report: { claim: 'execution_complete', plannerMode: 'experienced' },
  });
  expect(
    m(executor.issueWorkRunUpsert).mock.calls[0][2].goalSummary,
  ).toBeUndefined();
  expect(result.report?.memory?.resumeFrame).toBeNull();
});

it('uses the latest question node frame before Cloud and persists only resumed slot keys', async () => {
  resume();
  m(executor.issueWorkRunContextRecall).mockResolvedValue({
    status: 'success',
    safe: { found: true, ...frame('node.task') },
  });
  const p = scripted([
    {
      assessment: 'needs_user',
      action: { kind: 'takeover', reason: 'user_judgment_required' },
    },
  ]);
  const result = await runWorkAgent(
    db,
    ctx(),
    {
      request: 'Synthetic answer',
      targetHint: 'healthkr',
      runId: 'g_resume123',
      intent: intent({ patterns: [], resumeFrame: frame('cloud.task') }),
    },
    p.planner,
  );
  expect(p.calls[0].resumeFrame?.taskKey).toBe('node.task');
  expect(result.taskKey).toBe('node.task');
  const event = m(executor.issueWorkRunAssistanceRecord).mock.calls[0][2].event;
  expect(event.structured).toEqual({ slots: ['item_name'] });
  expect(
    JSON.stringify({ event, memory: result.report?.memory }),
  ).not.toContain('Synthetic answer');
});

it('rejects stale resume claims before node recall, observation and planning', async () => {
  resume();
  m(transitionWorkRun).mockResolvedValue(null);
  const p = scripted([done]);
  const result = await runWorkAgent(
    db,
    ctx(),
    {
      request: 'Synthetic answer',
      targetHint: 'healthkr',
      runId: 'g_resume123',
    },
    p.planner,
  );
  expect(result.errorCode).toBe('WORK_AGENT_RESUME_REJECTED');
  expect(executor.issueExperienceRecall).not.toHaveBeenCalled();
  expect(createWorkObservationSession).not.toHaveBeenCalled();
  expect(p.calls).toHaveLength(0);
});

it('retains unopened report/default role on target preparation failure without constructing sessions', async () => {
  m(issueTargetPrepare).mockResolvedValue({
    state: 'needs_user',
    errorCode: 'SYNTHETIC_UNREADY',
  });
  const p = scripted([done]);
  const result = await runWorkAgent(db, ctx(), { request }, p.planner);
  expect(result.report).toMatchObject({
    claim: 'needs_user',
    runOpened: false,
    plannerMode: 'discovery',
  });
  expect(result.report?.memory).toBeUndefined();
  expect(result.resumable).toBe(false);
  expect(executor.issueExperienceRecall).not.toHaveBeenCalled();
  expect(createWorkObservationSession).not.toHaveBeenCalled();
  expect(p.calls).toHaveLength(0);
  expect(trace).toEqual(['experience', 'usage']);
});

it('records assistance best-effort while returning the structured memory/report', async () => {
  m(executor.issueWorkRunAssistanceRecord).mockRejectedValue(
    new Error('Synthetic offline node'),
  );
  const p = scripted([{ ...done, task: 'item.search', userInput: valueInput }]);
  const result = await runWorkAgent(db, ctx(), { request }, p.planner);
  expect(result.report).toMatchObject({
    claim: 'execution_complete',
    memory: { taskKey: 'item.search', verifiedPatterns: [], resumeFrame: null },
  });
  expect(trace).toEqual([
    'terminal_cloud',
    'terminal_local',
    'experience',
    'usage',
  ]);
  expect(logger.warn).toHaveBeenCalledWith(
    'work-agent assistance record failed',
    { code: null },
  );
});

it('restores observation repetition during method discovery and retains its context across a failed planner call only', async () => {
  const methodQuestion = {
    assessment: 'needs_user',
    action: { kind: 'takeover', reason: 'user_judgment_required' },
    ask: { kind: 'menu_location', slots: [] },
  };
  const strong = scripted([
    methodQuestion,
    new Error('Synthetic provider failure'),
    { assessment: 'progress', action: { kind: 'inspect' } },
    done,
  ]);
  const normal = scripted([done]);
  const result = await runWorkAgent(db, ctx(), { request }, normal.planner, {
    strongPlanner: strong.planner,
  });
  expect(strong.calls.map((c) => c.methodDiscovery)).toEqual([
    undefined,
    { attempt: 1, askKind: 'menu_location' },
    { attempt: 1, askKind: 'menu_location' },
    undefined,
  ]);
  expect(contexts['node-a'].restoreSameObservationRun).toHaveBeenCalledWith(1);
  expect(result.report?.claim).toBe('execution_complete');
  expect(normal.calls).toHaveLength(0);
  expect(
    m(logger.info).mock.calls.find((c) => c[0] === 'work-agent run')[1]
      .retryCount,
  ).toBeUndefined();
  expect(
    m(executor.issueWorkRunExperienceRecord).mock.calls[0][2].metric.retryCount,
  ).toBe(1);
});

it('keeps takeover precedence over completed assessment and does not retry credential boundaries', async () => {
  const strong = scripted([
    {
      assessment: 'completed',
      action: { kind: 'takeover', reason: 'credential_required' },
    },
  ]);
  const normal = scripted([done]);
  const result = await runWorkAgent(db, ctx(), { request }, normal.planner, {
    strongPlanner: strong.planner,
  });
  expect(result).toMatchObject({
    resumable: false,
    goal: { status: 'taken_over' },
    report: { claim: 'handed_over' },
  });
  expect(strong.calls).toHaveLength(1);
  expect(normal.calls).toHaveLength(0);
  expect(executor.issueWorkRunContextSave).not.toHaveBeenCalled();
});

it('never promotes a planner completion claim to result-observed evidence', async () => {
  const p = scripted([done]);
  const result = await runWorkAgent(db, ctx(), { request }, p.planner);
  expect(result.report).toMatchObject({
    claim: 'execution_complete',
    runOpened: true,
    resultObserved: false,
    replayVerified: false,
  });
});
