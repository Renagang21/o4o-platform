# CHECK-O4O-OPERATOR-STORES-STANDARD-LIST-ADOPTION-V1

> **작업명:** WO-O4O-OPERATOR-STORES-STANDARD-LIST-ADOPTION-V1
> **유형:** 4앱 공통 `/operator/stores`(`OperatorStoresList`)를 STANDARD-LIST-CORE 상태 계층으로 전환(frontend only). 새 테이블/backend/DB/package 무변경.
> **결과: PASS — 공통 `OperatorStoresList` 가 `useStandardListQuery`(URL sync + page=1 reset) + `normalize`(stores 응답 흡수) + `StandardListToolbar` 사용으로 전환. 기존 `DataTable`/`Pagination`/`StoresApi` 재사용, breaking change 0. 단일 컴포넌트 변경으로 4앱 동시 적용. operator-core-ui isolated tsc: stores 파일 에러 0.**
> 선행: STANDARD-LIST-CORE(62dc177f5) · 감사 IR(3e5e93a96) — 2026-06-17

---

## 1. 적용 대상 route/component

- 공통 컴포넌트: `packages/operator-core-ui/src/modules/stores/OperatorStoresList.tsx`
- **4앱 `/operator/stores` 모두 이 컴포넌트 사용** → 단일 변경 4앱 전파:
  - neture `pages/operator/StoreManagementPage.tsx`
  - glycopharm `pages/operator/StoresPage.tsx`
  - kpa-society `pages/operator/OperatorStoresPage.tsx`
  - k-cosmetics `pages/operator/StoresPage.tsx`
- 각 앱 wrapper(StoresApi adapter + config 주입)는 **무변경** — 공통 컴포넌트 내부만 전환.

## 2. 변경 파일 목록 (1 + CHECK)

| 파일 | 변경 |
|------|------|
| `packages/operator-core-ui/src/modules/stores/OperatorStoresList.tsx` | local state(searchTerm/currentPage)+useStoresQuery → `useStandardListQuery` + `normalize` + `StandardListToolbar`. SCHEME_TOKENS(검색 인풋 전용) 제거. |

- `useStoresQuery.ts` **미삭제·미변경**(public export 유지 — 다른 잠재 소비처 보존). backend·DB·package.json·lock·다른 화면 무변경. 다른 세션 WIP(DashboardLayout 2개 등) 미접촉.

## 3. useStandardListQuery 적용 방식

- 상태: page/limit/search/sortBy/sortOrder(+filters 미사용) 단일 소스. `syncUrl: true`, `urlKeyPrefix: 'stores'`.
- 기본값: `defaultLimit=pageSize`(기존 20), `defaultSortBy=defaultSort.field`(createdAt), `defaultSortOrder=defaultSort.order.toLowerCase()`(desc).
- **stats**: useStandardListQuery 는 items/pagination 만 반환 → 동일 응답의 `stats` 는 fetcher side-channel(`setStats(res.stats)`)로 보관(이중 fetch 없음). stat 카드 유지.

## 4. query parameter 매핑표

| StandardListQueryState | StoresApi.listStores 파라미터 | 비고 |
|---|---|---|
| `page` | `page` | |
| `limit` | `limit` | |
| `search` | `search`(있을 때만) | 빈 값 미전달 |
| `sortBy` | `sortBy` | |
| `sortOrder`('asc'/'desc') | `sortOrder`('ASC'/'DESC') | `toUpperCase()` 어댑터(기존 API 대문자 계약) |
| `filters` | — | stores 화면 status/serviceKey 필터 부재 → 미매핑(serviceKey 는 각 앱 adapter 의 endpoint 에 내재) |

> backend 미지원 파라미터(dateFrom/dateTo/status) **추가 안 함**(WO 준수).

## 5. normalizePaginatedResponse 적용 여부

- **명시 normalize 사용**: 응답 `{ success, stores, pagination }` → `{ data: stores, pagination{...,hasNextPage,hasPreviousPage} }`. (domain key `stores` 라 기본 `normalizePaginatedResponse` 도 자동 흡수 가능하나, 명료성·안전을 위해 명시 매핑.) `stores`/`pagination` 누락 시 빈 배열 + 안전 pagination(crash 0).

## 6. StandardListToolbar 적용 여부

