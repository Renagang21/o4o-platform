# LMS-Yaksa – Development TODO

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent

---

## Current Phase: Phase 1 - Entity Design (Completed)

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

## Next Phase: Phase 2 - Services Implementation

### Pending

- [ ] LicenseProfileService 구현
- [ ] RequiredCoursePolicyService 구현
- [ ] CreditRecordService 구현
- [ ] CourseAssignmentService 구현
- [ ] services/index.ts export 구성
- [ ] backend/index.ts services export 추가

### Service 요구사항

1. **LicenseProfileService**
   - 면허 정보 CRUD
   - 연간 평점 집계
   - 갱신 필요 여부 판단

2. **RequiredCoursePolicyService**
   - 정책 CRUD
   - 정책 적용 대상 조회
   - 필수 강좌 목록 관리

3. **CreditRecordService**
   - 평점 기록 CRUD
   - 연간 평점 집계
   - 코스 완료 시 자동 기록

4. **CourseAssignmentService**
   - 강좌 배정 CRUD
   - 완료 처리
   - 만료 처리
   - 정책 기반 자동 배정

---

## Future Phases

### Phase 3: API Routes

- [ ] /api/lms-yaksa/license-profiles
- [ ] /api/lms-yaksa/required-policies
- [ ] /api/lms-yaksa/credit-records
- [ ] /api/lms-yaksa/course-assignments

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
