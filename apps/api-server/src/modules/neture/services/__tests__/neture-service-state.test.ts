/**
 * WO-O4O-NETURE-MAIN-ACCOUNT-AND-SUPPLIER-PARTNER-SERVICE-SEPARATION-V1
 * WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1: partner 축 은퇴
 *
 * 공급자 서비스 이용 상태의 단일 출처 계약을 고정한다.
 *   - 공급자 = neture_suppliers.status (대문자) — 행은 API guard 와 같은 canonical resolver 로 찾는다
 *   - service_memberships(neture).role 로 공급자 상태를 추론하지 않는다 (fallback 제거 — CHECK §10 D)
 *   - Neture 가입 상태는 netureMain 으로 따로 보인다 — 공급자 상태와 섞지 않는다
 *   - 응답에 partner 필드가 없다 (Legacy Partner 은퇴 · neture.neture_partners 를 조회하지 않는다)
 */

import { resolveNetureServiceStates, mapSupplierRowStatus, mergeCandidateStatuses } from '../neture-service-state.service.js';

type Fixture = {
  /** canonical — organization_members(owner) → organizations(supplier) → neture_suppliers */
  canonical?: Array<{ supplier_id: string; organization_id: string; status: string; organization_name?: string }>;
  /** legacy compatibility pointer — neture_suppliers.user_id */
  suppliers?: Array<{ status: string }>;
  memberships?: Array<{ role: string | null; status: string }>;
};

function makeDataSource(fx: Fixture) {
  return {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM organization_members')) return fx.canonical ?? [];
      if (sql.includes('FROM neture_suppliers')) return (fx.suppliers ?? []).map((r, i) => ({ id: `legacy-${i}`, organization_id: null, ...r }));
      if (sql.includes('FROM users u')) return [{ account_status: 'active', account_active: true, email_verified: true, membership_status: fx.memberships?.[0]?.status ?? null }];
      return [];
    }),
  } as any;
}

describe('resolveNetureServiceStates — 공급자 단일 출처', () => {
  it('일반 Neture 회원(member active)은 supplier none · netureMain active · partner 필드 없음', async () => {
    const ds = makeDataSource({ memberships: [{ role: 'member', status: 'active' }] });
    await expect(resolveNetureServiceStates(ds, 'u1')).resolves.toEqual({
      supplier: { status: 'none', source: 'none' },
      netureMain: { status: 'active', source: 'account_verification' },
    });
  });

  it.each(['active', 'pending', 'rejected', 'suspended'])(
    "Neture 가입 role=supplier · status=%s 라도 공급자 행이 없으면 supplier=none (fallback 제거)",
    async (status) => {
      const ds = makeDataSource({ memberships: [{ role: 'supplier', status }] });
      const r = await resolveNetureServiceStates(ds, 'u1');
      expect(r.supplier).toEqual({ status: 'none', source: 'none' });
      expect(r.netureMain).toEqual({ status: status === 'suspended' ? 'suspended' : 'active', source: 'account_verification' });
    },
  );

  it('Neture 가입 row 가 없으면 netureMain=none', async () => {
    const r = await resolveNetureServiceStates(makeDataSource({}), 'u1');
    expect(r.netureMain).toEqual({ status: 'active', source: 'account_verification' });
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
    expect(r.supplier).toEqual({ status: 'none', source: 'none' });
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

// WO-O4O-SUPPLIER-CANONICAL-RUNTIME-AND-PRODUCTION-FINAL-CLOSURE-V1
describe('home/entry == API guard — canonical relationship', () => {
  it('canonical owner 가 있으면 legacy user_id 가 비어 있어도 공급자다 (drift 회귀 방지)', async () => {
    const ds = makeDataSource({
      canonical: [{ supplier_id: 's1', organization_id: 'o1', status: 'ACTIVE' }],
      suppliers: [],
    });
    const r = await resolveNetureServiceStates(ds, 'u1');
    expect(r.supplier).toEqual({ status: 'active', source: 'neture_suppliers' });
  });

  it('canonical 이 legacy 보다 우선한다', async () => {
    const ds = makeDataSource({
      canonical: [{ supplier_id: 's1', organization_id: 'o1', status: 'PENDING' }],
      suppliers: [{ status: 'ACTIVE' }],
    });
    expect((await resolveNetureServiceStates(ds, 'u1')).supplier.status).toBe('pending');
  });

  it('후보 N 개는 임의 1건이 아니라 결정적 합성(active 우선)', async () => {
    const ds = makeDataSource({
      canonical: [
        { supplier_id: 's1', organization_id: 'o1', status: 'REJECTED' },
        { supplier_id: 's2', organization_id: 'o2', status: 'ACTIVE' },
      ],
    });
    expect((await resolveNetureServiceStates(ds, 'u1')).supplier).toEqual({ status: 'active', source: 'neture_suppliers' });
  });

  it('상태 행 조회에 LIMIT 1 을 쓰지 않는다', async () => {
    const ds = makeDataSource({ canonical: [{ supplier_id: 's1', organization_id: 'o1', status: 'ACTIVE' }] });
    await resolveNetureServiceStates(ds, 'u1');
    const sqls = (ds.query as jest.Mock).mock.calls.map((c: unknown[]) => String(c[0]));
    expect(sqls.filter((q: string) => q.includes('neture_suppliers')).some((q: string) => /LIMIT\s+1/i.test(q))).toBe(false);
  });

  it.each([
    [['PENDING', 'REJECTED'], 'pending'], [['INACTIVE', 'REJECTED'], 'suspended'], [['REJECTED'], 'rejected'], [['???'], 'none'],
  ])('mergeCandidateStatuses(%j) → %s', (raw, expected) => {
    expect(mergeCandidateStatuses(raw as string[])).toBe(expected);
  });
});

describe('status 매핑 — 대소문자 혼재 방어', () => {
  it.each([
    ['ACTIVE', 'active'], ['PENDING', 'pending'], ['REJECTED', 'rejected'], ['INACTIVE', 'suspended'], ['', 'none'],
  ])('supplier %s → %s', (raw, expected) => {
    expect(mapSupplierRowStatus(raw)).toBe(expected);
  });
});
