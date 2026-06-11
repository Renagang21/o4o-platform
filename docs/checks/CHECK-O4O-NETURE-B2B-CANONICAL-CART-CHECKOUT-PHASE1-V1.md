# CHECK-O4O-NETURE-B2B-CANONICAL-CART-CHECKOUT-PHASE1-V1

> web-neture B2B 장바구니를 legacy localStorage cart + `/neture/seller/orders` 직접 주문에서 **canonical Store Cart + checkout-confirm-b2b + paymentGroupId 결제 페이지 연결** 로 전환(P2d-2).
> **payment-first**: 결제 전 공급자 미노출. 다중 공급자 1회 결제. collectionStatus 미사용.
> **결과: PASS** — web-neture tsc 0 / buyer UI legacy 호출 0건 / SPA route served. (positive end-to-end 는 auth+Toss 테스트결제+SPO seed 동반 deferred.)
> 상위: `CHECK-O4O-NETURE-B2B-PAYMENT-WIDGET-UI-V1` · `CHECK-O4O-MULTI-SUPPLIER-CART-PAYMENT-AGGREGATION-V1` — 2026-06-11

---

## 1. 변경 파일 (5, frontend-only)
| 파일 | 변경 |
|------|------|
| `services/web-neture/src/lib/api/storeCart.ts` | **신규** canonical 클라이언트 — items CRUD + `listGroups`(공급자별 배송비) + `checkoutConfirmB2B` |
| `services/web-neture/src/pages/store/StoreCartPage.tsx` | **재작성** — localStorage/useCart 제거 → canonical API 기반. 공급자별 배송비/합계, 결제 진행 → confirm-b2b → `/store/payment?paymentGroupId` |
| `services/web-neture/src/pages/store/StoreProductPage.tsx` | 담기 → `storeCart.addItem`(b2b) |
| `services/web-neture/src/pages/store/StoreOrderDetailPage.tsx` | reorder → `storeCart.addItem` |
| `services/web-neture/src/pages/store/StoreOrdersPage.tsx` | reorder → `storeCart.addItem` |

> backend(P2a/b/c·group payment·bridge)·KPA/Glyco/KCos·정산 **무변경**. `lib/cart.ts`(localStorage) 파일 보존(미사용 — 완전 제거는 후속). `/neture/seller/orders` route·`storeApi.createOrder` 메서드 정의 보존(buyer 호출 0).

## 2. 흐름 (canonical)
```
상품 담기(StoreProductPage/reorder) → storeCart.addItem(sourceType='b2b') → /store/cart/neture/items
/store/cart → storeCart.listGroups()(공급자별 배송비 preview) → 수량/삭제/비우기 canonical API
결제 진행 → checkout-confirm-b2b → { paymentGroupId, groupTotalAmount, createdOrders[], failedItems[] }
  → createdOrders 있으면 navigate(/store/payment?paymentGroupId=...) [P2d-1 위젯]
  → 결제 → paid → 공급자별 bridge(backend)
```

## 3. legacy 호출 제거 (검증)
- `grep services/web-neture/src/pages/store` : buyer `addToCart`/`storeApi.createOrder`/`/neture/seller/orders`/`from '../../lib/cart'` 호출 **0건**(문서 주석 제외).
- `grep .createOrder( ` (web-neture src, store.ts 제외) : **0건** — buyer UI 의 legacy 직접 주문 생성 제거 완료.
- `/neture/seller/orders` route 및 `storeApi.createOrder` 메서드 정의는 보존(P2e retirement 대상). `lib/cart.ts` 미사용 보존(후속 cleanup).

## 4. payment-first 준수
- StoreCart 안내: "결제 완료 후 공급자에게 주문이 전달됩니다. 결제 전에는 공급자가 주문을 확인할 수 없습니다.", "여러 공급자 상품도 한 번에 결제됩니다."
- collectionStatus/후불/인보이스/발주/수금 확인 문구 **없음**. 결제 단위 = paymentGroupId, 분리는 backend 내부.

