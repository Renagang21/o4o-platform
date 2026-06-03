# IR-O4O-OPERATOR-ENTITY-UI-CANONICAL-AUDIT-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·DB·UI·migration 변경 없음.**
>
> Operator Dashboard 공통화 이후 실제 Operator Entity UI (회원 / 역할 / 승인 / 상품 / 포럼 / 매장 / 강의 / 자료) 의 UI/UX Drift 전수 조사. **"기능이 같으면 UI 도 같아야 한다"** 원칙 기준으로 canonical 정렬 대상 확정.

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only, 4 병렬 Explore agent 통합)
- **선행 산출물:**
  - [IR-O4O-OPERATOR-CONSOLE-FRONTEND-BOUNDARY-POLICY-ALIGNMENT-AUDIT-V1](IR-O4O-OPERATOR-CONSOLE-FRONTEND-BOUNDARY-POLICY-ALIGNMENT-AUDIT-V1.md) (F6 정렬 — 백엔드 query 측면)
  - [CHECK-O4O-OPERATOR-CONSOLE-SERVICEKEY-ALIGNMENT-V1](CHECK-O4O-OPERATOR-CONSOLE-SERVICEKEY-ALIGNMENT-V1.md)
- **참조 SSOT:**
  - `docs/architecture/OPERATOR-DASHBOARD-STANDARD-V1.md` (5-Block)
  - `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md`
  - `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md`
- **사전 동기화:** origin/main 와 0 commits 차이, staged 비어 있음.
- **수정 행위:** **없음** (조사 전용)

---

## 0. 최종 요약 — 큰 그림

### 0.1 한 줄 결론

> **공통화 인프라는 충실 (operator-ux-core + @o4o/ui)** — 그러나 4 service 의 **adoption density / 동일-기능-다른-UI 패턴이 분야별로 다름**. Drift 의 본질은 "기능이 같은데 UI 가 다른가" 와 "기능이 다른데 비슷한 메뉴 이름" 두 축에 있음.

### 0.2 도메인별 신호 강도

| 도메인 | Drift 정도 | 본질 |
|---|:---:|---|
| **Members** | 中 | 4 service 모두 DataTable 사용하나 detail surface (Drawer vs Page nav) / bulk action / status filter 패턴이 갈림. K-Cos 가 가장 빈약 |
| **Roles** | 매우 낮음 | 4 service 모두 `@o4o/ui RoleManagementPage` thin wrapper — 정합 우수 |
| **Approvals** | **높음** | 도메인 다양성 (Collaboration / MarketTrial / StoreApproval / Pharmacy / Forum / Product) 때문에 list-detail 패턴이 4-5 가지 공존. 일부는 의도된 차이 |
| **Products** | **높음** | Neture 의 `AllProductsOverviewPage` (raw HTML table + custom drawer) 가 큰 D. Brand/Category 는 의도된 service-specific |
| **Forums** | 中-高 | KPA = 2 탭 (requests + categories), Neture = 1 탭 (requests), GP/K-Cos = analytics-only. Backend capability 차이도 의심 |
| **Stores** | 中 | Stores list 는 3 패턴 (wrapper / direct DataTable / custom HTML). StoreDetail 은 3 service 가 동일 |
| **LMS** | **높음** | 4 service 의 page 명/유무 가 모두 다름. Neture 부재, 나머지 3 service 명명 불일치 |
| **Content / Resources** | **매우 높음** | KPA 만 5 page (Content Hub / Detail / Working content / Resources), 나머지 subset. GuideContents 만 공통 |
| **Misc (Settings/Reports/Billing)** | **C 위주** (의도된 service-specific) | GP 의 Billing/Settlement, KPA 의 Audit/Legal, Neture 의 SupplierQuality — 도메인 본질 |
| **Dashboards** | 매우 낮음 | 4 service 모두 `OperatorDashboardLayout` + 5-Block 채택. Config builder 만 service-별 |

### 0.3 즉시 처리 가치 — Top 5

| # | Drift | 영향 service | 분류 | 권고 |
|---|---|---|:---:|---|
| 1 | **OperatorGuideContentsPage.tsx 4 service copy-paste** (24 lines × 4, serviceKey 만 다름) | 4 | A | 즉시 통합 가능 — `@o4o/operator-core-ui/modules/guide-contents` 가 이미 canonical, wrapper 만 service config 로 통합 |
| 2 | **aiReportConfig.tsx 의 2-tier feature parity 깨짐** (KPA/Neture empty mode 23 lines vs GP/K-Cos full mode 155 lines + mock) | 4 | D | 정합 필요 — 전부 empty 또는 전부 full 로 정렬 + mock 제거 |
| 3 | **Members detail surface 분기** (KPA/Neture = BaseDetailDrawer, GP/K-Cos = `/operator/users/:id` page nav) | 4 | B | drawer or page 중 canonical 선택 → 정렬 |
| 4 | **Stores list 3 패턴 공존** (GP/KPA = `OperatorStoresList` adapter, K-Cos = direct DataTable, Neture = raw HTML table) | 4 | B/D | K-Cos → adapter 마이그레이션 + Neture → adapter 마이그레이션 |
| 5 | **Members bulk action 비대칭** (KPA/Neture/GP 정렬, K-Cos 만 없음) | 1 (K-Cos) | B | useBatchAction + ActionBar 추가 |

