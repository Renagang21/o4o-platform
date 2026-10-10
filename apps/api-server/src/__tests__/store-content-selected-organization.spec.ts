import express from 'express';
import request from 'supertest';
import { isStoreOwner } from '../utils/store-owner.utils.js';
import { resolveKpaContentAccess, resolveKpaContentOrganization } from '../routes/o4o-store/controllers/kpa-content-organization.js';
import { createAssetSnapshotController } from '../routes/o4o-store/controllers/asset-snapshot.controller.js';
import { createStoreContentController } from '../routes/o4o-store/controllers/store-content.controller.js';
import { createStoreLibraryFeedController } from '../routes/o4o-store/controllers/store-library-feed.controller.js';
import { createStoreAssetControlController } from '../routes/o4o-store/controllers/store-asset-control.controller.js';
import { AssetCopyService } from '../../../../packages/asset-copy-core/src/services/asset-copy.service.js';
import { createDirectContent, updateDirectContent } from '../services/store/store-content.service.js';

jest.mock('../utils/store-owner.utils.js', () => ({ isStoreOwner: jest.fn() }));
jest.mock('@o4o/asset-copy-core', () => jest.requireActual('../../../../packages/asset-copy-core/src/index.ts'), { virtual: true });
jest.mock('../modules/asset-snapshot/resolvers/kpa-asset.resolver.js', () => ({ KpaAssetResolver: class {} }));
jest.mock('../modules/store-ai/services/content-ai-translation.service.js', () => ({ ContentTranslationService: class {} }));
jest.mock('../services/store/store-content.service.js', () => ({
  createDirectContent: jest.fn(async (_ds, organizationId) => ({ ok: true, data: { organizationId } })),
  updateDirectContent: jest.fn(async (_ds, organizationId) => ({ ok: true, data: { organizationId } })),
  listStoreContents: jest.fn(async () => []),
}));

