import express from 'express';
import request from 'supertest';
import { createCommunityImprovementRoutes } from '../community-improvements.routes.js';
import { createImprovement, replyImprovement, setupImprovements } from '../../services/community/community-improvements.js';
import { assertCentralOperationRequest } from '../../services/admin/central-operation-menu-grants.js';
import { CommunityManagementError } from '../../services/community/community-management.service.js';
jest.mock('../../database/connection.js', () => ({ AppDataSource: { transaction: jest.fn(run => run({ query: jest.fn() })) } }));
jest.mock('../../services/community/community-improvements.js', () => ({ listImprovements: jest.fn(async () => ({ ready: true, items: [] })), getImprovement: jest.fn(), setupImprovements: jest.fn(async () => ({ id: 'board' })), createImprovement: jest.fn(async () => ({ id: 'post' })), replyImprovement: jest.fn(async () => ({ id: 'post' })), editImprovement: jest.fn() }));
jest.mock('../../services/community/community-management.service.js', () => {
  const actual = jest.requireActual('../../services/community/community-management.service.js');
  return { ...actual, requireCommunityManager: jest.fn(async () => undefined) };
});
jest.mock('../../services/admin/central-operation-menu-grants.js', () => ({ assertCentralOperationRequest: jest.fn(async () => undefined) }));
jest.mock('../../middleware/rateLimiter.js', () => ({ apiLimiter: (_req: unknown, _res: unknown, next: () => void) => next() }));
function app() {
  const a = express(); a.use(express.json());
  const optional: express.RequestHandler = (req, _res, next) => { if (req.headers['x-user']) { (req as any).user = { id: 'session-user' }; (req as any).authMethod = req.headers['x-method']; } next(); };
  const auth: express.RequestHandler = (req, res, next) => optional(req, res, () => (req as any).user ? next() : res.sendStatus(401));
  a.use('/communities', createCommunityImprovementRoutes(optional, auth, async req => req.user ? { id: req.user.id, roles: [], memberships: [] } : null));
  return a;
}
beforeEach(() => jest.clearAllMocks());
it('allows guest public lists but refuses unauthenticated writes and management filters', async () => {
  expect((await request(app()).get('/communities/community/improvements')).status).toBe(200);
  expect((await request(app()).get('/communities/community/improvements?pending=true')).status).toBe(401);
  expect((await request(app()).post('/communities/community/improvements').send({})).status).toBe(401);
});
it.each(['/setup', '/p/replies'])('requires Google proof for official management %s', async suffix => {
  const r = await request(app()).post('/communities/community/improvements' + suffix).set('x-user', 'yes').set('x-method', 'email').send({ official: true });
  expect(r.status).toBe(403); expect(setupImprovements).not.toHaveBeenCalled(); expect(replyImprovement).not.toHaveBeenCalled();
});
it('refuses undelegated Google management and never falls back to a member write', async () => {
  (assertCentralOperationRequest as jest.Mock).mockRejectedValueOnce(new CommunityManagementError(403, 'CENTRAL_MENU_NOT_DELEGATED', 'denied'));
  const r = await request(app()).post('/communities/community/improvements').set('x-user', 'yes').set('x-method', 'google').send({ kind: 'update', userId: 'forged' });
  expect(r.status).toBe(403); expect(createImprovement).not.toHaveBeenCalled();
});
it('binds member writes to session identity rather than a supplied userId', async () => {
  const r = await request(app()).post('/communities/community/improvements').set('x-user', 'yes').set('x-method', 'email').send({ kind: 'bug', userId: 'forged' });
  expect(r.status).toBe(201); expect(createImprovement).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'session-user' }), expect.anything());
});
