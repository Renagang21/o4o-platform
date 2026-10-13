import {
  createWorkAgentState, fingerprintObservation,
  type WorkObservation, type WorkStepRecord,
} from '../services/ai-tools/work-agent-contract.js';
import { createWorkAgentExecutionState } from '../services/ai-tools/work-agent-execution-state.js';

function fixture() {
  const state = createWorkAgentState({ goalId: 'g_fixture', request: 'Fixture request', status: 'active' }, 'fixture');
  return { state, execution: createWorkAgentExecutionState(state) };
}
function observation(path = '/', docId = 'document-one'): WorkObservation & { snapshotId: string } {
  const elements = [{ elementRef: 'e_1', role: 'button', name: 'Fixture button' }];
  return { siteId: 'fixture', path, docId, ready: true, source: 'webpage', elements,
    elementCount: 1, fingerprint: fingerprintObservation(path, elements), snapshotId: 'snapshot-one' };
}
const actionRecord = (): WorkStepRecord => ({ step: 3, action: { kind: 'click', elementRef: 'e_1' }, status: 'success' });

describe('request-local execution evidence ownership', () => {
  it('full observation counts consecutive identical fingerprints and resets on a changed view', () => {
    const { state, execution } = fixture();
    execution.acceptObservation(observation()); expect(execution.sameObservationRun).toBe(0);
    execution.acceptObservation(observation()); expect(execution.sameObservationRun).toBe(1);
    execution.acceptObservation(observation('/changed')); expect(execution.sameObservationRun).toBe(0);
    expect(state.observation?.path).toBe('/changed');
  });

  it('unchanged unit-end observation preserves progress; visual observation resets it', () => {
    const { execution } = fixture();
    execution.acceptObservation(observation()); execution.acceptObservation(observation());
    execution.acceptObservation(observation('/unit-end'), 'preserve');
    expect(execution.sameObservationRun).toBe(1);
    execution.acceptObservation({ ...observation('window:Fixture'), visualFallback: true, surface: 'uia' }, 'reset');
    expect(execution.sameObservationRun).toBe(0);
  });

  it('find/replay candidates preserve document metadata and progress but replace refs/snapshot/fingerprint', () => {
    const { state, execution } = fixture();
    execution.acceptObservation(observation()); execution.acceptObservation(observation());
    const candidates = [{ elementRef: 'e_2', role: 'link', name: 'Next' }];
    execution.narrowObservation(candidates, 'snapshot-find');
    expect(state.observation).toMatchObject({ path: '/', docId: 'document-one', snapshotId: 'snapshot-find', elements: candidates, elementCount: 1 });
    expect(state.observation?.fingerprint).toBe(fingerprintObservation('/', candidates));
    expect(execution.sameObservationRun).toBe(1);
  });

  it('discovery re-observation restores prior progress without restoring an old observation', () => {
    const { state, execution } = fixture();
    execution.acceptObservation(observation()); execution.acceptObservation(observation());
    const previous = execution.sameObservationRun;
    execution.acceptObservation(observation('/discovery'));
    execution.restoreObservationRun(previous);
    expect(execution.sameObservationRun).toBe(1);
    expect(state.observation?.path).toBe('/discovery');
  });

  it('rejected proposals append history while last result remains the executed action', () => {
    const { state, execution } = fixture(); const record = actionRecord();
    execution.append(record); execution.acceptResult(record);
    const rejected: WorkStepRecord = { step: 3, action: { kind: 'inspect' }, status: 'rejected' };
    execution.append(rejected);
    expect(state.history).toEqual([record, rejected]);
    expect(state.lastResult).toBe(record);
  });

  it('append/result/action metadata retain the exact record identity used by runtime stepMeta', () => {
    const { state, execution } = fixture(); const record = actionRecord();
    execution.beginAction(); expect(execution.lastActRecord).toBeNull();
    execution.append(record); execution.acceptResult(record); execution.rememberAction(record);
    expect(state.history[0]).toBe(record); expect(state.lastResult).toBe(record); expect(execution.lastActRecord).toBe(record);
    execution.beginAction(); expect(execution.lastActRecord).toBeNull();
    expect(state.lastResult).toBe(record);
  });

  it('repeated action counting uses the last result and resets after escalation or a changed proposal', () => {
    const { execution } = fixture(); const record = actionRecord();
    execution.acceptResult(record);
    expect(execution.noteProposedAction(record.action)).toBe(1);
    expect(execution.noteProposedAction(record.action)).toBe(2);
    execution.resetProgress(); expect(execution.noteProposedAction(record.action)).toBe(1);
    expect(execution.noteProposedAction({ kind: 'inspect' })).toBe(0);
  });

  it('separate concurrent runs do not share observations, counters or history', () => {
    const first = fixture(); const second = fixture();
    first.execution.acceptObservation(observation()); first.execution.acceptObservation(observation());
    first.execution.append(actionRecord());
    expect(second.execution.sameObservationRun).toBe(0); expect(second.state.observation).toBeNull(); expect(second.state.history).toEqual([]);
  });
});
