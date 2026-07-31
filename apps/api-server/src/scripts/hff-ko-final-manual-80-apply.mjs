/**
 * WO-O4O-HFF-KO-FINAL-MANUAL-80-RESOLUTION-V1 / Apply (이중 게이트).
 *   node ... --apply   +   HFF_MANUAL80_APPLY_CONFIRM=YES
 * 단일 트랜잭션 · 행별 hash lock · 개별 drift 는 해당 행만 HOLD 하고 계속.
 */
import fs from 'node:fs';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const SAFE = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-manual-80-safe-targets-v1.json`, 'utf8')).targets;
const SCAN = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-manual-80-scan-v1.json`, 'utf8'));
const RENDER = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-manual-80-render-audit-v1.json`, 'utf8'));
const APPLY = process.argv.includes('--apply') && process.env.HFF_MANUAL80_APPLY_CONFIRM === 'YES';

if (!SCAN.clean) { console.error('SCAN_NOT_CLEAN'); process.exit(1); }
if (RENDER.verdict !== 'PASS') { console.error('RENDER_NOT_PASS'); process.exit(1); }
if (RENDER.documents !== SAFE.length) { console.error('RENDER_COVERAGE_MISMATCH'); process.exit(1); }

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5501', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();

const globals = async () => (await c.query(`
  SELECT (SELECT count(*) FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
    (SELECT count(*) FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*) FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*) FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff`)).rows[0];

const before = await globals();
if (!APPLY) {
  console.log(JSON.stringify({ mode: 'DRY_RUN', targets: SAFE.length, before, scanClean: SCAN.clean, renderVerdict: RENDER.verdict }, null, 2));
  await c.end(); process.exit(0);
}

const results = [], skipped = [];
let updated = 0, rolledBack = false;
try {
  await c.query('BEGIN');
  for (const t of SAFE) {
    const r = await c.query(`
      UPDATE shared_product_descriptions
         SET content = $1, updated_at = now()
       WHERE id = $2 AND master_id = $3
         AND description_type = 'STORE' AND status = 'canonical'
         AND coalesce(language,'ko') = 'ko' AND source_type = 'o4o_hff_generated'
         AND deleted_at IS NULL
         AND encode(sha256(convert_to(content,'UTF8')),'hex') = $4`,
      [t.newContent, t.canonicalId, t.productMasterId, t.oldContentHash]);
    if (r.rowCount === 1) { updated++; results.push({ canonicalId: t.canonicalId, ok: true }); }
    else { skipped.push({ canonicalId: t.canonicalId, productName: t.productName, rowCount: r.rowCount, why: 'HASH_DRIFT_OR_GUARD' }); }
  }
  // 트랜잭션 안에서 전량 재확인
  const check = await c.query(
    `SELECT id, encode(sha256(convert_to(content,'UTF8')),'hex') h FROM shared_product_descriptions WHERE id = ANY($1)`,
    [results.map((r) => r.canonicalId)]);
  const want = new Map(SAFE.map((t) => [t.canonicalId, t.newContentHash]));
  const bad = check.rows.filter((r) => want.get(r.id) !== r.h);
  if (bad.length) throw new Error(`IN_TX_HASH_MISMATCH:${bad.length}`);
  if (skipped.length > SAFE.length / 2) throw new Error(`SYSTEMIC_DRIFT:${skipped.length}`);

  const mid = await globals();
  if (mid.spd_all !== before.spd_all || mid.ko_canon !== before.ko_canon
      || mid.en_canon !== before.en_canon || mid.pm_hff !== before.pm_hff) throw new Error('COUNT_CHANGED');
  await c.query('COMMIT');
} catch (e) {
  await c.query('ROLLBACK'); rolledBack = true;
  console.error('ROLLED_BACK:', e.message);
}
const after = await globals();
await c.end();

const out = {
  appliedAt: new Date().toISOString(), mode: 'APPLY',
  expectedUpdate: SAFE.length, actualUpdate: rolledBack ? 0 : updated,
  skipped, rolledBack, before, after,
  countsUnchanged: JSON.stringify(before) === JSON.stringify(after),
};
fs.writeFileSync(`${D}/hff-ko-final-manual-80-apply-results-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
