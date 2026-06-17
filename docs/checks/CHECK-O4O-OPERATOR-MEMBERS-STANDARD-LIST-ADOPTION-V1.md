# CHECK-O4O-OPERATOR-MEMBERS-STANDARD-LIST-ADOPTION-V1

> **작업명:** WO-O4O-OPERATOR-MEMBERS-STANDARD-LIST-ADOPTION-V1 (Targeted scope — 사용자 승인)
> **유형:** `/operator/members` 공통 콘솔에 서버 정렬 + URL sync + page=1 reset 추가(opt-in). frontend only, backend/DB/package/lock 무변경.
> **결과: PASS — `OperatorMembersConsolePage`에 `serverSort`/`syncUrl` **opt-in prop** 추가. operator 3앱(neture/glyco/kcos)만 opt-in → DataTable manualSort(email/createdAt 서버 정렬) + URL query sync(`members_*`) + 검색/탭/정렬 변경 시 page=1 reset. **admin `/admin/members`(동일 콘솔 공유)는 prop 미전달 → 무변경.** MemberListLayout/탭/drawer/batch/stats 유지. operator-core-ui·web-neture tsc 0.**
> 선행: STANDARD-LIST-CORE(62dc177f5) · STORES-ADOPTION(203353832) · DATATABLE-ONSORT(ed962cc59) — 2026-06-17

---

## 1. 적용 route/component

- 공통 콘솔: `packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx` (Shared — operator+admin 공유).
- **opt-in 적용(operator만, serverSort+syncUrl 전달):**
  - neture `pages/operator/UsersManagementPage.tsx`
  - glycopharm `pages/operator/UsersPage.tsx`
  - k-cosmetics `pages/operator/UsersPage.tsx`
- **무변경(prop 미전달):** `/admin/members`(Glyco/KCos AdminMembersPage, 동일 콘솔), KPA `MemberManagementPage`(자체 KpaMember 페이지, outlier).

## 2. 기존 구현 상태 요약 (조사)

- 콘솔 = `MemberListLayout`(검색+탭 내장) + role탭(client filter)+status탭(server filter) 하이브리드 + stats + Drawer + batch 승인/거부 + edit/password/delete. stores보다 복잡 → **useStandardListQuery 통째 전환은 회귀 위험 큼**(사용자: Targeted 선택).
- 정렬: 컬럼 `sortable`+`sortAccessor` → **client sort(페이지 내)**, client 가 sort param 미전송.
- backend `MembershipConsoleController.validSortFields = {createdAt, updatedAt, email, firstName, lastName}`, 미지원 키 createdAt fallback. **name 은 단일 키 없음**(firstName/lastName 분리).

## 3. 변경 파일 목록 (5 + CHECK)

| 파일 | 변경 |
|------|------|
| `operator-core-ui/.../members/types.ts` | `MembersConsoleListParams`+sortBy/sortOrder, `OperatorMembersConsolePageProps`+serverSort/syncUrl |
| `operator-core-ui/.../members/OperatorMembersConsolePage.tsx` | page state화 + sort state + URL sync(gated) + manualSort 연결 + page=1 reset |
| neture/glyco/kcos `operator/UsersManagementPage|UsersPage.tsx` | `serverSort syncUrl` prop + client.list 의 sortBy/sortOrder forward |

## 4. query parameter 매핑표

| 콘솔 상태 | client.list 파라미터 | 비고 |
|---|---|---|
| page | page | state화(URL 복원 대응) |
| limit | limit (20) | |
| searchQuery | search | MemberListLayout onSearch |
| activeTab→status | status | statusTab/pending(server filter), roleTab은 client filter(기존 유지) |
| sortBy(serverSort 시) | sortBy | 'createdAt'/'email' 등 |
| sortOrder(serverSort 시) | sortOrder('ASC'/'DESC') | 콘솔 'asc'/'desc' → `toUpperCase()` |

> backend 미지원 파라미터 미추가. serverSort=false면 sort 미전송(기존 동작).

## 5. response normalize 방식

