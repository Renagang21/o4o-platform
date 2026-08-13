# CHECK — WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1

- **작업일**: 2026-08-13
- **branch**: `work/commonization-store-hub` (worktree `C:\tmp\o4o-common-store-hub`, 시작 시 clean · 기준 origin/main)
- **성격**: 구현(공통 View / Shell 편입). 선행 CHECK `CHECK-O4O-STORE-HUB-FULL-FEATURE-INVENTORY-AND-COMMONIZATION-GAP-AUDIT-V1` 의 32기능 모집단을 실제 모집단으로 사용하되 고정하지 않고 재확인.
- **핵심 결론**: 선행 census 가 `CORE_ONLY` / `VIEW_DUPLICATED` 로 판정한 **9 기능(A3 · B1 · B3 · C1 · D2 · D4 · E2 · E3~E5 · E6 · F1)을 모두 처리**했다. 서비스 화면 코드 **−7,902L / +2,168L**, 공통 View·Shell·API **+2,441L** 신규. 잔존 `CORE_ONLY` / `VIEW_DUPLICATED` **0**.

---

## 1. 모집단 재확인 (§1)

선행 CHECK 의 32기능 표를 출발점으로 쓰되 **절대 모집단으로 가정하지 않았다.** 재확인 절차:

1. 4 서비스 `App.tsx` 의 `path=` 재추출 → Store Hub 축 route 가 census 이후 추가/삭제되지 않았음 확인.
2. census 가 `SERVICE_SPECIFIC` 으로 넘긴 항목(A2 · A4 · B2 · B4 · B5 · D5 · E7~E9 · F3 · F4)을 **다시 열어** 판정 근거가 현재 코드에서도 성립하는지 확인 → §5 에 근거 기록.
3. census 에 없던 축 추가 탐색: `/store/commerce/orders` 3 화면(D4) 의 **업무 계약이 3종**이라는 사실은 census 에 없었다 → §4-D4 에서 신규 기록.

결과: 모집단 32 유지. 신규 기능 발견 0, 삭제 0. **판정 정정 1건**(D4 는 "4 서비스 동일 중복"이 아니라 "3 계약 · 그중 2 서비스만 동일").

---

## 2. 사이니지 라이브러리 (§2)

3 서비스 대형 사본을 공통 `SignageLibraryView` + `useSignageLibrary` 로 편입했다.

| 서비스 | 화면 | before | after |
|---|---|---:|---:|
| KPA | `pages/pharmacy/HubSignageLibraryPage.tsx` | 652L | **141L** |
| K-Cosmetics | `pages/hub/HubSignagePage.tsx` | 579L | **108L** |
| GlycoPharm | `pages/hub/HubSignageLibraryPage.tsx` | 580L | **108L** |
| 공통 | `store-ui-core/components/signage-library/` | — | View 485L + hook 328L |

- 업무 의미(HUB 사이니지 미디어 탐색 → 내 매장 가져오기)가 3 서비스 동일함을 확인한 뒤 공통화했다.
- 서비스 차이는 accent · 라벨(`내 약국`/`내 매장`) · serviceKey · 경로 config 로 흡수. 서비스명 조건문 0.
- WO §12 의 "QR·POP·태블릿·사이니지 **실행 관리** 금지" 는 지켰다 — 편입한 것은 §12 가 명시적으로 범위에 포함한 **Store Hub 사이니지 라이브러리 탐색/가져오기** 뿐이며, `/store/*` 사이니지 재생·플레이리스트 관리 화면은 미접촉이다.

---

## 3. GlycoPharm hub-import 정식 편입 (§3)

GP blog / pop / qr 3 페이지(975L, Core 미소비 사본)를 `useHubImportLibrary` + `HubImportLibraryView` 계열로 편입했다.

| 화면 | KPA | K-Cosmetics | GlycoPharm |
|---|---:|---:|---:|
| blog | 315L → **101L** | 279L → **87L** | 320L → **88L** |
| pop | 294L → **?**(97L) | 286L → **89L** | 331L → **96L** |
| qr | 305L → **?**(96L) | 279L → **86L** | 324L → **88L** |

- **정렬 정책 무변경**: KPA 는 `WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1 A-3` 의 정렬 컬럼 제거 결정을 그대로 유지한다(`sortable` 미부여). KCos·GP 는 기존 `sortable` 유지. **KPA 결정을 되돌리지 않았다.**
- **pagination 정책 무변경**: 각 서비스가 쓰던 모드를 `paginationMode` config 로 유지.

---

## 4. Layout / Shell (§4)

3 서비스 허브 레이아웃을 공통 `StoreHubShell`(248L)로 합쳤다.

