-- =============================================================================
-- O4O Platform Reset Dry-Run Script — V1 (rev.2: 실제 DB 스키마 반영)
-- WO-O4O-PLATFORM-RESET-DRYRUN-SCRIPT-V1
-- WO-O4O-PLATFORM-RESET-PREFLIGHT-CHECK-V1 에서 수정됨
-- =============================================================================
--
-- CRITICAL: 이 파일의 모든 TRUNCATE/DELETE 구문은 주석 처리되어 있습니다.
--           실행 전 반드시 사용자 승인 + 백업 확인 후 주석 해제하십시오.
--
-- 목적: Option B — 운영 데이터 선택적 초기화 + canonical bootstrap seed 재실행
-- 보존: typeorm_migrations, schema 구조
-- 복구: BootstrapCanonicalSeedAccounts migration 재실행 (typeorm_migrations 항목 제거 필요)
--
-- Preflight 확인 결과 (2026-05-14):
--   총 사용자 58명 | bootstrap UUID 7명(8명 중 1명 old UUID) | migration 479개
--   checkout_orders 5건 | product_masters 123건 | role_assignments 63건
--   Cloud SQL 백업 DISABLED → 수동 백업 필수 (BLOCKER)
--   bootstrap migration already in typeorm_migrations → 별도 삭제 필요 (BLOCKER)
--
-- 참조: docs/reset/O4O-PLATFORM-RESET-EXECUTION-PLAN-V1.md
-- =============================================================================

-- ---------------------------------------------------------------------------
-- [STEP 0] 사전 안전 점검 SELECT
-- ---------------------------------------------------------------------------

-- 전체 사용자 수
SELECT COUNT(*)::int AS total_users FROM users;

-- Bootstrap 계정 존재 여부 (UUID를 text로 캐스팅 필요)
-- WO-O4O-KPA-TEMP-SEED-BOOTSTRAP-DEPRECATION-V1 이후 super-admin (UUID ...000001) 만 정상 존재.
-- UUID ...000002~000008 (kpa-admin/kpa-operator/phamacy1/neture-operator/kcos-admin/
-- kcos-operator/glyco-operator) 는 임시 계정이며 부재가 정상.
SELECT email, id::text AS id, created_at::date AS created
FROM users
WHERE id::text LIKE 'b0000000-b000-4000-b000-%'
ORDER BY email;

-- migration history
SELECT COUNT(*)::int AS migration_count FROM typeorm_migrations;
SELECT name, timestamp FROM typeorm_migrations ORDER BY timestamp DESC LIMIT 10;

-- bootstrap migration 실행 여부 확인
SELECT name FROM typeorm_migrations WHERE name LIKE '%BootstrapCanonical%';

-- FK 점검: neture_suppliers weak FK
SELECT COUNT(*)::int AS orphan_neture_suppliers
FROM neture_suppliers ns
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id::text = ns.user_id::text);

-- FK 점검: credit_balances camelCase userId (실제 컬럼명 확인)
SELECT COUNT(*)::int AS credit_balances_total FROM credit_balances;

-- 서비스 멤버십 현황
SELECT service_key, status, COUNT(*)::int AS cnt
FROM service_memberships
GROUP BY service_key, status
ORDER BY service_key, status;

-- KPA members sync 현황
SELECT sm.status AS sm_status, km.status AS km_status, COUNT(*)::int AS cnt
FROM service_memberships sm
LEFT JOIN kpa_members km ON km.user_id = sm.user_id
WHERE sm.service_key IN ('kpa-society', 'kpa')
GROUP BY sm.status, km.status;

-- Neture 공급자/상품 현황
SELECT COUNT(*)::int AS neture_suppliers FROM neture_suppliers;
SELECT COUNT(*)::int AS product_masters FROM product_masters;
SELECT COUNT(*)::int AS supplier_product_offers FROM supplier_product_offers;

-- 주문 현황 (실제 테이블명: checkout_orders, checkout_payments)
SELECT COUNT(*)::int AS checkout_orders FROM checkout_orders;
SELECT COUNT(*)::int AS checkout_payments FROM checkout_payments;


-- ---------------------------------------------------------------------------
-- [STEP 1] 중요 데이터 백업 임시 테이블 (선택사항)
-- ---------------------------------------------------------------------------

-- (OPTIONAL) Bootstrap 계정 백업
-- CREATE TABLE _backup_bootstrap_users AS
--   SELECT * FROM users WHERE id::text LIKE 'b0000000-b000-4000-b000-%';

-- (OPTIONAL) migration history 백업
-- CREATE TABLE _backup_typeorm_migrations AS
--   SELECT * FROM typeorm_migrations;


