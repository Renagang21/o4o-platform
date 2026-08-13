# CHECK — WO-O4O-STORE-HUB-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1

- **작업일**: 2026-08-13
- **branch**: `work/commonization-store-hub` (worktree `C:\tmp\o4o-common-store-hub`)
- **성격**: 에이전트 D 매장허브 범위 **최종 감사 · 안전 정리 · 완료 판정**
- **결과**: 매장허브 공통화 트랙 **종료**. 실제 잔여 중복 1건 정리 + 진입점 결손 1건 연결. 신규 기능·DB·backend 계약 변경 0건.

---

## 1. 서비스별 최종 기능 매트릭스

| 기능 | KPA-Society | K-Cosmetics | PharmacyHub | 공통 Core | 판정 |
|---|---|---|---|---|---|
| 매장허브 홈 | `/store-hub` · `pages/pharmacy/StoreHubPage.tsx` | `/store-hub` · `pages/hub/KCosmeticsHubPage.tsx` | `/store-hub` · `pages/store-hub/StoreHubPage.tsx` | `StoreHubTemplate` (`@o4o/shared-space-ui`) | COMMONIZED |
| 공급 상품 탐색 | `/store-hub/b2b` · `HubB2BCatalogPage.tsx` (fuller UI) | `/store-hub/b2b` · `SupplyCatalogHub` | `/store-owner/products` · `SupplyProductExplorer` | `useSupplyProductList` · `SupplyProductExplorer` · `SupplyCatalogHub` | COMMONIZED (2 tier) |
| 공급자 콘텐츠 탐색 · 가져오기 | `/store-hub/{blog,pop,qr}` | `/store-hub/{blog,pop,qr}` | 없음 | `useHubImportLibrary` | COMMONIZED (View 는 REMAINING-DEBT) |
| 이벤트 오퍼 | `/store-hub/event-offers` | `/store-hub/event-offers` | 없음 | `EventOffersHubList` · `buildEventOfferCartPayload` · `resolveEventOfferStatusLabel` | COMMONIZED |
| 상품 신청 · 승인 진입 | `HubB2BCatalogPage` 신청 액션 | `SupplyCatalogHub` 신청 액션 | 도입하지 않음(정책) | `useSupplyProductApplication` | COMMONIZED |
| 매장허브 장바구니 | `/store-hub/cart` (전용 View) | `/store-hub/cart` (`StoreCartView`) | `/store-owner/cart` (별도 계약) | `storeCartTypes` · `createStoreCartApi` · `useStoreCart` · `StoreCartView` | COMMONIZED / PH 는 SERVICE-SPECIFIC-BY-DESIGN |
| 매장 실행 자산 관리(`/store/*`) | Agent C | Agent C | Agent C | — | OUT-OF-SCOPE |

- **GlycoPharm**: 공식 적용 대상 아님. 공통 package 소비(`storeCart` · `StoreCartView` · `SupplyCatalogHub`)만 유지하며 회귀 확인 대상.
- **Neture**: 공급자→매장 계약 확인 대상. 화면은 매장허브가 아니다(§8).

### write 의미 (변경 없음)

| 동작 | 의미 | backend |
|---|---|---|
| "내 매장에 추가" | **공급 상품 신청** = `ProductApproval` PENDING 생성 | `o4o-store/pharmacy-products.controller` (`/pharmacy/products/*`, `/cosmetics/pharmacy/products/*`) |
| 승인 이후 | 주문 가능 상품 = `OrganizationProductListing` 생성 (backend 정책) | 동일 |
| 장바구니 담기 | 주문 준비 상태 (신청 아님) | `/store/cart/{serviceKey}/items` |
| 주문 확정 | 공급자별 주문 생성 | `/store/cart/{serviceKey}/checkout-confirm` |
| 가져오기 | 공급자 **원본의 매장 사본** 생성 (원본 무변경) | hub import 계약 |

---

## 2. 매장허브 홈

