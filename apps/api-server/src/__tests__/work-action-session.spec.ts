jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn() },
}));
import { createWorkActionSession } from '../services/ai-tools/work-action-session.js';
import { createWorkAgentState } from '../services/ai-tools/work-agent-contract.js';
import { LOCAL_AGENT_ERROR as E } from '../services/local-agent/local-agent-protocol.js';
function harness(surface: 'dom' | 'uia' = 'uia') {
  const state = createWorkAgentState(
    { goalId: 'synthetic', request: 'Synthetic task', status: 'active' },
    'synthetic',
  );
  const stepMeta = new WeakMap(),
    trajectory: any[] = [],
    setRejectReason = jest.fn();
  const fail = {
    status: 'failed',
    errorCode: E.WINDOWS_AUTOMATION_TARGET_UNCERTAIN,
    safe: { safety: { reason: 'SYNTHETIC_SAFETY' } },
  };
  const observationSession = {
    dom: jest.fn(),
    uia: jest.fn().mockResolvedValue(fail),
    computer: jest.fn(),
    isVisualFallback: () => false,
    enterVisualFallback: jest.fn().mockResolvedValue({ ok: true }),
  };
  const session = createWorkActionSession({
    state,
    surface,
    observationSession,
    stepMeta,
    trajectory,
    currentActor: () => 'deterministic',
    setRejectReason,
  });
  return {
    session,
    state,
    stepMeta,
    trajectory,
    observationSession,
    setRejectReason,
  };
}
it('isolates repeated safety rejection counts, history and feedback between two requests', async () => {
  const a = harness(),
    b = harness();
  const act = { kind: 'click' as const, elementRef: 'synthetic-ref' };
  expect(await a.session.execute(act, 'snapshot-a')).toEqual({
    do: 'observe',
    navigated: false,
  });
  expect(await b.session.execute(act, 'snapshot-b')).toEqual({
    do: 'observe',
    navigated: false,
  });
  expect(await a.session.execute(act, 'snapshot-a')).toEqual({
    do: 'takeover',
    reason: 'target_identity_uncertain',
    progress: 'needs_user',
  });
  expect(a.state.history).toHaveLength(2);
  expect(b.state.history).toHaveLength(1);
  expect(a.state.history).not.toBe(b.state.history);
  expect(b.session.safetyReason()).toBe('SYNTHETIC_SAFETY');
  expect(b.setRejectReason).toHaveBeenCalledTimes(1);
  expect(b.setRejectReason).toHaveBeenCalledWith('SAFETY_REJECT');
});
it('resets only this request visual failure count after successful fallback entry', async () => {
  const a = harness(),
    b = harness();
  for (const h of [a, b])
    h.observationSession.computer.mockResolvedValue({
      status: 'failed',
      safe: {},
    });
  const act = { kind: 'visual_type' as const, text: 'Synthetic text' };
  expect((await a.session.execute(act, '')).do).toBe('observe');
  await a.session.enterVisualFallback();
  expect((await a.session.execute(act, '')).do).toBe('observe');
  expect(await a.session.execute(act, '')).toEqual({
    do: 'takeover',
    reason: 'vision_uncertain',
    progress: 'needs_user',
  });
  expect((await b.session.execute(act, '')).do).toBe('observe');
});
it('records an already-executed unit result without sending any action again', async () => {
  const h = harness('dom');
  h.state.observation = {
    siteId: 'synthetic',
    path: '/synthetic',
    ready: true,
    elements: [
      { elementRef: 'synthetic-ref', role: 'button', name: 'Synthetic menu' },
    ],
    elementCount: 1,
    source: 'webpage',
    fingerprint: 'synthetic',
  };
  expect(
    await h.session.execute(
      { kind: 'click', elementRef: 'synthetic-ref' },
      'snapshot',
      { status: 'success', safe: { changed: true } },
    ),
  ).toEqual({ do: 'observe', navigated: false });
  expect(h.observationSession.dom).not.toHaveBeenCalled();
  expect(h.observationSession.uia).not.toHaveBeenCalled();
  expect(h.observationSession.computer).not.toHaveBeenCalled();
  expect(h.state.stepCount).toBe(1);
  expect(h.state.history).toHaveLength(1);
  expect(h.session.lastRecord()).toBe(h.state.lastResult);
  expect(h.stepMeta.get(h.state.lastResult!)).toMatchObject({
    actor: 'deterministic',
    locator: { role: 'button' },
  });
  expect(h.trajectory).toHaveLength(1);
});
it('keeps the submit window guard ahead of dispatch and recording', async () => {
  const h = harness();
  h.state.observation = {
    siteId: 'synthetic',
    path: 'window:Other window',
    ready: true,
    elements: [],
    elementCount: 0,
    source: 'app_window',
    fingerprint: 'synthetic',
  };
  expect(
    await h.session.execute({ kind: 'key', key: 'ENTER' }, 'snapshot'),
  ).toEqual({ do: 'reject', reason: 'WINDOW_NOT_NAMED_IN_GOAL' });
  expect(h.observationSession.uia).not.toHaveBeenCalled();
  expect(h.state.history).toEqual([]);
  expect(h.state.stepCount).toBe(0);
});
