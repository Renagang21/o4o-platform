# CHECK-O4O-STORE-HUB-EVENT-OFFER-ORDER-VISIBILITY-AND-CANCELLATION-V1

> **WO**: WO-O4O-STORE-HUB-EVENT-OFFER-ORDER-VISIBILITY-AND-CANCELLATION-V1
> **작업일**: 2026-08-14 · **worktree**: `D:\o4o-event-offer-order` · **branch**: `work/store-hub-event-offer-order-visibility-v1`
> **main 병합·프로덕션 배포 완료** (사용자 승인)
> **선행**: `CHECK-O4O-STORE-HUB-PRODUCTION-E2E-DATA-ENROLLMENT-AND-CLOSURE-V1` §6 R2

---

## 1. 문제 확정 (조사)

### 1-1. 주문 생성 경로

```
Store Hub 장바구니
  POST /api/v1/store/cart/:serviceKey/checkout-confirm
    → EventOfferCartCheckoutService.confirm()
        1) reserveEventOfferListing (그룹 1트랜잭션, total_quantity 원자 차감)
        2) checkoutService.createOrder(...)   ← CLAUDE.md §4 준수
        3) 매장 자동 진열 · cart 정리
```

생성 시 기록되는 값 (`event-offer-cart-checkout.service.ts`):

```ts
metadata: {
  source: 'store_cart_checkout',
  serviceKey: eventServiceKey,     // ← kpa-groupbuy / glycopharm-event-offer / k-cosmetics-event-offer
  sourceTypes: ['event_offer'],
  ...
}
```

`eventServiceKey` 는 `CART_TO_EVENT_OFFER_SERVICE_KEY` 매핑 결과로, **플랫폼 키가 아니라 event-offer(OPL) 키**다.

### 1-2. 누락 원인 (3지점)

구매자 주문 목록/상세는 **retail 축 키만** 필터하고 있었다.

| 서비스 | 파일 | 기존 필터 | 지점 |
|---|---|---|---:|
| KPA | `routes/kpa/controllers/kpa-checkout.controller.ts` | `metadata->>'serviceKey' IN ('kpa-society','kpa')` | 3 |
| GlycoPharm | `routes/glycopharm/controllers/checkout.controller.ts` | `= 'glycopharm'` | 2 |
| K-Cosmetics | `routes/cosmetics/controllers/cosmetics-order.controller.ts` | `= 'cosmetics'` | 2 |

→ 이벤트 오퍼 주문은 어느 서비스에서도 목록에 잡히지 않고, 단건 조회도 404 `ORDER_NOT_FOUND`.
`/checkout/store-orders` 는 **매장이 판매자**인 축(`sellerOrganizationId`)이라 역시 무관.

### 1-3. 취소 경로 부재

KPA·GlycoPharm·K-Cosmetics 의 checkout 컨트롤러에 **취소 route 자체가 없었다.**
결제 전 취소는 Pharmacy-Hub 에만 존재
(`POST /pharmacy-hub/store-owner/orders/:orderId/cancel` → `PharmacyHubPaymentController.cancelBeforePayment`).

### 1-4. 프로덕션 실측 (read-only, Cloud SQL Auth Proxy)

| service_key | 건수 | status | paymentStatus |
|---|---:|---|---|
| `kpa-groupbuy` | 3 | created | pending |
| `glycopharm-event-offer` | 2 | created | pending |
| `k-cosmetics-event-offer` | 2 | created | pending |
| **합계** | **7** | | |

선행 CHECK 가 404 로 지목한 `ORD-20260814-4428` 포함. 전부 결제 전 상태(취소 가능).

---

## 2. 수정 (backend 의미 보존)

### 2-1. 방향 — 쓰기 불변, 읽기 범위만 확장

`metadata.serviceKey='kpa-groupbuy'` 는 **그 주문이 어느 OPL 도메인에서 왔는지**를 나타내는
유의미한 기록이다(`service_keys` 실재 키, `organization_product_listings.service_key` 와 동일 축).

따라서 생성 경로를 바꾸지 않았다.

- 쓰기를 바꿨다면 **기존 7건은 그대로 안 보였을 것**이고 데이터 보정이 별도로 필요했다.
- 읽기 범위만 넓히면 **기존 주문도 즉시 조회**되고 출처 정보가 보존된다.

### 2-2. 신설 파일

