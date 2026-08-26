# WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1 — CHECK

> **Status**: Closed (배포 완료 · production smoke PASS · 2026-08-26)
>
> 종료 절차는 `WO-O4O-STORE-CONSUMER-COMMERCE-RETIREMENT-MAIN-INTEGRATION-AND-CLOSURE-V1` 로 수행했다 (§10).
> **Date**: 2026-08-25
> **상위 규정**: [`docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md`](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md)
> **사업 계약**: `PLATFORM_DIRECT_SALE_BUSINESS_CONTRACT = NONE` (2026-08-25 확정)

---

## 0. 판정 원칙 (역추론 금지)

본 작업은 **사업 계약이 먼저이고 코드가 그 계약에 맞게 정리되는** 순서를 따른다.

```text
금지: "platform-seller 코드가 있으니 플랫폼 판매를 유지한다"
금지: "checkout/refund 코드가 살아 있으니 현행 기능이다"
```

코드의 존재는 근거가 아니다. 각 코드는 **누가 구매자이고 누가 판매자인가**로만 판정한다.

**판정 질문 (boundary §12)**: *소비자가 O4O 안에서 매장을 상대로 결제하는 주문인가?*
- YES → `LEGACY_COMMERCE` (금지 대상)
- NO, 매장이 공급자로부터 구매 → `ACTIVE_CANONICAL` (B2B, 보호 대상)

---

## 1. 단계 1 — Priority Chain 편입 (완료)

commit `c98d95644`

| 파일 | 변경 |
|---|---|
| `CLAUDE.md` | 사업 철학 SSOT(Priority Chain) 3위 편입 (`O4O-BUSINESS-PHILOSOPHY-V1` 바로 다음), 개별 WO/CHECK 최하위 명시, "이 문서는 코드보다 먼저 읽는다", 역추론 금지 blockquote |
| `AGENTS.md` | 공통 정본 표 + 충돌 시 우선순위 동일 편입 (AGENTS.md 는 CLAUDE.md 와 **동급** 진입점이므로 양쪽 모두 필요) |
| `docs/baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md` | §13-1 신설 — `PLATFORM_DIRECT_SALE_BUSINESS_CONTRACT = NONE` |

---

## 2. 단계 2 — L1~L6 전수 census

### 2-1. 판정 결과 요약

| # | 대상 | WO 사전 라벨 | **census 판정** | 근거 |
|---|---|---|---|---|
| L1 | GlycoPharm 매장 B2C checkout | LEGACY 후보 | **LEGACY_COMMERCE** | `checkout.controller.ts` 가 `organization_channels.channel_type='B2C'` (약국 조직) 게이트 → 소비자→매장 |
| L2 | K-Cosmetics 매장 판매 | LEGACY 후보 | **LEGACY_COMMERCE** | `cosmetics-order.controller.ts` header: `OrderType = RETAIL + serviceKey='cosmetics'`, 채널 `local`/`travel` = 소비자 축 |
| L3 | KPA store-owner 판매·주문 관리 | LEGACY 후보 | **LEGACY_COMMERCE** | `kpa-checkout.controller.ts` header: `WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1`; `/checkout/store-orders*` 는 `sellerOrganizationId` 기준 = 매장이 판매자 |
| L4 | Pharmacy-Hub store-owner 취소 | LEGACY 후보 | **⚠️ ACTIVE_CANONICAL (판정 반전)** | `PharmacyHub{Cart,Order,Payment}Controller` 전부 `WO-PHARMACY-HUB-B2B-*` — 매장이 **구매자**, 공급자가 판매자. 소비자 결제 아님 |
| L5 | platform-seller (`/api/checkout/*`) | LEGACY/DEAD 조사 | **DEAD** | `PHASE_N1_CONFIG.PLATFORM_SELLER_ID='platform-seller'`; 프론트엔드 호출자 **0건** (repo 전수) |
| L6 | 이미 410된 payment 경로 | 제거/retirement 후보 | **LEGACY_COMMERCE (dead body 보유)** | 3개 payment controller 가 410 반환 후 `// eslint-disable-next-line no-unreachable` 로 구 결제 로직을 통째로 보존 중 |

