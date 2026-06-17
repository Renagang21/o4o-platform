# CHECK-O4O-OPERATOR-APPLICATIONS-STANDARD-LIST-ADOPTION-V1

> **작업명:** WO-O4O-OPERATOR-APPLICATIONS-STANDARD-LIST-ADOPTION-V1
> **유형:** `/operator/applications`(GlycoPharm) 표준 리스트 상태 계층 전환. frontend only, backend/DB/package/lock 무변경.
> **결과: PASS — GP `ApplicationsPage` 를 `useStandardListQuery` + `normalize({applications,pagination})` + URL sync(`applications_*`) + 필터 page=1 reset 로 전환. 기존 DataTable/필터패널/Pagination JSX·승인동선(상세 link) 유지. 검색·정렬은 backend 미지원 → 보류. KCos `/operator/applications`는 array-only/client-filter(다른 backend) → 본 WO 비대상(분리). web-glycopharm tsc 0.**
> 선행: STORES(203353832)·MEMBERS(fc0465b4a)·EXPOSURE(3c8f62b9b)·ONSORT(ed962cc59) — 2026-06-17

---

## 1. 적용 route/component

- **GlycoPharm `/operator/applications`** → `services/web-glycopharm/src/pages/operator/ApplicationsPage.tsx`(서비스별 자체 화면, 공통 컴포넌트 아님).
- API: `glycopharmApi.getAdminApplications({status, serviceType, organizationType, page, limit})` → `{ applications, pagination{page,limit,total,totalPages} }`.

## 2. 사전 조사 결과 (핵심 — 서비스별 분기)

| | GlycoPharm `/operator/applications` | K-Cosmetics `/operator/applications` |
|---|---|---|
| 응답 | **`{applications, pagination}`** (서버 페이지네이션) | **array-only** (`/cosmetics/stores/admin/applications`) |
| 필터 | status/serviceType/organizationType (**서버**) | statusFilter (**client** `.filter`) |
| 검색 | 없음(backend 미지원) | 없음 |
| 정렬 | 없음(sortable 컬럼 0, backend sortBy 미지원) | 없음 |
| 표준 적합 | **적합(본 WO 대상)** | **비대상**(array+client filter — recruitment-exposure 류) |

> WO 의 기술 전제(`{applications,pagination}` + normalizePaginatedResponse)는 **GP**. KCos 는 backend·구조가 달라 별도 처리(분리) — §12.

## 3. 변경 파일 목록 (1 + CHECK)

| 파일 | 변경 |
|------|------|
| `web-glycopharm/.../operator/ApplicationsPage.tsx` | local state(applications/loading/error/filters/page/total) → `useStandardListQuery` + normalize + URL sync. 필터 select→setFilter, 초기화→resetFilters, pagination→query.pagination/setPage, error→useStandardListQuery error 매핑(403/401 보존) |

> KCos ApplicationsPage **무변경**. backend·DB·package·lock·승인 동선·DataTable/필터패널 UI 무변경.

## 4. query parameter 매핑표

| StandardListQueryState | getAdminApplications | 비고 |
|---|---|---|
| `page` | page | |
| `limit` | limit(20) | |
| `filters.status` | status | '' → undefined |
| `filters.serviceType` | serviceType | |
| `filters.organizationType` | organizationType | |
| `search` | — | backend 미지원 → 미매핑 |
| `sortBy/sortOrder` | — | backend 미지원 → 미매핑 |

## 5. response normalize 방식

- **명시 normalize**: `{ applications, pagination }` → `{ data: applications, pagination{...,hasNextPage,hasPreviousPage} }`. (domain key `applications` 라 기본 `normalizePaginatedResponse` 도 자동 흡수 가능하나 명료성 위해 명시.) applications/pagination 누락 시 빈 배열 + 안전 pagination.

## 6. StandardListToolbar 적용 여부

- **미적용(N/A).** 이 화면은 **검색 없음** — StandardListToolbar 의 주기능(검색)이 부재. 기존 필터 패널(상태/서비스/조직 3-select + 초기화)을 유지하고 `useStandardListQuery.filters`(setFilter/resetFilters)에 배선. copy/라벨 무변경.

## 7. DataTable manualSort/onSort 적용 여부 / 서버 정렬 가능 컬럼

- **미적용(보류).** 컬럼에 `sortable` 없음 + backend `getAdminApplications` 가 sortBy/sortOrder **미지원**(client 파라미터에도 없음) → WO §10 준수(정렬 연결 보류). 서버 정렬 가능 컬럼: **없음**.

## 8. page=1 reset / URL query sync

- page=1 reset: 필터(status/serviceType/organizationType) 변경 시 `setFilter`가 자동 page=1 reset(useStandardListQuery). 초기화도 page=1.
- URL sync: `?applications_page=&applications_f_status=&applications_f_serviceType=&applications_f_organizationType=`(useSearchParams, replace). 초기값 URL→state 복원(새로고침). default(page1/필터없음) param 생략.

## 9. Pagination 연결 방식

- 기존 custom prev/next JSX 유지, `query.pagination`(page/totalPages) + `setPage` 배선. 페이지 이동 시 필터 유지. `totalPages>1` 조건 유지.

## 10. 승인/반려/상세 액션 무회귀

- 본 화면은 목록+상세 link(`/operator/applications/:id`)만 — 승인/반려는 상세 페이지(ApplicationDetailPage) 책임. **목록 화면의 상세 link·동선 무변경.** 승인/반려 로직 미접촉.

## 11. 검증

- **web-glycopharm 전체 tsc EXIT 0** (ApplicationsPage 에러 0). operator-ux-core(useStandardListQuery/normalize) 기존 빌드 사용.
- **backend/package/lock 변경 없음**: staged diff 에 apps/api-server·package.json·pnpm-lock.yaml 없음. @o4o/ui dist 미변경.
- **DataTable/Pagination breaking 0**, **KCos applications 무변경**, **다른 세션 WIP(platform roles) 미접촉**.
- **browser smoke 미수행** — 배포 후 권장: GP `/operator/applications` 필터 변경→URL(applications_f_*)·page=1 / 페이지 이동→필터 유지 / 새로고침 복원 / 빈 결과 crash 0 / 상세 link 정상.

## 12. 후속 확산 후보

- **(분리) KCos `/operator/applications`** — array-only/client-filter(다른 backend `/cosmetics/stores/admin/applications`). 최소 개선(statusFilter URL sync, recruitment-exposure 류) 또는 backend pagination 선행 후 표준 전환. 별도 WO.
- **다음**: `/admin/product-approval`(array-only, backend 선행) — applications 이후 backend-aware WO 로 분리(WO 금지선대로 본 WO 비포함).

---

*Date: 2026-06-17 · PASS · GP /operator/applications → useStandardListQuery + normalize({applications,pagination}) + URL sync(applications_*) + 필터 page=1 reset. 기존 DataTable/필터패널/Pagination/상세 link 유지. 검색·정렬 backend 미지원 보류. KCos applications(array-only)는 분리. backend/package/lock 무변경. web-glycopharm tsc 0.*
