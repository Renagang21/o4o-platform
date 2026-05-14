-- =============================================================================
-- O4O Platform Reset Dry-Run Script — V1
-- WO-O4O-PLATFORM-RESET-DRYRUN-SCRIPT-V1
-- =============================================================================
--
-- CRITICAL: 이 파일의 모든 TRUNCATE/DELETE 구문은 주석 처리되어 있습니다.
--           실행 전 반드시 사용자 승인 + 백업 확인 후 주석 해제하십시오.
--           dry-run 확인 방법: 각 SELECT COUNT(*) 블록을 순서대로 실행하여
--           영향 범위를 파악한 뒤 승인 여부를 결정하십시오.
--
-- 목적: Option B — 운영 데이터 선택적 초기화 + canonical bootstrap seed 재실행
-- 보존: typeorm_migrations, schema 구조, GCS 파일 메타(별도 처리)
-- 복구: BootstrapCanonicalSeedAccounts migration 자동 재실행 (CI/CD)
--
-- 작성일: 2026-05-14
-- 참조: docs/reset/O4O-PLATFORM-RESET-EXECUTION-PLAN-V1.md
-- =============================================================================

-- ---------------------------------------------------------------------------
-- [STEP 0] 사전 안전 점검 SELECT (DRY-RUN 전용)
-- 실제 리셋 전 반드시 아래 SELECT를 실행하여 카운트를 기록하십시오.
-- ---------------------------------------------------------------------------

-- 전체 사용자 수
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users;

-- Bootstrap 계정 존재 여부 (리셋 후 복구 기준)
SELECT email, created_at
FROM users
WHERE id LIKE 'b0000000-b000-4000-b000-%'
ORDER BY email;

-- migration history (절대 삭제 금지)
SELECT COUNT(*) AS migration_count FROM typeorm_migrations;
SELECT name, timestamp FROM typeorm_migrations ORDER BY timestamp DESC LIMIT 10;

-- FK 제약 위반 가능성 점검: neture_suppliers weak FK
SELECT COUNT(*) AS orphan_neture_suppliers
FROM neture_suppliers ns
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ns.user_id::uuid);

-- FK 제약 위반 가능성 점검: credit_balances weak FK
SELECT COUNT(*) AS orphan_credit_balances
FROM credit_balances cb
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id::text = cb.user_id);

-- 활성 서비스 멤버십 수
SELECT service_key, status, COUNT(*) AS cnt
FROM service_memberships
GROUP BY service_key, status
ORDER BY service_key, status;

-- KPA members vs service_memberships 정합성 확인
SELECT
  sm.status AS sm_status,
  km.status AS km_status,
  COUNT(*) AS cnt
FROM service_memberships sm
LEFT JOIN kpa_members km ON km.user_id = sm.user_id
WHERE sm.service_key IN ('kpa-society', 'kpa')
GROUP BY sm.status, km.status;

-- Neture 공급자/상품 현황
SELECT COUNT(*) AS neture_suppliers FROM neture_suppliers;
SELECT COUNT(*) AS product_masters FROM product_masters;
SELECT COUNT(*) AS supplier_product_offers FROM supplier_product_offers;

-- 주문 현황
SELECT COUNT(*) AS orders FROM orders;
SELECT COUNT(*) AS payments FROM payments;


-- ---------------------------------------------------------------------------
-- [STEP 1] 중요 데이터 백업 임시 테이블 생성 (선택사항, 리셋 전 권장)
-- ---------------------------------------------------------------------------

-- (OPTIONAL) Bootstrap 계정 백업 — 리셋 후 복구 불필요하나 참고용
-- CREATE TABLE _backup_bootstrap_users AS
--   SELECT * FROM users WHERE id LIKE 'b0000000-b000-4000-b000-%';

-- (OPTIONAL) migration history 백업 — 절대 원본 삭제 금지
-- CREATE TABLE _backup_typeorm_migrations AS
--   SELECT * FROM typeorm_migrations;


-- ---------------------------------------------------------------------------
-- [STEP 2] 리셋 영향 범위 시뮬레이션 (COUNT 확인용)
-- 모든 카운트를 실행 전 기록하십시오.
-- ---------------------------------------------------------------------------

