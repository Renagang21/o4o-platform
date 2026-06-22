# CHECK-O4O-STORE-SERVICE-SUBSCRIPTION-PLAN-CATALOG-V1

> **작업명:** WO-O4O-STORE-SERVICE-SUBSCRIPTION-PLAN-CATALOG-V1
> **유형:** backend(plan catalog SSOT + prepare/confirm 가격 산정 책임 이전) + frontend(catalog 기준 가격 표시). PaymentCore/Toss adapter·schema·migration **0**.
> **결과: PASS(코드/타입/빌드) — 구독 가격/기간/표시명을 서버 fixed catalog 로 고정. 99000 하드코딩 분산 제거(catalog 단일 출처). prepare=catalog amount(client amount 미수신), confirm=catalog durationDays + amount 일치 검증. api-server tsc 0, web-kpa tsc 0 + build 0.**
> **작성일:** 2026-06-22
> 선행: WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1 (Phase1 backend + Phase2 frontend, 조건부 완료)

---

## 1. git 상태 / 다른 세션 WIP

- HEAD `bec4f2185`(선행 WO Phase2 CHECK) 기준. `git pull` Already up to date.
- **다른 세션 WIP 다수 동시 진행**(multilingual public: `multilingual-product-content.controller.ts`, `multilingualProductContentStore.ts`, `StoreLocalProductsPage.tsx`, `MultilingualPublicActions.tsx`, `pages/public/`, `pnpm-lock.yaml`, `apps/mobile-app/`) — **전부 미접촉.** `App.tsx`/`StoreLocalProductsPage.tsx` 는 `git diff HEAD` 실변경 0(CRLF 잔상). **path-specific 커밋으로 본 WO 4파일 + CHECK 만 반영.**

## 2. 변경 파일 (backend 2 + frontend 2 + CHECK)

| 파일 | 변경 |
|------|------|
| `modules/store-entitlement/store-service-subscription-plan-catalog.ts` | **신규** — fixed catalog SSOT(plan 정의 + `getStoreServiceSubscriptionPlan`/`listStoreServiceSubscriptionPlans`/`assertEnabledPlan`) |
| `modules/store-entitlement/store-entitlement.routes.ts` | 하드코딩 상수(`STORE_SUBSCRIPTION_PLAN_PRICES`/`SUBSCRIPTION_PLAN_LABELS`/`SUBSCRIPTION_DURATION_DAYS`) **제거** → catalog 참조. prepare=catalog amount/name/duration + plan snapshot metadata·응답, confirm=catalog durationDays + amount 일치 검증. **GET `/subscriptions/plans`·`/subscriptions/plans/:planCode`** 추가 |
| `web-kpa-society/src/api/storeServiceSubscription.ts` | `getSubscriptionPlan(planCode)` + `SubscriptionPlan`/prepare `plan` snapshot 타입 |
| `web-kpa-society/.../ForeignVisitorSalesSupportPage.tsx` | 가격 라벨 하드코딩 제거 → catalog 조회로 `priceLabel`(예: "월 99,000원 · 30일 이용권") 구성 |

## 3. plan catalog 정의 (V1 fixed)

```
FOREIGN_VISITOR_SALES_SUPPORT
  name: '외국인 여행객 판매지원 월 이용권'
  amount: 99000  currency: KRW  durationDays: 30
  priceSource: 'V1_FIXED_CATALOG'  enabled: true
```
- DB 테이블 미생성(plan 1개·가격 가변·migration 회피). 운영 가격 관리 필요 시 PLAN-CATALOG-DB-V2.
- 가격 변경은 catalog 1곳만 수정(하드코딩 분산 금지).

## 4. 가격 산정 책임 위치

- **전적으로 서버.** `assertEnabledPlan(planCode)` 가 prepare/confirm 양쪽 단일 진입.
- **prepare**: client amount **미수신**(body 에서 읽지 않음). `plan.amount/currency/durationDays/name` 으로 PaymentCore.prepare. PaymentCore 가 prepare amount 를 서버 검증값으로 고정(프론트 위변조 불가).
- **confirm**: `record.amount !== plan.amount` → **PLAN_AMOUNT_MISMATCH 400**(catalog 가격 변동 시 구결제 방어). entitlement 연장 일수 = `plan.durationDays`(하드코딩 30 제거).

## 5. metadata / 응답

- prepare metadata: `{ paymentType:STORE_SERVICE_SUBSCRIPTION, planCode, planName, organizationId, serviceCode, amount, currency, durationDays, priceSource }`.
- prepare 응답 data: 기존(paymentId/orderId/amount/clientKey/isTestMode) + `currency` + `plan{planCode,name,durationDays,amount,currency}`.
- plan 조회 응답: `GET /subscriptions/plans/:planCode` → `{success, data: plan}`, `GET /subscriptions/plans` → `{success, data:{plans:[...]}}`. (requireAuth)

## 6. frontend 가격 표시

- 페이지 mount 시 `getSubscriptionPlan('FOREIGN_VISITOR_SALES_SUPPORT')` → `priceLabel` 구성(KRW=`월 N원`). **프론트 가격 상수 0**. 조회 실패 시 라벨 생략(버튼 정상 동작).
- 결제 클릭 시 `planCode`만 prepare 전달, Toss 에는 **prepare 응답 amount** 사용.

## 7. 보존 경계 (정적 확인)

- ✅ 함수형 99000 = catalog 단일 출처(나머지: Panel JSDoc 주석 예시 1, startup.service 마이그레이션 타임스탬프 1 — 무관).
- ✅ STORE_SALE_PAYMENT(kpa/glyco/cosmetics consumer checkout 410) **미접촉** — 되살리지 않음.
- ✅ Neture B2B(`neture-b2b-payment.controller`) **diff 0**.
- ✅ PaymentCore/Toss adapter/`o4o_payments`/`store_paid_feature_entitlements` schema **무변경**. **migration 0.**

## 8. 검증

- api-server `tsc --noEmit`: **EXIT 0**.
- web-kpa-society `tsc --noEmit`: **EXIT 0** · `build`(tsc && vite build): **EXIT 0**(✓ built 14.54s).
- 브라우저 smoke: 선행 WO 보류 smoke 와 묶음. 가격이 catalog 응답 기준 표시 + prepare amount=catalog amount(99000) + orderId `o4o_sub_` + Toss 위젯 진입까지 비파괴 확인(예정). **실 결제(confirm) 운영 금지** — Chrome 프로필 점유 해소 후 1회.

## 9. 후속 후보

- WO-O4O-STORE-ENTITLEMENTS-CHECK-ENDSAT-EXPOSURE-V1 (/me/check endsAt 노출).
- WO-O4O-STORE-SERVICE-SUBSCRIPTION-PLAN-CATALOG-DB-V2 (plan/price DB화 + 운영자 가격 관리 + 서비스별/기간별 확장).
- WO-O4O-STORE-SERVICE-SUBSCRIPTION-BILLING-KEY-V2 (Toss billing key 정기결제).

---

*Date: 2026-06-22 · plan catalog SSOT(fixed) · 가격 산정 책임 서버 이전(prepare client amount 미수신 / confirm amount 일치 검증 + catalog durationDays) · 99000 하드코딩 분산 제거 · GET /subscriptions/plans · frontend catalog 기준 표시 · STORE_SALE_PAYMENT/Neture B2B/PaymentCore schema 무변경 · migration 0 · api tsc 0 · web-kpa tsc 0 + build 0.*
