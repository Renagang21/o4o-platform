# TODO-O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1

> **상태:** PR 인계 · **작성일:** 2026-11-06
> **branch:** `wo/standard-list-workspace-contract` · **base:** `dd83d30d29`
> **범위 끝:** push · PR 생성. main 병합 · 배포 · 운영 데이터 변경 · DB migration/seed 는 범위 밖이다.

## 1. 목표

O4O 표준 테이블을 쓰는 업무 화면의 **목록 화면 계약**을 Core 로 공통화한다.

```text
화면 제목                         [신규 등록]
검색 · 필터
선택 항목 작업 영역(ActionBar)
테이블
페이지네이션
```

- 기존 목록을 먼저 보여 주고, 등록 폼은 등록 버튼으로 연다.
- 수정은 행 업무 진입 또는 체크 후 ActionBar 로 한다.
- 빈 목록일 때만 중앙에도 같은 등록 버튼을 둔다.
- 검색 · 탭 · 페이지 · 계정 · 권한이 바뀌면 오래된 선택과 상세를 정리한다.
- 중복 실행 방지, 실제 서버 결과, 실패 복구를 유지한다.

## 2. 진행 항목

| # | 항목 | 상태 |
|---|---|---|
| 1 | 이관 worktree · 런타임(Node 22.23.4 / npm 10.9.9 / pnpm 10.25.0) 정렬 | 완료 |
| 2 | 문서 · 코드 조사, #945 비교 판정 | 완료 |
| 3 | 소비처 전수 표 작성(§5) · TODO 보정 | 완료 |
| 4 | Core 계약 구현 (`@o4o/ui` `ListWorkspace` · `useListSelection`) | 완료 |
| 5 | 사이니지 동영상 · 재생목록 · 디스플레이 재생 재구성 | 완료 |
| 6 | #945 누락분 최소 포팅 | 완료 |
| 7 | 기존 비준수 화면 전환 | 완료(배치 전환, §5) |
| 8 | 정본 · 도입 가이드 · 전환 기준 · 예외 기록, 현행 문서 정비 | 완료 |
| 9 | 타입검사 · 빌드 · 테스트 · PC/mobile 검증 | 완료(모의 API, [CHECK](../checks/CHECK-O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1.md)) |
| 10 | push · PR 생성 · 완료 보고 | 진행 |

## 3. #945 비교 판정

대상 head: `98981277f1a113d26d75f978b4ce89ca173e8237`. 병합 · 재적용하지 않고 실제 누락만 옮긴다.

| 항목 | main 상태 | 판정 |
|---|---|---|
| 다른 매장 영상을 재생목록에 추가 차단 (`store-playlist.controller`) | 누락 | 포팅 |
| 매장 접근 없음을 빈 목록으로 응답 | 누락 | 포팅(403) |
| 재생목록 이름 trim | 누락 | 포팅 |
| 협업체 자료의 개별 영상 가져오기 | 누락 | 포팅 |
| 매장 일정 패널 | 사용자 지시로 폐기 | 미포팅 |
| 가입 · membership 변경 | 이번 범위 밖 | 미포팅 |

#945 의 알려진 실패(`demo-owner-qualification.service.ts` 타입 오류, `neture-membership-ledger-independence.spec.ts`, SonarCloud, 충돌 28건)는 가져오지 않는다.

## 4. Core / Extension 경계

| 구분 | 책임 |
|---|---|
| Core (`@o4o/ui`) | 목록 화면 배치, 제목 · 신규 버튼 위치, 검색 · 필터 영역, 선택 상태 · ActionBar, 페이지네이션 자리, 로딩 · 빈 · 오류 · 처리 상태 |
| Extension (각 업무) | 열 · 필터, 등록 · 상세 · 수정 화면, 선택 후 명령, 권한 기능, 서버 호출 |

독립 테이블 체계나 새 패키지를 만들지 않는다. `package.json` · lockfile 은 바꾸지 않는다.

## 5. 소비처 표

