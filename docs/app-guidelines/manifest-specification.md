# AppStore Manifest Specification (v1.0)

> O4O Platform AppStore Manifest 규격 문서
> 모든 앱(Core, Extension, Service)이 따라야 하는 유일한 공식 manifest 규격

---

## 1. Purpose

이 문서는 O4O Platform의 AppStore에 등록되는 모든 앱이 따라야 하는
**manifest.ts 규격(Standard Schema)**을 정의합니다.

Manifest는 다음 역할을 수행합니다:

- App의 정체성(identity) 정의
- 설치/활성화 규칙 제공
- Core/Extension/App 간 dependencies 선언
- lifecycle 경로 지정
- backend/frontend 구조 연결
- AppStore UI 구성 요소 등록

---

## 2. Scope

본 Specification은 다음 모든 앱에 적용됩니다:

- Core Apps
- Extension Apps
- Integration Apps
- Service Apps
- Standalone Apps

**AppStore에 설치되는 모든 앱은 manifest.ts 없이는 존재할 수 없다.**

---

## 3. Manifest 위치 및 파일명

### 3.1 파일명

```
manifest.ts
```

### 3.2 위치

앱 폴더 경로:

```
packages/{app-id}/src/manifest.ts
```

AppStore는 이 위치만을 스캔한다.

---

## 4. 전체 Manifest 구조 (Full Schema)

다음은 manifest의 완전한 구조이다:

```ts
export default {
  appId: string,                    // 필수
  displayName: string,              // 필수
  version: string,                  // 필수 (semver)
  appType: 'core' | 'extension' | 'service' | 'standalone',

  dependencies?: {
    core?: string[],                // Core 앱에 대한 의존
    extension?: string[],           // Extension 앱에 대한 의존
  },

  ownsTables?: string[],            // DB 테이블 소유권 선언

  backend?: {
    entities?: string[],            // backend/entities
    services?: string[],            // backend/services
    controllers?: string[],         // backend/controllers
    routes?: string[],              // backend/routes
  },

  frontend?: {
    admin?: string[],               // admin-dashboard pages
    main?: string[],                // main-site pages
  },

  lifecycle?: {
    onInstall?: string,             // './lifecycle/install.js'
    onActivate?: string,            // './lifecycle/activate.js'
    onDeactivate?: string,          // './lifecycle/deactivate.js'
    onUninstall?: string,           // './lifecycle/uninstall.js'
  },

  permissions?: {
    [permissionName: string]: {
      description: string,
      roles?: string[],             // optional
    },
  },

  menus?: {
    admin?: Array<{
      section?: string,
      route: string,
      label: string,
    }>,
  },

  exposes?: {
    entities?: string[],
    services?: string[],
    routes?: string[],
  },
};
```

---

## 5. 필수 필드 설명

### 5.1 appId

- 전역적으로 유일한 문자열
- kebab-case 권장

예:

```
'forum-core'
'dropshipping-cosmetics'
'membership-yaksa'
```

### 5.2 displayName

AppStore UI에 표시되는 이름.

### 5.3 version

semver 규칙 반드시 준수:

```
major.minor.patch
```

### 5.4 appType

App의 계층을 정의한다:

| appType | 설명 |
|---------|------|
| core | 플랫폼 기반 엔진 |
| extension | Core 확장 기능 |
| service | 사용자-facing 기능 |
| standalone | 독립 기능 |

---

## 6. dependencies 규칙 (가장 중요한 섹션)

### 6.1 core 의존성 규칙

Extension 또는 Service 앱이 Core 기능을 사용하면 반드시 선언:

```ts
dependencies: {
  core: ['forum-core', 'organization-core'],
}
```

### 6.2 extension 의존성 규칙

확장앱이 다른 확장앱을 기반으로 하는 경우:

```ts
dependencies: {
  extension: ['organization-forum']
}
```

### 6.3 금지 규칙

- Core 앱은 extension이나 service에 의존하면 안 된다
- Service 앱끼리 의존하면 안 된다
- api-server를 직접 참조하면 안 된다

발견 시 CRITICAL.

---

## 7. ownsTables 규칙

### 7.1 목적

AppStore가 uninstall 시 테이블을 정리하기 위함.

### 7.2 규칙

- backend/entities에 있는 모든 Entity 이름을 일치시켜야 한다
- Core App은 반드시 ownsTables를 정의해야 한다
- Extension도 독자적 entity가 있다면 ownsTables 필요

예:

```ts
ownsTables: ['ForumPost', 'ForumCategory']
```

