# Cosmetics-Store – Development TODO

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent

---

## Current Phase: Initial Setup

### Pending

- [ ] Create Entity classes (Order, OrderItem, Cart, CartItem, Payment, Shipment)
- [ ] Add TypeORM decorators and relations
- [ ] Create migration files
- [ ] Implement CatalogService (상품 조회, dropshipping-cosmetics 연동)
- [ ] Implement CartService (장바구니 CRUD)
- [ ] Implement OrderService (주문 생성/처리)
- [ ] Implement PaymentService (결제 연동)
- [ ] Implement ShipmentService (배송 추적)
- [ ] Create API routes with createRoutes factory
- [ ] Add controllers

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
- [ ] Routes 구현

### Phase 3: Admin UI

- [ ] 대시보드 (매출, 주문 현황)
- [ ] 주문 관리 페이지
- [ ] 쇼핑몰 설정 페이지

### Phase 4: Public Store Frontend

- [ ] 상품 목록/상세 페이지
- [ ] 장바구니 페이지
- [ ] 결제 페이지
- [ ] 주문 내역 페이지

### Phase 5: Payment Integration

- [ ] PG사 연동 (이니시스/토스페이먼츠/카카오페이)
- [ ] 가상계좌 처리
- [ ] 환불 처리

### Phase 6: Shipping Integration

- [ ] 배송 조회 API 연동
- [ ] 배송 추적 알림

---

## Reference Documents

| Document | Path |
|----------|------|
| App Spec | `docs/specs/cosmetics-store/` (TBD) |
| Manifest Guide | `docs/app-guidelines/manifest-specification.md` |
| Backend Guide | `docs/app-guidelines/backend-structure.md` |
| Service App Guide | `docs/app-guidelines/service-app-guideline.md` |

---

## Notes

- dropshipping-cosmetics와 연동하여 상품 정보 조회
- 결제/배송은 외부 서비스 연동 필요
- Service App이므로 다른 앱에서 의존하지 않음

---

*이 파일은 `docs/templates/APP_TODO_TEMPLATE.md`에서 복사하여 사용*
