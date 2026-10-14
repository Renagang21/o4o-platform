import { createRequireStoreWorkspaceAccess } from '../store-workspace-access.js';
import { resolveApprovedStoreMemberOrganization } from '../store-member-access.js';
import { createRequireStoreOwner } from '../store-owner.utils.js';
jest.mock('../store-member-access.js', () => ({ resolveApprovedStoreMemberOrganization: jest.fn() }));
jest.mock('../store-owner.utils.js', () => ({ createRequireStoreOwner: jest.fn() }));
const member = jest.mocked(resolveApprovedStoreMemberOrganization);
const owner = jest.mocked(createRequireStoreOwner);
function response() { const res: any = {}; res.status = jest.fn(() => res); res.json = jest.fn(() => res); return res; }
beforeEach(() => { jest.clearAllMocks(); member.mockResolvedValue(null); });
describe('operational access keeps owner management distinct', () => {
  it('approved staff can work without an owner role or personal pharmacy membership', async () => {
    const ownerGuard = jest.fn(); owner.mockReturnValue(ownerGuard);
    member.mockResolvedValue('11111111-1111-4111-8111-111111111111');
    const req: any = { user: { id: 'staff', roles: [] }, headers: { 'x-store-organization-id': '11111111-1111-4111-8111-111111111111' } };
    const next = jest.fn(); const res = response();
    await createRequireStoreWorkspaceAccess({} as any, 'kpa')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1); expect(ownerGuard).not.toHaveBeenCalled();
    expect(req.authContext).toMatchObject({ organizationId: '11111111-1111-4111-8111-111111111111', memberRole: 'staff' });
  });
  it('revocation blocks a session that still has the old member role', async () => {
    owner.mockReturnValue(async (_req, res) => { res.status(403).json({ code: 'STORE_OWNER_REQUIRED' }); });
    const req: any = { user: { id: 'staff', roles: ['kpa:store_member'] }, headers: { 'x-store-organization-id': '11111111-1111-4111-8111-111111111111' } };
    const res = response(); const next = jest.fn();
    await createRequireStoreWorkspaceAccess({} as any, 'kpa')(req, res, next);
    expect(next).not.toHaveBeenCalled(); expect(res.status).toHaveBeenCalledWith(403);
  });
  it('an owner guard cannot substitute another store for an explicit selection', async () => {
    owner.mockReturnValue(async (req, _res, next) => { req.organizationId = '11111111-1111-4111-8111-111111111111'; next(); });
    const req: any = { user: { id: 'owner', roles: [] }, headers: { 'x-store-organization-id': '22222222-2222-4222-8222-222222222222' } };
    const res = response(); const next = jest.fn();
    await createRequireStoreWorkspaceAccess({} as any, 'kpa')(req, res, next);
    expect(next).not.toHaveBeenCalled(); expect(res.status).toHaveBeenCalledWith(403);
  });
  it('a database failure reaches the error handler instead of allowing or hanging a request', async () => {
    owner.mockReturnValue(jest.fn());
    const error = new Error('database unavailable'); member.mockRejectedValue(error);
    const next = jest.fn(); const res = response();
    await createRequireStoreWorkspaceAccess({} as any, 'kpa')({ user: { id: 'staff' }, headers: {} } as any, res, next);
    expect(next).toHaveBeenCalledWith(error); expect(res.json).not.toHaveBeenCalled();
  });
});
