# Dropshipping (S2S) Step 2 Investigation Report

> **Work Order**: WO-O4O-TEST-ENV-STEP2-V01
> **작성일**: 2026-01-11
> **상태**: ✅ 완료
> **조사 목적**: 주문 소유권 및 상태 전환 책임 규명

---

## 🎯 핵심 발견 사항 (Executive Summary)

### 주문 소유권 (Order Ownership)
```
┌─────────────────────────────────────────────────┐
│ **E-commerce Core가 판매 원장 (Source of Truth)** │
│ Dropshipping-Core는 Relay 프로세스만 담당        │
└─────────────────────────────────────────────────┘
```

| 항목 | 소유자 | 비고 |
|------|--------|------|
| 주문 생성 | **E-commerce Core** | EcommerceOrder가 판매 원장 |
| 주문 결제 | **E-commerce Core** | OrderRelay는 결제 처리 금지 |
| Relay 생성 | **Dropshipping-Core** | OrderRelay.ecommerceOrderId로 연결 |
| Relay 상태 전환 | **Dropshipping-Core** | pending→relayed→confirmed→shipped→delivered |

### 상태 전환 책임 (State Transition Responsibility)
```
E-commerce Core: 주문/결제 상태 관리
       ↓ (ecommerceOrderId)
Dropshipping-Core: Relay 프로세스 상태 관리
       ↓ (Supplier/Seller/Partner Ops)
Extension Apps: 역할별 운영 UI
```

---

## 📋 Step 2 체크리스트 결과

### ✅ 1. 주문 소유권 (Order Ownership)

#### 1.1 주문 생성 주체
- ❌ **Dropshipping-Core는 주문을 생성하지 않음**
- ✅ **E-commerce Core가 주문 생성** (`EcommerceOrder`)
- ✅ **Dropshipping-Core는 OrderRelay만 생성** (Relay 프로세스 추적용)

**코드 근거**:
```typescript
// packages/dropshipping-core/src/entities/OrderRelay.entity.ts:44-49
/**
 * E-commerce Core의 EcommerceOrder에 대한 FK 참조
 * - EcommerceOrder가 판매 원장(Source of Truth)
 * - nullable: 기존 데이터 호환성 및 점진적 마이그레이션 지원
 */
@Column({ type: 'uuid', nullable: true })
ecommerceOrderId?: string;
```

#### 1.2 주문 데이터 소유권
| 데이터 | 소유자 | 위치 |
|--------|--------|------|
| 주문 원본 (주문번호, 총액, 결제 정보) | E-commerce Core | `ecommerce_orders` |
| Relay 정보 (공급자 전달, 배송 추적) | Dropshipping-Core | `dropshipping_order_relays` |
| Supplier 정보 | Dropshipping-Core | `dropshipping_suppliers` |
| Product Master | Dropshipping-Core | `dropshipping_product_masters` |
| Seller/Listing | Dropshipping-Core | `dropshipping_sellers`, `dropshipping_seller_listings` |

---

### ✅ 2. 상태 전환 책임 (State Transition)

#### 2.1 주문 상태 변경 권한

**E-commerce Core 책임**:
- 주문 생성 (created)
- 결제 완료 (paid)
- 결제 실패 (failed)
- 환불 (refunded)

**Dropshipping-Core 책임**:
- Relay 생성 (pending)
- 공급자 전달 (relayed)
- 공급자 확인 (confirmed)
- 출고 완료 (shipped)
- 배송 완료 (delivered)
- 취소 (cancelled)

**코드 근거**:
```typescript
// packages/dropshipping-core/src/entities/OrderRelay.entity.ts:28-36
export enum OrderRelayStatus {
  PENDING = 'pending',               // 주문 접수
  RELAYED = 'relayed',              // 공급자 전달 완료
  CONFIRMED = 'confirmed',          // 공급자 확인
  SHIPPED = 'shipped',              // 출고 완료
  DELIVERED = 'delivered',          // 배송 완료
  CANCELLED = 'cancelled',          // 취소
  REFUNDED = 'refunded',            // 환불
}
```

