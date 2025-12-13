# E-commerce Core 개발 에이전트 가이드라인

**Version**: 1.0
**Status**: Operational (운영 규칙 고정)
**Last Updated**: 2025-12-13
**Target**: Claude Code 및 모든 개발 에이전트

---

## 1. 핵심 규칙 (절대 준수)

### 1.1 주문 생성 = E-commerce Core 사용

> **"주문을 생성하는 모든 코드는 E-commerce Core를 사용한다."**

이 규칙은 **예외 없이 적용**됩니다.

```typescript
// ✅ 올바른 방식
const ecommerceOrder = await ecommerceOrderService.create({
  orderType: OrderType.SUBSCRIPTION,
  // ...
});
const payment = await feePaymentService.create({
  ecommerceOrderId: ecommerceOrder.id,
  // ...
});

// ❌ 잘못된 방식 (E-commerce Core 우회)
const payment = await feePaymentService.create({
  // ecommerceOrderId 없이 생성 - 금지
  // ...
});
```

### 1.2 OrderType 불변성

> **"OrderType은 생성 시점에 결정되며, 절대 변경하지 않는다."**

```typescript
// ✅ 올바른 방식
const order = await ecommerceOrderService.create({
  orderType: OrderType.B2B, // 생성 시 결정
});

// ❌ 잘못된 방식
order.orderType = OrderType.RETAIL; // 변경 금지
await orderRepository.save(order);
```

### 1.3 ecommerceOrderId 필수 연결

> **"주문/결제 Entity는 반드시 ecommerceOrderId를 저장한다."**

서비스별 Entity 생성 시:
1. EcommerceOrder를 먼저 생성
2. 반환된 ID를 서비스 Entity에 저장
3. 조회 메서드 구현

---

## 2. DO (해야 할 것)

### 2.1 주문/결제 개발 시

| # | 항목 |
|---|------|
| ✅ | EcommerceOrderService.create()를 먼저 호출 |
| ✅ | OrderType을 명시적으로 지정 |
| ✅ | ecommerceOrderId를 서비스 Entity에 저장 |
| ✅ | findByEcommerceOrderId() 메서드 구현 |
| ✅ | 통계 조회 시 EcommerceOrderQueryService 사용 |

### 2.2 신규 서비스 개발 시

| # | 항목 |
|---|------|
| ✅ | 주문/결제 여부 먼저 판단 |
| ✅ | E-commerce Core 적용 필요 시 체크리스트 따르기 |
| ✅ | 미적용 시 exemption-policy.md에 따라 문서화 |

### 2.3 기존 서비스 수정 시

| # | 항목 |
|---|------|
| ✅ | ecommerceOrderId 연결 상태 확인 |
| ✅ | 누락된 경우 보완 작업 진행 |
| ✅ | OrderType 변경 로직이 없는지 확인 |

---

## 3. DON'T (하지 말아야 할 것)

### 3.1 절대 금지

| # | 항목 | 사유 |
|---|------|------|
| ❌ | E-commerce Core 우회 주문 생성 | 판매 원장 무결성 훼손 |
| ❌ | OrderType 변경 | 통계/분기 로직 파괴 |
| ❌ | ecommerceOrderId 없이 서비스 주문 생성 | 통합 조회 불가 |
| ❌ | dropshipping 외 OrderType에서 Relay 사용 | 구조 오용 |

### 3.2 피해야 할 패턴

```typescript
// ❌ 피해야 할 패턴 1: 직접 주문 생성
const order = orderRepository.create({ ... });
await orderRepository.save(order);
// → EcommerceOrderService.create() 사용해야 함

// ❌ 피해야 할 패턴 2: OrderType 동적 변경
if (someCondition) {
  order.orderType = OrderType.RETAIL;
}
// → OrderType은 생성 시 고정

// ❌ 피해야 할 패턴 3: Dropshipping Core 오용
if (order.orderType === OrderType.B2B) {
  await orderRelayService.createOrder(...);
}
// → Relay는 dropshipping 전용
```

---

## 4. OrderType 결정 책임

### 4.1 결정 주체

