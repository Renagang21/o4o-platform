/**
 * Phase 3 + 5 — 최종 사람 검토 큐 v2 재구성 (read-only, DB write 0).
 *
 * 규칙
 *   - 이미 해결된 원본 큐 행은 PERMANENTLY_EXCLUDED 로 제외하고 v2 에 싣지 않는다.
 *   - 후속 WO delta 의 미해결 행, Agent 9 HOLD, 이번 WO 의 HOLD 를 canonicalId 기준으로 dedup 한다.
 *   - 동일 canonical 이 두 번 예약되지 않음을 산출물에서 증명한다(scheduledOnce).
 *   - Step 5: EN 짝이 없는 KO canonical 은 **정책 판정 모집단으로만** 확정한다(생성 없음).
 */
import fs from 'node:fs';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const readJsonl = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const idOf = (r) => r.canonicalId ?? r.canonical_id ?? r.descriptionId ?? r.id ?? null;
const stOf = (r) => r.proposedReviewStatus ?? r.reviewStatus ?? r.status ?? 'UNKNOWN';

const original = readJsonl(`${D}/hff-ko-function-human-review-queue-v1.jsonl`);
const deltas = [
  ...readJsonl(`${D}/hff-ko-function-review-pilot-47-queue-delta-v1.jsonl`),
  ...readJsonl(`${D}/hff-ko-why-family-825-review-queue-delta-v1.jsonl`),
  ...readJsonl(`${D}/hff-ko-why-family-525-review-queue-delta-v1.jsonl`),
];
const agent9 = readJsonl(`${D}/hff-ko-agent-09-hold-queue-v1.jsonl`);
const thisWoKo = [
  ...readJsonl(`${D}/hff-ko-composite-variant-127-human-review-v1.jsonl`),
  ...readJsonl(`${D}/hff-ko-residual-13-final-queue-v1.jsonl`),
];
const thisWoEn = readJsonl(`${D}/hff-en-parity-final-queue-v1.jsonl`);

/** 이번 WO 에서 실제 수정된 canonical (재수정 금지 대상) */
const appliedNow = new Set([
  ...JSON.parse(fs.readFileSync(`${D}/hff-ko-composite-variant-127-targets-v1.json`, 'utf8')).targetsIndex.map((t) => t.canonicalId),
  ...JSON.parse(fs.readFileSync(`${D}/hff-ko-residual-13-targets-v1.json`, 'utf8')).targetsIndex.map((t) => t.canonicalId),
]);
const enAppliedNow = new Set(JSON.parse(fs.readFileSync(`${D}/hff-en-parity-targets-v1.json`, 'utf8')).targetsIndex.map((t) => t.canonicalId));

/** delta 상태 → 해결 여부 */
const resolvedIds = new Set();
const stillPendingIds = new Set();
for (const r of deltas) {
  const i = idOf(r); if (!i) continue;
  if (String(stOf(r)).startsWith('RESOLVED')) resolvedIds.add(i); else stillPendingIds.add(i);
}

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const HFF = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`;
const KO = `${HFF} AND coalesce(language,'ko')='ko'`;
const EN = `${HFF} AND language='en'`;

/** Step 5 — EN 짝 없는 KO 모집단 (정책 판정용, 생성 금지) */
const pairless = (await c.query(`
  SELECT ko.id canonical_id, ko.master_id
    FROM shared_product_descriptions ko
   WHERE ${KO}
     AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions en WHERE ${EN.replace(/\b(source_type|description_type|status|language|deleted_at)\b/g, 'en.$1')} AND en.master_id = ko.master_id)`)).rows;

const liveCounts = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO}) ko_total,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${EN}) en_total,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO} AND content !~ '<h2>[^<]*기능성[^<]*</h2>') ko_no_fn,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${EN} AND content !~* '<h2>[^<]*function[^<]*</h2>') en_no_fn`)).rows[0];
await c.end();

