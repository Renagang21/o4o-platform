# AppStore Overview

## 1. 목적(Purpose)

O4O Platform에서 **앱 단위로 기능을 정의, 설치, 활성화, 관리하는 중앙 시스템**이다.
WordPress의 플러그인/테마 시스템을 현대적으로 재해석하여, 독립적인 앱 단위 개발 및 배포가 가능하도록 설계되었다.

## 2. 개요(Overview)

- AppStore는 O4O Platform의 **앱 라이프사이클 관리 시스템**이다.
- 각 앱은 `manifest.ts`로 구조를 정의하며, Module Loader가 이를 자동으로 로드한다.
- 앱은 CMS(CPT/ACF/View), API 모듈, Service 로직 등을 선언적으로 등록할 수 있다.
- WordPress Plugin 구조를 현대적으로 재해석한 구조이며, 앱 단위 개발·배포가 가능해진다.

## 3. 핵심 구성요소(Key Components)

### 1) Manifest (manifest.ts)
앱의 메타정보, 의존성, 라우트, 메뉴, CPT/ACF, View 등을 선언하는 인터페이스.

### 2) Core App / Extension App
- **Core App**: CMS, Commerce, Auth 등 플랫폼 기본 기능
- **Extension App**: Cosmetics, Dropshipping, Forum 등 확장 기능

### 3) Lifecycle Hooks
- `install` → `activate` → `deactivate` → `uninstall` 순서로 실행됨.

### 4) Module Loader
- manifest 기반으로 backend/frontend 모듈을 자동 로드.
- Entities, Routes, Services 등록.
- 의존성 검증 및 실행 순서 보장.

### 5) App Registry
- 현재 설치된 앱 목록과 상태 관리.
- CMS, API, Navigation 등 시스템과 연동.

## 4. 동작 구조(Architecture / Flow)

### 앱 계층 구조

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

### 앱 로딩 플로우

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  manifest.ts │───▶│ Module Loader│───▶│ App Registry │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │  Entities  │  │   Routes   │  │  Services  │
    └────────────┘  └────────────┘  └────────────┘
```

### 의존성 규칙

| 허용 | 금지 |
|------|------|
| Core → Core | Core → Extension |
| Extension → Core | Core → Service |
| Service → Core | Extension → Service |
| Service → Extension | Service → Service |

## 5. 개발 및 유지보수 규칙(Development Rules)

1. **manifest.ts 필수**: 모든 앱은 반드시 manifest.ts를 통해 구조를 정의해야 함.
2. **의존성 계층 준수**: Core ← Extension ← Service 방향으로만 의존 가능.
3. **api-server 직접 import 금지**: 앱에서 api-server를 직접 참조하지 않음.
4. **Lifecycle Hook 구현**: install/activate/deactivate/uninstall 훅을 적절히 구현.
5. **관련 문서 참조**:
   - `docs/app-guidelines/core-app-development.md`
   - `docs/app-guidelines/extension-app-guideline.md`
   - `docs/app-guidelines/service-app-guideline.md`
   - `docs/app-guidelines/manifest-specification.md`

---
*최종 업데이트: 2025-12-10*
*상태: 초안 완료*
