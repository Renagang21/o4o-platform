\set ON_ERROR_STOP on
SELECT 'regulatory_type_counts' AS k, regulatory_type, count(*) FROM product_masters GROUP BY 2 ORDER BY 3 DESC;
SELECT 'cosmetic_masters' AS k, count(*) FROM product_masters WHERE regulatory_type = 'COSMETIC';
SELECT 'ko_store_canonical' AS k, count(*) FROM shared_product_descriptions d
  JOIN product_masters pm ON pm.id = d.master_id
 WHERE pm.regulatory_type = 'COSMETIC' AND d.language = 'ko' AND d.description_type = 'STORE'
   AND d.status = 'canonical' AND d.deleted_at IS NULL;
SELECT 'canonical_dup' AS k, count(*) FROM (
  SELECT d.master_id FROM shared_product_descriptions d
    JOIN product_masters pm ON pm.id = d.master_id
   WHERE pm.regulatory_type = 'COSMETIC' AND d.language = 'ko' AND d.description_type = 'STORE'
     AND d.status = 'canonical' AND d.deleted_at IS NULL
   GROUP BY 1 HAVING count(*) > 1) x;
SELECT 'orphan_desc' AS k, count(*) FROM shared_product_descriptions d
  LEFT JOIN product_masters pm ON pm.id = d.master_id WHERE pm.id IS NULL;
SELECT 'cosmetic_master_without_desc' AS k, count(*) FROM product_masters pm
 WHERE pm.regulatory_type = 'COSMETIC' AND NOT EXISTS (
   SELECT 1 FROM shared_product_descriptions d WHERE d.master_id = pm.id
     AND d.language = 'ko' AND d.description_type = 'STORE' AND d.status = 'canonical' AND d.deleted_at IS NULL);
SELECT 'empty_content' AS k, count(*) FROM shared_product_descriptions d
  JOIN product_masters pm ON pm.id = d.master_id
 WHERE pm.regulatory_type = 'COSMETIC' AND d.language = 'ko' AND d.description_type = 'STORE'
   AND d.status = 'canonical' AND coalesce(length(btrim(d.content)), 0) = 0;
SELECT 'feature_section' AS k, count(*) FROM shared_product_descriptions d
  JOIN product_masters pm ON pm.id = d.master_id
 WHERE pm.regulatory_type = 'COSMETIC' AND d.language = 'ko' AND d.description_type = 'STORE'
   AND d.status = 'canonical' AND d.content LIKE '%<h3>주요 특징</h3>%';
SELECT 'usage_section' AS k, count(*) FROM shared_product_descriptions d
  JOIN product_masters pm ON pm.id = d.master_id
 WHERE pm.regulatory_type = 'COSMETIC' AND d.language = 'ko' AND d.description_type = 'STORE'
   AND d.status = 'canonical' AND d.content LIKE '%<h3>사용 방법</h3>%';
SELECT 'product_type_null' AS k, count(*) FROM product_masters
 WHERE regulatory_type = 'COSMETIC' AND tags->>'productType' IS NULL;
SELECT 'enrich_batch_tagged' AS k, count(*) FROM product_masters
 WHERE regulatory_type = 'COSMETIC' AND tags->>'enrichBatch' IS NOT NULL;
SELECT 'mfds_efficacy_lines' AS k, count(*) FROM shared_product_descriptions d
  JOIN product_masters pm ON pm.id = d.master_id
 WHERE pm.regulatory_type = 'COSMETIC' AND d.language = 'ko' AND d.description_type = 'STORE'
   AND d.status = 'canonical' AND d.content LIKE '%기능성화장품 보고 효능%';
