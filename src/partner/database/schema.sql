// src/partner/database/schema.sql
-- Partner 시스템 데이터베이스 스키마

-- 1. Partner 신청 테이블
CREATE TABLE IF NOT EXISTS partner_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    application_reason TEXT NOT NULL,
    marketing_plan TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    admin_notes TEXT,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    reviewed_by VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Partner 프로필 테이블
CREATE TABLE IF NOT EXISTS partner_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id VARCHAR(255) NOT NULL UNIQUE,
    customer_email VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    partner_code VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, terminated
    commission_rate DECIMAL(5,2) DEFAULT 0.00,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0.00,
    bank_account TEXT, -- JSON 형태로 저장
    last_activity_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 제품별 수수료 설정 테이블
CREATE TABLE IF NOT EXISTS product_commissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    supplier_id VARCHAR(255) NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    commission_type VARCHAR(20) NOT NULL, -- fixed, percentage
    commission_value DECIMAL(10,2) NOT NULL,
    start_date DATETIME,
    end_date DATETIME,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, expired
    admin_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by VARCHAR(255)
);

-- 4. 클릭 추적 테이블
CREATE TABLE IF NOT EXISTS partner_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL,
    partner_code VARCHAR(20) NOT NULL,
    product_id VARCHAR(255),
    visitor_ip VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    session_id VARCHAR(255),
    clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    converted BOOLEAN DEFAULT FALSE,
    conversion_id INTEGER,
    FOREIGN KEY (partner_id) REFERENCES partner_profiles(id)
);

-- 5. 전환 추적 테이블
CREATE TABLE IF NOT EXISTS partner_conversions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL,
    click_id INTEGER,
    order_id VARCHAR(255),
    conversion_type VARCHAR(20) NOT NULL, -- product, site_referral
    commission_amount DECIMAL(10,2) NOT NULL,
    order_total DECIMAL(10,2),
    product_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, paid, cancelled
    converted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    paid_at DATETIME,
    cancelled_at DATETIME,
    cancellation_reason TEXT,
    FOREIGN KEY (partner_id) REFERENCES partner_profiles(id),
    FOREIGN KEY (click_id) REFERENCES partner_clicks(id)
);

-- 6. 지급 요청 테이블
CREATE TABLE IF NOT EXISTS payout_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL,
    request_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KRW',
    payment_method VARCHAR(20) NOT NULL, -- bank_transfer, paypal, other
    account_info TEXT NOT NULL, -- JSON 형태
    conversion_ids TEXT, -- JSON 배열
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, processing, completed, rejected
    admin_notes TEXT,
    rejection_reason TEXT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by VARCHAR(255),
    processed_at DATETIME,
    processed_by VARCHAR(255),
    completed_at DATETIME,
    payment_reference VARCHAR(255),
    FOREIGN KEY (partner_id) REFERENCES partner_profiles(id)
);

-- 7. 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS partner_system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    updated_by VARCHAR(255) NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 기본 시스템 설정값
INSERT OR IGNORE INTO partner_system_settings (setting_key, setting_value, setting_type, description, updated_by) VALUES
('cookie_duration_days', '30', 'integer', '추적 쿠키 유효기간 (일)', 'system'),
('minimum_payout_amount', '50000', 'decimal', '최소 지급 금액 (원)', 'system'),
('default_site_referral_reward', '10000', 'decimal', '기본 사이트 소개 정액 (원)', 'system');

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_partner_applications_customer_id ON partner_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON partner_applications(status);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_customer_id ON partner_profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_partner_code ON partner_profiles(partner_code);
CREATE INDEX IF NOT EXISTS idx_partner_clicks_partner_id ON partner_clicks(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_clicks_session_id ON partner_clicks(session_id);
CREATE INDEX IF NOT EXISTS idx_partner_conversions_partner_id ON partner_conversions(partner_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_partner_id ON payout_requests(partner_id);
