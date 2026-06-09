# CHECK-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2

> `WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2` 결과.
> KPA 에서 검증한 canonical Store Cart 흐름을 GlycoPharm / K-Cosmetics buyer 화면으로 확장.
> **판정: PASS** — tsc 3종 / cart-add API smoke / checkout-confirm graceful smoke / Glyco·KCos
> 브라우저 route·sidebar·empty 렌더 전부 통과. (active Glyco/KCos 이벤트오퍼 부재로 실제 담기
> 클릭·positive 주문 생성만 deferred — 동일 helper participate 로 간접 커버.) — 2026-06-09

---

## 1. 조사 결과

| 항목 | GlycoPharm | K-Cosmetics |
|------|-----------|-------------|
| buyer 화면 | `services/web-glycopharm/src/pages/hub/HubEventOffersPage.tsx` | `services/web-k-cosmetics/src/pages/hub/HubEventOffersPage.tsx` |
| 기존 action | `participate(id, 1)` 직접 주문 (하드코딩 1) | 동일 |
| event API client | `glycopharmEventOfferApi` (`api`, /api/v1) | `cosmeticsEventOfferApi` (`api`, /api/v1) |
| event item 타입 | `EnrichedEventOffer` (id, offerId, supplierId, price/unitPrice, perOrderLimit …) | 동일 |
| 기존 canonical cart client/route/사이드바 | 없음 | 없음 |
| cart serviceKey | `glycopharm` | `k-cosmetics` |
| event-offer OPL service_key | `glycopharm-event-offer` | `k-cosmetics-event-offer` |

**핵심**: Glyco/KCos event-offer 컨트롤러는 **KPA 와 동일한 `EventOfferService` 를 service_key 만 바꿔
재사용**(코드 주석 명시). 따라서 checkout-confirm 의 `loadEventOfferContext`/`reserveEventOfferListing`/
`tryLinkStoreProduct`(STORE_SERVICE_KEY_MAP) 가 그대로 동작 → checkout-confirm cross-service 확장 안전.
→ **FULL V2 범위**(cart add + cart 화면/진입점 + checkout-confirm)로 진행.

## 2. 변경 파일 (13)

- **Backend (1)**: `apps/api-server/src/services/cart/event-offer-cart-checkout.service.ts` —
  `CART_TO_EVENT_OFFER_SERVICE_KEY` 에 `glycopharm→glycopharm-event-offer`, `k-cosmetics→k-cosmetics-event-offer` 추가.
- **Glyco (6)** / **KCos (6)** 각:
  - `api/storeCart.ts` (신규) — `api`(/api/v1) 기반, serviceKey 'glycopharm'/'k-cosmetics'
  - `utils/eventOfferCart.ts` (신규) — `buildEventOfferCartPayload`(priceSnapshot = unitPrice ?? price ?? 0) + uuid guard
  - `pages/hub/HubEventOffersPage.tsx` — 바로 주문(participate) → 장바구니 담기 + "내 장바구니" 링크
  - `pages/store-cart/StoreCartPage.tsx` (신규) — 공급자별 묶음·수량·삭제·비우기·주문 확정·결과 UI (Tailwind)
  - `App.tsx` — `/store-hub/cart` route
  - Hub 사이드바 — "내 장바구니" nav

> participate API/service 미삭제(legacy 유지). 결제·정산·fulfillment·Neture B2B·원장 수렴 무변경.

## 3. 검증

### 3.1 TypeScript
- `web-glycopharm` tsc 0 · `web-k-cosmetics` tsc 0 · `apps/api-server` tsc 0 ✅
  (KCos `api` 타입이 any 로 잡혀 storeCart.ts 에서 typed `http` shape 캐스팅으로 noImplicitAny 해소.)

### 3.2 cart-add API smoke (production)
| serviceKey | add event_offer | 필드 보존 | groups | clear |
|------------|:---------------:|:--------:|:------:|:-----:|
| glycopharm | 201 ✅ | sourceType/pricingSource/eventOfferId/supplierId/priceSnapshot ✅ | supplierCount=1 ✅ | ✅ |
| k-cosmetics | 201 ✅ | ✅ | supplierCount=1 ✅ | ✅ |

