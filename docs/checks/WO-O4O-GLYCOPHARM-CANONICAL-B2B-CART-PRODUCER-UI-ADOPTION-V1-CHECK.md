# WO-O4O-GLYCOPHARM-CANONICAL-B2B-CART-PRODUCER-UI-ADOPTION-V1 — CHECK

> 목표 흐름
>
> ```
> /store/commerce/products → 승인된 supplier_product_offers → canonical store_cart_items
>   → service-agnostic B2B checkout confirm → checkout_orders → buyer order ledger
> ```
>
> **새 주문 UI 를 만드는 작업이 아니다.** 이미 존재하는 canonical 공급 카탈로그를,
> 이미 완성된 B2B cart/confirm/order 축의 **실제 producer** 로 연결하는 작업이다.
> 이 WO 로 baseline §10 의 **DF-5 가 종결**된다. DF-3(KPA 관심상품)은 계속 DEFERRED.

---

## 1. 전수조사 (§7) — `UNKNOWN = 0` · `UNJUDGED = 0`

### 1-1. 카탈로그 축 (producer 의 출처)

| 대상 | 실측 | 판정 |
|---|---|---|
| 화면 | `services/web-glycopharm/src/pages/store-management/PharmacyB2BProducts.tsx` (43줄 thin wrapper) | canonical |
| 공통 컴포넌트 | `packages/store-ui-core/.../SupplyCatalogHub.tsx` (GlycoPharm · K-Cosmetics · KPA 공유) | 공유 — 변경 시 opt-in 필수 |
| client | `services/web-glycopharm/src/api/pharmacyProducts.ts` → `createSupplyCatalogApi('/glycopharm')`, `service_key: 'glycopharm'` | canonical |
| 서버 | `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts` `GET /catalog` | canonical |
| 행 id 축 | `SELECT spo.id AS "id"` — **카탈로그 행 id = SupplierProductOffer id** | producer 가 그대로 쓸 수 있다 |
| supplier 축 | `s.id AS "supplierId"` (= `neture_suppliers.id` = `spo.supplier_id`) | confirm 의 grouping 축과 동일 |
| 노출 게이트 | `buildServiceApprovalGateSql` — `PUBLIC` OR `EXISTS offer_service_approvals(service_key, approval_status='approved')` + `buildPrivateSellerScopeSql(allowed_seller_ids ∋ organizationId)` + `spo.is_active` + `s.status='ACTIVE'` | 서버 판정 |
| 조직 축 | `requireAuth` + `requirePharmacyOwner`, `organizationId` **서버 확정** | 클라이언트 미참여 |

### 1-2. 주문 축 (이미 완성돼 있던 것)

| 대상 | 실측 | 판정 |
|---|---|---|
| cart 저장 | `store_cart_items` / `services/cart/store-cart.service.ts` | canonical |
| cart route | `/api/v1/store/cart/:serviceKey/*`, `resolveScope` = 인증 + `hasActiveServiceMembership` | §34 우회 불가 |
| cart client | `packages/store-ui-core/.../createStoreCartApi.ts` `addItem(serviceKey, input)` | 이미 존재 |
| 축 라우팅 | `useStoreCart.confirmCheckout` — `b2b`/`regular` 항목이 있으면 `checkoutConfirmB2B` | **§18 이미 충족, 무변경** |
| 장바구니 화면 | `services/web-glycopharm/src/pages/store-cart/StoreCartPage.tsx` → `/store-hub/cart` | 이미 존재 |
| confirm Core | `services/cart/b2b-checkout-confirm.core.ts` (service-agnostic) | canonical |
| GlycoPharm adapter | `store-b2b-cart-checkout.service.ts` — `organizationPolicy: 'required'`, `requireCartSupplierId: false`, `enforceCartSupplierMatch: false` | canonical |
| 노출 정책 | `offer-exposure-strategy.ts` `approvalStrategy` (glycopharm · kpa-society · k-cosmetics) | 유일한 서비스 분기점 |

### 1-3. 계약 실측 (§13 · §22 · §23 · §24 · §25)

