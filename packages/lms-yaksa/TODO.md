# LMS-Yaksa – Development TODO

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent

---

## Current Phase: Initial Setup

### Pending

- [ ] Create Entity classes (EducationCredit, TrainingProgram, EducationHistory, CertificateTemplate)
- [ ] Add TypeORM decorators and relations
- [ ] Create migration files
- [ ] Implement EducationCreditService
- [ ] Implement TrainingProgramService
- [ ] Implement CertificateService
- [ ] Create API routes with createRoutes factory
- [ ] Add controllers for admin/member endpoints

### In Progress

- [ ] Basic package structure setup

### Completed (이번 Phase)

- [x] package.json 생성
- [x] tsconfig.json 생성
- [x] manifest.ts 표준 형식으로 생성
- [x] Lifecycle hooks 기본 구현
- [x] Backend export 구조 설정
- [x] Types 정의

---

## Future Phases

### Phase 2: Backend Implementation

- [ ] Entity 완전 구현
- [ ] Service 로직 구현
- [ ] Controller 구현
- [ ] Routes 구현 (Express Router factory)

### Phase 3: Admin UI

- [ ] 대시보드 컴포넌트
- [ ] 연수 프로그램 관리 페이지
- [ ] 학점 관리 페이지

### Phase 4: Member UI

- [ ] 내 교육 현황 페이지
- [ ] 교육 이력 페이지
- [ ] 이수증 출력 기능

### Phase 5: Integration

- [ ] membership-yaksa 연동 (회원 교육 이력)
- [ ] lms-core 연동 (코스/레슨 연결)

---

## Reference Documents

| Document | Path |
|----------|------|
| App Spec | `docs/specs/lms-yaksa/` (TBD) |
| Manifest Guide | `docs/app-guidelines/manifest-specification.md` |
| Backend Guide | `docs/app-guidelines/backend-structure.md` |
| Extension Guide | `docs/app-guidelines/extension-app-guideline.md` |

---

## Notes

- lms-core의 코스/레슨 기능을 확장하는 Extension App
- 약사회 보수교육 학점 관리가 핵심 기능
- membership-yaksa와 연동하여 회원별 교육 이력 관리

---

*이 파일은 `docs/templates/APP_TODO_TEMPLATE.md`에서 복사하여 사용*
