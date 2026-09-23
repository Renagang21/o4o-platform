/**
 * WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1 §5
 *
 * 승인축 B2B · Event Offer 의 payment-first 계약을 소스/런타임 양쪽에서 고정한다.
 *
 * 핵심 불변식:
 *   1. checkout_orders = 주문+결제 SSOT · UNPAID → fulfillment/배송/정산 0
 *   2. Event Offer 는 특가일 뿐 — 전용 결제 엔진/전용 UX 없음, 같은 bridge/handler 사용
 *   3. 소비자→매장 commerce 경로(/kpa/payments · /cosmetics/payments)는 410 유지 · 부활 금지
 *   4. 외부 택배사 integration 0 (O4O 는 배송 실행자가 아니다)
 *   5. collectionStatus 기반 무결제 fulfillment/settlement 0
 *   6. 새 payment engine / 새 PG / 새 *_orders 테이블 0
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  STORE_B2B_PAYMENT_SERVICE_KEY,
  STORE_B2B_PAYABLE_ORDER_SOURCES,
  STORE_B2B_CART_ORDER_SOURCE,
  EVENT_OFFER_CART_ORDER_SOURCE,
  KPA_B2B_SERVICE_KEYS,
  COSMETICS_B2B_SERVICE_KEYS,
} from '../services/payment/b2b/store-b2b-payment.constants.js';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

const BRIDGE = 'apps/api-server/src/services/neture/checkout-fulfillment-bridge.service.ts';
const FACTORY = 'apps/api-server/src/services/payment/b2b/b2b-payment-controller.factory.ts';
const HANDLER = 'apps/api-server/src/services/payment/b2b/StoreB2bCheckoutPaymentEventHandler.ts';
const KPA_ROUTES = 'apps/api-server/src/routes/kpa/kpa.routes.ts';
const COS_ROUTES = 'apps/api-server/src/routes/cosmetics/cosmetics.routes.ts';
const KPA_LEGACY_PAY = 'apps/api-server/src/routes/kpa/controllers/kpa-payment.controller.ts';
const COS_LEGACY_PAY = 'apps/api-server/src/routes/cosmetics/controllers/cosmetics-payment.controller.ts';
const SUPPLIER_ORDER_SVC = 'apps/api-server/src/modules/neture/services/supplier-order.service.ts';
const SETTLEMENT_SVC = 'apps/api-server/src/modules/neture/services/neture-settlement.service.ts';
const SHIPMENT_SVC = 'apps/api-server/src/modules/neture/services/shipment.service.ts';
const SHIPMENT_CTL = 'apps/api-server/src/modules/neture/controllers/shipment.controller.ts';
const BOOTSTRAP = 'apps/api-server/src/bootstrap/register-routes.ts';
const EVENT_OFFER_CHECKOUT = 'apps/api-server/src/services/cart/event-offer-cart-checkout.service.ts';
const NETURE_PAY_CTL = 'apps/api-server/src/routes/neture/controllers/neture-b2b-payment.controller.ts';

/** 코드 본문만 (주석은 "하지 않는 것" 을 설명하려고 이름을 언급한다) */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