> 2026-11-06 전수 조사 결과. 집계: 전환 23 · 준수 20 · 읽기 전용 예외 51 · 목록 업무 아님 7 · 하위 표 2.
> 분류(`class`)는 **전환 전** 상태다. `note` 의 표기도 전환 전 화면을 설명한다.
> 조사 한계: 상단 오른쪽 배치는 JSX 순서로 추론했고 전 화면을 브라우저로 본 것은 아니다. ActionBar 사용 집계는 완전하지 않다. '소비처 없음'은 이름 검색 기준이다.
> 전환 화면 중 `ListWorkspace` 를 직접 쓰는 것은 사이니지뿐이다. 나머지는 배치만 계약에 맞췄다(정본 §4).
> 표에 없는 `SignagePlayerSelectPage`(표 없는 선택 화면)는 공통 탭과 제목만 정비했다. `SelectionTable` 은 소비처 0, `EditableDataTable` 은 소비처 1(`SupplierProductsPage`)이며 바꾸지 않았다.

#### apps/admin-dashboard: `apps/admin-dashboard/src/pages`
| path | table | header | class | note | 적용 |
|---|---|---|---|---|---|
| kpa/AdminForceAssetPage | BaseTable | PageHeader | NO_TOP_CREATE | "강제 배포 생성" at right of filter row, opens dialog | 전환: 강제 배포 생성을 PageHeader 오른쪽으로 |
| kpa/AdminSnapshotBrowserPage | BaseTable | PageHeader | READ_ONLY | | 예외: 읽기 전용 |
| kpa/HubContentsPage | BaseTable | PageHeader (refresh) | READ_ONLY | notice cards, tabs and description before table | 예외: 읽기 전용 |
| kpa/HubNoticeListPage | BaseTable | PageHeader actions | LIST_FIRST | modal create | 준수 |
| kpa/MyStoreContentsPage | BaseTable | PageHeader | READ_ONLY | | 예외: 읽기 전용 |
| kpa/StoreContentWorkspacePage | BaseTable | PageHeader | FORM_BEFORE_LIST (explainer) | always-on "작업 공간 안내" box; no create | 전환: 안내를 접음 |
| o4o-product-db/ImageQualityPage | BaseTable | ProductDbLayout | READ_ONLY | explainer, pills, selectable, AB | 예외: 읽기 전용 |
| o4o-product-db/ProductCandidatesPage | BaseTable | ProductDbLayout | READ_ONLY | selectable, AB | 예외: 읽기 전용 |
| o4o-product-db/ProductMastersPage | BaseTable | ProductDbLayout | NO_TOP_CREATE | "새 상품 등록" in search/filter toolbar, navigates | 전환: 새 상품 등록을 상단 오른쪽으로(콘솔 탭 예외) |
| o4o-product-db/StoreProductRequestsPage | BaseTable | ProductDbLayout | READ_ONLY | modal review | 예외: 읽기 전용 |
| operators/CentralFundingReview | DataTable | h2 | READ_ONLY | | 예외: 읽기 전용 |
| operators/CentralMemberWorkspace | DataTable | h2 | READ_ONLY | tabs, search, selectable, AB | 예외: 읽기 전용 |
| operators/CentralOperationNotifications | DataTable | h2 | OTHER | dashboard panels, AB | 해당 없음: 목록 업무 화면 아님 |
| operators/CentralOperationOverview | DataTable | h2 | OTHER | dashboard panels, AB | 해당 없음: 목록 업무 화면 아님 |
| operators/CentralPharmacistQualifications | DataTable | h2 | READ_ONLY | AB, drawer | 예외: 읽기 전용 |
| operators/CentralSupplierReview | DataTable | h1 | READ_ONLY | AB; detail appears on action | 예외: 읽기 전용 |
| operators/OperatorsPage | DataTable | PageHeader actions | FORM_BEFORE_LIST (explainer) | top create is fine, but a "업무 운영자 지정" card and two `<details>` sit between filter and table; selectable, AB | 전환: 지정 카드 · 기타 권한을 표 뒤로 |
| platform/account-governance/AdminErasureHistoryPage | DataTable | h1 | READ_ONLY | AB; detail on action | 예외: 읽기 전용 |
| platform/account-governance/AdminStoresPage | DataTable | h1 | READ_ONLY | AB; detail on action | 예외: 읽기 전용 |
| platform/account-governance/AdminResourceDeletionPage | DataTable | h1 | READ_ONLY | delete form only after action | 예외: 읽기 전용 |
| users/ActiveUsers | BaseTable | PageHeader | READ_ONLY | | 예외: 읽기 전용 |
| users/UsersListClean | BaseTable | PageHeader | READ_ONLY | selectable, custom bulk select, no AB | 예외: 읽기 전용 |

