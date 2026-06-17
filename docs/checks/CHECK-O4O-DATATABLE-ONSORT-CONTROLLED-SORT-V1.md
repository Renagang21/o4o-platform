# CHECK-O4O-DATATABLE-ONSORT-CONTROLLED-SORT-V1

> **작업명:** WO-O4O-DATATABLE-ONSORT-CONTROLLED-SORT-V1
> **유형:** 공통 테이블에 optional controlled(서버) 정렬 additive 추가 + `/operator/stores` 연결. frontend only, backend/DB/package/lock 무변경.
> **결과: PASS — `BaseTable`(@o4o/ui) + `DataTable`(operator-ux-core)에 optional `manualSort`/`sortBy`(sortKey)/`sortOrder`(sortDirection)/`onSort`(onSortChange) 추가. 미지정 시 기존 클라이언트 정렬 그대로(28+ 소비처 무변경). `/operator/stores` 컬럼 클릭 → `useStandardListQuery.setSort`(서버 query + URL sync + page=1 reset). aria-sort 양 모드 반영. @o4o/ui·operator-ux-core·operator-core-ui(stores) isolated tsc 0.**
> 선행: STANDARD-LIST-CORE(62dc177f5) · STORES-ADOPTION(203353832) — 2026-06-17

---

## 1. 변경한 DataTable/BaseTable props (additive, 전부 optional)

**BaseTable(@o4o/ui) `BaseTableProps`** (`packages/ui/src/components/table/types.ts`):
| prop | 의미 |
|------|------|
| `manualSort?: boolean` | true=controlled(서버) 정렬 — 외부 상태 표시 + 클릭 위임, data 재정렬 안 함. 기본 false=기존 동작 |
| `sortKey?: string \| null` | controlled 정렬 컬럼(표시용) |
| `sortDirection?: SortDirection` | controlled 정렬 방향(표시용) |
| `onSortChange?: (key, 'asc'\|'desc')` | 헤더 클릭 위임 콜백 |

**DataTable(operator-ux-core) `DataTableProps`** (`list/types.ts`): `manualSort?` / `sortBy?: string` / `sortOrder?: 'asc'\|'desc'` / `onSort?: (sortBy, sortOrder)` — BaseTable 의 sortKey/sortDirection/onSortChange 로 매핑.

## 2. 기존 동작 유지 방식 (breaking change 0)

- 신규 prop 전부 **optional**, `manualSort` 기본 `false`.
- `manualSort=false`(미지정): `effectiveSort = 내부 sortState` → 기존 `handleHeaderSort`(asc→desc→none) + 클라이언트 `sortedData` 정렬 그대로. visibility-hide 정렬해제 effect 도 내부 모드만.
- ∴ 신규 prop 을 안 넘기는 **기존 28+ DataTable/BaseTable 소비처는 코드·동작·타입 전부 무변경**.

## 3. onSort(controlled) 제공 시 동작

- `manualSort=true`: `effectiveSort = { key: sortKey, direction: sortDirection }`(외부 상태) → 헤더 표시/aria-sort/indicator 외부 반영.
- 헤더 클릭: `handleHeaderSort` 가 내부 setState 대신 **`onSortChange(col.key, next)`** 호출. next = 같은 컬럼이면 `asc↔desc` 토글, 다른 컬럼이면 `asc`(서버 정렬은 항상 정렬 — none 없음, StandardSortOrder 와 정합).
- `sortedData = data`(클라이언트 재정렬 안 함 — 서버 정렬 결과 그대로).

## 4. sortAccessor 유지

- 기존 `sortable`/`sortAccessor`(O4OColumn 매핑) 그대로 유지 — 클라이언트(내부) 정렬 모드에서 계속 사용. manualSort 모드에서는 `sortAccessor` 미사용(서버 정렬), 컬럼 `key` 만 서버 sortBy 로 전달.

## 5. /operator/stores 연결 방식

