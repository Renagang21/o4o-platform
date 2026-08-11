/**
 * WO-O4O-PRODUCT-AI-TAGS-SUPPLIER-OWNERSHIP-GUARD-V1 §9 — 운영 DB read-only 감사
 * 과거 tags 의 정오는 판정하지 않는다. 현황만 계량한다. (write 0)
 */
import { withDb } from '../../apps/api-server/src/scripts/cosmetics-productmaster-apply-pilot/db.mjs';
import { writeFileSync } from 'node:fs';

const out = { wo: 'WO-O4O-PRODUCT-AI-TAGS-SUPPLIER-OWNERSHIP-GUARD-V1', step: '09-readonly-audit', readOnly: true, dbWrites: 0 };
await withDb(async (q) => {
  const one = async (s, p) => (await q(s, p)).rows[0];
  out.productAiTagsRows = (await one('SELECT COUNT(*)::int c FROM product_ai_tags')).c;
  out.distinctTaggedProducts = (await one('SELECT COUNT(DISTINCT product_id)::int c FROM product_ai_tags')).c;
  out.tagsBySource = Object.fromEntries(
    (await q('SELECT source, COUNT(*)::int c FROM product_ai_tags GROUP BY 1 ORDER BY 2 DESC')).rows.map((r) => [r.source, r.c]),
  );
  out.mastersWithTagsColumn = (await one(`SELECT COUNT(*)::int c FROM product_masters WHERE tags IS NOT NULL AND tags::text NOT IN ('[]','{}')`)).c;
  out.supplierOfferRows = (await one('SELECT COUNT(*)::int c FROM supplier_product_offers')).c;
  out.mastersWithOffer = (await one('SELECT COUNT(DISTINCT master_id)::int c FROM supplier_product_offers')).c;
  // ai_tags 는 있으나 공급자 offer 연결이 없는 master (= 배치/내부 생성분으로 추정, 판정하지 않음)
  out.taggedProductsWithoutOffer = (
    await one(`SELECT COUNT(*)::int c FROM (
        SELECT DISTINCT t.product_id FROM product_ai_tags t
         WHERE NOT EXISTS (SELECT 1 FROM supplier_product_offers o WHERE o.master_id = t.product_id)) x`)
  ).c;
  // product_masters 에 없는 product_id (고아) — §8.1 계약 위반 흔적
  out.orphanTagProducts = (
    await one(`SELECT COUNT(*)::int c FROM (
        SELECT DISTINCT t.product_id FROM product_ai_tags t
         WHERE NOT EXISTS (SELECT 1 FROM product_masters m WHERE m.id = t.product_id)) x`)
  ).c;
});
writeFileSync(new URL('./audit.json', import.meta.url), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