#### 2.2 상태 전환 흐름

```
[E-commerce Core]
주문 생성 → 결제 완료
     ↓ (ecommerceOrderId 연결)
[Dropshipping-Core]
pending → relayed → confirmed → shipped → delivered
                                    ↓
                                 refunded (terminal)
pending/relayed/confirmed → cancelled (terminal)
```

**상태 전환 규칙**:
```typescript
// packages/dropshipping-core/src/services/OrderRelayService.ts:12-16
// ## 상태 모델 (DS-4.3)
// pending → relayed → confirmed → shipped → delivered
//                                    ↓
//                                 refunded (terminal)
// pending/relayed/confirmed → cancelled (terminal)
```

---

### ✅ 3. 의존성 조사 (Dependencies)

#### 3.1 Core 의존성
```typescript
// packages/dropshipping-core/src/manifest.ts:40-43
dependencies: {
  core: ['organization-core'],
  optional: [],
}
```

| 의존 대상 | 용도 | 비고 |
|-----------|------|------|
| `organization-core` | 조직/테넌트 관리 | 필수 |
| `ecommerce-core` | 주문/결제 | 코드 import 없음, ecommerceOrderId로만 soft FK |

#### 3.2 Neture 의존성
- ✅ **Neture에 대한 의존성 없음** (grep 결과: 테스트/주석만 존재)
- ✅ **Neture는 Read-Only Hub로 Dropshipping과 무관**

#### 3.3 Cosmetics 의존성
- ✅ **Cosmetics에 대한 의존성 없음**
- ⚠️ **Extension 관계 존재**: `dropshipping-cosmetics` 패키지가 dropshipping-core를 확장

```typescript
// packages/dropshipping-cosmetics/src/manifest.ts (추정)
dependencies: {
  core: ['dropshipping-core'],
}
```

#### 3.4 Admin 의존성
- ✅ **Admin에 대한 의존성 없음**
- ✅ **Admin이 Dropshipping Core를 사용** (Shortcodes로 UI 제공)

**코드 근거**:
```typescript
// apps/admin-dashboard/src/components/shortcodes/dropshipping/index.tsx
export const dropshippingShortcodes: ShortcodeDefinition[] = [
  ...coreShortcodes,
  ...partnerShortcodes,
  ...supplierShortcodes,
  ...sellerShortcodes
];
```

---

### ✅ 4. Extension Apps 구조

#### 4.1 Ops Apps (역할별 운영 UI)

| App | 역할 | 의존성 | 주요 기능 |
|-----|------|--------|-----------|
| `supplierops` | 공급자 운영 | dropshipping-core | Product Master 관리, Offer 생성, 주문 수신 |
| `sellerops` | 판매자 운영 | dropshipping-core | Listing 관리, 주문 모니터링, 정산 조회 |
| `partnerops` | 파트너 운영 | dropshipping-core | 링크 추적, 전환 분석, 커미션 정산 |

**코드 근거**:
```typescript
// packages/supplierops/src/manifest.ts:38-40
dependencies: {
  core: ['dropshipping-core'],
  optional: [],
}

// packages/sellerops/src/manifest.ts:33-36
dependencies: {
  core: ['dropshipping-core'],
  optional: [],
}

// packages/partnerops/src/manifest.ts:31-34
dependencies: {
  core: ['dropshipping-core'],
  optional: [],
}
```

#### 4.2 Industry Extension (산업별 특화)

| Extension | 산업 | 용도 |
|-----------|------|------|
| `dropshipping-cosmetics` | 화장품 | Cosmetics 도메인 특화 검증/필터 |
| `pharmaceutical-core` | 제약 | 약품 도메인 특화 (추정) |

**Extension 패턴**:
```typescript
// dropshipping-core는 산업 중립적 S2S 엔진
// Extension이 산업별 특수성 구현 (validation, filter, hooks)
```