-- === A. Commerce & Order ===
SELECT 'order_items'              AS tbl, COUNT(*) FROM order_items
UNION ALL SELECT 'payments',               COUNT(*) FROM payments
UNION ALL SELECT 'orders',                 COUNT(*) FROM orders
UNION ALL SELECT 'store_products',         COUNT(*) FROM store_products
UNION ALL SELECT 'store_events',           COUNT(*) FROM store_events
UNION ALL SELECT 'cart_items',             COUNT(*) FROM cart_items
UNION ALL SELECT 'carts',                  COUNT(*) FROM carts;

-- === B. Users & Auth ===
SELECT 'refresh_tokens'           AS tbl, COUNT(*) FROM refresh_tokens
UNION ALL SELECT 'linking_sessions',       COUNT(*) FROM linking_sessions
UNION ALL SELECT 'role_assignments',       COUNT(*) FROM role_assignments
UNION ALL SELECT 'service_memberships',    COUNT(*) FROM service_memberships
UNION ALL SELECT 'users',                  COUNT(*) FROM users;

-- === C. KPA Domain ===
SELECT 'kpa_pharmacist_profiles'  AS tbl, COUNT(*) FROM kpa_pharmacist_profiles
UNION ALL SELECT 'kpa_members',            COUNT(*) FROM kpa_members
UNION ALL SELECT 'kpa_store_contents',     COUNT(*) FROM kpa_store_contents;

-- === D. Neture Domain ===
SELECT 'neture_orders'            AS tbl, COUNT(*) FROM neture_orders
UNION ALL SELECT 'supplier_product_offers', COUNT(*) FROM supplier_product_offers
UNION ALL SELECT 'product_masters',         COUNT(*) FROM product_masters
UNION ALL SELECT 'neture_suppliers',        COUNT(*) FROM neture_suppliers
UNION ALL SELECT 'credit_balances',         COUNT(*) FROM credit_balances
UNION ALL SELECT 'credit_transactions',     COUNT(*) FROM credit_transactions;

-- === E. GlycoPharm Domain ===
SELECT 'glycopharm_members'       AS tbl, COUNT(*) FROM glycopharm_members
UNION ALL SELECT 'glycopharm_products',    COUNT(*) FROM glycopharm_products
UNION ALL SELECT 'glyco_pharmacy_products', COUNT(*) FROM glyco_pharmacy_products;

-- === F. K-Cosmetics (cosmetics schema) ===
SELECT 'cosmetics.products'       AS tbl, COUNT(*) FROM cosmetics.products
UNION ALL SELECT 'cosmetics.orders',       COUNT(*) FROM cosmetics.orders
UNION ALL SELECT 'cosmetics.store_products', COUNT(*) FROM cosmetics.store_products;

-- === G. LMS ===
SELECT 'lms_enrollments'          AS tbl, COUNT(*) FROM lms_enrollments
UNION ALL SELECT 'lms_lesson_progress',   COUNT(*) FROM lms_lesson_progress
UNION ALL SELECT 'lms_lessons',           COUNT(*) FROM lms_lessons
UNION ALL SELECT 'lms_courses',           COUNT(*) FROM lms_courses;

-- === H. Forum ===
SELECT 'forum_posts'              AS tbl, COUNT(*) FROM forum_posts
UNION ALL SELECT 'forum_category_requests', COUNT(*) FROM forum_category_requests
UNION ALL SELECT 'forum_categories',        COUNT(*) FROM forum_categories;

-- === I. Signage ===
SELECT 'signage_schedule_items'   AS tbl, COUNT(*) FROM signage_schedule_items
UNION ALL SELECT 'signage_schedules',      COUNT(*) FROM signage_schedules
UNION ALL SELECT 'signage_playlist_items', COUNT(*) FROM signage_playlist_items
UNION ALL SELECT 'signage_playlists',      COUNT(*) FROM signage_playlists
UNION ALL SELECT 'signage_displays',       COUNT(*) FROM signage_displays;

-- === J. Content / CMS ===
SELECT 'cms_pages'                AS tbl, COUNT(*) FROM cms_pages
UNION ALL SELECT 'posts',                  COUNT(*) FROM posts
UNION ALL SELECT 'content_hubs',           COUNT(*) FROM content_hubs;

-- === K. Market Trial ===
SELECT 'market_trial_participants' AS tbl, COUNT(*) FROM market_trial_participants
UNION ALL SELECT 'market_trials',          COUNT(*) FROM market_trials;

-- === L. Care ===
SELECT 'care_records'             AS tbl, COUNT(*) FROM care_records
UNION ALL SELECT 'care_plans',             COUNT(*) FROM care_plans;

