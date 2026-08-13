# CHECK — WO-O4O-STORE-HUB-EVENT-OFFER-COMMONIZATION-V1

- 작업일: 2026-08-13
- 브랜치: `work/commonization-store-hub` (base = `origin/main`)
- 범위: 이벤트 오퍼 동선(공급자 생성 → 매장 탐색 → 담기/주문 → 상태 확인)의 프론트 공통화
- 판정 요약: **backend 는 이미 완전 공통(단일 EventOfferService × service_key)**, KCos/GP 탐색 화면도 이미 공통 컴포넌트 사용 중.
  이번 WO 에서 남아 있던 실제 중복(장바구니 payload 3중복 + 상태 라벨 2중복)만 공통화했다. PharmacyHub = **NOT_IMPLEMENTED**.

---

## 1. 서비스별 기존 구조

| 서비스 | 매장 탐색 route | 화면 | 공급자 생성 경로 | 참여(구매) 동선 |
|---|---|---|---|---|
| KPA-Society | `/store-hub/event-offers` (`PharmacyOwnerOnlyGuard`) · 상세 `/event-offers/:id` | `KpaEventOfferPage` (971L, 4탭 + 운영자 stats + 공급업체 묶음 담기) | Neture 공급자 제안 → `POST /kpa/supplier/event-offers` · 운영자 승인 | 장바구니 담기 → `/store-hub/cart` |
| K-Cosmetics | `/store-hub/event-offers` · 운영자 `/operator/event-offers` | `HubEventOffersPage` (33L, 공통 `EventOffersHubList` wrapper) | 동일(멀티 서비스 제안) · KCos operator 승인 | 동일 |
| GlycoPharm | `/store-hub/event-offers` · 운영자 `/operator/event-offers` | `HubEventOffersPage` (33L, 동일 wrapper) | 동일 | 동일 (공식 적용 대상 아님 — 회귀만 확인) |
| PharmacyHub | 없음 | 없음 | 없음 | 없음 |
| Neture | 매장 탐색 화면 없음(`/store/event-offers` 는 선행 WO 에서 제거) · 공급자 `/supplier/event-offers` | `SupplierEventOfferPage` (제안 + 현황) | 본인이 원천 | 해당 없음(지원 허브) |

## 2. Backend / entity / API 계약

- **단일 서비스**: `apps/api-server/src/routes/kpa/services/event-offer.service.ts` (1,601L) 를 KPA·KCos·GP·Neture 컨트롤러가 **service_key 인자만 바꿔** 호출한다. 코드 복사 없음 → backend 는 이미 공통화 완료.
- **저장소**: 별도 이벤트 테이블 없음. `organization_product_listings` (OPL) 에 이벤트 컬럼을 추가해 사용한다
  (`20260906100000-AddEventOfferColumnsToListings`: `status` · `start_at` · `end_at` · `total_quantity` · `per_store_limit` · `per_order_limit`).
- **서비스 키 2체계**: platform key(`kpa-society`/`k-cosmetics`/`glycopharm`) ↔ event offer key(`kpa-groupbuy`/`k-cosmetics-event-offer`/`glycopharm-event-offer`).
  변환은 `constants/event-offer-service-mapping.ts` 의 `TARGET_TO_EVENT_OFFER_KEY` 단일 지점.
- **엔드포인트**: KPA `/api/v1/kpa/groupbuy/*` · KCos `/api/v1/cosmetics/event-offers/*` · GP `/api/v1/glycopharm/event-offers/*` · Neture `/api/v1/neture/event-offers/*`.
  경로 prefix 만 다르고 핸들러 집합(`/`, `/enriched`, `/stats`, `/my-participations`, `/:id`, `/:id/participate`)은 동일.
- **참여 write**: `POST /:id/participate` 는 **legacy(@deprecated)** 이며 canonical 은 장바구니 → checkout 이다
  (`WO-O4O-EVENT-OFFER-PARTICIPATE-LEGACY-DEMOTION-V1`). 이번 WO 에서 되살리지 않았다.

