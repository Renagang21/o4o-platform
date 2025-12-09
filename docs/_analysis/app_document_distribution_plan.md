# App 문서 분배 계획

> Document Organization Standard v1.0 기반
> 생성일: 2025-12-09

---

## 1. 현재 App 관련 문서 현황

### 1.1 식별된 App 도메인

| App ID | 유형 | 현재 문서 위치 | 문서 수 |
|--------|------|----------------|---------|
| dropshipping-core | Core | docs/apps/dropshipping/ | 6 |
| forum-core | Core | docs/apps/forum-core/, docs/dev/spec/ | 3 |
| cosmetics-store | Extension | docs/apps/cosmetics/ | 7 |
| cms-core | Core | docs/cms/ | 1 |
| cpt-acf | Core | docs/cpt-acf/ | 5 |
| organization-core | Core | docs/dev/design/organization-core/ | 8 |
| auth-core | Core | docs/reference/authentication/ | 20+ |
| blocks-core | Core | docs/reference/blocks/ | 11 |
| analytics-core | Core | docs/reference/analytics/ | 4 |
| payment-core | Core | docs/reference/payment/ | 2 |

---

## 2. 신규 specs/ 디렉토리 구조

```
docs/specs/
├── dropshipping/
│   ├── README.md              # 앱 개요
│   ├── api-contract.md        # API 계약
│   ├── db-inventory.md        # DB 구조
│   ├── investigation.md       # 조사 보고서
│   └── sprint-checklist.md    # 스프린트 체크리스트
│
├── forum/
│   ├── README.md
│   ├── app-structure.md       # 앱 구조
│   ├── phase1-investigation.md
│   └── cms-compatibility.md
│
├── cosmetics/
│   ├── README.md
│   ├── api-spec.md
│   ├── service-blueprint.md
│   ├── extension-manifest.md
│   ├── ui-wireframes.md
│   └── development-plan.md
│
├── cms/
│   ├── README.md
│   └── engine-spec.md
│
├── cpt-acf/
│   ├── README.md
│   ├── presets-spec.md
│   ├── route-matrix.md
│   └── investigation.md
│
├── organization/
│   ├── README.md
│   ├── core-overview.md
│   ├── api-design.md
│   ├── entities.md
│   ├── rbac-scope.md
│   ├── extension-rules.md
│   ├── lifecycle-hooks.md
│   └── integration-map.md
│
├── auth/
│   ├── README.md
│   ├── api-spec.md
│   ├── schema-design.md (-> design/로 이동)
│   ├── migration-guide.md
│   ├── oauth-integration.md
│   └── session-management.md
│
├── analytics/
│   ├── README.md
│   ├── api-spec.md
│   ├── kpis.md
│   └── validation.md
│
├── payment/
│   ├── README.md
│   └── gateway-design.md (-> design/로 이동)
│
└── blocks/
    ├── README.md
    ├── development.md
    ├── gallery-api.md
    ├── toolbar-standardization.md
    └── form-solution.md
```

---

## 3. app-guidelines/ 생성 계획

### 3.1 핵심 가이드라인 문서

```
docs/app-guidelines/
├── README.md                          # 가이드라인 개요
├── core-app-development.md            # Core App 개발 규칙
├── extension-app-guideline.md         # Extension App 개발 규칙
├── service-app-guideline.md           # Service App 개발 규칙
├── schema-drift-prevention.md         # Schema 드리프트 방지 (기존)
├── registry-architecture.md           # Registry 아키텍처 (기존)
├── cpt-acf-development.md             # CPT/ACF 개발 (기존)
├── cpt-registry.md                    # CPT Registry (기존)
├── appstore-build.md                  # AppStore 빌드 (기존)
├── extension-app-pattern.md           # Extension 패턴 (기존)
├── app-dependency-handling.md         # 의존성 처리 (기존)
├── manifest-specification.md          # Manifest 스펙 (신규)
└── refactoring-audit-guideline.md     # 리팩토링 감사 (신규)
```

### 3.2 신규 작성 필요 문서

| 문서명 | 설명 | 우선순위 |
|--------|------|----------|
| core-app-development.md | Core App 개발 규칙 정의 | 높음 |
| extension-app-guideline.md | Extension App 개발 규칙 | 높음 |
| service-app-guideline.md | Service App 개발 규칙 | 중간 |
| manifest-specification.md | App Manifest 상세 스펙 | 높음 |
| refactoring-audit-guideline.md | 리팩토링 감사 기준 | 중간 |

---

## 4. 문서 이동 매트릭스

### 4.1 dropshipping 문서

