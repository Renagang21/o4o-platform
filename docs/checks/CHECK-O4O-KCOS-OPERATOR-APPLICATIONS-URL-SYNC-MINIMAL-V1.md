# CHECK-O4O-KCOS-OPERATOR-APPLICATIONS-URL-SYNC-MINIMAL-V1

> **작업명:** WO-O4O-KCOS-OPERATOR-APPLICATIONS-URL-SYNC-MINIMAL-V1
> **유형:** KCos `/operator/applications` statusFilter URL sync 최소 개선. frontend only, backend/DB/package/lock 무변경.
> **결과: PASS — KCos `ApplicationsPage`(array-only + client filter)에 statusFilter ↔ URL query(`applications_status`) 동기화 + 새로고침 복원만 추가. 기존 fetch(전체 1회)·client filter·카드·DataTable·drawer·stats 무변경. STANDARD-LIST full adoption 비대상(이유 §1). web-k-cosmetics tsc 0.**
> 선행: APPLICATIONS-ADOPTION(280d757ab, GP) — 2026-06-17

---

## 1. full adoption 비대상 이유

- GP `/operator/applications`(280d757ab)는 `{applications,pagination}` 서버 페이지네이션 → 표준 adoption 완료.
- **KCos 는 다른 backend**: `GET /cosmetics/stores/admin/applications` → **array-only**(`limit:100` 전체) 반환 + **client filter**(`applications.filter(status)`). 서버 pagination/search/sort **부재**.
- ∴ `useStandardListQuery`/`normalizePaginatedResponse`/DataTable manualSort/Pagination 의 표준 골격이 구조적으로 비대상. **V1=URL sync 최소 개선**(WO 결정).

## 2. 사전 조사 결과

| 항목 | 발견 |
|---|---|
| route/component | `/operator/applications` → `web-k-cosmetics/.../operator/ApplicationsPage.tsx`(자체 화면) |
| API | `api.get('/cosmetics/stores/admin/applications', {params:{limit:100}})` → array |
| 응답 shape | `{ data: Application[] }` (array, pagination 없음) |
| client filter | `statusFilter`(all/SUBMITTED/APPROVED/REJECTED) — 버튼 + `.filter` |
| pagination | **없음** | search/sort | **없음** |
| 승인/반려/상세 | 상세 = BaseDetailDrawer(조회 전용, actions=[]) — 승인/반려 로직 본 화면에 없음 |
| 빈 결과 | DataTable emptyMessage "신청이 없습니다" |

## 3. 변경 파일 목록 (1 + CHECK)

| 파일 | 변경 |
|------|------|
| `web-k-cosmetics/.../operator/ApplicationsPage.tsx` | useSearchParams + statusFilter URL 복원(init) + URL sync effect(default 'all' 생략) |

> fetch/필터 로직/카드/DataTable/drawer/stats **무변경**. backend/DB/package/lock 무변경.

## 4. URL query mapping

| 상태 | URL query | 비고 |
|---|---|---|
| statusFilter | `applications_status` | 'all'(기본) → param 생략, SUBMITTED/APPROVED/REJECTED → 설정 |

- 단일 route(서비스 도메인 분리) → GP `applications_f_*`(filter prefix) 와 실제 충돌 없음. 단순 `applications_status` 사용.

## 5. 새로고침 복원 결과 (정적)

- 초기값 `searchParams.get('applications_status') || 'all'` → URL→state 복원. 필터 변경 시 URL 반영(replace). 기본 'all' 은 param 생략.
- 필터 변경 시 목록 재계산: 기존 `filteredApplications = applications.filter(...)` 그대로(client). fetch 재호출 없음(전체 1회 유지).

## 6. 승인/반려/상세 동선 무회귀

- 상세 drawer(row click → 조회 필드) **무변경**. 본 화면에 승인/반려 액션 없음(drawer actions=[]) → 비즈니스 로직 미접촉.

## 7. 검증

- **web-k-cosmetics 전체 tsc EXIT 0** (ApplicationsPage 에러 0).
- **backend/package/lock 변경 없음**: staged diff 에 apps/api-server·package.json·pnpm-lock.yaml 없음.
- **DataTable 전환/Pagination/search/server sort 도입 0**(WO 금지선 준수). 카드·필터·drawer UI 무변경.
- 다른 세션 WIP 미접촉.
- **browser smoke 미수행** — 환경상 Playwright 브라우저 launch 실패(프로필 사용 중) + 배포 반영 확인 필요. 배포 후 권장: KCos `/operator/applications` 상태 버튼 변경→`applications_status` URL 반영 / 새로고침 복원 / 'all' 시 param 생략 / drawer·stats 무회귀.

## 8. 후속 backend pagination 후보

- **(보류 분리) `WO-O4O-KCOS-APPLICATIONS-LIST-BACKEND-PAGINATION-V1`** — 데이터 증가 시 `/cosmetics/stores/admin/applications` 에 page/limit/status/search/sort 추가 → GP 처럼 `useStandardListQuery` full adoption. 현재는 소량/전체조회라 불요.

---

*Date: 2026-06-17 · PASS · KCos /operator/applications(array-only+client filter) = STANDARD-LIST full adoption 비대상. V1=statusFilter URL sync(applications_status) + 새로고침 복원만. fetch/필터/카드/drawer/stats 무변경. backend/package/lock 무변경. web-k-cosmetics tsc 0.*
