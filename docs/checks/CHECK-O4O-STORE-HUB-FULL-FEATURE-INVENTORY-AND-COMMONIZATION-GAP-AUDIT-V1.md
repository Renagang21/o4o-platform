# CHECK — WO-O4O-STORE-HUB-FULL-FEATURE-INVENTORY-AND-COMMONIZATION-GAP-AUDIT-V1

- **작업일**: 2026-08-13
- **branch**: `work/commonization-store-hub` (worktree `C:\tmp\o4o-common-store-hub`, 시작 시 clean · origin/main 대비 7 ahead / 0 behind)
- **성격**: 조사 전용(전수조사 + gap 판정). 대규모 구현 없음.
- **핵심 결론**: 직전 CHECK(`CROSSSERVICE-FINAL-...-V1`)의 "매장허브 트랙 종료" 판정은 **모집단을 과소 설정한 상태의 판정**이었다. 실제 모집단은 32 기능이며 그중 **완전 공통은 7 (22%)** 이다. 알고 있던 작업 목록 완료 ≠ 전체 영역 완료.

---

## 1. 조사 방법

1. **route 전수 추출** — 4 서비스 `App.tsx` 의 `path=` 전량(KPA 224 · KCos 180 · GP 236 · PH 37)에서 Store Hub 연결 축을 선별. `/store-hub/*` URL 만 보지 않고 PharmacyHub `/store-owner/*` 처럼 **다른 URL 아래 같은 업무**를 수행하는 route 를 포함.
2. **page → Core 소비 매핑** — 각 화면 파일에서 `useHubImportLibrary` · `SupplyCatalogHub` · `EventOffersHubList` · `useSupplyProductList` · `SupplyProductExplorer` · `useStoreCart` · `StoreCartView` · `useSupplyProductApplication` · `StoreHubTemplate` · `ContentHubTemplate` 실사용 여부를 기계적으로 스캔(파일 크기 동반 기록).
3. **사본 정량화** — 서비스 간 동일 업무 화면·API client 를 `diff` 라인 수로 측정해 "유사 사본" 여부를 수치로 판정.
4. **API client 전수** — 4 서비스 `src/api/**` · `src/lib/api/**` 파일 목록을 대조해 동명 client 중복을 식별.
5. **backend 대조** — `apps/api-server/src/routes/**` 에서 factory controller mount(`createXController`) 와 서비스 전용 controller 를 구분.
6. **menu ↔ route 대조** — 각 서비스 hub layout / `storeMenuConfig` 항목과 실제 route 를 1:1 대조(데드링크·은폐 route).
7. **미조사 0 보장** — 선별된 모든 route·page 를 §3 매트릭스의 기능 행에 배정하고, 배정되지 않은 잔여 0 을 §8 에서 명시.

---

## 2. 전체 기능 모집단 (32)

route 개수(총 677)가 아니라 **사용자 업무 기능 단위**로 묶었다. 그룹:

| 그룹 | 기능 수 |
|---|---|
| A. 허브 진입 · 셸 | 4 |
| B. 공급 상품 · 신청 | 5 |
| C. 이벤트 오퍼 | 3 |
| D. 장바구니 · 거래 | 5 |
| E. 공급자 콘텐츠 탐색 · 가져오기 | 9 |
| F. API client · backend | 4 |
| G. 인접 도메인 | 2 |
| **합계** | **32** |

---

## 3. 서비스별 대응 매트릭스 + 판정

표기: 파일 뒤 `NNNL` = 라인 수. `—` = 미구현.

### A. 허브 진입 · 셸

