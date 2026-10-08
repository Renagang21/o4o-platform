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
): Promise<{ tokens: AuthTokens; roles: string[]; memberships: { serviceKey: string; status: string; role?: string }[] }> {
  const ctx = await freshenUserContext(user.id);
  // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8: 어느 서비스에서 로그인했는지와 그
  //   서비스의 현재 **세대**를 refresh token 에 남긴다. 서비스가 없으면 세대도 없다.
  //   세대를 새기지 않으면 로그아웃 뒤 재로그인한 토큰이 "배포 전 토큰" 으로 취급돼 거절된다.
  const sessionEpoch = await readServiceSessionEpoch(user.id, serviceKey);

  // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §8 (3차 리뷰): **살아 있는 family 를 승계한다.**
  //
  //   `users.refreshTokenFamily` 는 사용자당 **한 칸**이다. 로그인마다 새 family 를 만들면 그
  //   칸이 교체되고, 다른 서비스(또는 다른 기기)의 refresh token 은 다음 갱신에서 family
  //   불일치가 되며 **그 처리가 family 를 비워** 모든 세션이 연쇄로 죽는다. 그래서 한 서비스에
  //   재로그인하는 것만으로 다른 서비스 세션이 끊겼다(시나리오 5).
  //
  //   handoff 는 이미 같은 이유로 승계한다. family = "이 사용자의 살아 있는 세션 계보" 이고,
  //   **서비스 단위 종료는 세대(session_epoch)가 담당**하므로 family 를 회전시킬 필요가 없다.
  //   logout-all 은 family 를 비우므로 그 뒤 로그인은 새 family 를 만든다(승계할 것이 없다).
  //
  //   ⚠ 되돌리기 어려운 trade-off: 재로그인이 family 를 회전시키지 않으므로, 탈취된 refresh
  //   token 은 재로그인만으로는 무효화되지 않는다. 대응 경로는 `logout-all` 이다.
  const reuseFamily = user.refreshTokenFamily ?? null;

  const tokens = tokenUtils.generateTokens(
    user,
    ctx.roles,
    domain,
    ctx.memberships,
    reuseFamily,
    serviceKey,
    sessionEpoch,
    // WO-O4O-EMAIL-PASSWORD-AUTH-INTRODUCTION-V1 §2-4: Google 경로는 넘기지 않는다(claim 부재).
    authMethod ?? null,
  );
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
  // WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1 §7-B: compatibility 필드 · 결정적 값(정렬 사본). 인가는 publicData.roles 로 한다.
  publicData.role = compatPrimaryRole(roles) as any;
  if (memberships) {
    publicData.memberships = memberships;
  }
}
