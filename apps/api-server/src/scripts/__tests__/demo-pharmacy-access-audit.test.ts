import { inspectDemoPharmacyAccess } from '../lib/demo-pharmacy-access-audit';

const USER = 'synthetic-user';
const ORG = '9c87f46b-0000-4000-8000-000000000000';
function fixture(overrides: Partial<Record<string, Record<string, unknown>[]>> = {}) {
  const state: Record<string, Record<string, unknown>[]> = {
    users: [{ id: USER }], memberships: [{ id: 'membership' }], owners: [{ organization_id: ORG }],
    others: [], pharmacies: [], conflicts: [], roles: [], ...overrides,
  };
  const query = jest.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes('FROM users')) return state.users;
    if (sql.includes('FROM service_memberships')) return state.memberships;
    if (sql.includes('JOIN users u')) return state.others;
    if (sql.includes('FROM organization_members om')) return state.owners;
    if (sql.includes('FROM organization_members')) return state.others;
    if (sql.includes('WHERE organization_id = $1')) return state.pharmacies;
    if (sql.includes('FROM neture_pharmacy_memberships')) return state.conflicts;
    if (sql.includes('FROM role_assignments')) return state.roles;
    throw new Error('Unexpected query');
  });
  return { query };
}
const writes = (db: ReturnType<typeof fixture>) => db.query.mock.calls.filter(([sql]) => sql.startsWith('INSERT'));

describe('canonical Demo pharmacy audit', () => {
  it('reports missing ledger and role without writing', async () => {
    const db = fixture();
    await expect(inspectDemoPharmacyAccess(db)).resolves.toEqual({ userId: USER, organizationId: ORG, createPharmacy: true, createRole: true });
    expect(writes(db)).toHaveLength(0);
    expect(db.query.mock.calls[0][0]).toContain("d.is_active = true");
  });
  it('reports fully provisioned state without writing', async () => {
    const db = fixture({ pharmacies: [{ status: 'active', applicant_user_id: USER }], roles: [{ id: 'role' }] });
    await expect(inspectDemoPharmacyAccess(db)).resolves.toMatchObject({ createPharmacy: false, createRole: false });
    expect(writes(db)).toHaveLength(0);
  });
  it.each([
    { users: [] }, { users: [{ id: USER }, { id: 'other' }] }, { memberships: [] },
    { owners: [] }, { owners: [{ organization_id: 'unrelated' }] },
    { owners: [{ organization_id: ORG }, { organization_id: 'other' }] },
    { others: [{ id: 'real-member' }] }, { conflicts: [{ id: 'other-ledger' }] },
    ...['pending', 'suspended', 'rejected', 'terminated'].map(status => ({ pharmacies: [{ status, applicant_user_id: USER }] })),
    { pharmacies: [{ status: 'active', applicant_user_id: 'other' }] },
  ])('refuses ambiguous or noncanonical state before any write: %j', async overrides => {
    const db = fixture(overrides);
    await expect(inspectDemoPharmacyAccess(db)).rejects.toThrow();
    expect(writes(db)).toHaveLength(0);
  });
});
