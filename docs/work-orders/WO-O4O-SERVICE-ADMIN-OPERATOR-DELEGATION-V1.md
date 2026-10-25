# 서비스 Admin의 Operator 지정·해제

> **상태**: COMPLETED
> **완료 범위**: 개발·로컬 검증·push
> **작성일**: 2026-10-20 · **최종 갱신**: 2026-10-20
> **근거**: 사용자의 서비스 Admin → 자기 서비스 Operator 지정 지시

사용자 지시: 각 서비스 Admin은 자기 서비스 Operator를 지정할 수 있어야 한다.
작업 기준: origin/main `8075aa77ca`. 종료점: 검증·commit·push. 운영 계정/DB 변경 없음.

## TODO — 구현 전 조사

- [x] 전체 활성 서비스·협력사업·조합/연합회·분회별 역할 원장, Admin 진입, 지정 API/화면 대조
- [x] 중앙 관리자 전용 지정 정책과 이번 사용자 결정의 충돌 기록 및 문서 보완
- [x] 해당 서비스 Admin + 활성 소속 확인, 다른 서비스/상위 Admin 지정 차단
- [x] 지정 후보·현 운영자 목록·지정·해제 API 및 해당 서비스 화면 연결
- [x] 기존 Google Identity·Demo 보호·서비스 정지 상태·역할 원장 쓰기 규칙 유지
- [x] 개별 조직 지정과 서비스 전역 지정의 경계 유지; 이미 정상인 기능 회귀 확인
- [x] 권한·격리·지정/해제·중복/실패/늦은 응답 검증, 관련 타입/빌드
- [x] 조사표·실행 증거·제한사항 기록 후 commit·push

## 초기 확인

Neture `/admin/operators`는 중앙 관리자 링크만 제공한다. 공통
`/admin/operator-assignments`는 platform:super_admin 전용이다.
분회 및 개별 조합은 별도 지정 기능이 있어 동일한 결함이라고 단정하지 않는다.
서비스 Admin이 다른 서비스 Operator나 Admin을 지정할 수 있도록 확장하지 않는다.

## 코드·문서 재조사로 보완한 TODO와 판정

| 서비스/공간 | 조사 결과 | 처리 |
|---|---|---|
| Neture 대표 | `/admin/operators` 중앙 링크만, 공통 지정 API 중앙 전용 | 서비스 Admin 지정 화면 복원·별도 범위 API |
| supplier | supplier:admin 전용 지정 화면/API 없음 | 상태 관리 하위 운영자 관리, supplier:operator만 |
| funding | funding:admin 전용 지정 화면/API 없음 | 펀딩 운영 메뉴에 Admin 전용 관리, funding:operator만 |
| community | 중앙 지정에만 의존, Admin 메뉴는 민감 조치만 | Admin 메뉴 운영자 지정 추가, community:operator만 |
| study / lecture | operator 업무·회원 관리는 있으나 지정 없음 | Admin 전용 `/operator/operators` 및 업무 메뉴 |
| pharmacy / megapharm | 사업 Admin/Operator 역할은 있으나 사업 Admin의 직접 지정 기능 없음 | 해당 사업 업무 화면 위에 사업 한정 지정·해제 |
| carepharm | 지정 업무 공통 화면 사용, 중앙 지정을 안내 | CarePharm 업무 화면 안에 해당 사업 한정 지정·해제 |
| pharmcoop 연합회 | 산하 조합 Admin 지정은 있으나 연합회 자신의 Operator 지정 없음 | 연합회 Admin 화면에 연합회 Operator 지정·해제 |
| 개별 협동조합 | `cooperative_roles`, 조합 Admin → 자기 조합 Operator 지정·해제 이미 있음 | 기존 UI/API 유지·회귀; 전역 사업 역할로 대체하지 않음 |
| 약사 분회 | `kpa-branch:admin` → 대상 분회 active 회원 Operator 지정·해제 이미 있음 | 기존 서비스 관리 화면·분회 소속 경계 유지·회귀 |
| 기존 KPA service 운영 영역 | `/operator/roles`는 역할 카탈로그, 사람 지정 기능 아님 | 별도 `/operator/operators`, kpa:admin → kpa:operator |
| store / 내 매장 | 별도 서비스 Admin 역할 없음. 매장 직원과 Neture 약국 신청 심사 영역 | 매장 직원 권한을 서비스 Operator로 바꾸지 않음; Neture 서비스 지정 경로 사용 |
| hospital-pharmacy | 로컬 파일 기반 업무 앱, 서비스 Admin/Operator 역할/관리 API 없음 | 신규 운영 역할 체계 임의 생성하지 않음 |
| cafe24-b2b | 카탈로그 workspace undecided, operator role 없음 | 미판정 영역 신규 권한 미생성 |
| K-Cosmetics / PharmacyHub / 과거 Partner | 서비스·역할 은퇴 정본 | 지정 대상으로 복구하지 않음 |
| platform 전체 관리자 | 기존 `/admin/operator-assignments`·전체 관리 콘솔 | 기존 Admin·전체 역할 관리 책임 유지 |