> **L4 는 사전 라벨과 반대로 판정되었다.** WO 는 L4 를 LEGACY 후보로 지목했으나, census 결과 Pharmacy-Hub store-owner 축은
> **B2B 공급자→매장 주문**이다 (사용자가 명시한 보호 대상 `B2B 공급자→매장 주문 → ACTIVE_CANONICAL` 에 해당).
> 라벨을 근거로 제거하지 않고 **코드 증거를 근거로 보호 대상으로 분리**한다.

### 2-2. 보호 대상 (제거 금지)

| 축 | 분류 | 근거 |
|---|---|---|
| `/api/v1/store/cart/:serviceKey/*` (`store-cart.routes.ts`) | `ACTIVE_CANONICAL` | header: "매장 경영자(buyer)의 장바구니" — 매장이 구매자 |
| `EventOfferCartCheckoutService` / `NetureB2BCartCheckoutService` / `PharmacyHubCartCheckoutService` | `ACTIVE_CANONICAL` | 전부 매장→공급자 B2B |
| `/api/v1/pharmacy-hub/store-owner/{cart,orders,payments}` | `ACTIVE_CANONICAL` | L4 판정 반전 (위) |
| `/{svc}/checkout/orders`, `/orders/:id` (buyerId 기준) | `ACTIVE_CANONICAL` | 매장 경영자의 **구매/발주** 내역 |
| `store-external-sales.controller.ts` | `EXTERNAL_CHANNEL_SUPPORT` | 외부 판매채널 연동 (boundary §5) |
| `StorefrontProductDetailPage` (KPA, QR 제품 랜딩) | `EXTERNAL_CHANNEL_SUPPORT` / 정보제공 | App.tsx 주석에 QR landing 전용 존치 명시 (boundary §4) |
| Neture B2B payment (`neture-b2b-payment.controller.ts`) | `ACTIVE_CANONICAL` | 공급자↔매장 B2B 결제 |

### 2-3. 이미 죽어 있던 코드 (404 호출)

`services/web-glycopharm/src/api/store.ts` 의 Cart API 5종 · 소비자 Order API 4종은
`/glycopharm/stores/:slug/cart`, `/glycopharm/stores/:slug/orders*` 를 호출하지만
백엔드 `store.controller.ts` 에는 **해당 라우트가 존재하지 않는다** (등록 엔드포인트 11개 전수 확인 — cart/orders 없음).
→ 호출 즉시 404. `DEAD`.

---

## 3. 단계 3 — LEGACY_COMMERCE 제거 (backend)

### 3-1. 소비자→매장 주문 생성 producer (410)

새 코드 `STORE_CONSUMER_ORDER_RETIRED` 를 도입했다.

| 경로 | 조치 | 파일 |
|---|---|---|
| `POST /api/v1/glycopharm/checkout` | **410** + 본문 전체 제거 | `routes/glycopharm/controllers/checkout.controller.ts` |
| `POST /api/v1/cosmetics/orders` | **410** + 본문 전체 제거 | `routes/cosmetics/controllers/cosmetics-order.controller.ts` |
| `POST /api/v1/kpa/checkout` | **410** + 본문 전체 제거 | `routes/kpa/controllers/kpa-checkout.controller.ts` |

세 경로 모두 `organization_channels.channel_type='B2C'` **승인된 자체 소비자 판매 채널**을
게이트로 요구하던 O4O 자체 소비자 commerce 였다 (boundary §2-1 · §2-2 · §3).

### 3-2. 매장=판매자(seller) 주문 관리 축 제거

`kpa-checkout.controller.ts` 에서 다음을 **삭제**했다.

```text
GET   /checkout/store-orders
GET   /checkout/store-orders/kpi
GET   /checkout/store-orders/:orderId
PATCH /checkout/store-orders/:orderId/status
```

전부 `sellerOrganizationId` 기준 = 매장이 판매자인 관점. boundary §2-1 · §3 · §7 위반.

**보존**: `GET /checkout/orders`, `GET /checkout/orders/:orderId`,
`POST /checkout/orders/:orderId/cancel` — `buyerId` 기준 B2B 발주 축.