| # | 기능 | KPA | K-Cosmetics | PharmacyHub | GlycoPharm | 공통 Core | 판정 |
|---|---|---|---|---|---|---|---|
| A1 | 매장허브 홈 화면 | `/store-hub` `StoreHubPage` 60L | `/store-hub` `KCosmeticsHubPage` 128L | `/store-hub` `StoreHubPage` 88L | `/store-hub` `StoreHubPage` 128L | `StoreHubTemplate` (shared-space-ui) | **FULLY_COMMON** |
| A2 | 홈 최신 자원 피드 | `StoreHubLatestFeed` 540L | — | — | — | 없음 | **SERVICE_SPECIFIC** |
| A3 | 허브 레이아웃 · 사이드바 | `PharmacyHubLayout` 390L | `KCosmeticsHubLayout` 233L | `StoreDashboardLayout`(store-ui-core) | `GlycoPharmHubLayout` 234L | PH 만 공통 셸 | **VIEW_DUPLICATED** |
| A4 | 허브 접근 가드 | `HubGuard` | `RoleGuard(allowedRoles)` | `StoreOwnerShell` | `GlycoHubGuard` | 없음 | **SERVICE_SPECIFIC** |

- A1: 4 서비스 전부 공통 템플릿 소비, 차이는 카드 목록·storeCta 뿐 → 공통.
- A3: KCos↔GP 레이아웃 `diff` **94 라인**(233/234L 중) → 실질 사본. KPA 는 확장(12 메뉴), PH 는 이미 공통 셸 사용.
- A4: role 체계가 서비스마다 다르므로(약사 자격 / cosmetics scope / enrollment) 의도적 분리.

### B. 공급 상품 · 신청

| # | 기능 | KPA | K-Cosmetics | PharmacyHub | GlycoPharm | 공통 Core | 판정 |
|---|---|---|---|---|---|---|---|
| B1 | 공급 상품 탐색(목록·검색·필터) | `HubB2BCatalogPage` 728L | `HubB2BPage` 35L | `ProductsPage` 180L | `HubB2BCatalogPage` 35L | `useSupplyProductList` · `SupplyProductExplorer` · `SupplyCatalogHub` | **CORE_ONLY** |
| B2 | 공급 상품 상세 | — | — | `ProductDetailPage` 247L | — | 없음 | **SERVICE_SPECIFIC** |
| B3 | 상품 신청 · 제외 액션 | `HubB2BCatalogPage` 내 | `SupplyCatalogHub` 내 | — (정책상 미도입) | `SupplyCatalogHub` 내 | `useSupplyProductApplication` | **CORE_ONLY** |
| B4 | 신청 상태 조회 | `StoreProductRequestsListModal` | — | — | — | 없음 | **SERVICE_SPECIFIC** |
| B5 | 신규 상품 요청 | `StoreNewProductRequestModal` | — | — | — | 없음 | **SERVICE_SPECIFIC** |

- B1: 상태·API 는 공통, **View 는 728L vs 35L 2 tier**. FULLY_COMMON 아님.
- B2: PH 단독 구현. KPA/KCos/GP 는 목록에서 바로 신청하므로 상세 화면 자체가 없다 → 공통화 대상 아님(기능 격차로 기록).
- B3: 액션 상태 기계는 공통, 버튼·확인 UX 는 서비스별.

### C. 이벤트 오퍼

| # | 기능 | KPA | K-Cosmetics | PharmacyHub | GlycoPharm | 공통 Core | 판정 |
|---|---|---|---|---|---|---|---|
| C1 | 이벤트 오퍼 탐색 목록 | `KpaEventOfferPage` **969L** (공통 View 미사용) | `HubEventOffersPage` 33L | — | `HubEventOffersPage` 33L | `EventOffersHubList` | **VIEW_DUPLICATED** |
| C2 | 오퍼 → 장바구니 payload | 공통 | 공통 | — | 공통 | `buildEventOfferCartPayload` · `asUuid` | **FULLY_COMMON** |
| C3 | 오퍼 상태 라벨 | 공통 | 공통 | — | 공통 | `resolveEventOfferStatusLabel` | **FULLY_COMMON** |