## 3. Neture 공급자 원천 관계 (§7 — 계약 확인만)

- Neture 는 **이벤트 오퍼의 지원 허브**다. 공급자가 자기 SPO 를 대상 서비스로 **제안**하면 대상 서비스 OPL 에 `status='pending'` row 가 생기고, 대상 서비스 **운영자 승인** 후 매장에 노출된다.
- 제안 가능 대상은 `PROPOSE_TARGETS` (frontend) ↔ `TARGET_TO_EVENT_OFFER_KEY` (backend) 로 정합: **KPA / K-Cosmetics / GlycoPharm 3개**. PharmacyHub 는 없음.
- `STORE_SERVICE_KEY_MAP` 에 `neture-event-offer` 는 의도적으로 빠져 있다(매장 진열 미적용 = 지원 허브).
- **Neture 코드는 변경하지 않았다.** 공급자 화면의 상태 라벨(`pending='검토중'`)은 매장 화면(`pending='대기'`)과 업무 관점이 달라 공통 매핑에 흡수하지 않았다.

## 4. 실제 중복 (조사 결과)

| 후보 | 판정 |
|---|---|
| 매장 탐색 목록 화면(KCos/GP) | **이미 공통** — `@o4o/store-ui-core` `EventOffersHubList`. 재작업 안 함 |
| KPA 탐색 화면 vs KCos/GP | **near-identical 아님** — KPA 는 4탭 상태 필터 · 운영자 stats · 검색/공급업체 필터 · 공급업체 묶음 담기 패널을 가진 상위 집합. 얇은 목록으로 축소하면 기능 손실이므로 통합하지 않음(§4 "거대한 조건문 컴포넌트 금지") |
| `src/utils/eventOfferCart.ts` (KPA/KCos/GP) | **실중복** — uuid 검증 + payload 조립이 동일. 서비스 고유는 serviceKey·가격 우선순위뿐 → 공통화함 |
| 상태 라벨 매핑 | **부분 중복** — `EventOffersHubList.STATUS_BADGE` 와 KPA `getStatusBadge` 가 같은 enum 을 각자 번역 → 라벨만 공통화(스타일은 각 화면 소유) |
| 날짜 포맷 | 중복 아님 — 표시 의미가 다르다(KPA 기간 `시작~종료` vs 허브 목록 승인일 `M월 D일`). 억지 통합 안 함 |

## 5. 선택한 공통 구조

`packages/store-ui-core/src/components/event-offers/` 에 **함수 단위 helper 2개**만 추가했다(신규 Core hook/컴포넌트 없음 — 필요가 없었다).

- `eventOfferCart.ts`
  - `EventOfferCartSource` (id · offerId · supplierId · productName 최소 계약)
  - `EventOfferCartPayload` (canonical `sourceType='event_offer'` payload)
  - `asUuid(v)` — uuid 형태만 보존, 아니면 null
  - `buildEventOfferCartPayload(item, quantity, resolvePrice)` — **가격 정책은 adapter 주입**. 공통 helper 가 가격을 정하지 않는다.
- `eventOfferStatus.ts`
  - `EventOfferStatusKey` (backend 계약 7상태 + legacy `approved`)
  - `EVENT_OFFER_STATUS_LABEL` / `resolveEventOfferStatusLabel(status)` — **UI 라벨 매핑만**. DB/API enum 은 건드리지 않았다.

## 6. 서비스별 적용

