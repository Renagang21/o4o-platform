# CHECK-PHARMACY-HUB-B2B-CART-AND-BUYER-ORDER-V1

> WO: `WO-PHARMACY-HUB-B2B-CART-AND-ORDER-V1` → **Phase 1 분리 후 `...-BUYER-ORDER-V1`**
> 작업일: 2026-08-01 · 브랜치: `main` · 작업 전 HEAD `349a338a7`

---

## 1. 조사 결과 (구현 전 보고 → 승인 후 진행)

### 1-1. 재사용 가능 — 변경 0

| 자산 | 상태 |
|------|------|
| `store_cart_items` | **buyerId + serviceKey 경계** · `supplierProductOfferId`·`supplierId`·`productMasterId`·`priceSnapshot` 보유 → 스키마 변경 0 |
| `StoreCartService` | add/update/remove/list/clear/groupBySupplier — 저장 계층 그대로 재사용 |
| `/api/v1/store/cart/:serviceKey/*` | 이미 서비스 파라미터화 (`getAllServiceKeys()`). **라이브 실측: pharmacy-hub 200**, 잘못된 키 400 |
| `checkoutService.createOrder()` | E-commerce Core 단일 진입점 (CLAUDE.md §4). `metadata` 로 serviceKey 저장 |
| 주문 축 규약 | `OrderType` + **`metadata.serviceKey`** — KPA·GlycoPharm·Cosmetics 공통. **신규 OrderType 불필요** |

→ **신규 주문/장바구니 테이블 0.** CLAUDE.md §4 금지 테이블(`*_orders`)을 만들지 않았다.

### 1-2. `NetureB2BCartCheckoutService` 를 그대로 재사용할 수 없는 이유

구조(공급자별 분리·서버 가격 재계산)는 동일하지만 **게이트 의미가 다르다**.

| # | 불일치 | 영향 |
|---|--------|------|
| 1 | 하드 가드 `scope.serviceKey !== NETURE` → throw | pharmacy-hub 호출 자체 거부 |
| 2 | `metadata.serviceKey = NETURE` 하드코딩 | 주문이 neture 로 기록 |
| 3 | `approval_status !== 'APPROVED'` → 실패 | **Pharmacy-Hub 상품은 상품별 운영자 승인이 없어 PENDING 이 정상**(승인대상 3키 파생값). 담기는 되고 주문에서 전량 실패 |
| 4 | `service_keys` 게이트 부재 | 미제공 상품도 주문 가능 → 서비스 격리 구멍 |
| 5 | `distribution_type='SERVICE' && !organizationId` → 실패 | Pharmacy-Hub 는 조직 격리 서비스가 아니라 store_owner 에게 organizationId 가 없을 수 있음 |

1·2 는 파라미터화로 풀리지만 **3·4·5 는 계약 자체가 다르다** → 사용자 결정으로 **전용 서비스 신설**.

### 1-3. Phase 2 로 분리한 구조적 블로커 2건

**A. 결제 없는 공급자 노출이 canonical flow 와 충돌**
기존 절대 기준은 payment-first — "결제 완료 전 공급자 미노출", `collectionStatus`(후불/인보이스/수금확인) 모델은 폐기됨.
이번 WO 는 결제를 제외하면서 공급자 노출을 요구 → 두 전제가 충돌. **사업 정책 결정 사항**.

**B. fulfillment bridge 미구현**
공급자 처리(상태 전이·shipment)는 `neture_orders` 축, 주문 생성은 `checkout_orders` 축인데 bridge 가 없다
("현재 bridge 가 아직 없어 checkout-origin neture_order 는 존재하지 않을 수 있다", 후속 P2b/P2c).
Neture 자신도 미완이라, 구현하면 기존 Neture 주문 계약을 건드리게 된다.

→ **Phase 1 = 약국 측(장바구니·주문 생성·주문 조회)까지**, Phase 2 = 공급자 측.

---

## 2. 장바구니 · 주문 생성 흐름

```
약국 상품 조회 (GET /store-owner/products)
  → 담기   POST /store-owner/cart/items { offerId, quantity }
             · offerId 로 서버가 노출 게이트 재확인 → 상품명·단가를 서버 값으로 채움
             · 프론트가 보낸 이름/단가는 쓰지 않는다
  → 수정   PATCH /store-owner/cart/items/:itemId { quantity }
  → 삭제   DELETE /store-owner/cart/items/:itemId
  → 주문   POST /store-owner/orders { itemIds?, note? }
             · 서버가 현재 공급 상태·단가를 다시 조회해 재검증
             · 공급자별로 분리해 checkoutService.createOrder() 호출
             · 성공 그룹의 cart item 만 제거
  → 조회   GET /store-owner/orders(/:orderId)
```

**노출 게이트는 약국 상품 조회와 같은 SSOT** — 조회에 보이면 담을 수 있고, 담았으면 주문 시점에 같은 기준으로 재검증된다.

