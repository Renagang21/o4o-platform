# LMS-Yaksa – Development TODO

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent

---

## Current Phase: Phase 6 - Member UI (Completed)

### Phase 6 완료 항목

- [x] API 클라이언트 생성 (lmsYaksaMember.ts)
- [x] 공통 UI 컴포넌트 생성
  - [x] RequiredCourseCard - 필수 강좌 카드
  - [x] CourseStatusTag - 강좌 상태 태그
  - [x] LicenseProfileCard - 면허 정보 카드
  - [x] CreditSummaryCard - 평점 요약 카드
- [x] Member Dashboard 화면 구현
- [x] Required Courses 화면 구현
- [x] Credits 화면 구현
- [x] License Profile 화면 구현
- [x] Assignments 화면 구현
- [x] Router 통합 (main-site)

### Phase 6 결과물

```
apps/main-site/src/lib/api/
└── lmsYaksaMember.ts

apps/main-site/src/components/lms-yaksa/
├── RequiredCourseCard.tsx
├── CourseStatusTag.tsx
├── LicenseProfileCard.tsx
├── CreditSummaryCard.tsx
└── index.ts

apps/main-site/src/pages/member/lms/
├── LmsMemberDashboard.tsx
├── LmsMemberRequiredCourses.tsx
├── LmsMemberCredits.tsx
├── LmsMemberLicense.tsx
├── LmsMemberAssignments.tsx
└── index.ts

apps/main-site/src/router/index.tsx (updated)
```

### Member UI Routes

| 경로 | 페이지 | 설명 |
|------|--------|------|
| /member/lms | Dashboard | 교육 대시보드 (redirect) |
| /member/lms/dashboard | Dashboard | 교육 대시보드 |
| /member/lms/required-courses | Required Courses | 필수 교육 목록 |
| /member/lms/credits | Credits | 평점 현황 및 내역 |
| /member/lms/license | License | 면허 정보 및 갱신 |
| /member/lms/assignments | Assignments | 배정된 강좌 전체 |

### Member UI Features

1. **Dashboard**
   - 필수 교육 이수율 진행바
   - 총 평점 / 당해년도 평점 / 미이수 필수 교육 현황
   - 면허 정보 요약 카드
   - 평점 현황 카드 (연도별 차트)
   - 필수 교육 미이수 강좌 리스트 (Top 3)
   - 최근 학습 강좌 리스트
   - 알림 (면허 갱신, 마감 임박, 기한 초과)
   - 빠른 메뉴 바로가기

2. **Required Courses**
   - 전체 이수율 진행바
   - 상태별 필터링 (전체/대기/진행중/완료/기한초과)
   - 마감일 기준 정렬
   - 강좌 카드 (진행률, 액션 버튼)

3. **Credits**
   - 평점 요약 (총/당해/검증대기)
   - 연도별 평점 차트
   - 유형별 평점 분포
   - 연간 목표 달성률
   - 필터링 (연도/유형)
   - 평점 내역 목록

4. **License Profile**
   - 면허 상태 배너 (정상/임박/갱신필요)
   - 면허 정보 카드
   - 갱신 요건 체크리스트
   - 면허 상세 정보
   - 도움말 안내

5. **Assignments**
   - 상태별 통계 카드 (전체/필수/대기/진행중/완료)
   - 정렬 옵션 (마감일/진행률/배정일)
   - 강좌 카드 목록

---

## Previous Phase: Phase 5 - Admin UI (Completed)

### Phase 5 완료 항목

- [x] API 클라이언트 생성 (lmsYaksa.ts)
- [x] 공통 UI 컴포넌트 생성
  - [x] CreditBadge - 평점 표시 배지
  - [x] AssignmentStatusTag - 배정 상태 태그
  - [x] UserSearch - 사용자 검색 입력
  - [x] CoursePicker - 강좌 선택 드롭다운
- [x] Dashboard 화면 구현
- [x] License Profiles 화면 구현
- [x] Required Course Policy 화면 구현
- [x] Course Assignments 화면 구현
- [x] Credits 화면 구현
- [x] Reports 화면 구현
- [x] LmsYaksaRouter 생성
- [x] App.tsx 라우팅 통합

