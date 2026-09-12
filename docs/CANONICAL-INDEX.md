# O4O Canonical Document Index

> **역할**: AI 도구와 무관한 **정본(canonical) 문서 지도**. [`CLAUDE.md`](../CLAUDE.md) 와 [`AGENTS.md`](../AGENTS.md) 는 규칙을 복사하지 않고 이 색인과 각 정본을 가리킨다.
> **작성일**: 2026-09-12 · **출처**: 구 `CLAUDE.md` v8 "상세 규칙 문서 목록" + 본문 링크의 합집합

## 0. 이 색인의 규칙

- **기록물은 등재하지 않는다** — `docs/checks/` · `docs/investigations/` · `docs/ir/` · `docs/work-orders/` · `docs/archive/**` 는 과거 시점의 실행 기록이며 현재 정책을 이기지 않는다.
- **등재 ≠ 정본 승격.** 각 행의 상태 열이 사실을 말한다. 문서 본문은 여기 복사하지 않는다.
- 상태 어휘는 4개뿐:

  | 상태 | 뜻 |
  |---|---|
  | `FROZEN` | 구조 변경은 명시적 WO 필수 (버그 수정·문서·테스트는 허용) |
  | `ACTIVE` | 현행 기준 문서 |
  | `ASPIRATIONAL` | 지향 표준 — 신규 화면에 적용, 기존 화면 소급 강제 아님 |
  | `판정 대기` | 현행 사업 경계와 충돌 후보이거나 일부 절이 stale — **기능 복구·확장 금지**, 판정은 별도 WO |

- 행 추가·제거·상태 변경은 별도 WO 로 한다 (`CLAUDE.md` §16-4 준용). 깨진 링크 교정만 인라인 허용.
- 우선순위(충돌 시)는 아래 절 번호 순이 아니라 `CLAUDE.md` / `AGENTS.md` 의 Source of Truth 절이 정한다. 요지: **1절(사업·정책) > 2절(구조 계약) > 나머지 도메인 정본 > 기록물**.

---

## 1. 사업 · 정책 (최상위)

| 문서 | 역할 | 상태 |
|---|---|---|
| [O4O-BUSINESS-PHILOSOPHY-V1](baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) | 사업 철학 SSOT — 공급자 / 운영사업자 / 매장 정의, HUB 철학, AI 역할, Drift 방지 | ACTIVE |
| [O4O-STORE-COMMERCE-BOUNDARY-V1](baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) | 매장 commerce 경계 SSOT — 소비자→매장 O4O commerce 없음 · 판매 실행 = 외부 POS·외부 채널 · legacy commerce 판정 규칙 · 개발 금지선 · **§15 사업 모델 변경 절차**. cart · checkout · orders · payments · refund · PG · POS · tablet · QR 작업 전 **코드보다 먼저 읽는다** | ACTIVE |
| [O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1](baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) | 공급자→매장 B2B 주문 정본 — `store_cart_items → checkout_orders` 수렴, actor · ownership · serviceKey · lifecycle · 취소 계약. 위 문서의 B2B 축 쌍 | ACTIVE |
| [O4O-3-ROLE-FLOW-BASELINE-V1](baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) | 3자 Canonical Flow — 책임 매트릭스 · 데이터 흐름 · 원천 자료 vs 실행 자산 · AI 개입 지점 | ACTIVE |

## 2. 구조 계약 · Frozen Baselines

`CLAUDE.md` §14 의 F1~F12 와 그 주변 구조 계약.

