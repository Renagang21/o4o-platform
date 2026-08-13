# CHECK — WO-O4O-STORE-HUB-PRODUCT-APPLICATION-AND-CART-COMMONIZATION-V1

- 작업일: 2026-08-13
- 작업공간: `C:\tmp\o4o-common-store-hub` (worktree) · branch `work/commonization-store-hub`
- 기준: 최신 `origin/main`
- 판정: **완료 (frontend 공통화 · backend/DB 무변경)**

---

## 1. 서비스별 상품 신청 계약

| 항목 | KPA-Society | K-Cosmetics | PharmacyHub |
|---|---|---|---|
| 화면 | `pages/pharmacy/HubB2BCatalogPage.tsx` (798L 자체 구현) | `pages/hub/HubB2BPage.tsx` (35L, 공통 `SupplyCatalogHub` 래퍼) | 없음 (신청 축 자체가 없음) |
| 신청 API | `applyBySupplyProductId(id)` → `/pharmacy/products/apply` | 동일 (`/cosmetics/pharmacy/products/*` 마운트) | — |
| backend | **공유 컨트롤러** `o4o-store/pharmacy-products.controller` | 동일 컨트롤러 | — |
| 신청 결과 | `ProductApproval` PENDING 생성 | 동일 | — |
| 중복 신청 | 에러코드 `DUPLICATE_APPLICATION` | 동일 | — |
| 신청 상태 표시 | 목록 행의 `isAdded` (backend 계산) | 동일 | — |
| 제외 | `cancelProductByOfferId(id)` | 동일 | — |
| 일괄 신청 | 단건 endpoint `Promise.allSettled` fan-out | 동일 | — |

**결론: 신청 축의 backend 는 이미 공통이다.** 중복은 프론트의 액션 상태 기계(진행 중 id · 토스트 문구 · 중복코드 처리 · 낙관적 `isAdded` 갱신 · 일괄 fan-out 집계)뿐이었고, 이번 WO 에서 그 부분만 공통화했다.

## 2. ProductApproval → OrganizationProductListing 경로

- 신청(`ProductApproval` PENDING) → 운영자/관리자 승인 → 승인 시 backend 가 `OrganizationProductListing`(주문 가능 상품) 생성. **이번 작업에서 이 경로·정책은 조회만 했고 변경하지 않았다.**
- 프론트의 `isAdded` 는 신청/취급 여부 표시용이며 승인 상태의 권위 판정이 아니다. 공통 Core 주석에 명시했다.
- 업무 경계 유지 확인: 상품 신청(ProductApproval) ≠ 주문 가능 상품(OPL) ≠ 장바구니(주문 준비) ≠ 매장 취급 상품(StoreLocalProduct). 공통화 과정에서 이 4 개념을 한 타입/한 컴포넌트로 합치지 않았다.

## 3. PharmacyHub 주문형 계약 (§4)

- 현재 축 = 공급 상품 → 상세 → 장바구니 → 주문. **ProductApproval 을 도입하지 않았다.**
- 장바구니 계약이 다른 3 서비스와 **호환되지 않는다**:
  - API: `lib/api/pharmacyHubOrders` (`fetchCart` / `updateCartItem` / `removeCartItem` / `createOrders`)
  - 주문 확정: `createOrders()` → `{ orders, paymentGroupId, failedItems }` → `/store-owner/payment?paymentGroupId=…` (결제 우선)
  - 3 서비스: `/store/cart/{serviceKey}/checkout-confirm` → 공급자별 `checkout_order` 즉시 생성 (결제 분리)
- 따라서 **cart Core(`useStoreCart`)를 PharmacyHub 에 적용하지 않았다.** 억지 통합은 주문·결제 계약 변경을 요구하므로 §10 금지 범위다. adapter 로 분리한 상태(각자의 API 계약 유지)로 남긴다.

## 4. 서비스별 장바구니 계약

canonical: `POST/GET /store/cart/{serviceKey}/items` · `GET /groups` · `PATCH|DELETE /items/:id` · `DELETE /store/cart/{serviceKey}` · `POST /checkout-confirm`