### 0.4 사이클 정리 의도

본 IR 은 **즉시 WO 5 건이 가능한 drift 를 식별**. 그 외 분류 (의도된 service-specific / 의도된 도메인 다양성) 는 정합 정상으로 인정. 점진적 정렬은 별건 WO 시리즈로 분리.

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 |
| 조사 방법 | 4 병렬 Explore agent (Members+Roles+Approvals / Products+Forums+Stores / LMS+Content+Misc / Common UX inventory) |
| 조사 범위 | `services/web-{kpa-society, neture, glycopharm, k-cosmetics}/src/pages/operator/**` + `packages/{operator-ux-core, ui, account-ui, error-handling}/src/**` + `apps/admin-dashboard/src/pages/operator/**` (간접 비교) |

---

## 2. Common UX 공통 컴포넌트 — Adoption Matrix

### 2.1 핵심 컴포넌트별 service 별 reference count

| Component | Package | KPA | Neture | GP | K-Cos | Adoption |
|---|---|:---:|:---:|:---:|:---:|---|
| `DataTable` | operator-ux-core/list | 71 | 31 | 39 | 26 | ✅ 100% |
| `EditableDataTable` | operator-ux-core/list | 0 | 0 | 0 | 0 | ❌ 0% (정의됨, 미사용) |
| `MemberListLayout` | operator-ux-core/member-list | 4 | 4 | 4 | 4 | ✅ 100% |
| `StatusBadge` | operator-ux-core/member-list | 7 | 8 | 25 | 4 | ✅ 100% (밀도 차이) |
| `RoleBadge` | operator-ux-core/member-list | **0** | 3 | 2 | 2 | △ 75% (KPA 미사용) |
| `ServiceBadge` | operator-ux-core/member-list | **0** | 1 | 2 | 2 | △ 75% (KPA 미사용) |
| `useBatchAction` | operator-ux-core/list | 35 | 8 | 4 | 2 | ✅ 100% (K-Cos 가장 낮음) |
| `defineActionPolicy` / `buildRowActions` | operator-ux-core/list | 高 | 中 | 低 | 低 | ✅ 100% |
| `OperatorDashboardLayout` | operator-ux-core | 2 | 2 | 3 | 2 | ✅ 100% |
| 5-Block (KpiGrid / ActionQueueBlock / ActivityLogBlock / AiSummaryBlock / QuickActionBlock) | operator-ux-core/blocks | ✅ | ✅ | ✅ | ✅ | ✅ 100% |
| `Pagination` / `SearchBar` | operator-ux-core/list | 26 | 21 | 17 | 17 | ✅ 100% |
| `FormField` / `Section` | operator-ux-core/form | **0** / **0** | **0** / **0** | **0** / **0** | **0** / **0** | ❌ 0% (정의됨, 미사용) |
| `InfoRow` | operator-ux-core/form | — | — | — | — | ✅ 156 회 전체 합계 |
| `ActionBar` | @o4o/ui | 43 | 16 | 10 | **2** | ✅ 100% (K-Cos 낮음) |
| `RowActionMenu` | @o4o/ui | 41 | 13 | 6 | 5 | ✅ 100% |
| `BulkResultModal` | @o4o/ui | 40 | 12 | 6 | 2 | ✅ 100% (K-Cos 낮음) |
| `ConfirmActionDialog` | @o4o/ui | 4 | 3 | 4 | **0** | △ 75% (K-Cos 미사용) |
| `BaseDetailDrawer` | @o4o/ui | 32 | 9 | 12 | 15 | ✅ 100% |
| `EmptyState` | @o4o/ui | **0** | **0** | **0** | **0** | ❌ 0% (정의됨, 미사용) |
| `toast` | @o4o/error-handling | 20 | 15 | 10 | 7 | ✅ 100% |

### 2.2 핵심 관찰

1. **인프라는 충실 (Tier 1):** DataTable / OperatorDashboardLayout / ActionBar / RowActionMenu / BulkResultModal / BaseDetailDrawer / toast — 4 service 전체 채택. operator-ux-core 와 @o4o/ui 가 충실히 작동.
2. **정의돼 있으나 미사용 (Tier 0):** `EditableDataTable`, `FormField`, `Section`, `EmptyState` — 4 service 모두 0 회. 정의/사용 사이에 큰 갭.
3. **KPA 미적용:** `RoleBadge`, `ServiceBadge` 가 KPA 만 0 회. KPA 의 member list 가 inline role/service rendering 패턴 유지 (legacy 가능성).
4. **K-Cos 가 일관되게 낮음:** ActionBar 2 / BulkResultModal 2 / useBatchAction 2 / ConfirmActionDialog 0 — bulk action 패턴 전반에서 K-Cos 만 빈약. 패턴 adoption 누락.
5. **Raw HTML `<table>` 잔재:** 4 service 합쳐 30 파일 (KPA 6 / Neture 11 / GP 9 / K-Cos 4) — DataTable 으로 마이그레이션 후보.