| # | 문서 | 역할 | 상태 |
|---|---|---|---|
| F1 | [BASELINE-OPERATOR-OS-V1](baseline/BASELINE-OPERATOR-OS-V1.md) | Operator OS 기술 baseline — security / hub / ai / action-log / asset-copy / operator-ux / admin-ux core | FROZEN |
| F2 | [KPA-UX-BASELINE-V1](baseline/KPA-UX-BASELINE-V1.md) | KPA 3개 서비스 영역 5-Block / 4-Block 통합 UX | FROZEN |
| F3 | [STORE-LAYER-ARCHITECTURE](architecture/STORE-LAYER-ARCHITECTURE.md) | Store Layer 의존 방향 (store-ui-core · store-asset-policy-core · store-core · asset-copy-core · hub-core) | FROZEN |
| F4 | [PLATFORM-CONTENT-POLICY-V1](baseline/PLATFORM-CONTENT-POLICY-V1.md) | HUB 3축 모델 (Producer / Visibility / ServiceScope) | FROZEN |
| F5 | [CONTENT-STABLE-DECLARATION-V1](baseline/CONTENT-STABLE-DECLARATION-V1.md) | HUB 콘텐츠 타입 · 매핑 · 병합 로직 · API 계약 | FROZEN |
| F6 | [O4O-BOUNDARY-POLICY-V1](architecture/O4O-BOUNDARY-POLICY-V1.md) | Domain Boundary Matrix + Guard Rules 5개 | FROZEN |
| F7 | [NETURE-PARTNER-CONTRACT-FREEZE-V1](baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md) | Neture 파트너 계약 테이블 · ENUM · 트랜잭션 · Commission 불변 | FROZEN |
| F8 | [NETURE-DISTRIBUTION-ENGINE-FREEZE-V1](baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md) | Distribution Tier 3단계 · SERVICE 상태 머신 · Checkout Guard 3계층 | FROZEN |
| F9 | [RBAC-FREEZE-DECLARATION-V1](rbac/RBAC-FREEZE-DECLARATION-V1.md) | RBAC SSOT — `role_assignments` 단일 소스, write-path 통일 | FROZEN |
| F10 | [O4O-CORE-FREEZE-V1](architecture/O4O-CORE-FREEZE-V1.md) | O4O Core — Auth · Membership · Approval · RBAC 4모듈 Core Layer 고정 | FROZEN |
| F11 | [USER-OPERATOR-FREEZE-V1](architecture/USER-OPERATOR-FREEZE-V1.md) | users · service_memberships · role_assignments 3테이블 고정, Operator = membership 기반 | FROZEN |
| F12 | [O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1](baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md) | 2계층(Product Resource / Store Production Material) + 6불변식. 상세 설계: [IR](architecture/IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1.md) · [Persistence Design](architecture/WO-O4O-PRODUCT-CONTENT-RESOURCE-PERSISTENCE-DESIGN-V1.md) | FROZEN |
| — | [UX-CORE-FREEZE-V1](baseline/UX-CORE-FREEZE-V1.md) | UX Core 동결 | FROZEN |
| — | [O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1](baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md) | 공통 모듈 · config · sidebar · capability map 변경 시 전 소비처 식별 절차 (raw-source spec 포함) | ACTIVE |
| — | [O4O-STORE-RULES](architecture/O4O-STORE-RULES.md) | O4O Store & Order 가드레일 — Store Template · 주문 생성 3중 방어 | ACTIVE |
| — | [O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1](architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md) | Store Production Material 논리 canonical (`kpa_store_contents` = legacy 물리명) | ACTIVE |
| — | [STORE-PRODUCTS-CANONICAL-V1](architecture/STORE-PRODUCTS-CANONICAL-V1.md) | Store Products canonical | ACTIVE |
| — | [STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1](baseline/STORE-LOCAL-PRODUCT-BOUNDARY-POLICY-V1.md) | 매장 자체 상품의 Commerce 연결 금지 경계 | ACTIVE |
| — | [O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1](baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1.md) | Signage Store Playlist 모델 경계 (KEEP-LEGACY 판정) | ACTIVE |

## 3. Operator · Store UX