- C1: **직전 CHECK 의 "이벤트 오퍼 COMMONIZED" 판정을 정정한다.** KPA 969L 페이지는 `@o4o/store-ui-core` 에서 `resolveEventOfferStatusLabel` **하나만** 가져오고 목록·필터·담기·자체 주문 흐름(`OrderResult`)을 전부 로컬로 갖고 있다. KCos↔GP 만 33L 어댑터로 동일(diff 6 라인 — 서비스명·api·accent 뿐).

### D. 장바구니 · 거래

| # | 기능 | KPA | K-Cosmetics | PharmacyHub | GlycoPharm | 공통 Core | 판정 |
|---|---|---|---|---|---|---|---|
| D1 | 장바구니 타입 · endpoint · 상태 | 공통 | 공통 | 별도 계약 | 공통 | `storeCartTypes` · `createStoreCartApi` · `useStoreCart` | **FULLY_COMMON** |
| D2 | 장바구니 화면 | `StoreCartPage` 423L | 31L (`StoreCartView`) | `CartPage` 289L | 31L (`StoreCartView`) | `StoreCartView` | **CORE_ONLY** |
| D3 | 주문 확정(checkout) | `/store/cart/{k}/checkout-confirm` | 동일 | `createOrders()`+`paymentGroupId` | 동일 | backend `cart/store-cart.routes.ts` 단일 | **FULLY_COMMON** |
| D4 | 주문 내역 · 상세 | `/store/commerce/orders` `StoreOrdersPage` | `/store/commerce/orders` `StoreOrdersPage` | `/store-owner/orders` + `/:orderId` | `/store/commerce/orders` `PharmacyOrders` | 없음 | **VIEW_DUPLICATED** |
| D5 | 결제 | — | — | `PaymentPage`·`Success`·`Fail` (Toss) | — | 없음 | **SERVICE_SPECIFIC** |

- D1/D3: backend 는 `cart/store-cart.routes.ts` **단일 라우터**(7 endpoint), frontend 는 이번 트랙에서 `createStoreCartApi` 로 수렴 → 진짜 공통.
- D2: KPA 423L · PH 289L 은 여전히 자체 View.
- D4: 4 서비스 각자 주문 목록 화면. **장바구니 하류인데 공통화 시도 이력 없음.**

### E. 공급자 콘텐츠 탐색 · 가져오기

| # | 기능 | KPA | K-Cosmetics | PharmacyHub | GlycoPharm | 공통 Core | 판정 |
|---|---|---|---|---|---|---|---|
| E1 | 콘텐츠 탐색(content) | `HubContentLibraryPage` 216L | `HubContentPage` 124L | — | `HubContentListPage` 125L | `ContentHubTemplate` | **FULLY_COMMON** |
| E2 | 콘텐츠 상세 | — | `/library/content/:id` `ContentLibraryDetailPage` | — | `/hub/content/:id` `HubContentDetailPage` 101L | 없음 | **VIEW_DUPLICATED** |
| E3 | 블로그 진열 · 가져오기 | 315L ✅Core | 279L ✅Core | — | 320L ❌Core 미사용 | `useHubImportLibrary` | **CORE_ONLY** |
| E4 | POP 진열 · 가져오기 | 294L ✅Core | 286L ✅Core | — | 331L ❌ | `useHubImportLibrary` | **CORE_ONLY** |
| E5 | QR 진열 · 가져오기 | 305L ✅Core | 279L ✅Core | — | 324L ❌ | `useHubImportLibrary` | **CORE_ONLY** |
| E6 | 사이니지 미디어 진열 · 가져오기 | `HubSignageLibraryPage` **652L** | `HubSignagePage` **579L** | — | `HubSignageLibraryPage` **580L** | **없음** | **VIEW_DUPLICATED** |
| E7 | 동영상 진열 · 가져오기 | `HubVideoLibraryPage` 368L | — | — | — | 없음 | **SERVICE_SPECIFIC** |
| E8 | 태블릿 화면세트 진열 · 가져오기 | `HubScreenSetLibraryPage` 519L | — | — | — | 없음 | **SERVICE_SPECIFIC** |
| E9 | 다국어 상품 콘텐츠 진열 + 내 목록 | 285L + 161L | — | — | — | 없음 | **SERVICE_SPECIFIC** |

