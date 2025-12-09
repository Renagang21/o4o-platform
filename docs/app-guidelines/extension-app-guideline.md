# Extension App Development Guideline (v1.0)

> O4O Platform Extension App 개발 표준 규칙
> Claude Code가 확장앱 개발 시 반드시 따라야 하는 문서

---

## 1. Purpose

이 문서는 O4O Platform에서 **확장앱(Extension App)**을 개발할 때
반드시 따라야 할 규칙과 구조를 정의합니다.

Extension App은 Core 기능을 **변경하거나 대체하는 것이 아니라**,
도메인별 요구 사항을 **추가·확장**하는 데 목적이 있습니다.
따라서 Core App과 달리 아래 요소가 필수입니다:

- Core 오염 금지
- 독립적 유지 가능
- 선택적 설치 가능
- AppStore 기반 확장성 준수

---

## 2. Scope

이 문서는 아래 유형의 앱에 적용됩니다:

- 특정 조직/도메인 확장을 위한 앱
  (예: forum-yaksa, organization-forum)
- 특정 상품군/서비스 확장을 위한 앱
  (예: dropshipping-cosmetics)
- 특정 고객군 또는 운영 방식 확장
  (예: sellerops-extension)
- 미래 도메인 확장 모듈
  (예: health-extension, cgm-connector 등)

---

## 3. Extension App의 철학 (Core Principles)

### 3.1 Core App은 절대 수정하지 않는다

Extension App은 다음을 **금지**한다:

- Core entity 수정
- Core service override
- Core controller override
- Core API route 재정의

### 3.2 Extension은 반드시 Core가 제공하는 확장 포인트만 사용한다

확장 포인트 종류:

- Events
- Hooks
- Metadata 확장
- Custom UI components
- Additional entities
- Additional routes

### 3.3 Extension은 "선택적(optional)"이어야 한다

앱이 설치되지 않아도 전체 시스템은 정상 동작해야 한다.

---

## 4. Extension App 구조 규칙

### 4.1 폴더 구조

```
packages/{extension-app}/
  ├── src/
  │    ├── backend/
  │    │     ├── entities/
  │    │     ├── services/
  │    │     ├── controllers/
  │    │     ├── routes/
  │    │     └── index.ts
  │    ├── frontend/
  │    │     ├── admin-ui/
  │    │     └── main-site/
  │    ├── hooks/
  │    ├── utils/
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

---

## 5. Allowed Behaviors (허용되는 확장 방식)

### 5.1 Core Event 구독 (recommended)

```ts
coreEvents.on('dropshipping.product.updated', async (payload) => {
  // extension logic
});
```

### 5.2 metadata 확장

Core entity를 건드리지 않고 metadata에 확장 정보 추가.

### 5.3 새로운 entity 추가

Core entity를 변경하지 않고, 독립적인 entity 생성 가능.

예:

```
CosmeticProductFilter
CosmeticRoutine
```

### 5.4 Core 서비스 호출

Core 서비스 인스턴스를 가져와 필요한 기능 호출 가능.

단, override는 금지.

---

## 6. Forbidden Behaviors (절대 금지 규칙)

다음은 Extension 개발 시 절대로 해서는 안 되는 행동입니다:

| 금지 항목 | 설명 |
|-----------|------|
| Core 엔티티 직접 수정 | Core 안정성 파괴 |
| Core 서비스 override | 전체 서비스 장애 가능 |
| api-server 상대 경로 import | CRITICAL 아키텍처 위반 |
| Service App import | 확장앱이 서비스 앱을 참조하면 안 됨 |
| Core 내 private 함수 호출 | 유지보수 불가 |
| Core 라우트 재정의 | 충돌 발생 |
| Core 구조를 무시한 임의의 폴더 생성 | 도구 자동화 실패 |

Claude Code는 위 항목을 반드시 지켜야 하며
위반 시 개발 실패로 간주합니다.

---

## 7. Dependency Rules

### 7.1 Extension은 Core App에 의존해야 한다

manifest.ts에서 반드시 다음을 선언:

```ts
dependencies: {
  core: ['forum-core', 'organization-core']
}
```

### 7.2 순환 의존 금지

Core <-> Extension 간 import는 절대 불가.

### 7.3 Service App 의존 금지

Service App은 최상위 계층이며, 확장앱보다 높은 기능 레벨을 가진다.

---

## 8. Lifecycle Rules

Extension App의 lifecycle 은 Core보다 simple 하지만 필수임.

| Hook | 역할 |
|------|------|
| install | Extension 테이블 생성, 초기 설정 |
| activate | 이벤트 구독, UI 노출 |
| deactivate | 이벤트 해제 |
| uninstall | 테이블 삭제 또는 soft-delete |

Extension install 시 Core가 먼저 설치되어 있어야 한다.

---

## 9. API Rules

### 9.1 prefix

```
/api/v1/{extension-id}/*
```

### 9.2 Core API override 금지

override가 필요한 경우 -> hook/event 기반으로 처리.

### 9.3 Response 규칙

Core DTO 규칙과 동일하게 따라야 함.

---

## 10. Frontend Integration

### 10.1 admin-dashboard에 메뉴 추가

manifest.ts에 메뉴 제공:

```ts
menus: [{ section: 'Extension', route: '/extension/cosmetics' }]
```

### 10.2 main-site 확장 화면

독립된 page로 구성하며 Core 페이지를 직접 수정하면 안 됨.

---

## 11. Test Standards

Extension App은 다음 테스트를 통과해야 함:

- install/activate/uninstall test
- event hook test
- API endpoint 충돌 검사
- Core 업데이트와의 호환성 검사

특히 Core 변경 후 Extension이 깨지지 않는지 반드시 테스트 필요.

---

## 12. Extension Compatibility Rules

Core가 업데이트될 때:

### Extension이 해야 하는 일:

- 영향도 분석
- metadata 구조 업데이트
- event hook 업데이트
- API prefix 유지
- Core 변경 로그 검토

Extension 개발자는 Core 변경 사항을 적극적으로 follow해야 함.

---

## 13. Example: forum-yaksa의 올바른 확장 방식

- forum-core에 게시판 생성 로직이 존재
- forum-yaksa는 install 단계에서 "약사회 조직 기반 카테고리"만 추가
- Core entity 수정 없음
- Core route override 없음
- UI는 admin-dashboard extension 메뉴로 구현

---

## 14. Example: dropshipping-cosmetics의 올바른 확장 방식

올바른 방식:

- dropshipping.product.updated 이벤트 구독
- 필터링 로직은 extension 내부에서 처리
- api-server 참조 없음
- Core override 없음

---

## 15. Forbidden Example

다음은 extension 개발에서 발견되면 즉시 리팩토링해야 하는 구조:

```ts
// 절대 금지
import { Something } from '../../../apps/api-server'
```

또는:

```ts
// 절대 금지 - Core entity 수정
ForumCategory { ... Core entity 수정 ... }
```

-> 즉시 금지.

---

## 16. Appendix

(향후 extension 예시 코드, UML, event 목록 추가 예정)

---

*최종 업데이트: 2025-12-09*