| 서비스 | before | after | 잔여 소유 |
|---|---:|---:|---|
| KPA `PharmacyHubLayout` | 390L | **131L** | nav config(12 메뉴) · accent blue · guard adapter(`HubGuard`) · 헤더 slot |
| K-Cosmetics `KCosmeticsHubLayout` | 233L | **117L** | nav config · accent pink · guard adapter(`RoleGuard`) |
| GlycoPharm `GlycoPharmHubLayout` | 234L | **117L** | nav config · accent blue · guard adapter(`GlycoHubGuard`) |
| PharmacyHub `StoreDashboardLayout` | (이미 공통 셸) | 무변경 | — |

잔여는 WO §4 가 허용한 `nav config / accent / label / serviceKey / guard adapter / optional header slot` 범위 안이다.

---

## 5. KPA 이벤트 오퍼 (§5)

`KpaEventOfferPage` 969L → **546L**. 테이블 마크업 + inline style 블록을 공통 `EventOfferHubView`(257L)로 이관.

**KPA 고유 업무는 제거하지 않았다** — 전부 slot/config 로 유지:

| KPA 고유 기능 | 유지 방식 |
|---|---|
| 상태 4탭 | `statusTabs` config |
| 운영자 통계(`EventOfferStats`) | header slot |
| 검색 | `searchSlot` |
| 공급업체 필터 | filter slot |
| 공급업체 묶음 담기 패널 | footer slot |
| 기간 컬럼 · 할인 표기 | `additionalColumns` |
| 자체 주문 흐름(`OrderResult`) · `perOrderLimit` clamp | 페이지 소유(무변경) |

API · 권한 · 담기 정책 무변경.

---

## 6. KPA 장바구니 (§6)

`StoreCartPage` 423L → **62L**, `StoreCartView` 편입 완료. 흡수한 차이: accent · 컬럼 · 가격표시 · 버튼 문구 · summary · checkout CTA · optional section.
**업무 경계 유지** — 장바구니는 "주문 준비"이며 주문 확정은 기존 `/store/cart/{k}/checkout-confirm` 그대로다(§11).

PharmacyHub `CartPage`(289L)는 **편입하지 않았다** — 아래 §8 참조.

---

## 7. 콘텐츠 상세 (§7)

| 서비스 | before | after |
|---|---:|---:|
| K-Cosmetics `ContentDetailPage` | 135L | **64L** |
| GlycoPharm `HubContentDetailPage` | 130L | **65L** |
| 공통 `HubContentDetailView` | — | 125L |

**원본 콘텐츠와 매장 사본의 경계는 변경하지 않았다.** 공통 View 는 표시 전용이며, "가져오기(사본 생성)" 는 각 서비스의 기존 action adapter 가 그대로 수행한다. 원본 id 와 사본 id 를 동일 객체로 취급하는 코드는 도입하지 않았다.

---

## 8. 주문 내역 — 업무 계약 구분이 먼저 (§8)

census 는 D4 를 "4 서비스 주문 목록 중복"으로 적었으나, 실제로는 **3 계약**이다.

| 계약 | 서비스 | 데이터 원천 | 방향 |
|---|---|---|---|
| (1) **buyer checkout ledger** | KPA `StoreOrdersPage` · GP `PharmacyOrders` | `checkout_orders` (buyerId 기준, `/checkout/orders`) | 매장 → 공급자 (구매/발주) |
| (2) 소비자 storefront 주문 | K-Cosmetics `StoreOrdersPage` | `/cosmetics/orders` (channel local/travel · fulfillment) | 소비자 → 매장 (**방향 반대**) |
| (3) paymentGroup 결제 우선 | PharmacyHub `OrdersPage` | `supplierNotified` · `paymentStatus` | 결제 전 공급자 비노출 규칙 |

→ **(1) 만 공통화했다.**

| 화면 | before | after |
|---|---:|---:|
| KPA `StoreOrdersPage` | 359L | **166L** |
| GP `PharmacyOrders` | 343L | **255L** |
| 공통 `BuyerOrderLedgerView` | — | 268L |

공통 View 가 소유: 헤더 / KPI 3블록(총 주문 · 결제완료 · 이번 달 주문액) / 상태 필터 바 / 선택 검색 / loading·error·empty / 선택 pagination.
서비스가 adapter·slot 으로 유지: 상태 탭 정의와 매칭(GP 의 결제중심 파생 3상태 `deriveState` 보존) · 결제/취소 판정 · 목록 본문(KPA DataTable / GP 확장 카드) · 헤더 액션(KPA 주문 작업대 링크).

(2)(3)은 **억지로 합치지 않았다** — WO §8 · §11 준수. K-Cosmetics 는 서버측 pagination + 상세 drawer 를 그대로 두었고, PharmacyHub 는 결제 우선 계약을 그대로 두었다.