Thin wrappers in `operators/` and `kpa/`:
- CentralNetureAnalytics: OperatorAnalyticsPage
- CentralNetureStores: OperatorStoresList
- CentralNetureServiceOperations: CommunityHomeConsole, OrdersManagementPage
- CentralNetureProductOperations: neture-product-operations module (exports not resolved)
- CentralSupplierOperations: OperatorSupplierApprovalPage, AdminSupplierGovernancePage
- CentralSharedWork: ServiceLegalSettingsPage, ContactInquiryAdminPage
- CentralForumOperations: forum requests, delete requests, categories, deleted
- CentralLectureCourses: OperatorLmsCoursesManager
- CentralPartnerModeration: PartnerCommunityOperator
- central-operation-renderers: ServiceMembersWorkspace, AdminServiceApprovalPage, AdminMemberManagementPage, PharmacyMembershipReviewPage
- kpa/AdminRequiredSignagePage: ForcedContentPage

#### Small services: base `services`
| path | table | header | class | note | 적용 |
|---|---|---|---|---|---|
| web-kpa-branch/src/pages/service-admin/ServiceAdminPage | DataTable | none (section) | READ_ONLY | status tabs, selectable, AB | 예외: 읽기 전용 |
| web-pharmacy-coop/src/Management | DataTable | h2 | FORM_BEFORE_LIST (strong) | AiOverviewPanel, StatusSummary, optional EligibilitySettings, explainer and always-visible reason textarea all precede AB and table | 전환: AI · 설정을 접고, 사유 입력은 선택 시에만 |

Thin wrappers:
- web-lecture `pages/operator/OperatorContactPage`: ContactInquiryAdminPage
- web-lecture `pages/operator/OperatorMembersPage`: ServiceMembersWorkspace
- web-partner `src/CommunityOperator`: PartnerCommunityOperator

#### services/web-neture: `services/web-neture/src/pages`
| path | table | header | class | note | 적용 |
|---|---|---|---|---|---|
| account/SupplierOrdersListPage | DataTable | h1 | READ_ONLY | | 예외: 읽기 전용 |
| account/SupplierSettlementsPage | DataTable | h1 | READ_ONLY | KPI, filter tabs | 예외: 읽기 전용 |
| admin/AdminMasterManagementPage | DataTable | h1 | LIST_FIRST (borderline) | 신규 등록 in header, modal; stat and barcode lookup card before search | 준수: 바코드 조회 카드는 경계 사례로 유지 |
| admin/ai/AiCostPage | DataTable x2 | h1, own nav | READ_ONLY | summary cards | 예외: 읽기 전용 |
| operator/BrandManagementPage | DataTable | h1 | FORM_BEFORE_LIST (explainer) | GuideBlock, 4 steps | 전환: 안내를 접음 |
| store/StoreOrdersPage | DataTable | h1 | FORM_BEFORE_LIST (explainer) | GuideBlock, 3 steps; no create | 전환: 안내를 접음 |
| supplier/SupplierLibraryPage | DataTable | h1 | FORM_BEFORE_LIST (explainer) | create is top, but GuideBlock 6 steps, filter and info bar precede table | 전환: 안내를 접음 |
| supplier/SupplierProductsPage | EditableDataTable | h1 | LIST_FIRST | 상품 추가 in header; info and collapsed `<details>`; custom selection bar, no AB | 준수 |
| supplier/SupplierRecruitmentsPage | DataTable | h1 | READ_ONLY | explainer; created from products | 예외: 읽기 전용 |

