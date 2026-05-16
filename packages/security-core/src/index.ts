/**
 * FROZEN CORE PACKAGE
 * Baseline: o4o-operator-os-baseline-v1
 * Structural changes require explicit Work Order.
 *
 * @o4o/security-core
 *
 * Platform Security Core Package
 *
 * Provides unified security guard infrastructure for all O4O services.
 * Each service uses the same guard factory with service-specific configuration.
 *
 * Usage:
 *   import { createServiceScopeGuard, KPA_SCOPE_CONFIG } from '@o4o/security-core';
 *
 *   const requireKpaScope = createServiceScopeGuard(KPA_SCOPE_CONFIG);
 *   router.get('/admin', authenticate, requireKpaScope('kpa:admin'), handler);
 */

// Core guard factory
export { createServiceScopeGuard } from './service-scope-guard.js';

// Pre-built service configurations
export {
  KPA_SCOPE_CONFIG,
  NETURE_SCOPE_CONFIG,
  PLATFORM_SCOPE_CONFIG,
  GLYCOPHARM_SCOPE_CONFIG,
  COSMETICS_SCOPE_CONFIG,
} from './service-configs.js';

// WO-O4O-BACKFILL-MIGRATION-CANONICAL-KEY-CONSISTENCY-V1:
// canonical role prefix → service_memberships.service_key SSOT
export {
  ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY,
  resolveCanonicalServiceKey,
} from './service-configs.js';

// WO-O4O-CANONICAL-SERVICE-KEY-REVERSE-MAP-V1:
// reverse: service_memberships.service_key → role prefix (derived SSOT)
export {
  CANONICAL_SERVICE_KEY_TO_ROLE_PREFIX,
  resolveRolePrefixFromCanonicalServiceKey,
} from './service-configs.js';

// Types
export type {
  ServiceKey,
  PrefixedRole,
  ServiceScopeGuardConfig,
  SecurityUser,
} from './types.js';
