-- =============================================================================
-- WO-O4O-PRODUCT-TEST-DATA-TARGETED-PURGE-V1
-- O4O 상품 테스트 데이터 — 대상 product_master_id 기준 제한 삭제 (targeted purge)
-- =============================================================================
--
-- 방향 (2026-06-20 변경):
--   대상 상품이 소수(10개 이하)이므로 전체 product_masters 초기화가 아니라,
--   명시 지정한 product_master_id 목록과 그에 연결된 데이터만 삭제한다.
--   → seed/catalog/import/후보/매장 자체상품까지 지워지는 위험 제거.
--
-- 실행 채널:
--   Google Cloud Console > SQL > o4o-platform-db > Query (SQL Editor)
--   (프로덕션 DB는 방화벽으로 로컬 직접 접속 차단 — Console / Cloud Run 에서만 실행)
--
-- 삭제 대상 (대상 상품에 연결된 것만):
--   product_masters(대상) / supplier_product_offers / offer_service_approvals /
--   offer_service_prices / product_approvals / service_products /
--   organization_product_listings / organization_product_channels /
--   product_images / product_identifiers / product_drug_extensions /
--   shared_product_descriptions / store_product_profiles /
--   tablet_interest_requests / product_aliases /
--   product_marketing_assets / product_ai_tags
--
-- 삭제 금지 (행 보존):
--   - 전체 product_masters 삭제 금지 (대상 ID 만)
--   - catalog_products / store_products / product_candidates 삭제 금지
--     → 대상 master 를 가리키던 dead link 컬럼만 NULL 처리 (행은 보존)
--   - 사용자 / 공급자 / 매장 / 조직 / 멤버십 / 권한 데이터
--   - Market Trial / 주문 / 장바구니 / 모집 / 알림 축 (자동 삭제 안 함)
--
-- 안전 설계:
--   - 자식 → 부모 순서 삭제 → 실제 DB FK onDelete 설정과 무관하게 정확.
--   - STEP 2b 는 단일 트랜잭션. 끝의 COMMIT 을 ROLLBACK 으로 바꾸면 시범 실행.
--   - HARD DELETE (soft delete deleted_at 무시).
--
-- =============================================================================


-- =============================================================================
-- [STEP 0] 대상 상품 후보 목록 — 여기서 삭제할 product_masters.id 를 확정한다.
-- =============================================================================
-- product_masters 에는 status / created_by / supplier_id 컬럼이 없다.
-- supplier 는 offer(supplier_product_offers.supplier_id) 쪽 → offer_count 로 연결 규모 확인.
SELECT
  pm.id,
  pm.name,
  pm.brand_name,
  pm.manufacturer_name,
  pm.barcode,
  pm.regulatory_type,
  pm.created_at,
  COUNT(spo.id) AS offer_count
FROM product_masters pm
LEFT JOIN supplier_product_offers spo ON spo.master_id = pm.id
GROUP BY pm.id
ORDER BY pm.created_at DESC;


-- =============================================================================
-- [STEP 1] 전체 규모 참고 count (삭제 판단 아님 — 주변 참조 규모 확인용)
-- =============================================================================
SELECT 'product_masters'                AS table_name, COUNT(*) AS rows FROM product_masters
UNION ALL SELECT 'supplier_product_offers',        COUNT(*) FROM supplier_product_offers
UNION ALL SELECT 'offer_service_approvals',        COUNT(*) FROM offer_service_approvals
UNION ALL SELECT 'offer_service_prices',           COUNT(*) FROM offer_service_prices
UNION ALL SELECT 'product_approvals',              COUNT(*) FROM product_approvals
UNION ALL SELECT 'service_products',               COUNT(*) FROM service_products
UNION ALL SELECT 'organization_product_listings',  COUNT(*) FROM organization_product_listings
UNION ALL SELECT 'organization_product_channels',  COUNT(*) FROM organization_product_channels
UNION ALL SELECT 'product_images',                 COUNT(*) FROM product_images
UNION ALL SELECT 'product_identifiers',            COUNT(*) FROM product_identifiers
UNION ALL SELECT 'product_drug_extensions',        COUNT(*) FROM product_drug_extensions
UNION ALL SELECT 'shared_product_descriptions',    COUNT(*) FROM shared_product_descriptions
UNION ALL SELECT 'store_product_profiles',         COUNT(*) FROM store_product_profiles
UNION ALL SELECT 'tablet_interest_requests',       COUNT(*) FROM tablet_interest_requests
UNION ALL SELECT 'product_aliases',                COUNT(*) FROM product_aliases
UNION ALL SELECT 'product_marketing_assets',       COUNT(*) FROM product_marketing_assets
UNION ALL SELECT 'product_ai_tags',                COUNT(*) FROM product_ai_tags
UNION ALL SELECT '(keep) catalog_products',        COUNT(*) FROM catalog_products
UNION ALL SELECT '(keep) store_products',          COUNT(*) FROM store_products
UNION ALL SELECT '(keep) product_candidates',      COUNT(*) FROM product_candidates
ORDER BY table_name;


