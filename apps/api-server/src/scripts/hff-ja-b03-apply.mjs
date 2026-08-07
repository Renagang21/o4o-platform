/**
 * WO-O4O-HFF-JA-ALL-CURRENTLY-PRODUCIBLE-7414-DIRECT-BULK-PRODUCTION-V1  §7
 *
 * Batch 03 JA canonical INSERT.
 *   - INSERT 전용. KO canonical / EN / ZH / ProductMaster / candidate 는 쓰지 않는다.
 *   - 이중 게이트: `--apply` + HFF_JA_B03_APPLY_CONFIRM=YES.
 *   - 렌더 감사 verdict 가 PASS 가 아니면 실행하지 않는다.
 *   - rollback manifest 는 apply 전에 기록한다.
 *   - master 별 JA 중복 가드 + KO hash 재확인(낙관적 잠금)을 트랜잭션 안에서 수행한다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const RENDER = JSON.parse(fs.readFileSync(`${D}/hff-ja-b03-render-audit-v1.json`, 'utf8'));
const TARGETS = JSON.parse(fs.readFileSync(`${D}/hff-ja-b03-safe-targets-v1.json`, 'utf8')).targets;
if (RENDER.verdict !== 'PASS') { console.error('RENDER_NOT_PASS'); process.exit(1); }
/* 배치 크기는 렌더가 확정한 값과 일치해야 한다 — §3 전량 전환 시에도 그 값이 계약이다. */
if (TARGETS.length !== RENDER.batchSize) { console.error(`TARGETS_NOT_BATCH_SIZE:${TARGETS.length}/${RENDER.batchSize}`); process.exit(1); }

const APPLY = process.argv.includes('--apply') && process.env.HFF_JA_B03_APPLY_CONFIRM === 'YES';
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();

const globals = async () => (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated') ko_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='en' AND source_type='o4o_hff_generated') en_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='zh' AND source_type='o4o_hff_generated') zh_canon,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL AND description_type='STORE'
       AND status='canonical' AND language='ja' AND source_type='o4o_hff_generated') ja_canon,
    (SELECT count(*)::int FROM product_masters WHERE regulatory_type='건강기능식품') pm_hff`)).rows[0];

const before = await globals();

fs.writeFileSync(`${D}/hff-ja-b03-rollback-v1.json`, JSON.stringify({
  wo: RENDER.wo, preparedAt: new Date().toISOString(),
  rollback: "INSERT 전용이므로 되돌리기는 삽입된 JA canonical 행의 soft delete 이다: UPDATE shared_product_descriptions SET deleted_at=now() WHERE id = ANY(insertedIds) AND language='ja' AND source_type='o4o_hff_generated'.",
  before, targets: TARGETS.map((t) => ({ productMasterId: t.productMasterId, koCanonicalId: t.koCanonicalId, koHash: t.koHash, newContentHash: t.newContentHash })),
}, null, 1));

if (!APPLY) {
  console.log(JSON.stringify({ mode: 'DRY_RUN', targets: TARGETS.length, before, renderVerdict: RENDER.verdict }, null, 2));
  await c.end(); process.exit(0);
}

/* Batch 밖 write 검사 기준 시각 — 삽입 시작 전이어야 이 작업 구간 전체를 덮는다(§7). */
const startedAt = new Date().toISOString();
const SHARD = 500;
const inserted = [], skipped = [], failed = [];
for (let i = 0; i < TARGETS.length; i += SHARD) {
  const chunk = TARGETS.slice(i, i + SHARD);
  try {
    await c.query('BEGIN');
    for (const t of chunk) {
      /* KO 가 그 사이 바뀌었으면 이 행은 건너뛴다(낙관적 잠금). */
      const k = await c.query(`
        SELECT encode(sha256(convert_to(content,'UTF8')),'hex') h FROM shared_product_descriptions
         WHERE id=$1 AND master_id=$2 AND description_type='STORE' AND status='canonical'
           AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated' AND deleted_at IS NULL`,
      [t.koCanonicalId, t.productMasterId]);
      if (!k.rows.length || k.rows[0].h !== t.koHash) { skipped.push({ m: t.productMasterId, why: 'KO_DRIFT' }); continue; }
      const dup = await c.query(`
        SELECT 1 FROM shared_product_descriptions
         WHERE master_id=$1 AND description_type='STORE' AND status='canonical' AND language='ja' AND deleted_at IS NULL`,
      [t.productMasterId]);
      if (dup.rows.length) { skipped.push({ m: t.productMasterId, why: 'JA_EXISTS' }); continue; }
      const r = await c.query(`
        INSERT INTO shared_product_descriptions (master_id, description_type, status, language, source_type, content, created_at, updated_at)
        VALUES ($1,'STORE','canonical','ja','o4o_hff_generated',$2, now(), now()) RETURNING id`,
      [t.productMasterId, t.newContent]);
      inserted.push({ id: r.rows[0].id, m: t.productMasterId, hash: sha(t.newContent) });
    }
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    failed.push({ shard: i, error: String(e.message ?? e) });
  }
}

const after = await globals();
const out = {
  wo: RENDER.wo, batch: RENDER.batch, startedAt, appliedAt: new Date().toISOString(),
  expectedInsert: TARGETS.length, expectedUpdate: 0, expectedSkip: 0,
  targets: TARGETS.length, inserted: inserted.length, updated: 0, skipped: skipped.length, failedShards: failed.length,
  before, after,
  koUnchanged: before.ko_canon === after.ko_canon,
  enUnchanged: before.en_canon === after.en_canon,
  zhUnchanged: before.zh_canon === after.zh_canon,
  pmUnchanged: before.pm_hff === after.pm_hff,
  jaDelta: after.ja_canon - before.ja_canon,
  spdDelta: after.spd_all - before.spd_all,
  expectedEqualsActual: inserted.length === TARGETS.length && skipped.length === 0
    && (after.ja_canon - before.ja_canon) === inserted.length,
  skippedSample: skipped.slice(0, 20), failed,
};
fs.writeFileSync(`${D}/hff-ja-b03-apply-result-v1.json`, JSON.stringify({ ...out, insertedIds: inserted.map((x) => x.id) }, null, 1));
console.log(JSON.stringify(out, null, 2));
await c.end();
