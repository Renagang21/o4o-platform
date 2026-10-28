import 'reflect-metadata';

const mockQuery = jest.fn();
const mockGetRepository = jest.fn();
jest.mock('../../../database/connection.js', () => ({ AppDataSource: {
  getRepository: (...args: unknown[]) => mockGetRepository(...args),
  query: (...args: unknown[]) => mockQuery(...args),
} }));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({ roleAssignmentService: {} }));
jest.mock('../../../utils/logger.js', () => ({ __esModule: true, default: { error: jest.fn() } }));
jest.mock('../../../services/auth/demo-account.service.js', () =>
  jest.requireActual('../../../__tests__/support/not-demo-account.js').notDemoAccountModule());

import { AdminUserController } from '../AdminUserController.js';

it('lists only current assignments without mutating historical DB rows or account status', async () => {
  const users = [{ id: 'current-user', status: 'suspended' }, { id: 'historical-user', status: 'active' }];
  const historicalRoles = ['platform:admin', 'kpa:pharmacist', 'platform:super_admin', 'kpa-branch:operator'];
  const builder: any = {};
  for (const method of ['orderBy', 'skip', 'take']) builder[method] = jest.fn(() => builder);
  builder.getManyAndCount = jest.fn(async () => [users, users.length]);
  mockGetRepository.mockReturnValue({ createQueryBuilder: () => builder });
  mockQuery.mockResolvedValue([
    { user_id: users[0].id, roles: historicalRoles },
    { user_id: users[1].id, roles: ['lms:instructor'] },
  ]);
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  await new AdminUserController().getUsers({ query: {} } as any, res);
  expect(res.status).not.toHaveBeenCalled();
  expect(res.json.mock.calls[0][0].users).toEqual([
    { ...users[0], roles: ['platform:super_admin', 'kpa-branch:operator'], role: 'platform:super_admin', centralDelegationRoles: [] },
    { ...users[1], roles: [], role: 'user', centralDelegationRoles: [] },
  ]);
  expect(historicalRoles).toHaveLength(4);
  expect(mockQuery).toHaveBeenCalledTimes(1);
  expect(mockQuery.mock.calls[0][0]).toMatch(/^SELECT/);
});