이번 사용자 결정은 Architecture의 중앙 전용 Operator 지정 서술을 대체한다. 과거 IR/WO는
당시 기록으로 유지하고 Architecture에 2026-10-20 결정·작업서 링크를 추가했다. 색인 수정 없음.

추가 확인으로 반영한 사항:

- 사용자 입력 role/serviceKey를 허용하지 않고 서버 allowlist에서 scope별 정확한 Operator 하나를 결정.
- DB의 현재 Admin·활성 계정·소속·역할 유효기간을 트랜잭션 안에서 확인하고 잠근다.
- 후보는 해당 서비스 이용 자격이 있는 사람만 검색. Google 연결 없는 회원은 연결 필요 표시.
- 독립 서비스는 active membership 필수. **Neture 원장을 쓰는 대표·Pharmacy·CarePharm·MegaPharm·Pharmcoop
  범위는 canonical 메인 resolver와 같은 이메일 확인·정상 계정·명시적 Neture 정지/탈퇴 차단의
  자동 메인 자격을 유지**한다.
- 개인 조합과 연결된 사업은 전역 사업 역할 신규 지정으로 우회하지 않는다.
- 지정은 서비스 가입/정지 상태를 수정하지 않는다. 해제는 해당 Operator 한 역할만 비활성화하며
  다른 서비스 역할·Admin·계정·회원·활동 데이터를 건드리지 않는다.
- 자기 역할 변경·Demo 대상 변경 차단. 마지막 Admin을 해제하는 기능 자체가 없다.
- 기한 설정 역할의 만료·미래 시작은 자동 연장하지 않고 전체 관리자 기간 검토를 안내한다.
- 동일 대상 동시 지정은 advisory lock으로 직렬화. 역할 쓰기는 기존 roleAssignmentService만 사용.
- 감사 기록과 역할 변경은 같은 트랜잭션. 화면은 중복 실행·오래된 검색/서비스 응답 차단,
  실패한 검색 입력 보존, 저장 성공 후 조회 실패를 분리 표시.
- 새 migration·DB schema·dependency·lockfile·배포 설정 변경 없음. 실제 운영 계정 지정/해제 없음.


## 검증 결과

| 검증 | 결과 |
|---|---|
| API 신규 권한/범위 및 PostgreSQL, 기존 분회 지정·조합 route | 71 PASS |
| operator-core-ui 전체 | 203 PASS |
| Neture 관련 셸·메뉴·호스트 경계 | 76 PASS |
| 강의 전체 | 41 PASS |
| Pharmacy/MegaPharm 사업 화면·권한·공통 IA | 80 PASS |
| Pharmcoop 전체 | 44 PASS |
| 분회 웹 전체 | 39 PASS |
| 합계 | 554 PASS |
| API TypeScript 및 tsup 운영 빌드 | PASS |
| Neture·Lecture·Pharmacy/MegaPharm·Pharmcoop 각 TypeScript 포함 운영 빌드 | 4개 PASS |
| 신규/직접 수정 핵심 코드 ESLint | 오류 0·경고 0 |
| 문서 민감정보 검사·diff 공백 검사 | PASS |

