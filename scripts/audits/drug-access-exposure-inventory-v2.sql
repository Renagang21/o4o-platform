-- =============================================================================
-- WO-O4O-DRUG-ACCESS-POLICY-DECISION-AND-LIVE-EXPOSURE-AUDIT-V1
-- 의약품 접근정책 — 현행 게이트 누락 + 비약국 서비스 노출 규모 read-only 실측 (U1~U14)
--
-- READ-ONLY 전용. INSERT/UPDATE/DELETE/DDL 을 포함하지 않는다.
-- v1(drug-access-exposure-inventory.sql) 의 U1~U12 를 U1~U14 로 확장했다.
--
-- 사용:
--   ./bin/cloud-sql-proxy-v2.exe --token "$(gcloud auth print-access-token)" \
--     --port 5461 netureyoutube:asia-northeast3:o4o-platform-db
--   psql -h 127.0.0.1 -p 5461 -U "$DB_USERNAME" -d o4o_platform -X \
--     -f scripts/audits/drug-access-exposure-inventory-v2.sql
--   (한글 주석 때문에 psql -c 인라인 대신 -f 로 실행할 것)
--
-- 판정축: 의약품 SSOT = product_masters.regulatory_type='DRUG'.
--         product_categories.is_regulated 는 보조 감사 신호일 뿐 판정 기준이 아니다.
--
-- 스키마 주의:
--   - store_local_products 에는 master/product_master 참조 컬럼이 없다 (barcode 만 존재).
--   - signage_media / signage_playlists 는 camelCase("organizationId","serviceKey").
--   - checkout_orders.items 는 JSONB (별도 order_items 테이블 없음).
--   - store_qr_codes 는 landing_type/landing_target_id 다형 참조 (master 직접 참조 없음).
--
-- 출력은 aggregate 전용. 개인정보·주문자·콘텐츠 전문을 출력하지 않는다.
-- =============================================================================

SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;
\pset pager off

\echo ''
\echo '=== U1. service_audience_policies 전체 행 ==='
SELECT service_key, is_pharmacy_target_service, updated_at
FROM service_audience_policies ORDER BY service_key;

\echo ''
\echo '=== U2. regulatory_type 분포 (DRUG 모수) ==='
SELECT coalesce(regulatory_type,'(NULL)') AS regulatory_type, count(*) AS cnt
FROM product_masters GROUP BY 1 ORDER BY 2 DESC;

\echo ''
\echo '=== U3. DRUG 중 category_id IS NULL ==='
SELECT count(*) AS drug_total,
       count(*) FILTER (WHERE category_id IS NULL) AS category_null,
       round(100.0*count(*) FILTER (WHERE category_id IS NULL)/nullif(count(*),0),2) AS pct_null
FROM product_masters WHERE regulatory_type='DRUG';

\echo ''
\echo '=== U4. DRUG 중 category.is_regulated 가 false/NULL ==='
SELECT count(*) AS drug_total,
       count(*) FILTER (WHERE pc.id IS NULL) AS no_category_row,
       count(*) FILTER (WHERE pc.is_regulated IS NOT TRUE) AS cat_not_regulated,
       round(100.0*count(*) FILTER (WHERE pc.is_regulated IS NOT TRUE)/nullif(count(*),0),2) AS pct
FROM product_masters pm LEFT JOIN product_categories pc ON pc.id=pm.category_id
WHERE pm.regulatory_type='DRUG';

\echo ''
\echo '=== U5. regulatory_type x drug_category 분포/불일치 ==='
SELECT coalesce(regulatory_type,'(NULL)') AS regulatory_type,
       coalesce(drug_category,'(NULL)') AS drug_category, count(*) AS cnt
FROM product_masters GROUP BY 1,2 ORDER BY 1,3 DESC;

\echo ''
\echo '=== U6. DRUG SupplierProductOffer — 공개상태별 ==='
SELECT spo.distribution_type, spo.approval_status, spo.is_public, spo.is_active, count(*) AS cnt
FROM supplier_product_offers spo JOIN product_masters pm ON pm.id=spo.master_id
WHERE pm.regulatory_type='DRUG'
GROUP BY 1,2,3,4 ORDER BY 5 DESC;

\echo ''
\echo '=== U6-b. 전체 offer 대비 DRUG offer 비중 (모수 확인) ==='
SELECT count(*) AS all_offers,
       count(*) FILTER (WHERE pm.regulatory_type='DRUG') AS drug_offers,
       count(*) FILTER (WHERE pm.regulatory_type='QUASI_DRUG') AS quasi_offers
FROM supplier_product_offers spo JOIN product_masters pm ON pm.id=spo.master_id;

\echo ''
\echo '=== U7. DRUG offer 의 serviceKeys=[] / 비약국 key 연결 ==='
SELECT
  count(*) AS drug_offers,
  count(*) FILTER (WHERE spo.service_keys IS NULL OR cardinality(spo.service_keys)=0) AS empty_service_keys,
  count(*) FILTER (WHERE spo.is_public) AS is_public_true
