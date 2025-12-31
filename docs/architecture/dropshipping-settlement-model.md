# Dropshipping Settlement Model Architecture (DS-4.2)

> **이 문서는 Dropshipping 정산(Settlement)의 개념과 계산 계약을 정의한다.**
> Settlement는 계산 시스템이지 결제 시스템이 아니다.
> 이 문서를 위반하는 구현은 버그로 간주된다.

**Version:** 1.0.0
**Status:** Active
**Authority:** DS-1 (Dropshipping Domain Rules)
**Last Updated:** 2025-12-31

---

## 1. Settlement란 무엇인가?

### 1.1 정의

**Settlement(정산)**은 완료된 거래에 대해 각 참여자에게 지급/수취할 금액을
**계산하고 기록**하는 시스템이다.

Settlement는 다음을 수행한다:

| 수행 항목 | 설명 |
|-----------|------|
| **금액 계산** | 거래별 수수료, 순 지급액 산정 |
| **배치 집계** | 일정 기간의 거래를 묶어 정산 단위 생성 |
| **기록 유지** | 계산 결과와 산정 근거 보존 |
| **상태 추적** | 정산 진행 상태 관리 |

### 1.2 Settlement가 아닌 것 (Payment와의 구분)

Settlement와 Payment는 **명확히 구분**된다.

| 구분 | Settlement (정산) | Payment (결제/지급) |
|------|------------------|-------------------|
| **역할** | 금액 계산 | 금액 이동 |
| **담당** | Dropshipping Core | Finance/Payment 시스템 |
| **결과물** | 정산 명세서 | 계좌 이체 기록 |
| **시점** | 거래 완료 후 | 정산 확정 후 |
| **책임** | 얼마를 지급해야 하는가 | 실제로 지급하였는가 |

```
Settlement ≠ Payment
Settlement = 계산 (What to pay)
Payment = 실행 (Actually paying)
```

### 1.3 Settlement는 계산 계약이다

Dropshipping Settlement는 **계산 계약(Calculation Contract)**이다.

계산 계약이란:
- 동일한 입력에 대해 **항상 동일한 출력**을 보장
- 계산 로직이 **문서화되고 검증 가능**
- 계산 결과가 **재현 가능(Replayable)**
- 계산 시점의 **입력값이 보존**됨

---

## 2. Settlement 참여자 (Actors)

### 2.1 핵심 참여자

Settlement에는 세 가지 핵심 참여자가 존재한다.

| 참여자 | 역할 | 정산 방향 |
|--------|------|----------|
| **Seller** | 판매자 | 수취 (판매 수익) |
| **Supplier** | 공급자 | 수취 (공급 대금) |
| **Platform** | 플랫폼 | 수취 (수수료) |

### 2.2 Seller ↔ Supplier 정산

Seller와 Supplier 간의 정산 흐름:

```
고객 결제 금액 (판매가)
    ↓
(-) Platform 수수료
(-) Supplier 공급가
    ↓
= Seller 순이익
```

| 항목 | 계산 주체 | 기준 |
|------|----------|------|
| 판매가 | 확정 | SellerListing.sellingPrice |
| 공급가 | 확정 | SupplierProductOffer.supplierPrice |
| Platform 수수료 | 계산 | CommissionRule에 따름 |

### 2.3 Platform 수수료 (Commission)

Platform은 거래에서 수수료를 수취한다.

| 수수료 유형 | 설명 |
|------------|------|
| **기본 수수료** | 거래 금액의 일정 비율 |
| **등급별 수수료** | Seller/Supplier 등급에 따른 차등 |
| **카테고리 수수료** | 상품 카테고리별 차등 |
| **프로모션 수수료** | 특정 기간/조건 할인 |

수수료 계산은 **CommissionRule** 엔티티에 정의된 규칙을 따른다.

### 2.4 Partner 수수료 (선택적)

특정 서비스에서는 Partner가 수수료를 수취할 수 있다.

| 조건 | Partner 수수료 |
|------|---------------|
| Partner 거래 | 별도 CommissionRule 적용 |
| 일반 거래 | Partner 수수료 없음 |

Partner 정산은 `SettlementType.PLATFORM_EXTENSION`을 사용하며,
`extensionType` 필드로 세부 유형을 구분한다.

---

## 3. 정산 시점 규칙 (Timing Rules)

### 3.1 정산이 계산되는 시점

Settlement 금액은 다음 시점에 **계산**된다.

| 시점 | 조건 | 계산 항목 |
|------|------|----------|
| **주문 확정** | OrderRelay.status = confirmed | 예상 수수료 (provisional) |
| **배송 완료** | OrderRelay.status = delivered | 확정 수수료 (final) |
| **정산 마감** | SettlementBatch.status = closed | 배치 합계 |