브라우저는 **최종 운영 빌드 산출물**에 합성 계정/API 응답을 연결하고 외부 요청을 가로채는 격리
검증이다. Neture·supplier·funding·community·study·pharmacy·carepharm·megapharm·Pharmcoop 연합회 및
기존 KPA 운영 영역, 10개 범위 × 1440/390 = **20 PASS**. 직접 URL 진입, 자기 범위 후보 조회·지정·해제,
각 2회의 정확한 합성 mutation, console error 0·가로 넘침 0을 확인했다. 메뉴 노출/숨김은 셸·IA 테스트로
추가 검증했다. 실제 계정 로그인·운영 역할 변경·운영 서버 smoke로 보고하지 않는다.

PostgreSQL 검증은 전용 loopback DB의 매 테스트 임의 schema에서 실제 인가 SQL·잠금·감사 로그·롤백을
실행한다. 이 테스트의 RBAC writer는 테스트용 SQL 대역이며 canonical writer 호출 인자와 transaction
manager 전달을 검사한다. 운영 코드의 writer는 기존 roleAssignmentService 그대로다.
기존 별도 `cooperative.service.spec.ts` 20개는 사전 구성 DB가 필요한 opt-in이어서 이번에 미실행이다.
기존 조합 route·웹과 신규 연합회 SQL 검증 통과를 그 20개 실행으로 대체 보고하지 않는다.

공통 모듈 영향도: operator-core-ui import 소비처는 admin-dashboard·api-server·error-handling·web-store와
이번 직접 소비 4개 웹 앱이다. 기존 모듈 API/동작은 변경하지 않고 새 컴포넌트만 root export로 추가했다.
직접 소비 앱 운영 빌드와 공통 패키지 전체 테스트를 확인했다. 다른 소비 앱의 운영 빌드를 새로 수행한 것은 아니다.
기존 번들 크기/Browserslist 알림은 남으며 빌드 실패는 없다.

## 인계

- branch: `wo/service-admin-operator-delegation`
- base: `8075aa77ca` (작업 시작 당시 최신 main)
- 이번 개발의 종료점: 검증·commit·push. 최종 commit SHA/원격 일치는 완료 보고에 기록.
- PR·CI·main 병합·운영 적용은 이번 개발 완료 판정에 포함하지 않는다.
- DEPLOYMENT = REQUIRED: API 및 직접 소비 웹 앱의 통합/배포가 필요하다. 새 migration은 없다.
- 실제 서비스 Admin/Operator 계정의 지정·해제 검증은 미실행. 합성/격리 결과만 위에 기록했다.
- 기한 설정 역할의 기간 검토는 기존 전체 관리자 책임이다.
- 문서 정합: Architecture에 이번 사용자 결정을 추가했고 기존 중앙 전용 서술과의 우선순위를 명시했다.
  과거 WO/IR·은퇴 서비스·미판정 서비스 정본은 변경하지 않았다.

WORKTREE_DISPOSITION: 전용 worktree/branch 유지(KEEP), 통합 전 후속 수정에 필요.


### PR #719 통합 검토 보완

- 최신 main #717 (`b54074d038`)을 통합하고 CarePharm·호스트/셸 회귀 89개 및 API/Neture 빌드 통과.
- Codex P1: 메인 자동 이용 자격이 Pharmcoop에만 적용되어 Neture/Pharmacy/CarePharm/MegaPharm의
  정상 Admin/후보를 차단하는 문제를 수정. 모든 `membershipKey=neture` 범위의 인가·후보·목록 상태를 일치시킴.
- 5개 범위 × 가입 원장 없음/pending/rejected/active 허용, 명시적 suspended/withdrawn 차단을
  실제 PostgreSQL로 회귀 검증하며 가입 상태를 변경하지 않는 것도 확인한다.
- 보완 후 API 100개 PASS(기존 71개에서 29개 증가), TypeScript·API 운영 빌드·ESLint PASS.
  이전 웹/UI 검증과 합하면 583개이며 이 수정은 웹 코드를 바꾸지 않는다.

- 추가 P2: 기존 Operator의 계정 비활성/이메일 미확인/심사·정지 상태를 이용 불가로 표시하도록 목록 SQL을 보완.
  Neture와 독립 서비스 양쪽에서 표시와 역할 해제 가능성을 회귀 검증한다.
