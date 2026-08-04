/**
 * WO-O4O-ADMIN-PROTECTED-ROUTE-ROLE-PERMISSION-SEMANTICS-V1
 *
 * `AdminProtectedRoute` 의 접근 판정(`@o4o/auth-context` 의 `adminRouteAccess`)을 고정한다.
 *
 * 이 테스트는 **프런트 방어선의 의미**를 지킨다. 백엔드 guard 가 최종 방어선이지만,
 * 프런트에서 `requiredRoles` 선언이 조용히 무력화되면 화면 노출 범위가 선언과 달라진다.
 *
 * `@o4o/auth-context` 는 자체 테스트 인프라가 없으므로(소비처는 admin-dashboard 단독)
 * 소스 경로를 직접 import 한다. React·react-router 의존이 없는 순수 모듈이라 렌더링이 필요 없다.
 */

import { describe, it, expect } from 'vitest';
import {
  expandRequiredRoles,
  matchesRequiredRole,
  collectUserRoles,
  hasRequiredRoles,
  hasRequiredPermissions,
} from '../../../../packages/auth-context/src/adminRouteAccess';

describe('adminRouteAccess — 요구 역할 확장', () => {
  it('admin 은 super_admin·operator·platform:* 을 함께 허용한다 (기존 계층 규칙 유지)', () => {
    const expanded = expandRequiredRoles(['admin']);
    expect(expanded).toEqual(
      expect.arrayContaining(['admin', 'super_admin', 'operator', 'platform:admin', 'platform:super_admin']),
    );
  });

  it('super_admin 은 platform:super_admin 을 허용하되 admin 계층을 새로 열지 않는다', () => {
    const expanded = expandRequiredRoles(['super_admin']);
    expect(expanded).toContain('platform:super_admin');
    expect(expanded).not.toContain('operator');
  });

  it('비관리자 요구 역할은 확장하지 않는다', () => {
    expect(expandRequiredRoles(['seller'])).toEqual(['seller']);
  });
});

describe('adminRouteAccess — 서비스 접두 역할 (핵심 수정)', () => {
  it('관리자 화면에서는 서비스 접두 관리자급 역할을 계속 받아준다 (회귀 방지 — 잠김 없음)', () => {
    for (const role of ['kpa:admin', 'neture:operator', 'cosmetics:admin']) {
      expect(matchesRequiredRole(role, ['admin'])).toBe(true);
      expect(matchesRequiredRole(role, ['admin', 'super_admin'])).toBe(true);
      expect(matchesRequiredRole(role, ['admin', 'super_admin', 'operator'])).toBe(true);
    }
  });

  it('비관리자 전용 화면에는 서비스 접두 관리자 역할이 들어오지 못한다 (수정 대상 결함)', () => {
    expect(matchesRequiredRole('kpa:admin', ['seller'])).toBe(false);
    expect(matchesRequiredRole('kpa:admin', ['supplier'])).toBe(false);
    expect(matchesRequiredRole('neture:operator', ['partner', 'affiliate', 'seller', 'supplier'])).toBe(false);
  });

  it('요구 집합에 관리자급이 하나라도 있으면 서비스 접두 역할을 받아준다', () => {
    expect(matchesRequiredRole('kpa:admin', ['seller', 'admin'])).toBe(true);
  });

  it('관리자급이 아닌 서비스 접두 역할은 관리자 화면에서도 통과하지 않는다', () => {
    expect(matchesRequiredRole('kpa:member', ['admin'])).toBe(false);
    expect(matchesRequiredRole('neture:supplier', ['admin'])).toBe(false);
  });

  it('정확히 일치하는 역할은 요구 집합 성격과 무관하게 통과한다', () => {
    expect(matchesRequiredRole('seller', ['seller'])).toBe(true);
    expect(matchesRequiredRole('supplier', ['supplier', 'admin'])).toBe(true);
  });
});

describe('adminRouteAccess — 역할 수집 (세 출처 하위 호환)', () => {
  it('user.role / user.activeRole.name / user.roles[] 를 모두 읽는다', () => {
    const user = {
      role: 'admin',
      activeRole: { name: 'operator' },
      roles: ['seller', { name: 'kpa:admin' }],
    };
    expect(collectUserRoles(user)).toEqual(['admin', 'operator', 'seller', 'kpa:admin']);
  });

  it('역할 정보가 없거나 형태가 깨져도 예외 없이 빈 배열을 돌려준다', () => {
    expect(collectUserRoles(null)).toEqual([]);
    expect(collectUserRoles({})).toEqual([]);
    expect(collectUserRoles({ role: 42, roles: 'admin' })).toEqual([]);
  });

  it('roles 배열의 한 항목만 만족해도 통과한다', () => {
    expect(hasRequiredRoles({ roles: ['seller', 'admin'] }, ['admin'])).toBe(true);
    expect(hasRequiredRoles({ roles: ['seller'] }, ['admin'])).toBe(false);
  });
});

describe('adminRouteAccess — permission 판정', () => {
  it('user.permissions 가 없으면 관리자 역할 게이트로 대체한다 (현재 백엔드가 permission 을 공급하지 않음)', () => {
    expect(hasRequiredPermissions({ role: 'admin' }, ['users:write'])).toBe(true);
    expect(hasRequiredPermissions({ role: 'kpa:admin' }, ['users:write'])).toBe(true);
    expect(hasRequiredPermissions({ role: 'seller' }, ['users:write'])).toBe(false);
  });

  it('user.permissions 가 채워지면 선언된 permission 을 실제로 요구한다', () => {
    const user = { role: 'admin', permissions: ['users:read'] };
    expect(hasRequiredPermissions(user, ['users:read'])).toBe(true);
    expect(hasRequiredPermissions(user, ['users:write'])).toBe(false);
    expect(hasRequiredPermissions(user, ['users:read', 'users:write'])).toBe(false);
  });

  it('빈 permissions 배열은 "데이터 없음"으로 보고 역할 게이트로 되돌아간다 (기존 사용자 잠김 방지)', () => {
    expect(hasRequiredPermissions({ role: 'admin', permissions: [] }, ['users:write'])).toBe(true);
  });
});