- 적용. `searchValue=query.search` · `onSearchChange=setSearch`(page=1 reset 자동) · `searchPlaceholder` 기존 유지 · `summary='총 n건'`. 기존 bespoke 검색 input+버튼(수동 트리거)을 표준 SearchBar(디바운스 300ms+Enter)로 대체. **헤더 새로고침 버튼은 기존 유지**(refetch 와이어링).
- 정책 메모: 기존 "검색" 버튼은 표준 디바운스 검색으로 흡수되어 제거(표준 채택에 따른 의도된 UX). 그 외 copy/라벨 무변경.

## 7. 정렬 처리 방식 (deferral 명시)

- query state 의 `sortBy/sortOrder`(기본 createdAt desc)는 **서버로 전달 + URL sync + page=1 reset(정렬 변경 시)** 됨.
- **인터랙티브 컬럼-클릭 → 서버 정렬은 본 WO 미적용(deferred).** 사유: 공통 `DataTable` 이 **onSort 콜백 미노출**(현재 sortAccessor 기반 페이지 내 클라이언트 정렬만). 헤더 클릭을 서버 정렬로 바꾸려면 28+ 소비처가 쓰는 공통 DataTable 에 `onSort` 추가 필요 → 본 WO 의 "DataTable breaking 금지 / 단일 화면" 범위 밖.
- 결과: stores 컬럼의 기존 `sortable` 표시·페이지 내 정렬은 회귀 없이 유지. 전체기준 서버 정렬(헤더 클릭)은 후속 `DataTable onSort` 확장 WO 로 분리.

## 8. Pagination 동작

- 기존 `Pagination` 재사용, `onPageChange=setPage`(검색/정렬 유지) · limit 변경 시 page=1 reset(setLimit, 현재 UI 에 limit 셀렉터 없음 — 표준 setter 만 노출) · total/totalPages 표시 · `totalPages>1` 조건 유지.

## 9. URL query sync / page=1 reset 확인 (정적)

- URL: `?stores_page=&stores_limit=&stores_search=&stores_sortBy=&stores_sortOrder=`(react-router useSearchParams, replace). 초기값 URL→state(새로고침/딥링크 복원), 변경 시 state→URL.
- page=1 reset: 검색/정렬/limit/필터 변경 시 자동(useStandardListQuery), 단순 페이지 이동(setPage)은 유지.

## 10. 4앱 route 영향

- 단일 공통 컴포넌트 변경 → 4앱 `/operator/stores` 동일 전환. 각 앱 adapter/route/wrapper 무변경 → 회귀 위험 낮음.

## 11. legacy `/operator/pharmacies` 미접촉

- pharmacies 관련 파일 **변경 0**(`git diff` 확인). 표준화 대상 아님(glycopharm legacy, backend stub). 기능 개선/신규 연결/표준 적용 **미수행**.

## 12. 검증

- **operator-core-ui isolated `tsc --noEmit`**: stores 파일 **에러 0**. (유일 에러 `error-handling/useApiErrorHandler.ts` `import.meta.env` 는 origin/main 기존 vite 타입 artifact — 본 변경 무관.)
- **backend/package/lock 변경 없음**: staged diff 에 apps/api-server·package.json·pnpm-lock.yaml 없음.
- **DataTable/Pagination breaking change 0**: 해당 파일 미수정.
- **다른 세션 WIP 보존**: DashboardLayout 2개 등 미접촉(미staging).
- **browser smoke 미수행** — 배포 후 권장: `/operator/stores` 검색→URL반영·page=1 / 정렬변경→URL·page=1 / 페이지이동→검색·정렬 유지 / 새로고침→복원 / 빈 결과 crash 0 / 4앱 render.

## 13. 후속 확산 후보

- 내부 감사 IR 우선순위: `/operator/members` → `/operator/recruitment-exposure` → `/operator/applications`(응답 어댑터) → `/admin/product-approval`(backend 선행).
- 별도: **`WO-...-DATATABLE-ONSORT-V1`**(공통 DataTable 에 onSort 추가 → 서버 정렬 인터랙티브화, stores 부터 적용).

---

*Date: 2026-06-17 · PASS · OperatorStoresList(4앱 공통) → useStandardListQuery+normalize+StandardListToolbar. URL sync+page=1 reset, 기존 DataTable/Pagination/StoresApi 재사용, breaking 0. 서버 정렬 default+URL 전달, 인터랙티브 서버정렬은 DataTable onSort 부재로 후속. backend/DB/package/lock·pharmacies 무변경. isolated tsc 0(stores).*
