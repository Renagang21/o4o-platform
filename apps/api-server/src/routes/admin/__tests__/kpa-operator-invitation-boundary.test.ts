import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
jest.mock('../../../database/connection.js', () => ({ AppDataSource: {} }));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { assignRole: jest.fn(), removeRole: jest.fn() },
}));
jest.mock('../../../services/auth/demo-account.service.js', () =>
  jest
    .requireActual('../../../__tests__/support/not-demo-account.js')
    .notDemoAccountModule(),
);
jest.mock('../../../services/email.service.js', () => ({ emailService: {} }));
jest.mock('../../../services/NotificationService.js', () => ({
  notificationService: {},
}));
import { createMemberController } from '../../kpa/controllers/member.controller.js';
import { roleAssignmentService } from '../../../modules/auth/services/role-assignment.service.js';
const ID = '00000000-0000-4000-8000-000000000001';
const save = jest.fn(async (v: any) => v);
const repo = {
  findOne: jest.fn(async () => ({ id: ID, user_id: ID, role: 'member' })),
  save,
};
const app = express();
app.use(express.json());
const pass = (req: any, _res: any, next: any) => {
  req.user = {
    id: '00000000-0000-4000-8000-000000000002',
    roles: ['kpa:admin'],
  };
  next();
};
app.use(
  '/members',
  createMemberController(
    { getRepository: () => repo } as any,
    pass,
    () => pass,
  ),
);
beforeEach(() => jest.clearAllMocks());
it.each(['operator', 'admin'])(
  'KPA legacy route cannot grant %s before email acceptance',
  async (role) => {
    const res = await request(app)
      .patch('/members/' + ID + '/role')
      .send({ role });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('OPERATOR_INVITATION_REQUIRED');
    expect(save).not.toHaveBeenCalled();
    expect(roleAssignmentService.assignRole).not.toHaveBeenCalled();
  },
);
