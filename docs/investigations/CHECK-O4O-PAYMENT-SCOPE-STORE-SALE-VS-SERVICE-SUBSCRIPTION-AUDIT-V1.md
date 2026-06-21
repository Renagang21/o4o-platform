# CHECK — 매장 판매 결제 vs 매장 경영자 서비스 구독 결제 범위 분리 점검

**조사:** `IR-O4O-PAYMENT-SCOPE-STORE-SALE-VS-SERVICE-SUBSCRIPTION-AUDIT-V1`
**일자:** 2026-06-21
**성격:** read-only audit — 코드/DB/migration/API/UI **무변경**. 본 문서 1개만 산출.
**상위:** `IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1` · `IR-O4O-PAYMENTCORE-PAYMENT-TYPE-AXIS-DECISION-V1` · `CHECK-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1` · `CHECK-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1`

---

## 0. 요약 판정

```text
1. paid-feature entitlement(FOREIGN_VISITOR_SALES_SUPPORT) = 매장 경영자 서비스 구독 축. 삭제 금지 → STORE_SERVICE_SUBSCRIPTION 으로 재정의(판정 A).
2. SERVICE_ACCESS = 문서 전용 용어(코드 0건). 구독 의미로 명칭 정렬 필요(판정 B).
3. 매장 '고객 상품 구매' 결제(KPA/Glyco/KCos checkout_orders)가 O4O PaymentCore/Toss 로 처리됨 — 새 정책의 STORE_SALE_PAYMENT(O4O 제외)와 충돌(판정 C). 단 §11 중단 기준 → 삭제/수정 안 함, 정책 결정 + cleanup WO 로 분리.
4. 고객 국적(외국인/내국인) 결제·주문 분기 = 코드 0건(§3.3 이미 충족). neture-b2b·PaymentCore·o4o_payments 무관(판정 D).
```

## 1. git 상태 / 다른 세션 WIP

- `git status --short`: `services/mobile-app/*`(다른 세션 WIP, 결제/구독 무관)만 존재. **본 조사 대상 파일(payment/entitlement)은 clean.** 충돌 없음.
- 조사 중 코드/DB/route 변경 0.

## 2. SERVICE_ACCESS / entitlement 실측

| 항목 | 실측 |
|---|---|
| `SERVICE_ACCESS` backend 코드 | **0건** (grep). 문서/WO 텍스트에만 존재 |
| 실제 구현된 구독 모델 | `store_paid_feature_entitlements`(organizationId+serviceKey+planCode, ACTIVE/EXPIRED/CANCELED, startsAt/endsAt) — `WO-O4O-STORE-PAID-FEATURE-ENTITLEMENT-V1` |
| planCode | `FOREIGN_VISITOR_SALES_SUPPORT`(활성) + reserved 2 |
| 소유 단위 | **organizationId(매장=조직)** — 고객 아님. 결제 주체 = 매장 경영자 |
| 메뉴 게이트 | `/store/sales-channels/foreign-visitor`(StoreOwnerGuard) → `ForeignVisitorSalesSupportPanel` → `GET /store-entitlements/me/check`(auth 로 store_owner org 해석) |
| 게이트 문구 | "외국인 여행객 판매지원은 **유료 기능**입니다. **월 이용권 결제** 후 사용" + "**이용권 결제하기**"(disabled) |

→ **이것은 매장 경영자가 O4O 부가 서비스(다국어/관광객 응대 판매지원)를 구독하는 권한**이다. **고객 판매 결제가 아니다.** = 새 정책의 `STORE_SERVICE_SUBSCRIPTION` 축 그 자체이며, 단지 "paid-feature entitlement"로 명명돼 있다.

## 3. 매장 판매(고객) 결제 흔적 — 핵심 발견

