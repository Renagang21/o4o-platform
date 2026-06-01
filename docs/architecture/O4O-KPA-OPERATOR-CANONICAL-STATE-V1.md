# O4O-KPA-OPERATOR-CANONICAL-STATE-V1

> KPA-Society Operator Dashboard 의 Canonical 상태 SSOT.
> 본 문서는 *현재 실제 구현 상태* 의 architectural 기록이며, 새 리팩토링 제안이 아니다.
> 이후 모든 KPA operator 작업·검토는 본 문서를 출발점으로 한다.

- 작성일: 2026-05-09
- 기준 브랜치: `main` (`2f3f67f02` 시점)
- 분류: Architecture · KPA-Society · Operator
- 자매 IR
  - [IR-O4O-KPA-OPERATOR-LIST-CANONICAL-RECHECK-V1](../archive/investigations/IR-O4O-KPA-OPERATOR-LIST-CANONICAL-RECHECK-V1.md) — 본 문서의 origin 조사
  - [IR-O4O-KPA-ROLE-CAPABILITY-AND-APPROVAL-CANONICAL-AUDIT-V1](../archive/investigations/IR-O4O-KPA-ROLE-CAPABILITY-AND-APPROVAL-CANONICAL-AUDIT-V1.md) — Profile/Capability/Membership 분리

---

## 1. 배경

### 1.1 Canonicalization 이 필요했던 이유

KPA Operator Dashboard 는 회원·콘텐츠·신청·LMS·사이니지·약국 신청·자료·자격 등 다수 도메인을 한 운영자 인터페이스에서 다룬다. 운영자 작업 일관성을 보장하려면 **모든 list/table 화면이 같은 패턴**(데이터 표시·선택·일괄 작업·상세 보기·정책 가드)을 따라야 한다.

그러나 진화 과정에서 화면별 차이가 누적된 상태였다:
- DataTable 출처가 화면마다 달랐음 (`@o4o/ui` vs `@o4o/operator-ux-core`)
- 일부 화면은 raw HTML `<table>` 사용
- 회원관리 화면이 profile metadata(activity_type)와 capability(role_assignments) 미표시
- bulk selection / batch action 패턴 미적용된 화면 존재
- canonical 컴포넌트(`MemberListLayout`, `RowActionMenu`, `BaseDetailDrawer`, `ActionBar`, `BulkResultModal`) 사용 분포 불균등

### 1.2 정비 시리즈

본 문서가 기록하는 canonical 상태는 다음 4개 WO 의 누적 결과다:

| 커밋 | WO | 효과 |
|---|---|---|
| `590e64a7d` | WO-O4O-KPA-MEMBER-MANAGEMENT-CANONICAL-ALIGN-V1 | DataTable @o4o/ui → @o4o/operator-ux-core 통일 |
| `0a8788a27` | WO-O4O-KPA-MEMBER-PROFILE-CAPABILITY-COLUMN-ADD-V1 | activity_type + capabilities 컬럼 표시 |
| `d1d194513` | WO-O4O-KPA-MEMBER-BULK-ACTION-ALIGN-V1 | useBatchAction + ActionBar + BulkResultModal 도입 |
| `2f3f67f02` | WO-O4O-KPA-AUDIT-LOG-CANONICAL-ALIGN-V1 | raw `<table>` → DataTable 통합 |

추가로 본 시리즈와 함께 정렬된 사전 작업:
- WO-O4O-KPA-MEMBERSHIP-STATUS-SYNC-V1 (`1a45d3693`) — `kpa_members.status` projection sync
- WO-O4O-MYPAGE-PROFILE-COLUMN-ROUTING-V1 (`b5d10d807`) — `university` / `workplace` SSOT 컬럼 라우팅

---

## 2. Canonical 기준 (현재 채택 SSOT)

KPA Operator Dashboard 의 *list/table 성격* 화면은 다음 컴포넌트·훅을 canonical 패턴으로 사용한다.

### 2.1 컴포넌트 / 훅 카탈로그