| 서비스 | serviceKey | client | 화면 |
|---|---|---|---|
| KPA-Society | `kpa-society` | `api/storeCart.ts` (coreApiClient, body 반환) | `pages/store-cart/StoreCartPage.tsx` (493L, 자체 디자인 시스템) |
| K-Cosmetics | `k-cosmetics` | `api/storeCart.ts` (authClient.api + `.data` 언랩) | `pages/store-cart/StoreCartPage.tsx` (282L, Tailwind pink) |
| GlycoPharm | `glycopharm` | 동일 형상 | `pages/store-cart/StoreCartPage.tsx` (283L, Tailwind teal) |
| Neture | `neture` | `lib/api/storeCart.ts` — 같은 base 를 쓰지만 **checkout-confirm-b2b + paymentGroupId(payment-first)** | 화면 적용 대상 아님 (§8) |
| PharmacyHub | — | `lib/api/pharmacyHubOrders` (별도 계약) | 위 3 항 |

- item 구조: `sourceType = regular | operator_approved | b2b | event_offer | seller_recruitment`, `pricingSource = regular | event_offer`.
- 금액은 **전부 서버 계산값**(`displaySubtotal` / `shipping.shippingFee` / `displayTotal`)이며 프론트에서 재계산하지 않는다. 공통 Core 도 서버 값 합산만 한다.

## 5. Event Offer 와 장바구니의 관계

- 이벤트 오퍼 담기는 기존 공통 `eventOfferCart` helper 가 `sourceType='event_offer'` 로 **동일한 canonical cart endpoint** 에 담는다. 이번 WO 는 이 payload helper 를 건드리지 않았다 (담기 경로 무변경).
- 장바구니 화면은 `sourceType === 'event_offer'` 를 '이벤트'로 표기하는 것 외에 일반 상품과 동일하게 처리한다 — 기존 동작 그대로 공통 View 로 옮겼다.
- 빈 장바구니 CTA 목적지(`/store-hub/event-offers`)는 서비스가 props 로 주입한다 (Core 가 라우트를 소유하지 않는다).

## 6. 실제 중복 (측정)

| 축 | 중복 실체 | 처리 |
|---|---|---|
| 장바구니 타입 | 동일 타입 블록 3벌 (~90L × 3) | `@o4o/store-ui-core` 로 이관 후 각 서비스에서 re-export |
| 장바구니 상태 기계 | `load / changeQty / remove / clearAll / confirmCheckout` + 합계 계산 3벌 | `useStoreCart` 1벌 |
| 장바구니 화면 | KCos 282L vs GP 283L — 실차이 38줄(accent · 결과 헤더 아이콘) | `StoreCartView` 1벌 (KPA 는 제외 — 디자인 시스템이 다름) |
| 신청 액션 상태 | `applyingId / removingId / bulkAdding` + 토스트 + 중복코드 + fan-out 집계 2벌 | `useSupplyProductApplication` 1벌 |

**공통화하지 않은 것 (의도적):** KPA 장바구니 View, KPA 카탈로그 페이지 전체(기능 상위집합 + 커스텀 제외 확인 다이얼로그), PharmacyHub 장바구니, GlycoPharm `pages/store/StoreCart.tsx` 와 Neture `pages/store/StoreCartPage.tsx`(둘 다 **소비자 storefront/키오스크 장바구니** — 매장 경영자 B2B 장바구니와 다른 도메인).

## 7. 선택한 공통화 구조

`@o4o/store-ui-core` 안에 3 계층으로 분리했다 (만능 컴포넌트 금지 원칙 준수).

```
components/store-cart/storeCartTypes.ts        타입 + StoreCartApi 구조적 계약(adapter)
components/store-cart/useStoreCart.ts          headless 상태 기계 (KPA · KCos · GP)
components/store-cart/StoreCartView.tsx        공통 View (KCos · GP 만)
components/supply-catalog/useSupplyProductApplication.ts   headless 신청/제외 상태 기계
```

- API 구현체는 서비스가 소유하고 Core 에는 **구조적 인터페이스로 주입**한다 (`StoreCartApi`, `SupplyProductApplicationApi`).
- 업무 정책(확인 UX · 라우팅 · 라벨)은 호출부/props 에 남겼다: 제외 확인은 KPA=커스텀 다이얼로그 / 공통 Hub=`window.confirm`, 토스트 명사는 `storeNoun`('내 약국' vs '내 매장').

## 8. 변경 파일

**신규 (4)**
- `packages/store-ui-core/src/components/store-cart/storeCartTypes.ts`
- `packages/store-ui-core/src/components/store-cart/useStoreCart.ts`
- `packages/store-ui-core/src/components/store-cart/StoreCartView.tsx`
- `packages/store-ui-core/src/components/supply-catalog/useSupplyProductApplication.ts`

