# O4O-OPERATOR-TABLE-CANONICAL-V1

> **이 문서는 O4O 플랫폼 모든 운영자(Operator) 리스트 화면의 table 구조 표준이다.**  
> 신규 개발 및 기존 화면 전환 시 반드시 이 문서를 따른다.

**작성일:** 2026-05-07  
**기반 조사:** `docs/archive/investigations/IR-O4O-OPERATOR-TABLE-CANONICAL-GAP-AUDIT-V1.md`  
**상태:** ACTIVE  

---

## 1. Canonical 정의

O4O 운영자 리스트 화면의 canonical table 구조는 다음 세 요소의 조합이다:

```
BaseTable (packages/ui)
  + selectedKeys: Set<string>          ← selection state
  + ActionBar (조건부 표시)             ← bulk action toolbar
  + BulkResultModal                    ← 일괄 처리 결과
  + useBatchAction (operator-ux-core) ← batch 실행 hook
```

이 구조를 **V3 Canonical**이라 부른다.

---

## 2. Component Hierarchy

```
packages/ui/src/components/table/
├── BaseTable.tsx           ← 핵심 테이블 렌더러 (CANONICAL BASE)
├── SelectionTable.tsx      ← BaseTable + selection wrapper (사용 권장)
├── ActionBar.tsx           ← Bulk action toolbar
├── BulkResultModal.tsx     ← 일괄 처리 결과 모달
├── RowActionMenu.tsx       ← Row 단위 action (kebab / inline)
├── FilterBar.tsx           ← 검색/필터 바
└── types.ts                ← O4OColumn, ActionBarAction 등

packages/operator-ux-core/src/list/
├── DataTable.tsx           ← BaseTable thin wrapper (ListColumnDef 변환)
├── useBatchAction.ts       ← batch 실행 + result 상태 hook (CANONICAL HOOK)
└── batch-types.ts          ← BatchResult, BatchResultItem 타입
```

### 2.1 각 레이어 책임

| 레이어 | 책임 | 금지 |
|--------|------|------|
| `@o4o/ui` BaseTable | 렌더링, column 정의, selection props 수신 | 서비스별 비즈니스 로직 |
| `@o4o/ui` ActionBar | bulk action 버튼 표시, confirm dialog | API 호출 |
| `@o4o/ui` BulkResultModal | 결과 표시 + 재시도 UI | 데이터 fetch |
| `@o4o/operator-ux-core` useBatchAction | executeBatch, loading, result, retryFailed | UI 렌더링 |
| service local component | API 호출, selectedIds state, columns 정의 | 공통 컴포넌트 재구현 |

### 2.2 `ag-components/DataTable` 위치

`packages/ui/src/ag-components/DataTable.tsx`는 `@o4o/ui`에서 export되는 **별도 구현체**다.  
selection API(`rowSelection.selectedRowKeys: string[]`)가 BaseTable과 다르다.  
→ 신규 운영자 화면에서 사용 **금지**. 기존 사용처는 Phase 3에서 마이그레이션.

### 2.3 SelectionTable 활용 지침

`SelectionTable`은 BaseTable + ActionBar + selection state를 하나로 캡슐화한 wrapper다.  
현재 미사용 상태이나, 구조 자체는 production-ready다.  
사용 적합 케이스: "선택 → 단일 액션(submit)" 패턴 (예: 콘텐츠 선택 후 복사).  
bulk action이 여러 개인 운영자 리스트 화면에서는 BaseTable 직접 사용을 유지한다.

---

## 3. Selection Architecture

### 3.1 Canonical Selection State

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

**`Set<string>`을 canonical로 선택한다.**

| 비교 항목 | `Set<string>` (canonical) | `string[]` (ag-components DataTable) |
|---------|--------------------------|--------------------------------------|
| BaseTable API | ✅ 직접 호환 | ❌ 불일치 |
| 중복 방지 | ✅ 자동 | ❌ 수동 필요 |
| 포함 확인 | `set.has(id)` O(1) | `arr.includes(id)` O(n) |
| 전환 비용 | — | 타입 변경 필요 |
| 현재 canonical 페이지 | 모두 사용 | GlycoPharm 일부만 사용 |

### 3.2 Selection State 구조 (전체 패턴)