| 파일 | 역할 |
|---|---|
| `constants/buyer-order-service-scope.ts` | `getBuyerOrderServiceKeys(platformKey)` = retail 키 + event-offer 키. 각 컨트롤러에 흩어져 있던 리터럴 배열의 **단일 정의** |
| `services/checkout/store-order-cancel.service.ts` | 결제 전 단건 취소 + 이벤트 오퍼 예약 재고 복원 |

### 2-3. 변경 파일

3개 컨트롤러의 필터를 `getBuyerOrderServiceKeys(...)` 로 교체(7지점)하고 취소 route 를 추가했다.

```text
POST /api/v1/kpa/checkout/orders/:orderId/cancel
POST /api/v1/glycopharm/checkout/orders/:orderId/cancel
POST /api/v1/cosmetics/orders/:id/cancel
```

K-Cosmetics 는 raw SQL 이라 키 집합도 **parameter binding**(`= ANY($n::text[])`)으로 전달했다
(F6 Boundary Guard: string interpolation 금지). 후속 필터가 `$${params.length}` 동적 인덱싱이라
파라미터 1개 추가가 안전함을 확인했다.

### 2-4. 취소 계약 (Pharmacy-Hub 와 동일 의미)

- 결제 전 단건 취소만. 결제 상태를 직접 조작하지 않는다.
- 이미 취소된 주문은 **멱등 성공**(`alreadyCancelled: true`).
- 결제 완료 주문은 409 `ALREADY_PAID`.
- 취소 가능 상태는 `created` · `pending_payment` 뿐(그 외 409).
- **DB 직접 삭제 없음** — row 는 남고 `status` 만 `cancelled` 로 전이, `metadata` 는 merge.

### 2-5. 재고 복원 정확성 (중요)

이벤트 오퍼 주문은 생성 시 재고를 차감하므로 취소 시 되돌리지 않으면 재고가 영구 소실된다.
canonical 보상 경로(`EventOfferService.incrementListingQuantity`)를 재사용했다.

다만 `reserveEventOfferListing` 은 **`total_quantity IS NOT NULL` 인 listing 만 차감**한다
(무제한 listing 은 `decrementedQty: 0`). 그래서 복원도 같은 조건에서만 수행하도록 가드를 넣었다.

```sql
SELECT id FROM organization_product_listings
 WHERE id = ANY($1::uuid[]) AND total_quantity IS NOT NULL
```

가드가 없었다면 무제한 listing(KPA 대상)에 대해 `NULL + 1 = NULL` 이라 값은 안 깨지지만
**복원했다고 허위 보고**하게 된다. 실측에서 KPA listing 이 정확히 그 케이스였다.

---

