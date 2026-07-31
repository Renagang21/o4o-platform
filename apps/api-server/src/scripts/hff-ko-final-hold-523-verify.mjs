/** 독립검증(별도 read-only) + 최종 HOLD 큐 생성. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const dense = (s) => (s ?? '').replace(/[\s 　]/g, '');
const KO = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`;
const dec = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-hold-523-decisions-v1.json`, 'utf8'));
const safe = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-hold-523-safe-targets-v1.json`, 'utf8'));
const rb = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-hold-523-rollback-v1.json`, 'utf8'));
const ap = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-hold-523-apply-results-v1.json`, 'utf8'));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5497', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

/* Track A */
const aIds = safe.trackATargets.map((t) => t.canonicalId);
const aNow = new Map((await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)`, [aIds])).rows.map((r) => [r.id, r.content]));
let aHashOk = 0, aOldRemains = 0, aClauseMissing = 0;
for (const t of safe.trackATargets) {
  const cur = aNow.get(t.canonicalId) ?? '';
  if (sha(cur) === t.newContentHash) aHashOk++;
  if (sha(cur) === t.oldContentHash) aOldRemains++;
  const inner = []; const re = /<li[^>]*>([\s\S]*?)(?=<li[^>]*>|<\/li>)/g; let m;
  while ((m = re.exec(t.newBlock)) !== null) { const x = m[1].replace(/<[^>]+>/g, '').trim(); if (x) inner.push(x); }
  if (!inner.every((x) => dense(cur).includes(dense(x)))) aClauseMissing++;
}

/* Track B */
const bCands = safe.trackBTargets.map((t) => t.candidateId);
const bRows = (await c.query(`
  SELECT pc.id cid, pc.matched_product_master_id mid, pm.mfds_permit_number permit, pm.regulatory_type,
         s.id sid, s.status, s.language, s.description_type, s.content
  FROM product_candidates pc
  LEFT JOIN product_masters pm ON pm.id = pc.matched_product_master_id
  LEFT JOIN shared_product_descriptions s ON s.master_id = pc.matched_product_master_id
    AND s.description_type='STORE' AND s.status='canonical' AND coalesce(s.language,'ko')='ko' AND s.deleted_at IS NULL
  WHERE pc.id = ANY($1)`, [bCands])).rows;
let bLinked = 0, bCanon = 0, bPermitOk = 0;
for (const r of bRows) { if (r.mid) bLinked++; if (r.sid) bCanon++; if (r.permit) bPermitOk++; }
const permitDup = (await c.query(`
  SELECT count(*)::int c FROM (
    SELECT mfds_permit_number FROM product_masters WHERE mfds_permit_number = ANY($1) GROUP BY 1 HAVING count(*) > 1) x`,
  [safe.trackBTargets.map((t) => t.statementNo)])).rows[0].c;

/* 전역 */
const g = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) AS spd_all,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO}) AS ko_canon,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')<>'ko' AND deleted_at IS NULL AND updated_at >= $1) AS en_touched,
         (SELECT count(DISTINCT pc.id)::int FROM product_candidates pc JOIN shared_product_descriptions s ON s.master_id = pc.matched_product_master_id
           WHERE pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
             AND s.description_type='STORE' AND s.status='canonical' AND coalesce(s.language,'ko')='ko' AND s.deleted_at IS NULL) AS hff_canonical`,
  [rb.builtAt])).rows[0];
const canonDup = (await c.query(`
  SELECT count(*)::int c FROM (SELECT master_id FROM shared_product_descriptions WHERE ${KO} GROUP BY master_id HAVING count(*) > 1) x`)).rows[0].c;
const outsideTouched = (await c.query(`
  SELECT count(*)::int c FROM shared_product_descriptions
  WHERE ${KO} AND updated_at >= $1 AND NOT (id = ANY($2))`,
  [rb.builtAt, [...aIds, ...(rb.createdIds?.spds ?? [])]])).rows[0].c;
await c.end();

