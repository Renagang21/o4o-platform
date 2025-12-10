# Module Loader Specification

> O4O Platform Module Loader Architecture Specification

## 1. 목적 (Purpose)

Module Loader는 AppStore가 로드한 앱의 manifest.ts를 기반으로,
Backend 모듈(Entities, Routes, Services) 및 Lifecycle 코드를 자동으로 등록·실행하는 엔진이다.
앱이 추가될 때마다 시스템 구조를 수동 수정하지 않아도 되도록 해주는 핵심 자동화 컴포넌트이다.

---

## 2. 개요 (Overview)

- 모든 앱의 backend 구조는 `/backend/index.ts` 또는 지정된 엔트리에서 자동 로딩됨
- manifest.ts는 Module Loader가 해석할 수 있는 표준 형태의 선언 구조를 제공
- Loader는 의존성 그래프를 기반으로 앱 로드 순서를 결정하여 충돌을 방지
- Backend가 통합된 뒤 CMS, Navigation, API 시스템과 자동 연결

---

## 3. ModuleLoader vs AppManager 역할 분리

### 3.1 책임 분리 원칙

| 컴포넌트 | 책임 | 주요 기능 |
|----------|------|-----------|
| **ModuleLoader** | 코드·모듈 로딩 | manifest 파싱, ESM import, 의존성 해석, 코드 로드 |
| **AppManager** | 상태·활성화·Lifecycle 관리 | 앱 상태 전환, Lifecycle 실행, 이벤트 발행 |

### 3.2 역할 경계 도표

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        App Loading & Management                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                       ModuleLoader                               │   │
│   │                                                                  │   │
│   │  책임: "무엇을 로드할 것인가" (What to Load)                      │   │
│   │                                                                  │   │
│   │  • manifest.ts 파싱                                              │   │
│   │  • ESM dynamic import 실행                                       │   │
│   │  • dependencies 의존성 그래프 생성                                │   │
│   │  • 로드 순서 결정 (Topological Sort)                             │   │
│   │  • Entities, Routes, Services 코드 로드                          │   │
│   │  • Circular dependency 감지                                       │   │
│   │                                                                  │   │
│   └────────────────────────────┬────────────────────────────────────┘   │
│                                │                                         │
│                                │ 로드된 모듈 전달                         │
│                                ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                        AppManager                                │   │
│   │                                                                  │   │
│   │  책임: "어떻게 관리할 것인가" (How to Manage)                      │   │
│   │                                                                  │   │
│   │  • 앱 상태 관리 (pending → installed → active → inactive)       │   │
│   │  • Lifecycle Hook 실행 (install/activate/deactivate/uninstall)   │   │
│   │  • 앱 활성화/비활성화 제어                                         │   │
│   │  • Registry 등록 조율 (CPT, ACF, View 등)                         │   │
│   │  • 이벤트 발행 (app.installed, app.activated 등)                  │   │
│   │  • 권한 검증                                                      │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 상호작용 흐름

```
┌────────────┐      ┌──────────────┐      ┌────────────┐
│   AppStore │─────▶│ ModuleLoader │─────▶│ AppManager │
│  (요청)     │      │   (로딩)      │      │  (관리)     │
└────────────┘      └──────────────┘      └────────────┘
     │                     │                    │
     │  "forum-app 설치"    │                    │
     ├────────────────────▶│                    │
     │                     │ manifest 파싱       │
     │                     │ 의존성 해석         │
     │                     │ 코드 로드           │
     │                     ├───────────────────▶│
     │                     │  로드된 모듈 전달    │
     │                     │                    │ install Hook 실행
     │                     │                    │ 상태 → installed
     │                     │                    │ Registry 등록
     │                     │                    │ 이벤트 발행
     │◀───────────────────────────────────────────│
     │  "설치 완료"                               │
```

---

## 4. 핵심 구성요소 (Key Components)

### 4.1 Manifest Loader

- 앱의 manifest.ts를 읽어 메타정보와 backend 경로 추출
- dependencies, cpt, acf, views, routes 등 필요한 정보만 전달받음

### 4.2 Backend Loader

- backend/index.ts에서 Export한 Router, Entities, Services를 자동 등록
- NestJS Module 또는 Express Router 형태로 통합

### 4.3 Dependency Resolver

- manifest.dependencies 기반으로 로드 순서 결정
- 순환 참조 발생 시 에러 출력 및 로드 중단

### 4.4 Lifecycle Executor (AppManager 영역)

- install / activate / deactivate / uninstall Hook을 순서대로 실행
- 각 Hook은 앱의 lifecycle/ 디렉토리에서 정의

---

## 5. 동작 구조 (Architecture / Flow)

### 5.1 로딩 순서

```
┌────────────────┐
│  App Registry  │
│  (앱 목록)      │
└───────┬────────┘
        ▼
┌────────────────┐
│ Manifest Loader│
│ (manifest 파싱) │
└───────┬────────┘
        ▼
┌────────────────┐
│  Dependency    │
│  Resolver      │
│ (순서 결정)     │
└───────┬────────┘
        ▼
┌────────────────┐
│ Backend Loader │
│ (모듈 등록)     │
└───────┬────────┘
        ▼
┌────────────────┐
│   AppManager   │
│  (상태 관리)    │
│ (Hook 실행)     │
└────────────────┘
```

### 5.2 의존성 해석 흐름

```
forum-cosmetics
    └── depends on: forum-yaksa
                        └── depends on: forum-core
                                            └── depends on: organization-core

로드 순서: organization-core → forum-core → forum-yaksa → forum-cosmetics
```

### 5.3 Backend 통합 구조

```
┌─────────────────────────────────────────────────────┐
│                   api-server                        │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ forum-core  │  │ cms-core    │  │ org-core    │ │
│  │  /routes    │  │  /routes    │  │  /routes    │ │
│  │  /entities  │  │  /entities  │  │  /entities  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 6. 개발 규칙 (Development Rules)

### 6.1 ModuleLoader 관련 규칙

1. **backend/index.ts 필수 Export**: Router/Entities/Services를 반드시 export해야 한다
2. **dependencies 정확성**: manifest.ts의 dependencies는 정확하게 작성해야 순서 충돌이 없다
3. **Route Prefix 규칙**: routes 등록 시 prefix는 manifest에서 가져오는 구조를 유지한다
4. **앱 단위 해결 우선**: Loader 내부 로직을 수정하기보다, 앱 단위에서 문제를 해결하는 접근을 우선한다

### 6.2 AppManager 관련 규칙

1. **Idempotent Hook**: install Hook에서는 반드시 idempotent(중복 실행 안전)하게 구현한다
2. **상태 전환 순서**: pending → installed → active → inactive 순서를 준수한다
3. **Registry 등록 시점**: activate Hook에서 Registry 등록을 수행한다
4. **정리 책임**: deactivate/uninstall에서 등록한 리소스를 정리한다

---

## 7. 관련 문서

| 문서 | 설명 |
|------|------|
| [appstore-overview.md](./appstore-overview.md) | AppStore 시스템 개요 |
| [view-system.md](./view-system.md) | View System 아키텍처 |
| [extension-lifecycle.md](./extension-lifecycle.md) | Extension Lifecycle 상세 |
| [manifest-specification.md](../../app-guidelines/manifest-specification.md) | Manifest 규격 |

---

*최종 업데이트: 2025-12-10*
*상태: Phase 14 리팩토링 완료*
