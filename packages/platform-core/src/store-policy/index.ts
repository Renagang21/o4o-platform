/**
 * Store Policy Module
 *
 * WO-CORE-STORE-POLICY-SYSTEM-V1
 * WO-CORE-STORE-PAYMENT-CONFIG-V1
 *
 * Platform-wide store policy & payment config management.
 * Version-tracked legal/operational policies and PG credentials per store.
 */

// Policy Entities
export {
  PlatformStorePolicy,
  type StorePolicyServiceKey,
} from './entities/index.js';

// Payment Config Entity
export {
  PlatformStorePaymentConfig,
  type PaymentProvider,
  type PaymentMode,
  type PaymentConfigServiceKey,
} from './entities/index.js';

// Policy Service
export {
  StorePolicyService,
  type UpdatePolicyInput,
} from './services/store-policy.service.js';

// Payment Config Service
export {
  PaymentConfigService,
  type UpsertPaymentConfigInput,
} from './services/payment-config.service.js';
