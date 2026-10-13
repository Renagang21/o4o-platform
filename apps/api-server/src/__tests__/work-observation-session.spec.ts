const mockDom = jest.fn(),
  mockUnit = jest.fn(),
  mockUia = jest.fn(),
  mockCapture = jest.fn(),
  mockComputer = jest.fn();
jest.mock('../services/ai-tools/browser-dom-executor.js', () => ({
  issueDomCommand: (...args: unknown[]) => mockDom(...args),
  issueDomUnitCommand: (...args: unknown[]) => mockUnit(...args),
}));
jest.mock('../services/ai-tools/windows-uia-executor.js', () => ({
  issueUiaCommand: (...args: unknown[]) => mockUia(...args),
}));
jest.mock('../services/ai-tools/windows-computer-executor.js', () => ({
  issueComputerCapture: (...args: unknown[]) => mockCapture(...args),
  issueComputerAction: (...args: unknown[]) => mockComputer(...args),
}));
import {
  createWorkObservationSession,
  createWorkRunMeasurements,
} from '../services/ai-tools/work-observation-session.js';
import {
  createWorkAgentState,
  WORK_AGENT_ERROR,
  WORK_LOOP_LIMITS,
  type WorkSurface,
} from '../services/ai-tools/work-agent-contract.js';
import {
  LOCAL_AGENT_ACTIONS as A,
  LOCAL_AGENT_ERROR as E,
} from '../services/local-agent/local-agent-protocol.js';
import { AI_TOOL_NAMES } from '../services/ai-tools/ai-tool-contract.js';

beforeEach(() => {
  jest.resetAllMocks();
});
afterEach(() => {
  jest.useRealTimers();
});
const success = (safe: Record<string, unknown>) => ({
  status: 'success',
  safe,
});
function harness(
  deviceId = 'node-a',
  unit = false,
  surface: WorkSurface = 'dom',
) {
  const state = createWorkAgentState(
    { goalId: 'goal-' + deviceId, request: 'Synthetic task', status: 'active' },
    'healthkr',
  );
  const measurements = createWorkRunMeasurements(),
    ctx = { userId: 'actor-' + deviceId, workspace: 'home' };
  const session = createWorkObservationSession({
    dataSource: {} as any,
    ctx,
    deviceId,
    executionNode: { id: deviceId, capabilities: { taskUnit: unit } } as any,
    tool: AI_TOOL_NAMES.WORK_AGENT_PERFORM,
    siteId: 'healthkr',
    surface,
    state,
    measurements,
  });
  return { session, state, measurements, ctx };
}
function observation(name: string) {
  return {
    path: '/' + name,
    docId: 'doc-' + name,
    snapshotId: 'snapshot-' + name,
    elements: [{ elementRef: 'ref-' + name, role: 'button', name }],
  };
}

