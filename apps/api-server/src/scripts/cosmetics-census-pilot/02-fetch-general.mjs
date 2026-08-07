/**
 * WO-O4O-COSMETICS-INITIAL-CENSUS-AND-GUIDE-PILOT-V0 — 단계 2: 일반화장품 후보 500
 *
 * WO 우선순위 소스에 대한 실측 결과(2026-08-07):
 *   1) Olive Young Korea (www.oliveyoung.co.kr) → 봇 차단 HTTP 403. **차단우회 금지** → 제외.
 *   2) YesStyle K-Beauty                        → 목록이 클라이언트 렌더링, 공개 JSON 없음 → 이번 파일럿 제외.
 *   3) Olive Young Global                       → 공개 JSON best-seller API 사용 (국문·영문 상품명 동시 제공).
 *   4) 화해(hwahae)                              → 공개 SSR JSON 랭킹 사용. 카테고리 트리 전체를 순회.
 *
 * 화해는 goods.name(실제 판매명: 용량·기획·묶음 포함)과 product.name(플랫폼이 정리한 제품명)을
 * 함께 제공한다. 파일럿은 **goods.name 을 원본 입력으로** 쓰고 product.name 은 우리 정규화 결과를
 * 대조하는 독립 기준으로만 보관한다(단계 3 오병합 검증에 사용).
 *
 * 산출: tmp/cosmetics-pilot/general-candidates-500.json
 */
import { UA, fetchText, mapPool, sleep, writeOut } from './lib.mjs';

const TARGET = 500;
const HH_PAGE = 'https://www.hwahae.co.kr/rankings';
const OY_BEST =
  'https://global.oliveyoung.com/display/product/best-seller/order-best' +
  '?curLangCode=en&langCode=en&mrgnCntryCode=9999&dlvCntryCode=1230&limit=100&showSoldoutProduct=true';

async function hwahaeBuildId() {
  const html = await fetchText(HH_PAGE);
  const id = html.match(/"buildId":"([^"]+)"/)?.[1];
  if (!id) throw new Error('STOP: 화해 buildId 파싱 실패 — 페이지 구조 변경 의심');
  return id;
}

async function hwahaeRanking(buildId, themeId, englishName = 'category') {
  const url = `https://www.hwahae.co.kr/_next/data/${buildId}/rankings.json?english_name=${englishName}&theme_id=${themeId}`;
  const j = JSON.parse(await fetchText(url, { ...UA, Accept: 'application/json' }, 2));
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

async function collectHwahae() {
  const buildId = await hwahaeBuildId();
  const themes = [
    ['category', 2],
    ['skin', 174],
    ['age', 1372],
  ];
  const nodes = [];
  const seenNode = new Set();
  for (const [en, tid] of themes) {
    const root = await hwahaeRanking(buildId, tid, en);
    for (const n of flattenTree(root.categories)) {
      const key = `${en}:${n.id}`;
      if (seenNode.has(key)) continue;
      seenNode.add(key);
      nodes.push({ englishName: en, ...n });
    }
    await sleep(150);
  }
  process.stderr.write(`화해 카테고리 노드 ${nodes.length} 개 순회\n`);

  const rows = [];
  const seen = new Set();
  let hit = 0;
  await mapPool(nodes, 3, async (n) => {
    let details = [];
    try {
      ({ details } = await hwahaeRanking(buildId, n.id, n.englishName));
    } catch {
      return;
    }
    if (details.length) hit++;
    for (const d of details) {
      const pid = d?.product?.id;
      if (!pid || seen.has(pid)) continue;
      seen.add(pid);
      rows.push({ node: n, d });
    }
  });
  process.stderr.write(`화해 데이터 보유 노드 ${hit} 개 / 고유 제품 ${rows.length} 건\n`);

  return rows.map(({ node, d }) => ({
    source: 'HWAHAE_RANKING',
    sourceProductName: d.goods?.name ?? d.product?.name ?? '',
    brandName: d.brand?.name ?? null,
    canonicalProductName: null,
    englishProductName: null,
    sourceUrl: `https://www.hwahae.co.kr/products/${encodeURIComponent(d.product?.name ?? '')}/${d.product?.id}`,
    candidateDecision: null,
    decisionNote: null,
    raw: {
      categoryPath: node.path,
      platformCleanName: d.product?.name ?? null, // 독립 대조 기준 (우리 정규화 입력이 아님)
      capacity: d.goods?.capacity ?? null,
      packageInfo: d.product?.package_info ?? null,
      reviewCount: d.product?.review_count ?? null,
      reviewRating: d.product?.review_rating ?? null,
      reviewTopics: (d.product?.product_topics ?? []).map((t) => t.review_topic?.sentence).filter(Boolean),
    },
  }));
}

async function collectOliveYoungGlobal() {
  const arr = JSON.parse(await fetchText(OY_BEST, { ...UA, Accept: 'application/json', Referer: 'https://global.oliveyoung.com/' }));
  const list = Array.isArray(arr) ? arr : (arr.data ?? []);
  process.stderr.write(`Olive Young Global best-seller ${list.length} 건\n`);
  return list.map((p) => ({
    source: 'OLIVEYOUNG_GLOBAL_BEST',
    sourceProductName: p.korPrdtName || p.prdtName || '',
    brandName: p.korBrandName || p.brandName || null,
    canonicalProductName: null,
    englishProductName: p.prdtName || null, // 공식 영문 판매명 (임의 생성 아님)
    sourceUrl: `https://global.oliveyoung.com/product/detail?prdtNo=${p.prdtNo}`,
    candidateDecision: null,
    decisionNote: null,
    raw: {
      prdtNo: p.prdtNo,
      englishBrandName: p.brandName ?? null,
      reviewCount: p.reviewCnt ?? null,
      reviewRating: p.avgScore ?? null,
      soldOut: p.soldOutYn === 'Y',
    },
  }));
}

/** 소매 진열 데이터는 정의상 시장 실재 제품이다. UNCONFIRMED 는 데이터 자체가 비어 있을 때만. */
const AMBIGUOUS = [
  { re: /\[[^\]]{1,20}(호|호기|COLOR|컬러|색)\]/i, note: '색상/호수 표기 — 단위 판단 필요' },
  { re: /\b\d+\s*호\b/, note: '호수 표기 — 단위 판단 필요' },
  { re: /택1|택 1|중 ?택|골라담기/, note: '선택형 구성 — 본품 특정 불가' },
];
/**
 * 종합몰(올리브영) 베스트에는 화장품이 아닌 품목이 섞인다(건기식·의약외품·생활용품).
 * 이번 파일럿 대상은 화장품이므로 **제외하지 않고 CHECK 로 표시**해 사람 판단 대상으로 남긴다.
 */
