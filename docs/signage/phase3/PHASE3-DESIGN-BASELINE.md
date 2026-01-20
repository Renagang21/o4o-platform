# Digital Signage - Phase 3 Design Baseline

> **Phase:** 3 Design
> **Status:** BASELINE
> **Date:** 2025-01-20
> **Authority:** 이 문서는 Phase 3 개발의 최상위 기준선입니다

---

## 1. 문서 상태

| Status | Description |
|--------|-------------|
| **BASELINE** | Phase 3 설계 완료, 개발 진입 가능 |

---

## 2. Phase 3 설계 완료 선언

본 문서는 다음을 선언합니다:

> **Digital Signage Phase 3의 모든 설계가 완료되었으며,
> 이후 개발 단계에서는 설계 재논의 없이 구현을 진행합니다.**

---

## 3. 설계 문서 목록

### 3.1 Phase 3 Design Documents (FROZEN)

| Document | Description | Status |
|----------|-------------|--------|
| [EXTENSION-BOUNDARIES-V3.md](./EXTENSION-BOUNDARIES-V3.md) | Extension 책임/경계 확정 | FROZEN |
| [EXTENSION-ENTITY-DESIGN-V1.md](./EXTENSION-ENTITY-DESIGN-V1.md) | Entity 설계 확정 | FROZEN |
| [EXTENSION-API-CONTRACT-V1.md](./EXTENSION-API-CONTRACT-V1.md) | API 계약 확정 | FROZEN |
| [OPERATOR-WORKSPACE-V3.md](./OPERATOR-WORKSPACE-V3.md) | Operator UI 설계 확정 | FROZEN |
| [GLOBAL-CONTENT-FLOW-V4.md](./GLOBAL-CONTENT-FLOW-V4.md) | Global Flow 계약 확정 | FROZEN |

### 3.2 Phase 3 Pre-Design Documents (Reference)

| Document | Description |
|----------|-------------|
| [EXTENSION-BOUNDARIES-V2.md](./EXTENSION-BOUNDARIES-V2.md) | 초기 경계 정의 |
| [EXTENSION-ENTITY-PRELIMINARY-DRAFT.md](./EXTENSION-ENTITY-PRELIMINARY-DRAFT.md) | Entity 초안 |
| [GLOBAL-CONTENT-FLOW-V3.md](./GLOBAL-CONTENT-FLOW-V3.md) | Flow 초안 |
| [OPERATOR-WORKSPACE-V2.md](./OPERATOR-WORKSPACE-V2.md) | UI 초안 |
| [PHASE3-ROADMAP-V1.md](./PHASE3-ROADMAP-V1.md) | 스프린트 계획 |

---

## 4. 확정된 Extension 목록

| Priority | Extension | Status | 연계 서비스 |
|----------|-----------|--------|------------|
| P1 | signage-pharmacy-extension | 개발 준비 완료 | GlycoPharm/KPA |
| P2 | signage-cosmetics-extension | 개발 준비 완료 | K-Cosmetics |
| P3 | signage-seller-promo-extension | 개발 준비 완료 | Neture Partner |
| P4 | signage-tourist-extension | 설계만 (구현 보류) | - |

---

## 5. 핵심 설계 결정 요약

### 5.1 Core 불변 원칙

```
✅ CONFIRMED:
- Phase 2 Core Entity/API는 수정하지 않는다
- Extension은 Core를 사용만 한다
- Extension 간 의존은 금지한다
```

### 5.2 Force 권한

```
✅ CONFIRMED:
- Force 허용: hq, pharmacy-hq
- Force 불허: supplier, community, cosmetics-brand, seller-partner, tourism-authority
```

### 5.3 스키마 분리

```
✅ CONFIRMED:
- Core: public schema
- Pharmacy: signage_pharmacy schema
- Cosmetics: signage_cosmetics schema
- Seller: signage_seller schema
- Tourist: signage_tourist schema
```

### 5.4 API 경로

```
✅ CONFIRMED:
- Core: /api/signage/:serviceKey/...
- Extension: /api/signage/:serviceKey/ext/{extension}/...
```