| 자원 | 출처 | 역할 |
|---|---|---|
| `DataTable<T>` | `@o4o/operator-ux-core` | 표준 테이블 (selection / loading skeleton / emptyMessage / tableId 내장) |
| `ListColumnDef<T>` | `@o4o/operator-ux-core` | 컬럼 정의 타입 (`key` / `header` / `width` / `sortable` / `sortAccessor` / `render` / `system` / `align`) |
| `useBatchAction` | `@o4o/operator-ux-core` | 일괄 작업 hook (`executeBatch` / `loading` / `result` / `showResult` / `clearResult` / `retryFailed`) |
| `defineActionPolicy` + `buildRowActions` | `@o4o/operator-ux-core` | row action policy 정의 + 빌드 (visible / confirm / variant) |
| `MemberListLayout` | `@o4o/operator-ux-core` | 회원 리스트 전용 layout (탭 / 검색 / header 액션) |
| `StatusBadge` | `@o4o/operator-ux-core` | 상태 뱃지 |
| `RowActionMenu` | `@o4o/ui` | row 단위 dropdown action menu |
| `ActionBar` | `@o4o/ui` | bulk action toolbar (selectedCount / onClearSelection / actions) |
| `BulkResultModal` | `@o4o/ui` | 일괄 작업 결과 모달 (success / failed / skipped + retry) |
| `BaseDetailDrawer` | `@o4o/ui` | row 상세 drawer (title / actions / body) |
| `ConfirmActionDialog` | `@o4o/ui` | 확인 다이얼로그 |

### 2.2 Pagination 패턴

`@o4o/operator-ux-core` `DataTable` 은 *내장 pagination prop 미지원*. 모든 canonical 화면은 **외부 JSX pagination block** 을 DataTable 아래 렌더한다:

```jsx
{totalPages > 1 && (
  <div className="flex items-center justify-center gap-3 mt-4">
    <button onClick={prev} disabled={page <= 1}>이전</button>
    <span>{page} / {totalPages}</span>
    <button onClick={next} disabled={page >= totalPages}>다음</button>
  </div>
)}
```

### 2.3 Selection 패턴

```ts
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

<DataTable<T>
  selectable
  selectedKeys={selectedIds}
  onSelectionChange={setSelectedIds}
  // ...
/>
```

- canonical 단위: `Set<string>`
- DataTable 내장 checkbox 컬럼 + select-all
- row click 과 checkbox click 분리 (canonical DataTable 기본)
- 탭 변경 / fetch 새로고침 시 invalid selection (현재 페이지에 없는 ID) 자동 정리

### 2.4 Bulk Action 패턴

```ts
const batch = useBatchAction();

const handleBulkXxx = async () => {
  const result = await batch.executeBatch(
    (batchIds, options) => apiCall(batchIds, options),
    selectedIds,
    { /* options */ },
  );
  if (result.successCount > 0) {
    setSelectedIds(new Set());
    await refresh();
  }
};

<ActionBar
  selectedCount={selectedIds.size}
  onClearSelection={() => setSelectedIds(new Set())}
  actions={[
    { key, label: `행위 (${count})`, onClick, variant, icon, loading: batch.loading,
      visible: count > 0, confirm: { title, message, variant, confirmText } },
  ]}
/>

<BulkResultModal
  open={batch.showResult}
  onClose={() => { batch.clearResult(); refresh(); }}
  result={batch.result}
  onRetry={() => batch.retryFailed()}
/>
```

Backend bulk endpoint 가 없는 경우 **sequential wrapper** 패턴:
```ts
const batchWrapper = async (ids, options) => {
  const settled = await Promise.allSettled(ids.map(id => apiCall(id, options)));
  const results = settled.map((r, i) => r.status === 'fulfilled'
    ? { id: ids[i], status: 'success' }
    : { id: ids[i], status: 'failed', error: r.reason?.message });
  return { data: { results } };
};
```

---

## 3. Profile / Capability / Membership 구조 (SSOT 정의)

KPA-Society 의 회원 데이터 4축은 다음과 같이 명확히 분리되어 있다 (canonical 정의):

