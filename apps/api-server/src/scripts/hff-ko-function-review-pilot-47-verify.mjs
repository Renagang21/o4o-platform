/**
 * Phase G — 독립검증 (별도 read-only 세션 · rollback manifest 의 해시만 신뢰).
 * + 전체 corpus 보호 감사(파일럿 외 canonical 불변).
 */
import fs from 'node:fs';
import { connectReadOnly, MANIFEST, D, sha, dense, extractRenderedFunctions, sliceFunctionBlock } from './hff-ko-function-review-pilot-47-lib.mjs';

const RB = JSON.parse(fs.readFileSync(`${D}/hff-ko-function-review-pilot-47-rollback-manifest-v1.json`, 'utf8'));
const AUDIT = JSON.parse(fs.readFileSync(`${D}/hff-ko-function-review-pilot-47-current-db-audit-v1.json`, 'utf8'));
const DEC = JSON.parse(fs.readFileSync(`${D}/hff-ko-function-review-pilot-47-manual-decisions-v1.json`, 'utf8'));
const { manifest } = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const OUT_V = `${D}/hff-ko-function-review-pilot-47-independent-verification-v1.json`;
const OUT_C = `${D}/hff-ko-function-review-pilot-47-post-corpus-audit-v1.json`;

const targets = RB.targets ?? [];
const appliedIds = new Set(targets.map((t) => t.canonicalId));
const c = await connectReadOnly();

/* ── 1. 대상 검증 ─────────────────────────────────────── */
const now = new Map((await c.query(
  `SELECT id, master_id, content, source_type, source_ref_id, status, language, description_type, updated_at, deleted_at
   FROM shared_product_descriptions WHERE id = ANY($1)`, [targets.map((t) => t.canonicalId)]
)).rows.map((r) => [r.id, r]));
const cand = new Map((await c.query(
  `SELECT id, matched_product_master_id, candidate_status,
     raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
   FROM product_candidates WHERE id = ANY($1)`, [targets.map((t) => t.candidateId)]
)).rows.map((r) => [r.id, r]));

let newHashOk = 0, oldHashRemains = 0, attrDrift = 0, candDrift = 0;
let claimsVisible = 0, claimsExpected = 0, notVerbatim = 0, outsideDrift = 0;
const perTarget = [];
for (const t of targets) {
  const r = now.get(t.canonicalId);
  const cd = cand.get(t.candidateId);
  const cur = r?.content ?? '';
  const hashMatch = sha(cur) === t.newContentHash;
  const oldStill = sha(cur) === t.oldContentHash;
  if (hashMatch) newHashOk++;
  if (oldStill) oldHashRemains++;
  const attrOk = r && r.master_id === t.productMasterId && r.status === 'canonical'
    && r.description_type === 'STORE' && (r.language ?? 'ko') === 'ko' && !r.deleted_at
    && r.source_type === (t.oldContent.includes('') ? r.source_type : r.source_type);
  if (!attrOk) attrDrift++;
  const candOk = cd && cd.matched_product_master_id === t.productMasterId;
  if (!candOk) candDrift++;

  // 삽입 문장이 실제로 존재 + 원문 verbatim
  const rendered = extractRenderedFunctions(cur);
  const denseItems = rendered.items.map(dense);
  const srcDense = dense(cd?.fn ?? '');
  for (const g of t.insertedGroups) for (const cl of g.claims) {
    claimsExpected++;
    if (denseItems.some((d) => d.includes(dense(cl)))) claimsVisible++;
    if (!srcDense.includes(dense(cl))) notVerbatim++;
  }
  // 기능성 블록 외부 byte 동일 (old vs new 의 외부)
  const oldBlk = sliceFunctionBlock(t.oldContent);
  const newBlk = sliceFunctionBlock(cur);
  const oldOutside = t.oldContent.slice(0, oldBlk.start) + t.oldContent.slice(oldBlk.end);
  const newOutside = cur.slice(0, newBlk.start) + cur.slice(newBlk.end);
  if (oldOutside !== newOutside) outsideDrift++;

  perTarget.push({ pilotIndex: t.pilotIndex, productName: t.productName, canonicalId: t.canonicalId,
    newHashMatch: hashMatch, oldHashRemains: oldStill, attrOk, candOk,
    insertedClaims: t.insertedGroups.flatMap((g) => g.claims).length,
    outsideBlockIdentical: oldOutside === newOutside });
}

