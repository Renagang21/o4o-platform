/**
 * WO-...-PRODUCTMASTER-PILOT-V2 — 단계 6: postVerify (WO §12) + 검색 smoke (WO §13)
 *
 * read-only. 구조적 오류(중복·orphan·오등록·오연결)는 0 이어야 한다.
 * 기존 제품군(DRUG/건강기능식품/QUASI_DRUG/MEDICAL_DEVICE) 건수는 apply 직전 실측치와 대조한다.
 */
import { withDb } from './db.mjs';
import { readOut, writeOut } from './lib.mjs';

const BATCH_TAG = 'cosmetics-pilot-500-v2';
const SOURCE_TYPE = 'o4o_cosmetics_retail';

// apply 직전 실측 baseline (단계 1 구조 조사 시점)
const BASELINE = {
  DRUG: 177413,
  건강기능식품: 40948,
  QUASI_DRUG: 17148,
  MEDICAL_DEVICE: 3826,
};

async function main() {
  const apply = readOut('apply-result.json');
  const excluded = new Set(readOut('non-cosmetic-exclusions.json').items.map((i) => i.key));
  const out = {
    wo: 'WO-O4O-COSMETICS-DESCRIPTION-AUTHORING-POLICY-AND-PRODUCTMASTER-PILOT-V2',
    batchTag: BATCH_TAG,
    expected: { master: apply.createdMaster, canonical: apply.createdCanonical },
  };

  await withDb(async (q) => {
    const one = async (sql, params) => (await q(sql, params)).rows[0];
    const all = async (sql, params) => (await q(sql, params)).rows;

    out.actualMaster = (
      await one(`SELECT COUNT(*)::int c FROM product_masters WHERE tags->>'woBatch' = $1`, [BATCH_TAG])
    ).c;
    out.actualMasterCosmetic = (
      await one(
        `SELECT COUNT(*)::int c FROM product_masters WHERE tags->>'woBatch' = $1 AND regulatory_type = 'COSMETIC'`,
        [BATCH_TAG],
      )
    ).c;
    out.actualCanonical = (
      await one(
        `SELECT COUNT(*)::int c FROM shared_product_descriptions s
           JOIN product_masters m ON m.id = s.master_id
          WHERE m.tags->>'woBatch' = $1 AND s.description_type = 'STORE'
            AND COALESCE(s.language,'ko') = 'ko' AND s.status = 'canonical' AND s.deleted_at IS NULL`,
        [BATCH_TAG],
      )
    ).c;

    // 1) ProductMaster 중복 — 배치 내부 및 기존 화장품 master 와 (brand,name) 중복
    out.masterDuplicateGroups = await all(
      `SELECT lower(COALESCE(brand_name,'')) b, lower(name) n, COUNT(*)::int c
         FROM product_masters
        WHERE regulatory_type = 'COSMETIC'
        GROUP BY 1,2 HAVING COUNT(*) > 1`,
    );

    // 2) canonical 중복 — (master, STORE, ko) 당 2건 이상
    out.canonicalDuplicateGroups = await all(
      `SELECT s.master_id, COUNT(*)::int c
         FROM shared_product_descriptions s
         JOIN product_masters m ON m.id = s.master_id
        WHERE m.tags->>'woBatch' = $1 AND s.description_type = 'STORE'
          AND COALESCE(s.language,'ko') = 'ko' AND s.status = 'canonical' AND s.deleted_at IS NULL
        GROUP BY 1 HAVING COUNT(*) > 1`,
      [BATCH_TAG],
    );

    // 3) orphan — 이번 source_type 설명서 중 master 가 없는 것 / master 인데 설명서가 없는 것
    out.orphanDescriptions = (
      await one(
        `SELECT COUNT(*)::int c FROM shared_product_descriptions s
          WHERE s.source_type = $1
            AND NOT EXISTS (SELECT 1 FROM product_masters m WHERE m.id = s.master_id)`,
        [SOURCE_TYPE],
      )
    ).c;
    out.mastersWithoutDescription = (
      await one(
        `SELECT COUNT(*)::int c FROM product_masters m
          WHERE m.tags->>'woBatch' = $1
            AND NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id = m.id)`,
        [BATCH_TAG],
      )
    ).c;

    // 4) 잘못된 연결 — 이번 source_type 설명서가 배치 밖 master 에 붙었는가
    out.descriptionsOnForeignMaster = (
      await one(
        `SELECT COUNT(*)::int c FROM shared_product_descriptions s
           JOIN product_masters m ON m.id = s.master_id
          WHERE s.source_type = $1 AND COALESCE(m.tags->>'woBatch','') <> $2`,
        [SOURCE_TYPE, BATCH_TAG],
      )
    ).c;

    // 5) 비화장품 오등록 — 제외 목록의 census key 가 COSMETIC 으로 생성됐는가
    const batchKeys = await all(
      `SELECT tags->>'censusKey' k FROM product_masters WHERE tags->>'woBatch' = $1`,
      [BATCH_TAG],
    );
    out.nonCosmeticMisregistered = batchKeys.filter((r) => excluded.has(r.k)).map((r) => r.k);

    // 6) 기존 제품군 영향
    const rt = await all(
      `SELECT regulatory_type t, COUNT(*)::int c FROM product_masters GROUP BY 1 ORDER BY 2 DESC`,
    );
    out.regulatoryTypeCounts = Object.fromEntries(rt.map((r) => [r.t, r.c]));
    out.regulatoryTypeDrift = Object.fromEntries(
      Object.entries(BASELINE).map(([t, base]) => [t, (out.regulatoryTypeCounts[t] ?? 0) - base]),
    );

    // --- WO §13 검색 smoke (기존 조회 경로 재사용, UI 신규 개발 없음)
    const probe = await one(
      `SELECT name, brand_name FROM product_masters WHERE tags->>'woBatch' = $1 AND brand_name IS NOT NULL LIMIT 1`,
      [BATCH_TAG],
    );
    const smoke = { probe };
    smoke.byBrandAndName = (
      await one(
        `SELECT COUNT(*)::int c FROM product_masters
          WHERE brand_name ILIKE '%'||$1||'%' AND name ILIKE '%'||$2||'%'`,
        [probe.brand_name, probe.name],
      )
    ).c;
    smoke.byNameOnly = (
      await one(`SELECT COUNT(*)::int c FROM product_masters WHERE name ILIKE '%'||$1||'%'`, [probe.name])
    ).c;
    smoke.cosmeticMasterLookup = (
      await one(`SELECT COUNT(*)::int c FROM product_masters WHERE regulatory_type = 'COSMETIC'`)
    ).c;
    const desc = await one(
      `SELECT s.id, length(s.content)::int len, s.summary
         FROM shared_product_descriptions s
         JOIN product_masters m ON m.id = s.master_id
        WHERE m.tags->>'woBatch' = $1 AND s.description_type = 'STORE'
          AND COALESCE(s.language,'ko') = 'ko' AND s.status = 'canonical'
        LIMIT 1`,
      [BATCH_TAG],
    );
    smoke.koStoreDescription = desc;
    out.searchSmoke = smoke;
  });

  out.pass =
    out.actualMaster === out.expected.master &&
    out.actualMasterCosmetic === out.expected.master &&
    out.actualCanonical === out.expected.canonical &&
    out.masterDuplicateGroups.length === 0 &&
    out.canonicalDuplicateGroups.length === 0 &&
    out.orphanDescriptions === 0 &&
    out.mastersWithoutDescription === 0 &&
    out.descriptionsOnForeignMaster === 0 &&
    out.nonCosmeticMisregistered.length === 0 &&
    Object.values(out.regulatoryTypeDrift).every((d) => d === 0);

  writeOut('post-verify.json', out);
  console.log(JSON.stringify({ ...out, searchSmoke: out.searchSmoke }, null, 2).slice(0, 2600));
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.message}\n`);
  process.exitCode = 1;
});
