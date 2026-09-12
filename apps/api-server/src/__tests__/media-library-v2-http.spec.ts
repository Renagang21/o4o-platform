import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { createMediaLibraryRouter } from '../modules/media/controllers/media-library.controller.js';

jest.mock('../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, res: any, next: () => void) => {
    const role = req.headers['x-test-role'];
    if (!role) {
      res.status(401).json({ success: false });
      return;
    }
    req.user = { id: '00000000-0000-4000-8000-000000000001', roles: [role] };
    next();
  },
}));
jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('Media V2 HTTP authorization and validation', () => {
  const app = express();
  app.use(express.json());
  app.use(createMediaLibraryRouter({} as DataSource));
  test('anonymous external creation is denied', async () => {
    expect(
      (await request(app).post('/media-library/external').send({})).status,
    ).toBe(401);
  });
  test.each(['neture:operator', 'supplier', 'not-a-platform:admin'])(
    'role %s cannot create catalog links or probe entity membership',
    async (role) => {
      expect(
        (
          await request(app)
            .post('/media-library/00000000-0000-4000-8000-000000000001/links')
            .set('x-test-role', role)
            .send({})
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app)
            .get('/media-library?entityType=product&entityId=other')
            .set('x-test-role', role)
        ).status,
      ).toBe(403);
    },
  );
  test('platform admin gets clear bad-input errors, not server errors', async () => {
    const res = await request(app)
      .post('/media-library/external')
      .set('x-test-role', 'platform:super_admin')
      .send({
        consent: true,
        provider: 'youtube',
        externalUrl: 'javascript:alert(1)',
        title: 'test',
      });
    expect(res.status).toBe(400);
    const bad = await request(app)
      .patch('/media-library/invalid/catalog')
      .set('x-test-role', 'platform:super_admin')
      .send([]);
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('INVALID_BODY');
  });
});
