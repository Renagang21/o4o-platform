import { findApprovedStoreMemberCandidates, resolveApprovedStoreMemberOrganization } from '../utils/store-member-access.js';
import { resolveStoreServices, resolveAccessibleStores } from '../utils/service-tenant.resolver.js';
import { findAnyServiceStoreOrganizationCandidates } from '../utils/store-organization.resolver.js';

jest.mock('../utils/store-organization.resolver.js', () => ({ findAnyServiceStoreOrganizationCandidates: jest.fn(async () => []) }));
const owned = jest.mocked(findAnyServiceStoreOrganizationCandidates);
const staffRow = { organization_id: 'store-a' };
beforeEach(() => owned.mockResolvedValue([]));

describe('approved staff scope', () => {
  it('no staff access is inferred for an unrelated or retired service', async () => {
    const query = jest.fn();
    expect(await findApprovedStoreMemberCandidates({ query } as any, 'staff', 'cosmetics')).toEqual([]);
    expect(await findApprovedStoreMemberCandidates({ query } as any, '')).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
  it('explicit foreign selection is denied rather than redirected to the first store', async () => {
    const ds = { query: jest.fn(async () => [staffRow]) } as any;
    expect(await resolveApprovedStoreMemberOrganization(ds, 'staff', 'kpa', 'store-b')).toBeNull();
    expect(await resolveApprovedStoreMemberOrganization(ds, 'staff', 'kpa', 'store-a')).toBe('store-a');
  });
  it('multiple approved stores require a selection', async () => {
    const ds = { query: jest.fn(async () => [staffRow, { organization_id: 'store-b' }]) } as any;
    expect(await resolveApprovedStoreMemberOrganization(ds, 'staff', 'kpa')).toBeNull();
    expect(await resolveApprovedStoreMemberOrganization(ds, 'staff', 'kpa', 'store-b')).toBe('store-b');
  });
  it('the query requires active staff, live permission and an approved pharmacy; pending invitations are excluded', async () => {
    const query = jest.fn(async () => [staffRow]);
    await findApprovedStoreMemberCandidates({ query } as any, 'session-user', 'kpa');
    const [sql, params] = query.mock.calls[0] as unknown as [string, string[]];
    expect(params).toEqual(['session-user']);
    expect(sql).toContain("om.left_at IS NULL AND om.role = 'staff'");
    expect(sql).toContain("pm.status = 'active'");
    expect(sql).toContain("ra.role = 'kpa:store_member' AND ra.is_active = true");
  });
  it('staff store listed by the selector also resolves its services, then loses both after revocation', async () => {
    let active = true;
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("ra.role = 'cafe24-b2b:store_member'")) return [];
      if (sql.includes('JOIN neture_pharmacy_memberships')) return active ? [staffRow] : [];
      if (sql.includes("status <> 'active'")) return [];
      if (sql.includes('FROM organizations')) return [{ id: 'store-a', name: '합성 매장' }];
      if (sql.includes('FROM organization_service_enrollments')) return [{ organization_id: 'store-a', service_code: 'kpa-society', status: 'active' }];
      throw new Error(sql);
    });
    const ds = { query } as any;
    expect(await resolveAccessibleStores(ds, 'staff')).toEqual([{ organizationId: 'store-a', organizationName: '합성 매장', memberRole: 'staff' }]);
    expect(await resolveStoreServices(ds, { userId: 'staff', organizationId: 'store-a' })).toMatchObject({ status: 'resolved', organizationId: 'store-a' });
    active = false;
    expect(await resolveAccessibleStores(ds, 'staff')).toEqual([]);
    expect(await resolveStoreServices(ds, { userId: 'staff', organizationId: 'store-a' })).toMatchObject({ status: 'none', organizationId: null });
  });
});


it('active Cafe24 staff remain in the selector and service resolution without gaining pharmacy access', async () => {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes("ra.role = 'cafe24-b2b:store_member'")) return [{ organization_id: 'cafe-store' }];
    if (sql.includes('JOIN neture_pharmacy_memberships')) return [];
    if (sql.includes("status <> 'active'")) return [];
    if (sql.includes('FROM organizations')) return [{ id: 'cafe-store', name: '합성 외부 매장' }];
    if (sql.includes('FROM organization_service_enrollments')) return [{ organization_id: 'cafe-store', service_code: 'cafe24-b2b', status: 'active' }];
    throw new Error(sql);
  });
  const ds = { query } as any;
  expect(await resolveAccessibleStores(ds, 'staff')).toEqual([{ organizationId: 'cafe-store', organizationName: '합성 외부 매장', memberRole: 'staff' }]);
  expect(await resolveStoreServices(ds, { userId: 'staff', organizationId: 'cafe-store' })).toMatchObject({ status: 'resolved', organizationId: 'cafe-store' });
  expect(await resolveApprovedStoreMemberOrganization(ds, 'staff', 'kpa', 'cafe-store')).toBeNull();
});