| 항목 | 실측 근거 (Core) | 판정 |
|---|---|---|
| 가격 권위 | `buildOfferQuery` 의 `offer_service_prices(service_key=$2)` → 없으면 `price_general` fallback | cart snapshot 미신뢰 |
| 혼합 sourceType | `B2B_ORDERABLE_SOURCE_TYPES = {b2b, regular}` 외는 `failedItems` | event_offer 축 격리 |
| 공급자 grouping | 서버 `offer.supplier_id` 기준. 실패 항목이 속한 그룹은 **전체 무효화**(poisoned) | 금액 일관성 |
| 수량 | 정수 · `1..1000` 아니면 `INVALID_QUANTITY` | 서버 판정 |
| 실패 처리 | fail closed. cart 삭제는 성공 그룹만, `id + buyerId + serviceKey` 스코프 | 강행 주문 없음 |
| 조직 | `resolveBuyerOrganization` — `none`→403 / `ambiguous`→400 / `forbidden`→403 | 임의 첫 조직 선택 없음 |

### 1-4. 은퇴 축 보존 (§30 · §32)

| 대상 | 실측 | 판정 |
|---|---|---|
| `/store/b2b-order` | `App.tsx:1089` → `B2BOrderRetiredPage` (은퇴 안내) | 무변경 |
| GlycoPharm consumer checkout | `routes/glycopharm/controllers/checkout.controller.ts:125` → `410 STORE_SALE_PAYMENT_DEPRECATED` | 무변경 |
| legacy event-offer 외부 route | `event-offer.controller.ts:97` → `410` | 무변경 |
| `glycopharm_products` | 주문 source 로 사용하지 않음 (producer payload 는 offer id 만 사용) | 계약 유지 |

---

## 2. 발견된 결함 (§19)

### 2-1. BLOCKING — 승인 junction 표기 축 불일치

`apps/api-server/src/services/cart/offer-exposure-strategy.ts` 의 `approvalStrategy.offerWhereSql` 이
`osa.approval_status = 'APPROVED'` (대문자)로 비교하고 있었다.

| 축 | 표기 | 근거 |
|---|---|---|
| `offer_service_approvals.approval_status` | **소문자** | entity default `'pending'`, backfill migration `20260328000100` 이 `'approved'` 삽입, 카탈로그 SSOT `buildServiceApprovalGateSql` 도 `'approved'` |
| `supplier_product_offers.approval_status` | 대문자 | `neture.routes.ts` 등 기존 코드가 `'APPROVED'` |

repo 전수 grep 결과 `offer_service_approvals` 를 대문자로 비교하는 곳은 이 한 군데뿐이었다.
영향: 승인축 3서비스(glycopharm · kpa-society · k-cosmetics)의 B2B confirm 에서 `EXISTS` 가
항상 거짓 → **모든 offer 가 `OFFER_NOT_FOUND` 로 실패**. 즉 이 WO 의 목표 흐름이 성립하지 않는다.

판정: **게이트 완화가 아니라 축 정합 수정**이다(§9 위반 아님). 승인 행이 없는 offer 는 여전히 주문 불가다.
회귀 테스트 2건으로 고정했다.

> 이 결함은 선행 WO(`...B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1`)에서 유입된 것이다.
> 과거 CHECK 의 역사적 기술은 소급 수정하지 않고, 본 문서에 현재 사실로 기록한다.

### 2-2. DEFERRED — PRIVATE 판정 축 불일치 (baseline DF-8)

`approvalStrategy.gate` 는 PRIVATE offer 의 `allowed_seller_ids` 를 **`ctx.buyerId`(사용자)** 와 비교하는데,
카탈로그 노출은 **organizationId(매장)** 와 비교한다. 카탈로그에 보이는 PRIVATE offer 가 confirm 에서
`DISTRIBUTION_DENIED` 로 거부될 수 있다.

미루는 이유: 공급 승인 정책의 축을 바꾸는 변경이고 3서비스 동시 영향이다(§5 OUT_OF_SCOPE — 승인 정책 변경).
**완화 방향이 아니므로 안전 측 실패**다. baseline §10 DF-8 로 등재했다.

### 2-3. DEFERRED — 다중 매장 조직 선택 UI (baseline DF-7)

`useStoreCart` 는 `organizationId` 를 보내지 않는다. 조직이 2개 이상인 사용자는 서버가
`AMBIGUOUS_STORE_ORGANIZATION`(400) 으로 fail closed 하고, 화면은 그 사유를 그대로 보여준다.
**임의로 첫 조직을 고르지 않는다(§14 준수).** 선택 UI 는 조직 목록 조회 표면이 새로 필요하므로 별도 WO.

