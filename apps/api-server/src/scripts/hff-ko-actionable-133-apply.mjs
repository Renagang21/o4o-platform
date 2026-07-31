/** 133 SAFE 적용 — 기존 canonical content UPDATE 만. 이중 게이트 · 단일 트랜잭션. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_133_APPLY_CONFIRM === 'YES';
const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-ko-actionable-hold-133-apply-results-v1.json`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const KO = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`;

const rb = JSON.parse(fs.readFileSync(`${D}/hff-ko-actionable-hold-133-rollback-v1.json`, 'utf8'));
const nc = new Map(JSON.parse(fs.readFileSync(`${D}/tmp-hff-133-newcontent.json`, 'utf8')).map((x) => [x.canonicalId, x]));
const render = JSON.parse(fs.readFileSync(`${D}/hff-ko-actionable-hold-133-render-audit-v1.json`, 'utf8'));
if (render.verdict !== 'PASS') throw new Error('APPLY_BLOCKED: render not PASS');
const targets = rb.targets;
if (!APPLY) { console.log(JSON.stringify({ mode: 'dry-run', expectedUpdate: targets.length }, null, 2)); process.exit(0); }
if (!CONFIRM) throw new Error('APPLY_BLOCKED: HFF_133_APPLY_CONFIRM=YES 필요');

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5499', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
const snap = async () => (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) AS spd_all,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO}) AS ko_canon,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')<>'ko' AND deleted_at IS NULL) AS en_canon,
         (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') AS pm_hff`)).rows[0];
const before = await snap();
let actual = 0, rolledBack = false, failReason = null;
const perRow = [];
try {
  await c.query('BEGIN');
  for (const t of targets) {
    const n = nc.get(t.canonicalId);
    if (!n || n.newContentHash !== t.newContentHash) { failReason = `CONTENT_MISMATCH ${t.canonicalId}`; throw new Error(failReason); }
    const q = await c.query(`
      UPDATE shared_product_descriptions SET content=$1, updated_at=now()
       WHERE id=$2 AND master_id=$3 AND description_type='STORE' AND status='canonical'
         AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated' AND deleted_at IS NULL
         AND encode(sha256(convert_to(content,'UTF8')),'hex')=$4
       RETURNING id`, [n.newContent, t.canonicalId, t.productMasterId, t.oldContentHash]);
    perRow.push({ canonicalId: t.canonicalId, updated: q.rowCount });
    if (q.rowCount !== 1) { failReason = `ROW_FAIL ${t.canonicalId}`; throw new Error(failReason); }
    actual += q.rowCount;
  }
  if (actual !== targets.length) { failReason = `EXPECTED_ACTUAL ${targets.length}!=${actual}`; throw new Error(failReason); }
  const ids = targets.map((t) => t.canonicalId);
  const got = new Map((await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)`, [ids])).rows.map((r) => [r.id, r.content]));
  for (const t of targets) if (sha(got.get(t.canonicalId)) !== t.newContentHash) { failReason = `POST_HASH ${t.canonicalId}`; throw new Error(failReason); }
  const mid = await snap();
  if (mid.spd_all !== before.spd_all || mid.ko_canon !== before.ko_canon || mid.en_canon !== before.en_canon || mid.pm_hff !== before.pm_hff) { failReason = 'COUNT_CHANGED'; throw new Error(failReason); }
  await c.query('COMMIT');
} catch (e) { try { await c.query('ROLLBACK'); rolledBack = true; } catch {} failReason = failReason ?? String(e.message || e); }
const after = await snap();
const out = { ranAt: new Date().toISOString(), wo: rb.wo, status: rolledBack ? 'ROLLED_BACK' : 'APPLIED',
  expectedUpdate: targets.length, actualUpdate: rolledBack ? 0 : actual, rolledBack, failReason,
  countsBefore: before, countsAfter: after,
  countsUnchanged: before.spd_all === after.spd_all && before.ko_canon === after.ko_canon && before.en_canon === after.en_canon && before.pm_hff === after.pm_hff };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
await c.end();
if (rolledBack) process.exit(1);
