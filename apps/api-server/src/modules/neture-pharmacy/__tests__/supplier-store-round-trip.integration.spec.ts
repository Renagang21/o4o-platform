import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { ProductMaster, ProductCategory, Brand, RepresentativeProduct, ProductImage,
  NetureSupplier, SupplierProductOffer, ServiceAudiencePolicy, OfferServiceApproval,
  OfferServicePrice, NetureSupplierRegulatedCategory } from '../../neture/entities/index.js';
import { ProductIdentifier } from '../../neture/entities/ProductIdentifier.entity.js';
import { ProductDrugExtension } from '../../neture/entities/ProductDrugExtension.entity.js';
import { CheckoutOrder } from '../../../entities/checkout/CheckoutOrder.entity.js';
import { CheckoutPayment } from '../../../entities/checkout/CheckoutPayment.entity.js';
import { OrderLog } from '../../../entities/checkout/OrderLog.entity.js';
import { NetureOrder } from '../../../routes/neture/entities/neture-order.entity.js';
import { NetureOrderItem } from '../../../routes/neture/entities/neture-order-item.entity.js';
import { NetureProduct } from '../../../routes/neture/entities/neture-product.entity.js';
import { SupplierOfferRegistrationService } from '../../neture/services/supplier-offer-registration.service.js';
import { SupplierOfferWriteService } from '../../neture/services/supplier-offer-write.service.js';
import { OfferLifecycleService } from '../../neture/services/offer-lifecycle.service.js';
import { SupplierOrderService } from '../../neture/services/supplier-order.service.js';
import { ShipmentService } from '../../neture/services/shipment.service.js';
import { SettlementCommandService } from '../../neture/services/settlement-command.service.js';
import { NetureOrderStatus } from '../../../routes/neture/entities/neture-order.entity.js';
import { CheckoutFulfillmentBridgeService } from '../../../services/neture/checkout-fulfillment-bridge.service.js';
import { checkoutService } from '../../../services/checkout.service.js';
import { PharmacyMembershipService } from '../services/pharmacy-membership.service.js';
import { SemiFranchiseService } from '../services/semi-franchise.service.js';
import { PharmacyCartService } from '../services/pharmacy-cart.service.js';
import { PharmacyPaymentService } from '../services/pharmacy-payment.service.js';
import { EventOfferService } from '../../../routes/kpa/services/event-offer.service.js';

let ds: DataSource;
// Redirect the existing singleton to the dedicated fixture DB, preserving real repositories and transactions.
jest.mock('../../../database/connection.js', () => ({
  AppDataSource: new Proxy({}, {
    get: (_target, key) => {
      const value = (ds as any)?.[key];
      return typeof value === 'function' ? value.bind(ds) : value;
    },
  }),
}));
jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
// External notification delivery is outside this database workflow.
jest.mock('../../../services/NotificationService.js', () => ({
  notificationService: { createNotification: jest.fn() },
}));

const databaseUrl = process.env.NETURE_SUPPLIER_STORE_IT_DATABASE_URL;
if (databaseUrl) {
  const target = new URL(databaseUrl);
  if (target.protocol !== 'postgresql:' || target.hostname !== '127.0.0.1' || target.port !== '55432' ||
      target.pathname !== '/o4o_supplier_store_integration' || target.search || target.hash) {
    throw new Error('Supplier/store integration requires its dedicated loopback fixture database');
  }
}
const integration = databaseUrl ? describe : describe.skip;
const tag = randomUUID();
const today = () => new Date().toISOString().slice(0, 10);