---

## 9. F1 — API client 사본 (§9 "작은 항목이라고 넘기지 않는다")

### 9-1. 처리한 것

| client | before (KPA/KCos/GP) | after | 공통 |
|---|---|---|---|
| `storeHub.ts` | 207 / 139 / 118 | **52 / 51 / 50** | `createStoreHubApi` 205L (9 메서드) |
| `pharmacyProducts.ts` (카탈로그 3 endpoint) | 272 / 83 / 102 | 289 / 87 / 107 † | `createSupplyCatalogApi` 70L |

† 라인 수는 주석 때문에 소폭 늘었으나 **URL·query·payload 구성 로직 3벌이 1벌**이 되었다. `pharmacyProducts.ts` 의 나머지(listing · channel settings)는 KPA 전용이라 그대로다.

- `storeHub.ts`: backend 는 이미 `createStoreHubController` factory 로 공통인데 client 만 3벌이던 비대칭을 해소. 서비스가 소유하는 것은 **prefix + 전송 언랩 + 기존 함수명 re-export** 뿐.
- KPA 는 `createChannel` 을 re-export 하지 않는다 — B2C storefront 은퇴(`WO-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1`)로 진입점이 없고 backend 는 kpa+B2C 를 410 으로 차단한다. **backend 가 authoritative 한 정책을 frontend 에서 다시 만들지 않았다.**
- `createSupplyCatalogApi` 는 `service_key` 를 config 로 받는다 — KCos `k-cosmetics` / GP `glycopharm` 명시 전송, KPA 는 경로 기반(미전송). **전송 URL·파라미터·body 무변경.**

### 9-2. 서비스별 유지 — 근거

| client | 판정 | 근거 |
|---|---|---|
| `eventOffer.ts` | **SERVICE_SPECIFIC-BY-DESIGN** | KPA 는 legacy `/groupbuy*` 네임스페이스(products·stats·enriched·participations), GP 는 `/glycopharm/event-offers/enriched` + participate. **endpoint 집합 자체가 다르다.** census F4 가 backend controller 를 이미 SERVICE_SPECIFIC 으로 판정했고 그 판정은 현재도 성립. 공통 factory 를 만들면 서비스별 분기가 factory 안으로 들어간다(§10 위반). |
| `hubContent.ts` | **SERVICE_SPECIFIC-BY-DESIGN** | KPA 는 **비인증 raw `fetch`** + `producer` 필터, GP 는 인증 client + `type`/`search`. 인증 자세와 필터 계약이 다르다. 두 파일 모두 `@o4o/types/hub-content` 타입을 쓰는데 **`store-ui-core` 는 `@o4o/types` 에 의도적으로 의존하지 않는다**(package 경계) → 공통 factory 를 두면 타입 계약이 끊긴다. |
| `blogStaff.ts` · `popStaff.ts` · `qrStaff.ts` · `storeExecutionAssets.ts` · `storeLibrary.ts` | **OUT_OF_SCOPE-BY-WO-§12** | 소비처가 Agent C 담당 `/store*` 실행 자산 관리 화면이다. WO §12 가 명시적으로 금지. Store Hub 화면은 이 client 들을 소비하지 않는다. **중복이 없다는 뜻이 아니라 이번 WO 의 범위가 아니라는 뜻이다** → 별도 WO 제안(§13). |
| `storeCart.ts` | 이미 공통 | 선행 WO 에서 `createStoreCartApi` 로 전송 주입만 남김. |

---

## 10. 공통화 원칙 준수 (§10)

- **공통 View 안 서비스명 조건문 0** — `if (service === 'kpa')` 계열 분기를 새로 도입하지 않았다. 확인: 신규 공통 파일 7개에서 `'kpa'` / `'cosmetics'` / `'glycopharm'` 리터럴 비교 0건.
- 차이 흡수 수단: `config`(nav · statusTabs · columns · labels · paginationMode) / `adapter`(api · guard · matchStatus · isPaid) / `slot`(header · footer · search · renderList) / `renderer`(additionalColumns · renderPriceSublabel) / `accent 토큰`(`storeAccent.ts` — Tailwind 정적 class 맵).
- **만능 View 회피**: `SupplyCatalogHub` 는 KPA/KCos/GP 만 편입하고 PharmacyHub `ProductsPage`(180L, 신청 없이 바로 구매)는 분리 유지. `StoreCartView` 도 PharmacyHub `CartPage`(289L, paymentGroup)는 분리 유지. 합쳤다면 결제 계약 분기가 View 안으로 들어왔을 것이다.

---

## 11. 업무 경계 보호 확인 (§11)

