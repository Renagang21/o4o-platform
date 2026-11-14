import { Client } from 'pg';
import { randomUUID } from 'node:crypto';

jest.mock('../store-public-utils.js', () => ({ queryTabletVisibleProducts: jest.fn(), resolveServiceKeys: jest.fn() }));
import { PRODUCT_VIDEO_LIMIT, resolveProductVideos } from '../store-public-screen-set-resolve';

// Real canonical schema on an owned loopback cluster only (WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1 T5 · D7).
const url = process.env.TABLET_PRODUCT_VIDEO_TEST_DATABASE_URL;
(url && /^postgres(ql)?:\/\/[^@]+@(127\.0\.0\.1|localhost):/.test(url) ? describe : describe.skip)('tablet corner product videos', () => {
  const pg = new Client({ connectionString: url });
  const ds = { query: async (sql: string, params?: unknown[]) => (await pg.query(sql, params)).rows };
  const SK = ['kpa-society'];
  let store: string, other: string, master: string, listing: string;
  const one = async (sql: string, params: unknown[]) => (await pg.query(sql, params)).rows[0].id;
  const media = (f: Record<string, unknown>) => one(`INSERT INTO signage_media("serviceKey","organizationId",name,"mediaType","sourceType","sourceUrl",source,scope,status,"productMasterId","parentMediaId",metadata,"updatedAt")
    VALUES($1,$2,$3,'video',$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12) RETURNING id`,
  [f.serviceKey ?? 'kpa-society', f.organizationId ?? null, f.name ?? '영상', f.sourceType ?? 'youtube', f.url ?? 'https://www.youtube.com/watch?v=fixture00001',
    f.source ?? 'store', f.scope ?? 'store', f.status ?? 'active', f.productMasterId ?? null, f.parentMediaId ?? null, JSON.stringify(f.metadata ?? {}), f.updatedAt ?? new Date()]);

  beforeAll(async () => { await pg.connect(); });
  afterAll(async () => { await pg.end(); });
  beforeEach(async () => {
    await pg.query('BEGIN');
    const org = (code: string) => one(`INSERT INTO organizations(name,code,type) VALUES($1,$1,'pharmacy') RETURNING id`, [code]);
    store = await org(`tv-${randomUUID()}`); other = await org(`tv-other-${randomUUID()}`);
    master = await one(`INSERT INTO product_masters(barcode,regulatory_type,regulatory_name,name,manufacturer_name) VALUES($1,'일반의약품','감기약','감기약','Fixture') RETURNING id`, [String(Math.random()).slice(2, 15)]);
    listing = await one('INSERT INTO organization_product_listings(organization_id,master_id) VALUES($1,$2) RETURNING id', [store, master]);
  });
  afterEach(async () => { await pg.query('ROLLBACK'); });

  it('shows the store\'s own and shared product videos, store first, and nothing else', async () => {
    const shared = await media({ name: '공급자 영상', source: 'supplier', scope: 'global', metadata: { linkedProduct: { masterId: master } }, updatedAt: new Date(Date.now() + 1000) });
    const own = await media({ name: '매장 영상', organizationId: store, productMasterId: master, sourceType: 'url', url: 'https://storage.googleapis.com/fixture/v.mp4' });
    const copy = await media({ name: '가져온 사본', organizationId: store, parentMediaId: shared });
    await media({ name: '다른 매장', organizationId: other, productMasterId: master });
    await media({ name: '초안', organizationId: store, productMasterId: master, status: 'draft' });
    await media({ name: '다른 서비스', organizationId: store, productMasterId: master, serviceKey: 'neture' });
    await media({ name: '다른 제품', organizationId: store });
    const map = await resolveProductVideos(ds, store, SK, [listing]);
    expect(map.get(listing)).toEqual([
      // 매장 영상끼리는 최근 것이 먼저다(사본이 나중에 등록됨).
      { id: copy, title: '가져온 사본', kind: 'youtube', url: 'https://www.youtube.com/watch?v=fixture00001' },
      { id: own, title: '매장 영상', kind: 'video', url: 'https://storage.googleapis.com/fixture/v.mp4' },
      { id: shared, title: '공급자 영상', kind: 'youtube', url: 'https://www.youtube.com/watch?v=fixture00001' },
    ]);
  });

  it('caps the list, ignores other stores\' listings and writes nothing', async () => {
    for (let i = 0; i < PRODUCT_VIDEO_LIMIT + 2; i++) await media({ name: `영상 ${i}`, organizationId: store, productMasterId: master });
    const foreign = await one('INSERT INTO organization_product_listings(organization_id,master_id) VALUES($1,$2) RETURNING id', [other, master]);
    const before = (await pg.query('SELECT count(*)::int AS n, max("updatedAt") AS t FROM signage_media')).rows[0];
    const map = await resolveProductVideos(ds, store, SK, [listing, foreign, 'not-a-uuid']);
    expect(map.get(listing)).toHaveLength(PRODUCT_VIDEO_LIMIT);
    expect(map.has(foreign)).toBe(false);
    expect((await pg.query('SELECT count(*)::int AS n, max("updatedAt") AS t FROM signage_media')).rows[0]).toEqual(before);
    expect((await resolveProductVideos(ds, store, SK, [])).size).toBe(0);
  });
});