- 3 서비스 모두 `StoreHubTemplate`(`@o4o/shared-space-ui`) 을 실제 소비한다. **서비스 전용 레이아웃 사본 0건.**
- 카드는 모두 실제 존재하는 route 로만 연결된다(데드링크 0). KPA 는 `renderMainSections` 슬롯 + `showHeroCta=false` 로 확장하고, 서비스별 차이는 카드 목록·storeCta 대상뿐이다.
- `/store-hub`(자원 탐색) 과 `/store-owner`·`/store`(내 매장 운영) 경계는 유지된다. storeCta 대상: KPA·KCos `/store`, PharmacyHub `/store-owner`.
- **발견된 결손 1건 — 이번에 연결**: PharmacyHub `/store-hub` 는 route 는 존재하나 서비스 전체에서 UI 링크가 0건이어서 직접 URL 로만 접근 가능했다.
  - `services/web-pharmacy-hub/src/layouts/StoreOwnerShell.tsx` — 공통 셸이 이미 제공하는 `navItems` 슬롯에 `{ label: '매장 허브', href: '/store-hub' }` 1건만 주입.
  - `services/web-pharmacy-hub/src/pages/store-owner/HomePage.tsx` — `SHORTCUTS` 에 동일 대상 1건 추가(상단바 nav 가 `hidden md:flex` 라 모바일 커버 목적).
  - **공통 메뉴 계약(`StoreDashboardConfig.sections`)은 확장하지 않았다.** `subPath` 는 `basePath`(`/store-owner`) 상대이므로 여기에 넣으면 존재하지 않는 `/store-owner/store-hub` 데드링크가 된다.

---

## 3. 공급 상품 탐색

- 공통 Core: `useSupplyProductList`(목록·필터·페이지 상태) · `SupplyProductExplorer`(기본 View) · `SupplyCatalogHub`(신청 액션 포함 Hub).
- KPA `HubB2BCatalogPage` 는 fuller UI(카테고리 트리 · 선택 일괄 신청 · 커스텀 제외 다이얼로그)를 유지하되, **신청·제외 상태 기계는 공통 `useSupplyProductApplication` 에 위임**한다. 남은 상태 중복 없음.
- 공통 API 를 KPA 요구에 맞춰 넓히면 K-Cosmetics·GlycoPharm 이 쓰지 않는 옵션이 늘어나므로, View 는 **2 tier 유지**가 최소 복잡성이다 → `SERVICE-SPECIFIC-BY-DESIGN`.

---

## 4. 공급자 콘텐츠 탐색 · 가져오기

- KPA · K-Cosmetics 의 blog / pop / qr 6 페이지 전부 `useHubImportLibrary` 소비(소비처 18건). 로컬 재구현 0건.
- 경계 유지 확인: 공급자 원본 ≠ 매장 사본 / 가져오기 write 는 사본 생성이며 원본을 변경하지 않음 / 가져온 이후 관리(`/store/*`)는 Agent C 영역이라 미접촉.
- **PharmacyHub**: 공급자 콘텐츠 원천이 없다 → `NOT_IMPLEMENTED` 유지. 가짜 화면·placeholder API 만들지 않음.
- 잔여: 6 페이지가 셸 구조를 약 60% 공유하지만 차이가 **UI 정책**이다 — KPA 는 `Pagination`(`@o4o/operator-ux-core`) 대신 prev/next 버튼, 정렬(`sortable`/`sortAccessor`)을 의도적으로 제거함(`WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1 (A-3)` 결정). 공통 View 화는 기계적 정리가 아니라 **UI 재조정**이므로 이번 범위에서 강행하지 않고 §7 에 debt 로 남긴다.

---

## 5. 이벤트 오퍼

- 상태 라벨은 `resolveEventOfferStatusLabel` / `EVENT_OFFER_STATUS_LABEL` 단일 출처. 기간·상태 판정은 **backend authoritative** 이며 frontend 재구현 없음(재중복 스캔 결과 0건).
- cart payload 는 `buildEventOfferCartPayload`(소비처 18건) 단일 경로. UUID 정규화(`asUuid`)도 공통 함수 하나만 존재하고 서비스는 re-export 만 한다(`services/web-k-cosmetics/src/utils/eventOfferCart.ts`).
- 서비스 로컬에 남은 것은 서비스 상수뿐이다: `CART_SERVICE_KEY`, 가격 우선순위(`o.unitPrice ?? o.price`) → 정상 adapter.
- PharmacyHub: `NOT_IMPLEMENTED` 유지.

