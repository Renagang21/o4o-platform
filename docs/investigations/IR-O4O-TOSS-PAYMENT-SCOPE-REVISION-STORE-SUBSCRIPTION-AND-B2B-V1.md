# IR-O4O-TOSS-PAYMENT-SCOPE-REVISION-STORE-SUBSCRIPTION-AND-B2B-V1

> **유형:** Scope Revision / Policy Decision IR (read-only) — 코드/DB/migration/API/UI **무변경**. 본 문서 1개만 산출.
> **작성일:** 2026-06-21
> **상위 조사:** `IR-O4O-PAYMENT-SCOPE-STORE-SALE-VS-SERVICE-SUBSCRIPTION-AUDIT-V1`
> **supersedes(용어/범위 정정):** `IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1` · `IR-O4O-PAYMENTCORE-PAYMENT-TYPE-AXIS-DECISION-V1`(SERVICE_ACCESS 용어) · `CHECK-O4O-TOSS-PAYMENT-CORE-V1`(SERVICE_ACCESS 용어)
> **결론(요약):** O4O Toss 결제 대상 = **STORE_SERVICE_SUBSCRIPTION(매장 경영자 O4O 부가 서비스 구독) + B2B_ORDER(매장→공급자 조달)** 두 축. **소비자→매장 결제(STORE_SALE_PAYMENT)·외부몰 소비자 결제(MARKETPLACE_CUSTOMER_PAYMENT)는 O4O 대상 아님 — 각 매장 POS/일반 결제·외부몰에서 처리.** KPA/Glyco/KCos 고객 checkout→O4O Toss 흐름은 **C-2(제외) 결정** → 즉시 삭제 않고 cleanup WO 로 분리. PaymentCore/o4o_payments 스키마 무변경(옵션 A metadata 유지). `SERVICE_ACCESS` → `STORE_SERVICE_SUBSCRIPTION` 으로 정정.

---

## 1. 목적

O4O Toss 결제 범위를 다시 고정하기 위한 **정정 문서**다. 앞선 논의에서 4종 결제가 혼재했다:

```text
1. 소비자 → 매장 상품 구매 결제
2. 매장 경영자 → O4O 서비스 구독 결제
3. 매장 → 공급자 상품 조달 결제
4. 외부몰 소비자 결제
```

이 중 **O4O Toss 대상 = 2 + 3** 으로 한정한다. **1·4 는 O4O 대상 아님.**

> 특히 **소비자가 매장에서 상품을 구매하는 결제는 각 매장이 이미 보유한 POS/카드/현금/간편결제로 처리**하므로 O4O 에 존재하면 안 된다.

## 2. 배경 (상위 audit 결과 요약)

`IR-O4O-PAYMENT-SCOPE-STORE-SALE-VS-SERVICE-SUBSCRIPTION-AUDIT-V1` 확정 사실:

| # | 사실 | 본 IR 처리 |
|:--:|---|---|
| 2.1 | `store_paid_feature_entitlements`/`FOREIGN_VISITOR_SALES_SUPPORT`/메뉴 게이트 = **매장 경영자 구독 권한 축**(고객 판매 아님, organizationId 소유) | 보존 → `STORE_SERVICE_SUBSCRIPTION` 으로 재정의 |
| 2.2 | KPA/Glyco/KCos 일부 `checkout_orders` 고객 결제가 O4O PaymentCore/Toss 로 연결됨 | 정책상 제외(C-2) → cleanup WO 분리 |
| 2.3 | 결제/주문에 고객 국적(외국인/내국인) 분기 = 코드 0건 | 기준 명문화(국적은 결제 기준 아님). 중립화 WO 불요 |
| 2.4 | `SERVICE_ACCESS` = 코드 0건(문서 전용 용어) | `STORE_SERVICE_SUBSCRIPTION` 으로 정렬 |

## 3. 결제 범위 최종 정의

### 3.1 O4O Toss 결제 **대상**

#### A. `STORE_SERVICE_SUBSCRIPTION`
매장 경영자가 O4O 부가 서비스를 사용하기 위해 결제하는 **구독** 결제.

