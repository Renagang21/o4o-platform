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
