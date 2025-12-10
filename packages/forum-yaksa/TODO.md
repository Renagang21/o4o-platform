# Forum-Yaksa – Development TODO

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent

---

## Current Phase: CLAUDE.md Compliance

### Completed (이번 Phase)

- [x] Manifest 표준화 (appId, displayName, appType, dependencies.core)
- [x] Backend 섹션 추가
- [x] Menus 섹션 추가
- [x] Exposes 섹션 추가
- [x] createRoutes 함수 추가
- [x] TODO.md 생성

### Pending

- [ ] Implement createRoutes with actual controller bindings
- [ ] Add unit tests

---

## Existing Implementation

### Entities

- [x] YaksaForumCommunity
- [x] YaksaForumCommunityMember

### Services

- [x] YaksaForumService

### Lifecycle

- [x] install
- [x] activate
- [x] deactivate
- [x] uninstall

---

## Reference Documents

| Document | Path |
|----------|------|
| Manifest Guide | `docs/app-guidelines/manifest-specification.md` |
| Extension App Guide | `docs/app-guidelines/extension-app-guideline.md` |

---

## Notes

- forum-core 확장 앱
- 약사회 전용 포럼 기능 제공

---

*이 파일은 `docs/templates/APP_TODO_TEMPLATE.md`에서 복사하여 사용*