```typescript
// ── 1. state ──
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

// ── 2. BaseTable에 전달 ──
<BaseTable
  selectable
  selectedKeys={selectedIds}
  onSelectionChange={setSelectedIds}
  columns={[
    {
      key: '_select',
      system: true,            // 맨 앞 고정, reorder/visibility 제외
      header: '',
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={(e) => {
            const next = new Set(selectedIds);
            e.target.checked ? next.add(row.id) : next.delete(row.id);
            setSelectedIds(next);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    // ... other columns
  ]}
/>

// ── 3. ActionBar (선택 시에만 표시) ──
{selectedIds.size > 0 && (
  <ActionBar
    selectedCount={selectedIds.size}
    onClearSelection={() => setSelectedIds(new Set())}
    actions={bulkActions}
  />
)}
```

> **Header checkbox**: `selectable={true}` 설정 시 BaseTable 내부에서 자동 생성.  
> **Body cell checkbox**: `key: '_select'` + `system: true` 컬럼의 `render`가 담당.

### 3.3 Selectable Row 제한 패턴

특정 상태의 row만 선택 가능한 경우 (예: 승인 대기 항목만 bulk approve):

```typescript
const selectableIds = useMemo(
  () => items.filter(item => item.status === 'pending').map(item => item.id),
  [items]
);

// render에서 비활성화
render: (_, row) => (
  <input
    type="checkbox"
    disabled={!selectableIds.includes(row.id)}
    ...
  />
)
```

### 3.4 Reusable Hook 가능성

현재 selection 로직은 각 페이지에서 직접 구현한다.  
공통 패턴이 안정화되면 `useOperatorSelection<T>()` hook 추출을 검토한다.  
현재 단계에서는 페이지별 직접 구현을 유지한다.

---

## 4. Bulk Action Architecture

### 4.1 Canonical Bulk Workflow

```
사용자 checkbox 선택
    ↓
selectedIds.size > 0 → ActionBar 표시
    ↓
bulk action 버튼 클릭
    → confirm? → dialog → 확인
    ↓
batch.executeBatch(apiFn, [...selectedIds])
    ↓
useBatchAction 내부:
    apiFn(ids) → { data: { results: BatchResultItem[] } }
    → parseBatchResult()
    → setResult(), setShowResult(true)
    ↓
successCount > 0 → setSelectedIds(new Set()), fetchData()
    ↓
BulkResultModal 표시 (success/failed/skipped 분류)
    → onRetry → failedIds로 재시도
```

### 4.2 useBatchAction 사용법

```typescript
import { useBatchAction } from '@o4o/operator-ux-core';

const batch = useBatchAction();

// bulk 실행
const result = await batch.executeBatch(
  (ids) => apiClient.post('/api/v1/.../batch-action', { ids }),
  [...selectedIds]
);

// 결과 렌더링
<BulkResultModal
  open={batch.showResult}
  onClose={() => { batch.clearResult(); fetchData(); }}
  result={batch.result}
  onRetry={() => batch.retryFailed()}
/>
```

### 4.3 Batch API Payload 표준

```typescript
// Request
POST /api/v1/{service}/operator/{resource}/batch-{action}
Body: { ids: string[] }

// Response
{
  data: {
    results: Array<{
      id: string;
      status: 'success' | 'failed' | 'skipped';
      error?: string;     // failed 시 사유
    }>
  }
}
```

**`skipped`**: 상태 조건 불충족으로 처리 생략 (예: 이미 APPROVED인 항목에 batch-approve).

### 4.4 Bulk API 없는 경우 (Promise.all 패턴)

bulk 전용 API가 없는 경우 개별 API를 병렬 호출로 대체한다.  
단, `executeBatch`에 wrapping해서 사용한다:

```typescript
const result = await batch.executeBatch(
  async (ids) => {
    const results = await Promise.allSettled(
      ids.map(id => individualApi.action(id))
    );
    return {
      data: {
        results: results.map((r, i) => ({
          id: ids[i],
          status: r.status === 'fulfilled' ? 'success' : 'failed',
          error: r.status === 'rejected' ? String(r.reason) : undefined,
        }))
      }
    };
  },
  [...selectedIds]
);
```

