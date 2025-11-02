# 드랍쉬핑 시스템 DB 인벤토리 리포트
**생성일**: 2025-11-02
**데이터베이스**: o4o_platform (PostgreSQL)
**서버**: o4o-api (43.202.242.215)

---

## 📊 Report 1: DB 인벤토리

### 1.1 Dropshipping Tables

#### ❌ **CRITICAL FINDING: TypeORM 엔티티 테이블이 DB에 없음**

Migration이 실행되었으나 실제 테이블이 생성되지 않았습니다:

| Migration Name | Timestamp | Status |
|----------------|-----------|---------|
| CreateDropshippingTables1740000000001 | 1740000000001 | ✅ Executed |
| InitializeDropshippingCPTs1758897000000 | 1758897000000 | ✅ Executed |
| CreateDropshippingEntities1800000000000 | 1800000000000 | ✅ Executed |

**예상 테이블 (Migration에 정의됨, DB에 없음)**:
- `suppliers` - 공급자 관리
- `sellers` - 판매자 관리
- `partners` - 제휴 파트너 관리
- `seller_products` - 판매자별 상품 매핑
- `partner_commissions` - 파트너 수수료 기록
- `products` - 드롭쉬핑 상품 (일반 products와 별도)

**현재 존재하는 테이블**:
- `custom_posts` - CPT 엔진을 통한 드롭쉬핑 데이터 저장 (현재 방식)
- `custom_post_types` - CPT 정의
- `custom_field_groups` - ACF 필드 그룹 (비어있음)
- `custom_fields` - ACF 필드 (비어있음)
- `custom_field_values` - ACF 필드 값

### 1.2 실제 사용 중인 테이블 (Custom Posts 기반)

| Table | Row Count | Description |
|-------|-----------|-------------|
| custom_post_types | 5 | CPT 정의 (ds_supplier, ds_partner, ds_product, ds_commission_policy, docs) |
| custom_posts | 272 | 모든 CPT 데이터 (드롭쉬핑 116건 포함) |
| custom_field_groups | 0 | ACF 필드 그룹 (비어있음) |
| custom_fields | 0 | ACF 필드 정의 (비어있음) |
| custom_field_values | N/A | ACF 필드 값 |
| acf_field_groups | 0 | 대체 ACF 테이블 (비어있음) |
| acf_fields | 0 | 대체 ACF 필드 (비어있음) |

### 1.3 드롭쉬핑 CPT 데이터 현황

| CPT Slug | Post Count | Last Created | Active |
|----------|------------|--------------|--------|
| ds_listing | 62 | 2025-09-27 13:26:22 | ✅ |
| ds_order | 27 | 2025-09-25 18:13:45 | ❌ (CPT not defined) |
| ds_settlement | 24 | 2025-09-26 18:13:45 | ❌ (CPT not defined) |
| ds_product | 2 | 2025-09-28 06:33:37 | ✅ |
| ds_supplier | 1 | 2025-09-28 06:33:37 | ✅ |
| ds_partner | 0 | N/A | ✅ (CPT defined, no data) |
| ds_commission_policy | 0 | N/A | ✅ (CPT defined, no data) |

**Total Dropshipping Posts**: 116 / 272 (42.6%)

### 1.4 Custom Posts 테이블 스키마

```sql
Column Name       Data Type                   Nullable
----------------  --------------------------  -----------
id                uuid                        NOT NULL    PRIMARY KEY
cpt_slug          varchar                     NOT NULL
title             varchar                     NOT NULL
slug              varchar                     NOT NULL
content           text                        YES
excerpt           text                        YES
status            varchar                     YES
author_id         uuid                        YES
featured_image    varchar                     YES
meta_data         jsonb                       YES
published_at      timestamp                   YES
created_at        timestamp                   YES
updated_at        timestamp                   YES
fields            jsonb                       YES         ← ACF 필드 데이터
meta              jsonb                       YES
```

**Constraints**:
- PRIMARY KEY: `id`
- UNIQUE: `(cpt_slug, slug)` - CPT별로 고유한 slug

### 1.5 Indexes

