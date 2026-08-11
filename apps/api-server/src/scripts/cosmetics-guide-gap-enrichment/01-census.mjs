/**
 * WO §2 — 결손 census.
 *
 * 과거 수치(16,870 / 11,500 / 8,079)를 그대로 쓰지 않는다. **운영 DB 실측 dump** 를 기준으로
 * 32,674건을 다시 세고, 선행 산출물(설명서 객체 · census 후보)과 key 정합을 확인한다.
 *
 * 입력:
 *   tmp/cosmetics-guide-gap-enrichment/db-cosmetics-ko-canonical.jsonl  (운영 DB read-only dump)
 *   tmp/cosmetics-guide-production/all-guides-ko.json
 *   tmp/cosmetics-retail-census/retail-unique-guide-candidates.json
 * 산출:
 *   census-summary.json · gap-population.json
 */
import { join } from 'node:path';
import { OUT_DIR, readCensus, readJsonl, readProd, writeOut } from './lib.mjs';

const t0 = Date.now();

// ── 1. 운영 DB 실측 ────────────────────────────────────────────────────
const dbRows = [];
await readJsonl(join(OUT_DIR, 'db-cosmetics-ko-canonical.jsonl'), (r) => dbRows.push(r));
process.stderr.write(`DB canonical rows: ${dbRows.length}\n`);

// ── 2. 선행 산출물 ─────────────────────────────────────────────────────
const guides = readProd('all-guides-ko.json');
const guideList = Array.isArray(guides) ? guides : (guides.guides ?? []);
const guideByKey = new Map(guideList.map((g) => [g.key, g]));
const cands = readCensus('retail-unique-guide-candidates.json');
const candList = Array.isArray(cands) ? cands : (cands.candidates ?? []);
const candByKey = new Map(candList.map((c) => [c.key, c]));
process.stderr.write(`guides: ${guideList.length} · candidates: ${candList.length}\n`);

// ── 3. 결손 판정 — DB 본문에서 직접 읽는다 ─────────────────────────────
// 렌더러(render.mjs) 계약: 주요 특징 / 사용 방법 은 있을 때만 <h3> 절이 나온다.
const hasSection = (html, title) => html.includes(`<h3>${title}</h3>`);

const census = {
  dbRows: dbRows.length,
  matchedGuide: 0,
  matchedCandidate: 0,
  noGuide: [],
  noCandidate: [],
  missing: { mainFeatures: 0, usage: 0, productType: 0 },
  gapDocs: 0,
  issueCounts: {},
  bySourceMix: {},
  featureEvidenceCounts: {},
};

const gapPopulation = [];

for (const r of dbRows) {
  const key = r.census_key;
  const g = guideByKey.get(key) ?? null;
  const c = candByKey.get(key) ?? null;
  if (g) census.matchedGuide += 1;
  else census.noGuide.push({ masterId: r.master_id, key, name: r.name });
  if (c) census.matchedCandidate += 1;
  else census.noCandidate.push({ masterId: r.master_id, key, name: r.name });

  const content = r.content ?? '';
  const missFeatures = !hasSection(content, '주요 특징');
  const missUsage = !hasSection(content, '사용 방법');
  const missType = !(g?.productType ?? r.product_type);

  if (missFeatures) census.missing.mainFeatures += 1;
  if (missUsage) census.missing.usage += 1;
  if (missType) census.missing.productType += 1;

  const issues = g?.issues ?? [];
  for (const i of issues) census.issueCounts[i.type] = (census.issueCounts[i.type] ?? 0) + 1;
  for (const f of g?.mainFeatures ?? []) {
    census.featureEvidenceCounts[f.evidence] = (census.featureEvidenceCounts[f.evidence] ?? 0) + 1;
  }

  const sources = (c?.sources ?? []).map((s) => s.source);
  const mix = [...new Set(sources)].sort().join('+') || 'NONE';
  census.bySourceMix[mix] = (census.bySourceMix[mix] ?? 0) + 1;

  const hasGap = missFeatures || missUsage || missType || issues.length > 0;
  if (hasGap) {
    census.gapDocs += 1;
    gapPopulation.push({
      masterId: r.master_id,
      descId: r.desc_id,
      key,
      brandName: r.brand_name,
      productName: r.name,
      productType: g?.productType ?? null,
      missing: { mainFeatures: missFeatures, usage: missUsage, productType: missType },
      issueTypes: [...new Set(issues.map((i) => i.type))],
      sources: (c?.sources ?? []).map((s) => ({
        source: s.source,
        id: s.sourceProductId,
        url: s.sourceUrl,
        rawProductName: s.rawProductName,
      })),
    });
  }
}

// 결손 문서 수 ≠ issue 수 (WO §2)
census.issueTotal = Object.values(census.issueCounts).reduce((a, b) => a + b, 0);

// 결손 유형별 문서 수 (문서 기준 — 교차 집계)
const byMissingCombo = {};
for (const g of gapPopulation) {
  const combo =
    Object.entries(g.missing)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join('+') || 'ISSUE_ONLY';
  byMissingCombo[combo] = (byMissingCombo[combo] ?? 0) + 1;
}
census.byMissingCombo = byMissingCombo;

// 보완 가능성 축 — 상세 페이지를 가진 소스가 있는가
let withMusinsa = 0;
let withHwahae = 0;
let withOliveyoung = 0;
let withNoDetailSource = 0;
for (const g of gapPopulation) {
  const ss = new Set(g.sources.map((s) => s.source));
  if (ss.has('MUSINSA_BEAUTY')) withMusinsa += 1;
  if (ss.has('HWAHAE_RANKING')) withHwahae += 1;
  if (ss.has('OLIVEYOUNG_GLOBAL_BEST')) withOliveyoung += 1;
  if (ss.size === 0) withNoDetailSource += 1;
}
census.gapDetailSourceAvailability = { withMusinsa, withHwahae, withOliveyoung, withNoDetailSource };

census.elapsedMs = Date.now() - t0;
census.noGuide = census.noGuide.slice(0, 20);
census.noCandidate = census.noCandidate.slice(0, 20);

writeOut('census-summary.json', census);
writeOut('gap-population.json', gapPopulation);
process.stderr.write(`gapDocs=${census.gapDocs} issueTotal=${census.issueTotal}\n`);
