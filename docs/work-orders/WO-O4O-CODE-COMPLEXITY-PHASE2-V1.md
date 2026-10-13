# WO-O4O-CODE-COMPLEXITY-PHASE2-V1

상태: 선택 정비 구현·PR #541 정상 main 통합·비분회 6개 배포 완료 (2026-10-13)

## 0. 현재 완료와 다음 정비 판단

회원 콘솔·AI 실행 evidence·콘텐츠 모달 async lifetime의 선택 정비는 PR #541로 main
`5742dce8d9`에 반영됐다. PR/main CI PASS, 선택 api/admin/neture/kpa-society/lecture/store
Promote38406578739 및 최종 serving Report PASS, 직접 HTTP6개200. 분회 배포는 제외했다.
집계 production은 분회 NOT_SELECTED 때문에 pending이며 선택6개 배포 결과와 구분한다.

아래 §1~§14의 push-only/미완료 checkbox는 당시 실행 순서의 기록이다.
N02·AI 상태 및 §12.3 모달 잔여는 §13~§14에서 처리했으며 현재 잔여로 중복 집계하지 않는다.
추가 후보는 인증/서비스 이동·키오스크·의존성 조사, 가입 승인/회원 수정 처리 계약, 전체 공통화다.
이 후보를 이번 완료 범위나 즉시 구현 약속으로 승격하지 않는다.

사용자의 반복 정비 방침에 따라 지금 효과가 있는 내부 정비만 선별한 뒤 원래 통합 후속으로 복귀한다.
계정 제거의 같은 transaction 인가 중복은 기존 private 함수로 정리하며, 미분류 파일의 실제 누락은
[Core WO §10.7](WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1.md)와
[domain/file inventory](../investigations/IR-O4O-ACCOUNT-ERASURE-DOMAIN-FILE-INVENTORY-V1.md)에서 이어서 추적한다.
서비스 간 공통화는 전체 정비 단계에서 소비처/업무 차이를 확인한 뒤 판단한다.

## 1. 지시와 종료 범위

사용자 지시: 항목별 코드 복잡성 정비. TODO 작성 → TODO 검증 → 구현·검증 → push.
작업 시작 기준: 최신 origin/main `f66ed5f5f8` (2026-10-13).
종료: 전용 branch push. main 병합·배포는 이번 범위에 포함하지 않는다.

서비스 간 공통화는 개별 서비스 정비에서 진행하지 않는다. 전체 정비 단계에서
모든 소비처·업무 규칙 차이를 확인한 뒤 판단한다. 유사 코드가 있다는 사실만으로
공통 모듈을 만들지 않는다. 같은 API 내부의 명확한 책임 추출은 별도로 판단한다.

## 2. TODO 초안

- [x] T01: 최신 AGENTS/SETUP/정본과 작업환경·검증 명령 확인.
- [x] T02: 회원 콘솔의 중복 코드 조사. 텍스트 중복/같은 업무 규칙/다른 상태 전이를 구분.
- [x] T03: 회원 콘솔의 함수 추출 후보 조사. 입력·출력·호출 순서·부작용 확인.
- [x] T04: 계약과 소비처·기존 테스트 대조 후 구현 목록/보류 목록 확정.
- [x] T05: 검증된 내부 중복 정리·책임 추출. 동작·권한·SQL 의미·API 계약 유지.
- [x] T06: 기존 회귀 테스트와 필요한 행동 검증, API type-check/build 실행.
- [x] T07: 전후 지표·검증 결과·보류 이유와 전체 공통화 후보 기록.
- [x] T08: 변경 범위 점검 → commit → 전용 branch push → 원격 commit 확인.

## 3. 제외·검증 경계

Core/Frozen 구조·권한/상태 정책·API 계약·DDL·운영 DB는 변경하지 않는다.
가입 승인 Core·전체 계정 제거·회원 수정 원자성 변경은 이번 내부 정리와 분리한다.
분회 전용 개발·UI 정비·배포는 제외한다. 실계정/OAuth 검증은 이번 정비 검증으로 대체하지 않는다.
기존 동작의 결함을 발견하면 별도 후보로 기록하고 추출 과정에서 몰래 수정하지 않는다.

## 4. 조사 방법의 근거

