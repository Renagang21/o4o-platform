/**
 * WO-O4O-HFF-KO-FINAL-MANUAL-80-RESOLUTION-V1 / 독립검증 (별도 read-only 세션) + 최종 수동 미결 큐.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const SAFE = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-manual-80-safe-targets-v1.json`, 'utf8')).targets;
const RB = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-manual-80-rollback-v1.json`, 'utf8')).rollback;
const DEC = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-manual-80-decisions-v1.json`, 'utf8')).decisions;
const POP = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-manual-80-population-v1.json`, 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const dense = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/[･·∙‧・]/g, '·').replace(/[\s　 ]/g, '').trim();
const leafLis = (h) => [...(h ?? '').matchAll(/<li>((?:(?!<li>|<\/li>)[\s\S])*?)<\/li>/g)].map((x) => x[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
const fnOf = (c) => (c.match(/(<h2>[^<]*기능성[^<]*<\/h2>)([\s\S]*?)(?=<h2>|<div class="sd-foot")/) ?? [])[0] ?? '';

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5501', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const now = new Map();
for (const r of (await c.query('SELECT id, content, status, language, description_type, source_type, master_id FROM shared_product_descriptions WHERE id = ANY($1)', [POP.rows.map((x) => x.canonicalId)])).rows) now.set(r.id, r);

const g = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff,
    (SELECT count(*)::int FROM (SELECT master_id FROM shared_product_descriptions
       WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko'
       GROUP BY master_id HAVING count(*) > 1) x) canon_dup`)).rows[0];

const raws = new Map();
for (const r of (await c.query(`SELECT id, raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn FROM product_candidates WHERE id = ANY($1)`, [POP.rows.map((x) => x.candidateId)])).rows) raws.set(r.id, r.fn ?? '');
await c.end();

const fail = [];
let newHashMatch = 0, oldHashRemains = 0, rollbackOk = 0, clauseMissing = 0, fieldDrift = 0;

for (const t of SAFE) {
  const row = now.get(t.canonicalId);
  if (!row) { fail.push(`ROW_MISSING:${t.canonicalId}`); continue; }
  if (sha(row.content) === t.newContentHash) newHashMatch++; else fail.push(`NEW_HASH:${t.canonicalId}`);
  if (sha(row.content) === t.oldContentHash) oldHashRemains++;
  if (row.status !== 'canonical' || (row.language ?? 'ko') !== 'ko' || row.description_type !== 'STORE'
      || row.source_type !== 'o4o_hff_generated' || row.master_id !== t.productMasterId) fieldDrift++;

  const rb = RB.find((x) => x.canonicalId === t.canonicalId);
  if (rb) {
    const reverted = rb.sectionCreated
      ? row.content.replace(rb.newBlock, '')
      : row.content.replace(rb.newBlock, rb.oldBlock);
    if (sha(reverted) === rb.oldContentHash) rollbackOk++; else fail.push(`ROLLBACK:${t.canonicalId}`);
  }

  const rawDense = dense(raws.get(t.candidateId) ?? '');
  for (const v of leafLis(fnOf(row.content))) {
    if (!rawDense.includes(dense(v)) && !/^<b>/.test(v)) { clauseMissing++; fail.push(`NOT_VERBATIM:${t.canonicalId}`); break; }
  }
}

// 대상 밖 30건은 한 글자도 변하지 않아야 한다
const safeIds = new Set(SAFE.map((t) => t.canonicalId));
let outsideDrift = 0;
for (const p of POP.rows) {
  if (safeIds.has(p.canonicalId)) continue;
  const row = now.get(p.canonicalId);
  if (!row || sha(row.content) !== p.canonicalHash) { outsideDrift++; fail.push(`OUTSIDE_DRIFT:${p.canonicalId}`); }
}

// 최종 수동 미결 큐
const REASON = {
  FINAL_HOLD_INGREDIENT_OWNERSHIP_UNRESOLVED: {
    reason: 'INGREDIENT_OWNERSHIP_UNRESOLVED',
    authority: '식약처 공식 원문 정본 확정 권한 또는 제조사 표시사항 원본 확인',
    next: '공식 MAIN_FNCTN 에 원료 라벨이 없어 절-원료 귀속을 확정할 수 없다. 제조사 표시사항 원본으로 라벨을 확인한 뒤 그룹을 확정한다.',
    retry: '공식 원천에 원료 라벨이 포함되도록 갱신되거나, 제조사 표시사항 원본이 확보될 때',
  },
  FINAL_HOLD_CANONICAL_REDESIGN_REQUIRED: {
    reason: 'CANONICAL_REDESIGN_REQUIRED',
    authority: 'renderer family 변경 승인 (Store Description 디자인 표준)',
    next: 'sd-fn 은 평면 목록 전용이라 원료별 라벨 구조를 표현할 수 없다. 라벨 구조를 지원하는 family 로의 전환은 별도 WO 가 필요하다.',
    retry: 'renderer family 전환 WO 승인 시',
  },
};
const queue = DEC.filter((d) => d.status.startsWith('FINAL_HOLD')).map((d) => {
  const meta = REASON[d.status] ?? { reason: d.status, authority: '', next: '', retry: '' };
  const pop = POP.rows.find((p) => p.candidateId === d.candidateId);
  return {
    candidateId: d.candidateId, statementNo: d.statementNo, productMasterId: d.productMasterId,
    canonicalId: d.canonicalId, productName: d.productName,
    finalHoldReason: meta.reason,
    officialEvidenceChecked: ['product_candidates.raw_payload.source.MAIN_FNCTN', 'shared_product_descriptions.content (기능성 섹션)', '동일 statementNo 원천 행'],
    confirmedFacts: [
      `공식 원문 기능성 그룹 ${d.officialGroups}개 · 절 ${d.officialClauses}개`,
      `공식 원문 라벨 ${d.officialLabels}개`,
      `현재 canonical 그룹 ${d.currentGroups}개 · 라벨 ${d.currentLabels}개 · 절 ${d.currentClauses}개`,
      `renderer family: ${d.rendererFamily ?? pop?.usesSdFunc ? 'why' : 'unknown'}`,
    ],
    conflictingFacts: [d.why],
    requiredHumanAuthority: meta.authority,
    requiredNextAction: meta.next,
    retryCondition: meta.retry,
  };
});
fs.writeFileSync(`${D}/hff-ko-final-manual-unresolved-v1.jsonl`, queue.map((r) => JSON.stringify(r)).join('\n') + '\n');
fs.writeFileSync(`${D}/hff-ko-final-manual-unresolved-summary-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(), total: queue.length,
  byReason: queue.reduce((a, r) => { a[r.finalHoldReason] = (a[r.finalHoldReason] ?? 0) + 1; return a; }, {}),
  dup: queue.length - new Set(queue.map((r) => r.candidateId)).size,
  note: '공식 원천 부재 343건은 이 큐에 포함되지 않는다 (FINAL_HOLD_OFFICIAL_SOURCE_MISSING 동결 유지).',
}, null, 1));

const statusSum = DEC.length;
const out = {
  verifiedAt: new Date().toISOString(), readOnly: true, separateSession: true,
  targets: SAFE.length, newHashMatch, oldHashRemains, rollbackReversalOk: rollbackOk,
  clauseNotVerbatim: clauseMissing, targetFieldDrift: fieldDrift, outsideTargetDrift: outsideDrift,
  globals: g,
  globalsExpected: { spd_all: 120123, ko_canon: 40918, en_canon: 15498, pm_hff: 40948, canon_dup: 0 },
  statusSum, statusSumMatches80: statusSum === 80,
  byStatus: DEC.reduce((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {}),
  finalUnresolved: queue.length,
  unresolvedByReason: queue.reduce((a, r) => { a[r.finalHoldReason] = (a[r.finalHoldReason] ?? 0) + 1; return a; }, {}),
  failedChecks: fail.slice(0, 20),
};
out.globalsUnchanged = JSON.stringify(out.globals) === JSON.stringify(out.globalsExpected);
out.verdict = (fail.length === 0 && newHashMatch === SAFE.length && oldHashRemains === 0
  && rollbackOk === SAFE.length && outsideDrift === 0 && fieldDrift === 0
  && out.globalsUnchanged && statusSum === 80) ? 'PASS' : 'FAIL';
fs.writeFileSync(`${D}/hff-ko-final-manual-80-independent-verification-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
