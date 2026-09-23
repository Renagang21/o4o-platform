/**
 * 운영자 역할 카탈로그 (Admin UI) — WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §16
 *
 * 종전에는 이 목록이 `OperatorsPage.tsx` 안에만 있었고 서버에는 allowlist 가 없었다.
 * 이제 서버가 `apps/api-server/src/config/operator-role-catalog.ts` 로 스스로 판정하므로,
 * 이 파일은 **그 목록의 화면용 표현**이다. 두 목록이 어긋나면 관리자가 고를 수 있는데
 * 서버가 거절하는 역할이 생기므로, 일치는 테스트(`operator-role-catalog.test.ts`)가 강제한다.
 *
 * 규칙(서버와 동일):
 *   - `platform:*` 은 포함하지 않는다. `platform:super_admin` 부여 기능은 만들지 않는다
 *     (플랫폼 계정은 `/settings/admin-accounts` 소관).
 *   - role prefix → canonical service_key 변환은 `@o4o/security-core` SSOT 에만 위임한다.
 *   - `kpa-branch:operator` 부여는 분회 소속(`branch_memberships`) 지정이 **아니다**.
 */

export interface OperatorRoleOption {
  value: string;
  label: string;
  description: string;
}

/** 서비스(role prefix) → 부여 가능한 역할. 화면 표시 순서가 이 순서다. */
export const ASSIGNABLE_ROLES: Record<string, OperatorRoleOption[]> = {
  kpa: [
    { value: 'kpa:admin', label: 'Admin', description: 'KPA 커뮤니티 관리자' },
    { value: 'kpa:operator', label: 'Operator', description: 'KPA 커뮤니티 운영자' },
  ],
  neture: [
    { value: 'neture:admin', label: 'Admin', description: 'Neture 관리자' },
    { value: 'neture:operator', label: 'Operator', description: 'Neture 운영자' },
  ],
  'pharmacy-hub': [
    { value: 'pharmacy-hub:admin', label: 'Admin', description: 'Pharmacy-Hub 관리자 (운영 권한 포함)' },
    { value: 'pharmacy-hub:operator', label: 'Operator', description: 'Pharmacy-Hub 운영자' },
  ],
  lecture: [
    { value: 'lecture:admin', label: 'Admin', description: 'O4O 강의 서비스 관리자 (운영 권한 포함)' },
    { value: 'lecture:operator', label: 'Operator', description: 'O4O 강의 서비스 운영자' },
  ],
  cosmetics: [
    { value: 'cosmetics:admin', label: 'Admin', description: 'K-Cosmetics 관리자' },
    { value: 'cosmetics:operator', label: 'Operator', description: 'K-Cosmetics 운영자' },
  ],
  'kpa-branch': [
    {
      value: 'kpa-branch:operator',
      label: '분회 운영자',
      description: '약사회 분회 운영자 (대상 분회 소속은 분회 운영자 화면에서 별도 지정)',
    },
  ],
};

/** 부여 가능한 role 전체 — 서버 `ASSIGNABLE_OPERATOR_ROLES` 와 같은 순서·같은 집합이어야 한다. */
export const ASSIGNABLE_ROLE_VALUES: readonly string[] = Object.values(ASSIGNABLE_ROLES).flatMap((rs) =>
  rs.map((r) => r.value),
);

/** 등록 카탈로그에 존재하는 role 집합 (편집 시 비카탈로그 role 보존 판정용) */
export const CATALOG_ROLE_VALUES: ReadonlySet<string> = new Set(ASSIGNABLE_ROLE_VALUES);

export const REGISTRABLE_SERVICE_KEYS: readonly string[] = Object.keys(ASSIGNABLE_ROLES);

export function findRoleOption(role: string): OperatorRoleOption | undefined {
  return ASSIGNABLE_ROLE_VALUES.includes(role)
    ? Object.values(ASSIGNABLE_ROLES).flat().find((r) => r.value === role)
    : undefined;
}