- E3~E5: **GlycoPharm 3 페이지(975L)가 Core 미소비 사본으로 남아 있다.** KCos↔GP diff = blog 198 / pop 224 / qr 229 라인 → 서비스명·accent·경로 수준 차이. 직전 CHECK 는 "6 페이지 전부 Core 소비"라고 적었는데 그 문장의 범위는 KPA+KCos 였고 **GP 3 페이지가 모집단에서 빠져 있었다.**
- E6: **가장 큰 미착수 중복.** 3 서비스 1,811L, 공통 Core 0. KCos↔GP diff **108 라인**(579/580L 중) → 사실상 동일 화면.

### F. API client · backend

| # | 기능 | KPA | K-Cosmetics | PharmacyHub | GlycoPharm | 판정 |
|---|---|---|---|---|---|---|
| F1 | 매장허브 API client 군 | 9 파일 | 8 파일 | 별도 14 파일 | 9 파일 | **VIEW_DUPLICATED** (client 사본) |
| F2 | 공용 backend controller | `createStoreHubController('kpa')` 등 factory | `('cosmetics')` | 미사용 | `('glycopharm')` | **FULLY_COMMON** |
| F3 | PharmacyHub backend controller 군 | — | — | `PharmacyHubStore*Controller` 전용 (`pharmacy-hub.routes.ts` 567L) | — | **SERVICE_SPECIFIC** |
| F4 | Event Offer backend controller | `kpa/...` 142L | `cosmetics/...` 381L | — | `glycopharm/...` 107L | **SERVICE_SPECIFIC** |

F1 실측 (라인 수 / KCos↔GP diff):

| client | KPA | KCos | GP | diff(KCos,GP) |
|---|---|---|---|---|
| `storeHub.ts` | 207 | 139 | 118 | 81 |
| `eventOffer.ts` | 90 | 83 | 76 | 40 |
| `pharmacyProducts.ts` | 272 | 83 | 102 | 69 |
| `blogStaff.ts` | 183 | 164 | 169 | **20** |
| `popStaff.ts` | 141 | 134 | 143 | 38 |
| `qrStaff.ts` | 93 | 72 | 93 | 48 |
| `storeExecutionAssets.ts` | 156 | 75 | 75 | **20** |
| `storeLibrary.ts` | 156 | 48 | 131 | 108 |
| `hubContent.ts` | 48 | — | 37 | — |

`blogStaff.ts`(20/165) · `storeExecutionAssets.ts`(20/75) 는 거의 동일 사본이다. **backend 는 이미 factory 로 공통인데 client 만 3벌**이라는 비대칭이 F1 의 핵심이다 — `createStoreCartApi` 로 검증된 패턴을 그대로 확장할 수 있다.

F3: PharmacyHub 는 `store_pops` · `store_qr_codes` · `kpa_store_contents` · `store_execution_assets` 등 **같은 테이블을 쓰면서 controller 를 따로 갖는다**(`o4o-store/controllers/store-pop.controller.ts` 주석: "pharmacy-hub mount 는 아직 없다"). 원장은 공유, 접근 경로는 별도.

### G. 인접 도메인

| # | 기능 | 범위 | 판정 |
|---|---|---|---|
| G1 | 매장 실행 자산 관리 (KPA `/store/*` · KCos `/store/*` · GP `/store/*` · PH `/store-owner/{content,library,blog,qr,pop,signage,tablets,manuals}`) | Agent C 축 | **OUT_OF_SCOPE** |
| G2 | 매장 제품·정보·계정 (`handled-products` · `local-products` · `my-products` · `info` · `account`) | 매장 운영 축 | **OUT_OF_SCOPE** |