---

## 3. 도메인별 Drift Matrix

### 3.1 Members — 中

| Service | 파일 | DataTable | Detail Surface | Bulk | Status/Role Badge | Edit | 분류 |
|---|---|:---:|---|:---:|:---:|---|:---:|
| **KPA** | `UsersPage.tsx` | core | **BaseDetailDrawer (520w)** | useBatchAction (approve/reject/suspend) | StatusBadge ✅ / RoleBadge ❌ inline | EditUserModal | **A** |
| **Neture** | `UsersManagementPage.tsx` | core | **BaseDetailDrawer (520w)** | useBatchAction (pending only) | StatusBadge ✅ / RoleBadge ✅ | EditUserModal | **A** |
| **GP** | `UsersPage.tsx` | core | **navigate `/users/:id` page** | useBatchAction (approve/reject) | StatusBadge ✅ / RoleBadge ✅ | EditUserModal | **B** |
| **K-Cos** | `UsersPage.tsx` | core | **navigate `/users/:id` page** | **없음** | StatusBadge ✅ / RoleBadge ✅ | EditUserModal | **B** |
| **GP** | `GlycopharmMembersPage.tsx` | core | drawer | 없음 (inline buttons) | local StatusBadge | (detail only) | **C** (의도된 분리) |

**Root cause:** KPA = canonical reference → Neture = full copy → GP/K-Cos = page-nav 패턴으로 분기 (drawer vs page 선택 정책 미정). K-Cos 만 bulk action 누락 — 단순 누락.

**판정:**
- Detail surface (drawer vs page) — **canonical 선택 필요** (drawer 권고: light view, page nav 권고: heavy edit)
- K-Cos bulk action 추가 — 즉시 가능
- KPA 의 RoleBadge 미적용 — legacy inline → core 컴포넌트 채택

### 3.2 Roles — 매우 낮음 (정합)

| Service | 파일 | 구현 |
|---|---|---|
| **All 4** | `RoleManagementPage.tsx` | `@o4o/ui RoleManagementPage` thin wrapper, admin role prefix 만 service-별 다름 |

→ **분류: A (이미 commonized).** Drift 없음. WO-O4O-ROLE-MANAGEMENT-PAGE-COMMONIZATION-V1 결과 우수.

### 3.3 Approvals — 高

| Service | 파일 | 분류 | 본질 |
|---|---|:---:|---|
| KPA | `CollaborationRequestsPage.tsx` | C | lightweight drawer-based status change |
| KPA | `ProductApplicationManagementPage.tsx` | B | DataTable + batch + drawer (canonical 후보) |
| KPA | `ForumRequestsPage.tsx` / `ForumDeleteRequestsPage.tsx` | B | (확인 필요) |
| KPA | `PharmacyRequestManagementPage.tsx` | C | KPA-specific 약사 신청 흐름 |
| Neture | `MarketTrialApprovalsPage.tsx` | C | 시장체험 펀딩 — 도메인 복잡, custom workflow |
| Neture | `ProductServiceApprovalPage.tsx` / `OperatorProductApprovalPage.tsx` | B | |
| Neture | `ForumDeleteRequestsPage.tsx` | B | |
| GP | `ApplicationsPage.tsx` | B | DataTable + status/serviceType/orgType 3중 필터 |
| GP | `StoreApprovalsPage.tsx` + `StoreApprovalDetailPage.tsx` | C | 의도된 분리 (DataTable list + checkpoint form detail page) — 규제 도메인 |
| GP | `ForumRequestsPage.tsx` / `ForumDeleteRequestsPage.tsx` | B | |
| K-Cos | `ApplicationsPage.tsx` | C | inline filter buttons (검토중/승인대기/승인완료/반려) + drawer-based modal |
| K-Cos | `EventOfferApprovalsPage.tsx` / `ForumRequestsPage.tsx` / `ForumDeleteRequestsPage.tsx` | B | |

**Root cause:**
- Filter pattern 4 가지 (KPA dropdown / Neture tab / GP 다중 dropdown / K-Cos inline button) — 서비스 도메인 본질이 아니라 frontend 작성자 선택의 결과
- Detail surface 분기 (KPA = drawer, GP = full page with form, K-Cos = drawer modal)
- 의도된 차이: GP StoreApprovalDetailPage (규제 checkpoint), Neture MarketTrial (펀딩 워크플로우)

**판정:** Approval list 의 column / filter / row action 부분만 thin wrapper (`@o4o/operator-ux-core/approvals/ApprovalListPage`) 후보. Detail 은 service-specific 유지.

### 3.4 Products — 高