| Index Name | Type | Columns | Table |
|------------|------|---------|-------|
| custom_posts_pkey | UNIQUE BTREE | id | custom_posts |
| custom_posts_cpt_slug_slug_key | UNIQUE BTREE | cpt_slug, slug | custom_posts |
| idx_custom_posts_cpt_slug | BTREE | cpt_slug | custom_posts |
| idx_custom_posts_status | BTREE | status | custom_posts |
| IDX_custom_post_types_slug | BTREE | slug | custom_post_types |
| IDX_custom_post_types_active | BTREE | active | custom_post_types |

### 1.6 Foreign Keys & Constraints

**Custom Posts 테이블에는 Foreign Key가 없음**

- `author_id` 필드는 `users` 테이블을 참조하지만 FK 제약조건 없음
- `cpt_slug` 필드는 `custom_post_types.slug`를 참조하지만 FK 제약조건 없음
- 데이터 무결성은 애플리케이션 레벨에서 관리

### 1.7 Migration History (Dropshipping 관련)

```
Timestamp          Migration Name                        Status
-----------------  ------------------------------------  ------
1740000000001      CreateDropshippingTables              ✅
1758897000000      InitializeDropshippingCPTs            ✅
1800000000000      CreateDropshippingEntities            ✅
```

**전체 Migration 통계**:
- Total Migrations Executed: 54
- Latest Migration: CreateAIUsageLogTable1841000000000 (2025-10-30)

---

## 🛒 Report 2: 주문 시스템 현황

### 2.1 Order System Existence: ✅ YES (Entity only, Table missing)

#### Order Entity 정의됨
- **파일**: `/home/ubuntu/o4o-platform/apps/api-server/src/entities/Order.ts`
- **Entity Class**: `Order`
- **Table Name**: `orders`

#### ❌ **CRITICAL FINDING: orders 테이블이 DB에 없음**

Migration `CreateOrderTables1790000000000`가 실행되었으나 실제 `orders` 테이블이 데이터베이스에 존재하지 않습니다.

**대신 사용 중인 대체 시스템**:
- CPT: `ds_order` (27건의 주문 데이터)
- 저장소: `custom_posts` 테이블

### 2.2 Order Entity Schema (TypeORM 정의)

