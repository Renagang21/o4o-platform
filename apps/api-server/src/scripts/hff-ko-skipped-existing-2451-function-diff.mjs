/**
 * WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1  §12·§13·§16·§17
 *
 * SKIPPED_EXISTING 2,451 대상의 현재 기능성 구조를 family 별로 추출하고
 * 공식 MAIN_FNCTN 과 대조해 분류한다. 이어서 family 보존 patch dry-run 을 수행한다.
 * read-only (SET default_transaction_read_only = on) · DB write 0.
 *
 * 산출물
 *   - data/hff-ko-skipped-existing-2451-function-diff-v1.json
 *   - data/hff-ko-skipped-existing-2451-safe-targets-v1.json
 *   - data/hff-ko-skipped-existing-2451-review-targets-v1.json
 */
import pg from 'pg';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { analyzeTarget, applyPatch, verifyPatch, cmpText, htmlText } from './hff-ko-function-family-preserving-patch.mjs';

const DATA = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1';
const sha = (s) => crypto.createHash('sha256').update(String(s ?? ''), 'utf8').digest('hex');
const J = (f) => JSON.parse(fs.readFileSync(`${DATA}/${f}`, 'utf8'));

const targets = J('hff-ko-function-backfill-skipped-existing-safe-targets-v2.json').items;
const famAudit = J('hff-ko-skipped-existing-2451-renderer-family-audit-v1.json');
const famOf = new Map(famAudit.items.map((x) => [x.candidateId, x.family]));
const preapply = J('hff-ko-skipped-existing-2451-preapply-verification-v1.json');
if (preapply.verdict !== 'PASS') { console.error('STOP: preapply verdict != PASS'); process.exit(2); }
const baseline = preapply.dbBaselineContentHash;