### 3-3. 플랫폼 직접판매(`platform-seller`) producer 제거 — L5

`PLATFORM_DIRECT_SALE_BUSINESS_CONTRACT = NONE` 에 따라 코드를 계약에 맞춘다.

| 대상 | 조치 |
|---|---|
| `POST /api/checkout/initiate` | 라우트 등록 + 핸들러 제거 |
| `POST /api/checkout/confirm` | 라우트 등록 + 핸들러 제거 |
| `PHASE_N1_CONFIG.PLATFORM_SELLER_ID` | 제거 |

`checkoutController.ts` 는 **관리·조회 전용**(`refund` / `getOrder` / `getOrders`)으로 축소했다.
`POST /api/checkout/refund` 는 `platform:super_admin` 전용 플랫폼 환불이며 **현행 B2B(공급자→매장)
주문도 같은 `checkout_orders` 원장을 쓰므로 보존**한다
(`WO-O4O-CHECKOUT-REFUND-AUTHORIZATION-CANONICAL-ROLE-CONTRACT-V1` 계약 유지).

### 3-4. L6 — 410 뒤에 남아 있던 dead payment body 제거

`WO-O4O-STORE-SALE-CHECKOUT-ROUTE-DEPRECATION-V1` 이 410 을 세워 두고 그 아래
PaymentCore/Toss 로직을 `// eslint-disable-next-line no-unreachable` 로 통째로 보존하고 있었다.
도달 불가능한 producer 이므로 제거하고, 세 파일을 410 stub 으로 축소했다.

| 파일 | 이전 | 이후 |
|---|---|---|
| `glycopharm-payment.controller.ts` | 344 줄 | 51 줄 |
| `cosmetics-payment.controller.ts` | 350 줄 | 51 줄 |
| `kpa-payment.controller.ts` | 329 줄 | 51 줄 |

`GET /payments/order/:orderId` (Toss widget 렌더링용 결제정보 조회)도 함께 410 으로 은퇴했다.
prepare/confirm 이 없으면 결제창을 띄울 대상이 없고, **프론트엔드 호출자가 repo 전수 0건**이다.

**보존**: `pharmacy-hub` B2B 결제 · `neture` B2B 결제 — 유일한 실제 호출자이며 매장이 구매자다.

```text
services/web-pharmacy-hub/src/lib/api/pharmacyHubOrders.ts:251  POST {BASE}/payments/prepare
services/web-neture/src/lib/api/netureB2bPayments.ts:38         POST /neture/b2b/payments/prepare
```

### 3-5. B2C 채널 신규 생성 차단을 전 서비스로 확대

`routes/o4o-store/controllers/store-hub.controller.ts` `POST /channels`:

```diff
- if (serviceKey === 'kpa' && channelType === 'B2C') {
+ if (channelType === 'B2C') {
```

`STORE_B2C_CHANNEL_RETIRED` (410). KIOSK / TABLET / SIGNAGE 는 **정보 제공 수단**이므로 무영향(boundary §4).
기존 B2C row 는 역사 데이터로 보존한다.

---

## 4. 단계 4 — 프론트엔드 UI / API / route 제거

### 4-1. GlycoPharm (`services/web-glycopharm`)

| 대상 | 조치 |
|---|---|
| `src/pages/store/StoreCart.tsx` | **삭제** |
| `App.tsx` `store/:pharmacyId/cart` · `/kiosk/cart` · `/tablet/cart` | 라우트 3개 제거 |
| `src/api/store.ts` Cart API 5종 · 소비자 Order API 4종 | 제거 (백엔드 부재 → 이미 404 DEAD, §2-3) |
| `StoreProductDetail.tsx` 장바구니/바로구매 버튼 | 제거 → "구매는 매장에서 안내받으실 수 있습니다." |
| `KioskLayout` · `StoreLayout` · `TabletLayout` 장바구니 NavLink | 제거 |

**보존**: `StoreCartPage` (B2B 이벤트 오퍼 장바구니) — 매장이 구매자.

### 4-2. KPA (`services/web-kpa-society`)