| 컨트롤러 | WO | 대상 | 결제 경로 |
|---|---|---|---|
| `routes/kpa/controllers/kpa-payment.controller.ts` | `WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1` | `CheckoutOrder`(고객 상품 주문, orderName="상품 외 N건") | **PaymentCoreService.prepare/confirm + Toss widget** |
| `routes/glycopharm/controllers/glycopharm-payment.controller.ts` | `WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1` | `CheckoutOrder` | 동일 (1:1) |
| `routes/cosmetics/controllers/cosmetics-payment.controller.ts` | `WO-O4O-COSMETICS-PAYMENTCORE-INTEGRATION-V1` | `CheckoutOrder` | 동일 (1:1) |
| `routes/neture/controllers/neture-b2b-payment.controller.ts` | `WO-O4O-NETURE-B2B-PAYMENT-FLOW-V1` | B2B checkout_order(`metadata.source='neture_b2b_checkout'`) | PaymentCore (sourceService='neture-b2b') — **B2B_ORDER** |

→ **매장 '고객 상품 구매' 결제(KPA/Glyco/KCos checkout_orders)가 O4O PaymentCore/Toss 로 처리되고 있다.** 새 정책 §3.2.A(`STORE_SALE_PAYMENT` = 매장 일반 결제, **O4O Toss 제외**)와 **충돌**한다.

> 주의: 이는 새 정책 *이전*에 구축된 흐름이다. 상위 `IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1`(SERVICE_ACCESS+B2B_ORDER 만, 고객 판매 제외)와 **배포된 코드가 이미 어긋나 있었다**. 본 audit 가 이를 드러냈다.

## 4. 외국인/내국인 구분 사용처

- **결제/주문 분기에서 국적(`nationality`/`isForeigner`/`외국인 고객`) = 코드 0건** (backend·payment·order). → 정책 §3.3(고객 국적 결제 기준 금지) **이미 충족**.
- 프론트 "외국인" 등장 = Neture **가이드(안내) CMS 페이지** 4개(`GuideBusinessForeignCustomerStorePage` 등) — **결제/체크아웃 아님**(정보성 콘텐츠).
- "외국인 여행객 판매지원" 기능명은 고객 국적 분기가 아니라 **매장 경영자가 구독하는 다국어/관광객 응대 도구** 의미(§2). 명칭이 고객-국적 결제로 오독될 여지는 있음(판정 B 명칭 정렬 후보).

## 5. PaymentCore metadata 현황

- B2B 식별 = `metadata.source==='neture_b2b_checkout'`(enum paymentType 아님). `metadata.paymentType` 은 **코드 0건**(문서 전용 — IR-...-AXIS-DECISION 의 옵션 A 규약으로 후속 도입 예정).
- 즉 현재 타입 분리는 `sourceService`/`metadata.source` 기반. SERVICE_ACCESS 결제는 **아직 미구현**(prepare/confirm 없음).

## 6. 판정 분류 (§7 기준)

| 분류 | 대상 | 조치(권고) |
|---|---|---|
| **A. 유지·재정의** | `store_paid_feature_entitlements` / `FOREIGN_VISITOR_SALES_SUPPORT` / menu gate / `ForeignVisitorSalesSupportPanel` / `/store-entitlements/*` | **삭제 금지.** 매장 경영자 구독 권한 = `STORE_SERVICE_SUBSCRIPTION` 으로 명칭·문서 재정의 |
| **B. 문서 정정** | `SERVICE_ACCESS` 용어(코드 0건) — `IR-O4O-TOSS-PAYMENT-SCOPE...` · `IR-O4O-PAYMENTCORE-PAYMENT-TYPE-AXIS-DECISION-V1` · `CHECK-O4O-TOSS-PAYMENT-CORE-V1`. + 상위 scope IR 의 "고객 판매 제외" 주장이 배포 현실과 어긋남 | superseded/정정 IR — SERVICE_ACCESS=매장 구독 의미로 정렬, scope 재고정 |
| **C. 정정 필요 — 코드/UI (중단·분리)** | KPA/Glyco/KCos `*-payment.controller.ts`(고객 checkout_orders → O4O Toss) | **본 조사 변경 0.** 정책 결정 후 cleanup WO 로 분리(삭제 금지 — §11.1) |
| **D. 무관** | neture-b2b-payment(B2B_ORDER) · PaymentCore · o4o_payments · Toss adapter · 국적 분기(부재) | 변경 없음 |

