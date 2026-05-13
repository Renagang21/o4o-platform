# IR-O4O-BASE-TABLE-SELECTABLE-CONTRACT-AUDIT-V1

**조사 유형:** Investigation Report (IR)  
**조사 대상:** BaseTable selectable 계약 사용 현황 전수 조사  
**조사 날짜:** 2026-05-13  
**상태:** COMPLETE

---

## 목적

전체 O4O 서비스에서 BaseTable `_select` column 선언과 row checkbox render 구현 현황을 전수 조사한다.  
`_select` column만 선언하고 `render` 없이 사용하는 pseudo-selectable 상태를 탐지하고, canonical 사용 규칙을 정리한다.

---

## 1. BaseTable / DataTable / SelectionTable 계약 차이

### 1-A. BaseTable (`packages/ui/src/components/table/BaseTable.tsx`)

**계약 (line 246 주석):**
> `selectable` prop은 헤더 select-all만 auto-wire한다. body cell은 consumer의 render가 책임진다.

**동작 상세:**

```
selectable=true + col.key === '_select'
  → 헤더: select-all checkbox 자동 생성 (line 479-489)
  → 바디: col.render 있으면 render 호출, 없으면 row['_select'] (= undefined) → 빈 셀
```

BaseTable은 `_select` column을 자동으로 추가하지 않는다.  
consumer가 columns 배열에 `{ key: '_select', system: true, render: ... }` 를 직접 포함시켜야 한다.

**헤더 조건 (line 479):**
```typescript
const headerContent = (selectable && col.key === '_select')
  ? <input type="checkbox" ref={selectAllRef} ... onChange={handleSelectAll} />
  : col.header;
```

**바디 조건 (line 600-602):**
```typescript
const content = col.render
  ? col.render(value, row, rowIndex)
  : value;  // row['_select'] === undefined → 빈 셀
```

**결론**: `_select` column + `render` 없음 → 헤더 checkbox만 렌더, 바디 checkbox 없음 → **pseudo-selectable**

---

### 1-B. DataTable (`packages/operator-ux-core/src/list/DataTable.tsx`)

**계약 (line 72-100 주석):**
```
selectable → _select 체크박스 컬럼 자동 생성
BaseTable은 col.key === '_select' 인 컬럼에 select-all 헤더를 자동 생성한다.
```

**동작:**
```typescript
if (selectable) {
  columns.unshift({
    key: '_select',
    system: true,
    render: (_value, row, index) => (
      <input
        type="checkbox"
        checked={selectedKeys?.has(getKey(row, index))}
        onClick={(e) => e.stopPropagation()}
        onChange={() => onSelectionChange?.(...)}
      />
    ),
    onCellClick: () => {},  // row click 방지
  });
}
```

`selectable=true`만 전달하면 body checkbox까지 완전 자동 생성된다.  
consumer는 별도 `render` 구현 불필요.

---

### 1-C. SelectionTable (`packages/ui/src/components/table/SelectionTable.tsx`)

`_select` column이 없으면 자동으로 prepend (line 118-126):
```typescript
const hasSelectCol = columns.some(c => c.key === '_select');
if (!hasSelectCol) {
  columns.unshift({
    key: '_select', system: true,
    render: (_val, row) => { ... checkbox ... }
  });
}
selectable={true}  // BaseTable에 전달
```

DataTable과 동일하게 body checkbox 자동 생성.

---

### 1-D. 계약 차이 요약

| 컴포넌트 | selectable=true 시 _select 자동 추가 | body checkbox render | consumer 책임 |
|----------|--------------------------------------|----------------------|--------------|
| **BaseTable** | ❌ 없음 | ❌ render 없으면 빈 셀 | `_select` column + `render` 직접 선언 |
| **DataTable** | ✅ 자동 prepend | ✅ 자동 구현 | `selectable` prop만 전달 |
| **SelectionTable** | ✅ 없으면 자동 prepend | ✅ 자동 구현 | `selectable` prop만 전달 |

---

## 2. 전체 selectable 사용 페이지 목록

### A. 정상 canonical selectable — BaseTable + `_select` + render 완비

