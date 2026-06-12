# CHECK-O4O-KPA-ORDERS-PAGE-BUYER-LEDGER-ALIGNMENT-V1

> **WO**: WO-O4O-KPA-ORDERS-PAGE-BUYER-LEDGER-ALIGNMENT-V1
> **선행**: `IR-O4O-STORE-ORDER-DIRECTION-SEMANTICS-CROSSSERVICE-V1`(canonical=buyer) · `WO-...-GLYCOPHARM-...-BUYER-LEDGER-REPOINT-V1`.
> **성격**: KPA `/store/commerce/orders` 를 seller("판매자 관점") → buyer 구매/발주 내역(checkout_orders, buyerId)으로 정렬.
> **결과: PASS — buyer endpoint 정렬 + seller UI/액션 제거. typecheck PASS. seller endpoint·드로어 보존. backend/DB 무변경.**
> **작성일**: 2026-06-12

---

## 1. 목적
KPA 주문 화면이 seller(`/checkout/store-orders`, sellerOrganizationId, "판매자 관점") 대신 buyer 원장(`/checkout/orders`, buyerId, checkout_orders)을 조회하고, seller 풀필먼트 액션(상태변경 드로어)을 제거한다. GP/KCos 와 동일 buyer 의미로 정렬.

## 2. 선행 IR 기준
`IR-...-ORDER-DIRECTION-SEMANTICS` 확정: "내 매장 주문 내역" = buyer(구매/발주). cart `checkout-confirm` 이 buyerId=매장 사용자 → buyer 방향. seller "받은 주문/판매 이행"은 별도 화면(범위 외).

## 3. Phase 1 — 현재 KPA 주문 화면 구조
| 파일 | 변경 전 |
|------|---------|
| `StoreOrdersPage.tsx` | `getStoreOrders`/`getStoreOrderKpi`(seller `/checkout/store-orders`) + `StoreOrderDetailDrawer`(상태변경=cancel/refund) + 헤더 "판매자 관점"/"B2B 구매 및 B2C 판매" |
| `StoreOrderDetailDrawer.tsx` | seller 전용(`getStoreOrderDetail`/`updateStoreOrderStatus`, sellerOrg detail + 상태변경) |

## 4. Phase 2 — buyer endpoint response shape
`GET /checkout/orders`(`kpa-checkout.controller.ts:567,599`): `{success, data:[{id,orderNumber,status,paymentStatus,totalAmount,organization,itemCount,createdAt}], pagination}` (buyerId+serviceKey 필터). → **판정 B(frontend adapter)**: backend 무변경, client 타입 추가로 매핑. (summary — items 배열 없음, itemCount 만.)

## 5. Phase 3 — API client 변경
`services/web-kpa-society/src/api/checkout.ts`:
- 추가: `BuyerOrder` 타입 + `getBuyerOrders({page,limit})` → `/checkout/orders`.
- 기존 `getStoreOrders`/`getStoreOrderKpi`/`getStoreOrderDetail`/`updateStoreOrderStatus`(seller) **삭제하지 않음** — seller 화면 후보로 보존.

## 6. Phase 4 — buyer 주문 내역 UI 정렬
`StoreOrdersPage.tsx` 재작성(DataTable·theme 스타일 유지):
- **데이터**: `getBuyerOrders({limit:100})` → client-side status 필터 + 페이지네이션(buyer endpoint status 미지원).
- **제거**: `StoreOrderDetailDrawer`(상태변경 액션)·`selectedOrderId`·`onRowClick`·"판매자 관점" 주석·"B2B 구매 및 B2C 판매" subtitle.
- **헤더**: "구매/발주 내역" + "매장 허브에서 주문한 O4O 상품·이벤트 오퍼의 주문·결제 내역".
- **KPI**: 4블록(매출 포함) → **3블록 client-side**(총 주문 / 결제완료 / 이번 달 주문액). seller "매출"→buyer "주문액".
- **table**: 주문번호 / 상품(itemCount) / 금액 / 상태(STATUS_BADGE, CheckoutOrderStatus) / 주문일. (buyer summary 에 items 배열 없어 "상품 N개"로 표시.)
- **status 탭**: created/pending_payment/paid/cancelled 유지(CheckoutOrderStatus, buyer 의미).
- 주문 작업대 링크 유지(B2B 주문 생성 = buyer 발주). empty state buyer 문맥.

## 7. Phase 5 — seller 화면 보존/분리 기록
- `StoreOrderDetailDrawer.tsx` **삭제하지 않음**(이제 미사용·고아이나 향후 seller 화면 자산으로 보존).
- `checkout.ts` 의 `getStoreOrders`/`getStoreOrderKpi`/`getStoreOrderDetail`/`updateStoreOrderStatus` 보존.
- 후속: `IR-O4O-STORE-SELLER-ORDER-FULFILLMENT-NEED-V1`(seller 수요 + 별도 IA) / 필요 시 `WO-O4O-KPA-SELLER-ORDERS-PAGE-SEPARATION-V1`.

## 8. Phase 6 — empty state
buyer 문맥: "매장 허브에서 O4O 주문 가능 상품이나 이벤트 오퍼를 주문하면 이곳에서 확인할 수 있습니다."

## 9. Phase 7 — read-only 검증
배포 후 `/checkout/orders` GET 으로 buyer 실데이터 렌더 확인 권장. 본 작업은 배포 전 정적+typecheck. PII 미기록.

## 10. 제외/무변경 항목
- backend(kpa-checkout.controller)·DB·migration·response shape — **무변경**.
- seller client 함수·`StoreOrderDetailDrawer` — 보존(미삭제).
- GP/KCos/Neture·유통참여형 펀딩 — 무변경.
- seller "받은 주문/판매 이행" 화면 — 미생성(후속).

## 11. 검증 결과
- **정적**: StoreOrdersPage 에 `getStoreOrders`/`getStoreOrderKpi`/`StoreOrderDetailDrawer`/`store-orders`/"판매자 관점"/`selectedOrderId` **0건**. `getBuyerOrders`/`BuyerOrder` 사용 확인.
- **TypeScript**: `services/web-kpa-society` `tsc --noEmit` → PASS.
- **무변경**: backend/DB/GP/KCos — 확인.

## 12. 완료 판정
**PASS** — KPA `/store/commerce/orders` 가 buyer 구매/발주 내역(checkout_orders, buyerId)으로 정렬됨. seller 관점 문구·상태변경 드로어 제거. seller endpoint/드로어 보존. backend/DB 무변경. typecheck 통과. → **3서비스(KPA/GP/KCos) 모두 buyer 정합 완료.**

## 13. 후속 작업
1. `WO-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1` — 상태 라벨 3서비스 공통 매핑.
2. `WO-O4O-STORE-BUYER-ORDERS-COMMON-COMPONENT-EXTRACTION-V1` — buyer 구매내역 공통 컴포넌트 추출(이제 3서비스 정합).
3. `IR-O4O-STORE-SELLER-ORDER-FULFILLMENT-NEED-V1` — seller 수요/별도 IA.
4. `IR-O4O-GLYCOPHARM-STORE-BILLING-PAGE-ORDER-SOURCE-AUDIT-V1` — GP StoreBillingPage stub 의존 정리.

---

*Date: 2026-06-12 · WO-O4O-KPA-ORDERS-PAGE-BUYER-LEDGER-ALIGNMENT-V1 · KPA 주문화면 buyer(checkout_orders) 정렬 PASS. seller UI/드로어 제거(자산 보존). 3서비스 buyer 정합 완료. backend/DB 무변경.*
