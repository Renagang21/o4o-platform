/**
 * WO-O4O-ROLE-ASSIGNMENT-CONTRACT-CONSISTENCY-AUDIT-AND-HARDENING-V1 (2)
 *
 * `isAdminTierRoleName` — 카탈로그(`roles.is_admin_role` / `role_key`) 판정을 보강하는
 * 이름 문자열 규칙을 고정한다. 부여·회수 대상 문자열은 바꾸지 않고 판정만 강화한다.
 */

import { isAdminTierRoleName, isServiceAdminRole } from '../role-revoke-safety.js';

describe('isAdminTierRoleName — operator/admin tier 이름 규칙', () => {
  it.each([
    'admin',
    'operator',
    'super_admin',
    'neture:admin',
    'neture:operator',
    'kpa:admin',
    'kpa:operator',
    'platform:admin',
    'platform:operator',
    'platform:super_admin',
    'pharmacy-hub:admin',
  ])('tier 역할로 판정한다: %s', (role) => {
    expect(isAdminTierRoleName(role)).toBe(true);
  });

  it.each([
    'supplier',
    'partner',
    'customer',
    'member',
    'user',
    'pharmacy',
    'store_owner',
    'neture:supplier',
    'kpa:store_owner',
    'lms:instructor',
  ])('tier 역할이 아니다: %s', (role) => {
    expect(isAdminTierRoleName(role)).toBe(false);
  });

  it('`_admin` 접미사 역할은 tier 판정에서 제외한다(카탈로그 isAdminRole 담당)', () => {
    expect(isAdminTierRoleName('kpa:district_admin')).toBe(false);
    expect(isAdminTierRoleName('kpa:branch_admin')).toBe(false);
  });

  it('대소문자·공백에 흔들리지 않는다', () => {
    expect(isAdminTierRoleName('  Neture:Admin ')).toBe(true);
    expect(isAdminTierRoleName('OPERATOR')).toBe(true);
  });

  it('문자열이 아니거나 비어 있으면 false', () => {
    expect(isAdminTierRoleName(undefined)).toBe(false);
    expect(isAdminTierRoleName(null)).toBe(false);
    expect(isAdminTierRoleName(123)).toBe(false);
    expect(isAdminTierRoleName('')).toBe(false);
    expect(isAdminTierRoleName('   ')).toBe(false);
  });

  it('서비스 admin 판정(isServiceAdminRole)보다 넓다 — 둘을 혼동하지 않는다', () => {
    // 서비스 admin 은 마지막 admin 보호 대상 판정, tier 는 부여·회수 권한 판정이다.
    expect(isServiceAdminRole('neture:operator')).toBe(false);
    expect(isAdminTierRoleName('neture:operator')).toBe(true);
    expect(isServiceAdminRole('platform:super_admin')).toBe(false);
    expect(isAdminTierRoleName('platform:super_admin')).toBe(true);
  });
});