- G1 관측(수정 아님): PharmacyHub 는 실행 자산 화면 8종(QR 617L · POP 458L · Signage 420L · Content 291L · Blog 175L+153L · Library 100L+383L · Tablets 400L · Manuals 134L+174L)을 **자체 구현**했다. Agent C 가 KPA/KCos/GP 를 대상으로 진행한 공통화의 모집단에 PharmacyHub 가 들어있지 않다. Store Hub 축은 아니지만 **전사 공통화 판정에 영향**을 주므로 기록한다.

---

## 4. 공통 Core / View / API 현황

| 공통 surface | 소유 package | 실제 커버 범위 | 커버 못 하는 것 |
|---|---|---|---|
| `StoreHubTemplate` | shared-space-ui | 허브 홈 4/4 서비스 | 홈 최신 피드(KPA 전용 540L) |
| `ContentHubTemplate` | shared-space-ui | 콘텐츠 탐색 3/3 + Neture 라이브러리 | 콘텐츠 **상세**(KCos·GP 사본) |
| `useSupplyProductList` · `SupplyProductExplorer` | store-ui-core | PH 목록 화면 · `SupplyCatalogHub` 내부 | KPA 728L 화면(상태만 위임) |
| `SupplyCatalogHub` | store-ui-core | KCos · GP 공급 상품 화면 | KPA · PH |
| `useSupplyProductApplication` | store-ui-core | 신청·제외 액션 2 소비처 | 신청 상태 조회 · 신규 요청(KPA 전용) |
| `useHubImportLibrary` | store-ui-core | **6 페이지**(KPA 3 + KCos 3) | **GP 3 페이지 · 사이니지 3 · 동영상 · 화면세트 · 다국어** |
| `EventOffersHubList` | store-ui-core | KCos · GP (2 페이지) | KPA 969L |
| `buildEventOfferCartPayload` · `eventOfferStatus` | store-ui-core | 3 서비스 전부 | — |
| `storeCartTypes` · `useStoreCart` · `createStoreCartApi` | store-ui-core | KPA · KCos · GP 전부 | PH(별도 계약) |
| `StoreCartView` | store-ui-core | KCos · GP | KPA 423L · PH 289L |
| backend factory controller | api-server `o4o-store/controllers` | KPA · KCos · GP 전 축 | PharmacyHub(전용 controller 군) |

**정정**: 직전 CHECK 의 소비처 수치(`useHubImportLibrary` 18 · `buildEventOfferCartPayload` 18 등)는 `grep -rn` **라인 히트 수**였다. 실제 **페이지 소비처는 각각 6 · 3** 이다. 이 수치가 커버리지를 과대 표시했다.

---

## 5. 지금까지 완료된 WO 가 실제로 커버한 범위

| 완료 WO | 실제 커버 | 모집단 대비 |
|---|---|---|
| PharmacyHub 매장허브 홈 도입 | A1 | 1/32 |
| 공급 상품 탐색 공통화 | B1 상태·API + PH 화면 | 부분 |
| 공급자 콘텐츠 탐색 공통화 | E1 + E3~E5 의 KPA·KCos 데이터 계층 | 부분 (GP 제외) |
| 이벤트 오퍼 공통화 | C2 · C3 + KCos/GP 의 C1 | 부분 (KPA 제외) |
| 상품 신청 · 장바구니 공통화 | B3 · D1 · D2(KCos/GP) | 부분 |
| 최종 감사 · 정리 | D1 endpoint 수렴 · PH 진입점 | — |

**요약**: 완료 WO 들은 "다룬 기능 안에서는" 정확했으나, 다룬 기능이 모집단의 절반 이하였다. 특히 **사이니지(E6) · 주문 내역(D4) · API client(F1) · GP 편입(E3~E5) · 허브 레이아웃(A3)** 은 어떤 WO 의 범위에도 들어간 적이 없다.

---

## 6. UI 중복 잔존 현황 (§5 UI 공통화 확인)