> **단순 확인 패턴(`confirm()` + `Promise.all` 직접 호출)은 anti-pattern이다.**  
> 반드시 `useBatchAction` + `BulkResultModal`을 통해 결과를 노출한다.

### 4.5 Bulk Action별 정책

| Action | confirm 필요 | optimistic update | batch API 필요 | 비고 |
|--------|------------|------------------|--------------|------|
| publish | ❌ | ❌ | 권장 | 상태 → PUBLISHED |
| unpublish | ❌ | ❌ | 권장 | 상태 → DRAFT |
| archive | ❌ | ❌ | 권장 | 상태 → ARCHIVED |
| approve | ❌ | ❌ | 권장 | 상태 → APPROVED |
| reject | ✅ (사유 입력) | ❌ | 권장 | requireReason 고려 |
| delete (soft) | ✅ | ❌ | 권장 | 복구 가능 |
| delete (hard) | ✅ (danger) | ❌ | 필수 | 되돌릴 수 없음 명시 |
| tag update | ✅ | ❌ | 권장 | 태그 선택 UI 필요 |
| category update | ✅ | ❌ | 권장 | 카테고리 선택 UI 필요 |
| duplicate | ❌ | ❌ | 개별 호출 가능 | 비동기 처리 고려 |

> optimistic update는 현재 operator 화면에서 사용하지 않는다. 서버 응답 후 fetch 패턴 유지.

---

## 5. UX Canonical Rules

### 5.1 Checkbox 규칙

| 항목 | 기준 |
|------|------|
| Header select-all | `selectable={true}` 시 BaseTable 자동 생성 |
| Row checkbox 위치 | 첫 번째 컬럼 (`system: true`, `key: '_select'`) |
| Indeterminate 상태 | BaseTable 내부 자동 처리 (partial selection 시) |
| checkbox click vs row click | `e.stopPropagation()` 필수 |
| 선택 불가 row | `disabled` 속성으로 시각적 표시, `selectableIds` 필터로 select-all 제외 |

### 5.2 Bulk Toolbar (ActionBar) 규칙

| 항목 | 기준 |
|------|------|
| 노출 조건 | `selectedIds.size > 0` 일 때만 표시 |
| 위치 | 테이블 상단, FilterBar 하단 (테이블과 인접) |
| selectedCount | ActionBar의 `selectedCount` prop에 전달 |
| Destructive action 배치 | `group: 'danger'`, `variant: 'danger'` + 반드시 `confirm` |
| Non-destructive action | `group: 'actions'`, `variant: 'primary'` 또는 `'warning'` |
| mobile collapse | 현재 정책 없음 — desktop-first 유지 |
| `visible` prop | 상태 조건 미충족 시 `visible: false`로 버튼 숨김 (disabled보다 권장) |
| count 표시 | `label: '게시 (${selectedDraftCount})'` 패턴으로 context 제공 |

### 5.3 Row Click 정책

| 케이스 | 처리 방식 |
|--------|---------|
| 기본 row click | detail drawer 열기 (operator 컨텍스트 기본) |
| edit 이동 | RowActionMenu의 'edit' action → navigate |
| checkbox click | `e.stopPropagation()` — row click과 분리 |
| row click + drawer 충돌 | `onRowClick` prop으로 연결, checkbox는 `onClick` 전파 차단 |
| row click 없는 화면 | 허용. RowActionMenu만으로 충분 |

### 5.4 Action Icons (RowActionMenu) 기준

```typescript
// standard pattern
<RowActionMenu
  inlineMax={0}          // 기본: 전부 kebab 메뉴
  actions={[
    { key: 'view',   label: '상세 보기', icon: <Eye />,     onClick: () => openDrawer(row) },
    { key: 'edit',   label: '수정',      icon: <Pencil />,  onClick: () => navigate(`/edit/${row.id}`) },
    {
      key: 'delete', label: '삭제',      icon: <Trash2 />,  variant: 'danger',
      confirm: { title: '삭제 확인', message: '삭제하시겠습니까?', variant: 'danger', confirmText: '삭제' }
    },
  ]}
/>
```