- **KPA**: `utils/eventOfferCart.ts` → 공통 helper wrapper(가격 = `eventPrice ?? unitPrice ?? generalPrice`, `CART_SERVICE_KEY='kpa-society'`). `KpaEventOfferPage.getStatusBadge` 는 라벨을 공통 매핑에서 받고 배지 style 만 유지(7-case switch → 3-case).
- **K-Cosmetics**: 동일 wrapper(가격 = `unitPrice ?? price`, `CART_SERVICE_KEY='k-cosmetics'`). 탐색 화면은 이미 공통 컴포넌트라 변경 없음.
- **GlycoPharm**: 공식 적용 대상 외지만 동일 helper 를 공유하므로 wrapper 만 동일하게 정리(동작 동일). 회귀 확인 완료.
- **공통 컴포넌트**: `EventOffersHubList` 의 `STATUS_BADGE` → `STATUS_BADGE_CLASS`(스타일) + 공통 라벨. 목록 필터(`active|approved` + `isActive`)와 그 밖의 동작은 변경 없음.
- **PharmacyHub**: **NOT_IMPLEMENTED** (§7 참조).

## 7. PharmacyHub 판정 — NOT_IMPLEMENTED

근거(모두 현재 코드 실측):

1. `services/web-pharmacy-hub` 에 이벤트 오퍼 page/route/API client 가 **0건**. `App.tsx` 에는 `'이벤트 오퍼 (pharmacy-hub-event-offer) — 후속'` 안내 문구만 있다(동작하는 척하는 표면 없음).
2. backend 에 pharmacy-hub 이벤트 오퍼 **컨트롤러·라우트 없음**. `pharmacy-hub.routes.ts` 는 `/service-info` 응답에 `eventOfferServiceKey` 를 **키만** 실어 준다.
3. `SERVICE_KEYS.PHARMACY_HUB_EVENT_OFFER` 는 등록돼 있으나 주석에 `키만 등록 — TARGET_TO_EVENT_OFFER_KEY 매핑 등록은 후속 이벤트 오퍼 WO` 라고 명시돼 있다.
4. 따라서 `TARGET_TO_EVENT_OFFER_KEY` · `STORE_SERVICE_KEY_MAP` 모두 pharmacy-hub 항목이 없어 **공급자가 제안할 수단 자체가 없고 OPL 원천 데이터가 생성될 수 없다.**

→ 화면을 붙이면 항상 빈 목록이 되는 placeholder 가 된다. WO §6 에 따라 가짜 entity/API/화면을 만들지 않았다.
**실현 조건**: `TARGET_TO_EVENT_OFFER_KEY` + `STORE_SERVICE_KEY_MAP` 에 pharmacy-hub 등록 → pharmacy-hub event-offer 컨트롤러 마운트(기존 `EventOfferService` 재사용, 신규 테이블 0) → 프론트는 `EventOffersHubList` 로 33줄이면 된다. 이는 backend 계약 추가이므로 별도 WO 가 맞다.

## 8. 상태 / 기간 처리 (§8·§9)

- **backend 가 authoritative**: `EventOfferService` 가 approved row 에 대해 `start_at`/`end_at`/`total_quantity` 로 `upcoming | active | sold_out | ended` 를 런타임 계산한다. 프론트는 날짜로 상태를 재판정하지 않으며, 이번에도 그런 로직을 새로 만들지 않았다.
- 공통화한 것은 **status 문자열 → 표시 라벨** 뿐이다. enum 값·필터 파라미터·조회 계약은 변경 없음.
- 문구 차이 1건 정렬: 허브 목록의 `pending` 라벨 `'대기중' → '대기'` (KPA 표기로 통일). 해당 목록은 `active|approved` 만 노출하므로 실제 화면 노출 경로가 없다.

## 9. 대상 상품 / 대상 매장 계약 (§10 — 변경 없음)

- **대상 상품**: 공급자 `supplier_product_offers`(SPO) → 대상 서비스 `organization_product_listings`(OPL) row. cart payload 는 `supplierProductOfferId = offerId`, `organizationProductListingId = eventOfferId = id` 로 **둘을 모두 보존**한다(기존 동작 유지).
- **대상 매장**: 특정 매장 지정이 아니라 **서비스 단위 노출**이다. `STORE_SERVICE_KEY_MAP` 이 event offer key → 매장 service_key 로 변환하고, 참여 시 해당 서비스 매장 진열 row 를 만든다. Neture 는 매핑 제외(지원 허브).
- 위 계약은 공통화 과정에서 변경하지 않았다.

