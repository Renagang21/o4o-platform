/**
 * Phase A-2 — 파일럿 47건 현재 DB 상태 감사 (read-only).
 * candidate / ProductMaster / canonical 존재·일치·hash drift 를 확인하고 상태를 분류한다.
 */
import fs from 'node:fs';
import { connectReadOnly, MANIFEST, D, sha } from './hff-ko-function-review-pilot-47-lib.mjs';

const OUT = `${D}/hff-ko-function-review-pilot-47-current-db-audit-v1.json`;
const { manifest } = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const c = await connectReadOnly();

const candIds = manifest.map((m) => m.candidateId);
const canonIds = manifest.map((m) => m.canonicalId);
const permits = [...new Set(manifest.map((m) => m.statementNo).filter(Boolean))];

const cand = new Map((await c.query(`
  SELECT id, deleted_at, candidate_status, matched_product_master_id,
    raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
    raw_payload::jsonb->'source'->>'PRDUCT' name,
    raw_payload::jsonb->'source'->>'MAIN_FNCTN' mainFnctn,
    raw_payload::jsonb->'source'->>'SRV_USE' srvUse,
    raw_payload::jsonb->'source'->>'INTAKE_HINT1' intakeHint1,
    raw_payload::jsonb->'source'->>'BASE_STANDARD' baseStandard
  FROM product_candidates WHERE id = ANY($1)`, [candIds])).rows.map((r) => [r.id, r]));

const canon = new Map((await c.query(`
  SELECT id, master_id, content, source_type, source_ref_id, status, language, description_type, updated_at, deleted_at
  FROM shared_product_descriptions WHERE id = ANY($1)`, [canonIds])).rows.map((r) => [r.id, r]));

// permit -> master (= ANY 1회 스캔 + Map)
const pm = new Map((await c.query(
  `SELECT id, mfds_permit_number, regulatory_type FROM product_masters WHERE mfds_permit_number = ANY($1)`, [permits]
)).rows.map((r) => [r.mfds_permit_number, r]));

const rows = [];
const tally = { CURRENT_UNCHANGED: 0, CURRENT_CHANGED_REVIEW_STILL_REQUIRED: 0, ALREADY_RESOLVED: 0, CANDIDATE_OR_LINK_DRIFT: 0 };
let hashMismatch = 0, canonMissing = 0, candMissing = 0, linkDrift = 0, permitMismatch = 0;

for (const m of manifest) {
  const cd = cand.get(m.candidateId);
  const cn = canon.get(m.canonicalId);
  const master = pm.get(m.statementNo);

  const candPresent = !!cd && !cd.deleted_at;
  const canonPresent = !!cn && !cn.deleted_at;
  const curHash = canonPresent ? sha(cn.content) : null;
  const hashSame = canonPresent && curHash === m.canonicalContentHash;
  const linkOk = candPresent && cd.matched_product_master_id === m.productMasterId;
  const permitOk = !!master && master.id === m.productMasterId;
  const attrsOk = canonPresent && cn.description_type === 'STORE' && cn.status === 'canonical' && (cn.language ?? 'ko') === 'ko' && cn.master_id === m.productMasterId;

  if (!candPresent) candMissing++;
  if (!canonPresent) canonMissing++;
  if (!linkOk) linkDrift++;
  if (!permitOk) permitMismatch++;
  if (canonPresent && !hashSame) hashMismatch++;

  let state;
  if (!candPresent || !linkOk || !permitOk || !attrsOk) state = 'CANDIDATE_OR_LINK_DRIFT';
  else if (!canonPresent) state = 'CANDIDATE_OR_LINK_DRIFT';
  else if (hashSame) state = 'CURRENT_UNCHANGED';
  else state = 'CURRENT_CHANGED_REVIEW_STILL_REQUIRED';
  tally[state]++;

  rows.push({
    pilotIndex: m.pilotIndex, queueIndex: m.queueIndex, candidateId: m.candidateId, statementNo: m.statementNo,
    productName: m.productName, productMasterId: m.productMasterId, canonicalId: m.canonicalId,
    pilotReasons: m.pilotReasons, productionBucket: m.productionBucket, rendererFamily: m.rendererFamily,
    candidatePresent: candPresent, candidateStatus: cd?.candidate_status ?? null,
    canonicalPresent: canonPresent, canonicalAttrsOk: attrsOk,
    sourceType: cn?.source_type ?? null, sourceRefId: cn?.source_ref_id ?? null,
    manifestHash: m.canonicalContentHash, currentHash: curHash, hashSame,
    manifestUpdatedAt: m.canonicalUpdatedAt, currentUpdatedAt: cn?.updated_at?.toISOString?.() ?? null,
    contentLength: cn ? (cn.content ?? '').length : null,
    productMasterLinkStatus: !candPresent ? 'CANDIDATE_MISSING' : (linkOk && permitOk ? 'LINK_OK' : (!linkOk ? 'LINK_MISMATCH' : 'PERMIT_MISMATCH')),
    hasMainFnctn: !!(cd?.mainfnctn ?? '').trim(),
    hasSrvUse: !!(cd?.srvuse ?? '').trim(),
    hasIntakeHint1: !!(cd?.intakehint1 ?? '').trim(),
    currentState: state,
  });
}

const result = {
  auditedAt: new Date().toISOString(),
  total: rows.length,
  tally,
  aggregates: { candMissing, canonMissing, linkDrift, permitMismatch, hashMismatch },
  alreadyResolvedExcluded: tally.ALREADY_RESOLVED,
  readOnly: true,
  rows,
};
fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
console.log(JSON.stringify({ out: OUT, total: rows.length, tally, aggregates: result.aggregates }, null, 2));
await c.end();