| 경계 | 확인 |
|---|---|
| 상품 신청 ≠ 주문 | `useSupplyProductApplication` 은 `ProductApproval` PENDING 생성. 주문 경로와 코드 공유 없음. |
| ProductApproval ≠ OPL | 신청 승인 후 OPL 생성은 backend 소관. frontend 에서 동일 타입으로 병합하지 않음. |
| OPL ≠ StoreLocalProduct | 별도 화면·client 유지(`/store/commerce/local-products` 미접촉). |
| 공급자 원본 ≠ 매장 사본 | 콘텐츠 상세 공통 View 는 표시 전용. 가져오기 = 사본 생성 액션은 서비스 adapter. |
| 이벤트 참여 ≠ 주문 | KPA `OrderResult` 흐름은 페이지가 그대로 소유. 공통 View 로 옮기지 않음. |
| PharmacyHub payment flow ≠ checkout-confirm | 두 계약 모두 무변경. PH 는 어떤 공통 cart/order View 에도 편입하지 않음. |
| PharmacyHub 에 ProductApproval 신규 도입 | **하지 않음.** |

---

## 12. 금지 범위 확인 (§12)

| 금지 항목 | 상태 |
|---|---|
| 신규 DB table · migration | **0건** |
| backend 의미 변경 | **0건** — backend 파일 수정 0. `git diff --stat` 에 `apps/api-server/**` 없음. |
| 운영 데이터 변경 | **0건** |
| 결제 정책 변경 | **0건** |
| Agent C `/store*` 관리 기능 변경 | 미접촉. 단 `/store/commerce/orders`(D4)는 WO §8 이 명시적으로 in-scope 로 지정한 화면이므로 처리했고, 그 사실을 여기 기록한다. |
| QR · POP · 태블릿 · 사이니지 **실행 관리** | 미접촉. Store Hub 사이니지 **라이브러리 탐색/가져오기** 만 처리(§12 명시 예외). |

---

## 13. 검증 (§13)

### 13-1. typecheck (`npx tsc --noEmit -p`)

| 대상 | 결과 |
|---|---|
| `packages/store-ui-core` | **PASS** (0 error) |
| `services/web-kpa-society` | **PASS** |
| `services/web-k-cosmetics` | **PASS** |
| `services/web-glycopharm` | **PASS** |
| `services/web-pharmacy-hub` | **PASS** |
| `services/web-neture` | **PASS** (필요 범위 — `ContentHubTemplate` 소비 영향 확인) |

### 13-2. build (`pnpm build`)

| 대상 | 결과 |
|---|---|
| `web-kpa-society` | **PASS** (34.07s) |
| `web-k-cosmetics` | **PASS** (14.04s) |
| `web-glycopharm` | **PASS** (19.48s) |
| `web-pharmacy-hub` | **PASS** (10.75s) |

chunk size 경고는 기존과 동일한 사전 존재 경고이며 이번 변경과 무관하다.

### 13-3. production write 미실행

**가져오기 / 신청 / 수량변경 / 주문 은 실행하지 않았다.** 사유: WO §13 이 "production write 가 필요한 동작은 승인 없이 실행하지 않는다"고 지정했고, 이번 WO 는 **API 계약을 바꾸지 않는 View/Shell 편입**이라 write 경로가 변경되지 않았다. 검증은 typecheck·build·정적 계약 대조(전송 URL·파라미터·body 동일성)로 수행했다.
→ 실사용 write smoke 는 사용자 승인 후 별도 수행 필요.

---

## 14. 최종 census 재판정 — 32 기능 전수 (§14)

표기: `→` 는 이번 WO 로 인한 판정 변경.

### A. 허브 진입 · 셸 (4)

| # | 기능 | before | after | 근거 |
|---|---|---|---|---|
| A1 | 매장허브 홈 | FULLY_COMMON | **FULLY_COMMON** | 무변경 |
| A2 | 홈 최신 자원 피드 | SERVICE_SPECIFIC | **SERVICE_SPECIFIC-BY-DESIGN** | KPA 단독 540L. 다른 3 서비스에 대응 화면·데이터 원천이 없다. 사본이 아니므로 공통화 대상 아님(가짜 소비처를 만들지 않는다). |
| A3 | 허브 레이아웃 · 사이드바 | VIEW_DUPLICATED | **CORE_ONLY → FULLY_COMMON** | 3 서비스 `StoreHubShell` 편입. PH 는 이미 공통 셸. 잔여=nav config·accent·guard adapter. |
| A4 | 허브 접근 가드 | SERVICE_SPECIFIC | **SERVICE_SPECIFIC-BY-DESIGN** | 자격 체계가 다르다 — KPA 약사 자격 / KCos cosmetics scope / GP store_owner role / PH enrollment. 공통 guard 는 서비스별 분기를 Core 로 옮길 뿐이다. |

### B. 공급 상품 · 신청 (5)