| 현재 위치 | 이동 위치 | 상태 |
|-----------|-----------|------|
| docs/apps/dropshipping/DS_API_CONTRACT_MATRIX.md | docs/specs/dropshipping/api-contract.md | 이동 |
| docs/apps/dropshipping/DROPSHIPPING_DB_INVENTORY_REPORT.md | docs/specs/dropshipping/db-inventory.md | 이동 |
| docs/apps/dropshipping/DS_INVESTIGATION.md | docs/specs/dropshipping/investigation.md | 이동 |
| docs/apps/dropshipping/DS_CLEANUP_PLAN.md | docs/plan/active/dropshipping-cleanup.md | 이동 |
| docs/apps/dropshipping/sprint1_checklist.md | docs/plan/active/dropshipping-sprint1.md | 이동 |
| docs/apps/dropshipping/sprint1_tasks_3-5_checklist.md | docs/plan/active/dropshipping-sprint1-tasks.md | 이동 |

### 4.2 cosmetics 문서

| 현재 위치 | 이동 위치 | 상태 |
|-----------|-----------|------|
| docs/apps/cosmetics/README.md | docs/specs/cosmetics/README.md | 이동 |
| docs/apps/cosmetics/cosmetics_api_spec.md | docs/specs/cosmetics/api-spec.md | 이동 |
| docs/apps/cosmetics/cosmetics_service_blueprint.md | docs/specs/cosmetics/service-blueprint.md | 이동 |
| docs/apps/cosmetics/cosmetics_extension_manifest.md | docs/specs/cosmetics/extension-manifest.md | 이동 |
| docs/apps/cosmetics/cosmetics_ui_wireframes.md | docs/specs/cosmetics/ui-wireframes.md | 이동 |
| docs/apps/cosmetics/TASK-01-COSMETICS-MVP.md | docs/plan/active/cosmetics-mvp.md | 이동 |
| docs/apps/cosmetics/cosmetics_development_plan.md | docs/plan/active/cosmetics-development.md | 이동 |

### 4.3 forum 문서

| 현재 위치 | 이동 위치 | 상태 |
|-----------|-----------|------|
| docs/apps/forum-core/investigation/forum_core_phase1_investigation_report.md | docs/specs/forum/phase1-investigation.md | 이동 |
| docs/dev/spec/forum_app_structure.md | docs/specs/forum/app-structure.md | 이동 |
| docs/cms-compatibility-audit-forum-core.md | docs/specs/forum/cms-compatibility-audit.md | 이동 |
| docs/cms-compatibility-audit-forum-core-RESULT.md | docs/specs/forum/cms-compatibility-result.md | 이동 |

### 4.4 organization 문서

| 현재 위치 | 이동 위치 | 상태 |
|-----------|-----------|------|
| docs/dev/design/organization-core/organization_core_overview.md | docs/specs/organization/core-overview.md | 이동 |
| docs/dev/design/organization-core/organization_api_design.md | docs/specs/organization/api-design.md | 이동 |
| docs/dev/design/organization-core/organization_entities.md | docs/specs/organization/entities.md | 이동 |
| docs/dev/design/organization-core/organization_rbac_scope.md | docs/specs/organization/rbac-scope.md | 이동 |
| docs/dev/design/organization-core/organization_extension_rules.md | docs/specs/organization/extension-rules.md | 이동 |
| docs/dev/design/organization-core/organization_lifecycle_hooks.md | docs/specs/organization/lifecycle-hooks.md | 이동 |
| docs/dev/design/organization-core/organization_integration_map.md | docs/specs/organization/integration-map.md | 이동 |
| docs/dev/design/organization-core/organization_app_manifest.md | docs/specs/organization/app-manifest.md | 이동 |

---

## 5. README 템플릿

각 specs/{app}/ 디렉토리에 생성할 README.md 템플릿:

```markdown
# {App Name} Specification

> App ID: {app-id}
> Type: Core | Extension | Service
> Status: Active | Development | Deprecated

## Overview

{앱 개요 설명}

## Documents

- [API Spec](./api-spec.md)
- [DB Schema](./db-inventory.md)
- ...

## Related

- Design: [docs/design/{related}](...)
- Plan: [docs/plan/active/{related}](...)

---

*Last Updated: YYYY-MM-DD*
```

---

## 6. 실행 순서

1. **Phase 1**: 디렉토리 생성
   - `docs/specs/{app}/` 각 앱별 디렉토리

2. **Phase 2**: 기존 문서 이동
   - 위 매트릭스에 따라 mv 실행

3. **Phase 3**: README 생성
   - 각 앱별 README.md 생성

4. **Phase 4**: app-guidelines 구성
   - 기존 문서 이동 + 신규 문서 스텁 생성

5. **Phase 5**: 빈 디렉토리 정리
   - `docs/apps/` 하위 정리

---

## 7. 예상 결과

| 카테고리 | 문서 수 |
|----------|---------|
| specs/ | ~50 |
| app-guidelines/ | ~12 |
| 총 App 관련 문서 | ~62 |

---

*최종 업데이트: 2025-12-09*
