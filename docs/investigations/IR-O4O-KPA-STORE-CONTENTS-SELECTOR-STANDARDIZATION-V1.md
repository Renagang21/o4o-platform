# IR-O4O-KPA-STORE-CONTENTS-SELECTOR-STANDARDIZATION-V1

> **조사 일자**: 2026-05-26  
> **목적**: `StoreLibraryContentsPage` / `StoreContentsSelector` 구조 조사 및 O4O 표준 테이블 전환 방식 결정  
> **결과**: 코드 변경 없음 (IR 전용)

---

## 1. 핵심 발견 요약

**StoreContentsSelector 는 카드형 UI가 아니다.**  
이미 `@o4o/operator-ux-core DataTable` + custom toolbar 구조로 구현되어 있다.  
따라서 이번 WO 의 전환 과제는 **카드→DataTable 전환이 아니라, DataTable 패키지 교체 + ActionBar 표준화**다.

---

## 2. 파일 구조

| 파일 | 역할 |
|------|------|
| `StoreLibraryContentsPage.tsx` | 페이지 wrapper — `StoreContentsSelector mode="page"` 마운트 |
| `StoreContentsSelector.tsx` | 공유 canonical 셀렉터 — 데이터 fetch / 탭 / 검색 / 선택 / 액션 모두 내부 구현 |
| `SelectContentsForProductionModal.tsx` | 제작자료 흐름 모달 — `StoreContentsSelector mode="modal"` 마운트 |

---

## 3. StoreContentsSelector 현재 구조

### 3-1. mount point (두 곳)

```
StoreLibraryContentsPage
  └─ <StoreContentsSelector mode="page" onStartProduction onRemoveSnapshots onAfterRemove />

SelectContentsForProductionModal  ← StoreProductionMaterialsPage 에서 호출
  └─ <StoreContentsSelector mode="modal" startButtonLabel="선택 완료" onStartProduction />
```

### 3-2. 내부 구성

```
StoreContentsSelector
  TopTabBar (콘텐츠 / 강의)
  ├─ 콘텐츠 탭
  │   SubTabBar (문서형 / 코스형)
  │   ├─ DocumentsSection
  │   │   ├─ 검색 (debounce 300ms)
  │   │   ├─ custom toolbar (선택 시 노출: 제작 시작 / 선택 삭제 / 선택 해제)
  │   │   ├─ DataTable<DocumentRow>  ← @o4o/operator-ux-core
  │   │   └─ Pagination
  │   └─ CourseResourceEmptySection (예비 탭, empty state)
  └─ 강의 탭
      LessonsSection
        ├─ 검색 (debounce 300ms)
        ├─ custom toolbar (선택 시 노출: 제작 시작 / 선택 삭제 / 선택 해제)
        ├─ DataTable<LessonRow>  ← @o4o/operator-ux-core
        └─ Pagination
```

### 3-3. 선택 상태 관리

```typescript
const [selected, setSelected] = useState<Set<string>>(new Set());
// selectionKey = "snapshot:id" | "direct:id"
```

`@o4o/operator-ux-core DataTable` 의 selectable API:

```typescript
<DataTable
  selectable
  selectedKeys={selected}              // Set<string>
  onSelectionChange={setSelected}      // (next: Set<string>) => void
/>
```

### 3-4. 기존 bulk action (이미 구현됨)

| 액션 | 구현 여부 | API | 범위 |
|------|-----------|-----|------|
| **제작 시작** | ✅ | 없음 (frontend 콜백) | 선택 항목 → `onStartProduction(items)` |
| **선택 삭제** | ✅ | `storeAssetControlApi.updatePublishStatus(id, 'hidden')` | page mode 전용 (`onRemoveSnapshots` 제공 시) |
| **선택 해제** | ✅ | 없음 | `setSelected(new Set())` |

### 3-5. mode 분리 (이미 구현됨)

| mode | 차이점 |
|------|--------|
| `page` | router `<Link>` 사용 / 선택 삭제 버튼 노출 / 제작 시작 |
| `modal` | `<a href target="_blank">` 사용 / 선택 삭제 버튼 숨김 / "선택 완료" 라벨 |

