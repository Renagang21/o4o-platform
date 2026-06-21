# CHECK — KPA storefront 소비자 결제 진입점 제거 (POS 안내 대체) V1

**WO:** `WO-O4O-STORE-SALE-CHECKOUT-UI-ENTRY-REMOVAL-V1`
**일자:** 2026-06-21
**성격:** frontend-only — KPA 공개 storefront 의 checkout/Toss 진입 제거 + "매장 현장(POS) 결제" 안내 대체.
**상위:** `IR-O4O-TOSS-PAYMENT-SCOPE-REVISION-STORE-SUBSCRIPTION-AND-B2B-V1` · `CHECK-O4O-STORE-SALE-PAYMENT-EXCLUSION-CLEANUP-AUDIT-V1`(KPA=등급 C)
**검증:** web-kpa-society `tsc --noEmit` PASS

---

## 0. 정책 (고정)

```text
소비자 → 매장 상품 구매 결제는 O4O 대상이 아니다(STORE_SALE_PAYMENT 제외).
각 매장의 POS/카드/현금/간편결제로 처리하며, O4O 에 소비자→매장 결제 경로는 존재하지 않는다.

고객 checkout/payment 관련 기존 데이터는 운영 결제 데이터로 보지 않는다(존재해도 테스트 데이터로 간주).
본 cleanup 은 데이터 삭제가 아니라 신규 소비자→매장 O4O 결제 경로 차단을 목표로 한다.
```

## 1. 변경 (frontend 1파일)

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/storefront/CheckoutPage.tsx` | **전면 대체** — 기존 (cart→createOrder→`/kpa/payments/prepare`→`loadTossPayments`/`requestPayment` Toss 위젯) 흐름 **전부 제거** → "상품 결제는 매장에서 진행해 주세요"(POS/카드/현금/간편결제) **안내 페이지**로 대체. `@tosspayments/payment-sdk` import·createOrder·preparePayment·cartService·AddressSearch 의존 제거. 라우트(`/store/:slug/checkout`)·export(named+default) **유지**. |

- **결제 chokepoint 차단:** Toss 결제는 CheckoutPage 의 `requestPayment` 단일 지점에서만 트리거됐다. 이를 안내로 대체 → **모든 진입 경로가 결제가 아닌 안내로 수렴**한다.

## 2. 진입 경로 수렴 (실측)

| 진입 | 변경 후 결과 |
|---|---|
| 상품 상세 헤더 장바구니 아이콘 → `/store/:slug/checkout` (`StorefrontProductDetailPage.tsx:219`) | POS 안내 페이지 표시(결제 불가) |
| `/store/:slug/checkout` 직접 URL | POS 안내 페이지 표시 |
| `PaymentFailPage` 재시도 `to=/checkout` (`:26`) | POS 안내 페이지 표시 |

- 세 경로 모두 결제(Toss)에 도달하지 않는다 → **신규 소비자→매장 O4O 결제 경로 차단 완료.**

## 3. 비범위 (의도적 — 후속 WO)

- **백엔드 `/kpa/payments/prepare|confirm` 차단(410/403)** → 후속 `WO-O4O-STORE-SALE-CHECKOUT-ROUTE-DEPRECATION-V1`. 본 WO 는 frontend-only.
- GlycoPharm/K-Cosmetics payment API deprecation(등급 A, UI 부재) → 동일 후속 WO.
- `PaymentSuccessPage`/`PaymentFailPage` 페이지·라우트, 상품상세 장바구니 아이콘 자체 = 결제 흐름 차단 후 **도달 불가(dead)** 이나 본 WO 미삭제(최소 변경). 필요 시 후속 정리.
- checkout_orders / o4o_payments / PaymentCore / Toss adapter **무변경**(데이터 삭제 없음).
- neture-b2b(B2B_ORDER) / store_paid_feature_entitlements / FOREIGN_VISITOR_SALES_SUPPORT **미접촉**.

## 4. 검증

- `web-kpa-society` `npx tsc --noEmit` → **exit 0** (direct-include 패턴).
- CheckoutPage 에서 `@tosspayments`/`payments/prepare`/`createOrder` 참조 **제거 확인**(grep 0).
- 변경 = frontend 1파일 + 본 CHECK. 백엔드/DB/route/데이터 변경 0.
- 다른 세션 WIP 미접촉(path-specific commit).

## 5. PASS 기준 대비

| 기준 | 결과 |
|---|---|
| KPA storefront checkout/Toss 진입 제거 | ✅ (CheckoutPage = POS 안내) |
| "매장에서 결제" 안내로 대체 | ✅ |
| 신규 소비자→매장 결제 경로 차단 | ✅ (Toss chokepoint 제거) |
| 데이터 삭제 없음 | ✅ |
| neture-b2b/구독 entitlement 미접촉 | ✅ |
| typecheck PASS | ✅ |

## 6. 후속 WO

```text
1. WO-O4O-STORE-SALE-CHECKOUT-ROUTE-DEPRECATION-V1
   - KPA/Glyco/KCos /payments/prepare|confirm 410/403 (신규 생성 차단, 조회 보존)
   - neture-b2b 미접촉
2. WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1
   - 매장 경영자 FOREIGN_VISITOR_SALES_SUPPORT 구독 결제 구현
```

---

*Date: 2026-06-21 · CHECK · frontend-only · KPA CheckoutPage(Toss 소비자 결제) → 매장 POS 결제 안내 전면 대체 · 결제 chokepoint 차단(모든 진입 경로 안내 수렴) · 데이터/백엔드 무변경 · web-kpa tsc exit 0 · 백엔드 API deprecation은 후속 ROUTE-DEPRECATION WO.*
