# IR-O4O-STORE-HUB-EVENT-OFFER-CROSSSERVICE-PARITY-V1

> **유형**: Investigation (read-only) — Store Hub Event Offer 3서비스 parity 조사.
> **성격**: 코드/DB/UI **무변경**. 조사 문서만 (file:line 근거).
> **결론(요약)**: **GP↔KCos 는 209줄 단순 목록(diff=api client+테마색뿐) → B(공유 가능)**. **KPA 는 964줄 enriched 허브(4탭/stats/검색/공급자필터/인라인 bulk 주문패널/수량/active-only guard) + 별도 detail → C/D**. 게다가 **주문 메커니즘 상이**: KPA=cart 기반(`storeCartApi.addItem`), GP/KCos=participate 직접주문(`checkoutService.createOrder`). 둘 다 checkout_orders(buyer) 귀결. → GP/KCos 공통 추출(B) + KPA enriched/주문 메커니즘 canonical 결정(C/D) 분리.
> **선행**: `IR-O4O-MY-STORE-COMMONIZATION-PHASE6-...`(event-offers=C) · `IR-O4O-STORE-ORDER-LEDGER-...`(event offer→checkout_orders) · `IR-O4O-STORE-ORDER-DIRECTION-...`(buyer).
> **작성일**: 2026-06-12

---

## 1. 목적
KPA/GP/KCos event-offers 화면의 구조·상태·주문 경로·cart 연결을 비교해 공통화 가능성을 판정한다.

## 2. 배경
Phase 6 IR 에서 event-offers = C(흐름 정합·컴포넌트 3별도). 본 IR 이 그 parity 확정.

## 3. 선행 기준
이벤트 오퍼 = 이벤트형 O4O 주문 가능 상품. 진행 중(active)만 주문 가능, 예정/종료 차단. cart sourceType=event_offer, 최종 원장=checkout_orders(buyer). 유통참여형 펀딩은 Neture-only(미연결).

## 4. 조사 범위
3서비스 event-offers route/component/api + cart 연결. (read-only.)

---

## 5. Phase 1 — route/component/API 매핑

| 서비스 | route | list component(줄) | detail | API client | 주문 경로 |
|--------|-------|---------------------|--------|-----------|-----------|
| **KPA** | `/store-hub/event-offers` | `KpaEventOfferPage`(`pages/event-offer/`, **964**) | `EventOfferDetailPage`(별도, `/event-offers/:id`) | `eventOfferApi.getEnrichedOffers`/`getEventOfferStats` | **cart**(`storeCartApi.addItem` + bulk) → `/store-hub/cart` |
| **GP** | `/store-hub/event-offers` | `HubEventOffersPage`(`pages/hub/`, **209**) | (목록 내 add) | `glycopharmEventOfferApi.listActive` | **participate**(`/glycopharm/event-offers/:id/participate` → checkoutService.createOrder) |
| **KCos** | `/store-hub/event-offers` | `HubEventOffersPage`(`pages/hub/`, **212**) | (목록 내 add) | `cosmeticsEventOfferApi.listActive` | **participate**(동상) |

> guard: KPA `PharmacyOwnerOnlyGuard`. 모두 `/store-hub/event-offers`. (operator 측 EventOfferManage/Approvals 는 별개 — 본 IR 범위 외.)

## 6. Phase 2 — GP↔KCos 비교 (near-identical)

GP `HubEventOffersPage`(209) ↔ KCos(212) **전체 diff = 21줄**, 실질 차이:
| 항목 | GP | KCos |
|------|-----|------|
| api client | `glycopharmEventOfferApi` | `cosmeticsEventOfferApi` |
| 테마색 | `teal` (border/text/bg) | `pink` |
| 헤더 주석/WO ref | GP 문구 | KCos 문구 |

> **로직/구조 차이 0**. 상태 badge(active 진행중/approved/ended), `listActive(1,50)` 후 `status==='active'||'approved' && isActive` 필터, `to="/store-hub/cart"` 링크, `handleAddToCart(offer)`, empty("진행 중인 이벤트 오퍼가 없습니다") 동일. → **local-products V2 와 동일 패턴**(api+테마색 prop 화로 통합 가능).

## 7. Phase 3 — KPA enriched 구조 (vs GP/KCos)

KPA `KpaEventOfferPage`(964) 가 GP/KCos(209) 대비 보유한 enriched 요소:
| 영역 | KPA | GP/KCos |
|------|-----|:---:|
| 탭 | **4-탭**(진행 예정/진행 중/종료/전체, `WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1`) | 단일(active 목록) |
| 통계 | `getEventOfferStats()` stats 패널 | 없음 |
| 필터 | statusFilter·supplierFilter·searchQuery | 없음(active만) |
| 주문 | **인라인 bulk 주문 패널**(selectedIds·orderQuantities·handleOrderAll·수량) | 항목별 `handleAddToCart` |
| guard | `selectableItems = status==='active'`만 선택 가능(upcoming/sold_out/ended/canceled 제외, 명시) | list 필터로 active만 노출 |
| operator | isOperator 모드 | 없음 |
| 데이터 | `getEnrichedOffers`(enriched VM) | `listActive`(단순) |
| detail | 별도 `EventOfferDetailPage`(수량 선택 + `storeCartApi.addItem`) | 없음(목록 내) |

> KPA 는 **검색/필터/탭/통계/인라인 bulk 주문/active-only guard 를 갖춘 풀 주문 허브**. GP/KCos 는 **진행 중 오퍼 단순 목록 + 항목 add**. 기능 깊이가 근본적으로 다름.

## 8. Phase 4 — cart/checkout 연결 (메커니즘 상이)

