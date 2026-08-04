-- WO-O4O-EASY-DRUG-KO-SOURCE-CONSISTENCY-AUDIT-V1 / 단계 1
--
-- e약은요 공식 원문 ↔ 현재 KO STORE canonical 설명서 대조 단위를 전량 export 한다. **READ-ONLY**.
--
-- 대조 단위 = (itemSeq, canonical content md5).
--   ProductMaster 단위(19,431)로 대조하면 동일 본문을 수천 번 재대조하게 되므로
--   허가품목 × 본문 조합으로 접는다. 포장군 귀속 축은 masterIds/barcodes 로 함께 보존한다.
--
-- 실행:
--   psql ... -At -f export-audit-pairs.sql > audit-pairs.jsonl
--   (세션에 `SET default_transaction_read_only = on;` 선행)
--
-- 산출 필드 중 판정에 직접 쓰이는 것:
--   officialConsumerText   : 기준 원문 7절
--   content                : 현재 KO STORE canonical 본문 (HTML)
--   nPermitsSharingBody    : 같은 본문을 공유하는 허가품목 수 (>1 이면 오귀속 후보)
--   sharingItemSeqs        : 그 허가품목 목록 (원문 대조로 실제 오귀속 여부 판정)
--   nVariantsInPermit      : 같은 허가품목 안에서 본문이 갈리는 수 (>1 이면 포장군 내 불일치)
WITH ed AS (
  SELECT id AS cand_id,
         normalized_identifier_value AS item_seq,
         raw_payload->'officialConsumerText' AS oct,
         raw_payload->>'itemName' AS item_name,
         raw_payload->>'entpName' AS entp_name
  FROM product_candidates
  WHERE source_type='external_api' AND identifier_type='MFDS_CODE'
    AND raw_payload->>'sourceKind'='easy_drug_info' AND deleted_at IS NULL
),
lk AS (
  SELECT ed.cand_id, ed.item_seq, pi.product_master_id AS master_id
  FROM ed JOIN product_identifiers pi
    ON pi.identifier_type='MFDS_CODE' AND pi.normalized_value=ed.item_seq AND pi.deleted_at IS NULL
),
j AS (
  SELECT lk.item_seq, lk.cand_id, sd.id AS desc_id, sd.source_type, sd.summary,
         sd.content, md5(sd.content) AS cmd5, sd.master_id, pm.barcode,
         pm.regulatory_type, pm.drug_category, pm.status AS m_status, pm.name AS master_name
  FROM lk
  JOIN shared_product_descriptions sd ON sd.master_id=lk.master_id
  JOIN product_masters pm ON pm.id=lk.master_id
  WHERE sd.deleted_at IS NULL AND sd.description_type='STORE'
    AND COALESCE(sd.language,'ko')='ko' AND sd.status='canonical'
),
g AS (
  SELECT item_seq, cmd5,
         min(cand_id::text) AS cand_id,
         min(desc_id::text) AS rep_desc_id,
         min(source_type) AS source_type,
         min(content) AS content,
         min(COALESCE(summary,'')) AS summary,
         count(*) AS n_master,
         array_agg(DISTINCT barcode) FILTER (WHERE barcode IS NOT NULL) AS barcodes,
         array_agg(DISTINCT master_id::text) AS master_ids,
         array_agg(DISTINCT regulatory_type) AS reg_types,
         array_agg(DISTINCT drug_category) AS drug_cats,
         min(master_name) AS master_name
  FROM j GROUP BY 1,2
),
shared AS (
  SELECT cmd5, count(DISTINCT item_seq) AS n_permits_sharing,
         array_agg(DISTINCT item_seq) AS sharing_item_seqs
  FROM j GROUP BY 1
),
variants AS (
  SELECT item_seq, count(DISTINCT cmd5) AS n_variants_in_permit
  FROM j GROUP BY 1
)
SELECT row_to_json(t)::text FROM (
  SELECT g.item_seq AS "itemSeq",
         g.cand_id AS "candidateId",
         g.cmd5 AS "contentMd5",
         g.rep_desc_id AS "descriptionId",
         g.source_type AS "sourceType",
         g.content AS "content",
         g.summary AS "summary",
         g.n_master AS "nMaster",
         g.master_ids AS "masterIds",
         g.barcodes AS "barcodes",
         g.reg_types AS "regulatoryTypes",
         g.drug_cats AS "drugCategories",
         g.master_name AS "masterName",
         ed.item_name AS "itemName",
         ed.entp_name AS "entpName",
         ed.oct AS "officialConsumerText",
         s.n_permits_sharing AS "nPermitsSharingBody",
         s.sharing_item_seqs AS "sharingItemSeqs",
         v.n_variants_in_permit AS "nVariantsInPermit"
  FROM g
  JOIN ed ON ed.item_seq=g.item_seq
  JOIN shared s ON s.cmd5=g.cmd5
  JOIN variants v ON v.item_seq=g.item_seq
  ORDER BY g.item_seq, g.cmd5
) t;
