-- WO-O4O-COSMETICS-STORE-TO-B2B-DESCRIPTION-FULL-COPY-V1 — KO STORE canonical → KO B2B canonical 1회 복사
-- INSERT 전용. ProductMaster / STORE canonical / 기존 B2B 는 건드리지 않는다.
INSERT INTO shared_product_descriptions
  (master_id, content, summary, source_type, description_type, source_ref_id,
   status, language, quality_score, created_by, created_by_supplier_id, created_at, updated_at)
SELECT s.master_id,
       s.content,
       s.summary,
       s.source_type,                 -- 본문 출처 유형 보존 (o4o_cosmetics_retail)
       'B2B',                         -- 새 유형
       s.id,                          -- 출처 레코드 = 복사 원본 STORE 설명서 id (기존 source_ref_id 관례)
       'canonical',
       'ko',
       s.quality_score,
       s.created_by,
       s.created_by_supplier_id,
       now(), now()
  FROM shared_product_descriptions s
  JOIN product_masters m ON m.id = s.master_id
 WHERE m.regulatory_type = 'COSMETIC'
    AND s.description_type = 'STORE'
    AND s.status = 'canonical'
    AND COALESCE(s.language, 'ko') = 'ko'
    AND s.deleted_at IS NULL
   AND COALESCE(TRIM(s.content), '') <> ''
   AND NOT EXISTS (
      SELECT 1 FROM shared_product_descriptions b
       WHERE b.master_id = s.master_id
         AND b.description_type = 'B2B'
         AND b.status = 'canonical'
         AND COALESCE(b.language, 'ko') = 'ko'
         AND b.deleted_at IS NULL
    )
RETURNING id, master_id, source_ref_id;
