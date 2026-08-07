/**
 * WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1 — 소스 A: 무신사 뷰티
 *
 * 공개 카테고리 목록 API (`api2/dp/v1/plp/goods`) 를 리프 카테고리별로 전량 순회한다.
 * 한국어 상품명 + 브랜드 + 카테고리가 함께 나오므로 이번 census 의 **주 모집단**이다.
 *
 * 저장 필드는 WO §5 최소 필드만 (가격·재고·판매량·이미지 저장하지 않는다).
 *
 * 산출: tmp/cosmetics-retail-census/source-musinsa.json
 */
import { fetchJson, fetchText, mapPool, writeOut } from './lib.mjs';

const BEAUTY_ROOT = 'https://www.musinsa.com/category/104000';
const API = 'https://api.musinsa.com/api2/dp/v1/plp/goods';
const H = { Referer: 'https://www.musinsa.com/' };
const PAGE_SIZE = 100;

/** 카테고리 탭 마크업에서 `코드 → 경로명` 쌍을 뽑는다. */
function parseCategoryTabs(html) {
  const out = new Map();
  const re = /data-category-id="(\d+)" data-category-name="([^"]+)"/g;
  for (const m of html.matchAll(re)) out.set(m[1], m[2]);
  return out;
}

/**
 * 뷰티 3depth 카테고리(예: `뷰티|스킨케어|에센스/세럼/앰플`)까지 내려간다.
 * 3depth 가 유형 판정의 근거이자 비화장품(헬스/푸드·디바이스·미용소품) 게이트의 근거다.
 * 자식이 없는 2depth 는 그대로 리프로 쓴다.
 */
async function leafCategories() {
  const root = parseCategoryTabs(await fetchText(BEAUTY_ROOT));
  const depth2 = [...root].filter(([code, name]) => /^1040\d{2}$/.test(code) && !name.endsWith('|전체'));
  if (!depth2.length) throw new Error('STOP: 무신사 뷰티 카테고리 파싱 실패 — 페이지 구조 변경 의심');

  const leaves = [];
  for (const [code, name] of depth2) {
    const tabs = parseCategoryTabs(await fetchText(`https://www.musinsa.com/category/${code}`));
    const kids = [...tabs].filter(([c, n]) => c.startsWith(code) && c.length > code.length && !n.endsWith('|전체'));
    if (kids.length) leaves.push(...kids.map(([c, n]) => ({ code: c, name: n })));
    else leaves.push({ code, name });
  }
  return leaves;
}

const listUrl = (code, page) =>
  `${API}?gf=A&category=${code}&size=${PAGE_SIZE}&page=${page}&caller=CATEGORY&sortCode=POPULAR`;

async function fetchCategory(cat) {
  const first = await fetchJson(listUrl(cat.code, 1), H);
  const total = first?.data?.pagination?.totalCount ?? 0;
  const pages = first?.data?.pagination?.totalPages ?? 0;
  const rows = [...(first?.data?.list ?? [])];
  const rest = Array.from({ length: Math.max(0, pages - 1) }, (_, i) => i + 2);
  await mapPool(rest, 3, async (p) => {
    try {
      const j = await fetchJson(listUrl(cat.code, p), H);
      rows.push(...(j?.data?.list ?? []));
    } catch {
      /* 개별 페이지 실패는 건너뛰고 최종 수치에 반영한다 */
    }
  });
  process.stderr.write(`  ${cat.code} ${cat.name}: total=${total} fetched=${rows.length}\n`);
  return { cat, total, rows };
}

async function main() {
  const t0 = Date.now();
  const cats = await leafCategories();
  process.stderr.write(`무신사 뷰티 리프 카테고리 ${cats.length}개\n`);

  const results = [];
  for (const c of cats) results.push(await fetchCategory(c));

  const seen = new Set();
  const products = [];
  let dupAcrossCategory = 0;
  for (const { cat, rows } of results) {
    for (const g of rows) {
      if (seen.has(g.goodsNo)) {
        dupAcrossCategory += 1;
        continue;
      }
      seen.add(g.goodsNo);
      products.push({
        source: 'MUSINSA_BEAUTY',
        sourceProductId: String(g.goodsNo),
        sourceUrl: g.goodsLinkUrl ?? `https://www.musinsa.com/products/${g.goodsNo}`,
        brandName: g.brandName ?? null,
        rawProductName: g.goodsName ?? '',
        canonicalProductName: null,
        englishProductName: null,
        category: cat.name,
        raw: { brandSlug: g.brand ?? null, categoryCode: cat.code },
      });
    }
  }

  writeOut('source-musinsa.json', {
    meta: {
      wo: 'WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1',
      source: 'MUSINSA_BEAUTY',
      endpoint: `${API} (공개 카테고리 목록 API)`,
      leafCategories: results.map((r) => ({ code: r.cat.code, name: r.cat.name, total: r.total, fetched: r.rows.length })),
      reportedTotal: results.reduce((a, r) => a + r.total, 0),
      fetchedRows: results.reduce((a, r) => a + r.rows.length, 0),
      duplicateAcrossCategory: dupAcrossCategory,
      uniqueProducts: products.length,
      elapsedSec: Math.round((Date.now() - t0) / 1000),
    },
    products,
  });
  process.stderr.write(`무신사 unique ${products.length}건 (카테고리 중복 ${dupAcrossCategory})\n`);
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.stack ?? e}\n`);
  process.exit(1);
});
