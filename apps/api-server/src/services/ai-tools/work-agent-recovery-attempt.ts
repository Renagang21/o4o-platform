/** Work Agent recovery budget owner; does not select a planner or dispatch commands. */
import {
  RECOVERY_ERROR, RECOVERY_LIMITS, classifyFailure, decideRecovery, isEscalatable, noteNotRecovered,
  type ClassifyInput, type RecoveryState,
} from './automation-recovery-contract.js';

type RecoveryAttempt =
  | { action: 'escalate'; status: string }
  | { action: 'retry' }
  | { action: 'giveup'; status: string; giveupKind: 'question' | 'takeover' };

/** Mutates only the supplied recovery state, using the existing recovery policy. */
export function decideWorkAgentRecoveryAttempt(
  recovery: RecoveryState,
  input: ClassifyInput,
  hasStrongPlanner: boolean,
  normalSpent = false,
): RecoveryAttempt {
  const failureClass = classifyFailure(input);
  if (normalSpent) {
    recovery.activeClass = failureClass;
    recovery.lastClass = failureClass;
    recovery.normalRetries = RECOVERY_LIMITS.normalRetryMax;
  }
  const decision = decideRecovery(recovery, failureClass);
  if (decision.useStrongModel && hasStrongPlanner) {
    return { action: 'escalate', status: RECOVERY_ERROR.ESCALATED };
  }
  if (!decision.askUser && !normalSpent && hasStrongPlanner) return { action: 'retry' };

  noteNotRecovered(recovery);
  return {
    action: 'giveup',
    status: decision.useStrongModel ? RECOVERY_ERROR.PROVIDER_UNAVAILABLE : RECOVERY_ERROR.USER_HELP_REQUIRED,
    giveupKind: decision.askUser && isEscalatable(failureClass) ? 'question' : 'takeover',
  };
}
