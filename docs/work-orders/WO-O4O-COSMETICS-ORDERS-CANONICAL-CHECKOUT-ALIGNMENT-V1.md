# WO-O4O-COSMETICS-ORDERS-CANONICAL-CHECKOUT-ALIGNMENT-V1

> K-Cosmetics 주문 경로를 off-contract `EcommerceOrder`(ecommerce_orders, 프로덕션 미존재)에서
> **canonical `checkout_orders`(CheckoutOrder)/`checkoutService`** 로 정렬한다.
> **DB write 없음** (checkout_orders 이미 존재). 인증/권한/결제 승인 로직 불변.

| 항목 | 값 |
|------|------|
| 작성일 | 2026-06-03 |
| 선행 | `WO-O4O-ECOMMERCE-ORDERS-TABLE-PROVISION-V1`(⛔ 중단), `WO-O4O-KCOSMETICS-ORDERS-NO-STORE-RESPONSE-FIX-V1`(alias fix 완료) |
| 계약 근거 | `docs/baseline/E-COMMERCE-ORDER-CONTRACT.md`(Frozen): canonical = `checkout_orders`/CheckoutOrder, 생성은 `checkoutService.createOrder()` |
| 상태 | **진행 — 1차(list/detail) 구현 중** |

---

## 1. 조사 결과 — `EcommerceOrder` 직접 사용처 전수

| 파일 | 용도 | canonical 위반 |
|------|------|:---:|
| `routes/cosmetics/controllers/cosmetics-order.controller.ts` | 주문 list/detail/create | ✅ (본 WO 1차 대상) |
| `routes/cosmetics/controllers/cosmetics-payment.controller.ts` | 결제 | ✅ (후속) |
| `services/cosmetics/KCosmeticsPaymentEventHandler.ts` | 결제 이벤트 | ✅ (후속) |
| `routes/glycopharm/controllers/checkout.controller.ts` | glyco 주문 list/detail/create (`UPDATE ecommerce_orders`) | ✅ (후속, 별도 WO) |
| `routes/glycopharm/controllers/glycopharm-payment.controller.ts` | glyco 결제 | ✅ (후속) |
| `services/glycopharm/GlycopharmPaymentEventHandler.ts` | glyco 결제 이벤트 | ✅ (후속) |
| `modules/lms/services/LmsPaymentEventHandler.ts` | LMS 결제 핸들러 (`getRepository(EcommerceOrder)`) | ✅ (후속, 별도 WO) |
| `database/connection.ts` | 엔티티 등록 | (등록만, 제거는 전 사용처 정리 후) |

> **이미 canonical 정렬된 부분**: cosmetics KPI(`cosmetics-store-summary.service.ts`)와 action-queue(`action-definitions.ts`)는 `WO-O4O-STORE-KPI-DASHBOARD-CHECKOUT-ORDERS-ALIGNMENT-V1` 으로 **checkout_orders 로 이미 이전 완료**. order 컨트롤러만 남은 outlier → 본 WO 는 동일 정렬을 order 엔드포인트에 적용.

## 2. canonical 매핑 (store-summary 어댑터 기준)

- 서비스 격리: `co.metadata->>'serviceKey' = 'cosmetics'`
- store 스코프(KPI): `co."sellerOrganizationId" = (SELECT organization_id FROM cosmetics.cosmetics_stores WHERE id=$store AND organization_id IS NOT NULL)`
- channel: `co.metadata->>'channel'` · itemCount: `jsonb_array_length(co.items)` · items: `co.items` JSONB
- 상태 enum: `created/pending_payment/paid/refunded/cancelled` (cosmetics StoreOrder 타입과 동일)
- 생성: `checkoutService.createOrder(CreateOrderDto{ buyerId, sellerId, supplierId, sellerOrganizationId?, items[], metadata })`

## 3. frontend 응답 shape (불변 유지)

`services/web-k-cosmetics/src/api/storeOrders.ts`:
- list: `{ success, data: StoreOrder[], pagination: { page, limit, total, totalPages } }`
- StoreOrder: `{ id, orderNumber, status, paymentStatus, totalAmount, channel, storeName?, itemCount, createdAt }`
- detail: `{ success, data: StoreOrderDetail }`

→ checkout_orders 컬럼/JSONB 로 **동일 shape 매핑 가능**. 프론트 무변경.

## 4. 구현 스코프

### 1차 (본 WO 직접 수정 — cosmetics-order.controller.ts)
- **GET `/cosmetics/orders` (list)**: `EcommerceOrder` QueryBuilder → `checkout_orders` raw SQL. 서비스 격리 유지. **현행 buyerId 스코프 보존**(directive: 인증/권한·의미 불필요 변경 금지). → `relation does not exist` 500 소멸, 주문 없으면 200 empty.
- **GET `/cosmetics/orders/:id` (detail)**: 동일하게 checkout_orders 기준.
- response shape 불변, mock 없음.

### 후속 (별도 단계/WO)
- **create(POST)**: `checkoutService.createOrder()` 경유로 전환 — 단 cosmetics 검증(channel metadata, 공급계약 guard, product availability)은 컨트롤러에 보존하고 **persistence 만** 교체. items shape 매핑 필요. (위험도 중 — 별도 단계.)
- **cosmetics-payment** / **glycopharm 주문·결제** / **lms payment handler**: 동일 off-contract → 각 별도 WO. glycopharm 은 실사용 경로라 회귀 위험 높아 독립 검증 필요.

### 의미(semantic) 후속 후보
- "내 매장 주문"(store-received) 의미를 살리려면 list 를 **sellerOrganizationId(store) 스코프**로 재정의(store-summary 와 동일). 현행은 buyerId(구매자) 스코프 — 본 WO 는 의미 변경 없이 **원장만 canonical 정렬**. store-scope 전환은 별도 semantic WO.

## 5. 금지 / 안전
- DB write·migration·테이블 생성 없음. `ecommerce_orders` 3종 생성 금지.
- 인증/권한/결제 승인 로직 불변. mock 데이터 금지.
- KPA/Neture 무관. glycopharm/lms 는 본 1차에서 코드 변경하지 않음(조사·후속만).
- path-specific staging, `git add .`/`-am` 금지.

## 6. 검증
- `pnpm --filter @o4o/web-k-cosmetics` 무관(백엔드). api-server typecheck.
- 배포 후: `/cosmetics/orders` 200(empty) — `relation "ecommerce_orders" does not exist` 소멸. `/store/commerce/orders` 화면 정상.
- glycopharm/lms 회귀: 본 1차는 해당 파일 미변경이므로 회귀 없음(코드 기준 확인).