---

## 6. 상품 신청 · 승인 진입

- 의미 무변경: 신청 = `ProductApproval`, 승인 후 주문 가능 = `OrganizationProductListing`. backend 계약·에러 코드(`DUPLICATE_APPLICATION`) 모두 그대로.
- 공통 `useSupplyProductApplication` 은 요청 전송과 목록의 `isAdded` 낙관적 표시만 담당하며 권위 판정을 하지 않는다(재조회 시 backend 값으로 대체).
- PharmacyHub 에 `ProductApproval` 을 도입하지 않았다(WO 정책).

---

## 7. 장바구니

- canonical(`/store/cart/{serviceKey}/*`) 과 PharmacyHub 계약(`createOrders()` → `paymentGroupId` → `/store-owner/payment`) 을 **섞지 않았다.** PharmacyHub 는 `lib/api/pharmacyHubOrders` 를 그대로 유지.
- **이번에 정리한 실제 잔여 중복 (1건)**: KPA · K-Cosmetics · GlycoPharm 3 서비스의 `src/api/storeCart.ts` 가 동일한 7개 endpoint 목록(경로·메서드·body·응답 형상)을 각각 복제하고 있었다. 차이는 **전송 계층뿐**이었다.
  - 신규 `packages/store-ui-core/src/components/store-cart/createStoreCartApi.ts` — endpoint 계약 단일 출처 + 주입용 `StoreCartHttp` 인터페이스.
  - 서비스 파일은 전송 어댑터만 소유: KPA 는 `coreApiClient`(body 직접 반환) 주입, KCos·GP 는 axios `.data` 언랩 주입.
  - **API 계약 무변경** — 경로·메서드·payload·응답 형상 모두 기존 구현과 동일. typecheck·build 로 회귀 확인.
- 소비자 storefront / 키오스크 장바구니는 대상 아님(미접촉).
- 중복 타입 · 중복 state machine · 중복 empty/error/loading · dead local cart helper · 사용하지 않는 re-export: **추가 발견 0건** (직전 WO 에서 이미 제거됨).

---

## 8. Route · Menu 진입 감사

| 서비스 | menu 항목 | `/store-hub` route | 결과 |
|---|---|---|---|
| KPA-Society | `PharmacyHubLayout` 12건 | 12건 (+ `multilingual-product-contents/my` 는 부모 화면에서 진입하는 하위 route) | **정확히 일치** — dead menu 0 / 은폐된 live route 0 |
| K-Cosmetics | `KCosmeticsHubLayout.HUB_MENU` 9건 | 9건 | **정확히 일치** |
| PharmacyHub | `PHARMACY_HUB_STORE_CONFIG` sections + 상단 navItems | `/store-hub` + `/store-owner/*` | 진입점 결손 1건 → §2 에서 연결 |

- legacy redirect 유지 확인: KPA `/hub`·`/hub/*` → `/store-hub`, `/event-offers` → `/store-hub/event-offers`, `commerce/orderable` → `/store-hub/b2b`; KCos `library/content` → `/store-hub/content`.
- 잘못된 basePath·subPath 0건 / 중복 route 0건.
- 고아 page 0건 — 초기 스캔에서 KPA `pages/pharmacy/*.tsx` 19건이 걸렸으나 전부 modal·component(`AddO4oStandardProductModal`, `TabletScreenSetManager` 등)로 확인. KCos·PharmacyHub 는 0건.
- Agent C 영역의 `/store/*` 관리 route 는 구조 변경하지 않았다.

---

## 9. 공통 package 감사

| package | 상태 |
|---|---|
| `@o4o/store-ui-core` | 트랙에서 추가한 export **전부 실소비처 존재** (`useHubImportLibrary` 18 · `buildEventOfferCartPayload` 18 · `SupplyCatalogHub` 14 · `useStoreCart` 8 · `StoreCartView` 6 · `EventOffersHubList` 6 · `useSupplyProductApplication` 2 · `SupplyProductExplorer`/`useSupplyProductList` 1+내부). unused export 0건 |
| `@o4o/shared-space-ui` | `StoreHubTemplate` · `ContentHubTemplate` 소유. 3 서비스 홈이 실제 소비 |

