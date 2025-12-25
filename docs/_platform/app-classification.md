# App Classification (O4O Platform)

> **Status**: Active
> **Created**: 2025-12-24
> **Updated**: 2025-12-25
> **Phase**: R8 Unused Package Drop

---

## 1. 분류 체계 개요

CLAUDE.md §2.2에 정의된 App Type 체계에 따라 모든 패키지를 분류한다.

| App Type | 설명 | AppStore 등록 |
|----------|------|---------------|
| **core** | 플랫폼/도메인 핵심 | 필수 |
| **feature** | 역할 기반 기능 | 필수 |
| **extension** | Core 확장 | 서비스 Active 시 |
| **standalone** | 독립 서비스 | 필수 |
| **infra-core** | 빌드/런타임 인프라 | ❌ 비대상 |
| **utility** | 보조 도구 | ❌ 비대상 |
| **application** | /apps 실행체 | ❌ 비대상 |
| **legacy** | 폐기 예정 | ❌ 비대상 |

---

## 2. FROZEN Core (변경 금지)

| 패키지 | 상태 | 비고 |
|--------|------|------|
| `auth-core` | FROZEN | 인증 기반 |
| `cms-core` | FROZEN | CMS 기반 |
| `platform-core` | FROZEN | 플랫폼 기반 |
| `organization-core` | FROZEN | 조직 기반 (R3.5 흡수) |

---

## 3. Core 패키지 (Type: core)

### 3.1 Platform Core
| 패키지 | 도메인 | 상태 |
|--------|--------|------|
| `platform-core` | Platform | FROZEN |
| `auth-core` | Auth | FROZEN |
| `cms-core` | CMS | FROZEN |
| `organization-core` | Organization | FROZEN |

### 3.2 Domain Core
| 패키지 | 도메인 | 상태 |
|--------|--------|------|
| `forum-core` | Forum | Active |
| `ecommerce-core` | E-commerce | Active |
| `lms-core` | LMS | Development |
| `dropshipping-core` | Dropshipping | Active |
| `digital-signage-core` | Signage | Active |
| `partner-core` | Partner | Development |
| `diabetes-core` | Healthcare | Experimental |
| `pharmaceutical-core` | Healthcare | Experimental |
| `block-core` | Block Editor | Active |

---

## 4. Extension 패키지 (Type: extension)

### 4.1 Cosmetics Domain Extensions
| 패키지 | 연결 Core | 상태 |
|--------|-----------|------|
| `cosmetics-seller-extension` | dropshipping-core | Active |
| `cosmetics-supplier-extension` | dropshipping-core | Active |
| `cosmetics-partner-extension` | dropshipping-core | Active |
| `cosmetics-sample-display-extension` | dropshipping-core | Active |
| `dropshipping-cosmetics` | dropshipping-core | Active |
| `forum-cosmetics` | forum-core | Active |
| ~~`design-system-cosmetics`~~ | ~~ui~~ | DELETED (R8) |

### 4.2 Yaksa Domain Extensions
| 패키지 | 연결 Core | 상태 |
|--------|-----------|------|
| `forum-yaksa` | forum-core | Active |
| `membership-yaksa` | organization-core | Active |
| `member-yaksa` | organization-core | Active |
| `lms-yaksa` | lms-core | Development |
| `reporting-yaksa` | organization-core | Active |
| `annualfee-yaksa` | organization-core | Active |
| `groupbuy-yaksa` | ecommerce-core | Development |
| `yaksa-accounting` | organization-core | Development |
| `yaksa-admin` | organization-core | Development |
| `yaksa-scheduler` | organization-core | Active |

### 4.3 Healthcare Extensions
| 패키지 | 연결 Core | 상태 |
|--------|-----------|------|
| `health-extension` | platform-core | Experimental |
| `diabetes-pharmacy` | diabetes-core | Experimental |
| `pharmacy-ai-insight` | pharmaceutical-core | Experimental |
| `cgm-pharmacist-app` | diabetes-core | Experimental |
| `signage-pharmacy-extension` | digital-signage-core | Experimental |

