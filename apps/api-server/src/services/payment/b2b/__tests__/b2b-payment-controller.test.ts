/**
 * WO-O4O-SUPPLIER-ORDER-PAYMENT-FULFILLMENT-SETTLEMENT-CANONICALIZATION-V1 §5
 *
 * 공통 B2B payment controller 런타임 계약 (supertest).
 * PaymentCoreService 는 mock — 이 테스트는 **경계 판정**(소유권 · source · serviceKey · payable state)을 고정한다.
 */
import express from 'express';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { createB2bPaymentController } from '../b2b-payment-controller.factory.js';
import { KPA_B2B_SERVICE_KEYS } from '../store-b2b-payment.constants.js';

const prepareMock = jest.fn();
const confirmMock = jest.fn();
const getStatusMock = jest.fn();

// virtual: jest moduleNameMapper 에 @o4o/payment-core 항목이 없다(공유 config 미접촉).
jest.mock(
  '@o4o/payment-core',
  () => ({
    PaymentCoreService: jest.fn().mockImplementation(() => ({
      prepare: (...a: unknown[]) => prepareMock(...a),
      confirm: (...a: unknown[]) => confirmMock(...a),
      getStatus: (...a: unknown[]) => getStatusMock(...a),
    })),
  }),
  { virtual: true },
);
jest.mock('../../adapters/TypeORMPaymentRepository.js', () => ({ TypeORMPaymentRepository: jest.fn() }));
jest.mock('../../adapters/TossPaymentProviderAdapter.js', () => ({ TossPaymentProviderAdapter: jest.fn() }));
jest.mock('../../adapters/EventHubPaymentPublisher.js', () => ({ EventHubPaymentPublisher: jest.fn() }));

const USER = '11111111-1111-4111-8111-111111111111';
const ORDER = '22222222-2222-4222-8222-222222222222';

type OrderRow = Record<string, unknown> | null;

function makeApp(order: OrderRow, groupOrders: OrderRow[] = []) {
  const findOne = jest.fn(async ({ where }: { where: { id: string; buyerId?: string } }) =>
    order && order.id === where.id && (!where.buyerId || order.buyerId === where.buyerId) ? order : null,
  );
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(async () => groupOrders.filter(Boolean)),
    getCount: jest.fn(async () => groupOrders.filter(Boolean).length),
  };
  const dataSource = {
    getRepository: () => ({ findOne, createQueryBuilder: () => qb }),
  } as unknown as DataSource;

  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.headers['x-test-user']) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      return;
    }
    (req as unknown as { user: unknown }).user = { id: req.headers['x-test-user'] as string };
    next();
  };

  const app = express();
  app.use(express.json());
  app.use(
    '/b2b/payments',
    createB2bPaymentController(dataSource, requireAuth, {
      logLabel: 'TEST B2B Payment',
      allowedServiceKeys: KPA_B2B_SERVICE_KEYS,
    }),
  );
  return app;
}

const payableOrder = (overrides: Record<string, unknown> = {}) => ({
  id: ORDER,
  buyerId: USER,
  orderNumber: 'ORD-1',
  totalAmount: '10000',
  status: 'created',
  paymentStatus: 'pending',
  items: [{ productName: '특가 상품' }],
  metadata: { source: 'store_cart_checkout', serviceKey: 'kpa-groupbuy' },
  ...overrides,
});

const PREPARE_BODY = {
  orderId: ORDER,
  successUrl: 'https://example.com/ok',
  failUrl: 'https://example.com/fail',
};

beforeEach(() => {
  prepareMock.mockReset();
  confirmMock.mockReset();
  getStatusMock.mockReset();
  prepareMock.mockResolvedValue({ id: 'pay-1', transactionId: 'tx-1', metadata: {} });
  confirmMock.mockResolvedValue({ id: 'pay-1', status: 'PAID', paidAmount: 10000, paidAt: new Date() });
});

