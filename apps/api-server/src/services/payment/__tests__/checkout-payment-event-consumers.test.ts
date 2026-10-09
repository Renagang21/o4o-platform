const mockCompleted = new Map<string, (event: any) => Promise<void>>();
const mockFailed = new Map<string, (event: any) => Promise<void>>();
const mockBridge = jest.fn();
jest.mock('../PaymentEventHub.js', () => ({ paymentEventHub: {
  onPaymentCompleted: jest.fn((callback, key) => mockCompleted.set(key, callback)),
  onPaymentFailed: jest.fn((callback, key) => mockFailed.set(key, callback)),
} }));
jest.mock('../../neture/checkout-fulfillment-bridge.service.js', () => ({
  CheckoutFulfillmentBridgeService: jest.fn(() => ({ bridgeCheckoutOrderToNetureFulfillment: mockBridge })),
}));
jest.mock('../../../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

import { PharmacyHubPaymentEventHandler } from '../../pharmacy-hub/PharmacyHubPaymentEventHandler.js';
import { NetureB2bCheckoutPaymentEventHandler } from '../../neture/NetureB2bCheckoutPaymentEventHandler.js';
import { StoreB2bCheckoutPaymentEventHandler } from '../b2b/StoreB2bCheckoutPaymentEventHandler.js';
import { CheckoutOrderStatus, CheckoutPaymentStatus } from '../../../entities/checkout/CheckoutOrder.entity.js';

const cases = [
  { key: 'pharmacy-hub', Consumer: PharmacyHubPaymentEventHandler, metadata: { source: 'pharmacy_hub_cart', serviceKey: 'pharmacy-hub' } },
  { key: 'neture-b2b', Consumer: NetureB2bCheckoutPaymentEventHandler, metadata: { source: 'neture_b2b_checkout' } },
  { key: 'store-b2b', Consumer: StoreB2bCheckoutPaymentEventHandler, metadata: { source: 'store_b2b_cart', serviceKey: 'kpa-society' } },
];

beforeEach(() => {
  jest.useFakeTimers();
  mockCompleted.clear();
  mockFailed.clear();
  mockBridge.mockReset().mockResolvedValue({ bridged: true, netureOrderId: 'fulfilled' });
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

function makeConsumer(spec: typeof cases[number], status = CheckoutOrderStatus.PENDING_PAYMENT) {
  const order: any = { id: 'order-1', orderNumber: 'order-1', status, paymentStatus: CheckoutPaymentStatus.PENDING, metadata: spec.metadata };
  const qb: any = { where: jest.fn(() => qb), getMany: jest.fn(async () => [order]) };
  const repo = { findOne: jest.fn(async () => null), createQueryBuilder: () => qb, save: jest.fn(async o => o) };
  const consumer = new spec.Consumer({ getRepository: () => repo } as any);
  consumer.initialize();
  const event = { paymentId: 'payment-1', orderId: 'group-1', serviceKey: spec.key, paymentMethod: 'TEST', approvedAt: new Date() };
  return { order, repo, consumer, event, qb };
}

describe.each(cases)('$key payment completion consumer', spec => {
  it.each([CheckoutOrderStatus.CREATED, CheckoutOrderStatus.PENDING_PAYMENT])('transitions a payable group (%s) and ignores a duplicate event', async status => {
    const { order, repo, event, consumer } = makeConsumer(spec, status);
    await mockCompleted.get(spec.key)!(event);
    await mockCompleted.get(spec.key)!(event);
    expect(order.status).toBe(CheckoutOrderStatus.PAID);
    expect(order.paymentStatus).toBe(CheckoutPaymentStatus.PAID);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(mockBridge).toHaveBeenCalledTimes(1);
    expect(consumer.getStats().processedPaymentsCount).toBe(1);
  });

  it('retries fulfillment for an already paid order without rewriting it', async () => {
    const { repo, event } = makeConsumer(spec, CheckoutOrderStatus.PAID);
    await mockCompleted.get(spec.key)!(event);
    expect(repo.save).not.toHaveBeenCalled();
    expect(mockBridge).toHaveBeenCalledWith({ checkoutOrderId: 'order-1' });
  });

  it('never revives a cancelled order or sends it to fulfillment', async () => {
    const { repo, event, order } = makeConsumer(spec, CheckoutOrderStatus.CANCELLED);
    await mockCompleted.get(spec.key)!(event);
    await mockFailed.get(spec.key)!({ ...event, errorCode: 'TEST_FAILURE' });
    expect(order.status).toBe(CheckoutOrderStatus.CANCELLED);
    expect(repo.save).not.toHaveBeenCalled();
    expect(mockBridge).not.toHaveBeenCalled();
  });

  it('keeps a valid payment paid when fulfillment fails', async () => {
    const { order, repo, event } = makeConsumer(spec);
    mockBridge.mockRejectedValue(new Error('fulfillment unavailable'));
    await mockCompleted.get(spec.key)!(event);
    expect(order.status).toBe(CheckoutOrderStatus.PAID);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('a later failure event cannot overwrite a paid order', async () => {
    const { order, repo, event } = makeConsumer(spec, CheckoutOrderStatus.PAID);
    order.paymentStatus = CheckoutPaymentStatus.PAID;
    await mockFailed.get(spec.key)!({ ...event, errorCode: 'LATE_FAILURE' });
    expect(order.paymentStatus).toBe(CheckoutPaymentStatus.PAID);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('marks failure only while payable and rejects another service source', async () => {
    const { order, repo, event } = makeConsumer(spec);
    await mockFailed.get(spec.key)!({ ...event, errorCode: 'TEST_FAILURE' });
    expect(order.paymentStatus).toBe(CheckoutPaymentStatus.FAILED);
    expect(repo.save).toHaveBeenCalledTimes(1);
    repo.save.mockClear();
    order.metadata = { source: 'foreign-source', serviceKey: 'foreign-service' };
    await mockCompleted.get(spec.key)!({ ...event, paymentId: 'other-payment' });
    expect(repo.save).not.toHaveBeenCalled();
    expect(mockBridge).not.toHaveBeenCalled();
  });
});
