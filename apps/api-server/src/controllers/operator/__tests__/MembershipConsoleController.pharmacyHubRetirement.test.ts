import express from 'express';
import request from 'supertest';

const mockQuery = jest.fn();
const mockAssign = jest.fn();
const mockRemove = jest.fn();
const mockGetRole = jest.fn();
const mockGetAllRoles = jest.fn();
const mockCreateRole = jest.fn();
const mockApprove = jest.fn();
const mockReactivate = jest.fn();
jest.mock('../../../database/connection.js', () => ({ AppDataSource: {
  isInitialized: false, query: (...args: any[]) => mockQuery(...args), getRepository: jest.fn(),
} }));
jest.mock('../../../services/auth/demo-account.service.js', () =>
  jest.requireActual('../../../__tests__/support/not-demo-account.js').notDemoAccountModule());
jest.mock('../../../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: {
  assignRole: (...args: any[]) => mockAssign(...args), removeRole: (...args: any[]) => mockRemove(...args), getRoleNames: jest.fn(),
} }));
jest.mock('../../../modules/auth/services/role.service.js', () => ({ roleService: {
  getRoleByName: (...args: any[]) => mockGetRole(...args), getAllRoles: () => mockGetAllRoles(),
  getRolesByService: () => mockGetAllRoles(), createRole: (...args: any[]) => mockCreateRole(...args),
} }));
jest.mock('../../../modules/auth/utils/role-cache.js', () => ({ invalidateRoles: jest.fn() }));
jest.mock('../../../services/approval/MembershipApprovalService.js', () => ({
  MembershipApprovalService: jest.fn(() => ({ approveMembership: (...args: any[]) => mockApprove(...args), reactivateMembership: (...args: any[]) => mockReactivate(...args) })),
}));

import { MembershipConsoleController } from '../MembershipConsoleController.js';
import { RoleController } from '../RoleController.js';
import { ServiceRetiredError } from '../../../utils/service-retirement.js';

const USER = '11111111-1111-4111-8111-111111111111';
const phRole = { name: 'pharmacy-hub:store_owner', serviceKey: 'pharmacy-hub', isAssignable: true, toJSON() { return { name: this.name }; } };
const currentRole = { name: 'cosmetics:member', serviceKey: 'cosmetics', isAssignable: true, toJSON() { return { name: this.name }; } };

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).user = { id: 'platform-admin', roles: ['platform:super_admin'] };
    (req as any).serviceScope = { isPlatformAdmin: true, serviceKeys: [], rolePrefixes: [] };
    next();
  });
  const members = new MembershipConsoleController();
  const roles = new RoleController();
  app.get('/roles', roles.getRoles);
  app.get('/roles/:name', roles.getRoleByName);
  app.post('/roles', roles.createRole);
  app.post('/members/:userId/roles', members.assignMemberRole);
  app.delete('/members/:userId/roles/:role', members.removeMemberRole);
  app.patch('/members/:membershipId/approve', members.approveMembership);
  app.patch('/members/:userId/status', members.updateMemberStatus);
  app.post('/members/:userId/reactivate', members.reactivateMember);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockResolvedValue([{ ok: 1 }]);
  mockAssign.mockResolvedValue({ id: 'assignment' });
  mockRemove.mockResolvedValue(true);
  mockGetRole.mockResolvedValue(phRole);
  mockGetAllRoles.mockResolvedValue([phRole, currentRole]);
  mockApprove.mockRejectedValue(new ServiceRetiredError());
  mockReactivate.mockRejectedValue(new ServiceRetiredError());
});

it('PH is excluded from the assignment catalog, including an explicit platform-admin filter', async () => {
  for (const url of ['/roles', '/roles?service=pharmacy-hub']) {
    const res = await request(makeApp()).get(url);
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: any) => r.name)).not.toContain(phRole.name);
  }
});

it.each(['pharmacy-hub:admin', 'pharmacy-hub:operator', 'pharmacy-hub:store_owner', 'store_owner'])('platform admin cannot assign PH role or its catalog alias: %s', async role => {
  const res = await request(makeApp()).post(`/members/${USER}/roles`).send({ role });
  expect(res.status).toBe(410);
  expect(res.body.code).toBe('SERVICE_RETIRED');
  expect(mockAssign).not.toHaveBeenCalled();
});

it('current roles remain assignable and historical PH identity reads and revocation remain available', async () => {
  mockGetRole.mockResolvedValue(currentRole);
  expect((await request(makeApp()).post(`/members/${USER}/roles`).send({ role: currentRole.name })).status).toBe(200);
  expect(mockAssign).toHaveBeenCalledWith(expect.objectContaining({ role: currentRole.name }));
  mockGetRole.mockResolvedValue(phRole);
  expect((await request(makeApp()).get('/roles/pharmacy-hub:store_owner')).status).toBe(200);
  expect((await request(makeApp()).delete(`/members/${USER}/roles/pharmacy-hub:store_owner`)).status).toBe(200);
  expect(mockRemove).toHaveBeenCalled();
});

it('a retired role definition cannot be recreated', async () => {
  const res = await request(makeApp()).post('/roles').send({ name: phRole.name, displayName: 'PH', serviceKey: 'pharmacy-hub', roleKey: 'store_owner' });
  expect(res.status).toBe(410);
  expect(mockCreateRole).not.toHaveBeenCalled();
});

it('PH approval and reactivation service errors are returned as 410', async () => {
  expect((await request(makeApp()).patch('/members/old-membership/approve')).status).toBe(410);
  expect((await request(makeApp()).post(`/members/${USER}/reactivate`).send({ serviceKey: 'pharmacy-hub' })).status).toBe(410);
});

it.each(['approved', 'active'])('an explicit PH %s status request is rejected before any membership or account query', async status => {
  const res = await request(makeApp()).patch(`/members/${USER}/status`).send({ status, serviceKey: 'pharmacy-hub' });
  expect(res.status).toBe(410);
  expect(res.body.code).toBe('SERVICE_RETIRED');
  expect(mockQuery).not.toHaveBeenCalled();
  expect(mockApprove).not.toHaveBeenCalled();
  expect(mockReactivate).not.toHaveBeenCalled();
});