integration('supplier → store → payment → shipment → settlement (real PostgreSQL)', () => {
  jest.setTimeout(60000);
  let supplierId: string;
  let ownerId: string;
  let operatorId: string;
  let offerId: string;
  let organizationId: string;

  beforeAll(async () => {
    ds = new DataSource({ type: 'postgres', url: databaseUrl,
      entities: [ProductMaster, ProductCategory, Brand, RepresentativeProduct, ProductImage,
        ProductIdentifier, ProductDrugExtension, NetureSupplier, SupplierProductOffer,
        ServiceAudiencePolicy, OfferServiceApproval, OfferServicePrice, NetureSupplierRegulatedCategory,
        CheckoutOrder, CheckoutPayment, OrderLog, NetureOrder, NetureOrderItem, NetureProduct],
      synchronize: false, logging: false });
    await ds.initialize();
    const makeUser = async (label: string) => {
      const [row] = await ds.query(`INSERT INTO users (email,status,"isActive","isEmailVerified")
        VALUES ($1,'active',true,true) RETURNING id`, [`${label}-${tag}@example.test`]);
      return row.id as string;
    };
    ownerId = await makeUser('owner');
    operatorId = await makeUser('operator');
    const supplierUser = await makeUser('supplier');
    await ds.query("INSERT INTO role_assignments(user_id,role,is_active) VALUES ($1,'neture:operator',true)", [operatorId]);
    const [supplier] = await ds.query(`INSERT INTO neture_suppliers(slug,status,user_id,base_shipping_fee,free_shipping_threshold)
      VALUES ($1,'ACTIVE',$2,3000,50000) RETURNING id`, [`supplier-${tag}`, supplierUser]);
    supplierId = supplier.id;
    const [master] = await ds.query(`INSERT INTO product_masters(name,regulatory_name,manufacturer_name,regulatory_type,status)
      VALUES ($1,$1,'Synthetic manufacturer','GENERAL','ACTIVE') RETURNING id`, [`Product-${tag}`]);

    const registration = new SupplierOfferRegistrationService();
    const created = await registration.createSupplierOfferFromExistingMaster(supplierId, {
      masterId: master.id, isPublic: true, consumerShortDescription: 'Synthetic integration product',
      priceGeneral: 10000, stockQuantity: 10,
    });
    expect(created).toMatchObject({ success: true, data: { approvalStatus: 'PENDING', isActive: false } });
    offerId = created.data!.id;
    expect(await registration.createSupplierOfferFromExistingMaster(supplierId, {
      masterId: master.id, isPublic: true, consumerShortDescription: 'Synthetic duplicate', priceGeneral: 1,
    })).toMatchObject({ success: false, error: 'OFFER_ALREADY_EXISTS' });
    expect(await new SupplierOfferWriteService().updateSupplierOffer(offerId, supplierId, { priceGeneral: 12000 }))
      .toMatchObject({ success: true });
    expect(await new SupplierOfferWriteService().updateSupplierOffer(offerId, randomUUID(), { priceGeneral: 1 }))
      .toMatchObject({ success: false, error: 'PRODUCT_NOT_FOUND' });
    expect((await ds.query('SELECT name,regulatory_type FROM product_masters WHERE id=$1', [master.id]))[0])
      .toMatchObject({ name: `Product-${tag}`, regulatory_type: 'GENERAL' });
    const lifecycle = new OfferLifecycleService();
    // No designated service target: the existing registration approval path is authoritative.
    expect(await lifecycle.submitForApproval(supplierId, [offerId])).toMatchObject({ submitted: 0, errors: [] });
    expect(await lifecycle.approveProduct(offerId, operatorId))
      .toMatchObject({ success: true, data: { approvalStatus: 'APPROVED', isActive: true } });
    await ds.query('UPDATE supplier_product_offers SET track_inventory=true WHERE id=$1', [offerId]);

    const membership = new PharmacyMembershipService(ds, {
      activate: async () => undefined, deactivate: async () => undefined,
    });
    const [proof] = await ds.query(`INSERT INTO kyc_documents(user_id,"documentType","fileUrl","fileName")
      VALUES ($1,'business_registration','gcs://local-it/synthetic.pdf','synthetic.pdf') RETURNING id`, [ownerId]);
    const applied = await membership.apply(ownerId, {
      pharmacyName: `Store-${tag}`, businessNumber: String(1000000000 + Math.floor(Math.random() * 8999999999)),
      pharmacistLicenseNumber: 'Synthetic license', businessRegistrationDocumentId: proof.id,
      representativeName: 'Synthetic owner', businessType: 'Synthetic', businessCategory: 'Synthetic',
      address: 'Synthetic address', phone: '0212345678',
    });
    await membership.decide(operatorId, applied.id, 'approve');
    organizationId = applied.organization_id;
    const franchises = new SemiFranchiseService(ds);
    await franchises.assignOperator('pharmacy', operatorId, operatorId);
    const franchise = (await franchises.getByKey('pharmacy'))!;
    const joined = await franchises.apply(organizationId, ownerId, 'pharmacy');
    await franchises.decideMembership(franchise, operatorId, joined.id, 'approve');
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  it('completes the pharmacy purchase with the real checkout and bridge, and preserves settlement scope', async () => {
    const cart = new PharmacyCartService(ds, new EventOfferService(ds), dto => checkoutService.createOrder(dto));
    const bridge = new CheckoutFulfillmentBridgeService(ds);
    const payment = new PharmacyPaymentService(ds, bridge, () => 'test');
    const orders = new SupplierOrderService(ds);
    const settlements = new SettlementCommandService(ds);
    await cart.add(ownerId, organizationId, { kind: 'default', id: offerId, quantity: 2 });
    const result = await cart.checkout(ownerId, organizationId);
    expect(result.failedItems).toEqual([]);
    expect(result.createdOrders).toHaveLength(1);
    const group = result.paymentGroups[0];
    const checkoutOrderId = group.orderIds[0];
    expect(await bridge.bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId }))
      .toMatchObject({ bridged: false, skippedReason: 'PAYMENT_NOT_READY' });

    const prepared = await payment.prepare(ownerId, group.paymentGroupId);
    expect(prepared.amount).toBe(27000);
    expect(await payment.prepare(ownerId, group.paymentGroupId))
      .toMatchObject({ paymentId: prepared.paymentId, reused: true });
    await expect(payment.confirm(operatorId, { paymentId: prepared.paymentId, paymentGroupId: group.paymentGroupId }))
      .rejects.toMatchObject({ code: 'PAYMENT_NOT_FOUND' });
    await payment.confirm(ownerId, { paymentId: prepared.paymentId, paymentGroupId: group.paymentGroupId });
    await payment.confirm(ownerId, { paymentId: prepared.paymentId, paymentGroupId: group.paymentGroupId });
    const projected = await ds.query("SELECT id,metadata FROM neture_orders WHERE metadata->>'checkoutOrderId'=$1", [checkoutOrderId]);
    expect(projected).toHaveLength(1);
    expect(projected[0].metadata).toMatchObject({ testPayment: true, buyerOrganizationId: organizationId });
    const orderId = projected[0].id;
    const buyerOrders = await checkoutService.findByBuyerId(ownerId);
    expect(buyerOrders).toEqual(expect.arrayContaining([expect.objectContaining({ id: checkoutOrderId, paymentStatus: 'paid' })]));
    expect(await orders.listOrders(supplierId, { page: 1, limit: 20 }))
      .toMatchObject({ data: expect.arrayContaining([expect.objectContaining({ id: orderId, test_payment: true })]) });
    expect(await orders.validateOwnership(orderId, randomUUID())).toBe(false);
    expect(await orders.updateStatus(orderId, supplierId, NetureOrderStatus.PREPARING)).toMatchObject({ success: true });
    const shipment = await orders.createShipment(orderId, supplierId, {
      carrier_code: 'synthetic', carrier_name: 'Synthetic carrier', tracking_number: `SYNTHETIC-${tag}`,
    });
    expect(shipment).toMatchObject({ success: true });
    expect(await orders.createShipment(orderId, supplierId, {
      carrier_code: 'synthetic', carrier_name: 'Synthetic carrier', tracking_number: `SYNTHETIC-${tag}`,
    })).toMatchObject({ error: 'SHIPMENT_EXISTS' });
    expect(await new ShipmentService(ds).updateShipment(shipment.data!.id, supplierId, { status: 'delivered' }))
      .toMatchObject({ success: true, isDelivered: true });
    const [inventory] = await ds.query('SELECT stock_quantity,reserved_quantity FROM supplier_product_offers WHERE id=$1', [offerId]);
    expect(inventory).toMatchObject({ stock_quantity: 8, reserved_quantity: 0 });
    expect(await new ShipmentService(ds).updateShipment(shipment.data!.id, supplierId, { status: 'delivered' }))
      .toMatchObject({ error: 'INVALID_TRANSITION' });
    expect((await ds.query('SELECT stock_quantity FROM supplier_product_offers WHERE id=$1', [offerId]))[0])
      .toMatchObject({ stock_quantity: 8 });
    // Neture's settlement policy deliberately excludes neture-pharmacy; never broaden it in a test.
    expect(await settlements.calculateSettlements(today(), today())).toMatchObject({ data: { created: 0 } });
  });

  it('settles an eligible Neture order exactly once after payment and delivery', async () => {
    const order = await checkoutService.createOrder({
      buyerId: ownerId, sellerId: organizationId, supplierId, sellerOrganizationId: organizationId,
      items: [{ productId: offerId, productName: 'Synthetic integration product', quantity: 1, unitPrice: 12000, subtotal: 12000 }],
      metadata: { source: 'neture_b2b_checkout', serviceKey: 'neture' },
    });
    const bridge = new CheckoutFulfillmentBridgeService(ds);
    expect(await bridge.bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId: order.id }))
      .toMatchObject({ skippedReason: 'PAYMENT_NOT_READY' });
    await checkoutService.completePayment(order.id, {
      paymentKey: `synthetic-${tag}`, method: 'test', approvedAt: new Date().toISOString(), metadata: { testPayment: true },
    });
    const bridged = await bridge.bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId: order.id });
    expect(bridged.bridged).toBe(true);
    const supplierOrders = new SupplierOrderService(ds);
    await supplierOrders.updateStatus(bridged.netureOrderId!, supplierId, NetureOrderStatus.PREPARING);
    const shipment = await supplierOrders.createShipment(bridged.netureOrderId!, supplierId, {
      carrier_code: 'synthetic', carrier_name: 'Synthetic carrier', tracking_number: `SETTLE-${tag}`,
    });
    expect(shipment).toMatchObject({ success: true });
    const settlements = new SettlementCommandService(ds);
    expect(await settlements.calculateSettlements(today(), today())).toMatchObject({ data: { created: 0 } });
    await new ShipmentService(ds).updateShipment(shipment.data!.id, supplierId, { status: 'delivered' });
    const calculated = await settlements.calculateSettlements(today(), today());
    expect(calculated.data.settlements).toEqual([expect.objectContaining({
      supplier_id: supplierId, total_sales: 12000, platform_fee: 1200, supplier_amount: 10800, order_count: 1,
    })]);
    expect(await settlements.calculateSettlements(today(), today())).toMatchObject({ data: { created: 0 } });
    const settlementId = calculated.data.settlements[0].id;
    expect(await settlements.approveSettlement(settlementId)).toMatchObject({ success: true });
    expect(await settlements.paySettlement(settlementId)).toMatchObject({ success: true });
    expect(await settlements.paySettlement(settlementId)).toBeNull();
  });
});
