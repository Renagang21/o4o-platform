import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { MediaAsset } from '../modules/media/entities/MediaAsset.entity.js';
import {
  MediaCatalogService,
  externalMedia,
  mediaMetadata,
} from '../modules/media/services/media-catalog.service.js';
import { MediaLibraryService } from '../modules/media/services/media-library.service.js';
import { CreateMediaAssetsTable20260401300000 } from '../database/migrations/20260401300000-CreateMediaAssetsTable.js';
import { AddMediaAssetFolder20260401400000 } from '../database/migrations/20260401400000-AddMediaAssetFolder.js';
import { AddMediaAssetMetadata20261222000000 } from '../database/migrations/20261222000000-AddMediaAssetMetadata.js';
import { MediaLibraryV2Foundation20270407000000 } from '../database/migrations/20270407000000-MediaLibraryV2Foundation.js';

const saveFile = jest.fn().mockResolvedValue(undefined);
const deleteFile = jest.fn().mockResolvedValue(undefined);
jest.mock('@google-cloud/storage', () => ({
  Storage: jest
    .fn()
    .mockImplementation(() => ({
      bucket: () => ({ file: () => ({ save: saveFile, delete: deleteFile }) }),
    })),
}));
jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('Media V2 input contracts', () => {
  test.each([
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=x',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  ])('canonical YouTube URL %s', (url) => {
    expect(
      externalMedia({ provider: 'youtube', externalUrl: url }).externalId,
    ).toBe('dQw4w9WgXcQ');
  });
  test.each([
    'javascript:alert(1)',
    'http://youtu.be/dQw4w9WgXcQ',
    'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/invalid',
  ])('reject unsafe video URL %s', (url) => {
    expect(() =>
      externalMedia({ provider: 'youtube', externalUrl: url }),
    ).toThrow();
  });
  test('rights stay unknown; no truthy string coercion or file URL patch', () => {
    expect(
      mediaMetadata({ commercialUseAllowed: null, url: 'overwrite' }),
    ).toEqual({ commercialUseAllowed: null });
    expect(() => mediaMetadata({ commercialUseAllowed: 'false' })).toThrow();
    expect(() => mediaMetadata({ qaStatus: 'EXACT' })).toThrow();
    expect(() =>
      externalMedia({
        provider: 'o4o',
        externalUrl: 'https://neture.co.kr/r/1?token=secret',
      }),
    ).toThrow();
  });
});

// Explicit opt-in, fixed localhost-only disposable cluster. Never reads repository .env.
const integration =
  process.env.MEDIA_V2_TEST_PORT === '55439' ? describe : describe.skip;
