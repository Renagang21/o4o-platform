-- ============================================================================
-- Delete All Seed Display Data
-- ============================================================================
-- 용도: Mock 데이터로 생성된 모든 Seed 데이터를 한번에 삭제
-- 식별자: id가 'seed0000-'으로 시작하는 모든 레코드
--
-- 사용법:
--   psql -d your_database -f delete-seed-data.sql
--   또는 TypeORM migration:revert 사용
-- ============================================================================

-- 1. K-Cosmetics stores
DELETE FROM "cosmetics_stores" WHERE id::text LIKE 'seed0000-%';

-- 2. Glycopharm education products
DELETE FROM "glycopharm_products" WHERE id::text LIKE 'seed0000-%';

-- 3. Yaksa posts (FK 관계로 categories보다 먼저 삭제)
DELETE FROM "yaksa_posts" WHERE id::text LIKE 'seed0000-%';

-- 4. Yaksa categories
DELETE FROM "yaksa_categories" WHERE id::text LIKE 'seed0000-%';

-- 확인용 조회
SELECT 'Remaining seed data:' as message;
SELECT 'cosmetics_stores' as table_name, COUNT(*) as count FROM "cosmetics_stores" WHERE id::text LIKE 'seed0000-%'
UNION ALL
SELECT 'glycopharm_products', COUNT(*) FROM "glycopharm_products" WHERE id::text LIKE 'seed0000-%'
UNION ALL
SELECT 'yaksa_posts', COUNT(*) FROM "yaksa_posts" WHERE id::text LIKE 'seed0000-%'
UNION ALL
SELECT 'yaksa_categories', COUNT(*) FROM "yaksa_categories" WHERE id::text LIKE 'seed0000-%';
