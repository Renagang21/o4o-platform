import { Client } from 'pg';
import { randomUUID } from 'node:crypto';
import { assertSupplierProduct, linkHqMediaProduct, linkStoreMediaProduct, listStoreMediaProducts } from '../media-product-link.service';

describe('media product link validation (no database)', () => {
  const db = { query: jest.fn() };
  beforeEach(() => db.query.mockReset());
  it('rejects a store request without an organization or with a malformed id before any query', async () => {
    await expect(linkStoreMediaProduct(db as any, { serviceKey: 'kpa-society' }, randomUUID(), null)).rejects.toMatchObject({ code: 'ORGANIZATION_REQUIRED' });
    await expect(linkStoreMediaProduct(db as any, { serviceKey: 'kpa-society', organizationId: randomUUID() }, randomUUID(), 'not-a-uuid')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(linkHqMediaProduct(db as any, 'kpa-society', randomUUID(), 42)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(db.query).not.toHaveBeenCalled();
  });
  it('a supplier clearing the link needs no product lookup', async () => {
    await expect(assertSupplierProduct(db as any, randomUUID(), null)).resolves.toBeNull();
    expect(db.query).not.toHaveBeenCalled();
  });
});

// Real canonical schema (baseline + incremental migrations) on an owned loopback cluster only.
const url = process.env.MEDIA_PRODUCT_LINK_TEST_DATABASE_URL;
(url && /^postgres(ql)?:\/\/[^@]+@(127\.0\.0\.1|localhost):/.test(url) ? describe : describe.skip)('media product link on the canonical schema', () => {
  const pg = new Client({ connectionString: url });
  const db = { query: async (sql: string, params?: unknown[]) => (await pg.query(sql, params)).rows };
  const SERVICE = 'kpa-society';
  let store: string, other: string, master: string, otherMaster: string, listing: string, otherListing: string, supplier: string;
  const org = async (code: string) => (await db.query(`INSERT INTO organizations(name,code,type) VALUES($1,$1,'pharmacy') RETURNING id`, [code]))[0].id;
  const product = async (name: string) => (await db.query(`INSERT INTO product_masters(barcode,regulatory_type,regulatory_name,name,manufacturer_name)
    VALUES($1,'일반의약품',$2,$2,'Fixture') RETURNING id`, [String(Math.random()).slice(2, 15), name]))[0].id;
  const media = async (fields: Record<string, unknown>) => (await db.query(`INSERT INTO signage_media("serviceKey","organizationId",name,"mediaType","sourceType","sourceUrl",source,scope,"parentMediaId")
    VALUES($1,$2,'영상','video','youtube','https://www.youtube.com/watch?v=fixture',$3,$4,$5) RETURNING id`,
  [fields.serviceKey ?? SERVICE, fields.organizationId ?? null, fields.source ?? 'store', fields.scope ?? 'store', fields.parentMediaId ?? null]))[0].id;
  const masterOf = async (id: string) => (await db.query('SELECT "productMasterId" FROM signage_media WHERE id=$1', [id]))[0].productMasterId;

  beforeAll(async () => { await pg.connect(); });
  afterAll(async () => { await pg.end(); });
  beforeEach(async () => {
    await pg.query('BEGIN');
    store = await org(`pv-store-${randomUUID()}`); other = await org(`pv-other-${randomUUID()}`);
    master = await product('연결 제품'); otherMaster = await product('다른 매장 제품');
    listing = (await db.query('INSERT INTO organization_product_listings(organization_id,master_id) VALUES($1,$2) RETURNING id', [store, master]))[0].id;
    otherListing = (await db.query('INSERT INTO organization_product_listings(organization_id,master_id) VALUES($1,$2) RETURNING id', [other, otherMaster]))[0].id;
    supplier = (await db.query(`INSERT INTO neture_suppliers(slug) VALUES($1) RETURNING id`, [`pv-supplier-${randomUUID()}`]))[0].id;
    await db.query(`INSERT INTO supplier_product_offers(master_id,supplier_id,slug) VALUES($1,$2,$3)`, [master, supplier, `pv-offer-${randomUUID()}`]);
  });
  afterEach(async () => { await pg.query('ROLLBACK'); });

  it('a store links its own video only to a product it handles, and can clear it', async () => {
    const mine = await media({ organizationId: store });
    await expect(linkStoreMediaProduct(db, { serviceKey: SERVICE, organizationId: store }, mine, listing))
      .resolves.toEqual({ mediaId: mine, productMasterId: master, productName: '연결 제품' });
    expect(await masterOf(mine)).toBe(master);
    await expect(linkStoreMediaProduct(db, { serviceKey: SERVICE, organizationId: store }, mine, otherListing)).rejects.toMatchObject({ code: 'PRODUCT_NOT_HANDLED' });
    expect(await masterOf(mine)).toBe(master);
    await expect(linkStoreMediaProduct(db, { serviceKey: SERVICE, organizationId: store }, mine, null)).resolves.toMatchObject({ productMasterId: null });
    expect(await masterOf(mine)).toBeNull();
  });

  it("another store's video, a shared video or another service cannot be linked by this store", async () => {
    const theirs = await media({ organizationId: other });
    const shared = await media({ source: 'hq', scope: 'global' });
    const elsewhere = await media({ organizationId: store, serviceKey: 'neture' });
    for (const id of [theirs, shared, elsewhere]) {
      await expect(linkStoreMediaProduct(db, { serviceKey: SERVICE, organizationId: store }, id, listing)).rejects.toMatchObject({ code: 'MEDIA_NOT_FOUND' });
      expect(await masterOf(id)).toBeNull();
    }
  });

  it('the operator links shared (HQ) videos to any existing product, not store videos', async () => {
    const shared = await media({ source: 'hq', scope: 'global' });
    await expect(linkHqMediaProduct(db, SERVICE, shared, otherMaster)).resolves.toMatchObject({ productMasterId: otherMaster });
    await expect(linkHqMediaProduct(db, SERVICE, shared, randomUUID())).rejects.toMatchObject({ code: 'PRODUCT_NOT_FOUND' });
    await expect(linkHqMediaProduct(db, SERVICE, await media({ organizationId: store }), master)).rejects.toMatchObject({ code: 'MEDIA_NOT_FOUND' });
  });

  it('a supplier may only choose a product it supplies', async () => {
    await expect(assertSupplierProduct(db, supplier, master)).resolves.toBe(master);
    await expect(assertSupplierProduct(db, supplier, otherMaster)).rejects.toMatchObject({ code: 'PRODUCT_NOT_SUPPLIED' });
  });

  it("the store list shows own links and a copy's inherited link, never another store's", async () => {
    const shared = await media({ source: 'hq', scope: 'global' });
    await linkHqMediaProduct(db, SERVICE, shared, master);
    const copy = await media({ organizationId: store, parentMediaId: shared });
    const mine = await media({ organizationId: store });
    await linkStoreMediaProduct(db, { serviceKey: SERVICE, organizationId: store }, mine, listing);
    const theirs = await media({ organizationId: other });
    await db.query('UPDATE signage_media SET "productMasterId"=$1 WHERE id=$2', [otherMaster, theirs]);
    const rows = await listStoreMediaProducts(db, { serviceKey: SERVICE, organizationId: store });
    expect(rows).toHaveLength(2);
    expect(rows).toEqual(expect.arrayContaining([
      { mediaId: mine, productMasterId: master, productName: '연결 제품', inherited: false, listingId: listing },
      { mediaId: copy, productMasterId: master, productName: '연결 제품', inherited: true, listingId: listing },
    ]));
  });
});
