# CHECK-O4O-GLYCOPHARM-ORDERS-PAGE-BUYER-LEDGER-REPOINT-V1

> **WO**: WO-O4O-GLYCOPHARM-ORDERS-PAGE-BUYER-LEDGER-REPOINT-V1
> **선행**: `IR-O4O-STORE-ORDER-DIRECTION-SEMANTICS-CROSSSERVICE-V1`(canonical=buyer) · `CHECK-...-CHECKOUT-LEDGER-REPOINT-V1`(HALT).
> **성격**: GP `/store/commerce/orders` 를 buyer 구매/발주 내역(checkout_orders, buyerId)으로 정렬. seller 풀필먼트 UI 제거.
> **결과: PASS — buyer endpoint repoint + UI 전환. typecheck PASS. backend/DB 무변경.**
> **작성일**: 2026-06-12

---

## 1. 목적
GP 주문 내역 화면이 deprecated stub(`/glycopharm/pharmacy/orders`, 빈 배열) 대신 buyer 원장(`/glycopharm/checkout/orders`, checkout_orders)을 조회하고, seller 풀필먼트 UI(접수/배송/customer/shipping)를 buyer 구매내역 UI 로 교체한다.

## 2. 선행 IR 기준
`IR-...-ORDER-DIRECTION-SEMANTICS` 확정: "내 매장 주문 내역" canonical = **buyer(구매/발주 내역)**. cart `checkout-confirm` 이 `buyerId=매장 사용자` 로 적재하므로 buyer 방향이어야 함. seller "받은 주문/판매 이행"은 별도 화면(범위 외).

## 3. Phase 1 — 현재 호출 경로
| 파일 | 기능 | 변경 전 |
|------|------|---------|
| `PharmacyOrders.tsx` | 주문 화면 | `pharmacyApi.getOrders`(stub) + receiveOrder/updateOrderStatus(seller) |
| `StoreBillingPage.tsx` | 정산 | `pharmacyApi.getOrders`(stub) — **본 WO 범위 외, 잔존**(§8) |

## 4. Phase 2 — buyer endpoint response shape
`GET /glycopharm/checkout/orders`(`checkout.controller.ts:631`): `{success, data:[{id,orderNumber,status,paymentStatus,totalAmount,pharmacy,itemCount,createdAt}], pagination:{page,limit,total,totalPages}}` (buyerId+serviceKey 필터). 상세 `GET /checkout/orders/:orderId` = items+subtotal/shippingFee/discount 포함. → **판정 B(frontend adapter)**: backend 무변경, client 에서 타입·envelope 매핑.

## 5. Phase 3 — API client 변경
`services/web-glycopharm/src/api/pharmacy.ts`:
- 추가 타입: `CheckoutOrderSummary` / `CheckoutOrderListResponse` / `CheckoutOrderItemDetail` / `CheckoutOrderDetail`.
- 추가 메서드: `getCheckoutOrders({page,limit})` → `/glycopharm/checkout/orders`; `getCheckoutOrderDetail(orderId)` → `/glycopharm/checkout/orders/:orderId`.
- 기존 `getOrders`/`receiveOrder`/`updateOrderStatus` 는 **삭제하지 않음**(StoreBillingPage 등 타 사용처·회귀 방지) — buyer 화면에서 미사용으로만 전환.

## 6. Phase 4 — buyer 주문 내역 UI 정렬
`PharmacyOrders.tsx` 전면 재작성(buyer 구매/발주 내역):
- **제거**: receiveOrder/updateOrderStatus(접수/처리/배송/완료 버튼), customerName, shippingAddress, trackingNumber, 채널 배지, seller status 탭.
- **표시**: 주문번호 · 결제 중심 상태(결제완료/결제대기/취소·환불, `deriveState`) · 상품 수 · 주문일 · 총액. expand → `getCheckoutOrderDetail` 로 상품 목록 + 금액 분해(상품금액/배송비/할인/총결제) **읽기 전용**.
- KPI: 총 주문 / 결제완료 / 이번 달 주문액(buyer 관점).
- 필터: 전체/결제완료/결제대기/취소 (client-side, endpoint 미지원) + 주문번호 검색.
- heading "구매/발주 내역", 설명 "매장 허브에서 주문한 O4O 상품·이벤트 오퍼 내역".
- 동적 Tailwind 색은 기존 파일과 동일 팔레트(green/yellow/red)로 safelist 정합 유지.