describe('§2-C bridge — Event Offer 가 공급자에게 전달된다', () => {
  const bridge = read(BRIDGE);

  it('BRIDGE_SOURCES 에 Event Offer source 가 등록돼 있다', () => {
    expect(bridge).toMatch(/store_cart_checkout:\s*\{\s*sourceService:/);
  });

  it('기존 3 source 는 그대로다 (무회귀)', () => {
    expect(bridge).toContain('pharmacy_hub_cart:');
    expect(bridge).toContain('store_b2b_cart:');
    expect(bridge).toMatch(/\[NETURE_B2B_ORDER_SOURCE\]:/);
  });

  it('bridge 는 payment-first 다 — paid 아닌 주문을 bridge 하지 않는다', () => {
    expect(bridge).toContain("paymentStatus='paid'");
    expect(bridge).toMatch(/pending bridge 금지|pending.*금지/);
  });

  it('bridge 는 idempotent dedup 계약을 유지한다', () => {
    expect(bridge).toContain('checkoutOrderId');
  });
});

describe('§2-E 공통 B2B payment 계약', () => {
  const factory = stripComments(read(FACTORY));
  const handler = stripComments(read(HANDLER));

  it('승인축 B2B 와 Event Offer 가 같은 결제 축을 쓴다 (전용 엔진 없음)', () => {
    expect(STORE_B2B_PAYABLE_ORDER_SOURCES).toEqual(
      expect.arrayContaining([STORE_B2B_CART_ORDER_SOURCE, EVENT_OFFER_CART_ORDER_SOURCE]),
    );
    expect(STORE_B2B_PAYMENT_SERVICE_KEY).toBe('store-b2b');
  });

  it('기존 PaymentCore + Toss adapter 를 재사용한다 (새 PG/engine 0)', () => {
    expect(factory).toContain("from '@o4o/payment-core'");
    expect(factory).toContain('TossPaymentProviderAdapter');
    expect(factory).toMatch(/paymentService\.prepare\(/);
    expect(factory).toMatch(/paymentService\.confirm\(/);
  });

  it('factory 는 새 payment table/상태머신을 만들지 않는다', () => {
    for (const forbidden of ['CREATE TABLE', 'new PaymentStateMachine', '_payments', 'INSERT INTO payments']) {
      expect(factory).not.toContain(forbidden);
    }
  });

  it('결제 대상은 source + serviceKey 두 경계로 제한된다 (타 서비스 주문 결제 금지)', () => {
    expect(factory).toContain('allowedSources.includes(source)');
    expect(factory).toContain('allowedServiceKeys.includes(serviceKey)');
  });

  it('payable state 는 pending + (created|pending_payment) 뿐이다', () => {
    expect(factory).toContain('CheckoutPaymentStatus.PENDING');
    expect(factory).toContain('CheckoutOrderStatus.CREATED');
    expect(factory).toContain('CheckoutOrderStatus.PENDING_PAYMENT');
  });

  it('handler 는 payment.completed 를 구독해 paid 전이 후 bridge 한다', () => {
    expect(handler).toContain('onPaymentCompleted');
    expect(handler).toContain('STORE_B2B_PAYMENT_SERVICE_KEY');
    expect(handler).toContain('CheckoutPaymentStatus.PAID');
    expect(handler).toContain('bridgeCheckoutOrderToNetureFulfillment');
  });

  it('handler 는 재고를 추가 차감하지 않는다 (Event Offer 원자 확보 보존)', () => {
    for (const forbidden of ['reserved_quantity', 'total_quantity', 'reserveEventOfferListing', 'FOR UPDATE']) {
      expect(handler).not.toContain(forbidden);
    }
  });

  it('handler 는 중복 payment event 를 무시한다 (neture_order 중복 0)', () => {
    expect(handler).toContain('processedPayments');
  });

  it('bootstrap 이 공통 handler 를 등록한다', () => {
    expect(read(BOOTSTRAP)).toContain('initializeStoreB2bCheckoutPaymentHandler');
  });
});

describe('§1.1-A 소비자 commerce 경계 — 410 은 그대로다', () => {
  it('KPA/K-Cos 의 기존 payments 컨트롤러는 여전히 410 Gone 이다', () => {
    for (const rel of [KPA_LEGACY_PAY, COS_LEGACY_PAY]) {
      const src = read(rel);
      expect(src).toMatch(/410/);
      expect(src).toMatch(/router\.post\('\/prepare',\s*gone\)/);
      expect(src).toMatch(/router\.post\('\/confirm',\s*gone\)/);
    }
  });

  it('신규 B2B 결제는 별도 namespace(/b2b/payments)로만 마운트된다', () => {
    expect(read(KPA_ROUTES)).toContain("router.use(\n    '/b2b/payments',");
    expect(read(COS_ROUTES)).toContain("'/b2b/payments',");
  });

  it('기존 소비자 /payments 마운트는 유지된다 (410 응답 경로 보존)', () => {
    expect(read(KPA_ROUTES)).toContain("router.use('/payments', kpaPaymentController);");
    expect(read(COS_ROUTES)).toContain("router.use('/payments', paymentController);");
  });

  it('서비스별 결제 허용 serviceKey 는 B2B/특가 축뿐이다', () => {
    expect(KPA_B2B_SERVICE_KEYS).toEqual(['kpa-society', 'kpa-groupbuy']);
    expect(COSMETICS_B2B_SERVICE_KEYS).toEqual(['k-cosmetics', 'k-cosmetics-event-offer']);
  });
});

describe('§2-K collectionStatus — 무결제 fulfillment/settlement 0', () => {
  it('fulfillment readiness 가 collectionStatus 를 보지 않는다', () => {
    const code = stripComments(read(SUPPLIER_ORDER_SVC));
    expect(code).not.toContain('collectionStatus');
    expect(code).toContain('fulfillmentReady: paymentReady || statusReady');
  });

  it('settlement eligibility SQL 이 collectionStatus 를 보지 않는다', () => {
    const code = stripComments(read(SETTLEMENT_SVC));
    expect(code).not.toContain('collectionStatus');
  });
});

describe('§2-H 배송 — O4O 는 배송 실행자가 아니다', () => {
  const svc = stripComments(read(SHIPMENT_SVC));
  const ctl = stripComments(read(SHIPMENT_CTL));

  it.each([
    'carrierApi', 'carrier_api', 'dispatch', 'pickup', '3pl', 'logistics',
    'createWaybill', 'issueLabel', 'trackingApi', 'sweettracker', 'delivery-tracker',
  ])('외부 택배사 integration "%s" 참조 0', (token) => {
    expect(svc.toLowerCase()).not.toContain(token.toLowerCase());
    expect(ctl.toLowerCase()).not.toContain(token.toLowerCase());
  });

  it('shipment 는 상태 + tracking 기록만 한다', () => {
    expect(svc).toContain('tracking_number');
    expect(svc).toContain('status');
  });

  it('외부 HTTP client 를 쓰지 않는다', () => {
    for (const token of ['axios', 'fetch(', 'node-fetch', 'got(']) {
      expect(svc).not.toContain(token);
    }
  });
});

describe('§2-I Event Offer 재고 — 기존 원자 확보 보존', () => {
  const checkout = read(EVENT_OFFER_CHECKOUT);

  it('checkout-confirm 이 원자 확보(reserveEventOfferListing)를 유지한다', () => {
    expect(checkout).toContain('reserveEventOfferListing');
  });

  it('Event Offer 주문은 pending 으로 생성된다 (payment-first)', () => {
    expect(checkout).toContain("source: 'store_cart_checkout'");
  });
});

describe('Neture B2B 무회귀 — 회귀 기준 파일 불변', () => {
  it('Neture B2B payment controller 는 자체 serviceKey 를 유지한다', () => {
    const src = read(NETURE_PAY_CTL);
    expect(src).toContain("const NETURE_B2B_SOURCE_SERVICE = 'neture-b2b'");
    expect(src).toContain("const NETURE_B2B_ORDER_SOURCE = 'neture_b2b_checkout'");
  });

  it('공통 factory 는 Neture 의 source 를 가로채지 않는다', () => {
    expect(STORE_B2B_PAYABLE_ORDER_SOURCES).not.toContain('neture_b2b_checkout');
    expect(STORE_B2B_PAYABLE_ORDER_SOURCES).not.toContain('pharmacy_hub_cart');
  });
});
