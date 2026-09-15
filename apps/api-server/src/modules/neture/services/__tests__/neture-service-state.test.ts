/**
 * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1
 *
 * 공급자 · 파트너 서비스 이용 상태의 단일 출처 계약을 고정한다.
 *   - 공급자 = neture_suppliers.status (대문자) · 파트너 = neture.neture_partners.status (소문자)
 *   - 서비스 행이 없을 때만 service_memberships(neture).role 이 supplier/partner 인 경우 fallback
 *   - Neture 회원(member) 이라는 사실만으로는 두 서비스 모두 'none'
 *   - 한 서비스의 상태가 다른 서비스로 전파되지 않는다
 */

import {
  resolveNetureServiceStates,
  mapSupplierRowStatus,
  mapPartnerRowStatus,
} from '../neture-service-state.service.js';

type Fixture = {
  suppliers?: Array<{ status: string }>;
  partners?: Array<{ status: string }>;
  memberships?: Array<{ role: string | null; status: string }>;
};

function makeDataSource(fx: Fixture) {
  return {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM neture_suppliers')) return fx.suppliers ?? [];
      if (sql.includes('FROM neture.neture_partners')) return fx.partners ?? [];
      if (sql.includes('FROM service_memberships')) return fx.memberships ?? [];
      return [];
    }),
  } as any;
}

describe('resolveNetureServiceStates — 서비스별 단일 출처', () => {
  it('일반 Neture 회원(member active)은 공급자 · 파트너 모두 none', async () => {
    const ds = makeDataSource({ memberships: [{ role: 'member', status: 'active' }] });
    await expect(resolveNetureServiceStates(ds, 'u1')).resolves.toEqual({
      supplier: { status: 'none', source: 'none' },
      partner: { status: 'none', source: 'none' },
    });
  });

  it('공급자 ACTIVE 행이 있으면 supplier=active, partner 는 영향 없음', async () => {
    const ds = makeDataSource({
      suppliers: [{ status: 'ACTIVE' }],
      memberships: [{ role: 'supplier', status: 'active' }],
    });
    const r = await resolveNetureServiceStates(ds, 'u1');
    expect(r.supplier).toEqual({ status: 'active', source: 'neture_suppliers' });
    expect(r.partner).toEqual({ status: 'none', source: 'none' });
  });

  it('공급자 정지(INACTIVE) + 파트너 active 는 서로 전파되지 않는다', async () => {
    const ds = makeDataSource({
      suppliers: [{ status: 'INACTIVE' }],
      partners: [{ status: 'active' }],
      memberships: [{ role: 'supplier', status: 'active' }],
    });
    const r = await resolveNetureServiceStates(ds, 'u1');
    expect(r.supplier.status).toBe('suspended');
    expect(r.partner.status).toBe('active');
  });

  it('서비스 행이 없고 membership role=partner pending 이면 partner=pending (legacy fallback)', async () => {
    const ds = makeDataSource({ memberships: [{ role: 'partner', status: 'pending' }] });
    const r = await resolveNetureServiceStates(ds, 'u1');
    expect(r.partner).toEqual({ status: 'pending', source: 'service_memberships' });
    expect(r.supplier.status).toBe('none');
  });

  it('서비스 행이 있으면 membership 보다 서비스 행이 우선한다', async () => {
    const ds = makeDataSource({
      suppliers: [{ status: 'REJECTED' }],
      memberships: [{ role: 'supplier', status: 'active' }],
    });
    const r = await resolveNetureServiceStates(ds, 'u1');
    expect(r.supplier).toEqual({ status: 'rejected', source: 'neture_suppliers' });
  });

  it('membership rejected(role=supplier) 는 supplier=rejected 이고 partner 는 none', async () => {
    const ds = makeDataSource({ memberships: [{ role: 'supplier', status: 'rejected' }] });
    const r = await resolveNetureServiceStates(ds, 'u1');
    expect(r.supplier.status).toBe('rejected');
    expect(r.partner.status).toBe('none');
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
  it.each([
    ['active', 'active'], ['ACTIVE', 'active'], ['pending', 'pending'], ['rejected', 'rejected'],
    ['suspended', 'suspended'], ['inactive', 'suspended'], [null, 'none'],
  ])('partner %s → %s', (raw, expected) => {
    expect(mapPartnerRowStatus(raw as string | null)).toBe(expected);
  });
});