OrderType은 **Service App/Extension**이 결정합니다.

| 서비스 | OrderType | 결정 주체 |
|--------|-----------|----------|
| dropshipping-cosmetics | dropshipping | 화장품 Extension |
| pharmaceutical-core | b2b | 의약품 Core |
| annualfee-yaksa | subscription/retail | 회비 Extension |

### 4.2 결정 기준

| OrderType | 사용 조건 |
|-----------|----------|
| `retail` | 직접 재고 보유, 단일 판매자 |
| `dropshipping` | 공급자 직배송, Offer→Listing→Relay 구조 |
| `b2b` | 사업자 간 거래, 대량 주문 |
| `subscription` | 정기 결제, 연회비, 반복 주문 |

---

## 5. Dropshipping Core 사용 규칙

### 5.1 사용 조건

Dropshipping Core(OrderRelay, Settlement 등)는 **오직 `orderType === 'dropshipping'`인 경우에만** 사용합니다.

```typescript
// ✅ 올바른 사용
if (order.orderType === OrderType.DROPSHIPPING) {
  await orderRelayService.createOrder({
    ecommerceOrderId: order.id,
    // ...
  });
}

// ❌ 잘못된 사용
// B2B 주문에 Relay 사용 - 금지
if (order.orderType === OrderType.B2B) {
  await orderRelayService.createOrder(...);
}
```

### 5.2 연계 필요 서비스

| 서비스 | Dropshipping Core 연계 |
|--------|----------------------|
| dropshipping-cosmetics | ✅ 필요 |
| pharmaceutical-core | ❌ 불필요 (B2B 직거래) |
| annualfee-yaksa | ❌ 불필요 (배송 없음) |

---

## 6. 선행 사례 요약

### 6.1 Phase 4: 화장품 서비스 적용

- dropshipping-core에 ecommerceOrderId 추가
- sellerops에 OrderIntegrationService 구현
- OrderRelay → EcommerceOrder 연결

### 6.2 Phase 5: 약사회 서비스 적용

- pharmaceutical-core에 ecommerceOrderId 추가
- annualfee-yaksa에 ecommerceOrderId 추가
- 각 서비스에 findByEcommerceOrderId() 구현

### 6.3 Phase X: 전 서비스 Audit

- 모든 주문/결제 경로 조사
- 구조 위반 항목 식별
- annualfee-yaksa 연결 미완료 발견

### 6.4 Phase Y: Audit Follow-up

- annualfee-yaksa CreatePaymentDto에 ecommerceOrderId 추가
- FeePaymentService.findByEcommerceOrderId() 구현
- 문서-코드 정합성 완료

---

## 7. 체크리스트 (개발 전 확인)

### 7.1 주문/결제 기능 개발 시

```
☐ E-commerce Core 적용 대상인가?
☐ OrderType을 결정했는가?
☐ EcommerceOrderService.create() 호출 코드가 있는가?
☐ ecommerceOrderId를 Entity에 저장하는가?
☐ findByEcommerceOrderId() 메서드가 있는가?
☐ Dropshipping Core 연계가 필요한가? (dropshipping인 경우만)
```

### 7.2 개발 완료 후

```
☐ 빌드가 성공하는가?
☐ EcommerceOrder가 생성되는가?
☐ ecommerceOrderId가 저장되는가?
☐ EcommerceOrderQueryService로 조회 가능한가?
```

---

## 8. 관련 문서

- [신규 서비스 주문 생성 체크리스트](./new-service-order-checklist.md)
- [미적용 예외 승인 규칙](./exemption-policy.md)
- [E-commerce Core 적용 현황](../../specs/ecommerce-core/application-status.md)
- [Phase X Audit 보고서](../../reports/ecommerce-core-phasex-audit-report.md)
- [Phase Y 완료 보고서](../../reports/ecommerce-core-phasey-followup-completion.md)

---

*이 가이드라인은 E-commerce Core 운영 규칙의 일부입니다.*
*모든 개발 에이전트(Claude Code 포함)는 이 규칙을 준수해야 합니다.*
*변경 시 별도 RFC 또는 Phase 승인 절차가 필요합니다.*
