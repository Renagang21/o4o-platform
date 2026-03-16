/**
 * GlycoPharm Service Scope Guard Middleware
 *
 * WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1
 *
 * Powered by @o4o/security-core
 * Replaces inline implementation with shared security-core guard factory.
 * Behavior: membership check + glycopharm roles, platform bypass, cross-service deny.
 */

import { GLYCOPHARM_SCOPE_CONFIG } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../common/middleware/membership-guard.middleware.js';

export const requireGlycopharmScope = createMembershipScopeGuard(GLYCOPHARM_SCOPE_CONFIG);
