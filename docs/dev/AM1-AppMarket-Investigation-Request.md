# AM1: App Market 현 상태 조사 요청서 (Current State Investigation)

**작성일**: 2025-11-28
**Phase**: AM1 – 조사 및 플랜 수립
**상태**: ⏳ 요청서 (조사 전)

## 1. 목표 및 범위

### 1.1 Phase 목표

AM1 Phase의 목표는 다음과 같습니다.

1. **현재 O4O 플랫폼에서 "앱" 후보 기능들이 어떻게 함께 설치·배포되어 있는지** 구조를 조사한다.
2. 향후
   * "앱 장터에서 앱을 다운로드/설치/업그레이드/삭제할 수 있는 환경"
     으로 전환하기 위해, **필수적으로 알아야 할 기존 구조와 제약사항**을 정리한다.
3. 첫 번째 실제 대상 앱으로 **Forum(게시판) 기능을 앱으로 분리하기 위한 사전 정보**를 수집한다.
   (단, AM1에서는 설계·리팩토링을 하지 않고, **있는 그대로의 상태를 기록**하는 데에만 집중한다.)

### 1.2 범위

포함:

* **apps/main-site**, **apps/admin-dashboard**, **api-server/services** 내에서
  "독립된 앱으로 분리될 가능성이 있는 기능"들의 구조 조사
* 특히 **Forum** 기능에 대한 상세 구조 조사
* 앱과 관련된:
  * 라우팅 구조 (웹 + API)
  * RBAC(역할/권한)
  * CPT/ACF 스타일 데이터 구조
  * 설정값/Feature Flag/환경변수
* "앱 장터(App Market) 인프라"를 만들 때 기반이 될 수 있는 코드/설계/문서 조사

제외(다른 Phase에서 처리):

* 실제 AppManager 구현 (install/activate/deactivate/uninstall)
* 앱 manifest 설계 및 레지스트리 테이블 설계
* Forum의 실제 분리/리팩토링 작업
* 멀티테넌트 / 서비스별 앱 번들(코스메틱, Yaksa B2B 등) 설계
* JSON 기반 CPT/ACF 시스템으로의 전체 전환

---

## 2. 전제 및 선행 정보

### 2.1 전제

* 현재 O4O 플랫폼의 "앱"들은 별도 앱 마켓 없이, **코어 서비스와 함께 빌드·배포·설치**되고 있다.
* 관리자는 개별 앱을 "설치했다/삭제했다"는 개념 없이,
  **한 덩어리의 기능 세트**로 시스템을 보고 있다.
* 실제 서비스는 아직 시작 전이므로, **의미 있는 운영 데이터는 거의 없거나 없다**고 가정한다.
  → 데이터 마이그레이션 문제는 후순위이며, 구조 파악에 집중한다.

### 2.2 선행 참고 문서

(있다면 조사 중에 이 섹션을 갱신)

* App Market 관련 기존 논의 문서 (있을 경우)
* 기능별 모듈/플러그인에 대한 설계 문서
* DB/CPT/ACF 구조 개요 문서
* RBAC/역할/권한 시스템 설계 문서

---

## 3. 조사 항목 A: "앱 후보" 기능 전반 조사

### A-1. "앱 후보" 기능 목록 및 코드 위치

**목표:**
현재 코드베이스에서 향후 "앱(App)"으로 분리될 수 있는 기능 단위를 식별한다.

조사 내용:

1. 기능 단위로 "앱 후보" 목록을 만든다. (예시, 실제 이름은 코드 기준)
   * Forum / 게시판
   * Dropshipping
   * Settlement / Commission
   * Notification / Messaging
   * Analytics / Reporting
   * 기타 독립성이 높은 기능들

2. 각 앱 후보에 대해 아래 정보를 표로 정리한다.
   * 앱 후보명 (예: `Forum`, `Dropshipping`, `Settlement` 등)
   * 주요 역할/기능 요약 (1~3줄)
   * 프론트엔드 코드 위치
     * 예: `apps/main-site/src/pages/...`, `apps/main-site/src/components/...`
   * 백엔드 코드 위치
     * 예: `services/api/src/modules/...`, `controllers/...`, `services/...`, `entities/...`
   * Admin UI 위치 (있다면)
     * 예: `apps/admin-dashboard/src/pages/...`
   * 현재 사용 중인지 여부 (실제 라우트/메뉴/버튼에서 쓰이는지)

