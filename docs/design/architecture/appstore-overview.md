# AppStore Overview

> ⚠ 본 문서는 CLAUDE.md v2.0을 기준으로 하며,
> 충돌 시 CLAUDE.md를 우선한다.

> O4O Platform AppStore Architecture Specification

## 1. 목적 (Purpose)

O4O Platform에서 **앱 단위로 기능을 정의, 설치, 활성화, 관리하는 중앙 시스템**이다.
WordPress의 플러그인/테마 시스템을 현대적으로 재해석하여, 독립적인 앱 단위 개발 및 배포가 가능하도록 설계되었다.

---

## 2. 개요 (Overview)

- AppStore는 O4O Platform의 **앱 라이프사이클 관리 시스템**이다
- 각 앱은 `manifest.ts`로 구조를 정의하며, Module Loader가 이를 자동으로 로드한다
- 앱은 CMS(CPT/ACF/View), API 모듈, Service 로직 등을 선언적으로 등록할 수 있다
- WordPress Plugin 구조를 현대적으로 재해석한 구조이며, 앱 단위 개발·배포가 가능해진다

---

## 3. 핵심 구성요소 (Key Components)

### 3.1 Manifest (manifest.ts)

앱의 메타정보, 의존성, 라우트, 메뉴, CPT/ACF, View 등을 선언하는 인터페이스

### 3.2 App 유형 체계 (CLAUDE.md §2.2 참조)

> ⚠ 전체 8가지 App Type은 CLAUDE.md §2.2를 참조

| 앱 타입 | AppStore 등록 | 설명 |
|---------|---------------|------|
| **core** | ✅ 필수 | 플랫폼/도메인 핵심 기능 |
| **feature** | ✅ 필수 | 역할 기반 기능 |
| **extension** | 서비스 Active 시 | Core 확장 기능 |
| **standalone** | ✅ 필수 | 독립 서비스 |
| **infra-core** | ❌ 비대상 | 빌드/런타임 인프라 |
| **utility** | ❌ 비대상 | 보조 도구 |
| **application** | ❌ 비대상 | /apps 실행체 |
| **legacy** | ❌ 비대상 | 폐기 예정 |

### 3.3 Lifecycle Hooks

- `install` → `activate` → `deactivate` → `uninstall` 순서로 실행됨

### 3.4 ModuleLoader + AppManager

| 컴포넌트 | 책임 | 관련 문서 |
|----------|------|-----------|
| **ModuleLoader** | manifest 파싱, 코드 로딩, 의존성 해석 | [module-loader-spec.md](./module-loader-spec.md) |
| **AppManager** | 앱 상태 관리, Lifecycle 실행, Registry 등록 | [module-loader-spec.md](./module-loader-spec.md) |

### 3.5 App Registry

- 현재 설치된 앱 목록과 상태 관리
- CMS, API, Navigation 등 시스템과 연동

---

## 4. 동작 구조 (Architecture / Flow)

### 4.1 앱 계층 구조

```
┌─────────────────────────────────────────────────────────────┐
│                      Service App                            │
│              (cosmetics-store, yaksa-intranet)              │
├─────────────────────────────────────────────────────────────┤
│                     Extension App                           │
│          (forum-yaksa, membership-yaksa, dropshipping)      │
├─────────────────────────────────────────────────────────────┤
│                       Core App                              │
│            (forum-core, organization-core, cms-core)        │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 앱 로딩 플로우 (ModuleLoader 연계)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  manifest.ts │───▶│ ModuleLoader │───▶│  AppManager  │───▶│ App Registry │
│              │    │  (코드 로딩)  │    │ (상태 관리)   │    │  (등록 완료)  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                           │
                           │ 모듈 로드
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  Entities  │  │   Routes   │  │  Services  │
    └────────────┘  └────────────┘  └────────────┘
```

### 4.3 의존성 규칙

| 허용 | 금지 |
|------|------|
| Core → Core | Core → Extension |
| Extension → Core | Core → Service |
| Service → Core | Extension → Service |
| Service → Extension | Service → Service |

### 4.4 상태 전환 다이어그램

```
┌─────────┐    install    ┌───────────┐   activate   ┌────────┐
│ Pending │──────────────▶│ Installed │─────────────▶│ Active │
└─────────┘               └───────────┘              └────────┘
                                │                        │
                                │                        │ deactivate
                                │                        ▼
                                │                   ┌──────────┐
                                │                   │ Inactive │
                                │                   └──────────┘
                                │                        │
                                │◀───────────────────────┘
                                │        reactivate
                                │
                                │ uninstall
                                ▼
                          ┌──────────┐
                          │ Removed  │
                          └──────────┘
```

---

## 5. 개발 규칙 (Development Rules)

1. **manifest.ts 필수**: 모든 앱은 반드시 manifest.ts를 통해 구조를 정의해야 함
2. **의존성 계층 준수**: Core ← Extension ← Service 방향으로만 의존 가능
3. **api-server 직접 import 금지**: 앱에서 api-server를 직접 참조하지 않음
4. **Lifecycle Hook 구현**: install/activate/deactivate/uninstall 훅을 적절히 구현
5. **관련 문서 참조**:
   - [core-app-development.md](../../app-guidelines/core-app-development.md)
   - [extension-app-guideline.md](../../app-guidelines/extension-app-guideline.md)
   - [service-app-guideline.md](../../app-guidelines/service-app-guideline.md)
   - [manifest-specification.md](../../app-guidelines/manifest-specification.md)

---

## 6. 관련 문서

| 문서 | 설명 |
|------|------|
| [module-loader-spec.md](./module-loader-spec.md) | ModuleLoader와 AppManager 역할 분리 상세 |
| [view-system.md](./view-system.md) | View System 아키텍처 |
| [extension-lifecycle.md](./extension-lifecycle.md) | Extension Lifecycle 상세 |
| [cms-overview.md](./cms-overview.md) | CMS 2.0 개요 |

---

*최종 업데이트: 2025-12-10*
*상태: Phase 14 리팩토링 완료*