| Service | 파일 | DataTable | 분류 | 본질 |
|---|---|:---:|:---:|---|
| GP | `ProductsPage.tsx` | core | **A** | canonical 패턴 (image+barcode column, search+sortBy) |
| K-Cos | `ProductsPage.tsx` | core | **B** | GP 와 거의 동일하나 supplierCount badge 색상 차이 (blue-100 vs pink-100) + bulk selection 추가 |
| GP | `ProductDetailPage.tsx` | raw HTML | A | (detail page — 거의 동일) |
| K-Cos | `ProductDetailPage.tsx` | raw HTML | A | (동일) |
| Neture | `AllProductsOverviewPage.tsx` | **raw HTML table + custom slide Drawer** | **D** | legacy 패턴, 다른 3 service 와 완전 다름 |
| Neture | `BrandManagementPage.tsx` | core (EditableTextCell) | C | brand merge 등 도메인 특화 |
| Neture | `CategoryManagementPage.tsx` | custom tree table | C | tree 구조 본질 — 도메인 특화 |
| Neture | `ProductApplicationManagementPage.tsx` | core + useBatchAction | A | canonical |
| Neture | `AllRegisteredProductsPage.tsx`, `RecruitingProductsOverviewPage.tsx`, `ProductDataCleanupPage.tsx`, `CategoryMappingRulesPage.tsx` | — | (별도 도메인) | Neture 의 supply/catalog 전용 |
| KPA | `ProductApplicationManagementPage.tsx` | core + useBatchAction | B | STATUS_LABELS 가 hex color 사용 (tailwind className 아님) |

**Root cause:**
- Neture 의 `AllProductsOverviewPage` 는 다른 3 service 의 ProductsPage 와 같은 위치 (상품 목록) 인데 raw HTML + custom slide drawer 패턴. 명백한 legacy.
- Brand/Category 는 도메인 본질 (tree, merge) — 의도된 차이
- KPA 의 hex color (STATUS_LABELS) vs Neture/GP/K-Cos 의 tailwind className — 작은 inconsistency

**판정:** Neture `AllProductsOverviewPage` 만 D — DataTable 마이그레이션 가치. 나머지는 정합.

### 3.5 Forums — 中-高

| Service | 파일 | 구성 | 분류 | 본질 |
|---|---|---|:---:|---|
| KPA | `ForumManagementPage.tsx` | **2 탭 (requests + categories)**, DataTable + batch | A | canonical reference |
| KPA | `OperatorForumPage.tsx` | hub (post 관리), DataTable | C | hub 페이지 |
| Neture | `ForumManagementPage.tsx` | **1 탭 (requests only, no categories)** | B | KPA 의 simpler 버전 |
| Neture | `ForumDeleteRequestsPage.tsx` | DataTable | B | 별건 page |
| GP | `ForumAnalyticsPage.tsx` | KPI cards only (analytics) | D (analytics) | 다른 service 의 ForumManagement 와 다른 페이지 |
| GP | `forum-management/OperatorForumManagementPage.tsx` | **mock data, UI skeleton** | **D** | placeholder — backend 미연결 |
| GP | `ForumRequestsPage.tsx` / `ForumDeleteRequestsPage.tsx` | DataTable | B | 별건 |
| K-Cos | `ForumAnalyticsPage.tsx` | KPI cards | D | GP 와 유사 |
| K-Cos | `ForumRequestsPage.tsx` / `ForumDeleteRequestsPage.tsx` | DataTable | B | 별건 |
| All | `CommunityManagementPage.tsx` (KPA, GP) | community ads/sponsors — forum 아님 | C | 이름 충돌 (community vs forum) |

**Root cause:**
- KPA = full ForumManagement (requests + categories). Neture 는 categories 탭 부재 — backend capability 차이 or feature 미구현 의심
- GP 의 `forum-management/OperatorForumManagementPage` = mock data + UI skeleton (D) — backend 연결 없음
- "Community Management" 가 KPA/GP 에서 ad/sponsor 관리에 쓰임 — forum 과 분리된 별도 도메인

**판정:**
- KPA ForumManagement 를 canonical wrapper 후보로 추출 가능 (`@o4o/operator-ux-core/forums/ForumManagementPage`)
- Neture 1 탭 → 2 탭 확장은 backend 확인 후 별건
- GP mock skeleton 제거 또는 backend 연결 결정 필요

### 3.6 Stores — 中

| Service | 파일 | 패턴 | 분류 |
|---|---|---|:---:|
| GP | `StoresPage.tsx` | **`OperatorStoresList` adapter** (thin wrapper from `@o4o/operator-core-ui`) | **A** |
| KPA | `OperatorStoresPage.tsx` | **`OperatorStoresList` adapter** | **A** |
| K-Cos | `StoresPage.tsx` | **direct `@o4o/operator-ux-core DataTable`** (adapter 미사용) | **B** |
| Neture | `StoreManagementPage.tsx` | **raw HTML table** | **D** |
| GP / K-Cos / KPA | `*StoreDetailPage.tsx` | Info + Channels + Capabilities + Products section — 3 service 거의 동일 | A |
| GP | `StoreApprovalsPage.tsx` + `StoreApprovalDetailPage.tsx` | DataTable + form detail | C (의도) |
| GP | `PharmaciesPage.tsx` | DataTable + tier badge + region/tier 필터 | B (의도) |
| K-Cos | `StoreCockpitPage.tsx` | custom dashboard (KPI + product mini-list) | D (이름 충돌) |

