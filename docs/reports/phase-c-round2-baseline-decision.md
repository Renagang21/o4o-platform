# Phase C Round 2: Baseline Decision Report

**Date:** 2025-12-15
**Branch:** develop
**Type:** Decision Gate (코드 변경 없음)
**Input:** phase-c-round1-service-app-inventory.md

---

## [Service Status Decisions]

### Active Services (8)

| Service | ServiceGroup | Status | Template | InitPack | Rationale |
|---------|--------------|--------|----------|----------|-----------|
| Cosmetics Retail | cosmetics | **Active** | cosmetics-retail | cosmetics-retail-init | Template + InitPack + 실사용 |
| Yaksa Branch | yaksa | **Active** | yaksa-branch | yaksa-branch-init | Template + InitPack + 실사용 |
| Platform Core | platform-core | **Active** | platform-core | (없음, 예외) | 기반 인프라, 자동설치 비활성 |
| Partner Operations | partnerops | **Active** | partnerops-service | (없음) | Template + 실사용 |
| Digital Signage | signage | **Active** | signage-retail | (없음, 예외) | Standalone 특수 서비스 |
| SellerOps Universal | sellerops | **Active** | sellerops-universal | (없음) | Template + 실사용 |
| SupplierOps Universal | supplierops | **Active** | supplierops-universal | (없음) | Template + 실사용 |
| LMS Marketing | global | **Active** | (없음, 예외) | (없음) | Cross-service 기능 |

### Development Services (2)

| Service | ServiceGroup | Status | Template | Rationale |
|---------|--------------|--------|----------|-----------|
| Tourist Service | tourist | **Development** | tourist-service | Template 존재, 앱 미완성 |
| Diabetes Care Pharmacy | diabetes-care-pharmacy | **Development** | (없음) | 앱 존재, Template 미생성 |

### Experimental Services (1)

| Service | ServiceGroup | Status | Rationale |
|---------|--------------|--------|-----------|
| Market Trial | cosmetics | **Experimental** | package.json에 명시적 experimental 표식 |

### Planned Services (2)

| Service | ServiceGroup | Status | Rationale |
|---------|--------------|--------|-----------|
| Hospital | hospital | **Planned** | ServiceGroup 정의만 존재 |
| B2B Education | b2b-education | **Planned** | ServiceGroup 정의만 존재 |

---

## [App Classification Decisions]

### Core Apps (12) - AppStore 필수 등록

| App | Type | AppStore | Status |
|-----|------|----------|--------|
| cms-core | core | **Yes** | FROZEN |
| auth-core | core | **Yes** (등록 필요) | FROZEN |
| organization-core | core | **Yes** | FROZEN |
| platform-core | core | **Yes** (등록 필요) | FROZEN |
| forum-core | core | **Yes** | Active |
| lms-core | core | **Yes** | Active |
| dropshipping-core | core | **Yes** | Active |
| ecommerce-core | core | **Yes** | Active |
| partner-core | core | **Yes** (등록 필요) | Active |
| pharmaceutical-core | core | **Yes** (등록 필요) | Development |
| diabetes-core | core | **Yes** (등록 필요) | Development |
| digital-signage-core | core | **Yes** (등록 필요) | Active |

### Extension Apps (22) - 서비스 연동 시 등록

| App | Type | AppStore | Service | Status |
|-----|------|----------|---------|--------|
| membership-yaksa | extension | **Yes** | yaksa | Active |
| forum-yaksa | extension | **Yes** | yaksa | Active |
| reporting-yaksa | extension | **Yes** | yaksa | Active |
| lms-yaksa | extension | **Yes** | yaksa | Active |
| annualfee-yaksa | extension | **Yes** (등록 필요) | yaksa | Active |
| yaksa-scheduler | extension | **Yes** | yaksa | Active |
| organization-lms | extension | **Yes** (등록 필요) | yaksa | Active |
| dropshipping-cosmetics | extension | **Yes** | cosmetics | Active |
| cosmetics-partner-extension | extension | **Yes** | cosmetics | Active |
| cosmetics-seller-extension | extension | **Yes** (등록 필요) | cosmetics | Active |
| cosmetics-supplier-extension | extension | **Yes** (등록 필요) | cosmetics | Active |
| cosmetics-sample-display-extension | extension | **Yes** (등록 필요) | cosmetics | Active |
| forum-cosmetics | extension | **Yes** (등록 필요) | cosmetics | Active |
| diabetes-pharmacy | extension | **Yes** (등록 필요) | diabetes-care-pharmacy | Development |
| health-extension | extension | **Yes** (등록 필요) | diabetes-care-pharmacy | Development |
| partner-ai-builder | extension | **Yes** (등록 필요) | cosmetics | Active |
| lms-marketing | extension | **Yes** | global | Active |
| market-trial | extension | **Hidden** | cosmetics | Experimental |