**수정 (7)**
- `packages/store-ui-core/src/index.ts` — export 추가
- `packages/store-ui-core/src/components/supply-catalog/SupplyCatalogHub.tsx` — 신청 상태 → Core 위임
- `services/web-kpa-society/src/pages/pharmacy/HubB2BCatalogPage.tsx` — 신청 상태 → Core 위임 (View 유지)
- `services/web-{kpa-society,k-cosmetics,glycopharm}/src/api/storeCart.ts` — 타입 re-export (client 구현·endpoint 무변경)
- `services/web-{k-cosmetics,glycopharm}/src/pages/store-cart/StoreCartPage.tsx` — 공통 Core+View 래퍼(각 282/283L → 32L)
- `services/web-kpa-society/src/pages/store-cart/StoreCartPage.tsx` — `useStoreCart` 사용, 자체 View 유지

## 9. Route · Menu 연결 (§7)

- 기존 `/store-owner/*` URL 변경 없음. redirect 추가 없음.
- PharmacyHub `/store-hub` 진입점은 이미 공급 상품 → `/store-owner/products`, 장바구니 → `/store-owner/cart` 로 연결돼 있어 **추가 배선 불필요**.
- KPA / K-Cosmetics 의 `/store-hub` ↔ 장바구니 · B2B 카탈로그 연결도 기존 배선 그대로다. 실제 기능이 없는 항목을 새로 노출하지 않았다.

## 10. 검증 결과

| 항목 | 결과 |
|---|---|
| `packages/store-ui-core` typecheck | ✅ PASS |
| `services/web-kpa-society` `npx tsc -b` | ✅ PASS |
| `services/web-k-cosmetics` `npx tsc -b` | ✅ PASS |
| `services/web-glycopharm` `npx tsc -b` | ✅ PASS |
| `services/web-pharmacy-hub` `npx tsc -b` | ✅ PASS (무변경 회귀) |
| `services/web-neture` `npx tsc -b` | ✅ PASS (무변경 회귀) |
| `web-kpa-society` vite build | ✅ 27.21s |
| `web-k-cosmetics` vite build | ✅ 21.08s |
| `web-glycopharm` vite build | ✅ 24.46s |
| `web-pharmacy-hub` vite build | ✅ 13.28s |
| browser smoke | ⏸ **미수행** — 신청 · 수량변경 · 삭제 · 주문 확정은 **모두 production write** 경로다. CLAUDE.md §0 상 사용자 승인 없이 실행하지 않는다. 승인 시 KPA(`/store-hub` → B2B 카탈로그 신청 → `/store-cart` 수량/삭제) · K-Cosmetics 동일 · PharmacyHub(`/store-owner/cart`) 순으로 수행 가능. |

- 읽기 전용 회귀 근거: 4 서비스 build 통과 + 3 서비스 cart client 의 endpoint/payload 문자열 무변경(diff 상 타입 블록만 제거) + `useStoreCart` 가 기존 페이지의 가드(`quantity < 1 || busy`, `busy || groups.length === 0`, `confirming || busy || …`)와 토스트 문구를 그대로 옮김.

## 11. backend · DB · migration 변경 여부

**없음.** backend controller/service/entity/route 무변경, 신규 table 0, migration 0, 운영 데이터 write 0, 결제·주문 정책 변경 0. `ProductApproval` / `OrganizationProductListing` / `StoreLocalProduct` 의미 무변경. Agent C 영역(QR·POP·태블릿·사이니지·매장 콘텐츠) 미접촉.

## 12. 남은 매장허브 공통화 항목

1. **PharmacyHub 주문 축** — `createOrders`/paymentGroupId 계약이 canonical checkout-confirm 과 다르다. 통합하려면 주문·결제 backend 재설계가 필요하므로 별도 판단 대상(현재는 adapter 분리 유지).
2. **Neture B2B 장바구니** — 같은 endpoint 를 쓰지만 payment-first(`checkout-confirm-b2b`)라 View 공통화 대상이 아니다. 공급자 정책과 매장 신청 정책을 섞지 않는다.
3. **KPA 카탈로그 화면(798L)** — 기능 상위집합(진열 채널 · 승인 상품 조회 등)이라 `SupplyCatalogHub` 로 축소하지 않았다. 축소 여부는 별도 판단.
4. **소비자 storefront 장바구니 2벌**(GP `pages/store/StoreCart.tsx`, Neture `pages/store/StoreCartPage.tsx`) — 매장허브 축이 아닌 별도 도메인. 공통화 여부는 별도 트랙.
5. Store Hub 전체 잔여 공통화 감사 · route/menu 연결 정리 (Agent D 트랙 마감 항목).

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
