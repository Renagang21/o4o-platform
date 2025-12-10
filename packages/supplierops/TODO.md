# SupplierOps – Development TODO

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent

---

## Current Phase: CLAUDE.md Compliance

### Completed (이번 Phase)

- [x] Manifest 표준화 (appId, displayName, appType, dependencies.core)
- [x] Lifecycle 형식 변경 (onInstall → install)
- [x] Menus 섹션 표준화 (menu → menus.admin/member)
- [x] Backend 섹션 추가
- [x] Exposes 섹션 추가
- [x] createRoutes 함수 추가
- [x] TODO.md 생성

### Pending

- [ ] Implement createRoutes with actual controller bindings
- [ ] Verify all lifecycle hooks work correctly
- [ ] Add unit tests

---

## Existing Implementation

### Services

- [x] SupplierOpsService (supplier dashboard, profile, products, offers, orders, settlement)

### Controllers

- [x] SupplierOpsController

### DTOs

- [x] SupplierOpsDashboardDto
- [x] SupplierOpsProfileDto

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
- 범용 공급자 운영 기능 (상품 관리, Offer 생성, 주문 Relay, 정산)

---

*이 파일은 `docs/templates/APP_TODO_TEMPLATE.md`에서 복사하여 사용*