| 축 | SSOT 위치 | 의미 | 변경 정책 |
|---|---|---|---|
| **profile metadata** | `kpa_members.activity_type` (실제 SSOT 는 `kpa_pharmacist_profiles.activity_type`, `kpa_members` 는 mirror) | "어떤 사람인가" — 자기소개. 약국 개설자 / 근무약사 / 병원약사 / ... 11종 | 사용자 본인 자유 변경 (`PATCH /auth/me/profile`) |
| **capability** | `role_assignments` (RBAC SSOT) | "무엇을 할 수 있는가" — 시스템 권한. `kpa:store_owner` / `kpa:operator` / `kpa:admin` / 등 | 운영자 승인 절차 통과 시에만 부여/회수 |
| **membership** | `service_memberships.status` | "서비스 가입 상태" — pending / active / suspended / rejected | `MembershipApprovalService` 가 transactional 변경 |
| **organization role** | `kpa_members.role` | "조직 내 역할" — 회원 / 운영자 / 관리자 | admin scope 의 `PATCH /members/:id/role` 만 변경 가능 (role_assignments 와 동기화됨) |
| **status projection** | `kpa_members.status` | `service_memberships.status` 의 KPA cache | `MembershipApprovalService` 가 동기화 (`WO-O4O-KPA-MEMBERSHIP-STATUS-SYNC-V1`) |

> **중요**: profile metadata 는 자기 선언, capability 는 시스템이 부여. 둘은 서로 자동 변환되지 않는다. 예: `pharmacy_owner` activity_type 을 선택해도 `kpa:store_owner` role 이 자동 부여되지 않음 — 별도의 매장 경영자 신청·승인 흐름 필요.

### 3.1 capability 라벨 매핑 (canonical)

| role 키 | 표시 라벨 | 우선순위 |
|---|---|:---:|
| `platform:super_admin` | 플랫폼 관리자 | 0 |
| `kpa:admin` | 관리자 | 1 |
| `kpa:operator` | 운영자 | 2 |
| `kpa:store_owner` | 매장 운영 | 3 |
| `lms:instructor` | 강사 | 4 |
| `kpa:pharmacist` | 약사 | 5 |

(capability 미매핑 키는 raw 값으로 안전하게 표시 — `MemberManagementPage.tsx:CAPABILITY_LABELS`)

### 3.2 activity_type 라벨 매핑 (canonical)

`ACTIVITY_TYPE_LABELS` (`services/web-kpa-society/src/contexts/AuthContext.tsx`):

| 키 | 라벨 |
|---|---|
| `pharmacy_owner` | 약국 개설자 |
| `pharmacy_employee` | 약국 근무 약사 |
| `hospital` | 병원 약사 |
| `manufacturer` | 제조업 |
| `importer` | 수입업 |
| `wholesaler` | 도매업 |
| `other_industry` | 산업체 |
| `government` | 공무원 |
| `school` | 학교 |
| `other` | 기타 |
| `inactive` | 비활동 |

---

## 4. MemberManagementPage canonical 상태

[`/operator/members`](../../services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx) — KPA operator 의 핵심 화면.

### 4.1 컬럼 구조

| # | header | 데이터 | width | sortable |
|:-:|---|---|:-:|:-:|
| 1 | 이름 | `user.name` (avatar + 텍스트) | 150px | ✓ |
| 2 | 이메일 | `user.email` | 200px | ✓ |
| 3 | 유형 | `membership_type` (약사/약대생 chip) | 80px | — |
| 4 | **활동 유형** | `activity_type` (`ACTIVITY_TYPE_LABELS` 변환) | 120px | — |
| 5 | **조직 역할** | `role` (회원/운영자/관리자, `roleLabels`) | 90px | — |
| 6 | **권한** | `capabilities[]` (chip cluster, sortCapabilities 정렬) | 180px | — |
| 7 | 상태 | `status` (`StatusBadge`) | 80px | — |
| 8 | 가입일 | `joined_at \|\| created_at` | 100px | ✓ |
| 9 | 액션 | `RowActionMenu` (system column) | 60px | — |

`activity_type` (4) — profile metadata
`조직 역할` (5) — kpa_members.role (조직 내 역할, RBAC capability 와 분리)
`권한` (6) — role_assignments 의 active role chip cluster (RBAC capability)

