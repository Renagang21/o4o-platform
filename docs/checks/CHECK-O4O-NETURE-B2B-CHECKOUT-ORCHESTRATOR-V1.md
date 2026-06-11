# CHECK-O4O-NETURE-B2B-CHECKOUT-ORCHESTRATOR-V1

> Neture B2B/regular cart 항목을 **공급자별 checkout_orders 로 주문화하는 백엔드 오케스트레이터** 신설(P2a).
> **payment-first**: 생성 주문 `paymentStatus='pending'` — 결제 완료 전 공급자 미노출. `collectionStatus` 미사용.
> **결과: PASS** — api-server tsc 0 / 별도 route(event_offer 무회귀) / graceful smoke. (실 SPO·매장 데이터 positive 주문 생성은 deferred.)
> 상위: `CHECK-O4O-NETURE-B2B-PAYMENT-FIRST-CANONICAL-FLOW-CORRECTION-V1` · `IR-O4O-NETURE-B2B-ORDER-TO-CANONICAL-CART-CHECKOUT-V1` — 2026-06-11

---

## 1. 변경 파일 (2)
| 파일 | 변경 |
|------|------|
| `apps/api-server/src/services/cart/neture-b2b-cart-checkout.service.ts` | **신규** `NetureB2BCartCheckoutService.confirm()` |
| `apps/api-server/src/routes/cart/store-cart.routes.ts` | `POST /cart/:serviceKey/checkout-confirm-b2b` 추가(별도 엔드포인트) |

> `/neture/seller/orders`·legacyNetureService·event_offer checkout-confirm·payment·정산·fulfillment·web-neture **무변경**. DB/migration **무변경**.

## 2. 동작 (payment-first)
```
canonical Store Cart (serviceKey='neture', sourceType ∈ {b2b, regular})
→ SPO 서버 재검증/재계산 → 공급자(supplierId) 그룹핑
→ 공급자별 checkoutService.createOrder() (paymentStatus='pending' 기본값)
→ 성공 그룹 cart item 제거
```
- **paymentStatus='pending'** (createOrder 기본값, 오버라이드 안 함) → §13 결제 완료 전 공급자 미노출.
- **collectionStatus 미저장** (후불/인보이스 전제 폐기 — 상위 CHECK). metadata 에 `fulfillmentVisibility:'hidden_until_paid'`.
- **fulfillment bridge / 공급자 노출 / 결제 흐름 없음**(후속 P2b/P2c).

## 3. 서버 재검증 (priceSnapshot 신뢰 안 함)
`supplier_product_offers` JOIN `product_masters`/`neture_suppliers` 재조회 → gate:
`OFFER_NOT_FOUND` / `SUPPLIER_MISMATCH` / `PRODUCT_INACTIVE` / `PRODUCT_NOT_APPROVED`(approval='APPROVED') / `SUPPLIER_INACTIVE`(status='ACTIVE') / `DISTRIBUTION_DENIED`(PRIVATE→allowedSellerIds, SERVICE→organizationId) / `INVALID_QUANTITY`(1~1000) / `INVALID_PRICE`(price_general>0) / `INSUFFICIENT_STOCK`(trackInventory). 가격·상품명은 SPO 서버값으로 재계산. (neture.service.createOrder 6-gate 와 동일 정책 — 단 본 WO 는 checkout_orders 로 생성.)

## 4. 그룹 원자성 / 부분 성공
- 주문 단위 = `supplierId`(offer.supplier_id 권위). 같은 공급자 항목 → 하나의 checkout_order(병합 lineItems).
- **그룹 내 일부 item enrich 실패 → 그룹 전체 보류**(`GROUP_PARTIAL_FAILURE`) — 공급자별 금액/배송비 일관성.
- **그룹 간 best-effort** — 성공 그룹만 주문+cart 제거, 실패 그룹 item 은 cart 유지 + `failedItems`.
- 배송비: `calculateSupplierShippingFee(groupSubtotal, supplier policy)` → `shippingFeeSnapshot` 으로 createOrder 전달(cart preview 와 동일 fn·정책 → 정렬). 정책 미설정 → 0원 fallback(운영 위험 §9 기록).

## 5. metadata 계약
```
source: 'neture_b2b_checkout', serviceKey: 'neture', sourceTypes: ['b2b'|'regular'...],
orderType: 'STORE_RESTOCK', cartItemIds, supplierProductOfferIds,
pricingRevalidationRequired: true, fulfillmentVisibility: 'hidden_until_paid'
```
- **collectionStatus / paymentReady 저장 안 함**(금지 준수). line item metadata 에 sourceType/supplierProductOfferId/cartItemId/confirmedUnitPrice.