- **결제 주체:** 매장 경영자 / 매장 조직(organizationId)
- **V1 대상 플랜:** `FOREIGN_VISITOR_SALES_SUPPORT`
- **의미:** 외국인 대상 서비스 · 다국어 상품 안내 · QR/SNS 안내 · 관광객 응대 화면 · 숙소 배송/매장 수령 안내 · 직원용 판매 처리 보조 등을 매장 경영자가 구독하는 서비스
- **결제 대상 아님:** 외국인/내국인 고객 상품 구매, 매장 POS
- **결제 성공 후:** confirm → `metadata.paymentType==='STORE_SERVICE_SUBSCRIPTION'` + `metadata.planCode` 확인 → `store_paid_feature_entitlements` ACTIVE 생성/연장 → 메뉴/기능 사용 가능

#### B. `B2B_ORDER`
매장이 공급자 상품을 조달하기 위해 결제하는 **주문결제**.

- **결제 주체:** 매장 / 매장 조직
- **대상:** 공급자 상품 조달 주문(재고 보충 · 판매 후 조달 · 향후 외부몰 처리 후 조달)
- **결제 성공 후:** confirm → B2B 주문 PAID(또는 준하는 상태) 전환 → 공급자 주문 확인 → 배송/처리

### 3.2 O4O Toss 결제 **제외**

#### A. `STORE_SALE_PAYMENT` — 소비자 → 매장 상품 구매
```text
O4O 대상 아님. 각 매장의 POS/카드/현금/간편결제로 처리.
O4O PaymentCore/Toss 로 연결하면 안 됨.
```
포함: 외국인 고객 구매 · 내국인 고객 구매 · 무재고 선판매 · 매장 현장/POS 결제 · 면세/환급.
**정책 문장: "O4O 는 소비자 → 매장 결제를 처리하지 않는다."**

#### B. `MARKETPLACE_CUSTOMER_PAYMENT` — 외부몰 소비자 결제
```text
O4O 대상 아님. 외부몰 결제/정산 체계에서 처리.
```
- O4O 역할(가능): 상품 등록 지원 · 공급자 상품 조달 연결 · 외부몰 주문 처리 보조
- O4O 역할(아님): 외부몰 소비자 결제 · 정산 · 환불

## 4. 결제 타입 기준 (V1)

```ts
paymentType =
  | 'STORE_SERVICE_SUBSCRIPTION'
  | 'B2B_ORDER'
```

- 기존 `SERVICE_ACCESS` 는 **코드 미존재 문서 전용 용어** → V1 에서 `STORE_SERVICE_SUBSCRIPTION` 의미로 재정렬. **새 문서에서 `SERVICE_ACCESS` 를 결제 타입으로 사용하지 않는다.**

## 5. PaymentCore 표현 규약 (옵션 A 유지 — 스키마 무변경)

`IR-O4O-PAYMENTCORE-PAYMENT-TYPE-AXIS-DECISION-V1` 의 옵션 A(metadata 기반)를 유지하되 `paymentType` 값을 본 IR 기준으로 정정한다. **o4o_payments/PlatformPayment 스키마 무변경.**

### 5.1 STORE_SERVICE_SUBSCRIPTION
```json
{
  "paymentType": "STORE_SERVICE_SUBSCRIPTION",
  "planCode": "FOREIGN_VISITOR_SALES_SUPPORT",
  "subscriptionPeriodDays": 30,
  "targetRefType": "store_paid_feature_entitlement",
  "payerOrganizationId": "<organizationId>"
}
```
- orderId prefix: `o4o_sub_<YYYYMMDD>_<rand>` · sourceService: `neture`

### 5.2 B2B_ORDER
```json
{
  "paymentType": "B2B_ORDER",
  "orderPurpose": "STORE_STOCK",
  "targetRefType": "b2b_order_group",
  "targetRefId": "<orderGroupId>",
  "payerOrganizationId": "<organizationId>"
}
```
- orderId prefix: `o4o_b2b_<YYYYMMDD>_<rand>`

> 직전 AXIS-DECISION 의 `metadata.paymentType='SERVICE_ACCESS'`/orderId `o4o_sa_` 규약은 본 IR 로 `STORE_SERVICE_SUBSCRIPTION`/`o4o_sub_` 로 정정된다.