```typescript
@Entity('orders')
export class Order {
  // Primary Key
  id: uuid
  orderNumber: string (unique)

  // Buyer Information
  buyerId: uuid (FK to users.id)
  buyerType: string (UserRole)
  buyerName: string
  buyerEmail: string
  buyerGrade: string (RetailerGrade)

  // Order Items (JSONB)
  items: OrderItem[] (productId, supplierId, quantity, prices, etc.)

  // Financial Summary (JSONB)
  summary: OrderSummary (subtotal, discount, shipping, tax, total)
  currency: string (default: 'KRW')

  // Status Tracking
  status: enum OrderStatus (pending, confirmed, processing, shipped, delivered, cancelled, returned)
  paymentStatus: enum PaymentStatus (pending, completed, failed, refunded)
  paymentMethod: enum PaymentMethod (card, transfer, kakao_pay, etc.)

  // Addresses (JSONB)
  billingAddress: Address
  shippingAddress: Address

  // Shipping & Tracking
  shippingMethod: string
  trackingNumber: string
  trackingUrl: string

  // Timestamps
  orderDate: timestamp
  paymentDate: timestamp
  confirmedDate: timestamp
  shippingDate: timestamp
  deliveryDate: timestamp
  cancelledDate: timestamp

  // Additional Info
  notes: text
  customerNotes: text
  adminNotes: text

  // Cancellation & Returns
  cancellationReason: text
  returnReason: text
  refundAmount: decimal
  refundDate: timestamp

  // Metadata
  source: enum ('web', 'mobile', 'api', 'admin')
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 2.3 Partner Tracking Fields

#### ✅ Order Entity에 파트너 추적 필드 있음

```typescript
export interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number

  // Supplier Info (파트너 추적용)
  supplierId: string       ← 공급자 ID
  supplierName: string     ← 공급자 이름

  // 추가 가능한 필드 (현재 없음)
  // partnerId?: string    ← 파트너 ID (필요시 추가)
  // referralCode?: string ← 추천 코드 (필요시 추가)
}
```

#### ⚠️ 제한사항:
- `partnerId` 필드 없음 (supplierId만 있음)
- `referralCode` 필드 없음
- `affiliateCode` 필드 없음
- Partner Commission 계산을 위해 별도 확장 필요

### 2.4 Order Status Events

#### Order Status Enum:
```typescript
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}
```

#### Payment Status Enum:
```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}
```

#### 이벤트/훅 시스템:
- **현재**: TypeORM Entity 레벨에 메서드만 정의됨
  - `canBeCancelled()`: pending/confirmed 상태만 취소 가능
  - `canBeRefunded()`: delivered + payment completed 상태만 환불 가능
- **Event System**: 별도 이벤트 시스템 없음 (필요시 구현 필요)

### 2.5 Payment Integration

#### ✅ Payment System 존재

**Payment 테이블**:

| Table | Row Count | Description |
|-------|-----------|-------------|
| payments | 0 | 결제 내역 (비어있음) |
| payment_settlements | 0 | 정산 내역 (비어있음) |
| payment_webhooks | 0 | 웹훅 로그 (비어있음) |

**Payment Entity Schema**:
```sql
Column                Data Type       Description
--------------------  --------------  ---------------------------
id                    uuid            PRIMARY KEY
orderId               uuid            주문 ID (FK 없음!)
paymentKey            varchar         결제 고유 키 (UNIQUE)
transactionId         varchar         거래 ID
amount                numeric         결제 금액
balanceAmount         numeric         잔액
suppliedAmount        numeric         공급 금액
vat                   numeric         부가세
currency              varchar         통화 (기본: KRW)
method                enum            결제 수단
status                enum            상태 (pending, completed, failed, refunded)
requestedAt           timestamp       요청 시각
approvedAt            timestamp       승인 시각
canceledAt            timestamp       취소 시각
gatewayResponse       jsonb           게이트웨이 응답
webhookReceived       boolean         웹훅 수신 여부
cancelAmount          numeric         취소 금액
cancels               jsonb           취소 내역
failureCode           text            실패 코드
failureMessage        text            실패 메시지
```

**Indexes**:
- `IDX_payments_orderId` on `orderId`
- `IDX_payments_paymentKey` (UNIQUE) on `paymentKey`
- `IDX_payments_status` on `status`
- `IDX_payments_requestedAt` on `requestedAt`

#### ⚠️ **CRITICAL**: Payment ↔ Order 연결 문제
- `payments.orderId`가 `orders.id`를 참조하지만 **Foreign Key 제약조건 없음**
- `orders` 테이블이 존재하지 않으므로 현재 payments 데이터 저장 불가
- CPT 기반 `ds_order`를 사용하는 경우 orderId를 custom_posts.id와 연결해야 함

---

## 📝 Report 3: CPT/ACF 실재 데이터 현황

### 3.1 Custom Post Types (CPT)

**Total CPTs**: 5

| Slug | Name | Description | Active | Supports | Menu Position |
|------|------|-------------|--------|----------|---------------|
| ds_supplier | 공급자 | 드롭쉬핑 상품 공급자 | ✅ | title, editor, custom-fields, revisions | 25 |
| ds_partner | 파트너 | 드롭쉬핑 제휴 파트너 | ✅ | title, editor, custom-fields, revisions, thumbnail | 26 |
| ds_product | 드롭쉬핑 상품 | 드롭쉬핑 플랫폼 상품 | ✅ | title, editor, custom-fields, revisions, thumbnail, excerpt | 24 |
| ds_commission_policy | 수수료 정책 | 드롭쉬핑 수수료 정책 | ✅ | title, editor, custom-fields, revisions | 27 |
| docs | 문서 | 기술 문서 및 매뉴얼 | ✅ | title, editor, custom-fields | N/A |

**Dropshipping CPTs**: 4 / 5 (80%)
**All Active**: ✅ YES

#### ⚠️ 추가로 발견된 CPT Slugs (정의되지 않았으나 데이터 존재):
- `ds_listing` (62 posts) - 리스팅/상품 목록
- `ds_order` (27 posts) - 주문
- `ds_settlement` (24 posts) - 정산

**이슈**: CPT 정의 없이 데이터가 생성됨 (직접 custom_posts에 삽입된 것으로 추정)

### 3.2 ACF Field Groups

**Total Field Groups**: 0 (비어있음)

```sql
SELECT COUNT(*) FROM custom_field_groups;
-- Result: 0
```

#### Alternative Tables:
```sql
SELECT COUNT(*) FROM acf_field_groups;
-- Result: 0
```

**상태**: ❌ ACF Field Groups가 전혀 정의되지 않음

### 3.3 ACF Fields

**Total Fields**: 0 (비어있음)

```sql
SELECT COUNT(*) FROM custom_fields;
-- Result: 0
```

#### Alternative Tables:
```sql
SELECT COUNT(*) FROM acf_fields;
-- Result: 0
```

**상태**: ❌ ACF Fields가 전혀 정의되지 않음

### 3.4 Custom Posts 데이터

**전체 통계**:
- Total Posts: 272
- Earliest Post: 2025-08-28 14:00:37
- Latest Post: 2025-10-19 02:54:30

**Status 분포**:
| Status | Count | Percentage |
|--------|-------|------------|
| published | 73 | 26.8% |
| publish | 158 | 58.1% |
| active | 24 | 8.8% |
| draft | 16 | 5.9% |
| completed | 1 | 0.4% |

**Dropshipping Posts 분포**:
| CPT Slug | Count | Latest | Status |
|----------|-------|--------|--------|
| ds_listing | 62 | 2025-09-27 13:26:22 | published |
| ds_order | 27 | 2025-09-25 18:13:45 | active |
| ds_settlement | 24 | 2025-09-26 18:13:45 | active |
| ds_product | 2 | 2025-09-28 06:33:37 | publish |
| ds_supplier | 1 | 2025-09-28 06:33:37 | publish |
| ds_partner | 0 | N/A | N/A |
| ds_commission_policy | 0 | N/A | N/A |

### 3.5 Sample Data

#### ds_supplier 샘플:
```
ID: 52e182e8-f4e4-4004-a906-a2cf0bb873d8
Title: 테크 서플라이
Slug: tech-supply
Status: publish
Fields: {} (비어있음)
```

#### ds_product 샘플:
```
1. 프리미엄 무선 이어폰 (wireless-earbuds-premium)
2. LED 스마트 조명 (led-smart-light)
```

#### ds_listing 샘플:
```
- 송혜민 - Sample Product 1 (특가)
- 한지우 - Sample Product 14
- 강태형 - Sample Product 29
```

#### ds_order 샘플:
```
- ORD-2025-007 (ord2025007)
- ORD-2025-002 (ord2025002)
- ORD-2025-010 (ord2025010)
```

### 3.6 Fields 데이터 저장 현황

**Custom Posts의 `fields` 컬럼 (JSONB)**:
- 타입: `jsonb`
- 용도: ACF 필드 값 저장
- 현재 상태: 대부분 비어있음 (`{}`)

**이슈**:
- ACF Field Groups/Fields가 정의되지 않았으나 데이터는 저장 가능
- 필드 스키마 없이 자유롭게 JSON 저장 가능 (장점/단점 공존)
- 필드 검증, 타입 체크, UI 자동 생성 불가

---

## 🎯 Report 4: 초기화 스크립트 상태

### 4.1 Initialization Endpoints

#### 1) CPT Initialization
- **Endpoint**: `POST /api/v1/cpt/dropshipping/initialize`
- **Script**: `/home/ubuntu/o4o-platform/apps/api-server/src/scripts/init-dropshipping-cpts.ts`
- **Controller**: `apps/api-server/src/routes/cpt/dropshipping.routes.ts`

**기능**:
```typescript
// CPT 생성/활성화
const DROPSHIPPING_CPTS = [
  'ds_supplier',
  'ds_partner',
  'ds_product',
  'ds_commission_policy'
];
```

**실행 여부**: ✅ **이미 실행됨**
- 4개 CPT가 모두 생성되어 있음
- `active=true` 상태 확인됨

**Idempotent**: ✅ YES
- 이미 존재하는 CPT는 건너뜀
- 비활성 CPT는 활성화
- 안전하게 재실행 가능

#### 2) Dropshipping System Initialization
- **Endpoint**: `POST /api/v1/admin/dropshipping/initialize`
- **Controller**: `apps/api-server/src/controllers/dropshipping/DropshippingController.ts`

**기능**:
```typescript
initializeSystem = async (req, res) => {
  // System is already initialized with TypeORM entities
  res.json({
    success: true,
    message: 'Dropshipping system is already initialized',
    data: {
      entities: ['Supplier', 'Partner', 'PartnerCommission', 'Product'],
      initialized: true
    }
  });
}
```

**실행 여부**: ⚠️ **실행되었으나 효과 없음**
- Migration이 실행되었으나 테이블이 생성되지 않음
- 현재는 단순히 "이미 초기화됨" 메시지만 반환

**Idempotent**: ✅ YES (효과가 없으므로 재실행 안전)

### 4.2 Migration 실행 이력

```sql
SELECT name, timestamp
FROM typeorm_migrations
WHERE name LIKE '%Dropship%'
ORDER BY timestamp;
```

| Name | Timestamp | Executed At |
|------|-----------|-------------|
| CreateDropshippingTables1740000000001 | 1740000000001 | ✅ |
| InitializeDropshippingCPTs1758897000000 | 1758897000000 | ✅ |
| CreateDropshippingEntities1800000000000 | 1800000000000 | ✅ |

**결과**: Migration 기록은 있으나 테이블 미생성

### 4.3 초기화 스크립트 로그 확인 불가

- PM2 로그는 API 서버 재시작 시 초기화될 수 있음
- 초기화 시점: Migration 실행 시 (추정)
- 실제 실행 여부: ✅ (custom_post_types에 데이터 존재)

---

## ⚠️ Critical Findings

### 1. **Migration 실행되었으나 테이블 미생성**
   - **Migration**: `CreateDropshippingEntities1800000000000` (실행됨)
   - **예상 테이블**: `suppliers`, `sellers`, `partners`, `seller_products`, `partner_commissions`, `products`
   - **실제**: 테이블 없음
   - **원인**: Migration 롤백, 실행 오류, 또는 다른 마이그레이션과 충돌 가능성
   - **영향**: TypeORM Entity 기반 드롭쉬핑 시스템 동작 불가

### 2. **Order 테이블 없음 (Payment FK 손상)**
   - **Migration**: `CreateOrderTables1790000000000` (실행됨)
   - **예상**: `orders` 테이블
   - **실제**: 테이블 없음
   - **영향**:
     - `payments.orderId` Foreign Key 손상
     - 결제 데이터 저장 불가 (orderId 참조 불가)
     - CPT 기반 `ds_order` 사용 중 (custom_posts)

### 3. **ACF System 미구성**
   - **Field Groups**: 0개
   - **Fields**: 0개
   - **영향**:
     - Custom Posts의 `fields` (JSONB)에 자유롭게 데이터 저장 가능
     - 하지만 필드 스키마, 검증, UI 자동 생성 불가
     - Admin에서 필드 관리 불가

### 4. **CPT 정의 없이 데이터 존재**
   - **발견**: `ds_listing`, `ds_order`, `ds_settlement` 데이터 존재
   - **문제**: `custom_post_types` 테이블에 정의 없음
   - **원인**: 직접 `custom_posts`에 데이터 삽입 (API 레벨)
   - **영향**: Admin UI에서 관리 불가

### 5. **Foreign Key 제약조건 없음**
   - `custom_posts.author_id` → `users.id` (FK 없음)
   - `custom_posts.cpt_slug` → `custom_post_types.slug` (FK 없음)
   - `payments.orderId` → `orders.id` (FK 없음, 테이블도 없음)
   - **영향**: 데이터 무결성 애플리케이션 레벨에서 관리 필요

### 6. **2가지 시스템 혼재**
   - **TypeORM Entities**: Supplier, Seller, Partner, Product (테이블 없음)
   - **CPT System**: ds_supplier, ds_partner, ds_product (데이터 있음)
   - **문제**: 어느 쪽을 사용할지 결정 필요

---

## ✅ Safe to Initialize?

### 🔴 **NO - 초기화 전 문제 해결 필요**

#### 현재 상태:
1. ✅ CPT 시스템은 작동 중 (custom_posts 기반)
2. ❌ TypeORM Entity 시스템은 미작동 (테이블 없음)
3. ❌ Order 시스템 미작동 (테이블 없음)
4. ❌ Payment 시스템 일부 손상 (orderId FK 불가)
5. ⚠️ 116개 드롭쉬핑 데이터 존재 (삭제 위험)

#### 초기화 전 필요한 조치:

##### Option A: TypeORM Entity 시스템 사용 (권장)
```bash
# 1. 기존 데이터 백업
pg_dump -U postgres -d o4o_platform -t custom_posts > backup_custom_posts.sql