**Root cause:** Stores list = 3 패턴 (adapter / direct DataTable / raw HTML). adapter 는 이미 canonical wrapper.

**판정:** K-Cos → adapter, Neture → adapter 마이그레이션 가치 있음.

### 3.7 LMS — 高

| Service | 파일 | 비고 | 분류 |
|---|---|---|:---:|
| KPA | `OperatorLmsCoursesPage.tsx` (89 lines) | canonical 후보 | A |
| K-Cos | `OperatorLmsCoursesPage.tsx` | KPA 직복사 | A (commonize) |
| GP | `LmsCoursesPage.tsx` (59 lines) | naming + 구현 다름 | B |
| Neture | **부재** | Neture LMS 도메인 부재 | — |

**Root cause:** Page naming (Operator prefix 유무) 분기. 공통 모듈 `@o4o/operator-lms-core` 부재.

**판정:** Neture 부재는 정합 (도메인). 다른 3 service 의 LMS Courses 는 `@o4o/operator-lms-core/CoursesPage` wrapper 통합 가능.

### 3.8 Content / Resources — 매우 高

| Page | KPA | Neture | GP | K-Cos | 분류 |
|---|:---:|:---:|:---:|:---:|:---:|
| `OperatorContentPage` | — | — | CmsContentManager wrapper (29L) | CmsContentManager wrapper (29L) | A |
| `OperatorContentHubPage` | ✅ | ❌ | ❌ | ❌ | D (KPA-only?) |
| `OperatorContentDetailPage` | ✅ | ❌ | ❌ | ❌ | D |
| `WorkingContentListPage` / `WorkingContentEditPage` | ✅ | ❌ | ❌ | ❌ | D (KPA-only?) |
| **`OperatorGuideContentsPage`** | **wrapper (24L)** | **wrapper (24L)** | **wrapper (24L)** | **wrapper (24L)** | **A — 100% copy-paste, serviceKey 만 다름** |
| `OperatorResourcesPage` | ResourcesPage (50L) | ❌ | ResourcesPage (50L) | ❌ | B |
| `HomepageCmsPage` | ❌ | ✅ | ❌ | ❌ | C (Neture-only) |
| `GuidelineManagementPage` | ❌ | ❌ | ✅ | ❌ | C (GP-only) |

**Root cause:**
- KPA 가 content 도메인 5 page 보유. 나머지 service 는 subset
- OperatorGuideContentsPage 는 4 service 모두 동일 (serviceKey 만 변수) — 100% commonize 가능
- Neture HomepageCms, GP Guideline 은 service-domain (의도된 차이)

**판정:** OperatorGuideContentsPage 즉시 통합 가능 (24×4=96 lines → 1 wrapper). Content Hub/Detail/WorkingContent 는 KPA-only 가 의도인지 별건 audit 필요.

### 3.9 Misc (Settings / Analytics / Reports / Billing / Audit) — C 위주

| Page | KPA | Neture | GP | K-Cos | 분류 |
|---|:---:|:---:|:---:|:---:|:---:|
| `SettingsPage` | ❌ | ❌ | ✅ | ✅ | C (service-specific) |
| `AnalyticsPage` | ❌ | ✅ | ✅ | ❌ | B (잠재 공통) |
| `AiReportPage` / `OperatorAiReportPage` (wrapper) | ✅ | ✅ | ✅ | ✅ | **A** |
| **`aiReportConfig.tsx`** | empty (23L) | empty (23L) | **full+mock (155L)** | **full+mock (155L)** | **D (parity 깨짐)** |
| `AiUsageDashboardPage` | ❌ | ❌ | ✅ | ❌ | C (GP-only) |
| `AiBillingPage` | ❌ | ❌ | ✅ | ❌ | C |
| `ReportsPage` | ❌ | ❌ | ✅ | ❌ | C |
| `SettlementsPage` / `BillingPreviewPage` / `InvoicesPage` | ❌ | ❌ | ✅ | ❌ | C (GP 정산 도메인) |
| `OrdersPage` / `OrdersManagementPage` | ❌ | ✅ | ✅ | ✅ | B |
| `AuditLogPage` | ✅ | ❌ | ❌ | ❌ | C (KPA-only) |
| `LegalManagementPage` | ✅ | ❌ | ❌ | ❌ | C (KPA-only) |
| `SupplierQualityPage` | ❌ | ✅ | ❌ | ❌ | C (Neture-only) |

**Root cause:** 대부분 service 도메인 본질 (GP 정산, KPA 약사회 audit, Neture 공급자 품질) — 의도된 차이. 다만 **aiReportConfig 의 KPA/Neture empty vs GP/K-Cos full** 은 inconsistent rollout — feature 가 있어야 하는데 누락된 상태.

**판정:** aiReportConfig parity 정합 필요. 다른 page 는 service-specific 유지.

