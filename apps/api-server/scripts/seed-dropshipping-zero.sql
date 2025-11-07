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

-- Note: userId와 sellerId는 필수 필드입니다.
-- 기존 users와 sellers 테이블의 ID를 사용합니다.

INSERT INTO partners (
    id,
    "userId",
    "sellerId",
    status,
    tier,
    "isActive",
    "referralCode",
    "referralLink",
    profile,
    "totalEarnings",
    "availableBalance",
    "pendingBalance",
    "paidOut",
    "totalClicks",
    "totalOrders",
    "conversionRate",
    "averageOrderValue",
    "monthlyClicks",
    "monthlyOrders",
    "monthlyEarnings",
    "createdAt",
    "updatedAt"
) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    '70333ceb-9bcc-4108-a336-ac5e58454f37', -- 김민수
    '71892b32-4980-4847-b17d-2dbc1b37cecf', -- existing seller
    'active',
    'gold',
    true,
    'PARTNER001',
    'https://neture.co.kr/ref/PARTNER001',
    '{"name": "파트너 홍길동", "email": "hong@example.com", "phone": "010-1234-5678", "description": "골드 파트너"}'::json,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    NOW(),
    NOW()
),
(
    '22222222-2222-2222-2222-222222222222',
    'd007f052-c2cb-466f-8163-426bcb54e162', -- 최유나
    '71892b32-4980-4847-b17d-2dbc1b37cecf', -- existing seller
    'active',
    'silver',
    true,
    'PARTNER002',
    'https://neture.co.kr/ref/PARTNER002',
    '{"name": "파트너 김철수", "email": "kim@example.com", "phone": "010-2345-6789", "description": "실버 파트너"}'::json,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    NOW(),
    NOW()
),
(
    '33333333-3333-3333-3333-333333333333',
    '5eadcd73-fb61-42f3-b8f1-0683dcd64115', -- Admin
    '71892b32-4980-4847-b17d-2dbc1b37cecf', -- existing seller
    'active',
    'bronze',
    true,
    'PARTNER003',
    'https://neture.co.kr/ref/PARTNER003',
    '{"name": "파트너 이영희", "email": "lee@example.com", "phone": "010-3456-7890", "description": "브론즈 파트너"}'::json,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

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
-- 3. 테스트용 Payments 생성 (payment_settlements FK 의존성)
-- ============================================================================
\echo '💳 Creating test Payments for settlements...'

-- Payment 테이블이 있는지 확인하고 샘플 데이터 생성
-- Note: payments 테이블은 orderId FK를 요구할 수 있으므로,
-- 실제 환경에서는 orders가 먼저 생성되어야 합니다.
-- 여기서는 FK 제약이 없다고 가정하고 진행합니다.

INSERT INTO payments (
    id,
    "orderId",
    amount,
    "balanceAmount",
    currency,
    "orderName",
    status,
    "createdAt",
    "updatedAt"
) VALUES
(
    '88888888-8888-8888-8888-888888888888',
    'TEST-ORDER-001',
    500000.00,
    500000.00,
    'KRW',
    '테스트 주문 1',
    'done',
    NOW() - INTERVAL '7 days',
    NOW()
),
(
    '99999999-9999-9999-9999-999999999999',
    'TEST-ORDER-002',
    300000.00,
    300000.00,
    'KRW',
    '테스트 주문 2',
    'done',
    NOW() - INTERVAL '14 days',
    NOW()
),
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'TEST-ORDER-003',
    200000.00,
    200000.00,
    'KRW',
    '테스트 주문 3',
    'done',
    NOW() - INTERVAL '3 days',
    NOW()
)
ON CONFLICT (id) DO NOTHING;

\echo '  ✓ Created 3 test payments'

-- ============================================================================
-- 4. Payment Settlements (정산 데이터 3건)
-- ============================================================================
\echo '💰 Creating Payment Settlements...'

-- Settlement 1: 파트너 홍길동 - 정산 예정
INSERT INTO payment_settlements (
    id,
    "paymentId",
    "recipientType",
    "recipientId",
    "recipientName",
    amount,
    currency,
    fee,
    tax,
    "netAmount",
    status,
    "scheduledAt",
    "createdAt",
    "updatedAt"
) VALUES
(
    '55555555-5555-5555-5555-555555555555',
    '88888888-8888-8888-8888-888888888888',
    'partner',
    '11111111-1111-1111-1111-111111111111',
    '파트너 홍길동',
    50000.00, -- 50,000원 정산 예정
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
    "paymentId",
    "recipientType",
    "recipientId",
    "recipientName",
    amount,
    currency,
    fee,
    tax,
    "netAmount",
    status,
    "scheduledAt",
    "completedAt",
    "createdAt",
    "updatedAt"
) VALUES
(
    '66666666-6666-6666-6666-666666666666',
    '99999999-9999-9999-9999-999999999999',
    'partner',
    '22222222-2222-2222-2222-222222222222',
    '파트너 김철수',
    30000.00, -- 30,000원 정산 완료
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
    "paymentId",
    "recipientType",
    "recipientId",
    "recipientName",
    amount,
    currency,
    fee,
    tax,
    "netAmount",
    status,
    "scheduledAt",
    "processedAt",
    "createdAt",
    "updatedAt"
) VALUES
(
    '77777777-7777-7777-7777-777777777777',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'partner',
    '33333333-3333-3333-3333-333333333333',
    '파트너 이영희',
    20000.00, -- 20,000원 정산 진행중
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
SELECT "referralCode", profile->>'name' as partner_name, tier, status
FROM partners
ORDER BY "createdAt";

\echo ''
\echo '💰 Settlements summary:'
SELECT
    "recipientName",
    amount,
    status,
    "scheduledAt"::date as scheduled_date
FROM payment_settlements
ORDER BY "createdAt";

COMMIT;

\echo ''
\echo '🎉 Seed Data insertion complete!'
\echo '📝 Next steps:'
\echo '   1. Verify API endpoints: GET /api/v1/entity/settlements'
\echo '   2. Test Partner Dashboard'
\echo '   3. Check settlement calculations'