**산출물 추천 파일:**

* `docs/dev/audit/app_market_current_apps_overview.md`
  * 섹션: "앱 후보 기능 목록" (표 형태)

---

### A-2. 라우팅 구조와 앱 단위의 관계

**목표:**
각 앱 후보가 **어떤 URL 경로를 점유하고 있는지** 파악하여,
추후 앱 활성/비활성 시 라우트를 제어할 수 있는지 판단한다.

조사 내용:

1. **프론트엔드 라우팅(React Router v6)**
   * 라우트 정의 파일/폴더 구조 파악
   * 앱 후보별 담당 URL 패턴 수집
     * 예:
       * Forum: `/forum`, `/forum/:id`
       * Dropshipping: `/dropshipping/...`
       * Settlement: `/dashboard/*/settlements` 등

2. **백엔드 라우팅(Express/Node)**
   * API 엔드포인트 중 앱 후보와 직접 연결된 경로 조사
     * 예: `/api/forum/...`, `/api/dropshipping/...`, `/api/settlements/...`

3. **라우팅과 앱의 경계**를 요약:
   * 앱별 라우트 prefix가 명확한지 (`/forum`, `/dropshipping`, `/settlements` 등)
   * 공통 라우트와 뒤섞여 있는지 여부

---

### A-3. RBAC(역할/권한)과 앱의 연결 상태

**목표:**
앱을 "설치/삭제"할 때, **권한도 함께 설정/해제할 수 있는지**를 알기 위한 기초 자료 수집.

조사 내용:

1. RBAC 시스템 개요:
   * 역할 목록 (user, member, contributor, seller, vendor, partner, operator, administrator 등)
   * 권한 키 네이밍 규칙 (예: `forum.read`, `dropshipping.manage` 등)

2. 각 앱 후보가 사용하는 권한 키 목록을 수집:
   * 예:
     * Forum: `forum.read`, `forum.write`, `forum.moderate`
     * Dropshipping: `dropshipping.view`, `dropshipping.manage`
     * Settlement: `settlement.view`, `settlement.export` 등

3. 권한 키가 **앱별로 잘 묶여 있는지**, 또는
   여러 앱이 동일한 키를 섞어 사용하는지 여부를 정리.

---

### A-4. CPT/ACF 스타일 데이터 구조 및 앱 연관성

**목표:**
앱 삭제 시 **어떤 데이터(CPT/ACF/Entity)를 "함께 정리해야 하는지"** 개략적인 범위를 파악한다.

조사 내용:

1. 현재 사용 중인 CPT/ACF 스타일 구조를 조사:
   * CPT에 해당하는 Entity나 테이블 목록
   * ACF에 해당하는 메타/JSONB 필드 목록

2. 각 앱 후보별로:
   * 관련 CPT/Entity 이름
   * 관련 ACF/메타 구조 간단 요약

3. "앱 단위 삭제" 관점에서,
   * **같이 삭제되는 것이 자연스러운 데이터 묶음**이 무엇인지 메모
   * *정확한 삭제 정책은 AM2 이후*, 지금은 **연결 관계만 기록**

---

### A-5. 설정/Feature Flag/환경변수와 앱 의존성

**목표:**
이미 존재하는 플래그/설정이 있다면, 이후 앱 활성/비활성 기능에 재사용할 수 있는지 확인한다.

조사 내용:

1. 앱 후보 기능들이 의존하는 설정값 조사
   * 환경변수, 설정 파일, Feature Flag 등
   * 예: `ENABLE_FORUM`, `ENABLE_DROPSHIPPING`, `FEATURE_SETTLEMENT_V2` 등

2. 각 플래그가
   * 어디에서 읽히는지 (프론트/백엔드 파일 위치)
   * 앱 동작에 어떤 영향을 주는지 간략히 요약

3. 향후 AppManager에서 사용할 수 있는 **플래그/설정 패턴**이 있는지 메모

---

## 4. 조사 항목 B: Forum 기능 상세 (앱 후보 1호)

Forum은 **가장 먼저 "앱 장터에서 설치하는 앱"으로 전환**할 가능성이 높으므로,
별도의 상세 조사를 수행한다.

### B-1. Forum 관련 코드 구조

조사 내용:

1. **프론트엔드**
   * Forum 페이지 컴포넌트 위치
     * 예: `apps/main-site/src/pages/forum/*`
   * Forum 공통 컴포넌트 (리스트, 상세, 작성/에디터, 모더레이션 등)
   * Forum 관련 hooks/store/slice (if any)

