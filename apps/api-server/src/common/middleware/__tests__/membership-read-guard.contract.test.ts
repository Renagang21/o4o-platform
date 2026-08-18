/**
 * WO-O4O-SERVICE-MEMBERSHIP-UPSERT-STATUS-PRESERVATION-V1 — read/guard 축 회귀 테스트
 *
 * write 축(AdminUserController.ensureServiceMemberships)이 status 를 보존하더라도,
 * read/guard 가 non-active membership 을 통과시키면 결함은 그대로다.
 * 본 파일은 backend 진입 guard 의 **read 계약**을 고정한다.
 *
 *   active     → 허용
 *   pending    → 차단
 *   suspended  → 차단
 *   rejected   → 차단
 *   withdrawn  → 차단
 *   membership 없음 → 차단
 *
 * 대상:
 *   1) createMembershipScopeGuard  (common/middleware/membership-guard.middleware.ts)
 *      — 모든 서비스 scope guard(kpa / neture / glycopharm / cosmetics /
 *        pharmacy-hub / kpa-branch / lms / service-legal)가 이 팩토리를 쓴다.
 *   2) createRequireStoreOwner     (utils/store-owner.utils.ts) — 매장 진입 guard
 *      · serviceKey 지정 경로 (서비스 단위 판정)
 *      · back-compat 경로 (서비스 중립 — active membership 최소 1개)
 */

import type { ServiceScopeGuardConfig } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../membership-guard.middleware.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';

const NON_ACTIVE_STATUSES = ['pending', 'suspended', 'rejected', 'withdrawn'] as const;

const TEST_SCOPE_CONFIG: ServiceScopeGuardConfig = {
  serviceKey: 'pharmacy-hub',
  allowedRoles: ['pharmacy-hub:store_owner'],
  platformBypass: true,
  legacyRoles: [],
  blockedServicePrefixes: [],
  scopeRoleMapping: {
    'pharmacy-hub:store_owner': ['pharmacy-hub:store_owner'],
  },
};

