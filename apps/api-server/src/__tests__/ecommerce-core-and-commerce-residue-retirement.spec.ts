/**
 * WO-O4O-ECOMMERCE-CORE-AND-COMMERCE-RESIDUE-FINAL-CENSUS-AND-RETIREMENT-V1
 *   — @o4o/ecommerce-core 은퇴 + 잔여 소비자 commerce residue 제거 계약 테스트
 *
 * 최상위 판정 기준: docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md
 *   핵심 질문 — "소비자가 O4O 안에서 매장을 상대로 결제하는 주문인가?"
 *   YES → legacy(제거 후보) / NO(사업자 간 거래 · 외부채널 · POS) → 보호 대상.
 *
 * 판정 1: ECOMMERCE_CORE_RETIRE (LEGACY_STORE_COMMERCE)
 *   `packages/ecommerce-core` 는 "판매 원장(Source of Truth)" 을 자칭했지만
 *   canonical 주문 원장은 `checkout_orders` 다. ModuleLoader 은퇴 이후
 *   createRoutes/controllers/lifecycle 의 runtime mount 는 0 이었고,
 *   마지막 런타임 소비처였던 LmsPaymentEventHandler 는 producer 0건 dormant 였다.
 *   entity 3종이 가리키던 ecommerce_orders / _order_items / _payments 는
 *   CREATE TABLE migration 이 없어 production 에 테이블 자체가 없다
 *   (order-metrics-fallback 의 42P01 not_ready 가드가 이를 전제로 한다).
 *
 * 판정 2: DEAD_PAYMENT_EVENT_HANDLERS
 *   serviceKey 'cosmetics' / 'glycopharm' / 'kpa' / 'lms' / 'neture' 의
 *   payment.completed producer 가 저장소 전체에 0건이었다. (해당 checkout·payment
 *   controller 는 모두 410 으로 은퇴 완료.) 살아 있는 producer 는
 *   'pharmacy-hub' · 'neture-b2b' · 'store-service-subscription' 3종뿐이다.
 *
 * 판정 3: HEADER_BUILDER_CART_MODULE (PLATFORM_LEGACY)
 *   header-builder 의 'cart' 모듈은 O4O 소비자 storefront/장바구니를 전제로 한다.
 *   그런 storefront 는 존재하지 않으므로 UI·타입·backend 매핑을 함께 제거했다.
 *
 * ⚠ 보호 대상 (이 WO 가 건드리지 않는다 — 이름에 cart/order/payment 가 있어도 제거 금지):
 *   - B2B_SUPPORT: `routes/cart/store-cart.routes.ts` (buyerId 축), PharmacyHub
 *     cart/orders/payments, neture-b2b checkout, KPA event-offer — 전부 매장이 *구매자*.
 *   - ACTIVE_CANONICAL: `packages/payment-core` · `store-core` · `financial-core`,
 *     `services/toss-payments.service.ts` (refund canonical).
 *
 * 이 테스트는 **재도입 방지 계약**이다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const API_SERVER = path.resolve(SRC, '..');
const REPO = path.resolve(API_SERVER, '..', '..');
const ADMIN_SRC = path.join(REPO, 'apps', 'admin-dashboard', 'src');

const SCAN_ROOTS = [
  path.join(REPO, 'apps', 'api-server', 'src'),
  path.join(REPO, 'apps', 'admin-dashboard', 'src'),
  path.join(REPO, 'packages'),
  path.join(REPO, 'services'),
];

const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.turbo']);

function walk(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIR.has(e.name)) walk(full, out);
    } else if (CODE_EXT.has(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

const ALL_FILES: string[] = SCAN_ROOTS.flatMap((r) => walk(r));
const SELF = __filename;
const cache = new Map<string, string>();
const codeOf = (f: string): string => {
  if (!cache.has(f)) cache.set(f, fs.readFileSync(f, 'utf-8'));
  return cache.get(f) as string;
};
const rel = (f: string) => path.relative(REPO, f).replace(/\\/g, '/');
const hits = (pattern: RegExp): string[] =>
  ALL_FILES.filter((f) => f !== SELF && pattern.test(codeOf(f))).map(rel);

describe('WO-O4O-ECOMMERCE-CORE-AND-COMMERCE-RESIDUE-FINAL-CENSUS-AND-RETIREMENT-V1', () => {
  it('스캔 대상 파일이 실제로 수집된다 (가드 무력화 방지)', () => {
    expect(ALL_FILES.length).toBeGreaterThan(500);
  });

  describe('판정 1: @o4o/ecommerce-core 은퇴', () => {
    it('packages/ecommerce-core 디렉토리가 존재하지 않는다', () => {
      expect(fs.existsSync(path.join(REPO, 'packages', 'ecommerce-core'))).toBe(false);
    });

    it('Docker build 용 nested package.json stub 도 남아 있지 않다', () => {
      expect(fs.existsSync(path.join(API_SERVER, 'packages', 'ecommerce-core'))).toBe(false);
    });

    it('소스 전체에 @o4o/ecommerce-core import 가 0건이다', () => {
      expect(hits(/from\s+['"`]@o4o\/ecommerce-core/)).toEqual([]);
      expect(hits(/require\(\s*['"`]@o4o\/ecommerce-core/)).toEqual([]);
    });

    it('EcommerceOrder / EcommerceOrderItem / EcommercePayment entity 등록이 0건이다', () => {
      const entities = fs.readFileSync(path.join(SRC, 'database', 'entities.ts'), 'utf-8');
      for (const name of ['EcommerceOrder', 'EcommerceOrderItem', 'EcommercePayment']) {
        expect(entities).not.toMatch(new RegExp('^\\s*' + name + ',\\s*$', 'm'));
      }
      expect(entities).not.toMatch(/from\s+['"`]@o4o\/ecommerce-core/);
    });

    it('api-server package.json 에 dependency / build:deps 잔재가 없다', () => {
      const pkg = fs.readFileSync(path.join(API_SERVER, 'package.json'), 'utf-8');
      expect(pkg).not.toContain('ecommerce-core');
    });

    it('deploy-api.yml 에 ecommerce-core build step 이 없다', () => {
      const wf = fs.readFileSync(
        path.join(REPO, '.github', 'workflows', 'deploy-api.yml'),
        'utf-8',
      );
      expect(wf).not.toContain('ecommerce-core');
    });

    it('appsCatalog 에 ecommerce-core app 엔트리가 없다', () => {
      const catalog = fs.readFileSync(
        path.join(SRC, 'app-manifests', 'appsCatalog.ts'),
        'utf-8',
      );
      expect(catalog).not.toMatch(/appId:\s*['"`]ecommerce-core['"`]/);
    });
  });

  describe('판정 2: dead payment event handler 제거', () => {
    const REMOVED = [
      'src/services/cosmetics/KCosmeticsPaymentEventHandler.ts',
      'src/services/glycopharm/GlycopharmPaymentEventHandler.ts',
      'src/services/kpa/KpaPaymentEventHandler.ts',
      'src/services/neture/NeturePaymentEventHandler.ts',
      'src/modules/lms/services/LmsPaymentEventHandler.ts',
      'src/routes/neture/controllers/payment.controller.ts',
    ];

    it.each(REMOVED)('%s 가 존재하지 않는다', (p) => {
      expect(fs.existsSync(path.join(API_SERVER, p))).toBe(false);
    });

    it.each([
      'KCosmeticsPaymentEventHandler',
      'GlycopharmPaymentEventHandler',
      'KpaPaymentEventHandler',
      'NeturePaymentEventHandler',
      'LmsPaymentEventHandler',
      'createPaymentController',
    ])('%s 를 import/생성하는 코드가 0건이다', (name) => {
      const pattern = new RegExp('(import[^;]*\\b' + name + '\\b|new\\s+' + name + '\\b)');
      expect(hits(pattern)).toEqual([]);
    });
  });

  describe('판정 3: header-builder cart 모듈 제거', () => {
    const HB = path.join(ADMIN_SRC, 'pages', 'appearance', 'header-builder');

    it('CartSettings 컴포넌트가 존재하지 않는다', () => {
      expect(
        fs.existsSync(path.join(HB, 'components', 'module-inspector', 'CartSettings.tsx')),
      ).toBe(false);
      expect(hits(/\bCartSettings\b/)).toEqual([]);
    });

    it("HeaderModuleType 에 'cart' 가 없고 CartModuleSettings 도 없다", () => {
      const types = fs.readFileSync(path.join(HB, 'types', 'header-types.ts'), 'utf-8');
      expect(types).not.toMatch(/^\s*\|\s*'cart'\s*$/m);
      expect(types).not.toContain('CartModuleSettings');
      expect(types).not.toContain('showCartIcon');
    });

    it('backend 의 cart 모듈 매핑이 제거되었다 (UI만 숨기지 않았다)', () => {
      const settings = fs.readFileSync(path.join(SRC, 'services', 'settingsService.ts'), 'utf-8');
      expect(settings).not.toContain("'cart'");
      expect(settings).not.toContain('cart-icon');
      const converter = fs.readFileSync(
        path.join(SRC, 'utils', 'customizer', 'template-parts-converter.ts'),
        'utf-8',
      );
      expect(converter).not.toContain("'cart'");
      expect(converter).not.toContain('cart-icon');
    });

    it("'o4o/cart-icon' block type 이 저장소 전체에 0건이다", () => {
      expect(hits(/o4o\/cart-icon/)).toEqual([]);
    });
  });

  describe('판정 4: dead frontend commerce residue 제거', () => {
    const REMOVED = [
      path.join(ADMIN_SRC, 'services', 'cartService.ts'),
      path.join(ADMIN_SRC, 'utils', 'ecommerce.ts'),
      path.join(ADMIN_SRC, 'components', 'payment', 'TossPaymentButton.tsx'),
      path.join(REPO, 'services', 'web-neture', 'src', 'lib', 'cart.ts'),
    ];

    it.each(REMOVED.map((p) => rel(p)))('%s 가 존재하지 않는다', (r) => {
      expect(fs.existsSync(path.join(REPO, r))).toBe(false);
    });

    it('TossPaymentButton 소비처가 0건이다', () => {
      expect(hits(/\bTossPaymentButton\b/)).toEqual([]);
    });
  });

  describe('보호 계약: 제거하면 안 되는 축이 그대로 살아 있다', () => {
    it('B2B store-cart 라우트(buyerId 축)가 유지된다', () => {
      const p = path.join(SRC, 'routes', 'cart', 'store-cart.routes.ts');
      expect(fs.existsSync(p)).toBe(true);
      expect(fs.readFileSync(p, 'utf-8')).toContain('buyerId');
    });

    it.each(['payment-core', 'store-core', 'financial-core'])(
      'packages/%s 가 유지된다',
      (name) => {
        expect(fs.existsSync(path.join(REPO, 'packages', name, 'package.json'))).toBe(true);
      },
    );

    it('refund canonical(toss-payments.service.ts)이 유지된다', () => {
      expect(fs.existsSync(path.join(SRC, 'services', 'toss-payments.service.ts'))).toBe(true);
    });

    it('살아 있는 payment producer serviceKey 3종이 유지된다', () => {
      expect(hits(/['"`]store-service-subscription['"`]/).length).toBeGreaterThan(0);
      expect(hits(/['"`]neture-b2b['"`]/).length).toBeGreaterThan(0);
      expect(hits(/['"`]pharmacy-hub['"`]/).length).toBeGreaterThan(0);
    });

    it('소비자 commerce 은퇴 410 계약이 유지된다', () => {
      for (const code of [
        'STORE_CONSUMER_ORDER_RETIRED',
        'STORE_SALE_PAYMENT_DEPRECATED',
        'STORE_B2C_CHANNEL_RETIRED',
      ]) {
        expect(hits(new RegExp(code)).length).toBeGreaterThan(0);
      }
    });
  });
});