const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const FOREIGN = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const owner = isStoreOwner as jest.Mock;
function access(organizationId: string | null, status = 'resolved', isOwner = true) {
  return { isOwner, organizationId, memberRole: 'owner', pendingAgreement: null,
    resolution: { status, organizationId, memberRole: 'owner', candidateCount: status === 'ambiguous' ? 2 : organizationId ? 1 : 0 } };
}
function database() {
  const repo = { findOne: jest.fn().mockResolvedValue({ organization_id: 'association' }), create: jest.fn(x => x), save: jest.fn(async x => x) };
  const query = jest.fn(async (sql: string, params: unknown[]) => {
    if (sql.startsWith('SELECT id FROM o4o_asset_snapshots')) return params[1] === A ? [{ id: params[0] }] : [];
    return /count\(/i.test(sql) ? [{ total: 0 }] : [];
  });
  return { ds: { getRepository: jest.fn(() => repo), query } as any, repo, query };
}
function appFor(ds: any, authenticated = true) {
  const app = express(); app.use(express.json());
  const auth: express.RequestHandler = (req: any, _res, next) => { if (authenticated) req.user = { id: 'synthetic-user', roles: ['neture:store_owner'] }; next(); };
  app.use('/assets', createAssetSnapshotController(ds, auth));
  app.use('/contents', createStoreContentController(ds, auth));
  app.use('/library', createStoreLibraryFeedController(ds, auth));
  app.use('/controls', createStoreAssetControlController(ds, auth));
  return app;
}
beforeEach(() => {
  jest.clearAllMocks();
  owner.mockImplementation(async (_ds, _user, _service, preferred) => {
    await new Promise<void>(resolve => setImmediate(resolve));
    return preferred === A || preferred === B ? access(preferred) : access(null, 'ambiguous');
  });
});
afterEach(() => jest.restoreAllMocks());

describe('content organization selection', () => {
  it('does not replace an ambiguous store with the legacy association', async () => {
    const { ds, repo } = database();
    expect(await resolveKpaContentOrganization(ds, 'synthetic-user')).toBeNull();
    expect(repo.findOne).not.toHaveBeenCalled();
    expect((await resolveKpaContentAccess(ds, 'synthetic-user')).isOwner).toBe(false);
  });
  it('rejects an explicit mismatched selection even if the resolver returns a single authorized store', async () => {
    const { ds, repo } = database(); owner.mockResolvedValue(access(A));
    expect(await resolveKpaContentOrganization(ds, 'synthetic-user', FOREIGN)).toBeNull();
    expect(repo.findOne).not.toHaveBeenCalled();
  });
  it('preserves single-store and no-store legacy member behavior without a selection', async () => {
    const { ds, repo } = database(); owner.mockResolvedValueOnce(access(A));
    expect(await resolveKpaContentOrganization(ds, 'synthetic-user')).toBe(A);
    owner.mockResolvedValueOnce(access(null, 'none', false));
    expect(await resolveKpaContentOrganization(ds, 'synthetic-user')).toBe('association');
    expect(repo.findOne).toHaveBeenCalledTimes(1);
  });
  it('concurrent asset requests keep independent request-local selections through the frozen factory', async () => {
    const { ds } = database(); const app = appFor(ds);
    const list = jest.spyOn(AssetCopyService.prototype, 'listByOrganization').mockImplementation(async organizationId => ({ items: [{ organizationId }], total: 1 }) as any);
    const [a, b] = await Promise.all([request(app).get('/assets').set('X-Store-Organization-Id', A), request(app).get('/assets').set('X-Store-Organization-Id', B)]);
    expect(a.status).toBe(200); expect(b.status).toBe(200);
    expect(a.body.data.items[0].organizationId).toBe(A); expect(b.body.data.items[0].organizationId).toBe(B);
    expect(list).toHaveBeenCalledTimes(2);
  });
  it('copy and direct authoring both write to the selected store', async () => {
    const { ds } = database(); const app = appFor(ds);
    const copy = jest.spyOn(AssetCopyService.prototype, 'copyWithResolver').mockImplementation(async input => ({ snapshot: { organizationId: input.targetOrganizationId } }) as any);
    const copied = await request(app).post('/assets/copy').set('X-Store-Organization-Id', B).send({ sourceAssetId: A, assetType: 'content' });
    const direct = await request(app).post('/contents').set('X-Store-Organization-Id', B).send({ title: 'synthetic' });
    expect(copied.status).toBe(201); expect(copied.body.data.organizationId).toBe(B);
    expect(direct.status).toBe(201); expect(direct.body.data.organizationId).toBe(B);
    expect(copy).toHaveBeenCalledWith(expect.objectContaining({ targetOrganizationId: B }), expect.anything());
    expect(createDirectContent).toHaveBeenCalledWith(ds, B, 'synthetic-user', expect.anything());
  });
  it('library SQL and publication ownership checks use the same selected organization', async () => {
    const { ds, query } = database(); const app = appFor(ds);
    const library = await request(app).get('/library/contents').set('X-Store-Organization-Id', B);
    expect(library.status).toBe(200);
    expect(query.mock.calls.every(([, params]) => params[0] === B)).toBe(true);
    const wrongStore = await request(app).patch(`/controls/${A}/publish`).set('X-Store-Organization-Id', B).send({ status: 'published' });
    expect(wrongStore.status).toBe(404);
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('organization_id = $2'), [A, B]);
  });
  it('editing uses the selected organization and publication saves only an owned snapshot', async () => {
    const { ds, repo } = database(); const app = appFor(ds);
    const edited = await request(app).put(`/contents/direct/${A}`).set('X-Store-Organization-Id', B).send({ title: 'edited' });
    expect(edited.status).toBe(200);
    expect(updateDirectContent).toHaveBeenCalledWith(ds, B, 'synthetic-user', A, { title: 'edited' });
    repo.findOne.mockResolvedValueOnce(null);
    const published = await request(app).patch(`/controls/${B}/publish`).set('X-Store-Organization-Id', A).send({ status: 'published' });
    expect(published.status).toBe(200);
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ organization_id: A, snapshot_id: B, publish_status: 'published' }));
  });
  it('a matching selection does not bypass the existing owner or agreement denial', async () => {
    const { ds } = database(); owner.mockResolvedValue(access(B, 'resolved', false));
    const denied = await request(appFor(ds)).post('/contents').set('X-Store-Organization-Id', B).send({ title: 'synthetic' });
    expect(denied.status).toBe(403);
    expect(createDirectContent).not.toHaveBeenCalled();
  });
  it.each(['/contents', '/library/contents', '/controls'])('missing user remains unauthorized on %s', async path => {
    const { ds, query } = database();
    const denied = await request(appFor(ds, false)).get(path).set('X-Store-Organization-Id', B);
    expect(denied.status).toBe(401);
    expect(denied.body.error.code).toBe('UNAUTHORIZED');
    expect(owner).not.toHaveBeenCalled(); expect(query).not.toHaveBeenCalled();
  });
  it('invalid direct IDs retain the original validation response before organization lookup', async () => {
    const { ds } = database();
    const invalid = await request(appFor(ds)).put('/contents/direct/invalid').send({ title: 'synthetic' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toEqual({ code: 'INVALID_ID', message: 'Invalid content ID' });
    expect(owner).not.toHaveBeenCalled();
  });
  it.each(['translate', 'translations/en'])('missing owned translation content remains 404 on %s', async path => {
    const { ds, repo } = database(); repo.findOne.mockResolvedValue(null);
    const call = path === 'translate' ? request(appFor(ds)).post(`/contents/direct/${A}/${path}`) : request(appFor(ds)).put(`/contents/direct/${A}/${path}`);
    const absent = await call.set('X-Store-Organization-Id', B).send({ locale: 'en' });
    expect(absent.status).toBe(404);
    expect(absent.body.error.code).toBe('NOT_FOUND');
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: A, organization_id: B, source_type: 'direct' } });
  });
  it('foreign selections cannot write or fall back on any content adapter', async () => {
    const { ds, query, repo } = database(); const app = appFor(ds);
    const responses = await Promise.all([
      request(app).post('/contents').send({ title: 'synthetic' }).set('X-Store-Organization-Id', FOREIGN),
      request(app).post('/assets/copy').send({ sourceAssetId: A, assetType: 'content' }).set('X-Store-Organization-Id', FOREIGN),
      request(app).get('/library/contents').set('X-Store-Organization-Id', FOREIGN),
      request(app).patch(`/controls/${A}/publish`).send({ status: 'published' }).set('X-Store-Organization-Id', FOREIGN),
    ]);
    expect(responses.map(r => r.status)).toEqual([403, 403, 200, 403]);
    // Existing library contract is an empty list when no organization resolves.
    expect(responses[2].body.data.items).toEqual([]);
    expect(query).not.toHaveBeenCalled(); expect(repo.findOne).not.toHaveBeenCalled();
    expect(createDirectContent).not.toHaveBeenCalled();
  });
});