Thin wrappers:
- operator/AnalyticsPage: OperatorAnalyticsPage
- operator/ForumDeleteRequestsPage: OperatorForumDeleteRequestsConsolePage
- operator/ForumManagementPage: OperatorForumRequestsConsolePage
- operator/ForumDeletePage: OperatorForumCategoriesPage
- operator/StoreManagementPage: OperatorStoresList
- operator/ServiceContactPage: ContactInquiryAdminPage
- operator/UsersManagementPage: OperatorMembersConsolePage
- operator/ServiceMembersPage: ServiceMembersWorkspace
- admin/CommunityManagementPage: CommunityHomeConsole
- library/ContentLibraryPage: ContentHubTemplate
- resources/NetureResourcesPage: ResourcesHubTemplate

Direct routes in `services/web-neture/src/App.tsx`: ForumDeletedManagementPage, the neture-product-operations and neture-service-operations pages, OperatorAnalyticsPage, PharmacyMembershipReviewPage, ServiceLegalSettingsPage, the supplier-operations pages, StoreProductsManagerPage.

`forum/ForumPage` uses ForumListTemplate, which has no standard table, so it is excluded.

#### services/web-store: `services/web-store/src/pages/pharmacy`
| path | table | header | class | note | 적용 |
|---|---|---|---|---|---|
| HubScreenSetLibraryPage | DataTable x2 | h1 | READ_ONLY | import source tabs | 예외: 읽기 전용 |
| HubVideoLibraryPage | DataTable | h1 | READ_ONLY | AB | 예외: 읽기 전용 |
| PharmacyB2BPage | DataTable | h1 | READ_ONLY | custom selection, no AB | 예외: 읽기 전용 |
| PharmacyPopPage | DataTable | h1 | LIST_FIRST | header link buttons, status pills, AB | 준수 |
| PharmacyVideoPage | DataTable | h1 | LIST_FIRST | header link buttons, status pills, AB | 준수 |
| StoreContentsSelector + StoreLibraryContentsPage | DataTable | StoreTaskPageShell | NO_TOP_CREATE (provisional) | shell moves `headerActions` to a body row; their contents not read; AB | 전환: 셸이 머리 오른쪽에 렌더 |
| StoreLibraryResourcesPage | DataTable | StoreTaskPageShell (aliased as StorePageShell) | NO_TOP_CREATE | 자료 등록 lands in body "빠른 작업" row above table, not top-right; AB | 전환: 셸이 머리 오른쪽에 렌더 |
| StoreOrdersPage | DataTable via BuyerOrderLedgerView | ledger h1 | READ_ONLY | | 전환: 안내를 접음 |
| StoreOrderWorktablePage | DataTable | h1, local Header | FORM_BEFORE_LIST (strong) | always-on `ProductDescriptionLookup` search form before filter and table; a lookup, not a create form | 전환: 설명 조회를 접음(작업대 예외) |
| StoreSignagePage, assets tab | DataTable | h1, StoreAiSlot | FORM_BEFORE_LIST (strong) | always-open `VideoRegistration` form and "제공 영상 가져오기" before 동영상 보관함 table; AB | 전환: `ListWorkspace` 직접 적용 |
| StoreSignagePage, playlist tab | DataTable | h1, StoreAiSlot | COLLAPSED_LIST | table inside `<details open={!selectedPlaylistId}>`, closes once a playlist is selected; 새 재생목록 in section header; AB | 전환: `ListWorkspace` 직접 적용 |
| TabletContentLibraryList (in TabletScreenSetManager) | DataTable | h3 card header in manager | NO_TOP_CREATE | "태블릿 화면 만들기" at end of filter row; selectable, AB | 전환: 만들기를 상단 오른쪽으로 |
| TabletRequestsPage | DataTable | h1 | READ_ONLY | AB | 예외: 읽기 전용 |
| StoreQRPage + StoreQrOperationBoard | DataTable | h1, StoreAiSlot | LIST_FIRST | QR 만들기 in header group; guide in closed `<details>`; create panel only on action and hides the list in studio mode; board itself has no AB | 준수 |
| StoreTabletDisplaysPage | none | | OTHER | no `<DataTable>`, only a comment; uses TabletDeviceList | 해당 없음: 목록 업무 화면 아님 |