| 대상 | 조치 |
|---|---|
| `OnlineSalesOrdersPage.tsx` · `OnlineSalesOrderDetailPage.tsx` | **삭제** (seller 축) |
| `online-sales/orders`, `online-sales/orders/:orderId` | `OnlineSalesOrdersRetiredPage` 로 교체 |
| `api/checkout.ts` `createOrder` · `getStoreOrders` · `getStoreOrderKpi` · `getStoreOrderDetail` · `updateStoreOrderStatus` | 제거 |
| `StoreOrderWorktablePage.tsx` 주문 실행 leg | 제거 → canonical B2B 장바구니(`/store-hub/cart`) 안내 |
| `StoreOrdersPage.tsx` 설명 문구 | "온라인 판매 > 주문 관리" 참조 제거 |

**보존**: `StoreOrdersPage`(buyer 발주 내역) · `StoreCartPage`(B2B 장바구니) ·
`StorefrontProductDetailPage`(QR 제품 랜딩, 정보 제공) · `sales-channels/*`(외부 판매채널 연동).

### 4-3. K-Cosmetics (`services/web-k-cosmetics`) — 제거 대상 없음

프론트엔드는 `GET /cosmetics/orders`(buyerId 스코프) 와 operator 주문 조회만 호출한다.
소비자 commerce producer 호출자 **0건**. 변경하지 않았다.

---

## 5. 단계 5 — 보호 대상 회귀 확인 (B2B / POS / 외부채널)

| 축 | 확인 |
|---|---|
| `buyerId` 기준 주문 조회·취소 (KPA·Cosmetics·GlycoPharm) | 코드·라우트 무변경 |
| `store_cart` + `EventOfferCartCheckoutService` (B2B 장바구니) | 무변경 |
| Pharmacy-Hub store-owner cart/orders/payments (L4) | 무변경 |
| Neture B2B payment | 무변경 |
| 외부 판매채널 연동 (`store-external-sales.controller.ts`, `sales-channels/*`) | 무변경 |
| KIOSK / TABLET / SIGNAGE (정보 제공) | 무변경 |

---

## 6. 단계 6 — 검증

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` api-server | **통과** (0 error) |
| `tsc --noEmit` web-kpa-society | **통과** |
| `tsc --noEmit` web-glycopharm | **통과** |
| `eslint` 변경 파일 전수 | **통과** (0 error, 0 warning) |
| `pnpm --filter @o4o/api-server build` | **성공** |
| `pnpm --filter @o4o/web-kpa-society build` | **성공** |
| `pnpm --filter glycopharm-web build` | **성공** |
| api-server jest 전수 | **3097/3098 passed** — 유일한 실패 2건은 `cwd` 의존 테스트(`content-guard`)이며 `apps/api-server` 에서 재실행 시 **170/170 통과**. 본 WO 무관 |

### 6-1. 테스트 수정

`__tests__/checkout-refund-authorization-canonical-role.spec.ts` 의
"KPA 매장 주문 상태 변경(취소/환불)은 membership+role+매장 소유권을 함께 요구한다" 는
`/checkout/store-orders/:orderId/status` 를 검증했다. 그 경로가 은퇴했으므로
**"판매자 축이 다시 살아나지 않는다" + "주문 생성이 410 이다"** 두 개의 회귀 테스트로 교체했다.
나머지 20개 환불 권한 계약 테스트는 그대로 통과한다.

---

## 7. Production smoke — 배포 전 baseline (읽기 전용)

`https://api.neture.co.kr` 은 healthy(`/api/health` → 200). **본 변경은 아직 배포되지 않았다.**
따라서 은퇴 경로의 410 확인은 배포 이후에만 가능하다 → `NO_POST_DEPLOY_SMOKE`.

배포 전 baseline (인증 없는 GET 만, 쓰기·결제·환불 호출 **없음**):

```text
/api/health                                 200
/api/v1/kpa/checkout/orders                 401   (보호 대상 — 살아 있음)
/api/v1/cosmetics/orders                    401   (보호 대상 — 살아 있음)
/api/v1/pharmacy-hub/store-owner/orders     401   (보호 대상 — 살아 있음)
/api/checkout/orders                        401   (보호 대상 — 살아 있음)
```

