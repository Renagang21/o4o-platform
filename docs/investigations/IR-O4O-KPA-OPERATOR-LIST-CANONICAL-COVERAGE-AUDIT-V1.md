# IR-O4O-KPA-OPERATOR-LIST-CANONICAL-COVERAGE-AUDIT-V1

**작성일**: 2026-05-16
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**대상**:
- KPA-Society **Operator 메뉴 전체** (`services/web-kpa-society/src/pages/operator/**`)
- **KPA Admin 페이지 전체** (`apps/admin-dashboard/src/pages/kpa/**`)
- 각 리스트/테이블 화면이 **O4O Operator Table Canonical (V3)** 을 얼마나 준수하는지 인벤토리

**Canonical 기준 문서**:
- `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md` (V3 Canonical — 2026-05-07 ACTIVE)
- `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md` (DataTable 계층 정책)

**연관 IR**:
- `IR-O4O-OPERATOR-TABLE-CANONICAL-GAP-AUDIT-V1` (선행 — 전 플랫폼 gap audit)
- `IR-O4O-KPA-OPERATOR-IA-RESTRUCTURE-AUDIT-V1`
- `IR-O4O-KPA-OPERATOR-MEMBER-APPROVAL-STALE-PENDING-AUDIT-V1`

---

## 0. 결론 요약

KPA Operator 영역은 **canonical 전환이 크게 진척된 상태**이고, KPA Admin 영역은 **거의 미진척**이다.

| 영역 | 총 리스트 수 | CANONICAL | PARTIAL | LEGACY | 비고 |
|------|:---:|:---:|:---:|:---:|---|
| **KPA Operator** (`services/web-kpa-society/`) | 18 | **12** | 5 | 2 + 1 read-only | signage / forum / users / content 클러스터는 완전 canonical |
| **KPA Admin** (`apps/admin-dashboard/src/pages/kpa/`) | 6 | **0** | 4 | 2 | 전부 미진척 (BaseTable 사용하나 selection/bulk 무) |

핵심 관찰:
- **KPA Operator 의 시그너처 클러스터(signage 4 + forum 2 + content 1 + users 2 + lms 2 + approvals 2) 는 V3 완전 구현**.
- 남은 KPA Operator PARTIAL 5건은 모두 **개별 액션 위주 페이지**(채널, 협업 문의, 약국 신청 등) — bulk 액션 가치가 낮은 도메인.
- **OperatorContentHubPage** 는 주석에 "O4O DataTable 패턴 준수" 라고 적혀 있으나 **실제로는 raw `<table>` HTML** — drift 가장 큰 항목.
- KPA Admin 6개 페이지는 **canonical 전환이 한 건도 없음** — BaseTable 까지는 진입했으나 selection/ActionBar/BulkResultModal/useBatchAction 미배선. `AdminForceAssetPage` / `AdminSnapshotBrowserPage` 는 shadcn `<Table>` 사용 (BaseTable 도 아님).
- **즉시 표준화 후보 7건** 식별 (KPA Operator 4건 + KPA Admin 3건 의 bulk-액션 가치 있는 페이지).

---

## 1. Canonical V3 정의 (기준)

V3 = 다음 5요소 **전부** 충족:

```
1. BaseTable (packages/ui) 또는 DataTable (packages/operator-ux-core, wrap)
2. selectable + selectedKeys: Set<string>
3. ActionBar (packages/ui)
4. BulkResultModal (packages/ui)
5. useBatchAction (packages/operator-ux-core)
```

부분 충족(예: BaseTable+selectable 만, BulkResultModal 누락) 은 **PARTIAL**.
Raw `<table>` / `<div className="grid grid-cols-*">` / shadcn `<Table>` 등 공유 컴포넌트 미사용은 **LEGACY**.

---

## 2. KPA Operator 인벤토리 (services/web-kpa-society/src/pages/operator/)

### 2-1. ✅ TRUE CANONICAL (12) — 전 5요소 충족

