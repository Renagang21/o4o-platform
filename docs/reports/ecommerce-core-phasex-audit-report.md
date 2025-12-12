# E-commerce Core 전 서비스 Audit 보고서

**Date**: 2025-12-13
**Branch**: `feature/ecommerce-core-audit-phasex`
**Status**: Audit Complete

---

## 1. 개요

E-commerce Core Introduction Phase 종료 이후, 플랫폼 전반의 주문·결제·정산 구조가
설계 원칙을 정확히 따르고 있는지 전수 감사(Audit)를 수행했습니다.

### 1.1 Audit 대상 서비스

| 서비스 | 패키지 | 조사 완료 |
|--------|--------|----------|
| E-commerce Core | ecommerce-core | ✅ |
| Dropshipping Core | dropshipping-core | ✅ |
| SellerOps | sellerops | ✅ |
| Pharmaceutical Core | pharmaceutical-core | ✅ |
| Annualfee Yaksa | annualfee-yaksa | ✅ |
| PartnerOps | partnerops | ✅ |

---

## 2. 주문 생성 Audit

### 2.1 주문 생성 지점 식별

| 서비스 | 메서드 | E-commerce Core 사용 | 비고 |
|--------|--------|---------------------|------|
| ecommerce-core | EcommerceOrderService.create() | ✅ 원장 | 판매 원장 생성 |
| dropshipping-core | OrderRelayService.createOrder() | ⚠ 간접 | ecommerceOrderId 수신 방식 |
| pharmaceutical-core | PharmaOrderService.create() | ⚠ 간접 | ecommerceOrderId 수신 방식 |
| annualfee-yaksa | FeePaymentService.create() | ❌ 미사용 | ecommerceOrderId 미연결 |
| partnerops | ConversionService.recordConversion() | ❌ 해당없음 | 전환 추적 (주문 생성 아님) |

### 2.2 발견 사항

#### 2.2.1 정상 구조

- **EcommerceOrderService**: 판매 원장 생성의 유일한 진입점
- **PharmaOrderService**: CreatePharmaOrderDto에 ecommerceOrderId 포함, 문서화 우수

#### 2.2.2 구조 위반/개선 필요

| 위반 유형 | 서비스 | 상세 | 심각도 |
|----------|--------|------|--------|
| **ecommerceOrderId 미사용** | annualfee-yaksa | FeePaymentService.create()가 ecommerceOrderId를 설정하지 않음 | 🟡 중간 |
| **우회 생성 가능성** | dropshipping-core | OrderRelayService.createOrder()에서 ecommerceOrderId 없이 생성 가능 | 🟡 중간 |

### 2.3 ecommerceOrderId 누락 케이스

```typescript
// annualfee-yaksa/FeePaymentService.ts:81
const payment = this.repo.create({
  ...dto,
  paidAt: dto.paidAt || new Date(),
  status: 'pending',
  receiptNumber,
  // ❌ ecommerceOrderId 미설정 - CreatePaymentDto에 필드 없음
});
```

**영향**: FeePayment Entity에 ecommerceOrderId 필드가 있지만, Service DTO에서 누락되어 연결 불가

---

## 3. OrderType Audit

### 3.1 OrderType 정의 현황

```typescript
// ecommerce-core/entities/EcommerceOrder.entity.ts
export enum OrderType {
  RETAIL = "retail",
  DROPSHIPPING = "dropshipping",
  B2B = "b2b",
  SUBSCRIPTION = "subscription"
}
```

### 3.2 서비스별 OrderType 매핑 준수 현황

| 서비스 | 예상 OrderType | 코드 준수 | 비고 |
|--------|---------------|----------|------|
| dropshipping-core | dropshipping | ✅ | 호출자가 지정 |
| pharmaceutical-core | b2b | ✅ | 문서에 명시 |
| annualfee-yaksa | subscription/retail | ⚠ | 연결 안됨 |

### 3.3 OrderType 불변성

**결론**: OrderType 불변성 위반 없음
- EcommerceOrderService에 OrderType 변경 메서드 없음
- 각 서비스에서 주문 생성 후 OrderType 수정 로직 발견되지 않음

---

## 4. 결제 처리 Audit

### 4.1 결제 상태 관리 주체

| 서비스 | 결제 상태 필드 | E-commerce Core 연계 |
|--------|--------------|---------------------|
| ecommerce-core | PaymentStatus (enum) | ✅ 원장 |
| dropshipping-core | OrderRelay.paymentStatus (없음) | ✅ 원장 참조 |
| pharmaceutical-core | PharmaPaymentStatus (자체) | 🟡 별도 관리 |
| annualfee-yaksa | PaymentStatus (자체) | 🟡 별도 관리 |

### 4.2 발견 사항

#### 4.2.1 결제 상태 중복 관리

| 서비스 | 자체 결제 상태 | E-commerce Core 동기화 |
|--------|--------------|----------------------|
| pharmaceutical-core | PharmaPaymentStatus | ❌ 미동기화 |
| annualfee-yaksa | PaymentStatus | ❌ 미동기화 |

