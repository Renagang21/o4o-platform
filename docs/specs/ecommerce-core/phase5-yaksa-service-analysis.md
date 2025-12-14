# E-commerce Core Phase 5 - 약사회 서비스 분석 보고서

**Date**: 2025-12-13
**Branch**: `feature/ecommerce-core-application-phase5`
**Status**: Analysis Complete

---

## 1. 조사 개요

약사회 관련 서비스의 주문/결제 흐름을 조사하여
E-commerce Core 통합 지점을 파악했습니다.

---

## 2. 약사회 관련 패키지 현황

### 2.1 패키지 목록

| 패키지 | 용도 | 주문/결제 연관 |
|--------|------|---------------|
| `pharmaceutical-core` | 의약품 B2B 유통 Core | ✅ PharmaOrder |
| `annualfee-yaksa` | 회비 관리 | ✅ FeePayment |
| `forum-yaksa` | 약사회 커뮤니티 | ❌ |
| `membership-yaksa` | 회원 관리 | ❌ |
| `lms-yaksa` | 교육/학점 | ❌ |
| `reporting-yaksa` | 연간보고서 | ❌ |

### 2.2 현재 E-commerce Core 사용 여부

```
pharmaceutical-core  → ❌ E-commerce Core 미사용
annualfee-yaksa     → ❌ E-commerce Core 미사용
Dropshipping Core   → ⚠️ pharmaceutical-core가 Extension으로 연동
```

---

## 3. pharmaceutical-core 분석

### 3.1 주문 흐름 (AS-IS)

```
약국 (Pharmacy)
    │
    │ POST /api/v1/pharma/orders
    ↓
PharmaOrderService.create()
    │
    │ PharmaOffer → 가격/재고 검증
    │ PharmaOrder 생성
    ↓
PharmaOrder Entity
    │
    │ 자체 주문 Lifecycle
    ↓
정산: PharmaSettlementService
```

### 3.2 주문 Entity 구조

```typescript
// PharmaOrder Entity
{
  id: string;
  offerId: string;           // PharmaOffer FK
  pharmacyId: string;        // 약국 ID
  orderNumber: string;
  quantity: number;
  totalAmount: number;
  status: PharmaOrderStatus;
  paymentStatus: PharmaPaymentStatus;
  // ... 배송 정보
  // ❌ ecommerceOrderId 없음
}
```

### 3.3 문제점

- E-commerce Core 우회
- OrderType 개념 없음 (모두 B2B로 가정)
- 판매 원장(Source of Truth) 분산

---

## 4. annualfee-yaksa 분석

### 4.1 결제 흐름 (AS-IS)

```
회원
    │
    │ POST /api/v1/yaksa/fee/payments
    ↓
FeePaymentService.create()
    │
    │ FeeInvoice (청구서) 검증
    │ FeePayment 생성
    ↓
FeePayment Entity
    │
    │ 자체 결제 Lifecycle
    ↓
MembershipYear 동기화
```

### 4.2 결제 Entity 구조

```typescript
// FeePayment Entity (Phase Y 완료 후)
{
  id: string;
  invoiceId: string;         // 청구서 FK
  memberId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  receiptNumber: string;
  ecommerceOrderId?: string; // ✅ Phase Y에서 Service 연결 완료
  // ... PG 정보
}
```

### 4.3 현황 (Phase Y 완료)

- ✅ Entity에 ecommerceOrderId 필드 추가됨 (Phase 5)
- ✅ CreatePaymentDto에 ecommerceOrderId 필드 추가됨 (Phase Y)
- ✅ findByEcommerceOrderId() 메서드 추가됨 (Phase Y)
- ✅ 통합 결제 통계 가능

---

## 5. E-commerce Core 통합 계획 (TO-BE)

### 5.1 OrderType 매핑

| 서비스 | 현재 | TO-BE OrderType |
|--------|------|-----------------|
| pharmaceutical-core B2B 주문 | PharmaOrder | `b2b` |
| 공동구매 (직배송) | - | `dropshipping` |
| 회비/교육 결제 | FeePayment | `subscription` or `retail` |

### 5.2 pharmaceutical-core 통합

```
TO-BE:

약국 (Pharmacy)
    │
    │ 1. E-commerce Core 주문 생성
    │    orderType: 'b2b'
    ↓
EcommerceOrderService.createOrder()
    │
    │ 2. PharmaOrder 생성 시 연결
    ↓
PharmaOrderService.create({ ecommerceOrderId })
    │
    │ 3. 통합 조회
    ↓
EcommerceOrderQueryService + PharmaOrderService
```

**변경 필요:**

```typescript
// PharmaOrder Entity 확장
@Column({ type: 'uuid', nullable: true })
ecommerceOrderId?: string;
```

### 5.3 annualfee-yaksa 통합

```
TO-BE:

회원
    │
    │ 1. E-commerce Core 주문 생성
    │    orderType: 'subscription' (회비)
    │    orderType: 'retail' (단일 결제)
    ↓
EcommerceOrderService.createOrder()
    │
    │ 2. FeePayment 생성 시 연결
    ↓
FeePaymentService.create({ ecommerceOrderId })
    │
    │ 3. 통합 통계
    ↓
EcommerceOrderQueryService
```

**변경 필요:**

```typescript
// FeePayment Entity 확장
@Column({ type: 'uuid', nullable: true })
ecommerceOrderId?: string;
```

---

## 6. Dropshipping 연계 명확화

### 6.1 pharmaceutical-core

| 케이스 | Dropshipping 연계 | 이유 |
|--------|-------------------|------|
| 약국 → 도매상 B2B | ❌ 불필요 | 직접 거래, Listing 불필요 |
| 공급자 직배송 공동구매 | ✅ 필요 | Relay 구조 적용 |

### 6.2 annualfee-yaksa

| 케이스 | Dropshipping 연계 | 이유 |
|--------|-------------------|------|
| 회비 납부 | ❌ 불필요 | 상품 배송 없음 |
| 교육 결제 | ❌ 불필요 | 디지털 서비스 |

---

## 7. 영향 범위

### 7.1 수정 필요 파일

| 패키지 | 파일 | 수정 내용 |
|--------|------|----------|
| pharmaceutical-core | `entities/PharmaOrder.entity.ts` | ecommerceOrderId 추가 |
| pharmaceutical-core | `services/PharmaOrderService.ts` | E-commerce Core 연계 문서화 |
| annualfee-yaksa | `entities/FeePayment.ts` | ecommerceOrderId 추가 |
| annualfee-yaksa | `services/FeePaymentService.ts` | E-commerce Core 연계 문서화 |

### 7.2 신규 생성 필요

| 패키지 | 파일 | 용도 |
|--------|------|------|
| pharmaceutical-core | `services/PharmaOrderIntegrationService.ts` | 통합 조회 |
| annualfee-yaksa | `services/FeeIntegrationService.ts` | 통합 조회 |

---

## 8. 결론

약사회 서비스는 현재 E-commerce Core와 완전히 분리되어 있습니다.

Phase 5에서는:
1. **PharmaOrder에 ecommerceOrderId FK 추가**
2. **FeePayment에 ecommerceOrderId FK 추가**
3. **통합 조회 서비스 생성**
4. **기존 API 스펙 유지** (내부 구현만 변경)

이를 통해 전체 플랫폼의 매출/결제 통계를
E-commerce Core 기준으로 통합 집계할 수 있습니다.