## 7. 핵심 결정 필요 사항 (정책 owner 판단 — 본 조사 범위 밖)

```text
Q. 매장 '고객 상품 구매' 결제(KPA/Glyco/KCos checkout_orders → O4O PaymentCore/Toss)를
   - (C-1) 그대로 O4O Toss 로 유지할 것인가, 또는
   - (C-2) 새 정책대로 '매장 일반 결제'로 분리(O4O Toss 제외)할 것인가?
```

이 결정에 따라 후속 cleanup 범위가 갈린다. 본 audit 는 **결정하지 않고** 흔적만 확정한다(§11.1: 고객 판매 결제가 O4O Toss 연결 시 삭제 말고 cleanup WO 분리).

## 8. 후속 IR/WO 제안

| 우선 | 후보 | 목적 |
|:--:|---|---|
| 1 | `IR-O4O-TOSS-PAYMENT-SCOPE-REVISION-STORE-SUBSCRIPTION-AND-B2B-V1` | O4O Toss 범위를 `STORE_SERVICE_SUBSCRIPTION + B2B_ORDER` 로 재고정 + §7 결정(C-1/C-2) |
| 2 | `WO-O4O-SERVICE-ACCESS-TERMINOLOGY-ALIGN-V1` | `SERVICE_ACCESS`/`paid-feature` 용어 → `STORE_SERVICE_SUBSCRIPTION` 정렬(문서 전용, 코드 영향 최소) |
| 3 | (C-2 채택 시) `WO-O4O-STORE-SALE-PAYMENT-EXCLUSION-CLEANUP-V1` | 매장 고객 결제를 O4O Toss 에서 분리 |
| — | `WO-O4O-CUSTOMER-NATIONALITY-PAYMENT-NEUTRALIZATION-V1` | **불요** — 결제/주문 국적 분기 0건(이미 충족) |
| 후속 | `WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1` | 매장 경영자 외국인 대상 서비스 구독 결제(=기존 FOREIGN_VISITOR entitlement 발급, IR-AXIS-DECISION §5 규약) |

## 9. 완료 기준 대비 (§12)

| 기준 | 결과 |
|---|---|
| 매장 판매 결제 O4O Toss 대상 여부 확인 | ✅ 현재 KPA/Glyco/KCos 고객 checkout 이 O4O Toss 처리됨 — 정책과 충돌(판정 C) |
| 서비스 구독 결제 축 보존 여부 | ✅ entitlement = 구독 축, **보존**(판정 A) |
| SERVICE_ACCESS/entitlement 실제 역할 | ✅ SERVICE_ACCESS=문서전용 / entitlement=매장 경영자 구독 권한 |
| 국적 구분 결제/주문 침투 | ✅ **0건**(이미 충족) |
| 고객 결제 vs 구독 결제 분리 정리 | ✅ §3·§6 분리 확정 |
| 문서 정정 vs 코드 cleanup 분류 | ✅ B(문서)+C(코드, 분리) |
| 후속 작업명 제안 | ✅ §8 |
| 코드/DB/API/UI 무변경 보고 | ✅ |

## 10. 무변경 확인

- 코드/entity/migration/route/service/UI **무변경**. entity·route 삭제 0. entitlement 삭제 0.
- 다른 세션 WIP(`services/mobile-app/*`) 미접촉. 결제 실행/재시도 없음. 신규 파일 0(본 CHECK 제외).

---

*Date: 2026-06-21 · read-only audit · 코드 무변경 · entitlement=매장 경영자 구독 축(보존·재정의 A) · SERVICE_ACCESS=문서전용(정정 B) · KPA/Glyco/KCos 고객 checkout→O4O Toss 흔적=정책 충돌(분리 C, 삭제 안 함) · 국적 결제 분기 0(충족) · neture-b2b/PaymentCore/o4o_payments 무관(D).*
