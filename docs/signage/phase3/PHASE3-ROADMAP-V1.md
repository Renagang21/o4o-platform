# Digital Signage - Phase 3 Roadmap V1

> **Phase:** 3 Pre-Design
> **Status:** Draft
> **Date:** 2025-01-20

---

## 1. Overview

Phase 3는 산업별 확장앱(Extension Apps)을 개발하여
Digital Signage를 실제 비즈니스 가치로 연결하는 단계입니다.

---

## 2. Phase 3 목표

### 2.1 기술 목표

| Goal | Description |
|------|-------------|
| Extension Architecture | Core를 수정하지 않는 확장 구조 |
| Multi-Industry Support | 4개 산업 확장앱 지원 |
| Global Content V3 | Extension 콘텐츠 통합 |
| Operator Workspace V2 | 산업별 운영자 화면 |

### 2.2 비즈니스 목표

| Goal | Description |
|------|-------------|
| 약국 연계 | GlycoPharm/KPA 사이니지 |
| 화장품 연계 | K-Cosmetics 브랜드 콘텐츠 |
| 파트너 수익 | Neture 파트너 프로모션 |
| AI 콘텐츠 | 자동 콘텐츠 생성 |

---

## 3. Sprint Plan

### Sprint 3-1: Extension Foundation (2주)

**목표:** Extension 아키텍처 기반 구축

| Task | Description | Priority |
|------|-------------|----------|
| Extension Base | 공통 Extension 인터페이스 정의 | P0 |
| Schema Setup | Extension별 스키마 생성 | P0 |
| API Factory | Extension API 라우터 패턴 | P0 |
| Role Extension | Extension별 Role 추가 | P1 |

**산출물:**
- `packages/signage-extension-base/`
- Extension Router Factory
- Extension Role Middleware

---

### Sprint 3-2: Pharmacy Extension (3주)

**목표:** 약국 확장앱 MVP

| Task | Description | Priority |
|------|-------------|----------|
| Pharmacy Entities | Category, Seasonal, Template | P0 |
| Pharmacy API | CRUD + Global Content | P0 |
| Pharmacy Operator UI | Workspace 화면 | P1 |
| GlycoPharm 연동 | 기존 시스템 연결 | P1 |

**산출물:**
- `packages/signage-pharmacy-extension/`
- Pharmacy Operator Workspace
- GlycoPharm Integration

---

### Sprint 3-3: Cosmetics Extension (3주)

**목표:** 화장품 확장앱 MVP

| Task | Description | Priority |
|------|-------------|----------|
| Cosmetics Entities | Brand, Trend, Content | P0 |
| Cosmetics API | CRUD + Brand Content | P0 |
| Cosmetics Operator UI | Workspace 화면 | P1 |
| K-Cosmetics 연동 | 기존 시스템 연결 | P1 |

**산출물:**
- `packages/signage-cosmetics-extension/`
- Cosmetics Operator Workspace
- K-Cosmetics Brand Integration

---

### Sprint 3-4: Global Content V3 (2주)

**목표:** Extension 콘텐츠를 Global Flow에 통합

| Task | Description | Priority |
|------|-------------|----------|
| Source Extension | Extension source 타입 추가 | P0 |
| Store Browse | Extension 탭 UI | P0 |
| Clone Logic | Extension → Store clone | P1 |
| Player Merge | Extension 콘텐츠 Merge | P1 |

**산출물:**
- Global Content Flow V3 구현
- Store Dashboard Extension 탭
- Player Merge Logic V3

---

### Sprint 3-5: Seller Extension (2주)

**목표:** 파트너/셀러 확장앱

| Task | Description | Priority |
|------|-------------|----------|
| Seller Entities | Promo, Template, Analytics | P0 |
| Seller Portal | 파트너 편집 화면 | P0 |
| Self-Edit | 제한된 템플릿 편집 | P1 |
| Analytics | 성과 추적 | P2 |

**산출물:**
- `packages/signage-seller-extension/`
- Seller Portal UI
- Partner Analytics Dashboard

---

### Sprint 3-6: Tourist Extension (2주)

**목표:** 관광 확장앱 기초

| Task | Description | Priority |
|------|-------------|----------|
| Tourist Entities | Location, Event, Multilingual | P0 |
| AI Translation | 다국어 자동 번역 | P1 |
| Location Cards | 명소 카드 자동 생성 | P1 |
| Event Schedule | 행사 연동 | P2 |

**산출물:**
- `packages/signage-tourist-extension/`
- Multilingual Content System
- Location Card Generator

---

### Sprint 3-7: Integration & Polish (2주)

