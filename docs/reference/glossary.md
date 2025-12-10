# O4O Platform 공식 용어집 (Glossary)

> 최종 업데이트: 2025-12-10 (Phase 14)
> 총 용어: 55개

---

## Architecture Terms

| 용어 | 정의 | 주요 문서 |
|------|------|-----------|
| **CMS** | CPT, ACF, View System 기반 콘텐츠 관리 시스템 2.0 | cms-overview.md |
| **AppStore** | 앱 설치/활성화/비활성화/제거 관리 시스템 | appstore-overview.md |
| **ModuleLoader** | manifest.ts 기반 코드·모듈 자동 로딩 엔진 | module-loader-spec.md |
| **AppManager** | 앱 상태 관리, Lifecycle 실행, Registry 등록 담당 | module-loader-spec.md |
| **ViewSystem** | 컴포넌트 기반 렌더링 시스템 (페이지 기반 아님) | view-system.md |
| **View Registry** | View Component 중앙 등록/조회 시스템 | view-system.md |
| **Navigation Registry** | 앱 View/메뉴 자동 구성 시스템 | view-system.md |
| **Dynamic Router** | manifest.viewTemplates 기반 자동 라우팅 생성기 | view-system.md |
| **CPT** | Custom Post Type - 앱 데이터 구조 정의 단위 | cms-cpt-overview.md |
| **ACF** | Advanced Custom Fields - CPT 내 동적 필드 구조 | cpt-acf-development.md |
| **Taxonomy** | 콘텐츠 분류 체계 (Category, Tag) | cms-taxonomy-spec.md |
| **Multi-Tenancy** | 단일 플랫폼에서 다중 테넌트 격리 지원 | multi-tenancy.md |
| **RBAC** | Role-Based Access Control - 역할 기반 권한 시스템 | rbac-scope.md |
| **SSOT** | Single Source of Truth - 단일 진실 소스 패턴 | registry-architecture.md |
| **Block** | 페이지 에디터 구성 요소 | engine-spec.md |
| **Shortcode** | 동적 콘텐츠 임베딩용 텍스트 컴포넌트 | engine-spec.md |

---

## App Types

| 용어 | 정의 | 예시 |
|------|------|------|
| **Core App** | 플랫폼 기반 앱. Extension/Service 의존 금지 | forum-core, organization-core, cms-core |
| **Extension App** | Core 기능 확장 앱. Core 의존 필수 | forum-yaksa, membership-yaksa, sellerops |
| **Service App** | 사용자 대면 서비스 앱. Core+Extension 조합 | cosmetics-store, yaksa-intranet |
| **Integration App** | 다중 도메인 서비스 통합 앱 (향후) | - |
| **Standalone App** | Core 의존 없는 독립 기능 앱 | - |

---

## Lifecycle Terms

| 용어 | 정의 | 실행 시점 |
|------|------|-----------|
| **install** | 테이블 생성, 권한 등록, 기본 데이터 시드 | 앱 최초 설치 |
| **activate** | 라우트 등록, 이벤트 핸들러 활성화 | 설치 후 활성화 |
| **deactivate** | 라우트 해제, 이벤트 구독 해제 | 비활성화 시 |
| **uninstall** | 테이블 삭제, 데이터 정리 | 앱 제거 시 |
| **Lifecycle Hooks** | 4단계 앱 상태 관리: Pending → Installed → Active → Inactive | - |

---

## View Types

| 용어 | 정의 | 예시 |
|------|------|------|
| **ListView** | 데이터 목록 표시 뷰 | PostListView |
| **DetailView** | 단일 데이터 상세 뷰 | PostDetailView |
| **FormView** | 생성/수정 폼 뷰 | PostFormView |
| **DashboardView** | 대시보드/통계 뷰 | ForumDashboard |
| **ArchiveView** | 아카이브/검색 뷰 | CategoryArchiveView |
| **viewTemplates** | manifest에서 View Component 선언 필드 | - |
| **View Component** | viewTemplates 등록 재사용 UI 단위 | - |

