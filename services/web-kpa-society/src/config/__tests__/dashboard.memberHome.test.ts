import { describe, expect, it } from 'vitest';
import { getKpaPostLoginRoute } from '../dashboard';
import type { User } from '../../contexts/AuthContext';

describe('약국 서비스 기본 로그인 화면', () => {
  it.each([[], ['kpa:pharmacist'], ['kpa:store_owner'], ['kpa:store_owner', 'lms:instructor']].map(roles => [roles]))('일반 회원·약국 경영자는 회원 초기화면으로 이동한다: %j', (roles) => {
    expect(getKpaPostLoginRoute({ id: 'synthetic-member', name: '샘플 회원', email: 'fixture@example.test', isStoreOwner: roles.includes('kpa:store_owner'), roles } as User)).toBe('/');
  });
  it.each([
    [['kpa:operator', 'kpa:store_owner'], '/operator'],
    [['kpa:admin', 'kpa:operator'], '/admin'],
    [['platform:super_admin', 'kpa:store_owner'], '/admin'],
  ])('운영 권한 우선순위를 유지한다: %j', (roles, route) => {
    expect(getKpaPostLoginRoute({ id: 'synthetic-member', name: '샘플 회원', email: 'fixture@example.test', isStoreOwner: roles.includes('kpa:store_owner'), roles } as User)).toBe(route);
  });
});