| Action | inline 노출 | 메뉴 노출 | confirm 필요 |
|--------|-----------|---------|------------|
| view / detail | 선택적 (inlineMax: 1) | ✅ | ❌ |
| edit | ❌ | ✅ | ❌ |
| approve (단건) | ✅ `inlineMax: 1` | ✅ | ❌ |
| reject (단건) | ❌ | ✅ | ✅ (사유 권장) |
| delete | ❌ | ✅ | ✅ (danger) |
| duplicate | ❌ | ✅ | ❌ |
| preview | ❌ | ✅ | ❌ |

> **inline 아이콘 최대 1개** 원칙: `inlineMax: 1`. 2개 이상은 kebab 메뉴로.

### 5.5 Status Badge 정책

현재 서비스별 inline `<span>` 구현이 혼재한다.  
공통 `StatusBadge` 컴포넌트는 현재 미정의 상태이므로, 각 페이지에서 일관된 className 패턴 사용:

```typescript
// 권장 패턴 (서비스 내 일관성 유지)
const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE:    { label: '활성',    className: 'bg-green-100 text-green-700' },
  INACTIVE:  { label: '비활성',  className: 'bg-slate-100 text-slate-600' },
  PENDING:   { label: '대기',    className: 'bg-yellow-100 text-yellow-700' },
  APPROVED:  { label: '승인',    className: 'bg-blue-100 text-blue-700' },
  REJECTED:  { label: '반려',    className: 'bg-red-100 text-red-600' },
};
```

### 5.6 Empty / Loading State

BaseTable이 내장 처리한다. 추가 구현 불필요.

```typescript
<BaseTable
  loading={loading}           // skeleton 표시
  emptyMessage="항목이 없습니다."  // 빈 상태 메시지
  ...
/>
```

### 5.7 Pagination Canonical

서버사이드 페이지네이션 표준:

```typescript
const [page, setPage] = useState(1);
const pageSize = 20;

// BaseTable 외부에 Pagination 컴포넌트
<Pagination
  current={page}
  total={totalCount}
  pageSize={pageSize}
  onChange={setPage}
/>
```

BaseTable 내부 페이지네이션은 사용하지 않는다.

### 5.8 Filter / Search Canonical

```typescript
// FilterBar 사용 (or 자체 search input)
const [search, setSearch] = useState('');
const [statusFilter, setStatusFilter] = useState<string>('');

// 필터 변경 시 page 초기화
useEffect(() => { setPage(1); }, [search, statusFilter]);
```

---

## 6. Column 정의 표준

### 6.1 Column 구조

```typescript
const columns: O4OColumn<T>[] = [
  // 1. 선택 (system: true)
  {
    key: '_select',
    system: true,
    header: '',
    width: 40,
    render: (_, row) => <checkboxCell />,
    onCellClick: () => {},  // row click 전파 차단
  },

  // 2. 데이터 컬럼들 (sortable 권장)
  {
    key: 'name',
    header: '이름',
    sortable: true,
    render: (_, row) => <span>{row.name}</span>,
  },
  {
    key: 'status',
    header: '상태',
    render: (_, row) => <StatusBadgeCell status={row.status} />,
  },
  {
    key: 'createdAt',
    header: '등록일',
    sortable: true,
    render: (_, row) => formatDate(row.createdAt),
  },

  // 3. 액션 (system: 'last')
  {
    key: '_actions',
    system: 'last',
    header: '',
    width: 48,
    render: (_, row) => <RowActionMenu actions={buildActions(row)} />,
    onCellClick: () => {},
  },
];
```

### 6.2 System Column 규칙

| `system` 값 | 위치 | reorder/visibility |
|------------|------|-------------------|
| `true` | 맨 앞 | 제외 |
| `'last'` | 맨 뒤 | 제외 |
| 미설정 | 일반 순서 | 포함 |

### 6.3 공통 컬럼 패턴 (서비스 공유 가능)

| 컬럼 | key | 공통화 여부 |
|------|-----|-----------|
| 선택 checkbox | `_select` | ✅ 패턴 공유 |
| 이름/제목 | `name` / `title` | ✅ 패턴 공유 |
| 상태 badge | `status` | ✅ 패턴 공유 |
| 등록일 | `createdAt` | ✅ 패턴 공유 |
| 이메일 | `email` | ✅ 패턴 공유 |
| row action | `_actions` | ✅ 패턴 공유 |
| 약사면허번호 | `licenseNumber` | ❌ KPA 전용 |
| 공급사 정보 | `supplierName` | ❌ Neture 전용 |
| DistributionType | `distributionType` | ❌ Neture 전용 |

