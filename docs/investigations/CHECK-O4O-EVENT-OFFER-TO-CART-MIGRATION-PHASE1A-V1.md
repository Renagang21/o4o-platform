# CHECK-O4O-EVENT-OFFER-TO-CART-MIGRATION-PHASE1A-V1

> `WO-O4O-EVENT-OFFER-TO-CART-MIGRATION-V1` **Phase 1a** 결과.
> KPA 이벤트오퍼 buyer 상세 화면의 primary action 을 `participate()` 직접 주문에서
> canonical Store Cart "장바구니 담기" 로 1차 전환.
> **결과: 코드 PASS (tsc 0 / API smoke PASS), live 브라우저 검증은 frontend 배포 후.** — 2026-06-09

---

## 1. 범위 (Phase 1a)

- KPA 이벤트오퍼 **상세 화면**(`EventOfferDetailPage`)만 대상. (목록/일괄주문·Glyco·KCos 는 후속)
- 이벤트오퍼 상품을 `StoreCartItem(sourceType='event_offer')` 로 담는다.
- checkout 확정·N분할 createOrder·수량 차감 이전·participate 제거는 **하지 않음**.

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/api/storeCart.ts` | **신규** — canonical store cart client (`coreApiClient`, `/api/v1/store/cart/:serviceKey/*`). add/list/group/update/remove/clear |
| `services/web-kpa-society/src/api/index.ts` | `storeCartApi` + 타입 export |
| `services/web-kpa-society/src/pages/event-offer/EventOfferDetailPage.tsx` | primary action `주문하기→장바구니 담기`, 수량 선택 stepper(`perOrderLimit` 상한), 성공 상태(장바구니 보기/계속 담기), FreeShippingNotice 가 수량 반영 |
| `services/web-kpa-society/src/pages/store-cart/StoreCartPage.tsx` | **신규** — 내 장바구니 읽기/편집 화면(공급자별 묶음·수량변경·삭제·비우기). 주문/결제 확정 없음 |
| `services/web-kpa-society/src/App.tsx` | lazy import + route `/store-hub/cart` (PharmacyOwnerOnlyGuard) |

> **backend 무변경.** foundation 엔드포인트(`WO-...-CART-CHECKOUT-FOUNDATION-V1`)만 소비.

## 3. cart item payload (이벤트오퍼)

```ts
{
  sourceType: 'event_offer',
  supplierId: product.supplierId,            // varchar — 그대로 보존
  supplierProductOfferId: asUuid(product.offerId),         // uuid guard
  organizationProductListingId: asUuid(product.id),        // uuid guard
  eventOfferId: asUuid(product.id),                        // uuid guard
  productName: product.productName,
  quantity,                                  // 선택 수량 (1..perOrderLimit)
  pricingSource: 'event_offer',
  priceSnapshot: product.eventPrice ?? product.unitPrice ?? product.generalPrice ?? 0,
}
```

- **uuid guard**: `eventOfferId`/`organizationProductListingId`/`supplierProductOfferId` 는 cart 테이블에서
  `uuid` 컬럼이므로, 비-uuid 값이 들어오면 DB 오류가 난다. `asUuid()` 로 형태 검증 후 보존(아니면 null).
- **organizationId 생략**: 정확한 매장 org 필드가 현 buyer context 에서 불확실하여 잘못된 값 전송을
  피했다. nullable·보존용이며 완료 기준 외. sellerOrganizationId resolve 는 checkout 확정(Phase 1b)에서.
- `EventOfferItem` 에 `supplierProductOfferId`/`organizationProductListingId` 전용 필드는 없어
  `offerId`(SPO 참조)·`id`(OPL 기반 상세) 를 매핑. 부족 시 backend detail response 에 additive 노출은 후속.

## 4. 검증

### 4.1 TypeScript
- `web-kpa-society` `tsc --noEmit` → **0 errors.** ✅

### 4.2 API smoke (production, serviceKey `kpa-society`, 프런트 payload 형상)

| 항목 | 결과 |
|------|:----:|
| add event_offer item (qty 3, ₩12,000, uuid 필드) | 201 ✅ |
| sourceType `event_offer` 저장 | ✅ |
| pricingSource `event_offer` 저장 | ✅ |
| eventOfferId / organizationProductListingId / supplierProductOfferId 보존 | ✅ |
| supplierId(varchar) 보존 | ✅ |
| priceSnapshot / quantity 보존 | ✅ |
| groups 묶음 조회 | ✅ supplierCount=1 |
| clear (테스트 데이터 정리) | ✅ removed=1 |

### 4.3 live 브라우저 visual smoke
- frontend(`web-kpa-society`) 배포 후 수행 예정. (수량 선택 → 장바구니 담기 → 성공 CTA →
  `/store-hub/cart` 목록 확인). active KPA event offer 부재 시 graceful empty 로 기록.

## 5. 회귀 무영향

- `eventOfferApi.participate()` API·service **무변경, 미제거** (목록 화면 등에서 계속 사용).
- backend·주문·결제·정산·송장·배송상태 **무변경**.
- 무료배송 progress UI: 시그니처에 `quantity`(default 1) additive — 기존 동작 유지하며 선택 수량 반영(정합성 개선).
- 다른 세션 WIP(guide/commonization) 파일 **무접촉**.

## 6. 완료 기준 체크

1. KPA 이벤트오퍼 상세에서 장바구니 담기 가능 — ✅ (코드/route/API)
2. `sourceType='event_offer'` 저장 — ✅ (smoke)
3. eventOfferId/supplierId/pricingSource/priceSnapshot 보존 — ✅ (smoke)
4. participate 직접 주문 흐름 미삭제 — ✅
5. 수량 차감 위치 미변경 — ✅
6. checkout/order/settlement/fulfillment 미변경 — ✅
7. web-kpa-society tsc 통과 — ✅
8. backend 변경 없음(tsc 선택) — N/A
9. 다른 세션 WIP 무접촉 — ✅
10. CHECK 문서에 Phase 1a 범위/잔여 기록 — ✅ (본 문서 §7)

## 7. 잔여 / 후속 Phase

- **Phase 1b** `WO-O4O-STORE-CART-CHECKOUT-CONFIRMATION-V1`: cart checkout 확정, 공급자별
  createOrder N분할, event_offer 최종 검증, 수량 차감 시점 이전, participate legacy 격하,
  sellerOrganizationId resolve.
- **Phase 1a 후속(소)**: KPA 이벤트오퍼 **목록 일괄주문**(`KpaEventOfferPage`)도 cart 담기 전환,
  store-hub 사이드바에 "내 장바구니" 진입점 노출.
- **Phase 1c** `WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2`: Glyco/KCos 동일 패턴(공통화 세션 정리 후).

---

*Date: 2026-06-09 · Status: 코드 PASS (live 브라우저 검증 배포 후 대기)*
