# IR-O4O-OPERATOR-LIST-COMMONIZATION-AUDIT-V1

> KPA-Society Operator Dashboard 가 canonical 패턴으로 정착된 시점에서,
> **GlycoPharm / K-Cosmetics / Neture** 의 operator 화면이 같은 canonical 을 어디까지 따르고
> 어디는 도메인 차이로 따를 수 없는지를 전수 조사한 IR.
>
> **수정 없음. 조사 + 공통화/비공통화 분류 + 우선순위 제안.**
>
> 본 IR 의 핵심 목적은 *"무엇을 공통화해야 하는가"* 보다,
> *"무엇을 공통화하면 안 되는가"* 를 명확히 구분하는 것이다.
> KPA canonical 을 정답으로 강제하지 않으며,
> 각 서비스의 도메인 차이(Neture supplier/distribution/market trial,
> GlycoPharm care/HQ signage, K-Cosmetics tablet/event-offer)를 존중한다.

- 작성일: 2026-05-09
- 기준 브랜치: `main` (`bb3aacdff` 시점, KPA canonical 시리즈 4커밋 직후)
- 자매 SSOT
  - [O4O-KPA-OPERATOR-CANONICAL-STATE-V1](../architecture/O4O-KPA-OPERATOR-CANONICAL-STATE-V1.md) — 본 IR 의 비교 기준
  - [IR-O4O-KPA-OPERATOR-LIST-CANONICAL-RECHECK-V1](IR-O4O-KPA-OPERATOR-LIST-CANONICAL-RECHECK-V1.md) — KPA 단독 RECHECK
- 조사 대상
  - `services/web-glycopharm/src/pages/operator/**`, `services/web-glycopharm/src/pages/admin/**`
  - `services/web-k-cosmetics/src/pages/operator/**`
  - `services/web-neture/src/pages/{operator,admin,supplier,partner,community}/**`
  - 대조군: `services/web-kpa-society/src/pages/operator/**`
- 범위 제약
  - 코드 수정 / WO 실행 / 패키지 변경 모두 **본 IR 범위 외**.
  - 본 IR 의 결과물은 *분류표 + 우선순위 + 비공통화 명단* 이며, 후속 WO 의 입력으로만 사용한다.

---

## 0. 결론 요약 (TL;DR)

> **KPA canonical 을 그대로 다른 3개 서비스로 확산하는 것은 잘못된 방향이다.**
> 4개 서비스 중 *공통화에 적합한 영역* 과 *도메인 차이로 분리 유지가 옳은 영역* 이 명확히 분리된다.

**핵심 사실 8가지**:

1. **A 풀 canonical 화면은 4서비스 통틀어 8개로 한정**:
   - KPA 11개 (가장 많음, 본 IR 범위 외)
   - GlycoPharm 1개 (`UsersPage`) + 사실상 1개 (`StoresPage` — composite wrapper)
   - K-Cosmetics 4개 (`EventOfferApprovalsPage`, `ForumDeleteRequestsPage`, `ForumRequestsPage`, `RoleManagementPage` shared wrapper)
   - Neture 4개 (`NetureOperatorDashboard`, `OperatorProductApprovalPage`, `UsersManagementPage`, `AllRegisteredProductsPage`)

2. **B 부분 canonical 화면이 가장 많음** (12개 이상):
   - `@o4o/operator-ux-core DataTable` 또는 `@o4o/ui DataTable` 은 사용하지만,
     `useBatchAction` / `defineActionPolicy` / `RowActionMenu` / `ActionBar` 중 일부 누락
   - 즉시 정렬 가능하나 도메인 워크플로(승인/반려/배송/정산)에 따라 batch 의미가 다르므로
     일률 적용 금지.

3. **C 레거시 raw `<table>`** 가 서비스별 수개씩 잔존:
   - GlycoPharm: `InvoicesPage`, `SettlementsPage` (각 ~500-900 라인)
   - K-Cosmetics: `OrdersPage` (raw table — 가장 단순)
   - Neture admin: `OperatorsPage`, `AdminSupplierApprovalPage`, `AdminPartnerMonitoringPage`, `CommunityManagementPage`
   - Neture partner: `PartnerStoresPage`
   - 모두 즉시 canonical 정렬 가능하지만 우선순위는 trafifc/리스크에 따라 분기.

4. **D 도메인 특화 화면 (공통화 금지)** 7개 영역으로 묶임:
   - **HQ Signage 카드 그리드** (GlycoPharm `HqMediaPage`/`HqPlaylistsPage`, K-Cosmetics 동명 페이지) — 미디어 카드 그리드는 의도된 UX, 테이블 강제 금지
   - **Neture Hub Architecture** (`SupplierOrdersPage`, `PartnerHubDashboardPage`) — 주문은 *서비스로부터 발행*, Neture 는 navigator. KPA 단일 서비스 모델과 부적합
   - **Neture Market Trial** (`SupplierTrialListPage`) — Distribution Engine 의 funding lifecycle, frozen contract
   - **Neture 3-Tier Commission** (`SupplierPartnerCommissionsPage`, `PartnerSettlementBatchPage`) — Partner Contract Freeze v1 governed
   - **Neture Signage** (`CommunitySignagePage`) — Distribution Engine 계약 적용 영역
   - **EditableDataTable supplier wide-list** (Neture `SupplierProductsPage`, 21 컬럼 inline edit) — canonical 컴포넌트는 사용하나 *조립 방식* 이 도메인 특화
   - **K-Cosmetics Tablet/Cosmetics 도메인 전용 화면** — tablet display, store cockpit 등

