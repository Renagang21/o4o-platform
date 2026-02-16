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
} from './service-configs.js';

// Types
export type {
  ServiceKey,
  PrefixedRole,
  ServiceScopeGuardConfig,
  SecurityUser,
} from './types.js';
