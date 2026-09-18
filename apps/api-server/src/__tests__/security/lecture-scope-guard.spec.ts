import {
  createServiceScopeGuard,
  KPA_SCOPE_CONFIG,
  NETURE_SCOPE_CONFIG,
  COSMETICS_SCOPE_CONFIG,
} from '@o4o/security-core';
import { LECTURE_SCOPE_CONFIG } from '../../middleware/lecture-scope.middleware';
import { createMockUser, executeGuard } from './test-utils';

const requireScope = createServiceScopeGuard(LECTURE_SCOPE_CONFIG);
const ADMIN = 'lecture:admin';
const OPERATOR = 'lecture:operator';
const INSTRUCTOR = 'lecture:instructor';

async function check(scope: string, roles: string[]) {
  return executeGuard(requireScope(scope), createMockUser({ roles }));
}

describe('Lecture Scope Guard', () => {
  it('admin ⊃ operator', async () => {
    expect((await check(OPERATOR, [ADMIN])).allowed).toBe(true);
    expect((await check(OPERATOR, [OPERATOR])).allowed).toBe(true);
    expect((await check(ADMIN, [ADMIN])).allowed).toBe(true);
    expect((await check(ADMIN, [OPERATOR])).allowed).toBe(false);
  });

  it('instructor는 운영 계층과 분리된다', async () => {
    expect((await check(INSTRUCTOR, [INSTRUCTOR])).allowed).toBe(true);
    expect((await check(INSTRUCTOR, [ADMIN])).allowed).toBe(false);
    expect((await check(INSTRUCTOR, [OPERATOR])).allowed).toBe(false);
    expect((await check(OPERATOR, [INSTRUCTOR])).allowed).toBe(false);
  });

  it('타 서비스 역할은 Lecture scope를 열지 않는다', async () => {
    for (const role of ['kpa:admin', 'neture:admin', 'cosmetics:admin', 'pharmacy-hub:admin', 'lms:instructor']) {
      expect((await check(ADMIN, [role])).allowed).toBe(false);
      expect((await check(OPERATOR, [role])).allowed).toBe(false);
      expect((await check(INSTRUCTOR, [role])).allowed).toBe(false);
    }
  });

  it('Lecture 역할은 기존 서비스 scope를 열지 않는다', async () => {
    for (const [service, config] of [
      ['kpa', KPA_SCOPE_CONFIG],
      ['neture', NETURE_SCOPE_CONFIG],
      ['cosmetics', COSMETICS_SCOPE_CONFIG],
    ] as const) {
      const guard = createServiceScopeGuard(config);
      for (const scope of [`${service}:admin`, `${service}:operator`]) {
        expect((await executeGuard(guard(scope), createMockUser({ roles: [ADMIN] }))).allowed).toBe(false);
      }
    }
  });

  it('lecture:member가 없고 모든 capability mapping이 명시돼 있다', () => {
    expect(LECTURE_SCOPE_CONFIG.allowedRoles).toEqual([ADMIN, OPERATOR, INSTRUCTOR]);
    expect(LECTURE_SCOPE_CONFIG.allowedRoles).not.toContain('lecture:member');
    expect(Object.keys(LECTURE_SCOPE_CONFIG.scopeRoleMapping ?? {}).sort())
      .toEqual([ADMIN, OPERATOR, INSTRUCTOR].sort());
  });

  it('platform:super_admin break-glass bypass는 유지한다', async () => {
    expect((await check(ADMIN, ['platform:super_admin'])).allowed).toBe(true);
  });
});