### 4.2 Bulk Action 구조

| Action | 라벨 | variant | 대상 status | confirm |
|---|---|---|:---:|:-:|
| 승인 | `승인 (N)` | primary | `pending` | ✓ |
| 반려 | `반려 (N)` | danger | `pending` | ✓ |
| 정지 | `정지 (N)` | warning | `active` | ✓ |
| 복원 | `복원 (N)` | primary | `suspended` | ✓ |

- 각 action 의 `visible` 은 해당 status 의 selection 수 > 0 일 때만
- 모든 action 은 `confirm` 객체로 count 명시 ("선택한 회원 N명을 …하시겠습니까?")
- backend: 기존 `PATCH /members/:id/status` 단건 endpoint 를 sequential wrapper 로 호출 (별도 batch endpoint 없음)
- 결과: `BulkResultModal` 에 success / failed / skipped + retry 표시

### 4.3 Selection Lifecycle

| 트리거 | 동작 |
|---|---|
| 탭 변경 (`activeTab` 변경) | applications 탭이면 전체 clear, 그 외엔 invalid (현재 페이지에 없는 ID) 정리 |
| `members` 갱신 (fetch / pagination / search) | 동일 invalid filter |
| batch 성공 | `setSelectedIds(new Set())` + `fetchMembers(memberPage)` |
| ActionBar 'X' 클릭 | `setSelectedIds(new Set())` |
| BulkResultModal 닫기 | `batch.clearResult()` + `fetchMembers(memberPage)` |

### 4.4 Operator/Admin scope 분리 (현재 구현)

| 액션 | scope | 주체 |
|---|:---:|---|
| 목록 조회 (`GET /members`) | operator | row 표시 |
| 상세 조회 (`GET /members/:id/info`) | operator | BaseDetailDrawer |
| 정보 수정 (`PATCH /members/:id/info`) | operator | EditMemberModal |
| 상태 변경 (`PATCH /members/:id/status`) | operator | RowActionMenu / 4종 bulk action |
| 삭제 리스크 미리보기 (`GET /members/:id/delete-risk`) | operator | DeleteRiskModal |
| 역할 변경 (`PATCH /members/:id/role`) | **admin** | RowActionMenu (admin only) |
| 삭제 (`DELETE /members/:id?mode=soft\|hard`) | **admin** | DeleteRiskModal |

bulk delete / bulk role 변경은 본 canonical 단계에서 **명시적 미도입** (admin scope + 정책 결정 별도 필요).

### 4.5 BaseDetailDrawer 본문

- 기본 정보 (avatar / name / email / status badge)
- 상세 필드: 유형 / 활동 유형 (값 있을 때) / 조직 역할 / 면허번호 (값 있을 때) / 약국명 (값 있을 때) / 가입일
- 권한 chip cluster — 빈 배열 시 `일반 회원` 텍스트
- 액션 (status 별 동적 노출): 승인 / 반려 / 정지 / 복원

---

## 5. AuditLogPage canonical 상태

[`/operator/audit-logs`](../../services/web-kpa-society/src/pages/operator/AuditLogPage.tsx) — admin scope (kpa:admin / platform:super_admin) 전용.

### 5.1 컬럼 구조

| key | header | width | sortable | render 핵심 |
|---|---|:-:|:-:|---|
| `created_at` | 일시 | 180px | ✓ | `formatDate` + whitespace nowrap |
| `action_type` | 액션 | 160px | — | `ACTION_LABELS` + `ACTION_COLORS` chip |
| `target_type` | 대상 | 90px | — | `TARGET_LABELS` lookup |
| `metadata` | 상세 | (자동) | — | `formatMetadata` + max-w-xs + truncate + title tooltip |
| `operator_role` | 운영자 역할 | 120px | — | text |
| `operator_id` | 운영자 ID | 110px | — | 8자 truncate + title 전체 UUID |

### 5.2 Metadata Truncate 정책

