/**
 * 계정/권한 표시 계약
 *   WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1 §18
 *
 * 고정하는 것
 *   18-1 role 배열 **순서가 어떻게 바뀌어도** Admin 표시가 같다 (permutation 불변).
 *   18-2 표시 helper 는 **인가에 쓰이지 않는다** — 권한 판정 함수와 결과가 독립이다.
 *   18-3 `users.email` 은 프로필 이메일이며 **로그인 계정으로 표기되지 않는다.**
 */
import { describe, it, expect } from 'vitest';
import {
  ADMIN_SURFACE_ROLE,
  LOGIN_METHOD_LABEL,
  buildAccountDisplayInfo,
  resolveAdminRoleLabel,
} from '../accountDisplay';
import { hasRequiredRoles } from '../adminRouteAccess';

/** 운영 관리자의 실제 보유 role 11종 (2026-09-24 census). */
const ADMIN_ROLES = [
  'cosmetics:admin',
  'cosmetics:operator',
  'kpa:admin',
  'kpa-branch:operator',
  'kpa:operator',
  'kpa:store_owner',
  'neture:admin',
  'neture:operator',
  'pharmacy-hub:admin',
  'pharmacy-hub:operator',
  'platform:super_admin',
];

/** 결정성 시험용 — 순환 이동으로 순서만 바꾼 배열들. */
const rotations = (arr: string[]): string[][] =>
  arr.map((_, i) => [...arr.slice(i), ...arr.slice(0, i)]);

describe('18-1. 대표 권한 표시는 배열 순서에 의존하지 않는다', () => {
  it('platform:super_admin 을 가지면 순서와 무관하게 "최고 관리자"', () => {
    for (const roles of rotations(ADMIN_ROLES)) {
      expect(resolveAdminRoleLabel(roles)).toBe('최고 관리자');
    }
    // 역순 · 정렬본도 같다
    expect(resolveAdminRoleLabel([...ADMIN_ROLES].reverse())).toBe('최고 관리자');
    expect(resolveAdminRoleLabel([...ADMIN_ROLES].sort())).toBe('최고 관리자');
  });

  it('첫 원소가 무엇이든 결과가 같다 — 사고 재현(첫 원소 kpa-branch:operator)', () => {
    const incidentOrder = ['kpa-branch:operator', ...ADMIN_ROLES.filter((r) => r !== 'kpa-branch:operator')];
    expect(incidentOrder[0]).toBe('kpa-branch:operator');
    // 사고 당시 화면은 이 첫 원소를 "역할" 로 찍었다. 이제는 보유 여부로 판정한다.
    expect(resolveAdminRoleLabel(incidentOrder)).toBe('최고 관리자');
  });

  it('super_admin 이 없으면 대표 역할을 지어내지 않는다 (null)', () => {
    expect(resolveAdminRoleLabel(['kpa:operator', 'neture:operator'])).toBeNull();
    expect(resolveAdminRoleLabel([])).toBeNull();
    expect(resolveAdminRoleLabel(undefined)).toBeNull();
  });
});

describe('18-2. 표시 helper 는 인가가 아니다', () => {
  it('인가 판정은 표시 helper 와 독립이다', () => {
    const operatorOnly = { roles: ['kpa:operator'] };
    // 표시: 대표 역할 없음
    expect(resolveAdminRoleLabel(operatorOnly.roles)).toBeNull();
    // 인가: 기존 계약 그대로 — platform:super_admin 요구 화면은 거부
    expect(hasRequiredRoles(operatorOnly, [ADMIN_SURFACE_ROLE])).toBe(false);

    const superAdmin = { roles: ADMIN_ROLES };
    expect(hasRequiredRoles(superAdmin, [ADMIN_SURFACE_ROLE])).toBe(true);
    // 인가 결과도 순서에 의존하지 않는다
    for (const roles of rotations(ADMIN_ROLES)) {
      expect(hasRequiredRoles({ roles }, [ADMIN_SURFACE_ROLE])).toBe(true);
    }
  });
});

describe('18-3. 로그인 수단과 프로필 이메일은 다른 값이다', () => {
  it('email 은 profileEmail 로만 나오고 loginMethod 는 Google 고정이다', () => {
    const info = buildAccountDisplayInfo({ email: 'someone@example.test', roles: ADMIN_ROLES });
    expect(info.loginMethod).toBe(LOGIN_METHOD_LABEL);
    expect(info.loginMethod).toBe('Google');
    expect(info.profileEmail).toBe('someone@example.test');
    expect(info.adminRole).toBe('최고 관리자');
    // email 이 로그인 수단 자리에 새어 들어가지 않는다
    expect(info.loginMethod).not.toContain('@');
  });

  it('email 이 없으면 null 이다 (빈 문자열을 표시하지 않는다)', () => {
    expect(buildAccountDisplayInfo({ roles: [] }).profileEmail).toBeNull();
    expect(buildAccountDisplayInfo({ email: '', roles: [] }).profileEmail).toBeNull();
    expect(buildAccountDisplayInfo(null).profileEmail).toBeNull();
  });

  it('roles 가 문자열 배열이 아니어도 깨지지 않는다', () => {
    expect(buildAccountDisplayInfo({ roles: 'not-an-array' }).adminRole).toBeNull();
    expect(buildAccountDisplayInfo({ roles: [1, 2, ADMIN_SURFACE_ROLE] }).adminRole).toBe('최고 관리자');
  });
});
