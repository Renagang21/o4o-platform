-- =============================================================================
-- WO-O4O-DRUG-ACCESS-POLICY-DECISION-AND-LIVE-EXPOSURE-AUDIT-V1
-- 의약품 접근정책 — 현행 게이트 실효성 + 기존 노출 규모 읽기 전용 인벤토리
--
-- READ-ONLY 전용. INSERT/UPDATE/DELETE/DDL 을 포함하지 않는다.
--
-- 사용:
--   ./bin/cloud-sql-proxy-v2.exe --token "$(gcloud auth print-access-token)" \
--     --port 5451 netureyoutube:asia-northeast3:o4o-platform-db
--   psql -h 127.0.0.1 -p 5451 -U "$DB_USERNAME" -d o4o_platform -X \
--     -f scripts/audits/drug-access-exposure-inventory.sql
--   (한글 주석 때문에 psql -c 인라인 대신 -f 로 실행할 것)
--
-- 판정축 주의:
--   확정 정책상 의약품 SSOT = product_masters.regulatory_type='DRUG'.
--   product_categories.is_regulated 는 보조 감사 신호이며 판정 기준이 아니다.
--   본 스크립트는 두 축의 괴리(U3/U4/U12)를 실측하는 것이 목적이다.
--
-- 출력은 aggregate 전용. 개인정보·주문자·콘텐츠 전문을 출력하지 않는다.
-- =============================================================================

SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;
\pset pager off

\echo ''
\echo '=== U1. service_audience_policies 실제 행 ==='
SELECT service_key, is_pharmacy_target_service, left(coalesce(note,''),40) AS note_head, updated_at
FROM service_audience_policies ORDER BY service_key;

\echo ''
\echo '=== U2. regulatory_type 분포 (DRUG 모수) ==='
SELECT coalesce(regulatory_type,'(NULL)') AS regulatory_type, count(*) AS cnt
FROM product_masters GROUP BY 1 ORDER BY 2 DESC;

\echo ''
\echo '=== U3. DRUG 중 category_id IS NULL 수/비율 ==='
SELECT count(*) AS drug_total,
       count(*) FILTER (WHERE category_id IS NULL) AS category_null,
       round(100.0 * count(*) FILTER (WHERE category_id IS NULL) / nullif(count(*),0), 2) AS pct_null
FROM product_masters WHERE regulatory_type = 'DRUG';

\echo ''
\echo '=== U4. DRUG 중 연결 category 가 is_regulated=false 또는 NULL ==='
SELECT count(*) AS drug_total,
       count(*) FILTER (WHERE pc.id IS NULL)               AS no_category_row,
       count(*) FILTER (WHERE pc.is_regulated IS NOT TRUE) AS cat_not_regulated,
       round(100.0 * count(*) FILTER (WHERE pc.is_regulated IS NOT TRUE) / nullif(count(*),0), 2) AS pct_not_regulated
FROM product_masters pm
LEFT JOIN product_categories pc ON pc.id = pm.category_id
WHERE pm.regulatory_type = 'DRUG';

\echo ''
\echo '=== U5. regulatory_type x drug_category 불일치 분포 ==='
SELECT coalesce(regulatory_type,'(NULL)') AS regulatory_type,
       coalesce(drug_category,'(NULL)')   AS drug_category,
       count(*) AS cnt
FROM product_masters
GROUP BY 1,2 ORDER BY 1, 3 DESC;

\echo ''
\echo '=== U6. DRUG 참조 OrganizationProductListing — service_key별 ==='
SELECT opl.service_key, count(*) AS listings,
       count(*) FILTER (WHERE opl.is_active) AS active_listings,
       count(DISTINCT opl.organization_id)   AS orgs
FROM organization_product_listings opl
JOIN product_masters pm ON pm.id = opl.master_id
WHERE pm.regulatory_type = 'DRUG'
GROUP BY 1 ORDER BY 2 DESC;

\echo ''
\echo '=== U7. 비약국 서비스의 DRUG OPL (정책행 기준) ==='
SELECT opl.service_key,
       coalesce(sap.is_pharmacy_target_service, false) AS is_pharmacy_service,
       count(*) AS listings,
       count(*) FILTER (WHERE opl.is_active) AS active_listings
