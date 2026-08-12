/**
 * WO §8 dry-run — 전량 판정(COPY / EXISTING_B2B / CHECK / BLOCKER)과 행별 계획을 산출한다. read-only.
 * 본문은 저장하지 않고 md5 지문만 남긴다(적용 후 대조용).
 * 산출: dry-run-plan.json (COPY 계획) / dry-run-summary.json / check-queue.json
 */
import { withDb } from '../cosmetics-productmaster-apply-pilot/db.mjs';
import { EXISTING_B2B_EXISTS, STORE_SOURCE_WHERE, writeOut } from './lib.mjs';

const plan = [];
const checkQueue = [];
const summary = { targetMasters: 0, storeCanonical: 0, existingB2b: 0, plannedCopy: 0, check: 0, blocker: 0 };

await withDb(async (q) => {
  // 1) 대상 STORE canonical 전량 + 기존 B2B 유무
  const rows = (await q(`
    SELECT s.id AS store_description_id,
           s.master_id,
           md5(s.content) AS content_hash,
           length(s.content) AS content_len,
           md5(COALESCE(s.summary,'')) AS summary_hash,
           s.source_type,
           (SELECT b.id FROM shared_product_descriptions b
             WHERE b.master_id = s.master_id AND b.description_type='B2B' AND b.status='canonical'
               AND COALESCE(b.language,'ko')='ko' AND b.deleted_at IS NULL LIMIT 1) AS existing_b2b_id
      FROM shared_product_descriptions s
      JOIN product_masters m ON m.id = s.master_id
     WHERE ${STORE_SOURCE_WHERE}
     ORDER BY s.master_id`)).rows;
  summary.storeCanonical = rows.length;

  const seenMaster = new Set();
  for (const r of rows) {
    if (seenMaster.has(r.master_id)) {
      summary.blocker += 1;
      checkQueue.push({ reason: 'DUPLICATE_STORE_CANONICAL', masterId: r.master_id, storeDescriptionId: r.store_description_id });
      continue;
    }
    seenMaster.add(r.master_id);
    const base = {
      masterId: r.master_id,
      storeDescriptionId: r.store_description_id,
      existingB2bDescriptionId: r.existing_b2b_id,
      contentHash: r.content_hash,
      summaryHash: r.summary_hash,
      contentLen: r.content_len,
      sourceType: r.source_type,
    };
    if (!r.content_len) {
      summary.blocker += 1;
      checkQueue.push({ reason: 'EMPTY_STORE_CONTENT', ...base });
      continue;
    }
    if (r.existing_b2b_id) {
      summary.existingB2b += 1;
      checkQueue.push({ reason: 'EXISTING_B2B_PRESERVED', copyAction: 'EXISTING_B2B', ...base });
      continue;
    }
    plan.push({ ...base, copyAction: 'COPY' });
  }
  summary.targetMasters = seenMaster.size;
  summary.plannedCopy = plan.length;

  // 2) STORE canonical 이 없는 COSMETIC master → CHECK
  const noStore = (await q(`SELECT m.id FROM product_masters m
     WHERE m.regulatory_type='COSMETIC' AND NOT EXISTS (
       SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=m.id AND s.description_type='STORE'
         AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)`)).rows;
  for (const r of noStore) checkQueue.push({ reason: 'NO_STORE_CANONICAL', masterId: r.id, copyAction: 'CHECK' });
  summary.check = noStore.length;

  summary.cosmeticMasters = (await q(`SELECT COUNT(*)::int c FROM product_masters WHERE regulatory_type='COSMETIC'`)).rows[0].c;
  summary.storeCanonicalWithExistingB2b = (await q(`SELECT COUNT(*)::int c
      FROM shared_product_descriptions s JOIN product_masters m ON m.id = s.master_id
     WHERE ${STORE_SOURCE_WHERE} AND ${EXISTING_B2B_EXISTS}`)).rows[0].c;
});

summary.checkQueueSize = checkQueue.length;
writeOut('dry-run-plan.json', plan);
writeOut('check-queue.json', checkQueue);
writeOut('dry-run-summary.json', summary);
console.log(JSON.stringify(summary, null, 2));
