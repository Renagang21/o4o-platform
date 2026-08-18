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
  memberships: { serviceKey: string; status: string; role?: string }[];
}

/**
 * Freshen user roles and service memberships from DB.
 * Used on every token generation to ensure JWT contains latest state.
 */
export async function freshenUserContext(userId: string): Promise<UserContext> {
  const [roles, memberships] = await Promise.all([
    roleAssignmentService.getRoleNames(userId),
    AppDataSource.query(
      `SELECT service_key AS "serviceKey", status, role FROM service_memberships WHERE user_id = $1`,
      [userId],
    ) as Promise<{ serviceKey: string; status: string; role?: string }[]>,
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
): Promise<{ tokens: AuthTokens; roles: string[]; memberships: { serviceKey: string; status: string; role?: string }[] }> {
  const ctx = await freshenUserContext(user.id);
  const tokens = tokenUtils.generateTokens(user, ctx.roles, domain, ctx.memberships);
  return { tokens, ...ctx };
}

/**
 * WO-O4O-LOGOUT-ALL-TOKEN-INVALIDATION-V1
 *
 * refresh token family 계약:
 *   토큰을 발급하는 **모든 경로**는 발급한 refresh token 의 family 를
 *   users.refreshTokenFamily 에 반드시 기록한다.
 *   기록하지 않으면 (1) 다음 refresh 가 family mismatch 로 도난 처리되거나
 *   (2) family 가 null 인 채로 남아 logout / logout-all 무효화가 무력해진다.
 *
 * users 는 namingStrategy 미적용이라 컬럼명이 quoted camelCase 다.
 */
export async function persistRefreshTokenFamily(
  userId: string,
  refreshToken: string,
): Promise<void> {
  const tokenFamily = tokenUtils.getTokenFamily(refreshToken);
  if (!tokenFamily) return;
  await AppDataSource.query(
    `UPDATE users SET "refreshTokenFamily" = $1 WHERE id = $2`,
    [tokenFamily, userId],
  );
}

/**
 * Inject freshened roles into user public data.
 * Compensates for users.roles column removal (Phase3-E).
 */
export function injectRolesIntoPublicData(
  publicData: Record<string, unknown>,
  roles: string[],
  memberships?: { serviceKey: string; status: string; role?: string }[],
): void {
  publicData.roles = roles;
  publicData.role = (roles[0] as any) || 'user';
  if (memberships) {
    publicData.memberships = memberships;
  }
}
