# H1-1 주문/결제 모델 조사 보고서

> **Status**: Investigation Complete
> **Date**: 2025-01-02
> **Work Order**: H1-1

---

## 1. 조사 요약

### 1.1 핵심 발견

1. **이미 존재하는 EcommerceOrder 모델**: `packages/ecommerce-core`에 잘 설계된 통합 주문 모델이 이미 존재함
2. **OrderType 분기 메커니즘**: `retail | dropshipping | b2b | subscription` 타입으로 주문 유형 분기 가능
3. **채널 분기 가능성**: `metadata` JSONB 필드 또는 OrderType 확장으로 Local/Travel 분기 가능
4. **Order-Payment 분리 완료**: `EcommerceOrder` 1:N `EcommercePayment` 구조 확립

### 1.2 결론

**단일 EcommerceOrder 모델로 Local/Travel 채널 모두 수용 가능**

신규 Order 엔티티 생성 불필요. 기존 EcommerceOrder 활용 권장.

---

## 2. 기존 Order 모델 현황

### 2.1 발견된 Order 엔티티들

| 엔티티 | 위치 | 역할 | 상태 |
|--------|------|------|------|
| **EcommerceOrder** | `packages/ecommerce-core` | 판매 원장 (Source of Truth) | **Active** |
| EcommerceOrderItem | `packages/ecommerce-core` | 주문 상품 항목 | Active |
| EcommercePayment | `packages/ecommerce-core` | 결제 기록 | Active |
| CheckoutOrder | `apps/api-server/entities/checkout` | 실거래 MVP용 | Legacy |
| NetureOrder | `apps/api-server/routes/neture` | Neture 전용 | Isolated |

### 2.2 EcommerceOrder 핵심 구조

```typescript
// packages/ecommerce-core/src/entities/EcommerceOrder.entity.ts

enum OrderType {
  RETAIL = 'retail',           // 일반 소매
  DROPSHIPPING = 'dropshipping', // 드랍쉬핑
  B2B = 'b2b',                 // B2B
  SUBSCRIPTION = 'subscription', // 구독
}

enum OrderStatus {
  CREATED, PENDING_PAYMENT, PAID, CONFIRMED,
  PROCESSING, SHIPPED, DELIVERED, COMPLETED,
  CANCELLED, REFUNDED
}

interface EcommerceOrder {
  id: string;
  orderNumber: string;

  // 당사자
  buyerId: string;
  buyerType: 'user' | 'organization';
  sellerId: string;
  sellerType: 'individual' | 'organization';

  // 금액
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  currency: string;

  // 상태
  orderType: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;

  // 배송/메타
  shippingAddress: ShippingAddress;
  metadata: Record<string, any>;
}
```

---

## 3. Local vs Travel 주문 시나리오 비교

### 3.1 시나리오 정의

| 구분 | Local (K-Cosmetics) | Travel (K-Shopping) |
|------|---------------------|---------------------|
| **구매자** | 국내 소비자 | 외국인 여행자 |
| **판매자** | 매장 (Store) | 가이드 / 매장 |
| **결제 위치** | 온라인/오프라인 | 주로 오프라인 |
| **수령 방식** | 픽업/배송 | 현장/숙소배송 |
| **특이사항** | 샘플 체험 후 구매 | 세금환급, 통역 |

### 3.2 주문 단위 분석

| 질문 | Local | Travel | 통합 가능성 |
|------|-------|--------|-------------|
| 주문 최소 단위 | 상품 단위 | 상품 단위 | ✅ 동일 |
| 여러 매장 묶음 | 불가 (매장 단위) | 불가 (가이드 단위) | ✅ 동일 원칙 |
| 세션 개념 | 없음 | 투어 세션 가능 | ⚠️ metadata 활용 |

### 3.3 결제 흐름 비교

