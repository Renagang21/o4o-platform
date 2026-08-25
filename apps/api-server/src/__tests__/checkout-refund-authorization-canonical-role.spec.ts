/**
 * WO-O4O-CHECKOUT-REFUND-AUTHORIZATION-CANONICAL-ROLE-CONTRACT-V1
 *
 * 환불 authorization 계약 회귀 테스트.
 *
 * 확정된 계약:
 *   - `POST /api/checkout/refund` 의 업무 주체 = 플랫폼 운영자 (`platform:super_admin`)
 *   - 무접두 `admin` / `operator` 는 authority 가 아니다 (F9 RBAC SSOT)
 *   - 서비스 매장 주문의 환불은 매장 경영자 축(requireStoreOwner + sellerOrganizationId)
 *     이 별도 엔드포인트로 담당한다 — 본 엔드포인트로 위임되지 않는다
 *   - 구매자 취소(cancelStoreOrderBeforePayment)와 운영자 환불은 분리된 경로다
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const mockRefundOrder = jest.fn();
const mockFindById = jest.fn();
const mockFindPaymentByOrderId = jest.fn();
const mockCancelPayment = jest.fn();

jest.mock('../services/checkout.service.js', () => ({
  checkoutService: {
    refundOrder: (...a: unknown[]) => mockRefundOrder(...a),
    findById: (...a: unknown[]) => mockFindById(...a),
    findByOrderNumber: jest.fn().mockResolvedValue(null),
    findPaymentByOrderId: (...a: unknown[]) => mockFindPaymentByOrderId(...a),
    findByBuyerId: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../services/toss-payments.service.js', () => ({
  tossPaymentsService: {
    cancelPayment: (...a: unknown[]) => mockCancelPayment(...a),
  },
}));

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { CheckoutController } from '../controllers/checkout/checkoutController.js';

function makeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function makeReq(user: unknown, extra: Record<string, unknown> = {}) {
  return { user, body: {}, params: {}, query: {}, ...extra } as any;
}

const SRC = join(__dirname, '..');

beforeEach(() => {
  jest.clearAllMocks();
  mockFindById.mockResolvedValue(null);
});

describe('checkout refund — canonical authority (platform:super_admin)', () => {
  it('무인증 요청은 403 이며 환불이 실행되지 않는다', async () => {
    const res = makeRes();
    await CheckoutController.refund(makeReq(undefined), res);
    expect(res.statusCode).toBe(403);
    expect(mockRefundOrder).not.toHaveBeenCalled();
    expect(mockCancelPayment).not.toHaveBeenCalled();
  });

  it('무접두 bare admin 은 환불 권한이 아니다 (privilege escalation 표면 차단)', async () => {
    const res = makeRes();
    await CheckoutController.refund(makeReq({ id: 'u1', roles: ['admin'] }), res);
    expect(res.statusCode).toBe(403);
    expect(mockRefundOrder).not.toHaveBeenCalled();
    expect(mockCancelPayment).not.toHaveBeenCalled();
  });

  it('무접두 bare operator 도 환불 권한이 아니다', async () => {
    const res = makeRes();
    await CheckoutController.refund(makeReq({ id: 'u1', roles: ['operator'] }), res);
    expect(res.statusCode).toBe(403);
    expect(mockRefundOrder).not.toHaveBeenCalled();
  });

  it('무접두 super_admin 도 환불 권한이 아니다 (platform: 접두 필수)', async () => {
    const res = makeRes();
    await CheckoutController.refund(makeReq({ id: 'u1', roles: ['super_admin'] }), res);
    expect(res.statusCode).toBe(403);
    expect(mockRefundOrder).not.toHaveBeenCalled();
  });

  it('서비스 operator/admin role 만으로는 플랫폼 환불이 열리지 않는다 (cross-service fan-out 0)', async () => {
    const roles = [
      'kpa:admin',
      'kpa:operator',
      'glycopharm:operator',
      'cosmetics:admin',
      'neture:operator',
      'pharmacy-hub:store_owner',
      'kpa:store_owner',
    ];
    for (const role of roles) {
      const res = makeRes();
      await CheckoutController.refund(makeReq({ id: 'u1', roles: [role] }), res);
      expect([role, res.statusCode]).toEqual([role, 403]);
    }
    expect(mockRefundOrder).not.toHaveBeenCalled();
    expect(mockCancelPayment).not.toHaveBeenCalled();
  });

  it('role 이 전혀 없는 인증 사용자는 403', async () => {
    const res = makeRes();
    await CheckoutController.refund(makeReq({ id: 'u1', roles: [] }), res);
    expect(res.statusCode).toBe(403);
  });

  it('platform:super_admin 은 authorization 을 통과하고 lifecycle 판정으로 넘어간다', async () => {
    const res = makeRes();
    await CheckoutController.refund(
      makeReq(
        { id: 'p1', roles: ['platform:super_admin'] },
        { body: { orderId: 'o1', reason: 'r' } },
      ),
      res,
    );
    // 존재하지 않는 주문 → 404. 403 이 아니라는 점이 authority 통과의 증거다.
    expect(res.statusCode).toBe(404);
    expect(mockRefundOrder).not.toHaveBeenCalled();
  });

  it('authorization 통과 후에도 lifecycle 이 판정을 막는다 — 미결제 주문은 환불 불가', async () => {
    mockFindById.mockResolvedValue({ id: 'o1', paymentStatus: 'pending', status: 'created' });
    const res = makeRes();
    await CheckoutController.refund(
      makeReq(
        { id: 'p1', roles: ['platform:super_admin'] },
        { body: { orderId: 'o1', reason: 'r' } },
      ),
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(mockCancelPayment).not.toHaveBeenCalled();
    expect(mockRefundOrder).not.toHaveBeenCalled();
  });

  it('결제된 주문이라도 payment 레코드가 없으면 PG 취소를 시도하지 않는다', async () => {
    mockFindById.mockResolvedValue({ id: 'o1', paymentStatus: 'paid', status: 'paid' });
    mockFindPaymentByOrderId.mockResolvedValue(null);
    const res = makeRes();
    await CheckoutController.refund(
      makeReq(
        { id: 'p1', roles: ['platform:super_admin'] },
        { body: { orderId: 'o1', reason: 'r' } },
      ),
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(mockCancelPayment).not.toHaveBeenCalled();
    expect(mockRefundOrder).not.toHaveBeenCalled();
  });
});

describe('checkout order 조회 — 구매자 본인 또는 플랫폼 운영자', () => {
  const order = { id: 'o1', buyerId: 'buyer-1', paymentStatus: 'paid' };

  it('본인 주문은 조회할 수 있다', async () => {
    mockFindById.mockResolvedValue(order);
    const res = makeRes();
    await CheckoutController.getOrder(
      makeReq({ id: 'buyer-1', roles: [] }, { params: { id: 'o1' } }),
      res,
    );
    expect(res.statusCode).toBe(200);
  });

  it('타인 주문은 무접두 admin/operator 로 열리지 않는다', async () => {
    const roleSets = [['admin'], ['operator'], ['admin', 'operator'], ['super_admin']];
    for (const roles of roleSets) {
      mockFindById.mockResolvedValue(order);
      const res = makeRes();
      await CheckoutController.getOrder(
        makeReq({ id: 'other', roles }, { params: { id: 'o1' } }),
        res,
      );
      expect([roles.join('+'), res.statusCode]).toEqual([roles.join('+'), 403]);
    }
  });

  it('타인 주문은 서비스 role 로도 열리지 않는다', async () => {
    mockFindById.mockResolvedValue(order);
    const res = makeRes();
    await CheckoutController.getOrder(
      makeReq({ id: 'other', roles: ['kpa:admin', 'glycopharm:operator'] }, { params: { id: 'o1' } }),
      res,
    );
    expect(res.statusCode).toBe(403);
  });

  it('platform:super_admin 은 타인 주문을 조회할 수 있다 (명시적 platform override)', async () => {
    mockFindById.mockResolvedValue(order);
    const res = makeRes();
    await CheckoutController.getOrder(
      makeReq({ id: 'other', roles: ['platform:super_admin'] }, { params: { id: 'o1' } }),
      res,
    );
    expect(res.statusCode).toBe(200);
  });

  it('없는 주문은 401/403 이 아니라 404 로 구분된다', async () => {
    mockFindById.mockResolvedValue(null);
    const res = makeRes();
    await CheckoutController.getOrder(
      makeReq({ id: 'buyer-1', roles: [] }, { params: { id: 'missing' } }),
      res,
    );
    expect(res.statusCode).toBe(404);
  });
});

describe('refund/cancel 경로의 소스 계약 (raw-source)', () => {
  it('checkout 컨트롤러에 무접두 admin/operator 배타 판정이 남아 있지 않다', () => {
    const src = readFileSync(join(SRC, 'controllers/checkout/checkoutController.ts'), 'utf-8');
    const live = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(live).not.toContain("['admin', 'operator']");
    expect(src).toContain('isPlatformAdmin');
  });

  it('GlycoPharm /cleanup-expired 는 operator scope guard 뒤에 있다', () => {
    const src = readFileSync(
      join(SRC, 'routes/glycopharm/controllers/checkout.controller.ts'),
      'utf-8',
    );
    const i = src.indexOf("'/cleanup-expired'");
    expect(i).toBeGreaterThan(-1);
    const seg = src.slice(i, i + 220);
    expect(seg).toContain('requireAuth');
    expect(seg).toContain('requireGlycopharmOperator');
  });

  it('GlycoPharm 라우터가 실제로 operator scope guard 를 주입한다', () => {
    const src = readFileSync(join(SRC, 'routes/glycopharm/glycopharm.routes.ts'), 'utf-8');
    const i = src.indexOf('createCheckoutController(');
    expect(i).toBeGreaterThan(-1);
    expect(src.slice(i, i + 400)).toContain("requireGlycopharmScope('glycopharm:operator')");
  });

  it('구매자 취소 경로는 buyerId + serviceKey 로만 주문을 특정한다 (운영자 role 요구 없음)', () => {
    const src = readFileSync(join(SRC, 'services/checkout/store-order-cancel.service.ts'), 'utf-8');
    expect(src).toContain('"buyerId" = $2::uuid');
    expect(src).toContain("metadata->>'serviceKey' = ANY($3::text[])");
    expect(src).not.toContain("'admin'");
    expect(src).not.toContain("'operator'");
  });

  it('KPA 매장 주문 상태 변경(취소/환불)은 membership+role+매장 소유권을 함께 요구한다', () => {
    const src = readFileSync(join(SRC, 'routes/kpa/controllers/kpa-checkout.controller.ts'), 'utf-8');
    expect(src).toContain("createRequireStoreOwner(dataSource, 'kpa')");
    const i = src.indexOf("'/store-orders/:orderId/status'");
    expect(i).toBeGreaterThan(-1);
    expect(src.slice(i, i + 200)).toContain('requireStoreOwner');
    // 주문 소유권 축: 매장 조직 + 서비스 키 (타 서비스 주문 fan-out 차단)
    const body = src.slice(i, i + 3000);
    expect(body).toContain('sellerOrganizationId: organizationId');
    expect(body).toContain("['kpa-society', 'kpa'].includes(meta.serviceKey)");
  });

  it('플랫폼 주문 관리 API 는 platform:super_admin 만 허용한다', () => {
    const src = readFileSync(join(SRC, 'controllers/admin/adminOrderController.ts'), 'utf-8');
    expect(src).toContain("['platform:super_admin']");
    expect(src).not.toContain("['admin', 'operator']");
  });
});