| # | 기능 | before | after | 근거 |
|---|---|---|---|---|
| B1 | 공급 상품 탐색 | CORE_ONLY | **FULLY_COMMON** | KPA `HubB2BCatalogPage` **728L → 93L** config adapter. 3 서비스 모두 `SupplyCatalogHub`. |
| B2 | 공급 상품 상세 | SERVICE_SPECIFIC | **SERVICE_SPECIFIC-BY-DESIGN** | PH 단독. KPA/KCos/GP 는 목록에서 바로 신청하므로 상세 화면 업무 자체가 없다. 사본 0. |
| B3 | 상품 신청 · 제외 액션 | CORE_ONLY | **FULLY_COMMON** | 확인 UX 를 공통 inline dialog 로 통일(§15-f). 3 서비스 동일 경로. |
| B4 | 신청 상태 조회 | SERVICE_SPECIFIC | **SERVICE_SPECIFIC-BY-DESIGN** | KPA 전용 modal. 다른 서비스는 신청 상태를 목록 배지로만 표시하는 다른 업무 흐름. |
| B5 | 신규 상품 요청 | SERVICE_SPECIFIC | **SERVICE_SPECIFIC-BY-DESIGN** | KPA 전용. 대응 backend·화면이 다른 서비스에 없다. |

### C. 이벤트 오퍼 (3)

| # | 기능 | before | after | 근거 |
|---|---|---|---|---|
| C1 | 이벤트 오퍼 탐색 목록 | VIEW_DUPLICATED | **CORE_ONLY** | KPA 969L → 546L, `EventOfferHubView` 편입. **잔여 546L 은 사본이 아니라 KPA 고유 업무**(운영자 통계 · 공급업체 묶음 담기 · 자체 주문 흐름 · perOrderLimit clamp)다 — §5 가 "제거하지 않는다"고 명시. KCos·GP 는 33L 어댑터. |
| C2 | 오퍼 → 장바구니 payload | FULLY_COMMON | **FULLY_COMMON** | 무변경 |
| C3 | 오퍼 상태 라벨 | FULLY_COMMON | **FULLY_COMMON** | 무변경 |

### D. 장바구니 · 거래 (5)

| # | 기능 | before | after | 근거 |
|---|---|---|---|---|
| D1 | 장바구니 타입·endpoint·상태 | FULLY_COMMON | **FULLY_COMMON** | 무변경 |
| D2 | 장바구니 화면 | CORE_ONLY | **CORE_ONLY** | KPA 423L → **62L** `StoreCartView` 편입. PH `CartPage` 289L 은 paymentGroup 결제 우선 계약 → 편입 안 함(§11). |
| D3 | 주문 확정(checkout) | FULLY_COMMON | **FULLY_COMMON** | 무변경 |
| D4 | 주문 내역 · 상세 | VIEW_DUPLICATED | **CORE_ONLY** | §8. buyer ledger 2 서비스 공통화. KCos(소비자 storefront) · PH(paymentGroup) 는 **다른 업무 계약**이라 SERVICE_SPECIFIC-BY-DESIGN. |
| D5 | 결제 | SERVICE_SPECIFIC | **SERVICE_SPECIFIC-BY-DESIGN** | PH Toss 전용. 다른 서비스에 결제 화면 없음. |

### E. 공급자 콘텐츠 탐색 · 가져오기 (9)

| # | 기능 | before | after | 근거 |
|---|---|---|---|---|
| E1 | 콘텐츠 탐색 | FULLY_COMMON | **FULLY_COMMON** | 무변경 |
| E2 | 콘텐츠 상세 | VIEW_DUPLICATED | **FULLY_COMMON** | `HubContentDetailView` 편입(KCos 64L / GP 65L). |
| E3 | 블로그 진열·가져오기 | CORE_ONLY | **FULLY_COMMON** | GP 편입 완료. 3/3 Core 소비 + 공통 View. |
| E4 | POP 진열·가져오기 | CORE_ONLY | **FULLY_COMMON** | 동일 |
| E5 | QR 진열·가져오기 | CORE_ONLY | **FULLY_COMMON** | 동일 |
| E6 | 사이니지 미디어 진열·가져오기 | VIEW_DUPLICATED | **FULLY_COMMON** | 1,811L → 357L + 공통 813L. |
| E7 | 동영상 진열·가져오기 | SERVICE_SPECIFIC | **SERVICE_SPECIFIC-BY-DESIGN** | KPA 단독 368L. 다른 서비스에 동영상 HUB 원천이 없다(가짜 화면을 만들지 않는다). |
| E8 | 태블릿 화면세트 진열·가져오기 | SERVICE_SPECIFIC | **SERVICE_SPECIFIC-BY-DESIGN** | KPA 단독 519L. screen-set 소유권 모델(origin=store/operator/supplier)이 KPA 태블릿 축 전용. |
| E9 | 다국어 상품 콘텐츠 진열 | SERVICE_SPECIFIC | **SERVICE_SPECIFIC-BY-DESIGN** | KPA 단독. `store_multilingual_product_content_*` 원천이 KPA 축에만 있다. |