| 문서 | 역할 | 상태 |
|---|---|---|
| [OPERATOR-DASHBOARD-STANDARD-V1](platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) | 5-Block 대시보드 · A~F 6 Workspace 진입 허브 · Sidebar 순서 · KPI 분류 | ACTIVE |
| [O4O-OPERATOR-CANONICAL-WORKFLOW-V1](architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md) | 검수·승인 UX | ACTIVE |
| [O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1](baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md) | 검수 외 5 Workspace UX (자료 등록 / AI 작업 / 큐레이션 / 매장 지원 / 운영 수익) | ACTIVE |
| [O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1](baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md) | 매장 HUB 콘텐츠 게시 표준 (RichTextEditor 기반 항목별 게시 · Source Ingestion 보류) | ACTIVE |
| [O4O-STORE-MENU-CANONICAL-TREE-V1](baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md) | 매장 HUB ↔ 내 매장 메뉴 같은 축 정렬 (6 항목) | ACTIVE |
| [OPERATOR-DATATABLE-POLICY-V1](architecture/OPERATOR-DATATABLE-POLICY-V1.md) | Operator DataTable 정책 | ACTIVE |
| [O4O-OPERATOR-TABLE-CANONICAL-V1](architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md) | Operator Table canonical | ACTIVE |
| [OPERATOR-INTEGRATION-STATE-V1](architecture/OPERATOR-INTEGRATION-STATE-V1.md) | Operator 통합 상태 | ACTIVE |
| [OPERATOR-CORE-DESIGN-V1](architecture/OPERATOR-CORE-DESIGN-V1.md) | Operator Core 설계 (1세대 `@o4o/operator-core` superseded 기록 포함) | ACTIVE |
| [OPERATOR-DASHBOARD-NAVIGATION](platform/navigation/OPERATOR-DASHBOARD-NAVIGATION.md) | Operator Dashboard 내비게이션 | ACTIVE |

## 4. 사용자 · 권한

| 문서 | 역할 | 상태 |
|---|---|---|
| [USER-DOMAIN-SSOT-V1](baseline/USER-DOMAIN-SSOT-V1.md) | User 도메인 SSOT | ACTIVE |
| [ROLE-POLICY-AND-GUARD-V1](baseline/ROLE-POLICY-AND-GUARD-V1.md) | Role 정책 · Guard baseline (`requireAuth` → `require{Service}Scope`) | ACTIVE |
| [RBAC-CANONICAL-STATE-V1](rbac/RBAC-CANONICAL-STATE-V1.md) | RBAC 현행 canonical 상태 | ACTIVE |
| [RBAC-ROLE-CATALOG-V1](rbac/RBAC-ROLE-CATALOG-V1.md) | 역할 카탈로그 | ACTIVE |
| [RBAC-RUNBOOK-V1](rbac/RBAC-RUNBOOK-V1.md) | RBAC 운영 runbook | ACTIVE |
| [KPA-ROLE-MATRIX-V1](baseline/KPA-ROLE-MATRIX-V1.md) | KPA 권한 매트릭스 | ACTIVE |

## 5. 도메인 · 서비스

| 문서 | 역할 | 상태 |
|---|---|---|
| [COSMETICS-DOMAIN-RULES](architecture/COSMETICS-DOMAIN-RULES.md) | Cosmetics — 독립 스키마(`cosmetics_` prefix), 주문은 E-commerce Core 경유 | ACTIVE |
| [BUSINESS-SERVICE-RULES](architecture/BUSINESS-SERVICE-RULES.md) | Business Service — OpenAPI 계약 우선, 서비스 간 직접 호출 / DB 접근 금지 | ACTIVE |
| [KPA-SOCIETY-SERVICE-STRUCTURE](baseline/KPA-SOCIETY-SERVICE-STRUCTURE.md) | KPA 3개 서비스 공존 구조 (커뮤니티 / 분회 / 데모) — 라우트 위치 ≠ 서비스 소속 | ACTIVE |
| [KPA-SIGNAGE-STRUCTURE-V1](baseline/KPA-SIGNAGE-STRUCTURE-V1.md) | KPA Signage 구조 baseline | ACTIVE |
| [NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3](baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md) | Neture 도메인 아키텍처 (공급자 화면 canonical) | FROZEN |
| [O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1](baseline/O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) | PharmacyHub = KPA류 공통 매장경영 구조 − 공급 승인/매장지원 capability · supplier 역할 없음 | ACTIVE |
| [EVENT-OFFER-COMMON-DOMAIN-V1](baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md) | Event Offer 공통 도메인 | ACTIVE |
| [EVENT-OFFER-STORE-INTEGRATION-V1](baseline/EVENT-OFFER-STORE-INTEGRATION-V1.md) | Event Offer Store 통합 | ACTIVE |
| [EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1](baseline/EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1.md) | Event Offer 에서의 Neture 역할 구분 | ACTIVE |
| [DESIGN-CORE-GOVERNANCE](rules/DESIGN-CORE-GOVERNANCE.md) | 모든 신규 화면은 Design Core v1.0 — 독자 디자인 시스템 금지 | ACTIVE |
| [GLOBAL-HEADER-STANDARD-V1](architecture/ui/GLOBAL-HEADER-STANDARD-V1.md) | 글로벌 헤더 표준 | ACTIVE |
| [O4O-TABLE-STANDARD-BASELINE-V1](baseline/O4O-TABLE-STANDARD-BASELINE-V1.md) | 테이블 지향 표준 | ASPIRATIONAL |
| [O4O-FORM-STANDARD-BASELINE-V1](baseline/O4O-FORM-STANDARD-BASELINE-V1.md) | 폼 지향 표준 | ASPIRATIONAL |