| Sidebar 그룹 | 메뉴 라벨 | 파일 |
|---|---|---|
| users | 회원 관리 | `MemberManagementPage.tsx` |
| users | 회원 관리 (legacy alias) | `UsersPage.tsx` |
| approvals | 상품 신청 관리 | `ProductApplicationManagementPage.tsx` |
| content | 공지사항/뉴스 | `ContentManagementPage.tsx` ⭐ Canonical 2순위 레퍼런스 |
| lms | 강의 관리 | `OperatorLmsCoursesPage.tsx` ⭐ Canonical 4순위 레퍼런스 |
| lms | 강사 승인 | `QualificationRequestsPage.tsx` |
| forum | 포럼 운영 | `OperatorForumPage.tsx` |
| forum | 삭제 요청 | `ForumDeleteRequestsPage.tsx` |
| signage | HQ 미디어 | `signage/HqMediaPage.tsx` |
| signage | HQ 플레이리스트 | `signage/HqPlaylistsPage.tsx` |
| signage | 템플릿 | `signage/TemplatesPage.tsx` |
| signage | 강제 콘텐츠 | `signage/ForcedContentPage.tsx` |

공통 패턴:
- `@o4o/operator-ux-core` 의 `DataTable` + `useBatchAction` + `defineActionPolicy` + `buildRowActions`
- `@o4o/ui` 의 `ActionBar` + `BulkResultModal` + `RowActionMenu` + `BaseDetailDrawer`
- selection 은 `Set<string>` 표준
- bulk API 부재 시 `executeBatch` 로 `Promise.allSettled` wrap

### 2-2. ⚠️ PARTIAL (5) — BaseTable/DataTable 사용하나 일부 누락

| 파일 | 메뉴 | 현재 구성 | 누락 |
|---|---|---|---|
| `OperatorResourcesPage.tsx` | 자료실 관리 | DataTable + selectable + ActionBar | BulkResultModal + useBatchAction |
| `ForumManagementPage.tsx` | 포럼 관리 | DataTable + selectable + ActionBar | BulkResultModal + useBatchAction |
| `PharmacyRequestManagementPage.tsx` | (메뉴 hidden, 라우트 유지) | DataTable + selectable + buildRowActions | ActionBar + BulkResultModal + useBatchAction |
| `OperatorStoreChannelsPage.tsx` | 채널 관리 | DataTable + RowActionMenu + buildRowActions | selectable + ActionBar + BulkResultModal + useBatchAction |
| `CollaborationRequestsPage.tsx` | 협업 문의 | DataTable + RowActionMenu | selectable + ActionBar + BulkResultModal + useBatchAction |

### 2-3. 🟦 READ-ONLY DATATABLE (1) — 정책상 selection 없음

| 파일 | 메뉴 | 비고 |
|---|---|---|
| `AuditLogPage.tsx` | 감사 로그 | DataTable + 읽기 전용 (감사 무결성). selection / bulk 의도적 제외. WO-O4O-KPA-AUDIT-LOG-CANONICAL-ALIGN-V1 으로 raw `<table>` → DataTable 마이그레이션 완료 |

→ canonical 정책 위반 아님. "READ-ONLY DATATABLE" 으로 별도 분류.

### 2-4. 🔴 LEGACY-RAW (2) — 공유 컴포넌트 미사용

| 파일 | 메뉴 | 문제 |
|---|---|---|
| `OperatorContentHubPage.tsx` | 콘텐츠 허브 | 파일 헤더 주석에 "O4O DataTable 패턴 준수" 라고 표기되어 있으나 **실제 구현은 raw `<table>` + 자체 thead/tbody + 자체 페이지네이션** (L331-435). 컴파일/런타임 정상 작동하므로 발견되지 않은 drift. ⭐ 가장 큰 격차 |
| `WorkingContentListPage.tsx` | (내 콘텐츠) | Card-list 형태 (`div.space-y-3 + items.map`), 공유 컴포넌트 미사용. 단일 사용자용 page 라 표준 우선순위 낮음 |

