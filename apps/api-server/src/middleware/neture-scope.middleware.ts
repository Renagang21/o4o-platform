/**
 * Neture Service Scope Guard Middleware
 *
 * Powered by @o4o/security-core
 * Replaces inline implementation with shared security-core guard factory.
 * Behavior is identical: scope-level role mapping, platform bypass, legacy detect+deny.
 */

import { NETURE_SCOPE_CONFIG } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../common/middleware/membership-guard.middleware.js';

export const requireNetureScope = createMembershipScopeGuard(NETURE_SCOPE_CONFIG);
