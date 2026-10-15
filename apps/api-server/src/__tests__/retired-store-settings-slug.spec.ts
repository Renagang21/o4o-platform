import express from 'express';
import request from 'supertest';

const mockFindBySlug = jest.fn();
jest.mock('@o4o/platform-core/store-identity', () => ({
  StoreSlugService: class { findBySlug(slug: string) { return mockFindBySlug(slug); } },
}));

import { createKpaStoreTemplateController } from '../routes/o4o-store/controllers/kpa-store-template.controller.js';
import { createStoreSettingsController } from '../routes/o4o-store/controllers/store-settings.controller.js';
import { createLayoutController } from '../routes/o4o-store/controllers/layout.controller.js';

const endpoints = [
  ['get', '/fixture/settings', {}], ['patch', '/fixture/settings', { theme: 'modern' }],
  ['get', '/fixture/channels', {}], ['patch', '/fixture/channels/B2C', {}],
  ['get', '/fixture/template', {}], ['put', '/fixture/template', { templateProfile: 'BASIC' }],
  ['get', '/fixture/layout', {}], ['put', '/fixture/layout', { blocks: [{ type: 'HERO', enabled: true }] }],
] as const;

function fixture(serviceKey: string) {
  mockFindBySlug.mockResolvedValue({ storeId: 'fixture-org', isActive: true, serviceKey });
  const org = { id: 'fixture-org', name: 'Fixture', isActive: true, created_by_user_id: 'fixture-user', template_profile: 'BASIC', storefront_config: {}, storefront_blocks: [] };
  const repo = { findOne: jest.fn(async () => org), update: jest.fn() };
  const query = jest.fn(async (sql: string) => sql.includes('FROM organizations') ? [org] : []);
  const ds = { query, getRepository: () => repo } as any;
  const auth = (req: any, _res: any, next: any) => { req.user = { id: 'fixture-user' }; next(); };
  const app = express();
  app.use(express.json(), createKpaStoreTemplateController(ds, auth), createStoreSettingsController(ds, auth), createLayoutController(ds, auth));
  return { app, repo, query };
}

it.each(['pharmacy-hub', 'pharmacy-hub-event-offer', ' pharmacy-hub:legacy '])(
  'refuses settings/template/layout access through a stored %s slug before reading or writing the organization', async serviceKey => {
    for (const [method, path, body] of endpoints) {
      const { app, repo, query } = fixture(serviceKey);
      const response = await (request(app) as any)[method](path).send(body);
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('STORE_NOT_FOUND');
      expect(repo.findOne).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
      expect(query).not.toHaveBeenCalled();
    }
  },
);

it('preserves public KPA settings, template and layout reads', async () => {
  const { app } = fixture('kpa');
  for (const path of ['/fixture/settings', '/fixture/channels', '/fixture/template', '/fixture/layout']) {
    expect((await request(app).get(path)).status).toBe(200);
  }
});