> 실제 금전 환불 / PG 호출 / production write 는 수행하지 않았다.
> production DB read census 도 자격증명이 없어 수행하지 않았다 → `NO_PRODUCTION_DB_CENSUS`.
> 기존 B2C 주문 row 수 등 **실측 수치는 본 CHECK 에 기재하지 않는다.**

---

## 8. DEFERRED — 이번 작업에서 하지 않은 것

| # | 항목 | 사유 |
|---|---|---|
| ~~D-1~~ | ~~`storeMenuConfig.ts` 의 `온라인 판매 > 주문 관리` 메뉴 행 제거~~ | **마감 (§10-3)** — 다른 세션 WIP 해소 후 `ccee613cd` 로 제거. 배포 번들에서 `online-sales-orders` 0건 확인 |
| D-2 | `온라인 판매 > 판매 설정 / 판매 상품`(`StoreChannelsPage`, B2C 채널 진열) | 신규 B2C 채널 **생성**은 §3-5 로 전 서비스 차단했다. 기존 채널의 조회·진열 경로는 직전 WO 가 "역사 데이터로 보존" 하기로 한 계약이고, 진열은 거래 경로가 아니다. 별도 WO 로 판정할 항목 |
| D-3 | 주문 작업대 → canonical B2B 장바구니 담기 이관 | 작업대의 발주 의도(B2B)는 보호 대상이지만, 실행 leg 이 legacy B2C 엔드포인트에 얹혀 있었다. `store_cart` 로의 담기 매핑은 신규 기능 설계이므로 본 WO 범위 밖 |
| ~~D-4~~ | ~~은퇴 경로 410 production 확인~~ | **마감 (§10-5)** — 배포 후 실측. 3개 소비자 주문 경로 모두 live 410 `STORE_CONSUMER_ORDER_RETIRED` |

---

## 9. 역추론 금지 준수 확인

본 작업에서 코드의 존재를 사업 근거로 삼지 않았다. 반대 방향의 판정도 실제로 발생했다.

- **L4**: WO 사전 라벨이 `LEGACY 후보` 였으나, 코드 증거상 매장이 **구매자**인 B2B 였다 → 보호로 반전.
- **L5**: `platform-seller` 코드가 존재했으나 사업 계약이 `NONE` 이므로 **코드를 계약에 맞춰 제거**했다.
- **주문 작업대**: B2B 의도이지만 실행이 B2C 채널 게이트에 의존하고 있었다 →
  의도는 보호하고 legacy 배관만 잘라낸 뒤 이관을 DEFERRED 로 남겼다.

---

## 10. 종료 절차 (WO-O4O-STORE-CONSUMER-COMMERCE-RETIREMENT-MAIN-INTEGRATION-AND-CLOSURE-V1)

### 10-1. WIP 안전 확인 · main 통합

작업 시작 시점 working tree 는 완전히 clean 했고 `main...origin/main` 은 `fb49dabf2` 로 동기 상태였다.
직전 WO 의 작업 커밋 `6098fb7de` 는 **다른 세션이 이미 main 으로 rebase** 해 `8b31e2ce4` 로 들어가 있었다.
손실·중복 적용이 없음을 `git patch-id --stable` 로 검증했다.

```text
6098fb7de → 6daa91eb68c59546e99fb3917769828474f2d767
8b31e2ce4 → 6daa91eb68c59546e99fb3917769828474f2d767   # IDENTICAL PATCH, --stat 동일
```

> `restore / stash / reset / checkout -- <file> / 강제 rebase / 다른 세션 파일 수정` 은 수행하지 않았다.

### 10-2. Upstream 회귀검증

`apps/api-server` cwd 에서 전체 jest 실행 — **Test Suites 193/193 passed, Tests 3214/3214 passed** (exit 0).

### 10-3. D-1 — 메뉴 SSOT 판정 및 마감 (`ccee613cd`)

**이름이 아니라 기능으로 판정했다.** 저장소에는 '주문 관리' 라벨이 4곳 이상 존재한다.