| 파일 | render 방식 | onCellClick | selection state | 비고 |
|------|------------|-------------|-----------------|------|
| `services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx` | O (checkbox) | onClick.stopPropagation() | Set<string> | BaseTable 직접 |
| `services/web-kpa-society/src/pages/contents/ContentListPage.tsx` | O (checkbox × 3 섹션) | onClick.stopPropagation() | Set<string> | DocumentsSection, CoursesSection, ParticipationSection |
| `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` | O (custom header+body) | onCellClick: () => {} | Set<string> | full custom, indeterminate 수동 관리 |

### A. 정상 canonical selectable — DataTable wrapper (자동 처리)

| 파일 | selectedKeys | ActionBar | 비고 |
|------|-------------|-----------|------|
| `services/web-glycopharm/src/pages/operator/OrdersPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-glycopharm/src/pages/operator/PharmaciesPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-glycopharm/src/pages/operator/UsersPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-k-cosmetics/src/pages/operator/ProductsPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/operator/ContentManagementPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/operator/ForumDeleteRequestsPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/operator/ForumManagementPage.tsx` | ✅ | ✅ | DataTable (2개 섹션) |
| `services/web-kpa-society/src/pages/operator/MemberManagementPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/operator/OperatorForumPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/operator/OperatorLmsCoursesPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/operator/OperatorResourcesPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/operator/PharmacyRequestManagementPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/operator/ProductApplicationManagementPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/operator/QualificationRequestsPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/operator/signage/ForcedContentPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/operator/signage/HqMediaPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/operator/signage/HqPlaylistsPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/operator/signage/TemplatesPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/operator/UsersPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx` | ✅ | ✅ | DataTable (2 섹션) |
| `services/web-neture/src/pages/operator/AllRegisteredProductsPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-neture/src/pages/operator/ForumDeleteRequestsPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-neture/src/pages/operator/ForumManagementPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-neture/src/pages/operator/MarketTrialApprovalDetailPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-neture/src/pages/operator/OperatorProductApprovalPage.tsx` | ✅ | ✅ | DataTable |
| `services/web-neture/src/pages/operator/UsersManagementPage.tsx` | ✅ | ✅ | DataTable |
| `packages/operator-core-ui/src/modules/stores/OperatorStoresList.tsx` | ✅ | ✅ | DataTable (selectable prop 전달) |

---

### B. Header-only pseudo-selectable — `_select` 선언, render 없음

| 파일 | 컴포넌트 | render | onRowClick | 증상 |
|------|----------|--------|------------|------|
| `services/web-kpa-society/src/pages/instructor/courses/CourseListPage.tsx` | BaseTable | ❌ 없음 | navigate() | 헤더 checkbox 표시, body checkbox 없음, selectedKeys 항상 비어있음 |

**상세 분석 (CourseListPage):**

```typescript
// line 112-118
{
  key: '_select',
  header: '',
  width: '44px',
  system: true,
  // ← render 없음!
}
```

- `BaseTable selectable=true` → 헤더 checkbox 자동 생성 (select-all)
- body cell: `row['_select'] === undefined` → 빈 셀
- `onRowClick={(row) => navigate(...)}` → row 클릭 시 navigate (선택 불가)
- `_select` column에 `onCellClick` 없음 → row click 시 navigate 트리거됨
- `selectedKeys` state + `ActionBar` 연결 완비이나 selectedKeys가 절대 변하지 않음
- **결과**: 헤더 checkbox 클릭 → `handleSelectAll()` 실행되나 visibleKeys 기반으로 계산, body checkbox가 없어 실제 선택 상태가 반영되지 않음

---

### C. Selection state 존재하나 UI 미완성 — `selectable` prop, `_select` column 없음

| 파일 | 컴포넌트 | _select 컬럼 | selectedKeys | ActionBar | 증상 |
|------|----------|-------------|-------------|-----------|------|
| `packages/shared-space-ui/src/ResourcesHubTemplate.tsx` | BaseTable | ❌ 없음 | ✅ 있음 | ✅ bulkDelete/Copy | checkbox 미표시, ActionBar never shows |
| `packages/shared-space-ui/src/LmsHubTemplate.tsx` | BaseTable | ❌ 없음 | ✅ 있음 | ✅ bulkDelete | checkbox 미표시, ActionBar never shows |

**상세 분석:**

`ResourcesHubTemplate` / `LmsHubTemplate` 모두:
```typescript
<BaseTable
  columns={columns}  // _select column 없음
  selectable         // ← 선언되어 있으나 _select column 없으면 header checkbox 미생성
  onSelectionChange={setSelectedKeys}
/>
```