describe('POST /b2b/payments/prepare', () => {
  it('미인증 → 401 · PaymentCore 미호출', async () => {
    const res = await request(makeApp(payableOrder())).post('/b2b/payments/prepare').send(PREPARE_BODY);
    expect(res.status).toBe(401);
    expect(prepareMock).not.toHaveBeenCalled();
  });

  it('Event Offer 특가 주문 → 201 · 전용 결제 엔진 없이 같은 PaymentCore 사용', async () => {
    const res = await request(makeApp(payableOrder()))
      .post('/b2b/payments/prepare')
      .set('x-test-user', USER)
      .send(PREPARE_BODY);
    expect(res.status).toBe(201);
    expect(prepareMock).toHaveBeenCalledTimes(1);
    expect(prepareMock.mock.calls[0][0]).toMatchObject({
      orderId: ORDER,
      amount: 10000,
      currency: 'KRW',
      sourceService: 'store-b2b',
    });
  });

  it('승인축 B2B 주문(store_b2b_cart) 도 같은 경로로 결제된다', async () => {
    const order = payableOrder({ metadata: { source: 'store_b2b_cart', serviceKey: 'kpa-society' } });
    const res = await request(makeApp(order))
      .post('/b2b/payments/prepare')
      .set('x-test-user', USER)
      .send(PREPARE_BODY);
    expect(res.status).toBe(201);
  });

  it('타 서비스(k-cosmetics) 주문 → 400 NOT_B2B_CHECKOUT_ORDER (서비스 경계)', async () => {
    const order = payableOrder({ metadata: { source: 'store_b2b_cart', serviceKey: 'k-cosmetics' } });
    const res = await request(makeApp(order))
      .post('/b2b/payments/prepare')
      .set('x-test-user', USER)
      .send(PREPARE_BODY);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NOT_B2B_CHECKOUT_ORDER');
    expect(prepareMock).not.toHaveBeenCalled();
  });

  it('Neture B2B 주문은 이 축이 결제하지 않는다 (무회귀 경계)', async () => {
    const order = payableOrder({ metadata: { source: 'neture_b2b_checkout', serviceKey: 'kpa-society' } });
    const res = await request(makeApp(order))
      .post('/b2b/payments/prepare')
      .set('x-test-user', USER)
      .send(PREPARE_BODY);
    expect(res.status).toBe(400);
    expect(prepareMock).not.toHaveBeenCalled();
  });

  it('이미 paid 인 주문 → 400 ORDER_NOT_PAYABLE (이중 결제 금지)', async () => {
    const order = payableOrder({ status: 'paid', paymentStatus: 'paid' });
    const res = await request(makeApp(order))
      .post('/b2b/payments/prepare')
      .set('x-test-user', USER)
      .send(PREPARE_BODY);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ORDER_NOT_PAYABLE');
    expect(prepareMock).not.toHaveBeenCalled();
  });

  it('다른 사람의 주문 → 404 (소유권)', async () => {
    const res = await request(makeApp(payableOrder({ buyerId: 'other' })))
      .post('/b2b/payments/prepare')
      .set('x-test-user', USER)
      .send(PREPARE_BODY);
    expect(res.status).toBe(404);
    expect(prepareMock).not.toHaveBeenCalled();
  });

  it('orderId/paymentGroupId 둘 다 없음 → 400', async () => {
    const res = await request(makeApp(payableOrder()))
      .post('/b2b/payments/prepare')
      .set('x-test-user', USER)
      .send({ successUrl: 'https://e.com/a', failUrl: 'https://e.com/b' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_PAYMENT_TARGET');
  });

  it('group 결제: 전부 payable 이어야 진행 · 하나라도 paid 면 400', async () => {
    const g1 = payableOrder({ id: 'g-1', metadata: { source: 'store_cart_checkout', serviceKey: 'kpa-groupbuy' } });
    const g2 = payableOrder({ id: 'g-2', status: 'paid', paymentStatus: 'paid' });
    const res = await request(makeApp(null, [g1, g2]))
      .post('/b2b/payments/prepare')
      .set('x-test-user', USER)
      .send({ paymentGroupId: 'PG-1', successUrl: 'https://e.com/a', failUrl: 'https://e.com/b' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PAYMENT_GROUP_NOT_PAYABLE');
    expect(prepareMock).not.toHaveBeenCalled();
  });
});

describe('POST /b2b/payments/confirm', () => {
  const CONFIRM_BODY = {
    paymentId: '33333333-3333-4333-8333-333333333333',
    paymentKey: 'pk_test',
    orderId: ORDER,
  };

  it('확인은 소유 + source/serviceKey 경계를 통과해야 한다', async () => {
    const res = await request(makeApp(payableOrder()))
      .post('/b2b/payments/confirm')
      .set('x-test-user', USER)
      .send(CONFIRM_BODY);
    expect(res.status).toBe(200);
    expect(confirmMock).toHaveBeenCalledTimes(1);
  });

  it('타 축 주문 confirm 시도 → 400 · PaymentCore 미호출', async () => {
    const order = payableOrder({ metadata: { source: 'pharmacy_hub_cart', serviceKey: 'kpa-society' } });
    const res = await request(makeApp(order))
      .post('/b2b/payments/confirm')
      .set('x-test-user', USER)
      .send(CONFIRM_BODY);
    expect(res.status).toBe(400);
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('미인증 confirm → 401', async () => {
    const res = await request(makeApp(payableOrder())).post('/b2b/payments/confirm').send(CONFIRM_BODY);
    expect(res.status).toBe(401);
    expect(confirmMock).not.toHaveBeenCalled();
  });
});

describe('GET /b2b/payments/order/:orderId', () => {
  it('payable 주문의 결제 정보를 돌려준다', async () => {
    const res = await request(makeApp(payableOrder()))
      .get(`/b2b/payments/order/${ORDER}`)
      .set('x-test-user', USER);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ orderId: ORDER, amount: 10000, currency: 'KRW' });
  });

  it('paid 주문은 결제정보를 주지 않는다', async () => {
    const res = await request(makeApp(payableOrder({ status: 'paid', paymentStatus: 'paid' })))
      .get(`/b2b/payments/order/${ORDER}`)
      .set('x-test-user', USER);
    expect(res.status).toBe(400);
  });
});
