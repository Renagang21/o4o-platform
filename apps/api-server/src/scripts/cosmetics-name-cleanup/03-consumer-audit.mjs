/**
 * WO-O4O-COSMETICS-PRODUCT-NAME-NORMALIZATION-CLEANUP-V1 — §6·§11 소비처 감사 (read-only)
 *
 * 상품명 변경이 깨뜨릴 수 있는 소비처를 실측한다.
 *   1) product_masters 를 참조하는 FK 전수
 *   2) 이름을 스냅샷으로 복제해 둔 컬럼(product_name / productName 계열)에 대상 이름이 실제로 들어있는지
 * 결과가 0 이 아니면 apply 전 중지 판단 근거가 된다.
 */
import { withDb } from '../cosmetics-productmaster-apply-pilot/db.mjs';
import { readOut, writeOut } from './lib.mjs';

async function main() {
  const items = readOut('dry-run.json').items;
  const ids = items.map((i) => i.masterId);
  const names = [...new Set(items.map((i) => i.beforeName))];
  const out = { wo: 'WO-O4O-COSMETICS-PRODUCT-NAME-NORMALIZATION-CLEANUP-V1', step: '03-consumer-audit', readOnly: true, targets: ids.length };

  await withDb(async (q) => {
    // 1) product_masters 를 가리키는 FK
    const { rows: fks } = await q(`
      SELECT tc.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
       WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'product_masters'
       ORDER BY 1,2`);
    out.foreignKeys = fks;

    // 각 FK 에서 이번 대상 master 를 참조하는 행 수
    out.referencingRows = [];
    for (const fk of fks) {
      try {
        const { rows } = await q(
          `SELECT COUNT(*)::int c FROM "${fk.table_name}" WHERE "${fk.column_name}" = ANY($1::uuid[])`,
          [ids],
        );
        out.referencingRows.push({ ...fk, count: rows[0].c });
      } catch (e) {
        out.referencingRows.push({ ...fk, error: String(e.message).split('\n')[0] });
      }
    }

    // 2) 이름 스냅샷 컬럼 — 대상 이름이 실제로 저장돼 있는지
    const { rows: nameCols } = await q(`
      SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND data_type IN ('text','character varying')
         AND (column_name ILIKE '%product_name%' OR column_name ILIKE '%productname%'
              OR column_name IN ('name','title','product_title'))
         AND table_name <> 'product_masters'
       ORDER BY 1,2`);
    out.nameSnapshotColumnsScanned = nameCols.length;
    out.nameSnapshotHits = [];
    for (const c of nameCols) {
      try {
        const { rows } = await q(
          `SELECT COUNT(*)::int c FROM "${c.table_name}" WHERE "${c.column_name}" = ANY($1::text[])`,
          [names],
        );
        if (rows[0].c > 0) out.nameSnapshotHits.push({ ...c, count: rows[0].c });
      } catch {
        /* view · 권한 없음 등은 건너뛴다 */
      }
    }

    // 3) 설명서 본문에 상품명이 박혀 있는 건수 (동기화 대상 규모)
    const { rows: body } = await q(
      `SELECT COUNT(*)::int c FROM shared_product_descriptions s
        WHERE s.master_id = ANY($1::uuid[]) AND s.deleted_at IS NULL`,
      [ids],
    );
    out.descriptionRowsForTargets = body[0].c;
  });

  writeOut('consumer-audit.json', out);
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.message}\n`);
  process.exitCode = 1;
});
