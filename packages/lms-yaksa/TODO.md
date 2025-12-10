# LMS-Yaksa – Development TODO

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent

---

## Current Phase: Phase 4 - LMS Core Hooks Integration (Completed)

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

### Phase 4: Admin UI

- [ ] LmsYaksaDashboard 컴포넌트
- [ ] RequiredCoursePolicyList 페이지
- [ ] CreditRecordList 페이지
- [ ] CourseAssignmentList 페이지
- [ ] LicenseProfileList 페이지

### Phase 5: Member UI

- [ ] MyEducationPage
- [ ] MyCreditHistory
- [ ] MyAssignments

### Phase 6: Integration

- [ ] lms-core Course 완료 이벤트 연동
- [ ] membership-yaksa 회원 정보 연동
- [ ] organization-core 조직 정보 연동

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
