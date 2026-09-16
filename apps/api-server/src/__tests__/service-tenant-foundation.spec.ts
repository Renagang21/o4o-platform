/**
 * WO-O4O-SERVICE-TENANT-FOUNDATION-V1
 *
 * Service Identity · Store↔Service · Operator↔Service · Workspace 자격의 read contract 를 고정한다.
 * DB 없음 — `DataSource.query` 를 stub 으로 대체해 어떤 질의를 어떤 파라미터로 던지는지까지 검사한다.
 *
 * 합성 fixture (§14):
 *   Store A : Service A(kpa-society) active · Service B(pharmacy-hub) active · Service C(k-cosmetics) inactive
 *   Store B : Service A(kpa-society) active
 *   User X  : Service A · B 운영자 (kpa:operator · pharmacy-hub:admin) + 두 membership active
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import {
  foldEnrollmentsToStoreServices,
  listEnrolledStoreOrganizationIds,
  resolveOperatorServices,
  resolveServiceIdentity,
  resolveStoreServices,
} from '../utils/service-tenant.resolver.js';
import {
  getServiceWorkspaceCapability,
  O4O_SERVICES,
  UNDECIDED_SERVICE_WORKSPACE,
} from '../config/service-catalog.js';

type Row = Record<string, unknown>;

function makeDataSource(responses: Row[][]) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const queue = [...responses];
  const dataSource: any = {
    isInitialized: true,
    query: jest.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return queue.shift() ?? [];
    }),
  };
  return { dataSource, calls };
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

const STORE_A = 'org-store-a';
const STORE_B = 'org-store-b';
const USER_X = 'user-x';

const memberRow = (organizationId: string) => ({
  organization_id: organizationId, role: 'owner', is_primary: false, joined_at: '2025-01-01',
});

const STORE_A_ENROLLMENTS: Row[] = [
  { organization_id: STORE_A, service_code: 'k-cosmetics', status: 'inactive' },
  { organization_id: STORE_A, service_code: 'kpa-society', status: 'active' },
  { organization_id: STORE_A, service_code: 'pharmacy-hub', status: 'active' },
];

describe('Service Identity — canonical 집합과 별칭', () => {
  it('canonical key 는 그대로, role prefix 별칭은 canonical 로 흡수된다 (독립 서비스 아님)', () => {
    expect(resolveServiceIdentity('kpa-society')).toMatchObject({ serviceKey: 'kpa-society', kind: 'canonical' });
    expect(resolveServiceIdentity('kpa')).toMatchObject({ serviceKey: 'kpa-society', kind: 'alias', sourceCode: 'kpa' });
    expect(resolveServiceIdentity('cosmetics')).toMatchObject({ serviceKey: 'k-cosmetics', kind: 'alias' });
  });

  it('canonical 집합 밖 코드(제품 도메인 키 · 미등록)는 서비스 identity 가 아니다', () => {
    expect(resolveServiceIdentity('kpa-groupbuy').kind).toBe('unknown');
    expect(resolveServiceIdentity('not-a-service').kind).toBe('unknown');
    expect(resolveServiceIdentity('').kind).toBe('unknown');
  });
});

describe('Service Workspace metadata — identity 와 별도 축', () => {
  it('catalog 의 모든 서비스가 workspace metadata 를 명시한다 (근거 없는 서비스는 undecided)', () => {
    for (const svc of O4O_SERVICES) {
      expect(svc.workspace).toBeDefined();
    }
    const modes = new Set(O4O_SERVICES.map((s) => s.workspace!.workspaceMode));
    // "모두 standard" 금지 — special / none / undecided 가 실제로 존재한다.
    expect(modes.has('standard')).toBe(true);
    expect(modes.size).toBeGreaterThan(1);
  });

  it('미등록 · 별칭 키의 workspace 자격은 UNDECIDED 기본값이다', () => {
    expect(getServiceWorkspaceCapability('kpa')).toEqual(UNDECIDED_SERVICE_WORKSPACE);
    expect(getServiceWorkspaceCapability('unknown')).toEqual(UNDECIDED_SERVICE_WORKSPACE);
    expect(UNDECIDED_SERVICE_WORKSPACE.storeWorkspaceEnabled).toBe(false);
    expect(UNDECIDED_SERVICE_WORKSPACE.operatorWorkspaceEnabled).toBe(false);
  });

  it('workspaceMode=none 인 서비스는 enrollment 가 active 여도 store workspace 로 노출되지 않는다', () => {
    const noneKey = O4O_SERVICES.find((s) => s.workspace!.workspaceMode === 'none')!.key;
    const list = foldEnrollmentsToStoreServices(STORE_A, [
      { organization_id: STORE_A, service_code: noneKey, status: 'active' },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ serviceKey: noneKey, enrollmentStatus: 'active', workspaceMode: 'none', workspaceAvailable: false });
  });

  it('workspaceMode=undecided 인 서비스도 노출되지 않는다', () => {
    const list = foldEnrollmentsToStoreServices(STORE_A, [
      { organization_id: STORE_A, service_code: 'cafe24-b2b', status: 'active' },
    ]);
    expect(list[0]).toMatchObject({ workspaceMode: 'undecided', workspaceAvailable: false });
  });
});

describe('Store ↔ Service (1 Store : N Services)', () => {
  it('Store A: active 2건은 workspaceAvailable, inactive 1건은 목록에 남되 false — 순서 결정적', async () => {
    const { dataSource, calls } = makeDataSource([[memberRow(STORE_A)], STORE_A_ENROLLMENTS]);

    const r = await resolveStoreServices(dataSource, { userId: USER_X });

    expect(r.status).toBe('resolved');
    expect(r.organizationId).toBe(STORE_A);
    expect(r.services.map((s) => [s.serviceKey, s.enrollmentStatus, s.workspaceAvailable])).toEqual([
      ['k-cosmetics', 'inactive', false],
      ['kpa-society', 'active', true],
      ['pharmacy-hub', 'active', true],
    ]);
    expect(r.services.every((s) => s.organizationId === STORE_A)).toBe(true);
    // 1) organization_members 소유 후보 → 2) 그 조직으로 스코프된 enrollment 질의
    expect(calls).toHaveLength(2);
    expect(norm(calls[0].sql)).toContain('organization_members');
    expect(calls[0].params[0]).toBe(USER_X);
    expect(norm(calls[1].sql)).toContain('organization_service_enrollments');
    expect(calls[1].params).toEqual([STORE_A]);
  });

  it('별칭 코드(kpa)와 canonical(kpa-society)이 함께 있어도 서비스 1건으로 합쳐진다 (중복 enrollment 0)', () => {
    const list = foldEnrollmentsToStoreServices(STORE_A, [
      { organization_id: STORE_A, service_code: 'kpa', status: 'inactive' },
      { organization_id: STORE_A, service_code: 'kpa-society', status: 'active' },
      { organization_id: STORE_A, service_code: 'cosmetics', status: 'active' },
    ]);
    expect(list.map((s) => s.serviceKey)).toEqual(['k-cosmetics', 'kpa-society']);
    expect(list.find((s) => s.serviceKey === 'kpa-society')!.enrollmentStatus).toBe('active');
    // 별칭이 독립 서비스로 노출되지 않는다
    expect(list.some((s) => s.serviceKey === 'kpa' || s.serviceKey === 'cosmetics')).toBe(false);
  });

  it('canonical 집합 밖 enrollment 코드는 목록에 오르지 않는다', () => {
    const list = foldEnrollmentsToStoreServices(STORE_A, [
      { organization_id: STORE_A, service_code: 'kpa-groupbuy', status: 'active' },
      { organization_id: STORE_A, service_code: 'kpa-society', status: 'active' },
    ]);
    expect(list.map((s) => s.serviceKey)).toEqual(['kpa-society']);
  });

  it('다른 매장 조직 id 를 지정하면 NOT_STORE_MEMBER — enrollment 를 조회하지 않는다 (cross-store leakage 0)', async () => {
    const { dataSource, calls } = makeDataSource([[memberRow(STORE_A)]]);

    const r = await resolveStoreServices(dataSource, { userId: USER_X, organizationId: STORE_B });

    expect(r).toEqual({ status: 'none', organizationId: null, services: [], reason: 'NOT_STORE_MEMBER' });
    expect(calls).toHaveLength(1);
  });

  it('소유한 조직을 지정하면 그 조직만 해석한다 (다중 매장이어도 ambiguous 아님)', async () => {
    const { dataSource, calls } = makeDataSource([
      [memberRow(STORE_A), memberRow(STORE_B)],
      [{ organization_id: STORE_B, service_code: 'kpa-society', status: 'active' }],
    ]);

    const r = await resolveStoreServices(dataSource, { userId: USER_X, organizationId: STORE_B });

    expect(r.status).toBe('resolved');
    expect(r.organizationId).toBe(STORE_B);
    expect(r.services.map((s) => s.serviceKey)).toEqual(['kpa-society']);
    expect(calls[1].params).toEqual([STORE_B]);
  });

  it('조직 미지정 + 매장 2개 이상이면 ambiguous — 첫 번째를 고르지 않는다', async () => {
    const { dataSource, calls } = makeDataSource([[memberRow(STORE_A), memberRow(STORE_B)]]);

    const r = await resolveStoreServices(dataSource, { userId: USER_X });

    expect(r).toEqual({ status: 'ambiguous', organizationId: null, services: [], reason: 'MULTIPLE_ACCESSIBLE_STORES' });
    expect(calls).toHaveLength(1);
  });

  it('접근 가능한 매장이 0개면 none (가짜 빈 성공 아님)', async () => {
    const { dataSource } = makeDataSource([[]]);
    const r = await resolveStoreServices(dataSource, { userId: USER_X });
    expect(r).toEqual({ status: 'none', organizationId: null, services: [], reason: 'NO_ACCESSIBLE_STORE' });
  });

  it('userId 가 없으면 질의 없이 none', async () => {
    const { dataSource, calls } = makeDataSource([]);
    const r = await resolveStoreServices(dataSource, { userId: '' });
    expect(r.status).toBe('none');
    expect(calls).toHaveLength(0);
  });
});

describe('Service ↔ Store (1 Service : N Stores)', () => {
  it('Service A 에 가입한 매장 A · B 를 돌려주고, 별칭 코드도 같은 서비스로 본다', async () => {
    const { dataSource, calls } = makeDataSource([[
      { organization_id: STORE_A, service_code: 'kpa-society', status: 'active' },
      { organization_id: STORE_B, service_code: 'kpa', status: 'active' },
      { organization_id: 'org-c', service_code: 'kpa-society', status: 'inactive' },
    ]]);

    const list = await listEnrolledStoreOrganizationIds(dataSource, 'kpa-society');

    expect(list.map((x) => x.organizationId)).toEqual([STORE_A, STORE_B]);
    // 질의는 canonical + 별칭 코드 집합으로 스코프된다
    expect(calls[0].params[0]).toEqual(['kpa-society', 'kpa']);
  });

  it('includeInactive 면 inactive 매장도 구분되어 나온다', async () => {
    const { dataSource } = makeDataSource([[
      { organization_id: STORE_A, service_code: 'pharmacy-hub', status: 'active' },
      { organization_id: 'org-c', service_code: 'pharmacy-hub', status: 'inactive' },
    ]]);
    const list = await listEnrolledStoreOrganizationIds(dataSource, 'pharmacy-hub', { includeInactive: true });
    expect(list).toEqual([
      { organizationId: STORE_A, enrollmentStatus: 'active' },
      { organizationId: 'org-c', enrollmentStatus: 'inactive' },
    ]);
  });

  it('서비스 identity 가 아닌 키는 질의 없이 빈 목록', async () => {
    const { dataSource, calls } = makeDataSource([]);
    expect(await listEnrolledStoreOrganizationIds(dataSource, 'kpa-groupbuy')).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});

describe('Operator ↔ Service (1 Operator : N Services)', () => {
  it('User X: kpa:operator + pharmacy-hub:admin — 두 서비스 모두 canonical key 로 나온다', async () => {
    const { dataSource, calls } = makeDataSource([
      [{ role: 'kpa:operator' }, { role: 'pharmacy-hub:admin' }],
      [{ status: 'active' }], // kpa-society membership
      [{ status: 'active' }], // pharmacy-hub membership
    ]);

    const list = await resolveOperatorServices(dataSource, USER_X);

    expect(list.map((s) => [s.serviceKey, s.scope, s.workspaceAvailable])).toEqual([
      ['kpa-society', 'operator', true],
      ['pharmacy-hub', 'admin', true],
    ]);
    expect(norm(calls[0].sql)).toContain('role_assignments');
    expect(calls[0].params).toEqual([USER_X]);
    // membership 질의는 canonical key 로 (별칭 'kpa' 아님)
    expect(calls[1].params).toEqual([USER_X, 'kpa-society']);
    expect(calls[2].params).toEqual([USER_X, 'pharmacy-hub']);
  });

  it('role 만 있고 membership 이 active 가 아니면 운영 서비스가 아니다 (membership guard 와 동일 정책)', async () => {
    const { dataSource } = makeDataSource([
      [{ role: 'kpa:operator' }, { role: 'neture:operator' }],
      // membership 질의는 catalog(O4O_SERVICES) 순서: neture → kpa-society
      [{ status: 'active' }],    // neture
      [{ status: 'suspended' }], // kpa-society
    ]);
    const list = await resolveOperatorServices(dataSource, USER_X);
    expect(list.map((s) => s.serviceKey)).toEqual(['neture']);
    // neture 는 special 이지만 operator workspace 는 존재
    expect(list[0]).toMatchObject({ workspaceMode: 'special', workspaceAvailable: true });
  });

  it('platform:super_admin · store_owner · 미등록 prefix 는 운영 서비스로 잡히지 않는다', async () => {
    const { dataSource, calls } = makeDataSource([
      [{ role: 'platform:super_admin' }, { role: 'lms:admin' }],
    ]);
    const list = await resolveOperatorServices(dataSource, USER_X);
    expect(list).toEqual([]);
    expect(calls).toHaveLength(1); // membership 질의 없음
  });

  it('role 이 하나도 없으면 membership 질의 없이 빈 목록', async () => {
    const { dataSource, calls } = makeDataSource([[]]);
    expect(await resolveOperatorServices(dataSource, USER_X)).toEqual([]);
    expect(calls).toHaveLength(1);
  });
});
