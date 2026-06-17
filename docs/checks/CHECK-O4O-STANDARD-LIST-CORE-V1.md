# CHECK-O4O-STANDARD-LIST-CORE-V1

> **작업명:** WO-O4O-STANDARD-LIST-CORE-V1
> **유형:** 표준 리스트 공통 기반(상태·URL·정규화·툴바 계약) additive 구현. **새 DataTable 없음 / 기존 컴포넌트 breaking change 0 / backend·DB·package.json·lock 무변경.**
> **결과: PASS — `@o4o/operator-ux-core` list 모듈에 `useStandardListQuery` + `normalizePaginatedResponse` + `StandardListToolbar` + 표준 타입 추가(additive export). 기존 DataTable/Pagination/SearchBar 재사용. operator-ux-core isolated tsc 0. /operator/stores 실제 전환은 후속 WO.**
> 선행: IR-...-EXTERNAL-BENCHMARK-V1(b833d19d3) · IR-...-PAGINATION-SORTING-AUDIT-V1(3e5e93a96) — 2026-06-17

---

## 1. 생성/수정 파일 (5 + CHECK)

| 파일 | 변경 |
|------|------|
| `packages/operator-ux-core/src/list/standard/standard-types.ts` | **신규** — StandardSortOrder/ListQueryState/PaginationState/PaginatedResponse + hook options/result 타입 |
| `packages/operator-ux-core/src/list/standard/normalizePaginatedResponse.ts` | **신규** — 응답 shape 혼재 흡수 어댑터 |
| `packages/operator-ux-core/src/list/standard/useStandardListQuery.ts` | **신규** — 상태 hook(URL sync, page=1 reset, fetch+normalize) |
| `packages/operator-ux-core/src/list/standard/StandardListToolbar.tsx` | **신규** — 검색/필터/액션/summary 배치 표준(기존 SearchBar 재사용) |
| `packages/operator-ux-core/src/list/index.ts` | export 추가(additive, 기존 export 무변경) |

> 다른 세션 WIP(`layout/OperatorAreaShell.tsx`, `sidebar/DomainIASidebar.tsx`, GP `operatorMenuGroups.ts`) **미접촉**. backend/DB/migration/package.json/lock/Dockerfile/CI **변경 0**.

## 2. useStandardListQuery 제공 기능

- 상태: `page/limit/search/sortBy/sortOrder/filters` 단일 소스(`StandardListQueryState`).
- **URL query 동기화**(`syncUrl` 기본 true) — react-router `useSearchParams`(이미 peerDependency). 초기값 URL→state, 변경 시 state→URL(`replace`). `urlKeyPrefix` 로 한 페이지 다중 리스트 충돌 방지. 필터는 `f_<key>` param.
- **page=1 reset 표준**: 검색/필터/정렬/limit 변경 시 자동 reset. **단순 페이지 이동(setPage)은 검색/필터/정렬 유지**.
- fetch: `fetcher(query)` 호출 → `normalize`(미지정 시 `normalizePaginatedResponse`) → `items`/`pagination` 반환. stale 응답 무시(reqId), loading/error/refetch 제공.
- setter: `setPage/setLimit/setSearch/setSort/setFilter/setFilters/resetFilters/refetch`.

## 3. normalizePaginatedResponse 지원 shape

내부 감사 IR 의 혼재 응답 → 표준 `{ data, pagination{page,limit,total,totalPages,hasNextPage,hasPreviousPage} }`:
- `{ success, data, pagination }` · `{ data, pagination }`
- `{ data: { items|data, pagination|meta } }`
- `{ data, meta:{ total, page, limit } }`
- `{ <domainKey>, pagination }` (예: `{applications}`, `{pharmacies}`, `{users}` — 첫 배열 property 자동 탐지)
- `{ items, meta }`
- **array-only** → total=length, page=1, limit=length fallback
- **안전**: 인식 실패/throw → 빈 배열 + 안전 pagination(화면 crash 방지). totalPages=ceil(total/limit), page/limit 누락 시 query 기본값 보정.

