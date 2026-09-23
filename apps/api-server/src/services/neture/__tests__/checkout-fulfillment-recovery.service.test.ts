/**
 * WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1 §2-F
 *
 * paid-but-unbridged 복구 계약.
 *
 * 요구 불변식:
 *   - paid + no fulfillment → recovery → neture_order 1
 *   - 동일 recovery 재실행 → 여전히 1 (멱등 · no-op)
 *   - unpaid → recovery 거부 (결제 상태 변경 0)
 *   - unsupported/타 주문 → 거부 (오조작 금지)
 *   - 6개 활성 producer source 전부 recovery 가능
 */
import { CheckoutFulfillmentRecoveryService } from '../checkout-fulfillment-recovery.service.js';
import { BRIDGE_SOURCES } from '../checkout-fulfillment-bridge.service.js';

const bridgeMock = jest.fn();
jest.mock('../checkout-fulfillment-bridge.service.js', () => {
  const actual = jest.requireActual('../checkout-fulfillment-bridge.service.js');
  return {
    ...actual,
    CheckoutFulfillmentBridgeService: jest.fn().mockImplementation(() => ({
      bridgeCheckoutOrderToNetureFulfillment: (...a: unknown[]) => bridgeMock(...a),
    })),
  };
});

const ORDER = '11111111-1111-4111-8111-111111111111';

type OrderRow = {
  id: string;
  status: string;
  paymentStatus: string;
  source: string | null;
  serviceKey: string | null;
};

const paidOrder = (o: Partial<OrderRow> = {}): OrderRow => ({
  id: ORDER,
  status: 'paid',
  paymentStatus: 'paid',
  source: 'store_cart_checkout',
  serviceKey: 'kpa-groupbuy',
  ...o,
});

/** dataSource.query mock — 주문 조회와 stuck 목록 조회를 구분한다 */
function makeDataSource(order: OrderRow | null, stuckRows: Record<string, unknown>[] = []) {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes('NOT EXISTS')) return stuckRows;
    if (sql.includes('FROM checkout_orders WHERE id')) return order ? [order] : [];
    return [];
  });
  return { query } as any;
}

beforeEach(() => {
  bridgeMock.mockReset();
});

describe('listStuckOrders — 전 producer 공통 탐지', () => {
  it('BRIDGE_SOURCES 의 source 만 대상으로 조회한다 (registry SSOT)', async () => {
    const ds = makeDataSource(null, []);
    const svc = new CheckoutFulfillmentRecoveryService(ds);
    await svc.listStuckOrders();
    const [sql, params] = ds.query.mock.calls[0];
    expect(sql).toContain("co.\"paymentStatus\" = 'paid'");
    expect(sql).toContain('NOT EXISTS');
    expect(sql).toContain("no2.metadata->>'checkoutOrderId'");
    // registry 전체가 파라미터로 들어간다
    expect(params[0].sort()).toEqual(Object.keys(BRIDGE_SOURCES).sort());
  });

  it('활성 producer 6종(source 4 · serviceKey 확장)을 모두 포함한다', async () => {
    const ds = makeDataSource(null, []);
    await new CheckoutFulfillmentRecoveryService(ds).listStuckOrders();
    const params = ds.query.mock.calls[0][1];
    for (const src of ['neture_b2b_checkout', 'pharmacy_hub_cart', 'store_b2b_cart', 'store_cart_checkout']) {
      expect(params[0]).toContain(src);
    }
  });

  it('serviceKey 로 경계를 좁힐 수 있다', async () => {
    const ds = makeDataSource(null, []);
    await new CheckoutFulfillmentRecoveryService(ds).listStuckOrders({
      scope: { serviceKeys: ['kpa-groupbuy'] },
    });
    const [sql, params] = ds.query.mock.calls[0];
    expect(sql).toContain("co.metadata->>'serviceKey' = ANY");
    expect(params[1]).toEqual(['kpa-groupbuy']);
  });

  it('결과를 정규화해 돌려준다', async () => {
    const ds = makeDataSource(null, [
      { id: ORDER, orderNumber: 'ORD-1', serviceKey: 'kpa-groupbuy', source: 'store_cart_checkout', supplierId: 's1', totalAmount: '5000', paidAt: '2026-09-23T00:00:00.000Z' },
    ]);
    const items = await new CheckoutFulfillmentRecoveryService(ds).listStuckOrders();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: ORDER, totalAmount: 5000, source: 'store_cart_checkout' });
  });
});

