/**
 * WO-O4O-CROSSSERVICE-B2B-SUPPLIER-TO-STORE-ORDER-CANONICAL-CONTRACT-V1
 *
 * 공급자 → 매장 B2B 주문 축의 canonical contract 회귀 가드.
 * 계약 정본: `docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md`
 *
 * 정적 소스 스캔만 한다 — DB/네트워크 없음. 3축으로 나눈다.
 *   A. store side   — buyer(매장) 경계: buyerId + serviceKey + active membership
 *   B. supplier side— seller(공급자) 경계: supplier_id + fulfillment serviceKey
 *   C. regression   — 소비자 commerce 재유입 0 / POS 개발 0 / dead residue 0
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO = path.resolve(__dirname, '../../../..');
const SRC = path.resolve(__dirname, '..');
const ADMIN = path.join(REPO, 'apps', 'admin-dashboard', 'src');

const SKIP_DIR = /(^|[\\/])(node_modules|dist|build|\.next|coverage|\.turbo)([\\/]|$)/;

function walk(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const out: string[] = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop() as string;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (SKIP_DIR.test(full)) continue;
      if (e.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
    }
  }
  return out;
}
const STORE_UI_CORE = path.join(REPO, 'packages', 'store-ui-core', 'src');
const SELF = __filename;
const cache = new Map<string, string>();
const codeOf = (f: string): string => {
  if (!cache.has(f)) cache.set(f, fs.readFileSync(f, 'utf-8'));
  return cache.get(f) as string;
};
const rel = (f: string) => path.relative(REPO, f).replace(/\\/g, '/');

const read = (p: string): string => fs.readFileSync(path.join(SRC, p), 'utf-8');

/**
 * 주석을 걷어낸 코드. 주석 속 식별자는 회귀가 아니다.
 * JSX 의 `{/* ... *\/}` 는 여러 줄에 걸쳐도 블록 주석이므로 줄 단위 필터로는 부족하다.
 */
const stripComments = (code: string): string =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, '') // 블록 주석 (JSX 주석 포함)
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1'); // 줄 주석 (URL 의 `//` 는 앞에 `:` 가 온다)

