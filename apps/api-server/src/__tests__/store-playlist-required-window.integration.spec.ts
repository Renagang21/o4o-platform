import express from 'express';
import request from 'supertest';
import { createStorePlaylistController } from '../routes/o4o-store/controllers/store-playlist.controller.js';
let mockOrganizationId: string;
jest.mock('../utils/store-owner.utils.js', () => ({ resolveStoreAccess: async () => mockOrganizationId }));
jest.mock('@o4o/asset-copy-core', () => jest.requireActual('../../../../packages/asset-copy-core/src/index.ts'), { virtual: true });
import { AssetSnapshot } from '../../../../packages/asset-copy-core/src/entities/asset-snapshot.entity.js';
import { randomUUID } from 'crypto';
import { DataSource, type QueryRunner } from 'typeorm';
import { StorePlaylistRepository } from '../routes/o4o-store/repositories/store-playlist.repository.js';
import { StorePlaylist } from '../routes/kpa/entities/store-playlist.entity.js';
import { StorePlaylistItem } from '../routes/kpa/entities/store-playlist-item.entity.js';

// Explicit isolated local database only; never use inherited production connection settings.
const enabled = process.env.PLAYLIST_DB_TEST === '1';
(enabled ? describe : describe.skip)('store required video windows (isolated PostgreSQL 15)', () => {
  let ds: DataSource, scoped: DataSource, q: QueryRunner, repo: StorePlaylistRepository;
  let playlistId: string, organizationId: string;
  const service = 'kpa-society';
  beforeAll(async () => {
    if (process.env.DB_HOST !== '127.0.0.1' || process.env.DB_PORT !== '55439' || process.env.NODE_ENV !== 'test') throw new Error('ISOLATED_PLAYLIST_DATABASE_REQUIRED');
    ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 55439, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [StorePlaylist, StorePlaylistItem, AssetSnapshot], synchronize: false });
    await ds.initialize();
  });
  afterAll(async () => { if (ds?.isInitialized) await ds.destroy(); });
  beforeEach(async () => {
    q = ds.createQueryRunner(); await q.startTransaction();
    scoped = Object.create(ds) as DataSource;
    scoped.query = q.query.bind(q);
    scoped.getRepository = q.manager.getRepository.bind(q.manager);
    scoped.transaction = ((work: (manager: typeof q.manager) => unknown) => work(q.manager)) as DataSource['transaction'];
    repo = new StorePlaylistRepository(scoped); organizationId = randomUUID(); mockOrganizationId = organizationId;
    playlistId = (await repo.createPlaylist(organizationId, 'Fixture playlist', 'LIST', ['fixture'])).id;
  });
  afterEach(async () => { await q.rollbackTransaction(); await q.release(); });
  async function forced(title: string, start: string, end: string, surface = 'signage', key = service) {
    const [row] = await q.query(`INSERT INTO signage_forced_content (service_key,title,video_url,source_type,start_at,end_at,target_surface) VALUES ($1,$2,'https://youtu.be/abcdefghijk','youtube',NOW() + $3::interval,NOW() + $4::interval,$5) RETURNING id`, [key, title, start, end, surface]);
    return `forced-${row.id}`;
  }
  it('uses start-inclusive/end-exclusive windows and service/surface isolation in management and playback', async () => {
    const active = await forced('Active fixture', '0 seconds', '1 hour');
    await forced('Future fixture', '1 hour', '2 hours');
    await forced('Ended fixture', '-1 hour', '0 seconds');
    await forced('Tablet fixture', '-1 hour', '1 hour', 'tablet_idle');
    await forced('Other service fixture', '-1 hour', '1 hour', 'signage', 'neture');
    expect((await repo.findPlaylistItems(playlistId, service)).map(item => item.id)).toEqual([active]);
    expect((await repo.findPublicPlaylistItems(playlistId, service)).map(item => item.id)).toEqual([active]);
    const playback = await repo.findPublicPlaylistItems(playlistId, service);
    expect((playback[0].contentJson as Record<string, unknown>).forcedEndAt).toBeTruthy();
  });
  it('automatically enters/exits existing playlists, preserving the requirement and playlist data', async () => {
    const id = await forced('Window fixture', '1 hour', '2 hours');
    expect(await repo.findPlaylistItems(playlistId, service)).toHaveLength(0);
    await q.query('UPDATE signage_forced_content SET start_at=NOW() WHERE id=$1', [id.slice(7)]);
    expect(await repo.findPlaylistItems(playlistId, service)).toHaveLength(1);
    await q.query('UPDATE signage_forced_content SET end_at=NOW() WHERE id=$1', [id.slice(7)]);
    expect(await repo.findPlaylistItems(playlistId, service)).toHaveLength(0);
    expect((await q.query('SELECT id FROM signage_forced_content WHERE id=$1', [id.slice(7)]))).toHaveLength(1);
  });
  it('persists tags, mandatory positions and independent copied content', async () => {
    const id = await forced('Required fixture', '-1 hour', '1 hour');
    const [copy] = await q.query(`INSERT INTO o4o_asset_snapshots (organization_id,source_service,source_asset_id,asset_type,title,created_by,content_json) VALUES ($1,'community',$2,'signage','Independent fixture',$3,'{"duration":60}') RETURNING id`, [organizationId, randomUUID(), randomUUID()]);
    const normal = await repo.addItem(playlistId, copy.id);
    await repo.reorderItems(playlistId, [id, normal.id]);
    expect((await repo.findPlaylistItems(playlistId, service)).map(item => item.id)).toEqual([id, normal.id]);
    expect((await repo.findPlaylistsByOrganization(organizationId, service))[0]).toMatchObject({ tags: ['fixture'], itemCount: 2, forcedCount: 1 });
    await repo.updatePlaylist(playlistId, organizationId, { tags: ['updated'] });
    expect((await repo.findPlaylistsByOrganization(organizationId, service))[0].tags).toEqual(['updated']);
    expect((await repo.findPlaylistItems(playlistId, service))[1].title).toBe('Independent fixture');
  });
  it('retries an authoring request and item insertion without creating a second playlist or item', async () => {
    const requestId = randomUUID();
    const first = await repo.createPlaylist(organizationId, 'Retry fixture', 'LIST', [], requestId);
    const retry = await repo.createPlaylist(organizationId, 'Retry fixture', 'LIST', [], requestId);
    expect(retry.id).toBe(first.id);
    const [copy] = await q.query(`INSERT INTO o4o_asset_snapshots (organization_id,source_service,source_asset_id,asset_type,title,created_by) VALUES ($1,'community',$2,'signage','Retry copy',$3) RETURNING id`, [organizationId, randomUUID(), randomUUID()]);
    const item = await repo.addItem(first.id, copy.id);
    expect((await repo.addItem(first.id, copy.id)).id).toBe(item.id);
    expect(await repo.findPlaylistItems(first.id, service)).toHaveLength(1);
  });

  it('protects required deletion, rejects foreign order IDs and checks playlist ownership at the API', async () => {
    const id = await forced('Protected fixture', '-1 hour', '1 hour');
    const app = express(); app.use(express.json());
    app.use(createStorePlaylistController(scoped, (req, _res, next) => { (req as any).user = { id: randomUUID(), roles: ['kpa:store_owner'] }; next(); }, service));
    expect((await request(app).delete(`/${playlistId}/items/${id}`)).status).toBe(403);
    expect((await request(app).patch(`/${playlistId}/items/reorder`).send({ order: [`forced-${randomUUID()}`] })).status).toBe(400);
    expect((await request(app).get('/required-videos')).body.data).toHaveLength(1);
    mockOrganizationId = randomUUID();
    expect((await request(app).patch(`/${playlistId}/items/reorder`).send({ order: [id] })).status).toBe(404);
    expect((await request(app).post('/').send({ name: 'Invalid tags', tags: [123] })).status).toBe(400);
  });

  it('retries direct-video copying once and keeps the copy usable after source changes/removal', async () => {
    const header = await repo.createPlaylist(organizationId, 'Media retry fixture', 'LIST', [], randomUUID());
    const [media] = await q.query(`INSERT INTO signage_media ("serviceKey","organizationId",name,"mediaType","sourceType","sourceUrl",status,source,scope) VALUES ($1,$2,'Original fixture','video','youtube','https://youtu.be/abcdefghijk','active','store','store') RETURNING id`, [service,organizationId]);
    const actor = randomUUID();
    const item = await repo.addItemFromSignage(header.id, media.id, organizationId, actor);
    await q.query(`UPDATE signage_media SET name='Changed fixture',status='draft',"deletedAt"=NOW() WHERE id=$1`, [media.id]);
    expect((await repo.addItemFromSignage(header.id, media.id, organizationId, actor)).id).toBe(item.id);
    const copies = await repo.findPlaylistItems(header.id, service);
    expect(copies).toHaveLength(1); expect(copies[0].title).toBe('Original fixture');
  });

});
