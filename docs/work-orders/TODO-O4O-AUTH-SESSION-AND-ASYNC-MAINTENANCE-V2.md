# TODO-O4O-AUTH-SESSION-AND-ASYNC-MAINTENANCE-V2

> **상태**: IMPLEMENTED_PUSHED · CI/review 판정은 PR 최신 HEAD 결과 기준
> **작성일**: 2026-10-14 (KST)
> **근거**: [인증 정비 1차](TODO-O4O-AUTH-CODE-MAINTENANCE-V1.md) 이후 사용자 지정 ② 세션 검증 정리 · ④ 비동기 상태 조사
> **종료 범위**: 이전 정비와 같은 TODO 작성 → 코드/문서로 보완 → 구현·검증 → branch push

## 범위와 불변식

같은 미완료 [인증 WO](WO-O4O-AUTH-REFACTOR-V1.md)의 연속 정비 Phase다.
준비된 격리 cloud checkout/`wo/auth-kakao-explicit-link`를 유지한다. clean·진행 operation0·branch-only commit0,
대상 runtime 경로의 main 추가 변경0을 확인한 뒤 `eebd5621de`로 fast-forward했다.
[인증 정본](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md)과
[공통 모듈 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)를 따른다.

세션 갱신 검증의 순서·오류 code/message·로그·서명된 claim 승계·DB 읽기 순서를 유지한다.
전체관리자 Google 전용·브라우저 폐기·계정 보안 세대·refresh/handoff의 세대 쓰기0을 유지한다.
공통 hook은 재현한 늦은 응답의 UI 상태 소유를 정리한다. 서비스별 wrapper/권한/인증 수단/반환 type 계약을 유지한다.
회원 수정 원자성·가입 승인 Core·서비스 간 새 공통화·DB/migration·OAuth/CI/의존성 변경은 이 묶음에 포함하지 않는다.
운영 DB·실계정·실제 OAuth는 사용하지 않는다. 테스트는 합성 응답과 격리된 검증 자원으로 구분한다.

## 초기 TODO → 조사 후 보완

| ID | 초기 항목 | 코드 확인 후 기준 |
|---|---|---|
| S01 | 세션 검증 흐름 조사 | JWT → 은퇴 scope → 만료 → 사용자 → 계정 상태 → family → 브라우저 binding → 최신 context/method → 발급 순서와 오류 우선순위 확인 |
| S02 | 검증 책임 정리 | 기존 service 내부의 payload/account/security 검증만 의미 있는 private 책임으로 추출. 공유 policy/새 framework로 확대하지 않음 |
| A01 | 비동기 소유 조사 | refresh/login/logout/token-clear/약관 제출/unmount의 user·pending·loading·callback 갱신 주체와 요청 수명 확인 |
| A02 | 실패 재현 | deferred 응답으로 이전 refresh/login 종료와 새 로그인, 늦은 logout, 동일 세대 refresh 역순 완료 등을 검증 |
| A03 | 최소 수정 | 재현한 상태 경쟁만 request/session 소유로 막음. 서버에 완료된 write를 취소/롤백했다고 주장하지 않음 |
| V01 | 서버 회귀 | 거절 우선순위·서명 claim 승계·브라우저/보안 세대·Google 관리자 경계·갱신 write0 확인 |
| V02 | 공통 소비처 검증 | hook의 실제 소비처는 Neture·약국 협력사업·분회·Store·강의 5웹 app. export/raw-source assertion도 검색. 전체관리자는 별도 auth-context이며 hook 소비처가 아님 |
| V03 | 완료 기록·push | 최초 실패/수정/최종 검증을 구분하고 이번 경로만 commit·push. 이번 차수는 main 통합·운영 배포 전에 종료 |

## 실행 TODO