-- ---------------------------------------------------------------------------
-- [STEP 2] 리셋 영향 범위 시뮬레이션 (COUNT 확인용)
-- Preflight CHECK로 확인된 실제 테이블명 사용
-- ---------------------------------------------------------------------------

-- === A. Commerce & Order (실제: checkout_orders, checkout_payments) ===
SELECT 'checkout_orders'         AS tbl, COUNT(*)::int AS cnt FROM checkout_orders
UNION ALL SELECT 'checkout_payments',    COUNT(*)::int FROM checkout_payments
UNION ALL SELECT 'checkout_order_logs',  COUNT(*)::int FROM checkout_order_logs
UNION ALL SELECT 'store_products',       COUNT(*)::int FROM store_products
UNION ALL SELECT 'store_events',         COUNT(*)::int FROM store_events
UNION ALL SELECT 'store_local_products', COUNT(*)::int FROM store_local_products;

-- === B. Users & Auth ===
SELECT 'refresh_tokens'          AS tbl, COUNT(*)::int AS cnt FROM refresh_tokens
UNION ALL SELECT 'role_assignments',     COUNT(*)::int FROM role_assignments
UNION ALL SELECT 'service_memberships',  COUNT(*)::int FROM service_memberships
UNION ALL SELECT 'users',                COUNT(*)::int FROM users
UNION ALL SELECT 'organization_members', COUNT(*)::int FROM organization_members
UNION ALL SELECT 'organizations',        COUNT(*)::int FROM organizations;

-- === C. KPA Domain ===
SELECT 'kpa_pharmacist_profiles' AS tbl, COUNT(*)::int AS cnt FROM kpa_pharmacist_profiles
UNION ALL SELECT 'kpa_members',          COUNT(*)::int FROM kpa_members
UNION ALL SELECT 'kpa_store_contents',   COUNT(*)::int FROM kpa_store_contents
UNION ALL SELECT 'kpa_applications',     COUNT(*)::int FROM kpa_applications;

-- === D. Neture Domain (public schema) ===
SELECT 'neture_orders'            AS tbl, COUNT(*)::int AS cnt FROM neture_orders
UNION ALL SELECT 'supplier_product_offers', COUNT(*)::int FROM supplier_product_offers
UNION ALL SELECT 'product_masters',         COUNT(*)::int FROM product_masters
UNION ALL SELECT 'neture_suppliers',        COUNT(*)::int FROM neture_suppliers
UNION ALL SELECT 'credit_balances',         COUNT(*)::int FROM credit_balances
UNION ALL SELECT 'credit_transactions',     COUNT(*)::int FROM credit_transactions;

-- === D-2. Neture schema ===
SELECT 'neture.neture_products'      AS tbl, COUNT(*)::int AS cnt FROM neture.neture_products
UNION ALL SELECT 'neture.neture_order_items', COUNT(*)::int FROM neture.neture_order_items;

-- === E. GlycoPharm Domain ===
SELECT 'glycopharm_members'      AS tbl, COUNT(*)::int AS cnt FROM glycopharm_members
UNION ALL SELECT 'glycopharm_products',    COUNT(*)::int FROM glycopharm_products
UNION ALL SELECT 'glycopharm_pharmacies',  COUNT(*)::int FROM glycopharm_pharmacies;

-- === F. K-Cosmetics (cosmetics schema) ===
SELECT 'cosmetics.cosmetics_products'      AS tbl, COUNT(*)::int AS cnt FROM cosmetics.cosmetics_products
UNION ALL SELECT 'cosmetics.cosmetics_stores',     COUNT(*)::int FROM cosmetics.cosmetics_stores
UNION ALL SELECT 'cosmetics.cosmetics_store_members', COUNT(*)::int FROM cosmetics.cosmetics_store_members;

-- === G. LMS (실제: lms_progress, lms_lessons, lms_courses) ===
SELECT 'lms_enrollments'         AS tbl, COUNT(*)::int AS cnt FROM lms_enrollments
UNION ALL SELECT 'lms_progress',          COUNT(*)::int FROM lms_progress
UNION ALL SELECT 'lms_lessons',           COUNT(*)::int FROM lms_lessons
UNION ALL SELECT 'lms_courses',           COUNT(*)::int FROM lms_courses;

-- === H. Forum (실제: forum_post 단수) ===
SELECT 'forum_post'              AS tbl, COUNT(*)::int AS cnt FROM forum_post
UNION ALL SELECT 'forum_comment',         COUNT(*)::int FROM forum_comment
UNION ALL SELECT 'forum_category_requests', COUNT(*)::int FROM forum_category_requests;

-- === I. Signage ===
SELECT 'signage_schedules'       AS tbl, COUNT(*)::int AS cnt FROM signage_schedules
UNION ALL SELECT 'signage_playlist_items', COUNT(*)::int FROM signage_playlist_items
UNION ALL SELECT 'signage_playlists',      COUNT(*)::int FROM signage_playlists;

