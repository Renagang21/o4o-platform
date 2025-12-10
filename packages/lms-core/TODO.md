# LMS-Core – Development TODO

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent

---

## Current Phase: CLAUDE.md Compliance

### Pending

- [ ] Implement createRoutes with actual controller bindings
- [ ] Add migration files for entities
- [ ] Add unit tests for services
- [ ] Implement CourseService
- [ ] Implement EnrollmentService
- [ ] Implement CertificateService

### In Progress

- [ ] CLAUDE.md compliance refactoring

### Completed (이번 Phase)

- [x] Manifest 표준화 (appId, displayName, appType, dependencies.core)
- [x] Backend 섹션 추가
- [x] Menus 섹션 추가 (admin + member)
- [x] Exposes 섹션 추가
- [x] Lifecycle 형식 변경 (onInstall → install)
- [x] createRoutes 함수 추가
- [x] TODO.md 생성

---

## Existing Implementation

### Entities

- [x] Course
- [x] Lesson
- [x] Enrollment
- [x] Progress
- [x] Certificate
- [x] LmsEvent
- [x] Attendance

### Services

- [ ] CourseService (구현 필요)
- [ ] LessonService (구현 필요)
- [ ] EnrollmentService (구현 필요)
- [ ] ProgressService (구현 필요)
- [ ] CertificateService (구현 필요)
- [ ] EventService (구현 필요)
- [ ] AttendanceService (구현 필요)

### Controllers

- [ ] CourseController (구현 필요)
- [ ] EnrollmentController (구현 필요)
- [ ] CertificateController (구현 필요)

### Lifecycle

- [x] install
- [x] activate
- [x] deactivate
- [x] uninstall

---

## Future Phases

### Phase 2: Services Implementation

- [ ] CourseService 완전 구현
- [ ] EnrollmentService 완전 구현
- [ ] CertificateService 완전 구현
- [ ] ProgressService 완전 구현

### Phase 3: Routes Implementation

- [ ] Express Router 기반 실제 라우트 구현
- [ ] Controller 메서드와 라우트 연결
- [ ] 권한 미들웨어 적용

### Phase 4: Testing

- [ ] Unit tests for services
- [ ] Integration tests for API endpoints

### Phase 5: Admin UI

- [ ] 과정 관리 페이지
- [ ] 등록/수강생 관리 페이지
- [ ] 수료증 관리 페이지
- [ ] 교육 일정 관리 페이지

---

## Reference Documents

| Document | Path |
|----------|------|
| Manifest Guide | `docs/app-guidelines/manifest-specification.md` |
| Core App Guide | `docs/app-guidelines/core-app-development.md` |
| Backend Guide | `docs/app-guidelines/backend-structure.md` |

---

## Notes

- lms-yaksa 등 Extension App들이 이 Core에 의존
- 수료증 발급 및 출석 관리 기능 포함

---

*이 파일은 `docs/templates/APP_TODO_TEMPLATE.md`에서 복사하여 사용*
