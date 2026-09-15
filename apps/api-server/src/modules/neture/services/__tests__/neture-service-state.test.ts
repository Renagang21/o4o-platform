/**
 * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1
 * WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1: partner 축 은퇴
 *
 * 공급자 서비스 이용 상태의 단일 출처 계약을 고정한다.
 *   - 공급자 = neture_suppliers.status (대문자)
 *   - 서비스 행이 없을 때만 service_memberships(neture).role 이 supplier 인 경우 fallback
 *   - Neture 회원(member) 이라는 사실만으로는 'none'
 *   - 응답에 partner 필드가 없다 (Legacy Partner 은퇴 · neture.neture_partners 를 조회하지 않는다)
 */

import { resolveNetureServiceStates, mapSupplierRowStatus } from '../neture-service-state.service.js';

type Fixture = {
  suppliers?: Array<{ status: string }>;
  memberships?: Array<{ role: string | null; status: string }>;
};

function makeDataSource(fx: Fixture) {
  return {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM neture_suppliers')) return fx.suppliers ?? [];
      if (sql.includes('FROM service_memberships')) return fx.memberships ?? [];
      return [];
    }),
  } as any;
}

describe('resolveNetureServiceStates — 공급자 단일 출처', () => {
  it('일반 Neture 회원(member active)은 supplier none · partner 필드 없음', async () => {
    const ds = makeDataSource({ memberships: [{ role: 'member', status: 'active' }] });
    await expect(resolveNetureServiceStates(ds, 'u1')).resolves.toEqual({
      supplier: { status: 'none', source: 'none' },
    });
  });

  it('공급자 ACTIVE 행이 있으면 supplier=active', async () => {
    const ds = makeDataSource({
      suppliers: [{ status: 'ACTIVE' }],
      memberships: [{ role: 'supplier', status: 'active' }],
    });
    const r = await resolveNetureServiceStates(ds, 'u1');
    expect(r.supplier).toEqual({ status: 'active', source: 'neture_suppliers' });
  });

  it('공급자 정지(INACTIVE) → suspended', async () => {
    const ds = makeDataSource({
      suppliers: [{ status: 'INACTIVE' }],
      memberships: [{ role: 'supplier', status: 'active' }],
    });
    const r = await resolveNetureServiceStates(ds, 'u1');
    expect(r.supplier.status).toBe('suspended');
  });

  it('legacy membership role=partner 는 어떤 서비스 상태도 만들지 않는다 (Partner 은퇴)', async () => {
    const ds = makeDataSource({ memberships: [{ role: 'partner', status: 'pending' }] });
    const r = await resolveNetureServiceStates(ds, 'u1');
    expect(r).toEqual({ supplier: { status: 'none', source: 'none' } });
    expect((r as Record<string, unknown>).partner).toBeUndefined();
  });

  it('neture.neture_partners 를 조회하지 않는다', async () => {
    const ds = makeDataSource({});
    await resolveNetureServiceStates(ds, 'u1');
    const sqls = (ds.query as jest.Mock).mock.calls.map((c: unknown[]) => String(c[0]));
    expect(sqls.some((q: string) => q.includes('neture_partners'))).toBe(false);
  });

  it('서비스 행이 있으면 membership 보다 서비스 행이 우선한다', async () => {
    const ds = makeDataSource({
      suppliers: [{ status: 'REJECTED' }],
      memberships: [{ role: 'supplier', status: 'active' }],
    });
    const r = await resolveNetureServiceStates(ds, 'u1');
    expect(r.supplier).toEqual({ status: 'rejected', source: 'neture_suppliers' });
  });

  it('membership rejected(role=supplier) 는 supplier=rejected', async () => {
    const ds = makeDataSource({ memberships: [{ role: 'supplier', status: 'rejected' }] });
    const r = await resolveNetureServiceStates(ds, 'u1');
    expect(r.supplier.status).toBe('rejected');
  });

  it('userId 가 비어 있으면 조회 없이 none', async () => {
    const ds = makeDataSource({});
    await resolveNetureServiceStates(ds, '');
    expect(ds.query).not.toHaveBeenCalled();
  });

  it('조회 실패는 삼키지 않는다', async () => {
    const ds = { query: jest.fn(async () => { throw new Error('db down'); }) } as any;
    await expect(resolveNetureServiceStates(ds, 'u1')).rejects.toThrow('db down');
  });
});

describe('status 매핑 — 대소문자 혼재 방어', () => {
  it.each([
    ['ACTIVE', 'active'], ['PENDING', 'pending'], ['REJECTED', 'rejected'], ['INACTIVE', 'suspended'], ['', 'none'],
  ])('supplier %s → %s', (raw, expected) => {
    expect(mapSupplierRowStatus(raw)).toBe(expected);
  });
});
