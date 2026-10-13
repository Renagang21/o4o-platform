import { createRecoveryState, RECOVERY_ERROR, RECOVERY_LIMITS } from '../services/ai-tools/automation-recovery-contract.js';
import { decideWorkAgentRecoveryAttempt } from '../services/ai-tools/work-agent-recovery-attempt.js';

describe('Work Agent recovery budget projection', () => {
  it('retries normally, escalates only within the strong budget, then asks a question', () => {
    const state = createRecoveryState();
    for (let i = 0; i < RECOVERY_LIMITS.normalRetryMax; i++) {
      expect(decideWorkAgentRecoveryAttempt(state, { plannerFault: true }, true)).toEqual({ action: 'retry' });
    }
    for (let i = 0; i < RECOVERY_LIMITS.strongModelMax; i++) {
      expect(decideWorkAgentRecoveryAttempt(state, { plannerFault: true }, true)).toEqual({ action: 'escalate', status: RECOVERY_ERROR.ESCALATED });
    }
    expect(decideWorkAgentRecoveryAttempt(state, { plannerFault: true }, true)).toEqual({
      action: 'giveup', status: RECOVERY_ERROR.USER_HELP_REQUIRED, giveupKind: 'question',
    });
    expect(state.result).toBe('not_recovered');
  });

  it('normalSpent enters the strong tier immediately without resetting the failed class', () => {
    const state = createRecoveryState();
    expect(decideWorkAgentRecoveryAttempt(state, { noProgress: true }, true, true)).toEqual({ action: 'escalate', status: RECOVERY_ERROR.ESCALATED });
    expect(state.normalRetries).toBe(RECOVERY_LIMITS.normalRetryMax);
    expect(state.strongRetries).toBe(1);
  });

  it('absent strong planner cannot produce retry or escalation', () => {
    const state = createRecoveryState();
    expect(decideWorkAgentRecoveryAttempt(state, { plannerFault: true }, false)).toMatchObject({ action: 'giveup', giveupKind: 'takeover' });
    expect(decideWorkAgentRecoveryAttempt(state, { plannerFault: true }, false, true)).toEqual({
      action: 'giveup', status: RECOVERY_ERROR.PROVIDER_UNAVAILABLE, giveupKind: 'takeover',
    });
  });

  it('a new escalatable failure class restarts its normal budget', () => {
    const state = createRecoveryState();
    decideWorkAgentRecoveryAttempt(state, { plannerFault: true }, true, true);
    expect(decideWorkAgentRecoveryAttempt(state, { noProgress: true }, true)).toEqual({ action: 'retry' });
    expect(state.normalRetries).toBe(1);
    expect(state.strongRetries).toBe(0);
  });

  it('commit risk bypasses both retry tiers and ends as takeover', () => {
    const state = createRecoveryState();
    expect(decideWorkAgentRecoveryAttempt(state, { riskCommit: true }, true)).toEqual({
      action: 'giveup', status: RECOVERY_ERROR.USER_HELP_REQUIRED, giveupKind: 'takeover',
    });
    expect(state.normalRetries).toBe(0);
    expect(state.strongRetries).toBe(0);
  });

  it('independent executions do not share failure counters', () => {
    const first = createRecoveryState();
    const second = createRecoveryState();
    decideWorkAgentRecoveryAttempt(first, { plannerFault: true }, true, true);
    expect(second).toEqual(createRecoveryState());
  });
});
