/**
 * WO §8 — dry-run. 결손 모집단 전체를 AUTO_ENRICH / CHECK / NO_SOURCE / NO_CHANGE 로 가른다.
 *
 * 보완 축 (둘 다 이미 게시된 사실이며 추론이 아니다)
 *   A. 판매명 안의 용량·구성 표기 중 선행 생산이 놓친 것 (RETAIL_LISTING)
 *   B. 식약처 기능성화장품 보고 상세의 효능·효과 / 용법·용량 (MFDS_REPORT_OFFICIAL)
 *   C. 같은 계열 안 유형 정정 (FAMILY_CORRECTION)
 *
 * 산출: dry-run-plan.json (적용 계획) · dry-run-summary.json · check-queue.json
 */
import { GENERIC_USAGE } from '../cosmetics-guide-production/guide-core.mjs';
import { editContent } from './content-edit-core.mjs';
import { extractCapacityV2, extractComposition, mfdsFeatureText, usableMfdsUsage } from './enrich-core.mjs';
import { OUT_DIR, readJsonl, readOut, writeOut } from './lib.mjs';
import { join } from 'node:path';

const gaps = readOut('gap-population.json');
const mfdsMatch = readOut('mfds-match.json');
const mfdsDetail = readOut('mfds-detail.json').details;
const triage = readOut('type-triage.json');

const matchByMaster = new Map(mfdsMatch.results.map((r) => [r.masterId, r]));
const triageByMaster = new Map(triage.rows.map((r) => [r.masterId, r]));

const db = new Map();
await readJsonl(join(OUT_DIR, 'db-cosmetics-ko-canonical.jsonl'), (r) => db.set(r.master_id, r));

const CHECK_ISSUES = new Set([
  'NAME_TOO_SHORT',
  'NAME_EQUALS_TYPE',
  'PRODUCT_TYPE_UNDETERMINED',
  'PRODUCT_TYPE_AXIS_NOT_FORM',
  'TYPE_NAME_CONTRADICTION',
]);

const plan = [];
const checkQueue = [];
const counts = { AUTO_ENRICH: 0, CHECK: 0, NO_SOURCE: 0, NO_CHANGE: 0 };
const fieldCounts = { mainFeatures: 0, usage: 0, productType: 0 };
const evidenceCounts = {};
const featureSourceCounts = {};

