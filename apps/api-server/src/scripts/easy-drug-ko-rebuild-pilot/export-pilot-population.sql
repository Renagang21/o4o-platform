-- WO-O4O-EASY-DRUG-KO-REBUILD-PIPELINE-PILOT-VALIDATION-V1 / 작업 1·3
--
-- e약은요(sourceKind=easy_drug_info) ProductCandidate 를 모집단으로 분류하고,
-- 100 고유 허가품목(itemSeq)의 시험 모집단을 JSON 으로 추출한다. **READ-ONLY**.
--
-- 실행:
--   psql ... -At -f export-pilot-population.sql > pilot_population.json
--   (세션에 `SET default_transaction_read_only = on;` 선행 권장)
--
-- 모집단 분류(작업 1):
--   KO_HOLD_IDENTIFIER        : itemSeq 로 연결되는 ProductMaster 0
--   EXCLUDED                  : 연결은 있으나 생산 대상 조건(DRUG·otc·ACTIVE·13자리 barcode) 만족 master 0
--   KO_HOLD_SOURCE_INCOMPLETE : 효능 또는 용법 결측 (본문 성립 불가)
--   KO_COMPLETE_SOURCE_READY  : 효능·용법·주의사항·저장방법 4개 핵심 절 전부 보유
--   KO_PARTIAL_SOURCE_REVIEW  : 효능·용법 보유, 주의사항 또는 저장방법 결측
--
-- 시험 모집단 구성(작업 3): NORMAL 80 + BOUNDARY 15 + MISSING 5.
--   BOUNDARY 5 클래스(각 3, 상호배타): 최장문 / 최단문 / 최대 포장군 / 최소 포장군 / 숫자·단위·연령 동시 포함
--   MISSING 5: HOLD_SOURCE_INCOMPLETE 2 + PARTIAL_SOURCE_REVIEW 2 + EXCLUDED 1
--   선정은 전부 결정적(item_seq 정렬) — 재실행 시 동일 표본.
WITH c AS (
  SELECT id AS cand_id,
         normalized_identifier_value AS item_seq,
         raw_payload->'officialConsumerText' AS oct,
         raw_payload->>'itemName' AS item_name,
         raw_payload->>'entpName' AS entp_name
  FROM product_candidates
  WHERE source_type='external_api' AND identifier_type='MFDS_CODE'
    AND raw_payload->>'sourceKind'='easy_drug_info' AND deleted_at IS NULL
),
pi AS (
  SELECT normalized_value AS item_seq, product_master_id
  FROM product_identifiers
  WHERE identifier_type='MFDS_CODE' AND deleted_at IS NULL
),
lnk AS (
  SELECT c.cand_id, c.item_seq, pi.product_master_id,
         pm.regulatory_type, pm.drug_category, pm.status AS m_status, pm.barcode
  FROM c LEFT JOIN pi ON pi.item_seq=c.item_seq
         LEFT JOIN product_masters pm ON pm.id=pi.product_master_id
),
agg AS (
  SELECT cand_id, item_seq,
         count(product_master_id) AS n_master,
         count(*) FILTER (WHERE regulatory_type='DRUG' AND drug_category='otc'
                            AND m_status='ACTIVE' AND barcode ~ '^[0-9]{13}$') AS n_ok
  FROM lnk GROUP BY 1,2
),
base AS (
  SELECT c.cand_id, c.item_seq, c.oct, c.item_name, c.entp_name, a.n_master, a.n_ok,
         concat_ws(' ', c.oct->>'efficacy', c.oct->>'usage', c.oct->>'warning',
                        c.oct->>'caution', c.oct->>'interaction', c.oct->>'sideEffect',
                        c.oct->>'storage') AS txt,
         (COALESCE(btrim(c.oct->>'efficacy'),'')<>'') AS has_eff,
         (COALESCE(btrim(c.oct->>'usage'),'')<>'') AS has_use,
         (COALESCE(btrim(c.oct->>'caution'),'')<>'') AS has_cau,
         (COALESCE(btrim(c.oct->>'storage'),'')<>'') AS has_sto
  FROM c JOIN agg a ON a.cand_id=c.cand_id
),
cls AS (
  SELECT *, CASE
    WHEN n_master=0 THEN 'KO_HOLD_IDENTIFIER'
    WHEN n_ok=0 THEN 'EXCLUDED'
    WHEN NOT has_eff OR NOT has_use THEN 'KO_HOLD_SOURCE_INCOMPLETE'
    WHEN has_eff AND has_use AND has_cau AND has_sto THEN 'KO_COMPLETE_SOURCE_READY'
    ELSE 'KO_PARTIAL_SOURCE_REVIEW' END AS bucket
  FROM base
),
ready AS (SELECT * FROM cls WHERE bucket='KO_COMPLETE_SOURCE_READY'),
b_maxlen AS (SELECT item_seq,'B_MAXLEN' AS bt FROM ready ORDER BY length(txt) DESC, item_seq LIMIT 3),
b_minlen AS (SELECT item_seq,'B_MINLEN' FROM ready
             WHERE item_seq NOT IN (SELECT item_seq FROM b_maxlen)
             ORDER BY length(txt) ASC, item_seq LIMIT 3),
b_maxpkg AS (SELECT item_seq,'B_MAXPKG' FROM ready
             WHERE item_seq NOT IN (SELECT item_seq FROM b_maxlen)
               AND item_seq NOT IN (SELECT item_seq FROM b_minlen)
             ORDER BY n_ok DESC, item_seq LIMIT 3),