**분석**:
- 서비스별 자체 결제 상태는 해당 도메인 특화 상태 관리를 위한 것으로 적절
- 단, E-commerce Core의 PaymentStatus와 동기화 메커니즘 필요 (Phase Y 후보)

---

## 5. Dropshipping 연계 Audit

### 5.1 Dropshipping Core 호출 조건

| 서비스 | Relay/Settlement 호출 | 적절성 |
|--------|---------------------|--------|
| sellerops | ✅ OrderRelay 조회 | 적절 |
| pharmaceutical-core | ❌ 미호출 | 적절 (B2B 직거래) |
| annualfee-yaksa | ❌ 미호출 | 적절 (회비, 배송 없음) |

### 5.2 ecommerceOrderId 기반 조회

| 서비스 | 메서드 | 구현 여부 |
|--------|--------|----------|
| dropshipping-core | OrderRelayService.findByEcommerceOrderId() | ✅ |
| dropshipping-core | OrderRelayService.findByEcommerceOrderIds() | ✅ |
| pharmaceutical-core | PharmaOrderService.findByEcommerceOrderId() | ✅ |
| sellerops | OrderIntegrationService.getEcommerceOrderInfo() | ✅ |

**결론**: Dropshipping 연계 구조 정상

---

## 6. 정산/통계 Audit

### 6.1 정산 로직 기준

| 서비스 | 정산 기준 | E-commerce Core 기준 |
|--------|----------|---------------------|
| dropshipping-core | CommissionTransaction → SettlementBatch | 🟡 자체 기준 |
| pharmaceutical-core | PharmaOrder → PharmaSettlementBatch | 🟡 자체 기준 |
| annualfee-yaksa | FeePayment → FeeSettlement | 🟡 자체 기준 |
| sellerops | OrderIntegrationService | ✅ E-commerce Core 조회 |

### 6.2 통계 로직 중복

| 서비스 | 통계 메서드 | EcommerceOrderQueryService 사용 |
|--------|-----------|--------------------------------|
| dropshipping-core | SettlementService.createSettlementBatch() | ❌ |
| pharmaceutical-core | PharmaSettlementService.getStats() | ❌ |
| annualfee-yaksa | FeePaymentService.getStatistics() | ❌ |
| sellerops | OrderIntegrationService.getIntegratedOrderSummary() | ✅ |

### 6.3 발견 사항

#### 6.3.1 정산 로직의 분리된 구조

**분석**: 각 서비스별 정산 로직이 독립적으로 구현되어 있으나, 이는 **의도된 설계**:

1. **E-commerce Core 책임**: 판매 사실 기록 (원장)
2. **각 Core App 책임**: 해당 도메인의 정산 계산

> EcommerceOrderQueryService 주석: "정산 계산, 공급자 분배 등의 로직은 포함하지 않습니다. 이는 각 Core App의 책임입니다."

#### 6.3.2 통합 통계 미사용 영역

- pharmaceutical-core, annualfee-yaksa의 통계 로직이 EcommerceOrderQueryService를 활용하지 않음
- ecommerceOrderId 연결이 완료되면 통합 통계 활용 가능

---

## 7. 문서-코드 정합성 Audit

### 7.1 docs/specs/ecommerce-core 문서 비교

| 문서 항목 | 코드 일치 | 비고 |
|----------|----------|------|
| OrderType 정의 (retail, dropshipping, b2b, subscription) | ✅ | 일치 |
| Phase 4 적용 (dropshipping-core, sellerops) | ✅ | 일치 |
| Phase 5 적용 (pharmaceutical-core, annualfee-yaksa) | ⚠ | 코드는 있으나 실제 연결 미완료 |
| 적용 제외 서비스 (partnerops) | ✅ | 일치 |

### 7.2 불일치 항목

| 문서 | 코드 | 불일치 내용 |
|------|------|-----------|
| application-status.md | annualfee-yaksa | 문서: ecommerceOrderId 적용됨 → 코드: Entity만 적용, Service 미연결 |

---

## 8. 구조 위반 항목 요약

### 8.1 즉시 수정 불필요 (의도된 설계)

| 항목 | 사유 |
|------|------|
| 각 서비스별 정산 로직 분리 | E-commerce Core는 원장, 정산은 각 Core App 책임 |
| 각 서비스별 자체 결제 상태 | 도메인 특화 상태 관리 필요 |

### 8.2 장기 과제 (Phase Y 후보)

| 항목 | 우선순위 | 설명 |
|------|---------|------|
| **annualfee-yaksa ecommerceOrderId 연결** | 🟠 중간 | CreatePaymentDto에 ecommerceOrderId 추가 필요 |
| **결제 상태 동기화 메커니즘** | 🟢 낮음 | 서비스별 PaymentStatus ↔ E-commerce Core 동기화 |
| **통합 통계 확대 적용** | 🟢 낮음 | 모든 서비스에서 EcommerceOrderQueryService 활용 |
| **주문 생성 강제 검증** | 🟡 선택 | ecommerceOrderId 없이 OrderRelay 생성 방지 훅 |

