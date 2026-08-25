/**
 * WO-O4O-CROSSSERVICE-IDENTITY-RBAC-MEMBERSHIP-FINAL-AUDIT-AND-CLOSURE-V1
 *
 * canonical 계약: **authorization = active membership + 필요한 role/capability**.
 * `service role only` / `JWT role snapshot only` / `bare legacy role only` 는 금지다.
 *
 * 선행 WO(...SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1 §10)가 남긴 잔여를 회귀로 고정한다.
 *   §10-1 role 만 보는 live consumer 3계열 — signage / serviceScope / 약사자격
 *   §10-2 membership 판정이 JWT 스냅샷 → 정지 즉시성 0
 */

import {
  getServiceMembershipStatusFromDb,
  hasActiveServiceMembership,
} from '../utils/service-membership.js';
import { injectServiceScope, extractServiceScope } from '../utils/serviceScope.js';

type Row = { user_id: string; service_key: string; status: string };

function makeDataSource(rows: Row[]) {
  return {
    isInitialized: true,
    query: jest.fn(async (_sql: string, params: any[] = []) => {
      const [userId, serviceKey] = params;
      return rows
        .filter((r) => r.user_id === userId && r.service_key === serviceKey)
        .map((r) => ({ status: r.status }));
    }),
  } as any;
}

describe('service-membership SSOT — DB 가 정본이다', () => {
  const rows: Row[] = [
    { user_id: 'u1', service_key: 'kpa-society', status: 'active' },
    { user_id: 'u2', service_key: 'kpa-society', status: 'suspended' },
    { user_id: 'u3', service_key: 'k-cosmetics', status: 'rejected' },
  ];

  it('role prefix 로 물어도 canonical service_key 로 조회한다 (kpa → kpa-society)', async () => {
    const ds = makeDataSource(rows);
    expect(await getServiceMembershipStatusFromDb(ds, 'u1', 'kpa')).toBe('active');
    expect(ds.query.mock.calls[0][1]).toEqual(['u1', 'kpa-society']);
  });

  it('cosmetics → k-cosmetics 로 매핑된다', async () => {
    const ds = makeDataSource(rows);
    expect(await getServiceMembershipStatusFromDb(ds, 'u3', 'cosmetics')).toBe('rejected');
  });

  it('suspended 와 rejected 는 서로 다른 상태로 그대로 보고된다', async () => {
    const ds = makeDataSource(rows);
    expect(await getServiceMembershipStatusFromDb(ds, 'u2', 'kpa-society')).toBe('suspended');
    expect(await getServiceMembershipStatusFromDb(ds, 'u3', 'k-cosmetics')).toBe('rejected');
  });

  it('row 가 없으면 none', async () => {
    const ds = makeDataSource(rows);
    expect(await getServiceMembershipStatusFromDb(ds, 'u9', 'neture')).toBe('none');
  });

  it('active 이외에는 모두 hasActiveServiceMembership=false', async () => {
    const ds = makeDataSource(rows);
    expect(await hasActiveServiceMembership(ds, 'u1', 'kpa-society')).toBe(true);
    expect(await hasActiveServiceMembership(ds, 'u2', 'kpa-society')).toBe(false);
    expect(await hasActiveServiceMembership(ds, 'u3', 'k-cosmetics')).toBe(false);
  });

  it('DB 오류는 fail-closed (통과시키지 않는다)', async () => {
    const ds = { isInitialized: true, query: jest.fn(async () => { throw new Error('db down'); }) } as any;
    expect(await hasActiveServiceMembership(ds, 'u1', 'kpa-society')).toBe(false);
  });
});

describe('injectServiceScope — 비활성 membership 서비스는 scope 에서 제거된다', () => {
  function run(user: any) {
    const req: any = { user };
    injectServiceScope(req, {} as any, () => undefined);
    return req.serviceScope;
  }

  it('role 이 살아 있어도 membership 이 suspended 면 그 서비스는 scope 밖이다', () => {
    const scope = run({
      roles: ['kpa:operator'],
      memberships: [{ serviceKey: 'kpa-society', status: 'suspended' }],
    });
    expect(scope.serviceKeys).toEqual([]);
    expect(scope.rolePrefixes).toEqual([]);
  });

  it('active 서비스는 유지하고 비활성 서비스만 제거한다', () => {
    const scope = run({
      roles: ['kpa:operator', 'neture:operator'],
      memberships: [
        { serviceKey: 'kpa-society', status: 'withdrawn' },
        { serviceKey: 'neture', status: 'active' },
      ],
    });
    expect(scope.serviceKeys).toEqual(['neture']);
    expect(scope.rolePrefixes).toEqual(['neture']);
  });

  it('membership row 가 아예 없는 서비스는 종전 동작을 유지한다 (negative filter 만)', () => {
    const scope = run({ roles: ['kpa:operator'], memberships: [] });
    expect(scope.serviceKeys).toEqual(['kpa-society']);
  });

  it('platform admin 은 종전대로 scope 필터를 우회한다', () => {
    const scope = run({
      roles: ['platform:super_admin'],
      memberships: [{ serviceKey: 'kpa-society', status: 'suspended' }],
    });
    expect(scope.isPlatformAdmin).toBe(true);
    expect(scope.serviceKeys).toEqual([]);
  });

  it('role 이 없으면 종전대로 active membership 에서 scope 를 파생한다', () => {
    const scope = run({
      roles: [],
      memberships: [{ serviceKey: 'kpa-society', status: 'active' }],
    });
    expect(scope.serviceKeys).toEqual(['kpa-society']);
    expect(scope.rolePrefixes).toEqual(['kpa']);
  });

  it('extractServiceScope 자체는 role 축 그대로다 (계약 불변)', () => {
    expect(extractServiceScope(['kpa:admin']).serviceKeys).toEqual(['kpa-society']);
  });
});