### F. API client · backend (4)

| # | 기능 | before | after | 근거 |
|---|---|---|---|---|
| F1 | 매장허브 API client 군 | VIEW_DUPLICATED | **CORE_ONLY** | §9. `storeHub.ts` · 카탈로그 trio 공통화. 잔여는 §9-2 근거로 SERVICE_SPECIFIC-BY-DESIGN 2건 + OUT_OF_SCOPE-BY-WO-§12 5건. |
| F2 | 공용 backend controller | FULLY_COMMON | **FULLY_COMMON** | 무변경(backend 미수정) |
| F3 | PH backend controller 군 | SERVICE_SPECIFIC | **SERVICE_SPECIFIC-BY-DESIGN** | 전용 controller. 원장 테이블은 공유하나 접근 경로가 별도. backend 변경은 §12 금지. |
| F4 | Event Offer backend controller | SERVICE_SPECIFIC | **SERVICE_SPECIFIC-BY-DESIGN** | KPA legacy `/groupbuy*` vs GP `/event-offers` — endpoint 집합이 다르다. |

### G. 인접 도메인 (2)

| # | 기능 | 판정 | 근거 |
|---|---|---|---|
| G1 | 매장 실행 자산 관리 (`/store*` · PH `/store-owner/*`) | **OUT_OF_SCOPE-BY-WO-§12** | Agent C 축. 미접촉. |
| G2 | 매장 제품·정보·계정 | **OUT_OF_SCOPE-BY-WO-§12** | 매장 운영 축. 미접촉. |

### 숫자 블록

| 판정 | before | after |
|---|---:|---:|
| FULLY_COMMON | 7 | **15** |
| CORE_ONLY | 6 | **4** (B 없음 · C1 · D2 · D4 · F1) |
| VIEW_DUPLICATED | 6 | **0** |
| SERVICE_SPECIFIC(-BY-DESIGN) | 11 | **11** |
| OUT_OF_SCOPE-BY-WO-§12 | 2 | **2** |
| **합계** | **32** | **32** |
| 미조사 | 0 | **0** |

**잔존 `CORE_ONLY` 4건은 "정리 가능한 중복"이 아니다.** 각각의 잔여분은 업무 고유 기능(C1 KPA 이벤트 오퍼 고유 업무 · D2/D4 PharmacyHub·KCos 별도 계약 · F1 §9-2 근거)이며, 합치면 §10 의 "공통 View 안 서비스 조건문 금지" 또는 §11 의 업무 경계를 침범한다. **정리 가능한 `CORE_ONLY` / `VIEW_DUPLICATED` 잔존 0.**

---

## 15. 이번 WO 에서 수행한 정규화 (동작 차이 기록)

공통화 과정에서 서비스 간 표현을 맞춘 항목이다. **업무 의미 변경은 없다.**

| # | 정규화 | 영향 |
|---|---|---|
| a | KCos·GP 수제 이전/다음 버튼 → 공통 `Pagination`(operator-ux-core) | hub-import · 카탈로그 |
| b | GP hub-import accent emerald → blue (pop/qr) | GP 서비스 accent 정합 |
| c | 허브 셸 반응형 breakpoint md → lg, 본문 폭 `max-w-7xl` | 3 서비스 레이아웃 |
| d | KPA layout · cart · event-offer · catalog 의 inline style(`theme.ts`) → Tailwind | KPA 4 화면 |
| e | KPA 장바구니 금액 표기 `원` → `₩` | KPA 장바구니 |
| f | 카탈로그 제외 확인 `window.confirm` → 공통 inline dialog | 3 서비스 |
| g | 카탈로그 결과 카운트 · ActionBar `미추가 N개` · 운영자 탭 빈 상태 문구 | 3 서비스 |
| h | 주문 내역 KPI 금액 표기 `원` → `₩`, 총 주문/결제완료 `toLocaleString('ko-KR')` 통일 | KPA · GP |
| i | KPA 주문 내역 DataTable 내장 pagination → 공통 `Pagination` | KPA 주문 내역 |
| j | KPA 주문 내역 빈 상태에 "검색 조건에 맞는 주문이 없습니다" 분기 추가(GP 와 동일) | KPA 주문 내역 |

---

## 16. Git (§16)

- 변경 파일만 path-specific stage (`git add .` 미사용).
- commit: `refactor(store-hub): unify common views and shell`
- push: `origin work/commonization-store-hub`
- **`main` 직접 병합 없음.**