- 서비스 이름 하드코딩 · service policy 침투 · 거대한 분기: 발견 0건. 서비스 차이는 전부 props/config(`accent`, `labels.storeNoun`, `CART_SERVICE_KEY`, `emptyAction`)로 주입된다 → 공통 Core 는 service-neutral 유지.
- 4 web 서비스 모두 `noUnusedLocals` + `noUnusedParameters` 활성이며 typecheck 통과 → **dead import · dead local 0건**이 기계적으로 보장된다.

---

## 10. Neture 계약 확인 (화면 변경 없음)

- `services/web-neture/src/lib/api/storeCart.ts` 는 같은 base URL 을 쓰지만 **다른 계약**이다: `checkout-confirm-b2b`(결제 선행) + 자체 DTO(`StoreCartItemDto`, `SupplierGroupShippingDto`). canonical 매장 장바구니와 합치지 않는다.
- Neture 의 `ProductApprovalPage`(admin / operator)는 **공급자 상품 승인 축**이며 매장의 "공급 상품 신청" 과 다른 업무다. 혼합하지 않았다.
- `SupplierProductOffer` / `EventOffer` / service scope 계약은 매장허브 소비 측 기준으로 정합. Neture 화면을 Store Hub 로 바꾸지 않았다.
- Neture typecheck 통과(회귀 없음). `@o4o/store-ui-core` 소비는 `MediaPickerModal` 1건뿐으로 이번 변경과 무관.

---

## 11. backend · DB · migration 변경 여부

**변경 0건.** DB schema · migration · seed · 운영 데이터 write · backend 계약 · 권한/route 계약 모두 미변경. 이번 WO 는 frontend 공통화·정리와 진입점 연결만 수행했다.

---

## 12. 검증 결과

| 항목 | 결과 |
|---|---|
| typecheck `@o4o/store-ui-core` | PASS |
| typecheck `web-kpa-society` | PASS |
| typecheck `web-k-cosmetics` | PASS (1차 실패 → 수정 후 PASS, 아래 참조) |
| typecheck `web-glycopharm` | PASS (1차 실패 → 수정 후 PASS) |
| typecheck `web-pharmacy-hub` | PASS |
| typecheck `web-neture` | PASS |
| build `web-kpa-society` | PASS (28.64s) |
| build `web-k-cosmetics` | PASS (19.40s) |
| build `web-glycopharm` | PASS (20.17s) — 공식 적용 대상 아님, 회귀 확인 목적 |
| build `web-pharmacy-hub` | PASS (16.00s) |

- **1차 실패 내용(숨기지 않고 기록)**: KCos·GP 의 `StoreCartHttp` 어댑터를 화살표 함수로 작성하자 대상 시그니처의 제네릭 `T` 가 추론되지 않아 `TS2322: Type 'Promise<unknown>' is not assignable to type 'Promise<T>'` 4건씩 발생. 각 메서드에 제네릭을 명시(`get: <T,>(url: string) => axiosApi.get<T>(url)…`)하여 해소.
- **browser smoke: 미수행.** 사유 — (1) 변경이 `work/commonization-store-hub` branch 에 있고 배포본(production)은 `main` 기준이라 이번 변경을 반영하지 않는다. (2) 신청·가져오기·장바구니 변경·주문 경로는 production write 이므로 승인 없이 실행하지 않는다(CLAUDE.md §0). 대신 route↔menu 정적 대조(§8), typecheck, 4 서비스 production build 로 회귀를 확인했다.
- 남은 검증 권장: branch 배포 또는 로컬 dev 기동 후 KPA `/store-hub`·`/store-hub/b2b`·`/store-hub/event-offers`, KCos `/store-hub`·`/store-hub/b2b`, PharmacyHub `/store-owner`(상단 "매장 허브" 링크)·`/store-hub`·`/store-owner/products`·`/store-owner/cart` read-only 진입 확인.

---

## 13. 이번 cleanup 내용 (변경 파일)