5. **E 특수 (KPI / 분석)** 화면은 4서비스 모두에 존재하며 패턴 정합:
   - 전 서비스 `OperatorDashboard` 는 `OperatorDashboardLayout` 5-Block 사용 (canonical)
   - `AdminDashboard` 는 `AdminDashboardLayout` 4-Block (canonical)
   - Forum/AI 분석 화면은 KPI 카드 + 차트 — 비테이블, list 공통화 대상 아님

6. **즉시 공통화 가능한 영역은 3가지로 한정됨**:
   - (a) `@o4o/ui DataTable` (Column<T>) 사용 중인 B 화면 → `@o4o/operator-ux-core DataTable` 통일
   - (b) raw `<table>` C 화면 → `@o4o/operator-ux-core DataTable` 마이그레이션 (특히 K-Cosmetics `OrdersPage` 가 가장 단순)
   - (c) Approval/Reject 워크플로 UI (`BaseDetailDrawer` + comment textarea + 승인/반려 버튼) — KPA `ApplicationDetailDrawer` 기반 추상화 가능

7. **공통화 금지 영역은 명확히 3축**:
   - **Neture 도메인 freeze 계약** (Distribution Engine, Partner Contract, Domain Architecture v3) — 변경 자체가 freeze 위반
   - **HQ Signage 미디어 카드 그리드** — 미디어 카드 그리드는 thumbnail-first UX 가 정답, list 강제 시 UX 회귀
   - **Hub navigator 화면** (Neture supplier/partner hub) — orders/operations 의 발행 위치가 다름, KPA 단일 서비스 모델과 비양립

8. **Phase 3 추상화 후보 (도메인 횡단 가치 있음)**:
   - **`ApprovalDrawerLayout`** — 승인 드로워 (4서비스 공통 패턴): 신청 정보 + 승인/반려 + comment textarea + history
   - **`useApprovalAction`** — 승인/반려 단건/배치 hook
   - **`StoreApprovalListLayout`** — KPA `MemberListLayout` 의 store 버전 (GlycoPharm/K-Cosmetics/Neture admin 공유)
   - 단, 모두 *KPA 안에서 추출* 후 *3개 서비스에서 검증* 후 공통화. 사전 공통화 금지.

---

## 1. 분류 기준 정의

본 IR 에서 사용하는 분류는 [IR-O4O-KPA-OPERATOR-LIST-CANONICAL-RECHECK-V1](IR-O4O-KPA-OPERATOR-LIST-CANONICAL-RECHECK-V1.md) §1 과 동일하나, 도메인 차이를 반영하기 위해 D/E 의 의미를 확장한다.

| 분류 | 정의 | 후속 처리 |
|---|---|---|
| **A** | 풀 canonical — `@o4o/operator-ux-core DataTable` + `useBatchAction` + `defineActionPolicy` + `RowActionMenu` + `ActionBar` + `BulkResultModal` + `BaseDetailDrawer` 중 *해당 화면에 의미 있는 모든 항목* 사용 | 변경 불필요 |
| **B** | 부분 canonical — DataTable 은 사용하나 일부 primitive 누락 (bulk / row action / detail drawer 등) | 도메인 워크플로 적합 시 정렬, 부적합 시 유지 |
| **C** | 레거시 raw `<table>` 또는 자체 카드 list — canonical primitive 미사용 | 트래픽/리스크 평가 후 canonical 마이그레이션 (단, 카드 그리드가 정답인 경우 D) |
| **D** | 도메인 특화 — list/table 패턴 자체가 부적합한 화면 (HQ signage, hub navigator, freeze 계약 영역, market trial, 3-tier commission, EditableDataTable 등) | **공통화 금지**, 도메인 컴포넌트로 보존 |
| **E** | 특수 — KPI 대시보드 / AI 분석 / non-list. `OperatorDashboardLayout` / `AdminDashboardLayout` 등 별도 canonical 적용 | list canonical 범위 외, 별도 dashboard canonical 로 관리 |

**핵심 원칙**:
- **D 는 "아직 정리 안 한 legacy" 가 아니라 "정리하면 안 되는 도메인 자산"** 이다.
- B → A 정렬은 도메인 워크플로(예: 승인 단건이 자연 vs 배치가 자연)에 따라 결정. 일률 적용 금지.
- 화면이 아니라 *워크플로* 가 분류 기준.

---

## 2. 서비스별 인벤토리

### 2.1 KPA-Society (대조군)

[O4O-KPA-OPERATOR-CANONICAL-STATE-V1](../architecture/O4O-KPA-OPERATOR-CANONICAL-STATE-V1.md) 에 SSOT 기록됨. 본 IR 는 그 결과를 비교 기준으로만 사용한다.

| 분류 | 화면 수 | 대표 화면 |
|---|---|---|
| A | 12 | `MemberManagementPage`, `AuditLogPage`, `UsersPage`, `OperatorContentHubPage`, `ProductApplicationManagementPage`, `PharmacyRequestManagementPage`, `QualificationRequestsPage`, `ForumDeleteRequestsPage`, `OperatorForumPage`, `OperatorStoresPage`, `OperatorLmsCoursesPage`, `OperatorResourcesPage` |
| B | 2 | `WorkingContentListPage`, `LegalManagementPage` |
| C | 0 | (canonical 시리즈로 모두 정리됨) |
| D | 0 | KPA 도메인은 list 위주 |
| E | 4 | `KpaOperatorDashboard`, `OperatorAiReportPage`, `ForumAnalyticsDashboard`, `AnalyticsPage` |