- [React: Reusing Logic with Custom Hooks](https://github.com/reactjs/react.dev/blob/main/src/content/learn/reusing-logic-with-custom-hooks.md): 작은 중복마다 추출할 필요는 없으며 책임을 드러내는 추출을 판단.
- [ESLint complexity 논의](https://github.com/eslint/eslint/issues/4808#issuecomment-167795140): 일률적 기준의 한계. 수치는 후보 선정에 사용.
- [공개 중복 정비 제안 사례](https://github.com/rethinkhealth/glion/issues/742): 여러 소비처의 동일 절차와 불일치를 구체적으로 확인한 뒤 공통화 제안. 보편적 합의로 간주하지 않는다.

정비 지표는 파일 길이보다 함수별 분기·책임·호출 순서·실패 결과를 함께 확인한다.
수치를 낮추기 위해 함수만 쪼개거나 서비스별 옵션을 늘리는 공통화는 하지 않는다.


## 5. TODO 검증 결과와 이번 구현 목록

AGENTS §3/§4/§5, SETUP 검증 절, CANONICAL-INDEX 구조 계약,
O4O-CORE-FREEZE-V1, USER-OPERATOR-FREEZE-V1,
O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1과 현재 코드를 대조했다.
MembershipConsoleController는 Extension 계층이다. 이번에는 이 컨트롤러 내부의
동일 처리와 요청→SQL 구성 책임만 정리하며, 승인 Core·guard·route·공통 계약은 수정하지 않는다.

| 후보 | 근거 | 판정·검증 |
|---|---|---|
| D01 승인 대상 조회 | 단건/일괄에서 같은 pending/rejected SELECT와 같은 서비스 스코프 조건 반복 | 같은 API 내부 private 메서드 추출. SQL/파라미터 및 은퇴 회원 필터의 순서 유지 |
| D02 반려 대상 처리 | 단건/일괄에서 같은 pending/active 조회→순차 Core 위임→성공 수 집계 반복 | 같은 API 내부 private 메서드 추출. 단건 404와 일괄 skipped/failed는 각 endpoint에 유지 |
| F01 프로필 SQL 구성 | updateMember에 scalar·이름·alias·사업정보·중첩 주소·파라미터 번호 구성이 혼재 | 컨트롤러 전용 순수 builder 추출. DB 호출·권한 판단은 컨트롤러에 유지 |
| D03 상태 변경 API 통합 | 단건은 active 허용·오류 HTTP 응답, 일괄은 항목별 결과·Demo 검사 방식이 다름 | 전체 상태 dispatch 통합은 보류. 예외 옵션을 늘리는 범용 executor를 만들지 않음 |
| C01 서비스 간 프로필 처리 | operator member, store profile, supplier profile은 소유 주체와 필드 계약이 다름 | 전체 정비 후보로 기록. 기존 business-info-write 사용은 유지하고 새 공통 패키지는 만들지 않음 |
| R01 회원 수정 원자성 | membershipRole UPDATE 후 users UPDATE가 별도 실행 | 별도 처리 계약 변경 후보. 이번 추출은 호출 순서와 기존 실패 결과를 유지 |
| R02 가입 승인 서비스 분리 | 3원장 상태 전이와 transaction/행 잠금·서비스 종료 연동 포함 | Core 구조 변경 별도 WO 대상. 이번에는 호출 계약만 확인 |

소비처: routes/operator/membership.routes.ts → /api/v1/operator/members.
확인한 소비 경로: Neture UsersManagementPage/UserDetailPage와 Lecture OperatorMembersPage,
KPA-Society 회원관리의 공통 상세/수정 경로, operator-core-ui의
OperatorMembersConsolePage/ServiceMembersWorkspace 및 서비스 wrapper.
Admin 전용 회원 API와 이 Extension API를 같은 소비 경로로 간주하지 않는다.
Lecture·커뮤니티 등 활성 서비스는 동일 route의 guard·serviceScope를 사용한다.
분회는 전용 가입 승인 경로를 유지하며 그 전용 코드는 수정하지 않는다.

검증: 기존 MembershipConsoleController 5개 suite(서비스 경계·교차 서비스 격리·사업정보·삭제 스코프·역할 해제),
기존 business-info-write suite와 Demo guard suite를 먼저 실행해 기준을 확인한다.
추출 후 같은 suite를 재실행하고, 단건/일괄 실패 차이·alias 우선순위·미지 필드/no-op·프로필 실패 응답의
행동 검증을 보완한다. API 의존 패키지를 빌드한 뒤 API type-check/build와 lint ratchet을 실행한다.
합성 mock 데이터만 사용하며 운영 DB·실계정·GCS에 접근하지 않는다.


## 6. 구현·검증 결과

구현: D01/D02를 컨트롤러 private 메서드로 추출. F01은 같은 디렉터리의
`membership-profile-update.ts`로 추출했으며 소비처는 MembershipConsoleController 하나다.
SQL 실행은 기존 컨트롤러에 남기고 기존 `business-info-write`의 json/jsonb 캐스트·부분 병합을 그대로 사용한다.
guard·route·승인 Core·공통 패키지·DDL·dependency·CI는 변경하지 않았다.

| 지표 | 전 | 후 |
|---|---:|---:|
| MembershipConsoleController 줄 수 | 1,714 | 1,625 |
| updateMember 줄 수 / 분기 요소 | 173 / 51 | 92 / 24 |
| updateMemberStatus 줄 수 / 분기 요소 | 196 / 34 | 170 / 30 |
| batchUpdateStatus 줄 수 / 분기 요소 | 142 / 34 | 114 / 30 |
| 추출한 프로필 builder 줄 수 / 분기 요소 | — | 함수 87 / 28 |
| 컨트롤러+추출 파일 전체 줄 수 / 분기 요소 합 | 1,714 / 334 | 1,727 / 331 |

분기 요소는 AST의 if/loop/case/catch/조건식/논리 연산을 센 비교 지표이며 McCabe 값이 아니다.
추출 파일을 빼고 개선 수치를 주장하지 않는다. 전체 줄 수는 타입·설명·명시적 반환 계약으로 13줄 늘었고,
전체 분기 감소는 3개다. 이번 효과는 동일 승인 조회/반려 처리 수정 지점 축소와 프로필 구성 책임의 격리다.

- frozen-lockfile 설치 PASS, API 의존 30개 workspace 빌드 PASS.
- 변경 전: 기존 관련 7 suite / 129 tests PASS.
- 변경 후: 같은 7 suite / 143 tests PASS (행동 회귀 14건 추가).
- 추가 소비/정적 guard: supplier-domain-boundary, supplier-identity-profile-canonicalization,
  business-info-json-column-guard 3 suite / 71 tests PASS. 합계 10 suite / 214 tests PASS.
- 기존 baseline SQL 구성 블록과 추출 builder를 합성 입력 344개로 비교 PASS.
  scalar·사업 필드 조합, undefined/null/빈 값, canonical/alias 우선순위, no-op,
  잘못된 전화번호 타입의 오류 종류 및 SQL/바인딩 순서 비교. 임시 검증 도구는 checkout 밖에 둠.
- API `type-check` / `build` PASS.
- 변경 코드/테스트 4개 파일 ESLint: errors 0 / warnings 0.
- 저장소 lint ratchet PASS: errors 46 / baseline 46, warnings 1,009.
  이는 기존 오류까지 해결했다는 뜻이 아니다.
- `git diff --check` PASS. 실계정/OAuth·브라우저·운영 DB 테스트는 실행하지 않음.
  UI/route/권한·DB 실행 결과를 변경하는 작업이 아니며 위 검증은 운영 기능 검증을 대체하지 않는다.

## 7. 다음 항목별 TODO — 아직 미구현

이번 push는 2차 정비의 회원 콘솔 첫 묶음이다. 저장소 전체 정비 완료로 표시하지 않는다.
아래 항목도 조사 → 해당 TODO 검증 → 구현·검증 순서로 별도 묶음을 준비한다.

- [ ] N01 중복 코드: 인증·서비스 이동·콘텐츠 저장 경로의 후보를 위치/소비처/정책 차이로 분류.
- [ ] N02 함수 추출: AI 실행 runtime과 콘텐츠 모달의 책임·부작용 경계 조사.
- [ ] N03 책임 분리: 가입 승인 Core 분리 계약/WO 준비. 기존 transaction·행 잠금·상태 전이 보존안 대조.
- [ ] N04 상태/분기: 키오스크·AI 재개/복구의 상태 전이와 타이머 수명·종료 조건 조사.
- [ ] N05 의존성/호환: 실제 import·소비처·은퇴 정책을 대조해 우회/순환/alias 후보 조사.
- [ ] N06 실패/검증: R01 회원 유형+프로필 변경의 트랜잭션/실패 계약 및 행동 테스트 준비.
- [ ] N07 전체 공통화: C01 등 후보의 모든 소비처/업무 차이/변경 이유를 확인하고 전체 정비 때 판정.

개별 서비스 정비는 위 후보를 수집하는 단계다. 서비스 간 공통화로 전환할 때에는
소유 주체·필드 계약·권한·상태·실패 결과가 같은지 전체 소비처를 확인한다.
공통화 때문에 서비스 분기/boolean 옵션/예외가 늘면 유지 또는 별도 책임 분리를 선택한다.


## 8. push 종료 기록

- 전용 branch: `wo/code-complexity-phase2`.
- 구현 commit: `f109cbef43bad45a93fb5fd1a74dad22c8a9190e`.
- `git push -u origin wo/code-complexity-phase2` 성공.
- `git ls-remote --heads origin wo/code-complexity-phase2`로 구현 commit 원격 일치 확인.
- push 직전 최신 main은 시작 기준과 같은 `f66ed5f5f8`이며 자동 merge/rebase 없음.
- 종료 기록은 별도 문서 commit으로 같은 branch에 push한다.
- 사용자 종료 범위에 따라 PR 생성·main 병합·배포 없음. required CI/리뷰 통과 또는
  integration-ready로 표시하지 않는다. §6은 로컬 실행 검증 결과다.
- T01~T08은 이번 묶음 완료, §7 N01~N07은 다음 정비의 미완료 항목이다.


## 9. N01 회원 조회·역할 처리 — 후속 TODO 검증·구현 결과

같은 WO의 다음 묶음으로 `wo/code-complexity-phase2` branch를 유지한다.
기준: 작업 시작 시 최신 origin/main `f66ed5f5f8`, 이전 push `27017ffff2`.
기존 첫 묶음은 아직 main에 병합되지 않았으므로 그 검증된 변경 위에서 연속 정비한다.
사용자 종료 지시는 계속 push까지이며 PR 생성·병합·배포는 하지 않는다.

- [x] B01: 조회·상세·역할 부여/해제 중복과 차이를 분류.
- [x] B02: RBAC/Freeze·소비처·기존 테스트 대조 후 구현/보류 목록 확정.
- [x] B03: 동일한 내부 처리만 추출. guard/응답/SQL/권한·호출 순서 유지.
- [x] B04: 기존 회귀와 역할 검색 순서·목록/상세 응답 행동 검증.
- [x] B05: API type-check/build와 lint·scope 검사, 결과 기록.
- [x] B06: commit·push 후 원격 commit과 clean 상태 확인.


### 9.1 TODO 검증 결과 (구현 전)

현재 목록/상세는 역할 조회 SQL·활성 필터·상태 표시·응답 구조가 다르고,
역할 부여/해제는 assignability·self revoke·마지막 admin·권한 tier·캐시 처리에 차이가 있다.
RBAC 정본/카탈로그, Core/USER-OPERATOR Freeze 및 현재 route·기존 회귀 테스트를 대조했다.
그 차이를 옵션으로 흡수하는 범용 읽기/권한 실행기는 만들지 않는다.

| 후보 | 검증 결과 | 이번 판정 |
|---|---|---|
| B-D01 역할 카탈로그 검색 | assign/remove의 원문 검색→다른 서비스 bare 충돌→prefix 재검색→미발견 fallback 알고리즘이 동일 | 컨트롤러 private resolver로 추출. 원문과 해석된 역할의 권한 판정은 기존 endpoint에 유지 |
| B-D02 멤버십 응답 매핑 | 목록/상세의 8개 snake_case→camelCase 필드가 동일. 상세만 updatedAt 추가 | 같은 파일 내부 매퍼 추출. 상세에서만 updatedAt를 명시적으로 추가 |
| B-H01 역할 조회 SQL | 목록은 active 역할 이름 집계, 상세는 inactive 포함 유효기간/할당자/스코프 이력 | 통합 보류. 같은 의미의 중복이 아님 |
| B-H02 회원 상태 | 목록은 membership 상태 우선·필터 반영, 상세 user.status는 계정 상태 | 통합 보류. 응답의 두 상태 축을 임의로 같게 만들지 않음 |
| B-H03 역할 권한 | 부여는 isAssignable 검사, 해제는 자기 해제/마지막 관리자/잠금/캐시 보호와 bare resolved prefix 예외 포함 | 통합 보류. Core·권한 계약 변경 없음 |

소비처는 §5의 Extension API 소비 경로와 동일하다. 조회 route·scope·쿼리·부여/해제
서비스 호출은 그대로 두고 B-D01/B-D02만 수정한다. 새 공통 패키지/API는 만들지 않는다.
검증은 기존 suite를 먼저 실행하고, 실제 endpoint 호출로 검색 순서·충돌·미발견·권한 차이·
목록/상세 필드와 상태 차이를 확인한다. private 함수 이름만 확인하는 테스트는 만들지 않는다.


### 9.2 구현·검증 결과

- B-D01: 동일 역할 검색을 `resolveMemberRole` private 메서드로 추출.
  DB 역할 카탈로그 자체는 변경하지 않았으며, 해석된 이름으로 원문 요청을 바꾸지 않는다.
- B-D02: 동일 8필드만 module-local `toMembershipSummary`로 추출.
  상세의 updatedAt는 상세 응답에서 추가한다. 목록/상세의 SQL·정렬·역할 활성 범위·상태 축은 유지한다.
- B-H01~B-H03은 구분 유지. 부여의 assignability와 해제의 prefix 예외,
  자기 역할/최후 관리자/잠금/캐시 계약을 공통 executor로 합치지 않는다.

| 비교 지표 (직전 push → 이번 변경) | 전 | 후 |
|---|---:|---:|
| 컨트롤러 전체 줄 수 / 분기 요소 | 1,625 / 303 | 1,627 / 293 |
| assignMemberRole 줄 수 / 분기 요소 | 118 / 33 | 102 / 23 |
| removeMemberRole 줄 수 / 분기 요소 | 186 / 39 | 172 / 29 |
| getMembers 줄 수 | 210 | 201 |
| getMemberDetail 줄 수 | 118 | 111 |
| 추출 resolver 줄 수 / 분기 요소 | — | 20 / 10 |
| 추출 응답 매퍼 줄 수 / 분기 요소 | — | 12 / 0 |

§6과 같은 AST 비교 지표다. helper를 포함한 전체 분기 감소는 10개이며,
필드 타입·설명 때문에 전체 줄 수는 2줄 늘었다. 줄 수 감소만을 정비 목표로 삼지 않는다.

검증:
- 변경 전 기존 관련 6 suite / 129 tests PASS.
- 검색 순서·bare 충돌/미발견·명시 prefix·플랫폼 예외·원문 write·DB 실패·assignability와
  resolved prefix 정책 차이 및 목록/상세 projection/no-op 행동 검증 23건 추가.
- 최종 기존 관련/소비 guard 포함 10 suite / 237 tests PASS.
  첫 묶음의 214건에 이번 행동 검증 23건을 더한 결과다.
- API type-check/build PASS. 이번 소스·테스트 3파일 ESLint errors/warnings 0.
- 전체 lint ratchet PASS: errors 46 / baseline 46, warnings 1,009. 기존 오류 해결 판정 아님.
- `git diff --check` PASS. 운영 DB·실계정·GCS·브라우저·OAuth 테스트는 실행하지 않았다.

N01의 이번 회원 조회/역할 후보는 검증·정비 완료했다. §7 N01의 인증·서비스 이동·콘텐츠 저장
후보까지 조사 완료한 것은 아니다. 다음 묶음은 N02 AI runtime/콘텐츠 모달의 책임·함수 추출 조사이며,
서비스 간 공통화·Core 구조 변경·계약 변경은 계속 별도 후보로 유지한다.


### 9.3 push 종료 기록

구현 commit `bcd890c4b04b55868e687441c0a68c65333bf947`을
`wo/code-complexity-phase2`에 push했고 `git ls-remote`로 동일 SHA를 확인했다.
작업 파일은 clean이며 B01~B06은 이번 회원 조회/역할 묶음 완료다.
본 종료 기록도 같은 branch의 문서 후속 commit으로 push한다.
최신 main 기준은 여전히 `f66ed5f5f8`. PR 생성·main 병합·배포·운영 DB 변경은 하지 않았다.
CI/리뷰 integration-ready 판정은 하지 않으며 위 결과는 로컬 검증이다.


## 10. N02 AI runtime·콘텐츠 모달 — TODO·검증 결과

같은 WO/branch의 연속 묶음이다. 시작 main `af24236df8`을 확인했다.
기존 기준 이후 main 변경은 PH 작업 문서 1개이며 이번 소스와 겹치지 않아
origin/main을 정상 merge했다. 이전 미병합 정비 commit도 유지한다.

- [x] C01: AI 종료/결과 구성과 모달 변환/저장/상태 책임 조사.
- [x] C02: 정본·소비처·은퇴 경계·테스트와 대조해 구현/보류 목록 검증.
- [x] C03: 검증된 내부 함수 추출 구현. 기존 public export/API·상태·부작용 순서 유지.
- [x] C04: 관련 기존 suite와 변환/종료 보고 행동 검증, 패키지/API 빌드·lint.
- [x] C05: 전후 지표·실행 결과·큰 함수 잔여 기록.
- [x] C06: commit·push 후 원격 일치 확인. main 병합·배포 없음.


### 10.1 TODO 검증 결과 (구현 전)

| 후보 | 판정 |
|---|---|
| C-R01 runtime 종료 보고 | finish closure의 claim/관찰 근거/replay/최소 기억 구조를 순수 snapshot mapper로 추출. 원장 저장·경험/도움 기록·로그 순서를 그대로 유지 |
| C-R02 종료 상태 판정 | completed/question/takeover/needs_user 우선순위를 module-local 함수로 분리. 기존 상태 enum·재개 계약은 변경하지 않음 |
| C-M02 저장 본문 구성 | 세 저장 경로의 요청 body를 각각의 stateless builder로 추출. API 경로·fetch·오류·콜백·상태 setter는 각 handler에 유지. title/fallback/metadata/usageType 계약을 행동 검증 |
| C-M01 콘텐츠 형식 변환 | htmlToForumBlocks / blocksToHtml 및 UrlBlock 타입을 content-editor 내부 모듈로 추출. index public exports 변경 없음 |
| C-H01 runtime 전체 분해 | replay/observe/복구/단위 dispatch는 공유 mutable state가 많음. 큰 Context 객체나 함수 주입 프레임워크를 급히 만들지 않고 후속 상태 전이 조사에 남김 |
| C-H02 모달 저장 통합 | 커뮤니티/내 매장/제작 자료의 body·권한·오류·콜백 계약이 다름. 범용 save 훅으로 합치지 않음 |

변환 함수는 기존 모달의 단일 내부 소비 경로를 유지한다. 서비스 간 공통화가 아니라 이미
공통 패키지 안의 책임 분리다. Shared Module Change Protocol에 따라 Toolbar와
CommunityContentWriteShell 및 content-editor import 소비 앱/패키지를 확인했다.
Store 내부 AI 은퇴/외부 LLM 계약과 Community/Lecture 기존 보조 AI를 구분했다.
Store AI 진입·서비스 정책·분회 전용 코드는 변경하거나 복구하지 않는다.

검증: 기존 AI runtime/기억/재개/복구/단위 dispatch 관련 suite와 Store 내부 AI 은퇴·
외부 LLM·editor boundary source 계약을 실행한다. DOM 변환은 실제 jsdom DOMParser로
행동 검증한다. content-editor와 API typecheck/build를 실행하며 state/네트워크/UI
동작을 바꾸지 않는 추출이므로 실제 OAuth/사용자 PC 작업·운영 저장을 테스트하지 않는다.


### 10.2 첫 검증 결과와 main 추가 통합

- 관련 AI/기억/재개/복구/Windows 안전/단위 dispatch 및 Store 은퇴/외부 LLM/편집기 경계:
  23 suite / 390 tests PASS.
- 실제 jsdom 변환·각 저장 경로의 fallback/category/metadata 검증: 1 suite / 15 tests PASS.
- 완료/question/takeover 보고 claim·runOpened·관찰·재개 frame·원문 비포함 assertions를 추가해
  work-agent suite를 재실행 PASS. 두 행동 suite 합계 29건이며 기존 14건을 중복 집계하지 않는다.
- 최초 baseline 명령의 Jest 옵션을 plural로 지정해 선택이 적용되지 않았다. 그 전체 실행은 중단(exit 130)했고
  PASS로 집계하지 않는다. 설치 버전의 singular --testPathPattern을 확인하여 23개 선택 목록을 검증 후 실행했다.
- 종료 상태의 실제 WorkProgress 5종 × run 유무 × terminalKind 3종 × takeover 유무,
  총 60조합을 이전 main의 inline 판정과 비교하여 동일함을 확인했다.
- content-editor typecheck/build 및 API type-check/build PASS.
- content-editor 공개 index.d.ts는 baseline 소스 동일성 확인 후 기존 빌드와 byte 동일 확인 PASS.
- 변경 파일 ESLint 신규 오류 없음, 전체 ratchet PASS (46 errors / baseline 46, 1,009 warnings).

검증 중 main이 `aa59a0962f` (#531 인증 담당 정비)로 이동했다. 변경 56개 경로는 이번 수정 경로와
겹치지 않는다. 이번 구현을 먼저 commit하고 main 변경을 작업 branch에 정상 merge한 뒤,
API type/build·대표 runtime/변환·인증 및 기존 회원 콘솔 회귀를 재확인한다.
새 인증 기능/권한/운영 배포를 이 WO의 구현 실적으로 간주하지 않는다.


### 10.3 최신 main 통합 후 검증과 잔여 구조

`aa59a0962f`를 전용 branch에 정상 merge했다. 충돌/미커밋 혼입 없음.
통합 후 대표 runtime/DOM 변환/modality/인증 session·handoff/Demo 및 기존 회원 콘솔
11 suite / 203 tests PASS. API type-check/build 재실행 PASS.
최종 lint ratchet PASS: errors 46 / baseline 46, warnings 1,006.
관련 AI/Store 계약 23 suite 390건 + 새 변환/저장 body 15건은 통합 전 검증이며,
통합 후 203건과 겹치는 테스트를 단순 합산하지 않는다.

| 지표 (N02 시작 소스 → 이번 변경) | 전 | 후 |
|---|---:|---:|
| runtime 종료 finish 길이 / 분기 요소 | 60 / 43 | 39 / 25 |
| runWorkAgent 길이 / 분기 요소 | 1,490 / 216 | 1,469 / 216 |
| AiContentModal 컴포넌트 길이 / 분기 요소 | 1,552 / 124 | 1,527 / 124 |
| 커뮤니티 저장 handler 길이 / 분기 요소 | 32 / 9 | 25 / 6 |
| 내 매장 저장 handler 길이 / 분기 요소 | 29 / 10 | 25 / 8 |
| 제작 자료 저장 handler 길이 / 분기 요소 | 44 / 15 | 30 / 9 |
| runtime+모달+추출 파일 전체 길이 / 분기 요소 | 4,105 / 1,064 | 4,155 / 1,059 |

§6과 같은 AST 비교 지표다. 추출 모듈의 분기를 빼고 개선을 주장하지 않는다.
모달 변환/저장 body의 전체 분기 수는 그대로이며 runtime의 반복 taskKey 계산을 줄여
전체 분기 합은 5개 줄었다. 설명·타입·명시적 입력 경계로 전체 줄 수는 50줄 늘었다.
핵심 효과는 결과 보고/형식 변환/요청 body를 부작용에서 격리하여 직접 검증 가능하게 만든 것이다.
큰 함수의 본체 복잡성(216/124)은 아직 그대로이므로 N02 전체 구조 정비 완료로 표시하지 않는다.

정적 content-editor import census: Neture/KPA-Society/Lecture/Store/Admin 및
shared-space-ui/operator-core-ui/store-ui-core/forum-core/tablet 관련 패키지/utils를 확인했다.
이 census는 기능 활성 판정이 아니다. 공개 타입 byte 동일·Store/외부 LLM 경계 source suite와
실제 변환 행동으로 이번 내부 추출을 확인했다. frontend 앱 전체 빌드나 로그인/browser smoke를
실행했다고 주장하지 않는다. React state·JSX·네트워크/오류/콜백 처리는 기존 handler에 유지했다.

잔여 TODO:
- [ ] C-N01: runtime의 observe/replay/recover/dispatch가 공유하는 mutable 상태와 변경 주체·순서 조사.
- [ ] C-N02: finish의 원장 저장/경험/도움 기록 best-effort 실패와 실행 상태 전이를 대조한 분리안 준비.
- [ ] C-N03: 모달의 생성/삽입/저장 panel 수명·닫기/재열기·비동기 응답 상태를 조사한 개별 hook/component 분리안 준비.
- [ ] C-N04: 각 후속 TODO를 해당 상태 계약과 행동 검증으로 확인한 뒤 구현 범위를 결정.

범용 RuntimeContext/공통 저장 훅/서비스 간 새 공통화는 하지 않았다.
Core/API·상태 정책·권한·운영 DB·분회 전용 개발·main 병합·배포는 이번 변경 범위가 아니다.


### 10.4 push 종료

- 구현 commit `d1d6f18b82`, 최신 main `aa59a0962f` 통합 commit `6026d346e5`.
- 검증 기록 commit `09932849501e43270b40a3d8a00d8ac75f503e98`까지
  `wo/code-complexity-phase2` push 성공, git ls-remote 원격 SHA 일치 및 clean 확인.
- 이 종료 기록도 같은 branch의 후속 문서 commit으로 push한다.
- C01~C06은 이번 내부 추출 묶음 완료. C-N01~C-N04의 큰 상태/부작용 분리는 미완료.
- PR 생성·main 병합·배포 없음. CI/리뷰 integration-ready 판정은 하지 않았다.


## 11. 공유 상태·모달 비동기 수명 — TODO·검증 결과

동일 WO/branch의 연속 묶음. 최신 main `aa59a0962f`, 직전 push `0c8d68e2a6`.
사용자 승인 범위는 기존 상태 전이/실행 순서를 유지하는 정비 및 push까지다.

- [x] D01: runtime 상태의 변경 주체·모달 상태/효과/async 응답/닫기 초기화 조사.
- [x] D02: 동일 수명에 묶이는 상태와 별도 전이/실패 계약을 대조해 TODO 검증.
- [x] D03: 검증된 recovery 판정 책임 및 개별 저장 panel 상태 책임 추출.
- [x] D04: 실제 React hook 상태 전이·runtime recovery 행동 회귀·빌드/lint 검증.
- [x] D05: 상태 소유 목록·비동기 경쟁 상태·후속 수정안 기록.
- [x] D06: commit·push 후 원격 commit 확인. PR 생성/main 병합/배포 없음.


### 11.1 상태 소유 조사·TODO 검증 (구현 전)

| 상태 그룹 | 현재 변경 주체 | 판정 |
|---|---|---|
| runtime recovery(activeClass/tier/예산/result) | recover→기존 classifyFailure/decideRecovery/noteNotRecovered, 성공 시 markRecovered | recover의 recovery 원장 판정만 별도 internal 함수. planner/로그/반복 카운터 변경은 runtime에 유지 |
| plannerMode/activePlanner | 시작/경험 routing의 setPlannerMode 및 recover escalation | 여러 전이 주체가 있어 함께 분리하지 않음 |
| retryCount/관찰 반복/단위 예산 | recover 외 observe/runUnit/replay/dispatch에서도 변경 | 큰 RuntimeContext로 묶지 않음. recovery 내부 예산과 실행 계측을 구분 |
| terminalKind/recoveryGiveupKind/종료 코드 | question/takeover/observeFailed/복구 판정 | 상태 전이/원장 저장 순서를 그대로 유지 |
| 모달 생성/URL/초기값 | 3 useEffect·생성 handler·source tab·handleClose | 비동기 결과·재열기 계약 준비 전 그대로 둠 |
| 커뮤니티 저장 panel | open/save/list fetch 및 handleClose | 전용 상태 hook으로 소유 분리. forums 목록/loading은 기존 close에서도 reset하지 않음 |
| 내 매장/제작 자료 panel | 각 open/save 및 handleClose | 서로 다른 전용 상태 hook. title·상태·saving·노출 초기화 순서 유지 |

검증한 구현: D-R01 internal recovery 결정 함수(RecoveryState만 수정; 네트워크·planner·로그 접근 없음),
D-M01 커뮤니티/내 매장/제작 자료 각각의 상태 hook(공통 generic save hook 아님).
기존 automation-recovery-contract 및 public index·props/상태 정책·API 계약은 변경하지 않는다.
정본은 §10의 Assistant V2/Store 콘텐츠 경계/Shared Module Protocol과 현재 코드를 대조했다.
consumer 범위는 §10.3과 같고 분회 전용 개발로 확대하지 않는다.

확인한 잔여: close 후 늦은 생성/목록/저장 응답이 setter를 다시 호출할 수 있다.
AbortController/run generation/stale response guard가 없고 finally도 그대로 실행된다.
이번 extraction에 취소·결과 무시·callback 정책 변경을 숨겨 넣지 않는다.
후속에는 재열기 중 stale 응답·저장은 실제 완료됐으나 화면은 닫힌 경우·서버 write 이후 abort·
외부 성공 callback의 처리 계약을 따로 준비한다. 프론트 abort는 서버 write rollback을 보장하지 않는다.

검증 계획: 기존 recovery/strong routing/안전/단위 dispatch suite를 실행하고,
실제 React renderHook으로 panel 격리·초기값·close reset 범위·인스턴스 수명을 검증한다.
기존 recovery 판정과 새 함수의 상태/결정 결과를 합성 시퀀스로 대조한다.
content-editor/API type/build·공개 타입 동일성·Store 경계와 lint를 확인한다.


### 11.2 구현·검증 결과

- recovery는 내부 `decideWorkAgentRecoveryAttempt`가 실패 분류/예산/끝맺음 결정을 담당한다.
  기존 RecoveryState만 수정한다. planner 교체·로그·invalid proposal/관찰 반복/실행 계측 카운터는
  runtime에 남기고 원래 순서로 적용한다. 기존 recovery policy 파일은 수정하지 않았다.
- 저장 panel은 각각의 hook과 communityPanel/storePanel/materialPanel 소유 객체로 나눴다.
  modal에서 15개 panel useState 호출과 개별 setter 변수를 제거하고 각 panel의 open/reset 액션을 호출한다.
  네트워크·오류 메시지·성공 callback·finally 처리는 기존 handler에 유지했다.
- 커뮤니티의 forum 목록/loading을 close가 초기화하지 않던 계약 및 open이 pending saving을
  취소하지 않던 계약을 유지했다. open prop 변경에 자동 reset effect를 새로 추가하지 않았다.
- 범용 shared hook/RuntimeContext·public export·API/권한·dependency/CI·운영 DB 변경 없음.

| 비교 지표 (직전 push → 이번 변경) | 전 | 후 |
|---|---:|---:|
| runtime recover 길이 / 분기 요소 | 27 / 10 | 21 / 4 |
| runtime 본체 길이 / 분기 요소 | 1,469 / 216 | 1,463 / 216 |
| AiContentModal 컴포넌트 길이 / 분기 요소 | 1,527 / 124 | 1,495 / 124 |
| 추출 recovery 결정 함수 길이 / 분기 요소 | — | 25 / 9 |
| runtime/모달 및 이번·기존 추출 파일 전체 길이 / 분기 요소 | 4,155 / 1,059 | 4,266 / 1,062 |

§6의 AST 비교 지표다. helper 포함 전체 분기 요소는 discriminated decision/옵션 처리로 3개 늘었고
타입·상태 반환·open/reset 경계로 전체 줄 수는 111줄 늘었다. 큰 실행/렌더 분기(216/124)를 줄였다고
보고하지 않는다. 효과는 상태 소유와 recovery 판정의 변경·검증 지점을 격리한 것이다.

검증:
- 변경 전 recovery/routing 관련 3 suite / 31 tests PASS.
- 기존 recovery/안전·새 상태 hook/결정·변환·Store 경계 포함 9 Jest suite / 134 tests PASS.
- 소유 객체로 정리한 최종 panel/변환/Store 경계 4 suite / 91 tests 재실행 PASS (앞 수치의 부분집합).
- 실제 React renderHook 8건: 초기값·패널 간/인스턴스 간 격리·open/reset 범위·rerender·unmount 수명.
- 실제 AiContentModal Vitest/jsdom 2건: 닫기/재열기 후 새 생성·저장 panel 초기값,
  동시에 열린 store/material 제목 격리. synthetic fetch만 사용했다.
- 최종 고유 테스트 파일 기준 Jest 9개 134건 + Vitest 1개 2건. 반복 실행은 합산하지 않는다.
- recovery 결정·RecoveryState·plannerMode/선택·기존 status·반복/실행 카운터·로그를
  이전 구현과 576개 합성 조합으로 비교하여 동일 PASS.
- content-editor typecheck/build, API type-check/build PASS.
- content-editor 공개 index.d.ts byte 동일 PASS.
- 변경 7개 소스/테스트 ESLint errors/warnings 0. 전체 ratchet PASS: errors 46 / baseline 46,
  warnings 1,006. 기존 lint 오류 해결 판정 아님.
- `git diff --check` PASS. 운영 DB/실계정/OAuth·사용자 PC·배포 검증은 실행하지 않았다.

실행 명령: API suite는 SETUP의 Jest 경로 지정 방식. 실제 모달 테스트는 root에서
`pnpm exec vitest run packages/content-editor/tests/AiContentModal.lifecycle.test.tsx --environment jsdom --maxWorkers=1`.
테스트 환경/manifest/lockfile 변경 없이 이미 설치된 도구를 사용했다.

### 11.3 실제 재현한 늦은 응답과 다음 TODO

실제 AiContentModal을 jsdom에 mount하고 fetch 응답만 지연한 별도 조사에서:
1. Fixture 입력으로 생성 요청 → 응답 대기.
2. 닫기 → 다시 열기. 새 요청은 보내지 않음.
3. 이전 요청 응답을 반환하면 새 화면에 저장 버튼이 생기고 이전 결과 제목이 표시됨.

1개 임시 characterization은 이 **미해결 동작을 재현**한 것이며 수정 PASS가 아니다.
기존 불량 동작을 영구 기대 계약으로 고정하지 않도록 그 임시 파일은 검증 후 제거했다.
서버/실계정 없이 synthetic fetch로 재현했고 운영 응답을 읽지 않았다.

- [ ] D-N01: modal open/close/source 전환에 대한 request generation과 작업별 request ID를 준비.
  generation/request가 다른 생성·URL·목록 응답은 현재 화면 state/finally를 갱신하지 않게 하는 계약을 검증.
- [ ] D-N02: 저장 요청의 서버 성공은 UI close/abort와 별개라는 계약 확인.
  늦은 응답은 새 panel 상태를 덮지 않되 기존 성공 callback은 확인된 서버 성공일 때 유지하는 안을 검증.
  프론트 abort가 서버 write를 취소했다고 가정하지 않는다.
- [ ] D-N03: 동시에 반복되는 같은 종류의 요청·같은 payload 저장 및 오류/no-op의 처리 조건을 준비.
  기존 saving flag의 close reset만으로 중복 요청 제어가 된다고 판단하지 않는다.
- [ ] D-N04: runtime observe/replay/dispatch와 planner routing의 상태 쓰기 주체/전이표를 계속 조사.
  이번 판정 추출을 전체 공유 mutable 상태 분리 완료로 표시하지 않는다.

다음 첫 구현 후보는 D-N01의 오래된 **생성 응답 UI 반영 차단**이다.
모달 내부의 요청 식별·결과 반영만 다루고 생성/저장 API·권한·Core/운영 DB는 바꾸지 않는 범위로
구체 TODO와 실패/재열기/연속 요청 검증을 먼저 준비한다.


### 11.4 push 종료

구현 commit `d689c196541071b0862a6fa4ad53e3d768747857`을
`wo/code-complexity-phase2`에 push했고 git ls-remote 원격 일치를 확인했다.
새 hook 파일의 EOF 빈 줄을 최종 staged diff-check에서 발견해 후속 commit으로 정리했으며
이 종료 기록과 함께 push한다. 동작 변경 없음. 최종 diff-check를 통과한 상태로 종료한다.
main 기준은 `aa59a0962f` 유지. 이번 묶음 D01~D06 완료, D-N01~D-N04는 미완료다.
PR 생성·main 병합·배포·운영 DB 변경 및 CI/리뷰 integration-ready 판정 없음.


## 12. 오래된 생성 응답 UI 반영 차단 — TODO·검증 결과

같은 WO/branch의 연속 묶음. 기준 main `aa59a0962f`, 직전 push `f674af98a4`.
대상은 AiContentModal의 text/URL 생성 결과·오류·loading 반영이다.

- [x] E01: 현재 두 생성 handler의 await/성공/오류/finally·open/source 전환 계약 확인.
- [x] E02: request identity와 invalidation 시점 및 제외 범위를 검증.
- [x] E03: 실제 모달에서 재열기 후 오래된 응답을 거부하는 회귀 검증을 먼저 작성·재현.
- [x] E04: 내부 요청 수명 guard 및 text/URL 결과·오류·finally 차단 구현.
- [x] E05: 닫기/외부 close/재열기/연속 요청/source 전환/JSON 대기/unmount/현재 오류·저장 callback 검증.
- [x] E06: content-editor type/build·공개 타입·Store 경계·lint 검증 및 결과 기록.
- [x] E07: 전용 branch에 commit·push, 원격 확인. main 병합·배포 없음.


### 12.1 TODO 검증 결과 (구현 전)

실제 모달 regression을 먼저 작성했고 기존 구현에서 재열기 후 저장 버튼이 생겨 실패함을 확인했다.
이 RED 실행은 expected failure이며 PASS로 집계하지 않는다.

| 경계 | 확정 처리 |
|---|---|
| 모달 open edge / unmount | committed lifetime 변경 때 기존 generation identity 무효화. 생성 result/error/loading/copied 초기화 |
| handleClose / source tab 변경 | 즉시 기존 generation identity 무효화. source 전환은 이전 loading도 해제해 새 입력에서 생성 가능 |
| 새 유효한 text 또는 URL 요청 | 같은 결과 슬롯을 공유하므로 이전 생성 요청을 supersede. 입력 검증 실패만으로 요청을 새로 만들지는 않음 |
| text/URL 응답 성공·오류·finally | 현재 open lifetime의 최신 요청일 때만 결과/오류/loading 반영 |
| URL 90초 타이머 | 기존 AbortController·90초 메시지 유지. 오래된 요청도 타이머 cleanup은 실행 |
| 저장/커뮤니티 목록/외부 callback | 이번 generation guard 대상 아님. 저장 API/body/권한/성공 callback 계약은 유지 |

React render 중 ref를 변경하지 않고 layout effect로 committed open 수명을 설정한다.
close/source handler는 UI 의도 시점에 즉시 invalidate한다. 서버 생성 작업의 취소나 비용 절감을
이 변경으로 보장한다고 주장하지 않는다. 생성 input/template/provider/API는 바꾸지 않는다.
위 후보는 §10의 소비처/Store 은퇴·Shared Module Protocol 및 현재 async handler와 대조했다.
분회 전용 개발/배포·Core·DB·새 공통 서비스 모듈 범위로 확대하지 않는다.


### 12.2 구현·검증 결과

§11.3에서 재현한 **생성 요청→닫기→재열기→이전 결과 반영** 문제는 이 묶음에서 수정했다.
모달 내부 `useAiGenerationRequest`의 committed lifetime/request ID가 최신 요청의 결과 슬롯을 소유한다.
렌더 중 ref를 바꾸지 않고 close/source-change handler에서 즉시 invalidate한다.
text/URL 성공·오류·finally의 state write는 current request에만 허용한다.
같은 source tab을 다시 선택하는 것만으로는 pending request를 취소하지 않는다.

외부 open=false 및 unmount도 기존 identity를 무효화한다. 새 open 수명은 generation
result/error/loading/copied를 초기화한다. URL AbortController/90초 메시지/타이머 cleanup은 유지하며,
저장 handler·API 요청 body/headers·server write·성공 callback에는 generation guard를 붙이지 않았다.

검증:
- 수정 전 새 stale-response regression: 1 expected failure / 필터 제외 2 skip. 문제 재현이며 PASS 아님.
- 수정 후 실제 modal 14 tests + identity hook 5 tests: Vitest 2 files / 19 tests PASS.
  close/reopen, 외부 close, 구 요청 성공/실패/finally 대 신 요청 pending,
  JSON 대기 중 close, 실제 source 변경/같은 tab 재선택, text↔URL,
  현재 text 실패/URL 성공/90초 timeout, 확인된 저장 성공 callback 유지 검증.
  Hook은 latest-only·inactive open·rerender·unmount·다른 instance·StrictMode replay 검증.
- 기존 panel/format 및 Store 내부 AI 은퇴/외부 LLM/editor boundary: Jest 6 suite / 164 tests PASS.
- 고유 테스트 파일 8개 / 183 tests PASS. 반복 실행은 합산하지 않는다.
- content-editor typecheck/build PASS. public index.d.ts byte 동일 PASS.
- 변경 소스/테스트 4파일 ESLint errors/warnings 0. 저장소 ratchet PASS:
  errors 46 / baseline 46, warnings 1,006 (기존 오류 해결 판정 아님).
- runtime/API 서버 코드는 변경하지 않아 전체 API/runtime suite를 다시 실행하지 않았다.
  운영 계정/OAuth/실제 생성 provider·저장 API·브라우저 운영 smoke·배포는 실행하지 않음.
  실제 React/jsdom에 synthetic fetch만 사용했다.

재현/검증 명령은 root에서:
`pnpm exec vitest run packages/content-editor/tests/AiContentModal.lifecycle.test.tsx packages/content-editor/tests/useAiGenerationRequest.test.tsx --environment jsdom --maxWorkers=1`.
새 dependency/lockfile/CI 설정·공개 props/export 계약·권한 변경 없음.

검증 중 main `90e49c3e60` (#536 PH 담당 변경)이 추가됐다. 14개 경로는 deployment scripts/workflow와
PH 기록이며 이번 수정 경로·content-editor dependencies와 겹치지 않는다. 구현을 먼저 commit한 뒤
작업 branch에 정상 merge하고 관련 UI/Store 계약 및 lint를 최종 재확인한다.
그 소스 통합은 PH 삭제 job/apply·운영 DB·GCS 작업 실행을 의미하지 않는다.

### 12.3 잔여 항목

- [ ] E-N01: 늦은 커뮤니티 목록·저장 응답이 새 panel의 상태를 덮는 조건 조사/guard 준비.
  server 성공 callback은 검증된 성공 때 유지하고 stale UI만 분리하는 계약부터 확인.
- [ ] E-N02: 같은 payload 중복 저장/저장 실패·background 완료 표시 정책은 별도 검증.
- [ ] E-N03: 같은 open 수명 안의 initialText/template/sourceMetadata/header 변경에 대한
  별도 content-context identity 필요 여부를 조사. 이번 guard를 모든 비동기 작업의 전체 해소로 표시하지 않음.
- [ ] E-N04: runtime observe/replay/dispatch의 공유 상태는 §11.3 D-N04 후속 유지.

이번 수정의 종료는 push까지다. main 병합·배포·새 서비스 공통화는 진행하지 않는다.


### 12.4 최종 검증·push 종료

- 구현 commit `985c19d719`, 최신 main `90e49c3e60` 통합 commit
  `a5604d2d86d40a8d2e6a3db53bb0a39da421c798`.
- main 통합으로 이번 content-editor 코드/의존성·검증 대상은 바뀌지 않음을 diff로 확인했다.
  최종 UI 19 tests·Store/변환 계약 164 tests 재실행 PASS, 합계 183건 (중복 실행 합산 없음).
- 최종 lint ratchet PASS: errors 46 / baseline 46, warnings 1,006.
  public index.d.ts byte 동일 및 main 대비 전체 작업 diff-check PASS.
- 위 통합 commit을 `wo/code-complexity-phase2`에 push하고 git ls-remote SHA 일치 확인.
  이 종료 기록도 같은 branch의 문서 후속 commit으로 push한다.
- E01~E07 완료. §11.3의 생성 응답 재열기 문제는 해결했고, §12.3 저장/목록/context/runtime 잔여는 미완료.
- PR 생성·우리 변경의 main 병합·배포·PH job/apply·운영 DB/GCS 작업은 실행하지 않았다.
  CI/리뷰 integration-ready 판정은 하지 않으며 이번 결과는 로컬 실행 검증이다.

## 13. 모달 비동기 수명 전체 정비 — 단일 작업 묶음

사용자 지시: 너무 작게 나누지 않고 문제 하나를 조사·수정·회귀 검증·push까지 완료한다.
동일 WO/전용 branch를 유지한다. 시작 기준 최신 origin/main `90e49c3e60`.

- [x] F01 조사·TODO 검증: 생성 외에 채널/커뮤니티/매장/제작자료 저장과 게시판 목록의 모든 await와 소비처 확인.
- [x] F02 외부 context/open 변화, 새 생성, source 전환, panel 재열기의 stale UI 보호 구현.
- [x] F03 목적지별 pending 저장 중복 방지·실패 후 재시도·독립 저장·확인된 성공 callback 보존 구현.
- [x] F04 실제 React 모달에서 목록/저장/생성/context/close/unmount 경계의 실패 재현 및 회귀 검증.
- [x] F05 타입/빌드/공개 타입/Store 은퇴 경계/lint 검증, 결과 기록·commit·push.

구현 전 계약 검증:
- 기존 생성 guard는 open/source만 다룬다. 목록과 네 저장 handler에는 수명 guard가 없다.
- 닫기에서 saving=false가 되므로 아직 진행 중인 쓰기를 다시 보낼 수 있다. 서버 쓰기를 취소했다고 표시하지 않는다.
- 화면 수명/목적지별 panel 수명과 진행 중 저장 잠금을 분리한다. 닫기/재열기에도 같은 instance의 pending 잠금은 유지하고 UI는 해당 수명만 갱신한다.
- 저장 성공은 서버 확인 이후의 기존 callback을 유지한다. stale UI를 차단해도 완료 callback은 버리지 않는다.
- 실패 후 잠금을 해제해 재시도한다. 다른 저장 목적지는 독립적으로 동작한다. 서버 idempotency·remount 간 중복 보장은 API 변경 없이 주장하지 않는다.
- 게시판 cache는 인증/context를 넘겨 재사용하지 않는다. 새로운 목록 요청의 loading을 이전 finally가 해제하지 않는다.
- context는 initialText/mode/source, template의 실제 값, sourceMetadata와 정렬된 header 값으로 판단한다. inline object/callback identity만 달라지는 rerender는 요청을 무효화하지 않는다.
- 공개 props/export, endpoint/body/권한/DDL 및 service 공통화 변경 없음. Store 내부 AI 은퇴 유지, 분회 전용 개발 제외.
- Shared Module Protocol의 전체 소비처를 확인했다. Toolbar와 CommunityContentWriteShell이 직접 경로이며 나머지는 editor/package 소비처다. static import는 활성 기능의 증거로 쓰지 않는다.


### 13.1 구현 및 검증

- 생성/목록/저장/복사의 화면 반영 수명은 open/context 및 결과·panel 전환으로 만료된다.
  generation은 기존 최신 요청 guard를 확장했고, 저장/목록/복사는 private 모달 bookkeeping으로 처리한다.
- 네 목적지의 saving boolean을 제거하고 issued-write pending 소유자 하나로 모았다.
  화면 reset은 pending 잠금을 지우지 않는다. ref로 동기 획득해 rerender 전 연속 호출도 차단한다.
  다른 목적지는 독립적으로 저장한다. finish는 current UI 여부와 무관하게 잠금을 해제하되 unmount 뒤 setState하지 않는다.
- 저장 성공 callback은 원래 작업의 서버 성공 확인 때 한 번 실행한다. close/context 변경/unmount는 이를 버리지 않는다.
  현재 성공 화면의 반복 click은 차단하며 실패 후에는 재시도한다. panel 재열기/새 생성 뒤 완료된 자료를
  새로 저장하는 기존 흐름은 유지한다. pending 중에는 다른 payload라도 같은 목적지의 새 쓰기를 기다린다.
  remount/다른 탭/서버에서의 idempotency, 네트워크 실패 뒤 서버 처리 여부는 이 프론트 변경으로 보장하지 않는다.
- 인증/entry의 값 변화는 결과와 게시판 cache를 비운다. 값이 같은 header/template object 재생성은 무효화하지 않는다.
  source tab 재선택은 현재 결과/요청을 유지한다. URL 90초 timeout 및 현재 요청 오류 처리는 유지했다.
- await 전후의 clipboard와 2초 confirmation timer도 같은 결과 수명으로 보호하고 cleanup했다.

검증 결과:
- 수정 전 실제 모달 테스트 7건: 6 expected failure / 1 PASS. pending 재저장·stale UI·context 문제 재현.
- 최종 Vitest: 실제 모달 38 + 두 수명 hook 10 = 4 files / 48 tests PASS.
  세 저장 목적지/채널의 close-reopen, stale 성공/오류/JSON/finally, 실패 재시도, 독립 쓰기,
  callback after unmount, 최신 목록/실패/재시도/cache, entry/template/auth 변경, 복사/timer, StrictMode 포함.
- 최종 Jest: panel/format 및 네 Store 경계 계약 6 suites / 164 tests PASS.
  private panel 테스트는 네트워크 pending 소유 제거에 맞춰 수정하고 draft/status/instance 격리 검증은 유지했다.
- 합계 고유 테스트 10 files / 212 tests PASS. 반복 실행은 합산하지 않는다.
- content-editor typecheck/build PASS, public index.d.ts byte 동일 PASS.
- 변경 source/test 7파일 ESLint errors/warnings 0. lint ratchet PASS: errors 46 / baseline 46, warnings 1,006.
- 새 dependency/lockfile/CI/API/DDL/권한/서비스 공통화 변경 없음. 전체 API/runtime suite는 변경 대상이 아니므로 실행하지 않았다.
- 합성 fetch/실제 React-jsdom 검증이다. 실제 계정/OAuth/provider/저장 API/운영 DB/GCS/배포는 실행하지 않았다.

§12.3 E-N01~E-N03의 모달 목록·저장·entry context 잔여를 이번 전체 묶음으로 처리했다.
E-N04 runtime observe/replay/dispatch 공유 상태는 별도 도메인 후속이다.
검증 기록과 구현을 동일 WO의 한 commit으로 묶어 `wo/code-complexity-phase2`에 push한다.
최종 원격 SHA 일치와 작업 범위 clean 여부는 push 이후 최종 보고에서 확인한다.
PR/main 병합·배포·CI/리뷰 integration-ready 판정은 이 push-only 작업의 범위가 아니다.
worktree disposition: KEEP — 같은 WO 연속 branch이며 작업 변경은 아직 main 미반영.

## 14. AI 실행기 상태 소유 정비 — 전체 흐름 단일 묶음

같은 WO/전용 branch 연속 작업. 시작 최신 main `76941a5dae` (#537); 추가 6경로는 PH scripts/기록이며 runtime과 겹치지 않는다.

- [x] G01 observe/replay/dispatch/recovery/planner의 상태 쓰기 주체와 정본·소비처 조사, TODO 검증.
- [x] G02 관찰·부분 관찰·이력·반복 감지의 갱신 소유자를 정리하고 모든 실행 경로 연결.
- [x] G03 planner 입력의 참조 공유를 실제 실행 테스트로 검증하고 요청 메모리 snapshot으로 격리.
- [x] G04 단발/단위/재생/복구/DOM/UIA/visual/재개/기억/안전 회귀 검증, 타입·빌드·lint.
- [x] G05 결과 기록·동일 WO branch commit·push. main 병합·배포 없음.

구현 전 처리 계약:
- 실행 loop는 순차적이다. 병렬 worker·새 Execution Node 계약·성능 최적화로 확대하지 않는다.
- 같은 지문은 DOM/UIA/단위의 전체 관찰에서만 반복 수를 갱신한다. find/replay의 후보 관찰은 지문을 바꾸지만 반복 수를 세지 않는다.
- visual 관찰은 반복 수를 0으로, method discovery 재관찰은 기존 수를 유지한다. strong escalation은 반복 관찰/행동 수를 reset한다.
- 행동/읽기 결과는 history와 lastResult에 반영한다. 무효 제안은 history에만 반영한다. replay actor/stepMeta/trajectory/원장 저장 순서를 유지한다.
- planner에 goal/observation/history 등 내부 참조를 넘기고 있다. 입력 snapshot은 현재 값을 전달하되 planner mutation이나 이후 이력 append가 실행 상태/과거 planner 입력에 전파되지 않도록 한다.
- 예산·재시도·unit denied/lost·전송 상실 후 재전송 금지·credential/COMMIT/타 사이트 인계·완료 판단 정책은 그대로 유지한다.
- 공개 PlannerInput/WorkAgentRunResult/API·DB/프로토콜/권한 변경 없음. 큰 RuntimeContext나 새 서비스 공통 framework를 만들지 않는다.
- Architecture V2 §18의 Execution Node 기존 구현 정비이며 새 V1 확장/실 PC smoke/배포를 진행하지 않는다.

### 14.1 상태 전이와 소비처 검증 결과

| 상태 | 변경 주체 | 이번 정리 |
|---|---|---|
| observation/지문/snapshot/docId | DOM·UIA 전체 관찰, 단위 observation, replay·find 후보 | 전체 관찰 count/preserve/reset 및 후보 narrow를 실행 증거 소유자로 모음 |
| same observation/repeated action | 관찰, method discovery, recovery escalation, proposal 검사 | 동일 지문/동일 행동의 원래 기준 및 초기화 시점 유지 |
| history/lastResult/last action | 거절 제안, 읽기, 단발·단위 행동, 재생 | append/결과 수락/행동 기록을 소유자로 모으되 record 객체와 stepMeta identity·기록 순서 유지 |
| stepCount/왕복/unit/probe/settle | 명령·단위·관찰·재시도·재생 | 기존 runtime에서 명시적으로 유지. 단위 reports를 다시 전송하지 않음 |
| replay actor/terminal/원장 | replay·복구·finish | 실행 수명과 정책 그대로. snapshot은 planner 호출 메모리에만 존재 |

runtime의 observation 직접 대입·중첩 visual 표식 대입, history.push, lastResult 대입은 새 소유자 경유로 모두 옮겼다.
세 후보 관찰과 DOM/UIA/단위 전체 관찰의 중복 변환·카운터 갱신을 합쳤고, transport/planner/원장 함수 주입은 하지 않았다.
planner에 전달되는 goal/observation/history/known keys/patterns/resume/intent/image는 structuredClone으로 현재 값만 전달한다.
이미지 원문은 기존처럼 요청 메모리에서만 쓰며 clone을 로그·DB·노드 원장으로 저장하지 않는다.

실제 호출자는 ai-proxy.routes.performWorkAgentRun이고 Assistant가 이 경로를 사용한다.
multimodal-chat은 provider 호출 패턴의 참조 문서이며 runtime 호출자가 아니다.
공개 PlannerInput·runWorkAgent signature·HTTP 응답 projection·provider 선택·추가 headers/권한은 변경하지 않았다.

수정 전 실제 runtime의 planner ownership 테스트 2건 실패: goal/history를 planner mutation이 덮고,
첫 planner 호출의 빈 history가 실행 후 2건으로 늘었다. RED expected failure이며 PASS로 집계하지 않는다.
수정 후 같은 테스트 2건 PASS, 필터 제외 14 skip. 최종 전체 suite에서 필터 없이 검증한다.


### 14.2 최종 검증·종료 범위

- 관찰 직접 write 8→0, history append 8→0, lastResult write 5→0 (runtime 원본 대비).
  쓰기를 없앴다는 뜻이 아니라 한 private 소유자로 모았다는 뜻이다. 전체 코드 크기/분기 감소로 과장하지 않는다.
- 전체 회귀: A 6 suites/61 tests + B 7/97 + C 7/106 = **20 suites / 264 tests PASS**, skip 없음.
  단발/작업 단위 동등성, 전송 상실 후 재전송 금지, 재생 불일치·예산, recovery/strong routing,
  DOM/UIA/visual·Windows 안전, 같은 run 재개·Cloud/노드 기억·Task 소유·planning 분리 포함.
- 최종 private state/ownership focused 2 suites / 10 PASS / 필터 제외 14 skip.
  전체 회귀와 같은 테스트이므로 중복 집계하지 않는다. 타입 보완 이후 다시 실행했다.
- API type-check/build PASS. 초기 snapshotId excess-property 오류는 private Observed 타입의 지역 변수로 보완한 뒤 두 검사 통과.
- 변경 source/test 4파일 ESLint 오류·경고 0, 저장소 ratchet PASS: errors 46 / baseline 46, warnings 1,006.
- endpoint/provider/권한/공개 type 계약·dependency/lockfile/CI 변경 없음.
  새 state 모듈은 내부 갱신 주체이며 Core/Node/Task/Memory 구조 계약을 바꾸지 않는다.
- synthetic DB stub/agent 응답/scripted planner 및 기존 mocked provider suite로 검증했다.
  실제 provider/OAuth/계정/사용자 PC·운영 DB/GCS·배포 smoke는 실행하지 않았다.

검증 도중 main에 #538 `e36bcf9318`의 operator 정비가 추가됐다. 시작 전 #537과 합쳐 59경로이며
API/content-editor/root dependencies/AGENTS/lint-ratchet 코드와는 겹치지 않음을 확인했다.
자기 변경을 먼저 commit한 뒤 clean 상태에서 정상 merge한다. API source가 그대로임을 확인하고
필요한 후속 검증을 진행한다. 다른 담당의 UI 구현·운영 검증·배포를 우리 작업 결과로 집계하지 않는다.

이번 묶음으로 §11.3 D-N04 / §12.3 E-N04의 execution evidence 공유 상태 조사를 구현·검증까지 완료했다.
모든 runtime 변수를 한 Context로 옮기지 않았다. terminal/routing/예산/원장 정책의 재설계는 별도 범위다.
기록과 소스를 하나의 구현 commit으로 묶고 최신 main 통합 후 같은 `wo/code-complexity-phase2`에 push한다.
최종 원격 SHA/clean 여부는 push 후 보고한다. PR 생성·main 병합·배포·integration-ready 판정 없음.
worktree disposition: KEEP — 동일 WO 연속 branch, 우리 변경은 아직 main 미반영.


### 14.3 최신 main 반영 후 확인

- 구현 `790b67dacb`, 최신 main `e36bcf9318` 통합 `cf2e8613c5`.
- merge가 API/content-editor/root dependency/AGENTS/lint-ratchet 코드에 주는 diff 0을 확인했다.
  API 타입·빌드와 전체 회귀 264건의 검증 소스는 그대로다.
- merge 후 state/ownership 핵심 10 PASS / 필터 제외 14 skip. 기존 전체 회귀와 중복이므로 추가 집계하지 않는다.
- 재개 답변·질문·교정·Avoid/Preferred 경로는 work-assistance 전체 suite를 추가 확인해 14 PASS / skip 없음.
  따라서 최종 고유 회귀는 **21 suites / 278 tests PASS** (264 + 14).
- merge 후 전체 lint ratchet PASS: errors 46 / baseline 46, warnings 1,001.
  이전 1,006과의 차이는 main 담당 operator 변경을 포함한 결과이며 우리 오류 수정 실적으로 집계하지 않는다.
- 최종 main 대비 diff-check PASS. 기록 문장의 source 변경 없음 오기를 contract 변경 없음으로 바로잡았다.
- 이 확인 기록과 구현·main 통합 이력을 같은 branch에 push한다. 원격 SHA 일치/clean 여부는 최종 보고에서 확인한다.
  push-only 종료, PR/main 병합/배포/운영 계정 또는 운영 자원 변경 없음.

## 15. 정상 main 통합·배포 — 사용자 추가 지시

사용자가 누적 정비의 main merge·배포를 지시했다. 이전 push-only 종료 기록은 당시 기록으로 보존한다.
최신 main `75a28d9313`의 두 release 기록 문서를 정상 merge하고 PR #541을 생성했다.

Codex 리뷰의 P2: content-editor의 48개 Vitest lifecycle 테스트가 기본 test/required CI에 연결되지 않았다.
기존 API Jest discovery에 `content-editor-modal-lifecycle-runner.spec.ts`를 추가해 실제 Vitest suite를
Node 자식 process에서 실행한다. Vite import.meta.env를 Jest CJS로 억지 변환하지 않고 실제 React/ESM 테스트를 유지한다.
root `pnpm test`는 API의 test script를 실행하고 required CI는 API 전체 test 목록을 3 shards로 실행하므로
이 bridge가 두 기본 실행 경로에서 발견된다. child exit status와 nonzero PASS summary를 검사하고 실제 counts/실패 상세를 출력한다.

검증: 기본 API Jest로 bridge 1건 PASS, child Vitest 4 files / 48 tests PASS.
새 Jest 파일 ESLint 오류·경고 0. package/dependency/lockfile/CI workflow/config 변경 없음.
기존 API runner로 실행을 연결하는 test-only 수정이며 runtime/API/권한 계약 변경 없음.
새 head의 required CI와 리뷰 지적 해결을 확인한 뒤 정상 merge·main CI·Delivery/Promote를 진행한다.

배포 판정 준비: API의 MembershipConsoleController/profile-update가 RBAC 경로로 LEVEL_3에 해당한다.
선택 서비스는 api/admin/neture/kpa-society/lecture/store. 분회 전용 배포 제외를 유지한다.
새 migration/DDL/운영 데이터 삭제는 포함하지 않는다. serving 기준 최종 판정과 rollout은 공식 workflow의 기술 gate를 따른다.
현재 cloud의 외부 서비스 직접 HTTP는 proxy 403이다. 공식 workflow의 revision smoke/health/serving SHA 결과를 확인하며
직접 외부 HTTP 검증을 수행했다고 표시하지 않는다. repository variable 조회도 integration 403이므로
freeze 상태는 workflow의 실제 판정으로 확인한다.

### 15.1 CI bridge 출력 판정 수정 — 사용자 제공 실패 로그

사용자가 제공한 CI 로그는 child Vitest 4 files / 48 tests PASS, child exit 0을 보여 주지만
bridge의 stdout PASS summary 정규식이 실패했다. 실제 모달 회귀 실패와 구분한다.
콘솔 출력 형식에 의존하지 않고 Vitest JSON reporter의 현재 실행 결과를 검증한다.

TODO 및 검증 기준:
- [x] 실패 로그에서 실패 지점과 실제 child 결과 대조.
- [x] 실행마다 고유한 임시 report directory 사용, finally에서 정리.
- [x] exit 0, report.success, nonzero total, passed = total, failed = 0 유지.
- [x] CI/GitHub Actions/color 환경에서 실제 bridge 실행 및 ESLint 검증.
- [ ] 최신 main 정상 통합, push, required CI/review 확인.
- [ ] 정상 PR merge, post-merge CI, 공식 Delivery/Promote 및 serving/smoke 확인.

package/dependency/lockfile/CI workflow 수정 없이 test runner bridge만 수정한다.
분회 전용 배포 제외, 새 migration/DDL/운영 데이터 삭제 제외를 유지한다.

로컬 검증: CI=true / GITHUB_ACTIONS=true / FORCE_COLOR=1에서 API Jest bridge 1 PASS, child Vitest 4 files / 48 tests PASS. ESLint 0, diff check PASS. 환경 복원 직후 첫 실행은 기존 5초 lifecycle timeout에 걸렸고, 로딩 완료 후 동일 명령에서 모든 assertions가 통과했다. timeout/assertion 완화 없이 유지했다.