- `columns` 배열: title, author_name, created_at, view_count 등 — `_select` 없음
- `selectable=true`: BaseTable이 내부적으로 handleSelectAll 활성화하나 UI 없음
- header checkbox: `(selectable && col.key === '_select')` 조건 — 컬럼이 없으므로 미생성
- body checkbox: 없음
- `onSelectionChange`: 등록되어 있으나 trigger 불가
- `selectedKeys.size > 0` → ActionBar 표시 조건 → 영구 0 → ActionBar never shows
- **결과**: bulkDelete/Copy 기능 dead

---

### D. 자체 구현 (Legacy / Custom Selection)

| 파일 | 방식 | BaseTable 계약 | 비고 |
|------|------|---------------|------|
| `packages/shared-space-ui/src/SignageManagerTemplate.tsx` | custom HTML table + `selectable?: boolean` config | ❌ 미사용 | 완전 자체 구현, indeterminate 포함 완비 |

`SignageManagerTemplate`은 BaseTable을 사용하지 않고 raw `<table>` + `<input type="checkbox">`로 완전 자체 구현.  
`selectable` prop이 config에 있으나 BaseTable 계약과 무관하다.

---

## 3. 계약 위반 페이지 상세

### 3-A. CourseListPage (B: pseudo-selectable)

**위치:** `services/web-kpa-society/src/pages/instructor/courses/CourseListPage.tsx:112-118`

**증상:**
- 헤더 checkbox는 렌더됨 (BaseTable auto-wire)
- body checkbox 없음 (render 미구현)
- row 클릭 시 `/instructor/courses/{id}`로 navigate (선택 동작 없음)
- ActionBar는 구현되어 있으나 selectedKeys가 절대 변하지 않아 표시되지 않음

**실사용 영향:** 강의 목록에서 일괄 삭제 기능 완전 불작동

---

### 3-B. ResourcesHubTemplate / LmsHubTemplate (C: UI 미완성)

**위치:** `packages/shared-space-ui/src/ResourcesHubTemplate.tsx:795-803`  
**위치:** `packages/shared-space-ui/src/LmsHubTemplate.tsx:324-330`

**증상:**
- `selectable` prop 전달했으나 `_select` column 없음
- header/body checkbox 미표시
- ActionBar + bulkDelete/Copy 로직 완전 구현되어 있으나 dead

**실사용 영향:**
- KPA Resources Hub (`/resources`)의 일괄 삭제 기능 불작동
- KPA LMS Hub (`/lms`)의 일괄 관리 기능 불작동
- 이 템플릿을 사용하는 모든 서비스 동일 영향

---

## 4. 정상 canonical reference 패턴

### 4-A. BaseTable 직접 사용 패턴 (권장)

**참조: `ContentListPage.tsx:216-251`**

```typescript
const columns = useMemo((): O4OColumn<T>[] => [
  {
    key: '_select',
    header: '',
    width: '44px',
    align: 'center',
    system: true,
    render: (_v, row) => (
      <input
        type="checkbox"
        checked={selected.has(row.id)}
        onChange={(e) => {
          e.stopPropagation();
          setSelected(prev => {
            const next = new Set(prev);
            if (next.has(row.id)) next.delete(row.id);
            else next.add(row.id);
            return next;
          });
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-4 h-4 accent-blue-600 cursor-pointer"
      />
    ),
  },
  // ... 나머지 columns ...
], [selected]);

// BaseTable에 전달:
<BaseTable
  columns={columns}
  data={data}
  rowKey={(row) => row.id}
  selectable                              // header select-all auto-wire
  selectedKeys={selected}
  onSelectionChange={setSelected}
  onRowClick={(row) => openDrawer(row)}   // OK: _select onCellClick이 stopPropagation
/>
```

**필수 요소:**
1. `render`: checkbox input + `e.stopPropagation()` 두 곳 (onChange, onClick)
2. `system: true`: reorder/visibility 제외
3. `selectable` prop BaseTable에 전달
4. `selectedKeys` / `onSelectionChange` BaseTable에 연결

---

### 4-B. DataTable wrapper 패턴 (operator 권장)

**참조: `MemberManagementPage.tsx:936-947`**

```typescript
<DataTable<T>
  columns={dataColumns}   // _select column 불필요
  data={data}
  rowKey="id"
  selectable              // DataTable이 _select column 자동 생성
  selectedKeys={selectedIds}
  onSelectionChange={setSelectedIds}
  onRowClick={(row) => openDetail(row)}
/>

{selectedIds.size > 0 && (
  <ActionBar
    selectedCount={selectedIds.size}
    onClearSelection={() => setSelectedIds(new Set())}
    actions={[...]}
  />
)}
```