**KPA-Society 의 특수성**: 단일 서비스 모델, 신청/승인/관리/감사 패턴 일관, 따라서 list canonical 의 reference implementation 으로 적합.

---

### 2.2 GlycoPharm

| 분류 | 화면 | DataTable kind | 비고 |
|---|---|---|---|
| **A** | `operator/UsersPage.tsx` | `@o4o/operator-ux-core DataTable` + 모든 primitive | KPA `UsersPage` 와 거의 동일 |
| **A*** | `operator/StoresPage.tsx` | `@o4o/operator-core-ui` `OperatorStoresList` 합성체 | Composite wrapper, 내부 canonical |
| **B** | `operator/OrdersPage.tsx` | `@o4o/operator-ux-core DataTable` + `ListColumnDef` + `ActionBar` | `useBatchAction` 미사용, 인라인 MoreVertical menu |
| **B** | `operator/PharmaciesPage.tsx` | `@o4o/operator-ux-core DataTable` + `ListColumnDef` + `ActionBar` | row action 인라인 |
| **B** | `operator/StoreApprovalsPage.tsx` | `@o4o/ui DataTable` + 자체 status config | DataTable 출처 미통일 |
| **B** | `operator/ApplicationsPage.tsx` | `@o4o/ui DataTable` + `Column` | 커스텀 필터, 디테일 링크만 |
| **B** | `operator/ProductsPage.tsx` | `@o4o/ui DataTable` + `Column` | row action 없음 |
| **B** | `operator/LmsCoursesPage.tsx` | `@o4o/ui DataTable` + `Column` | 디테일 링크만 |
| **B** | `operator/ForumRequestsPage.tsx` | `@o4o/operator-ux-core DataTable` + `BaseDetailDrawer` | row menu 부재 |
| **C** | `operator/InvoicesPage.tsx` | raw `<table>` (~900라인) | 인라인 status badge |
| **C** | `operator/SettlementsPage.tsx` | raw `<table>` (~500라인, mock data) | 인라인 status |
| **C** | `operator/ForumDeleteRequestsPage.tsx` | (확인 필요 — 본 라운드 audit 미상세) | KPA 동명 화면은 A |
| **D** | `operator/signage/HqMediaPage.tsx` | 카드 그리드 (signage media) | thumbnail-first UX, 의도 |
| **D** | `operator/signage/HqPlaylistsPage.tsx` | 카드 그리드 (playlist) | thumbnail-first UX, 의도 |
| **D** | `operator/signage/TemplatesPage.tsx` | 카드 그리드 (template) | thumbnail-first UX, 의도 |
| **D** | `operator/signage/ForcedContentPage.tsx` | signage 강제 송출 — 도메인 특화 | |
| **D** | `operator/OperatorGuideContentsPage.tsx` | `GuideContentsManager` composite editor | LMS 콘텐츠 편집기, list 아님 |
| **E** | `operator/GlycoPharmOperatorDashboard.tsx` | `OperatorDashboardLayout` 5-Block | dashboard canonical |
| **E** | `admin/GlycoPharmAdminDashboard.tsx` | `StructureSnapshotBlock` + `PolicyOverviewBlock` + `StructureActionBlock` | admin canonical |
| **E** | `operator/AnalyticsPage.tsx`, `operator/ForumAnalyticsPage.tsx`, `operator/AiReportPage.tsx`, `operator/AiBillingPage.tsx`, `operator/AiUsageDashboardPage.tsx`, `operator/ReportsPage.tsx`, `operator/BillingPreviewPage.tsx` | KPI/분석 | 비테이블 |

**GlycoPharm 의 특수성**:
- `Pharmacies` (B&B 환경 약국 관리), `StoreApprovals` (약국 신청 승인) 가 **약국 도메인에서 가장 핵심**.
- HQ Signage 가 **GlycoPharm 도메인의 정체성** (본부 미디어 송출). 카드 그리드 UX 는 정답.
- `Invoices` / `Settlements` 는 raw table 잔존 — 자금 도메인이라 canonical 이행 시 신중해야 함 (정확성 회귀 리스크).

---

### 2.3 K-Cosmetics

| 분류 | 화면 | DataTable kind | 비고 |
|---|---|---|---|
| **A** | `operator/UsersPage.tsx` | (KPA 패턴 추정 — 본 라운드 미상세) | shared `RoleManagementPage` 위임 |
| **A** | `operator/EventOfferApprovalsPage.tsx` | `@o4o/operator-ux-core DataTable` + `BaseDetailDrawer` + toast | 승인 드로워 패턴 |
| **A** | `operator/ForumDeleteRequestsPage.tsx` | `@o4o/operator-ux-core DataTable` + `BaseDetailDrawer` + `GuideBlock` | KPA 와 동일 |
| **A** | `operator/ForumRequestsPage.tsx` | `@o4o/operator-ux-core DataTable` + `BaseDetailDrawer` + `GuideBlock` + filterable | KPA 와 동일 |
| **A** | `operator/RoleManagementPage.tsx` | shared `@o4o/ui` `RoleManagementPage` 위임 | 위임체 |
| **B** | `operator/ApplicationsPage.tsx` | `@o4o/operator-ux-core DataTable` + `BaseDetailDrawer` | bulk 미사용 |
| **B** | `operator/ProductsPage.tsx` | `@o4o/operator-ux-core DataTable` + selection state | `useBatchAction` 미사용, selection 만 보유 |
| **B** | `operator/StoresPage.tsx` | (canonical 추정 — 본 라운드 미상세) | |
| **C** | `operator/OrdersPage.tsx` | raw `<table>` | 5컬럼 단순, 가장 마이그레이션 용이 |
| **D** | `operator/signage/HqMediaPage.tsx` | raw `<table>` + 자체 모달 | tag/source/transition 폼 → 도메인 특화 |
| **D** | `operator/signage/HqPlaylistsPage.tsx` | raw `<table>` + 자체 모달 | playlist 편집 도메인 특화 |
| **D** | `operator/signage/TemplatesPage.tsx`, `signage/HqMediaDetailPage.tsx`, `signage/HqPlaylistDetailPage.tsx`, `signage/TemplateDetailPage.tsx` | signage 도메인 | 카드/디테일 |
| **D** | `operator/StoreCockpitPage.tsx` | tablet/store 운영 — 도메인 특화 | |
| **D** | `operator/OperatorGuideContentsPage.tsx` | LMS 콘텐츠 편집 | |
| **E** | `operator/KCosmeticsOperatorDashboard.tsx` | `OperatorDashboardLayout` 5-Block | dashboard canonical |
| **E** | `operator/AiReportPage.tsx`, `operator/ForumAnalyticsPage.tsx` | KPI/분석 | 비테이블 |

