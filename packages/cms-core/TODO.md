# CMS-Core – Development TODO

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent

---

## Current Phase: CLAUDE.md Compliance

### Pending

- [ ] Implement createRoutes with actual controller bindings
- [ ] Add migration files for entities
- [ ] Add unit tests for services
- [ ] Implement TemplateService
- [ ] Implement CptService
- [ ] Implement AcfService
- [ ] Implement MenuService
- [ ] Implement MediaService

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

- [x] Template
- [x] TemplatePart
- [x] View
- [x] CptType
- [x] CptField
- [x] AcfFieldGroup
- [x] AcfField
- [x] AcfValue
- [x] CmsSetting
- [x] Menu
- [x] MenuItem
- [x] MenuLocation
- [x] Media
- [x] MediaFile
- [x] MediaFolder
- [x] MediaTag

### Services

- [ ] TemplateService (정의만, 구현 필요)
- [ ] CptService (정의만, 구현 필요)
- [ ] AcfService (정의만, 구현 필요)
- [ ] MenuService (정의만, 구현 필요)
- [ ] MediaService (정의만, 구현 필요)
- [ ] SettingsService (정의만, 구현 필요)

### Controllers

- [ ] TemplateController (정의만, 구현 필요)
- [ ] CptController (정의만, 구현 필요)
- [ ] AcfController (정의만, 구현 필요)
- [ ] MenuController (정의만, 구현 필요)
- [ ] MediaController (정의만, 구현 필요)

### Lifecycle

- [x] install
- [x] activate
- [x] deactivate
- [x] uninstall

---

## Future Phases

### Phase 2: Services Implementation

- [ ] TemplateService 완전 구현
- [ ] CptService 완전 구현
- [ ] AcfService 완전 구현
- [ ] MenuService 완전 구현
- [ ] MediaService 완전 구현

### Phase 3: Controllers & Routes

- [ ] Controller 메서드 구현
- [ ] Express Router 기반 실제 라우트 구현
- [ ] 권한 미들웨어 적용

### Phase 4: Testing

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

- CMS의 핵심 기능 제공 (템플릿, CPT, ACF, 메뉴, 미디어)
- 다른 앱에서 템플릿 및 콘텐츠 관리에 활용

---

*이 파일은 `docs/templates/APP_TODO_TEMPLATE.md`에서 복사하여 사용*