## 6. 구독 플랜 기준 (V1)

- 실제 구독 대상: `FOREIGN_VISITOR_SALES_SUPPORT`
- **의미 고정:** "`FOREIGN_VISITOR_SALES_SUPPORT` 는 고객 결제 타입이 아니다. **매장 경영자 서비스 구독 플랜**이다."
- 이름 정렬 후보(향후): `MULTILINGUAL_SALES_SUPPORT` / `TRAVELER_SALES_SUPPORT` / `STORE_TRAVELER_SUPPORT`. **단 V1 은 기존 구현 충돌 최소화를 위해 `FOREIGN_VISITOR_SALES_SUPPORT` planCode 유지**, 의미만 정리.

## 7. B2B 주문 목적 기준 (조달 목적 — 국적 무관)

```ts
orderPurpose =
  | 'STORE_STOCK'                     // 매장 재고 보충 조달
  | 'STORE_CUSTOMER_FULFILLMENT'      // 고객 선판매 후 공급자 조달 (국적 구분 안 함)
  | 'MARKETPLACE_FULFILLMENT_RESERVED' // 외부몰 처리 후 조달 (reserved only)
```

- `STORE_CUSTOMER_FULFILLMENT` 는 고객이 외국인인지 내국인인지 **구분하지 않는다.**
- `MARKETPLACE_FULFILLMENT_RESERVED` 는 V1 reserved only.
- `FOREIGN_VISITOR_FULFILLMENT`(이전 표현)는 **사용하지 않는다.**

## 8. 기존 고객 checkout 결제 흐름 — 정책 결정

```text
[결정] C-2 채택 — 매장 고객 상품 구매 결제는 O4O Toss 대상이 아니다.
```

정책상 제외 대상(즉시 삭제 X — 운영 코드 존재):
```text
KPA       고객 checkout_orders → O4O PaymentCore/Toss
GlycoPharm 고객 checkout_orders → O4O PaymentCore/Toss
K-Cosmetics 고객 checkout_orders → O4O PaymentCore/Toss
```

후속 `WO-O4O-STORE-SALE-PAYMENT-EXCLUSION-CLEANUP-V1` 에서 조사·정리:
```text
1. 해당 고객 checkout 라우트 운영 노출 여부 확인
2. 고객 checkout UI 진입점 확인
3. API 사용 여부 확인
4. 안전한 비활성화/제거 방식 결정
5. 필요 시 안내/redirect 처리
6. PaymentCore/o4o_payments 기존 데이터 보존 정책 확인
```

> neture-b2b-payment(B2B_ORDER)·PaymentCore·o4o_payments·Toss adapter 는 **무관(유지)**.

## 9. 정정 대상 문서 (용어/범위)

| 문서 | 정정 방향 |
|---|---|
| `IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1` | SERVICE_ACCESS → STORE_SERVICE_SUBSCRIPTION · "고객 판매 제외" 명문화(배포 현실 반영) |
| `IR-O4O-PAYMENTCORE-PAYMENT-TYPE-AXIS-DECISION-V1` | metadata.paymentType 값 SERVICE_ACCESS → STORE_SERVICE_SUBSCRIPTION · orderId `o4o_sa_` → `o4o_sub_` |
| `CHECK-O4O-TOSS-PAYMENT-CORE-V1` | SERVICE_ACCESS 표기 → STORE_SERVICE_SUBSCRIPTION |

용어 매핑:
```text
SERVICE_ACCESS               → STORE_SERVICE_SUBSCRIPTION (의미 대체)
FOREIGN_VISITOR_SALES_SUPPORT → 매장 경영자 서비스 구독 플랜 (고객 결제 타입 아님)
FOREIGN_VISITOR_FULFILLMENT   → 사용 안 함
STORE_CUSTOMER_FULFILLMENT    → B2B 조달 목적으로 사용(필요 시)
```

## 10. 후속 작업 순서 (확정)

