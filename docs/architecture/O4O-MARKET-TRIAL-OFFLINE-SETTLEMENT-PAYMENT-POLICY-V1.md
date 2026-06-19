# O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1

> **유형**: Architecture / Policy (canonical) — 유통참여형 펀딩(Market Trial)의 settlement/payment 기록 운영 정책 고정.
> **성격**: 문서 저장 전용. 코드/DB/migration/API/UI **무변경**.
> **WO**: `WO-O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1`
> **기준**: `O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1` · `O4O-MARKET-TRIAL-PRODUCTID-LEGACY-POLICY-V1`.
> **작성일**: 2026-06-19
> **상태**: Active — settlement/payment 관련 모든 향후 구현·정리의 기준.

---

## 0. 한 문장 정의

```
유통참여형 펀딩의 settlement/payment 기록은 O4O 정식 상품 결제·정산 이력이 아니다.
펀딩 모집·참여 운영을 위한 "오프라인 입금 확인 / 펀딩 참여 처리 상태" 기록이며,
삭제 대상이 아니라 유통참여형 펀딩의 운영 기록으로 보존한다.
```

---

## 1. 배경

유통참여형 펀딩은 Neture 전용 **content-only 모집** 기능으로 확정되었고(P0~P3-2c), 제품화·주문·배송·전환 잔재는 제거되었다. 그러나 펀딩 운영에서는 **입금·정산이 상당 기간 오프라인으로** 진행될 수 있다.

따라서 `settlement*`/`payment*` 컬럼·기록은 **삭제 대상이 아니다.** 본 문서는 이를 고정하여, 향후 schema cleanup·UI 정리에서 정산·결제 기록이 잘못 삭제되거나 **O4O 정식 결제·정산 기능으로 오해**되지 않도록 한다.

---

## 2. 정확한 의미 (이것이다)

```
payment           = O4O PG 결제가 아니라 "오프라인 입금 확인 상태"
settlement        = O4O 정산 시스템이 아니라 "펀딩 참여 조건 처리 상태"
paidAmount        = O4O 주문 결제금액이 아니라 "펀딩 참여 입금/약정 금액 기록"
paymentReference  = 외부 입금 확인용 참고값
settlementStatus  = 펀딩 참여 처리 상태
```

전체 의미:

```
- 유통참여형 펀딩 참여 조건에 따른 오프라인 입금 확인 기록
- 펀딩 참여자별 처리 상태 기록
- 공급자·운영자 간 오프라인 정산 진행 상태 기록
- 펀딩 운영을 위한 내부 관리·감사 기록
```

---

## 3. 금지할 오해 (이것이 아니다)

```
paymentStatus 있음 ≠ O4O 결제 기능
paidAmount 있음 ≠ O4O 주문 결제금액
settlementStatus 있음 ≠ O4O 정산 기능
settlementAmount 있음 ≠ 정식 상품 정산금
paymentReference 있음 ≠ PG 결제 reference
settlement/payment 있음 ≠ 유통참여형 펀딩이 커머스 기능
```

유통참여형 펀딩은 여전히 **content-only 모집 기능**이다. 단, 모집·참여 운영을 위해 입금·정산 상태 기록은 필요하다.

---

## 4. 유지(보존) 데이터 범위

다음 필드는 **유지 대상**이다(삭제·일괄 drop 금지):

```
market_trial_participants:
  contributionAmount
  settlementChoice / settlementStatus / settlementAmount / settlementProductQty / settlementRemainder / settlementNote
  paymentStatus / paymentMethod / paymentProvider / paymentReference / paidAmount / paidAt / confirmedAt / paymentNote
```

유지 이유: 펀딩 참여 조건·금액 기록 / 오프라인 입금 확인 상태 / 공급자·운영자 처리 상태 / 참여자별 정산·처리 기록 / 분쟁·문의·확인 요청 대비 감사 기록.

---

## 5. 삭제 금지 원칙

```
- settlement/payment 컬럼 일괄 drop 금지
- 기존 settlement/payment 데이터 삭제 금지 (paidAmount/paymentReference 포함)
- 기존 paymentStatus/settlementStatus 를 none 으로 초기화 금지
- 입금·정산 기록을 "단순 UI 흔적"으로 보고 제거 금지
```

> **기존 1건**(`settlementStatus=choice_pending`, `paymentStatus=paid`, manual_transfer/internal, 2026-06-07)도 **삭제하지 않는다.** 검증성 데이터로 보이더라도, 오프라인 입금·정산 기록 보존 원칙을 확인하는 기준 데이터로 남긴다.