FROM supplier_product_offers spo JOIN product_masters pm ON pm.id=spo.master_id
WHERE pm.regulatory_type='DRUG';

\echo ''
\echo '=== U7-b. DRUG offer serviceKey 별 (약국여부 판정 포함) ==='
SELECT k.service_key, coalesce(sap.is_pharmacy_target_service,false) AS is_pharmacy_service, count(*) AS drug_offers
FROM supplier_product_offers spo
JOIN product_masters pm ON pm.id=spo.master_id
CROSS JOIN LATERAL unnest(coalesce(spo.service_keys,'{}'::text[])) AS k(service_key)
LEFT JOIN service_audience_policies sap ON sap.service_key=k.service_key
WHERE pm.regulatory_type='DRUG' GROUP BY 1,2 ORDER BY 3 DESC;

\echo ''
\echo '=== U8. DRUG OrganizationProductListing — service_key x active ==='
SELECT opl.service_key, opl.is_active, count(*) AS listings, count(DISTINCT opl.organization_id) AS orgs
FROM organization_product_listings opl JOIN product_masters pm ON pm.id=opl.master_id
WHERE pm.regulatory_type='DRUG' GROUP BY 1,2 ORDER BY 3 DESC;

\echo ''
\echo '=== U9. 비약국 서비스의 DRUG OPL ==='
SELECT opl.service_key, coalesce(sap.is_pharmacy_target_service,false) AS is_pharmacy_service,
       count(*) AS listings, count(*) FILTER (WHERE opl.is_active) AS active_listings,
       count(*) FILTER (WHERE opl.offer_id IS NULL) AS without_offer
FROM organization_product_listings opl
JOIN product_masters pm ON pm.id=opl.master_id
LEFT JOIN service_audience_policies sap ON sap.service_key=opl.service_key
WHERE pm.regulatory_type='DRUG' AND coalesce(sap.is_pharmacy_target_service,false)=false
GROUP BY 1,2 ORDER BY 3 DESC;

\echo ''
\echo '=== U10-a. StoreLocalProduct — ProductMaster 참조 컬럼 존재 여부 (구조 확인) ==='
SELECT count(*) AS master_ref_columns
FROM information_schema.columns
WHERE table_schema='public' AND table_name='store_local_products'
  AND column_name ~* 'master|product_master';

\echo ''
\echo '=== U10-b. StoreLocalProduct 총계 (조직 기준) ==='
SELECT count(*) AS total_local_products,
       count(*) FILTER (WHERE is_active) AS active,
       count(DISTINCT organization_id) AS orgs
FROM store_local_products;

\echo ''
\echo '=== U10-c. StoreLocalProduct barcode 가 DRUG master barcode 와 일치 (간접 신호) ==='
SELECT count(*) AS local_products_matching_drug_barcode
FROM store_local_products slp
JOIN product_masters pm ON pm.barcode = slp.barcode AND pm.regulatory_type='DRUG'
WHERE slp.barcode IS NOT NULL AND slp.barcode <> '';

\echo ''
\echo '=== U11-a. DRUG 콘텐츠 연결 (kpa_store_content_product_links) ==='
SELECT l.link_type, l.product_source_type, count(*) AS links, count(DISTINCT l.organization_id) AS orgs
FROM kpa_store_content_product_links l JOIN product_masters pm ON pm.id=l.master_id
WHERE pm.regulatory_type='DRUG' GROUP BY 1,2 ORDER BY 3 DESC;

\echo ''
\echo '=== U11-b. DRUG 태블릿 노출 (store_tablet_displays) ==='
SELECT d.product_type, count(*) AS displays
FROM store_tablet_displays d JOIN product_masters pm ON pm.id=d.product_id
WHERE pm.regulatory_type='DRUG' GROUP BY 1 ORDER BY 2 DESC;

\echo ''
\echo '=== U11-c. DRUG 공개 랜딩 (product_landings) x drug_category ==='
SELECT coalesce(pm.drug_category,'(NULL)') AS drug_category, pl.status, pl.exposure_state, count(*) AS landings
FROM product_landings pl JOIN product_masters pm ON pm.id=pl.product_master_id
WHERE pm.regulatory_type='DRUG' AND pl.deleted_at IS NULL
GROUP BY 1,2,3 ORDER BY 4 DESC;

\echo ''
\echo '=== U11-d. DRUG SPD (매장 설명서) status 별 ==='
SELECT spd.description_type, spd.status, count(*) AS cnt, count(DISTINCT spd.master_id) AS masters
FROM shared_product_descriptions spd JOIN product_masters pm ON pm.id=spd.master_id
WHERE pm.regulatory_type='DRUG' AND spd.deleted_at IS NULL
GROUP BY 1,2 ORDER BY 3 DESC;