/* 최종 HOLD 큐 */
const NEXT = {
  FINAL_HOLD_OFFICIAL_SOURCE_MISSING: { action: '공식 원천에 해당 필드가 추가 공개되면 재수집 후 재처리', retry: 'MFDS 원천에 SRV_USE/MAIN_FNCTN 신규 공개 시' },
  FINAL_HOLD_BOUNDARY_AMBIGUOUS: { action: '사람이 원료 귀속·기능성 절 경계를 확정', retry: '경계 확정 승인 시' },
  FINAL_HOLD_SOURCE_CONFLICT: { action: '공식 원천 문자 손상(중복 이어붙임) 정정', retry: '원천 정정 반영 시' },
  FINAL_HOLD_PRODUCT_IDENTITY_UNCLEAR: { action: 'ProductMaster 식별 확정', retry: '제품 정체성 단일 확정 시' },
};
const holds = dec.decisions.filter((d) => String(d.status).startsWith('FINAL_HOLD'));
const lines = holds.map((d) => JSON.stringify({
  candidateId: d.candidateId, statementNo: d.statementNo, productMasterId: d.productMasterId ?? null,
  canonicalId: d.canonicalId ?? null, productName: d.productName,
  finalHoldReason: d.status, detail: d.reason ?? d.missing ?? null,
  officialEvidenceChecked: d.status === 'FINAL_HOLD_OFFICIAL_SOURCE_MISSING'
    ? ['product_candidates.raw_payload', 'MFDS raw JSONL 44,885행 전량 대조']
    : ['product_candidates.raw_payload.MAIN_FNCTN', '현재 STORE/ko canonical'],
  missingRequirement: d.missing ?? d.reason ?? null,
  requiredNextAction: (NEXT[d.status] ?? {}).action ?? 'HUMAN_REVIEW',
  retryCondition: (NEXT[d.status] ?? {}).retry ?? 'TBD',
}));
fs.writeFileSync(`${D}/hff-ko-final-unresolved-v1.jsonl`, lines.join('\n') + (lines.length ? '\n' : ''));
const hTally = {};
for (const h of holds) hTally[h.status] = (hTally[h.status] ?? 0) + 1;
fs.writeFileSync(`${D}/hff-ko-final-unresolved-summary-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(), total: holds.length, byReason: hTally,
  sourceMissingBreakdown: { SRV_USE: holds.filter((h) => h.missing === 'SRV_USE').length, MAIN_FNCTN: holds.filter((h) => h.missing === 'MAIN_FNCTN').length },
  evidence: 'MFDS raw JSONL(44,885행) 전량 대조 결과 343건 모두 원천 자체에 결측 — 데이터 복구 불가',
}, null, 1));

const fail = [];
if (aHashOk !== safe.trackATargets.length) fail.push('trackAHashMismatch');
if (aOldRemains) fail.push('trackAOldRemains');
if (aClauseMissing) fail.push('trackAClauseMissing');
if (bLinked !== safe.trackBTargets.length) fail.push('trackBLinkMissing');
if (bCanon !== safe.trackBTargets.length) fail.push('trackBCanonicalMissing');
if (permitDup) fail.push('productMasterPermitDup');
if (canonDup) fail.push('canonicalDup');
if (g.en_touched) fail.push(`enTouched=${g.en_touched}`);
if (outsideTouched) fail.push(`outsideTouched=${outsideTouched}`);
if (g.hff_canonical !== 40918) fail.push(`hffCanonical=${g.hff_canonical}`);

const v = { verifiedAt: new Date().toISOString(), readOnlySession: true,
  trackA: { targets: safe.trackATargets.length, newHashMatch: aHashOk, oldHashRemains: aOldRemains, clauseMissing: aClauseMissing },
  trackB: { targets: safe.trackBTargets.length, linked: bLinked, canonicalCreated: bCanon, permitPresent: bPermitOk, permitDup },
  globals: g, canonicalDup: canonDup, outsideTouched,
  expectedVsActual: { expected: ap.expected, actual: ap.actual },
  finalHold: { total: holds.length, byReason: hTally },
  statusSum: dec.total, statusSumMatches523: dec.total === 523,
  verdict: fail.length ? 'FAIL' : 'PASS', failedChecks: fail };
fs.writeFileSync(`${D}/hff-ko-final-hold-523-independent-verification-v1.json`, JSON.stringify(v, null, 1));
console.log(JSON.stringify(v, null, 2));
