/**
 * K-Cosmetics Service Scope Guard Middleware
 *
 * WO-O4O-OPERATOR-API-ARCHITECTURE-UNIFICATION-V1
 *
 * Powered by @o4o/security-core
 * Replaces inline implementation with shared security-core guard factory.
 * Behavior: membership check + cosmetics roles, platform bypass, cross-service deny.
 */

import { COSMETICS_SCOPE_CONFIG } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../common/middleware/membership-guard.middleware.js';

export const requireCosmeticsScope = createMembershipScopeGuard(COSMETICS_SCOPE_CONFIG);