**K-Cosmetics 의 특수성**:
- 4개 A 화면은 **승인 드로워 패턴** (`BaseDetailDrawer` + 승인/반려 + comment textarea) 일관.
  → KPA 의 `ApplicationDetailDrawer` 와 거의 동일 → **공통화 1순위 후보**.
- `OrdersPage` 가 raw table 인 것은 *기술 부채 명백* (단순 5컬럼, 도메인 특화 아님).
- HQ Signage 는 raw table 이지만 *form 복잡도* 때문에 D — table 부분만 분리 canonical 도 가능하나 form 과 강결합.
- Tablet/cosmetics 전용 화면 (`StoreCockpitPage` 등) 은 도메인 특화 — KPA 패턴 강제 금지.

---

### 2.4 Neture

| 분류 | 화면 | DataTable kind | 비고 |
|---|---|---|---|
| **A** | `operator/NetureOperatorDashboard.tsx` | `OperatorDashboardLayout` config-driven | dashboard canonical |
| **A** | `operator/OperatorProductApprovalPage.tsx` | `@o4o/operator-ux-core DataTable` + `useBatchAction` + `defineActionPolicy` + `RowActionMenu` + `ActionBar` + `BulkResultModal` + `BaseDetailDrawer` | KPA reference 와 동급 |
| **A** | `operator/UsersManagementPage.tsx` | `@o4o/ui DataTable` + `MemberListLayout` + `StatusBadge` + `RoleBadge` + `defineActionPolicy` + `RowActionMenu` | KPA `MemberManagementPage` 와 동등 |
| **A** | `operator/AllRegisteredProductsPage.tsx` | `@o4o/operator-ux-core DataTable` + 모든 primitive (multi-tab drill-down) | 광역 상품 overview |
| **B** | `operator/BrandManagementPage.tsx` | `@o4o/operator-ux-core DataTable` + `RowActionMenu` + `ConfirmActionDialog` | bulk merge 시 `useBatchAction` 정렬 가능 |
| **B** | `operator/ForumManagementPage.tsx` | `@o4o/operator-ux-core DataTable` + `useBatchAction` + `ActionBar` + `BulkResultModal` | `defineActionPolicy` 미사용 |
| **B** | `supplier/SupplierProductsPage.tsx` | `@o4o/operator-ux-core EditableDataTable` (21컬럼 inline edit) | 컴포넌트는 canonical, *조립* 은 도메인 특화 |
| **C** | `admin/OperatorsPage.tsx` | raw `<table>` | 운영자 관리, 마이그레이션 가능 |
| **C** | `admin/AdminSupplierApprovalPage.tsx` | raw `<table>` + 인라인 액션 | OperatorsPage 와 패턴 동일 |
| **C** | `admin/AdminPartnerMonitoringPage.tsx` | raw `<table>` + 상단 KPI 카드 | DataTable + RowActionMenu 적합 |
| **C** | `admin/CommunityManagementPage.tsx` | raw `<table>` + 탭 + 모달 | list 부분만 마이그레이션 |
| **C** | `partner/PartnerStoresPage.tsx` | raw `<table>` (mock) + 필터 chip | DataTable + Column 적합 |
| **D** | `supplier/SupplierOrdersPage.tsx` | hub 카드/섹션 | **Hub Architecture**: orders 는 *서비스에서 발행*, Neture 는 navigator |
| **D** | `supplier/SupplierTrialListPage.tsx` | 카드 그리드 (styled objects) | **Market Trial / Distribution Engine** freeze 계약 영역 |
| **D** | `supplier/SupplierPartnerCommissionsPage.tsx` | styled sections | **3-Tier Commission** Partner Contract Freeze v1 |
| **D** | `partner/PartnerSettlementBatchPage.tsx` | expandable 카드 list | **Settlement** Distribution Engine governed |
| **D** | `community/CommunitySignagePage.tsx` | intro + 카드 그리드 | **Distribution Engine signage** |
| **E** | `admin/AdminDashboardPage.tsx` | `AdminDashboardLayout` 4-Block | admin canonical |
| **E** | `operator/OperatorActionQueuePage.tsx` | 카드 큐 | task queue UI |
| **E** | `operator/OperatorAiReportPage.tsx` | KPI/분석 | 비테이블 |
| **E** | `partner/PartnerHubDashboardPage.tsx` | 허브 섹션 | partner overview |

