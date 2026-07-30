/**
 * Phase F — SAFE 대상 제한 UPDATE. 단일 트랜잭션.
 * 허용 write: 기존 STORE/ko canonical 의 content(+updated_at) 뿐.
 * WHERE 에 canonicalId·master_id·type·status·language·현재 content 를 모두 포함하여
 * 낙관적 잠금(현재 content 일치)을 강제한다. expected != actual 이면 즉시 ROLLBACK.
 *
 * 이중 게이트: --apply + HFF_FN_PILOT_APPLY_CONFIRM=YES
 */
import fs from 'node:fs';
import { connectWritable, D, sha } from './hff-ko-function-review-pilot-47-lib.mjs';

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_FN_PILOT_APPLY_CONFIRM === 'YES';
const RB = `${D}/hff-ko-function-review-pilot-47-rollback-manifest-v1.json`;
const OUT = `${D}/hff-ko-function-review-pilot-47-apply-results-v1.json`;

const rb = JSON.parse(fs.readFileSync(RB, 'utf8'));
const targets = rb.targets ?? [];

if (!targets.length) {
  fs.writeFileSync(OUT, JSON.stringify({ ranAt: new Date().toISOString(), status: 'NOT_APPLIED_NO_SAFE_TARGET', expectedUpdate: 0, actualUpdate: 0, results: [] }, null, 1));
  console.log(JSON.stringify({ status: 'NOT_APPLIED_NO_SAFE_TARGET', expectedUpdate: 0 }, null, 2));
  process.exit(0);
}
if (rb.problems?.length) throw new Error(`APPLY_BLOCKED: rollback manifest problems ${JSON.stringify(rb.problems)}`);
if (!APPLY) { console.log(JSON.stringify({ mode: 'dry-run', expectedUpdate: targets.length, note: '--apply 미지정 — write 안 함' }, null, 2)); process.exit(0); }
if (!CONFIRM) throw new Error('APPLY_BLOCKED: HFF_FN_PILOT_APPLY_CONFIRM=YES 필요');

const c = await connectWritable();
const results = [];
let actual = 0;
const expected = targets.length;
let rolledBack = false, failReason = null;

// 전역 BEFORE 카운트
const before = (await c.query(`
  SELECT
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) AS spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL) AS spd_store_ko,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND deleted_at IS NULL) AS spd_hff`)).rows[0];

try {
  await c.query('BEGIN');
  for (const t of targets) {
    const q = await c.query(`
      UPDATE shared_product_descriptions
         SET content = $1, updated_at = now()
       WHERE id = $2
         AND master_id = $3
         AND description_type = 'STORE'
         AND status = 'canonical'
         AND coalesce(language,'ko') = 'ko'
         AND deleted_at IS NULL
         AND content = $4
       RETURNING id`, [t.newContent, t.canonicalId, t.productMasterId, t.oldContent]);
    const n = q.rowCount;
    actual += n;
    results.push({ targetIndex: t.targetIndex, pilotIndex: t.pilotIndex, canonicalId: t.canonicalId,
      productName: t.productName, updated: n, applyStatus: n === 1 ? 'APPLIED' : 'NO_MATCH' });
    if (n !== 1) { failReason = `ROW_MATCH_FAIL canonicalId=${t.canonicalId} rowCount=${n}`; break; }
  }
  if (actual !== expected) { failReason = failReason ?? `EXPECTED_ACTUAL_MISMATCH ${expected} != ${actual}`; throw new Error(failReason); }

  // 트랜잭션 내 사후검증: 새 hash 일치 + canonical 유일성
  for (const t of targets) {
    const v = await c.query(`SELECT content FROM shared_product_descriptions WHERE id = $1`, [t.canonicalId]);
    if (sha(v.rows[0].content) !== t.newContentHash) { failReason = `POST_HASH_MISMATCH ${t.canonicalId}`; throw new Error(failReason); }
    const d = await c.query(`
      SELECT count(*)::int c FROM shared_product_descriptions
      WHERE master_id = $1 AND description_type='STORE' AND status='canonical'
        AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`, [t.productMasterId]);
    if (d.rows[0].c !== 1) { failReason = `CANONICAL_DUP ${t.productMasterId} c=${d.rows[0].c}`; throw new Error(failReason); }
  }
  const mid = (await c.query(`
    SELECT count(*)::int c FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`)).rows[0].c;
  if (mid !== before.spd_store_ko) { failReason = `TOTAL_COUNT_CHANGED ${before.spd_store_ko} -> ${mid}`; throw new Error(failReason); }

  await c.query('COMMIT');
} catch (e) {
  try { await c.query('ROLLBACK'); rolledBack = true; } catch {}
  failReason = failReason ?? String(e.message || e);
}

const after = (await c.query(`
  SELECT
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) AS spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL) AS spd_store_ko,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND deleted_at IS NULL) AS spd_hff`)).rows[0];

const out = {
  ranAt: new Date().toISOString(),
  status: rolledBack ? 'ROLLED_BACK' : 'APPLIED',
  expectedUpdate: expected, actualUpdate: rolledBack ? 0 : actual,
  rolledBack, failReason,
  countsBefore: before, countsAfter: after,
  countsUnchanged: before.spd_all === after.spd_all && before.spd_store_ko === after.spd_store_ko && before.spd_hff === after.spd_hff,
  results,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

// rollback manifest 의 applyStatus 갱신
if (!rolledBack) {
  rb.targets = rb.targets.map((t) => ({ ...t, applyStatus: 'APPLIED' }));
  fs.writeFileSync(RB, JSON.stringify(rb, null, 1));
}

console.log(JSON.stringify({ status: out.status, expectedUpdate: expected, actualUpdate: out.actualUpdate,
  rolledBack, failReason, countsBefore: before, countsAfter: after, countsUnchanged: out.countsUnchanged }, null, 2));
await c.end();
if (rolledBack) process.exit(1);