# 2. Migration 재실행 (테이블 생성)
# - CreateDropshippingEntities1800000000000 수동 실행
# - 또는 전체 migration 재실행

# 3. 데이터 마이그레이션
# - custom_posts (ds_supplier, ds_product) → suppliers, products 테이블
# - custom_posts (ds_order) → orders 테이블
# - 스크립트 작성 필요

# 4. 테스트
# - API 엔드포인트 테스트
# - CRUD 작동 확인
```

##### Option B: CPT 시스템 유지 (현재 상태)
```bash
# 1. ACF Field Groups/Fields 생성
# - ds_supplier, ds_partner, ds_product, ds_commission_policy 필드 정의
# - Admin UI에서 필드 관리 가능하도록

# 2. 누락된 CPT 추가
# - ds_listing, ds_order, ds_settlement CPT 정의 추가
# - init-dropshipping-cpts.ts 업데이트

# 3. Order 시스템 CPT로 전환
# - ds_order 사용
# - payments.orderId를 custom_posts.id로 연결

# 4. 테스트
# - CPT CRUD 작동 확인
# - Payment 연동 확인
```

#### 권장사항:
- **단기**: Option B (CPT 시스템 유지) - 안정적, 데이터 보존
- **장기**: Option A (TypeORM Entity 전환) - 확장성, 성능, 타입 안전성

---

## 📋 Next Steps

### Immediate Actions:
1. **결정**: TypeORM Entity vs CPT System
2. **Migration 디버깅**: 왜 테이블이 생성되지 않았는지 조사
3. **Order 시스템 복구**: orders 테이블 생성 또는 ds_order CPT 사용
4. **ACF 구성**: Field Groups/Fields 생성 (CPT 유지 시)
5. **데이터 마이그레이션 계획**: 기존 116개 데이터 처리 방안

### Documentation Updates:
1. Architecture Decision Record (ADR) 작성
2. Data Migration Plan 문서화
3. API 스펙 업데이트 (선택한 시스템 기준)

### Testing:
1. Migration 재실행 테스트 (개발 환경)
2. 데이터 무결성 검증
3. API 엔드포인트 E2E 테스트
4. 성능 테스트 (CPT vs Entity)

---

## 📊 Summary

| Aspect | Status | Details |
|--------|--------|---------|
| **CPT System** | ✅ 작동 중 | 4개 CPT 정의, 116개 데이터 |
| **TypeORM Entity System** | ❌ 미작동 | Migration 실행됨, 테이블 없음 |
| **Order System** | ❌ 미작동 | Entity 정의됨, 테이블 없음, ds_order CPT 사용 중 |
| **Payment System** | ⚠️ 일부 손상 | 테이블 있음, orderId FK 손상 |
| **ACF System** | ❌ 미구성 | Field Groups/Fields 없음 |
| **Data Integrity** | ⚠️ 주의 | FK 제약조건 없음, 앱 레벨 관리 |
| **Safe to Initialize** | 🔴 NO | 문제 해결 필요 |

**Database Health**: 🟡 YELLOW - Functional but needs attention

---

*Report Generated by Claude Code Database Investigator*
*Generated: 2025-11-02*