-- === J. Market Trial ===
SELECT 'market_trial_participants' AS tbl, COUNT(*)::int AS cnt FROM market_trial_participants
UNION ALL SELECT 'market_trials',          COUNT(*)::int FROM market_trials;

-- === K. AI / Action Log / Guide ===
SELECT 'ai_usage_logs'           AS tbl, COUNT(*)::int AS cnt FROM ai_usage_logs
UNION ALL SELECT 'action_logs',           COUNT(*)::int FROM action_logs
UNION ALL SELECT 'guide_contents',        COUNT(*)::int FROM guide_contents;

-- === L. Product Approvals ===
SELECT 'product_approvals'       AS tbl, COUNT(*)::int AS cnt FROM product_approvals
UNION ALL SELECT 'offer_service_approvals', COUNT(*)::int FROM offer_service_approvals;

-- === M. Partner / Settlement ===
SELECT 'partner_commissions'     AS tbl, COUNT(*)::int AS cnt FROM partner_commissions
UNION ALL SELECT 'partner_referrals',     COUNT(*)::int FROM partner_referrals
UNION ALL SELECT 'neture_seller_partner_contracts', COUNT(*)::int FROM neture_seller_partner_contracts;


-- ---------------------------------------------------------------------------
-- [STEP 3] 실제 TRUNCATE/DELETE 블록 (전부 주석 처리됨 — 승인 후 해제)
-- FK 안전 순서: leaf tables → parent tables
-- ---------------------------------------------------------------------------

-- === BEGIN TRANSACTION ===
-- BEGIN;

-- -----------------------------------------------------------------------
-- [PRE-RESET] Bootstrap migration 재실행 허용 — typeorm_migrations에서 제거
-- 주의: 이 항목 제거 후 CI/CD 배포 시 bootstrap migration이 재실행됨 (안전)
-- -----------------------------------------------------------------------

-- DELETE FROM typeorm_migrations
--   WHERE name = 'BootstrapCanonicalSeedAccounts20260927100000';

-- -----------------------------------------------------------------------
-- GROUP 1: Commerce leaf tables
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE checkout_order_logs CASCADE;
-- TRUNCATE TABLE checkout_payments CASCADE;
-- TRUNCATE TABLE checkout_orders CASCADE;
-- TRUNCATE TABLE store_local_products CASCADE;
-- TRUNCATE TABLE store_events CASCADE;
-- TRUNCATE TABLE store_products CASCADE;

-- -----------------------------------------------------------------------
-- GROUP 2: Auth & Session
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE refresh_tokens CASCADE;
-- TRUNCATE TABLE login_attempts CASCADE;

-- -----------------------------------------------------------------------
-- GROUP 3: KPA Domain
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE kpa_pharmacist_profiles CASCADE;
-- TRUNCATE TABLE kpa_store_contents CASCADE;
-- TRUNCATE TABLE kpa_applications CASCADE;
-- DELETE FROM kpa_members WHERE user_id::text NOT IN (
--   SELECT id::text FROM users WHERE id::text LIKE 'b0000000-b000-4000-b000-%'
-- );

-- -----------------------------------------------------------------------
-- GROUP 4: Neture Domain
-- 주의: supplier_product_offers → product_masters ON DELETE RESTRICT
--       반드시 offers 먼저 삭제
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE neture_orders CASCADE;
-- TRUNCATE TABLE credit_transactions CASCADE;
-- TRUNCATE TABLE credit_balances CASCADE;
-- DELETE FROM supplier_product_offers;            -- RESTRICT → 먼저 삭제
-- DELETE FROM neture.neture_order_items;
-- DELETE FROM neture.neture_products;
-- DELETE FROM product_masters;                    -- offers 삭제 후
-- DELETE FROM neture_suppliers;

-- -----------------------------------------------------------------------
-- GROUP 5: GlycoPharm Domain
-- -----------------------------------------------------------------------

-- DELETE FROM glycopharm_products;
-- DELETE FROM glycopharm_pharmacies;
-- DELETE FROM glycopharm_members;

-- -----------------------------------------------------------------------
-- GROUP 6: K-Cosmetics (cosmetics schema)
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE cosmetics.cosmetics_store_members CASCADE;
-- DELETE FROM cosmetics.cosmetics_store_playlists;
-- DELETE FROM cosmetics.cosmetics_store_playlist_items;
-- DELETE FROM cosmetics.cosmetics_stores;
-- DELETE FROM cosmetics.cosmetics_products;

