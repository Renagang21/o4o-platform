/**
 * WO-O4O-COSMETICS-PRODUCTMASTER-APPLY-PILOT-V1 — 단계 1: 현행 구조 감사 (WO §2, read-only)
 *
 * 코드가 아니라 **운영 DB 실물**을 본다. 화장품을 기존 구조로 표현할 수 있는지의 판단 근거를 모은다.
 * SELECT 외 어떤 쿼리도 하지 않는다.
 */
import { withDb } from './db.mjs';
import { writeOut } from './lib.mjs';

const Q = {
  productMasterColumns: `
    SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
     WHERE table_name = 'product_masters' ORDER BY ordinal_position`,
  spdColumns: `
    SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
     WHERE table_name = 'shared_product_descriptions' ORDER BY ordinal_position`,
  indexes: `
    SELECT tablename, indexname, indexdef
      FROM pg_indexes
     WHERE tablename IN ('product_masters','shared_product_descriptions','product_identifiers','product_images')
     ORDER BY tablename, indexname`,
  constraints: `
    SELECT rel.relname AS table_name, con.conname, pg_get_constraintdef(con.oid) AS def
      FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = rel.relnamespace
     WHERE ns.nspname = 'public'
       AND rel.relname IN ('product_masters','shared_product_descriptions','product_identifiers','product_images')
       AND con.contype IN ('c','u','f')
     ORDER BY rel.relname, con.conname`,
  regulatoryTypes: `
    SELECT regulatory_type AS value, COUNT(*)::int AS count
      FROM product_masters GROUP BY 1 ORDER BY 2 DESC`,
  masterStatus: `SELECT status, COUNT(*)::int AS count FROM product_masters GROUP BY 1 ORDER BY 2 DESC`,
  spdTypes: `
    SELECT description_type AS value, COUNT(*)::int AS count
      FROM shared_product_descriptions GROUP BY 1 ORDER BY 2 DESC`,
  spdStatus: `SELECT status, COUNT(*)::int AS count FROM shared_product_descriptions GROUP BY 1 ORDER BY 2 DESC`,
  spdLanguages: `
    SELECT COALESCE(language,'(null)') AS value, COUNT(*)::int AS count
      FROM shared_product_descriptions GROUP BY 1 ORDER BY 2 DESC`,
  spdResourceTypes: `
    SELECT resource_type AS value, COUNT(*)::int AS count
      FROM shared_product_descriptions GROUP BY 1 ORDER BY 2 DESC`,
  cosmeticTables: `
    SELECT table_name FROM information_schema.tables
     WHERE table_schema NOT IN ('pg_catalog','information_schema')
       AND table_name LIKE '%cosmetic%' ORDER BY 1`,
  identifierExists: `
    SELECT table_name FROM information_schema.tables
     WHERE table_name IN ('product_identifiers','product_images','product_masters','shared_product_descriptions')`,
  mastersWithoutIdentifier: `
    SELECT COUNT(*)::int AS count FROM product_masters m
     WHERE NOT EXISTS (SELECT 1 FROM product_identifiers i WHERE i.product_master_id = m.id)`,
  mastersWithoutBarcode: `SELECT COUNT(*)::int AS count FROM product_masters WHERE barcode IS NULL`,
  mastersWithoutImage: `
    SELECT COUNT(*)::int AS count FROM product_masters m
     WHERE NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_master_id = m.id)`,
};

async function safe(q, sql) {
  try {
    const r = await q(sql);
    return r.rows;
  } catch (e) {
    return { error: String(e.message).split('\n')[0] };
  }
}

async function main() {
  const result = { wo: 'WO-O4O-COSMETICS-PRODUCTMASTER-APPLY-PILOT-V1', access: 'read-only SELECT only' };
  await withDb(async (q) => {
    for (const [k, sql] of Object.entries(Q)) result[k] = await safe(q, sql);
  });
  writeOut('structure-audit.json', result);
  process.stderr.write(
    `regulatory_type: ${JSON.stringify(result.regulatoryTypes)}\n` +
      `spd descriptionType: ${JSON.stringify(result.spdTypes)}\n` +
      `cosmetic tables: ${JSON.stringify(result.cosmeticTables)}\n`,
  );
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.message}\n`);
  process.exitCode = 1;
});