| 서비스 | 주문 트리거 | 메커니즘 | 원장 |
|--------|-------------|----------|------|
| KPA | bulk(handleOrderAll) / detail(addItem) | **cart 기반**: `storeCartApi.addItem(CART_SERVICE_KEY, buildEventOfferCartPayload)` → `/store-hub/cart` → checkout-confirm | checkout_orders(buyer) |
| GP/KCos | `handleAddToCart(offer)` → `participate(id, qty)` | **participate 직접주문**: `POST /event-offers/:id/participate` → `checkoutService.createOrder()`(api 주석: "바로 주문 → createOrder 결과 스냅샷") | checkout_orders(buyer) |

> **둘 다 checkout_orders(buyer) 로 귀결**(order-ledger IR 정합)이나 **frontend 주문 경로가 다르다**: KPA=cart 적재 후 checkout-confirm, GP/KCos=participate 즉시 주문. 진행 중(active)만 주문 가능은 **3서비스 공통 의도**(KPA 명시 guard / GP·KCos active 필터). 예정/종료 차단도 공통.

## 9. Phase 5 — KPA enriched ViewModel 차이 분석

| 항목 | KPA | GP/KCos | 공통화 영향 |
|------|-----|---------|-------------|
| getEnrichedOffers VM | ✅(stats/lifecycle/supplier 등) | ❌ listActive | 데이터 계약 상이 → 공통 컴포넌트가 KPA VM 기준이면 GP/KCos API 보강 필요 |
| 4-탭 lifecycle | ✅ | ❌ | GP/KCos 에 예정/종료 탭 없음 |
| 인라인 bulk 주문 | ✅ | ❌(항목 add) | 주문 UX 모델 상이 |
| 주문 메커니즘 | cart addItem | participate | **백엔드 주문 경로 정렬 필요**(cart vs participate) |
| active-only guard | 명시(selectableItems) | list 필터 | 안전장치 위치 상이 |

## 10. Phase 6 — 공통화 가능성 판정

| 영역 | KPA | GP | KCos | 판정 | 근거 |
|------|:---:|:---:|:---:|:---:|------|
| **GP↔KCos 단순 목록** | — | ✅ | ✅ | **B** | 209줄 near-identical(api+테마색만) → 공통 추출 가능(local-products V2 패턴) |
| **KPA enriched vs GP/KCos** | enriched | 단순 | 단순 | **C/D** | KPA 4탭/stats/필터/인라인 bulk 주문/enriched VM — 기능 깊이 상이. 통합하려면 canonical 결정 |
| **주문 메커니즘** | cart | participate | participate | **C/D** | KPA cart vs GP/KCos participate — frontend 경로 상이(원장은 동일). 정렬 결정 필요 |

> **종합 = B(GP/KCos) + C/D(KPA·주문 메커니즘)**. 사용자 예측(B 또는 C, KPA enriched canonical 여부) 부합.

## 11. Phase 7 — 후속 작업 분리

**즉시 가능 (B — GP/KCos 공통 추출)**
- `WO-O4O-STORE-HUB-EVENT-OFFER-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1` — GP/KCos `HubEventOffersPage`(209줄 near-identical)를 공통 `EventOffersHubList`(api client + 테마색/라벨 prop)로 통합. local-products V2 와 동일 패턴. **저위험.**

**결정 선행 (C/D — KPA canonical 여부)**
- `IR-O4O-STORE-HUB-EVENT-OFFER-CANONICAL-UX-DECISION-V1` — event-offer 매장 허브 canonical UX 결정: (a) KPA enriched(탭/stats/인라인 주문)를 canonical 로 올려 GP/KCos 도 enriched 化, (b) GP/KCos 단순 목록 + 별도 상세 주문을 canonical, (c) tier 분리 유지. + **주문 메커니즘 정렬**(cart vs participate) 결정.
- 결정 후: `WO-O4O-EVENT-OFFER-ORDER-MECHANISM-ALIGNMENT-V1`(cart/participate 통일) · KPA↔GP/KCos enriched parity WO.

**저위험 정렬**
- `WO-O4O-EVENT-OFFER-STATUS-LABEL-ALIGNMENT-V1` — active/upcoming/ended/sold_out 라벨 3서비스 공통(buyerCheckoutStatus 패턴 재사용 검토).

> **권장 순서**: ① GP/KCos 공통 추출(B, 저위험) → ② canonical UX 결정 IR(C/D) → ③ 주문 메커니즘 정렬 + KPA parity.

---

## 12. 결론
- **GP↔KCos `HubEventOffersPage` 는 209줄 near-identical**(diff=api client+테마색) → local-products V2 패턴으로 **바로 공통 추출 가능(B)**.
- **KPA `KpaEventOfferPage`(964) 는 enriched**(4탭/stats/검색/공급자필터/인라인 bulk 주문/active-only guard/enriched VM) + 별도 detail → GP/KCos 와 **기능 깊이가 근본적으로 다름(C/D)**.
- **주문 메커니즘 상이**: KPA=cart(`storeCartApi.addItem`), GP/KCos=participate(`checkoutService.createOrder`). 둘 다 checkout_orders(buyer) 귀결이나 frontend 경로 정렬 필요.
- 진행 중(active)만 주문·예정/종료 차단은 3서비스 공통 의도.
- **권고**: GP/KCos 공통 추출(B) 먼저 → KPA enriched + 주문 메커니즘 canonical 결정 IR(C/D) 분리. "바로 3서비스 통합"은 아님.

---

*Date: 2026-06-12 · read-only IR · 코드 무변경 · GP/KCos near-identical(B 공통추출) / KPA enriched·주문 메커니즘 상이(C/D, canonical 결정). event offer → checkout_orders buyer 귀결 공통.*