### 4.4 Integration Extensions (Thin Layers)
| 패키지 | 연결 Core | 상태 | 비고 |
|--------|-----------|------|------|
| `organization-forum` | organization + forum | Active | 5줄 manifest |
| `organization-lms` | organization + lms | Planned | TBD |
| `digital-signage-contract` | signage + ecommerce | Development | |
| `supplier-connector` | dropshipping-core | Active | |

---

## 5. Feature 패키지 (Type: feature)

| 패키지 | 역할 | 상태 |
|--------|------|------|
| `sellerops` | 셀러 운영 대시보드 | Active |
| `supplierops` | 공급업체 운영 대시보드 | Active |
| `partnerops` | 파트너 운영 대시보드 | Active |
| `pharmacyops` | 약국 운영 대시보드 | Experimental |

---

## 6. Utility 패키지 (Type: utility)

| 패키지 | 용도 | AppStore |
|--------|------|----------|
| `ui` | Design Core v1.0 | ❌ |
| `types` | 공통 타입 정의 | ❌ |
| `utils` | 공통 유틸리티 | ❌ |
| `auth-client` | 인증 클라이언트 | ❌ |
| `auth-context` | 인증 컨텍스트 | ❌ |
| `shortcodes` | 숏코드 시스템 | ❌ |
| `block-renderer` | 블록 렌더러 | ❌ |
| `cpt-registry` | CPT 레지스트리 | ❌ |
| `appearance-system` | 외관 시스템 | ❌ |

---

## 7. Application 패키지 (Type: application)

| 패키지 | 위치 | AppStore |
|--------|------|----------|
| `api-server` | apps/ | ❌ |
| `admin-dashboard` | apps/ | ❌ |
| `main-site` | apps/ | ❌ |
| `ecommerce` | apps/ | ❌ |
| `api-gateway` | apps/ | ❌ |
| `mobile-app` | apps/ | ❌ |
| `digital-signage-agent` | apps/ | ❌ |
| `funding` | apps/ | ❌ |
| `healthcare` | apps/ | ❌ |
| `page-generator` | apps/ | ❌ |
| `vscode-extension` | apps/ | ❌ |

---

## 8. Standalone 패키지 (Type: standalone)

| 패키지 | 용도 | 상태 |
|--------|------|------|
| `slide-app` | 슬라이드 프레젠테이션 | Active |
| `forum-app` | 포럼 프론트엔드 | Active |
| `market-trial` | 마켓 트라이얼 | Experimental |
| `partner-ai-builder` | AI 빌더 | Experimental |

---

## 9. Legacy/Deprecated 패키지

> **R7에서 Legacy 패키지 4개 삭제, R8에서 미사용 패키지 1개 삭제 완료** (2025-12-25)

| 패키지 | 상태 | 삭제일 | 비고 |
|--------|------|--------|------|
| ~~`admin`~~ | DELETED | 2025-12-25 | admin-dashboard로 통합 |
| ~~`commerce`~~ | DELETED | 2025-12-25 | ecommerce-core로 이전 |
| ~~`customer`~~ | DELETED | 2025-12-25 | 사용 중단 |
| ~~`lms-marketing`~~ | DELETED | 2025-12-25 | 미사용 (R7) |
| ~~`design-system-cosmetics`~~ | DELETED | 2025-12-25 | 미사용, ui로 통합 (R8) |

---

## 10. 상태별 요약

| 상태 | 수량 | 비고 |
|------|------|------|
| FROZEN | 4 | 변경 금지 |
| Active | 27 | 운영 중 |
| Development | 12 | 개발 중 |
| Experimental | 10 | 실험적 |
| ~~Legacy~~ | ~~0~~ | R7/R8 삭제 완료 |
| Planned | 2 | 계획됨 |

---

*Phase R8: WO-GEN-PLATFORM-R8-DROP-DESIGN-SYSTEM-COSMETICS*
*Updated: 2025-12-25*
