const query = jest.fn();
jest.mock('../../database/connection.js', () => ({ AppDataSource: { query: (...args: any[]) => query(...args) } }));
import { memberManagementPolicy, requireActiveOperatorScope } from '../member-management-policy.middleware.js';

function check(method: string, path: string, body: any, roles = ['neture:operator'], keys = ['neture']) {
  const req: any = { method, path, body, query: {}, user: { roles }, serviceScope: { serviceKeys: keys, rolePrefixes: keys, isPlatformAdmin: roles.includes('platform:super_admin') } };
  const res: any = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res);
  const next = jest.fn(); memberManagementPolicy(req, res, next);
  return { req, res, next };
}

it.each([['DELETE', '/u', {}], ['POST', '/u/reactivate', {}], ['PATCH', '/u/status', { status: 'suspended' }], ['POST', '/batch-status', { status: 'suspended' }], ['PUT', '/u', { membershipRole: 'member' }], ['POST', '/u/roles', { role: 'neture:member' }]])('operator cannot perform %s %s', (method, path, body) => {
  const { res, next } = check(method, path, body);
  expect(res.status).toHaveBeenCalledWith(403); expect(next).not.toHaveBeenCalled();
});
it.each([['PATCH', '/m/approve', {}], ['PATCH', '/m/reject', {}], ['GET', '/u', {}], ['PUT', '/u', { nickname: 'fixture' }], ['PATCH', '/u/status', { status: 'approved' }]])('operator retains %s %s', (method, path, body) => {
  const { req, next } = check(method, path, body);
  expect(next).toHaveBeenCalledTimes(1); expect(req.memberManagementApprovalOnly).toBe(true);
});
it('admin of another service cannot restrict the selected service', () => {
  const { res, next } = check('PATCH', '/u/status', { status: 'suspended', serviceKey: 'neture' }, ['neture:operator', 'pharmacy-hub:admin'], ['neture', 'pharmacy-hub']);
  expect(res.status).toHaveBeenCalledWith(403); expect(next).not.toHaveBeenCalled();
});
it.each(['neture:admin', 'platform:super_admin'])('%s can administer selected membership', role => {
  const { req, next } = check('POST', '/u/reactivate', { serviceKey: 'neture' }, [role]);
  expect(next).toHaveBeenCalledTimes(1); expect(req.memberManagementApprovalOnly).toBe(false);
});

it('active DB membership narrows mixed operator scope despite a stale active token', async () => {
  query.mockResolvedValue([{ service_key: 'neture' }]);
  const req: any = { user: { id: 'actor' }, serviceScope: { isPlatformAdmin: false, serviceKeys: ['neture', 'kpa-society'], rolePrefixes: ['neture', 'kpa'] } };
  const next = jest.fn(); const res: any = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res);
  await requireActiveOperatorScope(req, res, next);
  expect(req.serviceScope.serviceKeys).toEqual(['neture']); expect(req.serviceScope.rolePrefixes).toEqual(['neture']);
  expect(next).toHaveBeenCalledTimes(1);
});
it.each([false, true])('inactive membership or DB failure is fail-closed (%s)', async fails => {
  query.mockReset(); if (fails) query.mockRejectedValue(new Error('fixture')); else query.mockResolvedValue([]);
  const req: any = { user: { id: 'actor' }, serviceScope: { isPlatformAdmin: false, serviceKeys: ['neture'], rolePrefixes: ['neture'] } };
  const next = jest.fn(); const res: any = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res);
  await requireActiveOperatorScope(req, res, next);
  expect(next).not.toHaveBeenCalled(); expect(res.status).toHaveBeenCalledWith(fails ? 503 : 403);
});

it.each([['neture', 'neture'], ['kpa-society', 'kpa'], ['k-cosmetics', 'cosmetics'], ['pharmacy-hub', 'pharmacy-hub'], ['kpa-branch', 'kpa-branch'], ['community', 'community'], ['lecture', 'lecture'], ['supplier', 'supplier'], ['funding', 'funding']])('%s lifecycle privilege follows the correct %s role namespace', (serviceKey, prefix) => {
  expect(check('PATCH', '/u/status', { status: 'suspended', serviceKey }, [`${prefix}:operator`], [serviceKey]).res.status).toHaveBeenCalledWith(403);
  expect(check('PATCH', '/u/status', { status: 'suspended', serviceKey }, [`${prefix}:admin`], [serviceKey]).next).toHaveBeenCalledTimes(1);
});


it.each(['pharmacy-hub:member'])('a forged serviceKey cannot authorize role assignment in an operator-only service (%s)', role => {
  const { res, next } = check('POST', '/u/roles', { role, serviceKey: 'neture' }, ['neture:admin', 'pharmacy-hub:operator'], ['neture', 'pharmacy-hub']);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});