b_minpkg AS (SELECT item_seq,'B_MINPKG' FROM ready
             WHERE item_seq NOT IN (SELECT item_seq FROM b_maxlen)
               AND item_seq NOT IN (SELECT item_seq FROM b_minlen)
               AND item_seq NOT IN (SELECT item_seq FROM b_maxpkg)
             ORDER BY n_ok ASC, item_seq LIMIT 3),
b_numunit AS (SELECT item_seq,'B_NUMERIC_UNIT_AGE' FROM ready
              WHERE txt ~ '[0-9]+\s*(mg|g|mL|ml)' AND txt ~ '[0-9]+세'
                AND item_seq NOT IN (SELECT item_seq FROM b_maxlen)
                AND item_seq NOT IN (SELECT item_seq FROM b_minlen)
                AND item_seq NOT IN (SELECT item_seq FROM b_maxpkg)
                AND item_seq NOT IN (SELECT item_seq FROM b_minpkg)
              ORDER BY item_seq LIMIT 3),
boundary AS (
  SELECT DISTINCT ON (item_seq) item_seq, bt FROM (
    SELECT * FROM b_maxlen UNION ALL SELECT * FROM b_minlen UNION ALL
    SELECT * FROM b_maxpkg UNION ALL SELECT * FROM b_minpkg UNION ALL SELECT * FROM b_numunit
  ) u ORDER BY item_seq, bt
),
missing AS (
  SELECT item_seq, 'M_'||bucket AS bt FROM (
    SELECT item_seq, bucket, row_number() OVER (PARTITION BY bucket ORDER BY item_seq) rn
    FROM cls WHERE bucket IN ('KO_HOLD_SOURCE_INCOMPLETE','KO_PARTIAL_SOURCE_REVIEW','EXCLUDED')
  ) x WHERE (bucket='KO_HOLD_SOURCE_INCOMPLETE' AND rn<=2)
      OR (bucket='KO_PARTIAL_SOURCE_REVIEW' AND rn<=2)
      OR (bucket='EXCLUDED' AND rn<=1)
),
normal_pool AS (
  SELECT item_seq, row_number() OVER (ORDER BY item_seq) AS rn, count(*) OVER () AS tot
  FROM ready WHERE item_seq NOT IN (SELECT item_seq FROM boundary)
),
normal AS (
  SELECT item_seq, 'N_SPREAD' AS bt FROM (
    SELECT item_seq, ((rn * 80) / tot) AS bucket_idx,
           row_number() OVER (PARTITION BY (rn * 80) / tot ORDER BY rn) AS in_bucket
    FROM normal_pool
  ) s WHERE in_bucket=1 AND bucket_idx < 80
),
pilot_dedup AS (
  SELECT DISTINCT ON (item_seq) item_seq, bt, grp FROM (
    SELECT item_seq, bt, 'BOUNDARY' AS grp FROM boundary
    UNION ALL SELECT item_seq, bt, 'MISSING' FROM missing
    UNION ALL SELECT item_seq, bt, 'NORMAL' FROM normal
  ) p ORDER BY item_seq, CASE grp WHEN 'MISSING' THEN 1 WHEN 'BOUNDARY' THEN 2 ELSE 3 END
),
masters AS (
  SELECT l.item_seq, jsonb_agg(jsonb_build_object(
           'masterId', l.product_master_id,
           'barcode', l.barcode,
           'regulatoryType', l.regulatory_type,
           'drugCategory', l.drug_category,
           'masterStatus', l.m_status,
           'existingCanonical', (
             SELECT jsonb_build_object('id', d.id, 'sourceType', d.source_type,
                                       'status', d.status, 'sourceRefId', d.source_ref_id,
                                       'contentLen', length(d.content), 'md5', md5(d.content))
             FROM shared_product_descriptions d
             WHERE d.master_id=l.product_master_id AND d.deleted_at IS NULL
               AND d.description_type='STORE' AND COALESCE(d.language,'ko')='ko'
               AND d.status='canonical' LIMIT 1),
           'easyDrugRows', (
             SELECT jsonb_agg(jsonb_build_object('id', d2.id, 'status', d2.status, 'sourceRefId', d2.source_ref_id))
             FROM shared_product_descriptions d2
             WHERE d2.master_id=l.product_master_id AND d2.deleted_at IS NULL
               AND d2.source_type='mfds_easy_drug')
         ) ORDER BY l.barcode) AS ms
  FROM lnk l WHERE l.product_master_id IS NOT NULL
    AND l.item_seq IN (SELECT item_seq FROM pilot_dedup)
  GROUP BY l.item_seq
)
SELECT jsonb_pretty(jsonb_agg(jsonb_build_object(
  'itemSeq', p.item_seq, 'sampleGroup', p.grp, 'sampleReason', p.bt,
  'bucket', cl.bucket, 'candidateId', cl.cand_id,
  'itemName', cl.item_name, 'entpName', cl.entp_name,
  'nMaster', cl.n_master, 'nOkMaster', cl.n_ok,
  'officialConsumerText', cl.oct,
  'masters', COALESCE(m.ms, '[]'::jsonb)
) ORDER BY p.item_seq))
FROM pilot_dedup p
JOIN cls cl ON cl.item_seq=p.item_seq
LEFT JOIN masters m ON m.item_seq=p.item_seq;
