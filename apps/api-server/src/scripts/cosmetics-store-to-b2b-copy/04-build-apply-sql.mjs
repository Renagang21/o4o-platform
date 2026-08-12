/**
 * WO §10 apply SQL 생성 + 적용 전 STORE 기준선 스냅샷. read-only.
 *
 * 본문을 클라이언트로 실어 나르지 않는다 — `INSERT ... SELECT` 로 DB 내부에서 그대로 복사한다.
 * 그래야 content 가 byte 단위로 동일함이 구조적으로 보장된다(왕복 인코딩 없음).
 * 산출: apply.sql / baseline-store.jsonl
 */
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { withDb } from '../cosmetics-productmaster-apply-pilot/db.mjs';
import { EXISTING_B2B_EXISTS, OUT_DIR, STORE_SOURCE_WHERE, readOut, writeOut } from './lib.mjs';

const plan = readOut('dry-run-plan.json');

export const APPLY_SQL = `
-- WO-O4O-COSMETICS-STORE-TO-B2B-DESCRIPTION-FULL-COPY-V1 — KO STORE canonical → KO B2B canonical 1회 복사
-- INSERT 전용. ProductMaster / STORE canonical / 기존 B2B 는 건드리지 않는다.
INSERT INTO shared_product_descriptions
  (master_id, content, summary, source_type, description_type, source_ref_id,
   status, language, quality_score, created_by, created_by_supplier_id, created_at, updated_at)
SELECT s.master_id,
       s.content,
       s.summary,
       s.source_type,                 -- 본문 출처 유형 보존 (o4o_cosmetics_retail)
       'B2B',                         -- 새 유형
       s.id,                          -- 출처 레코드 = 복사 원본 STORE 설명서 id (기존 source_ref_id 관례)
       'canonical',
       'ko',
       s.quality_score,
       s.created_by,
       s.created_by_supplier_id,
       now(), now()
  FROM shared_product_descriptions s
  JOIN product_masters m ON m.id = s.master_id
 WHERE ${STORE_SOURCE_WHERE.trim()}
   AND COALESCE(TRIM(s.content), '') <> ''
   AND NOT ${EXISTING_B2B_EXISTS.trim()}
RETURNING id, master_id, source_ref_id;
`.trim();

await withDb(async (q) => {
  const out = createWriteStream(join(OUT_DIR, 'baseline-store.jsonl'), 'utf8');
  const rows = (await q(`
    SELECT s.id, s.master_id, md5(s.content) AS content_md5, md5(COALESCE(s.summary,'')) AS summary_md5,
           s.status, s.description_type, s.updated_at
      FROM shared_product_descriptions s JOIN product_masters m ON m.id = s.master_id
     WHERE ${STORE_SOURCE_WHERE} ORDER BY s.id`)).rows;
  for (const r of rows) out.write(`${JSON.stringify(r)}\n`);
  await new Promise((r) => out.end(r));
  writeOut('baseline-summary.json', { storeRows: rows.length, plannedCopy: plan.length, capturedAt: rows.length ? 'pre-apply' : 'empty' });
});

writeOut('apply.sql', `${APPLY_SQL}\n`);
console.log(APPLY_SQL);
