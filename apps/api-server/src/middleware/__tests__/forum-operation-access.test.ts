jest.mock('../../database/connection.js', () => ({ AppDataSource: {} }));
jest.mock('../../utils/service-membership.js', () => ({ getServiceMembershipStatusFromDb: jest.fn() }));
import { getServiceMembershipStatusFromDb } from '../../utils/service-membership.js';
import { forumOperationAccess } from '../forum-operation-access.js';
const membership = getServiceMembershipStatusFromDb as jest.Mock;
async function access(tier: 'operator' | 'admin', service: string, roles: string[]) {
  const next = jest.fn(); const res: any = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res);
  await forumOperationAccess(tier)({ _serviceCode: service, user: { id: 'fixture', roles } } as any, res, next);
  return { res, next };
}
beforeEach(() => { membership.mockReset(); membership.mockResolvedValue('active'); });
it.each([['neture', 'neture'], ['kpa-society', 'kpa']])('keeps %s daily operation available while its hard delete requires %s admin', async (service, prefix) => {
  expect((await access('operator', service, [`${prefix}:operator`])).next).toHaveBeenCalled();
  expect((await access('admin', service, [`${prefix}:operator`])).res.status).toHaveBeenCalledWith(403);
  expect((await access('admin', service, [`${prefix}:admin`])).next).toHaveBeenCalled();
});
it('an unrelated service admin does not elevate an operator in this service', async () => {
  expect((await access('admin', 'neture', ['kpa:admin', 'neture:operator'])).res.status).toHaveBeenCalledWith(403);
});
it.each(['none', 'suspended', 'withdrawn', 'pending'])('inactive membership %s blocks both tiers', async status => {
  membership.mockResolvedValue(status);
  expect((await access('operator', 'neture', ['neture:operator'])).res.status).toHaveBeenCalledWith(403);
  expect((await access('admin', 'neture', ['neture:admin'])).res.status).toHaveBeenCalledWith(403);
});
it('membership read failure fails closed and the established platform exception stays explicit', async () => {
  membership.mockRejectedValue(new Error('unavailable'));
  expect((await access('admin', 'neture', ['neture:admin'])).res.status).toHaveBeenCalledWith(503);
  membership.mockClear();
  expect((await access('admin', 'neture', ['platform:super_admin'])).next).toHaveBeenCalled();
  expect(membership).not.toHaveBeenCalled();
});