---

## 7. Canonical Reference Pages

### TRUE CANONICAL (모든 신규 작업의 기준)

아래 페이지는 V3 Canonical이 완전 구현된 레퍼런스다. 구조 참조 시 이 페이지를 먼저 확인한다.

| 우선순위 | 파일 | 서비스 | 특징 |
|---------|------|--------|------|
| **1순위** | `apps/admin-dashboard/src/pages/neture/ProductApprovalQueuePage.tsx` | Admin | **WO-O4O-PRODUCT-APPROVAL-CANONICAL-COMPLETION-V1 완성** — _select+_actions(system:'last') + selectedPendingCount 필터 + 승인/거절 별도 BulkResultModal + 실제 batch API |
| **2순위** | `services/web-kpa-society/src/pages/operator/ContentManagementPage.tsx` | KPA | publish/archive/delete 3종 bulk + group 분리 + visible 조건 |
| **3순위** | `services/web-neture/src/pages/operator/OperatorProductApprovalPage.tsx` | Neture | batch-approve/batch-reject + real batch API |
| **4순위** | `services/web-kpa-society/src/pages/operator/OperatorLmsCoursesPage.tsx` | KPA | LMS 도메인 표준 |

### CANONICAL TARGET (전환 목표)

현재 LEGACY 또는 PARTIAL이나 V3 전환이 확정된 대상.

| 파일 | 서비스 | 현재 상태 | 전환 Phase |
|------|--------|---------|-----------|
| ~~`apps/admin-dashboard/src/pages/neture/ProductApprovalQueuePage.tsx`~~ | Admin | ✅ TRUE CANONICAL 완성 (WO-O4O-PRODUCT-APPROVAL-CANONICAL-COMPLETION-V1) | — |
| `apps/admin-dashboard/src/pages/operator/ContentApprovalsPage.tsx` | Admin | LEGACY | Phase 1 |
| `apps/admin-dashboard/src/pages/kpa/HubContentsPage.tsx` | Admin | LEGACY | Phase 1 |
| `apps/admin-dashboard/src/pages/kpa/HubNoticeListPage.tsx` | Admin | LEGACY | Phase 1 |
| `services/web-k-cosmetics/src/pages/operator/EventOfferApprovalsPage.tsx` | K-Cosmetics | LEGACY (Raw HTML) | Phase 2 |

### PARTIAL (ActionBar 추가만 필요)

| 파일 | 서비스 | 누락 항목 |
|------|--------|---------|
| `apps/admin-dashboard/src/pages/dropshipping/Products.tsx` | Admin | ActionBar + BulkResultModal |
| `apps/admin-dashboard/src/pages/dropshipping/PartnersList.tsx` | Admin | ActionBar + BulkResultModal |
| `apps/admin-dashboard/src/pages/dropshipping/SellersList.tsx` | Admin | ActionBar + BulkResultModal |
| `apps/admin-dashboard/src/pages/dropshipping/SuppliersList.tsx` | Admin | ActionBar + BulkResultModal |
| `apps/admin-dashboard/src/pages/users/UsersListClean.tsx` | Admin | ActionBar + BulkResultModal |
| `services/web-kpa-society/src/pages/operator/OperatorResourcesPage.tsx` | KPA | BulkResultModal |

### LEGACY (구조 전환 필요)

| 파일 | 서비스 | 문제 |
|------|--------|------|
| `apps/admin-dashboard/src/pages/kpa/MyStoreContentsPage.tsx` | Admin | BaseTable 사용 중, selection 없음 |
| `apps/admin-dashboard/src/pages/users/ActiveUsers.tsx` | Admin | BaseTable 사용 중, selection 없음 |
| `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx` | Admin | BaseTable 사용 중, selection 없음 |
| `services/web-k-cosmetics/src/pages/operator/UsersPage.tsx` | K-Cosmetics | ag-components DataTable, selection 없음 |
| `services/web-k-cosmetics/src/pages/operator/ApplicationsPage.tsx` | K-Cosmetics | ag-components DataTable, selection 없음 |
| `services/web-glycopharm/src/pages/operator/StoreApprovalsPage.tsx` | GlycoPharm | ag-components DataTable, selection 없음 |