-- =============================================================================
-- [STEP 1b] AWARENESS: 삭제 범위 밖 인접 축 (없는 테이블 자동 skip, 근사치)
-- =============================================================================
SELECT relname AS table_name, n_live_tup AS approx_rows
FROM pg_stat_user_tables
WHERE relname IN (
  'store_cart_items', 'neture_orders', 'neture_order_items',
  'checkout_orders', 'checkout_order_logs', 'neture_settlement_orders',
  'store_local_products',
  'neture_partner_recruitments', 'neture_partner_applications', 'partner_applications',
  'market_trials', 'market_trial_participants', 'market_trial_decisions',
  'notifications'
)
ORDER BY relname;


-- =============================================================================
-- [STEP 2a] DRY-RUN: 대상 ID 한정 — 삭제될 행 수 미리 확인 (읽기 전용)
-- =============================================================================
-- 대상 집합 t 정의:
--   기본 = 현재 product_masters 전체 (STEP 0 결과가 전부 테스트 데이터일 때).
--   일부만 지우려면 SELECT 줄을 주석 처리하고 VALUES 줄을 사용.
WITH t(id) AS (
  SELECT id FROM product_masters
  -- 일부만: 위 줄 대신 ↓
  -- VALUES ('00000000-0000-0000-0000-000000000000'::uuid)
  --      , ('11111111-1111-1111-1111-111111111111'::uuid)
),
toff AS (SELECT id FROM supplier_product_offers WHERE master_id IN (SELECT id FROM t)),
tlst AS (SELECT id FROM organization_product_listings
          WHERE master_id IN (SELECT id FROM t) OR offer_id IN (SELECT id FROM toff))
SELECT 'product_masters (대상)'         AS table_name, COUNT(*) AS to_delete FROM product_masters WHERE id IN (SELECT id FROM t)
UNION ALL SELECT 'supplier_product_offers',        COUNT(*) FROM supplier_product_offers WHERE master_id IN (SELECT id FROM t)
UNION ALL SELECT 'offer_service_approvals',        COUNT(*) FROM offer_service_approvals WHERE offer_id IN (SELECT id FROM toff)
UNION ALL SELECT 'offer_service_prices',           COUNT(*) FROM offer_service_prices    WHERE offer_id IN (SELECT id FROM toff)
UNION ALL SELECT 'product_approvals',              COUNT(*) FROM product_approvals       WHERE offer_id IN (SELECT id FROM toff)
UNION ALL SELECT 'service_products',               COUNT(*) FROM service_products        WHERE master_id IN (SELECT id FROM t) OR offer_id IN (SELECT id FROM toff)
UNION ALL SELECT 'organization_product_listings',  COUNT(*) FROM organization_product_listings WHERE id IN (SELECT id FROM tlst)
UNION ALL SELECT 'organization_product_channels',  COUNT(*) FROM organization_product_channels WHERE product_listing_id IN (SELECT id FROM tlst)
UNION ALL SELECT 'product_images',                 COUNT(*) FROM product_images             WHERE master_id IN (SELECT id FROM t)
UNION ALL SELECT 'product_identifiers',            COUNT(*) FROM product_identifiers        WHERE product_master_id IN (SELECT id FROM t)
UNION ALL SELECT 'product_drug_extensions',        COUNT(*) FROM product_drug_extensions    WHERE product_master_id IN (SELECT id FROM t)
UNION ALL SELECT 'shared_product_descriptions',    COUNT(*) FROM shared_product_descriptions WHERE master_id IN (SELECT id FROM t)
UNION ALL SELECT 'store_product_profiles',         COUNT(*) FROM store_product_profiles     WHERE master_id IN (SELECT id FROM t)
UNION ALL SELECT 'tablet_interest_requests',       COUNT(*) FROM tablet_interest_requests   WHERE master_id IN (SELECT id FROM t)
UNION ALL SELECT 'product_aliases',                COUNT(*) FROM product_aliases            WHERE product_master_id IN (SELECT id FROM t)
UNION ALL SELECT 'product_marketing_assets',       COUNT(*) FROM product_marketing_assets   WHERE product_id IN (SELECT id FROM t)
UNION ALL SELECT 'product_ai_tags',                COUNT(*) FROM product_ai_tags            WHERE product_id IN (SELECT id FROM t)
-- 참고: 아래는 삭제 대신 NULL unlink 될 행 수 (행은 보존)
UNION ALL SELECT '(unlink) catalog_products',      COUNT(*) FROM catalog_products    WHERE product_master_id IN (SELECT id FROM t)
UNION ALL SELECT '(unlink) store_products',        COUNT(*) FROM store_products      WHERE product_master_id IN (SELECT id FROM t)
UNION ALL SELECT '(unlink) product_candidates',    COUNT(*) FROM product_candidates  WHERE matched_product_master_id IN (SELECT id FROM t)
ORDER BY table_name;