2. **백엔드**
   * Forum 관련 컨트롤러/라우트 파일
   * Forum 서비스/리포지토리
   * Forum 관련 Entity/테이블 구조

3. **라우팅**
   * 공개 라우트: `/forum`, `/forum/:topicId` 등
   * 관리자 라우트: `/admin/forum` 등

---

### B-2. Forum과 CPT/ACF, RBAC의 연결

조사 내용:

1. Forum 데이터 구조:
   * 토픽/댓글이 어떤 Entity/테이블에 저장되는지
   * 메타/JSON 구조(카테고리, 태그, 고정글 등)가 어떻게 되어 있는지

2. Forum 관련 권한:
   * 읽기/쓰기/삭제/모더레이션 권한 키 목록
   * 어떤 역할이 어떤 권한을 갖는지 개략 정리

3. Forum 관련 설정/Feature Flag 여부:
   * 예: `ENABLE_FORUM`, `FORUM_REQUIRE_LOGIN`, `FORUM_MOD_APPROVAL` 등

---

### B-3. Forum 비활성화/삭제 시 영향 범위

**목표:**
Forum을 "앱으로 분리 후 삭제 또는 비활성화"했을 때
어디에 영향이 있는지 미리 파악한다. (리팩토링 설계의 입력값)

조사 내용:

1. Forum 링크/메뉴가 노출되는 위치:
   * 헤더/푸터/사이드바 메뉴
   * 마이페이지/대시보드에서의 진입 포인트

2. Forum과 연계된 다른 기능이 있는지:
   * 알림 시스템
   * 포인트/레벨/뱃지
   * 검색/추천

3. Forum이 비활성화되었을 때,
   * 현재 코드에 Guard/조건부 렌더링이 있는지 여부
   * 없다면, **에러가 날 수 있는 지점**을 메모

---

## 5. 조사 산출물 구조

AM1 Phase 조사 결과는 다음 문서로 정리하는 것을 권장합니다.

1. `docs/dev/audit/app_market_current_apps_overview.md`
   * A-1 ~ A-5 내용 요약
   * "앱 후보 기능 목록" + 라우트 + 권한 + CPT/ACF + 설정

2. `docs/dev/audit/forum_current_state.md`
   * B-1 ~ B-3 내용 상세
   * Forum을 앱으로 분리할 때 필요한 정보(코드 위치/데이터 구조/연계 지점 목록)

---

## 6. 완료 기준 (Done 기준)

AM1 Phase는 아래 조건을 만족하면 "완료"로 본다.

1. `app_market_current_apps_overview.md`에서:
   * 최소 3개 이상 "앱 후보" 기능이 정리되어 있고,
   * 각 기능에 대해
     * 프론트/백엔드 코드 위치
     * 주요 라우트
     * 주요 권한
     * 관련 CPT/ACF/Entity
       가 표로 확인 가능할 것.

2. `forum_current_state.md`에서:
   * Forum 기능을 하나의 "앱"으로 봤을 때
     * 관련 코드 위치
     * 관련 데이터 구조
     * 관련 권한/설정
     * 링크/연계 지점
       이 모두 나열되어 있을 것.

3. 위 두 문서를 기반으로,
   * **AM2: App Market V1 설계(레지스트리, AppManager, 관리자 UI)**를 바로 시작할 수 있다고 판단할 수 있을 것.

---

## 7. 제약사항

AM1 조사에서는 다음을 **수정하지 않는다.**

* 코드 리팩토링/삭제/이동
* DB 스키마 변경 또는 데이터 삭제
* 설정/Feature Flag 값 변경
* 실제 라우팅 변경 (리디렉션 추가 등)

> AM1은 철저히 "조사 전용 Phase"이며,
> 수정/개선은 AM2 이후 Phase에서 수행한다.

---

## 8. 다음 Phase와 연결

* **AM2: App Market V1 설계 & 인프라 초안**
  * App manifest v1 스펙 정의
  * `app_registry` 스키마 설계
  * AppManager(install/activate/deactivate/uninstall) 설계
  * 관리자 UI(App Market 화면) 와의 연결 설계

* **AM3: Forum App 분리 설계**
  * AM1에서 조사한 Forum 구조를 기반으로,
  * Forum를 "App Market에서 설치하는 앱"으로 만드는 설계서 작성

---

**End of Document**
