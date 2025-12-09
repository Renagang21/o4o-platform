# Service App Development Guideline (v1.0)

> O4O Platform Service App 개발 표준 규칙
> 사용자-facing 서비스 앱 개발 시 반드시 따라야 하는 문서

---

## 1. Purpose

이 문서는 O4O Platform의 **Service App**을 개발할 때
필요한 모든 구조, 규칙, 금지사항, 설계 원칙을 정의합니다.

서비스 앱은 사용자가 실제로 화면을 보고 사용하는 기능이므로
Core App 또는 Extension App과는 책임 범위가 본질적으로 다릅니다.

서비스 앱의 목표는 다음입니다:

- Core + Extension을 조합하여 하나의 완전한 서비스 흐름 구축
- 사용자-facing 기능을 안정적으로 제공
- AppStore 기반으로 독립 설치/업데이트 가능
- Frontend/Backend 일관성 확보

---

## 2. Scope

이 Guideline은 다음 유형의 앱에 적용됩니다:

- **cosmetics-store**
- **yaksa-intranet**
- **tourist-shopping-app**
- **health-pharmacy-app**
- **signage-app (frontend 중심)**
- 향후 생성되는 모든 도메인 서비스 앱

즉, **Core나 Extension이 아닌 최종 서비스 앱 전체**를 대상으로 합니다.

---

## 3. Core Principles (핵심 원칙)

### 3.1 서비스 앱은 "도메인 조합자(Composer)"이다

- Core 기능을 직접 구현하지 않는다
- Extension 기능을 수정하지 않는다
- Core + Extension + UI + 권한체계를 조합해서 **하나의 서비스 흐름을 만든다**

### 3.2 서비스 앱은 Frontend 중심이다

서비스 앱의 가장 큰 책임은 UI/UX 흐름입니다:

- main-site 페이지 구성
- admin-dashboard 서비스 화면 구성
- 사용자 흐름 설계

### 3.3 서비스 앱은 "닫힌 세계(Closed World)"를 가져야 한다

한 서비스 앱에서 다른 서비스 앱을 직접 import하거나 의존해선 안 된다.

예:
- tourist-app -> cosmetics-store import (금지)
- yaksa-intranet -> dropshipping-core service 직접 변경 (금지)

서비스 앱은 각각 독립적이어야 AppStore에서 독립 설치가 가능하다.

---

## 4. Folder Structure Standard

서비스 앱은 다음 구조를 반드시 따라야 한다:

```
packages/{service-app}/
  ├── src/
  │    ├── backend/
  │    │     ├── controllers/
  │    │     ├── services/
  │    │     └── routes/
  │    ├── frontend/
  │    │     ├── admin-ui/
  │    │     ├── main-site/
  │    │     └── components/
  │    ├── hooks/
  │    ├── utils/
  ├── manifest.ts
  ├── lifecycle/
  └── package.json
```

**서비스 앱의 backend는 Core/Extension backend를 호출하는 조정자 역할만 한다.**

---

## 5. Backend Rules (Service Backend)

### 5.1 Service App backend는 Core/Extension에 의존해야 한다

직접적인 도메인 로직을 포함해서는 안 된다.

### 5.2 Backend API는 다음 역할만 수행할 수 있다

- Core/Extension API 래핑
- 데이터 조합 (Aggregation)
- Frontend를 위한 간단한 가공

### 5.3 Forbidden

- Core entity 재정의 (금지)
- Extension override (금지)
- Business logic duplication (금지)
- api-server 직접 import (금지)

---

## 6. Frontend Rules (Service Frontend)

### 6.1 main-site 구성

- 사용자-facing 기능은 반드시 `/frontend/main-site/`에 위치
- Core API는 authClient 사용하여 호출

### 6.2 admin-dashboard 구성

- 관리자 화면은 `/frontend/admin-ui/`에 위치
- AppStore 메뉴와 연동 가능

### 6.3 hooks/api 규칙

모든 API 호출은 아래처럼 통일:

```ts
const response = await authClient.api.get('/api/v1/cosmetics/products');
```

### 6.4 UI 일관성

- 컴포넌트 리유즈
- NextGen UI 구조 준수
- shadcn/ui 기반 컴포넌트 사용

---

## 7. Service Logic Architecture

서비스 앱은 "Flow 기반 아키텍처"를 가져야 한다.

**예: cosmetics-store**

- 제품 조회
- 필터 적용
- 리뷰와 연계
- dropshipping-core의 주문/출고 연결

**예: yaksa-intranet**

- 회원 인증
- 조직·지부·분회 표시
- 게시판(Forum) 연결
- LMS 연결

서비스 앱은 이러한 플로우를 조합하는 책임을 가진다.

---

## 8. Permissions & Roles

### 8.1 서비스 앱은 Core permission을 그대로 사용해야 한다

단, 자신만의 서비스 역할을 추가할 수 있다.

예:

```ts
permissions: {
  'cosmetics.view': { roles: ['member', 'seller'] },
  'cosmetics.manage': { roles: ['admin'] },
}
```

### 8.2 금지

- Core permission override (금지)
- Extension permission override (금지)

---

## 9. Lifecycle Rules

서비스 앱 lifecycle에는 다음만 포함된다:

- install: 초기 설정
- activate: UI 구성/메뉴 등록
- deactivate: UI 해제
- uninstall: 데이터 정리

서비스 앱은 DB 스키마를 가지지 않는 것이 일반적이므로
Core/Extension 테이블만 참조하면 된다.

---

## 10. Dependency Rules

### 10.1 허용

- Service -> Core (허용)
- Service -> Extension (허용)

### 10.2 금지

- Service -> Service (금지)
- Service -> api-server (금지)
- Service -> 내부 Core override (금지)

---

## 11. API Naming Rules

서비스 앱은 다음 규칙을 따른다:

```
/api/v1/{service-id}/...
```

그러나 도메인 로직이 Core에 있는 경우,
Service App의 API는 래퍼 역할이며 Core API를 직접 호출해야 한다.

---

## 12. Testing Standards

서비스 앱 테스트는 UI + API 기반으로 수행한다.

**필수 테스트:**

- [ ] main-site 페이지 렌더링 검증
- [ ] admin-ui 메뉴 노출 확인
- [ ] Core API 연동 성공 여부
- [ ] install -> activate -> uninstall 테스트
- [ ] Core 변경 시 서비스 앱 영향 테스트

---

## 13. Forbidden Rules (절대 금지)

| 금지 | 이유 |
|------|------|
| Core entity 수정 | 구조 붕괴 |
| Extension override | 확장 규칙 위반 |
| api-server 직접 import | 아키텍처 위반 |
| Service 간 import | 도메인 충돌 |
| Hard-coded API URL | SaaS 호환성 파괴 |
| Core logic duplication | 유지불가 |

---

## 14. Example: cosmetics-store

**허용된 구조:**

- 제품 정보는 commerce-core에서 가져옴
- 필터는 cosmetics-extension
- 주문은 dropshipping-core에 위임
- 리뷰는 forum-core와 연결 가능

**금지된 구조:**

- dropshipping-core order 엔티티 직접 수정
- cosmetics-extension 필터 로직 override

---

## 15. Example: yaksa-intranet

**정상 구조:**

- 회원 정보 -> membership-yaksa
- 조직 정보 -> organization-core
- 게시판 -> forum-yaksa
- 교육 -> lms-yaksa

서비스 앱은 이 모든 기능을 "조합"만 수행한다.

---

## 16. Appendix

향후 서비스 앱 구조 예시, UML, 추천 패턴 포함 예정.

---

*최종 업데이트: 2025-12-09*