- `formatMetadata(log)` 가 주요 필드를 사람 친화적으로 요약 (예: `pending → active`, `승인`, `"코멘트"`)
- 셀 width 제약: `max-w-xs` + `truncate`
- 전체 raw payload 는 *table 직접 노출하지 않음* — `title` 속성으로 hover tooltip 만 제공
- bulk action / row click drawer / export 미도입 (audit log 는 read-only)

### 5.3 미도입 항목 (의도적 제외)

| 항목 | 이유 |
|---|---|
| row click → drawer | audit log 는 read-only, 긴 payload 노출 회피 정책 |
| bulk selection / action | audit log 는 일괄 작업 대상 아님 |
| export / advanced search | 별도 정책 결정 필요 |

---

## 6. Canonical 완료 화면 목록

KPA Operator Dashboard 의 21개 list/table 성격 화면 분류 (`IR-O4O-KPA-OPERATOR-LIST-CANONICAL-RECHECK-V1` 기준 + 본 시리즈 후 갱신):

### 6.1 A — 풀 Canonical (12개)

`@o4o/operator-ux-core DataTable` + `ListColumnDef` + `useBatchAction` + `defineActionPolicy` + `BaseDetailDrawer` (해당 시) + `RowActionMenu` 모두 사용:

| 화면 | 라우트 | 도메인 |
|---|---|---|
| **MemberManagementPage** | `/operator/members` | members |
| **AuditLogPage** | `/operator/audit-logs` | audit_logs |
| PharmacyRequestManagementPage | `/operator/pharmacy-requests` | pharmacy_request |
| ProductApplicationManagementPage | `/operator/product-applications` | product_approval |
| ContentManagementPage | `/operator/content` | contents |
| ForumManagementPage | `/operator/forum-management` | forum |
| OperatorLmsCoursesPage | `/operator/lms` | lms_course |
| OperatorResourcesPage | `/operator/resources` | resources |
| QualificationRequestsPage | `/operator/qualification-requests` | qualification |
| HqMediaPage | `/operator/signage/hq-media` | signage_media |
| HqPlaylistsPage | `/operator/signage/hq-playlists` | signage_playlist |
| TemplatesPage | `/operator/signage/templates` | signage_template |
| ForcedContentPage | `/operator/signage/forced-content` | signage_forced |

(EventOfferManagePage / WorkingContentListPage / OperatorGuideContentsPage 는 추정 — 미상세 검증)

### 6.2 B — 부분 Canonical (3개, 본 시리즈 범위 외)

DataTable 은 canonical 이지만 일부 패턴(BaseDetailDrawer / RowActionMenu / bulk) 누락:

| 화면 | 라우트 | gap |
|---|---|---|
| ForumDeleteRequestsPage | `/operator/forum-delete-requests` | RowActionMenu 미사용 (인라인 버튼만), Drawer 없음 |
| OperatorForumPage | `/operator/forum` | Drawer 없음 (행 클릭 시 detail 진입 흐름 미구현) |
| OperatorStoreChannelsPage | `/operator/store-channels` | bulk action 없음 (단건 처리만), Drawer 없음 |

### 6.3 C — DataTable Canonical 정비 비대상 (5개)

list 가 아닌 카드 / 대시보드 / 네비게이션 성격 — **DataTable 정렬이 부적절**:

| 화면 | 라우트 | 성격 |
|---|---|---|
| CommunityManagementPage | `/operator/community` | custom cards + modal (광고/스폰서/링크 — 카드형이 자연스러움) |
| ForumAnalyticsDashboard | `/operator/forum-analytics` | custom charts/grid (KPI 시각화) |
| OperatorAnalyticsPage | `/operator/analytics` | dashboard charts |
| OperatorContentHubPage | `/operator/docs` | custom navigation |
| OperatorStoresPage | `/operator/stores` | custom layout (spot-check 후 향후 결정 가능) |

### 6.4 D — Dead / Redirect

- 5개 redirect: `/operator/news → /operator/content` · `/operator/community-management → /operator/community` · `/operator/lms/courses → /operator/lms` · `/operator/users → /operator/members` · `/operator/operators → /operator/members`
- **dead 화면 0개**

---

## 7. Canonical 정비 제외 영역 (의도적 비대상)

다음 화면들은 **list 성격 정렬 대상이 아니며** DataTable canonicalization 비추천:

| 화면 | 비대상 사유 |
|---|---|
| **CommunityManagementPage** | 광고/스폰서/링크 관리는 카드형이 자연스러움. DataTable 강제는 UX 후퇴 |
| **ForumAnalyticsDashboard** | KPI 시각화 — list 가 아닌 chart/grid 성격 |
| **OperatorAnalyticsPage** | 운영 통계 dashboard — 위와 동일 |
| **OperatorContentHubPage** | navigation 성격 |
| **(부분) OperatorStoresPage** | 매장 관리 — list 성격 일부 있으나 spot-check 후 결정. 현재 우선순위 낮음 |

원칙: **DataTable canonical 은 list 성격 화면에만 적용**. 대시보드 / 카드 / 네비 / 차트 화면에 강제하면 오히려 UX 손상.

---

## 8. Bulk Action 정책 (현재 채택 SSOT)

### 8.1 허용 (canonical)

| Action | scope | 대상 status |
|---|:---:|---|
| **approve** (승인) | operator | `pending` 회원만 |
| **reject** (반려) | operator | `pending` 회원만 |
| **suspend** (정지) | operator | `active` 회원만 |
| **restore** (복원) | operator | `suspended` 회원만 |

모두 **operator scope status 변경 작업** — admin scope 불필요.

### 8.2 제외 (의도적 미도입)

| Action | 제외 사유 |
|---|---|
| bulk **delete** | admin scope 필요 + delete-risk preview 가 *단건 검사* 기반 → 일괄 처리 시 hard delete 차단 정책 (forum_posts / forum_comments) 검사 비용 별도 정책 필요 |
| bulk **role change** | admin scope + role_assignments 동기화 부수효과 (kpa:operator/admin RBAC 부여) 일괄 처리 시 audit / 정책 영향 큼 |
| bulk **capability change** | admin scope + capability 부여/회수 정책 (예: `kpa:store_owner` 회수 시 매장 자료 / 콘텐츠 정리 정책) 미정의 |

→ 위 3종은 *별도 IR 선행* 후 정책 결정 시점에 도입 검토.

### 8.3 Bulk Action 구현 원칙

- **status 변경만 일괄 처리** (operator 권한 범위 내)
- backend bulk endpoint 가 없으면 **sequential wrapper**: `Promise.allSettled` + `{ data: { results } }` 반환 형태
- 모든 bulk 는 `confirm` 객체로 count 명시
- 결과는 `BulkResultModal` 로 success / failed / retry 노출
- 성공 시 selection clear + refresh

---

## 9. Operator / Admin 정책 (현재 채택 SSOT)

KPA Operator Dashboard 는 두 개의 권한 layer 로 분리되어 있다:

### 9.1 Operator (`kpa:operator`)

운영 일상 작업:

- 회원 정보 조회 / 검색 / 필터
- 회원 상세 조회 (BaseDetailDrawer)
- 회원 정보 수정 (`PATCH /members/:id/info`)
- 회원 **상태 변경** (`PATCH /members/:id/status`) — 단건 + 일괄
- 가입 / 약국 / 상품 / 자격 / 강의 신청 **승인·반려**
- 콘텐츠 / 포럼 / 사이니지 / 자료 일괄 처리 (status 변경, 보관 등)
- 신청 큐 처리 (Pharmacy / Product / Qualification / Forum / Course)

### 9.2 Admin (`kpa:admin` / `platform:super_admin`)

권한·삭제·법률·감사:

- **회원 역할 변경** (`PATCH /members/:id/role`) — `kpa_members.role` member ↔ operator ↔ admin + role_assignments 동기화
- **회원 삭제** (`DELETE /members/:id?mode=soft|hard`) — soft (`status='withdrawn'`) / hard (DB DELETE, forum_posts > 0 시 차단)
- **법률 / 감사 / 권한** 관리 — `/operator/legal` · `/operator/audit-logs` · `/operator/roles`
- **조직 가입 승인** (`/organization-join-requests`) — KPA 분회 가입 (admin only)

### 9.3 분리 원칙

