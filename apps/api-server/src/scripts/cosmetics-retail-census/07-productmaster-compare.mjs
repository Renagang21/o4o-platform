/**
 * WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1 §9 — 기존 O4O ProductMaster 와 비교
 *
 * **read-only** 다. SELECT 외 어떤 쿼리도 하지 않는다 (WO §14: 운영 DB 쓰기 금지).
 * 접속 정보는 실행 환경변수로만 받는다 — 자격증명을 코드에 박지 않는다.
 *
 *   PGHOST=127.0.0.1 PGPORT=5442 PGUSER=... PGPASSWORD=... PGDATABASE=o4o_platform \
 *     node apps/api-server/src/scripts/cosmetics-retail-census/07-productmaster-compare.mjs
 *
 * 접속이 안 되면 중단하지 않고 "DB 비교 불가" 한계를 명시한 산출물을 남긴다 (WO §9).
 *
 * 산출: tmp/cosmetics-retail-census/productmaster-compare.json
 */
import pg from 'pg';
import { normalize } from '../cosmetics-census-pilot/normalize-core.mjs';
import { readOut, writeOut } from './lib.mjs';

const norm = (s) => normalize(s ?? '', null).core.replace(/\s+/g, '').toLowerCase();

async function loadMasters() {
  const client = new pg.Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE ?? 'o4o_platform',
  });
  await client.connect();
  const byType = await client.query(
    'SELECT regulatory_type AS t, COUNT(*)::int AS c FROM product_masters GROUP BY 1 ORDER BY 2 DESC',
  );
  // 화장품 후보와 부딪힐 수 있는 이름만 본다 — 의약품 17만 건까지 끌어올 이유가 없다.
  const rows = await client.query(
    `SELECT id, name, regulatory_type
       FROM product_masters
      WHERE regulatory_type IS DISTINCT FROM 'DRUG'`,
  );
  await client.end();
  return { byType: byType.rows, rows: rows.rows };
}

async function main() {
  const retail = readOut('retail-unique-guide-candidates.json').candidates;

  let db = null;
  let dbError = null;
  try {
    db = await loadMasters();
  } catch (e) {
    dbError = String(e.message);
  }

  if (!db) {
    writeOut('productmaster-compare.json', {
      meta: {
        wo: 'WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1',
        status: 'DB_UNAVAILABLE',
        limitation: `운영 DB read-only 접속 불가 — 비교 미수행. 사유: ${dbError}`,
        retailCandidates: retail.length,
      },
    });
    process.stderr.write(`DB 접속 불가: ${dbError}\n`);
    return;
  }

  const idx = new Map();
  for (const r of db.rows) {
    const k = norm(r.name);
    if (!k) continue;
    if (!idx.has(k)) idx.set(k, []);
    idx.get(k).push(r);
  }

  const matched = [];
  for (const c of retail) {
    const brand = (c.brandName ?? '').replace(/\s+/g, '').toLowerCase();
    const core = c.canonicalProductName.replace(/\s+/g, '').toLowerCase();
    const hit = idx.get(core) ?? idx.get(brand + core);
    if (hit) {
      matched.push({
        key: c.key,
        brandName: c.brandName,
        canonicalProductName: c.canonicalProductName,
        masters: hit.slice(0, 3).map((m) => ({ id: m.id, name: m.name, regulatoryType: m.regulatory_type })),
      });
    }
  }

  writeOut('productmaster-compare.json', {
    meta: {
      wo: 'WO-O4O-COSMETICS-RETAIL-PRODUCT-CENSUS-V1',
      status: 'OK',
      access: 'read-only SELECT only',
      productMasterTotalByRegulatoryType: db.byType,
      productMasterComparedRows: db.rows.length,
      retailCandidates: retail.length,
      matchedExisting: matched.length,
      newCandidates: retail.length - matched.length,
      note: '정규화 코어 완전일치 기준. product_masters 에 화장품 regulatory_type 은 존재하지 않는다.',
    },
    matched: matched.slice(0, 500),
  });
  process.stderr.write(`매칭 ${matched.length} / 신규 ${retail.length - matched.length}\n`);
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.stack ?? e}\n`);
  process.exit(1);
});