---

### ✅ 5. 테스트 독립성 (Independent Testing)

#### 5.1 독립 테스트 가능 여부
- ✅ **Dropshipping-Core는 독립 테스트 가능**
- ⚠️ **E-commerce Core와 결합 테스트 필요** (주문 생성 시나리오)
- ✅ **Neture/Cosmetics/Yaksa와 독립적**

#### 5.2 테스트 시나리오 분류

| 시나리오 | 독립성 | 필요 의존성 |
|----------|--------|-------------|
| Supplier 생성 | ✅ 독립 | organization-core |
| Product Master 생성 | ✅ 독립 | organization-core |
| Offer 생성 | ✅ 독립 | organization-core |
| Listing 생성 | ✅ 독립 | organization-core |
| **OrderRelay 생성** | ⚠️ 결합 | **ecommerce-core** (주문 원본) |
| 정산 처리 | ✅ 독립 | organization-core |

#### 5.3 최소 테스트 환경 요구사항

**필수 Core**:
1. `organization-core` (테넌트/조직)
2. `auth-core` (인증/권한)

**선택 Core** (시나리오별):
- `ecommerce-core` (주문 생성 테스트 시)

**필수 데이터**:
- User (Supplier/Seller/Partner 역할)
- Organization (테넌트)

---

## 📊 서비스 정보 요약

### 기본 정보
| 항목 | 값 |
|------|-----|
| **서비스 ID** | `dropshipping` (S2S) |
| **Core App** | `dropshipping-core` |
| **상태** | **Development** |
| **DB 스키마** | `public` (테이블 prefix: `dropshipping_`) |
| **Frontend** | ❌ 없음 (Ops Apps가 UI 제공) |

### 소유 테이블 (Dropshipping-Core)
```
dropshipping_suppliers
dropshipping_sellers
dropshipping_product_masters
dropshipping_supplier_product_offers
dropshipping_seller_listings
dropshipping_order_relays          ← 주문 Relay (ecommerceOrderId 참조)
dropshipping_settlement_batches
dropshipping_commission_rules
dropshipping_commission_transactions
```

### API 엔드포인트 (추정)
```
GET  /api/v1/dropshipping/suppliers
POST /api/v1/dropshipping/suppliers
GET  /api/v1/dropshipping/products
POST /api/v1/dropshipping/products
GET  /api/v1/dropshipping/offers
POST /api/v1/dropshipping/offers
GET  /api/v1/dropshipping/listings
POST /api/v1/dropshipping/listings
GET  /api/v1/dropshipping/orders
POST /api/v1/dropshipping/orders/relay  ← OrderRelay 생성
PUT  /api/v1/dropshipping/orders/:id/status
GET  /api/v1/dropshipping/settlement
```

---

## 🔍 의존성 맵 (Dependency Map)

```
┌─────────────────────────────────────────────────────┐
│                  E-commerce Core                     │
│  (주문/결제 원장 - Source of Truth)                   │
└────────────────┬────────────────────────────────────┘
                 │ ecommerceOrderId (soft FK)
                 ↓
┌─────────────────────────────────────────────────────┐
│              Dropshipping-Core                       │
│  (산업 중립적 S2S 엔진)                                │
│  - Supplier/Seller/Partner 관리                      │
│  - Product Master/Offer/Listing                     │
│  - OrderRelay (Relay 프로세스)                       │
│  - Settlement/Commission                            │
└────┬────────────────────────────┬───────────────────┘
     │                            │
     ↓                            ↓
┌──────────────────┐    ┌──────────────────────────┐
│  Industry Ext    │    │     Ops Apps             │
│  - cosmetics     │    │  - supplierops           │
│  - pharma        │    │  - sellerops             │
└──────────────────┘    │  - partnerops            │
                        └──────────────────────────┘
```

