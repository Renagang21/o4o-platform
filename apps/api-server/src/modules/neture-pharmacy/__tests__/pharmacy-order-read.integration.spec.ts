import { randomUUID } from 'node:crypto';
import { DataSource, type QueryRunner } from 'typeorm';
import { listPharmacyOrders } from '../services/pharmacy-order-read.service.js';

const rawPort = process.env.O4O_STORE_ORDER_READ_TEST_PORT;
const port = Number(rawPort);
const safePort = Number.isInteger(port) && port > 1024 && port <= 65535 && ![5432, 5442].includes(port);
if (rawPort && !safePort) throw new Error('Order read fixture requires an explicit non-production loopback port');
const integration = safePort ? describe : describe.skip;

integration('store order delivery projection in isolated PostgreSQL', () => {
  let ds: DataSource;
  let q: QueryRunner;
  let buyer: string;
  let organization: string;
  let supplier: string;
  const read = () => listPharmacyOrders({ query: (sql, params) => q.query(sql, params) }, buyer, organization);

  beforeAll(async () => {
    ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port, username: 'postgres',
      database: 'o4o_store_order_read_fixture', entities: [], synchronize: false, logging: false });
    await ds.initialize();
    q = ds.createQueryRunner();
    await q.connect();
    await q.startTransaction();
    // Connection-local tables and all fixture writes disappear on rollback; no app schema is read or changed.
    await q.query(`CREATE TEMP TABLE checkout_orders (
      id uuid PRIMARY KEY, "orderNumber" text, "buyerId" uuid, "sellerOrganizationId" uuid,
      "supplierId" text, status text, "paymentStatus" text, "totalAmount" numeric, "shippingFee" numeric,
      "createdAt" timestamptz DEFAULT NOW(), "paidAt" timestamptz, items jsonb, metadata jsonb);
      CREATE TEMP TABLE neture_orders(id uuid PRIMARY KEY, status text, service_key text,
        created_at timestamptz DEFAULT NOW(), metadata jsonb);
      CREATE TEMP TABLE neture_shipments(id uuid PRIMARY KEY, order_id uuid, supplier_id uuid,
        status text, carrier_name text, tracking_number text, shipped_at timestamptz,
        delivered_at timestamptz, created_at timestamptz DEFAULT NOW());`);
  });
  beforeEach(async () => {
    await q.query('TRUNCATE checkout_orders,neture_orders,neture_shipments');
    buyer = randomUUID(); organization = randomUUID(); supplier = randomUUID();
  });
  afterAll(async () => {
    if (q?.isTransactionActive) await q.rollbackTransaction();
    if (q && !q.isReleased) await q.release();
    if (ds?.isInitialized) await ds.destroy();
  });

  async function order(overrides: { buyer?: string; organization?: string; service?: string } = {}) {
    const id = randomUUID();
    await q.query(`INSERT INTO checkout_orders(id,"orderNumber","buyerId","sellerOrganizationId","supplierId",
      status,"paymentStatus","totalAmount","shippingFee",items,metadata)
      VALUES ($1::uuid,$1::text,$2,$3,$4,'paid','paid',13000,3000,'[]',$5::jsonb)`,
    [id, overrides.buyer ?? buyer, overrides.organization ?? organization, supplier,
      JSON.stringify({ serviceKey: overrides.service ?? 'neture-pharmacy', testPayment: true })]);
    return id;
  }
  async function fulfillment(checkoutId: string, overrides: { supplier?: string; service?: string } = {}) {
    const id = randomUUID();
    await q.query("INSERT INTO neture_orders VALUES($1,'shipped',$2,clock_timestamp(),$3::jsonb)",
      [id, overrides.service ?? 'neture-pharmacy', JSON.stringify({ checkoutOrderId: checkoutId, supplierId: overrides.supplier ?? supplier })]);
    return id;
  }
  async function shipment(orderId: string, owner = supplier, date = '2026-10-14T01:00:00Z', tracking = 'TRACK-1') {
    await q.query("INSERT INTO neture_shipments VALUES($1,$2,$3,'shipped','Synthetic carrier',$4,NOW(),NULL,$5)",
      [randomUUID(), orderId, owner, tracking, date]);
  }

  it('adds tracking while preserving checkout payment status and amounts', async () => {
    const checkoutId = await order();
    await shipment(await fulfillment(checkoutId));
    expect(await read()).toEqual([expect.objectContaining({
      id: checkoutId, status: 'paid', paymentStatus: 'paid', totalAmount: '13000', testPayment: true,
      fulfillmentStatus: 'shipped', shipment: expect.objectContaining({ status: 'shipped', carrierName: 'Synthetic carrier', trackingNumber: 'TRACK-1' }),
    })]);
  });
  it('keeps unbridged orders with null delivery data', async () => {
    const id = await order();
    expect(await read()).toEqual([expect.objectContaining({ id, fulfillmentStatus: null, shipment: null })]);
  });
  it('excludes other buyers, selected stores and services', async () => {
    const own = await order();
    await order({ buyer: randomUUID() });
    await order({ organization: randomUUID() });
    await order({ service: 'neture' });
    expect((await read()).map((row: { id: string }) => row.id)).toEqual([own]);
  });
  it('does not attach another supplier or service projection', async () => {
    const id = await order();
    await shipment(await fulfillment(id, { supplier: randomUUID() }));
    await shipment(await fulfillment(id, { service: 'kpa-society' }));
    expect(await read()).toEqual([expect.objectContaining({ id, fulfillmentStatus: null, shipment: null })]);
  });
  it('does not expose a shipment belonging to another supplier', async () => {
    const id = await order();
    await shipment(await fulfillment(id), randomUUID());
    expect(await read()).toEqual([expect.objectContaining({ id, fulfillmentStatus: 'shipped', shipment: null })]);
  });
  it('does not duplicate a checkout row and chooses the latest matching shipment', async () => {
    const id = await order();
    const fulfillmentId = await fulfillment(id);
    await shipment(fulfillmentId);
    await shipment(fulfillmentId, supplier, '2026-10-14T02:00:00Z', 'LATEST');
    await fulfillment(id);
    const rows = await read();
    expect(rows).toHaveLength(1);
    // The oldest projection is canonical even if an old duplicate exists.
    expect(rows[0].shipment.trackingNumber).toBe('LATEST');
  });
  it('preserves the latest-200 limit before delivery enrichment', async () => {
    await q.query(`INSERT INTO checkout_orders(id,"orderNumber","buyerId","sellerOrganizationId","supplierId",
      status,"paymentStatus","totalAmount","createdAt",metadata)
      SELECT md5(n::text)::uuid,n::text,$1,$2,$3,'paid','paid',1000,
        '2026-10-14T00:00:00Z'::timestamptz+n*INTERVAL '1 minute','{"serviceKey":"neture-pharmacy"}'
      FROM generate_series(1,205) n`, [buyer, organization, supplier]);
    const rows = await read();
    expect(rows).toHaveLength(200);
    expect(rows[0].orderNumber).toBe('205');
    expect(rows[199].orderNumber).toBe('6');
  });
});
