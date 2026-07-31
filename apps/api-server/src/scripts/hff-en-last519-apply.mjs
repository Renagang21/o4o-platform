/**
 * WO-O4O-HFF-EN-BULK-PRODUCTION-BATCH-01-5000-V1 / Apply (이중 게이트, 내부 shard).
 *   node ... --apply  +  HFF_EN_L519_APPLY_CONFIRM=YES
 */
import fs from 'node:fs';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const SAFE = JSON.parse(fs.readFileSync(`${D}/hff-en-batch-01-hold-4209-safe-targets-v1.json`, 'utf8')).targets;
const RENDER = JSON.parse(fs.readFileSync(`${D}/hff-en-last519-render-audit-v1.json`, 'utf8'));
const APPLY = process.argv.includes('--apply') && process.env.HFF_EN_L519_APPLY_CONFIRM === 'YES';
if (RENDER.verdict !== 'PASS') { console.error('RENDER_NOT_PASS'); process.exit(1); }
if (RENDER.verdict !== "PASS") { console.error("RENDER_NOT_PASS"); process.exit(1); }

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5535', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
const globals = async () => (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff`)).rows[0];

const before = await globals();
// rollback manifest 는 Apply 전에 저장한다
fs.writeFileSync(`${D}/hff-en-last519-rollback-v1.json`, JSON.stringify({
  builtAt: new Date().toISOString(), count: SAFE.length,
  rollback: SAFE.map((t) => ({
    op: t.op, enCanonicalId: t.enCanonicalId ?? null, koCanonicalId: t.koCanonicalId,
    productMasterId: (t.masterId ?? t.productMasterId), language: 'en',
    oldContentHash: t.oldContentHash ?? null, newContentHash: t.newContentHash,
    insertedFnSection: !!t.insertedFnSection,
  })),
}, null, 1));

if (!APPLY) { console.log(JSON.stringify({ mode: 'DRY_RUN', targets: SAFE.length, before, renderVerdict: RENDER.verdict }, null, 2)); await c.end(); process.exit(0); }

const SHARD = 500;
const shards = [];
let updated = 0, inserted = 0;
const skipped = [];
for (let i = 0; i < SAFE.length; i += SHARD) {
  const part = SAFE.slice(i, i + SHARD);
  let u = 0, ins = 0, rolled = false;
  try {
    await c.query('BEGIN');
    for (const t of part) {
      if (t.op === 'UPDATE') {
        const r = await c.query(`
          UPDATE shared_product_descriptions SET content=$1, updated_at=now()
           WHERE id=$2 AND master_id=$3 AND description_type='STORE' AND status='canonical'
             AND language='en' AND source_type='o4o_hff_generated' AND deleted_at IS NULL
             AND encode(sha256(convert_to(content,'UTF8')),'hex')=$4`,
          [t.newContent, t.enCanonicalId, (t.masterId ?? t.productMasterId), t.oldContentHash]);
        if (r.rowCount === 1) u++; else skipped.push({ id: t.enCanonicalId, why: 'HASH_DRIFT_OR_GUARD' });
      } else {
        const dup = await c.query(`SELECT 1 FROM shared_product_descriptions
          WHERE master_id=$1 AND description_type='STORE' AND status='canonical' AND language='en' AND deleted_at IS NULL`, [(t.masterId ?? t.productMasterId)]);
        if (dup.rowCount) { skipped.push({ id: (t.masterId ?? t.productMasterId), why: 'EN_ALREADY_EXISTS' }); continue; }
        const r = await c.query(`
          INSERT INTO shared_product_descriptions (master_id, description_type, status, language, source_type, content, created_at, updated_at)
          VALUES ($1,'STORE','canonical','en','o4o_hff_generated',$2, now(), now()) RETURNING id`, [(t.masterId ?? t.productMasterId), t.newContent]);
        if (r.rowCount === 1) { ins++; t.createdCanonicalId = r.rows[0].id; } else skipped.push({ id: (t.masterId ?? t.productMasterId), why: 'INSERT_FAILED' });
      }
    }
    const expU = part.filter((t) => t.op === 'UPDATE').length, expI = part.filter((t) => t.op === 'INSERT').length;
    if (u + skipped.filter((s) => s.why !== 'EN_ALREADY_EXISTS').length !== expU && u !== expU) throw new Error(`SHARD_UPDATE_MISMATCH:${u}/${expU}`);
    await c.query('COMMIT');
    updated += u; inserted += ins;
  } catch (e) {
    await c.query('ROLLBACK'); rolled = true;
    console.error('SHARD_ROLLBACK', i, e.message);
  }
  shards.push({ from: i, size: part.length, updated: u, inserted: ins, rolledBack: rolled });
}
const after = await globals();
await c.end();

const out = {
  appliedAt: new Date().toISOString(), mode: 'APPLY', shardSize: SHARD, shards,
  expectedUpdate: SAFE.filter((t) => t.op === 'UPDATE').length, actualUpdate: updated,
  expectedInsert: SAFE.filter((t) => t.op === 'INSERT').length, actualInsert: inserted,
  skipped, before, after,
  koUnchanged: before.ko_canon === after.ko_canon,
  enDelta: after.en_canon - before.en_canon,
  pmUnchanged: before.pm_hff === after.pm_hff,
};
fs.writeFileSync(`${D}/hff-en-last519-apply-results-v1.json`, JSON.stringify(out, null, 1));
fs.writeFileSync(`${D}/hff-en-batch-01-hold-4209-safe-targets-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), count: SAFE.length, targets: SAFE }, null, 1));
console.log(JSON.stringify({ ...out, shards: shards.length, skipped: skipped.length }, null, 2));