### VARIANT (별도 마이그레이션 계획 필요)

| 파일 | 서비스 | 문제 | Risk |
|------|--------|------|------|
| `services/web-glycopharm/src/pages/operator/UsersPage.tsx` | GlycoPharm | ag-components DataTable (`string[]`) + ActionBar | 중간 |
| `services/web-glycopharm/src/pages/operator/PharmaciesPage.tsx` | GlycoPharm | ag-components DataTable + ActionBar (selection 미연결) | 중간 |
| `services/web-neture/src/pages/operator/AllRegisteredProductsPage.tsx` | Neture | operator-ux-core DataTable + 커스텀 checkbox (BaseTable selectable 미사용) | 낮음 |

---

## 8. Anti-Pattern 예시

### Anti-Pattern 1: `window.confirm()` 직접 사용

```typescript
// ❌ ANTI-PATTERN
if (!confirm(`${selectedKeys.size}개를 삭제하시겠습니까?`)) return;
await Promise.all(Array.from(selectedKeys).map(id => api.delete(id)));
```

```typescript
// ✅ CANONICAL
<ActionBar
  actions={[{
    key: 'delete',
    label: '삭제',
    variant: 'danger',
    confirm: {
      title: '삭제 확인',
      message: `${selectedIds.size}개를 삭제하시겠습니까?`,
      variant: 'danger',
      confirmText: '삭제',
    },
    onClick: handleBulkDelete,
  }]}
/>
```

### Anti-Pattern 2: selection state에 `string[]` 사용

```typescript
// ❌ ANTI-PATTERN (ag-components DataTable API)
const [selectedIds, setSelectedIds] = useState<string[]>([]);
rowSelection={{ selectedRowKeys: selectedIds, onChange: setSelectedIds }}
```

```typescript
// ✅ CANONICAL
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
<BaseTable selectable selectedKeys={selectedIds} onSelectionChange={setSelectedIds} ... />
```

### Anti-Pattern 3: Raw HTML 테이블

```typescript
// ❌ ANTI-PATTERN
<div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_180px]">
  <div>상품명</div>
  ...
</div>
```

```typescript
// ✅ CANONICAL
<BaseTable columns={columns} data={items} rowKey="id" ... />
```

### Anti-Pattern 4: BulkResultModal 없이 toast만 사용

```typescript
// ❌ ANTI-PATTERN
const results = await Promise.all(ids.map(id => api.action(id)));
toast.success(`${results.length}개 처리 완료`);
```

```typescript
// ✅ CANONICAL
const result = await batch.executeBatch(apiFn, [...selectedIds]);
// BulkResultModal이 성공/실패/건너뜀을 세분화해서 표시
```

### Anti-Pattern 5: inline action 2개 이상

```typescript
// ❌ ANTI-PATTERN
<RowActionMenu inlineMax={3} actions={[edit, delete, preview, duplicate]} />
```

```typescript
// ✅ CANONICAL
<RowActionMenu inlineMax={1} actions={[primaryAction, edit, delete, preview, duplicate]} />
// 가장 중요한 1개만 inline
```

---

## 9. Migration Roadmap

### Phase 1 — BaseTable LEGACY 전환 (즉시 적용, 위험 낮음)

**대상**: BaseTable 이미 사용 중이나 selection 없는 admin-dashboard 페이지

| 작업 | 파일 | 내용 |
|------|------|------|
| P1-A | `ProductApprovalQueuePage.tsx` | selectable + selectedIds + ActionBar + batch-approve/reject 연결 (레퍼런스 모순 해소) |
| P1-B | `ContentApprovalsPage.tsx` | selectable + ActionBar + bulk approve/reject (개별 API Promise.all) |
| P1-C | `HubContentsPage.tsx` | selectable + ActionBar + bulk (상태 변경 API 확인 필요) |
| P1-D | `HubNoticeListPage.tsx` | selectable + ActionBar + bulk delete |
| P1-E | Dropshipping 4개 | confirm() → ActionBar + BulkResultModal 교체 |

### Phase 2 — Raw HTML → BaseTable 전환 (중간 위험)

