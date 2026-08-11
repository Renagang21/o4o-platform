/**
 * WO §4 — 결손 모집단 → 식약처 기능성화장품 보고 **제품 매칭**.
 *
 * 판정은 MATCH / CHECK / NO_SOURCE 세 가지뿐이다. 애매하면 연결하지 않는다.
 *   MATCH  — 정규화 제품명이 정확히 같고, 보고 업체가 하나이거나 브랜드와 정합한다
 *   CHECK  — 이름은 같은데 서로 다른 업체 보고가 섞여 있다 (사람 확인)
 *   NO_SOURCE — 어떤 키로도 보고를 찾지 못했다
 *
 * 산출: mfds-match.json
 */
import { readCensus, readOut, writeOut } from './lib.mjs';

const tight = (s) => (s ?? '').replace(/[^0-9a-z가-힣]/gi, '').toLowerCase();

const gaps = readOut('gap-population.json');
const fidx = readCensus('functional-index.json').rows;

// 보고명 → 보고 행
const byName = new Map();
for (const r of fidx) {
  const k = tight(r.productName);
  if (!k) continue;
  if (!byName.has(k)) byName.set(k, []);
  byName.get(k).push(r);
}

// 보고명이 `브랜드+제품명` 인 경우를 위해 브랜드 접두를 뗀 키도 만든다.
const brandSet = new Set(gaps.map((g) => tight(g.brandName)).filter((b) => b.length >= 2));
const byNameNoBrand = new Map();
for (const [k, rows] of byName) {
  for (const b of brandSet) {
    if (!k.startsWith(b) || k.length - b.length < 4) continue;
    const k2 = k.slice(b.length);
    if (!byNameNoBrand.has(k2)) byNameNoBrand.set(k2, []);
    byNameNoBrand.get(k2).push(...rows.map((r) => ({ ...r, strippedBrand: b })));
  }
}

const companyAligned = (company, brand) => {
  const c = tight(company);
  const b = tight(brand);
  return b.length >= 2 && c.includes(b);
};

const counts = { MATCH: 0, CHECK: 0, NO_SOURCE: 0 };
const byRule = {};
const results = [];

for (const g of gaps) {
  const core = tight(g.productName);
  const brand = tight(g.brandName);
  let rows = null;
  let rule = null;
  if (core.length >= 4 && byName.has(core)) {
    rows = byName.get(core);
    rule = 'NAME_EXACT';
  } else if (brand && byName.has(brand + core)) {
    rows = byName.get(brand + core);
    rule = 'BRAND_PREFIXED_NAME';
  } else if (core.length >= 4 && byNameNoBrand.has(core)) {
    rows = byNameNoBrand.get(core).filter((r) => r.strippedBrand === brand);
    rule = 'REPORT_NAME_BRAND_STRIPPED';
    if (!rows.length) rows = null;
  }

  if (!rows) {
    counts.NO_SOURCE += 1;
    results.push({ masterId: g.masterId, key: g.key, decision: 'NO_SOURCE' });
    continue;
  }

  const companies = [...new Set(rows.map((r) => r.companyName))];
  let picked = rows;
  let note = null;
  if (companies.length > 1) {
    const aligned = rows.filter((r) => companyAligned(r.companyName, g.brandName));
    const alignedCompanies = [...new Set(aligned.map((r) => r.companyName))];
    if (alignedCompanies.length === 1) {
      picked = aligned;
      note = `동일 제품명 보고 ${companies.length}개 업체 중 브랜드와 정합한 업체 1곳으로 좁혔다`;
    } else {
      counts.CHECK += 1;
      results.push({
        masterId: g.masterId,
        key: g.key,
        decision: 'CHECK',
        rule,
        reason: `동일 제품명 기능성 보고가 서로 다른 업체 ${companies.length}곳 — 같은 제품인지 판단 필요`,
        companies: companies.slice(0, 5),
      });
      continue;
    }
  }

  counts.MATCH += 1;
  byRule[rule] = (byRule[rule] ?? 0) + 1;
  // 보고번호는 최신 보고순으로 정렬해 대표 1건 + 최대 3건을 남긴다.
  const sorted = [...picked].sort((a, b) => String(b.reportedAt).localeCompare(String(a.reportedAt)));
  results.push({
    masterId: g.masterId,
    key: g.key,
    decision: 'MATCH',
    rule,
    note,
    brandName: g.brandName,
    productName: g.productName,
    reports: sorted.slice(0, 3).map((r) => ({
      reportSeq: r.reportSeq,
      reportNo: r.reportNo,
      productName: r.productName,
      companyName: r.companyName,
      reportedAt: r.reportedAt,
    })),
  });
}

writeOut('mfds-match.json', {
  meta: {
    wo: 'WO-O4O-COSMETICS-GUIDE-GAP-ENRICHMENT-FULL-V1',
    gapPopulation: gaps.length,
    functionalRows: fidx.length,
    counts,
    byRule,
    rule: '정규화 제품명 완전일치만 연결한다. 부분일치·유사도 매칭은 하지 않는다.',
  },
  results,
});
process.stderr.write(`${JSON.stringify(counts)} ${JSON.stringify(byRule)}\n`);