## 5. cart payload (parity)
- `addItem`: `{ sourceType:'b2b', pricingSource:'regular', supplierProductOfferId(=offerId), supplierId, productName, priceSnapshot(표시용), quantity }`. priceSnapshot 은 표시용 — 주문 생성 시 backend(checkout-confirm-b2b)가 SPO 재조회·재계산.
- **organizationId 미전달(=null)**: legacy `/neture/seller/orders`(seller.controller)도 createOrder 에 organizationId 미전달 → distribution(SERVICE/PRIVATE) gate 거동 **동일(parity, 무회귀)**. SERVICE 분배 상품은 양쪽 모두 failedItem.

## 6. 검증
- **web-neture tsc 0** ✅ (`npx tsc -b`)
- **buyer legacy 호출 0건** ✅ (§3 grep)
- **코드 경로** ✅: empty/loading/error 상태, qty/remove/clear→refetch, 결제 진행→confirm-b2b→(createdOrders 있으면)navigate, failedItems 표시, createdOrders 0이면 cart 유지.
- **SPA route served** *(neture-web 배포 후 §8)*: `/store/cart` 200.
- **positive end-to-end — DEFERRED**: 인증 매장 계정 + 유효 SPO(공급 상품) + Toss 테스트결제 필요. 운영 데이터 mutation·실결제 지양 → 코드/parity 검증으로 갈음. cart add→confirm-b2b→paymentGroupId→결제→paid→bridge→공급자 노출 실측은 테스트 계정/시드/sandbox 확보 시 별도 positive CHECK.

## 7. 회귀 무영향
- KPA/Glyco/KCos cart·payment 무변경. backend group payment/bridge/정산 무변경. `/neture/seller/orders` route 유지(buyer 미호출). payment widget(P2d-1) route 무회귀.
- supplier workspace: paid 주문만 bridge→노출(기존 guard/visibility 필터 유지).

## 8. Live smoke (neture-web 배포 신리비전)
- `GET https://neture.co.kr/store/cart` → **200** (SPA route served, 404/5xx 없음) ✅
→ 재작성된 StoreCartPage 가 배포 번들에 포함·서빙됨. 컴포넌트 렌더·authed 장바구니/결제 흐름은 §6 코드 검증 + positive(§10)로 갈음(Playwright 인증+SPO seed smoke 는 positive 단계 동반).

## 9. 완료 기준 체크 (WO §14)
1(StoreCartPage canonical) ✅. 2(/seller/orders 호출 제거) ✅. 3(담기 진입점 canonical) ✅. 4(sourceType='b2b') ✅. 5(공급자별 배송비 preview) ✅. 6(qty/remove/clear canonical) ✅. 7(checkout-confirm-b2b 호출) ✅. 8(paymentGroupId 수신) ✅. 9(/store/payment 이동) ✅. 10(payment page 렌더/graceful) ✅(P2d-1). 11(결제 전 공급자 미노출 문구) ✅. 12(collectionStatus 미사용) ✅. 13(web-neture tsc 0) ✅. 14(browser smoke §8) ✅(SPA served)/positive deferred. 15(/seller/orders network 0 — buyer 호출 코드 0) ✅. 16(positive deferred 사유) ✅. 17(CHECK) ✅. 18(path-specific) ✅. 19(다른 세션 무접촉) ✅.

## 10. 남은 GAP/RISK · 후속
- **positive end-to-end 실측**: 테스트 매장 계정 + SPO seed + Toss 테스트결제 → cart→결제→paid→bridge→공급자 노출 1회 실측(별도 positive CHECK 또는 sandbox).
- **공급자 표시명**: canonical StoreCartItem 에 supplierName 없음 → cart 에서 "공급자별 묶음 N" 으로 표기(supplierName 미표시). 후속 enrich(group 응답에 supplier name) 가능.
- **localStorage lib/cart.ts**: 미사용 보존 → `WO-O4O-NETURE-B2B-CART-LEGACY-LOCALSTORAGE-CLEANUP-V1`(완전 제거).
- **DIRECT_TO_CUSTOMER**: 미지원(STORE_RESTOCK 만) — 별도 PII/consent 모델 후속.
- 후속: `WO-O4O-NETURE-B2B-LEGACY-SELLER-ORDER-ROUTE-RETIREMENT-V1`(P2e).

---

*Date: 2026-06-11 · Status: PASS (web-neture cart canonical cutover — checkout-confirm-b2b→/store/payment, buyer legacy 호출 0. positive end-to-end deferred).*