- CI ESLint의 테스트 코드 `no-unexpected-multiline` 1건을 수정하고 전체 변경 TS/TSX 파일을 다시 검사한다.
- 최종 보완: API 110개 PASS, API 타입·빌드 PASS, 변경 TS/TSX 전체 lint 오류/경고 0.
  저장소 전체 lint ratchet도 기존 오류 46개 기준선 그대로 PASS(기준선/규칙 수정 없음).
  웹/UI 기존 검증과 합하면 593개 PASS이며 실제 운영 계정의 권한 변경은 없다.


### 추가 통합 검토 — 공통 저장 경로·진입 동선

- 중앙과 서비스 Admin의 경합을 해결하기 위해 canonical RoleAssignmentService의 **Operator 쓰기만**
  동일 사용자 advisory lock + transaction으로 직렬화한다. 서비스의 사전 판정도 같은 잠금을 사용한다.
  manager 없는 호출도 내부 transaction을 사용하고 commit 후 캐시를 다시 무효화한다.
  F10 §3.2의 버그 수정 범위이며 새 권한/역할/컬럼/API 계약/미들웨어 변경 없음.
  Admin/플랫폼 역할의 기존 마지막 관리자 보호·잠금 경로는 바꾸지 않는다(F9 write SSOT 유지).
- 실제 RoleAssignment Entity·실제 ORM 저장 경로를 사용하는 PostgreSQL 경합 테스트를 추가했다.
  중앙 먼저/서비스 먼저 두 순서에서 잠금 대기를 확인하고, 중앙 지정자·유효기간 보존과
  서비스의 잘못된 성공 감사 기록 부재, standalone revoke→regrant를 검증한다.
- KPA platform-only 사용자도 중앙 콘솔 안내 화면에 도달하도록 guard를 맞추고 중복 legacy redirect를 제거.
  서비스 Admin에게만 실제 지정 API를 보여주는 책임은 기존 화면/서버에서 유지한다.
- CI 전체 Neture 테스트가 발견한 펀딩 대표 진입 변경도 수정. 지정 화면은 secondary entry로 표시하고
  기존 `/operator/market-trial` 첫 진입과 Admin 전용 메뉴 차단을 함께 유지한다.
- 로컬 결과: API/Core 7 suites 127 PASS(별도 기존 분회·조합 17 PASS는 앞 실행), Neture 전체 135 suites
  1,203 PASS, KPA 사업/IA 80 PASS + 중앙 안내 2 PASS. API·Neture·KPA 운영 빌드 PASS.
- 초기 검증표 합계 오기 정정: 654→554, 이후 보완 시 683→583 및 693→593.
  이번 기록은 스위트별 실행 결과로 구분하며 서로 겹치는 실행을 더해 새 합계로 보고하지 않는다.
- 추가 확인: 전체 lint ratchet 46 오류 기준선 PASS, 최종 KPA 운영 빌드로 platform-only 중앙 안내 PC/모바일
  2 PASS(서비스 지정 API 조회 0·console error 0). 앞 20개 서비스 Admin 브라우저 결과와 구분한다.
- 통합 중 main #720 공급자 상호명 수정(`d176026c24`)을 확인했다. migration/권한 변경은 없고 별도 경로다.

### 캐시 시점 보완

- 서비스 지정·해제 및 중앙 직접 지정은 바깥 transaction commit 뒤 역할 캐시를 다시 무효화한다.
  실제 DB에서 변경 전 committed 역할을 읽어 캐시에 넣는 동시 auth/me를 재현하고, 요청 완료 뒤
  오래된 캐시가 남지 않는 것을 grant/revoke 두 경우에 확인했다. 중앙 지정도 같은 시점 테스트를 추가했다.
- UUID 대소문자 표현이 사용자 잠금·캐시 키·자기 역할 변경 차단을 우회하지 않도록 canonical casing을 사용한다.
- 이 보완의 API/DB·중앙 지정 4 suites 118 PASS, 수정 파일 lint 오류/경고 0. 기존 전체 검증과 별도 실행이다.
