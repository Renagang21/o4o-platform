/** Phase 4-E — EN 정합 15,498 적용. 단일 트랜잭션, 낙관적 잠금(sha256), 이중 게이트. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_EN_PARITY_APPLY_CONFIRM === 'YES';
const D = 'apps/api-server/src/scripts/data';
const OUT = `${D}/hff-en-parity-apply-results-v1.json`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const EN = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND language='en' AND deleted_at IS NULL`;
const KO = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`;

const idx = JSON.parse(fs.readFileSync(`${D}/hff-en-parity-targets-v1.json`, 'utf8'));
const rbFile = JSON.parse(fs.readFileSync(`${D}/hff-en-parity-rollback-v1.json`, 'utf8'));
const render = JSON.parse(fs.readFileSync(`${D}/hff-en-parity-render-audit-v1.json`, 'utf8'));
if (render.verdict !== 'PASS') throw new Error('APPLY_BLOCKED: render not PASS');
if (render.signatures !== render.signaturesCovered) throw new Error('APPLY_BLOCKED: signature coverage < full');
if (render.totalTargets !== idx.targetsIndex.length) throw new Error('APPLY_BLOCKED: render target set mismatch');
if (render.fnDocsRendered !== render.fnDocsTotal) throw new Error('APPLY_BLOCKED: FN docs not fully rendered');
const contents = new Map(JSON.parse(fs.readFileSync(`${D}/tmp-hff-en-newcontent.json`, 'utf8')).map((x) => [x.canonicalId, x]));
const targets = rbFile.targets;
if (targets.length !== idx.targetsIndex.length) throw new Error('APPLY_BLOCKED: manifest length mismatch');
if (new Set(targets.map((t) => t.canonicalId)).size !== targets.length) throw new Error('APPLY_BLOCKED: duplicate canonicalId');
if (!APPLY) { console.log(JSON.stringify({ mode: 'dry-run', expectedUpdate: targets.length }, null, 2)); process.exit(0); }
if (!CONFIRM) throw new Error('APPLY_BLOCKED: HFF_EN_PARITY_APPLY_CONFIRM=YES 필요');

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
const snap = async () => (await c.query(`
  SELECT
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) AS spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE ${EN}) AS en_total,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE ${EN} AND content LIKE '%class="sd-who"%') AS en_who,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE ${EN} AND content !~* '(pharmacist|in-store expert|store expert)') AS en_no_expert,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE ${EN} AND content !~* '<h2>[^<]*function[^<]*</h2>') AS en_no_fn,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO}) AS ko_total,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO} AND content !~ '<h2>[^<]*기능성[^<]*</h2>') AS ko_no_fn,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO} AND content LIKE '%이런 분께%') AS ko_audience`)).rows[0];

const before = await snap();
let actual = 0, rolledBack = false, failReason = null;
const t0 = Date.now();
try {
  await c.query('BEGIN');
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const nc = contents.get(t.canonicalId);
    if (!nc || nc.newContentHash !== t.newContentHash) { failReason = `CONTENT_MISSING_OR_HASH_MISMATCH ${t.canonicalId}`; throw new Error(failReason); }
    const q = await c.query(`
      UPDATE shared_product_descriptions SET content = $1, updated_at = now()
       WHERE id = $2 AND master_id = $3 AND description_type='STORE' AND status='canonical'
         AND language='en' AND deleted_at IS NULL
         AND encode(sha256(convert_to(content,'UTF8')),'hex') = $4
       RETURNING id`, [nc.newContent, t.canonicalId, t.productMasterId, t.oldContentHash]);
    if (q.rowCount !== 1) { failReason = `ROW_MATCH_FAIL ${t.canonicalId} rowCount=${q.rowCount}`; throw new Error(failReason); }
    actual += q.rowCount;
    if ((i + 1) % 2000 === 0) console.error(`… ${i + 1}/${targets.length}`);
  }
  if (actual !== targets.length) { failReason = `EXPECTED_ACTUAL_MISMATCH ${targets.length} != ${actual}`; throw new Error(failReason); }
  // 트랜잭션 내 전건 sha256 재검증
  for (let i = 0; i < targets.length; i += 500) {
    const chunk = targets.slice(i, i + 500);
    const got = new Map((await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)`, [chunk.map((t) => t.canonicalId)])).rows.map((r) => [r.id, r.content]));
    for (const t of chunk) if (sha(got.get(t.canonicalId)) !== t.newContentHash) { failReason = `POST_HASH_MISMATCH ${t.canonicalId}`; throw new Error(failReason); }
  }
  const mid = await snap();
  if (mid.spd_all !== before.spd_all || mid.en_total !== before.en_total || mid.ko_total !== before.ko_total) { failReason = 'ROW_COUNT_CHANGED'; throw new Error(failReason); }
  if (mid.en_who !== 0) { failReason = `EN_WHO_NOT_ZERO ${mid.en_who}`; throw new Error(failReason); }
  if (mid.en_no_expert !== 0) { failReason = `EN_EXPERT_NOT_COMPLETE ${mid.en_no_expert}`; throw new Error(failReason); }
  if (mid.en_no_fn !== before.en_no_fn - idx.effects.functionSectionsInserted) { failReason = `EN_FN_DELTA_UNEXPECTED ${before.en_no_fn} -> ${mid.en_no_fn}`; throw new Error(failReason); }
  if (mid.ko_no_fn !== before.ko_no_fn || mid.ko_audience !== before.ko_audience) { failReason = 'KO_COUNTS_CHANGED'; throw new Error(failReason); }
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
  rowCountUnchanged: before.spd_all === after.spd_all && before.en_total === after.en_total && before.ko_total === after.ko_total,
  deltas: { en_who: after.en_who - before.en_who, en_no_expert: after.en_no_expert - before.en_no_expert,
    en_no_fn: after.en_no_fn - before.en_no_fn, ko_no_fn: after.ko_no_fn - before.ko_no_fn },
  effects: idx.effects, reusedAssets: idx.reusedAssets, holdRemaining: idx.holdRows, enFunctionTally: idx.enFunctionTally };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
await c.end();
if (rolledBack) process.exit(1);