/* v2 큐 구성 — canonicalId 기준 dedup, 우선순위: 이번 WO HOLD > Agent9 > delta 미해결 > 원본 */
const v2 = new Map();
const push = (id, row) => { if (!id) return; if (!v2.has(id)) v2.set(id, row); else v2.get(id).sources.push(row.source); };
for (const r of thisWoKo) push(idOf(r), { canonicalId: idOf(r), language: 'ko', track: 'THIS_WO_HOLD', reason: r.reason ?? null, productName: r.productName ?? null, statementNo: r.statementNo ?? null, nextAction: r.nextAction ?? 'HUMAN_DECISION', sources: ['THIS_WO_KO'] });
for (const r of thisWoEn) push(idOf(r), { canonicalId: idOf(r), language: 'en', track: 'THIS_WO_HOLD', reason: r.reason ?? null, productName: r.productName ?? null, statementNo: r.statementNo ?? null, nextAction: r.nextAction ?? 'OFFICIAL_EN_SOURCE_REQUIRED', sources: ['THIS_WO_EN'] });
for (const r of agent9) push(idOf(r), { canonicalId: idOf(r), language: 'ko', track: 'AGENT9_HOLD', reason: r.reason ?? r.holdReason ?? null, productName: r.productName ?? null, statementNo: r.statementNo ?? null, nextAction: 'HUMAN_DECISION', sources: ['AGENT9'] });
for (const r of deltas) { const i = idOf(r); if (!i || !stillPendingIds.has(i) || resolvedIds.has(i)) continue;
  push(i, { canonicalId: i, language: 'ko', track: 'DELTA_STILL_PENDING', reason: String(stOf(r)), productName: r.productName ?? null, statementNo: r.statementNo ?? null, nextAction: 'HUMAN_DECISION', sources: ['DELTA'] }); }
/* 제외 기준은 **delta 상태상 해결됨(139)** 뿐이다.
   이번 WO 가 손댄 행이라는 이유로 제외하지 않는다 — 127건은 `이런 분께`·전문가 안내만 수정했고
   기능성 문구는 변경하지 않았으므로, 기능성 사유의 검토 필요는 그대로 남는다.
   대신 alsoModifiedInThisWo 플래그로 표시해 동일 canonical 재수정 여부를 사람이 판단하게 한다. */
let excludedResolved = 0;
for (const r of original) { const i = idOf(r); if (!i) continue;
  if (resolvedIds.has(i)) { excludedResolved++; continue; }
  push(i, { canonicalId: i, language: 'ko', track: 'ORIGINAL_QUEUE', reason: r.reason ?? r.reviewReason ?? null, productName: r.productName ?? null, statementNo: r.statementNo ?? null, nextAction: 'HUMAN_DECISION', sources: ['ORIGINAL'] }); }

const rows = [...v2.values()];
for (const r of rows) {
  r.alsoModifiedInThisWo = r.language === 'en' ? enAppliedNow.has(r.canonicalId) : appliedNow.has(r.canonicalId);
  r.thisWoEditScope = r.alsoModifiedInThisWo ? (r.language === 'en' ? 'AUDIENCE_REMOVAL/EXPERT_CLAUSE' : 'AUDIENCE_REMOVAL/EXPERT_CLAUSE') : null;
}
const trackTally = rows.reduce((a, x) => { a[x.track] = (a[x.track] ?? 0) + 1; return a; }, {});
const langTally = rows.reduce((a, x) => { a[x.language] = (a[x.language] ?? 0) + 1; return a; }, {});
const alsoModified = rows.filter((x) => x.alsoModifiedInThisWo);

fs.writeFileSync(`${D}/hff-final-review-queue-v2.jsonl`, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
fs.writeFileSync(`${D}/hff-en-pairless-ko-population-v1.jsonl`, pairless.map((r) => JSON.stringify({ canonicalId: r.canonical_id, productMasterId: r.master_id, language: 'ko', status: 'POLICY_DECISION_REQUIRED', note: 'EN canonical 미존재 — 이번 WO 에서 자동 생성하지 않음' })).join('\n') + (pairless.length ? '\n' : ''));

const out = { builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  wo: 'WO-O4O-HFF-MULTILINGUAL-AUTHORING-CONTRACT-PARITY-AND-RESIDUAL-CLEANUP-V1',
  phase: '3 — 최종 큐 재구성 / 5 — EN 짝 없는 KO 모집단 확정',
  inputs: { originalQueue: original.length, deltaRows: deltas.length, agent9Hold: agent9.length, thisWoKoHold: thisWoKo.length, thisWoEnHold: thisWoEn.length },
  deltaResolvedUnique: resolvedIds.size, deltaStillPendingUnique: stillPendingIds.size,
  excluded: { alreadyResolvedInOriginalQueue: excludedResolved, permanentlyExcluded: true },
  v2: { rows: rows.length, uniqueCanonicalIds: new Set(rows.map((r) => r.canonicalId)).size, trackTally, langTally },
  scheduledOnce: rows.length === new Set(rows.map((r) => r.canonicalId)).size,
  alsoModifiedInThisWo: { count: alsoModified.length, editScope: 'AUDIENCE_REMOVAL/EXPERT_CLAUSE (기능성 문구 미변경)', samples: alsoModified.slice(0, 3).map((x) => x.canonicalId) },
  step5: { koWithoutEnPair: pairless.length, action: 'POLICY_DECISION_ONLY — 자동 생성하지 않음' },
  liveCounts };
fs.writeFileSync(`${D}/hff-final-review-queue-v2-summary.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
