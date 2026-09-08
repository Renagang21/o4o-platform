/**
 * WO-O4O-WORK-SCOPE-STORE-RESOLUTION-V0
 *
 * Work Scope 의 매장 identity 해석 계약을 고정한다. DB 없음 — `DataSource.query` 를
 * stub 으로 대체해 **어떤 질의를 어떤 파라미터로 던지는지**까지 검사한다.
 *
 * 특히 고정하려는 것:
 *   - 판정 순서(membership → 매장 후보). membership 이 없으면 매장 질의를 **하지 않는다**.
 *   - 후보 질의는 항상 serviceKey 로 스코프된다(다른 서비스 매장 leakage 0).
 *   - 후보가 2개 이상이면 첫 번째를 고르지 않는다(ambiguous).
 *   - resolved 가 아니면 organizationId/storeId 는 null 이다(fallback 금지).
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import { resolveWorkScopeStore } from '../utils/work-scope-store-resolution.js';

type Row = Record<string, unknown>;

/** query 호출을 순서대로 큐에서 꺼내 응답하고, 각 호출의 SQL/params 를 기록한다. */
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

const ACTIVE = [{ status: 'active' }];
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

describe('resolveWorkScopeStore — 매장 scope 해석 (read-only)', () => {
  it('1. service membership 이 없으면 none 이고, 매장 질의를 하지 않는다', async () => {
    const { dataSource, calls } = makeDataSource([[]]); // membership row 없음

    const result = await resolveWorkScopeStore(dataSource, {
      userId: 'user-1',
      serviceKey: 'kpa-society',
      workspace: 'store',
    });

    expect(result.status).toBe('none');
    expect(result.reason).toBe('NO_SERVICE_MEMBERSHIP');
    expect(result.organizationId).toBeNull();
    expect(result.storeId).toBeNull();
    // membership 질의 1건만. 매장 후보를 보지 않았다.
    expect(calls).toHaveLength(1);
    expect(norm(calls[0].sql)).toContain('service_memberships');
  });

  it('1-b. membership 이 active 가 아니면(pending) none 이다', async () => {
    const { dataSource, calls } = makeDataSource([[{ status: 'pending' }]]);

    const result = await resolveWorkScopeStore(dataSource, {
      userId: 'user-1',
      serviceKey: 'kpa-society',
      workspace: 'store',
    });

    expect(result.status).toBe('none');
    expect(result.reason).toBe('NO_SERVICE_MEMBERSHIP');
    expect(calls).toHaveLength(1);
  });

  it('2. 접근 가능한 매장이 0개면 none / NO_ACCESSIBLE_STORE', async () => {
    const { dataSource } = makeDataSource([ACTIVE, []]);

    const result = await resolveWorkScopeStore(dataSource, {
      userId: 'user-1',
      serviceKey: 'kpa-society',
      workspace: 'store',
    });

    expect(result.status).toBe('none');
    expect(result.reason).toBe('NO_ACCESSIBLE_STORE');
    expect(result.organizationId).toBeNull();
    expect(result.storeId).toBeNull();
  });

  it('3. 매장이 정확히 1개면 resolved 이고 organizationId === storeId', async () => {
    const { dataSource } = makeDataSource([
      ACTIVE,
      [{ organization_id: 'org-1', role: 'owner' }],
    ]);

    const result = await resolveWorkScopeStore(dataSource, {
      userId: 'user-1',
      serviceKey: 'kpa-society',
      workspace: 'store',
    });

    expect(result).toEqual({
      status: 'resolved',
      serviceKey: 'kpa-society',
      workspace: 'store',
      organizationId: 'org-1',
      storeId: 'org-1',
      reason: null,
    });
  });

  it('4. 매장이 2개 이상이면 ambiguous — 첫 번째를 고르지 않는다', async () => {
    const { dataSource } = makeDataSource([
      ACTIVE,
      [
        { organization_id: 'org-1', role: 'owner' },
        { organization_id: 'org-2', role: 'manager' },
      ],
    ]);

    const result = await resolveWorkScopeStore(dataSource, {
      userId: 'user-1',
      serviceKey: 'kpa-society',
      workspace: 'store',
    });

    expect(result.status).toBe('ambiguous');
    expect(result.reason).toBe('MULTIPLE_ACCESSIBLE_STORES');
    // 후보가 있었지만 어느 것도 새어나가지 않는다.
    expect(result.organizationId).toBeNull();
    expect(result.storeId).toBeNull();
  });

  it('5. 매장 후보 질의는 요청 서비스로 스코프된다 (다른 서비스 매장 노출 0)', async () => {
    const { dataSource, calls } = makeDataSource([
      ACTIVE,
      [{ organization_id: 'org-1', role: 'owner' }],
    ]);

    await resolveWorkScopeStore(dataSource, {
      userId: 'user-1',
      serviceKey: 'kpa-society',
      workspace: 'store',
    });

    const candidateCall = calls[1];
    const sql = norm(candidateCall.sql);
    // 서비스 귀속 조건이 쿼리에 실제로 들어간다.
    expect(sql).toContain('organization_service_enrollments');
    expect(sql).toContain('platform_store_slugs');
    // kpa-society → role prefix 'kpa' 의 linkage 값이 파라미터로 전달된다.
    expect(candidateCall.params).toContain('user-1');
    const flat = JSON.stringify(candidateCall.params);
    expect(flat).toContain('kpa-society');
    // 서비스 조건 없는 back-compat 경로(전 서비스 매장)를 타지 않았다.
    expect(sql).toContain('organization_service_enrollments');
  });

  it('5-b. cosmetics 는 canonical(k-cosmetics)로 정규화되어 판정된다', async () => {
    const { dataSource, calls } = makeDataSource([
      ACTIVE,
      [{ organization_id: 'org-9', role: 'owner' }],
    ]);

    // role prefix 공간으로 들어와도 canonical 로 정규화된다.
    const result = await resolveWorkScopeStore(dataSource, {
      userId: 'user-1',
      serviceKey: 'cosmetics',
      workspace: 'store',
    });

    expect(result.serviceKey).toBe('k-cosmetics');
    expect(result.status).toBe('resolved');
    // membership 조회는 canonical 키로 나간다.
    expect(calls[0].params).toEqual(['user-1', 'k-cosmetics']);
  });

  it('6. userId 는 인자로 받은 값만 쓴다 (client spoof 불가 — 질의 파라미터 고정)', async () => {
    const { dataSource, calls } = makeDataSource([
      ACTIVE,
      [{ organization_id: 'org-1', role: 'owner' }],
    ]);

    await resolveWorkScopeStore(dataSource, {
      userId: 'session-user',
      serviceKey: 'kpa-society',
      workspace: 'store',
    });

    // 모든 질의가 세션 사용자 id 로만 나간다.
    expect(calls[0].params[0]).toBe('session-user');
    expect(calls[1].params[0]).toBe('session-user');
  });

  it('7. 알 수 없는 serviceKey 는 fail-closed (membership 없음으로 차단)', async () => {
    const { dataSource, calls } = makeDataSource([[]]);

    const result = await resolveWorkScopeStore(dataSource, {
      userId: 'user-1',
      serviceKey: 'not-a-real-service',
      workspace: 'store',
    });

    expect(result.status).toBe('none');
    expect(result.reason).toBe('NO_SERVICE_MEMBERSHIP');
    expect(calls).toHaveLength(1);
  });

  it('7-b. 매장 축이 없는 서비스(neture)는 STORE_IDENTITY_NOT_SUPPORTED 이고 매장 질의를 하지 않는다', async () => {
    const { dataSource, calls } = makeDataSource([ACTIVE]);

    const result = await resolveWorkScopeStore(dataSource, {
      userId: 'user-1',
      serviceKey: 'neture',
      workspace: 'store',
    });

    expect(result.status).toBe('none');
    expect(result.reason).toBe('STORE_IDENTITY_NOT_SUPPORTED');
    expect(result.organizationId).toBeNull();
    // membership 만 확인하고 멈춘다 — 서비스 조건 없는 매장 조회로 넘어가지 않는다.
    expect(calls).toHaveLength(1);
  });

  it('8. store 축이 아닌 workspace 는 질의를 전혀 하지 않는다', async () => {
    for (const workspace of ['home', 'community', 'operator', 'admin', 'supplier', 'partner']) {
      const { dataSource, calls } = makeDataSource([ACTIVE, []]);

      const result = await resolveWorkScopeStore(dataSource, {
        userId: 'user-1',
        serviceKey: 'kpa-society',
        workspace,
      });

      expect(result.status).toBe('none');
      expect(result.reason).toBe('WORKSPACE_NOT_STORE_SCOPED');
      expect(result.organizationId).toBeNull();
      expect(calls).toHaveLength(0);
    }
  });

  it('read-only: 어떤 경로에서도 write 질의를 만들지 않는다', async () => {
    const { dataSource, calls } = makeDataSource([
      ACTIVE,
      [{ organization_id: 'org-1', role: 'owner' }],
    ]);

    await resolveWorkScopeStore(dataSource, {
      userId: 'user-1',
      serviceKey: 'kpa-society',
      workspace: 'store',
    });

    for (const { sql } of calls) {
      expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|UPSERT|ALTER|DROP|CREATE)\b/i);
      expect(norm(sql).toUpperCase()).toMatch(/^SELECT/);
    }
  });
});
