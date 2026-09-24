/**
 * WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §H
 *
 * canonical Supplier authorization 계약.
 *   canonical : user → organization_members(active) → organizations(type='supplier') → neture_suppliers
 *   legacy    : neture_suppliers.user_id (compatibility pointer · 경고 필수)
 *   1 User : N Supplier — 임의 선택 금지
 */
import type { DataSource } from 'typeorm';
import {
  resolveSupplierForUser,
  listSupplierCandidates,
  readOrganizationContext,
  SUPPLIER_WORK_MEMBER_ROLES,
} from '../supplier-context.resolver.js';
import logger from '../../../../utils/logger.js';

jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

const USER = 'u1';
const ORG_A = 'org-aaaa';
const ORG_B = 'org-bbbb';

const canonicalRow = (supplierId: string, orgId: string, status = 'ACTIVE', name = 'Org') => ({
  supplier_id: supplierId,
  organization_id: orgId,
  status,
  organization_name: name,
});

/** canonical(organization_members JOIN) / legacy(neture_suppliers.user_id) 질의를 구분하는 mock */
function ds(canonical: unknown[], legacy: unknown[] = []): DataSource {
  return {
    query: jest.fn(async (sql: string) => (sql.includes('organization_members') ? canonical : legacy)),
  } as unknown as DataSource;
}

beforeEach(() => {
  (logger.warn as jest.Mock).mockClear();
});

describe('readOrganizationContext — 기존 선례 재사용', () => {
  it('x-organization-id 헤더를 읽는다', () => {
    expect(readOrganizationContext({ headers: { 'x-organization-id': ORG_A } } as any)).toBe(ORG_A);
  });
  it('?organizationId= 도 읽는다', () => {
    expect(readOrganizationContext({ headers: {}, query: { organizationId: ORG_B } } as any)).toBe(ORG_B);
  });
  it('headers/query 가 없어도 안전하다 (내부 호출·단위테스트)', () => {
    expect(readOrganizationContext({} as any)).toBeNull();
    expect(readOrganizationContext(undefined as any)).toBeNull();
  });
});

describe('canonical resolve', () => {
  it('org membership 1개 → resolve 성공 (via=canonical)', async () => {
    const r = await resolveSupplierForUser(ds([canonicalRow('s1', ORG_A)]), USER, null);
    expect(r).toMatchObject({ kind: 'resolved', supplierId: 's1', organizationId: ORG_A, via: 'canonical' });
  });

  it('canonical 성공 시 legacy fallback 경고가 없다', async () => {
    await resolveSupplierForUser(ds([canonicalRow('s1', ORG_A)]), USER, null);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('canonical 이 legacy 보다 먼저다 — 둘 다 있으면 canonical 결과', async () => {
    const r = await resolveSupplierForUser(ds([canonicalRow('canonical-s', ORG_A)], [{ id: 'legacy-s', organization_id: ORG_B, status: 'ACTIVE' }]), USER, null);
    expect(r).toMatchObject({ supplierId: 'canonical-s', via: 'canonical' });
  });

  it('membership 0 + legacy 0 → none (→ NO_SUPPLIER)', async () => {
    expect(await resolveSupplierForUser(ds([], []), USER, null)).toEqual({ kind: 'none' });
  });

  it('PENDING 상태도 resolve 된다 (status 판정은 middleware 책임)', async () => {
    const r = await resolveSupplierForUser(ds([canonicalRow('s1', ORG_A, 'PENDING')]), USER, null);
    expect(r).toMatchObject({ kind: 'resolved', status: 'PENDING' });
  });

  it('candidates 질의는 owner role + left_at IS NULL + type=supplier 를 건다', async () => {
    const dataSource = ds([]);
    await listSupplierCandidates(dataSource, USER);
    const [sql, params] = (dataSource.query as jest.Mock).mock.calls[0];
    expect(sql).toContain('om.left_at IS NULL');
    expect(sql).toContain("o.type = 'supplier'");
    expect(sql).toContain('om.role = ANY');
    expect(params[1]).toEqual(SUPPLIER_WORK_MEMBER_ROLES);
    expect(sql).not.toMatch(/LIMIT\s+1/i); // 임의 선택 금지
  });
});

describe('1 User : N Supplier — 임의 선택 금지', () => {
  const two = [canonicalRow('s1', ORG_A, 'ACTIVE', 'A사'), canonicalRow('s2', ORG_B, 'ACTIVE', 'B사')];

  it('context 미지정 → context_required + candidates', async () => {
    const r = await resolveSupplierForUser(ds(two), USER, null);
    expect(r.kind).toBe('context_required');
    if (r.kind === 'context_required') {
      expect(r.candidates).toHaveLength(2);
      expect(r.candidates.map((c) => c.organizationId).sort()).toEqual([ORG_A, ORG_B].sort());
    }
  });

  it('내 org 지정 → 그 supplier 로 resolve', async () => {
    const r = await resolveSupplierForUser(ds(two), USER, ORG_B);
    expect(r).toMatchObject({ kind: 'resolved', supplierId: 's2', organizationId: ORG_B });
  });

  it('내 membership 밖 org 지정 → forbidden_context (스푸핑 차단)', async () => {
    const r = await resolveSupplierForUser(ds(two), USER, 'org-someone-else');
    expect(r).toEqual({ kind: 'forbidden_context', requestedOrganizationId: 'org-someone-else' });
  });

  it('후보 1개여도 다른 org 지정 시 forbidden', async () => {
    const r = await resolveSupplierForUser(ds([canonicalRow('s1', ORG_A)]), USER, ORG_B);
    expect(r.kind).toBe('forbidden_context');
  });
});

describe('legacy compatibility pointer', () => {
  it('canonical 0건 + legacy 1건 → resolve (via=legacy_user_id)', async () => {
    const r = await resolveSupplierForUser(ds([], [{ id: 'legacy-s', organization_id: ORG_A, status: 'ACTIVE' }]), USER, null);
    expect(r).toMatchObject({ kind: 'resolved', supplierId: 'legacy-s', via: 'legacy_user_id' });
  });

  it('legacy fallback 은 반드시 경고를 남긴다 (silent fallback 금지)', async () => {
    await resolveSupplierForUser(ds([], [{ id: 'legacy-s', organization_id: ORG_A, status: 'ACTIVE' }]), USER, null);
    const msgs = (logger.warn as jest.Mock).mock.calls.map((c) => String(c[0]));
    expect(msgs.some((m) => m.includes('LEGACY_SUPPLIER_USER_ID_FALLBACK'))).toBe(true);
  });

  it('legacy 가 여러 건이면 임의 선택하지 않고 none (경고 남김)', async () => {
    const r = await resolveSupplierForUser(
      ds([], [{ id: 'a', organization_id: ORG_A, status: 'ACTIVE' }, { id: 'b', organization_id: ORG_B, status: 'ACTIVE' }]),
      USER,
      null,
    );
    expect(r).toEqual({ kind: 'none' });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('legacy 경로에서도 다른 org 지정은 forbidden', async () => {
    const r = await resolveSupplierForUser(ds([], [{ id: 'legacy-s', organization_id: ORG_A, status: 'ACTIVE' }]), USER, ORG_B);
    expect(r.kind).toBe('forbidden_context');
  });

  it('organization_id 가 NULL 인 legacy supplier 도 resolve 된다 (현재 운영 상태)', async () => {
    const r = await resolveSupplierForUser(ds([], [{ id: 'legacy-s', organization_id: null, status: 'ACTIVE' }]), USER, null);
    expect(r).toMatchObject({ kind: 'resolved', organizationId: null, via: 'legacy_user_id' });
  });
});
