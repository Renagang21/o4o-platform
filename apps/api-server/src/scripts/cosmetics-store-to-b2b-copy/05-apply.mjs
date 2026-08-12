/**
 * WO §10 apply — INSERT 전용, 단일 트랜잭션. dry-run/검증 PASS 를 파일로 재확인한 뒤에만 실행한다.
 * 산출: apply-result.json (신규 id 매니페스트) / rollback.sql
 */
import { withDb } from '../cosmetics-productmaster-apply-pilot/db.mjs';
import { COPY_BATCH, readOut, writeOut } from './lib.mjs';
import { APPLY_SQL } from './04-build-apply-sql.mjs';

const plan = readOut('dry-run-plan.json');
const validation = readOut('validation.json');
if (!validation.pass) throw new Error('validation.json 이 PASS 가 아니다 — apply 중단');
if (validation.plannedCopy !== plan.length) throw new Error('검증 시점 계획 수와 다르다 — apply 중단');

const result = { batch: COPY_BATCH, plannedCopy: plan.length, inserted: 0, mismatch: null };
const planStoreIds = new Set(plan.map((p) => p.storeDescriptionId));

await withDb(async (q) => {
  await q('BEGIN');
  try {
    const r = await q(APPLY_SQL);
    result.inserted = r.rowCount;
    if (r.rowCount !== plan.length) throw new Error(`INSERT ${r.rowCount} != 계획 ${plan.length} — ROLLBACK`);
    const unplanned = r.rows.filter((x) => !planStoreIds.has(x.source_ref_id));
    if (unplanned.length) throw new Error(`계획 밖 ${unplanned.length}건 삽입 — ROLLBACK`);
    result.newIds = r.rows.map((x) => x.id);
    await q('COMMIT');
    result.committed = true;
  } catch (err) {
    await q('ROLLBACK');
    result.committed = false;
    result.error = String(err.message ?? err);
    throw err;
  }
}, { write: true });

writeOut('apply-result.json', result);

// rollback — 이번에 만든 행만, 그리고 만든 뒤 손대지 않은 행만 삭제한다.
const ids = result.newIds.map((i) => `'${i}'`);
const chunks = [];
for (let i = 0; i < ids.length; i += 1000) chunks.push(ids.slice(i, i + 1000));
writeOut('rollback.sql', [
  `-- WO-O4O-COSMETICS-STORE-TO-B2B-DESCRIPTION-FULL-COPY-V1 rollback (batch=${COPY_BATCH})`,
  '-- 이번 배치로 신규 생성된 KO B2B canonical 만 삭제한다. STORE / ProductMaster 에는 write 가 없다.',
  "-- 안전판: description_type='B2B' AND source_type='o4o_cosmetics_retail' 이고 생성 후 수정되지 않은(updated_at = created_at) 행만.",
  'BEGIN;',
  ...chunks.map((c) => `DELETE FROM shared_product_descriptions\n WHERE id IN (${c.join(',')})\n   AND description_type = 'B2B' AND source_type = 'o4o_cosmetics_retail' AND updated_at = created_at;`),
  'COMMIT;',
  '',
].join('\n'));

console.log(JSON.stringify({ ...result, newIds: `${result.newIds.length} ids` }, null, 2));