### 3.2 정산이 불변이 되는 시점

Settlement는 특정 시점 이후 **불변(Immutable)**이 된다.

| 상태 | 불변 범위 |
|------|----------|
| `OPEN` | 모든 필드 변경 가능 |
| `CLOSED` | 거래 추가 불가, 금액 수정 불가 |
| `PROCESSING` | 모든 필드 불변 |
| `PAID` | 완전 불변 (터미널 상태) |
| `FAILED` | 재시도 가능, 금액 불변 |

### 3.3 정산 주기

정산 배치는 다음 주기로 생성된다.

| 주기 유형 | 설명 | 사용 사례 |
|-----------|------|----------|
| **일간** | 매일 마감 | 고빈도 거래 |
| **주간** | 매주 마감 | 일반 거래 |
| **월간** | 매월 마감 | 저빈도 거래 |
| **수동** | 관리자 결정 | 특수 상황 |

정산 주기는 **SettlementBatch.periodStart / periodEnd**로 정의된다.

---

## 4. 책임 경계 (Responsibility Boundaries)

### 4.1 Dropshipping이 수행하는 것

| 책임 | 설명 |
|------|------|
| **수수료 계산** | CommissionRule 적용하여 금액 산정 |
| **배치 생성** | 정산 기간별 SettlementBatch 생성 |
| **거래 집계** | CommissionTransaction을 배치에 연결 |
| **상태 관리** | OPEN → CLOSED → PROCESSING → PAID |
| **명세서 제공** | 정산 내역 조회 API |

### 4.2 Dropshipping이 수행하지 않는 것

| 금지 항목 | 담당 시스템 |
|-----------|------------|
| **계좌 이체** | Finance/Banking 시스템 |
| **PG 연동** | Payment Core |
| **세금 계산** | Tax 시스템 |
| **인보이스 발행** | Billing 시스템 |
| **외환 처리** | Finance 시스템 |

### 4.3 Finance/Payment 시스템 역할

정산 확정 후 Finance/Payment 시스템이 실제 지급을 수행한다.

```
Dropshipping Settlement (계산 완료)
    ↓
SettlementBatch.status = CONFIRMED
    ↓
Finance 시스템이 지급 실행
    ↓
지급 완료 확인
    ↓
SettlementBatch.status = PAID (Dropshipping에서 상태만 갱신)
```

Dropshipping은 **지급 완료 여부를 수신**할 뿐, 직접 실행하지 않는다.

---

## 5. 조정 철학 (Reconciliation Philosophy)

### 5.1 결정론적 입력 (Deterministic Inputs)

Settlement 계산은 **결정론적 입력**만 사용한다.

| 입력 | 출처 | 특성 |
|------|------|------|
| 주문 금액 | OrderRelay.totalPrice | 불변 (confirmed 이후) |
| 공급가 | 스냅샷 저장 | 주문 시점 가격 |
| 수수료율 | CommissionRule | 주문 시점 규칙 적용 |
| 수량 | OrderRelay.quantity | 불변 (confirmed 이후) |

### 5.2 재현 가능한 계산 (Replayable Calculation)

Settlement 계산은 언제든 **재현**할 수 있어야 한다.

| 원칙 | 설명 |
|------|------|
| **입력 보존** | 계산에 사용된 모든 입력값 저장 |
| **규칙 버전** | 적용된 CommissionRule ID 기록 |
| **계산 상세** | calculationDetails에 산식 기록 |
| **시점 기록** | 계산 수행 시점 기록 |

재현 시 동일한 입력으로 동일한 결과가 나와야 한다.

### 5.3 이력 추적

모든 정산 변경은 **이력이 추적**되어야 한다.

| 추적 항목 | 기록 방식 |
|-----------|----------|
| 상태 변경 | SettlementBatch 상태 로그 |
| 금액 조정 | CommissionTransaction 수정 로그 |
| 규칙 변경 | CommissionRule 버전 관리 |
| 분쟁 기록 | metadata.disputeHistory |

---

## 6. 특수 상황 처리 (Special Cases)

### 6.1 분쟁 (Disputes)

정산에 이의가 제기된 경우:

| 단계 | 처리 |
|------|------|
| 이의 접수 | SettlementBatch 상태를 DISPUTED로 변경 불가 → metadata에 기록 |
| 조사 | 원본 거래 데이터로 재계산 |
| 해결 | 조정 거래 생성 (원본 변경 금지) |
| 반영 | 다음 배치에 조정분 포함 |

**원칙**: 기존 정산을 수정하지 않고, 조정 거래를 생성한다.