Thin wrappers:
- StoreLocalProductsPage: StoreLocalProductsManager
- HubSignageLibraryPage: SignageLibraryView
- HubPopLibraryPage, HubQrLibraryPage: HubImportLibraryView
- HubContentLibraryPage: ContentHubTemplate
- StoreAssetsPage: StoreAssetsPanel
- SignagePlayerSelectPage: SignagePlayerSelectView

Direct routes in `services/web-store/src/App.tsx`: PharmacyMembershipReviewPage, StoreProductsManagerPage.

#### packages/operator-core-ui: `packages/operator-core-ui/src/modules`
All rows use `DataTable` and `h1` unless stated.
| path | class | note | 적용 |
|---|---|---|---|
| cms-content/CmsContentManager | LIST_FIRST | 새 콘텐츠 in header, tabs, AB | 준수 |
| community-home/CommunityHomeConsole (x3) | NO_TOP_CREATE | add button in its own row below tabs | 전환: 추가 버튼을 머리 오른쪽으로 |
| contact-inquiry/ContactInquiryAdminPage | READ_ONLY | | 예외: 읽기 전용 |
| forum-categories/OperatorForumCategoriesPage | READ_ONLY | AB | 예외: 읽기 전용 |
| forum-delete-requests/ForumDeleteRequestsConsole | FORM_BEFORE_LIST (explainer) | GuideBlock, AB | 전환: 안내를 접음 |
| forum-deleted/ForumDeletedManagementPage | READ_ONLY | no `h1`; warning, tabs | 예외: 읽기 전용 |
| forum-hub/OperatorForumHubPage | OTHER | hub dashboard, recent posts table, AB | 해당 없음: 목록 업무 화면 아님 |
| forum-requests/ForumRequestsConsole | READ_ONLY | AB | 예외: 읽기 전용 |
| hub-content-list/OperatorHubContentListPage | LIST_FIRST | header create, AB | 준수 |
| instructor-courses/InstructorCoursesManager | LIST_FIRST | BaseTable, AB | 준수 |
| lms-courses/OperatorLmsCoursesManager | READ_ONLY | policy notice, AB | 예외: 읽기 전용 |
| members/OperatorMembersConsolePage | READ_ONLY | MemberListLayout; stats render before title; AB | 예외: 읽기 전용 |
| neture-product-operations/AdminServiceApprovalPage | READ_ONLY | | 예외: 읽기 전용 |
| neture-product-operations/AllRegisteredProductsPage | READ_ONLY | 3 tab levels, 9 KPIs, AB | 예외: 읽기 전용 |
| neture-product-operations/OperatorProductApprovalPage | FORM_BEFORE_LIST (explainer) | GuideBlock, AB | 전환: 안내를 접음 |
| neture-product-operations/ProductCandidateReviewPage | FORM_BEFORE_LIST (explainer) | GuideBlock, AB | 전환: 안내를 접음 |
| neture-service-operations/AdminMemberManagementPage | READ_ONLY | no `h1`; custom selection | 예외: 읽기 전용 |
| neture-service-operations/AdminSettlementsPage | FORM_BEFORE_LIST (strong) | always-on "정산 계산" form before filter and table | 전환: 정산 계산을 상단 버튼으로 엶(KPI 예외) |
| neture-service-operations/OperatorContactMessagesPage | READ_ONLY | AB | 예외: 읽기 전용 |
| neture-service-operations/OrdersManagementPage | READ_ONLY | | 예외: 읽기 전용 |
| neture-service-operations/RegistrationRequestsPage | READ_ONLY | no `h1`; AB | 예외: 읽기 전용 |
| operator-analytics/OperatorAnalyticsPage | OTHER | AI insights and charts, log table at bottom | 해당 없음: 목록 업무 화면 아님 |
| operator-content-hub/OperatorContentHubConsole | LIST_FIRST | create and headerActions in header, stat cards | 준수 |
| partner-community-operations/PartnerCommunityOperator | OTHER | table only in members tab; explainer and admin management before nav; AB | 해당 없음: 목록 업무 화면 아님 |
| pharmacy-management/PharmacyMembershipReviewPage | READ_ONLY | PharmacyCommerceUi PageHeader, AB | 예외: 읽기 전용 |
| product-applications/ProductApplicationManagementConsole | READ_ONLY | AB | 예외: 읽기 전용 |
| product-order-view/OperatorOrderStatusPage | READ_ONLY | | 예외: 읽기 전용 |
| product-order-view/OperatorProductStatusPage | READ_ONLY | | 예외: 읽기 전용 |
| resources/OperatorResourcesConsolePage | LIST_FIRST | canCreate and AI button in header, AB | 준수 |
| service-legal/ServiceLegalSettingsPage | NO_TOP_CREATE / OTHER | settings page; table in policies tab; 새 문서 in row above table | 전환: 새 문서를 탭 오른쪽 위로(설정 탭 예외) |
| signage-hq/ForcedContentPage | LIST_FIRST | header create; explainer and stats; inline form closed by default (`showForm` false); AB | 준수 |
| signage-hq/HqMediaPage | LIST_FIRST | AB | 준수 |
| signage-hq/HqPlaylistsPage | LIST_FIRST | AB | 준수 |
| signage-hq/SignageTemplatesPage | LIST_FIRST | inline form closed by default; AB | 준수 |
| store-channels/OperatorStoreChannelsPage | READ_ONLY | | 예외: 읽기 전용 |
| store-detail/OperatorStoreDetailPage (x2) | OTHER | detail page with 2 sub-tables | 해당 없음: 목록 업무 화면 아님 |
| stores/OperatorStoresList | READ_ONLY | StandardListToolbar and useStandardListQuery; stats | 예외: 읽기 전용 |
| supplier-content-inbox/SupplierContentInbox | READ_ONLY | | 예외: 읽기 전용 |
| supplier-operations/AdminSupplierGovernancePage | READ_ONLY | | 예외: 읽기 전용 |
| supplier-operations/OperatorSupplierApprovalPage | FORM_BEFORE_LIST (secondary panel) | `SupplierReviewQueue` panel before toolbar and table; standard toolbar and query; AB | 전환: 보완 요청 대기 목록을 접음 |
| surveys/OperatorSurveyListPage | LIST_FIRST | header create | 준수 |

