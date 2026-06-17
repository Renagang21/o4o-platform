# CHECK-O4O-ADMIN-PRODUCT-APPROVAL-STANDARD-LIST-ADOPTION-V1

> **WO:** WO-O4O-ADMIN-PRODUCT-APPROVAL-STANDARD-LIST-ADOPTION-V1
> **Date:** 2026-06-17
> **선행:** IR-O4O-ADMIN-PRODUCT-APPROVAL-STANDARD-LIST-BACKEND-AUDIT-V1 · WO-O4O-ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION-V1 · WO-O4O-STANDARD-LIST-CORE-V1 · WO-O4O-DATATABLE-ONSORT-CONTROLLED-SORT-V1
> **성격:** frontend 표준 리스트 adoption. backend/DB/package/lock/Dockerfile/CI 변경 0.

---

## 1. 적용 route / component

| 항목 | 값 |
|------|----|
| Route | `/admin/product-approvals` |
| Component | [services/web-neture/src/pages/admin/AdminProductApprovalPage.tsx](services/web-neture/src/pages/admin/AdminProductApprovalPage.tsx) |
| 사용 backend | `GET /api/v1/neture/admin/products` (목록) · `GET /api/v1/neture/admin/products/summary` (KPI) |
| 표준 인프라 | `@o4o/operator-ux-core` — `useStandardListQuery` · `DataTable` · `Pagination` · `StandardListToolbar` |