**의존 방향**:
- Dropshipping-Core → Organization-Core (필수)
- Dropshipping-Core → E-commerce Core (soft FK, 주문 생성 시 연결)
- Industry Extensions → Dropshipping-Core
- Ops Apps → Dropshipping-Core
- ❌ Dropshipping-Core → Neture (의존성 없음)
- ❌ Dropshipping-Core → Cosmetics (의존성 없음)
- ❌ Dropshipping-Core → Yaksa (의존성 없음)

---

## ⚠️ 주의사항 (Cautions)

### 1. E-commerce Core 통합 필수
```
❌ Dropshipping-Core만으로는 실제 주문 생성 불가
✅ E-commerce Core를 통한 주문 생성 후 OrderRelay 연결
```

**이유**:
- `OrderRelay.ecommerceOrderId`는 nullable이지만, 실제 운영에서는 필수
- E-commerce Core가 결제/환불/주문 원장을 담당
- Dropshipping-Core는 Relay 프로세스만 추적

### 2. Extension Apps의 역할 분리
```
Ops Apps ≠ Business Logic
Ops Apps = 역할별 운영 UI + 상태 관리
```

**금지 사항**:
- Ops Apps에서 업무 방식 판단 ❌
- Ops Apps에서 정책 결정 (승인 조건, 수수료율) ❌
- 비즈니스 로직은 Industry Extension에서 처리 ✅

### 3. 산업 중립성 유지
```
dropshipping-core = 산업 중립적 S2S 엔진
Industry Extension = 산업별 특화 (cosmetics, pharma, etc.)
```

**코드 근거**:
```typescript
// packages/dropshipping-core/src/manifest.ts:26-28
// - 각 서비스(Cosmetics, Pharmaceutical, Yaksa 등)는 Extension/Core를 통해 특수성 구현
// - 본 Core는 S2S 관계 관리에만 집중하며, 비즈니스 정책 판단은 하지 않음
```

---

## 🎯 테스트 환경 준비 권장사항

### Phase 1: Core 단독 테스트
1. Organization-Core 활성화
2. Auth-Core 활성화
3. Dropshipping-Core 설치
4. Supplier/Product/Offer/Listing CRUD 테스트

### Phase 2: E-commerce 통합 테스트
1. E-commerce Core 활성화
2. 주문 생성 (EcommerceOrder)
3. OrderRelay 생성 (ecommerceOrderId 연결)
4. 상태 전환 (pending → delivered) 테스트

### Phase 3: Extension 테스트
1. SupplierOps 설치 및 테스트
2. SellerOps 설치 및 테스트
3. PartnerOps 설치 및 테스트
4. Dropshipping-Cosmetics Extension 테스트 (선택)

---

## 📌 조사 결론 (Conclusion)

### 핵심 발견
1. **Dropshipping-Core는 주문을 소유하지 않음** → E-commerce Core가 판매 원장
2. **OrderRelay는 프로세스 엔티티** → Relay 상태 추적만 담당
3. **Neture/Cosmetics/Yaksa와 독립적** → 의존성 없음
4. **Extension 구조가 명확** → Ops Apps (역할별) + Industry Extensions (산업별)

### 테스트 환경 준비 방향
- ✅ **Dropshipping-Core 단독 테스트 가능** (Product/Offer/Listing)
- ⚠️ **E-commerce Core와 결합 필수** (주문 생성 시나리오)
- ✅ **다른 서비스와 독립적** (Neture/Cosmetics/Yaksa 불필요)

### 다음 단계 권장
1. E-commerce Core Step 2 조사 (주문 소유권 확정)
2. GlycoPharm Step 2 조사 (E-commerce 사용 여부 확인)
3. Tourism Step 2 조사
4. 전체 조사 완료 후 Step 3 진입 (통합 테스트 환경 구축)

---

**조사 완료 일시**: 2026-01-11
**조사자**: Claude Code (AI Agent)
**검증 상태**: ✅ 코드 기반 조사 완료
