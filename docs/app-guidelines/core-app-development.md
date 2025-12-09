# Core App Development Guideline (v1.0)

> O4O Platform Core App 개발 표준 규칙
> Claude Code가 Core App 개발 시 반드시 따라야 하는 문서

---

## 1. Purpose

이 문서는 O4O Platform의 **Core App 개발에 필요한 모든 표준 규칙**을 정의합니다.
Core App은 플랫폼 전체 생태계의 기반을 제공하므로 높은 안정성과 일관성이 필요합니다.

Core 개발 규칙은 다음을 목표로 합니다:

- 생태계 전체의 구조적 안정성 보장
- Core App의 변경이 Extension/App에 미치는 충격 최소화
- Domain Boundary 유지
- AppStore 기반 설치/삭제/업데이트의 일관성 보장
- 향후 리팩토링 시 예측 가능한 구조 유지

---

## 2. Scope

본 규칙은 다음 Core Apps에 적용됩니다:

- `user-core`
- `auth-core`
- `organization-core`
- `commerce-core`
- `dropshipping-core`
- `forum-core`
- `lms-core`
- `health-core` (예정)
- 이들과 동일 계층의 앞으로 생성될 Core Apps

---

## 3. Core App의 철학 (Core Principles)

### 3.1 Core App은 플랫폼의 "백본(Backbone)"이다

Core는 여러 Extension과 Service App이 공유하는 기반 기능입니다.
따라서 다음을 만족해야 합니다:

- 변경 시 영향도 분석 필수
- 안정성, 일관성, 표준화 우선
- 최소한의 책임만 유지
- 확장 포인트 명확히 제공

### 3.2 Core는 Extension 또는 Service App에 의존하면 안 된다

순환 의존성은 전체 시스템 장애를 일으키므로 명확히 금지한다.

**허용되는 의존성:**

```
Core -> Core
Extension -> Core
Service -> Core
Service -> Extension
```

**금지되는 의존성:**

```
Core -> Extension (X)
Core -> Service (X)
Extension -> Service (X)
Service -> Service (X)
```

---

## 4. Core App 구조 규칙 (Architecture Standard)

### 4.1 디렉토리 구조

Core App은 반드시 다음 구조를 가져야 한다:

```
packages/{core-app}/
  ├── src/
  │    ├── backend/
  │    │     ├── entities/
  │    │     ├── services/
  │    │     ├── controllers/
  │    │     ├── routes/
  │    │     └── index.ts
  │    ├── permissions/
  │    └── utils/
  ├── lifecycle/
  ├── manifest.ts
  └── package.json
```

### 4.2 backend/index.ts 규칙

```ts
export * from './entities';
export * from './services';
export * from './controllers';
export const entities = [...];
export const services = {...};
```

-> AppStore Module Loader가 Core 엔진을 안정적으로 인식하기 위한 필수 규칙.

---

## 5. Entity 규칙 (Core Entity Standards)

Core Entity는 **절대 Service, Extension, api-server에 의존하면 안 됨**.

### 5.1 Naming

- PascalCase 사용 (예: `OrganizationUnit`, `ForumPost`)
- id 필드는 `uuid` 또는 `increment` 중 Core 정책을 따름
- 필드명은 snake_case 금지

### 5.2 관계 규칙

- Core끼리만 관계 가능 (예: Organization <-> User 가능)
- Extension Entity와 직접 관계 맺기 금지

예:
- forum-core <-> organization-core 관계는 허용됨
- 그러나 forum-yaksa -> forum-core 관계는 Extension 내부에서만 구성해야 함

### 5.3 metadata 규칙

- metadata는 반드시 JSON 규칙 사용
- arbitrary key 금지
- metadata schema는 문서에 명시되어야 함

---

## 6. Service Layer 규칙

### 6.1 서비스는 다음 책임만 가진다:

- 도메인 로직
- validation
- 이벤트 발생
- repository 연동

### 6.2 controller -> service 직접 호출

Controller 내부에 도메인 로직이 들어가면 안 된다.

### 6.3 event model 규칙

Core는 다음 이벤트만 trigger할 수 있음:

```
core:entity.created
core:entity.updated
core:entity.deleted
core:workflow.changed
```

확장앱은 이 이벤트를 subscribe 가능.

---

## 7. Controller & API 규칙

### 7.1 Prefix 규칙

모든 Core API는 `/api/v1/{core-id}` prefix를 사용해야 한다.

예:
- `/api/v1/forum/posts`
- `/api/v1/organization/groups`

### 7.2 DTO 규칙

- DTO 파일은 `dtos/` 폴더 사용
- class-validator 필수
- ResponseDto는 반드시 생성

---

## 8. Manifest 규칙

manifest.ts는 Core App의 "계약서"이다.

### 필수 항목

- appId
- displayName
- version
- requiredApps (Core only)
- ownsTables
- lifecycle -> onInstall/onActivate/onDeactivate/onUninstall
- exposes -> entities/services/routes

모든 Core App 테이블은 ownsTables에 선언되어야 함.

---

## 9. Lifecycle 규칙

Core App은 반드시 4가지 lifecycle을 제공해야 한다.

| Hook | 역할 |
|------|------|
| install | 초기 테이블/기본 데이터 생성 |
| activate | 이벤트 핸들러 등록, 기본 설정 활성화 |
| deactivate | 이벤트 핸들러 해제 |
| uninstall | 테이블 제거 또는 soft-delete |

Extension보다 lifecycle 책임이 훨씬 크므로
CRUD 수준이 아닌 "도메인 초기화"를 포함해야 함.

---

## 10. Dependency Rules

### 10.1 Core는 다음만 import 가능:

- 다른 Core App
- @o4o/utils 등 공용 라이브러리
- 표준 npm 패키지

### 10.2 금지

- api-server 내부 경로 import (X)
- Service App import (X)
- Extension import (X)

모두 발생 시 CRITICAL.

---

## 11. Versioning Policy

### SemVer 사용:

- major: breaking change
- minor: backward-compatible feature
- patch: bug fix

### Core App 변경 시:

- 영향받는 Extension/App 목록 생성
- refactoring guideline 준수
- changelog에 기록

---

## 12. Testing Standard

Core App은 다음 테스트를 통과해야 함:

| 테스트 | 내용 |
|--------|------|
| install test | install hook 정상 동작 |
| activate test | event 등록 오류 없음 |
| API test | GET/POST/PUT/DELETE 정상 |
| lifecycle uninstall test | orphan data 없음 |
| dependency test | Module Loader 오류 없음 |

---

## 13. Forbidden Rules (절대 금지)

- Core -> Extension import
- Core -> api-server import
- Service 로직을 Core에 두는 것
- hard-coded URL
- lifecycle 누락
- metadata에 임의 필드 추가
- entity를 Extension에서 override

발견 즉시 refactoring 필요.

---

## 14. Appendix

(후속 버전에서 Core App 전체 구조 다이어그램, 예제 코드 포함)

---

*최종 업데이트: 2025-12-09*
