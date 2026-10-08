const query = jest.fn();
jest.mock('../../../database/connection.js', () => ({ AppDataSource: { query: (...args: unknown[]) => query(...args) } }));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: { getRoleNames: jest.fn(async () => ['neture:supplier']) } }));
jest.mock('../service-session-epoch.js', () => ({ readServiceSessionEpoch: jest.fn() }));
jest.mock('../../../utils/token.utils.js', () => ({}));
import { readUserMembershipsWithMainAccess, freshenUserContext } from '../auth-context.helper.js';

beforeEach(() => query.mockReset());
function fixture(emailVerified: boolean, mainStatus?: string) {
  query.mockImplementation(async (sql: string) => sql.includes('FROM users u')
    ? [{ account_status: 'active', account_active: true, email_verified: emailVerified, membership_status: mainStatus }]
    : [{ serviceKey: 'neture', status: mainStatus ?? 'pending' }, { serviceKey: 'pharmacy-hub', status: 'pending', role: 'member' }]);
}
describe('verified main eligibility in session snapshots', () => {
  it.each([undefined, 'pending', 'rejected'])('projects active without manual approval (%s) and preserves pending services', async (status) => {
    fixture(true, status);
    const memberships = await readUserMembershipsWithMainAccess('user-1');
    expect(memberships).toEqual([{ serviceKey: 'pharmacy-hub', status: 'pending', role: 'member' }, { serviceKey: 'neture', status: 'active', role: 'member' }]);
    expect(query.mock.calls.every(([sql]) => String(sql).trim().startsWith('SELECT'))).toBe(true);
  });
  it('does not elevate an unverified account', async () => {
    fixture(false);
    expect(await readUserMembershipsWithMainAccess('user-1')).toContainEqual({ serviceKey: 'neture', status: 'pending', role: 'member' });
  });
  it.each(['suspended', 'withdrawn'])('retains explicit main %s', async (status) => {
    fixture(true, status);
    expect(await readUserMembershipsWithMainAccess('user-1')).toContainEqual({ serviceKey: 'neture', status, role: 'member' });
  });
  it('freshens scoped roles without granting other services', async () => {
    fixture(true);
    expect(await freshenUserContext('user-1')).toEqual({ roles: ['neture:supplier'], memberships: [{ serviceKey: 'pharmacy-hub', status: 'pending', role: 'member' }, { serviceKey: 'neture', status: 'active', role: 'member' }] });
  });
});