| 작업 | 파일 | 내용 |
|------|------|------|
| P2-A | `EventOfferApprovalsPage.tsx` (K-Cosmetics) | Raw HTML grid → BaseTable + selectable + ActionBar |
| P2-B | `UsersListClean.tsx` | custom select UI → ActionBar 교체 |

### Phase 3 — Event Offer / Forum / LMS 전환

| 작업 | 파일 | 내용 |
|------|------|------|
| P3-A | KPA ForumManagementPage | PARTIAL → CANONICAL (BulkResultModal 추가) |
| P3-B | KPA ForumDeleteRequestsPage | PARTIAL → CANONICAL |
| P3-C | Neture ForumManagementPage | PARTIAL → CANONICAL |
| P3-D | Event Offer 운영자 페이지 신규 개발 시 | V3 Canonical 적용 |

### Phase 4 — GlycoPharm DataTable Alignment (높은 위험)

| 작업 | 파일 | 내용 |
|------|------|------|
| P4-A | `GlycoPharm/UsersPage.tsx` | ag-components DataTable (`string[]`) → BaseTable (`Set<string>`) |
| P4-B | `GlycoPharm/PharmaciesPage.tsx` | ag-components DataTable → BaseTable + selection 연결 |
| P4-C | `K-Cosmetics/UsersPage.tsx` | ag-components DataTable → BaseTable |
| P4-D | `K-Cosmetics/ApplicationsPage.tsx` | ag-components DataTable → BaseTable |

> **Phase 4는 별도 WO 발행 후 진행.** API 불일치로 인한 regression 위험 있음.

---

## 10. 위험 요소 및 호환성

### 10.1 Selection API 충돌 (Phase 4 핵심 위험)

`ag-components/DataTable` → BaseTable 전환 시:
- `string[]` → `Set<string>` 타입 변경
- `rowSelection.onChange` 시그니처 변경
- bulk action에서 `selectedIds` 접근 방식 변경

**대응**: 전환 전 해당 페이지 bulk action 동작 전수 테스트 필요.

### 10.2 Promise.all() 기반 Bulk 한계

개별 API 반복 호출은 n개 요청 동시 발생. 대량 선택 시:
- 100개 이상 선택 → 브라우저/서버 부하
- 일부 실패 시 partial success 상태 추적 필요

**대응**: `useBatchAction.executeBatch`로 wrapping해서 결과 추적. 중요 도메인은 batch API 별도 구현 권장.

### 10.3 대량 Row 성능

BaseTable은 가상화(virtualization) 미구현.  
현재 운영자 화면 pageSize 20~50 기준으로 문제없음.  
100개 초과 pageSize 화면에서는 `SelectionTable`의 `maxSelect` prop 활용.

### 10.4 Role-based Action Visibility

서비스별 scope guard는 각 페이지에서 유지. 공통화 대상 아님.  
ActionBar `visible` prop + RowActionMenu `hidden` prop으로 role 기반 표시 제어:

```typescript
{
  key: 'approve',
  label: '승인',
  visible: hasOperatorPermission,  // role check 결과 전달
  onClick: handleApprove,
}
```

### 10.5 Drawer 충돌

row click → drawer open + checkbox selection 동시 설정 시:
- checkbox `onClick: e.stopPropagation()` 반드시 포함
- `_select` 컬럼 `onCellClick: () => {}` 설정으로 row click 전파 차단

### 10.6 Inline Action Dependency

기존 inline edit/delete 버튼 → RowActionMenu 전환 시 UX 변경 발생.  
기능 동등하나 클릭 경로 변경으로 사용자 학습 필요.  
전환 전 서비스 내부 review 권장.

---

## 11. 관련 문서

| 문서 | 경로 |
|------|------|
| Gap 조사 결과 | `docs/archive/investigations/IR-O4O-OPERATOR-TABLE-CANONICAL-GAP-AUDIT-V1.md` |
| Operator Dashboard 표준 | `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md` |
| Operator DataTable 정책 | `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md` |
| HUB Template Standard | `docs/platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md` |
| BaseTable 컴포넌트 | `packages/ui/src/components/table/BaseTable.tsx` |
| useBatchAction hook | `packages/operator-ux-core/src/list/useBatchAction.ts` |

---

*작성: 2026-05-07*  
*Version: 1.0*  
*Status: ACTIVE*
