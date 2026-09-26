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
  readPreferredStoreOrganizationId,
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
/**
 * WO-O4O-CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1:
 * isStoreOwner() 가 role 조회에 앞서 active membership 을 먼저 확인한다.
 * 순서 기반 stub 이므로 role 응답 앞에 membership 응답을 넣어 준다.
 */
const MEMBERSHIP_ROW = [{ ok: 1 }];

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
    const { dataSource } = makeDataSource([MEMBERSHIP_ROW, ROLE_ROW, []]);
    const result = await isStoreOwner(dataSource, 'user-1', 'pharmacy-hub');
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
      MEMBERSHIP_ROW,
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
    const { dataSource } = makeDataSource([MEMBERSHIP_ROW, ROLE_ROW, []]);
    const guard = createRequireStoreOwner(dataSource, 'kpa');
    const res = makeRes();
    const next = jest.fn();
    await guard({ user: { id: 'u1', memberships: activeMembership } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].code).toBe('STORE_OWNER_REQUIRED');
  });

  it('A. 정상 → next() + req.organizationId 주입', async () => {
    const { dataSource } = makeDataSource([
      MEMBERSHIP_ROW,
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

/**
 * 선택 매장 헤더 — CHECK-O4O-URL-FIRST-CENSUS-V1 §21-14
 * `X-Store-Organization-Id` 는 이미 허용된 후보 안에서만 고르는 힌트다. 허용 집합을 넓히지 않는다.
 */
describe('선택 매장(X-Store-Organization-Id) — 후보 안에서만 선택', () => {
  const ORG_A = '11111111-1111-4111-8111-111111111111';
  const ORG_B = '22222222-2222-4222-8222-222222222222';
  const FOREIGN = '33333333-3333-4333-8333-333333333333';
  const twoCandidates = () => [
    { organization_id: ORG_A, role: 'owner' },
    { organization_id: ORG_B, role: 'manager' },
  ];

  it('후보 2개 + 후보 안의 선택 → 그 매장으로 확정', async () => {
    const { dataSource } = makeDataSource([twoCandidates()]);
    const r = await resolveStoreOrganization(dataSource, 'user-1', 'kpa', ORG_B);
    expect(r).toEqual({ status: 'resolved', organizationId: ORG_B, memberRole: 'manager', candidateCount: 2 });
  });

  it('후보 2개 + 후보 밖 선택 → 여전히 ambiguous(임의 선택 · 권한 확대 없음)', async () => {
    const { dataSource } = makeDataSource([twoCandidates()]);
    const r = await resolveStoreOrganization(dataSource, 'user-1', 'kpa', FOREIGN);
    expect(r.status).toBe('ambiguous');
    expect(r.organizationId).toBeNull();
  });

  it('후보 1개 + 후보 밖 선택 → 기존 단일 후보 그대로(선택값이 이기지 않는다)', async () => {
    const { dataSource } = makeDataSource([[{ organization_id: ORG_A, role: 'owner' }]]);
    const r = await resolveStoreOrganization(dataSource, 'user-1', 'kpa', FOREIGN);
    expect(r.organizationId).toBe(ORG_A);
  });

  it('후보 0개 + 선택 → none(선택값만으로는 접근 불가)', async () => {
    const { dataSource } = makeDataSource([[]]);
    const r = await resolveStoreOrganization(dataSource, 'user-1', 'kpa', FOREIGN);
    expect(r.status).toBe('none');
  });

  it('serviceKey 미지정: 후보 안의 선택이 결정적 정렬보다 우선 · 후보 밖이면 기존 정렬', async () => {
    const rows = () => [
      { organization_id: ORG_A, role: 'owner', is_primary: true, joined_at: '2026-01-01' },
      { organization_id: ORG_B, role: 'owner', is_primary: false, joined_at: '2026-02-01' },
    ];
    const a = makeDataSource([rows()]);
    expect((await resolveStoreOrganization(a.dataSource, 'user-1', undefined, ORG_B)).organizationId).toBe(ORG_B);
    const b = makeDataSource([rows()]);
    expect((await resolveStoreOrganization(b.dataSource, 'user-1', undefined, FOREIGN)).organizationId).toBe(ORG_A);
  });

  it('헤더 파싱: UUID 만 · 소문자 정규화 · X-Organization-Id 는 읽지 않는다', () => {
    expect(readPreferredStoreOrganizationId({ headers: { 'x-store-organization-id': ORG_A.toUpperCase() } })).toBe(ORG_A);
    expect(readPreferredStoreOrganizationId({ headers: { 'x-store-organization-id': 'not-a-uuid' } })).toBeNull();
    expect(readPreferredStoreOrganizationId({ headers: { 'x-organization-id': ORG_A } })).toBeNull();
    expect(readPreferredStoreOrganizationId({ headers: {} })).toBeNull();
    expect(readPreferredStoreOrganizationId(undefined)).toBeNull();
  });

  it('guard: 후보 2개 + 선택 헤더 → next() + 그 매장 주입 / 후보 밖 헤더 → 409 유지', async () => {
    const makeRes = () => {
      const res: any = {};
      res.status = jest.fn(() => res);
      res.json = jest.fn(() => res);
      return res;
    };
    const activeMembership = [{ serviceKey: 'kpa-society', status: 'active' }];

    const ok = makeDataSource([MEMBERSHIP_ROW, ROLE_ROW, twoCandidates()]);
    const req: any = {
      headers: { 'x-store-organization-id': ORG_B },
      user: { id: 'u1', memberships: activeMembership, roles: ['kpa:store_owner'] },
    };
    const next = jest.fn();
    await createRequireStoreOwner(ok.dataSource, 'kpa')(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.organizationId).toBe(ORG_B);

    const bad = makeDataSource([MEMBERSHIP_ROW, ROLE_ROW, twoCandidates()]);
    const res = makeRes();
    const next2 = jest.fn();
    await createRequireStoreOwner(bad.dataSource, 'kpa')(
      { headers: { 'x-store-organization-id': FOREIGN }, user: { id: 'u1', memberships: activeMembership } } as any,
      res,
      next2,
    );
    expect(res.status).toHaveBeenCalledWith(409);
    expect(next2).not.toHaveBeenCalled();
  });
});
