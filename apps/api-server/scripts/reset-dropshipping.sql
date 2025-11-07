-- ============================================================================
-- Dropshipping Zero-Data Reset Script
-- Sprint 2: 모든 드롭쉬핑 관련 테이블 데이터 초기화
-- ============================================================================
-- 실행 방법: psql $DATABASE_URL -f apps/api-server/scripts/reset-dropshipping.sql
-- 또는: PGPASSWORD=postgres psql -h localhost -U postgres -d o4o_platform -f apps/api-server/scripts/reset-dropshipping.sql
-- ============================================================================

\echo '🔄 Starting Dropshipping Zero-Data Reset...'

-- 백업 안내
\echo '📦 Backup recommendation: pg_dump -h localhost -U postgres o4o_platform > /tmp/backup_pre_sprint2.sql'

BEGIN;

\echo '🗑️  Truncating dropshipping tables...'

-- 1. 정산 관련 테이블 (FK 의존성 고려하여 역순으로 삭제)
TRUNCATE TABLE payment_settlements CASCADE;
\echo '  ✓ payment_settlements cleared'

-- 2. 커미션 관련 테이블
TRUNCATE TABLE partner_commissions CASCADE;
\echo '  ✓ partner_commissions cleared'

TRUNCATE TABLE commissions CASCADE;
\echo '  ✓ commissions cleared'

TRUNCATE TABLE commission_policies CASCADE;
\echo '  ✓ commission_policies cleared'

-- 3. 레퍼럴 추적 테이블
TRUNCATE TABLE referral_clicks CASCADE;
\echo '  ✓ referral_clicks cleared'

-- 4. 파트너 테이블 (마지막으로 삭제, FK 참조가 많음)
-- 주의: users 테이블과 연결되어 있을 수 있으므로 CASCADE 사용
TRUNCATE TABLE partners CASCADE;
\echo '  ✓ partners cleared'

-- 5. Orders 테이블 (존재하는 경우에만)
-- 현재는 존재하지 않지만 향후를 위해 추가
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        TRUNCATE TABLE orders CASCADE;
        RAISE NOTICE '  ✓ orders cleared';
    ELSE
        RAISE NOTICE '  ℹ orders table does not exist yet';
    END IF;
END
$$;

-- 6. 시퀀스 리셋 (필요한 경우)
-- 대부분의 테이블이 UUID를 사용하므로 필요 없음

\echo '✅ All dropshipping tables cleared successfully!'
\echo ''
\echo '📊 Current table counts:'

-- 검증 쿼리
SELECT
    'payment_settlements' as table_name,
    COUNT(*) as row_count
FROM payment_settlements
UNION ALL
SELECT 'partner_commissions', COUNT(*) FROM partner_commissions
UNION ALL
SELECT 'commissions', COUNT(*) FROM commissions
UNION ALL
SELECT 'commission_policies', COUNT(*) FROM commission_policies
UNION ALL
SELECT 'referral_clicks', COUNT(*) FROM referral_clicks
UNION ALL
SELECT 'partners', COUNT(*) FROM partners
ORDER BY table_name;

COMMIT;

\echo ''
\echo '🎉 Zero-Data Reset Complete!'
\echo '📝 Next steps:'
\echo '   1. Run schema migrations if needed'
\echo '   2. Execute seed script: pnpm run seed:zero'
\echo '   3. Verify API endpoints'
