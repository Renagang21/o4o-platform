# Forum-App (Forum-Core) – Development TODO

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
- [x] createRoutes 함수 추가
- [x] TODO.md 생성

---

## Existing Implementation

### Entities

- [x] ForumPost
- [x] ForumCategory
- [x] ForumComment
- [x] ForumTag
- [x] ForumLike
- [x] ForumBookmark

### Services

- [x] ForumService (기본 구현)
- [ ] PostService (구현 필요)
- [ ] CategoryService (구현 필요)
- [ ] CommentService (구현 필요)

### Controllers

- [x] ForumController (기본 구현)

### Lifecycle

- [x] install
- [x] activate
- [x] deactivate
- [x] uninstall

### Public Templates

- [x] ForumHome
- [x] PostList
- [x] PostSingle
- [x] CategoryArchive

---

## Future Phases

### Phase 2: Routes Implementation

- [ ] Express Router 기반 실제 라우트 구현
- [ ] Controller 메서드와 라우트 연결
- [ ] 권한 미들웨어 적용

### Phase 3: Testing

- [ ] Unit tests for services
- [ ] Integration tests for API endpoints

### Phase 4: Admin UI

- [ ] 게시글 관리 페이지
- [ ] 카테고리 관리 페이지
- [ ] 신고 관리 페이지

---

## Reference Documents

| Document | Path |
|----------|------|
| Manifest Guide | `docs/app-guidelines/manifest-specification.md` |
| Core App Guide | `docs/app-guidelines/core-app-development.md` |
| Backend Guide | `docs/app-guidelines/backend-structure.md` |

---

## Notes

- forum-yaksa, forum-cosmetics 등 Extension App들이 이 Core에 의존
- Public 템플릿 시스템 제공

---

*이 파일은 `docs/templates/APP_TODO_TEMPLATE.md`에서 복사하여 사용*