**Neture 의 특수성**:
- **A 화면 4개는 이미 KPA reference 수준** — 더 정렬할 필요 없음.
- **D 화면 5개는 모두 freeze 계약 영역**:
  - `NETURE-DISTRIBUTION-ENGINE-FREEZE-V1` (market trial, signage)
  - `NETURE-PARTNER-CONTRACT-FREEZE-V1` (3-tier commission, settlement)
  - `NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3` (hub architecture)
  - 이들에 KPA list canonical 을 강제하는 것은 **freeze 위반**.
- **C 화면 5개 (admin/*, partner/PartnerStoresPage)** 은 *이미 운영 중인 staff-facing low-traffic 화면* — canonical 이행은 가치 있으나 긴급도 낮음.
- **B `SupplierProductsPage` 의 EditableDataTable** 는 KPA 에는 없는 supplier 워크플로 (21컬럼 다중 row inline edit + batch save) — 컴포넌트는 canonical 이지만 *조립* 은 Neture 전용. 정렬 시도 금지.

---

## 3. 서비스 횡단 매트릭스

### 3.1 분류별 화면 수

| 서비스 | A | B | C | D | E | 합계 |
|---|---:|---:|---:|---:|---:|---:|
| KPA-Society | 12 | 2 | 0 | 0 | 4 | 18 |
| GlycoPharm | 2 | 7 | 2~3 | 5 | 7 | 23~24 |
| K-Cosmetics | 5 | 3 | 1 | 6~7 | 3 | 18~19 |
| Neture | 4 | 3 | 5 | 5 | 4 | 21 |

**관찰**:
- KPA 가 가장 list-heavy 하고 D=0 (도메인 특화 화면 없음). reference implementation 으로 적합.
- GlycoPharm 은 D 가 5개 (HQ signage 4 + LMS guide 1). HQ signage 가 도메인 정체성.
- K-Cosmetics 는 D 가 가장 많음 (signage + tablet/cockpit). canonical 강제 시 회귀 리스크 큼.
- Neture 는 A=4 / D=5 가 거의 균형. canonical 채택 영역과 freeze 영역이 명확히 분리됨.

### 3.2 동일 워크플로 패턴 횡단 매핑

같은 워크플로가 4개 서비스에 어떻게 분포하는지 — **이것이 공통화 후보의 진짜 출처**.

| 워크플로 | KPA | GlycoPharm | K-Cosmetics | Neture | 패턴 일치도 |
|---|---|---|---|---|---|
| **회원/사용자 list** | `MemberManagementPage` (A) | `UsersPage` (A) | `UsersPage` (A) | `UsersManagementPage` (A) | **매우 높음** — 4서비스 동일 |
| **상품 list / 승인** | (없음) | `ProductsPage` (B) | `ProductsPage` (B) | `OperatorProductApprovalPage` (A) + `AllRegisteredProductsPage` (A) | 높음 — Neture 가 reference |
| **신청 승인** | `ProductApplicationManagementPage` (A), `PharmacyRequestManagementPage` (A), `QualificationRequestsPage` (A) | `ApplicationsPage` (B), `StoreApprovalsPage` (B) | `ApplicationsPage` (B), `EventOfferApprovalsPage` (A) | `AdminSupplierApprovalPage` (C) | **매우 높음** — `BaseDetailDrawer + comment + approve/reject` 패턴 |
| **포럼 카테고리 신청** | `OperatorForumPage` (A) | `ForumRequestsPage` (B) | `ForumRequestsPage` (A) | `ForumManagementPage` (B) | 높음 |
| **포럼 글 삭제 요청** | `ForumDeleteRequestsPage` (A) | `ForumDeleteRequestsPage` (?) | `ForumDeleteRequestsPage` (A) | (없음) | 높음 |
| **매장(Store) list** | `OperatorStoresPage` (A) | `StoresPage` (A*), `StoreApprovalsPage` (B) | `StoresPage` (B) | (없음 — 도메인 다름) | 중간 |
| **주문(Order) list** | (없음 — KPA 비주문 도메인) | `OrdersPage` (B) | `OrdersPage` (C) | `SupplierOrdersPage` (D — hub) | **낮음** — Neture 가 hub 모델로 분리 |
| **정산/인보이스** | (없음) | `InvoicesPage` (C), `SettlementsPage` (C) | (없음) | `PartnerSettlementBatchPage` (D), `SupplierPartnerCommissionsPage` (D) | **낮음** — Neture 가 freeze 영역 |
| **HQ Signage 미디어** | (없음 — 도메인 다름) | `HqMediaPage` (D), `HqPlaylistsPage` (D) | `HqMediaPage` (D), `HqPlaylistsPage` (D) | `CommunitySignagePage` (D) | 매우 낮음 — 카드 그리드 UX 가 정답 |
| **감사 로그** | `AuditLogPage` (A) | (해당 화면 미식별) | (해당 화면 미식별) | (해당 화면 미식별) | **불균형** — KPA 만 도입 |
| **Operator Dashboard** | (A `OperatorDashboardLayout`) | (E) | (E) | (E) | **매우 높음** — 4서비스 일치 |
| **Admin Dashboard** | (A `AdminDashboardLayout`) | (E) | (없음) | (E) | 높음 |

**해석**:
- **승인 워크플로** (회원/상품/신청/포럼) 가 4서비스 모두 발생 + 패턴 일치 → **공통화 1순위**.
- **주문/정산** 은 도메인 모델 자체가 분기됨 (KPA 없음 / GlycoPharm 단순 / Neture freeze hub) → **공통화 부적합**.
- **HQ Signage 미디어** 는 패턴 자체가 카드 그리드, 강제 시 회귀 → **D 유지**.
- **감사 로그** 는 KPA 만 canonical 도입. 다른 서비스에 동일 요구 발생 시 패턴 복제 가능하나, 현재 Phase 에서는 *서비스별 도입 시점에 KPA AuditLogPage 를 reference 로* 하면 충분.

---

## 4. 즉시 공통화 가능 항목

### 4.1 컴포넌트 (이미 존재, 추가 추출 불필요)

| 자원 | 출처 | 4서비스 채택 상태 |
|---|---|---|
| `DataTable<T>` | `@o4o/operator-ux-core` | KPA 11/12, GlycoPharm 5/15, K-Cosmetics 7/12, Neture 6/12 — *DataTable 출처 통일이 가장 현실적 액션* |
| `MemberListLayout` | `@o4o/operator-ux-core` | KPA, Neture 사용. GlycoPharm/K-Cosmetics `UsersPage` 도 동일 패턴 가능 |
| `OperatorDashboardLayout` | `@o4o/operator-ux-core` | 4서비스 모두 채택 (E 분류) |
| `AdminDashboardLayout` | `@o4o/admin-ux-core` | KPA, GlycoPharm, Neture 채택 |
| `useBatchAction` | `@o4o/operator-ux-core` | KPA 우세, 다른 3서비스에서 거의 미채택 — *B 화면 정렬 시 도입 후보* |
| `defineActionPolicy` + `buildRowActions` | `@o4o/operator-ux-core` | KPA 우세, Neture 일부 |
| `RowActionMenu`, `ActionBar`, `BulkResultModal`, `BaseDetailDrawer`, `ConfirmActionDialog` | `@o4o/ui` | KPA 광범위, Neture 일부, GlycoPharm/K-Cosmetics 부분 |

→ **결론**: 새 패키지 / 새 컴포넌트 추출은 **불필요**. 기존 canonical 의 *채택 균등화* 가 핵심.

### 4.2 즉시 정렬 가능한 화면 (Phase 1 후보)

| 화면 | 현재 | 권장 | 정당성 |
|---|---|---|---|
| K-Cosmetics `OrdersPage` | C raw table 5컬럼 | B → A `@o4o/operator-ux-core DataTable` | 가장 단순, 도메인 특화 아님, 기술 부채 명백 |
| Neture `admin/OperatorsPage` | C raw table | B → A | staff-facing, 표준화 가치 |
| Neture `admin/AdminSupplierApprovalPage` | C raw table | A `BaseDetailDrawer` + 승인/반려 패턴 | KPA approval 패턴과 일치 |
| GlycoPharm `StoreApprovalsPage` | B `@o4o/ui DataTable` | A `@o4o/operator-ux-core DataTable` + `BaseDetailDrawer` | DataTable 출처 통일 |
| GlycoPharm `ApplicationsPage` | B `@o4o/ui DataTable` | A `@o4o/operator-ux-core DataTable` | 위와 동일 |
| K-Cosmetics `ApplicationsPage` | B canonical DataTable + drawer, bulk 미사용 | 도메인 평가 후 *유지 또는 bulk 도입* | 단건 승인이 자연스러우면 B 유지 |
| GlycoPharm `OrdersPage`, `PharmaciesPage` | B `useBatchAction` 미사용 | *도메인 평가 후 결정* | 약국 주문/관리 batch 의미 검토 필요 |

**원칙**: 모든 정렬은 *도메인 워크플로 평가* 후. raw table → DataTable 은 항상 가능 (UX 회귀 없음). bulk 도입은 워크플로가 batch 가 자연스러울 때만.

### 4.3 즉시 정렬하면 안 되는 화면 (Phase 1 명시 제외)

| 화면 | 사유 |
|---|---|
| GlycoPharm `InvoicesPage`, `SettlementsPage` | **자금 도메인** — raw table 마이그레이션 시 정확성 회귀 리스크. 별도 WO 로 단계적. |
| GlycoPharm/K-Cosmetics `HqMediaPage`/`HqPlaylistsPage`/`TemplatesPage`/`ForcedContentPage` | **HQ Signage 카드 그리드** UX 가 정답. table 강제 시 회귀. |
| K-Cosmetics `StoreCockpitPage`, `signage/*Detail*` | **tablet/cosmetics 도메인 특화**. |
| Neture `supplier/SupplierProductsPage` | **EditableDataTable 21컬럼 inline edit** — 컴포넌트는 canonical 이지만 조립이 도메인 특화. |
| Neture `supplier/SupplierOrdersPage`, `supplier/SupplierTrialListPage`, `supplier/SupplierPartnerCommissionsPage`, `partner/PartnerSettlementBatchPage`, `community/CommunitySignagePage` | **Neture freeze 계약 영역** (Distribution Engine / Partner Contract / Domain Architecture v3). 변경 자체가 freeze 위반. |
| GlycoPharm/K-Cosmetics `OperatorGuideContentsPage` | LMS 콘텐츠 편집 composite, list 아님. |

---

## 5. 공통화 비추천 항목 (도메인 자산)

> 본 절은 IR 의 *주요 가치 영역*. 후속 WO 작성 시 이 명단을 반드시 참고할 것.

### 5.1 Neture freeze 계약 영역 — 변경 금지

| 화면 | freeze 문서 |
|---|---|
| `supplier/SupplierTrialListPage` | `NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md` |
| `supplier/SupplierPartnerCommissionsPage` | `NETURE-PARTNER-CONTRACT-FREEZE-V1.md` |
| `partner/PartnerSettlementBatchPage` | `NETURE-PARTNER-CONTRACT-FREEZE-V1.md` |
| `community/CommunitySignagePage` | `NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md` |
| `supplier/SupplierOrdersPage`, `partner/PartnerHubDashboardPage` | `NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md` (Hub Architecture) |

### 5.2 HQ Signage 카드 그리드 — UX 가 정답

| 서비스 | 화면 |
|---|---|
| GlycoPharm | `signage/HqMediaPage`, `signage/HqPlaylistsPage`, `signage/TemplatesPage`, `signage/ForcedContentPage`, `signage/HqMediaDetailPage`, `signage/HqPlaylistDetailPage`, `signage/TemplateDetailPage` |
| K-Cosmetics | `signage/HqMediaPage`, `signage/HqPlaylistsPage`, `signage/TemplatesPage`, `signage/HqMediaDetailPage`, `signage/HqPlaylistDetailPage`, `signage/TemplateDetailPage` |

**사유**: 미디어 자산은 thumbnail-first UX 가 효율적. 행 기반 list 강제 시 thumbnail 컬럼이 어색해지고 운영자 워크플로(미리보기 → 송출 결정)가 회귀.

### 5.3 도메인 특화 워크플로

| 서비스 | 화면 | 도메인 사유 |
|---|---|---|
| K-Cosmetics | `StoreCockpitPage`, `tablet/TabletStorePage`, `store/StoreTabletDisplaysPage` | 태블릿/매장 운영 — list 패턴 부적합 |
| Neture | `supplier/SupplierProductsPage` | 21컬럼 multi-row inline edit + batch save (canonical EditableDataTable 사용 중이나 *조립* 은 Neture 전용) |
| GlycoPharm/K-Cosmetics/KPA | `OperatorGuideContentsPage` (각 서비스) | LMS 콘텐츠 composite editor — list 아님 |

### 5.4 dashboard / KPI / 분석

본 IR 의 list canonical 범위 외. `OperatorDashboardLayout` / `AdminDashboardLayout` 별도 canonical 로 관리.

---

## 6. Phase 3 추상화 후보 (조사 단계, 추출 미수행)

> 아래는 *KPA 안에서 검증된 후, 3개 서비스에서 1회 이상 같은 형태로 사용된* 패턴만 후보로 한다.
> 사전 추상화 / 사전 패키지화는 **금지**.

### 6.1 `ApprovalDrawerLayout`

**현재 분포**:
- KPA `ProductApplicationManagementPage`, `PharmacyRequestManagementPage`, `QualificationRequestsPage` — `BaseDetailDrawer` + 신청 정보 + comment textarea + 승인/반려 + history
- K-Cosmetics `EventOfferApprovalsPage`, `ForumRequestsPage`, `ForumDeleteRequestsPage` — 동일 패턴
- GlycoPharm `StoreApprovalsPage`, `ApplicationsPage` — 부분 (drawer 미사용)
- Neture `OperatorProductApprovalPage` — 동일 패턴 (`BaseDetailDrawer` 채택)

**후보 인터페이스**:
```ts
<ApprovalDrawer
  request={selected}
  fields={[...]}            // 표시 필드 정의
  onApprove={(comment) => ...}
  onReject={(comment) => ...}
  history={...}
/>
```

**진행 조건**: KPA 3화면 + Neture 1화면 + K-Cosmetics 3화면 = 7개 동일 패턴 확인됨. 추출 가치 있음. 단, *추출은 후속 WO 에서 수행*.

### 6.2 `useApprovalAction` hook

**현재**: 7화면 모두 `useState({ comment, processing })` + `apiClient.post(approveUrl)` + toast 패턴 반복.

**후보 인터페이스**:
```ts
const { processing, approve, reject } = useApprovalAction({
  approveFn: (id, comment) => api.post(...),
  rejectFn: (id, comment) => api.post(...),
});
```

### 6.3 `StoreApprovalListLayout` (장기 후보)

**현재**: `MemberListLayout` 의 store 변형. GlycoPharm/K-Cosmetics/Neture 매장 신청 화면.

**진행 조건**: 본 IR 시점에는 3서비스 매장 신청 워크플로의 차이가 큼 (약국 자격 / 화장품 store / Neture supplier). 충분한 동질성 확인 후 추출.

### 6.4 추출하지 않을 패턴

- **Order list canonical** — 4서비스 주문 도메인 모델이 분기됨. 공통 추출 시 도메인 누설.
- **Settlement canonical** — Neture freeze 영역.
- **Signage canonical** — 카드 그리드 UX 가 도메인별로 다름.
- **Audit log canonical** — KPA 만 도입. 다른 서비스 도입 시 *복제* 가 적절하며 사전 추출 가치 낮음.

---

## 7. 우선순위 제안

### Phase 1 — 즉시 실행 가능 (1~2 WO 단위)

| 순위 | 작업 | 대상 | 예상 효과 |
|---|---|---|---|
| 1 | K-Cosmetics `OrdersPage` raw table → `@o4o/operator-ux-core DataTable` | 단일 화면 | 5컬럼 단순, 회귀 리스크 최소, canonical 채택률 +1 |
| 2 | GlycoPharm `ApplicationsPage` + `StoreApprovalsPage` DataTable 출처 통일 (`@o4o/ui` → `@o4o/operator-ux-core`) | 2화면 | 4서비스 DataTable 출처 일관성 |
| 3 | Neture `admin/OperatorsPage` + `admin/AdminSupplierApprovalPage` raw table → DataTable + `BaseDetailDrawer` (승인 패턴) | 2화면 | Neture admin 영역 canonical 진입 |

### Phase 2 — 도메인 평가 후 (WO 별도)

| 순위 | 작업 | 사전 평가 |
|---|---|---|
| 4 | GlycoPharm `OrdersPage` / `PharmaciesPage` `useBatchAction` 도입 | 약국 batch 워크플로 의미 평가 |
| 5 | K-Cosmetics `ProductsPage` `useBatchAction` 도입 | 상품 일괄 처리 워크플로 평가 |
| 6 | Neture `BrandManagementPage` bulk merge `useBatchAction` 도입 | brand merge 정책 검토 |
| 7 | GlycoPharm `InvoicesPage` / `SettlementsPage` raw table 마이그레이션 | 자금 정확성 회귀 리스크 평가 (단계적) |

### Phase 3 — 추상화 (KPA 추출 → 3서비스 검증 → 공통화)

| 순위 | 작업 | 진행 조건 |
|---|---|---|
| 8 | `ApprovalDrawerLayout` 추출 (KPA 안에서 먼저) | Phase 1~2 완료 후 |
| 9 | `useApprovalAction` hook 추출 | 위와 동일 |
| 10 | `StoreApprovalListLayout` 검토 | 3서비스 매장 신청 워크플로 동질성 확인 후 |

### 명시적 비실행 (No-Go)

- Neture freeze 계약 화면 5개 — **건드리지 않음**
- HQ Signage 카드 그리드 화면 (모든 서비스) — **건드리지 않음**
- K-Cosmetics tablet/cockpit 화면 — **건드리지 않음**
- Neture `SupplierProductsPage` EditableDataTable — **건드리지 않음**
- KPA-only 화면 (LMS guide, AI report, dashboard) — **본 IR 범위 외**

---

## 8. Risks & Open Questions

### 8.1 본 IR 자체의 한계

- 일부 화면은 *고수준 분류만* 수행. 실제 컴포넌트 props 와 워크플로 세부사항은 화면별 WO 단계에서 재확인 필요.
- 본 IR 은 **frontend 화면** 만 기준. backend API / scope guard / DB schema 는 범위 외.
- "B 화면 → A 정렬" 의 적합성은 도메인 워크플로 의미가 결정. 본 IR 의 권장은 *기술적 가능성* 표시이며 *실행 권고* 는 별도 WO 단계에서.

### 8.2 Open Questions (후속 WO 필요)

1. **GlycoPharm `ForumDeleteRequestsPage` 분류 미확정** — 본 라운드 audit 에서 상세 미식별. KPA 동명 화면 패턴 확인 필요.
2. **K-Cosmetics `StoresPage` 와 `ProductsPage` 의 정확한 primitive 분포** — `@o4o/operator-ux-core DataTable` 사용은 확인되었으나 detail drawer / row action 사용 패턴 추가 확인 필요.
3. **GlycoPharm `Pharmacies` 도메인의 batch 의미** — 약국 일괄 비활성화/이관이 운영 워크플로상 자연스러운지 도메인 검토 필요.
4. **Neture `BrandManagementPage` 의 brand merge** — bulk merge 시 데이터 무결성 정책이 정의되어야 batch 화 가능.
5. **`AuditLogPage` 의 다른 3서비스 적용 우선순위** — 운영 감사 요구가 발생한 서비스부터 도입. 본 IR 는 강제 도입을 권고하지 않음.

### 8.3 Constitutional 정합성

- **§7 Boundary Policy**: 본 IR 의 권장은 모두 *frontend 컴포넌트 통일* 이며 cross-domain JOIN / boundary 위반 영향 없음.
- **§14 Frozen Baselines**:
  - F1 (Operator OS) `operator-ux-core` 등은 freeze 됨. 본 IR 는 *기존 컴포넌트 채택 확산* 만 권고하며 컴포넌트 자체 변경은 권고하지 않음.
  - F8 (Neture Distribution Engine), F7 (Neture Partner Contract) 영역은 §5.1 에서 명시적으로 비실행 분류.

---

## 9. Next Step

본 IR 의 직접 후속 액션은 **없음** (조사 결과물이며 자체 실행 항목 미포함).

후속 WO 의 입력으로 본 IR 가 사용될 때, 다음 우선순위 순으로 차례로 작성한다:

1. `WO-O4O-OPERATOR-DATATABLE-SOURCE-UNIFY-V1` — Phase 1 순위 1~2 (raw table → DataTable + DataTable 출처 통일, 가장 회귀 리스크 낮음)
2. `WO-O4O-NETURE-ADMIN-OPERATOR-CANONICAL-ALIGN-V1` — Phase 1 순위 3 (Neture admin 2화면)
3. `WO-O4O-OPERATOR-APPROVAL-DRAWER-EXTRACT-V1` — Phase 3 순위 8 (KPA 안 추출 → Neture/K-Cosmetics 검증 → 공통화)

본 IR 는 위 WO 들이 작성될 때마다 *근거 문서* 로 인용된다.

---

*작성: 2026-05-09*
*기준 SSOT: O4O-KPA-OPERATOR-CANONICAL-STATE-V1*
*분류 원칙: 도메인 차이 존중 — KPA canonical 을 정답으로 강제하지 않는다.*