### 5.5 Global Content Merge 순서

```
✅ CONFIRMED:
1. Core Forced (hq)
2. Extension Forced (pharmacy-hq)
3. Core Global (hq, supplier, community)
4. Extension Global
5. Store Content
```

---

## 6. 개발 진입 조건 충족

### 6.1 설계 체크리스트

- [x] Extension 4개 책임 경계 확정
- [x] Extension Entity 설계 완료
- [x] Extension API 계약 완료
- [x] Operator Workspace UI 설계 완료
- [x] Global Content Flow 계약 완료
- [x] Core ↔ Extension 경계 논쟁 여지 제거
- [x] Force/Clone 규칙 확정

### 6.2 개발 준비 상태

| Area | Status |
|------|--------|
| Entity 설계 | ✅ Ready |
| API 계약 | ✅ Ready |
| UI 설계 | ✅ Ready |
| Flow 계약 | ✅ Ready |
| Role 정의 | ✅ Ready |

---

## 7. 다음 단계: Phase 3 Development

### 7.1 개발 Work Order 순서

| Order | Work Order | Description |
|-------|------------|-------------|
| 1 | WO-SIGNAGE-PHASE3-DEV-FOUNDATION | Extension Base 구현 |
| 2 | WO-SIGNAGE-PHASE3-DEV-PHARMACY | Pharmacy Extension 구현 |
| 3 | WO-SIGNAGE-PHASE3-DEV-COSMETICS | Cosmetics Extension 구현 |
| 4 | WO-SIGNAGE-PHASE3-DEV-SELLER | Seller Extension 구현 |
| 5 | WO-SIGNAGE-PHASE3-DEV-INTEGRATION | 통합 테스트 |

### 7.2 예상 스프린트

```
Sprint 3-1: Foundation (2주)
Sprint 3-2: Pharmacy (3주)
Sprint 3-3: Cosmetics (3주)
Sprint 3-4: Global Content V3 (2주)
Sprint 3-5: Seller (2주)
Sprint 3-6: Tourist (2주, optional)
Sprint 3-7: Integration (2주)
```

---

## 8. 변경 관리

### 8.1 설계 변경 절차

설계 변경이 필요한 경우:

1. 변경 필요성 문서화
2. 영향도 분석 (Core 영향, 다른 Extension 영향)
3. Work Order 작성 (WO-SIGNAGE-DESIGN-CHANGE-*)
4. 승인 후 설계 문서 수정
5. 관련 개발 Work Order 조정

### 8.2 변경 금지 항목

다음은 Phase 3 개발 중 변경할 수 없습니다:

- Core Entity/API
- Extension 간 의존 금지 규칙
- Force 허용 Source 목록
- 스키마 분리 정책
- API 경로 패턴

---

## 9. 참조 문서

### 9.1 Phase 2 Baseline

- [PHASE2-BASELINE-V2.md](../baseline/PHASE2-BASELINE-V2.md)
- [SIGNAGE-PHASE2-DEPLOY-CHECKLIST.md](../SIGNAGE-PHASE2-DEPLOY-CHECKLIST.md)

### 9.2 플랫폼 문서

- [CLAUDE.md](../../../../CLAUDE.md) - 플랫폼 헌법
- [E-COMMERCE-ORDER-CONTRACT.md](../../../../docs/_platform/E-COMMERCE-ORDER-CONTRACT.md)

---

## 10. 서명

### Phase 3 Design 완료 확인

| Role | Signature | Date |
|------|-----------|------|
| Design Lead | [Auto-generated] | 2025-01-20 |
| Tech Lead | | |
| Product Owner | | |

---

## 11. 마지막 확인

> **Phase 3 설계가 완료되었습니다.**
>
> 이제 WO-SIGNAGE-PHASE3-DEV-* Work Order를 통해
> 실제 구현을 시작할 수 있습니다.
>
> 설계 문서는 FROZEN 상태이며,
> 개발 중 설계 변경이 필요한 경우 별도 Work Order가 필요합니다.

---

*Document: PHASE3-DESIGN-BASELINE.md*
*Status: BASELINE*
*Phase 3 Design Complete*