-- -----------------------------------------------------------------------
-- GROUP 7: LMS
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE lms_progress CASCADE;
-- TRUNCATE TABLE lms_enrollments CASCADE;
-- TRUNCATE TABLE lms_lessons CASCADE;
-- TRUNCATE TABLE lms_courses CASCADE;

-- -----------------------------------------------------------------------
-- GROUP 8: Forum
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE forum_post_like CASCADE;
-- TRUNCATE TABLE forum_like CASCADE;
-- TRUNCATE TABLE forum_comment CASCADE;
-- TRUNCATE TABLE forum_post CASCADE;
-- TRUNCATE TABLE forum_category_requests CASCADE;
-- DELETE FROM forum_category_members;
-- -- forum_bookmark: 보존 여부 판단

-- -----------------------------------------------------------------------
-- GROUP 9: Signage
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE signage_playlist_items CASCADE;
-- TRUNCATE TABLE signage_playlists CASCADE;
-- TRUNCATE TABLE signage_schedules CASCADE;

-- -----------------------------------------------------------------------
-- GROUP 10: Market Trial
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE market_trial_participants CASCADE;
-- TRUNCATE TABLE market_trials CASCADE;

-- -----------------------------------------------------------------------
-- GROUP 11: AI / Action Log
-- (운영 로그 — 보존 여부 운영 판단)
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE ai_usage_logs CASCADE;
-- TRUNCATE TABLE action_logs CASCADE;
-- -- guide_contents: 시스템 콘텐츠 → 보존 권장

-- -----------------------------------------------------------------------
-- GROUP 12: Product Approvals
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE offer_service_approvals CASCADE;
-- TRUNCATE TABLE product_approvals CASCADE;

-- -----------------------------------------------------------------------
-- GROUP 13: Partner / Settlement
-- -----------------------------------------------------------------------

-- TRUNCATE TABLE partner_commissions CASCADE;
-- TRUNCATE TABLE partner_referrals CASCADE;
-- DELETE FROM neture_seller_partner_contracts;

-- -----------------------------------------------------------------------
-- GROUP 14: Organizations (멤버 삭제 후)
-- -----------------------------------------------------------------------

-- DELETE FROM organization_members
--   WHERE user_id::text NOT IN (
--     SELECT id::text FROM users WHERE id::text LIKE 'b0000000-b000-4000-b000-%'
--   );
-- -- organizations: 보존 여부 판단 (KPA 조직 구조 등 시스템 데이터 포함 가능)

-- -----------------------------------------------------------------------
-- GROUP 15: RBAC & Membership
-- -----------------------------------------------------------------------

-- DELETE FROM role_assignments
--   WHERE user_id::text NOT IN (
--     SELECT id::text FROM users WHERE id::text LIKE 'b0000000-b000-4000-b000-%'
--   );

-- DELETE FROM service_memberships
--   WHERE user_id::text NOT IN (
--     SELECT id::text FROM users WHERE id::text LIKE 'b0000000-b000-4000-b000-%'
--   );

-- -----------------------------------------------------------------------
-- GROUP 16: Users — 최종 처리 (bootstrap 계정 보존)
-- CASCADE DELETE: role_assignments, refresh_tokens (CASCADE)
-- -----------------------------------------------------------------------

-- DELETE FROM users
--   WHERE id::text NOT LIKE 'b0000000-b000-4000-b000-%';

-- === COMMIT ===
-- COMMIT;
-- === ROLLBACK (문제 발생 시) ===
-- ROLLBACK;


-- ---------------------------------------------------------------------------
-- [STEP 4] 리셋 후 검증 SELECT
-- ---------------------------------------------------------------------------

-- Bootstrap 계정 복구 확인 (8명이어야 함 — 미리보기 쿼리)
SELECT u.email, sm.service_key, sm.role AS sm_role, ra.role AS ra_role
FROM users u
LEFT JOIN service_memberships sm ON sm.user_id = u.id
LEFT JOIN role_assignments ra ON ra.user_id = u.id AND ra.is_active = true
WHERE u.id::text LIKE 'b0000000-b000-4000-b000-%'
ORDER BY u.email, sm.service_key;

-- 전체 사용자 수 (bootstrap 8명만 남아야 함)
SELECT COUNT(*)::int AS remaining_users FROM users;

-- migration 이력 무결성
SELECT COUNT(*)::int AS migration_count FROM typeorm_migrations;

-- RBAC 현황
SELECT role, COUNT(*)::int AS cnt
FROM role_assignments
WHERE is_active = true
GROUP BY role
ORDER BY cnt DESC;


-- =============================================================================
-- END OF DRY-RUN SCRIPT V1 rev.2
-- 실행 전 docs/reset/O4O-PLATFORM-RESET-EXECUTION-PLAN-V1.md 반드시 참조
-- =============================================================================
