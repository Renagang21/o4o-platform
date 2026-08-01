/**
 * CheckoutFulfillmentBridgeService — bridge source registry 계약
 *
 * WO-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1
 *
 * 이 테스트가 지키는 것:
 *   ① **Neture 무회귀** — `neture_b2b_checkout` 의 sourceService 라벨과 게이트 동작이 이전과 같다.
 *   ② Pharmacy-Hub 주문이 같은 bridge 를 타고, service_key 를 승계한다.
 *   ③ 등록되지 않은 source 는 여전히 거부된다 (아무 주문이나 fulfillment 로 새지 않는다).
 *   ④ payment-first guard — 미결제 주문은 어떤 source 든 bridge 되지 않는다.
 *
 * DB 없이 검증하기 위해 DataSource 의 query/transaction 만 흉내 낸다.
 */
import { CheckoutFulfillmentBridgeService } from '../checkout-fulfillment-bridge.service.js';

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

interface FakeOrder {
  source: string;
  serviceKey?: string;
  paid?: boolean;
}

/** 저장된 neture_order 를 캡처하는 가짜 DataSource */
function makeDataSource(order: FakeOrder) {
  const saved: { order?: any; items?: any[] } = {};
  const paid = order.paid !== false;

  const checkoutRow = {
    id: 'co-1',
    orderNumber: 'CO-0001',
    buyer_id: '11111111-1111-4111-8111-111111111111',
    supplier_id: 'sup-1',
    subtotal: 10000,
    shipping_fee: 3000,
    total_amount: 13000,
    status: paid ? 'paid' : 'created',
    payment_status: paid ? 'paid' : 'pending',
    payment_method: 'card',
    paid_at: paid ? '2026-08-01T00:00:00.000Z' : null,
    shipping_address: { recipientName: '홍길동', phone: '010-0000-0000' },
    items: [{ productId: 'offer-1', productName: '상품', quantity: 2, unitPrice: 5000, subtotal: 10000 }],
    metadata: {
      source: order.source,
      ...(order.serviceKey ? { serviceKey: order.serviceKey } : {}),
      paymentGroupId: 'pg-1',
    },
  };

  const dataSource: any = {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM checkout_orders')) return [checkoutRow];
      if (sql.includes('FROM neture_orders')) return []; // 아직 bridge 안 됨
      return [];
    }),
    transaction: jest.fn(async (cb: (m: any) => Promise<string>) => {
      const manager = {
        getRepository: (entity: any) => ({
          create: (v: any) => v,
          save: async (v: any) => {
            if (Array.isArray(v)) {
              saved.items = v;
              return v;
            }
            saved.order = v;
            return { ...v, id: 'neture-order-1' };
          },
        }),
      };
      void entityUnused(manager);
      return cb(manager);
    }),
  };
  return { dataSource, saved };
}

function entityUnused(_m: unknown): void {
  /* 가독성용 no-op */
}

describe('CheckoutFulfillmentBridgeService — bridge source registry', () => {
  it('① Neture B2B 주문은 기존과 동일하게 bridge 된다 (무회귀)', async () => {
    const { dataSource, saved } = makeDataSource({ source: 'neture_b2b_checkout' });
    const result = await new CheckoutFulfillmentBridgeService(dataSource)
      .bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId: 'co-1' });

    expect(result.bridged).toBe(true);
    expect(saved.order.metadata.sourceService).toBe('neture-b2b');
    expect(saved.order.metadata.originalSource).toBe('neture_b2b_checkout');
    // serviceKey 미표기 → 레거시 규칙대로 'neture'
    expect(saved.order.serviceKey).toBe('neture');
  });

  it('② Pharmacy-Hub 주문은 같은 bridge 를 타고 service_key 를 승계한다', async () => {
    const { dataSource, saved } = makeDataSource({
      source: 'pharmacy_hub_cart',
      serviceKey: 'pharmacy-hub',
    });
    const result = await new CheckoutFulfillmentBridgeService(dataSource)
      .bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId: 'co-1' });

    expect(result.bridged).toBe(true);
    expect(saved.order.serviceKey).toBe('pharmacy-hub');
    expect(saved.order.metadata.sourceService).toBe('pharmacy-hub');
    expect(saved.order.metadata.checkoutOrderId).toBe('co-1');
    // 취소·환불 추적축이 보존된다
    expect(saved.order.metadata.paymentGroupId).toBe('pg-1');
  });

  it('②-b Pharmacy-Hub 라인의 product_id 는 공급자 조인 축(SPO id)을 그대로 옮긴다', async () => {
    const { dataSource, saved } = makeDataSource({
      source: 'pharmacy_hub_cart',
      serviceKey: 'pharmacy-hub',
    });
    await new CheckoutFulfillmentBridgeService(dataSource)
      .bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId: 'co-1' });

    // 이 값이 SPO id 가 아니면 공급자 주문 목록 조인이 성립하지 않는다
    expect(saved.items?.[0].productId).toBe('offer-1');
  });

  it('③ 등록되지 않은 source 는 거부된다', async () => {
    const { dataSource } = makeDataSource({ source: 'some_other_cart' });
    const result = await new CheckoutFulfillmentBridgeService(dataSource)
      .bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId: 'co-1' });

    expect(result.bridged).toBe(false);
    expect(result.skippedReason).toBe('UNSUPPORTED_SOURCE');
  });

  it('④ 미결제 주문은 bridge 되지 않는다 (payment-first)', async () => {
    const { dataSource } = makeDataSource({
      source: 'pharmacy_hub_cart',
      serviceKey: 'pharmacy-hub',
      paid: false,
    });
    const result = await new CheckoutFulfillmentBridgeService(dataSource)
      .bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId: 'co-1' });

    expect(result.bridged).toBe(false);
    expect(result.skippedReason).toBe('PAYMENT_NOT_READY');
  });
});