---

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/admin/AdminProductApprovalPage.tsx` | 자체 `<table>` + client 전량 필터링 → 표준 리스트 전환 |
| `services/web-neture/src/lib/api/index.ts` | `AdminProductSummary`/`AdminProductListParams`/`AdminProductPagination` 타입 re-export 추가(additive) |
| `docs/checks/CHECK-O4O-ADMIN-PRODUCT-APPROVAL-STANDARD-LIST-ADOPTION-V1.md` | 본 문서 |

> `admin.ts` 의 `getProductsList()`/`getSummary()`/타입은 **선행 backend WO(커밋 3ff222bfe)** 에서 이미 추가됨 — 이번 WO 는 frontend 소비만. backend 호출 계약 변경 없음.

---

## 3. 기존 구조 vs 변경 구조

| 항목 | 기존 | 변경 |
|------|------|------|
| 목록 조회 | `getProducts()` 전량 1회 | `getProductsList(query)` server-driven |
| 검색 | client `.filter()` (상품명·공급자) | server `search`(상품명=master.name). StandardListToolbar 검색창 |
| status 필터 | client 버튼 필터 | server `approvalStatus` 필터 (버튼 UI 유지, toolbar filter slot) |
| 정렬 | 없음 | server 정렬 (DataTable manualSort + onSort) |
| 페이지네이션 | 없음(전량 렌더) | 표준 `Pagination` (server page/limit) |
| KPI 4카드 | client 전량 집계 | `getSummary()` 전체 기준 |
| 테이블 | 자체 `<table>` | `DataTable` |
| URL sync | 없음 | `productApprovals_*` |
| 승인/반려/상세 모달 | 유지 | **무회귀 유지** (성공 후 list+summary refetch) |

---

## 4. getProductsList query 매핑

| 표준 query | API param | 비고 |
|------------|-----------|------|
| `page` | `page` | |
| `limit` | `limit` | default 20 |
| `search` | `search` | 빈 문자열 → undefined. **상품명(master.name)** 기준 |
| `sortBy` | `sortBy` | default `createdAt` |
| `sortOrder` | `sortOrder` | default `desc` |
| `filters.approvalStatus` | `approvalStatus` | '' → undefined (전체) |

미사용: `distributionType`/`isActive`/`supplierId` 필터 — 기존 화면에 UI 없어 신규 추가 안 함(Drift 방지).

---

## 5. getSummary KPI 연결

- 화면 진입 시 `loadSummary()` 1회 호출 → `{ total, pending, approved, rejected }`.
- 승인/반려 성공 후 `refetch()`(목록) + `loadSummary()`(KPI) 모두 호출.
- KPI 는 **전체 기준**(현재 페이지 기준 아님). summary 는 별도 state 라 목록 loading/error 와 분리 — summary 실패가 목록을 막지 않음.

---

## 6. DataTable 컬럼 / sortable

| 컬럼 | key | sortable | 비고 |
|------|-----|:--------:|------|
| 상품명 | `marketingName` | ✗ | `marketingName || masterName || '-'` + id prefix |
| 공급자 | `supplierName` | ✗ | enrichment 값(backend sort 미지원) |
| 카테고리 | `category` | ✗ | `category || '-'` (backend sort 미지원) |
| 유통정책 | `distributionType` | ✅ | whitelist |
| 상태 | `approvalStatus` | ✅ | whitelist |
| 등록일 | `createdAt` | ✅ | whitelist (기본 정렬) |
| 관리 | `_actions` | — | system. PENDING 행에 승인/반려 (stopPropagation) |

- sortable 은 backend whitelist(`createdAt`/`approvalStatus`/`distributionType`/`priceGeneral`/`isActive`)에 한정. 화면에 노출된 컬럼 중 whitelist 교집합인 3개만 sortable 노출.
- `priceGeneral`/`isActive` 는 기존 화면에 컬럼이 없어 미노출(정렬도 미노출). `supplierName`/`category`/`marketingName` 은 backend V1 sort 미지원 → sortable 제외.
- DataTable: `manualSort` + `sortBy`/`sortOrder` controlled + `onSort={setSort}` (page=1 reset).

---

## 7. StandardListToolbar 적용

- `searchValue={query.search}`, `onSearchChange={setSearch}`, placeholder **"상품명으로 검색..."**.
- **공급자명 검색은 backend V1 미지원** → placeholder 를 "상품명·공급자"(기존) 에서 "상품명으로 검색"으로 조정. (CHECK 명시)
- `filters` slot: status 버튼 4종(전체/승인대기/승인됨/반려됨) — server filter 로 동작.
- `summary` slot: 총 n건(pagination.total).

---

## 8. URL query sync

`urlKeyPrefix='productApprovals'`, `syncUrl=true`:

| state | URL param |
|-------|-----------|
| page | `productApprovals_page` |
| limit | `productApprovals_limit` |
| search | `productApprovals_search` |
| sortBy | `productApprovals_sortBy` |
| sortOrder | `productApprovals_sortOrder` |
| approvalStatus | `productApprovals_f_approvalStatus` |

- 새로고침 시 `useStandardListQuery` 가 URL 에서 초기 state 복원.

---

## 9. page=1 reset

`useStandardListQuery` 계약대로:
- 검색 변경(`setSearch`) → page=1 ✅
- status 필터 변경(`setFilter`) → page=1 ✅
- 정렬 변경(`setSort`) → page=1 ✅
- limit 변경(`setLimit`) → page=1 ✅ (UI 미노출이나 훅 계약 보장)
- 페이지 이동(`setPage`) → 검색/필터/정렬 유지 ✅

---

## 10. 승인 / 반려 / 상세 모달 무회귀

| 흐름 | 상태 |
|------|------|
| 행 클릭 → 상세 모달 (`onRowClick`) | 유지 |
| 상세 모달 B2C/B2B 설명(ContentPreview) | 유지 |
| 승인 확인 모달 → `approveProduct` | 유지, 성공 후 list+summary refetch |
| 반려 모달(+사유) → `rejectProduct` | 유지, 성공 후 list+summary refetch |
| approve/reject/batch endpoint·SSOT·action-log·permit gate | **무변경** |

행 액션 버튼은 `onClick` `stopPropagation` 으로 행 클릭(상세)과 분리.

---

## 11. field contract 사용

- 상품명: `marketingName || masterName || '-'`.
- 카테고리: `category || '-'`.
- backend 선행 WO 에서 `marketingName`/`category` 가 응답에 포함되므로 표시 정상.
- frontend client search 미수행(server search=master.name 단일). client 재필터 없음.

---

## 12. Empty / Loading / Error

- `DataTable loading={loading}` — 로딩 crash 없음.
- emptyMessage: 검색/필터 활성 시 "조건에 맞는 상품이 없습니다." / 그 외 "등록된 상품이 없습니다." 구분.
- error(주로 403): 별도 오류 박스 + 다시 시도(`refetch`). `getProductsList` 는 비-403 오류를 내부 흡수(빈 목록) → 화면 안정.
- summary 실패는 목록과 분리되어 목록 표시를 막지 않음.

---

## 13. Typecheck

| 대상 | 명령 | 결과 |
|------|------|------|
| web-neture | `npx tsc --noEmit` | **PASS (exit 0)** |

---

## 14. 변경 없음 확인 (금지선)

| 항목 | 상태 |
|------|------|
| backend (route/controller/service/entity) | 변경 없음 |
| DB / schema / migration | 변경 없음 |
| `package.json` / `pnpm-lock.yaml` | 변경 없음 |
| Dockerfile / CI | 변경 없음 |
| 승인/반려/배치 endpoint | 변경 없음 |
| 신규 DataTable/Pagination 생성 | 안 함 (기존 `@o4o/operator-ux-core` 재사용) |
| 다른 admin 화면 | 무수정 |
| `tailwind.config.js` 등 다른 세션/무관 unstaged 파일 | **미접촉** — path-specific commit, 다른 세션 staged 파일 미포함 |

---

## 15. Smoke

- ⏳ **보류** — browser smoke 환경 블로커(Chrome 프로필 락) 미해제. 배포 후 별도 진행:
  - `/admin/product-approvals` 진입(admin 계정) → 목록 server pagination 동작
  - 검색/status 필터/정렬 → URL query 반영 + page=1
  - 페이지 이동 → 조건 유지, 새로고침 → state 복원
  - KPI(getSummary) 표시 + 승인/반려 후 KPI/목록 갱신
  - 빈 결과 crash 없음, console/4xx-5xx 수집

---

## 16. 결론

`/admin/product-approvals` 가 표준 리스트(server-driven pagination/search/sort + URL sync + DataTable + Pagination + StandardListToolbar)로 전환됐고 KPI 는 `getSummary()` 전체 기준으로 정합화됐다. 승인/반려/상세 모달은 무회귀. backend/package/lock/schema 무변경, 다른 세션 staged 파일 미접촉.

표준 리스트 Phase 1 주요 유형(operator stores / members / recruitment-exposure / GP·KCos applications / **admin product approvals**)이 모두 사례화됐다. **최종 종료 조건은 browser smoke 재시도**(환경 해제 후).
