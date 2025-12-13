# 신규 서비스 주문 생성 체크리스트

**Version**: 1.0
**Status**: Operational (운영 규칙 고정)
**Last Updated**: 2025-12-13

---

## 1. 목적

신규 서비스에서 주문/결제 기능을 개발할 때 E-commerce Core 통합 여부를 판단하고,
필수 항목을 누락 없이 구현하기 위한 체크리스트입니다.

---

## 2. 적용 판단 기준

### 2.1 E-commerce Core 적용 필수 조건

다음 조건 중 **하나라도 해당**되면 E-commerce Core를 **반드시 사용**합니다:

| 조건 | 설명 |
|------|------|
| ✅ 주문 생성 | 사용자가 상품/서비스를 구매하는 행위 |
| ✅ 결제 처리 | 금액이 발생하는 모든 거래 |
| ✅ 매출 통계 필요 | 판매 데이터가 통합 집계에 포함되어야 함 |

### 2.2 적용 제외 대상

다음 조건에 **모두 해당**하면 E-commerce Core를 적용하지 않아도 됩니다:

| 조건 | 설명 |
|------|------|
| ❌ 주문 개념 없음 | 구매/판매 행위가 없는 서비스 |
| ❌ 결제 없음 | 금액 발생이 없음 |
| ❌ 매출 집계 불필요 | 통합 통계에서 제외해도 무방 |

> **주의**: 제외 대상에 해당하더라도 반드시 `exemption-policy.md`에 따라 문서화해야 합니다.

---

## 3. 필수 체크리스트

### 3.1 주문 생성 시점 (필수)

| # | 항목 | 필수/선택 | 확인 |
|---|------|----------|------|
| 1 | EcommerceOrderService.create() 호출 | **필수** | ☐ |
| 2 | OrderType 명시적 지정 | **필수** | ☐ |
| 3 | buyerId, sellerId 설정 | **필수** | ☐ |
| 4 | totalAmount 계산 및 설정 | **필수** | ☐ |

### 3.2 OrderType 결정 (필수)

| # | 항목 | 필수/선택 | 확인 |
|---|------|----------|------|
| 5 | OrderType은 **생성 시점**에 결정 | **필수** | ☐ |
| 6 | OrderType은 **절대 변경 금지** | **금지** | ☐ |
| 7 | 서비스에 맞는 OrderType 선택 | **필수** | ☐ |

**OrderType 선택 가이드:**

| OrderType | 사용 조건 |
|-----------|----------|
| `retail` | 직접 재고 보유 판매 |
| `dropshipping` | 공급자 직배송 (Offer→Listing→Relay 구조) |
| `b2b` | 사업자 간 거래 |
| `subscription` | 정기 구독, 연회비 |

### 3.3 ecommerceOrderId 연결 (필수)

| # | 항목 | 필수/선택 | 확인 |
|---|------|----------|------|
| 8 | 서비스 Entity에 `ecommerceOrderId` 컬럼 추가 | **필수** | ☐ |
| 9 | DTO에 `ecommerceOrderId` 필드 추가 | **필수** | ☐ |
| 10 | Service에서 `ecommerceOrderId` 전달 및 저장 | **필수** | ☐ |
| 11 | `findByEcommerceOrderId()` 조회 메서드 구현 | **필수** | ☐ |

### 3.4 Dropshipping Core 연계 (조건부)

| # | 항목 | 필수/선택 | 확인 |
|---|------|----------|------|
| 12 | `orderType === 'dropshipping'`인 경우만 Relay 사용 | **필수** | ☐ |
| 13 | 다른 OrderType에서 Relay 호출 금지 | **금지** | ☐ |
| 14 | OrderRelay에 `ecommerceOrderId` 연결 | **조건부** | ☐ |

### 3.5 통계/조회 (필수)

| # | 항목 | 필수/선택 | 확인 |
|---|------|----------|------|
| 15 | 통합 통계는 `EcommerceOrderQueryService` 사용 | **필수** | ☐ |
| 16 | 서비스별 자체 통계는 보조 목적으로만 사용 | **권장** | ☐ |

---

## 4. 금지 사항

| # | 금지 항목 | 사유 |
|---|----------|------|
| ❌ | E-commerce Core 우회 주문 생성 | 판매 원장 무결성 훼손 |
| ❌ | OrderType 생성 후 변경 | 통계/분기 로직 파괴 |
| ❌ | ecommerceOrderId 없이 서비스 주문만 생성 | 통합 조회 불가 |
| ❌ | dropshipping 외 OrderType에서 Relay 사용 | 구조 오용 |
| ❌ | 자체 통계로 통합 통계 대체 | 데이터 불일치 |

---

## 5. 구현 예시

### 5.1 주문 생성 흐름

```typescript
// 1. E-commerce Core 주문 생성
const ecommerceOrder = await ecommerceOrderService.create({
  buyerId: memberId,
  buyerType: BuyerType.USER,
  sellerId: organizationId,
  sellerType: SellerType.ORGANIZATION,
  orderType: OrderType.SUBSCRIPTION, // 또는 RETAIL, B2B, DROPSHIPPING
  items: [{ productName: '연회비', quantity: 1, unitPrice: amount }],
});

// 2. 서비스별 Entity 생성 시 연결
const payment = await feePaymentService.create({
  invoiceId: invoice.id,
  memberId: memberId,
  amount: amount,
  method: 'card',
  ecommerceOrderId: ecommerceOrder.id, // 필수 연결
});
```

### 5.2 조회 예시

```typescript
// E-commerce Core 기준 조회
const orders = await ecommerceOrderQueryService.findByOrderType(
  OrderType.SUBSCRIPTION,
  { startDate, endDate }
);

// 서비스별 상세 조회
const payment = await feePaymentService.findByEcommerceOrderId(orderId);
```

---

## 6. 검증 항목

개발 완료 후 다음 항목을 반드시 검증합니다:

| # | 검증 항목 | 확인 |
|---|----------|------|
| 1 | 주문 생성 시 EcommerceOrder가 먼저 생성되는가? | ☐ |
| 2 | 서비스 Entity에 ecommerceOrderId가 저장되는가? | ☐ |
| 3 | OrderType이 올바르게 설정되는가? | ☐ |
| 4 | EcommerceOrderQueryService로 조회 가능한가? | ☐ |
| 5. | 빌드가 성공하는가? | ☐ |

---

## 7. 관련 문서

- [E-commerce Core 적용 현황](../../specs/ecommerce-core/application-status.md)
- [미적용 예외 승인 규칙](./exemption-policy.md)
- [개발 에이전트 가이드라인](./agent-guidelines.md)

---

*이 체크리스트는 E-commerce Core 운영 규칙의 일부입니다.*
*변경 시 별도 RFC 또는 Phase 승인 절차가 필요합니다.*
