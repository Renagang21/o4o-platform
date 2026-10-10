import { resolveCommunityWorkspace } from '../community-workspace.service.js';
jest.mock('../../../modules/neture/services/neture-main-membership.js', () => ({ getNetureMainMembershipStatus: jest.fn(async () => 'active') }));
jest.mock('../../../modules/neture-pharmacy/services/semi-franchise-community-access.js', () => ({ resolveSemiFranchiseCommunityAccess: jest.fn(), resolveSemiFranchiseBusinessAccess: jest.fn() }));
import { resolveSemiFranchiseBusinessAccess, resolveSemiFranchiseCommunityAccess } from '../../../modules/neture-pharmacy/services/semi-franchise-community-access.js';
const access = resolveSemiFranchiseCommunityAccess as jest.Mock;
describe('service-owned business participant navigation preserves authorization and ledger', () => {
  beforeEach(() => access.mockReset());
  it.each([true, false])('returns the owning business without widening access (%s)', async allowed => {
    access.mockResolvedValue({ semiFranchise: true, semiFranchiseKey: 'pharmacy', allowed });
    const exec = { query: jest.fn(async (sql: string) => sql.startsWith('SELECT id, key, name') ? [{ id: 'immutable-business-id', key: 'pharmacy', name: '협력사업', status: 'active' }] : []) };
    const workspace = await resolveCommunityWorkspace(exec as never, { id: 'user' }, 'existing-community-key');
    expect(workspace).toMatchObject({ communityKey: 'existing-community-key', kind: 'semi-franchise', businessKey: 'pharmacy', allowed, canManage: false, canJoin: false, forumStorageCodes: ['sf:immutable-business-id'] });
    expect(access).toHaveBeenCalledWith(exec, 'user', 'existing-community-key');
    expect(exec.query.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
  });
});


describe('native business namespace without legacy community configuration', () => {
  it.each([true, false])('preserves approval and immutable storage (%s)', async allowed => {
    (resolveSemiFranchiseBusinessAccess as jest.Mock).mockResolvedValue({ semiFranchise: true, semiFranchiseKey: 'pharmacy', allowed });
    const exec = { query: jest.fn(async (sql: string) => sql.startsWith('SELECT id, key, name') ? [{ id: 'immutable-business-id', key: 'pharmacy', name: '협력사업', status: 'active' }] : []) };
    const workspace = await resolveCommunityWorkspace(exec as never, { id: 'user' }, 'business:pharmacy');
    expect(workspace).toMatchObject({ kind: 'semi-franchise', businessKey: 'pharmacy', allowed, canManage: false, canJoin: false, forumStorageCodes: ['sf:immutable-business-id'] });
    expect(resolveSemiFranchiseBusinessAccess).toHaveBeenCalledWith(exec, 'user', 'pharmacy');
    expect(exec.query.mock.calls[0][0]).toContain('WHERE key = $1');
    expect(exec.query.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
  });
  it('unknown business namespaces never fall through to an independent community', async () => {
    const exec = { query: jest.fn(async () => []) };
    expect(await resolveCommunityWorkspace(exec as never, { id: 'user' }, 'business:missing')).toBeNull();
    expect(exec.query).toHaveBeenCalledTimes(1);
  });
});
