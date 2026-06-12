# CHECK-O4O-STORE-HUB-EVENT-OFFER-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1

> **WO**: WO-O4O-STORE-HUB-EVENT-OFFER-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1
> **선행**: `IR-O4O-STORE-HUB-EVENT-OFFER-CROSSSERVICE-PARITY-V1`(GP/KCos=B).
> **성격**: GP/KCos `HubEventOffersPage`(near-identical) → 공통 `EventOffersHubList`. KPA enriched 무변경. backend/cart 무변경.
> **결과: PASS — EventOffersHubList(@o4o/store-ui-core) 추출 + GP/KCos thin wrapper. store-ui-core+GP+KCos+KPA typecheck 0.**
> **작성일**: 2026-06-12

---

## 1. 목적
GP/KCos 이벤트 오퍼 단순 목록(209/212줄 near-identical)을 공통 컴포넌트로 통합. service api(listActive) + 장바구니 담기 + accent 색만 주입. KPA enriched 허브는 별개(무변경).

## 2. 선행 IR 기준
이벤트 오퍼 = 진행 중(active/approved+isActive)만 노출. 장바구니 담기 → /store-hub/cart → checkout_orders(buyer). GP/KCos 판정 B(near-identical), KPA 판정 C/D(enriched, 별도).

## 3. Phase 1 — GP/KCos 차이 재확인
| 항목 | GlycoPharm | K-Cosmetics | 처리 |
|------|-----------|-------------|------|
| api client | `glycopharmEventOfferApi` | `cosmeticsEventOfferApi` | wrapper `listActive` 주입 |
| 테마색 | `teal` | `pink` | `accent` prop(정적 class map) |
| cart util | `@/api/storeCart` + `@/utils/eventOfferCart`(CART_SERVICE_KEY='glycopharm') | 동(CART_SERVICE_KEY='k-cosmetics') | wrapper `addToCart` 주입 |
| 헤더 주석 | GP | KCos | wrapper 헤더 |

> **선행 IR 정정**: IR §8 의 "GP/KCos = participate 직접주문" 은 **api 파일 기준 과대기술**. 실제 `HubEventOffersPage` 는 **cart 기반**(`storeCartApi.addItem` + `buildEventOfferCartPayload`, `WO-O4O-EVENT-OFFER-TO-CART-CROSSSERVICE-V2`)으로 KPA 와 동일 메커니즘. participate API 는 legacy 미사용(잔존). → 주문 메커니즘 divergence 는 사실상 해소(컴포넌트 추출에 영향 없음).

## 4. Phase 2 — EventOffersHubList 추출
- 신규: `packages/store-ui-core/src/components/event-offers/EventOffersHubList.tsx`.
- **generic** `<T extends EventOfferHubItem>`: props `listActive(page,limit)`(axios `{data:{data:T[]}}`) · `addToCart(offer, qty)`(service 가 storeCart+payload+toast 처리) · `accent`(teal/pink 정적 class map).
- 보존: 진행 중 필터(active/approved+isActive)·status badge·가격/잔여/공급사/승인일·장바구니 담기 버튼(loading)·`/store-hub/cart` 링크·empty/error/loading. `EventOfferHubItem` 타입(서비스 EnrichedEventOffer 의 공통 부분 집합).
- 동적 Tailwind class 미사용 — accent 는 `ACCENT_CLASSES{teal,pink}` 정적 map.
- toast/storeCart 는 store-ui-core 의존 아님 → **wrapper 의 `addToCart` 콜백**으로 주입(컴포넌트는 orderingId loading 만 관리).
- export: index.ts.

## 5~6. GP/KCos 적용 (thin wrapper)
| 서비스 | 변경 |
|--------|------|
| GP `pages/hub/HubEventOffersPage.tsx` | **209줄 → ~30줄 wrapper**. `<EventOffersHubList<EnrichedEventOffer> accent="teal" listActive={glycopharmEventOfferApi.listActive} addToCart={storeCart+toast}/>` |
| KCos `pages/hub/HubEventOffersPage.tsx` | **212줄 → ~30줄 wrapper**. `accent="pink"` + cosmeticsEventOfferApi |
> 타입: 서비스 `EnrichedEventOffer` 가 `EventOfferHubItem` 의 superset(generic T) → assignable. listActive 응답(`{data:{success,data:[]}}`) → `{data?:{data?:T[]}}` assignable. addToCart 가 EnrichedEventOffer 받아 buildEventOfferCartPayload 호출(타입 정합).

## 7. Phase 5 — KPA 무변경 확인
- KPA `KpaEventOfferPage`(964) / `EventOfferDetailPage` **무변경**. cart 기반 enriched 흐름 무변경.
- KPA enriched UX(4탭/stats/인라인 bulk 주문) canonical 여부는 후속 `IR-...-CANONICAL-UX-DECISION-V1`.

## 8. 제외/무변경 항목
- backend / DB / migration / checkout_orders / checkoutService / participate API / storeCart API — 무변경.
- KPA event-offer 파일 — 무변경. Neture / 유통참여형 펀딩 — 무변경.
- GP/KCos api client·cart util — 무변경(wrapper 가 주입).

## 9. 검증 결과
- **TypeScript**: `@o4o/store-ui-core` 0 · `web-glycopharm` 0 · `web-k-cosmetics` 0 · `web-kpa-society` 0(회귀 없음).
- **정적**: `EventOffersHubList` index export 확인. GP/KCos = thin wrapper(api+addToCart+accent 주입). KPA 파일 무변경. 동적 class 미사용. 유통참여형 펀딩 미혼입.
- **smoke**: 미수행(배포 전) — 동일 코드 이동 + accent 정적 class라 시각/동작 동일, tsc 가 generic 타입 가드. 배포 후 GP(teal)/KCos(pink) `/store-hub/event-offers` 목록·장바구니 담기 확인 권장.

## 10. 완료 판정
**PASS** — GP/KCos HubEventOffersPage(209/212줄) → 공통 `EventOffersHubList` + thin wrapper(~30줄×2). KPA enriched 무변경. backend/cart/checkout 무변경. typecheck(4) 통과.

## 11. 후속 작업
1. `IR-O4O-STORE-HUB-EVENT-OFFER-CANONICAL-UX-DECISION-V1` — KPA enriched(탭/stats/인라인 주문) canonical 여부 + GP/KCos 확장 결정.
2. `WO-O4O-EVENT-OFFER-STATUS-LABEL-ALIGNMENT-V1` — 상태 라벨 공통화(buyerCheckoutStatus 패턴 검토).
3. `WO-O4O-STORE-HUB-B2B-CATALOG-CROSSSERVICE-PARITY-V1`(Phase 6 C).
> 참고: 주문 메커니즘(cart) 은 3서비스 사실상 통일됨(본 CHECK §3 정정) → `ORDER-MECHANISM-ALIGNMENT` WO 우선순위 하향.

---

*Date: 2026-06-12 · WO-O4O-STORE-HUB-EVENT-OFFER-GP-KCOS-COMMON-COMPONENT-EXTRACTION-V1 · EventOffersHubList 통합 + GP/KCos thin wrapper PASS. KPA enriched 무변경. 주문=cart 통일 확인(IR 정정). backend/cart 무변경.*