| 축 | 상태 |
|---|---|
| 상태 Core 공통화 | 장바구니 ✅ / 신청 ✅ / 공급목록 ✅ / hub-import 부분(GP 제외) / 사이니지 ❌ / 주문 ❌ / 이벤트(KPA) ❌ |
| View · Shell 공통화 | 장바구니 부분 / 이벤트 부분 / hub-import ❌ / 사이니지 ❌ / 레이아웃 ❌ / 주문 ❌ |
| 컬럼 차이 | KPA hub-import 는 정렬 컬럼 제거(`WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1 A-3` 결정), KCos·GP 는 `sortable` 유지 |
| accent 차이 | blue(KPA) / pink(KCos) / teal(GP) — **prop 으로 흡수 가능** |
| 문구 차이 | '내 약국' vs '내 매장' — **label prop 으로 흡수 가능** |
| pagination 차이 | KPA prev/next 버튼 vs KCos·GP `Pagination`(operator-ux-core) — **mode prop 으로 흡수 가능** |
| optional section 차이 | KPA 홈 최신 피드 · KPA 카테고리 트리 — **slot 으로 흡수 가능** |
| action 차이 | 가져오기 / 담기 / 신청 — **action adapter 로 흡수 가능** |

→ 관측된 UI 차이는 **전부 accent · label · column config · slot · action adapter · pagination mode 범위**다. 업무 모델 차이로 인한 분리는 A4(가드) · B2/D5(PH 전용 상세·결제) · F3(PH backend) 뿐이다. 따라서 E3~E6 · C1 · D2 · D4 · A3 는 `SERVICE_SPECIFIC` 이 아니라 **정리 가능한 중복**이다.

---

## 7. PharmacyHub 특수 계약

| 항목 | 내용 | 판정 |
|---|---|---|
| 장바구니·주문 | `createOrders()` → 공급자별 주문 N건 + `paymentGroupId` → `/store-owner/payment` | 정당한 분리 |
| 결제 | Toss `prepare` → 결제창 → `confirm`. 금액은 prepare 응답만 사용 | 정당한 분리 |
| 상품 신청 | `ProductApproval` 미도입 — 공급자 offer 를 바로 구매 | 정책상 미도입 |
| 공급자 콘텐츠 · 이벤트 오퍼 | 원천 없음 | NOT_IMPLEMENTED (가짜 화면 없음 — 유지) |
| backend | 전용 `PharmacyHub*Controller` 군, 공용 factory 미사용 (테이블은 공유) | 기록 — 별도 판단 필요 |
| 실행 자산 8 화면 | 자체 구현. Agent C 공통화 모집단에 미포함 | 기록 |

---

## 8. GlycoPharm / Neture 참조 결과

**GlycoPharm** — "공식 적용 대상 제외"로 취급해 왔으나 **구조적으로는 KCos 와 동일한 store-hub 9 route 를 가진 완전 참여 서비스**다. 이 제외 때문에 E3~E5 에서 Core 미소비 사본 3개(975L)가 남았고, A3·F1 중복도 GP 몫이 그대로다. → 후속 작업에서는 **참조가 아니라 대상**으로 포함해야 중복이 실제로 줄어든다.

**Neture** — 공급자→매장 원천 계약. `lib/api/storeCart.ts` 는 같은 base URL 이지만 `checkout-confirm-b2b`(결제 선행) + 자체 DTO 로 **다른 계약**이다. `ProductApprovalPage`(admin/operator)는 공급자 상품 승인 축이며 매장의 "공급 상품 신청" 과 다른 업무다. `ContentHubTemplate` 을 라이브러리 화면에서 소비하는 것 외에 Store Hub 공통 surface 소비 없음. **매장허브로 전환할 대상 아님** — 계약 확인만.

---

## 9. 미조사 0 증명