const client = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false, statement_timeout: 600000 });
await client.connect();
await client.query('SET default_transaction_read_only = on');
if ((await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') throw new Error('NOT_READ_ONLY');

const cand = new Map();
const ids = targets.map((t) => t.candidateId);
for (let i = 0; i < ids.length; i += 1000) {
  const r = await client.query(`
    SELECT id, raw_payload::jsonb->'source'->>'MAIN_FNCTN' mainfnctn
    FROM product_candidates WHERE id = ANY($1) AND deleted_at IS NULL`, [ids.slice(i, i + 1000)]);
  for (const x of r.rows) cand.set(x.id, x.mainfnctn);
}
const canon = new Map();
const cids = targets.map((t) => t.canonicalId);
for (let i = 0; i < cids.length; i += 1000) {
  const r = await client.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)`, [cids.slice(i, i + 1000)]);
  for (const x of r.rows) canon.set(x.id, x.content);
}
await client.end();

/* ── §12·§13 분류 + §16·§17 dry-run ────────────────────────────────────── */
const rows = [];
const classCount = {};
const reasonCount = {};
const applyStatusCount = {};
const drift = [];
let renderFailure = 0;

for (const t of targets) {
  const family = famOf.get(t.candidateId);
  const content = canon.get(t.canonicalId);
  const mainFnctn = cand.get(t.candidateId);
  const curHash = sha(content);
  if (baseline[t.candidateId] !== curHash) drift.push(t.candidateId);

  let a; let err = null;
  try {
    a = analyzeTarget({ content, mainFnctn, family });
  } catch (e) { err = String(e?.message ?? e); }
  if (err) {
    renderFailure++;
    rows.push({ ...pick(t), family, classification: 'RENDER_FAILURE', reason: err, applyStatus: 'RENDER_FAILURE' });
    continue;
  }

  const row = {
    ...pick(t), family,
    currentContentHash: curHash, currentContentLength: content.length,
    classification: a.classification, reason: a.reason,
    officialClauseCount: a.detail.officialClauseCount,
    officialLabeledBlockCount: a.detail.officialLabeledBlockCount,
    segmenterAutoEligible: a.detail.segmenterAutoEligible,
    englishOnlyClauseCount: a.detail.englishOnlyClauseCount,
    coverageHistogram: a.detail.coverage.reduce((m, c) => ({ ...m, [c.how]: (m[c.how] ?? 0) + 1 }), {}),
    missingClauses: a.detail.coverage.filter((c) => c.how === 'MISSING').map((c) => ({ header: c.header, clause: c.clause })),
    sections: a.detail.sections,
    applyStatus: 'NO_CHANGE',
  };

  if (a.classification === 'SAFE_MISSING_CLAUSE') {
    // dry-run patch + §14 계약 검증
    let after; let fails;
    try {
      after = applyPatch({ content, plan: a.plan });
      fails = verifyPatch({ before: content, after, plan: a.plan });
    } catch (e) { fails = [`PATCH_EXCEPTION:${String(e?.message ?? e)}`]; }
    // 삽입 문구가 공식 원문(MAIN_FNCTN) 안에 있는지 (원문 밖 문구 금지)
    const srcKey = cmpText(mainFnctn);
    const outsideSource = a.plan.inserts.filter((x) => !srcKey.includes(cmpText(x.text)));
    // 영문 단독 절 삽입 금지
    const englishInsert = a.plan.inserts.filter((x) => !/[가-힣]/.test(x.text));
    row.plan = { sectionH2: a.plan.sectionH2, mode: a.plan.mode, inserts: a.plan.inserts.map((x) => ({ atIndex: x.atIndex, text: x.text, ingredient: x.ingredient, html: x.html })) };
    row.patchFails = fails;
    row.outsideSourceInsertCount = outsideSource.length;
    row.englishInsertCount = englishInsert.length;
    row.proposedContentHash = after ? sha(after) : null;
    row.proposedContentLength = after ? after.length : null;
    row.lengthDelta = after ? after.length - content.length : null;
    row.insertCount = a.plan.inserts.length;
    if (fails.length || outsideSource.length || englishInsert.length) {
      row.classification = 'HUMAN_REVIEW_REQUIRED';
      row.reason = fails.length ? `PATCH_VERIFY_FAIL:${fails.join(',')}` : outsideSource.length ? 'INSERT_TEXT_OUTSIDE_OFFICIAL_SOURCE' : 'ENGLISH_ONLY_INSERT_BLOCKED';
      row.applyStatus = 'HUMAN_REVIEW';
    } else {
      row.applyStatus = 'SAFE_APPLY';
    }
  } else if (a.classification === 'FUNCTION_COMPLETE') {
    row.applyStatus = 'NO_CHANGE';
  } else if (a.classification === 'STRUCTURE_ADAPTER_REQUIRED') {
    row.applyStatus = 'UNSUPPORTED_STRUCTURE';
  } else {
    row.applyStatus = 'HUMAN_REVIEW';
  }

  classCount[row.classification] = (classCount[row.classification] ?? 0) + 1;
  reasonCount[row.reason] = (reasonCount[row.reason] ?? 0) + 1;
  applyStatusCount[row.applyStatus] = (applyStatusCount[row.applyStatus] ?? 0) + 1;
  rows.push(row);
}

function pick(t) {
  return {
    targetIndex: t.targetIndex, candidateId: t.candidateId, statementNo: t.statementNo,
    productName: t.productName, productMasterId: t.productMasterId, canonicalId: t.canonicalId,
    productionBucket: t.productionBucket, v2ChangeReason: t.changeReason,
  };
}

const safe = rows.filter((r) => r.applyStatus === 'SAFE_APPLY');
const review = rows.filter((r) => r.applyStatus === 'HUMAN_REVIEW' || r.applyStatus === 'UNSUPPORTED_STRUCTURE' || r.applyStatus === 'RENDER_FAILURE');
const noChange = rows.filter((r) => r.applyStatus === 'NO_CHANGE');
const sumOk = safe.length + review.length + noChange.length === targets.length;
const verdict = drift.length === 0 && renderFailure === 0 && sumOk ? 'PASS' : 'STOP';
const stamp = new Date().toISOString();

fs.writeFileSync(`${DATA}/hff-ko-skipped-existing-2451-function-diff-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§12·§13 — family 별 현재 기능성 추출 후 공식 MAIN_FNCTN 대조 분류. COMPOSITE 에 DRIVER 기준을 강제하지 않는다. read-only.',
  generatedAt: stamp, total: rows.length,
  classificationCount: classCount, reasonCount, applyStatusCount,
  dryRun: {
    SAFE_APPLY: safe.length, NO_CHANGE: noChange.length,
    HUMAN_REVIEW: rows.filter((r) => r.applyStatus === 'HUMAN_REVIEW').length,
    UNSUPPORTED_STRUCTURE: rows.filter((r) => r.applyStatus === 'UNSUPPORTED_STRUCTURE').length,
    RENDER_FAILURE: renderFailure,
    sumEqualsTotal: sumOk,
  },
  baselineDriftCount: drift.length, baselineDriftSamples: drift.slice(0, 5),
  insertStats: {
    totalInserts: safe.reduce((n, r) => n + r.insertCount, 0),
    maxInsertsPerTarget: safe.reduce((n, r) => Math.max(n, r.insertCount), 0),
    intoIngredientCard: safe.filter((r) => r.plan.mode !== 'FLAT').length,
    appendToFlatList: safe.filter((r) => r.plan.mode === 'FLAT').length,
    familyBreakdown: safe.reduce((m, r) => ({ ...m, [r.family]: (m[r.family] ?? 0) + 1 }), {}),
  },
  verdict,
  items: rows,
}, null, 1));

