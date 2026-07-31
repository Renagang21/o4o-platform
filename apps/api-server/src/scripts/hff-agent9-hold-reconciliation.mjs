/**
 * WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1  §10·§11·§12
 *
 * Agent 9 HOLD 348 을 **현재 DB·공식 필드**로 재판정한다 (read-only).
 * 과거 HOLD 사유를 그대로 유지하지 않고, 사유가 해소됐는지 매 건 다시 본다.
 *
 * 산출: data/hff-agent9-hold-reconciliation-v1.json
 */
import fs from 'node:fs';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const readJsonl = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const a9 = readJsonl(`${D}/hff-ko-agent-09-hold-queue-v1.jsonl`);
const nz = (v) => (v == null ? '' : String(v).trim());

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const ids = a9.map((r) => r.candidateId);
const live = new Map();
for (let i = 0; i < ids.length; i += 200) {
  for (const r of (await c.query(`
    SELECT pc.id, pc.matched_product_master_id master_id, pc.candidate_status,
           pc.deleted_at IS NOT NULL cand_deleted,
           pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
           pc.raw_payload::jsonb->'source'->>'PRDUCT' prduct,
           pc.raw_payload::jsonb->'source'->>'ENTRPS' entrps,
           pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn,
           pc.raw_payload::jsonb->'source'->>'SRV_USE' srv,
           pc.raw_payload::jsonb->'source'->>'INTAKE_HINT1' hint,
           pc.raw_payload::jsonb->'source'->>'BASE_STANDARD' base,
           (SELECT count(*) FROM shared_product_descriptions s
             WHERE s.master_id = pc.matched_product_master_id AND s.description_type='STORE'
               AND s.status='canonical' AND s.deleted_at IS NULL AND coalesce(s.language,'ko')='ko') ko_canonical_cnt
      FROM product_candidates pc WHERE pc.id = ANY($1)`, [ids.slice(i, i + 200)])).rows) live.set(r.id, r);
}
await c.end();

const rows = a9.map((q) => {
  const l = live.get(q.candidateId);
  const hasFn = !!nz(l?.fn), hasSrv = !!nz(l?.srv), hasHint = !!nz(l?.hint), hasBase = !!nz(l?.base);
  const hasMaster = !!l?.master_id;
  const koCanonical = l ? Number(l.ko_canonical_cnt) : 0;

  /* §11 판정. `INTAKE_HINT1` 이 비어 있다는 이유만으로는 HOLD 하지 않는다. */
  const reasons = [];
  if (!l) reasons.push('SOURCE_CONFLICT');
  else if (l.cand_deleted) reasons.push('SOURCE_CONFLICT');
  if (!hasFn) reasons.push('NO_FUNCTIONAL_DATA');
  if (!hasSrv) reasons.push('NO_INTAKE_DATA');
  if (!hasMaster) reasons.push('PRODUCTMASTER_UNCLEAR');
  if (q.originalHoldReason === 'HINT_UNDER_EXTRACTION' && !hasHint && !hasSrv) reasons.push('HINT_UNDER_EXTRACTION');

  /* §11 CANONICAL_CREATED 전제: ProductMaster 단일 확정 + MAIN_FNCTN + SRV_USE + 기존 canonical 없음 */
  const creatable = hasMaster && hasFn && hasSrv && koCanonical === 0;
  let finalStatus;
  if (koCanonical > 0) finalStatus = 'RESOLVED_EXISTING';
  else if (creatable) finalStatus = 'CANONICAL_CREATED';
  else finalStatus = `HOLD_${reasons[0] ?? 'PRODUCTMASTER_UNCLEAR'}`;

  /* 원래 사유가 현재 데이터로 여전히 성립하는가 (§10) */
  const originalStillHolds = {
    NO_INTAKE_DATA: !hasSrv, NO_FUNCTIONAL_DATA: !hasFn,
    HINT_UNDER_EXTRACTION: !hasHint,
  }[q.originalHoldReason] ?? null;

  return {
    candidateId: q.candidateId, statementNo: l?.stmt ?? q.statementNo,
    productName: l?.prduct ?? q.productName, enterprise: l?.entrps ?? q.enterprise,
    productMasterId: l?.master_id ?? null, candidateStatus: l?.candidate_status ?? null,
    candidateMissing: !l, candidateDeleted: l?.cand_deleted ?? null,
    originalHoldReason: q.originalHoldReason, originalStillHolds,
    officialFields: { hasFn, hasSrv, hasHint, hasBase, fnLen: nz(l?.fn).length, srvLen: nz(l?.srv).length, hintLen: nz(l?.hint).length },
    koCanonicalCnt: koCanonical,
    /* master 만 확보되면 §12 계약을 충족하는가 — 후속 WO 의 실행 가능성 지표 */
    contractReadyIfMasterLinked: hasFn && hasSrv,
    holdReason: reasons[0] ?? null, additionalHoldReasons: reasons.slice(1),
    finalStatus,
  };
});

const tally = (a, f) => a.reduce((m, r) => { const k = f(r); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const out = {
  builtAt: new Date().toISOString(), wo: 'WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1',
  readOnly: true, dbWrites: 0,
  rows: rows.length,
  uniqueCandidateId: new Set(rows.map((r) => r.candidateId)).size,
  uniqueStatementNo: new Set(rows.map((r) => r.statementNo)).size,
  byFinalStatus: tally(rows, (r) => r.finalStatus),
  byOriginalReason: tally(rows, (r) => r.originalHoldReason),
  originalReasonResolvedByNewData: rows.filter((r) => r.originalStillHolds === false).length,
  originalReasonResolvedBreakdown: tally(rows.filter((r) => r.originalStillHolds === false), (r) => r.originalHoldReason),
  officialFieldCoverage: {
    hasFn: rows.filter((r) => r.officialFields.hasFn).length,
    hasSrv: rows.filter((r) => r.officialFields.hasSrv).length,
    hasHint: rows.filter((r) => r.officialFields.hasHint).length,
    hasBase: rows.filter((r) => r.officialFields.hasBase).length,
  },
  productMasterLinked: rows.filter((r) => r.productMasterId).length,
  contractReadyIfMasterLinked: rows.filter((r) => r.contractReadyIfMasterLinked).length,
  canonicalCreated: rows.filter((r) => r.finalStatus === 'CANONICAL_CREATED').length,
  resolvedExisting: rows.filter((r) => r.finalStatus === 'RESOLVED_EXISTING').length,
  byHoldReason: tally(rows.filter((r) => r.finalStatus.startsWith('HOLD')), (r) => r.holdReason),
};
fs.writeFileSync(`${D}/hff-agent9-hold-reconciliation-v1.json`, JSON.stringify({ ...out, rows }, null, 1));
console.log(JSON.stringify(out, null, 2));