---

## CMS Terms

| 용어 | 정의 | 관련 문서 |
|------|------|-----------|
| **Page** | 정적 페이지 CPT (About, Contact 등) | cms-cpt-overview.md |
| **Post** | 동적 콘텐츠 CPT (블로그, 뉴스 등) | cms-cpt-overview.md |
| **Media** | 미디어 파일 CPT (이미지, 동영상, 문서) | cms-media-spec.md |
| **Category** | 계층적 분류 Taxonomy | cms-taxonomy-spec.md |
| **Tag** | 비계층적 키워드 Taxonomy | cms-taxonomy-spec.md |
| **Template** | 페이지/뷰 렌더링 구조 | engine-spec.md |

---

## Core Components

| 용어 | 정의 |
|------|------|
| **Manifest** | 앱 정체성/의존성/구조 선언 파일 (manifest.ts) |
| **Registry** | 중앙 메타데이터 저장소 (CPT/Block/Shortcode/View) |
| **Entity** | TypeORM 데이터 모델 |
| **Service** | 도메인 로직 레이어 |
| **Controller** | API 엔드포인트 핸들러 |
| **Route/Router** | API 엔드포인트 정의 |
| **Permission** | API/기능 접근 제어 정의 |

---

## Multi-Tenancy Terms

| 용어 | 정의 | 관련 문서 |
|------|------|-----------|
| **Tenant** | 플랫폼을 사용하는 조직/고객 단위 | multi-tenancy.md |
| **TenantContext** | 현재 요청의 테넌트 정보 컨텍스트 | multi-tenancy.md |
| **Row-Level Security** | 테넌트 ID 컬럼 기반 데이터 격리 | multi-tenancy.md |
| **organizationId** | 테넌트 식별자 컬럼 | multi-tenancy.md |

---

## Patterns & Principles

| 용어 | 정의 |
|------|------|
| **Dependency Hierarchy** | Core ← Extension ← Service 엄격한 계층 규칙 |
| **Domain Boundary** | 앱 도메인 간 명확한 분리 |
| **Event-Based Extension** | Core 이벤트 구독 기반 확장 패턴 |
| **Metadata Expansion** | Core Entity 수정 없이 메타데이터 확장 |
| **API Wrapping** | Service App이 Core/Extension API 조합 |
| **Idempotent Operations** | 멱등성 - 여러 번 실행해도 동일 결과 |
| **Scope-Based RBAC** | 조직 단위 역할 할당 (scopeType='organization') |

---

## Manifest Fields

| 필드 | 설명 |
|------|------|
| **appId** | 전역 고유 앱 식별자 (kebab-case) |
| **appType** | 앱 계층: core, extension, service |
| **dependencies** | 필수 앱 선언: {core: [], extension: []} |
| **ownsTables** | 앱 소유 테이블 목록 |
| **lifecycle** | install/activate/deactivate/uninstall 훅 경로 |
| **exposes** | 다른 앱에 노출하는 entities/services/routes |
| **permissions** | API/기능 접근 제어 정의 |
| **menus** | admin dashboard 메뉴 등록 |
| **viewTemplates** | View Component 선언 |
| **cpt** | Custom Post Type 선언 |
| **acf** | Advanced Custom Fields 선언 |

---

## Related Documents

- [core-app-development.md](../app-guidelines/core-app-development.md)
- [extension-app-guideline.md](../app-guidelines/extension-app-guideline.md)
- [service-app-guideline.md](../app-guidelines/service-app-guideline.md)
- [manifest-specification.md](../app-guidelines/manifest-specification.md)
- [view-system.md](../design/architecture/view-system.md)
- [module-loader-spec.md](../design/architecture/module-loader-spec.md)
- [multi-tenancy.md](../design/architecture/multi-tenancy.md)
- [cms-cpt-overview.md](../specs/cms/cms-cpt-overview.md)

---

*최종 업데이트: 2025-12-10 (Phase 14 문서 리팩토링)*