---

## 4. DataTable 패키지 현황

| 패키지 | 컴포넌트 | 컬럼 타입 | 선택 API | 사용처 |
|--------|---------|----------|---------|--------|
| `@o4o/operator-ux-core` | `DataTable<T>` | `ListColumnDef<T>` | `selectedKeys: Set<string>` | StoreContentsSelector (현재) |
| `@o4o/ui` | `DataTable<T>` | `Column<T>` | `rowSelection.selectedRowKeys: string[]` | KPA 최근 WO 표준 (TabletRequestsPage 등) |

두 패키지 모두 `BaseTable` 을 렌더링 엔진으로 사용한다 — 시각적 결과는 동일.  
차이는 **컬럼 정의 API** (`ListColumnDef` vs `Column<T>`) 와 **선택 상태 타입** (`Set<string>` vs `string[]`).

---

## 5. production-materials 흐름 영향 분석

```
StoreProductionMaterialsPage
  → "새 제작 자료 만들기" CTA
    → SelectContentsForProductionModal (mode="modal")
      → StoreContentsSelector (mode="modal")
        → 선택 완료 → onConfirm(items)
      → StartProductionModal (AI 카드 선택)
        → AiContentModal
          → ProductionMaterialEditorPage
```

**결론**: `StoreContentsSelector` 내부를 수정해도 production-materials 흐름 자체는 유지된다.  
위험 요소는 **modal 내 DataTable UI 변화**뿐이며, 기능 계약(`onStartProduction`, `mode`, `startButtonLabel`)은 변경하지 않으므로 안전하다.

---

## 6. 표준화 옵션 비교

### Option A — StoreContentsSelector 내부 DataTable 마이그레이션 (권장)

**변경 범위**:

```
@o4o/operator-ux-core.DataTable → @o4o/ui.DataTable
ListColumnDef<T>                → Column<T>
selectedKeys: Set<string>       → rowSelection.selectedRowKeys: string[]
custom toolbar div              → @o4o/ui.ActionBar
Pagination (@o4o/operator-ux-core) → 유지 or @o4o/ui.Pagination 검토
```

**장점**:
- 모든 mount point (page + modal) 가 한 번에 표준화됨
- 중복 구현 없음
- page/modal 모드 분리 구조 유지

**위험**:
- `DocumentsSection` + `LessonsSection` 2개 DataTable 동시 마이그레이션
- modal 내 ActionBar 노출 시 레이아웃 확인 필요
- `Set<string>` → `string[]` 변환: 검색/필터/삭제 후 선택 초기화 로직 재검토

**난이도**: 중간 (기계적 API 전환 + selection 타입 변환)

---

### Option B — StoreLibraryContentsPage wrapper에서만 DataTable 구성

**변경 범위**:
- `StoreLibraryContentsPage` 에 새 DataTable 레이어 추가
- `StoreContentsSelector` 를 건드리지 않거나, props로 data를 받도록 재설계

**문제점**:
- 데이터 fetch, 검색, 페이지네이션이 StoreContentsSelector 내부에 있음
- Wrapper 에서만 DataTable 을 구성하려면 selector 의 내부 상태를 외부로 노출해야 함
- production-materials 모달과 데이터 로직 이원화 발생

**결론**: 구조적으로 부적합. **채택 불가**.

---

### Option C — StoreContentsSelector 에 mode 추가 (`table` | `selector`)

**현황**: `mode='page' | 'modal'` 이 이미 존재하고, 두 모드 모두 **같은 DataTable UI** 를 사용한다.  
별도 `table` mode 를 추가하는 것은 **현재 구조에서 불필요** — page mode 가 이미 full-table 화면이다.

**결론**: mode 는 이미 충분히 분리되어 있음. 추가 mode 불필요.

---

## 7. 권장 옵션: **Option A**