`OperatorStoresList`(4앱 공통) → DataTable 에 연결:
```tsx
manualSort
sortBy={query.sortBy}
sortOrder={query.sortOrder}
onSort={setSort}   // useStandardListQuery
```
- 컬럼 클릭 → `setSort(key, order)` → query state 갱신 → URL sync(`?stores_sortBy=&stores_sortOrder=`) + **page=1 reset** + 서버 fetch(sortBy/sortOrder).
- 정렬 query 매핑: DataTable `onSort(sortBy,'asc'/'desc')` → fetcher 가 `sortOrder.toUpperCase()`('ASC'/'DESC') 로 StoresApi 전달.

## 6. 정렬 query mapping / backend 지원

- stores backend([StoreConsoleController.ts](../../apps/api-server/src/controllers/operator/StoreConsoleController.ts):109) `validSortFields = { createdAt, name, code, channelCount, productCount }`, 미지원 키는 `createdAt` fallback.
- OperatorStoresList sortable 컬럼(name/channelCount/productCount/createdAt) **전부 서버 whitelist 에 포함** → 컬럼 변경 불요, 모든 sortable 클릭이 유효한 서버 정렬.

## 7. aria-sort 반영 여부

- BaseTable 헤더는 이미 `aria-sort`(ascending/descending/none) 보유 — `effectiveSort` 기반으로 산출하므로 **manual/internal 양 모드 모두 정확 반영**. 추가 변경 없이 controlled 모드에서도 접근성 유지.

## 8. 변경 파일 목록 (5 + CHECK)

| 파일 | 변경 |
|------|------|
| `packages/ui/src/components/table/types.ts` | BaseTableProps 에 controlled sort 4 prop |
| `packages/ui/src/components/table/BaseTable.tsx` | effectiveSort + handleHeaderSort(manual) + sortedData(manual) + 헤더 effectiveSort |
| `packages/operator-ux-core/src/list/types.ts` | DataTableProps 에 manualSort/sortBy/sortOrder/onSort |
| `packages/operator-ux-core/src/list/DataTable.tsx` | destructure + BaseTable passthrough |
| `packages/operator-core-ui/src/modules/stores/OperatorStoresList.tsx` | DataTable 에 controlled sort 연결(setSort) |

> `@o4o/ui` dist(gitignored) 재빌드 필요(소스→consumer 타입 전파). CI 재빌드. dist 미커밋.

## 9. 검증

- **isolated tsc**: `@o4o/ui` 0 · `operator-ux-core` 0 · `operator-core-ui`(stores/DataTable) 0. (유일 에러 `error-handling/useApiErrorHandler.ts` `import.meta.env` = origin/main 기존 vite artifact, 무관.)
- **기존 소비처 무변경 typecheck**: operator-ux-core(자체 DataTable 소비) 0 통과 — optional prop 이라 미전달 소비처 무영향.
- **backend/package/lock 변경 없음**: staged diff 에 apps/api-server·package.json·pnpm-lock.yaml 없음. `@o4o/ui` dist gitignored.
- **DataTable/BaseTable breaking change 0**: 신규 prop 전부 optional, 기본 동작 불변.
- **legacy /operator/pharmacies 미접촉**, 다른 세션 WIP 미staging.
- **browser smoke 미수행** — 배포 후 권장: `/operator/stores` 컬럼 클릭 → URL sortBy/sortOrder 반영·page=1 / 페이지 이동 후 정렬 유지 / 새로고침 정렬 복원 / 같은 컬럼 재클릭 asc↔desc 토글.

## 10. 다음 확산 후보

- `/operator/stores` 가 정렬까지 완성된 표준 레퍼런스 → 확산: `/operator/members` → `/operator/recruitment-exposure` → `/operator/applications`(응답 어댑터) → `/admin/product-approval`(backend 선행).
- 각 확산 시 manualSort + setSort 연결을 동일 패턴으로 적용.

---

*Date: 2026-06-17 · PASS · BaseTable/DataTable optional controlled sort(manualSort/sortBy/sortOrder/onSort) additive — 기존 28+ 소비처 무변경. /operator/stores 컬럼 클릭 → setSort(서버 query+URL+page=1). aria-sort 양 모드. backend/package/lock·pharmacies 무변경. @o4o/ui·operator-ux-core·operator-core-ui(stores) tsc 0.*
