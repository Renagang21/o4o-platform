# CHECK — WO-O4O-CROSSSERVICE-B2B-CHECKOUT-CONFIRM-SERVICE-AGNOSTIC-ADOPTION-V1

- 실행일: 2026-08-27
- 기준 커밋: `449568b0c` (`origin/main`)
- 작업 브랜치: `work/b2b-confirm-service-agnostic-v1` (worktree `C:/tmp/o4o-b2b-buyer-order-read`)
- 계약 정본: `docs/baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md` §13 (본 WO 로 신설)
- 경계 정본: `docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md`

> **한 줄 요약.** Neture 코드를 GlycoPharm 에 복사하지 않았다.
> 이미 대부분 공통이던 B2B confirm 로직을 `B2BCheckoutConfirmCore` 로 승격하고,
> 서비스별로 실제로 다른 것(공급 노출 정책)만 `OfferExposureStrategy` 3종으로 남겼다.
> 부수적으로 신뢰 경계 결함 2건(O1 · O2)을 닫았다.

---

## 1. census — 착수 전 실제 분기 (current main 실측)

| 서비스 | 진입 | 서비스 클래스 | sourceType |
|---|---|---|---|
| KPA · GlycoPharm · K-Cosmetics | `POST /store/cart/:serviceKey/checkout-confirm` | `EventOfferCartCheckoutService` | `event_offer` |
| Neture | `POST /store/cart/:serviceKey/checkout-confirm-b2b` | `NetureB2BCartCheckoutService` | `b2b` · `regular` |
| PharmacyHub | 자체 `PharmacyHubOrderController` | `PharmacyHubCartCheckoutService` | `b2b` · `regular` |

두 B2B 구현(Neture 408줄 · PharmacyHub 371줄)의 실제 차이는 **공급 노출 판정 · 조직 축 ·
실패 code 어휘 · order metadata** 뿐이었고, 나머지(장바구니 조회 → offer 재조회 → 단가 재확정 →
supplier grouping → 배송비 → `createOrder` → cart 정리)는 동일했다. → §3 판정 **확인됨**.

---

## 2. 산출물

