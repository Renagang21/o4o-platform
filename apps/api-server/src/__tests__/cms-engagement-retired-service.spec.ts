import express from 'express';
import request from 'supertest';

jest.mock('../middleware/auth.middleware.js', () => ({
  optionalAuth: (_req: any, _res: any, next: any) => next(),
  authenticate: (req: any, _res: any, next: any) => { req.user = { id: 'fixture-user' }; next(); },
}));
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { error: jest.fn() } }));

import { createCmsContentEngagementRoutes } from '../routes/cms-content/cms-content-engagement.js';

const id = '11111111-1111-4111-8111-111111111111';
function fixture(serviceKey: string | null) {
  const query = jest.fn(async (sql: string) => {
    if (sql.startsWith('SELECT id, status')) return [{ id, status: 'published', serviceKey }];
    if (sql.startsWith('UPDATE cms_contents')) return [{ viewCount: 1 }];
    if (sql.startsWith('SELECT COUNT')) return [{ count: 1 }];
    return [];
  });
  const app = express();
  app.use(express.json(), createCmsContentEngagementRoutes({ dataSource: { query } as any }));
  return { app, query };
}

it.each(['pharmacy-hub', 'pharmacy-hub-event-offer', ' pharmacy-hub:legacy '])(
  'refuses view and recommendation writes for %s', async serviceKey => {
    for (const operation of ['view', 'recommend']) {
      const { app, query } = fixture(serviceKey);
      const response = await request(app).post(`/contents/${id}/${operation}`).send({});
      expect(response.status).toBe(410);
      expect(response.body.code).toBe('SERVICE_RETIRED');
      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][0]).toContain('"serviceKey"');
    }
  },
);

it.each(['neture', 'kpa-society', null])('preserves engagement for %s', async serviceKey => {
  const { app, query } = fixture(serviceKey);
  expect((await request(app).post(`/contents/${id}/view`).send({})).status).toBe(200);
  expect((await request(app).post(`/contents/${id}/recommend`).send({})).status).toBe(200);
  expect(query.mock.calls.some(([sql]) => sql.startsWith('UPDATE cms_contents'))).toBe(true);
  expect(query.mock.calls.some(([sql]) => sql.startsWith('INSERT INTO cms_content_recommendations'))).toBe(true);
});