describe('recoverOrder — 복구 · 멱등 · 거부', () => {
  it('paid + 미전달 → bridge 재호출 → neture_order 1', async () => {
    bridgeMock.mockResolvedValue({ bridged: true, netureOrderId: 'no-1' });
    const svc = new CheckoutFulfillmentRecoveryService(makeDataSource(paidOrder()));
    const out = await svc.recoverOrder(ORDER, { actorId: 'admin-1' });
    expect(out).toMatchObject({ ok: true, netureOrderId: 'no-1', alreadyBridged: false });
    expect(bridgeMock).toHaveBeenCalledTimes(1);
    expect(bridgeMock).toHaveBeenCalledWith({ checkoutOrderId: ORDER });
  });

  it('동일 recovery 재실행 → 여전히 1 (ALREADY_BRIDGED no-op)', async () => {
    bridgeMock.mockResolvedValue({ bridged: false, netureOrderId: 'no-1', skippedReason: 'ALREADY_BRIDGED' });
    const svc = new CheckoutFulfillmentRecoveryService(makeDataSource(paidOrder()));
    const out = await svc.recoverOrder(ORDER);
    expect(out).toMatchObject({ ok: true, netureOrderId: 'no-1', alreadyBridged: true });
  });

  it.each([
    ['created/pending', { status: 'created', paymentStatus: 'pending' }],
    ['cancelled', { status: 'cancelled', paymentStatus: 'pending' }],
    ['paid status 만', { status: 'created', paymentStatus: 'paid' }],
  ])('unpaid(%s) → 거부 · bridge 미호출 (결제 상태 변경 0)', async (_label, patch) => {
    const svc = new CheckoutFulfillmentRecoveryService(makeDataSource(paidOrder(patch)));
    const out = await svc.recoverOrder(ORDER);
    expect(out).toMatchObject({ ok: false, code: 'ORDER_NOT_PAID' });
    expect(bridgeMock).not.toHaveBeenCalled();
  });

  it('없는 주문 → ORDER_NOT_FOUND', async () => {
    const svc = new CheckoutFulfillmentRecoveryService(makeDataSource(null));
    const out = await svc.recoverOrder(ORDER);
    expect(out).toMatchObject({ ok: false, code: 'ORDER_NOT_FOUND' });
    expect(bridgeMock).not.toHaveBeenCalled();
  });

  it('registry 밖 source → UNSUPPORTED_SOURCE (타 주문 오조작 금지)', async () => {
    const svc = new CheckoutFulfillmentRecoveryService(makeDataSource(paidOrder({ source: 'legacy_consumer_checkout' })));
    const out = await svc.recoverOrder(ORDER);
    expect(out).toMatchObject({ ok: false, code: 'UNSUPPORTED_SOURCE' });
    expect(bridgeMock).not.toHaveBeenCalled();
  });

  it('scope 밖 source → OUT_OF_SCOPE', async () => {
    const svc = new CheckoutFulfillmentRecoveryService(makeDataSource(paidOrder({ source: 'pharmacy_hub_cart' })));
    const out = await svc.recoverOrder(ORDER, { scope: { sources: ['store_cart_checkout'] } });
    expect(out).toMatchObject({ ok: false, code: 'OUT_OF_SCOPE' });
    expect(bridgeMock).not.toHaveBeenCalled();
  });

  it('scope 밖 serviceKey → OUT_OF_SCOPE (타 서비스 운영자 차단)', async () => {
    const svc = new CheckoutFulfillmentRecoveryService(makeDataSource(paidOrder({ serviceKey: 'k-cosmetics-event-offer' })));
    const out = await svc.recoverOrder(ORDER, { scope: { serviceKeys: ['kpa-groupbuy'] } });
    expect(out).toMatchObject({ ok: false, code: 'OUT_OF_SCOPE' });
    expect(bridgeMock).not.toHaveBeenCalled();
  });

  it('bridge 가 netureOrderId 없이 실패 → RECOVERY_FAILED', async () => {
    bridgeMock.mockResolvedValue({ bridged: false, skippedReason: 'NO_ITEMS' });
    const svc = new CheckoutFulfillmentRecoveryService(makeDataSource(paidOrder()));
    const out = await svc.recoverOrder(ORDER);
    expect(out).toMatchObject({ ok: false, code: 'RECOVERY_FAILED' });
  });

  it.each(Object.keys(BRIDGE_SOURCES))('활성 producer source "%s" 는 복구 가능하다', async (source) => {
    bridgeMock.mockResolvedValue({ bridged: true, netureOrderId: 'no-x' });
    const svc = new CheckoutFulfillmentRecoveryService(makeDataSource(paidOrder({ source })));
    const out = await svc.recoverOrder(ORDER);
    expect(out.ok).toBe(true);
  });
});

describe('recoverMany — 부분 성공', () => {
  it('실패해도 다음 건을 계속한다', async () => {
    const ids = [ORDER, '22222222-2222-4222-8222-222222222222'];
    const ds = makeDataSource(paidOrder());
    bridgeMock
      .mockResolvedValueOnce({ bridged: false, skippedReason: 'NO_ITEMS' })
      .mockResolvedValueOnce({ bridged: true, netureOrderId: 'no-2' });
    const out = await new CheckoutFulfillmentRecoveryService(ds).recoverMany(ids);
    expect(out).toHaveLength(2);
    expect(out[0].ok).toBe(false);
    expect(out[1].ok).toBe(true);
  });
});
