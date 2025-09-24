# 🚀 로컬 환경 설정 가이드

앞서 진행한 모든 작업을 로컬 환경에 적용하기 위한 단계별 가이드입니다.

## 1. 최신 코드 가져오기

```bash
git pull origin main
```

## 2. 데이터베이스 테이블 생성

### menu_locations 테이블
```sql
PGPASSWORD=your_password psql -h localhost -U your_user -d your_db << 'EOF'
CREATE TABLE IF NOT EXISTS menu_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    order_num INT DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS IDX_menu_locations_key ON menu_locations(key);

INSERT INTO menu_locations (key, name, description, is_active, order_num)
VALUES
    ('primary', 'Primary Navigation', 'Main navigation menu', true, 1),
    ('footer', 'Footer Menu', 'Footer navigation menu', true, 2),
    ('mobile', 'Mobile Menu', 'Mobile navigation menu', true, 3),
    ('sidebar', 'Sidebar Menu', 'Sidebar navigation menu', true, 4)
ON CONFLICT (key) DO NOTHING;
EOF
```

### custom_posts 테이블
```sql
PGPASSWORD=your_password psql -h localhost -U your_user -d your_db << 'EOF'
CREATE TABLE IF NOT EXISTS custom_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cpt_slug VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content TEXT,
    excerpt TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    author_id UUID,
    featured_image VARCHAR(500),
    meta_data JSONB,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cpt_slug, slug)
);

CREATE INDEX IF NOT EXISTS idx_custom_posts_cpt_slug ON custom_posts(cpt_slug);
CREATE INDEX IF NOT EXISTS idx_custom_posts_status ON custom_posts(status);
EOF
```

### coupon_usage 테이블
```sql
PGPASSWORD=your_password psql -h localhost -U your_user -d your_db << 'EOF'
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL,
    order_id UUID,
    customer_id UUID,
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer_id ON coupon_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id ON coupon_usage(order_id);
EOF
```

### shipping_trackings 테이블
```sql
PGPASSWORD=your_password psql -h localhost -U your_user -d your_db << 'EOF'
CREATE TABLE IF NOT EXISTS shipping_trackings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "orderId" UUID NOT NULL,
    carrier VARCHAR(50) DEFAULT 'cj_logistics',
    "trackingNumber" VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    "estimatedDeliveryDate" TIMESTAMP,
    "actualDeliveryDate" TIMESTAMP,
    "recipientName" VARCHAR(255),
    "recipientSignature" VARCHAR(255),
    "deliveryNotes" TEXT,
    "trackingHistory" JSONB,
    "shippingAddress" JSONB,
    "shippingCost" DECIMAL(10, 2),
    weight DECIMAL(8, 2),
    dimensions JSONB,
    "returnTrackingNumber" VARCHAR(255),
    "failureReason" TEXT,
    metadata JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS IDX_shipping_tracking_order ON shipping_trackings("orderId");
CREATE INDEX IF NOT EXISTS IDX_shipping_tracking_number ON shipping_trackings("trackingNumber");
CREATE INDEX IF NOT EXISTS IDX_shipping_tracking_carrier ON shipping_trackings(carrier);
CREATE INDEX IF NOT EXISTS IDX_shipping_tracking_status ON shipping_trackings(status);
EOF
```

## 3. 샘플 데이터 추가 (선택사항)

### 샘플 쿠폰 데이터
```sql
PGPASSWORD=your_password psql -h localhost -U your_user -d your_db << 'EOF'
INSERT INTO coupons (id, code, description, "discountType", "discountValue", 
    "minOrderAmount", "usageLimitPerCoupon", "usedCount", 
    "validFrom", "validUntil", status, "createdAt", "updatedAt")
VALUES
    (uuid_generate_v4(), 'WELCOME10', '신규 가입 10% 할인', 'percent', 10, 
     0, 1000, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days', 
     'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (uuid_generate_v4(), 'SAVE5000', '5000원 할인', 'fixed_cart', 5000, 
     30000, 500, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days', 
     'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;
EOF
```

## 4. 빌드 및 재시작

```bash
# API 서버로 이동
cd apps/api-server

# 의존성 설치 (필요시)
pnpm install

# 빌드
npm run build

# PM2 재시작
pm2 restart o4o-api-local

# 또는 개발 모드로 실행
npm run dev
```

## 5. 테스트 명령어

```bash
# Health check
curl http://localhost:3002/api/health

# Menu locations 확인
curl http://localhost:3002/api/v1/menus/locations

# Permalink settings 확인
curl http://localhost:3002/api/public/permalink-settings

# 배송 추적 테스트 (공개 엔드포인트)
curl http://localhost:3002/api/shipping/track/1234567890

# 가격 계산 테스트
curl -X POST http://localhost:3002/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{"productId":"test-id","quantity":2}'

# 인증이 필요한 엔드포인트 테스트
curl http://localhost:3002/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📌 환경 변수 확인사항

로컬 `.env` 파일에 다음이 설정되어 있는지 확인:

```env
NODE_ENV=development
PORT=3002
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_user
DB_PASSWORD=your_password
DB_NAME=your_database
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
EMAIL_SERVICE_ENABLED=false
```

## ⚠️ 주의사항

- PostgreSQL이 실행 중인지 확인
- 포트 3002가 사용 가능한지 확인
- 데이터베이스 연결 정보가 올바른지 확인
- UUID extension이 활성화되어 있는지 확인:
  ```sql
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  ```

## 🔄 전체 리셋 및 재설정 (문제 발생시)

```bash
# PM2 프로세스 정리
pm2 delete o4o-api-local

# 빌드 디렉토리 정리
rm -rf dist/

# 전체 재빌드 및 시작
npm run build
NODE_ENV=development PORT=3002 \
JWT_SECRET=dev-jwt-secret \
JWT_REFRESH_SECRET=dev-refresh-secret \
pm2 start dist/main.js --name o4o-api-local

# 로그 확인
pm2 logs o4o-api-local --lines 100
```

## 📝 최근 업데이트 내역

- **2025-01-24**: 
  - 커미션 알림 이메일 시스템 구현
  - 배송 추적 시스템 추가
  - 가격/할인 계산 엔진 구현
  - 자동 승인 비즈니스 로직 추가

- **2025-01-23**: 
  - menu_locations 테이블 생성
  - 숫자 ID 메뉴 지원 추가
  - JWT Refresh Token 구현

## 🚀 빠른 시작 스크립트

모든 설정을 한 번에 실행하는 스크립트:

```bash
#!/bin/bash
# quick-setup.sh

# 1. Pull latest
git pull origin main

# 2. Navigate to API server
cd apps/api-server

# 3. Install dependencies
pnpm install

# 4. Build
npm run build

# 5. Start/Restart PM2
pm2 delete o4o-api-local 2>/dev/null
NODE_ENV=development PORT=3002 \
JWT_SECRET=dev-jwt-secret \
JWT_REFRESH_SECRET=dev-refresh-secret \
pm2 start dist/main.js --name o4o-api-local

# 6. Show logs
pm2 logs o4o-api-local --lines 50

echo "✅ Setup complete! API server running on http://localhost:3002"
```

이 모든 작업을 순서대로 진행하면 로컬 환경에서도 API 서버가 정상적으로 작동합니다.