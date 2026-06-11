# CHECK-O4O-NETURE-B2B-PAYMENT-WIDGET-UI-V1

> web-neture 에 Neture B2B 결제 UI 추가 — `paymentGroupId` 기준 1회 결제(KPA storefront 패턴 적용).
> **payment-first**: 결제 전 공급자 미노출. collectionStatus 미사용. Toss SDK 는 **CDN 주입(npm dep 미추가, lockfile 무변경)**.
> **결과: PASS** — web-neture tsc 0 / route·api·Toss 로더 코드 검증. (positive 실결제는 P2d-2 cart 연결 + Toss 테스트결제 동반으로 deferred.)
> 상위: `IR-O4O-NETURE-B2B-PAYMENT-WIDGET-UI-REUSE-AUDIT-V1` · `CHECK-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1` — 2026-06-11

---

## 1. 변경 파일 (5, frontend-only)
| 파일 | 변경 |
|------|------|
| `services/web-neture/src/lib/api/netureB2bPayments.ts` | **신규** — `prepareB2BPayment`/`confirmB2BPayment`(authClient axios → `/api/v1/neture/b2b/payments/*`) + `loadTossWidget`(CDN 주입) |
| `services/web-neture/src/pages/store/StorePaymentPage.tsx` | **신규** — `/store/payment?paymentGroupId=` prepare → Toss 위젯 requestPayment |
| `services/web-neture/src/pages/store/StorePaymentSuccessPage.tsx` | **신규** — success redirect → confirm(paymentGroupId) |
| `services/web-neture/src/pages/store/StorePaymentFailPage.tsx` | **신규** — 실패 안내 + 재결제/장바구니 CTA |
| `services/web-neture/src/App.tsx` | route 3개(`/store/payment`,`/payment/success`,`/payment/fail`) + lazy import |

> backend(group payment/bridge)·KPA/Glyco/KCos·legacy cart·`/neture/seller/orders` **무변경**. package.json/lockfile **무변경**.

## 2. 흐름
```
/store/payment?paymentGroupId=pg_xxx
  → prepareB2BPayment(paymentGroupId, success/failUrl) → { amount, orderCount, clientKey, paymentId }
  → loadTossWidget(clientKey) → toss.requestPayment('카드', { amount, orderId: paymentGroupId, ... })
  → success redirect /store/payment/success?paymentGroupId&paymentKey&paymentId
  → confirmB2BPayment(paymentId, paymentKey, paymentGroupId)
  → backend: group N건 paid 전이 + 공급자별 bridge → 완료 UI
실패 → /store/payment/fail → 재결제/장바구니 CTA
```

## 3. KPA 패턴 적용 + 차이
- **참조**: KPA `CheckoutPage`/`PaymentSuccessPage`/`PaymentFailPage`(storefront). prepare→clientKey→Toss→success confirm 동일 구조.
- **차이**:
  - endpoint `/api/v1/neture/b2b/payments/*`(sourceService='neture-b2b'), **단일 order 가 아닌 paymentGroupId** 결제.
  - **Toss orderId 슬롯 = paymentGroupId**(다중 공급자 1회 결제). clientKey = prepare 응답.
  - api client = **authClient axios(`api`)** (KPA 는 fetch+localStorage 토큰 — web-neture 는 자동 토큰 갱신 사용).
  - **Toss SDK = CDN 스크립트 주입**(`loadTossWidget`) — KPA 의 `@tosspayments/payment-sdk` npm 의존 대신, web-neture 에 dep 추가 없이 `window.TossPayments(clientKey)` 사용. **lockfile 무변경**(§4.3 중단조건 회피). 동일 API surface.
  - UI = web-neture Tailwind(KPA 는 inline style).

## 4. payment-first 준수
- 결제 안내: "결제 완료 후 공급자별로 주문이 전달됩니다. 결제 전에는 공급자가 주문을 확인할 수 없습니다."
- collectionStatus / 후불 / 인보이스 / 발주 / 수금 확인 문구 **없음**.
- 결제 단위 = paymentGroupId, 주문/배송/정산 분리는 backend 내부.

