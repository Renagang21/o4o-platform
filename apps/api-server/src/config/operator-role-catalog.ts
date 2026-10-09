/**
 * 운영자 역할 카탈로그 — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §16
 *
 * 운영 권한 부여(직접 지정 · 초대) 대상이 되는 role 의 **서버 allowlist** 다.
 * 종전에는 이 목록이 admin-dashboard `OperatorsPage.ASSIGNABLE_ROLES` 에만 있어서
 * 서버가 임의 role 문자열을 그대로 받았다. 부여 계약이 Identity 계약이 된 이상
 * 서버가 스스로 판정해야 한다(프런트 신뢰 금지).
 *
 * 규칙:
 *   - `platform:*` 은 절대 포함하지 않는다. `platform:super_admin` 신규 부여 기능은 만들지 않는다.
 *   - role prefix → `service_memberships.service_key` 변환은 `@o4o/security-core` SSOT
 *     (`resolveCanonicalServiceKey`) 에만 위임한다. 로컬 매핑 상수를 만들지 않는다.
 *   - Admin 은 **서비스 범위 운영자만** 지정한다. 개별 분회 운영자(`kpa-branch:operator`)와 개별
 *     커뮤니티 운영자(`community_memberships.role`)는 여기 없다 — 그 서비스 관리자가 자기 서비스에서 지정한다.
 *   - 프런트 카탈로그와의 일치는 테스트(`operator-role-catalog.test.ts`)가 강제한다.
 */
import { resolveCanonicalServiceKey } from '@o4o/security-core';

/** 부여 가능한 운영 role 전체 (service prefix 순). */
export const ASSIGNABLE_OPERATOR_ROLES: readonly string[] = Object.freeze([
  'kpa:admin',
  'kpa:operator',
  'neture:admin',
  'neture:operator',
  'pharmacy-hub:admin',
  'pharmacy-hub:operator',
  'lecture:admin',
  'lecture:operator',
  'cosmetics:admin',
  'cosmetics:operator',
  // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1: 분회 서비스 전체 관리자. 개별 분회 운영자와 분리된 상위 권한이다.
  //   분회 개설 승인 주체 — operator 급으로 열면 A 분회 운영자가 B 분회 개설을 승인할 수 있다.
  'kpa-branch:admin',
  // `kpa-branch:operator`(개별 분회 운영자)는 **여기서 부여하지 않는다** — 대상 분회는 branch_memberships 로
  //   정해지는 개체 운영자이고, 지정·해제는 분회 서비스 관리자(kpa-branch:admin)가 분회 서비스 화면에서 한다
  //   (`/kpa-branch/admin/branches/:branchId/operators`). Admin 은 서비스 범위 운영자만 지정한다.
  // 서비스 전체 admin/operator와 개별 community_memberships 역할은 별도 축이다.
  'community:admin',
  'community:operator',
  // WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §4 — 서브도메인 전체 운영자 범위 분리.
  //   종전에는 neture:admin / neture:operator 하나가 supplier · funding 영역까지 열었다.
  //   공급자 **사업자 본인**의 접근은 이 축이 아니라 organization_members 다(FROZEN §7, 불변).
  'supplier:admin',
  'supplier:operator',
  'funding:admin',
  'funding:operator',
]);

export type OperatorRoleRejectCode =
  | 'ROLE_NOT_ASSIGNABLE'
  | 'SERVICE_KEY_MISMATCH'
  | 'SERVICE_KEY_REQUIRED';

export interface OperatorRoleResolution {
  /** canonical `service_memberships.service_key` */
  serviceKey: string;
  role: string;
}

export class OperatorRoleContractError extends Error {
  readonly statusCode = 400;
  constructor(readonly code: OperatorRoleRejectCode, message: string) {
    super(message);
    this.name = 'OperatorRoleContractError';
  }
}

/**
 * (role, serviceKey) 조합 확정.
 *
 * - allowlist 밖 role → `ROLE_NOT_ASSIGNABLE` (platform:super_admin · 무접두 legacy 포함)
 * - role prefix 에서 파생한 canonical key 와 요청 serviceKey 가 다르면 `SERVICE_KEY_MISMATCH`
 * - serviceKey 는 필수다(관리자가 고르지 않은 서비스로 부여되는 것을 막는다).
 */
export function resolveOperatorRole(role: unknown, serviceKey: unknown): OperatorRoleResolution {
  const roleValue = typeof role === 'string' ? role.trim() : '';
  if (!ASSIGNABLE_OPERATOR_ROLES.includes(roleValue)) {
    throw new OperatorRoleContractError(
      'ROLE_NOT_ASSIGNABLE',
      `부여할 수 없는 역할입니다: ${roleValue || '(없음)'}`,
    );
  }
  const requested = typeof serviceKey === 'string' ? serviceKey.trim() : '';
  if (!requested) {
    throw new OperatorRoleContractError('SERVICE_KEY_REQUIRED', '대상 서비스를 지정해야 합니다.');
  }
  const derived = resolveCanonicalServiceKey(roleValue.split(':')[0]);
  if (requested !== derived) {
    throw new OperatorRoleContractError(
      'SERVICE_KEY_MISMATCH',
      `요청한 서비스(${requested})와 역할의 서비스(${derived})가 일치하지 않습니다.`,
    );
  }
  return { serviceKey: derived, role: roleValue };
}