### 3.3 checkout-confirm cross-service graceful smoke (배포 `o4o-core-api-02072`)
| serviceKey | bogus eventOfferId confirm | UNSUPPORTED? | 결과 | cart 유지 |
|------------|---------------------------|:------------:|------|:--------:|
| glycopharm | success=true | **아님** ✅ | createdOrders=0, failedItems=1(CONTEXT_LOAD_FAILED), removed=0 ✅ | remaining=1 ✅ |
| k-cosmetics | success=true | **아님** ✅ | 동일 ✅ | remaining=1 ✅ |

→ serviceKey 매핑(glycopharm→glycopharm-event-offer, k-cosmetics→k-cosmetics-event-offer) 정상 동작,
  주문/차감 미발생, 실패 항목 cart 유지. 정리 완료.

### 3.4 live 브라우저 smoke (배포 glycopharm-web/k-cosmetics-web)
| 항목 | Glyco | KCos |
|------|:-----:|:----:|
| `/store-hub/cart` 라우트 렌더 | ✅ (테스트 약국 store owner) | ✅ (operator/admin 허용) |
| 사이드바 "내 장바구니" 노출 + 타깃 `/store-hub/cart` | ✅ | ✅ |
| "내 장바구니" 제목 + 안내 + empty state + "이벤트 상품 보기" CTA | ✅ | ✅ |
| crash 없음 / 가드 통과 | ✅ | ✅ |

> Glyco `/store-hub` 는 store-owner 게이트라 admin/operator(sohae2100)는 `/operator` 로 리다이렉트(가드 정상).
> 테스트 약국(store owner) 계정으로 렌더 확인. KCos 는 operator/admin 허용이라 sohae2100 로 확인.

## 4. deferred (CONDITIONAL 요소)
- KPA 와 동일하게 active Glyco/KCos 이벤트오퍼가 없어 **목록 "장바구니 담기" 실제 클릭 + positive 주문
  생성(차감)** 은 live 미실증. 담기/확정 경로는 cart-add smoke + checkout-confirm graceful smoke +
  동일 helper 를 쓰는 participate(프로덕션 실주문)로 간접 커버. 실제 오퍼 게시 시 1회 실측만 잔여.

## 5. 회귀 무영향
- KPA cart/checkout 흐름 무변경(backend 는 매핑 2줄 additive). participate API/service 유지.
- Glyco/KCos 기존 주문/결제/정산/fulfillment 무변경. 공통 패키지·다른 세션 WIP 무접촉.

## 6. 완료 기준 체크 (WO §10)
1. Glyco/KCos buyer action → cart add 전환 ✅
2. sourceType='event_offer' 저장 ✅ (smoke)
3. eventOfferId/supplierId/pricingSource/priceSnapshot 보존 ✅ (smoke)
4. 장바구니 보기 CTA dead link 아님 ✅ (route 존재·렌더 확인)
5. participate API/service 유지 ✅
6. tsc 통과 ✅
7. 다른 세션 WIP 무접촉 ✅
8. CHECK 문서 작성 ✅
- 확장 기준: Glyco/KCos `/store-hub/cart` 렌더 ✅, checkout-confirm cross-service 동작 ✅, 실패 cart 유지 ✅

## 7. 후속
- 실제 Glyco/KCos 이벤트오퍼 게시 시 positive mutation smoke 1회.
- `IR-O4O-NETURE-EVENT-OFFER-PAYMENT-AND-SETTLEMENT-MODEL-V1` / `WO-O4O-NETURE-EVENT-OFFER-FULFILLMENT-BRIDGE-V1`
  / `IR-O4O-ORDER-LEDGER-CONVERGENCE-GOVERNANCE-V1`.

---

*Date: 2026-06-09 · Status: PASS (positive 주문 생성·실클릭만 active offer 부재로 deferred)*
