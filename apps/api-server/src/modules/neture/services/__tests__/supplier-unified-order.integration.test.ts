import { DataSource, type QueryRunner } from 'typeorm';
import { SupplierUnifiedOrderService } from '../supplier-unified-order.service.js';

// Explicit disposable loopback DB only. Never load application .env or production credentials.
const port = Number(process.env.O4O_SUPPLIER_ORDER_TEST_PORT);
const integration = Number.isInteger(port) && port > 1024 && port <= 65535 && ![5432, 5442].includes(port)
  ? describe : describe.skip;
const supplierId = '10000000-0000-0000-0000-000000000001';
const offerId = '20000000-0000-0000-0000-000000000001';
const otherSupplierId = '10000000-0000-0000-0000-000000000002';
const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

integration('supplier unified orders (isolated PostgreSQL)', () => {
  let ds: DataSource;
  let q: QueryRunner;
  let service: SupplierUnifiedOrderService;
  beforeAll(async () => {
    ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username: 'postgres',
      database: 'o4o_supplier_order_fixture', entities: [], synchronize: false });
    await ds.initialize();
  });
  afterAll(async () => { if (ds?.isInitialized) await ds.destroy(); });
  beforeEach(async () => {
    q = ds.createQueryRunner();
    await q.startTransaction();
    // All fixtures and DDL are rolled back. This is a dedicated empty database.
    await q.query(`
      CREATE SCHEMA neture;
      CREATE TABLE supplier_product_offers(id uuid PRIMARY KEY, supplier_id uuid);
      CREATE TABLE neture_orders(id uuid PRIMARY KEY, order_number text, status text,
        total_amount numeric, shipping_fee numeric, final_amount numeric, orderer_name text,
        created_at timestamptz, updated_at timestamptz, service_key text, metadata jsonb);
      CREATE TABLE neture.neture_order_items(order_id uuid, product_id text, product_name text,
        quantity int, unit_price numeric, total_price numeric);
      CREATE TABLE users(id uuid PRIMARY KEY, name text);
      CREATE TABLE organizations(id uuid PRIMARY KEY, name text);
      CREATE TABLE checkout_orders(id uuid PRIMARY KEY, "orderNumber" text, metadata jsonb,
        status text, "paymentStatus" text, subtotal numeric, "shippingFee" numeric,
        "totalAmount" numeric, items jsonb, "buyerId" uuid, "sellerOrganizationId" uuid,
        "createdAt" timestamptz, "updatedAt" timestamptz, "supplierId" uuid);
    `);
    await q.query('INSERT INTO supplier_product_offers VALUES ($1,$2)', [offerId, supplierId]);
    service = new SupplierUnifiedOrderService({ query: (sql: string, params: unknown[]) => q.query(sql, params) } as unknown as DataSource);
  });
  afterEach(async () => {
    if (q?.isTransactionActive) await q.rollbackTransaction();
    if (q) await q.release();
  });

  async function neture(n: number, serviceKey: string | null = 'neture', metadata: object = {}) {
    await q.query(`INSERT INTO neture_orders VALUES ($1::uuid,$1::text,'paid',12.5,2.5,15,'Fixture buyer',
      '2026-01-01T00:00:00Z',NULL,$2,$3::jsonb)`, [id(n), serviceKey, JSON.stringify(metadata)]);
    await q.query(`INSERT INTO neture.neture_order_items VALUES ($1,$2,'Fixture item',1,12.5,12.5)`, [id(n), offerId]);
  }
  async function checkout(n: number, payment = 'paid', owner = supplierId, serviceKey = 'neture') {
    await q.query(`INSERT INTO checkout_orders VALUES ($1::uuid,$1::text,$2::jsonb,'created',$3,12.5,2.5,15,
      '[{"productName":"Fixture item","quantity":1,"unitPrice":12.5,"subtotal":12.5}]',
      NULL,NULL,'2026-01-01T00:00:00Z',NULL,$4)`,
    [id(n), JSON.stringify({ serviceKey }), payment, owner]);
  }

  it('reads beyond 300 orders and counts the full source even on an empty page', async () => {
    await q.query(`INSERT INTO neture_orders
      SELECT ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,n::text,'paid',12.5,2.5,15,
        'Fixture buyer','2026-01-01'::timestamptz,NULL,'neture','{}'::jsonb FROM generate_series(1,305) n`);
    await q.query(`INSERT INTO neture.neture_order_items
      SELECT id,$1,'Fixture item',1,12.5,12.5 FROM neture_orders`, [offerId]);
    const result = await service.listUnifiedOrders(supplierId, { page: 16, limit: 20, source: 'neture' });
    expect(result.meta).toEqual({ page: 16, limit: 20, total: 305, totalPages: 16 });
    expect(result.data.map((order) => order.id)).toEqual([301,302,303,304,305].map(id));
    expect(result.data[0]).toMatchObject({ source: 'neture_order', canFulfill: true,
      fulfillmentUrl: `/supplier/orders/${id(301)}`, totalAmount: 15, itemCount: 1,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: null });
    const empty = await service.listUnifiedOrders(supplierId, { page: 17, limit: 20, source: 'neture' });
    expect(empty.data).toEqual([]);
    expect(empty.meta.total).toBe(305);
  });

  it('preserves ownership, service scope, payment-first and bridge deduplication', async () => {
    await neture(1, null, { checkoutOrderId: id(101), testPayment: true });
    await neture(2, 'excluded-service');
    await checkout(101); // Already represented by neture order 1.
    await checkout(102);
    await checkout(103, 'pending');
    await checkout(104, 'failed');
    await checkout(105, 'paid', otherSupplierId);
    await checkout(106, 'paid', supplierId, 'excluded-service');
    // A Neture order whose item belongs to a different supplier must not leak either.
    await q.query('INSERT INTO supplier_product_offers VALUES ($1,$2)', [id(900), otherSupplierId]);
    await q.query(`INSERT INTO neture_orders SELECT $1,order_number,status,total_amount,shipping_fee,
      final_amount,orderer_name,created_at,updated_at,'neture','{}'::jsonb FROM neture_orders WHERE id=$2`, [id(901),id(1)]);
    await q.query(`INSERT INTO neture.neture_order_items VALUES ($1,$2,'Other fixture item',1,12.5,12.5)`, [id(901),id(900)]);
    const result = await service.listUnifiedOrders(supplierId, { page: 1, limit: 20 });
    expect(result.meta.total).toBe(2);
    expect(result.data.map((order) => order.id)).toEqual([id(102), id(1)]);
    expect(result.data[0]).toMatchObject({ source: 'checkout_order', paymentStatus: 'paid',
      canFulfill: false, fulfillmentUrl: null, itemCount: 1, totalAmount: 15 });
    expect(result.data[1].testPayment).toBe(true);
    expect((await service.listUnifiedOrders(supplierId, { page: 1, limit: 20, source: 'checkout' })).meta.total).toBe(1);
  });

  it('counts and pages more than 300 unbridged paid checkout orders', async () => {
    await q.query(`INSERT INTO checkout_orders
      SELECT ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,n::text,
        '{"serviceKey":"neture"}'::jsonb,'created','paid',12.5,2.5,15,'[]'::jsonb,
        NULL,NULL,'2026-01-01'::timestamptz,NULL,$1 FROM generate_series(1,305) n`, [supplierId]);
    const result = await service.listUnifiedOrders(supplierId, { page: 16, limit: 20, source: 'checkout' });
    expect(result.meta.total).toBe(305);
    expect(result.data.map((order) => order.id)).toEqual([301,302,303,304,305].map(id));
    expect(result.data.every((order) => order.canFulfill === false && order.fulfillmentUrl === null)).toBe(true);
  });

  it('pages ties across sources without duplicates or omitted rows', async () => {
    await neture(1); await neture(2); await checkout(101); await checkout(102);
    const first = await service.listUnifiedOrders(supplierId, { page: 1, limit: 3 });
    const second = await service.listUnifiedOrders(supplierId, { page: 2, limit: 3 });
    expect([...first.data, ...second.data].map((order) => order.id)).toEqual([101,102,1,2].map(id));
    expect(first.meta.total).toBe(4);
  });

  it('returns a valid empty list only when there are genuinely no visible orders', async () => {
    expect(await service.listUnifiedOrders(supplierId, { page: 1, limit: 20 })).toEqual({
      data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
    });
  });

  it('fails the combined view when a requested source is unavailable', async () => {
    await neture(1);
    await q.query('DROP TABLE checkout_orders');
    // A source filter must not query the excluded ledger.
    expect((await service.listUnifiedOrders(supplierId, { page: 1, limit: 20, source: 'neture' })).meta.total).toBe(1);
    await expect(service.listUnifiedOrders(supplierId, { page: 1, limit: 20 })).rejects.toThrow();
  });
});
