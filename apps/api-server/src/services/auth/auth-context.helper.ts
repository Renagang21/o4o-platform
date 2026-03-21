import { AppDataSource } from '../../database/connection.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import * as tokenUtils from '../../utils/token.utils.js';
import type { User } from '../../entities/User.js';
import type { AuthTokens } from '../../types/auth.js';

/**
 * Shared auth context helper
 *
 * Eliminates 5x duplicated role/membership freshening pattern
 * across login (email, OAuth 3 paths) and token refresh.
 *
 * Extracted from AuthenticationService (WO-O4O-AUTHENTICATION-SERVICE-SPLIT-V1).
 */

export interface UserContext {
  roles: string[];
  memberships: { serviceKey: string; status: string }[];
}

/**
 * Freshen user roles and service memberships from DB.
 * Used on every token generation to ensure JWT contains latest state.
 */
export async function freshenUserContext(userId: string): Promise<UserContext> {
  const [roles, memberships] = await Promise.all([
    roleAssignmentService.getRoleNames(userId),
    AppDataSource.query(
      `SELECT service_key AS "serviceKey", status FROM service_memberships WHERE user_id = $1`,
      [userId],
    ) as Promise<{ serviceKey: string; status: string }[]>,
  ]);
  return { roles, memberships };
}

/**
 * Generate tokens with freshened roles and memberships.
 * Returns tokens plus context for response injection.
 */
export async function generateTokensWithContext(
  user: User,
  domain: string = 'neture.co.kr',
): Promise<{ tokens: AuthTokens; roles: string[]; memberships: { serviceKey: string; status: string }[] }> {
  const ctx = await freshenUserContext(user.id);
  const tokens = tokenUtils.generateTokens(user, ctx.roles, domain, ctx.memberships);
  return { tokens, ...ctx };
}

/**
 * Inject freshened roles into user public data.
 * Compensates for users.roles column removal (Phase3-E).
 */
export function injectRolesIntoPublicData(
  publicData: Record<string, unknown>,
  roles: string[],
  memberships?: { serviceKey: string; status: string }[],
): void {
  publicData.roles = roles;
  publicData.role = (roles[0] as any) || 'user';
  if (memberships) {
    publicData.memberships = memberships;
  }
}