- frontend Guard: `<RoleGuard allowedRoles={[KPA_ADMIN, PLATFORM_SUPER_ADMIN]}>` 으로 admin-only 라우트 보호
- backend: `requireScope('kpa:admin')` middleware 로 각 endpoint 별 검증
- `defineActionPolicy` 의 row action 도 admin 전용 액션은 사용자 role 검사로 hidden

→ **이 분리는 정렬되어 있으므로 추가 정비 불필요**.

---

## 10. 이후 공통화 기준 (다른 서비스 전파 시)

### 10.1 즉시 재사용 가능 (이미 공통화됨)

| 자원 | 위치 | 상태 |
|---|---|---|
| `DataTable<T>` + `ListColumnDef<T>` | `@o4o/operator-ux-core` | 4개 서비스 공통 사용 |
| `useBatchAction` | `@o4o/operator-ux-core` | 동일 |
| `defineActionPolicy` + `buildRowActions` | `@o4o/operator-ux-core` | 동일 |
| `RowActionMenu` / `ActionBar` / `BulkResultModal` / `BaseDetailDrawer` / `ConfirmActionDialog` | `@o4o/ui` | 4개 서비스 공통 사용 |
| Sequential batch wrapper 패턴 | (코드 패턴) | KPA `MemberManagementPage` 가 reference 구현 |
| 외부 pagination JSX | (코드 패턴) | 모든 canonical 화면 동일 |

### 10.2 서비스별 도메인 종속 (개별 적용)

| 자원 | 사유 |
|---|---|
| `MemberListLayout` | KPA 회원 분류(약사/약대생) 종속 — 다른 서비스는 자체 layout 필요 가능 |
| `ACTIVITY_TYPE_LABELS` | KPA 활동 유형 11종 한정 — GlycoPharm/K-Cosmetics 는 다른 분류 |
| `CAPABILITY_LABELS` | KPA prefix 위주 (`kpa:*`) — 서비스마다 prefix 다름 (`glyco:*`, `cosmetics:*`) |
| `kpa_members.status` projection sync | KPA 도메인 — 다른 서비스는 자체 projection 테이블 필요 가능 |

### 10.3 Phase 3 공통화 후보 평가 (사전)

| 영역 | 공통화 가능성 | 근거 |
|---|---|---|
| **member list 컬럼 구조** | 중간 | profile + capability 분리 패턴은 보편적이나 컬럼명·라벨은 도메인 종속 |
| **bulk action wrapper 패턴** | 높음 | sequential `{ data: { results } }` 형태가 canonical, 다른 서비스도 같은 hook 재사용 |
| **status sync (projection)** | 중간 | `MembershipApprovalService` 패턴 자체는 generic 하나 service_key prefix 분기 필요 |
| **capability chip cluster** | 높음 | `CapabilityChips` 컴포넌트로 추상화 가능 (sortCapabilities + formatCapabilityLabel) — `@o4o/operator-ux-core` 승격 후보 |
| **profile metadata badge** | 중간 | `ProfileMetaBadge` 컴포넌트 추상화 가능, 단 라벨 매핑은 서비스별 |
| **delete-risk preview 패턴** | 높음 | KPA 가 reference. 다른 서비스도 동일 흐름 권장 |

→ Phase 3 진입 시 권장 우선순위: **(1) `useBulkSelection` hook** (현재 각 화면 `useState<Set<string>>` 직접 관리) → **(2) `CapabilityChips` 컴포넌트** → **(3) `ProfileMetaBadge` 컴포넌트** 순으로 `@o4o/operator-ux-core` 승격.

---

## 11. 남은 minor gap (본 canonical 외 잔여)

본 canonical 시리즈가 *list 성격* 화면에 집중했으므로, 다음 minor gap 은 별도 WO 로 처리:

| 화면 | gap | 우선순위 |
|---|---|:-:|
| **ForumDeleteRequestsPage** | RowActionMenu 미사용 (인라인 버튼만), Drawer 없음 | 낮음 |
| **OperatorForumPage** | Drawer 없음 (행 클릭 detail 진입 흐름 미구현) | 낮음 |
| **OperatorStoreChannelsPage** | bulk action 없음 (단건 처리만), Drawer 없음 | 낮음 |

