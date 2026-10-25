import express from 'express';
import request from 'supertest';
const create = jest.fn(async () => ({ id: 'invite', status: 'pending' }));
const accept = jest.fn(async () => ({
  serviceKey: 'lecture',
  role: 'lecture:operator',
}));
jest.mock('../../../database/connection.js', () => ({ AppDataSource: {} }));
jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {},
}));
jest.mock(
  '../../../services/admin/service-operator-invitation.service.js',
  () => ({
    ...jest.requireActual(
      '../../../services/admin/service-operator-invitation.service.js',
    ),
    serviceOperatorInvitationService: {
      create: (...a: any[]) => create(...(a as [])),
      accept: (...a: any[]) => accept(...(a as [])),
      inspect: jest.fn(),
      list: jest.fn(async () => []),
      manage: jest.fn(),
    },
  }),
);
jest.mock('../../../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, res: any, next: any) => {
    const role = req.headers['x-fixture-role'];
    if (!role) return res.status(401).json({ code: 'AUTH_REQUIRED' });
    req.user = { id: 'fixture-user', roles: [role] };
    next();
  },
  requireRole: (roles: string[]) => (req: any, res: any, next: any) =>
    req.user.roles.some((r: string) => roles.includes(r))
      ? next()
      : res.status(403).json({ code: 'FORBIDDEN' }),
}));
jest.mock('../../../middleware/rateLimiter.js', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
}));
import {
  adminServiceOperatorInvitations,
  serviceOperatorInvitationAcceptance,
} from '../service-operator-invitations.routes.js';
const app = express();
app.use(express.json());
app.use('/admin', adminServiceOperatorInvitations);
app.use('/invitations', serviceOperatorInvitationAcceptance);
beforeEach(() => jest.clearAllMocks());
describe('operator invitation HTTP boundary', () => {
  it('requires authentication for listing and accepting', async () => {
    expect((await request(app).get('/admin')).status).toBe(401);
    expect(
      (
        await request(app)
          .post('/invitations/accept')
          .send({ token: 'a'.repeat(64) })
      ).status,
    ).toBe(401);
    expect(accept).not.toHaveBeenCalled();
  });
  it('does not let service operators issue invitations', async () => {
    expect(
      (
        await request(app)
          .post('/admin')
          .set('x-fixture-role', 'lecture:operator')
          .send({
            email: 'new@example.com',
            serviceKey: 'lecture',
            role: 'lecture:operator',
          })
      ).status,
    ).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });
  it('accepts a valid admin request as pending, not an active role', async () => {
    const res = await request(app)
      .post('/admin')
      .set('x-fixture-role', 'platform:super_admin')
      .send({
        email: 'new@example.com',
        serviceKey: 'lecture',
        role: 'lecture:operator',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    expect(create).toHaveBeenCalledWith({
      email: 'new@example.com',
      serviceKey: 'lecture',
      role: 'lecture:operator',
      targetUserId: undefined,
      actorId: 'fixture-user',
    });
  });
  it('does not allow GET or malformed token bodies to consume mail proofs', async () => {
    expect(
      (
        await request(app)
          .get('/invitations/accept')
          .set('x-fixture-role', 'lecture:member')
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post('/invitations/accept')
          .set('x-fixture-role', 'lecture:member')
          .send({ token: { bad: 'object' } })
      ).status,
    ).toBe(400);
    expect(accept).not.toHaveBeenCalled();
  });
  it('uses the session user ID, never a caller-supplied acceptance target', async () => {
    await request(app)
      .post('/invitations/accept')
      .set('x-fixture-role', 'lecture:member')
      .send({ token: 'a'.repeat(64), userId: 'forged-user' });
    expect(accept).toHaveBeenCalledWith('a'.repeat(64), 'fixture-user');
  });
});