### Phase 5 결과물

```
apps/admin-dashboard/src/lib/api/
└── lmsYaksa.ts

apps/admin-dashboard/src/components/lms-yaksa/
├── CreditBadge.tsx
├── AssignmentStatusTag.tsx
├── UserSearch.tsx
├── CoursePicker.tsx
└── index.ts

apps/admin-dashboard/src/pages/lms-yaksa/
├── dashboard/index.tsx
├── license-profiles/index.tsx
├── required-policy/index.tsx
├── assignments/index.tsx
├── credits/index.tsx
├── reports/index.tsx
└── LmsYaksaRouter.tsx
```

### Admin UI Routes

| 경로 | 페이지 | 설명 |
|------|--------|------|
| /admin/lms-yaksa | Dashboard | 종합 현황 대시보드 |
| /admin/lms-yaksa/dashboard | Dashboard | 종합 현황 대시보드 |
| /admin/lms-yaksa/license-profiles | License Profiles | 면허 프로필 관리 |
| /admin/lms-yaksa/required-policy | Required Policy | 필수 교육 정책 관리 |
| /admin/lms-yaksa/assignments | Assignments | 강좌 배정 관리 |
| /admin/lms-yaksa/credits | Credits | 평점 기록 관리 |
| /admin/lms-yaksa/reports | Reports | 보고서 및 통계 |

### Admin UI Features

1. **Dashboard**
   - 전체 회원 수, 이수율, 총 평점, 활성 정책 현황
   - 기한 초과, 미검증 평점, 갱신 필요 알림
   - 강좌 배정 현황 (완료/진행중/초과)
   - 빠른 작업 바로가기

2. **License Profiles**
   - 사용자 ID로 프로필 검색
   - 면허 정보 조회/수정/생성
   - 평점 재계산, 갱신 확인 기능
   - 평점 요약 표시

3. **Required Course Policy**
   - 정책 목록 카드 표시
   - 정책 활성화/비활성화 토글
   - 정책 생성/수정/삭제
   - 필수 강좌 및 대상 회원 유형 설정

4. **Course Assignments**
   - 사용자별 배정 검색
   - 기한 초과 배정 탭
   - 배정 통계 (전체/완료/진행중/초과)
   - 단일/일괄 배정 기능
   - 완료 처리, 진행률 수정, 취소

5. **Credits**
   - 사용자별 평점 기록 검색
   - 검증 대기 평점 탭
   - 평점 요약 (누적/당해/미검증)
   - 평점 추가 (강좌/외부/수동조정)
   - 검증/거부/수정/삭제

6. **Reports**
   - 종합 통계 현황
   - 필수 강좌 이수 현황
   - 면허 갱신 필요 회원 목록
   - 기한 초과 배정 목록
   - CSV/PDF 내보내기 (준비중)

---

## Previous Phase: Phase 4 - LMS Core Hooks Integration (Completed)

### Phase 4 완료 항목

- [x] hooks 디렉토리 생성
- [x] types/events.ts 이벤트 타입 정의
- [x] CourseCompletionHandler 구현
- [x] CertificateIssuedHandler 구현
- [x] EnrollmentHandler 구현
- [x] ProgressSyncHandler 구현
- [x] LmsCoreEventHandlers 통합 클래스 구현
- [x] hooks/index.ts export 구성
- [x] backend/index.ts hooks export 추가
- [x] manifest.ts backend.hooks 섹션 추가
- [x] manifest.ts exposes.hooks 추가

### Phase 4 결과물

```
packages/lms-yaksa/src/backend/hooks/
├── CourseCompletionHandler.ts
├── CertificateIssuedHandler.ts
├── EnrollmentHandler.ts
├── ProgressSyncHandler.ts
├── LmsCoreEventHandlers.ts
└── index.ts

packages/lms-yaksa/src/types/
└── events.ts
```

### Event Handlers