### 2-5. 📦 WRAPPER (4) — 외부 canonical 컴포넌트 호출

| 파일 | 메뉴 | wrap 대상 |
|---|---|---|
| `OperatorStoresPage.tsx` | 매장 관리 | `OperatorStoresList` from `@o4o/operator-core-ui` |
| `OperatorGuideContentsPage.tsx` | 안내 문구 관리 | `GuideContentsManager` from `@o4o/operator-core-ui` |
| `RoleManagementPage.tsx` | 역할 관리 | `RoleManagementPage` from `@o4o/ui` |
| `OperatorAiReportPage.tsx` | AI 리포트 | `AiReportPage` from `@o4o/ui` |

→ wrap 대상 컴포넌트의 canonical 준수 여부는 별도 audit 필요 (본 IR 범위 외).

### 2-6. ➖ NO-LIST (다수) — 리스트가 없는 페이지

- 대시보드: `KpaOperatorDashboard.tsx`, `AnalyticsPage.tsx`, `ForumAnalyticsDashboard.tsx`
- 편집기: `CommunityManagementPage.tsx`(홈 편집), `LegalManagementPage.tsx`(약관 편집), `WorkingContentEditPage.tsx`, `OperatorContentDetailPage.tsx`
- detail 페이지: `OperatorStoreDetailPage.tsx`, `UserDetailPage.tsx`, `signage/*DetailPage.tsx`
- modal/config: `EditUserModal.tsx`, `aiReportConfig.tsx`, `signage/AiContentGenerationModal.tsx`

---

## 3. KPA Admin 인벤토리 (apps/admin-dashboard/src/pages/kpa/)

### 3-1. ⚠️ PARTIAL (4) — BaseTable 진입, batch action 0건

| 파일 | 내용 | 현재 | 누락 |
|---|---|---|---|
| `HubContentsPage.tsx` | HUB 콘텐츠 목록 (tab 별) | BaseTable | selectable + ActionBar + BulkResultModal + useBatchAction |
| `HubNoticeListPage.tsx` | HUB 공지 목록 | BaseTable | selectable + ActionBar + BulkResultModal + useBatchAction |
| `MyStoreContentsPage.tsx` | 내 매장 콘텐츠 | BaseTable | selectable + ActionBar + BulkResultModal + useBatchAction (read-only 의도 가능) |
| `StoreContentWorkspacePage.tsx` | 매장 콘텐츠 작업 (tab) | BaseTable | selectable + ActionBar + BulkResultModal + useBatchAction |

→ **Canonical doc 의 Phase 1 (LEGACY → V3) 명시 대상** (HubContents/HubNoticeList).

### 3-2. 🔴 LEGACY-SHADCN (2) — shadcn `<Table>` 사용

| 파일 | 내용 | 문제 |
|---|---|---|
| `AdminForceAssetPage.tsx` | Force Asset 배포 (snapshot + control 2개 테이블) | shadcn `<Table>` from `@/components/ui/table` — BaseTable 도 아님. canonical 정책상 admin은 BaseTable 권장 |
| `AdminSnapshotBrowserPage.tsx` | Snapshot 브라우저 | 동일 |

→ canonical doc §2.1 의 "Admin 페이지" 는 `@o4o/ui` `DataTable` 또는 `BaseTable` 표준. shadcn `<Table>` 은 표준 외.

### 3-3. KPA Admin canonical 페이지 = **0**

KPA admin 6개 페이지 중 V3 5요소 전부 충족하는 페이지는 **0건**.

---

## 4. Canonical 기준 doc 과의 차이 (drift)

`O4O-OPERATOR-TABLE-CANONICAL-V1.md` (작성 2026-05-07) 의 KPA 관련 분류 → 현재(2026-05-16) 실제 코드 상태:

| Canonical doc 분류 | 파일 | doc 기재 | 현재 검증 결과 |
|---|---|---|---|
| TRUE CANONICAL 2순위 | KPA `ContentManagementPage` | ✅ | ✅ 유지 |
| TRUE CANONICAL 4순위 | KPA `OperatorLmsCoursesPage` | ✅ | ✅ 유지 |
| PARTIAL | KPA `OperatorResourcesPage` | BulkResultModal 누락 | ⚠️ 변동 없음 — BulkResultModal+useBatchAction 둘 다 누락 |
| Phase 3-A | KPA `ForumManagementPage` | PARTIAL → CANONICAL | ⚠️ 여전히 PARTIAL (BulkResultModal+useBatchAction 누락) |
| Phase 3-B | KPA `ForumDeleteRequestsPage` | PARTIAL → CANONICAL | ✅ **CANONICAL 로 승격됨** (BulkResultModal+useBatchAction 추가됨) |
| Phase 1-C | Admin `HubContentsPage` | LEGACY | ⚠️ 여전히 BaseTable + selection 없음 = PARTIAL (doc 분류보다 한 단계 진척) |
| Phase 1-D | Admin `HubNoticeListPage` | LEGACY | ⚠️ 여전히 BaseTable + selection 없음 = PARTIAL |
| LEGACY | Admin `MyStoreContentsPage` | BaseTable 사용, selection 없음 | ⚠️ 동일 |

**doc 미반영 신규 발견**:
- `OperatorContentHubPage.tsx` — canonical doc 에 등재 없음. 헤더 주석은 canonical 주장, 실제 raw `<table>`. **doc 업데이트 필요 항목**.
- `WorkingContentListPage.tsx` — canonical doc 에 등재 없음.
- `OperatorStoreChannelsPage.tsx` — canonical doc 에 등재 없음. PARTIAL.
- `CollaborationRequestsPage.tsx` — canonical doc 에 등재 없음. PARTIAL.
- `PharmacyRequestManagementPage.tsx` — canonical doc 에 등재 없음. PARTIAL.
- `AdminForceAssetPage.tsx` / `AdminSnapshotBrowserPage.tsx` — canonical doc 에 등재 없음. shadcn 사용.

---

## 5. 즉시 표준화 후보 (가치/리스크 기반)

표준화 가치 = **bulk 액션 활용도 × 사용자 빈도 × 현재 격차**
리스크 = **API 변경 / regression / 테스트 비용**

### 5-1. ⭐ 즉시 표준화 권장 (4건) — KPA Operator

| 파일 | 표준화 가치 | 리스크 | 사유 |
|---|:---:|:---:|---|
| `OperatorResourcesPage` | 높음 | 낮음 | DataTable + selection + ActionBar 이미 배선 — BulkResultModal+useBatchAction 추가만 |
| `ForumManagementPage` | 높음 | 낮음 | 동일 — bulk delete API 없으나 Promise.allSettled wrap 가능 |
| `PharmacyRequestManagementPage` | 중 | 낮음 | DataTable+selection 배선, ActionBar+BulkResultModal+useBatchAction 추가 |
| `OperatorContentHubPage` | 매우 높음 | 중 | raw `<table>` 전체 교체 — drift 가장 큼, 컴포넌트 수준 재작성 |

### 5-2. ⭐ 즉시 표준화 권장 (3건) — KPA Admin

| 파일 | 표준화 가치 | 리스크 | 사유 |
|---|:---:|:---:|---|
| `HubContentsPage` | 높음 | 낮음 | BaseTable 진입 완료. selection + bulk 추가만 |
| `HubNoticeListPage` | 높음 | 낮음 | 동일 |
| `AdminForceAssetPage` | 중 | 중 | shadcn `<Table>` → BaseTable 교체 (2개 테이블) — 작업량 큼 |

### 5-3. ⏸ 우선순위 낮음 (4건)

| 파일 | 사유 |
|---|---|
| `OperatorStoreChannelsPage` | bulk 액션 가치 낮음 (채널 정책상 개별 관리) |
| `CollaborationRequestsPage` | 트래픽 낮음, individual 처리 적합 |
| `WorkingContentListPage` | 단일 사용자 화면, bulk 가치 없음 |
| `MyStoreContentsPage` | read-only 의도 가능성 — 정책 확인 후 결정 |
| `StoreContentWorkspacePage` | read-only 의도 가능성 |
| `AdminSnapshotBrowserPage` | 운영 빈도 낮음 |