## 3. 검증 — 타입/빌드

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` — **변경 파일 오류** | **0** |
| worktree 전체 오류 | 204 |
| clean HEAD 베이스라인 오류 | 204 |
| **오류 집합 diff (baseline vs 변경본)** | **완전 동일 (신규 0)** |

204건은 미빌드 패키지(`security-core` · `market-trial` · `action-log-core` · `payment-core` · `forum-core`)
TS2307 등 **기존 환경 이슈**이며 `git stash` 대조로 본 변경과 무관함을 증명했다.

> `strictNullChecks: false` 환경이라 판별 union 자동 narrowing 이 동작하지 않는다.
> `isCancelStoreOrderFailure()` type predicate 를 두어 호출부가 안전하게 좁히도록 했다.

---

## 4. 배포

| 차수 | commit | 리비전 | 결과 |
|---|---|---|---|
| 1차 | `f004f5df2` | `o4o-core-api-03329-chs` | Deploy API Server ✅ |
| 2차 | `ce06f557f` | `o4o-core-api-03330-9c8` | Deploy API Server ✅ |

### 4-1. 2차 배포 사유 — 1차 배포 후 발견한 결함

1차 배포 직후 프로덕션 실측에서 **K-Cosmetics 취소만 404 (`Cannot POST`)** 였다.

원인: cosmetics order router 는 `router.use('/orders', orderController)` 로 mount 되어
내부 경로가 상대경로다(목록 `'/'` · 상세 `'/:id'`). 취소를 `'/orders/:id/cancel'` 로 적어
최종 경로가 `/api/v1/cosmetics/orders/**orders**/:id/cancel` 로 중복됐다.

`'/:id/cancel'` 로 교정. KPA·GP 는 `router.use('/checkout', ...)` mount 라
`'/orders/:orderId/cancel'` 이 올바르며 1차 배포에서 이미 취소 200 으로 확인됐다.

---

## 5. 검증 — 프로덕션 API 실측

로그인: `renagang21@gmail.com` (주문 소유자, L1) · 배포 후 실행.

### 5-1. 조회 복구

| 서비스 | endpoint | 결과 |
|---|---|---|
| KPA | `GET /kpa/checkout/orders` | **200 · 3건** (`ORD-…-4428` · `7338` · `6987`) |
| GlycoPharm | `GET /glycopharm/checkout/orders` | **200 · 2건** (`8038` · `4939`) |
| K-Cosmetics | `GET /cosmetics/orders` | **200 · 2건** (`0552` · `2002`) |
| KPA 단건 | `GET /kpa/checkout/orders/:id` (`ORD-…-4428`) | **200** (이전 404) |

**7/7 복구.** 선행 CHECK 가 404 로 지목한 주문 포함.

### 5-2. 취소 + 재고 복원

| 주문 | 서비스 | http | releasedListings |
|---|---|---:|---|
| `ORD-20260814-4428` | KPA | 200 | `[]` (무제한 listing) |
| `ORD-20260814-7338` | KPA | 200 | `[]` |
| `ORD-20260814-6987` | KPA | 200 | `[]` |
| `ORD-20260814-4939` | GP | 200 | `[{e627c1eb…, 1}]` |
| `ORD-20260814-8038` | GP | 200 | `[{e627c1eb…, 1}]` |
| `ORD-20260814-0552` | KCos | 200 | `[{ec4f4b1a…, 1}]` |
| `ORD-20260814-2002` | KCos | 200 | `[{ec4f4b1a…, 1}]` |

재고 실측 (read-only):

| listing | 취소 전 | 취소 후 |
|---|---:|---:|
| `e627c1eb…` (glycopharm-event-offer) | 98 | **100** |
| `ec4f4b1a…` (k-cosmetics-event-offer) | 98 | **100** |
| `02003281…` (kpa-groupbuy) | NULL(무제한) | **NULL** (정상 미변경) |

### 5-3. 멱등성

`ORD-20260814-4939` 를 **두 번** 취소 → 2회차 `alreadyCancelled: true`, `releasedListings: []`.
재고는 99 에서 더 오르지 않았다 → **중복 복원 없음** 증명.

---

## 6. 검증 — 브라우저 (desktop + mobile)

프로덕션 Cloud Run 웹. 로그인은 §8-1 참조.

### 6-1. 전체 흐름 1회 (KPA · desktop)

```text
/store-hub/event-offers  → "담기" 클릭 → "…장바구니에 담았습니다." ✅
/store-hub/cart          → "주문 확정" 클릭 → 주문 생성 ✅
/store/commerce/orders   → 신규 ORD-20260814-2709 즉시 노출 ✅  ← 본 결함의 핵심
취소                      → http 200 · ok=true ✅
```

**신규 생성된 이벤트 오퍼 주문이 목록에 바로 보인다** — 이것이 R2 결함의 직접적 해소 증거다.
JS 예외 0.

### 6-2. 주문 목록 가시성 (3서비스 × desktop/mobile)

`/store/commerce/orders`:

| 서비스 | viewport | 노출 주문 | JS 예외 | 404 | overflow |
|---|---|---|---:|---|---|
| KPA | desktop / mobile | `4428` · `7338` · `6987` | 0 | 없음 | 없음 |
| GlycoPharm | desktop / mobile | `8038` · `4939` | 0 | 없음 | 없음 |
| K-Cosmetics | desktop / mobile | `0552` · `2002` | 0 | 없음 | 없음 |

**7/7 이 매장측 주문 목록 UI 에 "취소" 상태로 렌더**된다.

### 6-3. 경로 정정 기록

처음에 `/store-hub/orders` 로 검증했으나 **3서비스 모두 404**(존재하지 않는 route)였다.
구매자 주문 목록 canonical 경로는 `/store/commerce/orders` 다
(KPA `StoreOrdersPage` · GP `PharmacyOrders` · KCos `StoreOrdersPage`, 모두 `/checkout/orders` 소비).
`/store-hub/orders` 는 원래 없던 경로이며 본 WO 가 만든 결함이 아니다.

### 6-4. 이벤트오퍼 · 장바구니 화면 회귀

`/store-hub/event-offers` · `/store-hub/cart` — 3서비스 × desktop/mobile 총 12조합
JS 예외 0 · white screen 0 · dead link 0.

---

## 7. 테스트 주문 정리 결과

| 구분 | 건수 | 결과 |
|---|---:|---|
| 선행 WO 잔여 E2E 주문 | 7 | **전량 정상 취소 경로로 취소** |
| 본 WO 흐름 검증 중 생성 | 1 (`ORD-20260814-2709`) | **취소 완료** |
| **합계** | **8** | `status='cancelled'` · `cancelledBy='buyer'` |

- **DB 직접 삭제 0건.** 주문 row 는 모두 보존되고 상태만 전이했다.
- 차감됐던 재고는 전부 복원됐다(§5-2).
- 취소 사유에 `[E2E_TEST]` 와 WO 명을 남겨 추적 가능하다.

---

## 8. 미검증 · 한계 (숨기지 않음)

### 8-1. 로그인 E2E 미검증

`docs/local/TEST-ACCOUNTS.local.md` §2 기준 **4서비스 전부 L2 service credential 이 unknown** 이라
웹 로그인 폼 자체는 검증하지 못했다. 같은 문서 §4-2 가 허용한 **L1 토큰 주입 우회**로 UI 를 검증했다.

> 토큰 주입은 로그인 성공이 아니다. **로그인 E2E 는 이번에도 미검증**이다.
> 단, API 실측(§5)은 `POST /auth/login` 200 으로 받은 실제 토큰을 사용했다.

### 8-2. 결제 이후 경로 미검증

본 WO 는 **결제 전 취소**만 다룬다. 결제 완료 주문의 취소·환불(그룹 단위)은 범위 밖이며
`ALREADY_PAID` 409 로 차단됨만 코드상 보장했다(실제 결제 주문으로 실행하지는 않았다).

### 8-3. 공급자측 취소 route

선행 CHECK 가 지적한 `/neture/supplier/orders` 취소 route 부재는 **공급자 축**이라 본 WO(매장측) 범위 밖이다.
매장측 결제 전 취소가 생겼으므로 시급도는 낮아졌으나 여전히 미해소다.

---

## 9. 보존 확인 (WO §금지)

| 금지 항목 | 결과 |
|---|---|
| API/DB 계약 변경으로 UI 억지 맞추기 | **없음** — 생성 경로·payload·`metadata.serviceKey` 기록 불변 |
| 서비스별 업무 의미 제거 | **없음** — OPL 도메인 출처 정보 보존 |
| 기존 주문 모델 이탈 | **없음** — `checkout_orders` 단일 원장, `checkoutService.createOrder` 경로 불변(CLAUDE.md §4) |
| DB 직접 삭제 | **0건** |
| 신규 기능 추가 | 없음 (취소는 기존 Pharmacy-Hub 계약의 3서비스 확장) |
| URL·권한 변경 | 조회 경로 불변. 취소 route 만 신설(기존 `requireAuth` + buyerId 스코프 유지) |

---

## 10. Git

```text
branch : work/store-hub-event-offer-order-visibility-v1
commits: f0b7ef0a7 (fix) · 1703931d3 (KCos route 교정)
main   : f004f5df2 (1차 merge) · ce06f557f (2차 merge) — 배포 완료
```

---

## 11. 문서 정합

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
```

