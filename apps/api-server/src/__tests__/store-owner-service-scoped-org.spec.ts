/**
 * WO-O4O-STORE-OWNER-SERVICE-SCOPED-ORGANIZATION-RESOLUTION-V1
 *
 * store_owner 접근에서 organization 이 **현재 serviceKey 기준으로 결정적으로** 해석되는지 검증한다.
 * 검증 케이스 A~F (WO §검증).
 *
 * DB 는 붙이지 않는다 — DataSource.query 를 stub 으로 대체해 SQL 파라미터와 분기만 본다.
 */

import {
  resolveStoreOrganization,
  findStoreOrganizationCandidates,
  STORE_MEMBER_ROLES,
  STORE_SERVICE_ORG_LINKAGE,
} from '../utils/store-organization.resolver.js';
import { isStoreOwner, createRequireStoreOwner } from '../utils/store-owner.utils.js';

type Row = Record<string, unknown>;

/** query 호출을 순서대로 큐에서 꺼내 응답한다. 각 호출의 SQL/params 를 기록한다. */
function makeDataSource(responses: Row[][]) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const queue = [...responses];
  const dataSource = {
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return queue.shift() ?? [];
    }),
  };
  return { dataSource: dataSource as any, calls };
}

const ROLE_ROW = [{ '?column?': 1 }];

describe('store organization resolution — service scoped', () => {
  it('A. 단일 서비스 + 단일 org → 그 org 로 확정', async () => {
    const { dataSource } = makeDataSource([[{ organization_id: 'org-kpa', role: 'owner' }]]);
    const result = await resolveStoreOrganization(dataSource, 'user-1', 'kpa');
    expect(result).toEqual({
      status: 'resolved',
      organizationId: 'org-kpa',
      memberRole: 'owner',
      candidateCount: 1,
    });
  });

  it('B. 복수 org + serviceKey → 그 서비스 등록 조직만 후보로 조회한다', async () => {
    const { dataSource, calls } = makeDataSource([[{ organization_id: 'org-kpa', role: 'owner' }]]);
    await findStoreOrganizationCandidates(dataSource, 'user-1', 'kpa');

    const [{ sql, params }] = calls;
    // 서비스 등록 근거 2소스가 모두 조건에 들어간다 (enrollment / store slug)
    expect(sql).toContain('organization_service_enrollments');
    expect(sql).toContain('platform_store_slugs');
    // 정렬 없는 LIMIT 1 금지
    expect(sql).not.toMatch(/LIMIT\s+1/i);
    expect(params[0]).toBe('user-1');
    expect(params[1]).toEqual(STORE_MEMBER_ROLES);
    expect(params[2]).toEqual(STORE_SERVICE_ORG_LINKAGE.kpa.enrollmentCodes);
    expect(params[3]).toEqual(STORE_SERVICE_ORG_LINKAGE.kpa.slugKeys);
  });

  it('C. 다른 서비스 org 만 존재 → 후보 0 → 차단', async () => {
    const { dataSource } = makeDataSource([[]]);
    const result = await resolveStoreOrganization(dataSource, 'user-1', 'cosmetics');
    expect(result.status).toBe('none');
    expect(result.organizationId).toBeNull();
  });

  it('D. 같은 서비스 후보 2개 → 임의 선택 없이 ambiguous', async () => {
    const { dataSource } = makeDataSource([
      [
        { organization_id: 'org-a', role: 'owner' },
        { organization_id: 'org-b', role: 'manager' },
      ],
    ]);
    const result = await resolveStoreOrganization(dataSource, 'user-1', 'kpa');
    expect(result.status).toBe('ambiguous');
    expect(result.organizationId).toBeNull();
    expect(result.candidateCount).toBe(2);
  });

  it('serviceKey 미지정(back-compat)은 허용 집합을 유지하되 결정적으로 고른다', async () => {
    const { dataSource, calls } = makeDataSource([
      [
        { organization_id: 'org-z', role: 'owner', is_primary: false, joined_at: '2026-01-02' },
        { organization_id: 'org-a', role: 'manager', is_primary: true, joined_at: '2026-03-01' },
      ],
    ]);
    const result = await resolveStoreOrganization(dataSource, 'user-1');
    // is_primary 우선 → org-a
    expect(result.organizationId).toBe('org-a');
    expect(result.candidateCount).toBe(2);
    // 서비스 조건은 걸지 않는다 (허용 집합 불변)
    expect(calls[0].sql).not.toContain('organization_service_enrollments');
  });

  it('F. store_owner role 없음 → isOwner=false, 조직 조회조차 하지 않는다', async () => {
    const { dataSource, calls } = makeDataSource([[]]);
    const result = await isStoreOwner(dataSource, 'user-1', 'kpa');
    expect(result.isOwner).toBe(false);
    expect(result.organizationId).toBeNull();
    expect(calls).toHaveLength(1); // role 조회 1회로 종료
  });

  it('isStoreOwner: role 은 있으나 서비스 조직이 없으면 organizationId=null', async () => {
    const { dataSource } = makeDataSource([ROLE_ROW, []]);
    const result = await isStoreOwner(dataSource, 'user-1', 'glycopharm');
    expect(result.isOwner).toBe(true);
    expect(result.organizationId).toBeNull();
    expect(result.resolution.status).toBe('none');
  });
});