-- =============================================================================
-- [STEP 2b] EXECUTE: 대상 ID 한정 삭제 (단일 트랜잭션 — 전체 블록을 한 번에 실행)
-- =============================================================================
-- 시범 실행: 맨 끝 COMMIT 을 ROLLBACK 으로 바꿔 실행하면 삭제 없이 검증만 가능.
-- -----------------------------------------------------------------------------
BEGIN;

-- 대상 ID 고정 (한 곳에서만 관리) — STEP 2a 와 동일한 대상 집합을 넣는다.
CREATE TEMP TABLE tmp_target_masters (id uuid PRIMARY KEY) ON COMMIT DROP;
-- 기본: 현재 product_masters 전체 (전부 테스트 데이터일 때)
INSERT INTO tmp_target_masters (id) SELECT id FROM product_masters;
-- 일부만: 위 줄 대신 ↓
-- INSERT INTO tmp_target_masters (id) VALUES
--     ('00000000-0000-0000-0000-000000000000')
--   , ('11111111-1111-1111-1111-111111111111');

-- 파생 대상 집합
CREATE TEMP TABLE tmp_target_offers ON COMMIT DROP AS
  SELECT id FROM supplier_product_offers WHERE master_id IN (SELECT id FROM tmp_target_masters);
CREATE TEMP TABLE tmp_target_listings ON COMMIT DROP AS
  SELECT id FROM organization_product_listings
   WHERE master_id IN (SELECT id FROM tmp_target_masters)
      OR offer_id  IN (SELECT id FROM tmp_target_offers);

-- Level A: offer / listing 의 자식
DELETE FROM offer_service_approvals     WHERE offer_id IN (SELECT id FROM tmp_target_offers);
DELETE FROM offer_service_prices        WHERE offer_id IN (SELECT id FROM tmp_target_offers);
DELETE FROM product_approvals           WHERE offer_id IN (SELECT id FROM tmp_target_offers);
DELETE FROM organization_product_channels WHERE product_listing_id IN (SELECT id FROM tmp_target_listings);

-- Level B: master/offer 참조 (listing → service_product)
DELETE FROM organization_product_listings WHERE id IN (SELECT id FROM tmp_target_listings);
DELETE FROM service_products             WHERE master_id IN (SELECT id FROM tmp_target_masters)
                                            OR offer_id  IN (SELECT id FROM tmp_target_offers);

-- Level C: supplier offer (master 에 RESTRICT — master 보다 먼저)
DELETE FROM supplier_product_offers     WHERE id IN (SELECT id FROM tmp_target_offers);

-- Level D: master 직속 자식 (FK)
DELETE FROM product_images              WHERE master_id IN (SELECT id FROM tmp_target_masters);
DELETE FROM product_identifiers         WHERE product_master_id IN (SELECT id FROM tmp_target_masters);
DELETE FROM product_drug_extensions     WHERE product_master_id IN (SELECT id FROM tmp_target_masters);
DELETE FROM shared_product_descriptions WHERE master_id IN (SELECT id FROM tmp_target_masters);
DELETE FROM store_product_profiles      WHERE master_id IN (SELECT id FROM tmp_target_masters);
DELETE FROM tablet_interest_requests    WHERE master_id IN (SELECT id FROM tmp_target_masters);

-- Level E: master 논리 참조 (FK 아님 — 명시 삭제)
DELETE FROM product_aliases             WHERE product_master_id IN (SELECT id FROM tmp_target_masters);
DELETE FROM product_marketing_assets    WHERE product_id IN (SELECT id FROM tmp_target_masters);
DELETE FROM product_ai_tags             WHERE product_id IN (SELECT id FROM tmp_target_masters);

-- 보존 테이블: dead link 만 NULL unlink (행 삭제 아님 — NO-ACTION FK 여도 안전)
UPDATE catalog_products   SET product_master_id = NULL         WHERE product_master_id IN (SELECT id FROM tmp_target_masters);
UPDATE store_products     SET product_master_id = NULL         WHERE product_master_id IN (SELECT id FROM tmp_target_masters);
UPDATE product_candidates SET matched_product_master_id = NULL WHERE matched_product_master_id IN (SELECT id FROM tmp_target_masters);

-- Level F: 원장 (대상만)
DELETE FROM product_masters             WHERE id IN (SELECT id FROM tmp_target_masters);

COMMIT;