### Feature Apps (5) - AppStore 필수 등록

| App | Type | AppStore | Status |
|-----|------|----------|--------|
| sellerops | feature | **Yes** | Active |
| supplierops | feature | **Yes** | Active |
| partnerops | feature | **Yes** | Active |
| pharmacyops | feature | **Yes** (등록 필요) | Development |
| organization-forum | feature | **Yes** | Active |

### Standalone Apps (1)

| App | Type | AppStore | Status |
|-----|------|----------|--------|
| signage | standalone | **Yes** | Active |

### Infrastructure Core (11) - AppStore 비대상

| App | Type | AppStore | Status |
|-----|------|----------|--------|
| @o4o/types | infra-core | **No** | Stable |
| @o4o/utils | infra-core | **No** | Stable |
| @o4o/ui | infra-core | **No** | Stable |
| @o4o/auth-client | infra-core | **No** | Stable |
| @o4o/auth-context | infra-core | **No** | Stable |
| @o4o/appearance-system | infra-core | **No** | Stable |
| @o4o/block-core | infra-core | **No** | Stable |
| @o4o/block-renderer | infra-core | **No** | Stable |
| @o4o/cpt-registry | infra-core | **No** | Stable |
| @o4o/shortcodes | infra-core | **No** | Stable |
| @o4o/slide-app | infra-core | **No** | Stable |

### Utility Packages (2) - AppStore 비대상

| App | Type | AppStore | Status |
|-----|------|----------|--------|
| digital-signage-contract | utility | **No** | Active |
| supplier-connector | utility | **No** | Active |
| design-system-cosmetics | utility | **No** | New (확인 필요) |

### Legacy/Deprecated Apps (3)

| App | Type | AppStore | Decision |
|-----|------|----------|----------|
| @o4o-apps/admin | legacy | **No** | **Deprecated** - 제거 대기 |
| @o4o-apps/commerce | legacy | **No** | **Deprecated** - 제거 대기 |
| @o4o-apps/customer | legacy | **No** | **Deprecated** - 제거 대기 |

### Application-Level (/apps) - AppStore 비대상

| App | Type | AppStore | Status |
|-----|------|----------|--------|
| admin-dashboard | application | **No** | Active |
| api-server | application | **No** | Active |
| api-gateway | application | **No** | Active |
| main-site | application | **No** | Active |
| ecommerce | application | **No** | Active |
| mobile-app | application | **No** | Development |
| page-generator | application | **No** | Active |
| digital-signage-agent | application | **No** | Active |
| vscode-extension | tool | **No** | Active |

---

## [Baseline Rules]

### Rule 1: Service Status Rules

```
┌─────────────────────────────────────────────────────────────────────┐
│ STATUS          │ CRITERIA                                          │
├─────────────────┼───────────────────────────────────────────────────┤
│ Active          │ Template 존재 + 실사용자 흐름 존재                  │
│                 │ 예외: cross-service 기능(LMS Marketing)            │
├─────────────────┼───────────────────────────────────────────────────┤
│ Development     │ Template 존재 OR 핵심 앱 3개 이상 준비됨           │
├─────────────────┼───────────────────────────────────────────────────┤
│ Experimental    │ package.json에 "experimental" 명시                 │
│                 │ 또는 manifest.meta.status = "experimental"         │
├─────────────────┼───────────────────────────────────────────────────┤
│ Planned         │ ServiceGroup 정의만 존재, 앱/Template 없음         │
├─────────────────┼───────────────────────────────────────────────────┤
│ Legacy          │ 과거 사용 + 12개월 이상 비활성                      │
├─────────────────┼───────────────────────────────────────────────────┤
│ Deprecated      │ 제거 일정 확정 + 신규 배포 중단                     │
└─────────────────┴───────────────────────────────────────────────────┘

상태 전환 트리거:
- Planned → Development: 핵심 앱 개발 시작
- Development → Active: Template 생성 + 실사용 시작
- Active → Legacy: 12개월 신규 배포 없음
- Legacy → Deprecated: 제거 일정 확정
- Any → Experimental: 명시적 표식 추가
```

### Rule 2: AppStore Registration Rules

