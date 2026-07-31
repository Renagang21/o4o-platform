/** Phase 1-D — COMPOSITE 변종 127 적용. canonicalId 당 1회 UPDATE, 단일 트랜잭션, 이중 게이트. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_COMPOSITE127_APPLY_CONFIRM === 'YES';
const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-ko-composite-variant-127-apply-results-v1.json`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const KO = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`;

const idx = JSON.parse(fs.readFileSync(`${D}/hff-ko-composite-variant-127-targets-v1.json`, 'utf8'));
const rbFile = JSON.parse(fs.readFileSync(`${D}/hff-ko-composite-variant-127-rollback-v1.json`, 'utf8'));
const render = JSON.parse(fs.readFileSync(`${D}/hff-ko-composite-variant-127-render-audit-v1.json`, 'utf8'));
if (render.verdict !== 'PASS') throw new Error('APPLY_BLOCKED: render not PASS');
if (render.renderedDocs !== idx.targetsIndex.length) throw new Error('APPLY_BLOCKED: render coverage < targets');
const contents = new Map(JSON.parse(fs.readFileSync(`${D}/tmp-hff-composite127-newcontent.json`, 'utf8')).map((x) => [x.canonicalId, x]));
const targets = rbFile.targets;
if (targets.length !== idx.targetsIndex.length) throw new Error('APPLY_BLOCKED: manifest length mismatch');
if (!APPLY) { console.log(JSON.stringify({ mode: 'dry-run', expectedUpdate: targets.length, comboTally: idx.comboTally }, null, 2)); process.exit(0); }
if (!CONFIRM) throw new Error('APPLY_BLOCKED: HFF_COMPOSITE127_APPLY_CONFIRM=YES 필요');

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
const snap = async () => (await c.query(`
  SELECT
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) AS spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO}) AS ko_total,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO} AND content !~ '<h2>[^<]*기능성[^<]*</h2>') AS no_fn,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO} AND content LIKE '%이런 분께%') AS audience,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO} AND content NOT LIKE '%매장 내 약사 등 전문가%') AS no_expert,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO} AND content NOT LIKE '%왜 이 제품인가%') AS non_wae`)).rows[0];

const before = await snap();
let actual = 0, rolledBack = false, failReason = null;
const t0 = Date.now();
try {
  await c.query('BEGIN');
  for (const t of targets) {
    const nc = contents.get(t.canonicalId);
    if (!nc || nc.newContentHash !== t.newContentHash) { failReason = `CONTENT_MISSING_OR_HASH_MISMATCH ${t.canonicalId}`; throw new Error(failReason); }
    const q = await c.query(`
      UPDATE shared_product_descriptions SET content = $1, updated_at = now()
       WHERE id = $2 AND master_id = $3 AND description_type='STORE' AND status='canonical'
         AND coalesce(language,'ko')='ko' AND deleted_at IS NULL
         AND encode(sha256(convert_to(content,'UTF8')),'hex') = $4
       RETURNING id`, [nc.newContent, t.canonicalId, t.productMasterId, t.oldContentHash]);
    if (q.rowCount !== 1) { failReason = `ROW_MATCH_FAIL ${t.canonicalId} rowCount=${q.rowCount}`; throw new Error(failReason); }
    actual += q.rowCount;
  }
  if (actual !== targets.length) { failReason = `EXPECTED_ACTUAL_MISMATCH ${targets.length} != ${actual}`; throw new Error(failReason); }

  const ids = targets.map((t) => t.canonicalId);
  const got = new Map();
  for (const r of (await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)`, [ids])).rows) got.set(r.id, r.content);
  for (const t of targets) if (sha(got.get(t.canonicalId)) !== t.newContentHash) { failReason = `POST_HASH_MISMATCH ${t.canonicalId}`; throw new Error(failReason); }
  const mid = await snap();
  if (mid.spd_all !== before.spd_all || mid.ko_total !== before.ko_total) { failReason = 'ROW_COUNT_CHANGED'; throw new Error(failReason); }
  if (mid.no_fn !== before.no_fn) { failReason = `FUNCTION_SECTION_COUNT_CHANGED ${before.no_fn} -> ${mid.no_fn}`; throw new Error(failReason); }
  await c.query('COMMIT');
} catch (e) {
  try { await c.query('ROLLBACK'); rolledBack = true; } catch {}
  failReason = failReason ?? String(e.message || e);
}
const after = await snap();
const out = { ranAt: new Date().toISOString(), wo: rbFile.wo, phase: rbFile.phase,
  status: rolledBack ? 'ROLLED_BACK' : 'APPLIED', expectedUpdate: targets.length,
  actualUpdate: rolledBack ? 0 : actual, rolledBack, failReason, elapsedMs: Date.now() - t0,
  countsBefore: before, countsAfter: after,
  rowCountUnchanged: before.spd_all === after.spd_all && before.ko_total === after.ko_total,
  deltas: { no_fn: after.no_fn - before.no_fn, audience: after.audience - before.audience, no_expert: after.no_expert - before.no_expert, non_wae: after.non_wae - before.non_wae },
  effects: idx.effects };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
await c.end();
if (rolledBack) process.exit(1);