| 단계 | Local | Travel |
|------|-------|--------|
| 결제 시작 | 온라인/매장 POS | 가이드 태블릿/매장 |
| 결제 수단 | 카드/계좌이체 | 카드/현금 |
| 분할 결제 | 드묾 | 가능 (그룹 구매) |
| 환급 | 해당 없음 | 세금 환급 (별도 흐름) |

---

## 4. 핵심 질문에 대한 답변

### Q1. "주문(Order)"의 최소 단위는 무엇인가?

**답변: 상품 단위 (OrderItem)**

- Order는 1개 이상의 OrderItem을 포함
- 동일 판매자(sellerId) 내에서만 묶임
- Local/Travel 모두 동일 원칙 적용 가능

```
Order (판매자 단위)
├── OrderItem (상품 A, qty: 2)
├── OrderItem (상품 B, qty: 1)
└── OrderItem (상품 C, qty: 3)
```

### Q2. 결제(Payment)는 Order에 종속되는가?

**답변: Order 1 : Payment N (분리 완료)**

현재 EcommerceOrder 구조:
- `EcommerceOrder` → `EcommercePayment[]` (OneToMany)
- 분할 결제, 추가 결제, 부분 환불 모두 지원
- Travel 채널의 그룹 구매/분할 결제에도 적합

```typescript
// 이미 구현된 구조
@Entity('ecommerce_payments')
export class EcommercePayment {
  orderId: string;              // FK to Order
  requestedAmount: number;      // 요청 금액
  paidAmount: number;           // 실 결제 금액
  refundedAmount: number;       // 환불 금액
  status: PaymentTransactionStatus;
}
```

### Q3. 채널 차이를 "어디에서" 흡수할 것인가?

**권장안: (A) OrderType 확장 + (C) metadata 활용**

#### Option 분석

| 옵션 | 장점 | 단점 | 판단 |
|------|------|------|------|
| **(A) OrderType 확장** | 명확한 분기, 쿼리 용이 | Enum 수정 필요 | ✅ 채택 |
| (B) FulfillmentType | 수령 방식 분리 | 채널 의미 희석 | ⚠️ 보조적 사용 |
| **(C) metadata** | 유연, 무중단 확장 | 타입 검증 약함 | ✅ 채택 |
| (D) 별도 엔티티 | 완전 분리 | 복잡도 증가 | ❌ 기각 |

#### 제안 구조

```typescript
// OrderType 확장 (향후 마이그레이션 시)
enum OrderType {
  RETAIL = 'retail',
  DROPSHIPPING = 'dropshipping',
  B2B = 'b2b',
  SUBSCRIPTION = 'subscription',
  // 추가 제안
  LOCAL = 'local',           // K-Cosmetics Local 채널
  TRAVEL = 'travel',         // K-Shopping Travel 채널
}

// metadata 활용 (즉시 적용 가능)
interface OrderMetadata {
  channel?: 'local' | 'travel';
  fulfillment?: 'pickup' | 'delivery' | 'on-site';
  // Travel 전용
  tourSessionId?: string;
  guideId?: string;
  taxRefundEligible?: boolean;
  // Local 전용
  storeId?: string;
  sampleExperienced?: boolean;
}
```

### Q4. Cosmetics Core와의 관계

**권장안: 상품 스냅샷 + 가격 고정**

#### 설계 원칙

1. **Order는 Cosmetics Product를 UUID로만 참조**
   - FK 없음 (H1-0 원칙 준수)
   - `productId: string` 형태

2. **OrderItem에 스냅샷 저장**
   - `productName`: 주문 시점 상품명
   - `unitPrice`: 주문 시점 가격 (고정)
   - `metadata.productSnapshot`: 추가 정보 (선택)

3. **Cosmetics 가격 변경이 기존 Order에 영향 없음**

```typescript
// EcommerceOrderItem (이미 이 구조임)
interface EcommerceOrderItem {
  productId?: string;         // Cosmetics Product UUID 참조
  productName: string;        // 스냅샷 (주문 시점)
  unitPrice: number;          // 스냅샷 (주문 시점)
  quantity: number;
  metadata?: {
    productSnapshot?: {
      brandId: string;
      brandName: string;
      lineId?: string;
      lineName?: string;
      images?: ProductImage[];
    };
  };
}
```