```
┌─────────────────────────────────────────────────────────────────────┐
│ APP TYPE        │ APPSTORE POLICY                                   │
├─────────────────┼───────────────────────────────────────────────────┤
│ core            │ 필수 등록 (모든 서비스에서 사용 가능)              │
├─────────────────┼───────────────────────────────────────────────────┤
│ feature         │ 필수 등록                                          │
├─────────────────┼───────────────────────────────────────────────────┤
│ extension       │ 연결 서비스가 Active/Development일 때 등록        │
│                 │ Experimental 서비스 연결 시 Hidden 처리            │
├─────────────────┼───────────────────────────────────────────────────┤
│ standalone      │ 필수 등록                                          │
├─────────────────┼───────────────────────────────────────────────────┤
│ infra-core      │ 등록 제외 (AppStore 비대상)                        │
├─────────────────┼───────────────────────────────────────────────────┤
│ utility         │ 등록 제외                                          │
├─────────────────┼───────────────────────────────────────────────────┤
│ application     │ 등록 제외 (/apps 디렉토리)                         │
├─────────────────┼───────────────────────────────────────────────────┤
│ legacy          │ 등록 제외 + Deprecated 표식                        │
└─────────────────┴───────────────────────────────────────────────────┘

등록 필수 조건:
- manifest.ts 파일 존재
- appsCatalog.ts에 메타데이터 등록
- lifecycle/ 디렉토리 (install/activate/deactivate/uninstall)
```

### Rule 3: InitPack Rules

```
┌─────────────────────────────────────────────────────────────────────┐
│ SERVICE STATUS  │ INITPACK POLICY                                   │
├─────────────────┼───────────────────────────────────────────────────┤
│ Active          │ 필수 (단, 예외 허용)                               │
│   예외 허용     │ - platform-core (기반 인프라)                      │
│                 │ - signage (Standalone 특수 서비스)                 │
│                 │ - *ops 서비스 (셀러/공급자용, 고객UI 없음)         │
│                 │ - cross-service 기능 (LMS Marketing)               │
├─────────────────┼───────────────────────────────────────────────────┤
│ Development     │ 선택 (Template 완성 전 생성 권장)                  │
├─────────────────┼───────────────────────────────────────────────────┤
│ Experimental    │ 선택                                               │
├─────────────────┼───────────────────────────────────────────────────┤
│ Planned         │ 해당 없음                                          │
└─────────────────┴───────────────────────────────────────────────────┘

InitPack 필수 포함:
- 기본 테마 설정 (색상, 폰트)
- 기본 메뉴 구조
- 기본 카테고리
- 기본 페이지 (home, about, contact)
- 기본 역할 정의
```

### Rule 4: Template Rules

```
┌─────────────────────────────────────────────────────────────────────┐
│ RULE            │ DESCRIPTION                                       │
├─────────────────┼───────────────────────────────────────────────────┤
│ Template = 정식 │ Template 존재 = 공식 서비스로 인정                 │
├─────────────────┼───────────────────────────────────────────────────┤
│ Template 없음   │ 최대 Development 상태 (Active 불가)               │
│   예외          │ cross-service 기능 (global ServiceGroup)          │
├─────────────────┼───────────────────────────────────────────────────┤
│ Template 필수   │ - serviceGroup 명시                               │
│   포함          │ - coreApps 목록                                   │
│                 │ - extensionApps 목록 (선택)                       │
│                 │ - defaultSettings                                  │
│                 │ - isActive: true/false                            │
├─────────────────┼───────────────────────────────────────────────────┤
│ 균형 규칙       │ Template 있으면 관련 앱도 Active 상태여야 함      │
│                 │ 앱이 Development면 Template도 비활성 권장         │
└─────────────────┴───────────────────────────────────────────────────┘
```

### Rule 5: Orphan/Legacy Processing Rules

```
┌─────────────────────────────────────────────────────────────────────┐
│ TYPE            │ ACTION                                            │
├─────────────────┼───────────────────────────────────────────────────┤
│ Orphan App      │ 정의: 어떤 서비스에도 연결되지 않은 앱            │
│ (manifest 有)   │ 처리: 서비스 연결 또는 Deprecated 표식            │
├─────────────────┼───────────────────────────────────────────────────┤
│ Legacy Module   │ 정의: manifest 없음 + 대체 모듈 존재              │
│                 │ 처리: Deprecated → 제거 일정 확정                  │
│                 │ 대상: admin, commerce, customer                    │
├─────────────────┼───────────────────────────────────────────────────┤
│ Empty Directory │ 정의: package.json 없는 디렉토리                  │
│                 │ 처리: 즉시 제거 또는 구현 시작                     │
│                 │ 대상: apps/funding, apps/healthcare                │
├─────────────────┼───────────────────────────────────────────────────┤
│ Untracked New   │ 정의: 새로 생성된 untracked 디렉토리              │
│                 │ 처리: 목적 확인 후 분류                            │
│                 │ 대상: design-system-cosmetics                      │
└─────────────────┴───────────────────────────────────────────────────┘
```

### Rule 6: Infra-core Treatment Rules

