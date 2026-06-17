# CHECK-O4O-OPERATOR-RECRUITMENT-EXPOSURE-STANDARD-LIST-ADOPTION-V1

> **작업명:** WO-O4O-OPERATOR-RECRUITMENT-EXPOSURE-STANDARD-LIST-ADOPTION-V1 (최소 개선 — 사용자 승인)
> **유형:** 카드 승인 큐에 exposureStatus 필터 + URL sync 추가. frontend only, backend/DB/package/lock 무변경.
> **결과: PASS — `RecruitmentExposureConsole`에 exposureStatus 필터(StandardListToolbar filter slot, opt-in) + 3앱 페이지에 필터 상태·URL sync(`recruitmentExposure_status`)·기본 'pending'·exposureStatus fetch 추가. 카드 UI·승인/반려 로직 무변경. DataTable/Pagination/검색/서버정렬 미적용(화면 성격상 N/A). operator-ux-core·web-kpa-society tsc 0.**
> 선행: STORES-ADOPTION(203353832) · MEMBERS-ADOPTION(fc0465b4a) · 감사 IR(3e5e93a96) — 2026-06-17

---

## 0. 판정 (적용 범위)

> recruitment-exposure 는 stores/members 와 달리 **DataTable 기반 관리 리스트가 아니라 카드형 승인 큐**다. backend(`getRecruitmentsForExposureReview`)는 **array 반환**(page/limit/search/sortBy 미지원). 따라서 STANDARD-LIST-CORE 의 full adoption 대상이 아니며, V1 에서는 **exposureStatus URL sync 와 기본 pending 필터만** 적용한다. **DataTable / Pagination / 서버 정렬 / 검색은 후속 backend 선행 WO 로 보류**한다.

## 1. 적용 route/component

- 3앱 `RecruitmentExposureApprovalPage`(KPA/GP/KCos, operator) → 공통 `RecruitmentExposureConsole`(operator-ux-core).
- proxy `GET /api/v1/{service}/operator/recruitment-exposure`(serviceKey 고정, `cosmetics:operator`/`kpa:operator`/`glycopharm:operator`).

## 2. 사전 조사 결과

- UI = 카드 승인 큐(DataTable 아님). 정렬/검색/페이지네이션 UI 없음.
- backend proxy GET 은 `exposureStatus`/`status` 쿼리 **이미 지원**(ExposureStatus enum 검증) → 필터는 **backend 무변경**으로 가능. page/limit/search/sortBy 는 **미지원**(array 반환).
- 현재 페이지: 쿼리 없이 전체 조회 → pending/approved/rejected **혼재 표시**(운영자가 '승인할 것' 식별 어려움).

## 3. 변경 파일 목록 (4 + CHECK)

| 파일 | 변경 |
|------|------|
| `operator-ux-core/.../RecruitmentExposureConsole.tsx` | `filterStatus`/`filterOptions`/`onFilterChange` prop(opt-in) + StandardListToolbar filter slot(상태 select) + `총 n건` summary. 카드/승인·반려 UI 무변경 |
| KPA/GP/KCos `operator/RecruitmentExposureApprovalPage.tsx` | filterStatus state(기본 'pending') + URL sync(`recruitmentExposure_status`) + fetch 에 `?exposureStatus=` 전달 + 필터 prop 연결 |

> 다른 세션 WIP(web-neture platform roles 이관 파일들) 미접촉.

## 4. query parameter 매핑표

| 상태 | proxy 쿼리 | 비고 |
|---|---|---|
| filterStatus('pending'/'approved'/'rejected') | `exposureStatus` | 'all' 이면 미전달(전체) |
| — | page/limit/search/sortBy | **미지원**(array backend) → 미적용 |

## 5. response normalize 방식

- 응답 `{ success, data: RecruitmentExposureItem[] }` — 단순 배열. pagination 없음 → `normalizePaginatedResponse` 불요(useStandardListQuery 미사용). 기존 `res.data` 파싱 유지.

## 6. StandardListToolbar 적용 여부

- **적용**(filter slot 만). 검색(onSearchChange) 미연결(backend 검색 미지원). filters slot = exposureStatus `<select>`(노출 대기/승인/반려/전체), summary = `총 n건`. action slot 미사용.

## 7. DataTable manualSort/onSort 적용 여부 / 서버 정렬 가능 컬럼

- **미적용(N/A).** 화면이 카드 큐라 DataTable 부재 + backend sortBy/sortOrder 미지원. → 정렬 연결 보류(WO §10 준수). 서버 정렬 가능 컬럼: **없음**.

## 8. page=1 reset / URL query sync

- 페이지네이션 없음 → page=1 reset N/A. 필터 변경 시 `load` 재호출(filterStatus dep)로 목록 갱신.
- URL sync: `?recruitmentExposure_status=`(useSearchParams, replace). 기본 'pending'은 param 생략. 초기값 URL→state 복원(새로고침). 필터 변경 시 URL 반영.

## 9. Pagination 연결 방식

- **미적용.** 승인 큐(소량)라 페이지네이션 미도입(WO 금지선 준수). 카드 전체 표시.

## 10. 승인/반려 액션 무회귀

- approve/reject 로직(`PATCH :id/approve|reject` + reload) **무변경**. 카드 버튼/window.prompt 반려 사유 그대로. 필터 + 승인/반려 독립.

## 11. 검증

- **isolated tsc**: operator-ux-core **EXIT 0**. **web-kpa-society 전체 tsc EXIT 0**(통합). GP/KCos 동일 최소 편집(parity).
- **backend/package/lock 변경 없음**: staged diff 에 apps/api-server·package.json·pnpm-lock.yaml 없음.
- **DataTable/Pagination breaking 0**(미사용), **카드 UX 재설계 0**, **승인/반려 로직 0**.
- **browser smoke 미수행** — 배포 후 권장: 3앱 `/operator/recruitment-exposure` 진입 → 기본 '노출 대기'만 표시 / 필터 변경→목록·URL 반영 / 새로고침 복원 / 승인·반려 후 reload·필터 유지 / 빈 결과 crash 0.

## 12. 후속 확산 후보

- **(보류 분리) `WO-O4O-RECRUITMENT-EXPOSURE-LIST-BACKEND-PAGINATION-V1`** — 데이터 증가 시 proxy/getRecruitmentsForExposureReview 에 page/limit/search/sort 추가 → DataTable 전환(테이블화). 현재는 큐 성격이라 불요.
- **다음 표준 확산**: `/operator/applications`(`{applications,pagination}` normalize 어댑터, DataTable 기반 — stores/members 패턴 적용 가능) → `/admin/product-approval`(array-only, backend 선행).

---

*Date: 2026-06-17 · PASS · recruitment-exposure = 카드 승인 큐(DataTable 아님, array backend) → STANDARD-LIST full adoption 비대상. V1=exposureStatus 필터(StandardListToolbar) + URL sync(recruitmentExposure_status) + 기본 pending 만. DataTable/Pagination/검색/서버정렬 보류(backend 선행). 카드·승인/반려 무변경. backend/package/lock 무변경. operator-ux-core·web-kpa-society tsc 0.*