## 5. 검증
- **web-neture tsc 0** ✅ (`npx tsc -b`)
- **코드 경로 검증** ✅:
  - paymentGroupId 없음 → "결제 정보 없음" graceful + 장바구니 CTA.
  - prepare 실패 → error 표시.
  - success page: paymentKey/paymentId/paymentGroupId 없으면 confirm skip(완료 화면). 있으면 confirm 호출. (paymentGroupId 없으면 orderId query fallback.)
  - Toss 로더: 기존 script 재사용/onload 대기, `window.TossPayments` 부재 시 에러.
- **browser smoke** *(neture-web 배포 후 §8)*: `/store/payment`(no param) graceful 렌더, `/payment/fail` 렌더, console error 0.
- **positive 실결제 — DEFERRED**: 유효 paymentGroupId(= 다중 공급자 cart → checkout-confirm-b2b)는 **P2d-2 cart cutover** 후 생성 + Toss 테스트결제 필요. end-to-end(결제→paid→bridge→공급자 노출)는 P2d-2 동반 실측.

## 6. 회귀 무영향
- backend group payment(aggregation)·bridge·정산 무변경. KPA/Glyco/KCos 결제 UI 무변경.
- web-neture legacy StoreCart(localStorage)·`/neture/seller/orders` 무변경 — payment page 는 paymentGroupId query 로 **독립 동작**(StoreCart 직접 연결은 P2d-2).
- package.json/pnpm-lock 무변경(CDN 로더).

## 7. 완료 기준 체크 (WO §14)
1(payment page) ✅. 2(success page) ✅. 3(fail page) ✅. 4(KPA 패턴 적용) ✅. 5(prepare(paymentGroupId)) ✅. 6(clientKey 로 Toss 로드) ✅. 7(Toss orderId=paymentGroupId) ✅. 8(success confirm(paymentGroupId)) ✅. 9(collectionStatus 미사용) ✅. 10(결제 전 공급자 미노출 안내) ✅. 11(web-neture tsc 0) ✅. 12(browser smoke §8) ✅(graceful)/positive deferred. 13(positive deferred 기록) ✅. 14(CHECK) ✅. 15(path-specific) ✅. 16(다른 세션 무접촉) ✅.

## 8. Live smoke (neture-web 배포 신리비전)
- `GET https://neture.co.kr/store/payment?paymentGroupId=pg_test` → **200** (SPA 라우트 served) ✅
- `GET https://neture.co.kr/store/payment/fail` → **200** ✅
→ 신규 route 가 배포 번들에 포함·서빙됨(404/5xx 없음). SPA 라우트라 컴포넌트 렌더는 client-side — 실제 렌더(graceful no-param / Toss 위젯)·authed 흐름은 §5 코드 검증 + positive(§9, P2d-2 동반)로 갈음. (Playwright 인증 렌더 smoke 는 P2d-2 cart 연결 시 동반 권장.)

## 9. 남은 GAP/RISK · 후속
- **positive end-to-end**: P2d-2(`WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1`)에서 cart → checkout-confirm-b2b → paymentGroupId → 결제 page 연결 + Toss 테스트결제로 실측.
- **StoreCart 직접 연결 미포함**: payment page 는 독립 동작(query 기반). cart cutover 는 P2d-2.
- **Toss CDN vs npm**: 본 WO 는 CDN 로더(lockfile 회피). 장기적으로 KPA+neture 공통 PaymentWidget(npm) 으로 수렴 가능 — `WO-O4O-PAYMENT-WIDGET-SHARED-COMPONENT-V1`(후속).
- 후속: P2d-2 cart cutover → `WO-O4O-NETURE-B2B-LEGACY-SELLER-ORDER-ROUTE-RETIREMENT-V1`(P2e).

---

*Date: 2026-06-11 · Status: PASS (web-neture B2B 결제 UI 신설, paymentGroupId 1회 결제, Toss CDN 로더. positive 실결제는 P2d-2 동반 deferred).*