### 변경 규모

| 축 | 값 |
|---|---|
| 수정 파일 | 34 (서비스 화면·client 31 + store-ui-core 3) |
| 신규 공통 파일 | 9 (`storeAccent.ts` · `createStoreHubApi.ts` · `createSupplyCatalogApi.ts` · `StoreHubShell.tsx` · `HubImportLibraryView.tsx` · `SignageLibraryView.tsx` + `useSignageLibrary.ts` · `HubContentDetailView.tsx` · `EventOfferHubView.tsx` · `BuyerOrderLedgerView.tsx`) |
| 서비스 코드 | **−7,902L / +2,168L** |
| 공통 코드 신규 | **+2,441L** |
| 순 감소 | 약 **−3,300L** (중복 제거분) |
| backend 변경 | **0** |
| migration | **0** |

---

## 17. 후속 제안 (이번 범위 밖)

| # | 제안 | 사유 |
|---|---|---|
| 1 | `/store*` 실행 자산 client 5종(`blogStaff` · `popStaff` · `qrStaff` · `storeExecutionAssets` · `storeLibrary`) 공통화 | 사본 실재(`blogStaff` diff 20/165 · `storeExecutionAssets` diff 20/75). WO §12 로 이번 범위 밖 — Agent C 축 WO 필요. |
| 2 | PharmacyHub 실행 자산 8 화면의 공통화 모집단 편입 | census G1 관측. PH 가 Agent C 공통화 모집단에 없다. |
| 3 | 실사용 write smoke (가져오기 · 신청 · 장바구니 · 주문) | §13-3. 사용자 승인 필요. |

---

## 18. 최신 origin/main 재기준 + 독립 재검증 (2026-08-13, 후속 세션)

§16 push 이후 `origin/main` 이 **54 커밋** 진행했다. WO 의 "기준: 작업 시작 시 최신 origin/main" 을 만족시키기 위해
브랜치를 최신 main 에 재기준하고, 선행 세션의 판정을 **문서 신뢰가 아니라 코드 실측으로** 다시 확인했다.

### 18-1. 병합 — 충돌 1건

`origin/main` 의 54 커밋은 대부분 **내 매장(`/store/*`) 공통화 트랙**(`WO-O4O-MY-STORE-*`)이며 `packages/store-ui-core` 를 크게 확장했다.

| 항목 | 결과 |
|---|---|
| 충돌 파일 | `packages/store-ui-core/src/index.ts` **1건** |
| 성격 | barrel export 의 **additive vs additive** — store-hub 블록과 my-store 블록이 서로 겹치지 않는 별개 추가 |
| 해결 | **양쪽 블록 모두 보존.** 어느 쪽 export 도 삭제하지 않았다. 이름 충돌 여부는 typecheck 로 검증(§18-3) |

### 18-2. 병합으로 드러난 실제 결함 1건 (수정함)

`services/web-pharmacy-hub/src/pages/store-owner/HomePage.tsx` 는 git 이 **텍스트로는 자동 병합했으나 타입이 깨졌다.**

- 브랜치(`3c2c73598`)가 `/store-hub` 바로가기를 **구 shape** (`desc` · `Icon`) 로 추가
- main(`f0f8ce3d2`)이 같은 배열을 공통 `StoreHomeShortcutItem` 계약(`description` · `icon: ReactNode`)으로 전환
- 자동 병합 결과 = 신 shape 3개 + 구 shape 1개 → `TS2353: 'desc' does not exist in type 'StoreHomeShortcutItem'`

→ `/store-hub` 항목을 canonical shape 으로 정렬했다. **route(`/store-hub`) · 라벨 · 문구는 그대로다.** 업무 변경 0.

> 이 결함은 `tsc --noEmit -p tsconfig.json` 에서는 드러나지 않고 **`tsc -b`(project references) 를 쓰는 실제 build 에서만** 드러났다.
> PharmacyHub · GlycoPharm 의 build script 는 `tsc -b` 다 — 이 두 서비스는 `-p` 단독 typecheck 로 검증했다고 판단하면 안 된다.

### 18-3. 재검증 (병합 후 상태 기준, 전부 재실행)

| 대상 | typecheck | build |
|---|---|---|
| `packages/store-ui-core` | **PASS** | — |
| `web-kpa-society` | PASS | **PASS** (45.6s) |
| `web-k-cosmetics` | PASS | **PASS** (19.0s) |
| `web-glycopharm` | PASS | **PASS** (37.2s) |
| `web-pharmacy-hub` | PASS | **PASS** (17.9s) — §18-2 수정 후 |
| `web-neture` | PASS | — |