| 메뉴 키 | 경로 | 축 | 판정 | 조치 |
|---|---|---|---|---|
| `online-sales-orders` (KPA) | `/online-sales/orders` | `checkout_orders` 를 `sellerOrganizationId` 로 조회 = **매장이 소비자에게 판매한 주문** | `LEGACY_STORE_COMMERCE` | **제거** |
| `orders` (ALL_STORE_MENUS) | `/orders` | 매장 = 구매자 | `B2B_ACTIVE_CANONICAL` | 유지 |
| `orders` (K-Cosmetics) | `/commerce/orders` | 매장 = 구매자 | `B2B_ACTIVE_CANONICAL` | 유지 |
| `orders` (GlycoPharm) | `/commerce/orders` | 매장 = 구매자 | `B2B_ACTIVE_CANONICAL` | 유지 |
| `orders` (KPA, '발주 내역') | `/commerce/orders` | 매장 = 구매자 | `B2B_ACTIVE_CANONICAL` | 유지 (라벨만 정비 완료) |

제거 근거: 해당 행의 원본 주석 자체가 "판매(seller) 주문 관리" 라고 적고 있었고,
백엔드 `GET|PATCH /kpa/checkout/store-orders*` 는 `8b31e2ce4` 에서 이미 제거되었다.
제거 자리에는 **canonical 4행을 지우지 말라는 ⚠️ 경고 주석**을 남겼다.

문서 정합: `packages/shared-space-ui/src/guide/copy/kpa.ts` 의
`주문 관리 → /store/commerce/order-worktable — 주문 상태·배송` 안내는 작업대의 주문 실행 leg 은퇴 이후
사실과 달랐다 → `발주 내역 → /store/commerce/orders` 로 정정.

검증: `@o4o/web-kpa-society` · `@o4o/web-k-cosmetics` · `glycopharm-web` · `pharmacy-hub-web`
4개 서비스 build(tsc + vite) PASS, eslint PASS.

### 10-4. 배포

`8b31e2ce4` (백엔드 은퇴 본체) 는 이미 2026-08-25 10:08 푸시에서 배포 성공한 상태였다
(Deploy API `32835719671`, Deploy Web `32835719587`, 모두 `success`).

`ccee613cd` (D-1) 배포 — 2026-08-26 00:38 push, 전 건 `success`:

| workflow | run | 결과 | revision |
|---|---|---|---|
| Deploy API Server (Cloud Run) | `32915904018` | success (7m47s) | `o4o-core-api-03463-bc4` |
| Deploy Web Services (Cloud Run) | `32915904054` | success (3m33s) | `kpa-society-web-01890-d65` · `glycopharm-web-01318-rph` · `k-cosmetics-web-01062-q79` · `pharmacy-hub-web-00146-knf` · `neture-web-01515-8p8` · `kpa-branch-web-00062-tcr` |
| Deploy Admin Dashboard (Cloud Run) | `32915904002` | success (3m13s) | — |
| CodeQL Security Analysis | `32915904040` | success (3m56s) | — |

### 10-5. D-4 — Production smoke (배포 후 실측)

> 안전한 GET / 410 / 404 / guard 확인만 수행했다.
> **`실제 PG 결제 / 실제 PG 환불 / 실사용 소비자 주문 생성 / 실사용 주문 상태 변경` 은 수행하지 않았다.**
> production DB read census 도 자격증명이 없어 수행하지 않았다 → `NO_PRODUCTION_DB_CENSUS` 유지.

**은퇴 경로 — 410 (실측)**

```text
POST /api/v1/glycopharm/checkout          410  STORE_CONSUMER_ORDER_RETIRED
POST /api/v1/cosmetics/orders             410  STORE_CONSUMER_ORDER_RETIRED
POST /api/v1/kpa/checkout                 410  STORE_CONSUMER_ORDER_RETIRED
POST /api/v1/glycopharm/payments/prepare  410  STORE_SALE_PAYMENT_DEPRECATED
POST /api/v1/cosmetics/payments/prepare   410  STORE_SALE_PAYMENT_DEPRECATED
POST /api/v1/kpa/payments/prepare         410  STORE_SALE_PAYMENT_DEPRECATED
```