Also in the census: `packages/operator-ux-core/src/recruitment-exposure/RecruitmentExposureConsole` is OTHER (StandardListToolbar with cards, no table), wrapped by OperatorRecruitmentExposurePage.

#### Other packages: base `packages`
| path | table | header | class | note | 적용 |
|---|---|---|---|---|---|
| store-ui-core/src/components/hub-import/HubImportLibraryView | DataTable | h1 | READ_ONLY | headerAction, headerBelow slots; AB | 예외: 읽기 전용 |
| store-ui-core/src/components/local-products/StoreLocalProductsManager | BaseTable | h1 | NO_TOP_CREATE | 상품 등록 at end of search row, modal | 전환: 상품 등록을 머리 오른쪽으로 |
| store-ui-core/src/components/pop-staff/StorePopStaffView | DataTable | h1 | LIST_FIRST | AB | 준수 |
| store-ui-core/src/components/qr/StoreQrOperationBoard | DataTable | none | part | table only, used by StoreQRPage | 하위 표: 상위 화면을 따름 |
| store-ui-core/src/components/signage/SignagePlayerSelectView | DataTable | headerExtra | READ_ONLY | AB | 예외: 읽기 전용 |
| store-ui-core/src/components/signage-library/SignageLibraryView | DataTable | h1 | READ_ONLY | headerAction, AB | 예외: 읽기 전용 |
| store-ui-core/src/components/supply-catalog/SupplyCatalogHub | DataTable | h1 | READ_ONLY | AB | 예외: 읽기 전용 |
| store-ui-core/src/components/supply-catalog/SupplyProductExplorer | DataTable | h1 | READ_ONLY | toolbar slot | 예외: 읽기 전용 |
| store-asset-policy-core/src/components/StoreAssetsPanel | BaseTable | h1 | READ_ONLY | exposure cards, tabs, AB | 예외: 읽기 전용 |
| store-asset-policy-core/src/components/ForcedSection | BaseTable | none | part | sub-table | 하위 표: 상위 화면을 따름 |
| store-products-ui/src/StoreProductsManagerPage | BaseTable | headerSlot / DefaultHeader | LIST_FIRST | guideSlot and infoText precede table | 준수 |
| shared-space-ui/src/ContentHubTemplate | BaseTable | h1, headerAction | READ_ONLY unless action injected | DefaultTableView | 예외: 읽기 전용 |
| shared-space-ui/src/LmsHubTemplate | BaseTable | h1, headerAction | LIST_FIRST | AB | 준수 |
| shared-space-ui/src/ResourcesHubTemplate | BaseTable | h1, headerAction / createAction | LIST_FIRST | AB | 준수 |