## 10. 변경 파일

신규
- `packages/store-ui-core/src/components/event-offers/eventOfferCart.ts`
- `packages/store-ui-core/src/components/event-offers/eventOfferStatus.ts`

수정
- `packages/store-ui-core/src/index.ts` (export 추가)
- `packages/store-ui-core/src/components/event-offers/EventOffersHubList.tsx` (라벨 공통화)
- `services/web-kpa-society/src/utils/eventOfferCart.ts` (44L → wrapper)
- `services/web-k-cosmetics/src/utils/eventOfferCart.ts` (36L → wrapper)
- `services/web-glycopharm/src/utils/eventOfferCart.ts` (36L → wrapper)
- `services/web-kpa-society/src/pages/event-offer/KpaEventOfferPage.tsx` (상태 라벨 공통 매핑)

삭제된 중복: uuid 정규식 3벌 · payload 조립 3벌 · 상태 라벨 표 1.5벌.
**backend / DB / migration / route / 메뉴 변경 0건.** 신규 테이블·엔드포인트 0건.

## 11. 검증 결과

| 항목 | 결과 |
|---|---|
| `npx tsc -b` KPA / K-Cosmetics / GlycoPharm / PharmacyHub | 4/4 PASS |
| `npx vite build` KPA / K-Cosmetics / GlycoPharm / PharmacyHub | 4/4 PASS |
| Neture 회귀 (`npx tsc -b`) | PASS (코드 미변경, 공통 패키지 export 추가만) |
| 브라우저 smoke | **미수행** — 이벤트 오퍼 목록/담기 확인은 매장 소유자 계정 로그인 + 장바구니 write 가 필요하다. 프로덕션 write 는 CLAUDE.md §0 상 승인 대상이라 실행하지 않았다. 코드 경로상 payload·라벨은 기존과 동일 값을 만든다(가격 우선순위·uuid 처리·serviceKey 모두 보존). |

## 12. 남은 구조적 문제

1. **PharmacyHub 이벤트 오퍼 미구현** — §7 의 실현 조건대로 별도 WO 필요(backend 매핑 + 컨트롤러 마운트).
2. **KPA 탐색 화면 971L** — 상태 탭·필터·선택·묶음 담기 상태기계는 향후 `useSupplyProductList` 계열 headless Core 로 흡수할 여지가 있으나, 이번엔 KCos/GP 와 near-identical 이 아니라 보류했다.
3. **`EnrichedEventOffer` 타입이 backend 보다 좁다** — KCos/GP 의 status union 에 `upcoming`/`sold_out`/`rejected` 가 빠져 있다(런타임엔 올 수 있음). 타입만의 문제라 이번 범위 밖.
4. **`EventOffersHubList` 의 클라이언트 재필터** — API 가 이미 `status=active` 로 거르는데 `(active|approved) && isActive` 를 한 번 더 건다. `approved` 는 현재 파생 상태에 없는 legacy 값. 동작 보존을 위해 그대로 두었다.
5. **Neture 공급자 화면의 상태 라벨** — 관점이 달라 공통화 대상은 아니지만, 공급자 관점 라벨 표가 따로 관리된다는 사실은 기록해 둔다.

## 13. 다음 기능 제안

- `WO-O4O-PHARMACY-HUB-EVENT-OFFER-ENABLEMENT-V1` — 매핑 2곳 + 컨트롤러 마운트 + 33줄 화면.
- `WO-O4O-KPA-EVENT-OFFER-EXPLORER-HEADLESS-CORE-V1` — KPA 탐색 화면 상태기계 분리(위 2번).
- 이벤트 오퍼 응답 타입(`EnrichedEventOffer`)을 backend 계약과 일치시키는 타입 정합 WO(위 3번).

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
