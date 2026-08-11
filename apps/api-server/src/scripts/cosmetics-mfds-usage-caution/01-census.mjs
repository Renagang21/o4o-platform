/**
 * WO §2 · §3 — 대상 모집단 재검증.
 *
 * 선행 WO 의 숫자를 그대로 믿지 않는다. 산출물과 운영 DB 를 지금 다시 센다.
 * 매칭은 선행 WO 의 **확정 MATCH 만** 재사용한다. 새 매칭을 넓히지 않는다(WO §3).
 *
 * 산출: census-summary.json · population.json
 */
import { join } from 'node:path';
import { GENERIC_USAGE } from '../cosmetics-guide-production/guide-core.mjs';
import { OUT_DIR, readJsonl, readPrev, writeOut } from './lib.mjs';

const detailFile = readPrev('mfds-detail.json');
const details = detailFile.details;
const match = readPrev('mfds-match.json');

// ── 1. 상세 산출물 재census ────────────────────────────────────────────
const dvals = Object.entries(details);
const detailCensus = {
  rows: dvals.length,
  parsed: dvals.filter(([, d]) => d && !d._missing && !d._failed).length,
  missing: dvals.filter(([, d]) => d?._missing).length,
  failed: dvals.filter(([, d]) => d?._failed).length,
  withEfficacy: dvals.filter(([, d]) => d?.efficacy).length,
  withUsage: dvals.filter(([, d]) => d?.usage).length,
  withCautions: dvals.filter(([, d]) => d?.cautions).length,
};

// ── 2. 확정 매칭 재census ──────────────────────────────────────────────
const matchRows = match.results.filter((r) => r.decision === 'MATCH');
const matchCensus = {
  MATCH: matchRows.length,
  CHECK: match.results.filter((r) => r.decision === 'CHECK').length,
  NO_SOURCE: match.results.filter((r) => r.decision === 'NO_SOURCE').length,
};

// ── 3. 운영 DB 현재 상태 ───────────────────────────────────────────────
const db = new Map();
await readJsonl(join(OUT_DIR, 'db-cosmetics-ko-canonical.jsonl'), (r) => db.set(r.master_id, r));

const GENERIC_SET = new Set(Object.values(GENERIC_USAGE));
const usageOf = (content) => content.match(/<h3>사용 방법<\/h3><p>([\s\S]*?)<\/p>/)?.[1] ?? null;
const hasCaution = (content) => content.includes('<h3>주의사항</h3>');

const population = [];
const state = {
  dbCosmeticDocs: db.size,
  matchInDb: 0,
  matchNotInDb: 0,
  detailUsable: 0,
  detailUnusable: 0,
  currentUsage: { absent: 0, categoryGeneric: 0, productSpecific: 0 },
  currentCaution: { absent: 0, present: 0 },
  dbUsageSectionTotal: 0,
  dbCautionSectionTotal: 0,
};

for (const r of db.values()) {
  if (usageOf(r.content ?? '')) state.dbUsageSectionTotal += 1;
  if (hasCaution(r.content ?? '')) state.dbCautionSectionTotal += 1;
}

for (const m of matchRows) {
  const row = db.get(m.masterId);
  if (!row) {
    state.matchNotInDb += 1;
    continue;
  }
  state.matchInDb += 1;
  const rep = m.reports[0];
  const d = details[rep.reportSeq];
  const usable = Boolean(d && !d._missing && !d._failed);
  if (usable) state.detailUsable += 1;
  else state.detailUnusable += 1;

  const content = row.content ?? '';
  const cur = usageOf(content);
  const usageState = !cur ? 'absent' : GENERIC_SET.has(cur) ? 'categoryGeneric' : 'productSpecific';
  state.currentUsage[usageState] += 1;
  const cautionState = hasCaution(content) ? 'present' : 'absent';
  state.currentCaution[cautionState] += 1;

  population.push({
    masterId: m.masterId,
    descId: row.desc_id,
    brandName: row.brand_name,
    productName: row.name,
    productType: row.product_type,
    reportSeq: rep.reportSeq,
    reportNo: rep.reportNo,
    companyName: rep.companyName,
    matchRule: m.rule,
    detailUsable: usable,
    mfdsProductName: usable ? d.productName : null,
    mfdsUsage: usable ? d.usage : null,
    mfdsCautions: usable ? d.cautions : null,
    currentUsage: cur,
    currentUsageState: usageState,
    currentCautionState: cautionState,
    content,
  });
}

writeOut('census-summary.json', { detailCensus, matchCensus, state });
writeOut('population.json', population);
process.stderr.write(`${JSON.stringify({ detailCensus, matchCensus, state })}\n`);
