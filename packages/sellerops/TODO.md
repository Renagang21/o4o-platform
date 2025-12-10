# SellerOps – Development TODO (Phase 18 Reset)

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent
> Phase 17 완료 후 개발 시작점 재정의

---

## 1. 완성된 기반 (Resolved Issues - Phase 16 & 17)

### Entity & DTO Alignment (HP-003 해결됨)
- [x] `supplyPrice` → `supplierPrice` 필드명 동기화
- [x] `stock` → `stockQuantity` 필드명 동기화
- [x] `isActive: boolean` → `status: ListingStatus` enum 변환
- [x] SettlementBatch entity 업데이트 (sellerId, netAmount 추가)
- [x] API Controller/Service 레이어 정합성 완료
- [x] Frontend 컴포넌트 필드 참조 수정 완료

### Manifest & Lifecycle
- [x] Manifest 표준화 (appId, displayName, appType, dependencies.core)
- [x] Lifecycle 형식 변경 (onInstall → install)
- [x] Backend 섹션 추가
- [x] createRoutes 함수 추가

---

## 2. 착수할 개발 항목 (Next Actions)

### Phase 18-A: API 구현
- [ ] listings API 완전 구현 (`specs/sellerops/api.md` 기준)
- [ ] orders API 완전 구현
- [ ] settlement API 완전 구현
- [ ] dashboard API 완전 구현

### Phase 18-B: Service Logic
- [ ] ListingOpsService 비즈니스 로직 완성
- [ ] OrderOpsService 비즈니스 로직 완성
- [ ] SettlementOpsService 비즈니스 로직 완성
- [ ] DashboardService 비즈니스 로직 완성
- [ ] SupplierOpsService 비즈니스 로직 완성

### Phase 18-C: Event Handlers
- [ ] order.created 이벤트 처리 검증
- [ ] settlement.created 이벤트 처리 검증
- [ ] listing.status_changed 이벤트 처리 검증

---

## 3. 테스트

### 단위 테스트
- [ ] ListingOpsService 테스트
- [ ] OrderOpsService 테스트
- [ ] SettlementOpsService 테스트

### 통합 테스트
- [ ] lifecycle.activate 테스트
- [ ] manifest.ts 기반 로딩 테스트
- [ ] API 엔드포인트 E2E 테스트

---

## 4. Reference Documents

| Document | Path |
|----------|------|
| SellerOps API Spec | `docs/specs/sellerops/sellerops-api.md` |
| SellerOps Entity Spec | `docs/specs/sellerops/sellerops-entities.md` |
| Manifest Guide | `docs/app-guidelines/manifest-specification.md` |
| Extension App Guide | `docs/app-guidelines/extension-app-guideline.md` |
| Dropshipping Spec | `docs/specs/dropshipping/` |

---

## 5. Notes

- dropshipping-core 확장 앱
- 범용 판매자 운영 기능 (공급자 승인, Offer 선택, 리스팅, 주문, 정산)
- Phase 17에서 Entity/DTO 정합성 완료됨

---

*Phase 18 개발 시작점으로 Reset됨 (2025-12-10)*