- **발견 1건**: 선행 CHECK 의 별도 WO 제안명은 `WO-…-EVENT-OFFER-ORDER-BUYER-VISIBILITY-V1` 이었으나
  실제 수행 WO 명은 `WO-…-EVENT-OFFER-ORDER-VISIBILITY-AND-CANCELLATION-V1`(취소 포함)이다.
  선행 문서는 과거 시점 기록물이므로 수정하지 않고 본 CHECK 에 대응 관계만 남긴다.

별도 WO 제안:

1. `WO-O4O-NETURE-SUPPLIER-ORDER-CANCEL-ROUTE-V1` — §8-3 공급자측 취소 경로
2. `WO-O4O-PHARMACY-HUB-SERVICE-LEGAL-SCOPE-ONBOARDING-V1` — 선행 CHECK R1(footer-legal 404), 본 WO 다음 순번

---

## 12. 결론

R2 (이벤트 오퍼 주문의 매장측 조회 누락 + 취소 경로 부재) **해소 완료**.

- 조회: 3서비스 7지점 필터를 canonical 집합으로 확장 → 기존 7건 즉시 복구(실측 200)
- 취소: 3서비스에 결제 전 취소 route 신설 + 예약 재고 정확 복원(멱등)
- 브라우저: 전체 흐름 1회 + 3서비스 × desktop/mobile 목록 가시성 — JS 예외 0
- 테스트 주문 8건 정상 경로 취소 · DB 직접 삭제 0

**미검증은 §8** (로그인 E2E · 결제 후 취소 · 공급자측 취소 route).
