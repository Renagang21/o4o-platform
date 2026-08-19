# CHECK — WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1

- **작업일**: 2026-08-19
- **대상**: 내 매장(My Store) 남은 기능 화면 View 중복 재산출 · 공통 View 채택
- **범위 서비스**: KPA-Society / K-Cosmetics / GlycoPharm / Pharmacy-Hub
- **선행**: `WO-O4O-MY-STORE-UNIFIED-SCREEN-ARCHITECTURE-AND-ADOPTION-V1` (Shell/Navigation/Home 골격 — 완료)

---

## 1. 결론 요약

- 최신 main 기준 **내 매장 화면 전수 재산출 완료 — 미조사 0** (4서비스 화면 135종, 그중 2개 이상 서비스에 같은 이름/같은 업무 의미로 존재하는 것 27종).
- 이번 WO 에서 **공통 View 6건 채택**(신규 공통 컴포넌트 4 + 기존 공통 View 확장 2), 서비스 화면 **12개 파일**을 thin adapter 로 축소.
- **VIEW_DUPLICATED = 0 / CORE_ONLY = 0** (아래 §4 판정표 기준). 잔존하는 대형 KPA 원본은 전부 **SERVICE_SPECIFIC 근거 고정** 또는 **후속 WO 필요(§7)** 로 기록했다 — 억지 병합하지 않았다.
- 범위 밖 확대·신규 기능·schema/API 계약 변경 0건.

---

## 2. 재산출 census (§3)

집계 대상 디렉터리 (내 매장 기능 화면):

| 서비스 | 경로 |
|---|---|
| KPA-Society | `services/web-kpa-society/src/pages/pharmacy` |
| K-Cosmetics | `services/web-k-cosmetics/src/pages/store` |
| GlycoPharm | `services/web-glycopharm/src/pages/store-management`, `.../pages/store` |
| Pharmacy-Hub | `services/web-pharmacy-hub/src/pages/store-owner` |

전체 표는 **부록 A** (135행, 미조사 0). 표기: `LOC✔` = 공통 core 패키지(`@o4o/store-ui-core` · `shared-space-ui` · `store-asset-policy-core` · `tablet-screen-set-editor` · `tablet-kiosk-core`) 소비, `—` = 해당 서비스에 없음.

---

## 3. 채택한 공통 View (§5)

| # | 공통 자산 | 위치 | 채택 서비스 | 비고 |
|---|---|---|---|---|
| 1 | `StorePageShell` / `storePageStyles` | `@o4o/store-ui-core` `components/page/` | KPA(자료함 콘텐츠·자료) + 기존 `StoreLibraryPageShell` 전체 | 자료함 전용 셸을 자료함 밖에서도 쓰도록 일반화. `StoreLibraryPageShell` 은 위임(렌더 무변경) |
| 2 | `StoreAssetsView` | `@o4o/store-asset-policy-core` | KPA · KCos · GP | 제작물 목록 3벌 복제 제거 |
| 3 | `StorePlaylistCreateView` | `@o4o/shared-space-ui` | KPA · KCos · GP | 플레이리스트 등록 화면 껍데기 3벌 제거. 저장 endpoint 는 KEEP-LEGACY 유지 |
| 4 | `signageHelpers` (순수 로직 12함수) | `@o4o/store-ui-core` `signage/` | KPA · GP | 날짜/스케줄/강제표출/KPI 계산 — 두 서비스 본문이 동일했다. 렌더 무변경 |
| 5 | `SignagePlayerSelectView` (+`headerExtra`·`rowSelection` slot) | `@o4o/store-ui-core` | KPA 신규 채택(기존 KCos·GP) | KPA 고유(활성 스케줄 배너·송출 대상 다중선택)는 slot 주입. KCos/GP 렌더 무변경 |
| 6 | `ProductMarketingView` (+load-error 계약) | `@o4o/store-ui-core` | KPA 신규 채택(기존 KCos·GP) | 아래 3-1 |

### 3-1. `ProductMarketingView` load-error 계약 상향

공통 View 는 조회·연결해제 실패를 silent catch 로 삼키고 있었다(= 플랫폼 load-error 계약 위반, KCos/GP 소비). KPA 사본만 계약을 지키고 있어 그동안 공통화가 막혀 있었다.

