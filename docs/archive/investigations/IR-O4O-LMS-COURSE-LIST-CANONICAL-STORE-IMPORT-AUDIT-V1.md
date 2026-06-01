# IR-O4O-LMS-COURSE-LIST-CANONICAL-STORE-IMPORT-AUDIT-V1

**조사 일자**: 2026-05-10
**조사 기준**: main (`6cd6c5688` 시점)
**조사 범위**: KPA-Society LMS 강의 리스트 페이지 3종의 canonical DataTable 전환 가능성 / 체크박스 기반 ActionBar 구조 / 작성자 권한 분기 / "내 매장 가져가기"(Store Import) 일괄 흐름
**조사자**: Claude Opus 4.7 (정적 분석 only, 코드 수정 없음)
**관련 IR**: [IR-O4O-LMS-STORE-LIBRARY-INTEGRATION-V1](IR-O4O-LMS-STORE-LIBRARY-INTEGRATION-V1.md) (snapshot/asset 통합 결정 — 이미 구현 완료)

---

## 0. 핵심 결론 (TL;DR)

> **이전 IR이 권장한 backend canonical(reusable_policy 컬럼, asset_type='lesson', LessonAssetResolver, "+내 자료함에 추가" 단건 액션)은 모두 구현 완료된 상태다.** 현재 미해결 격차는 **frontend 리스트 UI의 canonical 전환**과 **bulk(체크 기반 ActionBar) 흐름의 부재**다.
>
> **권장 방향**: **3개 페이지를 역할별 다른 패턴으로 분리 정렬한다**.
>
> | 페이지 | 현재 | 권장 |
> |--------|------|------|
> | [LmsCoursesPage.tsx](services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx) (`/lms/courses` — 학습자 hub) | HubEntityCard grid + 카드별 "+자료함" 단건 버튼 | **유지 + 매장 운영자 한정 토글로 "리스트 모드" 전환 시 DataTable + 체크박스 bulk add 노출** |
> | [CourseListPage.tsx](services/web-kpa-society/src/pages/instructor/courses/CourseListPage.tsx) (`/instructor/courses` — 강사 my-courses) | 수동 styled-div 카드 리스트 | **canonical DataTable 전환** (체크박스 + bulk submit-review/archive + RowActionMenu) |
> | [InstructorCourseDashboardPage.tsx](services/web-kpa-society/src/pages/instructor/InstructorCourseDashboardPage.tsx) (`/instructor/dashboard`) | 수동 raw `<table>` | **canonical DataTable 전환** (선택 시 통계 패널 갱신; bulk 액션 없음) |
>
> **Reference 구현은 이미 존재**: [OperatorLmsCoursesPage.tsx](services/web-kpa-society/src/pages/operator/OperatorLmsCoursesPage.tsx)가 `@o4o/operator-ux-core` DataTable + `defineActionPolicy` + `useBatchAction` + `BaseDetailDrawer` 전체 패턴을 KPA-a Operator 영역에 이미 적용 중. 본 IR의 권장 작업은 그 패턴을 **non-operator 영역(/lms, /instructor)에 동일 어휘로 전파**하는 것이다.
>
> **새로운 entity 신규 컬럼 / migration / 신규 백엔드 API 불필요** — 모든 권장 변경은 frontend 한정.

**핵심 사실 6가지**:

1. **이전 IR의 backend 권장은 100% 구현됨** — `lms_courses.reusable_policy` 컬럼 ([20260919000000-AddReusablePolicyToLmsCourses.ts](apps/api-server/src/database/migrations/20260919000000-AddReusablePolicyToLmsCourses.ts)), `KpaAssetResolver.resolveLesson()` ([kpa-asset.resolver.ts:76-123](apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts#L76-L123)), assetType union 확장 ([assetSnapshot.ts:18](services/web-kpa-society/src/api/assetSnapshot.ts#L18)), 강사 편집 UI 토글 ([CourseEditPage.tsx:817-844](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L817-L844)) 모두 활성.
2. **단건 "+내 자료함에 추가" 흐름도 이미 동작** — [LmsCoursesPage.tsx:121-148](services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx#L121-L148). DUPLICATE_SNAPSHOT / SOURCE_NOT_FOUND 사용자 친화 처리 포함.
3. **운영자 측 canonical reference 존재** — [OperatorLmsCoursesPage.tsx:21-22](services/web-kpa-society/src/pages/operator/OperatorLmsCoursesPage.tsx#L21-L22): `ActionBar, BulkResultModal, RowActionMenu, BaseDetailDrawer` from `@o4o/ui` + `DataTable, defineActionPolicy, useBatchAction` from `@o4o/operator-ux-core`. 즉 **canonical 어휘는 이미 KPA 내부에 있다**.
4. **3개 페이지 모두 raw / 수동 구현** — 학습자 hub(card), 강사 my-courses(custom div card), 강사 dashboard(raw `<table>`). 모두 canonical 통합 대상이지만 적합 패턴이 다름.
5. **"내 자료함에 추가"의 bulk 흐름은 미구현** — `assetSnapshotApi.copy()`는 1건씩만 호출 가능. 그러나 `AssetCopyService`는 idempotent + DUPLICATE_SNAPSHOT 처리가 안전하므로 frontend `useBatchAction` 패턴으로 N건 순차 호출로 충분 (서버 신규 endpoint 불필요).
6. **권한 분기는 3원화** — `instructorId === userId` (자기 강의) / `kpa:admin` (operator override, [CourseController.ts:18-21](apps/api-server/src/modules/lms/controllers/CourseController.ts#L18-L21)) / `isStoreOwner` (자료함 가져가기 자격, [LmsCoursesPage.tsx:66](services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx#L66)). frontend 분기 로직은 페이지마다 산발적이라 통일 helper가 필요.

---

## 1. 현재 LMS 강의 리스트 구조 진단

### 1.1 페이지 3종 비교표

| 항목 | LmsCoursesPage (학습자 hub) | CourseListPage (강사 my) | InstructorCourseDashboardPage (강사 통계) |
|------|----------------------------|--------------------------|------------------------------------------|
| 라우트 | `/lms`, `/lms/courses` | `/instructor/courses` | `/instructor/dashboard` |
| 표현 형식 | **HubEntityCard grid** (auto-fill 420px) | **수동 styled-div card list** | **수동 raw `<table>`** + KPI 카드 5개 |
| DataTable 사용 | ❌ | ❌ | ❌ |
| Row selection | ❌ | ❌ | 단일 row 클릭 → 통계 패널 갱신 (multi-select 아님) |
| Pagination | ✅ ([Pagination](services/web-kpa-society/src/components/common)) | ❌ (myCourses는 단일 페이지) | ❌ (단일 페이지) |
| Search/filter | URL `?category=` 만 | ❌ | 강의 드롭다운 (single select) |
| Sort | ❌ | ❌ | ❌ |
| 모바일 대응 | grid auto-fill (자연 1열 폴백) | maxWidth 900 + 카드 vertical | maxWidth 1100, 가로 스크롤 발생 가능성 |
| Detail drawer | ❌ — 클릭 시 `/lms/course/:id` 이동 | ❌ — 클릭 시 `/instructor/courses/:id` 이동 | ❌ — 행 선택 시 통계만 갱신 |
| Bulk action | ❌ | ❌ | ❌ |

### 1.2 학습자 hub ([LmsCoursesPage.tsx](services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx))

- `HubEntityCard` 사용 (badge / title / description / tags / meta / cta + children slot)
- **이미 가져간 강의 set 사전 로드** ([:74-93](services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx#L74-L93)) — `assetSnapshotApi.list({ type: 'lesson', limit: 100 })`로 organizationId 보유 매장운영자에 한해 N+1 회피
- "+ 내 자료함에 추가" 버튼은 **카드별로 children slot에 inline 노출** ([:216-232](services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx#L216-L232)). `canAddToLibrary = isStoreOwner && status==='published' && reusablePolicy && reusablePolicy !== 'restricted'` 조건부 렌더.

### 1.3 강사 my-courses ([CourseListPage.tsx](services/web-kpa-society/src/pages/instructor/courses/CourseListPage.tsx))

- 수동 div 카드 list (thumbnail 80×60 + title + description ellipsis + status badge + 수강자 + 시간)
- 액션: 카드 클릭 → 상세 이동, 우상단 "+새 강의 만들기" 버튼만
- **편집 / 발행 요청 / 비공개 / 아카이브 inline 액션 부재** — 항상 detail 페이지로 우회 강제
- `lmsInstructorApi.myCourses()` ([CourseListPage.tsx:64-77](services/web-kpa-society/src/pages/instructor/courses/CourseListPage.tsx#L64-L77)) 단일 호출, contentKind 미지정 시 'lecture'만

### 1.4 강사 dashboard ([InstructorCourseDashboardPage.tsx](services/web-kpa-society/src/pages/instructor/InstructorCourseDashboardPage.tsx))

- KPI 카드 5개 + raw `<table>`(강의명/상태/수강자/완료율/평균진도율/액션) ([:99-181](services/web-kpa-society/src/pages/instructor/InstructorCourseDashboardPage.tsx#L99-L181))
- 행 클릭 시 상단 통계 카드가 해당 강의 stats로 교체됨 — single-row select 패턴
- "참여자 관리" 단일 inline 버튼만 ([:158-173](services/web-kpa-society/src/pages/instructor/InstructorCourseDashboardPage.tsx#L158-L173))

### 1.5 reference: 운영자 canonical ([OperatorLmsCoursesPage.tsx](services/web-kpa-society/src/pages/operator/OperatorLmsCoursesPage.tsx))

- `@o4o/operator-ux-core` DataTable + `@o4o/ui` ActionBar/BulkResultModal/RowActionMenu/BaseDetailDrawer 전체 사용
- `defineActionPolicy('kpa:lms:courses')` ([:49-103](services/web-kpa-society/src/pages/operator/OperatorLmsCoursesPage.tsx#L49-L103))로 row 별 visible/confirm 동적 분기:
  - `view` / `approve` (pending_review만) / `reject` (pending_review만) / `unpublish` (published만) / `archive` (≠ archived) / `hard-delete` (archived만, danger confirm)
- `useBatchAction` + retry 패턴 적용

---

## 2. 표시 메타데이터 분석

### 2.1 현재 표시되는 필드

| 필드 | 학습자 hub | 강사 my | 강사 dashboard |
|------|:---------:|:-------:|:--------------:|
| 제목 | ✅ | ✅ | ✅ |
| 설명 | ✅ (description) | ✅ ellipsis | ❌ |
| 강사명 | ✅ (`instructor.name` ‖ `instructorName`) | ❌ | ❌ |
| 썸네일 | ❌ (HubEntityCard 미표시) | ✅ 80×60 | ❌ |
| 상태 | badge (공개/회원제) | badge (draft/published/archived) | badge (공개/초안) |
| 강의수 (lesson count) | ❌ | ❌ | ❌ |
| 수강생 수 | ✅ (`enrollmentCount`) | ✅ (`currentEnrollments`) | ✅ (`totalEnrollments`) |
| 완료율 | ❌ | ❌ | ✅ |
| 평균 진도율 | ❌ | ❌ | ✅ |
| 시간(분) | ✅ (`formatDuration`) | ✅ | ❌ |
| 태그 | ✅ (max 3) | ❌ | ❌ |
| 등록일 / 수정일 / 발행일 | ❌ | ❌ | ❌ |
| reusablePolicy 표시 | 버튼 가시성에만 사용 | ❌ | ❌ |

### 2.2 추가 가능 필드 (DB 존재 확인 완료)

`lms_courses` 테이블 + Course DTO에 **이미 존재**하지만 어떤 페이지에도 노출 안 된 필드:

| 필드 | DB 컬럼 | 현재 노출 | 활용 후보 |
|------|---------|----------|-----------|
| `createdAt` | ✅ | 없음 | **canonical 정렬 기본 키**로 강사 my-courses에 추가 권장 |
| `updatedAt` | ✅ | 없음 | "마지막 수정일" — 강사 my-courses 정렬 후보 |
| `publishedAt` | ✅ | 없음 | 학습자 hub "최신 공개" 정렬 후보 |
| `visibility` (public/members) | ✅ | hub만 badge | 강사 페이지에도 표시 권장 |
| `reusablePolicy` (restricted/organization/platform) | ✅ | hub 버튼 분기에만 | 강사 my-courses에 inline column 노출 권장 (자료함 활용 가능 여부 한눈 보기) |
| `contentKind` (lecture/content_resource) | ✅ | 없음 | 컬럼 또는 필터로 노출 |
| `isPaid` / `price` | ✅ | 없음 | 학습자 hub 가격 표시 가능 |
| `tags` | ✅ | hub만 | 강사 my-courses 컬럼 노출 가능 |

### 2.3 DB에 부재하는 필드 (요구사항에는 등장하나 entity 미지원)

| 요구사항 필드 | 현재 entity | 비고 |
|--------------|------------|------|
| 좋아요 수 | ❌ 부재 | 추가하려면 별도 migration + counter 테이블 (Phase 3 이상) |
| 조회수 | ❌ 부재 | 추가하려면 같음 |
| 카테고리 | ⚠️ `tags` 만 존재 | `category` 컬럼은 없음. 학습자 hub URL `?category=` 는 tags 매칭으로 동작 추정 (확인 필요) |
| 작성자 표시명 (instructor 외) | ⚠️ instructor relation으로 join | 별도 `created_by` / `author_name` 컬럼은 없음 |
| 마지막 수정자 | ❌ 부재 | 운영자 override 추적 불가 |

→ **본 IR Phase 1 권장은 entity 변경 없이 기존 DB 컬럼을 모두 노출하는 데 집중**. 좋아요/조회수는 별도 WO(EVENT-OFFER 패턴 또는 counter table)로 분리.

---

## 3. 권한 및 작성자 정책

### 3.1 백엔드 권한 분기 ([CourseController.ts](apps/api-server/src/modules/lms/controllers/CourseController.ts))

| 액션 | 자기 강의 (`instructorId === userId`) | `kpa:admin` (운영자 override) | `kpa:operator` | 일반 학습자 |
|------|:------------------------------------:|:------------------------------:|:--------------:|:-----------:|
| 목록 조회 | ✅ (`/instructor/courses`) | ✅ (`/operator/courses` 별 endpoint) | ✅ (operator) | ✅ visibility=public 강제 |
| 상세 조회 | ✅ | ✅ | ✅ | visibility=public만 |
| 생성 | `lms:instructor` 필요 | ✅ | ❌ | ❌ |
| 수정 (`PUT /courses/:id`) | ✅ ([:128](apps/api-server/src/modules/lms/controllers/CourseController.ts#L128)) | ✅ (`isOwnerOrAdmin`) | ❌ | ❌ |
| 삭제 (`DELETE /courses/:id`) | ✅ → `archived` 전환 | ✅ + hard-delete 가능 | ❌ | ❌ |
| 발행 요청 (`submitForReview`) | ✅ | ✅ | ❌ | ❌ |
| 발행 (`publishCourse`) | ❌ ([:192](apps/api-server/src/modules/lms/controllers/CourseController.ts#L192)) — **강사 직접 publish 금지** | ✅ | ❌ | ❌ |
| 자료함 가져가기 | — | ✅ | ✅ | `kpa:store_owner` 필요 |

→ helper: `isOwnerOrAdmin(course, user)` ([:18-21](apps/api-server/src/modules/lms/controllers/CourseController.ts#L18-L21)) — 모든 mutation에서 일관되게 호출. **frontend 분기는 이 정확한 시그니처를 그대로 거울링**해야 한다.

### 3.2 frontend 권한 분기의 현재 산발성

- 학습자 hub: `useAuth()` → `user?.isStoreOwner && user?.kpaMembership?.organizationId` ([LmsCoursesPage.tsx:66](services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx#L66))
- 강사 my: `lmsInstructorApi.myCourses()` 자체가 instructorId scope 강제. 페이지 내 권한 분기 없음.
- 강사 dashboard: 동일 (페이지 진입 시 401만 처리)
- 운영자: `requireKpaScope('kpa:operator')` 라우트 가드 + 페이지 내부에서는 모든 강의에 모든 액션 노출

**격차**: "내가 만든 강의 vs 다른 사람 강의" 분기가 frontend에는 명시적 helper 없음 (API가 강제하므로 사실상 필요가 없었음). canonical DataTable로 전환 시 **operator override와 owner action이 한 페이지 안에서 동시 노출되는 케이스가 새로 등장하지 않는 한 추가 helper 불필요** — instructor my-courses는 항상 owner, operator는 별도 페이지(이미 존재).

### 3.3 공개 / 비공개 정책 정리

| 축 | 값 | 의미 | 강사가 직접 변경 가능? |
|----|-----|------|:----------------------:|
| `status` | draft / pending_review / published / rejected / archived | lifecycle | submitForReview / 자기 archive 가능. publish는 admin only |
| `visibility` | public / members | 수강 접근성 | ✅ |
| `reusablePolicy` | restricted / organization / platform | 자료함 가져가기 허용 | ✅ ([CourseEditPage.tsx:817-844](services/web-kpa-society/src/pages/instructor/courses/CourseEditPage.tsx#L817-L844)) |
| `isPaid` / `price` | bool / decimal | 유료 여부 | ✅ |

→ **3축 분리**(이전 IR §4 결정)가 backend에서 그대로 유지되고 있음. canonical DataTable에서도 컬럼/필터를 3축으로 분리 노출 권장.

---

## 4. 체크박스 기반 ActionBar 구조 가능성

### 4.1 적용 가능한 canonical 컴포넌트 인벤토리

| 컴포넌트 | 패키지 | export 위치 | 적용 가능 여부 |
|----------|--------|------------|:--------------:|
| `DataTable` | `@o4o/operator-ux-core` | [packages/operator-ux-core/src/list/DataTable.tsx](packages/operator-ux-core/src/list/DataTable.tsx) | ✅ |
| `defineActionPolicy` / `buildRowActions` | `@o4o/operator-ux-core` | action-policy.ts | ✅ |
| `useBatchAction` | `@o4o/operator-ux-core` | useBatchAction.ts | ✅ |
| `Pagination` | `@o4o/operator-ux-core` | [packages/operator-ux-core/src/list/Pagination.tsx](packages/operator-ux-core/src/list/Pagination.tsx) | ✅ |
| `SearchBar` | `@o4o/operator-ux-core` | [packages/operator-ux-core/src/list/SearchBar.tsx](packages/operator-ux-core/src/list/SearchBar.tsx) | ✅ |
| `ActionBar` | `@o4o/ui` | [packages/ui/src/components/index.ts](packages/ui/src/components/index.ts) | ✅ |
| `BulkResultModal` | `@o4o/ui` | 같음 | ✅ |
| `RowActionMenu` | `@o4o/ui` | 같음 | ✅ |
| `BaseDetailDrawer` | `@o4o/ui` | [packages/ui/src/components/table/BaseDetailDrawer.tsx](packages/ui/src/components/table/BaseDetailDrawer.tsx) | ✅ |

→ **신규 컴포넌트 신설 0건**. 모두 reuse.

### 4.2 정책 문서

- [docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md](docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md): "Operator 페이지는 `@o4o/operator-ux-core` DataTable 표준" 명문화. **본 IR이 다루는 3개 페이지는 `/operator/*` 라우트가 아니므로 정책 §2.1의 강제 대상은 아니지만, canonical 어휘 통일 측면에서 동일 패키지 사용을 권장**.
- [docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md](docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md): `selectedKeys: Set<string>` selection / `executeBatch` / `BulkResultModal` 흐름.

### 4.3 페이지별 적용 권장 매트릭스

| 페이지 | DataTable | rowSelection (Set\<string\>) | ActionBar | RowActionMenu | BulkResultModal | BaseDetailDrawer |
|--------|:---------:|:---------------------------:|:---------:|:-------------:|:---------------:|:----------------:|
| 학습자 hub (`/lms/courses`) | ⚠️ 토글 | ✅ (리스트 모드 한정) | ✅ (리스트 모드 한정, "선택 강의 자료함 일괄 추가") | ⚠️ "자료함에 추가" 단건만 (필요 시) | ✅ | ❌ (HubEntityCard click 그대로 detail 이동) |
| 강사 my-courses (`/instructor/courses`) | ✅ | ✅ | ✅ ("선택 강의 발행 요청 / 아카이브") | ✅ (편집/발행요청/아카이브/참여자) | ✅ | ✅ (강의 요약 drawer) |
| 강사 dashboard (`/instructor/dashboard`) | ✅ | ❌ (single-row select 유지) | ❌ | ⚠️ ("참여자 관리"만) | ❌ | ❌ |

### 4.4 학습자 hub의 "리스트 모드 토글" 설계 근거

학습자 hub는 본질이 **discovery UX**(시각적 카드 + 썸네일/태그)이므로 DataTable 강제 전환은 UX 손실. 그러나 매장 운영자(`isStoreOwner`)에게는 **다수 강의를 한 번에 자료함에 추가**할 동기가 명확하다. 따라서:

- **기본 모드 = 카드 (현행)**
- **매장 운영자 한정 우상단 "리스트 보기 / 카드 보기" 토글** 노출
- 리스트 모드에서만 DataTable + checkbox + ActionBar `[선택 ${n}건] 자료함에 일괄 추가` 제공
- 비-매장 운영자에게는 토글 자체 미노출

이 설계는 [storeMenuConfig.ts:212](packages/store-ui-core/src/config/storeMenuConfig.ts#L212)의 design intent("강좌/레슨형 콘텐츠는 콘텐츠 항목 내부에서 type 표시만, 별도 그룹 금지")와 충돌하지 않음 — 메뉴 신설이 아니라 동일 페이지 내부 표시 모드 분기.

---

## 5. "내 매장 가져가기" Store Import 구조

### 5.1 현재 흐름 (단건)

[LmsCoursesPage.tsx:121-148](services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx#L121-L148):

```
사용자 카드 클릭
  → assetSnapshotApi.copy({ sourceService:'kpa', sourceAssetId, assetType:'lesson' })
  → POST /api/v1/asset-snapshots/copy
  → AssetCopyController → AssetCopyService.copyWithResolver
  → KpaAssetResolver.resolveLesson()
       Gate 1: course.status === 'published'
       Gate 2: course.reusablePolicy !== 'restricted'
       success → snapshot {courseId, title, thumbnail, summary, lessonCount, instructorName, contentKind, visibility, publicUrl, sourceService, capturedAt}
       fail → null → SOURCE_NOT_FOUND
  → unique constraint {organization_id, source_asset_id, asset_type='lesson'} 위반 시 DUPLICATE_SNAPSHOT
```

### 5.2 Bulk 흐름 권장 설계 (frontend 한정 변경)

서버 변경 불필요. `useBatchAction` 훅이 이미 N건 순차 호출 + BulkResult 집계 + retry 지원. 적용 예:

```typescript
const { executeBatch, retryFailed, result } = useBatchAction({
  apiFn: (id: string) =>
    assetSnapshotApi.copy({ sourceService: 'kpa', sourceAssetId: id, assetType: 'lesson' }),
  parseResult: (res, id) => ({
    id,
    success: res.status === 201,
    code: res.data?.error?.code,
  }),
});

// ActionBar의 "선택 강의 일괄 추가" 클릭 시:
await executeBatch([...selectedIds]);
// → BulkResultModal 자동 노출
// → DUPLICATE_SNAPSHOT은 success로 집계 (idempotent)
// → SOURCE_NOT_FOUND는 failed 카테고리로 분리
```

### 5.3 사전 dedup 로드 활용

이미 [LmsCoursesPage.tsx:74-93](services/web-kpa-society/src/pages/lms/LmsCoursesPage.tsx#L74-L93)에서 `addedCourseIds: Set<string>` pre-load 로직이 동작 중. 리스트 모드 전환 시:

- 체크박스에서 이미 추가된 강의는 **disabled + "✓ 자료함에 있음" 라벨**
- ActionBar 카운터는 추가 가능한 항목만 집계
- `reusablePolicy === 'restricted'` 강의도 동일하게 disabled

→ DataTable의 column-level disable 처리는 `_select` system column에 `disabledKeys: Set<string>` prop으로 표현 가능 (operator-ux-core API 확인 필요. 부재 시 신규 prop 1개 추가 필요).

### 5.4 권한 / 정책 매트릭스 (bulk 진입 자격)

| 역할 | 토글 노출 | bulk 추가 가능 | 비고 |
|------|:--------:|:-------------:|------|
| 비로그인 | ❌ | ❌ | hub만 표시 |
| 일반 회원 (`!isStoreOwner`) | ❌ | ❌ | 토글 미노출 |
| `kpa:store_owner` + organizationId | ✅ | ✅ | bulk add 허용 |
| `kpa:operator` (조직 미소속) | ❌ | ❌ | 운영자는 별도 OperatorLmsCoursesPage에서 다른 액션 수행 |
| `kpa:admin` | ⚠️ membership에 따라 | ⚠️ | admin이 매장 보유자도 겸하면 ✅ |

### 5.5 Store Import 정책: Full Copy vs Reference Metadata

이전 IR이 결정한 **Reference Metadata** 방식이 그대로 운영 중 ([kpa-asset.resolver.ts:108-121](apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts#L108-L121)). 본 IR은 그 결정을 변경하지 않음. bulk 추가는 N건의 reference metadata snapshot을 생성할 뿐 lesson body / video는 복사하지 않음. **저작권/권한 침해 위험 없음**.

---

## 6. UI/UX Canonical 방향 정리

### 6.1 학습자 hub canonical 구조

```
[PageHeader 제목/설명/breadcrumb]
[필터 row: category + 우상단 (매장운영자만) "[카드/리스트] 토글"]
─── 카드 모드 (default) ───
  HubEntityCard grid (현재 그대로 유지)
  카드별 "+자료함" 단건 버튼 유지
─── 리스트 모드 (매장운영자만) ───
  DataTable: 체크박스 + 썸네일 + 제목 + 강사 + 태그 + 시간 + 수강자 + reusablePolicy 라벨 + visibility badge
  ActionBar (선택 시): [선택 N건 자료함에 일괄 추가] [전체 해제]
  RowAction: "상세 보기" / "+자료함 단건" (이미 추가된 행 disabled)
[Pagination]
[BulkResultModal]
```

### 6.2 강사 my-courses canonical 구조

```
[PageHeader "내 강의 목록" + 우상단 "+새 강의 만들기"]
[필터: status / contentKind / search]
DataTable: 썸네일 + 제목 + status badge + visibility + reusablePolicy 라벨 + 수강자 + 마지막 수정일
RowActionMenu (defineActionPolicy):
  - 편집 (always)
  - 미리보기 (always)
  - 발행 요청 (status in [draft, rejected])
  - 비공개 처리 (status === published) — owner도 own 강의는 가능
  - 아카이브 (≠ archived, danger confirm)
  - 참여자 관리 (always)
ActionBar (다중 선택):
  - 선택 발행 요청 (다중 draft/rejected 일괄 submit-review)
  - 선택 아카이브 (다중 archive)
  ※ "선택 삭제" 는 Phase 1 제외 (cascade 위험, operator만 hard-delete)
BaseDetailDrawer (행 클릭): 강의 요약 + 최근 수강자 5명 + 빠른 발행요청 버튼
[Pagination]
[BulkResultModal]
```

### 6.3 강사 dashboard canonical 구조

```
[PageHeader "강의 운영 대시보드"]
[기존 KPI 카드 5개 — 변경 없음]
[Section "강의별 현황"]
  DataTable (selection mode = 'single'):
    - 강의명 / 상태 / 수강자 / 완료율 / 평균진도율
    - RowActionMenu: "참여자 관리"만
  ※ multi-select bulk action 없음 — 통계 페이지의 본질을 유지
```

### 6.4 어휘 표준화

| 잘못된 표현 | 정확한 표현 | 근거 |
|-------------|------------|------|
| "강의 일괄 복사" | "강의 메타데이터 일괄 가져가기" | Reference Metadata만, body 미복사 |
| "내 강의 일괄 발행" | "선택 강의 발행 요청" (`submitForReview`) | 강사 직접 publish 금지 ([CourseController.ts:192](apps/api-server/src/modules/lms/controllers/CourseController.ts#L192)) |
| "강의 비공개 / 강의 차단" | visibility 변경 vs reusablePolicy 변경 분리 | 두 축 독립 |
| "강의 삭제" | "아카이브"(강사) vs "완전 삭제"(운영자) 분리 | hard-delete는 operator only |

---

## 7. 기존 공통화 자산 재사용 분석

### 7.1 100% 재사용 (신규 개발 0)

| 자산 | 출처 | 적용 위치 |
|------|------|-----------|
| `DataTable` / `Pagination` / `SearchBar` | `@o4o/operator-ux-core` | 3개 페이지 모두 |
| `defineActionPolicy` / `buildRowActions` | `@o4o/operator-ux-core` | my-courses + dashboard |
| `useBatchAction` | `@o4o/operator-ux-core` | hub(리스트모드) + my-courses |
| `ActionBar` / `BulkResultModal` / `RowActionMenu` / `BaseDetailDrawer` | `@o4o/ui` | 위와 동일 |
| `assetSnapshotApi.copy` / `.list` | 기존 client | hub bulk add 흐름 |
| `lmsInstructorApi` | 기존 client | my-courses + dashboard |
| `KpaAssetResolver.resolveLesson` | backend | 변경 없음 |
| `LessonCardPreview` 컴포넌트 | shared-space-ui (이전 IR Phase 2 산출물 — 이미 존재 [StoreLibraryContentsPage.tsx:355-357](services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx#L355-L357)) | bulk 결과 후 자료함 이동 시 이미 동작 |

### 7.2 신규 개발 (최소화)

| 항목 | 규모 | 우선순위 |
|------|------|----------|
| 학습자 hub 카드/리스트 토글 컴포넌트 | 작음 (50줄 미만) | 1 |
| DataTable column-level disable Set 지원 (operator-ux-core 확장) | 작음 — `_select` 컬럼 prop 1개 추가, 또는 `getRowSelectable: (row) => boolean` callback. 기존 selection API 확인 후 결정 | 1 |
| `defineActionPolicy('lms:my-courses')` rule set (강사) | 중간 — submit-review/archive/edit/preview/participants 5개 rule | 2 |
| `defineActionPolicy('lms:hub-store-import')` (학습자 리스트모드) | 작음 — add-to-library 1개 rule | 1 |
| BaseDetailDrawer 강의 요약 컨텐츠 (my-courses) | 중간 — 기존 detail 페이지 컴포넌트 부분 재사용 가능 | 3 |

### 7.3 backend 변경 (없음)

- `lms_courses` 컬럼 변경 ❌
- 신규 endpoint ❌
- migration ❌
- resolver / service 변경 ❌

→ Backend frozen baselines (F1, F4, F5, F10) 모두 침범하지 않음.

---

## 8. 영향 범위

### 8.1 직접 영향

| 대상 | 변경 내용 |
|------|----------|
| KPA-Society LMS 학습자 hub | 카드/리스트 토글 + 리스트 모드 신설 |
| KPA-Society 강사 my-courses | 전면 DataTable 전환 + bulk submit-review/archive |
| KPA-Society 강사 dashboard | raw `<table>` → DataTable single-select 전환 |

### 8.2 간접 / 후속 적용 가능 영향

| 대상 | 적용 가능성 | 비고 |
|------|:----------:|------|
| GlycoPharm LMS 페이지 | ⚠️ | LMS 백엔드는 단일 모듈, GlycoPharm은 LMS 페이지 부분만 존재. KPA의 canonical 패턴이 표준화되면 GlycoPharm은 thin migration |
| K-Cosmetics LMS 페이지 | ⚠️ | 동일 |
| Neture | ❌ | LMS 페이지 자체 부재 |
| Store Library Contents 페이지 | ✅ 이미 적용 | [StoreLibraryContentsPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx) — 이미 lesson 표시 + LessonCardPreview 사용 중. bulk 흐름의 결과로 자료함 이동 시 자연스럽게 연결 |
| Operator LMS Courses 페이지 | ❌ 변경 불필요 | [OperatorLmsCoursesPage.tsx](services/web-kpa-society/src/pages/operator/OperatorLmsCoursesPage.tsx) — 이미 canonical |

### 8.3 Frozen Baseline 영향 평가

| Baseline | 영향 | 판단 |
|----------|:----:|------|
| F1 Operator OS | ❌ | 본 IR은 non-operator 영역 |
| F4 Platform Content Policy / F5 Content Stable | ❌ | LMS는 별도 도메인 |
| F6 Boundary Policy | ❌ | organizationId / kpa scope guard 그대로 사용 |
| F10 O4O Core (Auth/Membership/Approval/RBAC) | ❌ | helper만 호출 |
| F11 User/Operator | ❌ | KPA-a 예외 패턴(RoleGuard + allowedRoles) 그대로 |
| LMS Frozen Baseline (CLAUDE.md §13-A APP-LMS) | ⚠️ "백엔드 공통, frontend 공통화는 후속" 문구 | **본 IR이 해당 'frontend 공통화 후속'에 해당** — APP-LMS frontend 표준화의 첫 캐논 작업으로 위치시킬 수 있음 |

---

## 9. 최종 판단 및 옵션 평가

### 9.1 옵션 평가표

| 옵션 | 설명 | 평가 |
|------|------|------|
| **A. 현재 유지** | 카드 그대로, raw table 그대로 | ❌ 강사 dashboard raw `<table>`은 OPERATOR-DATATABLE-POLICY-V1 어휘 표준에서 점차 부합도가 떨어짐. canonical 어휘 일관성 손상 |
| **B. 3개 페이지 전면 DataTable 전환 (강제)** | 학습자 hub도 카드 폐기 → DataTable 강제 | ❌ 학습자 hub의 discovery UX 손상. design intent 위반 |
| **C. 역할별 패턴 분리 (권장)** | 학습자 hub = 카드 default + 매장운영자 토글 / my-courses = DataTable / dashboard = DataTable single-select | ✅ **권장**. UX/canonical 어휘 양립 |
| D. APP-LMS 공통 frontend 패키지 신설 | LmsCourseTable 등 | ⏳ Phase 2 이후. 1차는 KPA에서만 검증 후 GlycoPharm/K-Cos 적용 |

### 9.2 권장 방향 = C (Phase 1)

**Phase 1 (3 WO)**

1. **WO-O4O-LMS-INSTRUCTOR-MY-COURSES-CANONICAL-V1** — `/instructor/courses`를 DataTable + RowActionMenu + ActionBar(submit-review/archive bulk) + BaseDetailDrawer로 전환
2. **WO-O4O-LMS-INSTRUCTOR-DASHBOARD-DATATABLE-V1** — `/instructor/dashboard`의 raw `<table>`을 DataTable single-select로 전환 (KPI 카드 / 통계 갱신 흐름 유지)
3. **WO-O4O-LMS-HUB-STORE-IMPORT-BULK-V1** — `/lms/courses`에 매장 운영자 한정 카드/리스트 토글 + 리스트 모드 DataTable + bulk "자료함 일괄 추가" ActionBar + BulkResultModal

**Phase 2 (선택)**

4. **WO-O4O-APP-LMS-COURSE-TABLE-COMMON-PACKAGE-V1** — KPA에서 검증 후 GlycoPharm/K-Cosmetics에 적용 가능한 공통 LmsCourseTable 컴포넌트 추출 (APP-LMS frontend 공통화의 첫 산출물)
5. **WO-O4O-LMS-COURSE-LIKE-VIEW-COUNT-V1** — 좋아요/조회수 entity 추가 (별도 counter 테이블)
6. **WO-O4O-LMS-COURSE-CATEGORY-COLUMN-V1** — `category` 컬럼 신설 또는 `tags`와의 관계 정립

### 9.3 KPA 외 서비스 적용 가능성

`apps/api-server/src/modules/lms/`는 단일 모듈, `services/web-glycopharm/`와 `services/web-k-cosmetics/`도 동일한 `Course` 타입을 사용. Phase 1 결과를 reference로 Phase 2에서 thin migration. Neture는 LMS 페이지 자체 부재.

---

## 10. 산출물 및 후속 WO 순서

### 10.1 본 IR이 다루는 산출물

- ✅ 3개 페이지 현재 구조 진단표
- ✅ 표시 메타데이터 / DB 존재 / 추가 가능 필드 매핑
- ✅ 권한 분기 backend / frontend 비교
- ✅ 체크박스 ActionBar canonical 적용 가능 여부 + 컴포넌트 인벤토리
- ✅ 단건 vs bulk Store Import 흐름 설계 (server 변경 불요 확인)
- ✅ 페이지별 적용 패턴 분리(카드 vs DataTable) 결정
- ✅ 공통화 자산 재사용 / 신규 개발 분리
- ✅ Frozen baseline 영향 평가 (모두 ❌)
- ✅ 후속 WO 순서

### 10.2 후속 WO 순서

| 순서 | WO 후보 | 목적 | 의존 |
|:----:|---------|------|------|
| 1 | **WO-O4O-LMS-INSTRUCTOR-MY-COURSES-CANONICAL-V1** | `/instructor/courses` DataTable 전환 + bulk submit-review/archive + RowActionMenu + BaseDetailDrawer | 없음 |
| 2 | **WO-O4O-LMS-INSTRUCTOR-DASHBOARD-DATATABLE-V1** | `/instructor/dashboard` raw `<table>` → DataTable single-select | 없음 (1과 병렬 가능) |
| 3 | **WO-O4O-LMS-HUB-STORE-IMPORT-BULK-V1** | `/lms/courses` 매장운영자 한정 리스트 모드 + bulk 자료함 일괄 추가 | DataTable getRowSelectable 확장(필요 시 선행 micro-WO) |
| 4 | **WO-O4O-OPERATOR-UX-CORE-DISABLE-SELECT-EXPANSION-V1** (필요 시) | DataTable selection의 row-level disable API 확장 | 없음 (3 진행 중 발견되면 분리) |
| 5 | **WO-O4O-APP-LMS-COURSE-TABLE-COMMON-PACKAGE-V1** (Phase 2) | KPA reference → GlycoPharm/K-Cos 적용 가능한 공통 컴포넌트 추출 | 1, 2, 3 |
| 6 | **WO-O4O-LMS-COURSE-LIKE-VIEW-COUNT-V1** (Phase 2) | 좋아요 / 조회수 entity + counter 테이블 | 없음 |
| 7 | **WO-O4O-LMS-COURSE-CATEGORY-V1** (Phase 2) | `category` 컬럼 또는 tags 표준화 | 없음 |

WO 1·2는 병렬 가능. WO 3은 4(필요 시) 후. WO 5·6·7은 Phase 1 완료 후 분리.

### 10.3 주의사항

- **학습자 hub의 카드 그리드를 폐기하지 말 것** — discovery UX 손상. 토글 패턴 유지.
- **매장 운영자가 아닌 사용자에게 토글 노출 금지** — `isStoreOwner && organizationId` 조건부 렌더.
- **강사 publish 직접 액션 금지** — submit-review로 대체. ActionBar에서 "발행 요청" 어휘 사용.
- **bulk add는 idempotent** — DUPLICATE_SNAPSHOT을 success로 집계, 사용자 혼란 방지.
- **OperatorLmsCoursesPage 변경 금지** — 이미 canonical, 본 IR은 non-operator 영역만 다룸.
- **신규 backend endpoint / migration 금지** — frontend canonical 변경만으로 완성됨.
- **APP-LMS frontend 공통화는 Phase 2** — KPA에서 reference 검증 전 GlycoPharm/K-Cos에 동시 진행 금지.
- **F11 KPA-a 예외 패턴 준수** — RoleGuard + allowedRoles 사용, OperatorRoute 사용 금지.

---

*IR-O4O-LMS-COURSE-LIST-CANONICAL-STORE-IMPORT-AUDIT-V1*
*Updated: 2026-05-10*
*Status: Investigation Complete — Phase 1 후속 WO 분기 대기*