**DataTable 내부 자동 처리:**
- `_select` column prepend
- body checkbox render + onClick.stopPropagation()
- onCellClick: () => {} (row navigate 충돌 방지)
- BaseTable에 `selectable` 전달 → header checkbox auto-wire

---

## 5. Selection state 구현 방식 현황

전체 서비스 통일 상태:

| 방식 | 사용처 | 표준 여부 |
|------|--------|----------|
| `Set<string>` + `useState<Set<string>>` | 모든 정상 페이지 | ✅ 표준 |
| `string[]` | 없음 | — |
| `selectedRows` | 없음 | — |
| custom ref | SupplierProductsPage (indeterminate 용) | 허용 (custom 구현) |

**결론**: Set<string> 단일 표준으로 통일되어 있음. 혼재 없음.

---

## 6. Row click 충돌 방지 처리 현황

| 처리 방식 | 사용처 | 상태 |
|----------|--------|------|
| `onClick={(e) => e.stopPropagation()}` (render 내부) | ContentListPage, ContentDocumentsPage | ✅ |
| `onCellClick: () => {}` (column에 선언) | DataTable 자동 생성, SupplierProductsPage | ✅ |
| 없음 | CourseListPage (`_select` render 없음) | ⚠️ render 자체가 없으므로 row click이 navigate로 연결됨 |

CourseListPage의 경우 render가 없으니 onClick 처리도 없다.  
`onRowClick`이 navigate이므로 체크박스 클릭 시 페이지 이동이 발생할 수 있다 (현재는 checkbox가 없어 발생 안 함).

---

## 7. Mobile/Card mode 영향

| 항목 | 상태 |
|------|------|
| BaseTable mobile 전환 | BaseTable은 responsive 미처리 — `overflow-x: auto` wrapper만 존재 |
| DataTable mobile | 동일 |
| card mode selectable | 없음 — 모든 selectable은 desktop table 전용 |
| mobile selection state sync | 해당 없음 (card mode 구현 없음) |
| SignageManagerTemplate mobile | 별도 playlist/video table 렌더 있으나 selectable은 desktop 동일 구조 |

**결론**: O4O 플랫폼 전체에서 mobile card mode selectable은 구현되지 않음. 현재는 desktop table 전용이며, 의도적 설계로 보임.

---

## 8. 최종 페이지 분류

### A. 정상 canonical selectable
- 27개 DataTable 페이지 (operator 전체)
- 3개 BaseTable 직접 구현 페이지 (ContentDocumentsPage, ContentListPage×3섹션, SupplierProductsPage)

### B. Header-only pseudo-selectable (계약 위반)
1. **`CourseListPage.tsx`** — `_select` render 없음, body checkbox 없음, ActionBar dead

### C. Selection state 존재하나 UI 미완성
1. **`ResourcesHubTemplate.tsx`** — `selectable` + no `_select` column, bulkDelete dead
2. **`LmsHubTemplate.tsx`** — `selectable` + no `_select` column, bulkDelete dead

### D. Legacy/Raw selection
1. **`SignageManagerTemplate.tsx`** — 완전 자체 구현, BaseTable 계약 미사용 (자체 완비)

### E. Non-selectable 정상
- 나머지 모든 페이지

---

## 9. 공통 수정 패턴

### B 분류 → A 전환 (CourseListPage)

**수정 내용**: `_select` column에 `render` 추가 + `onCellClick` 추가

```typescript
{
  key: '_select',
  header: '',
  width: '44px',
  system: true,
  onCellClick: () => {},         // ← 추가: row navigate 충돌 방지
  render: (_v, row) => (         // ← 추가
    <input
      type="checkbox"
      checked={selectedKeys.has(row.id)}
      onChange={() => {
        setSelectedKeys(prev => {
          const next = new Set(prev);
          if (next.has(row.id)) next.delete(row.id);
          else next.add(row.id);
          return next;
        });
      }}
      onClick={(e) => e.stopPropagation()}
      className="w-4 h-4 accent-blue-600 cursor-pointer"
    />
  ),
}
```

### C 분류 → A 전환 (ResourcesHubTemplate, LmsHubTemplate)

