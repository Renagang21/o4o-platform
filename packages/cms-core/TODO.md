# CMS-Core – Development TODO (Phase 18 Reset)

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent
> Phase 17 완료 후 개발 시작점 재정의

---

## 1. 완성된 기반 (Resolved Issues - Phase 16 & 17)

### View System Implementation (HP-001 해결됨)
- [x] ViewRegistry 완성 (registerView, getView, listViews, getViewsByCPT)
- [x] NavigationRegistry 완성 (registerNav, getNavTree, 권한 기반 필터링)
- [x] DynamicRouter 완성 (registerFromManifest, matchRoute, resolveView)
- [x] Manifest ↔ ViewSystem 연결 완료
- [x] activate 시 ViewSystem 자동 초기화
- [x] deactivate 시 ViewSystem 정리

### Manifest & Lifecycle
- [x] Manifest 표준화 (appId, displayName, appType)
- [x] viewTemplates 섹션 추가
- [x] navigation 섹션 추가
- [x] Backend 섹션 추가
- [x] createRoutes 함수 추가

### Entities
- [x] Template, TemplatePart, View
- [x] CptType, CptField
- [x] AcfFieldGroup, AcfField, AcfValue
- [x] CmsSetting
- [x] Menu, MenuItem, MenuLocation
- [x] Media, MediaFile, MediaFolder, MediaTag

---

## 2. 착수할 개발 항목 (Next Actions)

### Phase 18-A: Service 구현
- [ ] TemplateService 완전 구현
- [ ] CptService 완전 구현
- [ ] AcfService 완전 구현
- [ ] MenuService 완전 구현
- [ ] MediaService 완전 구현
- [ ] SettingsService 완전 구현

### Phase 18-B: Controller & API
- [ ] TemplateController 구현
- [ ] CptController 구현
- [ ] AcfController 구현
- [ ] MenuController 구현
- [ ] MediaController 구현
- [ ] createRoutes 실제 라우트 바인딩

### Phase 18-C: View 연동
- [ ] View 컴포넌트 등록 예제
- [ ] Dynamic Router 통합 테스트
- [ ] Navigation Tree 렌더링 검증

---

## 3. 테스트

### 단위 테스트
- [ ] ViewRegistry 테스트
- [ ] NavigationRegistry 테스트
- [ ] DynamicRouter 테스트
- [ ] Service 단위 테스트

### 통합 테스트
- [ ] lifecycle.activate 테스트
- [ ] manifest.ts 기반 로딩 테스트
- [ ] View-Route 매핑 E2E 테스트

---

## 4. Reference Documents

| Document | Path |
|----------|------|
| CMS Overview | `docs/specs/cms/cms-cpt-overview.md` |
| View System Design | `docs/design/architecture/view-system.md` |
| Manifest Guide | `docs/app-guidelines/manifest-specification.md` |
| Core App Guide | `docs/app-guidelines/core-app-development.md` |

---

## 5. Notes

- CMS 핵심 엔진 (템플릿, CPT, ACF, 메뉴, 미디어)
- View System은 Phase 17에서 완성됨
- 다른 앱에서 `registerAppToViewSystem()` 헬퍼 사용 가능

---

*Phase 18 개발 시작점으로 Reset됨 (2025-12-10)*
