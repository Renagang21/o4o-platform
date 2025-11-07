-- ============================================================================
-- Dropshipping Seed Data Script - Zero Data Mode
-- Sprint 2: 파트너, 정산 샘플 데이터 생성
-- ============================================================================
-- 실행 방법: psql $DATABASE_URL -f apps/api-server/scripts/seed-dropshipping-zero.sql
-- ============================================================================

\echo '🌱 Starting Dropshipping Seed Data insertion...'

BEGIN;

-- ============================================================================
-- 1. Partners (파트너 3명)
-- ============================================================================
\echo '👥 Creating Partners...'

INSERT INTO partners (
    id,
    user_id,
    partner_code,
    partner_name,
    email,
    phone,
    tier,
    commission_rate,
    total_earnings,
    pending_balance,
    paid_balance,
    status,
    created_at,
    updated_at
) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    NULL, -- user_id (optional)
    'PARTNER001',
    '파트너 홍길동',
    'hong@example.com',
    '010-1234-5678',
    'gold',
    10.00, -- 10% commission rate
    0,
    0,
    0,
    'active',
    NOW(),
    NOW()
),
(
    '22222222-2222-2222-2222-222222222222',
    NULL,
    'PARTNER002',
    '파트너 김철수',
    'kim@example.com',
    '010-2345-6789',
    'silver',
    8.00, -- 8% commission rate
    0,
    0,
    0,
    'active',
    NOW(),
    NOW()
),
(
    '33333333-3333-3333-3333-333333333333',
    NULL,
    'PARTNER003',
    '파트너 이영희',
    'lee@example.com',
    '010-3456-7890',
    'bronze',
    5.00, -- 5% commission rate
    0,
    0,
    0,
    'active',
    NOW(),
    NOW()
);

\echo '  ✓ Created 3 partners'

-- ============================================================================
-- 2. Commission Policies (커미션 정책)
-- ============================================================================
\echo '📋 Creating Commission Policies...'

INSERT INTO commission_policies (
    id,
    policy_code,
    name,
    description,
    policy_type,
    status,
    priority,
    commission_type,
    commission_rate,
    valid_from,
    created_at,
    updated_at
) VALUES
(
    '44444444-4444-4444-4444-444444444444',
    'DEFAULT-2025',
    '기본 커미션 정책',
    '2025년 기본 파트너 커미션 정책',
    'default',
    'active',
    0,
    'percentage',
    10.00,
    '2025-01-01'::timestamp,
    NOW(),
    NOW()
);

\echo '  ✓ Created 1 commission policy'

-- ============================================================================
-- 3. Payment Settlements (정산 데이터 3건)
-- ============================================================================
\echo '💰 Creating Payment Settlements...'

-- Note: payment_settlements 테이블은 paymentId FK를 요구하므로,
-- 실제 Payment가 있어야 합니다. 여기서는 샘플로 NULL을 허용하거나
-- 테스트용 Payment를 먼저 생성해야 합니다.

-- 먼저 payment_settlements 테이블 구조를 확인
\echo '  ℹ Checking payment_settlements table structure...'

-- Settlement 1: 파트너 홍길동 - 정산 예정
INSERT INTO payment_settlements (
    id,
    payment_id,
    recipient_type,
    recipient_id,
    recipient_name,
    amount,
    currency,
    fee,
    tax,
    net_amount,
    status,
    scheduled_at,
    created_at,
    updated_at
) VALUES
(
    '55555555-5555-5555-5555-555555555555',
    NULL, -- paymentId (테스트 데이터이므로 NULL 허용 필요)
    'partner',
    '11111111-1111-1111-1111-111111111111',
    '파트너 홍길동',
    50000.00, -- 50만원 정산 예정
    'KRW',
    0,
    0,
    50000.00,
    'scheduled',
    NOW() + INTERVAL '7 days', -- 7일 후 정산 예정
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Settlement 2: 파트너 김철수 - 정산 완료
INSERT INTO payment_settlements (
    id,
    payment_id,
    recipient_type,
    recipient_id,
    recipient_name,
    amount,
    currency,
    fee,
    tax,
    net_amount,
    status,
    scheduled_at,
    completed_at,
    created_at,
    updated_at
) VALUES
(
    '66666666-6666-6666-6666-666666666666',
    NULL,
    'partner',
    '22222222-2222-2222-2222-222222222222',
    '파트너 김철수',
    30000.00, -- 30만원 정산 완료
    'KRW',
    0,
    0,
    30000.00,
    'completed',
    NOW() - INTERVAL '7 days',
    NOW(),
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Settlement 3: 파트너 이영희 - 정산 진행중
INSERT INTO payment_settlements (
    id,
    payment_id,
    recipient_type,
    recipient_id,
    recipient_name,
    amount,
    currency,
    fee,
    tax,
    net_amount,
    status,
    scheduled_at,
    processed_at,
    created_at,
    updated_at
) VALUES
(
    '77777777-7777-7777-7777-777777777777',
    NULL,
    'partner',
    '33333333-3333-3333-3333-333333333333',
    '파트너 이영희',
    20000.00, -- 20만원 정산 진행중
    'KRW',
    0,
    0,
    20000.00,
    'processing',
    NOW(),
    NOW(),
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

\echo '  ✓ Created 3 payment settlements'

-- ============================================================================
-- 검증 쿼리
-- ============================================================================
\echo ''
\echo '📊 Data verification:'

SELECT 'partners' as table_name, COUNT(*) as row_count FROM partners
UNION ALL
SELECT 'commission_policies', COUNT(*) FROM commission_policies
UNION ALL
SELECT 'payment_settlements', COUNT(*) FROM payment_settlements
ORDER BY table_name;

\echo ''
\echo '👥 Partners summary:'
SELECT partner_code, partner_name, tier, commission_rate, status
FROM partners
ORDER BY created_at;

\echo ''
\echo '💰 Settlements summary:'
SELECT
    recipient_name,
    amount,
    status,
    scheduled_at::date as scheduled_date
FROM payment_settlements
ORDER BY created_at;

COMMIT;

\echo ''
\echo '🎉 Seed Data insertion complete!'
\echo '📝 Next steps:'
\echo '   1. Verify API endpoints: GET /api/v1/entity/settlements'
\echo '   2. Test Partner Dashboard'
\echo '   3. Check settlement calculations'