### 3.10 Operator Dashboards — 매우 낮음 (정합)

| Service | Dashboard | 구성 | 분류 |
|---|---|---|:---:|
| KPA | `KpaOperatorDashboard.tsx` | 5-Block + Admin/Operator role split config (45L) | A |
| Neture | `NetureOperatorDashboard.tsx` | 5-Block, pass-through fetch | A |
| GP | `GlycoPharmOperatorDashboard.tsx` | 5-Block + 추가 OperatorAlerts | B |
| K-Cos | `KCosmeticsOperatorDashboard.tsx` | 5-Block | A |

→ 4 service 모두 `OperatorDashboardLayout` (operator-ux-core) 채택. 5-Block 표준 준수.

---

## 4. Drift 본질 분석 — "메뉴 이름 같음 → 기능 같음 → UI 같은가?"

본 IR 의 핵심 분석. 4 service 의 동일/유사 메뉴 이름 → 실제 기능 동일성 → UI 정합성 매핑.

| 메뉴 이름 (동일/유사) | 4 service 기능 동일성 | UI 동일성 | 판정 |
|---|:---:|:---:|---|
| **회원 관리 / UsersPage** | ✅ 같다 (DataTable + 회원 목록) | △ 부분 (drawer vs page, bulk 유무) | **B (정렬 가능)** |
| **역할 관리 / RoleManagementPage** | ✅ 같다 | ✅ 같다 (thin wrapper) | **A (이미 정렬)** |
| **상품 관리 / ProductsPage / AllProductsOverviewPage** | ✅ 같다 (목록) | ❌ 다르다 (Neture 만 raw HTML + drawer) | **D (Neture 만 정렬 필요)** |
| **매장 관리 / StoresPage / OperatorStoresPage / StoreManagementPage** | ✅ 같다 | ❌ 3 패턴 (adapter / direct / raw HTML) | **B (정렬 가능)** |
| **포럼 관리 / ForumManagementPage** | △ KPA = 2 탭, Neture = 1 탭, GP/K-Cos = analytics | ❌ 다르다 | **B (backend capability 확인 후)** |
| **승인 관리 / Applications / ProductApproval / ForumRequest** | ❌ 다르다 (도메인별 본질 다름) | ❌ 다르다 | **C (의도된 차이, but list 패턴은 정렬 가능)** |
| **강의 관리 / LmsCourses / OperatorLmsCourses** | ✅ KPA/GP/K-Cos 같다, Neture 부재 | ❌ naming/구현 다르다 | **B (3 service 정렬 가능)** |
| **가이드 콘텐츠 / OperatorGuideContents** | ✅ 같다 (100% wrapper) | ✅ 같다 | **A (이미 commonize, copy-paste 만 정합)** |
| **자료 / ResourcesPage** | △ KPA/GP 만 보유 | ✅ 같다 | **B (2 service commonize 가능)** |
| **분석 / AnalyticsPage / ForumAnalyticsPage / AiReportPage** | △ 일부 부재 | △ wrapper 일부 정합 | **B (config parity 정합 후)** |
| **설정 / SettingsPage** | △ GP/K-Cos 만 | △ inline | **C (의도된 service 차이)** |
| **운영자 대시보드 / *OperatorDashboard** | ✅ 같다 (5-Block) | ✅ 같다 | **A (이미 정렬)** |
| **빌링/정산 / SettlementsPage / BillingPreview / Invoices / AiBilling** | ❌ GP-only | — | **C (도메인 본질)** |
| **감사 / AuditLogPage** | ❌ KPA-only | — | **C (도메인 본질)** |
| **법무 / LegalManagementPage** | ❌ KPA-only | — | **C (도메인 본질)** |
| **공급자 품질 / SupplierQualityPage** | ❌ Neture-only | — | **C (도메인 본질)** |

### 4.1 분류 분포 요약

| 분류 | 항목 수 | 의미 |
|:---:|:---:|---|
| **A (이미 commonize / 즉시 가능)** | 4 | Roles, Dashboard, GuideContents wrapper copy-paste, Forum requests subset |
| **B (정렬 가능 — WO 후보)** | 7 | Members detail surface, Stores list pattern, Forum management, LMS Courses, Resources, Analytics config, Approval list wrapper |
| **C (의도된 service-specific)** | 6 | Approvals detail, Settings, Billing/Audit/Legal/SupplierQuality 도메인 |
| **D (위험 / Legacy)** | 3 | Neture AllProductsOverview (raw HTML), GP forum-management mock, aiReportConfig parity |

---

## 5. 핵심 Drift Item — 우선순위

### 5.1 Tier 1 — 즉시 가능 (A → 완전 commonize)

1. **`OperatorGuideContentsPage.tsx` × 4 service copy-paste 통합** — 96 lines (24×4) → 1 wrapper. import 경로 표준화만 필요. 회귀 위험 0.
2. **`OperatorLmsCoursesPage.tsx` × 3 service (KPA / GP / K-Cos) 통합** — page naming 표준화 + 공통 wrapper.
3. **`OperatorResourcesPage` × 2 service (KPA / GP) 통합** — 같은 구조.