→ "표준화 가능"하나 **현 시점 작업 우선순위 낮음**.

---

## 6. KPA Operator vs KPA Admin drift 분석

같은 KPA 도메인이지만 두 코드베이스 사이의 격차가 큼:

| 지표 | KPA Operator | KPA Admin |
|---|:---:|:---:|
| 총 리스트 페이지 | 18 | 6 |
| CANONICAL 비율 | **67% (12/18)** | **0% (0/6)** |
| PARTIAL 비율 | 28% (5/18) | 67% (4/6) |
| LEGACY 비율 | 11% (2/18) | 33% (2/6) |
| 사용 table 라이브러리 | `@o4o/operator-ux-core` DataTable 단일 | BaseTable + shadcn `<Table>` 혼재 |
| selection state 표준 | `Set<string>` (canonical) | 없음 |
| bulk action 사용 | 12개 페이지에서 사용 중 | 0개 |

**근본 원인** (관찰 기반 추정):
- KPA Operator 는 `WO-O4O-OPERATOR-LIST-TABLE-STANDARD-V3` 및 후속 WO 시리즈 (`WO-KPA-OPERATOR-RESOURCES-TABLE-STANDARD-COMPLIANCE-V1`, `WO-KPA-OPERATOR-FORUM-REQUESTS-TABLE-COMPLIANCE-V1` 등) 가 **연속적으로 실행**됨
- KPA Admin 은 동일한 표준화 WO 시리즈가 **실행되지 않음** — `apps/admin-dashboard/` 영역은 admin-OS 전체 baseline 진행 중이라 우선순위가 KPA Admin 까지 도달하지 않은 것으로 보임

---

## 7. 비-canonical 영역의 정책적 정당화 가능성

다음 항목은 canonical 위반이 **의도된 정책** 일 수 있으므로 표준화 전 확인 필요:

| 파일 | 정책적 정당화 가능성 |
|---|---|
| `AuditLogPage` | ✅ 확정 — 감사 로그는 read-only 정책 |
| `MyStoreContentsPage` | ⚠️ 미확정 — 매장 본인 콘텐츠 read-only 일 수 있음 |
| `StoreContentWorkspacePage` | ⚠️ 미확정 — workspace 정책 확인 필요 |
| `WorkingContentListPage` | ⚠️ 미확정 — 단일 사용자 card-list 정책 가능 |
| `CommunityManagementPage`(NO-LIST) | ✅ 정책 — Home 편집은 form 패턴 |
| `LegalManagementPage`(NO-LIST) | ✅ 정책 — 약관 편집은 문서 editor |

---

## 8. 위험 신호

| # | 항목 | 영향 |
|---|---|---|
| 1 | `OperatorContentHubPage` 의 **주석-실제 불일치** — 코드 리뷰 시 canonical 로 오인할 수 있음 | ⭐ doc 자체 신뢰도 저하 |
| 2 | KPA Admin 6개 모두 selection 0건 — 운영자가 "여러 개 동시 처리" 의 표준 UX를 KPA Admin 에서 학습할 수 없음 | UX 일관성 저하 |
| 3 | `AdminForceAssetPage` 의 shadcn `<Table>` 은 `@o4o/ui BaseTable` 과 props/style 표준이 다름 → 디자인 토큰 drift | 시각적 일관성 ↓ |
| 4 | canonical doc 의 Phase 분류가 **2026-05-07 기준** — 9일 동안 변경 사항 미반영 (예: ForumDeleteRequestsPage 승격) | doc 신선도 |
| 5 | wrapper 페이지(`OperatorStoresPage` 등) 의 wrap 대상 컴포넌트 canonical 준수 여부 미감사 | 간접 drift |

---

