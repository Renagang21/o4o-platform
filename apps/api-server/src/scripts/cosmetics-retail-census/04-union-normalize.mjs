/**
 * WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1 §6·§7 — 합집합 · 정규화 · 소스별 추가 기여율
 *
 * 정규화 규칙은 파일럿과 같은 SSOT(`cosmetics-census-pilot/normalize-core.mjs`) 를 그대로 쓴다.
 * 소스를 **순차로 합치면서** 각 단계의 raw / normalized / unique 후보 / 신규 추가 수·추가율을 기록한다.
 * 신규 추가율이 급격히 떨어지면 소스를 더 늘리지 않는다는 판단 근거가 이 곡선이다.
 *
 * 산출: retail-raw-union.json · retail-normalized.json ·
 *       retail-unique-guide-candidates.json · issue-queue.json
 */
import { keyOf, normalize, typeFromCategory, detectType } from '../cosmetics-census-pilot/normalize-core.mjs';
import { readOut, writeOut } from './lib.mjs';

/** 합치는 순서 = 한국어 상품명 기여가 큰 순서. */
const SOURCES = [
  { file: 'source-musinsa.json', label: 'MUSINSA_BEAUTY' },
  { file: 'source-hwahae.json', label: 'HWAHAE_RANKING' },
  { file: 'source-oliveyoung-global.json', label: 'OLIVEYOUNG_GLOBAL_BEST' },
];

/**
 * 비화장품 게이트 (V0 §2 S4).
 * 무신사 뷰티 대분류에는 기기·소품·식품·위생용품이 함께 있으므로 화장품이 아닌 마디를 제외한다.
 * 애매한 마디(여성청결제 등)는 제외 쪽으로 두고 CHECK 문서에 한계로 남긴다.
 */
const NON_COSMETIC_DEPTH2 = new Set(['뷰티 디바이스/소품', '미용소품', '헬스/푸드']);
const NON_COSMETIC_LEAF = new Set([
  '헤어기기',
  '헤어브러쉬',
  '네일소품',
  '네일팁/스티커',
  '눈썹관리기',
  '기타 면도/제모기기',
  '코털정리기',
  '면도/제모기',
]);

function gate(p) {
  const segs = (p.category ?? '').split('|');
  if (p.source === 'MUSINSA_BEAUTY') {
    if (NON_COSMETIC_DEPTH2.has(segs[1])) return `NON_COSMETIC_DEPTH2:${segs[1]}`;
    if (NON_COSMETIC_LEAF.has(segs[2])) return `NON_COSMETIC_LEAF:${segs[2]}`;
  }
  return null;
}

/** 무신사는 `뷰티|스킨케어|크림/아이크림`, 화해는 `A > B > C` 표기다. SSOT 함수 입력 형식으로 맞춘다. */
const toPath = (c) => (c ? c.replace(/\|/g, ' > ') : null);

