/**
 * WO-O4O-HFF-FINAL-REVIEW-QUEUE-4544-FULL-PRODUCTION-V1  §13 Apply
 *
 * 이중 게이트: `--apply` + env `HFF_FINAL4544_APPLY_CONFIRM=YES`
 * 허용 write: 기존 STORE canonical 행의 `content` + `updated_at` 뿐. INSERT/DELETE 없음.
 * 행별 낙관적 잠금: 현재 content sha256 === rollback oldContentHash 이고 rowCount === 1.
 * 단일 트랜잭션 + 트랜잭션 내 전건 sha256 재검증 + 스냅샷 불변식 → 위반 시 즉시 ROLLBACK.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const APPLY = process.argv.includes('--apply');
const CONFIRM = process.env.HFF_FINAL4544_APPLY_CONFIRM === 'YES';
const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');

const idx = JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-safe-targets-v1.json`, 'utf8'));
const rb = new Map(JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-rollback-v1.json`, 'utf8')).targets.map((x) => [x.canonicalId, x]));
const nc = new Map(JSON.parse(fs.readFileSync(`${D}/tmp-hff-final-4544-newcontent.json`, 'utf8')).map((x) => [x.canonicalId, x.newContent]));
const render = JSON.parse(fs.readFileSync(`${D}/hff-final-review-4544-render-audit-v1.json`, 'utf8'));

/* ── 사전 게이트 ─────────────────────────────────────────────────────── */
const pre = [];
if (render.verdict !== 'PASS') pre.push('RENDER_GATE_NOT_PASS');
if (render.totalTargets !== idx.targetsIndex.length) pre.push('RENDER_TARGET_COUNT_MISMATCH');
if (new Set(idx.targetsIndex.map((t) => t.canonicalId)).size !== idx.targetsIndex.length) pre.push('CANONICAL_DUP');
for (const t of idx.targetsIndex) {
  const r = rb.get(t.canonicalId), n = nc.get(t.canonicalId);
  if (!r || n == null) { pre.push(`MANIFEST_INCOMPLETE:${t.canonicalId}`); continue; }
  if (t.language !== 'ko') pre.push(`NON_KO_TARGET:${t.canonicalId}`);
  if (sha(r.oldContent) !== t.oldContentHash) pre.push(`OLD_HASH_MISMATCH:${t.canonicalId}`);
  if (sha(n) !== t.newContentHash) pre.push(`NEW_HASH_MISMATCH:${t.canonicalId}`);
  if (n === r.oldContent) pre.push(`NO_CHANGE:${t.canonicalId}`);
  if (n.length <= r.oldContent.length) pre.push(`NOT_ADDITIVE:${t.canonicalId}`);
}
if (pre.length) { console.log(JSON.stringify({ verdict: 'BLOCKED', pre: pre.slice(0, 20), count: pre.length })); process.exit(1); }

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();

const SNAP = `SELECT
  (SELECT count(*) FROM shared_product_descriptions) spd_all,
  (SELECT count(*) FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND coalesce(language,'ko')='ko') ko_total,
  (SELECT count(*) FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND language='en') en_total`;
const snapBefore = (await c.query(SNAP)).rows[0];

if (!(APPLY && CONFIRM)) {
  const dry = { mode: 'DRY_RUN', dbWrites: 0, gate: { apply: APPLY, confirm: CONFIRM },
    targets: idx.targetsIndex.length, renderVerdict: render.verdict, snapshotBefore: snapBefore,
    effects: idx.effects, preflight: 'PASS' };
  console.log(JSON.stringify(dry, null, 2)); await c.end(); process.exit(0);
}

const results = { applied: 0, skipped: [], failed: [] };
let verdict = 'PASS';
try {
  await c.query('BEGIN');
  for (const t of idx.targetsIndex) {
    const r = await c.query(
      `UPDATE shared_product_descriptions
          SET content = $1, updated_at = now()
        WHERE id = $2 AND master_id = $3 AND description_type='STORE' AND status='canonical'
          AND source_type='o4o_hff_generated' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL
          AND encode(sha256(convert_to(content,'UTF8')),'hex') = $4
        RETURNING id`,
      [nc.get(t.canonicalId), t.canonicalId, t.productMasterId, t.oldContentHash]);
    if (r.rowCount === 1) results.applied++;
    else { results.failed.push({ canonicalId: t.canonicalId, rowCount: r.rowCount }); }
  }
  if (results.applied !== idx.targetsIndex.length) throw new Error(`EXPECTED_ACTUAL_MISMATCH ${results.applied} != ${idx.targetsIndex.length}`);

  /* 트랜잭션 내 전건 재검증 */
  const ids = idx.targetsIndex.map((t) => t.canonicalId);
  const want = new Map(idx.targetsIndex.map((t) => [t.canonicalId, t.newContentHash]));
  let verified = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const rows = (await c.query(`SELECT id, encode(sha256(convert_to(content,'UTF8')),'hex') h FROM shared_product_descriptions WHERE id = ANY($1)`, [ids.slice(i, i + 500)])).rows;
    for (const row of rows) { if (row.h !== want.get(row.id)) throw new Error(`INTX_HASH_MISMATCH ${row.id}`); verified++; }
  }
  if (verified !== ids.length) throw new Error(`INTX_VERIFY_COUNT ${verified}`);

  const snapMid = (await c.query(SNAP)).rows[0];
  for (const k of ['spd_all', 'ko_total', 'en_total']) if (String(snapMid[k]) !== String(snapBefore[k])) throw new Error(`SNAPSHOT_DRIFT ${k}`);
  await c.query('COMMIT');
} catch (e) {
  await c.query('ROLLBACK').catch(() => {});
  verdict = 'ROLLED_BACK';
  results.error = String(e.message ?? e);
}
const snapAfter = (await c.query(SNAP)).rows[0];
await c.end();

const out = { ranAt: new Date().toISOString(), wo: 'WO-O4O-HFF-FINAL-REVIEW-QUEUE-4544-FULL-PRODUCTION-V1',
  mode: 'APPLY', verdict, expectedUpdates: idx.targetsIndex.length, actualUpdates: results.applied,
  effects: idx.effects, failed: results.failed, error: results.error ?? null,
  snapshotBefore: snapBefore, snapshotAfter: snapAfter,
  writeScope: ['shared_product_descriptions.content', 'shared_product_descriptions.updated_at'] };
fs.writeFileSync(`${D}/hff-final-review-4544-apply-results-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