-- === M. Partner ===
SELECT 'partner_contracts'        AS tbl, COUNT(*) FROM partner_contracts
UNION ALL SELECT 'partner_commissions',    COUNT(*) FROM partner_commissions;


-- ---------------------------------------------------------------------------
-- [STEP 3] 실제 TRUNCATE/DELETE 블록 (전부 주석 처리됨 — 승인 후 해제)
-- FK 안전 순서: leaf tables → parent tables
-- CASCADE DELETE를 활용하여 순서를 간소화
-- ---------------------------------------------------------------------------

-- === BEGIN TRANSACTION (리셋 시 반드시 트랜잭션 내 실행) ===
-- BEGIN;

-- -----------------------------------------------------------------------
-- GROUP 1: Commerce leaf tables (order 전에 정리)
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE order_items CASCADE;
-- TRUNCATE TABLE payments CASCADE;
-- TRUNCATE TABLE orders CASCADE;
-- TRUNCATE TABLE cart_items CASCADE;
-- TRUNCATE TABLE carts CASCADE;
-- TRUNCATE TABLE store_events CASCADE;
-- TRUNCATE TABLE store_products CASCADE;

-- -----------------------------------------------------------------------
-- GROUP 2: Auth & Session (users 전에 정리 — CASCADE로 자동 삭제되나 명시적 처리)
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE refresh_tokens CASCADE;
-- TRUNCATE TABLE linking_sessions CASCADE;

-- -----------------------------------------------------------------------
-- GROUP 3: KPA Domain leaf tables (kpa_members 전에 정리)
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE kpa_pharmacist_profiles CASCADE;
-- TRUNCATE TABLE kpa_store_contents CASCADE;
-- DELETE FROM kpa_members WHERE user_id NOT IN (
--   SELECT id FROM users WHERE id LIKE 'b0000000-b000-4000-b000-%'
-- );

-- -----------------------------------------------------------------------
-- GROUP 4: Neture Domain
-- 주의: supplier_product_offers → product_masters ON DELETE RESTRICT
--       반드시 offers 먼저 삭제 후 product_masters 삭제
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE neture_orders CASCADE;
-- TRUNCATE TABLE credit_transactions CASCADE;
-- TRUNCATE TABLE credit_balances CASCADE;
-- DELETE FROM supplier_product_offers;   -- RESTRICT FK → 먼저 삭제
-- DELETE FROM product_masters;           -- offers 삭제 후
-- DELETE FROM neture_suppliers;

-- -----------------------------------------------------------------------
-- GROUP 5: GlycoPharm Domain
-- -----------------------------------------------------------------------

-- DELETE FROM glyco_pharmacy_products;
-- DELETE FROM glycopharm_products;
-- DELETE FROM glycopharm_members WHERE deleted_at IS NULL;  -- soft-delete 보유

-- -----------------------------------------------------------------------
-- GROUP 6: K-Cosmetics (separate schema)
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE cosmetics.order_items CASCADE;
-- TRUNCATE TABLE cosmetics.orders CASCADE;
-- TRUNCATE TABLE cosmetics.store_products CASCADE;
-- TRUNCATE TABLE cosmetics.products CASCADE;

-- -----------------------------------------------------------------------
-- GROUP 7: LMS (CASCADE chain: courses → lessons → enrollments/progress)
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE lms_lesson_progress CASCADE;
-- TRUNCATE TABLE lms_enrollments CASCADE;
-- TRUNCATE TABLE lms_lessons CASCADE;
-- TRUNCATE TABLE lms_courses CASCADE;

-- -----------------------------------------------------------------------
-- GROUP 8: Forum
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE forum_posts CASCADE;
-- TRUNCATE TABLE forum_category_requests CASCADE;
-- DELETE FROM forum_categories WHERE is_system = false OR is_system IS NULL;
-- -- 시스템 카테고리(is_system=true) 보존 여부는 운영 판단

-- -----------------------------------------------------------------------
-- GROUP 9: Signage (CASCADE chain: playlists → items → schedule items)
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE signage_schedule_items CASCADE;
-- TRUNCATE TABLE signage_schedules CASCADE;
-- TRUNCATE TABLE signage_playlist_items CASCADE;
-- TRUNCATE TABLE signage_playlists CASCADE;
-- TRUNCATE TABLE signage_displays CASCADE;

-- -----------------------------------------------------------------------
-- GROUP 10: Content / CMS
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE cms_pages CASCADE;
-- TRUNCATE TABLE posts CASCADE;
-- -- content_hubs: 보존 여부 운영 판단 (템플릿 역할 가능)