---

## 8. backend specification 규칙

### 8.1 backend.entities

TypeORM entity 목록.

### 8.2 backend.services

Service class 리스트.

### 8.3 backend.controllers

모든 controller class 포함.

### 8.4 backend.routes

라우트 파일 경로.

### 8.5 금지

- 외부 경로 import
- api-server 상대 경로
- Core entity override

---

## 9. frontend specification 규칙

### 9.1 admin-ui pages

Admin Dashboard에 메뉴 연결 가능.

예:

```ts
frontend: {
  admin: ['./frontend/admin/pages/ForumDashboard.tsx']
}
```

### 9.2 main-site pages

사용자-facing 화면.

---

## 10. lifecycle 규칙

### 10.1 install

- 초기 테이블 생성
- 기본 데이터 삽입

### 10.2 activate

- 이벤트 핸들러 등록
- 설정 활성화

### 10.3 deactivate

- 이벤트 해제

### 10.4 uninstall

- 테이블 soft-delete / 정리

### 10.5 필수 여부

모든 앱은 최소 install/uninstall 필요.

---

## 11. permissions

API 보호 및 기능 공개 범위를 정의.

예:

```ts
permissions: {
  'forum.manage': {
    description: 'Manage all forum boards',
    roles: ['admin', 'moderator']
  }
}
```

---

## 12. menus 규칙

Admin Dashboard에서 앱 메뉴를 구성:

```ts
menus: {
  admin: [
    { section: 'Forum', route: '/forum', label: 'Forum Dashboard' }
  ]
}
```

---

## 13. exposes 규칙

다른 앱에서 import 가능한 backend 기능을 정의한다.

예:

```ts
exposes: {
  entities: ['ForumPost', 'ForumCategory'],
  services: ['ForumService']
}
```

---

## 14. Installation Order Rules

AppStore는 다음 순서로 설치한다:

1. Core
2. Extension
3. Service
4. Standalone

필요 조건 충족되지 않으면 오류 반환.

---

## 15. Validation Rules (AppStore 검사)

AppStore는 manifest를 기반으로 다음을 검사한다:

- 필수 필드 존재 여부
- dependencies 충족 여부
- lifecycle 경로 존재 여부
- ownsTables <-> entities 일치 여부
- version semver 검사
- backend/frontend 경로 검사

---

## 16. Forbidden Manifest States (금지 상태)

다음 상태는 CRITICAL 오류로 간주된다:

| 금지 상태 | 설명 |
|-----------|------|
| Core -> Extension 의존 | 구조 위반 |
| Core lifecycle 누락 | 설치 불가 |
| extension -> service 의존 | 구조 오염 |
| ownsTables 누락 | uninstall 불능 |
| api-server import | 구조 위반 |

---

## 17. Example Manifests

### 17.1 Core App Example

```ts
export default {
  appId: 'forum-core',
  displayName: 'Forum Core',
  appType: 'core',
  version: '1.0.0',
  dependencies: { core: ['organization-core'] },
  ownsTables: ['ForumPost', 'ForumBoard', 'ForumCategory'],
  backend: {
    entities: ['ForumPost', 'ForumBoard', 'ForumCategory'],
    services: ['ForumService'],
    controllers: ['ForumController'],
  },
  lifecycle: {
    onInstall: './lifecycle/install.js',
    onActivate: './lifecycle/activate.js',
    onDeactivate: './lifecycle/deactivate.js',
    onUninstall: './lifecycle/uninstall.js',
  },
  exposes: {
    entities: ['ForumPost', 'ForumCategory'],
    services: ['ForumService'],
  },
};
```

### 17.2 Extension Example

```ts
export default {
  appId: 'forum-yaksa',
  displayName: 'Forum Yaksa Extension',
  appType: 'extension',
  version: '1.0.0',
  dependencies: { core: ['forum-core', 'organization-core'] },
  ownsTables: ['YaksaForumConfig'],
  backend: {
    entities: ['YaksaForumConfig'],
    services: ['YaksaForumService'],
  },
  lifecycle: {
    onInstall: './lifecycle/install.js',
    onUninstall: './lifecycle/uninstall.js',
  },
  menus: {
    admin: [
      { section: 'Forum', route: '/forum/yaksa', label: 'Yaksa Forum' }
    ]
  },
};
```

---

## 18. Appendix

- manifest template
- Core dependency matrix
- Installation flow diagram

(향후 버전에서 추가 예정)

---

*최종 업데이트: 2025-12-09*
