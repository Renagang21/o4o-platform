# O4O Platform 공식 용어집 (Glossary)

> 최종 업데이트: 2025-12-10 (Phase 11-C)
> 총 용어: 45개

---

## Architecture Terms

| 용어 | 정의 | 주요 문서 |
|------|------|-----------|
| **CMS** | CPT, ACF, View System 기반 콘텐츠 관리 시스템 2.0 | cms-overview.md |
| **AppStore** | 앱 설치/활성화/비활성화/제거 관리 시스템 | appstore-overview.md |
| **ModuleLoader** | manifest.ts 기반 백엔드 자동 로딩 엔진 | module-loader-spec.md |
| **ViewSystem** | 컴포넌트 기반 렌더링 시스템 (페이지 기반 아님) | view-system.md |
| **Navigation Registry** | 앱 View/메뉴 자동 구성 시스템 | view-system.md |
| **CPT** | Custom Post Type - 앱 데이터 구조 정의 단위 | cpt-acf-development.md |
| **ACF** | Advanced Custom Fields - CPT 내 동적 필드 구조 | cpt-acf-development.md |
| **RBAC** | Role-Based Access Control - 역할 기반 권한 시스템 | rbac-scope.md |
| **SSOT** | Single Source of Truth - 단일 진실 소스 패턴 | registry-architecture.md |
| **Block** | 페이지 에디터 구성 요소 | registry-architecture.md |
| **Shortcode** | 동적 콘텐츠 임베딩용 텍스트 컴포넌트 | registry-architecture.md |

---

## App Types

| 용어 | 정의 | 예시 |
|------|------|------|
| **Core App** | 플랫폼 기반 앱. Extension/Service 의존 금지 | forum-core, organization-core |
| **Extension App** | Core 기능 확장 앱. Core 의존 필수 | forum-yaksa, membership-yaksa |
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
| **viewTemplates** | manifest에서 View Component 선언 필드 | - |
| **View Component** | viewTemplates 등록 재사용 UI 단위 | - |

---

## Core Components

| 용어 | 정의 |
|------|------|
| **Manifest** | 앱 정체성/의존성/구조 선언 파일 (manifest.ts) |
| **Registry** | 중앙 메타데이터 저장소 (CPT/Block/Shortcode) |
| **Entity** | TypeORM 데이터 모델 |
| **Service** | 도메인 로직 레이어 |
| **Controller** | API 엔드포인트 핸들러 |
| **Route/Router** | API 엔드포인트 정의 |
| **Template** | 페이지/뷰 렌더링 구조 |
| **Permission** | API/기능 접근 제어 정의 |

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

---

## Related Documents

- [core-app-development.md](../app-guidelines/core-app-development.md)
- [extension-app-guideline.md](../app-guidelines/extension-app-guideline.md)
- [service-app-guideline.md](../app-guidelines/service-app-guideline.md)
- [manifest-specification.md](../app-guidelines/manifest-specification.md)
- [view-system.md](../design/architecture/view-system.md)

---

*자동 생성: Phase 11-C Final Stability Pass*