**수정 내용**: columns 배열에 `_select` column prepend

```typescript
const columns = useMemo((): O4OColumn<T>[] => [
  {
    key: '_select' as keyof T,
    header: '',
    width: '44px',
    system: true,
    onCellClick: () => {},
    render: (_v, row) => (
      <input
        type="checkbox"
        checked={selectedKeys.has(row.id)}
        onChange={() => { ... toggleSelect(row.id) ... }}
        onClick={(e) => e.stopPropagation()}
        className="w-4 h-4 accent-blue-600 cursor-pointer"
      />
    ),
  },
  // ... 기존 columns ...
], [selectedKeys]);
```

또는 DataTable 래퍼로 전환하여 자동 생성 활용.

---

## 10. 우선 수정 필요 페이지

| 순위 | 파일 | 분류 | 영향 | 수정 난이도 |
|-----|------|------|------|------------|
| 1 | `services/web-kpa-society/src/pages/instructor/courses/CourseListPage.tsx` | B | 강사 일괄 강의 삭제 불작동 | 낮음 (render 추가 + onCellClick) |
| 2 | `packages/shared-space-ui/src/ResourcesHubTemplate.tsx` | C | KPA 자료실 일괄 삭제/복사 불작동 | 중간 (column prepend + type 처리) |
| 3 | `packages/shared-space-ui/src/LmsHubTemplate.tsx` | C | KPA LMS Hub 일괄 관리 불작동 | 중간 (column prepend + type 처리) |

---

## 11. 대량 공통화 가능 여부

**현황**: operator 전체 (27개+)가 DataTable 패턴으로 이미 통일되어 있음. 대량 수정 불필요.

**수정 범위**: 3개 파일 (B×1, C×2) — 국소적 수정으로 해결 가능.

**DataTable 대 BaseTable 선택 기준 (현행 패턴 추출):**

| 적용 영역 | 권장 컴포넌트 | 이유 |
|----------|-------------|------|
| Operator 목록 | DataTable | selectable 자동 처리, ActionBar 패턴 표준화 |
| Community Hub (콘텐츠, 자료실, LMS) | BaseTable + `_select` render | shared-space-ui 구조, selectable 옵션 |
| 강의 목록 (instructor) | BaseTable 또는 DataTable | 현재 BaseTable 직접 사용 중 |

---

## 관련 파일

| 파일 | 역할 | 주목 사항 |
|------|------|----------|
| `packages/ui/src/components/table/BaseTable.tsx` | 핵심 테이블 | line 246 계약 주석, line 479 header auto-wire |
| `packages/operator-ux-core/src/list/DataTable.tsx` | operator wrapper | selectable → _select 자동 생성 |
| `packages/ui/src/components/table/SelectionTable.tsx` | 선택 전용 wrapper | _select 없으면 자동 prepend |
| `services/web-kpa-society/src/pages/instructor/courses/CourseListPage.tsx` | **B: pseudo-selectable** | render 없음 |
| `packages/shared-space-ui/src/ResourcesHubTemplate.tsx` | **C: UI 미완성** | _select column 없음 |
| `packages/shared-space-ui/src/LmsHubTemplate.tsx` | **C: UI 미완성** | _select column 없음 |

---

## 판정 요약

| 질문 | 판정 |
|------|------|
| BaseTable이 body checkbox 자동 생성하는가 | ❌ 헤더만 auto-wire. body는 consumer render 책임 |
| DataTable이 body checkbox 자동 생성하는가 | ✅ selectable=true 시 _select column + render 자동 생성 |
| pseudo-selectable 페이지가 있는가 | ✅ 1개 (CourseListPage — render 없음) |
| _select 없는 selectable 페이지가 있는가 | ✅ 2개 (ResourcesHubTemplate, LmsHubTemplate) |
| selection state 방식이 통일되어 있는가 | ✅ Set<string> 단일 표준 |
| row click 충돌 방지가 일관적인가 | ⚠️ CourseListPage B분류에서 미적용 (render 없으므로 현재 발생 없음) |
| mobile selectable 구현 있는가 | ❌ 없음. desktop table 전용 |
| 수정 규모 | **국소적** — 3개 파일만 수정 필요 |
| 권장 다음 WO | `WO-O4O-BASE-TABLE-SELECTABLE-CONTRACT-FIX-V1` — CourseListPage + ResourcesHubTemplate + LmsHubTemplate 수정 |