```sql
'pharmacy-hub' = ANY(spo.service_keys)      -- 공급자 opt-in (제공 축)
AND spo.is_active = true
AND spo.deleted_at IS NULL
AND spo.distribution_type <> 'PRIVATE'
AND ns.status = 'ACTIVE'
AND COALESCE(pm.status,'ACTIVE') = 'ACTIVE'
```

**요구하지 않는 것**: 상품별 운영자 승인(`approval_status`), `organizationId`.

**단가**: `offer_service_prices('pharmacy-hub')` 우선 → 없으면 `price_general`. 조회 화면과 동일 규칙.

## 3. 공급자별 분리 방식

- 그룹 권위는 **`offer.supplier_id`** (cart 의 `supplierId` 가 아니라 서버 값)
- 공급자마다 **별도 `checkout_orders`** 를 만든다 — 서로 다른 공급자 상품이 한 주문에 섞이지 않는다
- **원자성**: 그룹 내 1건이라도 검증 실패 시 **그 그룹 전체 미주문**(금액 일관성). 실패 항목은 장바구니에 남고 `failedItems` 로 사유 반환
- **그룹 간 best-effort**: 한 공급자 실패가 다른 공급자 주문을 막지 않는다

## 4. 권한 · 서비스 격리

| 축 | 방식 |
|----|------|
| 인증 | `requireAuth` |
| 역할·membership | `requirePharmacyHubScope('pharmacy-hub:store_owner')` — membership active + 역할 |
| 구매자 | `buyerId` = **JWT 인증 사용자**만 (body 미신뢰) |
| 서비스 | `serviceKey='pharmacy-hub'` **서버 고정** (경로·body 에서 받지 않음) |
| 주문 조회 | `buyer_id` + `metadata->>'serviceKey'='pharmacy-hub'` **항상 함께** → 타인·타 서비스 주문 혼입 0 |
| 상세 미존재 | 타인/타 서비스 주문과 부존재를 구분하지 않고 404 |

> 공용 `/api/v1/store/cart/:serviceKey/*` 를 쓰지 않은 이유: 그 라우트는 **인증만 요구**하고
> Pharmacy-Hub membership·역할을 확인하지 않는다. 서비스 경계를 맞추려면 별도 엔드포인트가 필요했다.

## 5. Phase 1 경계 — 공급자 미노출

- 공급자 주문 목록·상세·상태 변경·shipment·fulfillment bridge **미구현**
- `paymentStatus`/`collectionStatus` 를 **임의로 만들지 않는다** — `createOrder` 기본값 유지
- 약국 응답에 `supplierNotified: false` 와 안내 문구(`주문이 접수되었습니다. 공급자 전달·처리는 준비 중입니다.`)를 포함해
  **공급자 접수 완료로 오인되지 않게** 했다
- 주문 metadata 에 `phase: 'buyer-order-only'` 를 남겨 Phase 2 에서 식별 가능

## 6. 데이터 변경

```
migration 0 · 신규 테이블 0 · 신규 컬럼 0 · 신규 role 0
```

런타임 write 는 기존 `store_cart_items`(담기/수정/삭제)와 `checkout_orders`(createOrder) 뿐이다.

## 7. 테스트

`apps/api-server/src/services/cart/__tests__/pharmacy-hub-cart-checkout.test.ts` — **25건 전부 통과**
(DataSource·checkoutService stub, DB 없이 순수 로직 검증)

| 그룹 | 검증 |
|------|------|
| 입력 | 빈 장바구니 `EMPTY_CART` · buyerId 없음 `INVALID_SCOPE` |
| 가격 | **서비스별 공급가로 재계산**(9,900, price_general 12,000 아님) · 없으면 폴백 |
| 계약 | `metadata.serviceKey='pharmacy-hub'` 고정 · snapshot(offerId·masterId·supplierId·단가출처) · **결제 상태 미조작** · `phase='buyer-order-only'` |
| 공급자 분리 | 다른 공급자 → 주문 분리(한 주문에 1공급자) · 같은 공급자 → 1주문 묶음 · **그룹 내 실패 시 그룹 전체 미주문** · 그룹 간 격리 |
| 게이트 | 비활성 상품/공급자/마스터 · PRIVATE · 가격 0 · 미제공(`NOT_DELIVERED`) · 재고 부족 · 수량 이상 · offer 없음 · 미지원 sourceType |
| 정책 | **상품별 승인 미요구**(approval_status PENDING 도 주문 성공) · **organizationId 미요구** |
| 부분 주문 | `itemIds` 로 지정한 항목만 |

`tsc --noEmit -p tsconfig.build.json` ✅ 0 errors.

## 8. 배포 · E2E (프로덕션 실측)

인증은 `renariver21@gmail.com`(`platform:super_admin`) — `PHARMACY_HUB_SCOPE_CONFIG.platformBypass=true`
로 store_owner scope 를 통과한다. 대조군은 `sohae21@naver.com`(공급자, store_owner 아님).

### 8-1. 권한

| 시나리오 | 결과 |
|---|---|
| 미인증 장바구니 · 주문 | ✅ 401 |
| 공급자 계정 장바구니 · 주문 목록 · 주문 상세 | ✅ **403** (store_owner scope 아님) |