4 서비스 build script 는 모두 `tsc` 를 포함하므로(`tsc && vite build` 또는 `tsc -b && vite build`) build PASS = 타입 검증 포함이다.
barrel 양쪽 보존 해결에 **export 이름 충돌 0** 임이 이로써 실증됐다.

### 18-4. census 모집단 재확인 — N=32 유지

main 의 54 커밋이 Store Hub 축에 기능을 추가했는지 실측했다.

| 확인 | 방법 | 결과 |
|---|---|---|
| Store Hub 축 파일 변경 | `git diff --stat 05488cc42 origin/main -- */pages/hub */pages/pharmacy */pages/event-offer */pages/store-hub */components/layouts */components/pharmacy */pages/library` | **변경 0** |
| Store Hub 축 route 증감 | 4 서비스 `App.tsx` 의 `path=` 중 hub·pharmacy·event-offer·cart·orders 추출 후 base vs main diff | **4/4 identical** |

→ main 의 진행분은 전부 `/store*` 내 매장 축(WO §12 OUT_OF_SCOPE)과 forum 축이다. **신규 Store Hub 기능 0 · 삭제 0 → N=32 그대로.**

### 18-5. 선행 판정 독립 실측 (문서 수치를 믿지 않고 재측정)

| 검증 항목 | 방법 | 결과 |
|---|---|---|
| §10 공통 View 내 서비스명 조건문 | 신규 공통 디렉터리 9곳 grep (`=== 'kpa'` 등) | **0건** (유일 매치는 규칙을 설명하는 주석 1줄) |
| 사이니지 3 서비스 Core 소비 | `SignageLibraryView` 소비처 | KPA·KCos·GP **3/3** (141 · 108 · 108L) |
| GP hub-import 편입 | `HubImportLibraryView` 소비처 | **9 페이지** = 3 서비스 × blog·pop·qr |
| Shell 편입 | `StoreHubShell` 소비처 | **3/3** (131 · 117 · 117L) |
| cart 편입 | `StoreCartView` 소비처 | **3/3** |
| 콘텐츠 상세 | `HubContentDetailView` 소비처 | KCos·GP **2/2** (KPA 는 해당 화면 없음) |
| buyer 주문 원장 | `BuyerOrderLedgerView` 소비처 | KPA·GP **2/2** (171 · 255L) — 설계대로 KCos·PH 제외 |
| 이벤트 오퍼 | KPA `EventOfferHubView` / KCos·GP `EventOffersHubList` | **3/3 Core 소비** |
| F1 API client | `createStoreHubApi` · `createSupplyCatalogApi` 소비처 | 각 **3/3** (`storeHub.ts` 51 · 52 · 51L) |

선행 CHECK 가 적은 라인 수는 실측과 **±1L 이내로 일치**했다(병합 전 계수 차이).

### 18-6. 추가 탐색 — census 누락 후보 재판정

Store Hub 축에서 150L 초과 잔존 파일을 전수 나열해 census 밖 중복이 있는지 확인했다.

| 후보 | 판정 | 근거 |
|---|---|---|
| KPA `PharmacyB2BPage` 680L | **OUT_OF_SCOPE-BY-WO-§12** | route 가 `/store/commerce/products` — Store Hub 축이 아니라 내 매장 축 |
| KPA `EventOfferDetailPage` 522L | **SERVICE_SPECIFIC-BY-DESIGN** | route `/event-offers/:id` KPA 단독. KCos·GP 에 오퍼 상세 화면 자체가 없다(사본 0) |
| KCos `HubContentPage` 124L | **FULLY_COMMON (E1 판정 유지)** | store-ui-core 가 아니라 `@o4o/shared-space-ui` 의 `ContentHubTemplate` 소비 — KPA·KCos·GP **3/3** 동일 템플릿. config adapter 뿐 |
| KPA/PH `Store*` · `store-owner/*` 대형 화면군 | **OUT_OF_SCOPE-BY-WO-§12** | 실행 자산 관리(Agent C 축). census G1·G2 로 이미 계상 |

→ **census 밖 정리 가능 중복 신규 발견 0.**

### 18-7. §18 결론

최신 origin/main 기준에서도 **`VIEW_DUPLICATED` 0 · 정리 가능한 `CORE_ONLY` 0** 이 유지된다.
§14 의 32기능 숫자 블록은 재기준 후에도 그대로 유효하다(FULLY_COMMON 15 · CORE_ONLY 4 · VIEW_DUPLICATED 0 · SERVICE_SPECIFIC 11 · OUT_OF_SCOPE 2 · 미조사 0).

병합 커밋: `7dfd8e641` (`origin/main` → `work/commonization-store-hub`). backend · DB · migration 변경 **0**.
`main` 직접 병합 없음 — 브랜치 유지(WO §16).

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
