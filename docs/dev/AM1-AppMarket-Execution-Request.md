# AM1 – AppMarket Current State 조사 실행 요청서

**작성일**: 2025-11-28
**Phase**: AM1 – 조사 실행
**상태**: ✅ 실행 중

---

## 1. 목적

현재 O4O 플랫폼에 내장된 모든 앱 후보 기능을, 향후 "앱 장터(App Market)"에서
다운로드/설치/업그레이드/삭제 가능한 구조로 전환하기 위한 **현 상태 전수 조사**를 수행한다.

이 문서는 이미 작성된 다음 3개 템플릿/요청서를 실제 "조사 실행" 단계로 전환하기 위한 실행 지시서이다.

- `docs/dev/AM1-AppMarket-Investigation-Request.md`
- `docs/dev/audit/app_market_current_apps_overview.md`
- `docs/dev/audit/forum_current_state.md`

---

## 2. 조사 범위

### A. 전체 앱 후보 전반 조사

**대상 문서**

- `docs/dev/audit/app_market_current_apps_overview.md`

**조사 목표**

현재 서비스에 함께 설치되어 있는 기능들을 "앱 후보(App Candidate)" 단위로 식별하고,

- 각 기능의 코드 위치(프론트/백엔드),
- 라우팅 구조,
- RBAC 연결 상태,
- CPT/ACF·DB 구조,
- Feature Flag/설정/환경 변수

를 체계적으로 정리한다.

### B. Forum 기능 상세 조사

**대상 문서**

- `docs/dev/audit/forum_current_state.md`

**조사 목표**

Forum 기능을 향후 독립된 "Forum App"으로 분리하기 위해,

- 코드 구조(프론트/백엔드/Admin),
- 데이터 구조(CPT/ACF, Entity, 테이블, 메타),
- RBAC/설정/Feature Flag,
- Forum 제거 시 영향 범위

를 상세히 조사한다.

---

## 3. 조사 항목 요약

### 3.1 A-1 ~ A-5 (앱 후보 전반 조사)

대상: `docs/dev/audit/app_market_current_apps_overview.md`

- **A-1: 앱 후보 목록 및 코드 위치**
  - 앱 후보 이름, 역할, 주요 기능 요약
  - 프론트/백엔드 코드 경로, 주요 컴포넌트/서비스/엔티티
- **A-2: 라우팅 구조**
  - React Router v6 경로, Express/API 경로
  - 앱 단위로 분리 가능한 라우트 식별
- **A-3: RBAC(역할/권한)**
  - 사용 중인 역할, 권한 키, Guard 로직
- **A-4: CPT/ACF & DB 구조**
  - 관련 CPT/ACF 이름, TypeORM Entity, 테이블/관계
- **A-5: 설정/Feature Flag/환경 변수**
  - 기능 온/오프 스위치, env/config 의존성

### 3.2 B-1 ~ B-3 (Forum 상세 조사)

대상: `docs/dev/audit/forum_current_state.md`

- **B-1: Forum 코드 구조**
  - 프론트 페이지/컴포넌트/Hooks/Store
  - Admin 화면, 서버 라우트/컨트롤러/서비스/엔티티
- **B-2: Forum 데이터/권한/설정**
  - Entity/테이블, 메타/첨부, RBAC 권한 키, Feature Flag
- **B-3: Forum 제거 시 영향 범위**
  - 메뉴/링크, 검색/알림/대시보드/프로필 연동
  - 조건부 렌더링/Guard, 제거 시 오류 가능 지점

---

## 4. 조사 방법(가이드)

1. 코드 전체에서 다음 키워드로 검색:
   - `forum`, `dropshipping`, `catalog`, `review`, `dashboard`, `settlement`, `route`, `router`,
     `Controller`, `Service`, `@Entity`, `CPT`, `ACF`, `FeatureFlag`, `useFeature`
2. 각 앱 후보별로:
   - 프론트: `apps/main-site`, `apps/admin-dashboard` 하위 페이지/컴포넌트/Hook 위치 기록
   - 백엔드: `apps/api-server` 또는 `services/*` 하위 라우트/컨트롤러/서비스/Entity 기록
3. 조사 결과는 템플릿의 표/체크리스트를 그대로 활용해 **사실(Fact) 위주로 작성**한다.
4. 추측이나 설계 의견은 "비고/메모" 섹션에만 작성하고, 조사의 본문에는 넣지 않는다.

---

## 5. 완료 기준 (DoD)

다음 두 문서가 모두 **실제 조사 결과로 채워진 상태**가 되면 AM1 조사는 완료된 것으로 간주한다.

- `docs/dev/audit/app_market_current_apps_overview.md`
- `docs/dev/audit/forum_current_state.md`

AM1 완료 후, 다음 단계로 진행한다.

- **AM2 – App Market V1 설계**
  - AppManager, manifest, 레지스트리, 관리자 UI 설계
- **AM3 – Forum App 분리 설계**
  - Forum 기능을 독립 앱으로 분리하고 AppManager로 관리하는 구조 설계

---

## 6. 에이전트 실행 명령 예시

다음과 같이 Codex/Claude Code 에이전트에게 요청하여 AM1 조사를 실행한다.

> "`docs/dev/AM1-AppMarket-Execution-Request.md`에 따라
> `docs/dev/audit/app_market_current_apps_overview.md`와
> `docs/dev/audit/forum_current_state.md`를 채우는 AM1 조사를 수행해 주세요."

---

**End of Document**