| Handler | Trigger Event | Description |
|---------|---------------|-------------|
| CourseCompletionHandler | lms-core.course.completed | 강좌 완료 시 평점 자동 기록, 배정 완료 처리 |
| CertificateIssuedHandler | lms-core.certificate.issued | 이수증 발급 시 평점 연결, 배정 완료 확인 |
| EnrollmentHandler | lms-core.enrollment.created | 수강 등록 시 배정 상태 IN_PROGRESS로 변경 |
| ProgressSyncHandler | lms-core.enrollment.progress | 진도 업데이트 시 배정 진행률 동기화 |

### Hook Integration Flow

```
lms-core Events → LmsCoreEventHandlers → Individual Handlers → Yaksa Services
     ↓                    ↓                      ↓                    ↓
course.completed    registerHandlers()    CourseCompletionHandler   CreditRecordService
certificate.issued                        CertificateIssuedHandler  CourseAssignmentService
enrollment.created                        EnrollmentHandler         LicenseProfileService
enrollment.progress                       ProgressSyncHandler       RequiredCoursePolicyService
```

---

## Previous Phase: Phase 3 - Controllers & Routes (Completed)

### Phase 3 완료 항목

- [x] LicenseProfileController 구현
- [x] RequiredCoursePolicyController 구현
- [x] CreditRecordController 구현
- [x] CourseAssignmentController 구현
- [x] YaksaLmsAdminController 구현
- [x] controllers/index.ts export 구성
- [x] yaksaLms.routes.ts 생성
- [x] routes/index.ts export 구성
- [x] backend/index.ts Router 등록
- [x] manifest.ts backend.controllers 업데이트

### Phase 3 결과물

```
packages/lms-yaksa/src/backend/controllers/
├── LicenseProfileController.ts
├── RequiredCoursePolicyController.ts
├── CreditRecordController.ts
├── CourseAssignmentController.ts
├── YaksaLmsAdminController.ts
└── index.ts

packages/lms-yaksa/src/backend/routes/
├── yaksaLms.routes.ts
└── index.ts
```

### API Endpoints

**Base Path:** `/api/v1/lms/yaksa`

| Controller | Path | Endpoints |
|------------|------|-----------|
| LicenseProfileController | /license-profiles | GET /:userId, POST /, PATCH /:id, POST /:id/recalculate-credits, POST /:id/check-renewal, DELETE /:id |
| RequiredCoursePolicyController | /policies/required-courses | GET /, GET /:id, POST /, PATCH /:id, POST /:id/activate, POST /:id/deactivate, POST /:id/courses/:courseId, DELETE /:id/courses/:courseId, DELETE /:id |
| CreditRecordController | /credits | GET /:userId, GET /:userId/summary, GET /:userId/aggregate, POST /, POST /external, POST /manual-adjustment, POST /:id/verify, POST /:id/reject, GET /admin/unverified, PATCH /:id, DELETE /:id |
| CourseAssignmentController | /course-assignments | GET /:userId, GET /:userId/statistics, POST /, POST /bulk, POST /by-policy, POST /:id/complete, POST /:id/progress, POST /:id/link-enrollment, POST /:id/cancel, PATCH /:id, DELETE /:id |
| YaksaLmsAdminController | /admin | GET /stats, GET /license-expiring, GET /pending-required-courses, GET /overdue-assignments, POST /expire-overdue, GET /unverified-credits, GET /dashboard |

---

## Previous Phase: Phase 2 - Services Implementation (Completed)

### Phase 2 완료 항목

- [x] LicenseProfileService 구현
- [x] RequiredCoursePolicyService 구현
- [x] CreditRecordService 구현
- [x] CourseAssignmentService 구현
- [x] services/index.ts export 구성
- [x] backend/index.ts services export 추가
- [x] manifest.ts exposes.services 업데이트

### Phase 2 결과물

```
packages/lms-yaksa/src/backend/services/
├── LicenseProfileService.ts
├── RequiredCoursePolicyService.ts
├── CreditRecordService.ts
├── CourseAssignmentService.ts
└── index.ts
```