### Q5. 참여자(Participant)와 Order의 관계

**권장안: sellerId로 통합, participantType은 metadata에**

#### 현재 구조 분석

| 참여자 | K-Shopping 역할 | Order에서의 위치 |
|--------|-----------------|------------------|
| Store (매장) | 판매 주체 | sellerId |
| Guide (가이드) | 중개/판매 | sellerId 또는 metadata.guideId |
| Partner (파트너) | 제휴/소개 | metadata.partnerId (커미션용) |
| Supplier (공급자) | 상품 공급 | OrderItem.metadata.supplierId |

#### 제안 구조

```typescript
interface EcommerceOrder {
  sellerId: string;              // 판매 주체 (Store 또는 Guide)
  sellerType: 'store' | 'guide' | 'organization';  // 확장 가능

  metadata: {
    // K-Shopping (Travel) 전용
    guideId?: string;            // 가이드가 sellerId가 아닐 때
    tourSessionId?: string;
    participantType?: 'store' | 'guide' | 'partner';

    // 커미션 추적
    partnerId?: string;
    referralCode?: string;
  };
}
```

---

## 5. 채택/보류/기각 옵션 정리

### 5.1 채택 (Recommended)

| 결정 | 근거 |
|------|------|
| **EcommerceOrder 단일 모델 사용** | 이미 잘 설계됨, 중복 방지 |
| **OrderType으로 채널 분기** | 명시적, 쿼리 최적화 가능 |
| **metadata로 채널 특화 데이터** | 유연성, 무중단 확장 |
| **상품 스냅샷 저장** | 가격/상품 변경으로부터 보호 |
| **Order-Payment 1:N 유지** | 분할 결제, 부분 환불 지원 |

### 5.2 보류 (To Decide in H1-2)

| 항목 | 결정 필요 사항 |
|------|---------------|
| OrderType 확장 여부 | `local`, `travel` 추가 vs metadata만 사용 |
| 세금환급 모델링 | 별도 엔티티 vs metadata |
| 투어 세션 개념 | Order 묶음 방식 결정 |
| Guide 커미션 구조 | 정산 연계 방식 |

### 5.3 기각 (Not Recommended)

| 기각 항목 | 사유 |
|----------|------|
| Travel 전용 Order 엔티티 생성 | 중복, 복잡도 증가 |
| Cosmetics FK 설정 | H1-0 도메인 경계 위반 |
| Order 생성 시 외부 API 호출 | 트랜잭션 복잡도 |

---

## 6. 아직 결정하지 않은 것

### 6.1 비즈니스 결정 필요

1. **세금환급(Tax Refund) 처리 방식**
   - Order 레벨 vs Payment 레벨
   - 별도 TaxRefund 엔티티 필요 여부

2. **투어 세션(Tour Session) 개념**
   - 가이드 투어 단위로 Order 그룹핑 필요 여부
   - 그룹핑 시 정산 단위 결정

3. **가이드 판매 커미션 구조**
   - 주문 기반 vs 결제 기반
   - 정산 주기 및 방식

### 6.2 기술 결정 필요

1. **OrderType 확장 시점**
   - 즉시 마이그레이션 vs metadata로 먼저 운영

2. **실시간 재고 연동**
   - Cosmetics Product와 Order 간 재고 체크 시점

3. **PG 연동 범위**
   - Toss Payments 단독 vs 다중 PG

---

## 7. 권장 다음 단계 (H1-2)

H1-1 조사 결과를 바탕으로 H1-2에서 결정해야 할 사항:

1. **OrderType 확장 여부 최종 결정**
2. **세금환급 모델 설계**
3. **Guide/Store 역할 분리 최종안**
4. **metadata 스키마 표준화**

---

*Document Version: 1.0*
*Created by: H1-1 Work Order*
