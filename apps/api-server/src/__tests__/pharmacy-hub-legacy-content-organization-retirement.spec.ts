import express from 'express';
import request from 'supertest';

jest.mock('../utils/store-owner.utils.js', () => ({
  isStoreOwner: jest.fn(async () => ({ isOwner: false, organizationId: null })),
}));
jest.mock('../modules/store-ai/services/content-ai-translation.service.js', () => ({ ContentTranslationService: class {} }));

import { createStoreContentController } from '../routes/o4o-store/controllers/store-content.controller.js';
import { createStoreLibraryFeedController } from '../routes/o4o-store/controllers/store-library-feed.controller.js';
import { KpaMember } from '../routes/kpa/entities/kpa-member.entity.js';
import { isStoreOwner } from '../utils/store-owner.utils.js';

const ORG = '11111111-1111-4111-8111-111111111111';
const SNAPSHOT = '22222222-2222-4222-8222-222222222222';

function setup(retired: boolean) {
  const content = { id: 'copy', title: 'saved', content_json: {}, organization_id: ORG };
  const repo = {
    findOne: jest.fn(async () => content),
    create: jest.fn((input: unknown) => input),
    save: jest.fn(async (input: unknown) => input),
  };
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('AS retired_store_identity')) return [{ retired_store_identity: retired, current_store_identity: !retired }];
    if (sql.includes('SELECT id FROM o4o_asset_snapshots')) return [{ id: SNAPSHOT }];
    return [];
  });
  const ds: any = {
    query,
    getRepository: (entity: unknown) => entity === KpaMember
      ? { findOne: jest.fn(async () => ({ organization_id: ORG })) }
      : repo,
  };
  const auth = (req: any, _res: unknown, next: () => void) => { req.user = { id: 'current-user' }; next(); };
  const app = express();
  app.use(express.json());
  app.use('/content', createStoreContentController(ds, auth));
  app.use('/feed', createStoreLibraryFeedController(ds, auth));
  return { app, query, repo };
}

beforeEach(() => {
  jest.mocked(isStoreOwner).mockResolvedValue({ isOwner: false, organizationId: null });
});

it('a legacy KPA relationship cannot create or edit content in a PH-only organization', async () => {
  const { app, query, repo } = setup(true);
  const res = await request(app).put(`/content/${SNAPSHOT}`).send({ title: 'new', contentJson: { html: '<p>new</p>' } });
  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe('NO_ORG');
  expect(repo.create).not.toHaveBeenCalled();
  expect(repo.save).not.toHaveBeenCalled();
  expect(query.mock.calls.some(([sql]) => sql.includes('o4o_asset_snapshots'))).toBe(false);
});

it('a PH-only legacy fallback cannot reopen current content reads', async () => {
  const { app } = setup(true);
  expect((await request(app).get(`/content/${SNAPSHOT}`)).status).toBe(403);
});

it('a PH-only legacy fallback yields an empty library feed without reading PH copies', async () => {
  const { app, query } = setup(true);
  const res = await request(app).get('/feed/contents');
  expect(res.status).toBe(200);
  expect(res.body.data).toMatchObject({ items: [], total: 0 });
  expect(query.mock.calls.some(([sql]) => sql.includes('o4o_asset_snapshots'))).toBe(false);
});

it('current legacy relationships retain content editing through the same route', async () => {
  const { app, repo } = setup(false);
  const res = await request(app).put(`/content/${SNAPSHOT}`).send({ title: 'new', contentJson: { html: '<p>new</p>' } });
  expect(res.status).toBe(200);
  expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ organization_id: ORG, title: 'new' }));
});

it('a resolved current Store takes precedence over the historical KPA fallback', async () => {
  const { app, repo, query } = setup(true);
  jest.mocked(isStoreOwner).mockResolvedValue({ isOwner: true, organizationId: ORG });
  expect((await request(app).put(`/content/${SNAPSHOT}`).send({ title: 'new', contentJson: { html: '<p>new</p>' } })).status).toBe(200);
  expect(repo.save).toHaveBeenCalled();
  expect(query.mock.calls.some(([sql]) => sql.includes('AS retired_store_identity'))).toBe(false);
});
