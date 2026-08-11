/**
 * WO-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1 §10 postVerify (read-only)
 *
 * 이번 WO 는 권한 경계만 바꾼다 — DB write 0. 따라서 postVerify 는
 * "공통 Product DB 가 이 작업으로 흔들리지 않았다" 를 실측으로 고정하는 것이 목적이다.
 *   - ProductMaster 총수 · regulatory_type 별 분포 (DRUG/HFF/QUASI_DRUG/MEDICAL_DEVICE/COSMETIC)
 *   - canonical STORE 설명서 수 · 언어별 분포
 *   - masterDup / canonicalDup / orphan = 0
 */
import { withDb } from '../../apps/api-server/src/scripts/cosmetics-productmaster-apply-pilot/db.mjs';
import { writeFileSync } from 'node:fs';

const out = {
  wo: 'WO-O4O-PRODUCT-DB-WRITE-AUTHORITY-BOUNDARY-ALIGNMENT-V1',
  step: 'postVerify',
  readOnly: true,
  dbWrites: 0,
  pass: true,
  failures: [],
};
const must = (ok, label) => {
  if (!ok) {
    out.pass = false;
    out.failures.push(label);
  }
};

await withDb(async (q) => {
  const one = async (sql, p) => (await q(sql, p)).rows[0];

  out.productMasterTotal = (await one('SELECT COUNT(*)::int c FROM product_masters')).c;

  const rt = await q('SELECT COALESCE(regulatory_type, $1) t, COUNT(*)::int c FROM product_masters GROUP BY 1 ORDER BY 2 DESC', ['(null)']);
  out.byRegulatoryType = Object.fromEntries(rt.rows.map((r) => [r.t, r.c]));

  const spd = await q(
    `SELECT description_type t, status s, COUNT(*)::int c
       FROM shared_product_descriptions WHERE deleted_at IS NULL GROUP BY 1,2 ORDER BY 3 DESC`,
  );
  out.sharedProductDescriptions = spd.rows.map((r) => ({ type: r.t, status: r.s, count: r.c }));

  out.canonicalStoreByLanguage = Object.fromEntries(
    (
      await q(
        `SELECT COALESCE(language,'ko') l, COUNT(*)::int c
           FROM shared_product_descriptions
          WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
          GROUP BY 1 ORDER BY 2 DESC`,
      )
    ).rows.map((r) => [r.l, r.c]),
  );

  // canonical 중복 — (master, type, language) 유일 불변식 (F12)
  out.canonicalDuplicateGroups = (
    await one(`SELECT COUNT(*)::int c FROM (
        SELECT master_id FROM shared_product_descriptions
         WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
         GROUP BY master_id, COALESCE(language,'ko') HAVING COUNT(*) > 1) t`)
  ).c;
  must(out.canonicalDuplicateGroups === 0, `canonical 중복 ${out.canonicalDuplicateGroups}`);

  // orphan 설명서 — 존재하지 않는 master 참조
  out.orphanDescriptions = (
    await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions s
                WHERE NOT EXISTS (SELECT 1 FROM product_masters m WHERE m.id = s.master_id)`)
  ).c;
  must(out.orphanDescriptions === 0, `orphan 설명서 ${out.orphanDescriptions}`);

  // 식별자 중복 — 같은 (type, normalized value) 가 여러 master 에 붙어 있는가
  out.identifierDuplicateGroups = (
    await one(`SELECT COUNT(*)::int c FROM (
        SELECT identifier_type, normalized_value FROM product_identifiers
         WHERE normalized_value IS NOT NULL AND deleted_at IS NULL
         GROUP BY 1,2 HAVING COUNT(DISTINCT product_master_id) > 1) t`)
  ).c;

  // 후보 상태 분포 — 서비스 운영자 큐레이션이 계속 동작하는지 비교용 기준선
  out.candidateByStatus = Object.fromEntries(
    (await q('SELECT candidate_status s, COUNT(*)::int c FROM product_candidates GROUP BY 1 ORDER BY 2 DESC')).rows.map(
      (r) => [r.s, r.c],
    ),
  );
});

writeFileSync(new URL('./postverify.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
console.log(`\n판정: ${out.pass ? 'PASS' : 'FAIL — ' + out.failures.join(' | ')}`);
if (!out.pass) process.exitCode = 3;