**목표:** 통합 테스트 및 안정화

| Task | Description | Priority |
|------|-------------|----------|
| Integration Test | 전체 Extension 통합 테스트 | P0 |
| Performance | 성능 최적화 | P1 |
| Documentation | 최종 문서화 | P1 |
| Phase 3 Release | 릴리즈 준비 | P0 |

**산출물:**
- Phase 3 Release Tag
- Complete Documentation
- Performance Report

---

## 4. Timeline

```
2025 Q1
├── Jan W3-W4: Sprint 3-1 (Foundation)
├── Feb W1-W3: Sprint 3-2 (Pharmacy)
└── Feb W4 ~ Mar W2: Sprint 3-3 (Cosmetics)

2025 Q2
├── Mar W3-W4: Sprint 3-4 (Global Content V3)
├── Apr W1-W2: Sprint 3-5 (Seller)
├── Apr W3-W4: Sprint 3-6 (Tourist)
└── May W1-W2: Sprint 3-7 (Integration)
```

---

## 5. 우선순위 매트릭스

### 5.1 Extension 우선순위

| Priority | Extension | Reason |
|----------|-----------|--------|
| 1 | Pharmacy | GlycoPharm/KPA 즉시 연계 가능 |
| 2 | Cosmetics | K-Cosmetics 서비스 연계 |
| 3 | Seller | Neture 파트너 수익 모델 |
| 4 | Tourist | 추후 확장 (낮은 긴급도) |

### 5.2 기능 우선순위

| Priority | Feature | Impact |
|----------|---------|--------|
| P0 | Extension Base | 모든 Extension 기반 |
| P0 | Pharmacy MVP | 첫 번째 실증 |
| P1 | Global Content V3 | Store 사용성 |
| P1 | Seller Portal | 수익 모델 |
| P2 | AI Features | 차별화 요소 |

---

## 6. 의존성 그래프

```
Extension Base
     │
     ├──► Pharmacy Extension
     │         │
     │         └──► GlycoPharm Integration
     │
     ├──► Cosmetics Extension
     │         │
     │         └──► K-Cosmetics Integration
     │
     ├──► Seller Extension
     │         │
     │         └──► Neture Partner Integration
     │
     └──► Tourist Extension
               │
               └──► AI Translation
```

---

## 7. 리스크 관리

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Core 수정 필요 | Medium | High | Boundary 철저 준수 |
| 기존 시스템 연동 복잡 | High | Medium | Adapter 패턴 사용 |
| AI 비용 증가 | Medium | Medium | 사용량 제한 설정 |
| 일정 지연 | Medium | Medium | MVP 범위 조정 |

---

## 8. 성공 지표

### 8.1 기술 지표

| Metric | Target |
|--------|--------|
| Extension 개발 시간 | 각 3주 이내 |
| Core 변경 | 0건 |
| Test Coverage | >80% |
| Build Time | <3분 |

### 8.2 비즈니스 지표

| Metric | Target |
|--------|--------|
| 약국 도입 | 10개소 |
| 화장품 브랜드 연동 | 5개 |
| 파트너 콘텐츠 | 50개 |
| 콘텐츠 노출 | 10만 회/월 |

---

## 9. Phase 3 완료 조건

- [ ] 4개 Extension 모두 MVP 완료
- [ ] Global Content V3 구현 완료
- [ ] Operator Workspace V2 구현 완료
- [ ] 통합 테스트 통과
- [ ] 문서화 완료
- [ ] Tag: `v3.0.0-signage-phase3`

---

## 10. Phase 4 Preview

Phase 3 완료 후 고려 사항:

| Area | Description |
|------|-------------|
| Multi-Display | 동기화 재생 |
| Advanced Analytics | ML 기반 인사이트 |
| Real-time Sync | WebSocket 연동 |
| External CMS | 외부 시스템 연동 |
| Video Encoding | 서버 측 인코딩 |

---

## 11. Work Order 연결

| WO | Status | Description |
|----|--------|-------------|
| WO-SIGNAGE-PHASE2-FINALIZATION-V1 | ✅ Complete | Phase 2 종료 |
| WO-SIGNAGE-PHASE3-PRE-DESIGN-V1 | 🔄 Current | 사전 설계 |
| WO-SIGNAGE-PHASE3-DESIGN-V1 | 📋 Next | 정식 설계 |
| WO-SIGNAGE-PHASE3-SPRINT-3-1-V1 | 📋 Planned | Foundation |

---

*Document: PHASE3-ROADMAP-V1.md*
*Phase 3 Pre-Design*