- 조치: 실패/빈 상태 분리 · 재조회 실패 시 기존 내용 유지 + 인라인 안내·재시도 · 연결 해제 실패 안내 · 중복 클릭 잠금을 공통 View 로 이관 → KPA 가 채택(607 → 33 LOC).
- 성공 경로 렌더·문구·동선 변경 없음. KCos/GP 는 실패 경로에서만 동작이 바뀐다(조용한 빈 화면 → 명시적 실패+재시도). 신규 기능이 아니라 기존 계약 미준수 정정이다.

---

## 4. 판정표 (§4) — 2개 이상 서비스에 존재하는 화면 27종

| 화면 | KPA | KCos | GP | PH | 판정 | 근거 |
|---|---:|---:|---:|---:|---|---|
| StoreAssetsPage | 24 | 21 | 21 | — | FULLY_COMMON | 이번 WO 채택(#2) |
| StorePlaylistCreatePage | 52 | 42 | 42 | — | FULLY_COMMON | 이번 WO 채택(#3) |
| SignagePlayerSelectPage | 89 | 23 | 23 | — | FULLY_COMMON | 이번 WO 채택(#5) |
| ProductMarketingPage | 33 | 24 | 24 | — | FULLY_COMMON | 이번 WO 채택(#6) |
| StoreLibraryContentsPage | 195 | 68 | 68 | — | FULLY_COMMON | 공통 StoreLibraryContentsView + KPA 는 StorePageShell |
| StoreLibraryResourcesPage | 870 | 31 | 44 | — | FULLY_COMMON (KPA superset) | KCos/GP=공통 View. KPA 는 등록·QR·다국어 상위집합이며 헤더는 StorePageShell 채택 |
| StoreProductDescriptionsPage | 116 | 47 | 47 | — | FULLY_COMMON | 기존 StoreProductDescriptionsView |
| ProductPopBuilderPage | 36 | 33 | 33 | — | FULLY_COMMON | 기존 공통 View |
| StoreProductionMaterialsPage | — | 73 | 73 | — | FULLY_COMMON | 기존 공통 View (PH LibraryPage 도 동일 View 소비) |
| StoreMarketingAnalyticsPage | — | 22 | 22 | — | FULLY_COMMON | 기존 공통 View |
| StorePopStaffPage | — | 46 | 46 | — | FULLY_COMMON | 기존 공통 View |
| StoreRecruitmentApplicationsPage | 127 | 63 | 63 | — | FULLY_COMMON | 기존 공통 View |
| StoreBlogPage / StoreBlogPostPage | — | 158/129 | 158/126 | — | FULLY_COMMON | 기존 공통 View |
| StoreQrPage | — | 78 | 86 | — | FULLY_COMMON | 기존 공통 View |
| StoreLocalProductsPage | 533 | 24 | 24 | — | FULLY_COMMON (slot) | 공통 StoreLocalProductsManager + KPA 는 extraColumns/renderFormModal slot |
| StoreOrdersPage | 306 | 373 | — | — | FULLY_COMMON | 두 서비스 모두 공통 BuyerOrderLedgerView + buyer 상태 계약 소비. 남은 차이는 DataTable 컬럼 정의와 서비스 API 모듈(주입값) |
| ForeignVisitorSalesSupportPage | 108 | 27 | 27 | — | FULLY_COMMON | 공통 ForeignVisitorSalesSupportPanel |
| StoreTabletDisplaysPage | 1877 | 43 | 110 | — | KCos/GP FULLY_COMMON · KPA SERVICE_SPECIFIC | KCos/GP=상품 진열 배정. KPA=TOUCH-FIRST 코너·Screen Set 편집(다른 업무 축, @o4o/tablet-screen-set-editor 공유) |
| StorePopPage | 1085 | 83 | 85 | — | KCos/GP FULLY_COMMON · KPA SERVICE_SPECIFIC | KCos/GP 는 WO-O4O-GP-KCOS-POP-QR-BLOG-AI-ENTRY-REMOVE-V1 로 AI 문구·template 축을 의도적으로 제거했다. 병합하면 KCos/GP 에 제거된 기능이 되살아난다(§13 금지) |
| StoreChannelsPage | 1521 | 98 | 112 | — | KCos/GP FULLY_COMMON · KPA SERVICE_SPECIFIC | KPA 는 자체 storefront 폐기·네이버/쿠팡 대체 트랙 진행 중. 전환 중 화면을 공통 View 로 고정하면 트랙과 충돌 |
| ProductionMaterialEditorPage | 490 | 56 | 56 | — | SERVICE_SPECIFIC (후속) | 공통 ProductionMaterialEditorShell 은 생성 전용. KPA 의 실제 진입은 `:id/edit`(수정 모드) — shell 확장 필요 → §7 |
| SignagePlaybackPage | 529 | 38 | 38 | — | SERVICE_SPECIFIC | KPA 는 `_schedule`(활성 스케줄 해석) 재생 모드 + mediaType 미기재 항목도 이미지로 재생. 공통 View 는 mediaType='image' 필수 — 병합 시 매장 TV 가 빈 화면이 될 수 있다 |
| StoreSignagePage | 2202 | 394 | 986 | — | KPA/KCos SERVICE_SPECIFIC · GP 986=dead | KPA↔GP(StoreSignageMainPage) 정규화 후 동일 1,497행 / 상이 1,517행 — 단일 WO 로 안전 병합 불가(§7). GP `pages/store-management/StoreSignagePage.tsx`(986)은 어느 route 에도 연결되지 않은 잔존 파일 — 은퇴 후보로만 기록(§8) |
| PharmacyBlogPage | 760 | — | 93 | — | SERVICE_SPECIFIC | KPA=매장 블로그 제작·발행 콘솔, GP=목록 진입. 업무 범위 상이 |
| PharmacyInfoPage | 687 | — | 76 | — | SERVICE_SPECIFIC | SSOT 상이: KPA=organizations, GP/KCos=users.businessInfo(공통 BusinessProfileSection). SSOT 통합은 데이터 소유권 결정 → §14 중지 |
| StoreInfoPage | — | 72 | — | 439 | SERVICE_SPECIFIC | KCos=사업자 프로필(account-ui). PH=organizations + organization_service_enrollments + platform_store_slugs 조회·수정(not_connected/ambiguous 상태 포함) |
| PH 전용 QrPage/PopPage/SignagePage/ContentPage/LibraryResourcesPage | — | — | — | 617/458/420/291/383 | SERVICE_SPECIFIC | §5 참조 |

**VIEW_DUPLICATED = 0 / CORE_ONLY = 0 / NOT_IMPLEMENTED = 0 / 미조사 = 0.**

---

## 5. Pharmacy-Hub 판정 (§5-C)

이미 공통 View 를 쓰는 화면:

| 화면 | 공통 자산 |
|---|---|
| LocalProductsPage | StoreLocalProductsManager (@o4o/store-ui-core) |
| LibraryPage (제작물) | StoreProductionMaterialsView + mergeProductionMaterials |
| HandledProductsPage | store-ui-core 취급제품 표시 포맷·행 키 계약 |
| TabletsPage | @o4o/tablet-screen-set-editor (TabletContentStepBuilder) |

로컬 구현 유지(SERVICE_SPECIFIC) 판정 — 근거:

1. **조직 결정 축이 다르다.** PH 는 organizationId 를 프론트가 보내지 않고 서버가 organization_service_enrollments(pharmacy-hub)로 결정한다. 화면은 connection.status(connected / not_connected / ambiguous)로 액션 노출을 게이트한다 — 3서비스 공통 View 에 없는 상태축이다.
2. **동작 표면이 다르다.** PH QR/POP/Signage/Content/자료 화면은 목록 + 인라인 CRUD(작성·수정·보관) 콘솔이다. 공통 View 는 "제작 시작(StartProductionModal) → 제작 화면 이동" 축으로 HUB 원본·production target registry 를 전제한다. PH 에는 아직 운영자 원본 축이 없다(PopPage 주석의 "준비 중 위장 금지" 정책).
3. **디자인 시스템이 다르다.** PH 는 Tailwind 클래스, store-ui-core View 는 inline CSSProperties 기반이다. 지금 강제 채택은 화면 재작성이며 WO §6 금지 항목(거대한 universal component)에 해당한다.

→ PH 는 화면 골격이 아니라 계약·원장 공유(store_qr_codes / store_pops / store_playlists / kpa_store_contents / store_execution_assets)로 이미 정렬돼 있다. 화면 골격 통합은 store-ui-core 의 Tailwind 대응 여부가 결정된 뒤 별도 WO 로 다룬다.

---

## 6. SERVICE_NEUTRAL_BACKCOMPAT 5곳 재확인 (§8 — 기록만, 정리 작업 없음)

| mount | 화면 census 상 소비 | 판정 |
|---|---|---|
| store-tablet | KPA/KCos/GP/PH 태블릿 화면이 사용 | 유지 |
| store-product-library | 자료함·제작물 화면이 사용 | 유지 |
| store-library (neutral mount) | 이번 census 의 프론트 화면 호출 0 (각 서비스는 서비스 prefix 경로 사용) | 은퇴 후보로만 기록 |
| product-ai-recommendation | 프론트 호출 0 | 은퇴 후보로만 기록 |
| seller | Neture 범위(내 매장 4서비스 화면 소비 없음) | 범위 밖 |

---

## 7. 후속 WO 후보 (이번에 억지 병합하지 않은 것)

1. KPA StoreSignagePage ↔ GP StoreSignageMainPage 공통 View 추출 — 정규화 후 동일 1,497행 / 상이 1,517행. 순수 로직은 이번에 공통화 완료(#4), 남은 것은 View 본체이며 실데이터 smoke 없이는 안전하지 않다.
2. ProductionMaterialEditorShell 수정(edit) 모드 확장 후 KPA ProductionMaterialEditorPage 채택.
3. KPA SignagePlaybackPage `_schedule` 모드 + mediaType 관대 처리를 공통 SignagePlaybackView 옵션으로 승격.
4. GP `services/web-glycopharm/src/pages/store-management/StoreSignagePage.tsx`(986행) 은퇴 — 어느 route 에도 연결되어 있지 않다.
5. PH 화면 골격: store-ui-core View 의 Tailwind 지원 여부 결정 후 재판정.

---

## 8. LOC 변화 (§11)

| 파일 | Before | After |
|---|---:|---:|
| KPA ProductMarketingPage | 607 | 33 |
| KPA SignagePlayerSelectPage | 214 | 89 |
| KPA StoreAssetsPage | 154 | 24 |
| KCos StoreAssetsPage | 94 | 21 |
| GP StoreAssetsPage | 93 | 21 |
| KPA StoreLibraryContentsPage | 252 | 195 |
| KPA StoreLibraryResourcesPage | 923 | 870 |
| KPA StorePlaylistCreatePage | 65 | 52 |
| KCos StorePlaylistCreatePage | 59 | 42 |
| GP StorePlaylistCreatePage | 59 | 42 |
| KPA StoreSignagePage | 2,290 | 2,202 |
| GP StoreSignageMainPage | 1,831 | 1,740 |
| **서비스 합계** | **6,641** | **5,331 (−1,310)** |

신규 공통 자산: StorePageShell 189 · StoreAssetsView 185 · signageHelpers 148 · StorePlaylistCreateView 74 = **596행**.
공통 View 확장: ProductMarketingView +99 · SignagePlayerSelectView +19 · StoreLibraryPageShell −16.

---

## 9. 검증 (§15)

| 항목 | 결과 |
|---|---|
| pnpm run build:packages | PASS |
| tsc --noEmit — web-kpa-society | PASS |
| tsc --noEmit — web-k-cosmetics | PASS |
| tsc --noEmit — web-glycopharm | PASS |
| tsc --noEmit — web-pharmacy-hub | PASS |
| vite build — 4서비스 | 전부 BUILD OK |
| Frontend unit test | 해당 4서비스에 test suite 없음 (미실행) |
| Backend Jest | backend 변경 0건 → 미실행 |
| Production browser smoke | 배포 후 실측 완료 — §10 (결함 1건 발견·수정) |

---

## 10. Production browser smoke (§9/§10) — 실측

수행: 2026-08-19, 배포 완료(Deploy Web Services / Cloud Run, sha `3e801ec69`) 이후.
도구: Playwright chromium headless (repo 내장), 계정 = `docs/local/TEST-ACCOUNTS.local.md` 의 매장 계정(자격증명은 이 문서에 적지 않는다).
호스트: KPA `kpa-society.co.kr` · GP `glycopharm.co.kr` · PH `pharmacyhub.co.kr` · KCos `k-cosmetics-web-...run.app`
(`k-cosmetics.co.kr` 은 Cafe24 쇼핑몰 도메인이라 앱 진입점이 아니다 — 검증 호스트 주의).

### 10-1. 배포 반영 확인 (chunk 실측)

3서비스 모두 `ProductMarketingPage-*.js` 가 **공통 View 1벌(≈11.2KB)** 로 축소됐고, 새 load-error 문구
("…마지막으로 불러온 내용입니다")가 배포 chunk 안에 존재한다 → 공통화 코드가 프로덕션에 반영됨.

| 서비스 | chunk | 새 load-error 문구 |
|---|---|:--:|
| KPA | ProductMarketingPage-DYKZ-ryY.js (11,197B) | YES |
| GP | ProductMarketingPage-Brg7M0NE.js (11,161B) | YES |
| KCos | ProductMarketingPage-DG75DeEt.js (11,195B) | YES |

### 10-2. 경로별 결과

| 서비스 | 경로 | D1440 | M390 | JS 예외 | dead link | 비고 |
|---|---|:--:|:--:|:--:|:--:|---|
| KPA | /store/content | PASS | PASS | 0 | 0 | 매장 자산 KPI·필터·목록 렌더 |
| KPA | /store/library/contents | PASS | **FIXED** | 0 | 0 | M390 가로 20px overflow → 아래 10-3 |
| KPA | /store/library/resources | PASS | PASS | 0 | 0 | 자료 목록 7건 이상 렌더 |
| KPA | /store/marketing/signage/playlist/new | PASS | PASS | 0 | 0 | 공통 StorePlaylistCreateView (제목/설명/태그 3필드) |
| KPA | /store/marketing/signage/player | PASS | PASS | 0 | 0 | 게시 플레이리스트 0건 → 정상 empty |
| KPA | /store/commerce/products/:id/marketing | BLOCKED_DATA | BLOCKED_DATA | 0 | 0 | 아래 10-4 |
| KCos | /store/content | PASS | PASS | 0 | 0 | |
| KCos | /store/marketing/signage/playlist/new | PASS | PASS | 0 | 0 | 태그·설명 비노출 config 그대로 |
| KCos | /store/marketing/signage/player | PASS | PASS | 0 | 0 | |
| GP | /store/content | PASS | PASS | 0 | 0 | |
| GP | /store/marketing/signage/playlist/new | PASS | PASS | 0 | 0 | |
| GP | /store/marketing/signage/player | PASS | PASS | 0 | 0 | |
| PH | /store-owner (회귀) | PASS | PASS | 0 | 0 | 이번 변경 없음 · 진입 정상 |

white screen 0 · JS exception(pageerror) 0 · editor/preview clipping 0.
KPA/KCos/GP/PH 4서비스 모두 매장 계정 로그인 성공(로그인 후 각 매장 진입 경로로 정상 리다이렉트).

### 10-3. 실측으로 발견해 이번 WO 안에서 고친 결함 1건

`/store/library/contents` M390 에서 문서 가로 overflow 20px. 원인은 이번에 채택한 공통
`StorePageShell` 의 헤더 액션 행이 `flexWrap` 없이 3버튼(콘텐츠 제작 / 제작 가이드 / 새로고침)을
한 줄에 강제한 것. 공통 shell 에 `flexWrap: 'wrap'` + `justifyContent: 'flex-end'` 를 넣어
좁은 폭에서 액션이 줄바꿈하도록 수정했다(데스크톱 렌더 무변경). 같은 shell 을 쓰는 다른 화면
(`/store/library/resources`, `/store/content`)은 수정 전에도 overflow 0 이었다.

### 10-4. BLOCKED_DATA — ProductMarketing 실 데이터

`/store/commerce/products/:productId/marketing` 는 **앱 안에 이 경로로 가는 링크가 없다**
(KPA 소스 전수 grep 결과 진입 링크 0). 실 productId 를 UI 로 얻을 수 없어 실데이터 렌더는 BLOCKED_DATA 로 남긴다.
다만 잘못된 id 로 직접 진입해 API 500 을 만든 경우, 공통 View 가 새 load-error 계약대로
"마케팅 자산 정보를 불러오지 못했습니다 / 다시 시도" 화면을 렌더하는 것을 실측 확인했다
(백지·무한 로딩·빈 목록 위장 없음). 진입 링크 부재 자체는 이번 WO 범위 밖이며 §7 후속 후보로 기록한다.

---

## 부록 A — 재산출 census 전수표 (135행)

표기: `LOC✔` = 공통 core 패키지 소비 · `—` = 해당 서비스에 없음.

| 화면 | KPA | KCos | GP | PH |
|---|---:|---:|---:|---:|
| AccountPage | — | — | — | 21 |
| AddO4oStandardProductModal | 316✔ | — | — | — |
| B2BOrderPage | — | — | 695 | — |
| BlogEditorPage | — | — | — | 153 |
| BlogPage | — | — | — | 175 |
| BlogTemplates | 191 | — | — | — |
| CartPage | — | — | — | 289 |
| ChannelLayerSection | 271 | — | — | — |
| ContentCreationGuideModal | 376 | — | — | — |
| ContentHubPage | — | — | 95✔ | — |
| ContentLibraryPage | — | — | 335✔ | — |
| ContentPage | — | — | — | 291 |
| ContentPdfExportModal | 685 | — | — | — |
| CreateContentFromResourcesModal | 333 | — | — | — |
| CustomerRequestsPage | — | — | 742 | — |
| EcommerceTemplates | 213 | — | — | — |
| ExternalSalesPanel | 456 | — | — | — |
| ForeignVisitorPartnerQrCodesPage | 354 | — | — | — |
| ForeignVisitorPartnersPage | 401 | — | — | — |
| ForeignVisitorSalesSupportPage | 108✔ | 27✔ | 27✔ | — |
| ForeignVisitorSalesSupportPaymentResultPage | 133 | — | — | — |
| FunnelPage | — | — | 315 | — |
| HandledProductsPage | — | — | — | 437✔ |
| HomePage | — | — | — | 358✔ |
| HubB2BCatalogPage | 94✔ | — | — | — |
| HubBlogLibraryPage | 101✔ | — | — | — |
| HubContentLibraryPage | 216✔ | — | — | — |
| HubMultilingualContentLibraryPage | 285✔ | — | — | — |
| HubPopLibraryPage | 100✔ | — | — | — |
| HubQrLibraryPage | 100✔ | — | — | — |
| HubScreenSetLibraryPage | 519✔ | — | — | — |
| HubSignageLibraryPage | 141✔ | — | — | — |
| HubVideoLibraryPage | 368✔ | — | — | — |
| InterestRequestsPage | — | 188 | — | — |
| KioskTemplates | 172 | — | — | — |
| LibraryPage | — | — | — | 100✔ |
| LibraryResourcesPage | — | — | — | 383 |
| LocalProductsPage | — | — | — | 104✔ |
| ManualDetailPage | — | — | — | 174 |
| ManualsPage | — | — | — | 134 |
| MarketingAnalyticsPage | 25✔ | — | — | — |
| MediaDetailPage | — | — | 190 | — |
| OnlineSalesOrderDetailPage | 324✔ | — | — | — |
| OnlineSalesOrdersPage | 328✔ | — | — | — |
| OrderDetailPage | — | — | — | 197 |
| OrdersPage | — | — | — | 138 |
| PaymentFailPage | — | — | — | 60 |
| PaymentPage | — | — | — | 198 |
| PaymentSuccessPage | — | — | — | 106 |
| PharmacyApprovalGatePage | 21 | — | — | — |
| PharmacyB2BPage | 680 | — | — | — |
| PharmacyB2BProducts | — | — | 41✔ | — |
| PharmacyBlogPage | 760✔ | — | 93✔ | — |
| PharmacyInfoPage | 687 | — | 76 | — |
| PharmacyManagement | — | — | 367✔ | — |
| PharmacyOrders | — | — | 296✔ | — |
| PharmacyPage | 222 | — | — | — |
| PharmacyPopPage | 522✔ | — | — | — |
| PharmacySellPage | 755 | — | — | — |
| PharmacySettings | — | — | 925 | — |
| PharmacyVideoPage | 514✔ | — | — | — |
| PlaylistDetailPage | — | — | 220 | — |
| PopPage | — | — | — | 458 |
| ProductDetailPage | — | — | — | 247 |
| ProductMarketingPage | 33✔ | 24✔ | 24✔ | — |
| ProductPopBuilderPage | 36✔ | 33✔ | 33✔ | — |
| ProductionMaterialEditorPage | 490 | 56✔ | 56✔ | — |
| ProductsPage | — | — | — | 180✔ |
| QrPage | — | — | — | 617 |
| QrPrintTemplateModal | 228 | — | — | — |
| RecommendedServicesSection | 164 | — | — | — |
| RegisterStoreResourceModal | 446 | — | — | — |
| SellerRecruitmentsBrowsePage | 337 | — | — | — |
| SignagePage | — | — | — | 420 |
| SignagePlaybackPage | 529 | 38✔ | 38✔ | — |
| SignagePlayerSelectPage | 89✔ | 23✔ | 23✔ | — |
| SignagePreviewPage | — | — | 82 | — |
| StartProductionModal | 42✔ | — | — | — |
| StoreAssetsPage | 24✔ | 21✔ | 21✔ | — |
| StoreBillingPage | — | — | 154 | — |
| StoreBlogManagePage | — | 84✔ | — | — |
| StoreBlogPage | — | 158✔ | 158✔ | — |
| StoreBlogPostPage | — | 129✔ | 126✔ | — |
| StoreCart | — | — | 357 | — |
| StoreChannelsPage | 1521✔ | 98✔ | 112✔ | — |
| StoreCommerceProductsPage | — | 40✔ | — | — |
| StoreContentEditPage | 464 | — | — | — |
| StoreContentsSelector | 1043✔ | — | — | — |
| StoreDescriptionViewModal | 211 | — | — | — |
| StoreDirectContentPage | 406 | — | — | — |
| StoreFront | — | — | 374 | — |
| StoreHandledProductsPage | 484✔ | — | — | — |
| StoreHomePage | 391✔ | — | — | — |
| StoreHubLatestFeed | 540✔ | — | — | — |
| StoreHubPage | 60✔ | — | — | — |
| StoreInfoPage | — | 72 | — | 439 |
| StoreLibraryContentsPage | 195✔ | 68✔ | 68✔ | — |
| StoreLibraryResourcesPage | 870✔ | 31✔ | 44✔ | — |
| StoreLocalProductsPage | 533✔ | 24✔ | 24✔ | — |
| StoreMainPage | — | — | 743✔ | — |
| StoreManagementSection | 68 | — | — | — |
| StoreMarketingAnalyticsPage | — | 22✔ | 22✔ | — |
| StoreMultilingualContentsMyPage | 161 | — | — | — |
| StoreNewProductRequestModal | 484 | — | — | — |
| StoreOrderWorktablePage | 1064 | — | — | — |
| StoreOrdersPage | 306✔ | 373✔ | — | — |
| StoreOverviewPage | — | — | 263✔ | — |
| StoreOverviewSection | 175 | — | — | — |
| StorePlaylistCreatePage | 52✔ | 42✔ | 42✔ | — |
| StorePopPage | 1085✔ | 83✔ | 85✔ | — |
| StorePopStaffPage | — | 46✔ | 46✔ | — |
| StoreProductDescriptionsPage | 116✔ | 47✔ | 47✔ | — |
| StoreProductDetail | — | — | 356 | — |
| StoreProductMultilingualContentPage | 423 | — | — | — |
| StoreProductQrModal | 325 | — | — | — |
| StoreProductRequestsListModal | 172✔ | — | — | — |
| StoreProductionMaterialsPage | — | 73✔ | 73✔ | — |
| StoreProducts | — | — | 281 | — |
| StoreQRPage | 2067✔ | — | — | — |
| StoreQrAiDescriptionPage | 657 | — | — | — |
| StoreQrPage | — | 78✔ | 86✔ | — |
| StoreRecruitmentApplicationsPage | 127✔ | 63✔ | 63✔ | — |
| StoreRevenueSummaryPage | — | 301 | — | — |
| StoreSettingsPage | — | 725 | — | — |
| StoreSignageMainPage | — | — | 1756✔ | — |
| StoreSignagePage | 2202✔ | 394✔ | 986 | — |
| StoreTabletDisplaysPage | 1877✔ | 43✔ | 110✔ | — |
| TabletContentLibraryList | 755✔ | — | — | — |
| TabletCornerContentsPanel | 438✔ | — | — | — |
| TabletCornerSwapModal | 222✔ | — | — | — |
| TabletRequestsPage | 413✔ | — | — | — |
| TabletScreenSetManager | 286✔ | — | — | — |
| TabletTemplates | 176 | — | — | — |
| TabletsPage | — | — | — | 400✔ |
| productionTargets | 206✔ | — | — | — |

*Updated: 2026-08-19 · WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1*