## 4. StandardListToolbar 범위

- 검색(기존 `SearchBar` 재사용, 로컬 controlled + 디바운스 결과만 `onSearchChange`) + `filters` slot + `actions` slot + `summary` slot + responsive 기본 배치.
- **필터 UI 미고정** — status/serviceKey/category/date 는 화면이 slot 으로 구성. toolbar 는 배치·검색 계약만 표준화.

## 5. 기존 DataTable/Pagination breaking change 여부

- **없음(0).** `DataTable.tsx`/`Pagination.tsx`/`SearchBar.tsx`/`types.ts` **미수정**. list/index.ts 는 export 추가만(기존 export·시그니처 무변경). 표준 계층은 전부 신규 파일.

## 6. 사용 예시 (후속 /operator/stores 적용 예상 구조)

```tsx
import {
  useStandardListQuery, StandardListToolbar, DataTable, Pagination,
  type StandardListQueryState,
} from '@o4o/operator-ux-core';

const { items, pagination, query, loading, setPage, setSearch, setSort, setFilter } =
  useStandardListQuery<StoreRow>({
    defaultLimit: 20,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
    defaultFilters: { serviceKey: 'neture' },
    fetcher: (q: StandardListQueryState) =>
      operatorStoresApi.list({
        page: q.page, limit: q.limit, search: q.search,
        sortBy: q.sortBy, sortOrder: q.sortOrder,
        serviceKey: q.filters.serviceKey as string,
      }),
    // 응답이 { data, pagination } 표준 근접 → normalize 생략(자동 흡수)
  });

return (
  <>
    <StandardListToolbar
      searchValue={query.search}
      onSearchChange={setSearch}
      filters={<StatusSelect value={query.filters.status} onChange={(v) => setFilter('status', v)} />}
      summary={`총 ${pagination.total}건`}
    />
    <DataTable columns={columns} data={items} rowKey="id" loading={loading}
      /* 서버 정렬 배선: 컬럼 헤더 → setSort(key, order) */ />
    <Pagination page={pagination.page} totalPages={pagination.totalPages}
      total={pagination.total} onPageChange={setPage} />
  </>
);
```
원칙: DataTable/Pagination 재사용 · 검색/필터/정렬/limit 변경 시 page=1 reset(자동) · URL query sync(자동) · 서버 페이지네이션/정렬/필터 결합.

## 7. 검증

- **변경 범위**: operator-ux-core list/standard 신규 4 + list/index.ts export + CHECK. (다른 세션 WIP 미포함 확인.)
- **pnpm-lock.yaml**: 변경 없음(peerDependency 기존 — package.json 무변경).
- **operator-ux-core isolated `tsc --noEmit`: PASS (exit 0)** — tsconfig.json 존재, 신규 파일 포함 검사.
- **breaking change**: DataTable/Pagination 파일 미수정(git diff 0) → 회귀 0.
- web 앱 전체 빌드: baseline WIP 충돌 가능성으로 미실행(WO 허용). 변경 패키지 중심 isolated typecheck 로 대체.
- **다른 세션 WIP 보존**: layout/sidebar/GP menu 등 미접촉.

## 8. 제외 / 후속

- 제외: `/operator/stores` 실제 전환·다화면 대량 적용·backend·DB·새 DataTable·Pagination API 변경 — 미수행.
- **후속: `WO-O4O-OPERATOR-STORES-STANDARD-LIST-ADOPTION-V1`**(4앱 공통 OperatorStoresList 를 표준 계층으로 전환, 첫 레퍼런스).

---

*Date: 2026-06-17 · PASS · operator-ux-core 에 useStandardListQuery + normalizePaginatedResponse + StandardListToolbar + 표준 타입 additive. 기존 DataTable/Pagination 재사용·breaking change 0. URL sync + page=1 reset + 응답 6종 흡수. isolated tsc 0. /operator/stores 적용은 후속 WO.*
