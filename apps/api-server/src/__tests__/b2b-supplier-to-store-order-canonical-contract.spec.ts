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

// 서비스 프론트엔드도 모집단에 넣는다 — B2B 축 결함(D3 dead menu / D4 dead client)은
// api-server 밖에 있었다. dist/ 는 SKIP_DIR 에서 걸러진다.
const WEB_SERVICES = [
  'web-kpa-society',
  'web-glycopharm',
  'web-k-cosmetics',
  'web-pharmacy-hub',
  'web-neture',
].map((s) => path.join(REPO, 'services', s, 'src'));
const STORE_UI_CORE = path.join(REPO, 'packages', 'store-ui-core', 'src');

const ALL_FILES: string[] = [
  ...walk(SRC),
  ...walk(ADMIN),
  ...WEB_SERVICES.flatMap(walk),
  ...walk(STORE_UI_CORE),
];
const SELF = __filename;
const cache = new Map<string, string>();
const codeOf = (f: string): string => {
  if (!cache.has(f)) cache.set(f, fs.readFileSync(f, 'utf-8'));
  return cache.get(f) as string;
};
const rel = (f: string) => path.relative(REPO, f).replace(/\\/g, '/');
const hits = (pattern: RegExp): string[] =>
  ALL_FILES.filter((f) => f !== SELF && pattern.test(codeOf(f))).map(rel);

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
  // 가드 무력화 방지 — 스캔 대상이 비면 아래 0-count 단언이 전부 통과해버린다.
  it('스캔 모집단이 충분히 크다', () => {
    expect(ALL_FILES.length).toBeGreaterThan(2000);
  });

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

    it('B2B cart checkout 진입점 2종이 유지된다 (event-offer 축 / Neture B2B 축)', () => {
      const code = read('routes/cart/store-cart.routes.ts');
      expect(code).toContain("'/cart/:serviceKey/checkout-confirm'");
      expect(code).toContain("'/cart/:serviceKey/checkout-confirm-b2b'");
    });

    it('구매자 주문 조회는 buyerId + serviceKey 집합을 항상 함께 건다', () => {
      const controllers = [
        'routes/kpa/controllers/kpa-checkout.controller.ts',
        'routes/glycopharm/controllers/checkout.controller.ts',
        'routes/cosmetics/controllers/cosmetics-order.controller.ts',
      ];
      for (const c of controllers) {
        const code = read(c);
        expect(code).toContain('getBuyerOrderServiceKeys');
        expect(code).toMatch(/buyerId/);
      }
    });

    it('Pharmacy-Hub 구매자 주문은 buyerId + serviceKey=pharmacy-hub 로 격리된다', () => {
      const code = read('controllers/pharmacy-hub/PharmacyHubOrderController.ts');
      expect(code).toContain('SERVICE_KEYS.PHARMACY_HUB');
      expect(code).toContain('getBuyerId');
    });

    it('구매자 주문 조회 키 집합은 단일 정의(buyer-order-service-scope)에서만 온다', () => {
      // 컨트롤러에 리터럴 배열이 되살아나면 event-offer 주문이 다시 목록에서 사라진다.
      const literal = hits(
        /\[\s*['"`]kpa-society['"`]\s*,\s*['"`]kpa['"`]\s*,\s*['"`]kpa-groupbuy['"`]/,
      );
      expect(literal.filter((f) => !f.includes('buyer-order-service-scope'))).toEqual([]);
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
      expect(code).toContain('netureOrderServiceScopeSql');
      // `neture_orders` 서비스 경계 조각을 컨트롤러/서비스가 직접 써버리면 조건이 갈라진다.
      // (SSOT 파일 자신과 그 테스트만 이 문자열을 가질 수 있다.)
      const hard = hits(/COALESCE\([^)]*service_key,\s*'neture'\)/);
      expect(hard.filter((f) => !f.includes('fulfillment-service-scope'))).toEqual([]);
    });

    it('공급자 직접 opt-in 경로는 allowlist 로만 열린다 (승인 축 우회 금지)', () => {
      const code = read('modules/neture/controllers/supplier-service-delivery.controller.ts');
      expect(code).toContain('isSupplierOptinServiceKey');
      const optin = read('modules/neture/constants/supplier-optin-services.ts');
      expect(optin).toContain('isApprovalEligibleServiceKey');
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
        'routes/glycopharm/controllers/checkout.controller.ts',
        'routes/cosmetics/controllers/cosmetics-order.controller.ts',
      ]) {
        expect(read(c)).toContain('410');
      }
    });

    it('admin-dashboard 에 /api/v1/ecommerce/* 호출이 남아 있지 않다 (결함 D2 회귀 가드)', () => {
      expect(hits(/v1\(\s*[`'"]\/ecommerce\//)).toEqual([]);
    });

    it('살아 있는 payment producer serviceKey 는 3종뿐이다', () => {
      expect(hits(/['"`]neture-b2b['"`]/).length).toBeGreaterThan(0);
      expect(hits(/['"`]pharmacy-hub['"`]/).length).toBeGreaterThan(0);
      expect(hits(/['"`]store-service-subscription['"`]/).length).toBeGreaterThan(0);
    });

    it('은퇴한 소비자 commerce 410 코드가 유지된다', () => {
      expect(hits(/STORE_CONSUMER_ORDER_RETIRED/).length).toBeGreaterThan(0);
      expect(hits(/STORE_SALE_PAYMENT_DEPRECATED/).length).toBeGreaterThan(0);
    });

    it('POS 연동은 개발 대상이 아니다 — POS 어댑터/동기화 코드가 없다', () => {
      // 본 WO §3: POS API 연동 · 상품 동기화 · 판매 데이터 수집 · 재고/결제 연동 전부 OUT_OF_SCOPE.
      expect(hits(/\b(PosAdapter|POSAdapter|posSyncService|PosIntegrationService)\b/)).toEqual([]);
    });

    it('B2B 취소는 PG 환불 경로와 연결되지 않는다', () => {
      const code = read('services/checkout/store-order-cancel.service.ts');
      expect(code).not.toMatch(/refund|Refund/);
    });

    it('은퇴한 supplier handling-request 축이 되살아나지 않는다 (결함 D4 회귀 가드)', () => {
      // `POST /neture/supplier/requests` 는 WO-NETURE-SUPPLIER-OFFERS-DEAD-CODE-REMOVAL-V1
      // (2026-04-25)에서 라우트가 삭제되고 테이블도 drop 됐다. 실코드 호출은 항상 실패한다.
      const live = ALL_FILES.filter(
        (f) =>
          f !== SELF &&
          /supplier\/requests|createHandlingRequest/.test(stripComments(codeOf(f))),
      );
      expect(live.map(rel)).toEqual([]);
    });

    it('GlycoPharm 에 공급자(seller) 화면 축이 되살아나지 않는다 (결함 D3 회귀 가드)', () => {
      // GlycoPharm 은 공급자 역할 화면을 제공하지 않는다 — `/supplier`, `/supplier/*` 는
      // `RoleNotAvailablePage` 로 명시 처리돼 있다(= 확정된 계약). 사이드바에 공급자 메뉴가
      // 되살아나면 "역할 없음" 페이지로 가는 메뉴가 된다.
      // 공급자 B2B 주문 화면은 Neture 축(`/supplier/orders*`)이 canonical.
      const gp = path.join(REPO, 'services', 'web-glycopharm', 'src');
      const layout = path.join(gp, 'components', 'layouts', 'DashboardLayout.tsx');
      expect(fs.existsSync(layout)).toBe(true);
      expect(stripComments(fs.readFileSync(layout, 'utf-8'))).not.toMatch(
        /GLYCOPHARM_ROLES\.SUPPLIER/,
      );
      // 메뉴를 두면 안 되는 근거: 라우트가 RoleNotAvailablePage 로 고정돼 있다.
      const app = fs.readFileSync(path.join(gp, 'App.tsx'), 'utf-8');
      expect(app).toMatch(/path="supplier\/\*"[\s\S]{0,120}RoleNotAvailablePage/);
    });
  });
});