| 파일 | 내용 |
|---|---|
| `packages/store-ui-core/src/components/store-cart/createStoreCartApi.ts` (신규) | canonical cart endpoint 계약 단일 출처 + `StoreCartHttp` 주입 인터페이스 |
| `packages/store-ui-core/src/index.ts` | `createStoreCartApi` · `StoreCartHttp` · `StoreCartApiClient` export |
| `services/web-kpa-society/src/api/storeCart.ts` | endpoint 복제 제거 → `coreApiClient` 주입만 |
| `services/web-k-cosmetics/src/api/storeCart.ts` | endpoint 복제 제거 → axios `.data` 언랩 어댑터만 |
| `services/web-glycopharm/src/api/storeCart.ts` | 동일 |
| `services/web-pharmacy-hub/src/layouts/StoreOwnerShell.tsx` | `/store-hub` 진입점 `navItems` 1건 |
| `services/web-pharmacy-hub/src/pages/store-owner/HomePage.tsx` | `/store-hub` 바로가기 1건(모바일 커버) |

하지 않은 것: 대형 UI 재설계 / 업무 기능 추가 / DB·migration / backend 계약 재설계 / 서비스별 정책 변경 / Agent C 영역 리팩터링.

---

## 14. 최종 완료 판정

| 영역 | 판정 |
|---|---|
| 매장허브 홈 (3 서비스) | **COMMONIZED** |
| 공급 상품 탐색 — 상태·신청 Core | **COMMONIZED** |
| 공급 상품 탐색 — KPA fuller View | **SERVICE-SPECIFIC-BY-DESIGN** (공통 API 비대화 방지) |
| 공급자 콘텐츠 탐색·가져오기 — 데이터 Core | **COMMONIZED** |
| 이벤트 오퍼 (라벨·payload·UUID·상태 판정) | **COMMONIZED** |
| 상품 신청·승인 진입 | **COMMONIZED** (backend 의미 무변경) |
| 매장허브 장바구니 (KPA·KCos·GP) | **COMMONIZED** (타입·endpoint·state machine·View) |
| PharmacyHub 장바구니·주문 | **SERVICE-SPECIFIC-BY-DESIGN** (paymentGroupId 결제 계약) |
| PharmacyHub 공급자 콘텐츠 · 이벤트 오퍼 · ProductApproval | **NOT_IMPLEMENTED** (원천/정책 부재 — 가짜 화면 없음) |
| Neture 매장 장바구니·승인 화면 | **SERVICE-SPECIFIC-BY-DESIGN** (계약만 확인) |
| GlycoPharm | **OUT-OF-SCOPE** (공통 package 소비·build 회귀만 확인, PASS) |
| Agent C `/store/*` 관리 영역 | **OUT-OF-SCOPE** |
| hub-import 6 페이지 공통 View | **REMAINING-DEBT** |

### REMAINING-DEBT (실제 유지보수 위험만)

1. **hub-import 6 페이지(KPA·KCos × blog/pop/qr) 셸 중복** — 데이터 계층은 `useHubImportLibrary` 로 통일됐으나 표·페이지네이션·빈 상태 마크업이 6곳에 남아 있다. 위험: 가져오기 UX 변경 시 6곳 동시 수정 필요.
   범위: 공통 `HubImportLibraryView` 도입 + 페이지네이션 위젯(Pagination vs prev/next) · 정렬 정책(KPA 는 의도적 제거) **UI 정책 결정 선행**. 정책 합의 없이 통합하면 KPA 의 기존 결정을 되돌리게 되므로 별도 WO 필요.

그 외 서비스별 accent·문구('내 약국' vs '내 매장')·아이콘 차이는 정상 정책 차이이므로 debt 로 잡지 않는다.

---

## 15. 에이전트 D 담당 범위 최종 완료 여부

**완료.** 매장허브 홈 / 공급 상품 탐색 / 공급자 콘텐츠 탐색·가져오기 / 이벤트 오퍼 / 상품 신청 진입 / 장바구니 / route·menu 진입 — 전 영역이 "공통 Core + 서비스별 최소 adapter·config" 형태이거나, 의도적 서비스별 유지 사유가 위 §14 에 기록됐다. **이후 에이전트 D 기능별 공통화 WO 는 종료한다.** 남은 항목은 §14 REMAINING-DEBT 1건뿐이며 별도 WO 대상이다.

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (hub-import 공통 View)