integration('Media V2 PostgreSQL migration and service regression', () => {
  let ds: DataSource;
  let catalog: MediaCatalogService;
  let library: MediaLibraryService;
  const actor = randomUUID();
  let original: string;
  beforeAll(async () => {
    const connection = {
      type: 'postgres' as const,
      host: '127.0.0.1',
      port: 55439,
      username: 'media_test',
      database: 'postgres',
    };
    const admin = await new DataSource(connection).initialize();
    const database = 'media_v2_' + Date.now();
    await admin.query('CREATE DATABASE ' + database);
    await admin.destroy();
    ds = await new DataSource({
      ...connection,
      database,
      entities: [MediaAsset],
      synchronize: false,
    }).initialize();
    const q = ds.createQueryRunner();
    await q.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await new CreateMediaAssetsTable20260401300000().up(q);
    await new AddMediaAssetFolder20260401400000().up(q);
    await new AddMediaAssetMetadata20261222000000().up(q);
    const rows = await q.query(
      `INSERT INTO media_assets(url,gcs_path,file_name,original_name,mime_type,consented_at) VALUES('https://example.test/original.png','media/original.png','original.png','original.png','image/png',now()) RETURNING id`,
    );
    original = rows[0].id;
    await new MediaLibraryV2Foundation20270407000000().up(q);
    await q.query(
      'CREATE TABLE store_execution_assets(id uuid,organization_id uuid,title text,usage_type text,updated_at timestamptz,html_content text)',
    );
    await q.query('CREATE TABLE store_tablet_screen_sets(id uuid PRIMARY KEY)');
    await q.query(
      'CREATE TABLE store_tablet_screen_blocks(screen_set_id uuid,config jsonb)',
    );
    await q.release();
    catalog = new MediaCatalogService(ds);
    library = new MediaLibraryService(ds);
  }, 30000);
  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });
  const external = () =>
    catalog.createExternal(
      {
        provider: 'youtube',
        externalUrl: 'https://youtu.be/dQw4w9WgXcQ',
        title: 'fixture video',
        consent: true,
      },
      actor,
    );
  test('migration preserves original URL, folder and internal storage', async () => {
    const a = await library.getById(original);
    expect(a).toMatchObject({
      url: 'https://example.test/original.png',
      gcsPath: 'media/original.png',
      storageType: 'internal',
      provider: 'gcs',
      folder: 'general',
      commercialUseAllowed: null,
    });
  });
  test('existing upload, metadata patch, search, folder and usage still work', async () => {
    const a = await library.upload(
      {
        buffer: Buffer.from('fixture'),
        size: 7,
        originalname: 'fixture.pdf',
        mimetype: 'application/pdf',
      },
      actor,
    );
    expect(saveFile).toHaveBeenCalled();
    const patched = await library.updateMetadata(a.id, {
      title: '검색회귀',
      tags: ['태그'],
      keywords: ['검색'],
      language: 'ko',
      status: 'active',
      source: 'operator',
    });
    expect(patched.url).toBe(a.url);
    expect(
      (
        await library.list({
          q: '검색',
          language: 'ko',
          status: 'active',
          source: 'operator',
          assetType: 'document',
        })
      ).data.map((x) => x.id),
    ).toContain(a.id);
    expect((await library.moveToFolder(a.id, 'general')).url).toBe(a.url);
    await ds.query(
      'INSERT INTO store_execution_assets VALUES($1,$2,$3,$4,now(),$5)',
      [randomUUID(), randomUUID(), 'fixture', 'pop', `<img src="${a.url}">`],
    );
    expect((await library.getUsage(a.id)).usages).toHaveLength(1);
  });
  test('product image modes preserve original and generate 1000px thumbnail', async () => {
    const sharp = (await import('sharp')).default;
    const image = await sharp({
      create: { width: 24, height: 48, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    const file = {
      buffer: image,
      size: image.length,
      originalname: 'product.png',
      mimetype: 'image/png',
    };
    const originalImage = await library.upload(
      file,
      actor,
      undefined,
      'product',
      { imageMode: 'preserve-original' },
    );
    expect(originalImage).toMatchObject({
      width: 24,
      height: 48,
      mimeType: 'image/png',
    });
    const thumb = await library.upload(file, actor, undefined, 'product', {
      imageMode: 'thumbnail-1000',
    });
    expect(thumb).toMatchObject({
      width: 1000,
      height: 1000,
      mimeType: 'image/webp',
    });
    expect(originalImage.url).not.toBe(thumb.url);
  });
  test('entity link CRUD, idempotency, reverse filter and deletion protection', async () => {
    const a = await external();
    const link = await catalog.saveLink(a.id, {
      entityType: 'product',
      entityId: 'fixture-product',
      purpose: 'reference',
    });
    expect(
      (
        await catalog.saveLink(a.id, {
          entityType: 'product',
          entityId: 'fixture-product',
          purpose: 'reference',
        })
      ).id,
    ).toBe(link.id);
    expect(
      (
        await library.list({
          entityType: 'product',
          entityId: 'fixture-product',
        })
      ).data.map((x) => x.id),
    ).toEqual([a.id]);
    await expect(library.deleteAsset(a.id)).rejects.toMatchObject({
      code: 'MEDIA_IN_USE_LINK',
    });
    await catalog.saveLink(
      a.id,
      { entityType: 'brand', entityId: 'fixture-brand', purpose: 'thumbnail' },
      link.id,
    );
    expect((await catalog.relations(a.id)).links[0]).toMatchObject({
      entityType: 'brand',
      purpose: 'thumbnail',
    });
    await catalog.removeLink(a.id, link.id);
    await library.deleteAsset(a.id);
    expect(await library.getById(a.id)).toBeNull();
    expect(deleteFile).not.toHaveBeenCalled();
  });
  test('lineage root calculation, cycles/reparent protection and root delete guard', async () => {
    const child = await external();
    const grandchild = await external();
    expect(
      (
        await catalog.patch(
          child.id,
          { parentAssetId: original, derivationType: 'video-clip' },
          actor,
        )
      ).rootAssetId,
    ).toBe(original);
    expect(
      (
        await catalog.patch(
          grandchild.id,
          { parentAssetId: child.id, derivationType: 'final-video' },
          actor,
        )
      ).rootAssetId,
    ).toBe(original);
    await expect(
      catalog.patch(
        original,
        { parentAssetId: grandchild.id, derivationType: 'edited-video' },
        actor,
      ),
    ).rejects.toThrow();
    await expect(
      catalog.patch(child.id, { parentAssetId: grandchild.id }, actor),
    ).rejects.toThrow();
    await expect(library.deleteAsset(original)).rejects.toMatchObject({
      code: 'MEDIA_IN_USE_DERIVATION',
    });
    expect((await catalog.relations(child.id)).children[0].id).toBe(
      grandchild.id,
    );
  });
  test('AI, QA, rights persist and filter; immutable URL remains unchanged', async () => {
    const a = await external();
    const patch = {
      originType: 'ai_generated',
      generationProvider: 'fixture',
      generationModel: 'test-model',
      promptRef: 'prompt:fixture',
      generationJobId: 'job:fixture',
      qaStatus: 'APPROVED',
      productAccuracyLevel: 'SUPPORT_ONLY',
      rightsType: 'licensed',
      commercialUseAllowed: false,
      attributionRequired: true,
      sourceUrl: 'https://example.test/license',
    };
    expect(await catalog.patch(a.id, patch, actor)).toMatchObject({
      ...patch,
      url: a.url,
    });
    expect(
      (
        await library.list({
          qaStatus: 'APPROVED',
          productAccuracyLevel: 'SUPPORT_ONLY',
          commercialUseAllowed: 'false',
          rightsType: 'licensed',
        })
      ).data.map((x) => x.id),
    ).toEqual([a.id]);
    expect(
      (
        await library.list({
          qaStatus: 'APPROVED',
          commercialUseAllowed: 'true',
        })
      ).data,
    ).toEqual([]);
  });
  test('Screen Set guard still blocks external and internal referenced assets', async () => {
    const a = await external();
    const set = randomUUID();
    await ds.query('INSERT INTO store_tablet_screen_sets VALUES($1)', [set]);
    await ds.query('INSERT INTO store_tablet_screen_blocks VALUES($1,$2)', [
      set,
      JSON.stringify({ items: [{ url: a.url }] }),
    ]);
    await expect(library.deleteAsset(a.id)).rejects.toMatchObject({
      code: 'MEDIA_IN_USE_SCREEN_SET',
    });
  });
  test('pagination is stable and exact filters compose', async () => {
    const first = await library.list({
      limit: 2,
      page: 1,
      storageType: 'external',
    });
    const second = await library.list({
      limit: 2,
      page: 2,
      storageType: 'external',
    });
    expect(first.data).toHaveLength(2);
    expect(
      second.data.every((x) => !first.data.some((y) => y.id === x.id)),
    ).toBe(true);
  });
  test('link-create/delete race never removes a linked asset', async () => {
    const a = await external();
    const results = await Promise.allSettled([
      catalog.saveLink(a.id, {
        entityType: 'content',
        entityId: 'fixture',
        purpose: 'race',
      }),
      library.deleteAsset(a.id),
    ]);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(false);
    const rows = await ds.query(
      'SELECT count(*)::int AS n FROM media_entity_links l LEFT JOIN media_assets m ON m.id=l.media_asset_id WHERE m.id IS NULL',
    );
    expect(rows[0].n).toBe(0);
  });
  test('100k synthetic query plans: pagination, target lookup, metadata scan', async () => {
    await ds.query('SET synchronous_commit = off');
    await ds.query(`INSERT INTO media_assets(id,url,gcs_path,file_name,original_name,mime_type,consented_at,title,tags,language,status,usage_type,source)
      SELECT md5('media-fixture-'||n)::uuid,'https://example.test/'||n,'fixture/'||n,'fixture','fixture','image/png',now(),'Product '||n,jsonb_build_array('fixture'),CASE WHEN n%2=0 THEN 'ko' ELSE 'en' END,'active','reference','operator' FROM generate_series(1,100000) n`);
    await ds.query('ANALYZE media_assets');
    await ds.query(
      `INSERT INTO media_entity_links(id,media_asset_id,entity_type,entity_id,purpose) SELECT md5('link-fixture-'||id)::uuid,id,'product',id::text,'reference' FROM media_assets`,
    );
    await ds.query('ANALYZE media_entity_links');
    const plans: Record<string, unknown> = {};
    for (const [name, sql, params] of [
      [
        'page',
        'SELECT * FROM media_assets WHERE is_library_public=true ORDER BY created_at DESC,id DESC LIMIT 20',
        [],
      ],
      [
        'entity',
        'SELECT m.* FROM media_assets m WHERE m.is_library_public=true AND EXISTS (SELECT 1 FROM media_entity_links el WHERE el.media_asset_id=m.id AND el.entity_type=$1 AND el.entity_id=$2) ORDER BY m.created_at DESC,m.id DESC LIMIT 20',
        ['product', original],
      ],
      [
        'metadata',
        `SELECT count(*) FROM media_assets WHERE is_library_public=true AND language='ko' AND source='operator' AND status='active' AND usage_type='reference' AND (title ILIKE $1 OR description ILIKE $1 OR memo ILIKE $1 OR keywords::text ILIKE $1 OR tags::text ILIKE $1)`,
        ['%99999%'],
      ],
    ] as const) {
      const rows = await ds.query(
        'EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ' + sql,
        [...params],
      );
      const plan = rows[0]['QUERY PLAN'][0];
      plans[name] = { executionMs: plan['Execution Time'], plan: plan.Plan };
    }
    console.info('MEDIA_V2_SYNTHETIC_PLANS', JSON.stringify(plans));
    expect(JSON.stringify(plans.page)).toContain('media_public_created_idx');
    expect(JSON.stringify(plans.entity)).toContain('media_entity_target_idx');
  }, 180000);
});
