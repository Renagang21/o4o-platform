/**
 * Pharmacy-Hub Scope Guard — 역할 계층 고정 테스트
 *
 * WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1
 *
 * 계약 (KPA / Neture / K-Cosmetics 와 동일한 표준 계층):
 *   admin       요구 → admin 만
 *   operator    요구 → operator 또는 admin
 *   store_owner 요구 → store_owner 만   (admin 이 사업자 신분을 대신하지 않는다)
 *   supplier    요구 → supplier 만       (동일)
 *
 * PHARMACY_HUB_SCOPE_CONFIG 는 security-core(F1 Freeze) 가 아니라 api-server 로컬에 있으므로
 * scope-guard.spec.ts(3서비스 config) 와 분리한 별도 파일로 둔다.
 *
 * 여기서는 **scope guard 단독**을 검증한다. 실 라우터는
 * requireAuth → createMembershipScopeGuard(= membership active 검사 + 본 guard) 순이며,
 * membership 축은 별도 테스트가 담당한다.
 */

import {
  createServiceScopeGuard,
  KPA_SCOPE_CONFIG,
  NETURE_SCOPE_CONFIG,
  GLYCOPHARM_SCOPE_CONFIG,
  COSMETICS_SCOPE_CONFIG,
} from '@o4o/security-core';
import { PHARMACY_HUB_SCOPE_CONFIG } from '../../middleware/pharmacy-hub-scope.middleware';
import { createMockUser, executeGuard } from './test-utils';

const requireScope = createServiceScopeGuard(PHARMACY_HUB_SCOPE_CONFIG);

const ADMIN = 'pharmacy-hub:admin';
const OPERATOR = 'pharmacy-hub:operator';
const STORE_OWNER = 'pharmacy-hub:store_owner';
const SUPPLIER = 'pharmacy-hub:supplier';

async function check(scope: string, roles: string[]) {
  return executeGuard(requireScope(scope), createMockUser({ roles }));
}

describe('Pharmacy-Hub Scope Guard', () => {
  describe('unauthenticated', () => {
    it('returns 401 when no user', async () => {
      const result = await executeGuard(requireScope(ADMIN));
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(401);
    });
  });

  describe('scope hierarchy (admin ⊃ operator)', () => {
    it('admin role → passes operator scope', async () => {
      expect((await check(OPERATOR, [ADMIN])).allowed).toBe(true);
    });

    it('operator role → passes operator scope', async () => {
      expect((await check(OPERATOR, [OPERATOR])).allowed).toBe(true);
    });

    it('admin role → passes admin scope', async () => {
      expect((await check(ADMIN, [ADMIN])).allowed).toBe(true);
    });

    it('operator role → denied for admin scope (403)', async () => {
      const result = await check(ADMIN, [OPERATOR]);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });
  });

  describe('admin 은 사업자 신분 역할을 대신하지 않는다', () => {
    it('admin role → denied for store_owner scope (403)', async () => {
      const result = await check(STORE_OWNER, [ADMIN]);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });

    it('admin role → denied for supplier scope (403)', async () => {
      const result = await check(SUPPLIER, [ADMIN]);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });
  });

  // Foundation WO 계약 — admin 도입으로 바뀌지 않아야 하는 회귀 케이스
  describe('기존 3역할 회귀 없음', () => {
    it('store_owner role → passes store_owner scope', async () => {
      expect((await check(STORE_OWNER, [STORE_OWNER])).allowed).toBe(true);
    });

    it('supplier role → passes supplier scope', async () => {
      expect((await check(SUPPLIER, [SUPPLIER])).allowed).toBe(true);
    });

    it('store_owner role → denied for operator scope (403)', async () => {
      const result = await check(OPERATOR, [STORE_OWNER]);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });

    it('supplier role → denied for operator scope (403)', async () => {
      const result = await check(OPERATOR, [SUPPLIER]);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });

    it('operator role → denied for store_owner scope (403)', async () => {
      const result = await check(STORE_OWNER, [OPERATOR]);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });
  });

  describe('타 서비스 역할 · platform bypass', () => {
    it.each(['kpa:admin', 'neture:admin', 'glycopharm:admin', 'cosmetics:admin'])(
      '%s → denied for pharmacy-hub:admin scope (403)',
      async (role) => {
        const result = await check(ADMIN, [role]);
        expect(result.allowed).toBe(false);
        expect(result.statusCode).toBe(403);
      },
    );

    it('platform:super_admin → allowed (platformBypass=true, 기존 설정 유지)', async () => {
      expect((await check(ADMIN, ['platform:super_admin'])).allowed).toBe(true);
    });

    it('unknown role → denied (default deny)', async () => {
      const result = await check(ADMIN, ['pharmacy-hub:unknown']);
      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(403);
    });
  });

  // 프로덕션 smoke 로는 격리 검증이 불가능한 축이다 —
  // 실제 Admin 계정(sohae2100)은 타 서비스 admin 역할도 **원래부터** 보유하기 때문에
  // "pharmacy-hub:admin 이 타 서비스를 열지 않는다" 를 브라우저로 분리 관측할 수 없다.
  // 따라서 이 방향은 자동 테스트가 유일한 보존 장치다.
  describe('pharmacy-hub:admin 은 타 서비스 scope 를 열지 않는다', () => {
    const OTHERS: Array<[string, Parameters<typeof createServiceScopeGuard>[0]]> = [
      ['kpa', KPA_SCOPE_CONFIG],
      ['neture', NETURE_SCOPE_CONFIG],
      ['glycopharm', GLYCOPHARM_SCOPE_CONFIG],
      ['cosmetics', COSMETICS_SCOPE_CONFIG],
    ];

    it.each(OTHERS)('%s 의 admin · operator scope 모두 403', async (service, config) => {
      const guard = createServiceScopeGuard(config);
      for (const scope of [`${service}:admin`, `${service}:operator`]) {
        const result = await executeGuard(guard(scope), createMockUser({ roles: [ADMIN] }));
        expect(result.allowed).toBe(false);
        expect(result.statusCode).toBe(403);
      }
    });
  });

  describe('config 계약', () => {
    it('allowedRoles 는 4역할이다', () => {
      expect(PHARMACY_HUB_SCOPE_CONFIG.allowedRoles).toEqual([
        ADMIN,
        OPERATOR,
        STORE_OWNER,
        SUPPLIER,
      ]);
    });

    it('scopeRoleMapping 이 모든 scope 에 명시돼 있다 (fallback 의존 금지)', () => {
      // mapping 이 비면 allowedRoles 전체가 허용되어 계층이 무너진다.
      // (GlycoPharm 이 그 상태였고 WO-O4O-GLYCOPHARM-AUTHORIZATION-HIERARCHY-AUDIT-AND-FIX-V1
      //  에서 해소됐다 — 이제 5개 서비스 모두 mapping 을 명시한다.)
      const mapping = PHARMACY_HUB_SCOPE_CONFIG.scopeRoleMapping ?? {};
      expect(Object.keys(mapping).sort()).toEqual([ADMIN, OPERATOR, STORE_OWNER, SUPPLIER].sort());
      expect(mapping[OPERATOR]).toEqual([OPERATOR, ADMIN]);
      expect(mapping[ADMIN]).toEqual([ADMIN]);
      expect(mapping[STORE_OWNER]).toEqual([STORE_OWNER]);
      expect(mapping[SUPPLIER]).toEqual([SUPPLIER]);
    });
  });
});
