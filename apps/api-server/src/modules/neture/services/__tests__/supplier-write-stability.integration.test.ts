import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { NetureOrder, NetureOrderStatus } from '../../../../routes/neture/entities/neture-order.entity.js';
import { NetureOrderItem } from '../../../../routes/neture/entities/neture-order-item.entity.js';
import { NetureProduct } from '../../../../routes/neture/entities/neture-product.entity.js';
import { NetureProductLog } from '../../../../routes/neture/entities/neture-product-log.entity.js';
import { NetureService } from '../../../../routes/neture/services/neture.service.js';
import { SupplierOrderService } from '../supplier-order.service.js';
import { ShipmentService } from '../shipment.service.js';
import { InventoryService } from '../inventory.service.js';
import { SettlementCommandService } from '../settlement-command.service.js';
import { notificationService } from '../../../../services/NotificationService.js';

jest.mock('../../../../services/NotificationService.js', () => ({
  notificationService: { createNotification: jest.fn() },
}));
jest.mock('../../middleware/supplier-context.resolver.js', () => ({
  listSupplierOwnerUserIds: jest.fn().mockResolvedValue(['fixture-owner']),
}));
jest.mock('../../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Explicit disposable loopback DB only; never load application env or use either production proxy port.
const port = Number(process.env.O4O_SUPPLIER_WRITE_TEST_PORT);
const fixture =
  Number.isInteger(port) && port > 1024 && port <= 65535 && ![5432, 5442].includes(port) ? describe : describe.skip;
fixture('supplier writes: PostgreSQL rollback, races and retries', () => {
  let ds: DataSource;
  let supplierId: string;
  let offerId: string;
  let orderId: string;
  let orders: SupplierOrderService;
  let shipments: ShipmentService;
  let settlements: SettlementCommandService;
  const carrier = { carrier_code: 'fixture', carrier_name: 'Fixture carrier', tracking_number: 'fixture-1' };

  beforeAll(async () => {
    ds = new DataSource({
      type: 'postgres',
      host: '127.0.0.1',
      port,
      username: 'postgres',
      database: 'o4o_supplier_write_fixture',
      entities: [NetureOrder, NetureOrderItem, NetureProduct, NetureProductLog],
      synchronize: false,
      extra: { max: 8, options: '-c statement_timeout=10000 -c lock_timeout=5000' },
    });
    await ds.initialize();
    // This named fixture database is disposable and cannot select the application DB.
    await ds.dropDatabase();
    await ds.query('CREATE SCHEMA IF NOT EXISTS neture');
    await ds.synchronize();
    await ds.query(`CREATE TABLE product_masters(id uuid PRIMARY KEY, name text, brand_name text);
      CREATE TABLE supplier_product_offers(id uuid PRIMARY KEY, supplier_id uuid NOT NULL, master_id uuid REFERENCES product_masters,
        stock_quantity int DEFAULT 10, reserved_quantity int DEFAULT 2, low_stock_threshold int DEFAULT 1,
        track_inventory boolean DEFAULT true, updated_at timestamptz DEFAULT NOW());
      CREATE TABLE neture_shipments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid REFERENCES neture_orders,
        supplier_id uuid NOT NULL, carrier_code text NOT NULL, carrier_name text NOT NULL, tracking_number text NOT NULL,
        status text NOT NULL, shipped_at timestamptz, delivered_at timestamptz, updated_at timestamptz DEFAULT NOW());
      CREATE TABLE neture_settlements(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), supplier_id uuid NOT NULL,
        period_start date, period_end date, total_sales int, platform_fee int, supplier_amount int, platform_fee_rate numeric(5,4),
        order_count int, status text, notes text, approved_at timestamptz, paid_at timestamptz, updated_at timestamptz DEFAULT NOW());
      CREATE TABLE neture_settlement_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), settlement_id uuid REFERENCES neture_settlements,
        order_id uuid UNIQUE REFERENCES neture_orders, supplier_sales_amount int);
      CREATE OR REPLACE FUNCTION fixture_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture injected failure'; END $$;`);
    orders = new SupplierOrderService(ds);
    shipments = new ShipmentService(ds);
    settlements = new SettlementCommandService(ds);
  });
  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    for (const table of ['neture_orders', 'neture_settlement_orders']) {
      await ds.query(`DROP TRIGGER IF EXISTS fixture_failure ON ${table}`);
    }
    await ds.query(`TRUNCATE neture_settlement_orders, neture_settlements, neture_shipments,
      neture.neture_order_items, neture_orders, supplier_product_offers, product_masters, neture.neture_products CASCADE`);
    supplierId = randomUUID();
    offerId = randomUUID();
    orderId = randomUUID();
    const masterId = randomUUID();
    await ds.query('INSERT INTO product_masters VALUES ($1, $2, $3)', [masterId, 'Fixture item', 'Fixture brand']);
    await ds.query('INSERT INTO supplier_product_offers(id,supplier_id,master_id) VALUES ($1,$2,$3)', [
      offerId,
      supplierId,
      masterId,
    ]);
    await ds.getRepository(NetureProduct).save({ id: offerId, name: 'Fixture item', basePrice: 10, stock: 10 });
    await ds.getRepository(NetureOrder).save({
      id: orderId,
      orderNumber: randomUUID(),
      userId: randomUUID(),
      status: NetureOrderStatus.PREPARING,
      paidAt: new Date(),
      metadata: { source: 'checkout_order', paymentReady: true },
    });
    await ds
      .getRepository(NetureOrderItem)
      .save({ orderId, productId: offerId, productName: 'Fixture item', quantity: 2, unitPrice: 10, totalPrice: 20 });
  });
  async function state() {
    return {
      order: (await ds.query('SELECT status FROM neture_orders WHERE id=$1', [orderId]))[0].status,
      stock: (
        await ds.query('SELECT stock_quantity,reserved_quantity FROM supplier_product_offers WHERE id=$1', [offerId])
      )[0],
      shipments: await ds.query('SELECT * FROM neture_shipments WHERE order_id=$1', [orderId]),
    };
  }
  async function fail(table: string, operation: string) {
    await ds.query(
      `CREATE TRIGGER fixture_failure BEFORE ${operation} ON ${table} FOR EACH ROW EXECUTE FUNCTION fixture_fail()`,
    );
  }
  async function eligible() {
    await ds.query("UPDATE neture_orders SET status='delivered',updated_at='2026-01-15' WHERE id=$1", [orderId]);
  }
  async function calculate() {
    return settlements.calculateSettlements('2026-01-01', '2026-01-31');
  }

  it('rolls back shipment insertion when the order update fails; retry creates one shipment', async () => {
    await fail('neture_orders', 'UPDATE');
    await expect(orders.createShipment(orderId, supplierId, carrier)).rejects.toThrow('fixture injected failure');
    expect(await state()).toMatchObject({ order: 'preparing', shipments: [] });
    await ds.query('DROP TRIGGER fixture_failure ON neture_orders');
    expect(await orders.createShipment(orderId, supplierId, carrier)).toMatchObject({ success: true });
    expect(await state()).toMatchObject({
      order: 'shipped',
      shipments: [expect.objectContaining({ status: 'shipped' })],
    });
    expect(await orders.createShipment(orderId, supplierId, carrier)).toEqual({ error: 'SHIPMENT_EXISTS' });
  });
  it('concurrent shipment requests serialize to one shipment', async () => {
    const results = await Promise.all([
      orders.createShipment(orderId, supplierId, carrier),
      orders.createShipment(orderId, supplierId, carrier),
    ]);
    expect(results.filter((r) => 'success' in r)).toHaveLength(1);
    expect(results.filter((r) => 'error' in r)).toEqual([{ error: 'SHIPMENT_EXISTS' }]);
    expect((await state()).shipments).toHaveLength(1);
  });
  it('rolls back delivery status and inventory together, then deducts only once on retry', async () => {
    const created = await orders.createShipment(orderId, supplierId, carrier);
    if (!created.data) throw new Error('fixture shipment missing');
    await fail('neture_orders', 'UPDATE');
    await expect(shipments.updateShipment(created.data.id, supplierId, { status: 'delivered' })).rejects.toThrow(
      'fixture injected failure',
    );
    expect(await state()).toMatchObject({
      order: 'shipped',
      stock: { stock_quantity: 10, reserved_quantity: 2 },
      shipments: [expect.objectContaining({ status: 'shipped', delivered_at: null })],
    });
    await ds.query('DROP TRIGGER fixture_failure ON neture_orders');
    await shipments.updateShipment(created.data.id, supplierId, { status: 'delivered' });
    const retry = await shipments.updateShipment(created.data.id, supplierId, { status: 'delivered' });
    expect(retry).toMatchObject({ error: 'INVALID_TRANSITION', currentStatus: 'delivered' });
    expect(await state()).toMatchObject({ order: 'delivered', stock: { stock_quantity: 8, reserved_quantity: 0 } });
  });
  it('concurrent direct delivery and shipment delivery deduct inventory once', async () => {
    const created = await orders.createShipment(orderId, supplierId, carrier);
    if (!created.data) throw new Error('fixture shipment missing');
    await Promise.all([
      orders.updateStatus(orderId, supplierId, NetureOrderStatus.DELIVERED),
      shipments.updateShipment(created.data.id, supplierId, { status: 'delivered' }),
    ]);
    expect(await state()).toMatchObject({
      order: 'delivered',
      stock: { stock_quantity: 8, reserved_quantity: 0 },
      shipments: [expect.objectContaining({ status: 'delivered' })],
    });
  });
  it('cannot regress delivered to in_transit under competing updates', async () => {
    const created = await orders.createShipment(orderId, supplierId, carrier);
    if (!created.data) throw new Error('fixture shipment missing');
    await Promise.all([
      shipments.updateShipment(created.data.id, supplierId, { status: 'delivered' }),
      shipments.updateShipment(created.data.id, supplierId, { status: 'in_transit' }),
    ]);
    expect((await state()).shipments[0].status).toBe('delivered');
    expect((await state()).stock.stock_quantity).toBe(8);
  });
  it('rejects foreign supplier and unpaid checkout writes without changes', async () => {
    expect(await orders.createShipment(orderId, randomUUID(), carrier)).toEqual({ error: 'ORDER_NOT_FOUND' });
    await ds.query('UPDATE neture_orders SET paid_at=NULL,metadata=\'{"source":"checkout_order"}\' WHERE id=$1', [
      orderId,
    ]);
    expect(await orders.createShipment(orderId, supplierId, carrier)).toEqual({
      error: 'FULFILLMENT_NOT_PAYMENT_READY',
    });
    expect(await orders.updateStatus(orderId, supplierId, NetureOrderStatus.SHIPPED)).toEqual({
      error: 'FULFILLMENT_NOT_PAYMENT_READY',
    });
    expect(await state()).toMatchObject({ order: 'preparing', shipments: [] });
  });
  it('concurrent cancellation releases legacy inventory only once and rolls back failed update', async () => {
    const service = new NetureService(ds);
    await fail('neture_orders', 'UPDATE');
    await expect(service.updateOrderStatus(orderId, { status: NetureOrderStatus.CANCELLED })).rejects.toThrow(
      'fixture injected failure',
    );
    expect((await state()).stock.reserved_quantity).toBe(2);
    expect((await ds.getRepository(NetureProduct).findOneByOrFail({ id: offerId })).stock).toBe(10);
    await ds.query('DROP TRIGGER fixture_failure ON neture_orders');
    await Promise.all([
      service.updateOrderStatus(orderId, { status: NetureOrderStatus.CANCELLED }),
      service.updateOrderStatus(orderId, { status: NetureOrderStatus.CANCELLED }),
    ]);
    expect((await state()).stock.reserved_quantity).toBe(0);
    expect((await ds.getRepository(NetureProduct).findOneByOrFail({ id: offerId })).stock).toBe(12);
  });
  it('refuses an explicitly supplied manager outside a transaction', async () => {
    await expect(new NetureService(ds).updateOrderStatus(orderId, { status: NetureOrderStatus.DELIVERED }, ds.manager))
      .rejects.toThrow('active transaction');
    expect(await state()).toMatchObject({ order: 'preparing', stock: { stock_quantity: 10, reserved_quantity: 2 } });
  });
  it('inventory response read failure rolls back the PATCH', async () => {
    // A SELECT-side DB error after UPDATE must undo that update too.
    await ds.query('ALTER TABLE product_masters RENAME COLUMN brand_name TO fixture_brand_name');
    try {
      await expect(
        new InventoryService(ds).updateInventory(offerId, supplierId, { stock_quantity: 25 }),
      ).rejects.toThrow();
      expect((await state()).stock.stock_quantity).toBe(10);
    } finally {
      await ds.query('ALTER TABLE product_masters RENAME COLUMN fixture_brand_name TO brand_name');
    }
  });
  it('inventory PATCH returns the updated row and preserves ownership/no-op contracts', async () => {
    const service = new InventoryService(ds);
    expect(await service.updateInventory(offerId, randomUUID(), { stock_quantity: 25 })).toBeNull();
    expect(await service.updateInventory(offerId, supplierId, {})).toBe('NO_UPDATES');
    expect(
      await service.updateInventory(offerId, supplierId, {
        stock_quantity: 25,
        low_stock_threshold: 3,
        track_inventory: false,
      }),
    ).toMatchObject({
      stock_quantity: 25,
      reserved_quantity: 2,
      available_stock: 23,
      low_stock_threshold: 3,
      track_inventory: false,
    });
  });
  it('rolls back settlement creation when a junction insert fails; retry creates once', async () => {
    await eligible();
    await fail('neture_settlement_orders', 'INSERT');
    await expect(calculate()).rejects.toThrow('fixture injected failure');
    expect(await ds.query('SELECT * FROM neture_settlements')).toHaveLength(0);
    await ds.query('DROP TRIGGER fixture_failure ON neture_settlement_orders');
    expect((await calculate()).data.created).toBe(1);
    expect((await calculate()).data.created).toBe(0);
    expect(await ds.query('SELECT * FROM neture_settlement_orders')).toHaveLength(1);
  });
  it('concurrent overlapping settlement periods cannot create duplicate settlements', async () => {
    await eligible();
    const results = await Promise.all([calculate(), settlements.calculateSettlements('2026-01-10', '2026-02-01')]);
    expect(results.map((r) => r.data.created).sort()).toEqual([0, 1]);
    expect(await ds.query('SELECT * FROM neture_settlements')).toHaveLength(1);
    expect(await ds.query('SELECT * FROM neture_settlement_orders')).toHaveLength(1);
  });
  it('failed cancellation preserves status and links; successful retry permits recalculation', async () => {
    await eligible();
    const result = await calculate();
    const id = result.data.settlements[0].id;
    await fail('neture_settlement_orders', 'DELETE');
    await expect(settlements.cancelSettlement(id, 'Fixture note')).rejects.toThrow('fixture injected failure');
    expect((await ds.query('SELECT status,notes FROM neture_settlements WHERE id=$1', [id]))[0]).toEqual({
      status: 'calculated',
      notes: null,
    });
    expect(await ds.query('SELECT * FROM neture_settlement_orders')).toHaveLength(1);
    await ds.query('DROP TRIGGER fixture_failure ON neture_settlement_orders');
    await settlements.cancelSettlement(id);
    expect(await settlements.cancelSettlement(id)).toBeNull();
    expect((await calculate()).data.created).toBe(1);
  });
  it('keeps paid/unpaid/service scopes and rounded fee policy', async () => {
    await eligible();
    await ds.query("UPDATE neture_orders SET paid_at=NULL,metadata='{}' WHERE id=$1", [orderId]);
    expect((await calculate()).data.created).toBe(0);
    await ds.query(
      "UPDATE neture_orders SET metadata='{\"paymentReady\":true}',service_key='kpa-society' WHERE id=$1",
      [orderId],
    );
    expect((await calculate()).data.created).toBe(0);
    await ds.query("UPDATE neture_orders SET service_key='neture' WHERE id=$1", [orderId]);
    expect((await calculate()).data.settlements[0]).toMatchObject({
      total_sales: 20,
      platform_fee: 2,
      supplier_amount: 18,
      order_count: 1,
    });
  });

  it('approval/payment return a row and repeat payment neither changes it nor duplicates notifications', async () => {
    await eligible();
    const id = (await calculate()).data.settlements[0].id;
    expect(await settlements.approveSettlement(id)).toMatchObject({ success: true, data: { id, status: 'approved' } });
    const results = await Promise.all([settlements.paySettlement(id), settlements.paySettlement(id)]);
    expect(results.filter(Boolean)).toEqual([
      expect.objectContaining({ success: true, data: expect.objectContaining({ id, status: 'paid' }) }),
    ]);
    expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
    expect(await settlements.cancelSettlement(id)).toBeNull();
    expect(await ds.query('SELECT * FROM neture_settlement_orders')).toHaveLength(1);
  });

  it('a mixed-supplier order violating the existing unique link constraint rolls back the whole batch', async () => {
    await eligible();
    const otherOffer = randomUUID();
    await ds.getRepository(NetureProduct).save({ id: otherOffer, name: 'Fixture other item', basePrice: 10 });
    await ds.query(
      'INSERT INTO supplier_product_offers(id,supplier_id,master_id) SELECT $1,$2,master_id FROM supplier_product_offers WHERE id=$3',
      [otherOffer, randomUUID(), offerId],
    );
    const item = await ds
      .getRepository(NetureOrderItem)
      .save({
        orderId,
        productId: otherOffer,
        productName: 'Fixture other item',
        quantity: 1,
        unitPrice: 10,
        totalPrice: 10,
      });
    await expect(calculate()).rejects.toThrow('duplicate key');
    expect(await ds.query('SELECT * FROM neture_settlements')).toHaveLength(0);
    expect(await ds.query('SELECT * FROM neture_settlement_orders')).toHaveLength(0);
    await ds.getRepository(NetureOrderItem).delete(item.id);
    expect((await calculate()).data.created).toBe(1);
  });

  it('settlement waits for a competing order change and rechecks eligibility after the lock', async () => {
    await eligible();
    const runner = ds.createQueryRunner();
    await runner.startTransaction();
    let calculation: ReturnType<typeof calculate> | undefined;
    try {
      await runner.query('SELECT id FROM neture_orders WHERE id=$1 FOR UPDATE', [orderId]);
      calculation = calculate();
      let waiting = false;
      for (let attempt = 0; attempt < 50 && !waiting; attempt++) {
        const rows = await ds.query(
          "SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%WITH eligible_orders%'",
        );
        waiting = rows.length > 0;
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
      await runner.query("UPDATE neture_orders SET status='cancelled' WHERE id=$1", [orderId]);
      await runner.commitTransaction();
      expect((await calculation).data.created).toBe(0);
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
      if (calculation) await calculation;
    }
  });
});
