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
 */

import { isStoreOwner, resolveStoreAccess } from '../utils/store-owner.utils.js';
import { optionalStoreAuth, requireStoreAuth } from '../auth/auth-context.middleware.js';

type MembershipRow = { service_key: string; status: string };

function makeDataSource(memberships: MembershipRow[], activeRoles: string[]) {
  return {
    query: jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('service_memberships')) {
        const key = params[1] as string | undefined;
        return memberships
          .filter((m) => m.status === 'active' && (key === undefined || m.service_key === key))
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

describe('isStoreOwner — membership 이 접근 게이트다', () => {
  it('active membership + store_owner role → 통과', async () => {
    const ds = makeDataSource([{ service_key: 'kpa-society', status: 'active' }], ['kpa:store_owner']);
    const result = await isStoreOwner(ds, 'u1', 'kpa');
    expect(result.isOwner).toBe(true);
    expect(result.organizationId).toBe('org-1');
  });

  it('suspended membership + 살아있는 store_owner role → 차단 (role 만으로 통과하지 않는다)', async () => {
    const ds = makeDataSource([{ service_key: 'kpa-society', status: 'suspended' }], ['kpa:store_owner']);
    const result = await isStoreOwner(ds, 'u1', 'kpa');
    expect(result.isOwner).toBe(false);
    expect(result.organizationId).toBeNull();
    // membership 에서 끝났으므로 role 조회까지 가지 않는다
    expect(ds.query.mock.calls.some((c: any[]) => String(c[0]).includes('role_assignments'))).toBe(false);
  });

  it('타 서비스 membership 만 active → 차단 (cross-service 침투 금지)', async () => {
    const ds = makeDataSource([{ service_key: 'glycopharm', status: 'active' }], ['kpa:store_owner']);
    expect((await isStoreOwner(ds, 'u1', 'kpa')).isOwner).toBe(false);
  });

  it('serviceKey 미지정 back-compat 도 active membership 최소 1개를 요구한다 (fail-closed)', async () => {
    const blocked = makeDataSource([{ service_key: 'kpa-society', status: 'suspended' }], ['kpa:store_owner']);
    expect((await isStoreOwner(blocked, 'u1')).isOwner).toBe(false);

    const allowed = makeDataSource([{ service_key: 'kpa-society', status: 'active' }], ['kpa:store_owner']);
    expect((await isStoreOwner(allowed, 'u1')).isOwner).toBe(true);
  });

  it('resolveStoreAccess 도 같은 게이트를 통과한다', async () => {
    const ds = makeDataSource([{ service_key: 'k-cosmetics', status: 'suspended' }], ['cosmetics:store_owner']);
    expect(await resolveStoreAccess(ds, 'u1', [], 'cosmetics')).toBeNull();
  });
});

describe('requireStoreAuth / optionalStoreAuth — 정지 회원에게 매장 컨텍스트를 주지 않는다', () => {
  it('requireStoreAuth: suspended membership → 403 STORE_OWNER_REQUIRED', async () => {
    const ds = makeDataSource([{ service_key: 'kpa-society', status: 'suspended' }], ['kpa:store_owner']);
    const res = makeRes();
    const next = jest.fn();

    await requireStoreAuth(ds, 'kpa')({ user: { id: 'u1' } } as any, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('STORE_OWNER_REQUIRED');
  });

  it('optionalStoreAuth: suspended membership → 통과하되 organizationId 를 주입하지 않는다', async () => {
    const ds = makeDataSource([{ service_key: 'kpa-society', status: 'suspended' }], ['kpa:store_owner']);
    const req: any = { user: { id: 'u1' } };
    const next = jest.fn();

    await optionalStoreAuth(ds, 'kpa')(req, makeRes(), next);

    expect(next).toHaveBeenCalled();
    expect(req.organizationId).toBeUndefined();
    expect(req.authContext).toBeUndefined();
  });

  it('optionalStoreAuth: active membership 이면 종전대로 organizationId 를 주입한다', async () => {
    const ds = makeDataSource([{ service_key: 'kpa-society', status: 'active' }], ['kpa:store_owner']);
    const req: any = { user: { id: 'u1' } };
    const next = jest.fn();

    await optionalStoreAuth(ds, 'kpa')(req, makeRes(), next);

    expect(next).toHaveBeenCalled();
    expect(req.organizationId).toBe('org-1');
  });
});