**삭제된 route — canonical 404 (410 아님)**

라우트를 통째로 지운 경로는 410 이 아니라 Express 기본 404 로 응답한다. 의도된 결과다.
410 은 "계약상 은퇴" 를 알려야 하는 **producer 엔드포인트**에만 부여했고,
seller 축 조회/변경 API 와 플랫폼 직접판매 producer 는 계약 자체가 존재하지 않으므로 404 가 정확하다.

```text
GET  /api/v1/kpa/checkout/store-orders        404  Cannot GET
GET  /api/v1/kpa/checkout/store-orders/kpi    404  Cannot GET
GET  /api/v1/kpa/checkout/store-orders/:id    404  Cannot GET
POST /api/checkout/initiate                   404  Cannot POST
POST /api/checkout/confirm                    404  Cannot POST
```

**보호 대상 회귀 — 5xx / white screen / dead menu / unexpected 404 없음**

```text
GET /api/v1/pharmacy-hub/service-info                 200  (정보 제공)
GET /api/v1/pharmacy-hub/store-owner/cart             401  AUTH_REQUIRED  (매장 구매 B2B)
GET /api/v1/pharmacy-hub/store-owner/orders           401  AUTH_REQUIRED  (공급자→매장 발주)
GET /api/v1/pharmacy-hub/store-owner/handled-products 401  AUTH_REQUIRED  (상품 공급 신청)
GET /api/v1/kpa/checkout/orders                       401  AUTH_REQUIRED  (buyer 축 발주 내역)
GET /api/v1/kpa/store-hub/channels                    401  AUTH_REQUIRED  (외부 판매채널)
```

`과거 order / checkout 이름이 섞여 있다는 이유로 B2B 기능까지 차단된 사례는 없었다.`
PharmacyHub 의 `store-owner/cart · orders · payments/prepare · payments/confirm` 은 전부 살아 있다.

프론트엔드:

```text
https://kpa-society.co.kr/                          200
https://kpa-society.co.kr/store/online-sales/orders 200  (은퇴 안내 화면)
https://kpa-society.co.kr/store/commerce/orders     200  (canonical 발주 내역)
https://glycopharm.co.kr/                           200
https://k-cosmetics.site/                           200
https://pharmacyhub.co.kr/                          200
```

배포된 KPA 번들(`index-DZ8wG3TF.js`, `vendor-o4o-COt1mqU8.js`)에서
`online-sales-orders` 메뉴 키 **0건** — D-1 이 production 에 반영되었음을 확인했다.

### 10-6. DEFERRED 최종 상태

`DEFERRED = 2` (모두 **의도적** 잔여, 별도 WO 대상).

| # | 상태 |
|---|---|
| D-1 | ✅ 마감 (§10-3) |
| D-2 | ⏸ 유지 — `온라인 판매 > 판매 설정 / 판매 상품`. 신규 B2C 채널 **생성**은 이미 전 서비스 차단(§3-5). 기존 채널 조회·진열은 직전 WO 의 "역사 데이터 보존" 계약이며 거래 경로가 아니다 |
| D-3 | ⏸ 유지 — 주문 작업대 → canonical `store_cart` 담기 이관. legacy 배관은 잘라냈고, 신규 매핑 설계는 본 트랙 범위 밖 |
| D-4 | ✅ 마감 (§10-5) |

### 10-7. 문서 정합

- `O4O-STORE-COMMERCE-BOUNDARY-V1` §2 (매장 경영자는 소비자에게 판매하지 않는다 / 매장 판매·결제는 POS / 외부 판매채널이 실제 판매 주체) — 본 종료 결과와 **일치**. 수정 불필요.
- `O4O-RETAIL-STABLE-V1` · `CHECKOUT-STABLE-DECLARATION-V1` — FROZEN 문서의 역사적 기술 계약은 **수정하지 않았다.**
- 실제로 사실과 어긋나 고친 문서는 `shared-space-ui/guide/copy/kpa.ts` 안내 문구 1건뿐이다 (§10-3).