## 9. 본 IR 범위 외 (후속 확인 권장)

- `@o4o/operator-core-ui` 의 `OperatorStoresList`, `GuideContentsManager` canonical 준수 감사
- `@o4o/ui` 의 `RoleManagementPage`, `AiReportPage` canonical 준수 감사
- KPA Admin Phase 1 (HubContents/HubNoticeList) 의 BulkAction API 백엔드 존재 여부
- `MyStoreContentsPage` / `StoreContentWorkspacePage` 의 정책 (read-only 의도 / bulk 필요 여부)
- GlycoPharm / K-Cosmetics / Neture / admin-dashboard 의 비-KPA 영역 (canonical doc 등재 항목은 별도 IR 권장)
- canonical doc 자체의 **2026-05-16 시점 재정렬** (Phase 분류 갱신)

---

## 10. 참조

### Canonical 표준 문서
- `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md`
- `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md`
- `docs/architecture/OPERATOR-CORE-DESIGN-V1.md`

### KPA Operator (canonical 12)
- `services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx`
- `services/web-kpa-society/src/pages/operator/UsersPage.tsx`
- `services/web-kpa-society/src/pages/operator/ProductApplicationManagementPage.tsx`
- `services/web-kpa-society/src/pages/operator/ContentManagementPage.tsx`
- `services/web-kpa-society/src/pages/operator/OperatorLmsCoursesPage.tsx`
- `services/web-kpa-society/src/pages/operator/QualificationRequestsPage.tsx`
- `services/web-kpa-society/src/pages/operator/OperatorForumPage.tsx`
- `services/web-kpa-society/src/pages/operator/ForumDeleteRequestsPage.tsx`
- `services/web-kpa-society/src/pages/operator/signage/HqMediaPage.tsx`
- `services/web-kpa-society/src/pages/operator/signage/HqPlaylistsPage.tsx`
- `services/web-kpa-society/src/pages/operator/signage/TemplatesPage.tsx`
- `services/web-kpa-society/src/pages/operator/signage/ForcedContentPage.tsx`

### KPA Operator (PARTIAL 5)
- `services/web-kpa-society/src/pages/operator/OperatorResourcesPage.tsx`
- `services/web-kpa-society/src/pages/operator/ForumManagementPage.tsx`
- `services/web-kpa-society/src/pages/operator/PharmacyRequestManagementPage.tsx`
- `services/web-kpa-society/src/pages/operator/OperatorStoreChannelsPage.tsx`
- `services/web-kpa-society/src/pages/operator/CollaborationRequestsPage.tsx`

### KPA Operator (LEGACY 2 + READ-ONLY 1)
- `services/web-kpa-society/src/pages/operator/OperatorContentHubPage.tsx` (LEGACY-RAW)
- `services/web-kpa-society/src/pages/operator/WorkingContentListPage.tsx` (LEGACY-RAW card-list)
- `services/web-kpa-society/src/pages/operator/AuditLogPage.tsx` (READ-ONLY)

### KPA Admin (PARTIAL 4 + LEGACY 2)
- `apps/admin-dashboard/src/pages/kpa/HubContentsPage.tsx`
- `apps/admin-dashboard/src/pages/kpa/HubNoticeListPage.tsx`
- `apps/admin-dashboard/src/pages/kpa/MyStoreContentsPage.tsx`
- `apps/admin-dashboard/src/pages/kpa/StoreContentWorkspacePage.tsx`
- `apps/admin-dashboard/src/pages/kpa/AdminForceAssetPage.tsx` (shadcn)
- `apps/admin-dashboard/src/pages/kpa/AdminSnapshotBrowserPage.tsx` (shadcn)

### Sidebar / Menu 구성
- `services/web-kpa-society/src/config/operatorMenuGroups.ts`
- `services/web-kpa-society/src/components/kpa-operator/KpaOperatorSidebar.tsx`

---

*조사 전용 — 코드/DB 수정 없음. 후속 WO 제안은 본 IR 범위 외.*
