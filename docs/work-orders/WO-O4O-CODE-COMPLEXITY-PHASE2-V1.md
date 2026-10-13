# WO-O4O-CODE-COMPLEXITY-PHASE2-V1

상태: 회원 콘솔 첫 묶음 구현·검증·push 완료 (2026-10-13)

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


## 10. N02 AI runtime·콘텐츠 모달 — TODO 초안

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