### 신규

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/services/cart/b2b-checkout-confirm.core.ts` | 서비스 무관 confirm Core |
| `apps/api-server/src/services/cart/offer-exposure-strategy.ts` | 노출 정책 3종 SSOT + 축 상호배타 assert |
| `apps/api-server/src/services/cart/store-b2b-cart-checkout.service.ts` | 승인축(glycopharm/kpa-society/k-cosmetics) wrapper |
| `apps/api-server/src/utils/buyer-organization.resolver.ts` | buyer 조직 4-way 판정 (§7) |
| `__tests__/offer-exposure-strategy.test.ts` | §4 · §5 · §30 |
| `__tests__/store-b2b-cart-checkout.test.ts` | §18 · §19 · §28 · §29 · §31 |
| `__tests__/neture-b2b-cart-checkout.test.ts` | §22 회귀 |
| `__tests__/store-cart-organization-boundary.test.ts` | §32 O1 write-side |

### 변경

| 파일 | 변경 |
|---|---|
| `services/cart/neture-b2b-cart-checkout.service.ts` | 408 → 185줄, Core wrapper 화 (§11 하드코딩 2줄 제거) |
| `services/cart/pharmacy-hub-cart-checkout.service.ts` | 371 → 180줄, Core wrapper 화 |
| `services/cart/store-cart.service.ts` | 담기 시점 조직 검증 (O1) |
| `routes/cart/store-cart.routes.ts` | 승인축 → `StoreB2BCartCheckoutService` 분기 + `B2BConfirmError` 매핑 |
| `services/neture/checkout-fulfillment-bridge.service.ts` | `store_b2b_cart` source 등록 |
| `utils/store-organization.resolver.ts` | `findAnyServiceStoreOrganizationCandidates` 추출·export |
| `packages/store-ui-core/.../{storeCartTypes,createStoreCartApi,useStoreCart}.ts` | b2b 항목이 있으면 `checkout-confirm-b2b` 로 confirm |

**순증 -83줄** (522 삽입 / 605 삭제, 문서 115줄 포함).

---

## 3. 항목별 판정

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| 1 | 공통 Core 추출 | **PASS** | `B2BCheckoutConfirmCore` — Neture · PharmacyHub · 승인축 3 wrapper 가 공유 |
| 2 | `OfferExposureStrategy` 3종 확정 | **PASS** | `approval` / `optin` / `neture`. 분기점이 이 파일 하나로 국소화 |
| 3 | 승인축 approval gate | **PASS** | `EXISTS offer_service_approvals(... APPROVED)` 를 **SQL WHERE 에서** 강제. opt-in 우회 경로 없음 (테스트가 `service_keys` 부재를 assert) |
| 4 | opt-in 축 현행 보존 | **PASS** | PharmacyHub 회귀 스펙 288줄 **무수정** 통과 |
| 5 | neture 축 현행 보존 | **PASS** | `approval_status` / `distribution_type` / `allowed_seller_ids` 판정 동일. `master_status` 무시도 그대로 |
| 6 | 축 상호배타 (§5) | **PASS** | 모듈 로드 시 `assertMutuallyExclusiveSupplyAxes()` throw + 회귀 테스트 |
| 7 | **O1 — buyer 조직 신뢰 경계** | **PASS** | client 값은 hint, 서버가 권위. cart 에 박힌 조직 id 는 주문 소유 축이 되지 않음 |
| 8 | 다중 조직 사용자 | **PASS** | 차단하지 않는다 — 올바른 선택은 허용, 선택 없으면 `400 AMBIGUOUS_STORE_ORGANIZATION` |
| 9 | 조직 검증 시점 (§9) | **PASS** | 담기(`add`) **와** confirm 양쪽. 잘못된 organizationId 는 cart 진입 자체가 403 |
| 10 | 기존 resolver 재사용 (§8) | **PASS** | `findStoreOrganizationCandidates` 위에 얇은 selection-validation helper 만 추가. 새 identity framework 없음 |
| 11 | **O2 — PharmacyHub cart delete** | **PASS** | Core 가 `{ id: In(...), buyerId, serviceKey }` 로 삭제. id-only 삭제 제거 |
| 12 | §11 Neture 하드코딩 2줄 | **PASS** | `serviceKey !== NETURE` 가드 삭제, `metadata.serviceKey = scope.serviceKey` |
| 13 | canonical price (§12) | **PASS** | `offer_service_prices` → `price_general` 폴백. `priceSnapshot` 미사용 (`unitPriceSource` 로 근거 기록) |
| 14 | offer 재조회 (§13) | **PASS** | 존재 · 노출 · supplier · serviceKey · distribution 전부 서버 재판정 |
| 15 | quantity / grouping (§14) | **PASS** | `quantity > 0`, supplier 그룹 단위, 그룹 내 1건 실패 시 그룹 전체 보류 |
| 16 | source metadata (§16) | **PASS** | 기존 tag 2종 무변경 + `store_b2b_cart` 신규 등록 |
| 17 | bridge 위치 (§17) | **PASS** | confirm 안에서 fulfillment 호출 없음. 파일 재배치 없음 |
| 18 | GlycoPharm 서버 adoption (§18) | **PASS** | `POST /store/cart/glycopharm/checkout-confirm-b2b` 가 승인 게이트로 동작 |
| 19 | 승인 0건 시 완화 (§19) | **해당 없음 — 완화하지 않음** | 게이트는 SQL 강제. 0건이면 온보딩 문제로 baseline §13-2 C3 에 명시 |
| 20 | KPA / K-Cosmetics (§20) | **PASS (계약 준비까지)** | 동일 Core·strategy 로 동작함을 테스트로 고정. **UI flow 신규 연결 없음** |
| 21 | PharmacyHub 표면 보존 (§21) | **PASS** | route · controller · 실패 code · payment grouping · source tag 전부 그대로 |
| 22 | Neture 회귀 (§22) | **PASS** | 전체 Jest 그린 + 전용 회귀 스펙 신규 |
| 23 | event_offer 경로 보호 (§23) | **PASS** | `checkout-confirm` 무변경. B2B 경로에 event_offer 투입 시 `UNSUPPORTED_CART_ITEM_SOURCE` |
| 24 | route 통일 금지 (§24) | **PASS** | URL 3표면 유지. 분기는 `isApprovalEligibleServiceKey` 하나 |
| 25 | frontend 소비자 (§25) | **DEFERRED (DF-5)** | 아래 §5 |
| 26 | 신규 UI 금지 (§26) | **PASS** | 새 카탈로그 · cart page · buyer-order page · 결제 UI · wizard **0건** |
| 27 | consumer 재유입 (§27) | **PASS** | 프로덕션 실측 410/404 (§6) |
| 28 | 조직 fixture (§28) | **PASS** | 5 케이스 전부 테스트 |
| 29 | service isolation (§29) | **PASS** | cart 조회가 `{buyerId, serviceKey}` 스코프, SQL 에 serviceKey literal 없음(파라미터), 미등록 key 는 `UNSUPPORTED_CART_SERVICE` |
| 30 | strategy 테스트 (§30) | **PASS** | 3종 게이트 표 전수 |
| 31 | price 계약 테스트 (§31) | **PASS** | service price / 폴백 / snapshot 무시 |
| 32 | cart 경계 테스트 (§32) | **PASS** | body spoof · cart 내장 조직 spoof · 삭제 경계 |
| 33 | 원자성 (§33) | **PASS** | `checkoutService.createOrder()` 단일 진입 유지, 반쪽 주문 없음 (그룹 실패는 그룹 통째 보류) |
| 34 | schema / migration (§34) | **PASS — 변경 0** | 새 table · entity · migration · API route **0**. 기존 컬럼만 사용 |
| 35 | 테스트 (§35) | **PASS** | §4 |
| 36 | typecheck / build (§36) | **PASS** | §4 |
| 37 | production smoke (§37) | **PASS** | §6 |
| 38 | production DB census (§38) | **`NO_PRODUCTION_DB_CENSUS`** | 자격증명 미제공. 우회·비밀 탐색 없음. 승인 offer 수를 **추측하지 않는다** |
| 39 | baseline 현행화 (§39) | **PASS** | 계약 §13 신설 (C1–C8) + DF-5 · DF-6 등재 |
| 40 | CHECK 작성 (§40) | **PASS** | 본 문서 |
| 41 | 중지 조건 (§41) | **미발동** | §7 |

`UNKNOWN = 0` · `UNJUDGED = 0` · `DEFERRED = 2` (DF-5 · DF-6, 판정 완료·실행 유보)

---

## 4. 검증 실측

| 대상 | 명령 | 결과 |
|---|---|---|
| api-server 전체 | `npx jest --maxWorkers=1` | **216 suites / 3628 tests PASS** (285.6s, exit 0) |
| cart 도메인 | `npx jest src/services/cart/__tests__` | 4 suites / 89 tests PASS (37.8s) |
| api-server 타입 | `npx tsc --noEmit` | exit 0 |
| store-ui-core | `npx tsc --noEmit` | exit 0 |
| web-glycopharm | `npx tsc -b` | exit 0 |
| web-pharmacy-hub | `npx tsc -b` | exit 0 |
| web-neture | `npx tsc --noEmit` | exit 0 |
| web-kpa-society | `npx tsc --noEmit` | exit 0 |
| web-k-cosmetics | `npx tsc --noEmit` | exit 0 |
| web-glycopharm / web-neture / web-pharmacy-hub | `npx vite build` | exit 0 |

`packages/store-ui-core` 를 수정했으므로 **소비 서비스 5개 전부** 확인했다 (§36).

---

## 5. DF-5 — GlycoPharm B2B 장바구니 **생산자**가 없다 (DEFERRED)

current main 실측:

- `sourceType: 'b2b' | 'regular'` 를 만드는 frontend 코드는 **`services/web-neture/src/lib/api/storeCart.ts:68` 단 한 곳**이다.
- GlycoPharm 의 장바구니 생산자는 `pages/hub/HubEventOffersPage.tsx` 하나이며 `event_offer` 를 만든다.
- §25 가 지목한 기준 진입 `/store/commerce/products` 는 `PharmacyB2BProducts` → `SupplyCatalogHub` 이고,
  그 화면의 액션 "내 약국에 추가" 는 **공급 상품 신청(`ProductApproval` PENDING)** 이다.
  코드 주석이 명시한다 — **"신청 ≠ 주문"**. 장바구니에 담지 않는다.

따라서 `/store/commerce/products → canonical cart → b2b confirm` 의 **가운데 링크가 없다.**

| 층 | 상태 |
|---|---|
| 서버 confirm | **준비 완료** — 승인 게이트로 동작 |
| 공통 client (`useStoreCart`) | **준비 완료** — b2b 항목이 있으면 자동으로 b2b 경로 |
| 생산자 UI | **없음** |

**왜 만들지 않는가.** 담기 버튼을 붙이는 것은 그 화면의 의미를 "신청"에서 "주문"으로 바꾸는
**제품/UX 결정**이다 (기존 DF-2 와 같은 성격). §26 은 새 카탈로그·cart 화면을 금지하고,
§20 은 이번 WO 에서 UI flow 신규 연결을 금지한다. → baseline §10 **DF-5** 로 등재.

`/store/b2b-order` 는 은퇴 상태 그대로 두었다 (복구하지 않음).

---

## 6. 프로덕션 read-only smoke (§37)

`https://api.neture.co.kr` · 인증 없음 · **금전/주문 write 0건**

