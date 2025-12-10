# PartnerOps – Development TODO

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent

---

## Current Phase: CLAUDE.md Compliance

### Completed (이번 Phase)

- [x] Manifest 표준화 (appId, displayName, appType, dependencies.core)
- [x] Lifecycle 형식 변경 (onInstall → install)
- [x] Menus 섹션 추가 (표준 형식)
- [x] Backend 섹션 추가
- [x] Exposes 섹션 추가
- [x] TODO.md 생성

### Already Implemented

- [x] createRoutes 함수 (backend.ts)

### Pending

- [ ] Add unit tests

---

## Existing Implementation

### Services

- [x] DashboardService
- [x] ProfileService
- [x] RoutinesService
- [x] LinksService
- [x] ConversionsService
- [x] SettlementService

### Controllers

- [x] DashboardController
- [x] ProfileController
- [x] RoutinesController
- [x] LinksController
- [x] ConversionsController
- [x] SettlementController

### DTOs

- [x] PartnerProfileDto
- [x] PartnerRoutineDto
- [x] PartnerLinkDto
- [x] ConversionDto

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
- 파트너/제휴 마케팅 운영 기능 (루틴, 링크 추적, 전환 분석, 커미션 정산)

---

*이 파일은 `docs/templates/APP_TODO_TEMPLATE.md`에서 복사하여 사용*
