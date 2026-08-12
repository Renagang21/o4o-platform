/**
 * WO §3 모집단 재산출 — 과거 숫자를 기대값으로만 쓰고 현재 운영 DB 를 실측한다. read-only.
 * 산출: census.json
 */
import { withDb } from '../cosmetics-productmaster-apply-pilot/db.mjs';
import { EXISTING_B2B_EXISTS, STORE_SOURCE_WHERE, writeOut } from './lib.mjs';

const EXPECTED = { cosmeticMasters: 32674, koStoreCanonical: 32674 };
const out = { expected: EXPECTED, readOnly: true };

await withDb(async (q) => {
  const one = async (sql) => (await q(sql)).rows[0];
  const FROM = `FROM shared_product_descriptions s JOIN product_masters m ON m.id = s.master_id WHERE ${STORE_SOURCE_WHERE}`;

  out.cosmeticMasters = (await one(`SELECT COUNT(*)::int c FROM product_masters WHERE regulatory_type='COSMETIC'`)).c;
  out.koStoreCanonical = (await one(`SELECT COUNT(*)::int c ${FROM}`)).c;
  out.koStoreCanonicalMasters = (await one(`SELECT COUNT(DISTINCT s.master_id)::int c ${FROM}`)).c;

  // 기존 KO B2B canonical (COSMETIC 범위 / 전체)
  out.existingKoB2bCosmetic = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions b
      JOIN product_masters m ON m.id = b.master_id
     WHERE m.regulatory_type='COSMETIC' AND b.description_type='B2B' AND b.status='canonical'
       AND COALESCE(b.language,'ko')='ko' AND b.deleted_at IS NULL`)).c;
  out.existingKoB2bAll = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions
     WHERE description_type='B2B' AND status='canonical' AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`)).c;

  // STORE canonical 이 없는 COSMETIC master (WO §4 CHECK)
  out.cosmeticMastersWithoutStore = (await one(`SELECT COUNT(*)::int c FROM product_masters m
     WHERE m.regulatory_type='COSMETIC' AND NOT EXISTS (
       SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=m.id AND s.description_type='STORE'
         AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)`)).c;

  // 중복 STORE canonical (unique index 로 불가능해야 한다)
  out.duplicateStoreCanonical = (await one(`SELECT COUNT(*)::int c FROM (
      SELECT s.master_id ${FROM} GROUP BY s.master_id HAVING COUNT(*) > 1) t`)).c;

  out.orphanDescriptions = (await one(`SELECT COUNT(*)::int c FROM shared_product_descriptions s
     WHERE NOT EXISTS (SELECT 1 FROM product_masters m WHERE m.id = s.master_id)`)).c;

  out.emptyStoreContent = (await one(`SELECT COUNT(*)::int c ${FROM} AND COALESCE(TRIM(s.content),'')=''`)).c;

  out.copyTargets = (await one(`SELECT COUNT(*)::int c ${FROM} AND NOT ${EXISTING_B2B_EXISTS}`)).c;
  out.skipExistingB2b = (await one(`SELECT COUNT(*)::int c ${FROM} AND ${EXISTING_B2B_EXISTS}`)).c;

  const st = await q(`SELECT s.source_type, COUNT(*)::int c ${FROM} GROUP BY 1 ORDER BY c DESC`);
  out.storeSourceTypes = Object.fromEntries(st.rows.map((r) => [r.source_type, r.c]));
  const attr = await q(`SELECT (s.created_by IS NOT NULL) has_user, (s.created_by_supplier_id IS NOT NULL) has_supplier,
      (s.summary IS NOT NULL) has_summary, (s.quality_score IS NOT NULL) has_quality, COUNT(*)::int c ${FROM} GROUP BY 1,2,3,4`);
  out.storeAttribution = attr.rows;
  const rt = await q(`SELECT COALESCE(regulatory_type,'(null)') t, COUNT(*)::int c FROM product_masters GROUP BY 1 ORDER BY c DESC`);
  out.masterByRegulatoryType = Object.fromEntries(rt.rows.map((r) => [r.t, r.c]));
});

out.matchesExpected = out.cosmeticMasters === EXPECTED.cosmeticMasters && out.koStoreCanonical === EXPECTED.koStoreCanonical;
writeOut('census.json', out);
console.log(JSON.stringify(out, null, 2));