### 5.2 Tier 2 — 정합 결정 + 정렬 (B)

4. **Members detail surface canonical 선택** — drawer (KPA/Neture) vs page nav (GP/K-Cos) 결정. 권고: 1차 drawer (light view), 2차 page (heavy edit).
5. **Members bulk action: K-Cos 추가** — useBatchAction + ActionBar + BulkResultModal.
6. **Stores list: K-Cos / Neture → `OperatorStoresList` adapter 마이그레이션.**
7. **KPA Members: `RoleBadge` / `ServiceBadge` 채택** (inline rendering → core 컴포넌트).
8. **aiReportConfig parity** — 4 service 모두 empty 또는 모두 full 로 정렬 + mock 제거.

### 5.3 Tier 3 — 정책 결정 후 (B 또는 D)

9. **Forum management 2 탭 vs 1 탭** — Neture backend capability 확인 후 정합 결정.
10. **GP `forum-management/OperatorForumManagementPage` mock 제거** — backend 연결 결정 (별건).
11. **Neture `AllProductsOverviewPage` → DataTable 마이그레이션** (D legacy 정합).

### 5.4 Tier 4 — Common 인프라 확장 (별건 큰 WO)

12. **`FormField` / `Section` 정의됨 vs 미사용 (0%) — purpose 명확화 또는 deprecate.**
13. **`EmptyState` 정의됨 vs 미사용 (0%) — 같은 결정.**
14. **`EditableDataTable` 정의됨 vs 미사용 (0%) — 같은 결정.**
15. **Raw HTML `<table>` 30 파일 → DataTable 마이그레이션** (점진).
16. **Mobile responsive 인프라** — operator-ux-core 가 desktop-only — tablet/mobile 지원 필요 여부 정책 결정.

### 5.5 분류 정상 (의도된 차이) — 정렬 작업 불필요

- Approvals detail (KPA Pharmacy / Neture MarketTrial / GP StoreApproval / K-Cos Application) — 도메인 본질
- GP Billing/Settlement/Invoices/AiBilling — GP 도메인
- KPA Audit/Legal — KPA 도메인
- Neture SupplierQuality — Neture 도메인
- Neture Brand/Category — catalog 도메인 본질 (tree/merge)

---

## 6. Root Cause 분류

본 IR 의 drift 들의 근본 원인:

| Root Cause | 영향 항목 |
|---|---|
| **Legacy 잔재** | Neture AllProductsOverview, Neture StoreManagement (raw HTML), KPA Members inline role rendering |
| **Canonical 미적용** | OperatorGuideContentsPage copy-paste, OperatorLmsCoursesPage 명명 분기, OperatorResourcesPage 직복사 |
| **Wrapper 차이** | Stores: adapter / direct / raw HTML 3 패턴 |
| **Service 확장** | GP GlycopharmMembersPage (pharmacy 분리), Neture Brand/Category (tree/merge), GP StoreApprovalDetailPage (checkpoint) |
| **Backend 차이** | Neture forum categories 부재, Neture LMS 부재 (도메인) |
| **의도된 차이** | Settings/Billing/Audit/Legal/SupplierQuality 의 service-only — 도메인 본질 |
| **Inconsistent rollout** | aiReportConfig parity (KPA/Neture empty vs GP/K-Cos full + mock) |
| **Adoption density gap** | K-Cos 전반 bulk action / ConfirmActionDialog 누락 |

---

## 7. 본 IR 의 권고 — 4 단계 분리

### Step 1 — Tier 1 (A) 즉시 WO

**`WO-O4O-OPERATOR-COPY-PASTE-WRAPPER-CONSOLIDATION-V1`** (제안)
- 영향: OperatorGuideContentsPage × 4 + OperatorLmsCoursesPage × 3 + OperatorResourcesPage × 2
- 작업: 공통 wrapper 추출 + serviceKey 주입 + 4 service 통합
- 회귀 위험: 매우 낮음 (이미 동일 구현)

### Step 2 — Tier 2 (B) 정합 결정 + 정렬

**별건 IR + WO 시리즈:**
- `IR-O4O-OPERATOR-MEMBERS-DETAIL-SURFACE-DECISION-V1` (drawer vs page nav 결정)
- `WO-O4O-K-COS-OPERATOR-MEMBERS-BULK-ACTION-V1`
- `WO-O4O-OPERATOR-STORES-LIST-ADAPTER-MIGRATION-V1` (K-Cos + Neture)
- `WO-O4O-KPA-OPERATOR-MEMBERS-BADGE-MIGRATION-V1` (RoleBadge/ServiceBadge)
- `WO-O4O-OPERATOR-AI-REPORT-CONFIG-PARITY-V1` (aiReportConfig 정렬)

### Step 3 — Tier 3 정책 결정

- `IR-O4O-OPERATOR-FORUM-CAPABILITY-AUDIT-V1` (Neture forum categories 가능성)
- `IR-O4O-GP-FORUM-MANAGEMENT-MOCK-DECISION-V1`
- `WO-O4O-NETURE-PRODUCTS-OVERVIEW-MIGRATION-V1` (raw HTML → DataTable)