→ 위 3개는 list 자체는 canonical 이나 부수 패턴(Drawer / RowActionMenu / bulk) 부분 격차. **별도 minor WO 로 정렬 가능** — 본 canonical 의 핵심 SSOT 에는 영향 없음.

추가 잔여:
- **EventOfferManagePage / WorkingContentListPage / OperatorGuideContentsPage** — A 분류 추정이지만 spot-check 미수행. 후속 IR 또는 WO 진행 시 검증 권장.

---

## 12. SSOT 요약

### 12.1 Canonical 컴포넌트 / 훅

```
@o4o/operator-ux-core:
  DataTable<T>, ListColumnDef<T>,
  useBatchAction,
  defineActionPolicy, buildRowActions,
  MemberListLayout (KPA 한정),
  StatusBadge

@o4o/ui:
  RowActionMenu,
  ActionBar,
  BulkResultModal,
  BaseDetailDrawer,
  ConfirmActionDialog
```

### 12.2 Profile / Capability / Membership 분리

```
profile metadata = activity_type            (자기소개, 자유 변경)
capability       = role_assignments         (RBAC SSOT, 승인 필요)
membership       = service_memberships      (서비스 가입 SSOT)
status projection = kpa_members.status      (cache, 자동 sync)
organization role = kpa_members.role        (조직 내 역할, role_assignments 와 동기화)
```

### 12.3 Bulk Action 범위

```
허용: approve / reject / suspend / restore       (operator scope, status 변경)
제외: delete / role change / capability change   (admin scope + 정책 결정 별도 필요)
```

### 12.4 Operator / Admin

```
operator: 정보 조회·수정 + 상태 변경 + 승인·반려 (일상 운영)
admin   : 역할 변경 + 삭제 + 법률·감사·권한 관리
```

---

## 13. 검증

본 문서가 현재 코드 구현과 일치함을 확인:

| 항목 | 검증 | 근거 |
|---|:-:|---|
| MemberManagementPage 컬럼 9개 | ✓ | `MemberManagementPage.tsx:memberColumns` 배열 |
| activity_type / capabilities 컬럼 | ✓ | 같은 파일 + `KpaMember` interface 확장 |
| Bulk 4종 (approve/reject/suspend/restore) | ✓ | `MemberManagementPage.tsx:handleBulk*` |
| Sequential wrapper | ✓ | `MemberManagementPage.tsx:batchUpdateMemberStatus` |
| AuditLogPage DataTable | ✓ | `AuditLogPage.tsx:auditColumns` + `<DataTable<AuditLog>>` |
| status sync (kpa_members) | ✓ | `MembershipApprovalService.ts` STEP4 (`d120c273b` 이후) |
| Canonical 컴포넌트 import | ✓ | 12개 A 분류 화면 동일 import 구조 |

---

## 14. 다음 단계

본 canonical 상태가 SSOT 로 고정된 후 권장 다음 단계:

| 단계 | 권장 작업 |
|:-:|---|
| **A** | minor gap 3종 정렬 (선택, 우선순위 낮음) — ForumDeleteRequests / OperatorForum / OperatorStoreChannels |
| **B** | **다른 서비스 공통화 IR** 진행 — GlycoPharm / K-Cosmetics / Neture 의 operator dashboard 가 본 canonical 과 어디까지 일치/격차인지 audit |
| **C** | Phase 3 추상화 후보 정리 — `useBulkSelection` / `CapabilityChips` / `ProfileMetaBadge` 의 `@o4o/operator-ux-core` 승격 검토 |
| **D** | bulk delete / bulk role / bulk capability 정책 IR — 본 canonical 의 *제외* 항목들에 대한 운영 정책 결정 |

본 문서는 *현 시점 KPA operator canonical 상태의 architectural snapshot* 이며, 위 A–D 진행 시 갱신 또는 V2 로 분기.

---

*O4O-KPA-OPERATOR-CANONICAL-STATE-V1*
*Updated: 2026-05-09*
*Status: Active SSOT — KPA Operator list canonical 정렬 종료점*