### Service 구현 내역

1. **LicenseProfileService**
   - 면허 정보 CRUD (getProfile, createProfile, updateProfile, deleteProfile)
   - 연간 평점 집계 (recalculateCredits, calculateYearCredits)
   - 갱신 필요 여부 판단 (checkRenewalRequired)
   - 면허 검증 (verifyLicense)
   - 연간 초기화 (resetYearlyCreditsForAll)

2. **RequiredCoursePolicyService**
   - 정책 CRUD (getPolicy, createPolicy, updatePolicy, deletePolicy)
   - 정책 적용 대상 조회 (getPoliciesForMemberType)
   - 필수 강좌 목록 관리 (addRequiredCourse, removeRequiredCourse)
   - 정책 검증 (validatePolicy)
   - 활성화/비활성화 (setActive)

3. **CreditRecordService**
   - 평점 기록 CRUD (getCredits, addCreditRecord, updateCreditRecord, deleteCreditRecord)
   - 연간 평점 집계 (calculateTotalCredits, aggregateCreditsByYear, aggregateCreditsByType)
   - 외부 평점 등록 (addExternalCredit)
   - 수동 조정 (addManualAdjustment)
   - 평점 요약 (getCreditSummary)
   - 검증 관리 (verifyCredit, rejectCredit, getUnverifiedCredits)

4. **CourseAssignmentService**
   - 강좌 배정 CRUD (assignCourse, updateAssignment, deleteAssignment)
   - 완료 처리 (markCompleted, updateProgress)
   - 만료 처리 (expireOverdueAssignments, getOverdueAssignments)
   - 정책 기반 자동 배정 (assignByPolicy)
   - 대량 배정 (bulkAssignCourse)
   - 통계 조회 (getUserStatistics, getOrganizationStatistics)

---

## Previous Phase: Phase 1 - Entity Design (Completed)

### Phase 1 완료 항목

- [x] YaksaLicenseProfile Entity 생성
- [x] RequiredCoursePolicy Entity 생성
- [x] CreditRecord Entity 생성
- [x] YaksaCourseAssignment Entity 생성
- [x] backend/entities/index.ts export 구성
- [x] backend/index.ts 업데이트 (entities export)
- [x] manifest.ts 업데이트 (Phase 1 entities 반영)

### Phase 1 결과물

```
packages/lms-yaksa/src/backend/entities/
├── YaksaLicenseProfile.entity.ts
├── RequiredCoursePolicy.entity.ts
├── CreditRecord.entity.ts
├── YaksaCourseAssignment.entity.ts
└── index.ts
```

---

## Future Phases

### Phase 7: Integration Testing

- [ ] lms-core 이벤트 통합 테스트
- [ ] membership-yaksa 회원 정보 연동
- [ ] organization-core 조직 정보 연동
- [ ] E2E 테스트 작성

---

## Reference Documents

| Document | Path |
|----------|------|
| Work Order | `docs/plan/active/lms-yaksa-phase1-work-order.md` |
| App Spec | `docs/specs/lms-yaksa/` |
| Manifest Guide | `docs/app-guidelines/manifest-specification.md` |
| Extension Guide | `docs/app-guidelines/extension-app-guideline.md` |

---

## Entity Summary (Phase 1)

| Entity | Table | Purpose |
|--------|-------|---------|
| YaksaLicenseProfile | lms_yaksa_license_profiles | 약사 면허/자격 정보 |
| RequiredCoursePolicy | lms_yaksa_required_course_policies | 필수 교육 정책 |
| CreditRecord | lms_yaksa_credit_records | 연수 평점 기록 |
| YaksaCourseAssignment | lms_yaksa_course_assignments | 강좌 배정 |

---

## Notes

- lms-core의 Course/Enrollment 엔티티와 연동
- organization-core의 Organization 엔티티와 연동
- membership-yaksa와 선택적 연동 가능

---

*이 파일은 `docs/templates/APP_TODO_TEMPLATE.md`에서 복사하여 사용*
