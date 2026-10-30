import { withCentralOperationMenus } from './central-operation-menu.middleware.js';
/**
 * Neture Service Scope Guard Middleware
 *
 * Powered by @o4o/security-core
 * Replaces inline implementation with shared security-core guard factory.
 * Behavior is identical: scope-level role mapping, platform bypass, legacy detect+deny.
 */

import { NETURE_SCOPE_CONFIG } from '@o4o/security-core';
import { PHARMACY_COLLABORATOR_ROLES } from '@o4o/types';
import { createMembershipScopeGuard } from '../common/middleware/membership-guard.middleware.js';

export const requireNetureScope = withCentralOperationMenus('neture', createMembershipScopeGuard(NETURE_SCOPE_CONFIG));

/** Only business routes opt into these roles; Neture-wide guards stay unchanged. */
export const requireNetureBusinessScope = createMembershipScopeGuard({
  ...NETURE_SCOPE_CONFIG,
  allowedRoles: [...NETURE_SCOPE_CONFIG.allowedRoles, ...PHARMACY_COLLABORATOR_ROLES],
  scopeRoleMapping: { "neture:business_operator": ["neture:admin", "neture:operator", ...PHARMACY_COLLABORATOR_ROLES] },
})("neture:business_operator");