| 축 | 대상 수 | 배정 |
|---|---|---|
| KPA `/store-hub` 하위 route | 14 | A1 · B1 · C1 · D2 · E1 · E3 · E4 · E5 · E6 · E7 · E8 · E9(2) + index |
| KCos `/store-hub` 하위 route | 9 | A1 · B1 · E1 · E6 · E3 · E4 · E5 · C1 · D2 |
| GP `/store-hub` 하위 route | 9 | 동일 배정 |
| PH `/store-hub` + `/store-owner` route | 1 + 20 | A1 · B1 · B2 · D2 · D4 · D5(3) · G1(11) · G2(4) |
| 서비스 밖 연결 route (콘텐츠 상세 · 주문 목록 · legacy redirect) | 11 | E2 · D4 · A1(redirect) |
| 허브 layout · guard · 홈 피드 컴포넌트 | 8 | A2 · A3 · A4 |
| 신청 관련 modal (KPA) | 2 | B4 · B5 |
| 매장허브 API client | 40 | F1 |
| backend controller · router | 6 | F2 · F3 · F4 |

**배정되지 않은 Store Hub 연결 route/page/component: 0.** 모든 항목이 32 기능 중 하나에 속한다.

---

## 10. 최종 숫자

### 기능 단위 (모집단 32)

```text
전체 모집단: 32

FULLY_COMMON:     7   (22%)
CORE_ONLY:        6   (19%)
VIEW_DUPLICATED:  6   (19%)
SERVICE_SPECIFIC: 11  (34%)
NOT_IMPLEMENTED:  0
OUT_OF_SCOPE:     2   (6%)

미조사: 0
```

- **FULLY_COMMON 7**: A1 · C2 · C3 · D1 · D3 · E1 · F2
- **CORE_ONLY 6**: B1 · B3 · D2 · E3 · E4 · E5
- **VIEW_DUPLICATED 6**: A3 · C1 · D4 · E2 · E6 · F1
- **SERVICE_SPECIFIC 11**: A2 · A4 · B2 · B4 · B5 · D5 · E7 · E8 · E9 · F3 · F4
- **OUT_OF_SCOPE 2**: G1 · G2

### 기능 × 서비스 셀 단위

기능 단위 `NOT_IMPLEMENTED` 가 0 인 이유: 모집단은 **어느 서비스에든 구현이 1건 이상 존재하는 기능**으로 구성했다. 서비스별 미구현은 셀 단위로만 나타난다.

```text
NOT_IMPLEMENTED 셀: 9
  PharmacyHub — C1 이벤트 오퍼 · E1 콘텐츠 탐색 · E3 블로그 · E4 POP · E5 QR · E6 사이니지 · B3 상품 신청
  K-Cosmetics/GlycoPharm — E7 동영상 · E8 화면세트 (E9 다국어 포함 시 KPA 전용 3축)
```

### route/page 총수 ≠ 기능 모집단 수인 이유

4 서비스 route 합계는 **677**(KPA 224 · KCos 180 · GP 236 · PH 37)이고 그중 Store Hub 연결은 **약 110**인데 기능 모집단은 **32**다. 차이의 원인:

1. **같은 기능이 4 서비스에 4 route** — 예: 장바구니 4 route = 기능 1.
2. **한 화면이 여러 route** — 예: PH 결제 3 route(`payment` · `success` · `fail`) = 기능 1.
3. **legacy redirect route** — `/hub` · `/event-offers` · `commerce/orderable` · `library/content` 등은 기능이 아니라 호환 장치.
4. **detail route 는 목록 기능에 종속** — `orders/:orderId` · `products/:offerId` 는 상위 기능에 배정(단, B2 처럼 **독립 화면 파일**이 있으면 별도 기능으로 분리).
5. **route 없는 기능이 존재** — B4 · B5 는 modal 이라 route 가 0 인데 업무 기능은 1.

즉 route 는 **서비스 × 화면** 축이고 기능 모집단은 **업무** 축이다. 공통화 진척은 후자로만 측정할 수 있다.

---

## 11. 남은 작업 (후속 WO 2개)

기능마다 WO 를 쪼개지 않고 **성격별 2 묶음**으로 제안한다.

### A. `WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1`

**성격**: 동일 업무 View 사본 제거. 대상 12 기능 중 View 축.