---

## 9. 개선 권장 사항

### 9.1 Phase Y-1: annualfee-yaksa 완전 연결

```typescript
// 수정 필요: CreatePaymentDto
export interface CreatePaymentDto {
  invoiceId: string;
  memberId: string;
  amount: number;
  method: PaymentMethod;
  ecommerceOrderId?: string; // 추가 필요
  // ...
}
```

### 9.2 Phase Y-2: 주문 생성 검증 강화

```typescript
// OrderRelayService.createOrder() 개선 제안
async createOrder(data: Partial<OrderRelay>): Promise<OrderRelay> {
  // 추가: ecommerceOrderId 필수 검증 (선택적)
  if (!data.ecommerceOrderId) {
    console.warn('OrderRelay created without ecommerceOrderId - legacy mode');
  }
  // ...
}
```

### 9.3 Phase Y-3: 결제 상태 동기화 이벤트

```typescript
// 제안: 결제 완료 시 E-commerce Core 동기화
eventEmitter.emit('payment.completed', {
  serviceOrderId: pharmaOrder.id,
  ecommerceOrderId: pharmaOrder.ecommerceOrderId,
  paymentStatus: 'paid',
});
```

---

## 10. 결론

### 10.1 Audit 결과 요약

| 항목 | 결과 |
|------|------|
| 주문 생성 경로 | ⚠ 대부분 정상, annualfee-yaksa 연결 미완료 |
| OrderType 준수 | ✅ 정상 |
| 결제 처리 구조 | ✅ 의도된 설계 (서비스별 자체 관리) |
| Dropshipping 연계 | ✅ 정상 |
| 정산/통계 구조 | ✅ 의도된 설계 (분리된 책임) |
| 문서-코드 정합성 | ⚠ annualfee-yaksa 불일치 |

### 10.2 핵심 발견 사항

1. **E-commerce Core 구조는 올바르게 설계됨**
   - 판매 원장 역할 수행
   - OrderType 불가지론 원칙 준수
   - 정산은 각 Core App 책임으로 적절히 분리

2. **annualfee-yaksa 연결 미완료**
   - Entity에 ecommerceOrderId 필드 존재
   - Service에서 실제 사용하지 않음
   - Phase Y에서 완전 연결 필요

3. **통합 통계 활용 확대 여지**
   - EcommerceOrderQueryService 활용률 낮음
   - ecommerceOrderId 연결 완료 후 통합 대시보드 구현 가능

### 10.3 다음 단계

| 단계 | 작업 | 우선순위 |
|------|------|---------|
| Phase Y-1 | annualfee-yaksa CreatePaymentDto에 ecommerceOrderId 추가 | 🟠 중간 |
| Phase Y-2 | 문서 업데이트 (application-status.md 정확성 개선) | 🟢 낮음 |
| Phase Y-3 | 통합 대시보드 개발 | 🟢 낮음 |

---

## 부록: Audit 체크리스트

| # | 항목 | 상태 |
|---|------|------|
| 1 | 모든 주문 생성 지점 식별 | ✅ |
| 2 | E-commerce Core(EcommerceOrder) 사용 여부 확인 | ✅ |
| 3 | ecommerceOrderId 누락 케이스 탐지 | ✅ |
| 4 | 주문 우회 생성 로직 존재 여부 확인 | ✅ |
| 5 | 주문 생성 시 OrderType 명시 여부 확인 | ✅ |
| 6 | OrderType 불변성 위반 여부 확인 | ✅ |
| 7 | 서비스별 OrderType 매핑 일치 점검 | ✅ |
| 8 | 결제 상태 판단 주체 확인 | ✅ |
| 9 | EcommercePayment 기준 사용 여부 점검 | ✅ |
| 10 | 서비스별 자체 결제 상태 관리 중복 여부 확인 | ✅ |
| 11 | orderType === 'dropshipping' 외 호출 여부 점검 | ✅ |
| 12 | ecommerceOrderId 기준 조회 사용 여부 확인 | ✅ |
| 13 | 불필요한 Relay/Settlement 호출 여부 확인 | ✅ |
| 14 | 정산/통계 로직이 판매 사실 기준인지 확인 | ✅ |
| 15 | 서비스별 자체 집계 로직 중복 여부 점검 | ✅ |
| 16 | EcommerceOrderQueryService 미사용 영역 식별 | ✅ |
| 17 | docs/specs/ecommerce-core 문서와 실제 코드 비교 | ✅ |
| 18 | OrderType 정의, 책임 경계 불일치 항목 정리 | ✅ |
| 19 | 적용 제외 서비스 사유가 코드상으로도 명확한지 확인 | ✅ |

---

*E-commerce Core Audit Phase Complete*
*O4O Platform Team*