describe('WO-O4O-CROSSSERVICE-B2B-SUPPLIER-TO-STORE-ORDER-CANONICAL-CONTRACT-V1', () => {

  // ==========================================================================
  // A. store side — buyer(매장) 경계
  // ==========================================================================
  describe('A. store side (buyer 축)', () => {
    it('store-cart 라우터는 active service membership 을 요구한다 (결함 D1 회귀 가드)', () => {
      const code = read('routes/cart/store-cart.routes.ts');
      expect(code).toContain('hasActiveServiceMembership');
      expect(code).toContain('SERVICE_MEMBERSHIP_REQUIRED');
      // 인증만으로 scope 이 성립하면 안 된다 — membership 검사가 resolveScope 안에 있어야 한다.
      const scope = code.slice(
        code.indexOf('async function resolveScope'),
        code.indexOf('function handleError'),
      );
      expect(scope).toContain('hasActiveServiceMembership');
    });

    it('store-cart 경계는 buyerId + serviceKey 이며 serviceKey 는 경로 파라미터에서만 온다', () => {
      const code = read('routes/cart/store-cart.routes.ts');
      expect(code).toContain('req.params.serviceKey');
      expect(code).toContain('return { buyerId, serviceKey };');
      // body/query 에서 serviceKey 를 읽으면 스푸핑 가능 (CLAUDE.md §7 Guard Rule #4)
      expect(code).not.toMatch(/req\.(body|query)[.[]\s*['"`]?serviceKey/);
    });

    it('퇴역 K-Cosmetics 는 store-cart 전 endpoint 에서 410 이다 — membership 판정보다 먼저 (퇴역 잔여 R1)', () => {
      const code = read('routes/cart/store-cart.routes.ts');
      expect(code).toContain('RETIRED_CART_SERVICE_KEYS');
      expect(code).toContain("code: 'SERVICE_RETIRED'");
      const scope = code.slice(
        code.indexOf('async function resolveScope'),
        code.indexOf('function handleError'),
      );
      const retiredAt = scope.indexOf('RETIRED_CART_SERVICE_KEYS.has(serviceKey)');
      expect(retiredAt).toBeGreaterThan(-1);
      expect(retiredAt).toBeLessThan(scope.indexOf('hasActiveServiceMembership'));
      // event-offer 장바구니 확정의 k-cosmetics 매핑도 삭제됐다.
      expect(read('services/cart/event-offer-cart-checkout.service.ts')).not.toContain('K_COSMETICS_EVENT_OFFER');
    });

    it('B2B cart checkout 진입점 2종이 유지된다 (event-offer 축 / Neture B2B 축)', () => {
      const code = read('routes/cart/store-cart.routes.ts');
      expect(code).toContain("'/cart/:serviceKey/checkout-confirm'");
      expect(code).toContain("'/cart/:serviceKey/checkout-confirm-b2b'");
    });

    it('구매자 주문 조회는 buyerId + serviceKey 집합을 항상 함께 건다', () => {
      const controllers = [
        'routes/kpa/controllers/kpa-checkout.controller.ts',
        // routes/cosmetics/controllers/cosmetics-order.controller.ts 는 WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1 에서 K-Cos API 와 함께 제거.
      ];
      for (const c of controllers) {
        const code = read(c);
        expect(code).toContain('getBuyerOrderServiceKeys');
        expect(code).toMatch(/buyerId/);
      }
    });
  });

  // ==========================================================================
  // B. supplier side — seller(공급자) 경계
  // ==========================================================================
  describe('B. supplier side (seller 축)', () => {
    it('공급자 주문 조회는 supplier_id 로 스코프된다', () => {
      const code = read('modules/neture/services/supplier-order.service.ts');
      expect(code).toContain('spo.supplier_id = $1');
      expect(code).toContain('validateOwnership');
    });

    it('fulfillment serviceKey 경계는 SSOT 헬퍼로만 표현된다', () => {
      const code = read('modules/neture/services/supplier-order.service.ts');
      // WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1: 공급자 목록 경계는 서비스 집합 SSOT 헬퍼(약국 주문 포함).
      expect(code).toContain('netureOrderServiceSetSql');
      expect(code).toContain('SUPPLIER_VISIBLE_FULFILLMENT_SERVICE_KEYS');
    });

    it('checkout_order → neture_order bridge 는 결제 완료 주문만 대상으로 한다 (payment-first)', () => {
      const code = read('services/neture/checkout-fulfillment-bridge.service.ts');
      expect(code).toContain('BRIDGE_SOURCES');
      expect(code).toMatch(/paymentStatus/);
      expect(code).toContain('checkoutOrderId'); // idempotency 키
    });

    it('공급자 통합 조회는 결제 전 checkout_order 를 공급자에게 노출하지 않는다', () => {
      const code = read('modules/neture/services/supplier-unified-order.service.ts');
      expect(code).toContain(`co."paymentStatus" = 'paid'`);
    });
  });

  // ==========================================================================
  // C. regression — 소비자 commerce 재유입 0 / POS 개발 0 / dead residue 0
  // ==========================================================================
  describe('C. consumer commerce 재유입 / POS 회귀 가드', () => {
    it('서비스별 주문 생성 producer(POST /)는 410 으로 은퇴 상태를 유지한다', () => {
      for (const c of [
        'routes/kpa/controllers/kpa-checkout.controller.ts',
        // routes/cosmetics/controllers/cosmetics-order.controller.ts 는 WO-O4O-KCOSMETICS-RETIREMENT-PHASE1B-STORE-API-ADMIN-V1 에서 K-Cos API 와 함께 제거.
      ]) {
        expect(read(c)).toContain('410');
      }
    });

    it('B2B 취소는 PG 환불 경로와 연결되지 않는다', () => {
      const code = read('services/checkout/store-order-cancel.service.ts');
      expect(code).not.toMatch(/refund|Refund/);
    });

  });
});