```text
1. WO-O4O-SERVICE-ACCESS-TERMINOLOGY-ALIGN-V1
   - SERVICE_ACCESS → STORE_SERVICE_SUBSCRIPTION 의미 정리
   - paid-feature entitlement → store service subscription entitlement 문서화
   - FOREIGN_VISITOR_SALES_SUPPORT = 매장 경영자 구독 플랜 고정

2. WO-O4O-STORE-SALE-PAYMENT-EXCLUSION-CLEANUP-V1   (C-2 이행)
   - KPA/Glyco/KCos 고객 checkout → O4O Toss 흐름 비활성화/분리/제거
   - 즉시 삭제 금지 — 사용 여부·운영 노출 선확인

3. WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1
   - FOREIGN_VISITOR_SALES_SUPPORT 구독 결제(Toss) + 성공 시 entitlement ACTIVE (§5.1 규약)

4. WO-O4O-B2B-ORDER-PURPOSE-V1
   - STORE_STOCK / STORE_CUSTOMER_FULFILLMENT / MARKETPLACE_FULFILLMENT_RESERVED 정리
```

## 11. V1 에서 하지 않을 것

```text
소비자→매장 결제 구현 · 외국인/내국인 고객 상품 구매 결제 구현 · 매장 POS 대체 ·
면세/환급 처리 · 외부몰 소비자 결제/정산 처리 · 고객 국적 기반 결제 분기 ·
FOREIGN_VISITOR_FULFILLMENT 사용 · PaymentCore/o4o_payments 스키마 변경 ·
paymentType 1급 컬럼 추가
```

## 12. 검증 기준 (완료 조건)

```text
1. STORE_SERVICE_SUBSCRIPTION + B2B_ORDER = O4O Toss 대상으로 고정
2. STORE_SALE_PAYMENT = O4O Toss 제외로 고정
3. 소비자→매장 결제는 매장 POS/일반 결제로 처리 명시
4. 외국인/내국인 구분이 결제 기준 아님 명시
5. FOREIGN_VISITOR_SALES_SUPPORT = 매장 경영자 구독 플랜으로 재정의
6. KPA/Glyco/KCos 고객 checkout→O4O Toss = cleanup 대상으로 분리
7. PaymentCore 스키마 무변경 원칙 유지
8. 후속 WO 순서 확정
```

## 13. 무변경 확인

- 코드/entity/migration/route/service/UI **무변경**. 신규 파일 0(본 IR 제외).
- 다른 세션 WIP(`services/mobile-app/*`) 미접촉. 결제 실행/재시도 없음.

---

## 14. 결론

```text
O4O Toss 결제 대상:
  1. STORE_SERVICE_SUBSCRIPTION  (매장 경영자 O4O 부가 서비스 구독 / V1: FOREIGN_VISITOR_SALES_SUPPORT)
  2. B2B_ORDER                   (매장 → 공급자 상품 조달)

O4O Toss 결제 제외:
  - STORE_SALE_PAYMENT           (소비자 → 매장 구매 — 매장 POS/일반 결제. O4O 에 존재 금지)
  - MARKETPLACE_CUSTOMER_PAYMENT (외부몰 소비자 결제 — 외부몰 처리)
```

KPA/GlycoPharm/K-Cosmetics 의 고객 checkout → O4O Toss 흐름은 **C-2(제외) 결정**에 따라 cleanup WO 에서 단계적으로 정리한다. 본 IR 은 **기존 구독 권한 축(entitlement)은 보존**하면서 **소비자→매장 결제는 O4O 에서 배제**하는 기준을 함께 고정한다. 첫 후속 = `WO-O4O-SERVICE-ACCESS-TERMINOLOGY-ALIGN-V1`.

---

*Date: 2026-06-21 · read-only Scope Revision IR · 코드 무변경 · O4O Toss = STORE_SERVICE_SUBSCRIPTION + B2B_ORDER · STORE_SALE_PAYMENT/MARKETPLACE 제외 · C-2(고객 checkout cleanup 분리) · SERVICE_ACCESS→STORE_SERVICE_SUBSCRIPTION · PaymentCore 스키마 무변경(옵션 A) · 첫 후속=TERMINOLOGY-ALIGN.*