function main() {
  const raw = [];
  const perSource = [];
  const uniq = new Map(); // key -> candidate
  const issues = [];

  for (const s of SOURCES) {
    let doc;
    try {
      doc = readOut(s.file);
    } catch {
      perSource.push({ source: s.label, status: 'MISSING', note: '수집 산출물 없음' });
      continue;
    }
    const before = uniq.size;
    let gated = 0;
    let normalized = 0;

    for (const p of doc.products) {
      const g = gate(p);
      if (g) {
        gated += 1;
        continue;
      }
      raw.push(p);

      const brand = (p.brandName ?? '').trim();
      const { core, applied, variants } = normalize(p.rawProductName ?? '', brand);
      if (!core || core.replace(/\s/g, '').length < 2) {
        issues.push({ type: 'NAME_TOO_SHORT_AFTER_NORMALIZE', source: p.source, sourceProductId: p.sourceProductId, rawProductName: p.rawProductName, core });
        continue;
      }
      normalized += 1;

      // 옵션 택N 판매는 서로 다른 제품을 한 상품명에 묶어 파는 경우가 있다 → 병합하지 말고 사람 검수로.
      if (/택\s*\d|교차\s*(?:선택|가능)/.test(p.rawProductName ?? '') && core.includes('/')) {
        issues.push({ type: 'MULTI_OPTION_BUNDLE', source: p.source, sourceProductId: p.sourceProductId, rawProductName: p.rawProductName, core });
      }

      const path = toPath(p.category);
      const byCat = path ? typeFromCategory(path) : null;
      const byName = detectType(core);
      const type = byCat?.type ?? byName.type ?? null;

      const key = keyOf(brand.replace(/\s+/g, ''), core);
      const hit = uniq.get(key);
      if (!hit) {
        uniq.set(key, {
          key,
          brandName: brand || null,
          canonicalProductName: core,
          type,
          typeSource: byCat ? 'RETAIL_CATEGORY' : byName.type ? 'PRODUCT_NAME' : null,
          englishProductName: p.englishProductName ?? null,
          category: p.category ?? null,
          sources: [{ source: p.source, sourceProductId: p.sourceProductId, sourceUrl: p.sourceUrl, rawProductName: p.rawProductName }],
          mergedRawCount: 1,
          appliedRules: applied,
          variants,
        });
        if (!brand) {
          issues.push({ type: 'BRAND_UNKNOWN', source: p.source, sourceProductId: p.sourceProductId, rawProductName: p.rawProductName });
        }
      } else {
        hit.mergedRawCount += 1;
        hit.sources.push({ source: p.source, sourceProductId: p.sourceProductId, sourceUrl: p.sourceUrl, rawProductName: p.rawProductName });
        hit.englishProductName ??= p.englishProductName ?? null;
        hit.appliedRules = [...new Set([...hit.appliedRules, ...applied])];
        hit.variants = [...new Set([...hit.variants, ...variants])];
        // 유형이 서로 다르게 잡히면 병합이 과했을 수 있다 → 사람 검수 큐.
        if (type && hit.type && type !== hit.type) {
          issues.push({
            type: 'MERGE_TYPE_CONFLICT',
            key,
            canonicalProductName: hit.core ?? hit.canonicalProductName,
            typeA: hit.type,
            typeB: type,
            sources: hit.sources.map((x) => `${x.source}:${x.sourceProductId}`),
          });
        }
      }
    }

    const added = uniq.size - before;
    perSource.push({
      source: s.label,
      rawCollected: doc.products.length,
      gatedOutNonCosmetic: gated,
      rawAfterGate: doc.products.length - gated,
      normalized,
      cumulativeUnique: uniq.size,
      newUniqueAdded: added,
      // 추가율 = 이 소스가 기존 누적 대비 얼마나 새로 늘렸는가
      newUniqueRateVsPrevious: before ? Number(((added / before) * 100).toFixed(2)) : null,
      newUniqueRateOfOwnRows: normalized ? Number(((added / normalized) * 100).toFixed(2)) : null,
    });
  }

  const candidates = [...uniq.values()];
  const mergedMoreThanOne = candidates.filter((c) => c.mergedRawCount > 1).length;

  writeOut('retail-raw-union.json', {
    meta: {
      wo: 'WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1',
      totalRawAfterGate: raw.length,
      perSource,
      note: '비화장품 게이트 통과분만 담는다. 가격·재고·이미지는 수집하지 않는다 (WO §5).',
    },
    products: raw,
  });

  writeOut('retail-normalized.json', {
    meta: {
      wo: 'WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1',
      normalizedRows: raw.length - issues.filter((i) => i.type === 'NAME_TOO_SHORT_AFTER_NORMALIZE').length,
      uniqueKeys: candidates.length,
      mergedRowsIntoExistingKey: raw.length - candidates.length,
      note: '정규화 규칙 SSOT = cosmetics-census-pilot/normalize-core.mjs (기준문서 V0 §3~§4)',
    },
    perSource,
  });

  writeOut('retail-unique-guide-candidates.json', {
    meta: {
      wo: 'WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1',
      uniqueGuideCandidates: candidates.length,
      withBrand: candidates.filter((c) => c.brandName).length,
      withType: candidates.filter((c) => c.type).length,
      withEnglishName: candidates.filter((c) => c.englishProductName).length,
      multiSourceOrMultiRow: mergedMoreThanOne,
      perSource,
    },
    candidates,
  });

  const byType = {};
  for (const i of issues) byType[i.type] = (byType[i.type] ?? 0) + 1;
  writeOut('issue-queue.json', {
    meta: { wo: 'WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1', issueCount: issues.length, byType },
    issues,
  });

  process.stderr.write(`${JSON.stringify({ unique: candidates.length, perSource, byType }, null, 2)}\n`);
}

main();