- [x] 최신 main·정본·소비처·검증 runner 확인, 초기 TODO 작성.
- [x] 기존 서버/hook 회귀로 기준 확인.
- [x] 비동기 실패 재현 후 A02/A03의 구현/보류 목록 보완.
- [x] 서버 검증 책임 추출과 오류 우선순위 회귀.
- [x] 확인된 hook 상태 경쟁 최소 수정·소비처 회귀.
- [x] 관련 타입/빌드·변경 lint·문서/민감정보/diff 검증(기준 main의 실패는 아래 분리).
- [x] 이번 경로만 commit·branch push. [PR #554](https://github.com/Renagang21/o4o-platform/pull/554) 생성.
- [ ] 최신 HEAD CI/review gate PASS. 기준 main의 별도 실패를 해결된 것으로 간주하지 않는다.

## 조사 근거

`AuthTokenSessionService.refreshTokens`는 120줄이며 상태/family/binding/method 검증을 순차 수행한다.
기존 공통 `useServiceAuth`는 session generation으로 일부 늦은 성공을 무시하지만 refresh/login의 finally는
항상 loading을 해제하고 logout의 finally는 항상 user/pending을 비웠다.
전체 파일 길이 감소를 정비 효과로 간주하지 않고 요청 소유·실패 결과·보호 순서의 유지로 검증한다.

### 조사 후 보완·구현

- S01/S02: `readRefreshPayload`(서명 검증·은퇴 scope·만료)와 `assertRefreshAccount`(사용자·상태·family)를
  private 책임으로 분리했다. orchestration은 브라우저 binding → context/method → 발급을 명시한다.
  거절 code/message 우선순위, signed claim 승계, manager/query 및 refresh DB write0은 11개 신규 회귀로 확인했다.
- A01/A02: 최초 8개 deferred 회귀가 기존 hook에서 8/8 실패했다. 이전 refresh/login의 finally,
  늦은 logout, logout/token-clear 시 loading, 역순 refresh, unmount callback, 이전 계정 약관 제출을 재현했다.
- A03: 기존 session generation에 refresh/policy 요청 순서·진행 중 로그인·mount 수명을 연결했다.
  새 계정 전환 이후 응답/실패/finally가 user·pending·loading·callback을 갱신하지 못하게 한다.
  로그인 중 시작한 refresh의 완료 시점 2종, 늦은 로그인 실패, StrictMode, 역순 약관 응답도 추가해 신규 13개 PASS.
- auth-client는 이미 token storage의 세대를 검사하고 logout은 호출 시 자격을 캡처·로컬을 먼저 비운다.
  기존 계약을 재사용했다. 약관 제출의 이미 완료된 서버 write는 취소/롤백하지 않는다.
  서비스 wrapper 간 새 공통화, HTTP abort/framework 도입, 실제 운영자 OAuth/DB 검증은 이번 범위 밖이다.

## 검증 결과 (2026-10-14 KST)

| 대상 | 결과·범위 |
|---|---|
| 변경 전 기준 | auth-react 214/214, API family/password 경계 55/55 PASS |
| auth-react | 19 suites · 227/227 PASS (신규 수명 회귀 13개 포함) |
| auth-client | 기존 token storage/refresh 경계 5 suites · 40/40 PASS |
| API | 4 suites · 76/76 PASS (신규 검증 우선순위 11개 + 기존 family/binding/password/HTTP logout) |
| Neture | 92 suites · 822/822 PASS |
| 분회 | 5 suites · 39/39 PASS |
| Store | 14 suites · 132/132 PASS |
| 강의 | 5 suites · 18/18 PASS |
| 약국 협력사업 | 17 suites · 133 PASS / 2 FAIL (기준 소스에서도 동일 실패, 아래 참조) |
| 타입/빌드 | API type-check·표준 tsc build PASS, 실제 5웹의 타입/production build 모두 PASS |
| API 배포용 ESM | FAIL: 기준 main의 AI type 재수출 오류와 동일. 아래 참조 |
| lint | 변경 코드/테스트 4파일 errors0 · warnings0 |
| 브라우저 | built bundle + 합성 API fixture, 8서비스 PC/모바일 viewport에서 로그인·handoff 성공/거절 36/36 PASS |

브라우저 검증은 PC 1440×900·모바일 viewport 390×844이며 실제 OAuth·운영 세션 검증이나 실기기 검증이 아니다.
검증 로그와 격리 baseline fixture는 checkout 밖 `/workspace/.o4o-tools/auth-v2-*`에 둔다.
초기 stale ai-core generated 출력은 기존 dependency closure build로 갱신한 뒤 API 타입 검증을 통과했다.
baseline 진단의 runner 시작 실패는 실행 테스트0으로 구분하고, 아래 실패는 실제 runner가 실행된 재현만 근거로 삼았다.

### 범위 밖의 기준 main 실패 — 수정하지 않음

1. API 배포 ESM(`build:api`/tsup): AI tool router/work-agent runtime의 interface-only 이름을 value로 재수출해
   `No matching export`로 실패한다. 원본 main의 API를 checkout 밖 git archive fixture에서 같은 Node/CLI로 실행해
   동일 오류를 재현했다. 일반 tsc build 통과와 별도로 **API 배포 빌드는 통과하지 않았다**.
2. 약국 협력사업 `UserDetailPage.authority.test.tsx`: 전체관리자·kpa:admin 탈퇴/복구 버튼 assertion 2개가 실패한다.
   원본 auth-react source를 alias한 기준 실행도 2 FAIL / 1 PASS다. auth context는 테스트에서 mock되며
   본 hook 변경과 별개다. 역할/UI 정책이나 해당 fixture는 이번 작업에서 수정하지 않았다.

구현 commit `8c36ce7695`를 `wo/auth-kakao-explicit-link`에 push하고 PR #554를 생성했다.
검증 중 main은 `f8d1887ef2`로 이동했으나 변경은 AI parser/기록 6경로이며 이번 5경로와 충돌하지 않는다.
push-only 종료 범위에서 main sync/merge·배포를 실행하지 않았다. 기준 검증 SHA는 `eebd5621de`다.
최신 HEAD CI/Codex 결과는 PR에 기록한다. 위 실패를 passing/skipped로 바꾸거나 배포 가능하다고 판정하지 않는다.

문서 정합: 앞선 1차 및 검증 PR의 완료 기록을 변경하지 않고 이 후속 TODO를 분리했다.
WORKTREE_DISPOSITION: KEEP — 같은 미완료 인증 WO의 연속 Phase와 cloud 검증 자원을 유지한다.
