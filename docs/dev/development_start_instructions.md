# Phase 18 Development Start Instructions

> O4O Platform 개발 착수를 위한 안내 문서
>
> 작성일: 2025-12-10
> 작성자: Claude Code Agent
> 대상: Claude Code 세션 및 개발팀

---

## 1. Purpose (목적)

이 문서는 Phase 17 완료 후 Phase 18 개발을 시작하기 위한 **진입점 문서**입니다.

새로운 Claude Code 세션 또는 개발자가 작업을 시작할 때:
1. 현재 상태 파악
2. 작업 대상 앱 선택
3. TODO.md 기반 개발 진행

---

## 2. Current Status Summary (현재 상태 요약)

### 2.1 Phase 17 완료 사항

| GAP ID | 제목 | 해결 내용 |
|--------|------|-----------|
| HP-001 | ViewSystem 미구현 | ViewRegistry, NavigationRegistry, DynamicRouter 구현 완료 |
| HP-002 | PartnerOps 서비스 파일 누락 | 6개 서비스 완전 구현 (DataSource 주입 패턴) |
| HP-003 | SellerOps Entity 필드 불일치 | 필드명 동기화, ListingStatus enum 전환 완료 |

### 2.2 Phase 18 개발 가능 상태

- **High Priority GAP**: 모두 해결됨 (3/3)
- **빌드 상태**: 정상 (Node.js 22.18.0 기준)
- **개발 착수**: 가능

---

## 3. App-Specific Start Instructions

### 3.1 CMS-Core (`packages/cms-core`)

**TODO 파일**: `packages/cms-core/TODO.md`

**현재 상태**:
- ViewSystem 완성 (ViewRegistry, NavigationRegistry, DynamicRouter)
- Manifest ↔ ViewSystem 연결 완료
- Lifecycle hooks 연동 완료

**Phase 18 작업 항목**:
| Phase | 작업 |
|-------|------|
| 18-A | Service 구현 (Template, Cpt, Acf, Menu, Media, Settings) |
| 18-B | Controller & API 구현 |
| 18-C | View 연동 및 통합 테스트 |

**참조 문서**:
- `docs/specs/cms/cms-cpt-overview.md`
- `docs/design/architecture/view-system.md`
- `docs/app-guidelines/manifest-specification.md`

---

### 3.2 SellerOps (`packages/sellerops`)

**TODO 파일**: `packages/sellerops/TODO.md`

**현재 상태**:
- Entity/DTO 정합성 완료 (HP-003 해결)
- `supplierPrice`, `stockQuantity`, `ListingStatus` 적용됨
- Manifest 표준화 완료

**Phase 18 작업 항목**:
| Phase | 작업 |
|-------|------|
| 18-A | API 구현 (listings, orders, settlement, dashboard) |
| 18-B | Service 비즈니스 로직 완성 |
| 18-C | Event Handler 검증 |

**참조 문서**:
- `docs/specs/sellerops/sellerops-api.md`
- `docs/specs/sellerops/sellerops-entities.md`
- `docs/specs/dropshipping/`

---

### 3.3 PartnerOps (`packages/partnerops`)

**TODO 파일**: `packages/partnerops/TODO.md`

**현재 상태**:
- 6개 서비스 완전 구현 (HP-002 해결)
- Controller-Service 시그니처 정합성 완료
- Event handlers 연결됨

**Phase 18 작업 항목**:
| Phase | 작업 |
|-------|------|
| 18-A | API 완전 구현 (routines, links, conversions, settlement, dashboard, profile) |
| 18-B | Service 비즈니스 로직 보강 |
| 18-C | Event Integration 검증 |

**참조 문서**:
- `docs/specs/partnerops/partnerops-api.md`
- `docs/specs/partnerops/partnerops-entities.md`
- `docs/specs/dropshipping/`

---

## 4. Document Reference Paths

### 4.1 핵심 참조 문서

| 문서 유형 | 경로 |
|-----------|------|
| GAP 분석 | `docs/dev/phase14_gap_analysis.md` |
| 앱 개발 가이드 | `docs/app-guidelines/` |
| 스펙 문서 | `docs/specs/{app-id}/` |
| 아키텍처 | `docs/design/architecture/` |
| 용어집 | `docs/reference/glossary.md` |

### 4.2 앱별 스펙 문서

| 앱 | 스펙 경로 |
|----|-----------|
| CMS | `docs/specs/cms/` |
| SellerOps | `docs/specs/sellerops/` |
| PartnerOps | `docs/specs/partnerops/` |
| SupplierOps | `docs/specs/supplierops/` |
| Dropshipping | `docs/specs/dropshipping/` |

---

## 5. Development Principles (CLAUDE.md 규칙)

### 5.1 필수 준수 사항

1. **TODO 기반 개발**: 항상 `packages/<app>/TODO.md`를 최우선 기준으로 진행
2. **Manifest 필수 구조**: meta, dependencies, cms, backend, navigation 섹션 포함
3. **Backend 필수 Export**: `createRoutes`, `entities`, `services` export
4. **View 구조 규칙**: Next.js page 금지, View Component 기반으로만 구성

### 5.2 의존성 규칙

| 허용 | 금지 |
|------|------|
| Core → Core | Core → Extension |
| Extension → Core | Core → Service |
| Service → Core | Extension → Service |
| Service → Extension | Service → Service |

**api-server 직접 import 절대 금지**

### 5.3 Schema 규칙

- **Migration-First**: Entity 변경 전 migration 먼저 생성
- **Core Entity 수정 금지**: Extension/Service에서 Core entity 변경 불가

---

## 6. Quick Start Checklist

새 세션에서 개발 시작 시:

```
□ 1. 이 문서(development_start_instructions.md) 읽기
□ 2. 작업할 앱 선택 (cms-core / sellerops / partnerops)
□ 3. 해당 앱의 TODO.md 확인
□ 4. 관련 스펙 문서 확인 (docs/specs/{app-id}/)
□ 5. CLAUDE.md 규칙 숙지
□ 6. 개발 착수
```

---

## 7. Medium/Low Priority GAP (참고)

Phase 18 이후 해결 대상:

| 우선순위 | ID | 제목 | 상태 |
|----------|-----|------|------|
| Medium | MP-001 | cms-core CPT 스펙 문서 부족 | 미착수 |
| Medium | MP-002 | ModuleLoader vs AppManager 역할 중복 | 미착수 |
| Medium | MP-003 | Multi-tenancy 미완성 | 미착수 |
| Low | LP-001 | GraphQL 미지원 | 미착수 |
| Low | LP-002 | API 버저닝 전략 부재 | 미착수 |
| Low | LP-003 | lms-core 스펙 상세 부족 | 미착수 |

---

## 8. Contact & Escalation

문제 발생 시:
- GAP 분석 문서 참조: `docs/dev/phase14_gap_analysis.md`
- 아키텍처 질문: `docs/design/architecture/` 참조
- 스펙 불일치: `docs/specs/` 해당 앱 디렉토리 확인

---

**문서 버전**: 1.0.0
**최종 수정**: 2025-12-10
**Phase**: 18 (개발 착수)