## 7. Phase 5 — empty state
buyer 문맥으로 변경: "매장 허브에서 O4O 주문 가능 상품을 장바구니에 담아 주문하면 이곳에서 확인할 수 있습니다."

## 8. Phase 6 — deprecated stub 처리
`/glycopharm/pharmacy/orders` backend stub **삭제하지 않음**. `PharmacyOrders` 의 stub 호출은 제거됨. **`StoreBillingPage.tsx` 가 아직 `pharmacyApi.getOrders`(stub) 사용 — 본 WO 범위 외, 잔존**. 후속 후보: `IR-O4O-GLYCOPHARM-STORE-BILLING-PAGE-ORDER-SOURCE-AUDIT-V1`, `WO-O4O-GLYCOPHARM-LEGACY-PHARMACY-ORDERS-STUB-DEPRECATION-V1`.

## 9. Phase 7 — read-only 검증
배포 후 `/glycopharm/checkout/orders` GET 으로 실데이터 렌더 확인 권장(Cloud SQL Auth Proxy 또는 화면). 본 작업은 배포 전 정적+typecheck 로 검증. PII 미기록.

## 10. 제외/무변경 항목
- backend(checkout.controller/pharmacy.controller)·DB·migration·response shape — **무변경**.
- `getOrders`/`receiveOrder`/`updateOrderStatus` client 메서드 — 정의 유지(타 사용처 보존).
- KPA/KCos/Neture·유통참여형 펀딩 — 무변경.
- seller "받은 주문/판매 이행" 화면 — 본 WO 미생성(후속 `IR-O4O-STORE-SELLER-ORDER-FULFILLMENT-NEED-V1`).

## 11. 검증 결과
- **정적**: `PharmacyOrders` 에 `getOrders`/`receiveOrder`/`updateOrderStatus`/`pharmacy/orders`/customerName/shippingAddress/trackingNumber **0건**. `getCheckoutOrders`/`getCheckoutOrderDetail` 사용 확인.
- **TypeScript**: `services/web-glycopharm` `tsc --noEmit` → PASS.
- **무변경**: backend/DB/KPA/KCos — 확인.

## 12. 완료 판정
**PASS** — GP `/store/commerce/orders` 가 buyer 구매/발주 내역(checkout_orders, buyerId)으로 정렬됨. seller 풀필먼트 액션·필드 제거. backend/DB 무변경. typecheck 통과.

## 13. 후속 작업
1. `WO-O4O-KPA-ORDERS-PAGE-BUYER-LEDGER-ALIGNMENT-V1` — KPA seller("판매자 관점") → buyer 정렬.
2. `WO-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1` — 상태 라벨 3서비스 공통 매핑.
3. `WO-O4O-STORE-BUYER-ORDERS-COMMON-COMPONENT-EXTRACTION-V1` — buyer 구매내역 공통 추출.
4. `IR-O4O-GLYCOPHARM-STORE-BILLING-PAGE-ORDER-SOURCE-AUDIT-V1` — StoreBillingPage stub 의존 정리.
5. (필요 시) `IR-O4O-STORE-SELLER-ORDER-FULFILLMENT-NEED-V1`.

---

*Date: 2026-06-12 · WO-O4O-GLYCOPHARM-ORDERS-PAGE-BUYER-LEDGER-REPOINT-V1 · GP 주문내역 buyer(checkout_orders) 정렬 PASS. seller 풀필먼트 제거. StoreBillingPage stub 잔존(후속). backend/DB 무변경.*