---

## 6. 화면 표현 정책

UI 가 O4O 정식 결제·정산처럼 보이지 않도록 표현을 조정한다(내부 상태값이 `paymentStatus`/`settlementStatus` 로 남아 있어도 사용자-facing 문구는 아래 기준).

| 권장 표현 | 피해야 할 표현 |
|-----------|----------------|
| 오프라인 입금 확인 / 입금 확인 상태 / 펀딩 처리 상태 / 참여 조건 처리 / 운영자 확인 / 공급자 별도 안내 / 펀딩 참여 기록 | O4O 결제 / 결제 완료 / PG 결제 / 정산 완료 / 상품 정산 / 배송 정산 / 주문 결제 / 판매 정산 |

> 현재 구현은 이미 이 방향(예: PAYMENT_STATUS_LABELS = "입금 전/입금 확인 대기/입금 확인 완료…", settlement = "선택 대기/운영 확인 중/정산 완료")으로 정렬되어 있음 — 본 정책과 정합.

---

## 7. API / DB 정책

### 7.1 DB
```
- settlement/payment 컬럼 당분간 유지 (nullable 또는 기존 default).
- NOT NULL 강화 금지.
- O4O 주문/결제/배송 테이블과 FK 연결 금지.
- ProductMaster/SupplierProductOffer 가격과 자동 연결 금지.
- Order/Payment/Settlement/Shipment 도메인과 자동 연결 금지.
```

### 7.2 API
**허용**: 운영자 입금 확인 상태 조회 · 운영자 펀딩 처리 상태 조회 · 공급자 참여 처리 현황 조회 · 참여자 본인 처리 상태 조회.

**금지**: PG 결제 승인 API 연결 · O4O order/payment/settlement 엔티티 생성 · O4O 상품 정산 리포트 합산 · 배송/발송 상태 자동 연결 · ProductMaster 가격/SPO 공급가 자동 계산.

---

## 8. productId 와의 관계 (비연결)

settlement/payment 기록은 `productId` 기준으로 계산하지 않는다([[O4O-MARKET-TRIAL-PRODUCTID-LEGACY-POLICY-V1]] 와 정합).

**금지**: productId 기반 입금 금액 자동 계산 · ProductMaster/SPO 가격 기반 정산 계산 · productId 기반 주문/배송 생성.

**허용**: 펀딩 콘텐츠에 명시된 참여 조건 기준 기록 · 운영자 수동 확인 기준 · 공급자 별도 안내 기준 · 오프라인 입금 확인 기준.

---

## 9. 향후 구현 주의사항

입금·정산 화면 개선 시:

```
- PG 결제 버튼을 만들지 않는다.
- O4O 주문 생성 버튼을 만들지 않는다.
- 배송지 입력을 받지 않는다.
- 상품 발송 관리로 연결하지 않는다.
- 정식 상품 가격 이력으로 전환하지 않는다.
- 운영자 수동 확인·메모·상태 기록 중심으로 설계한다.
```

---

## 10. content-only 원칙과의 관계 (충돌 없음)

유통참여형 펀딩은 제품 기반·주문·결제·정산·배송 커머스 기능이 아니다. settlement/payment 가 남아 있는 것은 이 원칙과 **충돌하지 않는다** — 이는 O4O 커머스 결제·정산이 아니라 **펀딩 모집·참여 운영을 위한 오프라인 기록**이기 때문이다.

---

## 11. 후속 (기능 제거 아님 — 운영 개선)

```
- 오프라인 입금 확인 UI 정비
- 펀딩 처리 상태 용어 정리
- 운영자 메모/감사 로그 정책
- 공급자 별도 안내 문구 정리
- 펀딩 참여 금액·수량 리포트 정리
```

주의: 후속에서도 settlement/payment 는 **삭제 대상이 아니다** — 유통참여형 펀딩 운영 기능으로 유지.

---

*Date: 2026-06-19 · 문서 저장 전용 · settlement/payment = 오프라인 입금·펀딩 처리 운영 기록(O4O 정식 결제·정산 아님) · 삭제/일괄 drop 금지 · 기존 1건 보존 · O4O order/payment/settlement/shipment·productId·ProductMaster/SPO 가격 비연결 · UI 는 "오프라인 입금 확인/펀딩 처리" 표현 · content-only 무충돌.*
