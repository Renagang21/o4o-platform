/**
 * WO-O4O-CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1 §7
 *
 * 매장 판정의 **접근 게이트는 한 곳** — `isStoreOwner()` 다.
 *
 * 이전에는 membership 검사가 `createRequireStoreOwner` 미들웨어에만 있었고,
 * 같은 판정을 쓰는 다른 진입점은 role 만 봤다:
 *   - `requireStoreAuth` / `optionalStoreAuth` (store-hub 공개 GET)
 *   - `resolveStoreAccess` (store-playlist · handled-products · local-product · seller …)
 * → membership 이 suspended 여도 role_assignments 에 `{prefix}:store_owner` 가 살아 있으면
 *   매장 데이터가 보였다. 그 경로를 고정한다.
 *
 * 판정 근거는 JWT 가 아니라 DB 다 — 정지가 토큰 재발급을 기다리지 않는다.
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 (DESIGN §5):
 *   약국 매장(`kpa`)은 membership/role 이 아니라 내 매장(약국) 신청 원장으로 판정한다(맨 아래 describe).
 *   membership 게이트 계약은 그 계약을 유지하는 서비스(cosmetics)로 고정한다.
 */

import { isStoreOwner, resolveStoreAccess, createRequireStoreOwner } from '../utils/store-owner.utils.js';
import { optionalStoreAuth, requireStoreAuth } from '../auth/auth-context.middleware.js';

type MembershipRow = { service_key: string; status: string };

function makeDataSource(memberships: MembershipRow[], activeRoles: string[]) {
  return {
    query: jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('service_memberships')) {
        const key = params[1] as string | undefined;
        return memberships
          .filter((m) => m.status === 'active' && (key === undefined || m.service_key === key))
          .filter((m) => !sql.includes("service_key <> 'pharmacy-hub'") || m.service_key !== 'pharmacy-hub')
          .slice(0, 1)
          .map(() => ({ ok: 1 }));
      }
      if (sql.includes('role_assignments')) {
        const allowed = params[1] as string[];
        return activeRoles.some((r) => allowed.includes(r)) ? [{ ok: 1 }] : [];
      }
      if (sql.includes('organization_service_enrollments') || sql.includes('organization_members')) {
        return [{ organization_id: 'org-1', role: 'owner', is_primary: true, joined_at: '2025-01-01' }];
      }
      return [];
    }),
  } as any;
}

function makeRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('isStoreOwner — membership 이 접근 게이트다 (cosmetics)', () => {
  it('active membership + store_owner role → 통과', async () => {
    const ds = makeDataSource([{ service_key: 'k-cosmetics', status: 'active' }], ['cosmetics:store_owner']);
    const result = await isStoreOwner(ds, 'u1', 'cosmetics');
    expect(result.isOwner).toBe(true);
    expect(result.organizationId).toBe('org-1');
  });

  it('suspended membership + 살아있는 store_owner role → 차단 (role 만으로 통과하지 않는다)', async () => {
    const ds = makeDataSource([{ service_key: 'k-cosmetics', status: 'suspended' }], ['cosmetics:store_owner']);
    const result = await isStoreOwner(ds, 'u1', 'cosmetics');
    expect(result.isOwner).toBe(false);
    expect(result.organizationId).toBeNull();
    // membership 에서 끝났으므로 role 조회까지 가지 않는다
    expect(ds.query.mock.calls.some((c: any[]) => String(c[0]).includes('role_assignments'))).toBe(false);
  });

  it('타 서비스 membership 만 active → 차단 (cross-service 침투 금지)', async () => {
    const ds = makeDataSource([{ service_key: 'pharmacy-hub', status: 'active' }], ['cosmetics:store_owner']);
    expect((await isStoreOwner(ds, 'u1', 'cosmetics')).isOwner).toBe(false);
  });

  it('serviceKey 미지정 back-compat 도 active membership 최소 1개를 요구한다 (fail-closed)', async () => {
    const blocked = makeDataSource([{ service_key: 'kpa-society', status: 'suspended' }], ['kpa:store_owner']);
    expect((await isStoreOwner(blocked, 'u1')).isOwner).toBe(false);

    const allowed = makeDataSource([{ service_key: 'kpa-society', status: 'active' }], ['kpa:store_owner']);
    expect((await isStoreOwner(allowed, 'u1')).isOwner).toBe(true);
  });

  it('PH membership만 남으면 serviceKey 미지정 store_owner 판정도 열리지 않는다', async () => {
    const ds = makeDataSource([{ service_key: 'pharmacy-hub', status: 'active' }], ['cosmetics:store_owner']);
    expect((await isStoreOwner(ds, 'u1')).isOwner).toBe(false);
    expect(ds.query.mock.calls.some((c: any[]) => String(c[0]).includes('role_assignments'))).toBe(false);
  });

  it('resolveStoreAccess 도 같은 게이트를 통과한다', async () => {
    const ds = makeDataSource([{ service_key: 'k-cosmetics', status: 'suspended' }], ['cosmetics:store_owner']);
    expect(await resolveStoreAccess(ds, 'u1', [], 'cosmetics')).toBeNull();
  });
});

