# Organization-Core – Development TODO

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent

---

## Current Phase: CLAUDE.md Compliance

### Pending

- [ ] Implement createRoutes with actual controller bindings
- [ ] Add migration files for entities
- [ ] Add unit tests for services

### In Progress

- [ ] CLAUDE.md compliance refactoring

### Completed (이번 Phase)

- [x] Manifest 표준화 (appId, displayName, appType, dependencies.core)
- [x] Backend 섹션 추가
- [x] Menus 섹션 추가
- [x] Exposes 섹션 추가
- [x] createRoutes 함수 추가 (placeholder)
- [x] TODO.md 생성

---

## Existing Implementation

### Entities
- [x] Organization
- [x] OrganizationMember
- [x] OrganizationUnit
- [x] OrganizationRole

### Services
- [x] OrganizationService
- [x] OrganizationMemberService

### Controllers
- [x] OrganizationController

### Lifecycle
- [x] install
- [x] activate
- [x] deactivate
- [x] uninstall

---

## Future Phases

### Phase 2: Routes Implementation

- [ ] Express Router 기반 실제 라우트 구현
- [ ] Controller 메서드와 라우트 연결
- [ ] 권한 미들웨어 적용

### Phase 3: Testing

- [ ] Unit tests for services
- [ ] Integration tests for API endpoints

---

## Reference Documents

| Document | Path |
|----------|------|
| Manifest Guide | `docs/app-guidelines/manifest-specification.md` |
| Core App Guide | `docs/app-guidelines/core-app-development.md` |
| Backend Guide | `docs/app-guidelines/backend-structure.md` |

---

## Notes

- 가장 많은 앱이 의존하는 Core App
- 변경 시 membership-yaksa, forum-yaksa, reporting-yaksa 등에 영향

---

*이 파일은 `docs/templates/APP_TODO_TEMPLATE.md`에서 복사하여 사용*
