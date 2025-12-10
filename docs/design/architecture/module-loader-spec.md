# Module Loader Specification

## 1. 목적(Purpose)

Module Loader는 AppStore가 로드한 앱의 manifest.ts를 기반으로,
Backend 모듈(Entities, Routes, Services) 및 Lifecycle 코드를 자동으로 등록·실행하는 엔진이다.
앱이 추가될 때마다 시스템 구조를 수동 수정하지 않아도 되도록 해주는 핵심 자동화 컴포넌트이다.

## 2. 개요(Overview)

- 모든 앱의 backend 구조는 `/backend/index.ts` 또는 지정된 엔트리에서 자동 로딩됨.
- manifest.ts는 Module Loader가 해석할 수 있는 표준 형태의 선언 구조를 제공.
- Loader는 의존성 그래프를 기반으로 앱 로드 순서를 결정하여 충돌을 방지.
- Backend가 통합된 뒤 CMS, Navigation, API 시스템과 자동 연결된다.

## 3. 핵심 구성요소(Key Components)

### 1) Manifest Loader
- 앱의 manifest.ts를 읽어 메타정보와 backend 경로를 추출.
- dependencies, cpt, acf, views, routes 등 필요한 정보만 전달받음.

### 2) Backend Loader
- backend/index.ts에서 Export한 Router, Entities, Services를 자동 등록.
- NestJS Module 또는 Express Router 형태로 통합.

### 3) Lifecycle Executor
- install / activate / deactivate / uninstall Hook을 순서대로 실행.
- 각 Hook은 앱의 lifecycle/ 디렉토리에서 정의.

### 4) Dependency Resolver
- manifest.dependencies 기반으로 로드 순서를 결정.
- 순환 참조 발생 시 에러 출력 및 로드 중단.

## 4. 동작 구조(Architecture / Flow)

### 로딩 순서

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
│   Lifecycle    │
│   Executor     │
│ (Hook 실행)     │
└────────────────┘
```

### 의존성 해석 흐름

```
forum-cosmetics
    └── depends on: forum-yaksa
                        └── depends on: forum-core
                                            └── depends on: organization-core

로드 순서: organization-core → forum-core → forum-yaksa → forum-cosmetics
```

### Backend 통합 구조

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

## 5. 개발 및 유지보수 규칙(Development Rules)

1. **backend/index.ts 필수 Export**: Router/Entities/Services를 반드시 export해야 한다.
2. **dependencies 정확성**: manifest.ts의 dependencies는 정확하게 작성해야 순서 충돌이 없다.
3. **Idempotent Hook**: install Hook에서는 반드시 idempotent(중복 실행 안전)하게 구현한다.
4. **Route Prefix 규칙**: routes 등록 시 prefix는 manifest에서 가져오는 구조를 유지한다.
5. **앱 단위 해결 우선**: Loader 내부 로직을 수정하기보다, 앱 단위에서 문제를 해결하는 접근을 우선한다.

---
*최종 업데이트: 2025-12-10*
*상태: 초안 완료*
