/**
 * WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1 §13 — census 요약
 *
 * 산출: tmp/cosmetics-retail-census/census-summary.json
 */
import { readOut, writeOut } from './lib.mjs';

const safe = (f, d = null) => {
  try {
    return readOut(f);
  } catch {
    return d;
  }
};

function main() {
  const musinsa = safe('source-musinsa.json');
  const hwahae = safe('source-hwahae.json');
  const oy = safe('source-oliveyoung-global.json');
  const uniq = readOut('retail-unique-guide-candidates.json');
  const norm = readOut('retail-normalized.json');
  const fm = readOut('functional-match.json');
  const pm = safe('productmaster-compare.json');
  const iq = readOut('issue-queue.json');

  const candidates = uniq.candidates;
  const byType = {};
  for (const c of candidates) byType[c.type ?? '(미판정)'] = (byType[c.type ?? '(미판정)'] ?? 0) + 1;
  const topTypes = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 20);

  const total = candidates.length;
  const decision =
    total <= 40000
      ? '전량 최소 설명서 생산 권고 (추가 복잡화 없이 진행)'
      : '전량 최소 설명서 생산 가능성·비용 산출 후 판단';

  writeOut('census-summary.json', {
    meta: { wo: 'WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1', generatedFrom: '소매 census 산출물' },
    sources: {
      used: [
        musinsa && { source: 'MUSINSA_BEAUTY', ...musinsa.meta, products: undefined },
        hwahae && { source: 'HWAHAE_RANKING', ...hwahae.meta, products: undefined },
        oy && { source: 'OLIVEYOUNG_GLOBAL_BEST', ...oy.meta, products: undefined },
      ].filter(Boolean),
      excluded: [
        { source: 'OLIVEYOUNG_KOREA', reason: 'HTTP 403 봇 차단 — 우회하지 않음' },
        { source: 'OLIVEYOUNG_GLOBAL 브랜드 목록', reason: 'HTTP 403 — 우회하지 않음' },
        { source: 'STYLEVANA', reason: 'HTTP 403 — 우회하지 않음' },
        { source: 'YESSTYLE', reason: 'HTTP 500 + 클라이언트 렌더링, 공개 JSON 없음' },
        { source: 'GLOWPICK', reason: '클라이언트 렌더링, 공개 목록 JSON 없음' },
        {
          source: 'JOLSE',
          reason:
            '접근은 가능하나 상품명이 영문 전용 — 한국어 상품명 축과 이름 기준 대조가 불가해 unique 수를 부풀린다. 별도 EN 축 과제로 남긴다.',
        },
      ],
    },
    contributionCurve: norm.perSource,
    population: {
      totalRawAfterCosmeticGate: norm.meta.normalizedRows,
      uniqueGuideCandidates: total,
      mergedIntoExistingUnit: norm.meta.mergedRowsIntoExistingKey,
      withBrand: uniq.meta.withBrand,
      withType: uniq.meta.withType,
      withEnglishName: uniq.meta.withEnglishName,
      topTypes,
    },
    functional: {
      direction: fm.meta.direction,
      functionalRows: fm.meta.functionalRows,
      RETAIL_FUNCTIONAL_MATCHED: fm.meta.RETAIL_FUNCTIONAL_MATCHED,
      RETAIL_NO_FUNCTIONAL_MATCH: fm.meta.RETAIL_NO_FUNCTIONAL_MATCH,
      CHECK: fm.meta.CHECK,
      FUNCTIONAL_UNMATCHED: fm.meta.FUNCTIONAL_UNMATCHED,
      matchRule: fm.meta.matchRule,
    },
    existingO4O: pm?.meta ?? { status: 'NOT_RUN' },
    issueQueue: iq.meta,
    productionJudgement: {
      threshold: 40000,
      uniqueGuideCandidates: total,
      decision,
      note: '40,000 은 hard limit 이 아니라 현재 기획상의 판단선이다 (WO §13).',
    },
  });

  process.stderr.write(`unique=${total} → ${decision}\n`);
}

main();