---

## 3. 변경 내용

| # | 파일 | 내용 |
|---|---|---|
| 1 | `apps/api-server/src/services/cart/offer-exposure-strategy.ts` | 승인 junction 비교를 `'approved'` (소문자)로 정정 + 표기 축 주석 |
| 2 | `.../cart/__tests__/offer-exposure-strategy.test.ts` | 소문자 표기 회귀 테스트 추가, 기존 단정 갱신 |
| 3 | `.../cart/__tests__/store-b2b-cart-checkout.test.ts` | 승인 게이트 SQL 단정을 소문자 축으로 갱신 |
| 4 | `packages/store-ui-core/.../SupplyCatalogHub.tsx` | **opt-in** `cart` prop (`SupplyCatalogCartProducer`) — 행 단위 담기 · 선택 일괄 담기 · 결과/실패 안내. prop 미지정이면 렌더 트리·액션·문구 무변경 |
| 5 | `packages/store-ui-core/src/index.ts` | `SupplyCatalogCartProducer` 타입 export |
| 6 | `services/web-glycopharm/src/utils/supplyCatalogCart.ts` (신규) | 카탈로그 행 → canonical cart payload 조립 |
| 7 | `services/web-glycopharm/.../PharmacyB2BProducts.tsx` | `cart` prop 배선 (`storeCartApi.addItem('glycopharm', …)`, `/store-hub/cart`) |
| 8 | `packages/store-ui-core/.../__tests__/SupplyCatalogHub.cart-producer.test.tsx` (신규) | opt-in 계약 5건 |
| 9 | `services/web-glycopharm/src/utils/__tests__/supplyCatalogCart.test.ts` (신규) | payload 계약 8건 |
| 10 | `services/web-glycopharm/vitest.config.mjs` (신규) · `packages/store-ui-core/vitest.config.mjs` | 실행 경로 확보 (후자는 node → jsdom) |
| 11 | `.github/workflows/ci-pipeline.yml` | 위 두 suite 를 Code Quality Check 에 blocking 연결 |
| 12 | `docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md` | §13-2 불변식 C6(표기 축) · §13-6 cart producer 계약 신설 · DF-5 종결 · DF-7/DF-8 등재 |

**새로 만들지 않은 것:** 소비자 storefront/cart/checkout/payment, 매장 seller order, POS,
새 cart/order entity, 새 payment flow, `checkout_orders` schema 변경, `/store/b2b-order` 복구.

### 3-1. 담기 payload 계약

```
sourceType             = 'b2b'
supplierProductOfferId = 카탈로그 행 id (= supplier_product_offers.id)
supplierId             = neture_suppliers.id              // 힌트. 서버가 재조회로 확정
productName            = 표시명
quantity               = 1                                // 수량 변경은 장바구니에서
pricingSource          = 'regular'
priceSnapshot          = priceGold ?? priceGeneral ?? 0   // 표시용. 서버가 재확정
organizationId         = (보내지 않음)                     // 매장 판정 권위는 서버
```

금지 사항 준수(§12): 표시명/manufacturer 를 공급자 식별자로 쓰지 않음, sku·barcode heuristic 없음,
frontend 가격을 권위로 쓰지 않음, legacy `glycopharm_products` id 미사용.

### 3-2. 기존 서비스 회귀 0 (§41)

`SupplyCatalogHub` 의 담기 UI 는 `cart` prop 이 있을 때만 존재한다 — 컬럼 자체가 조건부이고
ActionBar 액션도 조건부다. KPA-Society · K-Cosmetics 는 prop 을 주지 않으므로 화면이 종전과 동일하다.
"내 매장/약국에 추가"(ProductApproval PENDING) 액션은 그대로 남는다 — **담기 ≠ 신청 ≠ 주문**.

---

## 4. 검증 실측