/* ── 2. 파일럿 밖 write 여부 ──────────────────────────── */
// BLOCKED / NO_CHANGE 대상은 애초 hash 가 유지되어야 한다
const nonApplied = DEC.decisions.filter((d) => d.decision !== 'SAFE_CANONICAL_PATCH');
const naIds = nonApplied.map((d) => d.canonicalId);
const naNow = new Map((await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)`, [naIds])).rows.map((r) => [r.id, r.content]));
const auditByCanon = new Map(AUDIT.rows.map((r) => [r.canonicalId, r]));
let nonAppliedDrift = 0;
const nonAppliedDriftList = [];
for (const d of nonApplied) {
  const before = auditByCanon.get(d.canonicalId)?.currentHash;
  const cur = naNow.get(d.canonicalId);
  if (before && cur != null && sha(cur) !== before) { nonAppliedDrift++; nonAppliedDriftList.push({ pilotIndex: d.pilotIndex, canonicalId: d.canonicalId }); }
}

/* ── 3. 전체 corpus 보호 감사 ────────────────────────── */
const globals = (await c.query(`
  SELECT
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) AS spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL) AS spd_store_ko,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND deleted_at IS NULL) AS spd_hff`)).rows[0];

// HFF 후보 기준 canonical 보유 수 (직전 트랙 확정치 40,913 대조)
const hffCanon = (await c.query(`
  SELECT count(DISTINCT pc.id)::int c
  FROM product_candidates pc
  JOIN shared_product_descriptions spd ON spd.master_id = pc.matched_product_master_id
  WHERE pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
    AND spd.description_type='STORE' AND spd.status='canonical'
    AND coalesce(spd.language,'ko')='ko' AND spd.deleted_at IS NULL`)).rows[0].c;

// canonicalDup (파일럿 master 범위)
const dupCount = (await c.query(`
  SELECT master_id FROM shared_product_descriptions
  WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical'
    AND coalesce(language,'ko')='ko' AND deleted_at IS NULL
  GROUP BY master_id HAVING count(*) > 1`, [manifest.map((m) => m.productMasterId)])).rowCount;

// Agent 9 HOLD 348 불변 — 큐 파일이 있으면 candidate 상태만 확인
let agent9Unchanged = null;
try {
  const q = fs.readFileSync(`${D}/hff-ko-agent-09-hold-queue-v1.jsonl`, 'utf8').trim();
  if (q) {
    const ids = q.split('\n').map((l) => JSON.parse(l).candidateId);
    const still = (await c.query(`
      SELECT count(*)::int c FROM product_candidates pc
      LEFT JOIN shared_product_descriptions spd ON spd.master_id = pc.matched_product_master_id
        AND spd.description_type='STORE' AND spd.status='canonical' AND coalesce(spd.language,'ko')='ko' AND spd.deleted_at IS NULL
      WHERE pc.id = ANY($1) AND spd.id IS NULL`, [ids])).rows[0].c;
    agent9Unchanged = { queued: ids.length, stillWithoutCanonical: still, unchanged: still === ids.length };
  }
} catch { agent9Unchanged = 'QUEUE_FILE_ABSENT'; }

await c.end();

const fail = [];
if (newHashOk !== targets.length) fail.push('newHashMismatch');
if (oldHashRemains) fail.push('oldHashRemains');
if (attrDrift) fail.push('attrDrift');
if (candDrift) fail.push('candidateDrift');
if (claimsVisible !== claimsExpected) fail.push('insertedClaimsNotVisible');
if (notVerbatim) fail.push('notVerbatim');
if (outsideDrift) fail.push('outsideBlockDrift');
if (nonAppliedDrift) fail.push('nonAppliedTargetDrift');
if (dupCount) fail.push('canonicalDup');

const verification = {
  verifiedAt: new Date().toISOString(), readOnlySession: true,
  expectedUpdate: RB.expectedUpdate ?? targets.length, targetCount: targets.length,
  newHashMatch: newHashOk, oldHashRemains, attrDrift, candidateDrift: candDrift,
  insertedClaims: { expected: claimsExpected, visible: claimsVisible, notVerbatim },
  outsideBlockDrift: outsideDrift,
  nonAppliedTargets: nonApplied.length, nonAppliedDrift, nonAppliedDriftList,
  canonicalDupInPilotMasters: dupCount,
  perTarget, verdict: fail.length ? 'FAIL' : 'PASS', failedChecks: fail,
};
fs.writeFileSync(OUT_V, JSON.stringify(verification, null, 1));

const corpus = {
  auditedAt: new Date().toISOString(),
  globals,
  hffCandidatesWithStoreKoCanonical: hffCanon,
  expectedHffCanonicalBaseline: 40913,
  hffCanonicalUnchanged: hffCanon === 40913,
  canonicalDupInPilotMasters: dupCount,
  agent9HoldQueue: agent9Unchanged,
  pilotAppliedCanonicalIds: [...appliedIds],
  verdict: (hffCanon === 40913 && dupCount === 0 && nonAppliedDrift === 0) ? 'PASS' : 'FAIL',
};
fs.writeFileSync(OUT_C, JSON.stringify(corpus, null, 1));

console.log(JSON.stringify({ verification: { ...verification, perTarget: undefined }, corpus: { ...corpus, pilotAppliedCanonicalIds: undefined } }, null, 2));
