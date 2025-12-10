# Dropshipping-Cosmetics – Development TODO

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

### ACF Fields

- [x] Cosmetics metadata (skinType, concerns, ingredients, certifications)
- [x] Influencer routine metadata

### Shortcodes

- [x] cosmetics-product
- [x] cosmetics-products-list
- [x] cosmetics-recommendations

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
| Dropshipping Spec | `docs/specs/dropshipping/` |

---

## Notes

- dropshipping-core 확장 앱
- 화장품 전용 메타데이터 및 필터링 기능

---

*이 파일은 `docs/templates/APP_TODO_TEMPLATE.md`에서 복사하여 사용*