## 6. 플랫폼 공통 구조 · 콘텐츠 · APP

| 문서 | 역할 | 상태 |
|---|---|---|
| [o4o-common-structure](o4o-common-structure.md) | forum · lms · signage 는 플랫폼 공통 구조 — KPA 가 reference implementation, 데이터는 serviceKey 격리 | ACTIVE |
| [CONTENT-CORE-OVERVIEW](platform/content-core/CONTENT-CORE-OVERVIEW.md) | Content Core — 단일 출처 · Core 불변 · 이벤트 기반 통신 | ACTIVE |
| [O4O-HUB-TEMPLATE-STANDARD-V1](platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md) | HUB Template 표준 | ACTIVE |
| [HUB-UX-GUIDELINES-V1](platform/hub/HUB-UX-GUIDELINES-V1.md) | Hub UX 규칙 | ACTIVE |
| [EXTENSION-GENERAL-GUIDE](platform/extensions/EXTENSION-GENERAL-GUIDE.md) | Extension 개발 일반 가이드 | ACTIVE |
| [APP-LMS-BASELINE](architecture/APP-LMS-BASELINE.md) | APP-LMS baseline — 백엔드 공통, 프론트 공통화는 후속 (APP-CONTENT / SIGNAGE / FORUM 은 Frozen) | ACTIVE |
| [LMS-CORE-EXTENSION-PRINCIPLES](platform/lms/LMS-CORE-EXTENSION-PRINCIPLES.md) | LMS Core / Extension 원칙 | ACTIVE |
| [LMS-SCOPE-GUARD](architecture/LMS-SCOPE-GUARD.md) | LMS Scope Guard 설계 | ACTIVE |
| [LMS-CLIENT-CONVENTION-V1](architecture/LMS-CLIENT-CONVENTION-V1.md) | LMS Client 규약 | ACTIVE |
| [O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1](architecture/O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1.md) | Guide sectionKey 충돌 정책 | ACTIVE |
| [O4O-GUIDE-SCHEMA-VALIDATION-V1](architecture/O4O-GUIDE-SCHEMA-VALIDATION-V1.md) | Guide Schema Validation | ACTIVE |
| [O4O-GUIDE-SECTIONKEY-MIGRATION-V1](architecture/O4O-GUIDE-SECTIONKEY-MIGRATION-V1.md) | Guide sectionKey Migration | ACTIVE |
| [O4O-GUIDE-CONTENT-RESEED-GUIDEBLOCK-V1](architecture/O4O-GUIDE-CONTENT-RESEED-GUIDEBLOCK-V1.md) | Guide Content Reseed (GuideBlock) | ACTIVE |
| [O4O-GUIDE-PAGE-KEY-CATALOG-V1](architecture/O4O-GUIDE-PAGE-KEY-CATALOG-V1.md) | Guide pageKey 카탈로그 | ACTIVE |
| [O4O-AI-USAGE-FLOW-BASELINE-V1](baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md) | O4O AI 활용 흐름 baseline | ACTIVE |
| [O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1](baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) | **AI 자동화 진화 원칙 SSOT** — 사용자 행동은 학습 자료 · 목적/결과가 기준 · 완전 자동화가 아닌 시간 절감 · takeover 는 학습 신호 · 사이트별 업무 사전 정의 금지 · AI=발견/판단, Runtime=검증된 실행. Local Agent · Browser DOM · Computer Use · Site Adapter · Workflow · 주문/회계 자동화 등 **모든 자동화 WO 의 상위 기준** (§25 현행 정렬 상태) | ACTIVE |

