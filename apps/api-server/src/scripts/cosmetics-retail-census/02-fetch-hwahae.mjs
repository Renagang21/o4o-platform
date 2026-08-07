/**
 * WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1 — 소스 B: 화해
 *
 * 파일럿과 같은 공개 SSR JSON 랭킹을 쓰되, 이번에는 표본을 뽑지 않고 **순회 결과 전량**을 담는다.
 * 화해 랭킹은 노드당 상위 20건만 제공하므로 카테고리 트리를 넓게 도는 것이 유일한 확장 축이다.
 * (검색 결과는 클라이언트 렌더링이라 공개 JSON 이 없다 — 실측 확인.)
 *
 * 산출: tmp/cosmetics-retail-census/source-hwahae.json
 */
import { UA, fetchJson, fetchText, mapPool, sleep, writeOut } from './lib.mjs';

const THEMES = [
  ['category', 2],
  ['skin', 174],
  ['age', 1372],
];

async function buildId() {
  const html = await fetchText('https://www.hwahae.co.kr/rankings');
  const id = html.match(/"buildId":"([^"]+)"/)?.[1];
  if (!id) throw new Error('STOP: 화해 buildId 파싱 실패 — 페이지 구조 변경 의심');
  return id;
}

async function ranking(bid, themeId, englishName) {
  const j = await fetchJson(
    `https://www.hwahae.co.kr/_next/data/${bid}/rankings.json?english_name=${englishName}&theme_id=${themeId}`,
    { ...UA },
    2,
  );
  return {
    categories: j?.pageProps?.rankingsCategories ?? null,
    details: j?.pageProps?.rankingProducts?.data?.details ?? [],
  };
}

function flattenTree(node, trail = []) {
  if (!node) return [];
  const here = node.name ? [...trail, node.name] : trail;
  const out = node.id != null ? [{ id: node.id, path: here.join(' > ') }] : [];
  for (const c of node.children ?? []) out.push(...flattenTree(c, here));
  return out;
}

async function main() {
  const t0 = Date.now();
  const bid = await buildId();
  const nodes = [];
  const seenNode = new Set();
  for (const [en, tid] of THEMES) {
    const root = await ranking(bid, tid, en);
    for (const n of flattenTree(root.categories)) {
      const key = `${en}:${n.id}`;
      if (seenNode.has(key)) continue;
      seenNode.add(key);
      nodes.push({ englishName: en, ...n });
    }
    await sleep(150);
  }
  process.stderr.write(`화해 카테고리 노드 ${nodes.length}개 순회\n`);

  const products = [];
  const seen = new Set();
  let hitNodes = 0;
  await mapPool(nodes, 3, async (n) => {
    let details = [];
    try {
      ({ details } = await ranking(bid, n.id, n.englishName));
    } catch {
      return;
    }
    if (details.length) hitNodes += 1;
    for (const d of details) {
      const pid = d?.product?.id;
      if (!pid || seen.has(pid)) continue;
      seen.add(pid);
      products.push({
        source: 'HWAHAE_RANKING',
        sourceProductId: String(pid),
        sourceUrl: `https://www.hwahae.co.kr/products/${encodeURIComponent(d.product?.name ?? '')}/${pid}`,
        brandName: d.brand?.name ?? null,
        // 판매명을 입력으로 쓰고, 플랫폼 정리명은 독립 대조 기준으로만 보관한다 (V0 §3-2).
        rawProductName: d.goods?.name ?? d.product?.name ?? '',
        canonicalProductName: null,
        englishProductName: null,
        category: n.path,
        raw: { platformCleanName: d.product?.name ?? null },
      });
    }
  });

  writeOut('source-hwahae.json', {
    meta: {
      wo: 'WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1',
      source: 'HWAHAE_RANKING',
      nodesTraversed: nodes.length,
      nodesWithData: hitNodes,
      uniqueProducts: products.length,
      note: '노드당 상위 20건 제한. 검색 API 는 클라이언트 렌더링이라 공개 JSON 없음.',
      elapsedSec: Math.round((Date.now() - t0) / 1000),
    },
    products,
  });
  process.stderr.write(`화해 unique ${products.length}건\n`);
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.stack ?? e}\n`);
  process.exit(1);
});
