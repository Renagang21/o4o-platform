/**
 * WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1  §24·§25
 *
 * 제한 UPDATE — rollback manifest 대상에 한해 `content`, `updated_at` 만 변경한다.
 *   - 단일 트랜잭션. WHERE 는 canonicalId + masterId + STORE + canonical + ko
 *     + **DB 실측 baseline md5** 일치를 모두 요구한다(manifest 해시가 아니다).
 *   - 기대 행수와 실제 행수가 다르면 즉시 ROLLBACK.
 *   - apply 는 삽입 전용 patch 결과만 기록하며, 그 밖의 컬럼은 건드리지 않는다.
 *
 * 실행: node …-apply.mjs            (dry-run, DB write 0)
 *       node …-apply.mjs --live     (제한 UPDATE)
 *
 * 산출물: data/hff-ko-skipped-existing-2451-apply-results-v1.json
 */
import pg from 'pg';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { applyPatch, verifyPatch } from './hff-ko-function-family-preserving-patch.mjs';

const DATA = 'apps/api-server/src/scripts/data';
const WO = 'WO-O4O-HFF-KO-SKIPPED-EXISTING-2451-FUNCTION-CANONICAL-BACKFILL-V1';
const LIVE = process.argv.includes('--live');
const sha = (s) => crypto.createHash('sha256').update(String(s ?? ''), 'utf8').digest('hex');
const J = (f) => JSON.parse(fs.readFileSync(`${DATA}/${f}`, 'utf8'));

const gate = J('hff-ko-skipped-existing-2451-apply-gate-v1.json');
if (gate.verdict !== 'APPLY_APPROVED') { console.error('APPLY_GATE_NOT_APPROVED'); process.exit(2); }
const manifest = J('hff-ko-skipped-existing-2451-rollback-manifest-v1.json');
const items = manifest.items;

const client = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false, statement_timeout: 600000 });
await client.connect();

const results = [];
let updated = 0;
let aborted = null;
try {
  await client.query('BEGIN');
  if (!LIVE) await client.query('SET LOCAL default_transaction_read_only = on');

  for (const m of items) {
    // 트랜잭션 내부에서 대상 행을 잠그고 baseline 을 재확인한다.
    const cur = (await client.query(`
      SELECT id, content FROM shared_product_descriptions
      WHERE id = $1 AND master_id = $2 AND description_type = 'STORE' AND status = 'canonical'
        AND coalesce(language, 'ko') = 'ko' AND deleted_at IS NULL
        AND source_type = 'o4o_hff_generated' AND source_ref_id = $3
      ${LIVE ? 'FOR UPDATE' : ''}`, [m.canonicalId, m.productMasterId, m.sourceRefId])).rows[0];
    if (!cur) { aborted = { candidateId: m.candidateId, reason: 'TARGET_ROW_NOT_FOUND' }; break; }
    if (sha(cur.content) !== m.beforeContentHash) { aborted = { candidateId: m.candidateId, reason: 'BASELINE_HASH_DRIFT' }; break; }

    const after = applyPatch({ content: cur.content, plan: { inserts: m.inserts } });
    const fails = verifyPatch({ before: cur.content, after, plan: { inserts: m.inserts } });
    if (fails.length) { aborted = { candidateId: m.candidateId, reason: 'PATCH_VERIFY_FAILED', fails }; break; }
    if (sha(after) !== m.afterContentHash) { aborted = { candidateId: m.candidateId, reason: 'EXPECTED_AFTER_HASH_MISMATCH' }; break; }

    let rowCount = 0;
    if (LIVE) {
      const r = await client.query(`
        UPDATE shared_product_descriptions
        SET content = $1, updated_at = now()
        WHERE id = $2 AND master_id = $3 AND description_type = 'STORE' AND status = 'canonical'
          AND coalesce(language, 'ko') = 'ko' AND deleted_at IS NULL
          AND source_type = 'o4o_hff_generated' AND source_ref_id = $4
          AND md5(content) = md5($5)
        RETURNING id`, [after, m.canonicalId, m.productMasterId, m.sourceRefId, cur.content]);
      rowCount = r.rowCount;
      if (rowCount !== 1) { aborted = { candidateId: m.candidateId, reason: 'UNEXPECTED_ROW_COUNT', rowCount }; break; }
      updated += rowCount;
    }
    results.push({
      candidateId: m.candidateId, canonicalId: m.canonicalId, productName: m.productName,
      rendererFamily: m.rendererFamily, insertCount: m.inserts.length,
      beforeContentHash: m.beforeContentHash, afterContentHash: sha(after),
      beforeLength: cur.content.length, afterLength: after.length,
      rowCount, status: LIVE ? 'UPDATED' : 'DRY_RUN_OK',
    });
  }

  if (aborted) { await client.query('ROLLBACK'); } else if (!LIVE) { await client.query('ROLLBACK'); } else {
    if (updated !== items.length) { aborted = { reason: 'UPDATED_COUNT_MISMATCH', updated, expected: items.length }; await client.query('ROLLBACK'); } else await client.query('COMMIT');
  }
} catch (e) {
  await client.query('ROLLBACK').catch(() => {});
  aborted = { reason: 'EXCEPTION', message: String(e?.message ?? e) };
}
await client.end();

const verdict = aborted ? 'STOP' : (LIVE ? 'APPLIED' : 'DRY_RUN_PASS');
fs.writeFileSync(`${DATA}/hff-ko-skipped-existing-2451-apply-results-v1.json`, JSON.stringify({
  workOrder: WO,
  contract: '§24·§25 — content·updated_at 만 변경하는 단일 트랜잭션 제한 UPDATE. baseline md5 불일치·행수 불일치 시 ROLLBACK.',
  generatedAt: new Date().toISOString(),
  mode: LIVE ? 'LIVE' : 'DRY_RUN',
  allowedUpdateColumns: ['content', 'updated_at'],
  expected: items.length, attempted: results.length, updated,
  aborted, verdict, results,
}, null, 1));

console.log(JSON.stringify({ mode: LIVE ? 'LIVE' : 'DRY_RUN', expected: items.length, attempted: results.length, updated, aborted, verdict }, null, 1));
if (verdict === 'STOP') process.exit(2);
