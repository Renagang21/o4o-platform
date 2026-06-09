# CHECK-O4O-EVENT-OFFER-TO-CART-PHASE1A-FOLLOWUP-V1

> `WO-O4O-EVENT-OFFER-TO-CART-PHASE1A-FOLLOWUP-V1` 결과.
> KPA 이벤트오퍼 buyer UX(상세·목록·일괄·진입점)를 canonical Store Cart "장바구니 담기"
> 흐름으로 정렬. checkout 확정/주문 생성/수량 차감은 미구현(Phase 1b).
> **결과: PASS** — tsc 0 · live 브라우저 smoke 통과 (active offer 부재로 목록 "담기" 버튼 시각
> 클릭만 잔여, graceful). — 2026-06-09

---

## 1. 범위

Phase 1a 소후속. KPA 범위만. checkout 확정·createOrder N분할·수량차감 이전·participate 삭제 **없음**.

## 2. 변경 파일 (5)

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/utils/eventOfferCart.ts` | **신규** — 공용 helper `buildEventOfferCartPayload(item, qty)` + `CART_SERVICE_KEY` + `asUuid`. 상세/목록/패널 공유 |
| `pages/event-offer/EventOfferDetailPage.tsx` | 인라인 payload·asUuid 제거 → 공용 helper 사용 (중복 제거) |
| `pages/event-offer/KpaEventOfferPage.tsx` | 행 "주문"/선택·전체 "주문" → cart 담기. `handleDirectOrder`/`handleBatchOrder` participate → `storeCartApi.addItem`. perOrderLimit 상한. 툴바에 "🛒 내 장바구니" 링크 |
| `components/event-offer/EventOfferContentPanel.tsx` | (`/store-hub/b2b` 사용) 동일 패턴 cart 전환. 행 "내 매장에 추가" → "장바구니 담기" |
| `components/pharmacy/PharmacyHubLayout.tsx` | store-hub 사이드바에 "내 장바구니"(`/store-hub/cart`, ShoppingCart) nav 추가 |

> **backend 무변경.** participate API/service 미삭제(legacy 유지).

## 3. cart payload (공용 helper)

```ts
buildEventOfferCartPayload(item, qty) => {
  sourceType: 'event_offer',
  supplierId: item.supplierId,                       // varchar 보존
  supplierProductOfferId: asUuid(item.offerId),      // uuid guard
  organizationProductListingId: asUuid(item.id),     // uuid guard
  eventOfferId: asUuid(item.id),                     // uuid guard
  productName, quantity: qty,
  pricingSource: 'event_offer',
  priceSnapshot: item.eventPrice ?? item.unitPrice ?? item.generalPrice ?? 0,
}
```

- uuid 컬럼 형태 guard 유지(비-uuid → null). organizationId 미전송(checkout Phase resolve).
- 수량: 행 직접담기=1, 일괄=패널 입력 수량. 둘 다 `perOrderLimit` 상한 clamp.

## 4. 진입점 (dead link 0)

| 위치 | 대상 |
|------|------|
| store-hub 사이드바 "내 장바구니" | `/store-hub/cart` |
| 이벤트오퍼 목록 툴바 "🛒 내 장바구니" | `/store-hub/cart` |
| 이벤트오퍼 상세 담기 성공 "장바구니 보기" | `/store-hub/cart` |

`/store-hub/cart` route 는 Phase 1a 에서 이미 존재(PharmacyOwnerOnlyGuard).

## 5. 검증

- `web-kpa-society` `tsc --noEmit` → **0 errors** ✅
- buyer 측 `.participate(` 직접 주문 호출 **0건** (api 정의·cancel·my-participation 제외) ✅
- backend 무변경 ✅

### 5.1 live 브라우저 smoke (배포 후 — 2026-06-09, `kpa-society-web-01303`)

| 항목 | 결과 |
|------|:----:|
| store-hub 사이드바 "내 장바구니" nav 노출 (이벤트/특가 ↔ 콘텐츠 사이) | ✅ |
| 사이드바 "내 장바구니" 클릭 → `/store-hub/cart` 이동·렌더 (dead link 아님) | ✅ |
| 이벤트오퍼 목록 툴바 "🛒 내 장바구니" 링크 노출 → `/store-hub/cart` | ✅ |
| 목록 배너 문구 cart 언어로 갱신 ("장바구니에 담은 뒤 내 장바구니에서 확인") | ✅ |
| `/store-hub/cart` graceful empty 렌더 | ✅ |

> **미실증(graceful)**: KPA active/전체 이벤트오퍼 0건 → 목록 행 "담기"/일괄 "담기" 버튼 시각
> 클릭 미수행(목록 empty 정상). cart add/qty/remove UI 는 Phase 1a live smoke(시드 item)에서 검증됨.
> WO §6.2 "active offer 부재" 수용 기준 충족.

## 6. 회귀 무영향

- EventOfferDetailPage 담기 + StoreCartPage 수량변경/삭제/비우기 유지(helper 리팩터만, 동작 동일).
- 무료배송 progress UI 무변경. participate API/service·주문/결제/정산/배송 무변경.
- Glyco/KCos·web-neture·공통 패키지 무수정. 다른 세션 WIP 무접촉.

## 7. 완료 기준 체크

1. 목록/일괄 액션 cart 정렬 — ✅ (KpaEventOfferPage + EventOfferContentPanel)
2. 목록 cart item `sourceType='event_offer'` — ✅ (공용 helper)
3. eventOfferId/supplierId/pricingSource/priceSnapshot 보존 — ✅
4. `/store-hub/cart` 진입점 노출 — ✅ (사이드바 + 목록 + 상세)
5. dead link 없음 — ✅
6. checkout/order/settlement/fulfillment 미변경 — ✅
7. participate API/service 유지 — ✅
8. web-kpa-society tsc 통과 — ✅
9. 다른 세션 WIP 무접촉 — ✅
10. CHECK 문서 기록 — ✅ (본 문서)

## 8. 잔여 / 후속

- 실제 KPA 이벤트오퍼 등록 후 목록 "담기"/일괄 "담기" 시각 클릭 1회만 잔여(graceful).
- **Phase 1b** `WO-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1`: checkout 확정, 공급자별 createOrder
  N분할, event_offer 최종 검증, 수량 차감 시점 이전, participate legacy 격하, sellerOrganizationId resolve.
- **Phase 1c** `WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2`: Glyco/KCos.

---

*Date: 2026-06-09 · Status: PASS (목록 "담기" 버튼 시각 클릭만 잔여 — active offer 부재)*
