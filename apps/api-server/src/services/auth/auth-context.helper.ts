import { randomUUID } from 'node:crypto';
import { getNetureMainMembershipStatus } from '../../modules/neture/services/neture-main-membership.js';
import { AppDataSource } from '../../database/connection.js';
import { compatPrimaryRole } from '../../utils/compat-primary-role.js';
import { readServiceSessionEpoch } from './service-session-epoch.js';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import * as tokenUtils from '../../utils/token.utils.js';
import type { User } from '../../entities/User.js';
import type { AuthTokens, SessionAuthMethod } from '../../types/auth.js';

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

/** Main membership is a read projection of email/account eligibility, never a ledger write. */
export async function readUserMembershipsWithMainAccess(userId: string): Promise<UserContext['memberships']> {
  const [memberships, mainStatus] = await Promise.all([
    AppDataSource.query(`SELECT service_key AS "serviceKey", status, role FROM service_memberships WHERE user_id = $1`, [userId]) as Promise<UserContext['memberships']>,
    getNetureMainMembershipStatus(AppDataSource, userId),
  ]);
  const services = memberships.filter((membership) => membership.serviceKey !== 'neture');
  if (mainStatus !== 'none') services.push({ serviceKey: 'neture', status: mainStatus, role: 'member' });
  return services;
}

/**
 * Freshen user roles and service memberships from DB.
 * Used on every token generation to ensure JWT contains latest state.
 */
export async function freshenUserContext(userId: string): Promise<UserContext> {
  const [roles, memberships] = await Promise.all([
    roleAssignmentService.getRoleNames(userId),
    readUserMembershipsWithMainAccess(userId),
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
  serviceKey?: string | null,
  authMethod?: SessionAuthMethod | null,
  context?: UserContext,
): Promise<{ tokens: AuthTokens; roles: string[]; memberships: { serviceKey: string; status: string; role?: string }[] }> {
  const ctx = context ?? await freshenUserContext(user.id);
  // Legacy epoch is emitted for compatibility; browser ID now determines ordinary logout.
  const sessionEpoch = await readServiceSessionEpoch(user.id, serviceKey);
  // Compare-and-set prevents a login authenticated before a password change from
  // overwriting the new account security generation. Each login receives a new browser ID.
  const capturedFamily = user.refreshTokenFamily ?? null;
  const result = await AppDataSource.query(
    `UPDATE users SET "refreshTokenFamily" = COALESCE("refreshTokenFamily", $1)
     WHERE id = $2 AND "refreshTokenFamily" IS NOT DISTINCT FROM $3
     RETURNING "refreshTokenFamily"`,
    [randomUUID(), user.id, capturedFamily],
  );
  const rows = Array.isArray(result[0]) ? result[0] : result;
  const reuseFamily: string | undefined = rows[0]?.refreshTokenFamily;
  if (!reuseFamily) throw Object.assign(new Error('세션이 변경되었습니다. 다시 로그인해 주세요.'), { code: 'SESSION_CHANGED_RETRY_LOGIN', statusCode: 409 });

  const tokens = tokenUtils.generateTokens(
    user,
    ctx.roles,
    domain,
    ctx.memberships,
    reuseFamily,
    serviceKey ?? 'neture',
    sessionEpoch,
    // Preserve the issuer's verified authentication method; never infer it from linked accounts.
    authMethod ?? null,
  );
  return { tokens, ...ctx };
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
  // WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1 §7-B: compatibility 필드 · 결정적 값(정렬 사본). 인가는 publicData.roles 로 한다.
  publicData.role = compatPrimaryRole(roles) as any;
  if (memberships) {
    publicData.memberships = memberships;
  }
}
