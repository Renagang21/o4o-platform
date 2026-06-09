# CHECK-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1 (Phase 1b)

> `WO-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1` 결과.
> 장바구니의 KPA 이벤트오퍼 항목을 **공급자별 1주문으로 확정**(merge)하는 checkout-confirm 구현.
> 이벤트오퍼는 별도 주문이 아니라 line item 의 성격 · 주문 단위는 (공급자, 판매 org).
> **결과: PASS** — api/web tsc 0 · production guard/graceful smoke · live 브라우저 end-to-end.
> (positive 주문생성 mutation smoke 는 active KPA event offer 부재로 deferred — 코드로 커버) — 2026-06-09

---

## 1. 범위 / 정책 (고정)

- 이벤트오퍼 = 주문 line item 의 성격. **주문 단위 = (supplierId, sellerOrganizationId)**.
- 같은 공급자·판매 org 항목은 하나의 checkout_order 로 병합. source/eventOfferId/priceSnapshot 은 line item metadata 로 보존.
- 배송비/무료배송/합계는 공급자 그룹 단위(createOrder 가 group subtotal 로 계산).
- `participate` 는 buyer 주문 생성 경로에서 미사용. 검증/차감 로직만 helper 로 추출해 공용.
- **V1 한정: KPA event_offer** (cart `kpa-society` → event-offer `kpa-groupbuy`).

## 2. 변경 파일 (7)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/kpa/services/event-offer.service.ts` | `loadEventOfferContext`+`reserveEventOfferListing`+`incrementListingQuantity` helper 추출, `participate` 가 helper 재사용(동작·에러코드 보존). per_store 누적 SQL 정정(상태 `'cancelled'/'refunded'` + line-item metadata 기준 + `jsonb_typeof` 가드) — 검증 게이트·가용표시 공용 `countStoreOrderedQuantity` |
| `apps/api-server/src/services/checkout.service.ts` | `OrderItem.metadata?` 추가 (additive) |
| `apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts` | items inline 타입 `metadata?` (jsonb, 마이그레이션 불요) |
| `apps/api-server/src/services/cart/event-offer-cart-checkout.service.ts` | **신규** 오케스트레이터 |
| `apps/api-server/src/routes/cart/store-cart.routes.ts` | `POST /cart/:serviceKey/checkout-confirm` |
| `services/web-kpa-society/src/api/storeCart.ts` | `checkoutConfirm` |
| `services/web-kpa-society/src/pages/store-cart/StoreCartPage.tsx` | "주문 확정" 버튼 + 결과 UI(공급자별 생성주문/실패항목) |

## 3. 오케스트레이션 흐름

cart 조회 → event_offer 만 대상(그 외 `failedItems`) → `loadEventOfferContext`(실패 → failedItems) →
`(supplierId, organizationId)` 그룹핑 → 그룹 내 동일 listing 수량 합산 → **그룹 1 트랜잭션**으로 각 listing
`reserveEventOfferListing`(FOR UPDATE+한도검증+차감) → commit → **병합 line items 로 `createOrder` 1회** →
실패 시 그룹 차감 전체 보상 → 성공 시 listing별 `tryLinkStoreProduct`(best-effort) + 확정 cart item 제거.

- **원자성**: 공급자 그룹 단위 atomic. 그룹 간 best-effort(실패 그룹 cart 유지, `failedItems` 보고).
  전역(교차공급자) all-or-nothing 은 `createOrder` 비트랜잭션 제약상 V1 제외(의도적).
- line item metadata: `sourceType,eventOfferId,organizationProductListingId,cartItemIds,pricingSource,confirmedUnitPrice`.

## 4. 검증

### 4.1 TypeScript
- `apps/api-server` tsc → **0 errors** ✅
- `web-kpa-society` tsc → **0 errors** ✅

### 4.2 Production guard / graceful smoke (배포 `o4o-core-api-02068`)

