/**
 * Market Trial Types - Re-exports
 *
 * @package market-trial
 */

export type { TrialOutcomeSnapshot, MarketTrialDTO } from './MarketTrial.types.js';

export {
  JOINABLE_STATUSES,
  CLOSED_STATUSES,
  TRIAL_STATUS_LABELS,
  TrialStatus,
} from './MarketTrial.types.js';

// WO-NETURE-MARKET-TRIAL-PAYMENT-READINESS-V1
export {
  PaymentStatus,
  VALID_PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_MANUAL_TRANSFER,
  PAYMENT_PROVIDER_INTERNAL,
  isPaymentStatus,
} from './PaymentStatus.js';
