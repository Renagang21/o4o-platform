/**
 * WO-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1 — §8 운영 DB read-only 감사
 *
 * 목적: 공급자 offer 연결/수정이 기존 ProductMaster 기준정보를 바꾼 흔적 규모 파악 (보고 전용).
 * DB write 0. 데이터 정정 없음.
 */
import { withDb } from '../../apps/api-server/src/scripts/cosmetics-productmaster-apply-pilot/db.mjs';
import fs from 'fs';

const out = { wo: 'WO-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1', readOnly: true };

await withDb(async (q) => {
  const one = async (sql, p) => (await q(sql, p)).rows[0];

  out.regulatoryTypeCounts = Object.fromEntries(
    (await q(`SELECT regulatory_type t, COUNT(*)::int c FROM product_masters GROUP BY 1 ORDER BY 2 DESC`)).rows.map((r) => [r.t, r.c]),
  );

  out.offerTotal = (await one(`SELECT COUNT(*)::int c FROM supplier_product_offers`)).c;
  out.offerAlive = (await one(`SELECT COUNT(*)::int c FROM supplier_product_offers WHERE deleted_at IS NULL`)).c;
  out.mastersWithOffer = (await one(
    `SELECT COUNT(DISTINCT master_id)::int c FROM supplier_product_offers`,
  )).c;
  out.orphanOffers = (await one(
    `SELECT COUNT(*)::int c FROM supplier_product_offers o
      WHERE NOT EXISTS (SELECT 1 FROM product_masters m WHERE m.id = o.master_id)`,
  )).c;

  // 의심 신호: offer 를 가진 master 중, master 생성 이후에 수정됐고
  //           그 수정 시각이 어떤 offer 의 생성/수정 시각과 5분 이내로 근접한 경우
  const suspect = `
    SELECT m.id, m.regulatory_type, m.name, m.regulatory_name, m.updated_at, m.created_at
      FROM product_masters m
     WHERE EXISTS (SELECT 1 FROM supplier_product_offers o WHERE o.master_id = m.id)
       AND m.updated_at > m.created_at + interval '2 seconds'
       AND EXISTS (
             SELECT 1 FROM supplier_product_offers o
              WHERE o.master_id = m.id
                AND (o.created_at BETWEEN m.updated_at - interval '5 minutes' AND m.updated_at + interval '5 minutes'
                  OR o.updated_at BETWEEN m.updated_at - interval '5 minutes' AND m.updated_at + interval '5 minutes'))`;

  out.suspectMasters = (await one(`SELECT COUNT(*)::int c FROM (${suspect}) t`)).c;
  out.suspectByRegulatoryType = Object.fromEntries(
    (await q(`SELECT regulatory_type t, COUNT(*)::int c FROM (${suspect}) t GROUP BY 1 ORDER BY 2 DESC`)).rows.map((r) => [r.t, r.c]),
  );
  out.suspectRelatedOffers = (await one(
    `SELECT COUNT(*)::int c FROM supplier_product_offers o WHERE o.master_id IN (SELECT id FROM (${suspect}) t)`,
  )).c;

  // 명확한 훼손 후보: master.name 이 공식명(regulatory_name)과 다른데 offer 가 붙어 있는 경우
  out.suspectNameDivergedFromRegulatory = (await one(
    `SELECT COUNT(*)::int c FROM (${suspect}) t WHERE btrim(t.name) <> btrim(t.regulatory_name)`,
  )).c;

  out.suspectSample = (await q(`SELECT id, regulatory_type, name, regulatory_name, created_at, updated_at FROM (${suspect}) t ORDER BY updated_at DESC LIMIT 15`)).rows;

  // 화장품 baseline (WO §11)
  out.cosmeticTotal = (await one(`SELECT COUNT(*)::int c FROM product_masters WHERE regulatory_type='COSMETIC'`)).c;
  out.cosmeticWithOffer = (await one(
    `SELECT COUNT(DISTINCT o.master_id)::int c FROM supplier_product_offers o
       JOIN product_masters m ON m.id = o.master_id WHERE m.regulatory_type='COSMETIC'`,
  )).c;
  out.masterDuplicateGroups = (await one(
    `SELECT COUNT(*)::int c FROM (SELECT 1 FROM product_masters WHERE regulatory_type='COSMETIC'
       GROUP BY lower(COALESCE(brand_name,'')), lower(name) HAVING COUNT(*) > 1) t`,
  )).c;
});

fs.writeFileSync(new URL('./audit.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
