/**
 * SAFE 대상 전량 제한 UPDATE — 단일 트랜잭션.
 * 이중 게이트: --apply + HFF_WF825_APPLY_CONFIRM=YES
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_WF825_APPLY_CONFIRM === 'YES';
const D = 'apps/api-server/src/scripts/data';
const RB = `${D}/hff-ko-why-family-825-rollback-manifest-v1.json`;
const OUT = `${D}/hff-ko-why-family-825-apply-results-v1.json`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const HAS_FN = `content ~ '<h2>[^<]*기능성[^<]*</h2>'`;

const rb = JSON.parse(fs.readFileSync(RB, 'utf8'));
const targets = rb.targets ?? [];
const render = JSON.parse(fs.readFileSync(`${D}/hff-ko-why-family-825-render-audit-v1.json`, 'utf8'));
if (render.verdict !== 'PASS') throw new Error('APPLY_BLOCKED: render audit not PASS');
if (!targets.length) { fs.writeFileSync(OUT, JSON.stringify({ status: 'NOT_APPLIED_NO_SAFE_TARGET', expectedUpdate: 0, actualUpdate: 0 }, null, 1)); process.exit(0); }
if (!APPLY) { console.log(JSON.stringify({ mode: 'dry-run', expectedUpdate: targets.length }, null, 2)); process.exit(0); }
if (!CONFIRM) throw new Error('APPLY_BLOCKED: HFF_WF825_APPLY_CONFIRM=YES 필요');

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5494', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();

const snap = async () => (await c.query(`
  SELECT
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) AS spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL) AS spd_store_ko,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL AND NOT (${HAS_FN})) AS without_fn,
    (SELECT count(DISTINCT pc.id)::int FROM product_candidates pc
       JOIN shared_product_descriptions s ON s.master_id = pc.matched_product_master_id
      WHERE pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
        AND s.description_type='STORE' AND s.status='canonical' AND coalesce(s.language,'ko')='ko' AND s.deleted_at IS NULL) AS hff_canonical`)).rows[0];

const before = await snap();
let actual = 0, rolledBack = false, failReason = null;
const results = [];
try {
  await c.query('BEGIN');
  for (const t of targets) {
    const q = await c.query(`
      UPDATE shared_product_descriptions
         SET content = $1, updated_at = now()
       WHERE id = $2 AND master_id = $3
         AND description_type='STORE' AND status='canonical'
         AND coalesce(language,'ko')='ko' AND deleted_at IS NULL
         AND content = $4
       RETURNING id`, [t.newContent, t.canonicalId, t.productMasterId, t.oldContent]);
    actual += q.rowCount;
    results.push({ targetIndex: t.targetIndex, canonicalId: t.canonicalId, productName: t.productName, updated: q.rowCount });
    if (q.rowCount !== 1) { failReason = `ROW_MATCH_FAIL ${t.canonicalId} rowCount=${q.rowCount}`; throw new Error(failReason); }
  }
  if (actual !== targets.length) { failReason = `EXPECTED_ACTUAL_MISMATCH ${targets.length} != ${actual}`; throw new Error(failReason); }

  // 트랜잭션 내 사후검증 (표본이 아니라 전량 hash 확인)
  const ids = targets.map((t) => t.canonicalId);
  const chk = new Map((await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)`, [ids])).rows.map((r) => [r.id, r.content]));
  for (const t of targets) if (sha(chk.get(t.canonicalId)) !== t.newContentHash) { failReason = `POST_HASH_MISMATCH ${t.canonicalId}`; throw new Error(failReason); }
  const dup = (await c.query(`
    SELECT master_id FROM shared_product_descriptions
    WHERE master_id = ANY($1) AND description_type='STORE' AND status='canonical'
      AND coalesce(language,'ko')='ko' AND deleted_at IS NULL
    GROUP BY master_id HAVING count(*) > 1`, [targets.map((t) => t.productMasterId)])).rowCount;
  if (dup) { failReason = `CANONICAL_DUP ${dup}`; throw new Error(failReason); }
  const mid = await snap();
  if (mid.spd_all !== before.spd_all || mid.spd_store_ko !== before.spd_store_ko) { failReason = 'ROW_COUNT_CHANGED'; throw new Error(failReason); }
  if (mid.without_fn !== before.without_fn - targets.length) { failReason = `WITHOUT_FN_DELTA ${before.without_fn} -> ${mid.without_fn}`; throw new Error(failReason); }
  await c.query('COMMIT');
} catch (e) {
  try { await c.query('ROLLBACK'); rolledBack = true; } catch {}
  failReason = failReason ?? String(e.message || e);
}
const after = await snap();

const out = {
  ranAt: new Date().toISOString(), wo: rb.wo,
  status: rolledBack ? 'ROLLED_BACK' : 'APPLIED',
  expectedUpdate: targets.length, actualUpdate: rolledBack ? 0 : actual, rolledBack, failReason,
  countsBefore: before, countsAfter: after,
  rowCountUnchanged: before.spd_all === after.spd_all && before.spd_store_ko === after.spd_store_ko,
  withoutFnSectionDelta: after.without_fn - before.without_fn,
  hffCanonicalUnchanged: before.hff_canonical === after.hff_canonical,
  clausesRestored: targets.reduce((a, t) => a + t.clauseCount, 0),
  results: results.slice(0, 50), resultsTruncated: results.length > 50,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
if (!rolledBack) { rb.targets = rb.targets.map((t) => ({ ...t, applyStatus: 'APPLIED' })); fs.writeFileSync(RB, JSON.stringify(rb, null, 1)); }
console.log(JSON.stringify({ ...out, results: undefined }, null, 2));
await c.end();
if (rolledBack) process.exit(1);