### 6.2 반품/환불 (Returns/Refunds)

반품/환불 발생 시:

| 상황 | 처리 |
|------|------|
| 배송 전 취소 | 원 거래 수수료 계산 취소 |
| 배송 후 반품 | 역정산 거래 생성 |
| 부분 환불 | 환불 비율만큼 조정 거래 생성 |

```
원 거래: +100,000원 (수수료 -10,000원)
환불 후: -100,000원 조정 거래 추가
결과: 수수료 0원
```

### 6.3 부분 이행 (Partial Fulfillment)

부분만 이행된 경우:

| 상황 | 처리 |
|------|------|
| 일부 수량 출고 | 출고된 수량만 정산 대상 |
| 나머지 취소 | 취소분은 정산에서 제외 |
| 분할 배송 | 배송별 정산 분리 (선택) |

수수료는 **실제 이행된 금액**에 대해서만 계산된다.

---

## 7. 금지된 지름길 (Forbidden Shortcuts)

### 7.1 절대 금지 사항

다음은 **어떤 상황에서도 금지**된다.

| 금지 항목 | 이유 |
|-----------|------|
| **실시간 재계산** | "just recalc on the fly" - 감사 불가 |
| **원본 수정** | CLOSED 이후 금액 직접 변경 - 무결성 훼손 |
| **규칙 소급 적용** | 과거 거래에 새 수수료율 적용 - 계약 위반 |
| **배치 삭제** | PAID 배치 삭제 - 감사 로그 훼손 |
| **외부 금액 직접 사용** | 검증 없이 외부 시스템 금액 신뢰 - 불일치 |

### 7.2 올바른 대안

| 상황 | 잘못된 접근 | 올바른 접근 |
|------|------------|------------|
| 금액 오류 발견 | 원본 수정 | 조정 거래 생성 |
| 새 수수료율 적용 | 과거 거래 재계산 | 적용 시점 이후 거래만 |
| 배치 오류 | 배치 삭제 | 역배치 생성 후 재생성 |
| 분쟁 해결 | 원본 변경 | 분쟁 해결 거래 추가 |

### 7.3 "빠른 수정" 금지

운영 중 다음과 같은 요청이 있을 수 있다:

```
"이번만 수수료 직접 수정해주세요"
"지난달 정산 금액 다시 계산해주세요"
"이 거래는 정산에서 빼주세요"
```

이러한 요청은 **조정 거래** 방식으로만 처리한다.
직접 수정은 감사 추적을 불가능하게 만든다.

---

## 8. CommissionTransaction 구조

### 8.1 거래별 기록

각 OrderRelay에 대해 **CommissionTransaction**이 생성된다.

| 필드 | 설명 | 불변 시점 |
|------|------|----------|
| `orderRelayId` | 원본 주문 참조 | 생성 시 |
| `commissionRuleId` | 적용된 규칙 | 생성 시 |
| `orderAmount` | 주문 금액 | 생성 시 |
| `commissionAmount` | 수수료 금액 | 생성 시 |
| `appliedRate` | 적용 수수료율 | 생성 시 |
| `calculationDetails` | 계산 상세 | 생성 시 |
| `settlementBatchId` | 소속 배치 | 배치 마감 시 |

### 8.2 계산 상세 기록

`calculationDetails`에는 다음이 포함되어야 한다:

```json
{
  "baseAmount": 100000,
  "ruleId": "uuid",
  "ruleVersion": 1,
  "rateType": "percentage",
  "rate": 10.0,
  "calculatedAmount": 10000,
  "calculatedAt": "2025-12-31T10:00:00Z",
  "inputs": {
    "sellingPrice": 100000,
    "supplierPrice": 70000,
    "quantity": 1
  }
}
```

---

## 9. 준수 체크리스트

Settlement 구현 시 다음을 **반드시 확인**한다.

| 항목 | 확인 |
|------|------|
| Settlement는 금액 계산만 수행하는가? | ☐ |
| 실제 지급은 외부 시스템에 위임하는가? | ☐ |
| CLOSED 이후 금액 변경이 불가능한가? | ☐ |
| 계산 입력값이 모두 저장되는가? | ☐ |
| 계산 결과가 재현 가능한가? | ☐ |
| 조정은 별도 거래로 생성되는가? | ☐ |
| 원본 거래 수정이 금지되어 있는가? | ☐ |
| 분쟁/반품이 조정 거래로 처리되는가? | ☐ |

---

*Document Version: 1.0.0*
*Phase: DS-4 Architecture*
*Authority: DS-1 (Dropshipping Domain Rules)*
*Status: Awaiting Approval*
