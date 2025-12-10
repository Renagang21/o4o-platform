# Dropshipping-Core – Development TODO

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
- [x] Lifecycle 형식 변경 (onInstall → install)
- [x] createRoutes 함수 추가
- [x] TODO.md 생성

---

## Existing Implementation

### Entities

- [x] Supplier
- [x] Seller
- [x] ProductMaster
- [x] SupplierProductOffer
- [x] SellerListing
- [x] OrderRelay
- [x] SettlementBatch
- [x] CommissionRule
- [x] CommissionTransaction

### Services

- [x] SupplierService
- [x] SellerService
- [x] ProductService
- [x] OrderRelayService
- [x] SettlementService
- [x] CommissionService

### Controllers

- [x] SupplierController
- [x] SellerController
- [x] ProductController
- [x] OrderController
- [x] SettlementController

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

### Phase 4: Admin UI

- [ ] 공급사 관리 페이지
- [ ] 판매자 관리 페이지
- [ ] 상품 관리 페이지
- [ ] 주문/정산 대시보드

---

## Reference Documents

| Document | Path |
|----------|------|
| Manifest Guide | `docs/app-guidelines/manifest-specification.md` |
| Core App Guide | `docs/app-guidelines/core-app-development.md` |
| Backend Guide | `docs/app-guidelines/backend-structure.md` |
| Dropshipping Spec | `docs/specs/dropshipping/` |

---

## Notes

- dropshipping-cosmetics 등 Extension App들이 이 Core에 의존
- 정산/수수료 시스템 포함

---

*이 파일은 `docs/templates/APP_TODO_TEMPLATE.md`에서 복사하여 사용*
