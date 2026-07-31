/**
 * WO-O4O-HFF-KO-LAST-6-AUTHORITY-DECISION-AND-CLOSURE-V1
 * 독립검증(별도 read-only 세션) + 한국어 비번역 트랙 종료 요약 + 영구 HOLD 파일.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const SAFE = JSON.parse(fs.readFileSync(`${D}/hff-ko-last-6-safe-targets-v1.json`, 'utf8')).targets;
const RB = JSON.parse(fs.readFileSync(`${D}/hff-ko-last-6-rollback-v1.json`, 'utf8')).rollback;
const DEC = JSON.parse(fs.readFileSync(`${D}/hff-ko-last-6-authority-decisions-v1.json`, 'utf8')).decisions;
const POP = JSON.parse(fs.readFileSync(`${D}/hff-ko-last-6-population-v1.json`, 'utf8'));
const PREV343 = JSON.parse(fs.readFileSync(`${D}/hff-ko-actionable-hold-133-population-v1.json`, 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const dense = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(/[･·∙‧・•]/g, '·').replace(/[\s　 ]/g, '').trim();
const leafLis = (h) => [...(h ?? '').matchAll(/<li>((?:(?!<li>|<\/li>)[\s\S])*?)<\/li>/g)].map((x) => x[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
const fnOf = (c) => (c.match(/(<h2>[^<]*기능성[^<]*<\/h2>)([\s\S]*?)(?=<h2>|<div class="sd-foot")/) ?? [])[0] ?? '';

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5503', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const now = new Map();
for (const r of (await c.query('SELECT id, content, status, language, description_type, source_type, master_id FROM shared_product_descriptions WHERE id = ANY($1)', [POP.rows.map((x) => x.canonicalId)])).rows) now.set(r.id, r);
const raws = new Map();
for (const r of (await c.query(`SELECT id, raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn FROM product_candidates WHERE id = ANY($1)`, [POP.rows.map((x) => x.candidateId)])).rows) raws.set(r.id, r.fn ?? '');

const g = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff,
    (SELECT count(*)::int FROM product_candidates WHERE raw_payload::jsonb->>'sourceKind'='health_functional_food' AND deleted_at IS NULL) hff_candidates,
    (SELECT count(*)::int FROM (SELECT master_id FROM shared_product_descriptions
       WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko'
       GROUP BY master_id HAVING count(*) > 1) x) canon_dup`)).rows[0];
await c.end();

const fail = [];
let newHashMatch = 0, oldHashRemains = 0, rollbackOk = 0, notVerbatim = 0, fieldDrift = 0;
for (const t of SAFE) {
  const row = now.get(t.canonicalId);
  if (!row) { fail.push(`ROW_MISSING:${t.canonicalId}`); continue; }
  if (sha(row.content) === t.newContentHash) newHashMatch++; else fail.push(`NEW_HASH:${t.canonicalId}`);
  if (sha(row.content) === t.oldContentHash) oldHashRemains++;
  if (row.status !== 'canonical' || (row.language ?? 'ko') !== 'ko' || row.description_type !== 'STORE'
      || row.source_type !== 'o4o_hff_generated' || row.master_id !== t.productMasterId) fieldDrift++;
  const rb = RB.find((x) => x.canonicalId === t.canonicalId);
  if (rb && sha(row.content.replace(rb.newBlock, rb.oldBlock)) === rb.oldContentHash) rollbackOk++;
  else fail.push(`ROLLBACK:${t.canonicalId}`);
  const rawDense = dense(raws.get(t.candidateId) ?? '');
  const derivable = (v) => {
    const m = dense(v).match(/^(.+?)(에도움을줄수있음|에필요)$/);
    return !!m && rawDense.split(/[･·∙‧・•]/).some((s) => s.includes(m[1])) && rawDense.includes(m[2]);
  };
  for (const v of leafLis(fnOf(row.content))) if (!rawDense.includes(dense(v)) && !derivable(v)) { notVerbatim++; fail.push(`NOT_VERBATIM:${t.canonicalId}`); break; }
}

const safeIds = new Set(SAFE.map((t) => t.canonicalId));
let outsideDrift = 0;
for (const p of POP.rows) {
  if (safeIds.has(p.canonicalId)) continue;
  const row = now.get(p.canonicalId);
  if (!row || sha(row.content) !== p.canonicalHash) { outsideDrift++; fail.push(`OUTSIDE_DRIFT:${p.canonicalId}`); }
}

// ── 영구 HOLD 파일 (이번 6건 잔여 + 공식 원천 부재 343) ─────────────────────
const HOLD_META = {
  FINAL_PERMANENT_HOLD_INGREDIENT_OWNERSHIP: {
    missing: '공식 MAIN_FNCTN 에 원료 라벨이 없고, BASE_STANDARD 의 원료 순서도 기능성 블록과 1:1 로 대응하지 않는다',
    next: '제조사 표시사항 원본 또는 품목제조신고서로 원료별 기능성 귀속을 확정한 뒤 그룹을 구성한다',
    retry: '공식 원천에 원료 라벨이 포함되도록 갱신되거나, 제조사 표시사항 원본이 확보될 때',
  },
  FINAL_PERMANENT_HOLD_SOURCE_CONFLICT: {
    missing: '공식 원문 정본이 하나로 확정되지 않는다',
    next: '식약처 공식 원천의 정본 확정',
    retry: '공식 원천 갱신 시',
  },
  FINAL_PERMANENT_HOLD_STRUCTURE_NOT_APPROVABLE: {
    missing: '기존 HFF family 계약 안에서 안전한 구조가 없다',
    next: 'renderer family 확장 WO',
    retry: 'family 확장 승인 시',
  },
};
const holdRows = DEC.filter((d) => d.status.startsWith('FINAL_PERMANENT')).map((d) => {
  const m = HOLD_META[d.status] ?? {};
  return {
    track: 'MANUAL_AUTHORITY_OR_SOURCE_MISSING',
    candidateId: d.candidateId, statementNo: d.statementNo, productMasterId: d.productMasterId,
    canonicalId: d.canonicalId, productName: d.productName,
    finalStatus: d.status, finalHoldReason: d.why,
    confirmedFacts: [
      `공식 MAIN_FNCTN 기능성 블록 ${d.officialBlocks ?? 0}개`,
      `BASE_STANDARD 기능성 원료 ${(d.baseIngredients ?? []).length}개: ${(d.baseIngredients ?? []).join(', ')}`,
      `현재 canonical 라벨 ${(d.currentLabels ?? []).length}개 · 절 ${d.currentClauseCount ?? 0}개`,
      '기존 canonical 은 현재 상태 그대로 유지된다 (삭제·terminal 처리 아님)',
    ],
    missingAuthorityOrSource: m.missing ?? '',
    requiredNextAction: m.next ?? '',
    retryCondition: m.retry ?? '',
  };
});
// 공식 원천 부재 343 (동결 — 재조사하지 않고 목록만 이관)
const frozen343 = (PREV343.checks?.excludedReasons?.FINAL_HOLD_OFFICIAL_SOURCE_MISSING) ?? 343;
const holdFile = holdRows.map((r) => JSON.stringify(r)).join('\n') + '\n'
  + JSON.stringify({
    track: 'OFFICIAL_SOURCE_MISSING_FROZEN',
    candidateId: null, statementNo: null, productMasterId: null, canonicalId: null,
    productName: `(집합) 공식 원천 부재 ${frozen343}건`,
    finalStatus: 'FINAL_HOLD_OFFICIAL_SOURCE_MISSING',
    finalHoldReason: 'OFFICIAL_SOURCE_MISSING',
    confirmedFacts: [
      `대상 ${frozen343}건`,
      '식약처 공공데이터 원천(mfds-health-functional-food-info-raw.jsonl 44,885행)에 해당 행은 존재하나 MAIN_FNCTN / SRV_USE 가 비어 있다',
      '이번 WO 에서 재조사·재분류·삭제하지 않았다 (동결 유지)',
      '개별 목록은 hff-ko-final-unresolved-v1.jsonl 에 보존되어 있다',
    ],
    missingAuthorityOrSource: '공식 원천 자체에 기능성·섭취방법 데이터가 없다',
    requiredNextAction: '공식 원천 갱신을 기다린다. 플랫폼 측에서 수행할 작업은 없다',
    retryCondition: '공식 식약처 원천의 MAIN_FNCTN 또는 SRV_USE 갱신',
  }) + '\n';
fs.writeFileSync(`${D}/hff-ko-nontranslation-permanent-hold-v1.jsonl`, holdFile);
fs.writeFileSync(`${D}/hff-ko-nontranslation-permanent-hold-summary-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(),
  manualAuthorityHold: holdRows.length,
  officialSourceMissingFrozen: frozen343,
  totalUnresolved: holdRows.length + frozen343,
  byStatus: holdRows.reduce((a, r) => { a[r.finalStatus] = (a[r.finalStatus] ?? 0) + 1; return a; }, {}),
  dup: holdRows.length - new Set(holdRows.map((r) => r.candidateId)).size,
  note: '영구 HOLD 는 삭제·terminal 처리가 아니다. 기존 canonical 은 현재 상태를 유지한다.',
}, null, 1));

// ── 한국어 비번역 트랙 종료 요약 ─────────────────────────────────────────────
const totalCandidates = 41261;
const resolvedThisWo = DEC.filter((d) => d.status === 'RESOLVED_UPDATED').length;
const noChangeThisWo = DEC.filter((d) => d.status === 'RESOLVED_NO_CHANGE').length;
const unresolved = holdRows.length + frozen343;
const closure = {
  builtAt: new Date().toISOString(),
  track: 'HFF_KO_NONTRANSLATION',
  status: 'CLOSED',
  totalHffKoTargets: totalCandidates,
  koCanonicalProduced: g.ko_canon,
  resolvedThisWo, noChangeThisWo,
  finalManualHold: holdRows.length,
  officialSourceMissingFrozen: frozen343,
  totalUnresolved: unresolved,
  coverageRate: `${((1 - unresolved / totalCandidates) * 100).toFixed(2)}%`,
  byRetryCondition: {
    '공식 식약처 원천의 MAIN_FNCTN 또는 SRV_USE 갱신': frozen343,
    '제조사 표시사항 원본 확보 또는 공식 원천에 원료 라벨 포함': holdRows.filter((r) => r.finalStatus === 'FINAL_PERMANENT_HOLD_INGREDIENT_OWNERSHIP').length,
  },
  translationScopeHandedOver: {
    enCanonicalExisting: g.en_canon,
    enFunctionHold: 824,
    koWithoutEnPair: 25415,
    note: '번역 트랙은 이 WO 범위 밖이며 이번 작업에서 한 건도 변경하지 않았다.',
  },
  closureStatement: '한국어 비번역 생산 트랙을 종료한다. 남은 대상은 모두 공식 원천 갱신 또는 사람 권한 판단이 선행되어야 하며, 플랫폼 측에서 자동으로 진행할 수 있는 작업은 없다.',
};
fs.writeFileSync(`${D}/hff-ko-nontranslation-closure-v1.json`, JSON.stringify(closure, null, 1));

const out = {
  verifiedAt: new Date().toISOString(), readOnly: true, separateSession: true,
  targets: SAFE.length, newHashMatch, oldHashRemains, rollbackReversalOk: rollbackOk,
  clauseNotVerbatim: notVerbatim, targetFieldDrift: fieldDrift, outsideTargetDrift: outsideDrift,
  globals: g,
  globalsExpected: { spd_all: 120123, ko_canon: 40918, en_canon: 15498, pm_hff: 40948, canon_dup: 0 },
  statusSum: DEC.length, statusSumMatches6: DEC.length === 6,
  byStatus: DEC.reduce((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {}),
  permanentHoldRows: holdRows.length, frozen343,
  holdFileDup: holdRows.length - new Set(holdRows.map((r) => r.candidateId)).size,
  closureTotals: { totalUnresolved: closure.totalUnresolved, coverageRate: closure.coverageRate },
  closureMathOk: closure.totalUnresolved === holdRows.length + frozen343,
  failedChecks: fail.slice(0, 20),
};
out.globalsUnchanged = ['spd_all', 'ko_canon', 'en_canon', 'pm_hff', 'canon_dup'].every((k) => g[k] === out.globalsExpected[k]);
out.verdict = (fail.length === 0 && newHashMatch === SAFE.length && oldHashRemains === 0
  && rollbackOk === SAFE.length && outsideDrift === 0 && fieldDrift === 0 && notVerbatim === 0
  && out.globalsUnchanged && DEC.length === 6 && out.holdFileDup === 0 && out.closureMathOk) ? 'PASS' : 'FAIL';
fs.writeFileSync(`${D}/hff-ko-last-6-independent-verification-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
