# WO-O4O-ADMIN-PHARMACY-COLLABORATOR-ROLES-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-18 · **최종 갱신**: 2026-10-18
> **근거**: 전체 관리자 공간의 사용자 요청 — 누락된 네 약국 협업체, 동일한 Admin·Operator 역할

## 문제와 결정

`admin.neture.co.kr/operators`의 지정 대상에 pharmacy·carepharm·megapharm·pharmcoop가 없다.
이 사업들은 기존 Neture 사업/협동조합 데이터 행으로 운영되므로 별도 service membership을 도입하지 않는다.
기존 `neture` namespace 안에서 여덟 개의 사업 한정 역할을 추가한다.
지정·수정·해제·목록 필터·운영 API·서비스 진입을 같은 역할 계약으로 연결한다.

- [설계 정본](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)의 2026-10-18 보완
- [역할 정본](../rbac/RBAC-ROLE-CATALOG-V1.md)의 2026-10-18 역할 목록

## TODO

- [x] 최신 main과 정본, 관리자 UI/API, 사업/개별 조합 담당 경계 조사
- [x] 네 지정 대상과 각각 Admin·Operator 추가
- [x] canonical Neture 가입 원장과 Google 연결 계정 제한 유지
- [x] 운영 API에서 사업 격리·역할 해제/만료 확인, 기존 담당 관계 유지
- [x] 약국 소유·참여 가입·계정 생성으로 권한을 우회하지 않음
- [x] 지정 화면 행동 테스트와 실제 PostgreSQL 격리 테스트
- [x] 관리자·API·Neture·약국 웹 빌드와 관리자 지정 화면 데스크톱/모바일 검증
- [ ] commit·push·PR·CI·통합·운영 배포 결과 확인

## 영향 범위와 검증

공통 역할 메타데이터는 기존 모든 소비처가 의존하는 `@o4o/types`에 둔다.
관리자 UI/API allowlist, 사업 운영 전용 guard, Neture/CarePharm·약국/MegaPharm 진입,
사업 커뮤니티 관리와 협동조합 세션에서 사용한다. 일반 Neture/KPA 운영 guard와 다른 서비스 권한은 확장하지 않는다.
Admin은 해당 사업의 Operator 기능을 포함한다. 별도 새 관리자 기능은 이번 범위에 없다.

격리 PostgreSQL 테스트는 `O4O_PHARMACY_ROLES_IT=1`과 고정 loopback 55439의
전용 `o4o_pharmacy_roles_test` DB에서만 실행한다. 임시 테이블을 사용하고 연결 종료 시 제거한다.
운영 DB·실계정 지정·사업 seed·migration·dependency 변경은 없다.
현재 테스트는 PostgreSQL 18에서 실행하며 운영 major 15와의 차이는 검증 한계로 기록한다.

인증된 운영 브라우저 확인은 현재 테스트 계정 SSOT 확보 여부에 따라 별도 구분한다.

## 로컬 검증 결과

- 관리자 Vitest 3개 파일 19개 테스트 통과(네 대상 선택·canonical payload·기존 커뮤니티 회귀).
- API 범위 guard·역할 편집·직접 지정·기존 사업 접근 테스트 통과. 직접 지정 18개 테스트에 신규 여덟 역할의 정지 상태 보존 포함.
- 실제 PostgreSQL 사업 권한·해제/만료·기존 담당·계정/이메일/정지·협동조합 경계와 관련 회귀 7개 파일 60개 테스트 통과.
- API build, 관리자 type-check/build, Neture/약국 웹 build 통과. 공통 UI의 이전 dist를 재빌드하여 stale declaration 오류를 해소했다.
- Chromium 1440/390px에서 실제 지정 컴포넌트의 네 대상·여덟 역할 선택과 synthetic API payload 확인, page error 0.
  이 화면 검증은 로컬 mock API이며 운영 로그인·운영 권한 부여 검증을 대신하지 않는다.
- 현재 checkout의 `docs/local/TEST-ACCOUNTS.local.md`는 없음. 환경의 이전 계정 변수나 폐기 계정으로 대체하지 않았다.
- 문서 민감정보 검사 0건, 새 migration·의존성/lockfile 변경 0건.

추가 회귀: 사업 홈 편집 route 19개와 service action HTTP 경계 6개 테스트가 통과했다.
새 business scope export를 route mock에 반영하고 사업 메타데이터 조회와 권한 조회를 구별했다.
최신 main의 계정 메뉴 변경을 반영한 뒤 Neture·약국 웹을 재빌드하여 통과했다.

리뷰 보완: 대표 Neture의 사업 운영 주소는 Pharmacy 호스트로 이동하므로 pharmacy 역할에만 표시한다.
CarePharm 호스트는 CarePharm 역할만 로컬 사업 운영으로 진입한다. MegaPharm·Pharmcoop는 각 앱의 운영 진입을 사용한다.
호스트 이동과 역할의 대응 회귀 2개 파일 52개 테스트가 통과했다.

CI 재현 보완: 기존 Neture IA 정적 계약이 조건부 scoped 메뉴를 허용하도록 갱신했다.
해당 API 계약 25개와 실제 layout 렌더 2개 테스트 통과(협업체 전용 메뉴 격리·Neture 전체 IA/서비스 전환 보존).