\echo ''
\echo '=== U11-e. DRUG 전역 AI 콘텐츠/태그 (product_ai_contents / product_ai_tags) ==='
SELECT 'product_ai_contents' AS tbl, count(*) AS rows_cnt, count(DISTINCT c.product_id) AS masters
FROM product_ai_contents c JOIN product_masters pm ON pm.id=c.product_id WHERE pm.regulatory_type='DRUG'
UNION ALL
SELECT 'product_ai_tags', count(*), count(DISTINCT t.product_id)
FROM product_ai_tags t JOIN product_masters pm ON pm.id=t.product_id WHERE pm.regulatory_type='DRUG';

\echo ''
\echo '=== U11-f. DRUG service_products (서비스별 상품 노출 축) ==='
SELECT sp.service_key, sp.status, sp.visibility, count(*) AS cnt
FROM service_products sp JOIN product_masters pm ON pm.id=sp.master_id
WHERE pm.regulatory_type='DRUG' GROUP BY 1,2,3 ORDER BY 4 DESC;

\echo ''
\echo '=== U11-g. DRUG store_products / store_product_profiles ==='
SELECT 'store_products' AS tbl, count(*) AS rows_cnt, count(DISTINCT sp.organization_id) AS orgs
FROM store_products sp JOIN product_masters pm ON pm.id=sp.product_master_id WHERE pm.regulatory_type='DRUG'
UNION ALL
SELECT 'store_product_profiles', count(*), NULL
FROM store_product_profiles spp JOIN product_masters pm ON pm.id=spp.master_id WHERE pm.regulatory_type='DRUG';

\echo ''
\echo '=== U11-h. 사이니지/QR 구조 확인 — master 직접참조 컬럼 수 ==='
SELECT table_name, count(*) AS master_ref_columns
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('signage_media','signage_playlists','store_playlists','store_qr_codes','store_pops','store_videos')
  AND column_name ~* 'master|product_master'
GROUP BY 1 ORDER BY 1;

\echo ''
\echo '=== U12-a. DRUG 장바구니 ==='
SELECT count(*) FILTER (WHERE pmd.regulatory_type='DRUG') AS by_master_ref,
       count(*) FILTER (WHERE pml.regulatory_type='DRUG') AS by_listing_ref
FROM store_cart_items sci
LEFT JOIN product_masters pmd ON pmd.id=sci.product_master_id
LEFT JOIN organization_product_listings opl ON opl.id=sci.organization_product_listing_id
LEFT JOIN product_masters pml ON pml.id=opl.master_id;

\echo ''
\echo '=== U12-b. checkout_orders 총계 + items JSONB 내 DRUG master 참조 탐지 ==='
SELECT count(*) AS all_orders,
       count(*) FILTER (WHERE o.status IS NOT NULL) AS with_status
FROM checkout_orders o;

SELECT count(DISTINCT o.id) AS orders_referencing_drug_master
FROM checkout_orders o
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(o.items)='array' THEN o.items ELSE '[]'::jsonb END) AS it
JOIN product_masters pm
  ON pm.id::text IN (
       coalesce(it->>'productMasterId',''), coalesce(it->>'masterId',''), coalesce(it->>'productId','')
     )
WHERE pm.regulatory_type='DRUG';

\echo ''
\echo '=== U13. 현행 gate(is_regulated) 가 놓치는 DRUG ==='
SELECT count(*) AS drug_total,
       count(*) FILTER (WHERE pc.is_regulated IS TRUE) AS gate_covers,
       count(*) FILTER (WHERE pc.is_regulated IS NOT TRUE) AS gate_misses,
       round(100.0*count(*) FILTER (WHERE pc.is_regulated IS NOT TRUE)/nullif(count(*),0),2) AS pct_missed
FROM product_masters pm LEFT JOIN product_categories pc ON pc.id=pm.category_id
WHERE pm.regulatory_type='DRUG';

\echo ''
\echo '=== U14-a. 데이터에 등장하지만 정책 행이 없는 service_key ==='
SELECT d.service_key, coalesce(d.src,'') AS source, d.cnt
FROM (
  SELECT service_key, 'OPL' AS src, count(*) AS cnt FROM organization_product_listings GROUP BY 1
  UNION ALL
  SELECT service_key, 'service_products', count(*) FROM service_products GROUP BY 1
) d
LEFT JOIN service_audience_policies sap ON sap.service_key=d.service_key
WHERE sap.service_key IS NULL
ORDER BY 3 DESC;

\echo ''
\echo '=== U14-b. 정책 행 있는 서비스 vs 실제 DRUG 데이터 보유 ==='
SELECT sap.service_key, sap.is_pharmacy_target_service,
       coalesce(opl.drug_opl,0) AS drug_opl
FROM service_audience_policies sap
LEFT JOIN (
  SELECT opl.service_key, count(*) AS drug_opl
  FROM organization_product_listings opl JOIN product_masters pm ON pm.id=opl.master_id
  WHERE pm.regulatory_type='DRUG' GROUP BY 1
) opl ON opl.service_key=sap.service_key
ORDER BY sap.service_key;

\echo ''
\echo '=== DONE (read-only) ==='
