# PartnerOps – Development TODO (Phase 18 Reset)

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent
> Phase 17 완료 후 개발 시작점 재정의

---

## 1. 완성된 기반 (Resolved Issues - Phase 16 & 17)

### Service Layer Completion (HP-002 해결됨)
- [x] DashboardService 구현 (DataSource 주입 패턴)
- [x] ProfileService 구현 (파트너 프로필 CRUD)
- [x] RoutineService 구현 (루틴 CRUD)
- [x] LinkService 구현 (제휴 링크 관리, 클릭 기록)
- [x] ConversionService 구현 (전환 추적, 퍼널 분석)
- [x] SettlementService 구현 (정산 요약/배치/트랜잭션)

### Controller-Service Integration
- [x] 모든 Controller → Service 시그니처 정합성 완료
- [x] tenantId 기반 멀티테넌시 지원
- [x] Event handlers 연결 (order.created, commission.applied, settlement.closed)

### Manifest & Lifecycle
- [x] Manifest 표준화 (appId, displayName, appType, dependencies.core)
- [x] Backend 섹션 추가
- [x] createRoutes 함수 구현

---

## 2. 착수할 개발 항목 (Next Actions)

### Phase 18-A: API 구현
- [ ] routines API 완전 구현 (`specs/partnerops/partnerops-api.md` 기준)
- [ ] links API 완전 구현
- [ ] conversions API 완전 구현
- [ ] settlement API 완전 구현
- [ ] dashboard API 완전 구현
- [ ] profile API 완전 구현

### Phase 18-B: Service Logic 보강
- [ ] RoutineService 비즈니스 로직 완성
- [ ] LinkService 클릭 추적 로직 강화
- [ ] ConversionService 퍼널 분석 로직 완성
- [ ] SettlementService 정산 처리 로직 완성

### Phase 18-C: Event Integration
- [ ] order.created → conversion 자동 생성 검증
- [ ] commission.applied → conversion 상태 업데이트 검증
- [ ] settlement.closed → 지급 완료 처리 검증

---

## 3. 테스트

### 단위 테스트
- [ ] DashboardService 테스트
- [ ] ProfileService 테스트
- [ ] RoutineService 테스트
- [ ] LinkService 테스트
- [ ] ConversionService 테스트
- [ ] SettlementService 테스트

### 통합 테스트
- [ ] lifecycle.activate 테스트
- [ ] manifest.ts 기반 로딩 테스트
- [ ] API 엔드포인트 E2E 테스트
- [ ] Event handler 통합 테스트

---

## 4. Reference Documents

| Document | Path |
|----------|------|
| PartnerOps API Spec | `docs/specs/partnerops/partnerops-api.md` |
| PartnerOps Entity Spec | `docs/specs/partnerops/partnerops-entities.md` |
| Manifest Guide | `docs/app-guidelines/manifest-specification.md` |
| Extension App Guide | `docs/app-guidelines/extension-app-guideline.md` |
| Dropshipping Spec | `docs/specs/dropshipping/` |

---

## 5. Notes

- dropshipping-core 확장 앱
- 파트너/제휴 마케팅 운영 기능 (루틴, 링크 추적, 전환 분석, 커미션 정산)
- Phase 17에서 Service Layer 완전 구현됨

---

*Phase 18 개발 시작점으로 Reset됨 (2025-12-10)*
