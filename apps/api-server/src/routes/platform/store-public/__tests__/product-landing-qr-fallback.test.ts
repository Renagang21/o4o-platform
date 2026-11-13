import { Client } from 'pg';
import { randomUUID } from 'node:crypto';

jest.mock('../store-public-utils.js', () => ({ queryTabletVisibleProducts: jest.fn(), resolveServiceKeys: jest.fn() }));
import { resolveProductLandingQrUrls } from '../store-public-screen-set-resolve';

// Real canonical schema on an owned loopback cluster only (WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1 T5).
const url = process.env.TABLET_PRODUCT_QR_TEST_DATABASE_URL;
(url && /^postgres(ql)?:\/\/[^@]+@(127\.0\.0\.1|localhost):/.test(url) ? describe : describe.skip)('tablet corner default product QR', () => {
  const pg = new Client({ connectionString: url });
  const ds = { query: async (sql: string, params?: unknown[]) => (await pg.query(sql, params)).rows } as never;
  beforeAll(async () => { await pg.connect(); });
  afterAll(async () => { await pg.end(); });
  beforeEach(async () => { await pg.query('BEGIN'); });
  afterEach(async () => { await pg.query('ROLLBACK'); });

  const one = async (sql: string, params: unknown[]) => (await pg.query(sql, params)).rows[0].id;
  it('uses only an already-issued, exposable landing of this store\'s listing, and writes nothing', async () => {
    const org = (code: string) => one(`INSERT INTO organizations(name,code,type) VALUES($1,$1,'pharmacy') RETURNING id`, [code]);
    const master = (name: string) => one(`INSERT INTO product_masters(barcode,regulatory_type,regulatory_name,name,manufacturer_name)
      VALUES($1,'일반의약품',$2,$2,'Fixture') RETURNING id`, [String(Math.random()).slice(2, 15), name]);
    const store = await org(`tpq-${randomUUID()}`), other = await org(`tpq-other-${randomUUID()}`);
    const [withLanding, blocked, noLanding] = [await master('대표 QR 있음'), await master('노출 중지'), await master('대표 QR 없음')];
    const listing = (o: string, m: string) => one('INSERT INTO organization_product_listings(organization_id,master_id) VALUES($1,$2) RETURNING id', [o, m]);
    const l1 = await listing(store, withLanding), l2 = await listing(store, blocked), l3 = await listing(store, noLanding), foreign = await listing(other, withLanding);
    await pg.query(`INSERT INTO product_landings(product_master_id,public_key) VALUES($1,'fixturekey1a')`, [withLanding]);
    await pg.query(`INSERT INTO product_landings(product_master_id,public_key,exposure_state) VALUES($1,'fixturekey2b','blocked')`, [blocked]);
    const before = (await pg.query('SELECT count(*)::int AS n FROM product_landings')).rows[0].n;

    const map = await resolveProductLandingQrUrls(ds, store, [l1, l2, l3, foreign, 'not-a-uuid']);
    expect([...map.keys()]).toEqual([l1]);
    expect(map.get(l1)).toMatch(/\/p\/fixturekey1a$/);
    expect((await pg.query('SELECT count(*)::int AS n FROM product_landings')).rows[0].n).toBe(before);
    expect((await resolveProductLandingQrUrls(ds, store, [])).size).toBe(0);
  });
});
