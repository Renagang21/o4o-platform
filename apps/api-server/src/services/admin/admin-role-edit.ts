/**
 * Admin 역할 편집 경계 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 (권한 경계 정리)
 *
 * 원칙: **Admin 은 서비스 운영자만 지정·해제한다.** 그 뒤의 회원 가입 승인 · 회원 역할 ·
 * 개별 분회/커뮤니티 운영자 지정은 그 서비스 운영자가 자기 서비스 화면에서 한다.
 *
 * 종전에는 Admin 의 역할 쓰기 경로 다섯 곳이 서버 allowlist 없이 요청 배열로 역할을
 * **통째로 덮어썼다**(`removeAllRoles` → `assignRole` 반복). 그래서 Admin 에서 일반 회원 역할
 * (`kpa:store_owner` · `kpa-branch:member` 등)이나 개별 분회 운영자 역할을 줄 수 있었고,
 * 반대로 요청 배열에 빠진 서비스 회원 역할은 조용히 지워졌다.
 *
 * 이 모듈의 계약:
 *   - 새로 **추가**할 수 있는 역할은 `ASSIGNABLE_OPERATOR_ROLES`(서비스 범위 운영자)뿐이다.
 *   - 카탈로그 밖 역할(일반 회원 역할 · platform:* · legacy 등)은 **건드리지 않는다** —
 *     요청에 없어도 지우지 않고, 요청에 새로 있으면 거절한다. 기존 역할 데이터는 일괄 삭제하지 않는다.
 *   - 카탈로그 역할만 요청 배열과의 차이로 추가·해제한다.
 */
import type { EntityManager } from 'typeorm';
import { roleAssignmentService } from '../../modules/auth/services/role-assignment.service.js';
import {
  ASSIGNABLE_OPERATOR_ROLES,
  OperatorRoleContractError,
} from '../../config/operator-role-catalog.js';
import { AppDataSource } from '../../database/connection.js';
import {
  canRevokeOwnRole,
  getServiceAdminRoleServiceKey,
  LAST_ADMIN_PROTECTED_CODE,
  lastAdminProtectedMessage,
  revokeServiceAdminRoleWithLock,
  SELF_ROLE_REVOKE_FORBIDDEN_CODE,
  SELF_ROLE_REVOKE_FORBIDDEN_MESSAGE,
} from '../../utils/role-revoke-safety.js';
import { ensureServiceMembershipsForRoles, type MembershipEnsureResult } from './service-membership-ensure.js';

export interface AdminRoleEditPlan {
  add: string[];
  remove: string[];
}

const isCatalogRole = (role: string) => ASSIGNABLE_OPERATOR_ROLES.includes(role);

function normalize(requested: readonly unknown[]): string[] {
  const out: string[] = [];
  for (const r of requested) {
    if (typeof r !== 'string') continue;
    const v = r.trim();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

function reject(roles: string[]): never {
  throw new OperatorRoleContractError(
    'ROLE_NOT_ASSIGNABLE',
    `Admin 에서는 서비스 운영자 역할만 지정할 수 있습니다. 회원 역할과 개별 분회·커뮤니티 운영자는 그 서비스 운영자가 지정합니다: ${roles.join(', ')}`,
  );
}

/** 새로 부여하는 경로(추가 전용) — 요청 역할이 모두 서비스 범위 운영자 역할이어야 한다. */
export function assertAdminAssignableRoles(requested: readonly unknown[]): string[] {
  const roles = normalize(requested);
  const rejected = roles.filter((r) => !isCatalogRole(r));
  if (rejected.length > 0) reject(rejected);
  return roles;
}

/**
 * 편집 경로(요청 배열 = 원하는 역할 목록) — 카탈로그 역할만 차이로 추가·해제한다.
 * 이미 가진 카탈로그 밖 역할은 요청에 있든 없든 그대로 둔다.
 */
export function planAdminRoleEdit(current: readonly string[], requested: readonly unknown[]): AdminRoleEditPlan {
  const want = normalize(requested);
  const have = new Set(current);
  const rejected = want.filter((r) => !isCatalogRole(r) && !have.has(r));
  if (rejected.length > 0) reject(rejected);
  return {
    add: want.filter((r) => isCatalogRole(r) && !have.has(r)),
    remove: [...have].filter((r) => isCatalogRole(r) && !want.includes(r)),
  };
}

export interface AdminRoleEditResult extends AdminRoleEditPlan {
  membership: MembershipEnsureResult | null;
}

/** 요청자 맥락 — 해제 안전장치(자기 해제 · 마지막 admin)를 전용 해제 경로와 같게 적용한다. */
export interface AdminRoleEditRequester {
  id: string | undefined;
  isPlatformSuperAdmin: boolean;
}

/** 편집 경로의 해제가 안전장치에 걸렸다 — 전용 해제 경로(`revokeRoleAssignment`)와 같은 코드 · 403. */
export class AdminRoleEditForbiddenError extends Error {
  readonly statusCode = 403;
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'AdminRoleEditForbiddenError';
  }
}

/**
 * 편집 계획을 적용한다.
 *   - 해제는 `revokeRoleAssignment` 와 같은 안전장치를 거친다: 자기 역할 해제는 `canRevokeOwnRole`,
 *     서비스 admin 해제는 `revokeServiceAdminRoleWithLock`(마지막 admin 보호 · 잠금). 자기 해제 판정은
 *     쓰기 전에 끝내고, 실패할 수 있는 서비스 admin 해제를 먼저 실행한다.
 *   - 추가한 운영자 역할의 서비스 membership 은 없을 때만 active 로 만든다(기존 pending · suspended 불변).
 */
export async function applyAdminRoleEdit(
  userId: string,
  requested: readonly unknown[],
  requester: AdminRoleEditRequester,
  manager?: EntityManager,
): Promise<AdminRoleEditResult> {
  const current = await roleAssignmentService.getRoleNames(userId);
  const plan = planAdminRoleEdit(current, requested);

  if (requester.id === userId) {
    const blocked = plan.remove.filter(
      (role) => !canRevokeOwnRole({ requesterIsPlatformSuperAdmin: requester.isPlatformSuperAdmin, role }),
    );
    if (blocked.length > 0) {
      throw new AdminRoleEditForbiddenError(SELF_ROLE_REVOKE_FORBIDDEN_CODE, SELF_ROLE_REVOKE_FORBIDDEN_MESSAGE);
    }
  }

  const adminRemovals = plan.remove.filter((role) => getServiceAdminRoleServiceKey(role) !== null);
  const otherRemovals = plan.remove.filter((role) => getServiceAdminRoleServiceKey(role) === null);
  for (const role of adminRemovals) {
    const outcome = await revokeServiceAdminRoleWithLock(AppDataSource, userId, role, {
      allowLastAdmin: requester.isPlatformSuperAdmin,
    });
    if (outcome.status === 'last_admin') {
      throw new AdminRoleEditForbiddenError(LAST_ADMIN_PROTECTED_CODE, lastAdminProtectedMessage(role));
    }
  }
  for (const role of otherRemovals) await roleAssignmentService.removeRole(userId, role);
  for (const role of plan.add) await roleAssignmentService.assignRole({ userId, role }, manager);
  const membership = plan.add.length > 0 ? await ensureServiceMembershipsForRoles(userId, plan.add, manager) : null;
  return { ...plan, membership };
}