| 검증 | 명령 | 결과 |
|---|---|---|
| api-server Jest 전체 | `cd apps/api-server && npx jest --maxWorkers=1` | **219 suites / 3689 tests 전부 통과** |
| cart 축 집중 | `npx jest src/services/cart --maxWorkers=1` | 5 suites / 94 tests 통과 |
| store-ui-core Vitest | `npx vitest run --config packages/store-ui-core/vitest.config.mjs` | 2 files / 23 tests 통과 |
| web-glycopharm Vitest | `npx vitest run --config services/web-glycopharm/vitest.config.mjs` | 1 file / 8 tests 통과 |
| lint ratchet | `node scripts/lint-ratchet.mjs` | 65 errors (baseline 65) · exit 0 |
| unsafe routes | `node scripts/check-unsafe-routes.mjs` | 1393 파일 · 위반 0 |
| typeorm entities | `node scripts/check-typeorm-entities.mjs` | 통과 (미등록 0 / 중복 0 / stale 0) |
| store-ui-core 타입 | `tsc --noEmit` | 오류 0 |
| web-glycopharm 타입 | `tsc -b` | 본 WO 변경 파일 오류 0 (기존 무관 오류 3건은 그대로 — `OperatorLayoutWrapper.tsx` · `operatorMenuGroups.ts`) |

### 4-1. 프로덕션 실측 (§43 · §44)

**`NO_PRODUCTION_DB_CENSUS`.** 안전한 프로덕션 자격증명이 제공되지 않았으므로 프로덕션 DB 조회를
수행하지 않았다. 승인 offer 의 실제 건수를 추측하지 않는다. 실제 주문 write 도 하지 않았다
(안전한 테스트 fixture 없음). 승인 offer 가 0건으로 확인되더라도 approval gate 를 우회하지 않는다.

---

## 5. WO 판정

| § | 요구 | 판정 |
|---|---|---|
| 7 | 화면/축 전수조사 | **DONE** — `UNKNOWN = 0` · `UNJUDGED = 0` (§1) |
| 8 | `glycopharm_products` 를 주문 source 로 쓰지 않음 | **DONE** |
| 9 | 승인 offer 0건이어도 gate 미완화 | **DONE** — 정합 수정만, 완화 없음 (§2-1) |
| 10 | frontend 임의 판단 없음 | **DONE** — 자격 판정은 confirm 시 서버 |
| 12 | 식별자/가격 금지 사항 | **DONE** (§3-1, 테스트 8건) |
| 13 | cart snapshot 을 최종 가격으로 신뢰하지 않음 | **DONE** — Core 가 재확정 |
| 14 | 다중 조직 시 임의 선택 금지 | **DONE** — fail closed, DF-7 등재 |
| 18 | b2b 항목 → `checkout-confirm-b2b` | **DONE** — 기존 `useStoreCart` 그대로 (무변경) |
| 19 | canonical B2B confirm 연결 | **DONE** — §2-1 수정으로 실제 동작 |
| 25 | 실패 시 fail closed | **DONE** |
| 30 · 32 | 은퇴 축 보존 | **DONE** (§1-4) |
| 34 | serviceKey 우회 불가 | **DONE** — `resolveScope` 멤버십 검사 |
| 35–41 | 테스트 | **DONE** — backend 회귀 2 + 프론트 계약 13, 전부 CI blocking |
| 43 · 44 | 프로덕션 실측 | **NO_PRODUCTION_DB_CENSUS** (§4-1) |
| 45 | baseline 갱신 | **DONE** |
| 46 | CHECK 작성 | 본 문서 |
| 47 | 중지 조건 | 해당 없음 — 다른 세션과 파일 충돌 없음, confirm 경로는 main 에 이미 배선돼 있었음 |
| 48 | commit · push · CI | §6 |

`UNKNOWN = 0` · `UNJUDGED = 0`.

---

## 6. 실행 기록

- 작업 격리 worktree: `C:/tmp/o4o-b2b-buyer-order-read` (branch `work/b2b-confirm-service-agnostic-v1`, base `origin/main` `063e811a5`)
- Safe Commit 계약 준수: 명시 경로 `git add` → `node scripts/git/check-staged-scope.mjs` → 경로 스코프 commit. `git add .` 미사용, 타 세션 파일 미조작.
- commit / push / CI 결과는 아래에 추가한다.

## 7. DEFERRED

| # | 내용 | 등재 |
|---|---|---|
| DF-7 | 다중 매장 조직 선택 UI | baseline §10 |
| DF-8 | 승인축 PRIVATE 판정 축(buyerId vs organizationId) 정렬 | baseline §10 |
| DF-3 | KPA 관심상품 작업대 → canonical 장바구니 (본 WO 범위 밖 유지) | baseline §10 |