fs.writeFileSync(`${DATA}/hff-ko-skipped-existing-2451-safe-targets-v1.json`, JSON.stringify({
  workOrder: WO, contract: '§16 — family 보존 삽입만으로 안전 적용 가능한 최종 대상. baselineContentHash 는 apply WHERE 조건의 기준.',
  generatedAt: stamp, count: safe.length,
  items: safe.map((r) => ({
    candidateId: r.candidateId, canonicalId: r.canonicalId, productMasterId: r.productMasterId,
    statementNo: r.statementNo, productName: r.productName, family: r.family,
    baselineContentHash: r.currentContentHash, proposedContentHash: r.proposedContentHash,
    insertCount: r.insertCount, lengthDelta: r.lengthDelta,
    sectionH2: r.plan.sectionH2, mode: r.plan.mode,
    inserts: r.plan.inserts, changeReason: 'SAFE_MISSING_CLAUSE',
  })),
}, null, 1));

fs.writeFileSync(`${DATA}/hff-ko-skipped-existing-2451-review-targets-v1.json`, JSON.stringify({
  workOrder: WO, contract: '§16 — 기존 구조를 보존한 자동 삽입이 불가하여 DB write 없이 사람 검토로 분리한 대상.',
  generatedAt: stamp, count: review.length,
  reasonCount: review.reduce((m, r) => ({ ...m, [r.reason]: (m[r.reason] ?? 0) + 1 }), {}),
  items: review.map((r) => ({
    candidateId: r.candidateId, canonicalId: r.canonicalId, statementNo: r.statementNo,
    productName: r.productName, family: r.family, classification: r.classification, reason: r.reason,
    applyStatus: r.applyStatus, missingClauses: r.missingClauses, sections: r.sections,
  })),
}, null, 1));

console.log(JSON.stringify({
  total: rows.length, classCount, applyStatusCount, verdict,
  baselineDrift: drift.length, renderFailure, sumEqualsTotal: sumOk,
  reviewReasons: review.reduce((m, r) => ({ ...m, [r.reason]: (m[r.reason] ?? 0) + 1 }), {}),
  insertTotal: safe.reduce((n, r) => n + r.insertCount, 0),
}, null, 1));
if (verdict !== 'PASS') process.exit(2);