| 경로 | 기대 | 실측 |
|---|---|---|
| `GET /health` | 200 | **200** |
| `POST /api/v1/store/cart/glycopharm/checkout-confirm-b2b` | 401 (라우트 존재 · auth guard) | **401** |
| `POST /api/v1/store/cart/neture/checkout-confirm-b2b` | 401 | **401** |
| `POST /api/v1/store/cart/pharmacy-hub/checkout-confirm-b2b` | 401 | **401** |
| `POST /api/v1/store/cart/glycopharm/checkout-confirm` | 401 (event_offer 축 생존) | **401** |
| `POST /api/v1/store/cart/glycopharm/items` | 401 | **401** |
| `GET /api/v1/glycopharm/checkout/orders` | 401 | **401** |
| `POST /api/v1/glycopharm/checkout` | 410 은퇴 | **410** |
| `POST /api/v1/cosmetics/orders` | 410 은퇴 | **410** |
| `POST /api/v1/kpa/checkout/orders` | 404 (라우트 제거) | **404** |

전 요청이 인증 이전 단계에서 종료됐다. 실제 PG 결제·환불 **수행하지 않음**. POS 개발 **0**.

---

## 7. §41 중지 조건 점검

| 조건 | 발동 |
|---|---|
| Neture · PharmacyHub 저장 계약 비호환 | **아니오** — 동일 `createOrder` DTO. 차이는 metadata 와 seller 축뿐이며 adapter 로 흡수 |
| Core 에 schema 변경 필수 | **아니오** — migration 0 |
| GlycoPharm 승인 offer 를 canonical supplier offer 와 연결 불가 | **아니오** — `offer_service_approvals.offer_id → supplier_product_offers.id` 로 직결 |
| buyer 조직 서버 검증 불가 | **아니오** — 기존 `findStoreOrganizationCandidates` 재사용으로 가능 |
| payment · fulfillment lifecycle 재설계 확대 | **아니오** — confirm 밖 무변경 |
| 다른 세션이 동일 파일 수정 중 | **아니오** — 격리 worktree, 대상 파일 충돌 없음 |

---

## 8. 남은 위험 · 후속

| # | 내용 | 성격 |
|---|---|---|
| DF-5 | GlycoPharm b2b 장바구니 생산자 UI 부재 | 제품/UX 결정 대기 |
| DF-6 | `neture` strategy 가 `spo.deleted_at IS NULL` 을 걸지 않음 (soft-delete offer 노출) | **현행 main 과 동일 동작**. §22 회귀 회피를 위해 의도적 보존. 별도 WO |
| — | 승인축 실제 승인 데이터 규모 | `NO_PRODUCTION_DB_CENSUS` — 추측하지 않음 |
| DF-3 | KPA 관심상품 작업대 → canonical 장바구니 | 공통 confirm 안정화 이후 |