describe('requireStoreAuth / optionalStoreAuth — 정지 회원에게 매장 컨텍스트를 주지 않는다 (cosmetics)', () => {
  it('requireStoreAuth: suspended membership → 403 STORE_OWNER_REQUIRED', async () => {
    const ds = makeDataSource([{ service_key: 'k-cosmetics', status: 'suspended' }], ['cosmetics:store_owner']);
    const res = makeRes();
    const next = jest.fn();

    await requireStoreAuth(ds, 'cosmetics')({ user: { id: 'u1' } } as any, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('STORE_OWNER_REQUIRED');
  });

  it('optionalStoreAuth: suspended membership → 통과하되 organizationId 를 주입하지 않는다', async () => {
    const ds = makeDataSource([{ service_key: 'k-cosmetics', status: 'suspended' }], ['cosmetics:store_owner']);
    const req: any = { user: { id: 'u1' } };
    const next = jest.fn();

    await optionalStoreAuth(ds, 'cosmetics')(req, makeRes(), next);

    expect(next).toHaveBeenCalled();
    expect(req.organizationId).toBeUndefined();
    expect(req.authContext).toBeUndefined();
  });

  it('optionalStoreAuth: active membership 이면 종전대로 organizationId 를 주입한다', async () => {
    const ds = makeDataSource([{ service_key: 'k-cosmetics', status: 'active' }], ['cosmetics:store_owner']);
    const req: any = { user: { id: 'u1' } };
    const next = jest.fn();

    await optionalStoreAuth(ds, 'cosmetics')(req, makeRes(), next);

    expect(next).toHaveBeenCalled();
    expect(req.organizationId).toBe('org-1');
  });
});

/**
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 (DESIGN §5)
 *   약국 매장(`kpa`) = 내 매장(약국) 신청 원장(neture_pharmacy_memberships.status='active') 조직의
 *   owner/admin/manager. kpa-society membership · `kpa:store_owner` role 은 매장 판정 근거가 아니다.
 */
describe('약국(kpa) — 내 매장(약국) 신청 원장이 매장 게이트다', () => {
  type LedgerRow = { organization_id: string; status: 'active' | 'pending' | 'suspended'; member_role: string };

  /** 원장 질의는 SQL 의 `npm.status = 'active'` 조건을 흉내 내 active 행만 돌려준다. */
  function makeLedgerDataSource(
    ledger: LedgerRow[],
    opts: { memberships?: MembershipRow[]; activeRoles?: string[] } = {},
  ) {
    const memberships = opts.memberships ?? [];
    const activeRoles = opts.activeRoles ?? [];
    return {
      query: jest.fn(async (sql: string, params: any[] = []) => {
        if (sql.includes('neture_pharmacy_memberships')) {
          const roles = params[1] as string[];
          return ledger
            .filter((r) => r.status === 'active' && roles.includes(r.member_role))
            .map((r) => ({ organization_id: r.organization_id, role: r.member_role }));
        }
        if (sql.includes('service_memberships')) {
          return memberships.filter((m) => m.status === 'active').map(() => ({ ok: 1 }));
        }
        if (sql.includes('role_assignments')) {
          return activeRoles.length ? [{ ok: 1 }] : [];
        }
        // 옛 경로(enrollment/slug · 서비스 중립)로 새면 다른 조직이 보이도록 해 회귀를 드러낸다.
        if (sql.includes('organization_service_enrollments') || sql.includes('organization_members')) {
          return [{ organization_id: 'org-legacy', role: 'owner', is_primary: true, joined_at: '2025-01-01' }];
        }
        return [];
      }),
    } as any;
  }

  const sqlOf = (ds: any): string[] => ds.query.mock.calls.map((c: any[]) => String(c[0]));

  it('원장 active + owner → isOwner=true, 그 조직으로 확정', async () => {
    const ds = makeLedgerDataSource([{ organization_id: 'org-pharmacy', status: 'active', member_role: 'owner' }]);
    const result = await isStoreOwner(ds, 'u1', 'kpa');
    expect(result.isOwner).toBe(true);
    expect(result.organizationId).toBe('org-pharmacy');
    expect(result.memberRole).toBe('owner');
    expect(result.resolution.status).toBe('resolved');
  });

  it.each(['pending', 'suspended'] as const)(
    '원장 %s(active 행 없음) → kpa:store_owner role · kpa-society active membership 이 있어도 isOwner=false',
    async (status) => {
      const ds = makeLedgerDataSource(
        [{ organization_id: 'org-pharmacy', status, member_role: 'owner' }],
        { memberships: [{ service_key: 'kpa-society', status: 'active' }], activeRoles: ['kpa:store_owner'] },
      );
      const result = await isStoreOwner(ds, 'u1', 'kpa');
      expect(result.isOwner).toBe(false);
      expect(result.organizationId).toBeNull();
      expect(result.resolution.status).toBe('none');
      expect(await resolveStoreAccess(ds, 'u1', ['kpa:store_owner'], 'kpa')).toBeNull();
    },
  );

  it('isStoreOwner(kpa) 는 service_memberships / role_assignments 게이트 질의를 하지 않는다', async () => {
    const ds = makeLedgerDataSource([{ organization_id: 'org-pharmacy', status: 'active', member_role: 'owner' }]);
    await isStoreOwner(ds, 'u1', 'kpa');
    const sqls = sqlOf(ds);
    expect(sqls.some((q) => q.includes('neture_pharmacy_memberships'))).toBe(true);
    expect(sqls.some((q) => q.includes('service_memberships'))).toBe(false);
    expect(sqls.some((q) => q.includes('role_assignments'))).toBe(false);
    // 옛 서비스 연결(enrollment/slug) 후보도 보지 않는다.
    expect(sqls.some((q) => q.includes('organization_service_enrollments'))).toBe(false);
  });

  it('createRequireStoreOwner(kpa): JWT memberships 없이도 원장 active 면 통과 + 조직 주입', async () => {
    const ds = makeLedgerDataSource([{ organization_id: 'org-pharmacy', status: 'active', member_role: 'manager' }]);
    const req: any = { user: { id: 'u1' } }; // memberships 미보유
    const res = makeRes();
    const next = jest.fn();

    await createRequireStoreOwner(ds, 'kpa')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.organizationId).toBe('org-pharmacy');
    expect(req.authContext.memberRole).toBe('manager');
  });

  it('createRequireStoreOwner(kpa): 원장 active 아님 → 403 STORE_OWNER_REQUIRED (membership·role 무관)', async () => {
    const ds = makeLedgerDataSource(
      [{ organization_id: 'org-pharmacy', status: 'pending', member_role: 'owner' }],
      { memberships: [{ service_key: 'kpa-society', status: 'active' }], activeRoles: ['kpa:store_owner'] },
    );
    const req: any = {
      user: { id: 'u1', roles: ['kpa:store_owner'], memberships: [{ serviceKey: 'kpa-society', status: 'active' }] },
    };
    const res = makeRes();
    const next = jest.fn();

    await createRequireStoreOwner(ds, 'kpa')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('STORE_OWNER_REQUIRED');
    expect(req.organizationId).toBeUndefined();
  });
});