Excluded because they render no standard table directly: `StoreBlogManageView`, `BuyerOrderLedgerView` (slot only), `ForumListTemplate`, `ForumListToolbar`, `apps/admin-dashboard/src/lib/assignment-row.ts`, `assetColumns`, and `StoreAssetsView` (wrapper).

#### No consumer found by the name-map grep
Not proven unused:
- **operator-core-ui and related:** OperatorHubContentListPage, CmsContentManager, OperatorForumHubPage, InstructorCoursesManager, OperatorContentHubConsole, ProductApplicationManagementConsole, OperatorOrderStatusPage, OperatorProductStatusPage, OperatorResourcesConsolePage, HqMediaPage, HqPlaylistsPage, SignageTemplatesPage, OperatorStoreChannelsPage, OperatorStoreDetailPage, SupplierContentInbox, OperatorSurveyListPage, OperatorRecruitmentExposurePage
- **store and shared packages:** StorePopStaffView, SupplyCatalogHub, SupplyProductExplorer, LmsHubTemplate, StoreAssetsView

## 6. 사이니지 확정 UI

| 탭 | 목록 열 | 상단 버튼 | 등록 · 상세 |
|---|---|---|---|
| 동영상 | 체크 · 썸네일 · 영상 이름 · 출처 · 등록일 | `동영상 등록` | `/videos/new`: O4O 영상 등록 / 외부 영상 연결, AI 보조는 이 화면 안, 커뮤니티 · 가입 협업체 가져오기 보존 |
| 재생목록 | 체크 · 이름 · 동영상 수 · 총 재생시간 · 수정일 | `재생목록 만들기` | `/playlist/:id`: 이름 수정, 영상 추가 · 제거 · 순서 변경 |
| 디스플레이 재생 | 해당 없음 | 해당 없음 | 새 탭 → 재생목록 선택 → 재생 시작 → 전체화면 반복. 주소로 선택 유지 |

제거: `상세 관리`, `저장한 재생목록 선택`, `동영상 보관함` 표기, 매장 재생 일정 잔존 설명.

보존: 필수 영상 노출 기간 정책, 다른 소비처의 공통 일정, Store Playlist KEEP-LEGACY 경계, 폐기 URL `/schedules` 호환 redirect.

## 7. 검증 계획

- `@o4o/ui` · `web-store` · `api-server` 타입검사 · 빌드 · 관련 테스트
- 공통 모듈 소비처 검사: `node scripts/quality/check-literal-consumers.mjs --source <파일>`
- PC · mobile: 체크 → 상단 작업 → 상세 · 실행 → 목록 갱신, 직접 URL, 권한 거절, 실패 · 재시도
- 최소 2개 소비처 smoke, Consumer Impact Matrix 기록

## 8. 미해결

- `gh` 인증 토큰이 무효(HTTP 401)다. PR 생성 전에 사용자의 재인증이 필요하다.
- 재생목록 집계 SQL 실행 · 실서버 smoke 등 검증 잔여는 [CHECK 미해결](../checks/CHECK-O4O-STANDARD-LIST-WORKSPACE-CONTRACT-V1.md#미해결) 에 둔다.
