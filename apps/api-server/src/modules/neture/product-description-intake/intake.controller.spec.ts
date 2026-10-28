import express from 'express';
import request from 'supertest';
jest.mock('../../../common/middleware/auth/authentication.middleware.js', () => {
  const authenticate = (req: any, res: any, next: any) => { if (!req.headers['x-test-user']) return res.status(401).json({ code: 'AUTH_REQUIRED' }); req.user = { id: req.headers['x-test-user'] }; next(); };
  return { authenticate, requireAuth: authenticate, authenticateToken: authenticate, authenticateCookie: authenticate };
});
jest.mock('../../auth/services/role-assignment.service.js', () => ({ roleAssignmentService: { hasAnyRole: jest.fn(async (id: string, roles: string[]) => id === 'platform' && roles.includes('platform:super_admin')) } }));
import { createDescriptionIntakeController } from './intake.controller.js';
const query = jest.fn(), repository = jest.fn();
const app = express(); app.use(express.json()); app.use('/intake', createDescriptionIntakeController({ query, getRepository: repository } as never));
describe('description intake platform authority', () => {
 beforeEach(() => { query.mockClear(); repository.mockClear(); });
 it.each(['get', 'post'] as const)('blocks unauthenticated %s and service operators before SQL', async method => {
  expect((await request(app)[method]('/intake')).status).toBe(401);
  expect((await request(app)[method]('/intake').set('x-test-user', 'neture-admin')).status).toBe(403);
  expect(query).not.toHaveBeenCalled(); expect(repository).not.toHaveBeenCalled();
 });
 it('does not persist empty descriptions or preview requests', async () => {
  const body = { entries: [{ key: 'synthetic', name: 'Synthetic product', content: '<p>&nbsp;</p>', source: { kind: 'manufacturer', currentness: 'retrieved', references: [{ url: 'https://example.com/product' }] } }] };
  for (const path of ['/intake', '/intake/preview']) {
   const r = await request(app).post(path).set('x-test-user', 'platform').send(body);
   expect(r.status).toBe(200); expect(r.body.data).toMatchObject({ items: [], excludedEmpty: 1 });
  }
  expect(query).not.toHaveBeenCalled(); expect(repository).not.toHaveBeenCalled();
 });
 it('rejects forged fields, identifiers and stale-token formats before service mutation', async () => {
  expect((await request(app).post('/intake/not-uuid/approve').set('x-test-user', 'platform').send({})).status).toBe(400);
  expect((await request(app).post('/intake/preview').set('x-test-user', 'platform').send({ entries: [], isAdmin: true })).status).toBe(400);
  expect(query).not.toHaveBeenCalled(); expect(repository).not.toHaveBeenCalled();
 });
});