```
┌─────────────────────────────────────────────────────────────────────┐
│ RULE            │ DESCRIPTION                                       │
├─────────────────┼───────────────────────────────────────────────────┤
│ AppStore 비대상 │ infra-core는 AppStore에 등록하지 않음             │
│                 │ 이유: 서비스 독립적 설치 불가                      │
├─────────────────┼───────────────────────────────────────────────────┤
│ manifest 불필요 │ infra-core는 manifest.ts 없어도 됨                │
├─────────────────┼───────────────────────────────────────────────────┤
│ Core Refactor   │ infra-core는 App Refactor 범위에서 제외           │
│   제외          │ 별도의 인프라 리팩토링으로 관리                    │
├─────────────────┼───────────────────────────────────────────────────┤
│ 표식 유지       │ package.json에 "o4o:packageType": "infra-core"    │
│                 │ 미표식 시 암묵적으로 infra-core로 간주 가능        │
│                 │ (types, utils, ui, auth-client, auth-context 등)  │
├─────────────────┼───────────────────────────────────────────────────┤
│ 변경 관리       │ infra-core 변경 시 전체 플랫폼 영향도 검토 필수   │
└─────────────────┴───────────────────────────────────────────────────┘
```

---

## [Baseline Summary]

### 정식 기준으로 삼는 것 (Reference)

| 항목 | 기준 대상 | 비고 |
|------|-----------|------|
| **서비스 구조** | Cosmetics Retail, Yaksa Branch | Template + InitPack + 완전한 앱 구성 |
| **Core App** | cms-core, organization-core | @status FROZEN, 모든 서비스의 기반 |
| **Extension 패턴** | membership-yaksa, dropshipping-cosmetics | Core 확장 표준 |
| **Feature 패턴** | sellerops, partnerops | 역할 기반 기능 표준 |
| **Template 구조** | cosmetics-retail, yaksa-branch | 완전한 Template 정의 |
| **InitPack 구조** | cosmetics-retail-init, yaksa-branch-init | 완전한 초기화 패키지 |

### 더 이상 기준으로 삼지 않는 것

| 항목 | 대상 | 사유 |
|------|------|------|
| **Legacy Frontend** | admin, commerce, customer | 대체 모듈 존재 (admin-dashboard 등) |
| **Empty Directories** | apps/funding, apps/healthcare | 구현 없음 |
| **Implicit Registration** | auth-core, platform-core (AppStore 미등록) | 등록 필요 |

### 등록 필요 앱 목록 (Action Required)

다음 앱들은 manifest.ts가 있지만 AppStore에 미등록:

| App | Type | Priority |
|-----|------|----------|
| auth-core | core | High |
| platform-core | core | High |
| partner-core | core | Medium |
| pharmaceutical-core | core | Medium |
| diabetes-core | core | Medium |
| digital-signage-core | core | Medium |
| annualfee-yaksa | extension | Medium |
| organization-lms | extension | Low |
| cosmetics-seller-extension | extension | Medium |
| cosmetics-supplier-extension | extension | Medium |
| cosmetics-sample-display-extension | extension | Medium |
| forum-cosmetics | extension | Low |
| diabetes-pharmacy | extension | Low |
| health-extension | extension | Low |
| partner-ai-builder | extension | Medium |
| pharmacyops | feature | Low |

---

## [Status Transition Diagram]

```
                    ┌─────────────────────────┐
                    │       Planned           │
                    │  (ServiceGroup only)    │
                    └───────────┬─────────────┘
                                │ 핵심 앱 개발 시작
                                ▼
                    ┌─────────────────────────┐
            ┌───────│     Development         │───────┐
            │       │  (Apps ready, no Tmpl)  │       │
            │       └───────────┬─────────────┘       │
            │                   │ Template 생성        │
            │                   ▼                      │
            │       ┌─────────────────────────┐       │
            │       │        Active           │       │
            │       │  (Template + Usage)     │       │
            │       └───────────┬─────────────┘       │
            │                   │ 12개월 비활성        │
            │                   ▼                      │
            │       ┌─────────────────────────┐       │
            │       │        Legacy           │       │
            │       │  (Inactive 12+ months)  │       │
            │       └───────────┬─────────────┘       │
            │                   │ 제거 일정 확정       │
            │                   ▼                      │
            │       ┌─────────────────────────┐       │
            └──────▶│      Deprecated         │◀──────┘
                    │  (Removal scheduled)    │
                    └─────────────────────────┘

    ┌─────────────────────────────────────────────────┐
    │                 Experimental                     │
    │  (명시적 표식, 어느 상태에서든 진입/이탈 가능)   │
    └─────────────────────────────────────────────────┘
```

---

## [Next Steps Recommendation]

Phase C Round 2 완료 후 선택지:

1. **Phase C 종료 선언** → 서비스 개발 본격화
2. **Phase D: 신규 개발 기준 간결 버전 생성**
3. **등록 필요 앱 일괄 등록 (Action Items)**

---

*Generated: 2025-12-15 | Phase C Round 2 Complete*
*Decision Authority: Platform Architecture Team*