| 대상 | 현재 | 목표 |
|---|---|---|
| E6 사이니지 라이브러리 | 3 사본 1,811L · Core 0 | 공통 View + 서비스 adapter |
| E3~E5 hub-import | Core 6 페이지 + GP 3 사본 | 공통 `HubImportLibraryView` + GP 편입 (pagination mode · sortable 을 prop 으로) |
| A3 허브 레이아웃 | KPA 390 / KCos 233 / GP 234 | 공통 hub shell (PH 는 이미 공통 셸) |
| C1 이벤트 오퍼 | KPA 969L 로컬 | `EventOffersHubList` 로 수렴(KPA 확장 요구는 slot) |
| D2 장바구니 View | KPA 423L · PH 289L | KPA 를 `StoreCartView` 로 (PH 는 계약이 달라 제외) |
| E2 콘텐츠 상세 | KCos · GP 2 사본 | 공통 상세 View |
| D4 주문 내역 | 4 사본 | 공통 목록 View (계약 차이는 adapter) |

**선행 결정 1건**: hub-import 의 정렬·페이지네이션 UI 정책(KPA 는 정렬 제거가 의도적 결정). 통합 전 정책을 확정해야 KPA 의 기존 결정을 되돌리지 않는다.

### B. `WO-O4O-STORE-HUB-API-CLIENT-AND-SERVICE-SCOPE-ALIGNMENT-V1`

**성격**: 데이터 계층 사본 제거 + 참여 범위 정렬. UI 변경 없음.

| 대상 | 현재 | 목표 |
|---|---|---|
| F1 API client 9종 × 3 서비스 | 사본 (`blogStaff` diff 20/165 등) | `createStoreCartApi` 패턴 확장 — 공통 factory + 전송 어댑터 주입 |
| GlycoPharm 지위 | "참조" | **정식 대상**으로 승격 (구조상 이미 동일) |
| B2 공급 상품 상세 | PH 단독 | 타 서비스 필요 여부 판정(구현 강제 아님) |
| F3 PharmacyHub backend | 전용 controller · 공유 테이블 | 공용 factory mount 가능 여부 **조사만** (backend 계약 변경은 별도 승인) |
| A2 · B4 · B5 · E7~E9 KPA 전용 축 | 단일 구현 | 공통화 대상 아님을 확정 기록 |

두 WO 는 독립적이라 병렬 진행 가능하다(A = View 계층, B = 데이터 계층).

---

## 12. 이번 WO 의 코드 변경

**코드 변경 0건.** 조사 방해 요소(dead import · route 오기)는 발견되지 않았다 — 4 서비스 전부 `noUnusedLocals`/`noUnusedParameters` 를 강제하고 typecheck 가 통과 중이므로 dead import 는 구조적으로 존재할 수 없다.

문서 정정 1건: 직전 CHECK(`CHECK-O4O-STORE-HUB-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1.md`)에 본 감사 결과에 따른 **정정 노트**를 상단에 추가했다(소비처 수치 오류 · 모집단 과소 설정 · "트랙 종료" 판정 철회). 본문 판정은 그대로 두고 정정만 덧붙였다.

**검증**: 코드 미변경이므로 typecheck/build 재실행 불필요. 직전 커밋(`86c85f805`) 시점의 6 typecheck · 4 build PASS 결과가 그대로 유효하다.

---

## 13. 완료 판정

이번 WO 는 **Store Hub 공통화 완료 선언이 아니다.**

| 완료 기준 | 결과 |
|---|---|
| 전체 모집단 확정 | ✅ 32 기능 |
| 모든 기능 판정 완료 | ✅ 32/32 |
| 미조사 0 | ✅ (§9) |
| 현재 공통화 수준 수치화 | ✅ FULLY_COMMON 7/32 = **22%**, 부분 공통 포함 13/32 = 41% |
| 남은 작업 큰 묶음 제안 | ✅ 후속 WO 2건 (§11) |

---

문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