## 7. 운영 · 환경 · 절차

| 문서 | 역할 | 상태 |
|---|---|---|
| [SETUP.md](../SETUP.md) | 개발환경 · 설치 · 검증 명령 · CI 게이트 · Cloud SQL Proxy · 포트 — **환경 관련 유일 정본** | ACTIVE |
| [O4O-GIT-PARALLEL-WORK-SAFETY-V1](baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md) | 다중 PC · 다중 세션 Git 안전 — path-specific stage · Safe Commit · PC 이동 · 완료 조건 | ACTIVE |
| [PRODUCTION-MIGRATION-STANDARD](baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) | 프로덕션 마이그레이션 표준 (CI/CD 자동 실행 원칙) | ACTIVE |
| [DEBUG-SSR-TEST-PAGE-GUIDE-V1](platform/debug/DEBUG-SSR-TEST-PAGE-GUIDE-V1.md) | JSON 디버그 SSR 테스트 페이지 작성 가이드 | ACTIVE |
| [DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1](rules/DOCUMENT-LIFECYCLE-AND-ARCHIVE-RULES-V1.md) | 문서 상태 · archive · 헤더 형식 정본 | ACTIVE |
| [ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01](reference/ESM-CIRCULAR-DEPENDENCY-ANALYSIS-V01.md) | TypeORM Entity ESM 규칙(type-only import + 문자열 관계)의 근거 분석 | ACTIVE |
| `docs/local/TEST-ACCOUNTS.local.md` | 검증용 테스트 계정 SSOT — **로컬 전용 · git 미추적** · 자격증명 하드코딩 금지 | ACTIVE |

## 8. 콘텐츠 저작 진입점

| 문서 | 역할 | 상태 |
|---|---|---|
| [guides/common/DOCUMENT-INDEX](guides/common/DOCUMENT-INDEX.md) | 설명서 · QR · POP · 블로그 · 동영상 등 콘텐츠 규칙의 **단일 진입점** (common / content-authoring / ai / products / services 5축, Rule Registry CR/DR/AR). 하위 규칙(예: [STORE-PRODUCT-DESCRIPTION-POLICY](guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md) → [DRUG-WRITING](guides/products/drug/DRUG-WRITING.md))은 그 문서가 관리한다 — 여기 복제하지 않는다 | ACTIVE |

## 9. 판정 대기 · 상태 주의

| 문서 | 상황 | 상태 |
|---|---|---|
| [O4O-RETAIL-STABLE-V1](platform/architecture/O4O-RETAIL-STABLE-V1.md) | `channel_type='B2C'` storefront closed loop 을 기술 — [COMMERCE-BOUNDARY](baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) §2 · §12 와 충돌 후보. 결제 leg 은 이미 `410` 으로 차단. 동 문서 §8 판정 전까지 `UNKNOWN` — **기능 복구·확장 금지** (문서 헤더 2026-08-25 표기 참조) | 판정 대기 |
| [E-COMMERCE-ORDER-CONTRACT](baseline/E-COMMERCE-ORDER-CONTRACT.md) | 기술 계약. **유효한 부분**: 주문 생성은 `checkoutService.createOrder()` 단일 지점 · `*_orders` / `*_payments` 독립 테이블 금지. **stale 부분**: §3 · §5 · §7.2 의 `OrderType` 열거(GLYCOPHARM 서비스 삭제 2026-09-08 · DROPSHIPPING 제거 · 엔티티가 `order_type` 컬럼을 매핑하지 않음). 현행 살아있는 주문 축의 정본은 [B2B 계약](baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md). 본문 정리는 후속 docs 정비 | 판정 대기 |
| [GLYCOPHARM-LEGACY-POSTMORTEM](baseline/legacy/GLYCOPHARM-LEGACY-POSTMORTEM.md) | GlycoPharm 서비스 제거 경위 — legacy 판정 기록 | ACTIVE |

---

*이 색인은 `docs/README.md`(폴더 구조 안내) 와 `docs/baseline/README.md` 를 대체하지 않는다. 세 문서의 관계 정리는 후속 docs 정비 범위.*