FROM organization_product_listings opl
JOIN product_masters pm ON pm.id = opl.master_id
LEFT JOIN service_audience_policies sap ON sap.service_key = opl.service_key
WHERE pm.regulatory_type = 'DRUG'
  AND coalesce(sap.is_pharmacy_target_service, false) = false
GROUP BY 1,2 ORDER BY 3 DESC;

\echo ''
\echo '=== U8. DRUG / 규제상품 offer 를 distribution_type 별로 ==='
SELECT spo.distribution_type,
       count(*) FILTER (WHERE pm.regulatory_type = 'DRUG')        AS drug_offers,
       count(*) FILTER (WHERE pc.is_regulated IS TRUE)            AS regulated_cat_offers,
       count(*) FILTER (WHERE pm.regulatory_type='DRUG' AND spo.is_active) AS drug_active
FROM supplier_product_offers spo
JOIN product_masters pm ON pm.id = spo.master_id
LEFT JOIN product_categories pc ON pc.id = pm.category_id
GROUP BY 1 ORDER BY 2 DESC;

\echo ''
\echo '=== U9. 비약국 service_key 에 연결된 DRUG offer ==='
SELECT k.service_key,
       coalesce(sap.is_pharmacy_target_service,false) AS is_pharmacy_service,
       count(*) AS drug_offers
FROM supplier_product_offers spo
JOIN product_masters pm ON pm.id = spo.master_id
CROSS JOIN LATERAL unnest(coalesce(spo.service_keys, '{}'::text[])) AS k(service_key)
LEFT JOIN service_audience_policies sap ON sap.service_key = k.service_key
WHERE pm.regulatory_type = 'DRUG'
GROUP BY 1,2 ORDER BY 3 DESC;

\echo ''
\echo '=== U10-a. DRUG 참조 공개 랜딩 (product_landings) ==='
SELECT coalesce(pl.status,'(NULL)') AS status,
       coalesce(pl.exposure_state,'(NULL)') AS exposure_state,
       count(*) AS cnt
FROM product_landings pl
JOIN product_masters pm ON pm.id = pl.product_master_id
WHERE pm.regulatory_type = 'DRUG' AND pl.deleted_at IS NULL
GROUP BY 1,2 ORDER BY 3 DESC;

\echo ''
\echo '=== U10-b. DRUG 참조 SPD (매장 설명서) — service/type 별 ==='
SELECT coalesce(spd.description_type,'(NULL)') AS description_type,
       coalesce(spd.status,'(NULL)')           AS status,
       count(*) AS cnt
FROM shared_product_descriptions spd
JOIN product_masters pm ON pm.id = spd.master_id
WHERE pm.regulatory_type = 'DRUG' AND spd.deleted_at IS NULL
GROUP BY 1,2 ORDER BY 3 DESC;

\echo ''
\echo '=== U11. DRUG commerce 흔적 (장바구니 — master 직접참조 + listing 경유) ==='
SELECT
  count(*) FILTER (WHERE pm_direct.regulatory_type = 'DRUG') AS drug_by_master_ref,
  count(*) FILTER (WHERE pm_listing.regulatory_type = 'DRUG') AS drug_by_listing_ref
FROM store_cart_items sci
LEFT JOIN product_masters pm_direct ON pm_direct.id = sci.product_master_id
LEFT JOIN organization_product_listings opl ON opl.id = sci.organization_product_listing_id
LEFT JOIN product_masters pm_listing ON pm_listing.id = opl.master_id;

\echo ''
\echo '=== U12. 현행 gate(is_regulated) 가 놓치는 DRUG 모수 ==='
SELECT
  count(*) AS drug_total,
  count(*) FILTER (WHERE pc.is_regulated IS TRUE)     AS gate_covers,
  count(*) FILTER (WHERE pc.is_regulated IS NOT TRUE) AS gate_misses,
  round(100.0 * count(*) FILTER (WHERE pc.is_regulated IS NOT TRUE) / nullif(count(*),0), 2) AS pct_missed
FROM product_masters pm
LEFT JOIN product_categories pc ON pc.id = pm.category_id
WHERE pm.regulatory_type = 'DRUG';

\echo ''
\echo '=== DONE (read-only) ==='
