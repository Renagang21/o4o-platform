/**
 * WO-O4O-TABLET-PRODUCT-LIST-CONTRACT-AND-OPERATION-CORE-KPA-ADOPTION-V1 §2·§3·§12
 *
 * product_list canonical 4단 계약을 회귀 고정한다.
 *
 *   ① selected            명시 선택
 *   ② corner_display      코너 확정 + 진열 있음
 *   ③ none                그 외(코너 미확정 · 진열 0행)
 *
 * WO-O4O-PHARMACYHUB-TABLET-CANONICAL-ADOPTION-AND-PUBLIC-KIOSK-CLOSURE-V1 §2 에서
 * `corner_legacy_all`(진열 0행 → 매장 전체) 암묵적 fallback 을 **폐기**했다.
 *
 * 핵심 회귀 대상 = **같은 세트가 경로마다 다른 집합을 내놓던 드리프트**.
 * DB 는 붙이지 않는다 — DataSource.query 를 SQL 조각으로 분기하는 stub 으로 대체한다.
 */
import {
  EMPTY_PRODUCT_LIST_SECTION,
  isServerResolvedProductList,
  resolveCornerProducts,
  resolveScreenSetAppliedTablet,
  type ProductListResolveContext,
} from '../routes/platform/store-public/store-public-product-list-resolve.js';

const ORG = '9c87f46b-57a1-4afe-80bd-60782c49ce96';
const TABLET = 'f8b78a16-2d8a-4b3a-9fa6-e03c0cbd96d9';
const SET = '8c6eb9fe-5ab5-4ca5-8800-db486ed8e510';

const CTX: ProductListResolveContext = {
  organizationId: ORG,
  storeId: ORG,
  serviceKey: 'kpa',
  storeSlug: 'store-slug',
};

/** 코너 진열 local 3건(프로덕션 실측과 같은 순서). */
const LOCAL_ROWS = [
  { id: 'l1', name: '후시딘연고', price_display: '6500.00', thumbnail_url: 't1.png', images: [], description: 'd1', summary: 's1', category: 'c', selectedContentTranslationsRaw: null },
  { id: 'l2', name: '비판텐연고', price_display: '12000.00', thumbnail_url: null, images: ['i2.png'], description: 'd2', summary: 's2', category: 'c', selectedContentTranslationsRaw: null },
  { id: 'l3', name: '마데카솔겔', price_display: '9500.00', thumbnail_url: null, images: [], description: 'd3', summary: 's3', category: 'c', selectedContentTranslationsRaw: null },
];

function makeDataSource(opts: {
  appliedTablets?: Array<{ id: string; visibleDisplays: number }>;
  locals?: any[];
  suppliers?: any[];
  onSupplierOptions?: (o: any) => void;
}) {
  const calls: string[] = [];
  const ds: any = {
    calls,
    query: jest.fn(async (sql: string) => {
      calls.push(sql.replace(/\s+/g, ' ').trim().slice(0, 80));
      if (sql.includes('current_screen_set_id = $1')) return opts.appliedTablets ?? [];
      if (sql.includes('FROM store_local_products')) return (opts.locals ?? []).map((r) => ({ ...r }));
      return [];
    }),
  };
  return ds;
}

// supplier 목록은 공개 목록 쿼리(queryTabletVisibleProducts)를 그대로 재사용하므로 모듈 단위로 대체한다.
jest.mock('../routes/platform/store-public/store-public-utils.js', () => {
  const actual = jest.requireActual('../routes/platform/store-public/store-public-utils.js');
  return {
    ...actual,
    queryTabletVisibleProducts: jest.fn(),
  };
});
// eslint-disable-next-line @typescript-eslint/no-require-imports
const utils = require('../routes/platform/store-public/store-public-utils.js');

beforeEach(() => {
  jest.clearAllMocks();
  utils.queryTabletVisibleProducts.mockResolvedValue({ data: [] });
});