const NON_COSMETIC = [
  { re: /(\d+\s*포\b|젤리|정\s*\d+|캡슐|드링크|스틱\s*\d+포|분말|환\b)/, note: '내복 형태 표기 — 화장품 여부 확인 필요' },
  { re: /(생리대|탐폰|칫솔|치약|구강청결|면도|제모기|족욕|파스|밴드|영양제)/, note: '비화장품 품목 의심 — 확인 필요' },
];

function decide(c) {
  if (!c.sourceProductName.trim()) return { candidateDecision: 'UNCONFIRMED', decisionNote: '제품명 결측' };
  if (!c.brandName) return { candidateDecision: 'CHECK', decisionNote: '브랜드 결측 — 제품 식별 애매' };
  for (const a of AMBIGUOUS) {
    if (a.re.test(c.sourceProductName)) return { candidateDecision: 'CHECK', decisionNote: a.note };
  }
  // 화해에도 이너뷰티(건기식)·디바이스·물티슈 카테고리가 섞여 있다(실측). 카테고리로 먼저 거른다.
  if (/이너뷰티|건강|디바이스|물티슈|기타/.test(c.raw?.categoryPath ?? '')) {
    return { candidateDecision: 'CHECK', decisionNote: `비화장품 카테고리 — ${c.raw.categoryPath}` };
  }
  for (const n of NON_COSMETIC) {
    if (n.re.test(c.sourceProductName)) return { candidateDecision: 'CHECK', decisionNote: n.note };
  }
  return { candidateDecision: 'TARGET', decisionNote: '소매 진열 데이터 — 시장 실재 제품' };
}

async function main() {
  const t0 = Date.now();
  const oy = await collectOliveYoungGlobal();
  const hh = await collectHwahae();

  // 화해 풀은 카테고리 트리 순서라 앞부분만 잘라 쓰면 스킨케어에 쏠린다.
  // → 단계 1 과 동일하게 **계통표본**으로 트리 전 구간에서 균등하게 뽑는다.
  const need = TARGET - oy.length;
  const step = hh.length / need;
  const sampledHh = need >= hh.length ? hh : Array.from({ length: need }, (_, k) => hh[Math.floor(k * step)]);

  const merged = [...oy, ...sampledHh];
  const seenName = new Set();
  const candidates = [];
  let hhCursor = 0;
  for (const c of merged) {
    const key = `${(c.brandName ?? '').trim()}|${c.sourceProductName.trim()}`;
    if (seenName.has(key)) continue;
    seenName.add(key);
    candidates.push({ ...c, ...decide(c) });
  }
  // 중복 제거로 부족하면 미사용 화해 항목으로 결정론적으로 보충한다.
  while (candidates.length < TARGET && hhCursor < hh.length) {
    const c = hh[hhCursor++];
    const key = `${(c.brandName ?? '').trim()}|${c.sourceProductName.trim()}`;
    if (seenName.has(key)) continue;
    seenName.add(key);
    candidates.push({ ...c, ...decide(c) });
  }
  candidates.length = Math.min(candidates.length, TARGET);

  const counts = candidates.reduce((a, c) => ((a[c.candidateDecision] = (a[c.candidateDecision] ?? 0) + 1), a), {});
  const bySource = candidates.reduce((a, c) => ((a[c.source] = (a[c.source] ?? 0) + 1), a), {});
  writeOut('general-candidates-500.json', {
    meta: {
      wo: 'WO-O4O-COSMETICS-INITIAL-CENSUS-AND-GUIDE-PILOT-V0',
      sourcesUsed: bySource,
      sourcesExcluded: {
        OLIVEYOUNG_KOREA: 'HTTP 403 봇 차단 — 차단우회 금지 원칙에 따라 제외',
        YESSTYLE: '목록 클라이언트 렌더링, 공개 JSON 미확인 — 이번 파일럿 제외',
      },
      hwahaePoolSize: hh.length,
      hwahaeSampling: `계통표본: index = floor(k * ${hh.length}/${need}), k=0..${need - 1}`,
      candidateCount: candidates.length,
      decisionCounts: counts,
      elapsedSec: Math.round((Date.now() - t0) / 1000),
    },
    candidates,
  });
  process.stderr.write(`decisions ${JSON.stringify(counts)} sources ${JSON.stringify(bySource)}\n`);
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.stack ?? e}\n`);
  process.exit(1);
});