### 8-2. 장바구니

| 시나리오 | 결과 |
|---|---|
| 제공 상품 담기 | ✅ 201 · **서버가 상품명·단가(9,900) 를 채움** |
| **미제공 상품 담기** | ✅ 400 `NOT_DELIVERABLE` (Offer B — `service_keys={}`·비활성) |
| 잘못된 offerId | ✅ 400 `INVALID_OFFER_ID` |
| 잘못된 수량(0) | ✅ 400 `INVALID_QUANTITY` |
| 수량 변경 2→3 | ✅ 200 |
| 목록 | ✅ 200 · items=1 · qty=3 · 공급자 그룹 1 |

### 8-3. 주문 생성

| 항목 | 결과 |
|---|---|
| 주문 생성 | ✅ **201** · orders=1 · failed=0 |
| 금액 | ✅ **29,700 = 9,900 × 3** — 서버 단가(서비스별 공급가) 적용, `price_general`(12,000) 아님 |
| 공급자 분리 | ✅ 공급자 `251adaaf…`(쓰라이프존) 단일 주문 |
| 배송비 | ✅ 0 (Phase 1 고정) |
| 주문 후 장바구니 | ✅ items=0 (성공분만 제거) |
| `supplierNotified` | ✅ **false** + 안내 문구 반환 |

### 8-4. 주문 조회

| 항목 | 결과 |
|---|---|
| 목록 | ✅ 200 · total=1 · `ORD-20260801-1146` · status `created` |
| 상세 | ✅ 200 · 공급자명 `(주)쓰라이프존` · note 보존 |
| **snapshot** | ✅ `offer=3bb54519…` · `master=07581fe1…` · `unitPriceSource=offer_service_price` · `serviceKey=pharmacy-hub` · 상품명·수량·단가 보존 |
| 없는 주문 / 잘못된 형식 / 미인증 | ✅ 404 / 400 / 401 |

### 8-5. 서비스 격리 (DB 실측)

```
checkout_orders 서비스별 분포:  neture 2 · pharmacy-hub 1
pharmacy-hub 주문 metadata:     serviceKey=pharmacy-hub · phase=buyer-order-only
```

→ **다른 서비스 주문 혼입 0.** 조회는 `"buyerId"` + `metadata->>'serviceKey'` 를 항상 함께 건다.

### 8-6. 생성한 테스트 데이터

| 항목 | 값 |
|---|---|
| 주문 | `3b5eedb4-dbda-46f0-95e3-fec5fc1c1ad5` (`ORD-20260801-1146`) |
| 내용 | `[E2E_TEST] 파머시허브 검증상품 A` × 3 @9,900 = 29,700 · 공급자 `251adaaf…` |
| note | `[E2E_TEST] Phase1 검증` |

기존 `[E2E_TEST]` Offer 를 사용했고 상품·회원 데이터는 새로 만들지 않았다.

### 8-7. 배포 중 발견·수정한 결함 1건

**약국 주문 목록·상세가 500** 이었다. `checkout_orders` 는 **camelCase 컬럼**
(`"buyerId"`·`"orderNumber"`·`"totalAmount"`·`"shippingFee"`·`"createdAt"`·`"supplierId"`)인데
snake_case 로 조회해 실패했다. `order_type` 만 snake_case 라 혼동하기 쉬운 지점이다.
따옴표 camelCase 로 교정하고 프로덕션 DB 로 직접 검증한 뒤 재배포했다 (커밋 `fac0b7411`).

## 8-8. 중복 주문 방지 계약 (확인 결과)

현재 계약에는 **idempotency key 가 없다.** 대신 다음이 중복 생성을 실질적으로 제한한다.

- 주문 성공 시 해당 cart item 을 **즉시 삭제**한다 → 같은 요청을 다시 보내면 `EMPTY_CART`(400)
- 부분 선택(`itemIds`) 재요청도 이미 삭제된 id 는 대상에서 빠진다

다만 **동시 요청(같은 순간 2회)** 은 두 요청이 모두 cart 를 읽은 뒤 각각 주문을 만들 수 있다.
완전한 방지에는 요청 단위 idempotency key 또는 cart item 선점(lock/status)이 필요하며,
이는 결제 도입 시점에 함께 설계하는 것이 맞다 → **Phase 2 항목으로 기록**한다.

## 9. 미구현 · 후속

| 항목 | 사유 |
|------|------|
| 공급자 주문 목록·상세·상태 처리 | Phase 2 — §1-3 A·B |
| fulfillment bridge (`checkout_orders` → `neture_orders`) | Phase 2 — Neture 자신도 미완(P2b/P2c) |
| 온라인 결제 · 정산 · 배송비 | 범위 밖 (배송비는 Phase 1 에서 0 고정, 재결정 안 함) |
| 프론트 화면 | 본 WO 는 API 까지. 화면은 후속 |
| 중복 주문 방지(idempotency key) | §8-8 — 현재는 cart 삭제로 실질 제한. 동시 요청 완전 차단은 결제 도입 시 함께 설계 |