이유:
1. 공유 컴포넌트의 DataTable API를 O4O 최신 표준(`@o4o/ui`)으로 통일
2. page + modal 양쪽이 동시에 표준화됨 (중복 없음)
3. mode 분리 구조는 현행 유지
4. production-materials 흐름 계약은 변경 없음 (`onStartProduction`, props API)

---

## 8. bulk action 요구사항 (후속 WO 범위)

| 액션 | 현재 | 후속 WO 포함 여부 |
|------|------|------------------|
| 제작 시작 | ✅ custom toolbar | → `@o4o/ui ActionBar` 로 이관 |
| 선택 삭제 | ✅ custom toolbar | → `@o4o/ui ActionBar` 로 이관 (page mode 전용) |
| 선택 해제 | ✅ custom toolbar | → ActionBar `onClearSelection` |
| 선택 보관 | ❌ 없음 | 후속 WO 또는 제외 |
| 선택 태그 변경 | ❌ 없음 | backend 신규 필요 — 이번 외 |
| 선택 제작 자료로 보내기 | ✅ "제작 시작" 로 이미 구현 | 동일 흐름 유지 |

**1차 WO 포함**: 제작 시작, 선택 삭제 (page mode), 선택 해제  
**후속 분리**: 선택 보관, 선택 태그 변경

---

## 9. DataTable 전환 난이도

| 항목 | 현황 | 전환 작업 |
|------|------|----------|
| `@o4o/ui DataTable` 사용 가능 여부 | ✅ (KPA 서비스에서 이미 사용 중) | import 변경 |
| rowSelection API 변환 | `Set<string>` → `string[]` | 내부 `selected` state 타입 변경 + toArray/Set 변환 |
| ActionBar 적용 | custom toolbar → `@o4o/ui ActionBar` | toolbar JSX 교체 |
| 컬럼 정의 마이그레이션 | `ListColumnDef<T>` → `Column<T>` | 컬럼 배열 재작성 (필드는 동일) |
| Pagination | `@o4o/operator-ux-core.Pagination` | 그대로 유지 (변경 범위 외) |
| modal 레이아웃 확인 | ActionBar 고정 높이 추가 가능성 | 브라우저 smoke test 필요 |

**총 예상 난이도**: 중간 (하루 이내 가능)

---

## 10. 후속 WO 권장 범위

### WO-O4O-KPA-STORE-LIBRARY-CONTENTS-STANDARD-TABLE-V1

**포함**:
- `StoreContentsSelector.tsx` 내부 DataTable 마이그레이션
  - `@o4o/operator-ux-core.DataTable` → `@o4o/ui.DataTable`
  - `ListColumnDef<T>` → `Column<T>` (DocumentsSection + LessonsSection 두 곳)
  - `selectedKeys: Set<string>` → `rowSelection.selectedRowKeys: string[]`
  - custom toolbar → `@o4o/ui ActionBar` (제작 시작 / 선택 삭제 / 선택 해제)
- `StoreLibraryContentsPage.tsx` 는 **무변경** (StoreContentsSelector props API 변경 없음)
- `SelectContentsForProductionModal.tsx` 는 **무변경** (props API 변경 없음)

**제외**:
- production-materials 흐름 재설계
- editor 구조 재설계
- backend 신규 API
- `@o4o/store-asset-policy-core` 변경
- StoreAssetsPage 변경
- GlycoPharm / K-Cosmetics 이식

---

## 11. 코드 변경 없음 확인

이번 IR 에서 코드 파일을 수정하지 않았다.

```
수정된 파일: 없음
```

---

## 12. 참조 파일

```
services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx
services/web-kpa-society/src/pages/pharmacy/StoreContentsSelector.tsx
services/web-kpa-society/src/pages/pharmacy/SelectContentsForProductionModal.tsx
services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx
services/web-kpa-society/src/pages/pharmacy/StoreProductionMaterialsPage.tsx
packages/operator-ux-core/src/list/DataTable.tsx
packages/operator-ux-core/src/list/types.ts
packages/ui/src/ag-components/DataTable.tsx
```