describe('createRequireStoreOwner — guard 응답', () => {
  const makeRes = () => {
    const res: any = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
  };
  const activeMembership = [{ serviceKey: 'kpa-society', status: 'active' }];

  it('E. inactive membership → 403 MEMBERSHIP_NOT_ACTIVE', async () => {
    const { dataSource } = makeDataSource([]);
    const guard = createRequireStoreOwner(dataSource, 'kpa');
    const res = makeRes();
    const next = jest.fn();
    await guard(
      { user: { id: 'u1', memberships: [{ serviceKey: 'kpa-society', status: 'pending' }] } } as any,
      res,
      next,
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('MEMBERSHIP_NOT_ACTIVE');
    expect(next).not.toHaveBeenCalled();
  });

  it('D. 후보 2개 → 409 AMBIGUOUS_STORE_CONNECTION (임의 통과 금지)', async () => {
    const { dataSource } = makeDataSource([
      ROLE_ROW,
      [
        { organization_id: 'org-a', role: 'owner' },
        { organization_id: 'org-b', role: 'owner' },
      ],
    ]);
    const guard = createRequireStoreOwner(dataSource, 'kpa');
    const res = makeRes();
    const next = jest.fn();
    await guard({ user: { id: 'u1', memberships: activeMembership } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].code).toBe('AMBIGUOUS_STORE_CONNECTION');
    expect(next).not.toHaveBeenCalled();
  });

  it('C. 서비스 조직 없음 → 403 STORE_OWNER_REQUIRED', async () => {
    const { dataSource } = makeDataSource([ROLE_ROW, []]);
    const guard = createRequireStoreOwner(dataSource, 'kpa');
    const res = makeRes();
    const next = jest.fn();
    await guard({ user: { id: 'u1', memberships: activeMembership } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('STORE_OWNER_REQUIRED');
  });

  it('A. 정상 → next() + req.organizationId 주입', async () => {
    const { dataSource } = makeDataSource([
      ROLE_ROW,
      [{ organization_id: 'org-kpa', role: 'owner' }],
    ]);
    const guard = createRequireStoreOwner(dataSource, 'kpa');
    const res = makeRes();
    const next = jest.fn();
    const req: any = { user: { id: 'u1', memberships: activeMembership, roles: ['kpa:store_owner'] } };
    await guard(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.organizationId).toBe('org-kpa');
    expect(req.authContext.memberRole).toBe('owner');
  });
});