- members `client.list` 응답은 이미 `{ users, pagination{page,limit,total,totalPages} }`(표준 근접) → **기존 파싱 유지**(별도 normalizePaginatedResponse 불요). 본 콘솔은 useStandardListQuery 미사용(탭이 fetch 소유 — Targeted) → normalize 미적용. (응답이 표준 근접이라 필요 없음.)

## 6. StandardListToolbar 적용 여부

- **미적용(의도).** members 검색/탭은 `MemberListLayout`(탭 UI 포함)에 결합 — StandardListToolbar 로 대체하면 탭 UI 회귀. Targeted scope 상 MemberListLayout 유지, 검색은 기존대로.

## 7. DataTable manualSort/onSort 적용 여부

- **serverSort=true 일 때만** DataTable 에 `manualSort + sortBy + sortOrder + onSort={handleSort}` 전달. 컬럼 클릭 → `handleSort`(setSortBy/Order + **page=1 reset**) → fetchUsers 서버 정렬 + URL 반영. 같은 컬럼 재클릭 asc↔desc(DataTable onSort 토글).
- **serverSort=false(admin)**: manualSort 미전달 → 기존 클라이언트 정렬 그대로.

## 8. 서버 정렬 가능 컬럼

- **email, createdAt**(backend validSortFields 포함). **name**: serverSort 시 `sortable:false`(단일 서버 키 없음 — WO §12 "미지원 컬럼 sortable 노출 금지"). client 모드(admin)에선 name 기존대로 sortable.

## 9. page=1 reset / URL query sync

- page=1 reset: 검색(onSearch)/탭(onTabChange)/정렬(handleSort) 변경 시 `setPage(1)`. limit 변경 UI 없음(고정 20).
- URL sync(syncUrl 시): `?members_tab=&members_search=&members_page=&members_sortBy=&members_sortOrder=`(useSearchParams, replace). 초기값 URL→state 복원(새로고침), default(all/createdAt/desc/page1)는 param 생략.
- page state화: `fetchUsers` 가 page state 조회(무인자), 페이지 버튼 `setPage`. 기존 `fetchUsers(pagination.page)` 호출부 전부 `fetchUsers()` 로 정합(refetch-current 동작 동일).

## 10. Pagination 연결

- 기존 custom prev/next JSX 유지(탭 all/pending 조건). onClick `setPage`, disabled `page<=1`/`page>=totalPages`, 표시 `{page}/{totalPages}`. 페이지 이동 시 검색/정렬 유지(state 보존).

## 11. 검증

- **isolated tsc**: operator-core-ui — members 파일 **에러 0** (유일 에러 `error-handling import.meta.env` = origin/main 기존). **web-neture 전체 tsc EXIT=0**(통합 검증). glyco/kcos 동일 최소 편집(parity).
- **backend/package/lock 변경 없음**: staged diff 에 apps/api-server·package.json·pnpm-lock.yaml 없음. @o4o/ui dist 미변경(manualSort 는 ed962cc59 에서 빌드됨).
- **DataTable/Pagination breaking change 0**, **admin `/admin/members` 무변경**(opt-in), **다른 세션 WIP(HubContentLibraryPage 등) 미접촉**.
- **browser smoke 미수행** — 배포 후 권장: `/operator/members`(neture/glyco/kcos) 검색→URL·page=1 / 컬럼(email/createdAt) 클릭→서버 정렬·URL·page=1·토글 / 탭 전환→page=1 / 페이지 이동 정렬·검색 유지 / 새로고침 복원 / drawer·batch·stats 무회귀 / admin members 무변경.

## 12. 후속 확산 후보

- `/operator/recruitment-exposure`(소형, 적용 용이) → `/operator/applications`(응답 `{applications,pagination}` normalize 어댑터) → `/admin/product-approval`(array-only, backend 선행).
- (선택) members 의 role 탭 client-filter → 서버 role 필터 전환(backend role 파라미터 확인 후) 별도 개선.

---

*Date: 2026-06-17 · PASS · OperatorMembersConsolePage serverSort/syncUrl opt-in(operator 3앱) — email/createdAt 서버 정렬(manualSort/onSort) + URL sync(members_*) + page=1 reset. MemberListLayout/탭/drawer/batch 유지, admin `/admin/members` 무변경. backend/package/lock 무변경. operator-core-ui·web-neture tsc 0.*