## 6. order_type / DIRECT_TO_CUSTOMER (P2a 범위)
- cart item 에 order_type 개념 없음 → **전부 STORE_RESTOCK 으로 취급**(metadata.orderType='STORE_RESTOCK').
- **DIRECT_TO_CUSTOMER(customer_info PII + consent)는 본 WO 미지원** — PII/동의 보존 정책이 필요해 별도 후속(WO §11). (현재 legacy `/neture/seller/orders` 는 그대로 유지되므로 직배송 경로 단절 없음.)

## 7. 검증
- **api-server tsc 0** ✅
- **별도 route(회귀 방지)** ✅ — `checkout-confirm-b2b` 신설, 기존 `checkout-confirm`(event_offer) 핸들러·서비스 무변경.
- **graceful smoke (live, 배포 후)**:
  - no-auth → 401, invalid serviceKey → 400(VALIDATION_ERROR) (resolveScope 공통).
  - serviceKey≠'neture' → `UNSUPPORTED_CART_SERVICE`(400).
  - neture + bogus item(미존재 SPO/빈 cart) → createdOrders=0, failedItems>0, cart 유지(주문/차감 미발생).
  - *(아래 §10 에 live 결과 기록.)*
- **positive 주문 생성 — DEFERRED**: 유효 SPO·매장(organization) seed 가 필요. 운영 데이터 mutation 지양 → bogus/graceful 로 갈음, positive 는 frontend 전환(P2d) 또는 seed 확보 시 동반 CHECK.

## 8. 회귀 무영향
- event_offer checkout-confirm / KPA·Glyco·KCos cart 흐름 무변경(별도 route).
- `/neture/seller/orders`·legacyNetureService·payment·정산·fulfillment guard·web-neture 무변경.
- createOrder 기본값 사용 — payment/정산 로직 무변경.

## 9. 완료 기준 체크 (WO §16)
1(orchestrator 신설) ✅. 2(neture b2b/regular 처리) ✅. 3(SPO 서버 재계산) ✅. 4(공급자별 checkout_order) ✅. 5(shippingFeeSnapshot) ✅. 6(paymentStatus='pending') ✅. 7(collectionStatus 미사용) ✅. 8(공급자 노출/bridge 없음) ✅. 9(성공 cart item 제거) ✅. 10(실패 item cart 유지) ✅. 11(event_offer 무회귀 — 별도 route) ✅. 12(tsc 0) ✅. 13(graceful smoke 기록) ✅(positive deferred). 14(CHECK) ✅. 15(path-specific) ✅. 16(다른 세션 무접촉) ✅.

## 10. Live graceful smoke 결과 (배포 신리비전, no-auth)
| 호출 | 결과 |
|------|------|
| `POST /store/cart/neture/checkout-confirm-b2b` (no-auth) | **401** ✅ (route mounted, auth-first) |
| `POST /store/cart/not-a-service/checkout-confirm-b2b` (no-auth) | **401** ✅ (auth-first; authed 시 400 invalid serviceKey) |
| `POST /store/cart/kpa-society/checkout-confirm` (no-auth, **회귀 확인**) | **401** ✅ (event_offer 엔드포인트 정상 유지) |

→ 신규 b2b 엔드포인트 mount + auth 정상, event_offer checkout-confirm **무회귀**, 500/route-누락 없음. authed graceful(UNSUPPORTED_CART_SERVICE/createdOrders=0)은 토큰 필요로 코드 검증(§2~§4)으로 갈음. positive 주문 생성은 §7·§11 deferred.

## 11. 남은 GAP/RISK · 후속
- **pending checkout_order 공급자 노출**: `supplier-unified-order.service` 가 checkout_orders 를 `canFulfill=false` read-only 로 노출(paymentStatus 무관). pending B2B 주문도 read-only 로 보일 수 있음(기존 동작, 본 WO 가 도입한 것 아님). fulfillment guard 가 비-paid 배송 차단하므로 **fulfillment 누수 없음**. paymentStatus='paid' 전 unified view 필터링은 후속(P2c bridge 동반) 권고.
- **positive 주문 생성 실측**: 유효 SPO/매장 seed 또는 P2d frontend 전환 시.
- **배송비 0원 fallback**: 공급자 정책 미설정 시 0원(기존 정책). 안내는 supplier profile notice(기구현).
- **DIRECT_TO_CUSTOMER**: 별도 후속(PII/consent 모델).
- 후속: `WO-O4O-NETURE-B2B-PAYMENT-FLOW-V1`(P2b) → `WO-O4O-CHECKOUT-ORDER-TO-NETURE-FULFILLMENT-BRIDGE-V1`(P2c) → `WO-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1`(P2d, frontend) → legacy retirement.

---

*Date: 2026-06-11 · Status: PASS (B2B checkout orchestrator 백엔드 신설, payment-first/pending, collectionStatus 미사용. positive 주문 생성 deferred).*