// ─────────────────────────────────────────────────────────────────────────────
// 코너 도출 — QR·preview 가 tablet 과 같은 코너를 보게 하는 축
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveScreenSetAppliedTablet — 코너 역참조', () => {
  it('정확히 1대가 적용 중이면 그 코너 문맥을 만든다', async () => {
    const ds = makeDataSource({ appliedTablets: [{ id: TABLET, visibleDisplays: 3 }] });
    await expect(resolveScreenSetAppliedTablet(ds, SET, ORG)).resolves.toEqual({
      tabletId: TABLET,
      configured: true,
    });
  });

  it('진열이 0행이면 configured=false (③ compatibility 단으로 내려간다)', async () => {
    const ds = makeDataSource({ appliedTablets: [{ id: TABLET, visibleDisplays: 0 }] });
    await expect(resolveScreenSetAppliedTablet(ds, SET, ORG)).resolves.toEqual({
      tabletId: TABLET,
      configured: false,
    });
  });

  it('적용 태블릿이 0대면 코너 미확정 (미적용 세트의 QR 은 상품 0건)', async () => {
    const ds = makeDataSource({ appliedTablets: [] });
    await expect(resolveScreenSetAppliedTablet(ds, SET, ORG)).resolves.toBeNull();
  });

  it('2대 이상이면 임의로 고르지 않고 코너 미확정으로 둔다', async () => {
    const ds = makeDataSource({
      appliedTablets: [{ id: TABLET, visibleDisplays: 3 }, { id: 'other', visibleDisplays: 1 }],
    });
    await expect(resolveScreenSetAppliedTablet(ds, SET, ORG)).resolves.toBeNull();
  });

  it('조직 경계를 쿼리에 반드시 싣는다 (다른 매장 태블릿 유입 0)', async () => {
    const ds = makeDataSource({ appliedTablets: [] });
    await resolveScreenSetAppliedTablet(ds, SET, ORG);
    expect(ds.query).toHaveBeenCalledWith(expect.stringContaining('t.organization_id = $2'), [SET, ORG]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ②③ 코너 상품 — 집합·순서가 /tablet/products 와 같아야 한다
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveCornerProducts — 코너 상품 집합·순서', () => {
  it('supplier 먼저, 그다음 local (kiosk 병합 순서와 동일)', async () => {
    utils.queryTabletVisibleProducts.mockResolvedValue({ data: [{ id: 's1', name: '공급상품' }] });
    const ds = makeDataSource({ locals: LOCAL_ROWS });
    const out = await resolveCornerProducts(ds, CTX, TABLET);
    expect(out.map((p: any) => p.id)).toEqual(['s1', 'l1', 'l2', 'l3']);
  });

  it('local 저장 순서를 보존한다 (진열 sort_order)', async () => {
    const ds = makeDataSource({ locals: LOCAL_ROWS });
    const out = await resolveCornerProducts(ds, CTX, TABLET);
    expect(out.map((p: any) => p.name)).toEqual(['후시딘연고', '비판텐연고', '마데카솔겔']);
  });

  it('언제나 진열로 집합을 제한한다 — 매장 전체를 만들 수 있는 경로가 없다', async () => {
    const ds = makeDataSource({ locals: LOCAL_ROWS });
    await resolveCornerProducts(ds, CTX, TABLET);
    const localSql = ds.query.mock.calls.map((c: any[]) => c[0]).find((s: string) => s.includes('store_local_products'));
    expect(localSql).toContain('AND disp.id IS NOT NULL');
    expect(localSql).toContain('disp.sort_order ASC NULLS LAST');
    // supplier 도 항상 configured=true — configured=false(매장 전체) 로 호출될 수 없다.
    expect(utils.queryTabletVisibleProducts).toHaveBeenCalledWith(
      ds, ORG, expect.anything(), expect.objectContaining({ configured: true, firstTabletId: TABLET }),
    );
    expect(utils.queryTabletVisibleProducts).not.toHaveBeenCalledWith(
      ds, ORG, expect.anything(), expect.objectContaining({ configured: false }),
    );
  });

  it('암묵적 매장 전체 fallback 이 소스에 남아 있지 않다 (§2 폐기 회귀 고정)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync } = require('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { resolve } = require('node:path');
    const src = readFileSync(
      resolve(__dirname, '../routes/platform/store-public/store-public-product-list-resolve.ts'),
      'utf-8',
    ).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
    expect(src).not.toContain('configured: false');
    expect(src).not.toContain("'corner_legacy_all'");
  });

  it('supplier 가시성 게이트를 우회하지 않는다 — 게이트가 0건이면 0건', async () => {
    utils.queryTabletVisibleProducts.mockResolvedValue({ data: [] });
    const ds = makeDataSource({ locals: [] });
    await expect(resolveCornerProducts(ds, CTX, TABLET)).resolves.toEqual([]);
  });

  it('local 행에 표시용 alias 를 실어 소비처별 필드명 차이를 흡수한다', async () => {
    const ds = makeDataSource({ locals: LOCAL_ROWS });
    const out = await resolveCornerProducts(ds, CTX, TABLET);
    expect(out[0]).toMatchObject({ type: 'local', priceDisplay: '6500.00', imageUrl: 't1.png' });
    // 원본 snake_case 는 유지한다(/tablet/products 소비처 회귀 0).
    expect(out[0]).toMatchObject({ price_display: '6500.00', thumbnail_url: 't1.png' });
    // thumbnail 없으면 images[0] 로 폴백.
    expect(out[1].imageUrl).toBe('i2.png');
    // 둘 다 없으면 null (문자열 'undefined' 같은 값이 새지 않는다).
    expect(out[2].imageUrl).toBeNull();
  });

  it('1순위 콘텐츠 링크는 링크 원장 직접 조회다 (1세대 disp.content_id 종속 금지)', async () => {
    const ds = makeDataSource({ locals: LOCAL_ROWS });
    await resolveCornerProducts(ds, CTX, TABLET);
    const localSql = ds.query.mock.calls.map((c: any[]) => c[0]).find((s: string) => s.includes('store_local_products'));
    expect(localSql).toContain('kpa_store_content_product_links');
    expect(localSql).not.toMatch(/AND\s+\w+\.content_id\s*=\s*disp\.content_id/);
    expect(localSql).toContain('(l.content_id = disp.content_id) DESC');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 소비 계약
// ─────────────────────────────────────────────────────────────────────────────

describe('소비 계약 — selectionMode', () => {
  it("서버가 확정한 3단('none' 포함)은 모두 server-resolved 로 판정한다", () => {
    expect(isServerResolvedProductList('selected')).toBe(true);
    expect(isServerResolvedProductList('corner_display')).toBe(true);
    // §2: 0건도 서버가 확정한 결과다. 자체 조회로 되돌아가면 폐기한 fallback 이 클라이언트에서 부활한다.
    expect(isServerResolvedProductList('none')).toBe(true);
  });

  it('표식 없음(=세트 미적용 legacy 태블릿)만 자체 조회로 남긴다', () => {
    expect(isServerResolvedProductList(undefined)).toBe(false);
    expect(isServerResolvedProductList('corner_legacy_all')).toBe(false);
  });

  it("빈 섹션은 'selected'(0건)가 아니라 'none' 이다 — 확정 실패와 0건 선택을 구분한다", () => {
    expect(EMPTY_PRODUCT_LIST_SECTION.selectionMode).toBe('none');
    expect(EMPTY_PRODUCT_LIST_SECTION.products).toEqual([]);
  });
});
