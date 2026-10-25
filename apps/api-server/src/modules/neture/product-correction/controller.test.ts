import express from 'express';
import request from 'supertest';

jest.mock('../../../common/middleware/auth/authentication.middleware.js', () => {
  const authenticate = (req: any, res: any, next: any) => {
    if (!req.headers['x-test-user']) return res.status(401).json({ code: 'AUTH_REQUIRED' });
    req.user = { id: req.headers['x-test-user'] };
    next();
  };
  return {
    authenticate,
    requireAuth: authenticate,
    authenticateToken: authenticate,
    authenticateCookie: authenticate,
  };
});
jest.mock('../../auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    hasAnyRole: jest.fn(
      async (id: string, roles: string[]) => id === 'platform' && roles.includes('platform:super_admin'),
    ),
  },
}));
import { createProductCorrectionController } from '../controllers/product-correction.controller.js';

const query = jest.fn(async () => []);
const app = express();
app.use(express.json());
app.use('/correction', createProductCorrectionController({ query } as never));
describe('상품 보정 관리자 API 권한·입력 경계', () => {
  beforeEach(() => query.mockClear());
  it.each(['get', 'post'] as const)(
    '%s denies unauthenticated requests before database access',
    async (method) => {
      const result = await request(app)[method]('/correction/rules');
      expect(result.status).toBe(401);
      expect(query).not.toHaveBeenCalled();
    },
  );
  it.each(['neture-admin', 'cosmetics-operator', 'legacy-admin'])(
    'denies %s for reads and writes',
    async (user) => {
      for (const method of ['get', 'post'] as const) {
        const result = await request(app)[method]('/correction/rules').set('x-test-user', user).send({});
        expect(result.status).toBe(403);
      }
      expect(query).not.toHaveBeenCalled();
    },
  );
  it('allows platform superadmin reads', async () => {
    expect((await request(app).get('/correction/rules').set('x-test-user', 'platform')).status).toBe(200);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed rules and identifiers without SQL', async () => {
    expect(
      (
        await request(app)
          .post('/correction/rules')
          .set('x-test-user', 'platform')
          .send({ title: 'incomplete' })
      ).status,
    ).toBe(400);
    expect(
      (await request(app).get('/correction/batches/not-uuid').set('x-test-user', 'platform')).status,
    ).toBe(400);
    expect(
      (await request(app).get('/correction/batches?page=-1').set('x-test-user', 'platform')).status,
    ).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
  it.each([
    '/correction/operations',
    '/correction/runs',
    '/correction/batches/00000000-0000-4000-8000-000000000001/items/00000000-0000-4000-8000-000000000002/versions',
  ])('guards new read path %s before SQL', async (path) => {
    expect((await request(app).get(path).set('x-test-user', 'neture-admin')).status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });
  it.each([
    '/correction/rules/00000000-0000-4000-8000-000000000001/runs',
    '/correction/runs/00000000-0000-4000-8000-000000000001/retry',
  ])('guards new write path %s before SQL', async (path) => {
    expect((await request(app).post(path).set('x-test-user', 'legacy-admin').send({})).status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });
  it.each([
    ['get', '/correction/periodic/dashboard'],
    ['get', '/correction/renewals'],
    ['get', '/correction/renewals/renewal-id'],
    ['get', '/correction/renewals/renewal-id/versions'],
    ['patch', '/correction/renewals/renewal-id'],
    ['get', '/correction/bulk'],
    ['get', '/correction/bulk/00000000-0000-4000-8000-000000000001/controls'],
    ['post', '/correction/bulk'],
    ['get', '/correction/bulk/00000000-0000-4000-8000-000000000001/pages'],
    ['post', '/correction/bulk/00000000-0000-4000-8000-000000000001/control'],
    ['post', '/correction/bulk/00000000-0000-4000-8000-000000000001/step'],
    ['get', '/correction/schedules'],
    ['get', '/correction/rules/00000000-0000-4000-8000-000000000001/schedule'],
    ['put', '/correction/rules/00000000-0000-4000-8000-000000000001/schedule'],
    ['get', '/correction/notices'],
    ['post', '/correction/notices/notice-id/acknowledge'],

    ['get', '/correction/proposals'],
    ['get', '/correction/proposals/00000000-0000-4000-8000-000000000001'],
    ['get', '/correction/proposals/00000000-0000-4000-8000-000000000001/attempts'],
    [
      'get',
      '/correction/batches/00000000-0000-4000-8000-000000000001/items/00000000-0000-4000-8000-000000000002/change-context',
    ],
    [
      'get',
      '/correction/batches/00000000-0000-4000-8000-000000000001/items/00000000-0000-4000-8000-000000000002/proposals',
    ],
    [
      'post',
      '/correction/batches/00000000-0000-4000-8000-000000000001/items/00000000-0000-4000-8000-000000000002/proposals',
    ],
    ['get', '/correction/proposals/00000000-0000-4000-8000-000000000001/versions'],
    ['post', '/correction/proposals/00000000-0000-4000-8000-000000000001/review'],
    ['post', '/correction/proposals/00000000-0000-4000-8000-000000000001/apply'],
  ])('guards selective apply %s %s before database access', async (method, path) => {
    for (const user of [undefined, 'neture-admin', 'legacy-admin']) {
      let req = request(app)[method as 'get' | 'post' | 'put' | 'patch'](path);
      if (user) req = req.set('x-test-user', user);
      expect((await req.send({})).status).toBe(user ? 403 : 401);
    }
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects unknown operation filters and incomplete inspection inputs', async () => {
    expect(
      (await request(app).get('/correction/operations?filter=invalid').set('x-test-user', 'platform')).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/correction/rules/00000000-0000-4000-8000-000000000001/runs')
          .set('x-test-user', 'platform')
          .send({ scope: { page: 1 } })
      ).status,
    ).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
});