-- -----------------------------------------------------------------------
-- GROUP 11: Market Trial
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE market_trial_participants CASCADE;
-- TRUNCATE TABLE market_trials CASCADE;

-- -----------------------------------------------------------------------
-- GROUP 12: Care
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE care_records CASCADE;
-- TRUNCATE TABLE care_plans CASCADE;

-- -----------------------------------------------------------------------
-- GROUP 13: Partner
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE partner_commissions CASCADE;
-- TRUNCATE TABLE partner_contracts CASCADE;

-- -----------------------------------------------------------------------
-- GROUP 14: AI / Action Log / Guide
-- (운영 메타데이터 — 보존 여부 운영 판단)
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE ai_usage_logs CASCADE;
-- TRUNCATE TABLE action_logs CASCADE;
-- -- guide_blocks, guide_pages: 시스템 콘텐츠이므로 원칙적으로 보존
-- --   필요 시: DELETE FROM guide_blocks WHERE is_custom = true;

-- -----------------------------------------------------------------------
-- GROUP 15: RBAC & Membership — 마지막 처리
-- Bootstrap 계정 보존을 위해 WHERE 조건 필수
-- -----------------------------------------------------------------------

-- DELETE FROM role_assignments
--   WHERE user_id NOT IN (
--     SELECT id FROM users WHERE id LIKE 'b0000000-b000-4000-b000-%'
--   );

-- DELETE FROM service_memberships
--   WHERE user_id NOT IN (
--     SELECT id FROM users WHERE id LIKE 'b0000000-b000-4000-b000-%'
--   );

-- DELETE FROM organization_members
--   WHERE user_id NOT IN (
--     SELECT id FROM users WHERE id LIKE 'b0000000-b000-4000-b000-%'
--   );

-- -----------------------------------------------------------------------
-- GROUP 16: Users — 최종 처리 (bootstrap 계정 보존)
-- CASCADE DELETE로 연결된 레코드 자동 삭제:
--   role_assignments, refresh_tokens, linking_sessions (CASCADE)
--   neture_suppliers.user_id (weak FK, 선행 삭제 필요)
-- -----------------------------------------------------------------------

-- DELETE FROM users
--   WHERE id NOT LIKE 'b0000000-b000-4000-b000-%';

-- === COMMIT (검증 후 실행) ===
-- COMMIT;
-- === ROLLBACK (문제 발생 시) ===
-- ROLLBACK;


-- ---------------------------------------------------------------------------
-- [STEP 4] 리셋 후 검증 SELECT (post-reset verification)
-- ---------------------------------------------------------------------------

-- Bootstrap 계정 복구 확인
SELECT u.email, sm.service_key, sm.role AS sm_role, ra.role AS ra_role
FROM users u
LEFT JOIN service_memberships sm ON sm.user_id = u.id
LEFT JOIN role_assignments ra ON ra.user_id = u.id AND ra.is_active = true
WHERE u.id LIKE 'b0000000-b000-4000-b000-%'
ORDER BY u.email, sm.service_key;

-- KPA pharmacist1 profile 확인
SELECT u.email, km.status, km.membership_type, kp.license_number
FROM users u
JOIN kpa_members km ON km.user_id = u.id
LEFT JOIN kpa_pharmacist_profiles kp ON kp.user_id = u.id
WHERE u.id = 'b0000000-b000-4000-b000-000000000004';

-- 전체 사용자 수 (bootstrap 8명만 남아야 함)
SELECT COUNT(*) AS remaining_users FROM users;

-- migration history 무결성 확인
SELECT COUNT(*) AS migration_count FROM typeorm_migrations;

-- RBAC 현황
SELECT role, COUNT(*)::int AS cnt
FROM role_assignments
WHERE is_active = true
GROUP BY role
ORDER BY cnt DESC;


-- ---------------------------------------------------------------------------
-- [STEP 5] 시퀀스 리셋 (SERIAL 컬럼 사용 테이블 — 선택사항)
-- TRUNCATE ... RESTART IDENTITY 사용 시 불필요
-- ---------------------------------------------------------------------------

-- SELECT setval(pg_get_serial_sequence('orders', 'id'), 1, false);
-- SELECT setval(pg_get_serial_sequence('payments', 'id'), 1, false);


-- =============================================================================
-- END OF DRY-RUN SCRIPT
-- 실행 전 docs/reset/O4O-PLATFORM-RESET-EXECUTION-PLAN-V1.md 를 반드시 참조
-- =============================================================================