### Step 4 — Common 인프라 확장 (별건 큰 결정)

- `IR-O4O-OPERATOR-UX-CORE-DEAD-PRIMITIVES-DECISION-V1` (FormField/Section/EmptyState/EditableDataTable — 사용 또는 deprecate)
- `IR-O4O-OPERATOR-MOBILE-RESPONSIVE-AUDIT-V1` (desktop-only vs mobile 지원 정책)
- `IR-O4O-OPERATOR-RAW-TABLE-MIGRATION-AUDIT-V1` (30 파일 마이그레이션 계획)

---

## 8. 현재 구조 vs O4O 철학 충돌 체크

| 차원 | 현재 | 정합 |
|---|:---:|:---:|
| 공통 Core (operator-ux-core + @o4o/ui) | ✅ 확립 + adoption 100% | 충돌 없음 |
| 서비스별 독립 도메인 | ✅ Approvals/Settings/Billing 등 service-specific 적절히 분리 | 충돌 없음 |
| 기능 = UI 원칙 | △ Tier 2/3 drift 에서 부분 미충족 (Members detail surface, Stores list, AllProductsOverview) | 본 IR 의 정렬 권고로 회복 가능 |
| Operator Dashboard Standard 5-Block | ✅ 4 service 정합 | 충돌 없음 |
| OPERATOR-DATATABLE-POLICY | △ 30 파일 raw `<table>` 잔재 | 점진 정합 가치 |
| "기능 같음 → UI 같음" 강도 | A: 4 / B: 7 / C: 6 / D: 3 — 전체적으로 강함 | — |

→ 본 IR 의 권고 (Tier 1 즉시 + Tier 2 별건 + Tier 3 정책) 채택 시 정합 강화.

---

## 9. 본 IR 이 결정하지 않는 것

- 실제 코드 변경 (조사 전용)
- Tier 1 통합 WO 의 실행 시점
- Tier 2 의 detail surface (drawer vs page) 최종 결정 — 별건 IR
- Tier 3 의 forum capability / mock skeleton 처리 — 별건 IR
- Tier 4 의 dead primitives / mobile 정책 — 별건 IR
- Raw `<table>` 30 파일의 우선순위 — 별건 audit
- 의도된 service-specific 도메인 (Settings/Billing/Audit/Legal/SupplierQuality) 의 추가 변경
- Operator Dashboard 5-Block 의 추가 정합 (현재 충분)

---

## 10. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| Tier 1 즉시 WO 후보 | 1 건 (`WO-O4O-OPERATOR-COPY-PASTE-WRAPPER-CONSOLIDATION-V1`) |
| Tier 2 별건 WO 후보 | 5 건 |
| Tier 3 별건 IR 후보 | 3 건 |
| Tier 4 별건 IR (장기) | 3 건 |
| 의도된 service-specific 정합 인정 | 6 카테고리 |
| O4O 철학 정합 강화 | "기능 같음 → UI 같음" 매트릭스 명문화 |
| 사이클 정리 | 본 IR 로 Operator Entity UI drift 의 전체 그림 확정. WO 시리즈는 점진 진행 |

---

## 부록 — 조사 방법 (재현 가능)

```bash
# 1. 4 service operator pages 전체 목록
find services/web-{kpa-society,neture,glycopharm,k-cosmetics}/src/pages/operator \
  -name '*.tsx' -o -name '*.ts' | sort

# 2. operator-ux-core / @o4o/ui adoption count
for COMP in DataTable EditableDataTable MemberListLayout StatusBadge RoleBadge ServiceBadge \
            useBatchAction OperatorDashboardLayout ActionBar RowActionMenu BulkResultModal \
            ConfirmActionDialog BaseDetailDrawer EmptyState FormField Section; do
  echo "=== $COMP ==="
  for SVC in kpa-society neture glycopharm k-cosmetics; do
    COUNT=$(grep -rln "\b$COMP\b" services/web-$SVC/src/pages/operator 2>/dev/null | wc -l)
    echo "  $SVC: $COUNT"
  done
done

# 3. Raw HTML <table> 파일 검색
grep -rln "<table" services/web-{kpa-society,neture,glycopharm,k-cosmetics}/src/pages/operator

# 4. 동일 이름 페이지 (copy-paste 후보)
for PAGE in OperatorGuideContentsPage aiReportConfig OperatorLmsCoursesPage; do
  echo "=== $PAGE ==="
  find services/web-* -name "$PAGE.tsx" -exec wc -l {} \;
done
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only, 4 parallel agent synthesis)*
*Status: 조사 완료 — A 4 / B 7 / C 6 / D 3 분류. 즉시 WO 1 + 별건 WO 5 + 별건 IR 6 후보.*
*Decision Required: Tier 1 (`WO-O4O-OPERATOR-COPY-PASTE-WRAPPER-CONSOLIDATION-V1`) 즉시 진입 + Tier 2/3/4 의 별건 분리 순서.*