| 항목 | 결과 |
|------|:----:|
| no-auth checkout-confirm | 401 ✅ |
| UNSUPPORTED_CART_SERVICE (`neture`) | 400 `UNSUPPORTED_CART_SERVICE` ✅ |
| event_offer item seed | 201 ✅ |
| checkout-confirm (bogus eventOfferId) | success: `createdOrders=0, failedItems=1(CONTEXT_LOAD_FAILED "이벤트를 찾을 수 없거나 진행 중이 아닙니다."), removed=0` ✅ |
| → serviceKey 매핑(kpa-society→kpa-groupbuy) 후 OPL 조회까지 도달, 주문/차감 미발생 | ✅ |
| 실패 항목 cart 유지(removed=0, 잔여 1) | ✅ |
| cleanup | ✅ |

### 4.3 live 브라우저 end-to-end (배포 `kpa-society-web`, store owner)
- `/store-hub/cart` 에 seed 항목 + "주문 확정" 버튼 + 갱신된 안내 문구 렌더 ✅
- "주문 확정" 클릭 → toast "1개 항목은 주문하지 못했습니다." + 결과 UI "⚠️ 주문하지 못한 항목 · 이벤트를 찾을 수 없거나
  진행 중이 아닙니다. · 실패한 항목은 장바구니에 그대로 남아 있습니다." ✅
- 실패 항목 cart 유지 ✅

> **positive(실주문 생성) mutation smoke = deferred**: KPA active/전체 이벤트오퍼 0건이라 `loadEventOfferContext`
> 가 통과하는 실제 주문 생성 경로는 live 실증 불가. reserve/createOrder 로직은 동일 helper 를 쓰는 `participate`
> (프로덕션에서 실주문 생성 중)로 커버됨. 실제 이벤트오퍼 등록 후 1회 mutation smoke 만 잔여.

## 5. 회귀 무영향
- `participate` 동작·에러코드 보존(helper 리팩터). per_store 누적 SQL 정정은 취소/환불 주문을 한도에서
  제외하도록 **버그를 고친 것**(기존 `'canceled'/'failed'` 오타 → `'cancelled'/'refunded'`) — 의도된 행동 보정.
- `OrderItem.metadata` 는 optional additive — 기존 createOrder 호출 모두 영향 없음.
- 결제/정산/fulfillment/Toss·Glyco·KCos·Neture B2B·web-neture cart 무변경. participate API 미삭제.

## 6. V1에서 하지 않은 것
전역 all-or-nothing / Toss 결제·paid / 정산·송장·fulfillment / Glyco·KCos·Neture B2B / KPA B2C localStorage cart / participate 삭제 / 부분성공 saga.

## 7. 완료 기준 체크
1. KPA event_offer cart item checkout-confirm — ✅
2. event_offer 최종 검증(reserve helper) — ✅
3. 수량 차감 = checkout 확정 시점 — ✅
4. supplier별 checkout_order 생성(병합) — ✅ (코드, graceful/positive 경로)
5. order item metadata(eventOfferId/cartItemId/pricingSource) 보존 — ✅
6. 성공 cart item 제거 — ✅ (코드, cart 정리)
7. 실패 시 cart 유지 — ✅ (smoke)
8. participate API/service 유지 — ✅
9. buyer 신규 주문 확정 = cart 기반 — ✅
10. 범위 과확장 없음 — ✅
11/12. api·web tsc 통과 — ✅
13. 다른 세션 WIP 무접촉 — ✅
14. CHECK 기록 — ✅

## 8. 잔여 / 후속
- 실제 KPA 이벤트오퍼 등록 후 positive mutation smoke 1회(주문 생성 + total_quantity 차감 + items metadata 확인).
- **Phase 1c** `WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2`: Glyco/KCos.
- `IR-O4O-NETURE-EVENT-OFFER-PAYMENT-AND-SETTLEMENT-MODEL-V1` / fulfillment bridge / order ledger 수렴.

---

*Date: 2026-06-09 · Status: PASS (positive mutation smoke 만 active offer 부재로 잔여)*