it('keeps concurrent requests on their selected actor/node with independent observations and counters', async () => {
  let first!: (value: unknown) => void;
  mockDom.mockImplementation(async (_ds, _ctx, deviceId, _tool, action) => {
    if (action === A.DOM_GET_CONTEXT && deviceId === 'node-a')
      return new Promise((resolve) => {
        first = resolve;
      });
    if (action === A.DOM_GET_CONTEXT)
      return success({
        ready: true,
        siteId: 'healthkr',
        path: '/second',
        docId: 'doc-second',
      });
    return success({
      elements: observation(deviceId).elements,
      snapshotId: 'snapshot-' + deviceId,
    });
  });
  const a = harness('node-a'),
    b = harness('node-b');
  const pendingA = a.session.observe();
  await expect(b.session.observe()).resolves.toEqual({ ok: true });
  expect(a.state.observation).toBeNull();
  expect(a.state.stepCount).toBe(1);
  expect(b.state.observation?.path).toBe('/second');
  expect(b.state.stepCount).toBe(2);
  first(
    success({
      ready: true,
      siteId: 'healthkr',
      path: '/first',
      docId: 'doc-first',
    }),
  );
  await expect(pendingA).resolves.toEqual({ ok: true });
  expect(a.state.observation?.path).toBe('/first');
  expect(b.state.observation?.path).toBe('/second');
  for (const h of [a, b]) {
    expect(h.measurements).toMatchObject({
      roundTrips: 2,
      unitDispatches: 0,
      retryCount: 0,
    });
    const deviceCalls = mockDom.mock.calls.filter(
      (args) => args[2] === h.ctx.userId.replace('actor-', ''),
    );
    expect(deviceCalls).toHaveLength(2);
    for (const call of deviceCalls) expect(call[1]).toBe(h.ctx);
  }
});
it.each(['denied', 'failed'])(
  'unit %s disables only that request and does not resend an action',
  async (status) => {
    mockUnit.mockResolvedValueOnce({
      status,
      errorCode: 'synthetic-error',
      safe: {},
    });
    const a = harness('node-a', true),
      b = harness('node-b', true);
    const result = await a.session.runUnit(
      [{ op: 'act', kind: 'click', elementRef: 'ref', snapshotId: 'snapshot' }],
      { observe: true },
    );
    expect(result.kind).toBe(status === 'denied' ? 'denied' : 'lost');
    expect(a.session.unitCapable()).toBe(false);
    expect(b.session.unitCapable()).toBe(true);
    expect(a.measurements).toMatchObject({ roundTrips: 1, unitDispatches: 1 });
    expect(b.measurements).toMatchObject({ roundTrips: 0, unitDispatches: 0 });
    expect(a.state.stepCount).toBe(0);
    expect(mockDom).not.toHaveBeenCalled();
    expect(mockUnit).toHaveBeenCalledTimes(1);
  },
);
it('uses live budget/docId and preserves the no-progress count when unchanged unit observations are excluded', () => {
  const h = harness();
  h.session.applyDomObservation(observation('same'));
  expect(h.state.stepCount).toBe(2);
  expect(h.session.sameObservationRun()).toBe(0);
  h.session.applyDomObservation(observation('same'));
  expect(h.session.sameObservationRun()).toBe(1);
  h.session.applyDomObservation(observation('different'), false);
  expect(h.session.sameObservationRun()).toBe(1);
  expect(h.state.observation?.docId).toBe('doc-different');
  expect(h.state.stepCount).toBe(6);
  h.session.resetSameObservationRun();
  expect(h.session.sameObservationRun()).toBe(0);
  h.session.restoreSameObservationRun(1);
  expect(h.session.sameObservationRun()).toBe(1);
  h.state.stepCount = WORK_LOOP_LIMITS.maxSteps;
  expect(h.session.budgetLeft()).toBe(0);
});
it('does not dispatch after observation budget exhaustion or an explicitly different site', async () => {
  const exhausted = harness();
  exhausted.state.stepCount = WORK_LOOP_LIMITS.maxSteps - 1;
  await expect(exhausted.session.observe()).resolves.toEqual({
    ok: false,
    errorCode: WORK_AGENT_ERROR.LOOP_LIMIT,
  });
  expect(mockDom).not.toHaveBeenCalled();
  const other = harness();
  mockDom.mockResolvedValueOnce(success({ ready: true, siteId: 'other-site' }));
  await expect(other.session.observe()).resolves.toEqual({
    ok: false,
    errorCode: E.DOM_CROSS_ORIGIN_BLOCKED,
  });
  expect(mockDom).toHaveBeenCalledTimes(1);
  expect(other.state.observation).toBeNull();
});
it('refunds loading/old-document probes while retaining their transport and retry counts', async () => {
  jest.useFakeTimers();
  const h = harness();
  h.session.applyDomObservation(observation('old'));
  mockDom
    .mockResolvedValueOnce({
      status: 'failed',
      errorCode: E.DOM_CONTENT_UNAVAILABLE,
      safe: {},
    })
    .mockResolvedValueOnce(
      success({ ready: true, siteId: 'healthkr', docId: 'doc-old' }),
    )
    .mockResolvedValueOnce(
      success({
        ready: true,
        siteId: 'healthkr',
        path: '/new',
        docId: 'doc-new',
      }),
    )
    .mockResolvedValueOnce(
      success({
        elements: observation('new').elements,
        snapshotId: 'snapshot-new',
      }),
    );
  const pending = h.session.observe({ afterNavigation: true });
  await jest.runAllTimersAsync();
  await expect(pending).resolves.toEqual({ ok: true });
  expect(h.state.stepCount).toBe(4);
  expect(h.state.observation?.docId).toBe('doc-new');
  expect(h.measurements).toMatchObject({
    roundTrips: 4,
    retryCount: 2,
    settleMs: 1400,
  });
});
it('keeps valid context cost when only inspect is unavailable, rather than changing the historical refund rule', async () => {
  jest.useFakeTimers();
  const h = harness();
  mockDom
    .mockResolvedValueOnce(success({ ready: true, siteId: 'healthkr' }))
    .mockResolvedValueOnce({
      status: 'failed',
      errorCode: E.DOM_CONTENT_UNAVAILABLE,
      safe: {},
    })
    .mockResolvedValueOnce(
      success({ ready: true, siteId: 'healthkr', path: '/ready' }),
    )
    .mockResolvedValueOnce(success({ elements: [] }));
  const pending = h.session.observe();
  await jest.runAllTimersAsync();
  await expect(pending).resolves.toEqual({ ok: true });
  expect(h.state.stepCount).toBe(3);
  expect(h.measurements).toMatchObject({ roundTrips: 4, retryCount: 1 });
});
it('keeps capture bytes private per request and out of state, measurements and serialized session objects', async () => {
  mockUia.mockResolvedValue(success({ elements: [], windows: [] }));
  mockCapture.mockImplementation(async (_ds, _ctx, deviceId) => ({
    status: 'success',
    image: { base64: 'synthetic-bytes-' + deviceId },
  }));
  const a = harness('node-a', false, 'uia'),
    b = harness('node-b', false, 'uia');
  await a.session.observe();
  await b.session.observe();
  await a.session.enterVisualFallback();
  await b.session.enterVisualFallback();
  expect(a.session.plannerImage()?.base64).toBe('synthetic-bytes-node-a');
  expect(b.session.plannerImage()?.base64).toBe('synthetic-bytes-node-b');
  for (const h of [a, b]) {
    expect(h.state.stepCount).toBe(2);
    expect(h.measurements.roundTrips).toBe(1);
    expect(h.session.isVisualFallback()).toBe(true);
    expect(h.state.observation?.visualFallback).toBe(true);
    expect(
      JSON.stringify({
        session: h.session,
        state: h.state,
        measurements: h.measurements,
      }),
    ).not.toContain('synthetic-bytes');
  }
  const dom = harness();
  await expect(dom.session.enterVisualFallback()).resolves.toEqual({
    ok: false,
  });
});
it('retains UIA observation and the last capture when a visual refresh fails, matching the existing runtime behavior', async () => {
  mockUia.mockResolvedValue(success({ elements: [], windows: [] }));
  mockCapture
    .mockResolvedValueOnce({
      status: 'success',
      image: { base64: 'synthetic-last-image' },
    })
    .mockResolvedValueOnce({
      status: 'failed',
      errorCode: 'CAPTURE_UNAVAILABLE',
    });
  const h = harness('node-a', false, 'uia');
  await h.session.observe();
  await h.session.enterVisualFallback();
  await expect(h.session.observe()).resolves.toEqual({ ok: true });
  expect(h.session.plannerImage()?.base64).toBe('synthetic-last-image');
  expect(h.session.sameObservationRun()).toBe(0);
});
