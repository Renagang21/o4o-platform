/**
 * Neture Service Scope Guard Middleware
 *
 * Powered by @o4o/security-core
 * Replaces inline implementation with shared security-core guard factory.
 * Behavior is identical: scope-level role mapping, platform bypass, legacy detect+deny.
 */

import { createServiceScopeGuard, NETURE_SCOPE_CONFIG } from '@o4o/security-core';

export const requireNetureScope = createServiceScopeGuard(NETURE_SCOPE_CONFIG);