function makeRes() {
  const res: any = {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

function makeReq(user: unknown) {
  return { user } as any;
}

describe('WO-O4O-SERVICE-MEMBERSHIP-UPSERT-STATUS-PRESERVATION-V1 — read/guard 계약', () => {
  describe('createMembershipScopeGuard — 서비스 scope 진입', () => {
    const guard = createMembershipScopeGuard(TEST_SCOPE_CONFIG)('pharmacy-hub:store_owner');

    it('active membership + 역할 보유 → 통과', () => {
      const req = makeReq({
        id: 'u1',
        roles: ['pharmacy-hub:store_owner'],
        memberships: [{ serviceKey: 'pharmacy-hub', status: 'active' }],
      });
      const res = makeRes();
      const next = jest.fn();

      guard(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(0);
    });

    it.each(NON_ACTIVE_STATUSES)(
      '%s membership + 역할 보유 → 403 MEMBERSHIP_NOT_ACTIVE',
      (status) => {
        const req = makeReq({
          id: 'u1',
          roles: ['pharmacy-hub:store_owner'],
          memberships: [{ serviceKey: 'pharmacy-hub', status }],
        });
        const res = makeRes();
        const next = jest.fn();

        guard(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
        expect(res.body.code).toBe('MEMBERSHIP_NOT_ACTIVE');
      },
    );

    it('membership 없음 + 역할 보유 → 403 MEMBERSHIP_NOT_FOUND (role 단독 통과 금지)', () => {
      const req = makeReq({ id: 'u1', roles: ['pharmacy-hub:store_owner'], memberships: [] });
      const res = makeRes();
      const next = jest.fn();

      guard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('MEMBERSHIP_NOT_FOUND');
    });

    it('미인증 → 401', () => {
      const res = makeRes();
      const next = jest.fn();

      guard(makeReq(undefined), res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
    });

    it('platformBypass=false 서비스는 super_admin 도 non-active membership 으로 통과하지 못한다', () => {
      const strictGuard = createMembershipScopeGuard({
        ...TEST_SCOPE_CONFIG,
        platformBypass: false,
      })('pharmacy-hub:store_owner');
      const req = makeReq({
        id: 'u1',
        roles: ['platform:super_admin'],
        memberships: [{ serviceKey: 'pharmacy-hub', status: 'suspended' }],
      });
      const res = makeRes();
      const next = jest.fn();

      strictGuard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('MEMBERSHIP_NOT_ACTIVE');
    });
  });

  describe('createRequireStoreOwner — 매장 진입 (serviceKey 지정)', () => {
    // non-active 는 DB 조회 이전에 차단되어야 한다 → dataSource 가 호출되면 실패한다.
    const failingDataSource: any = {
      query: jest.fn(async () => {
        throw new Error('DB 를 조회하면 안 된다 — membership 단계에서 차단되어야 한다');
      }),
    };

    beforeEach(() => failingDataSource.query.mockClear());

    it.each(NON_ACTIVE_STATUSES)(
      '%s membership → 403 MEMBERSHIP_NOT_ACTIVE (role 조회 이전 차단)',
      async (status) => {
        const guard = createRequireStoreOwner(failingDataSource, 'pharmacy-hub');
        const req = makeReq({
          id: 'u1',
          roles: ['pharmacy-hub:store_owner'],
          memberships: [{ serviceKey: 'pharmacy-hub', status }],
        });
        const res = makeRes();
        const next = jest.fn();

        await guard(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
        expect(res.body.code).toBe('MEMBERSHIP_NOT_ACTIVE');
        expect(failingDataSource.query).not.toHaveBeenCalled();
      },
    );

    it('다른 서비스의 active membership 으로는 통과하지 못한다', async () => {
      const guard = createRequireStoreOwner(failingDataSource, 'pharmacy-hub');
      const req = makeReq({
        id: 'u1',
        roles: ['pharmacy-hub:store_owner'],
        memberships: [{ serviceKey: 'kpa-society', status: 'active' }],
      });
      const res = makeRes();
      const next = jest.fn();

      await guard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.body.code).toBe('MEMBERSHIP_NOT_FOUND');
    });
  });

  describe('createRequireStoreOwner — 매장 진입 (back-compat · serviceKey 미지정)', () => {
    const failingDataSource: any = {
      query: jest.fn(async () => {
        throw new Error('DB 를 조회하면 안 된다 — membership 단계에서 차단되어야 한다');
      }),
    };

    beforeEach(() => failingDataSource.query.mockClear());

    it.each(NON_ACTIVE_STATUSES)(
      'active membership 이 하나도 없으면(%s 만 보유) 403 — role 단독 진입 금지',
      async (status) => {
        const guard = createRequireStoreOwner(failingDataSource);
        const req = makeReq({
          id: 'u1',
          roles: ['kpa:store_owner'],
          memberships: [{ serviceKey: 'kpa-society', status }],
        });
        const res = makeRes();
        const next = jest.fn();

        await guard(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
        expect(res.body.code).toBe('MEMBERSHIP_NOT_ACTIVE');
        expect(failingDataSource.query).not.toHaveBeenCalled();
      },
    );

    it('membership 이 전혀 없으면 403 MEMBERSHIP_NOT_FOUND', async () => {
      const guard = createRequireStoreOwner(failingDataSource);
      const req = makeReq({ id: 'u1', roles: ['kpa:store_owner'], memberships: [] });
      const res = makeRes();
      const next = jest.fn();

      await guard(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body.code).toBe('MEMBERSHIP_NOT_FOUND');
    });

    it('active membership 이 하나라도 있으면 기존 role 판정으로 위임한다', async () => {
      const dataSource: any = { query: jest.fn(async () => []) };
      const guard = createRequireStoreOwner(dataSource);
      const req = makeReq({
        id: 'u1',
        roles: ['kpa:store_owner'],
        memberships: [
          { serviceKey: 'kpa-society', status: 'active' },
          { serviceKey: 'glycopharm', status: 'suspended' },
        ],
      });
      const res = makeRes();
      const next = jest.fn();

      await guard(req, res, next);

      // role_assignments 조회까지 도달했다는 것이 위임의 증거다.
      expect(dataSource.query).toHaveBeenCalled();
    });
  });
});
