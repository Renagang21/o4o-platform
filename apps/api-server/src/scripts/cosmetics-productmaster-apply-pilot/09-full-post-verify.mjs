/**
 * WO-O4O-COSMETICS-PRODUCTMASTER-STORE-DESCRIPTION-FULL-APPLY-V1 — postVerify (WO §6)
 *
 * read-only. 10개 항목 전수. 구조적 오류는 0 이어야 한다.
 */
import { withDb } from './db.mjs';
import { readOut, writeOut } from './lib.mjs';

const BATCH_TAG = 'cosmetics-full-apply-v1';
const PILOT_TAG = 'cosmetics-pilot-500-v2';
const SOURCE_TYPE = 'o4o_cosmetics_retail';

async function main() {
  const apply = readOut('full-apply-result.json');
  const excluded = new Set(readOut('non-cosmetic-exclusions.json').items.map((i) => i.key));
  const out = {
    wo: 'WO-O4O-COSMETICS-PRODUCTMASTER-STORE-DESCRIPTION-FULL-APPLY-V1',
    batchTag: BATCH_TAG,
    expected: { master: apply.createdMaster, canonical: apply.createdCanonical },
    baseline: apply.baselineRegulatoryTypeCounts,
  };

  await withDb(async (q) => {
    const one = async (sql, p) => (await q(sql, p)).rows[0];
    const all = async (sql, p) => (await q(sql, p)).rows;

    // 1·2) 생성 수
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
        `SELECT COUNT(*)::int c FROM shared_product_descriptions s JOIN product_masters m ON m.id = s.master_id
          WHERE m.tags->>'woBatch' = $1 AND s.description_type = 'STORE'
            AND COALESCE(s.language,'ko') = 'ko' AND s.status = 'canonical' AND s.deleted_at IS NULL`,
        [BATCH_TAG],
      )
    ).c;

    // 3) ProductMaster 중복 — 화장품 전체 (brand,name)
    const dupGroups = await all(
      `SELECT lower(COALESCE(brand_name,'')) b, lower(name) n, COUNT(*)::int c
         FROM product_masters WHERE regulatory_type = 'COSMETIC'
        GROUP BY 1,2 HAVING COUNT(*) > 1 ORDER BY 3 DESC LIMIT 50`,
    );
    out.masterDuplicateGroupCount = (
      await one(
        `SELECT COUNT(*)::int c FROM (
           SELECT 1 FROM product_masters WHERE regulatory_type = 'COSMETIC'
            GROUP BY lower(COALESCE(brand_name,'')), lower(name) HAVING COUNT(*) > 1) t`,
      )
    ).c;
    out.masterDuplicateSample = dupGroups;

    // 4) canonical 중복
    out.canonicalDuplicateGroupCount = (
      await one(
        `SELECT COUNT(*)::int c FROM (
           SELECT s.master_id FROM shared_product_descriptions s JOIN product_masters m ON m.id = s.master_id
            WHERE m.tags->>'woBatch' = $1 AND s.description_type = 'STORE'
              AND COALESCE(s.language,'ko') = 'ko' AND s.status = 'canonical' AND s.deleted_at IS NULL
            GROUP BY 1 HAVING COUNT(*) > 1) t`,
        [BATCH_TAG],
      )
    ).c;

    // 5) orphan
    out.orphanDescriptions = (
      await one(
        `SELECT COUNT(*)::int c FROM shared_product_descriptions s
          WHERE s.source_type = $1 AND NOT EXISTS (SELECT 1 FROM product_masters m WHERE m.id = s.master_id)`,
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

    // 6) 비화장품 오등록
    const keys = await all(`SELECT tags->>'censusKey' k FROM product_masters WHERE tags->>'woBatch' = $1`, [
      BATCH_TAG,
    ]);
    out.nonCosmeticMisregistered = keys.filter((r) => excluded.has(r.k)).length;
    out.batchKeyDuplicates = keys.length - new Set(keys.map((r) => r.k)).size;
    out.pilotKeyOverlap = (
      await one(
        `SELECT COUNT(*)::int c FROM product_masters a
          WHERE a.tags->>'woBatch' = $1
            AND EXISTS (SELECT 1 FROM product_masters b
                         WHERE b.tags->>'woBatch' = $2 AND b.tags->>'censusKey' = a.tags->>'censusKey')`,
        [BATCH_TAG, PILOT_TAG],
      )
    ).c;

    // 7) 보호 제품군 drift
    const rt = await all(`SELECT regulatory_type t, COUNT(*)::int c FROM product_masters GROUP BY 1`);
    out.regulatoryTypeCounts = Object.fromEntries(rt.map((r) => [r.t, r.c]));
    out.regulatoryTypeDrift = Object.fromEntries(
      ['DRUG', '건강기능식품', 'QUASI_DRUG', 'MEDICAL_DEVICE'].map((t) => [
        t,
        (out.regulatoryTypeCounts[t] ?? 0) - (out.baseline[t] ?? 0),
      ]),
    );

    // 8) rollback tag 전량 부여 — 이번 source_type 설명서가 모두 태그된 master 에 붙었는가
    out.descriptionsWithoutRollbackTag = (
      await one(
        `SELECT COUNT(*)::int c FROM shared_product_descriptions s JOIN product_masters m ON m.id = s.master_id
          WHERE s.source_type = $1 AND COALESCE(m.tags->>'woBatch','') NOT IN ($2, $3)`,
        [SOURCE_TYPE, BATCH_TAG, PILOT_TAG],
      )
    ).c;

    // 9) 검색 smoke
    const probe = await one(
      `SELECT name, brand_name FROM product_masters
        WHERE tags->>'woBatch' = $1 AND brand_name IS NOT NULL ORDER BY name LIMIT 1`,
      [BATCH_TAG],
    );
    out.searchSmoke = {
      probe,
      byBrandAndName: (
        await one(
          `SELECT COUNT(*)::int c FROM product_masters WHERE brand_name = $1 AND name = $2`,
          [probe.brand_name, probe.name],
        )
      ).c,
      byNameOnly: (
        await one(`SELECT COUNT(*)::int c FROM product_masters WHERE name = $1`, [probe.name])
      ).c,
      cosmeticMasterTotal: (
        await one(`SELECT COUNT(*)::int c FROM product_masters WHERE regulatory_type = 'COSMETIC'`)
      ).c,
      koStoreDescription: await one(
        `SELECT s.id, length(s.content)::int len, s.summary FROM shared_product_descriptions s
           JOIN product_masters m ON m.id = s.master_id
          WHERE m.tags->>'woBatch' = $1 AND s.description_type = 'STORE'
            AND COALESCE(s.language,'ko') = 'ko' AND s.status = 'canonical' LIMIT 1`,
        [BATCH_TAG],
      ),
      emptyContentDescriptions: (
        await one(
          `SELECT COUNT(*)::int c FROM shared_product_descriptions s JOIN product_masters m ON m.id = s.master_id
            WHERE m.tags->>'woBatch' = $1 AND COALESCE(length(s.content),0) = 0`,
          [BATCH_TAG],
        )
      ).c,
    };
  });

  out.pass =
    out.actualMaster === out.expected.master &&
    out.actualMasterCosmetic === out.expected.master &&
    out.actualCanonical === out.expected.canonical &&
    out.canonicalDuplicateGroupCount === 0 &&
    out.orphanDescriptions === 0 &&
    out.mastersWithoutDescription === 0 &&
    out.nonCosmeticMisregistered === 0 &&
    out.batchKeyDuplicates === 0 &&
    out.pilotKeyOverlap === 0 &&
    out.descriptionsWithoutRollbackTag === 0 &&
    out.searchSmoke.emptyContentDescriptions === 0 &&
    Object.values(out.regulatoryTypeDrift).every((d) => d === 0);

  writeOut('full-post-verify.json', out);
  console.log(JSON.stringify(out, null, 2).slice(0, 3000));
}

main().catch((e) => {
  process.stderr.write(`FAILED: ${e.message}\n`);
  process.exitCode = 1;
});