for (const g of gaps) {
  const row = db.get(g.masterId);
  if (!row) continue;

  const features = [];
  const evidence = [];

  // ── A. 판매명 사실값 (결손일 때만) ───────────────────────────────────
  if (g.missing.mainFeatures) {
    const names = [g.productName, ...g.sources.map((s) => s.rawProductName)];
    let cap = null;
    for (const n of names) {
      cap = extractCapacityV2(n);
      if (cap) break;
    }
    if (cap) {
      features.push({ text: `용량/구성: ${cap.value}`, evidence: 'RETAIL_LISTING', from: cap.from });
      featureSourceCounts[cap.from] = (featureSourceCounts[cap.from] ?? 0) + 1;
    }
    const comp = names.map(extractComposition).find(Boolean);
    if (comp) {
      features.push({ text: `구성: ${comp}`, evidence: 'RETAIL_LISTING', from: 'NAME_COMPOSITION' });
      featureSourceCounts.NAME_COMPOSITION = (featureSourceCounts.NAME_COMPOSITION ?? 0) + 1;
    }
  }

  // ── B. 식약처 기능성 보고 상세 ───────────────────────────────────────
  const m = matchByMaster.get(g.masterId);
  let mfdsUsage = null;
  let mfdsEvidence = null;
  if (m?.decision === 'MATCH') {
    const rep = m.reports[0];
    const d = mfdsDetail[rep.reportSeq];
    if (d && !d._missing && !d._failed) {
      mfdsEvidence = { reportNo: rep.reportNo, reportSeq: rep.reportSeq, companyName: rep.companyName, mfdsProductName: d.productName };
      // 효능·효과는 **공식 원천이 확인한 제품 사실**이다. 특징 결손 여부와 무관하게 보완한다
      // (WO 목표 — "확인 가능한 제품 사실을 추가 확보해 기존 설명서를 보완").
      // 이미 실려 있는 보고번호 줄은 다시 넣지 않는다.
      const eff = mfdsFeatureText(d);
      const before0 = row.content ?? '';
      if (eff && !before0.includes('기능성화장품 보고 효능')) {
        features.push({ text: eff, evidence: 'MFDS_REPORT_OFFICIAL', from: 'MFDS_EFFICACY' });
        featureSourceCounts.MFDS_EFFICACY = (featureSourceCounts.MFDS_EFFICACY ?? 0) + 1;
        if (!before0.includes(`보고번호 ${rep.reportNo}`)) {
          features.push({
            text: `식약처 기능성화장품 보고 제품 (보고번호 ${rep.reportNo} · 책임판매업자 ${rep.companyName})`,
            evidence: 'MFDS_REPORT_OFFICIAL',
            from: 'MFDS_REPORT_NO',
          });
        }
      }
      if (g.missing.usage) mfdsUsage = usableMfdsUsage(d.usage);
    }
  }

  // ── C. 유형 정정 ─────────────────────────────────────────────────────
  const tr = triageByMaster.get(g.masterId);
  let typeChange = null;
  if (tr?.verdict === 'FAMILY_CORRECTION' && tr.newType && tr.categoryType) {
    typeChange = { from: tr.categoryType, to: tr.newType, reason: tr.reason };
  }

  // ── 편집안 조립 ──────────────────────────────────────────────────────
  const add = { features: features.map((f) => f.text) };
  if (mfdsUsage) add.usage = mfdsUsage;
  if (typeChange) {
    add.replaceOneLineType = { from: typeChange.from, to: typeChange.to };
    const oldU = GENERIC_USAGE[typeChange.from];
    const newU = GENERIC_USAGE[typeChange.to];
    if (oldU && newU && oldU !== newU) add.replaceUsage = { from: oldU, to: newU };
  }

  const before = row.content ?? '';
  const { content: after, applied } = editContent(before, add);
  const changed = after !== before || Boolean(typeChange);

  // ── 판정 ─────────────────────────────────────────────────────────────
  const unresolvedCheck = [
    ...g.issueTypes.filter((t) => CHECK_ISSUES.has(t)),
    ...(tr && ['DIFFERENT_AXIS'].includes(tr.verdict) ? ['TYPE_NAME_MISMATCH_UNRESOLVED'] : []),
    ...(m?.decision === 'CHECK' ? ['MFDS_MULTI_COMPANY'] : []),
  ];
  const stillMissing = {
    mainFeatures: g.missing.mainFeatures && !features.length,
    usage: g.missing.usage && !mfdsUsage,
    productType: g.missing.productType && !typeChange,
  };

  let decision;
  if (changed) decision = 'AUTO_ENRICH';
  else if (unresolvedCheck.length) decision = 'CHECK';
  else if (stillMissing.mainFeatures || stillMissing.usage || stillMissing.productType) decision = 'NO_SOURCE';
  else decision = 'NO_CHANGE';
  counts[decision] += 1;

  if (decision === 'AUTO_ENRICH') {
    if (features.length) fieldCounts.mainFeatures += 1;
    if (applied.includes('usageSection')) fieldCounts.usage += 1;
    if (typeChange) fieldCounts.productType += 1;
    for (const f of features) evidenceCounts[f.evidence] = (evidenceCounts[f.evidence] ?? 0) + 1;
    plan.push({
      masterId: g.masterId,
      descId: g.descId,
      brandName: g.brandName,
      productName: g.productName,
      changedFields: [
        ...(features.length ? ['mainFeatures'] : []),
        ...(applied.includes('usageSection') ? ['usage'] : []),
        ...(typeChange ? ['productType'] : []),
      ],
      before: { content: before, productType: tr?.categoryType ?? g.productType ?? null },
      after: { content: after, productType: typeChange ? typeChange.to : (tr?.categoryType ?? g.productType ?? null) },
      addedFeatures: features,
      addedUsage: applied.includes('usageSection') ? add.usage : null,
      typeChange,
      appliedEdits: applied,
      source: [
        ...(features.some((f) => f.evidence === 'RETAIL_LISTING') ? ['RETAIL_LISTING'] : []),
        ...(mfdsEvidence ? ['MFDS_FUNCTIONAL_REPORT'] : []),
        ...(typeChange ? ['RETAIL_CATEGORY+PRODUCT_NAME'] : []),
      ],
      matchEvidence: {
        mfds: mfdsEvidence,
        mfdsRule: m?.rule ?? null,
        typeRule: tr?.verdict ?? null,
        retailSources: g.sources.map((s) => ({ source: s.source, id: s.id })),
        rawProductNames: g.sources.map((s) => s.rawProductName),
      },
    });
  } else if (decision === 'CHECK') {
    checkQueue.push({
      masterId: g.masterId,
      brandName: g.brandName,
      productName: g.productName,
      reasons: unresolvedCheck,
      detail: tr ? { categoryType: tr.categoryType, inferred: tr.inferredStrict, verdict: tr.verdict, reason: tr.reason } : null,
    });
  }
}

writeOut('dry-run-plan.json', plan);
writeOut('check-queue.json', checkQueue);
writeOut('dry-run-summary.json', {
  wo: 'WO-O4O-COSMETICS-GUIDE-GAP-ENRICHMENT-FULL-V1',
  gapPopulation: gaps.length,
  counts,
  autoEnrichFieldCounts: fieldCounts,
  featureEvidenceCounts: evidenceCounts,
  featureSourceCounts,
  mfdsMatch: mfdsMatch.meta.counts,
  typeTriage: triage.meta.counts,
});
process.stderr.write(`${JSON.stringify(counts)}\n`);
