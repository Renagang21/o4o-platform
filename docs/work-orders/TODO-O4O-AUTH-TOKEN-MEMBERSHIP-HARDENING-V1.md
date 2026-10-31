# TODO-O4O-AUTH-TOKEN-MEMBERSHIP-HARDENING-V1

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

> **상태**: COMPLETED (승인된 구현·검증·branch push 범위)
> **작성일**: 2026-10-22 · **최종 갱신**: 2026-10-23 (KST)
> **근거**: 사용자 인증 잔여 조사 후 TODO 작성 → 문서·코드 대조·계획 보완 → 구현·검증 → commit·push 지시
> **상위 WO**: [WO-O4O-AUTH-REFACTOR-V1](WO-O4O-AUTH-REFACTOR-V1.md)의 인증 보안 보완 후속
> **종료 범위**: branch push 후 통합 담당 인계. PR 생성·병합·배포·운영 DB/계정/OAuth 설정 변경 없음.
> **후속 단계**: 2026-10-23 사용자 main 병합·배포 지시로 PR #771 진행. 위 종료 범위와 아래 최초 검증·인계 기록은 당시 사실로 보존한다.

## 기준과 승인 범위

[인증·서비스 가입 정본](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md),
[Identity V3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md),
[공통 모듈 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)를 따른다.
최신 `origin/main` `3917a9522d50936e405db28d59a4ae9febff628f`에서 전용 worktree·branch를 만들었다.
기준 checkout과 다른 세션·조사 사본은 수정하지 않는다.

CORE_CHANGE 사유: 사용자가 앞선 조사 결과의 수정·검증·push를 지시했다. F10 Auth의 기존
토큰 수명·가입 상태 보존·인증 경로 보호를 보완한다. 계정/서비스 가입/역할/소유권 분리,
전체 관리자 Google 전용, 자동 이메일 병합 금지, 브라우저 logout 및 비밀번호 변경의 전역 세션 폐기는 유지한다.
기존 테이블만 사용하며 schema/migration·의존성/lockfile·CI·배포 구조를 변경하지 않는다.

## 초기 TODO

- [x] 최신 main·작업공간·진입 지침·인증 정본 확인, 전용 branch/worktree 준비.
- [x] T01: 기존 토큰 발급·소비·비밀번호 변경·메일 실패의 코드/문서/테스트를 대조한다.
- [x] T02: 비밀번호 변경·reset 성공 시 기존 재설정 토큰을 같은 transaction에서 폐기한다.
- [x] T03: 같은 사용자/목적의 동시 토큰 발급, 메일 실패, 이메일 확인 중 장애의 원자성을 보완한다.
- [x] M01: 분회 가입·재신청·운영자 승인 경로와 실제 호출처를 대조하고 동시 처리의 상태 덮어쓰기를 막는다.
- [x] L01: Google 로그인·가입의 전용 시도 제한을 기존 limiter 정책 안에서 보완한다. 분산 제한의 한계는 별도 기록한다.
- [x] V01: 실패 사례를 먼저 재현하고 단위·격리 PostgreSQL 회귀로 보완을 검증한다.
- [x] V02: API 타입/배포 빌드·관련 소비처 회귀·lint·문서/민감정보·diff 검사를 수행한다. 전체 lint의 기존 실패는 아래 구분한다.
- [x] D01: 과거 기록을 보존하고 현재 잔여·해소 항목 및 사용자 실제 인증/시행일 대기 항목을 구분한다.
- [x] G01: 변경 경로만 commit·명시 branch push 후 commit SHA·검증·미해결 사항을 인계한다.

## 조사 후 보완 기준

기준 단위 검사 75/75 PASS 이후 재현 4개를 추가해 4 FAIL / 기존 75 PASS를 확인했다.
변경 전 실패는 비밀번호 변경 뒤 옛 복구 링크 사용, reset 뒤 형제 링크 사용,
발송 실패 뒤 기존 확인 링크 사용, 계정 확인 write 장애 뒤 같은 링크 재시도다.

| ID | 코드·문서 대조 후 확정한 구현/검증 기준 |
| --- | --- |
| T02 | 기존 비밀번호 저장과 보안 세대 회전 transaction에 미소비 reset 토큰 전체 폐기를 포함한다. 저장/폐기/세대 변경 중 실패하면 전부 rollback한다. |
| T03-A | 기존 `consumed_at`을 이용해 새 링크를 소비된 상태로 준비한다. SMTP는 transaction 밖에서 수행하고 성공 확인 후 사용자 행 잠금으로 새 링크 활성화·기존 링크 폐기를 함께 commit한다. 실패하면 준비된 해시 행만 제거하고 기존 링크는 유지한다. |
| T03-B | 발송 중 비밀번호/계정 이메일/활성 상태가 바뀌면 이전 요청을 활성화하지 않는다. 검증/복구 토큰 소비도 사용자 행 → 토큰 순서로 잠근 뒤 계정 변경과 같은 transaction에 묶는다. 외부 메일의 실제 수신·원자적 배달 자체는 보장하지 않는다. |
| M01 | 분회 가입의 실제 호출은 `BranchJoinController` 한 곳이다. unique key의 `ON CONFLICT DO NOTHING`과 membership 행 잠금으로 최초 동시 신청과 승인/재신청 경합을 직렬화한다. 자가 신청으로 active·역할을 만들지 않는다. |
| L01 | Google 전용 독립 bucket을 추가한다(로그인 15분 실패5회, 가입 1시간10회). 이메일/Kakao bucket과 섞지 않는다. Redis/새 저장소/인프라 없이 인스턴스 간 합산은 구현하지 않으며 별도 잔여다. |
| V01 | 단위 검사에 더해 독립 loopback PostgreSQL 15 fixture에서 두 연결의 잠금/충돌·rollback·메일 대기 중 잠금0·다른 사용자/목적 격리를 검증한다. |

현재 reset 자체의 토큰 소비/비밀번호/세대 변경은 이미 transaction에 있다. 과거 CHECK의 reset 선소비 장애는
현행 잔여로 재분류하지 않는다. 확인(verify)의 transaction과 기존 reset 링크 일괄 폐기는 실제 보완 대상이다.
일반 계정 상태별 운영 검증, 실제 Google/카카오·운영자 로그인/연결·메일 수신은 합성 검증으로 완료 처리하지 않는다.
2026-11-13 KST 정책 시행은 실제 공고 기간 확인 후 별도 수행한다.
`users.email` 선택 입력화, 폐기 `refresh_tokens` 물리 정리, 전수 데이터 정리는 이번 기존 구조 보완과 분리한다.

## 검증 및 인계

Node 22.18.0·pnpm 10.25.0의 frozen install과 API·웹 의존성 순서 빌드를 사용했다.
아래는 로컬 실행 결과이며 운영 데이터·계정·설정과 실제 외부 메일은 사용하지 않았다.

| 검증 | 실행 결과·범위 |
| --- | --- |
| 변경 전 단위 | 기존 75 PASS → 재현 4 FAIL / 기존 75 PASS. 구현 후 해당 suite 79 PASS |
| API 인증·인가 회귀 | 36 suites · 575 PASS. 별도 PG fixture 6 suites/98조건은 이 기본 실행에서 skip이며 PASS로 합산하지 않음 |
| 이번 실제 PostgreSQL | 20/20 PASS. 위 skip 중 신규 suite 20조건은 별도로 실행한 결과. 독립 loopback PostgreSQL 15.19, 전용 DB/무작위 schema·실제 SQL/행 잠금/rollback. 기존 다른 PG fixture 78조건은 미실행 |
| 인증 HTTP middleware | 4 suites · 52 PASS. Google 실제 router 신규 4조건은 위 API 575에 포함됨. 서로 다른 실행의 중복 조건을 합산하지 않음 |
| 공통 인증 소비처 | auth-react 233/233, auth-client 40/40 PASS |
| 서비스 화면 회귀 | Neture 인증·제한 계정·가입/약관 6 suites 68/68, 분회 4 suites 25/25 PASS |
| API | type-check·배포용 `build:api` ESM bundle PASS |
| Neture | 실제 type-check·production build PASS |
| 전체 frontend | `pnpm run type-check:frontend` 최종 PASS. 전체 관리자·사용자 서비스·공통 package 검사 포함 |
| 브라우저 | 실제 Neture production bundle, PC 1440×900/mobile 390×844 × 확인/재설정 × 유효/폐기 링크 = 8/8 PASS. 실제 화면 렌더·입력·HTTP 요청 1회·fragment 제거·오류 안내·JS 오류0·가로 넘침0. API는 합성 fixture이며 실제 OAuth/SMTP/운영 인증 성공 증거가 아님 |
| 변경 lint | 10파일 ESLint errors0, 기존 `rateLimiter.ts` 미사용 import 경고3. 기존 경고를 이번 결함으로 분류하거나 규칙을 완화하지 않음 |
| 전체 lint | FAIL: 46 errors/982 warnings. 오류 파일32개는 이번 변경과 겹치지 않는다. 동일 기준 SHA의 무수정 조사 사본에서 같은 config로 오류32파일을 다시 실행하여 46 errors 재현. 범위 밖 오류 수정·기준 완화 없음 |
| 문서·정적 경계 | 변경 문서2개 민감정보 패턴0·상대 링크 누락0·diff check PASS. unsafe route1295파일 위반0, TypeORM registry 신규 미등록/중복/stale0 |

초기 PG runner는 singleton 생성 시 연결 전 `db.manager`를 읽어 수집 단계에서 실패했다(테스트0).
fixture의 lazy repository 위임을 보완한 뒤 실제 SQL 20조건을 실행했다.
초기 전체 frontend 타입 검사는 빌드하지 않은 `appearance-system`·`lms-client` 산출물 때문에
전체 관리자/강의에서 실패했다. 기존 package build로 보완한 뒤 전체 재실행 PASS를 확인했다.
auth-client에 test script가 없어 최초 filter 명령은 테스트0이었다. 제공된 Vitest config로 정정해 40조건을 실행했다.

재현·실행 명령(저장소 root):

```bash
pnpm --filter @o4o/api-server exec jest --runInBand --runTestsByPath src/services/auth/__tests__/emailAuthService.test.ts --silent
O4O_AUTH_HARDENING_TEST_PORT=55446 pnpm --filter @o4o/api-server exec jest --runInBand --runTestsByPath src/services/auth/__tests__/token-membership-hardening.integration.test.ts --silent
pnpm --filter @o4o/api-server exec jest --runInBand --testPathPattern='(services/auth/__tests__|modules/auth/.*/__tests__|services/approval/__tests__|controllers/kpa-branch/__tests__)' --silent
pnpm exec vitest run --config packages/auth-react/vitest.config.mjs
pnpm exec vitest run --config packages/auth-client/vitest.config.mjs
pnpm --filter @o4o/api-server run type-check
pnpm --filter @o4o/api-server run build:api
pnpm --filter @o4o/web-neture run build
pnpm run type-check:frontend
```

PG 검사는 고정된 전용 테스트 DB와 비표준 loopback 포트만 받는다. 기본 포트/운영 URL이나 app.env를
받지 않는다. 각 실행은 자기 무작위 schema만 만들고 종료 후 DROP·namespace0을 확인한다.
외부 메일은 주입 대역이며 사용자·비밀번호·역할·세션 원장을 운영에서 변경하지 않는다.
종료 후 전용 fixture DB를 제거해 `pg_database` 잔존0을 확인하고 이번 PostgreSQL process를 종료했다.

공통 소비처는 이메일·Google·카카오 인증을 쓰는 Neture/공급자/펀딩/커뮤니티,
약국/CarePharm/해당 협업체(당시 구명칭), 분회, Store, 강의, 협동조합과 별도 Google 전용 전체 관리자다.
공통 transport/UI의 공개 field/method는 바꾸지 않으며 토큰 수명 보완은 서버 내부다.
실제 분회 가입 write 소비처는 `BranchJoinController`이고 승인 Core의 행 잠금 계약을 함께 대조했다.
비밀번호 세션/관리자 경계·provider 증명·가입/역할/소유권 및 HTTP 오류 계약은 기존 회귀와
전체 소비 앱 타입 검사로 확인했다. 이번 브라우저 smoke는 Neture 실제 화면 8조건이며 모든 서비스의
실제 OAuth·운영 세션 확인으로 확대하지 않는다.

## 현재 잔여와 인계 경계

| 항목 | 현재 판정 |
| --- | --- |
| 이번 수정의 main·운영 적용 | branch push 이후 통합 담당의 PR·CI·review·병합·배포 대상. 기존 배포 기록으로 이번 소스 적용을 주장하지 않음 |
| 일반 실제 계정 상태·운영자 OAuth/업무·명시적 연결 | [잔여 검증 계획](../checks/CHECK-O4O-AUTH-REMAINING-PLAN-V1.md)의 V04/V06. 이번 합성/로컬 검증으로 닫지 않음 |
| 이메일 확인·복구·문의 메일 실제 수신 | 외부 SMTP 수신 검증은 미실행. 발송 API의 성공 확인과 받은 편지함 수신은 구분 |
| 카카오 활성화 | 앞선 2026-10-22 읽기 전용 공개 config 조사에서 메인·공급자·약국·분회 `enabled=true`. 과거 비활성 기록은 역사이며 실제 OAuth 완료와 별개 |
| 분산 시도 제한 | 기존 인스턴스별 메모리 한계는 유지. 공유 저장소/edge 정책 변경은 별도 설계·승인 범위이며 이번 Google 전용 bucket 추가로 해결됐다고 주장하지 않음 |
| 정책 개정 | 2026-11-13 KST 시행일 및 실제 공고30일 확인 뒤 게시·기존 회원 재동의 운영 검증 |
| Identity 데이터 모델 | `users.email` 선택 입력화·DEAD_RETIRE `refresh_tokens` 물리 정리·계정/업무 데이터 전수 정리는 schema/데이터 작업으로 분리 |

브라우저 helper·로그는 checkout 밖 임시 파일이며 새 의존성·workflow·운영 fixture 생성은 없다.
코드·공통 API의 공개 반환 field/route·역할/소유권은 유지한다. Google 횟수 초과의 기존 `RATE_LIMITED`/429
계약만 해당 인증 경로에 적용한다.

push 준비 중 `origin/main`은 `7dc02646dab2808258133139b3ca0714ec3cc14b`로 이동했다.
증가분371경로와 이번12경로의 직접 교집합은0이다. 본 단계는 개발 담당 push 범위이므로
자동 merge/rebase·타 작업 수정을 하지 않았다. 검증 기준은 위 시작 SHA이며 통합 담당은 최신 main의
약국 화면 정리와 함께 PR CI/review 및 필요한 통합 검증을 수행한다.

## push 결과·통합 담당 인계

- repository: `Renagang21/o4o-platform`
- branch: `wo/auth-token-membership-hardening-v1`
- 소스·검증 문서 commit: `517c33bfb4c94e5c14672355d8456f87c3b1c597`
- 명시 branch push 성공 후 `git ls-remote --heads`로 원격 SHA 일치를 확인했다.
- 이 완료 기록은 같은 branch의 후속 문서 commit으로 push한다. 최종 branch HEAD는 인계 시 별도로 확인한다.
- PR 생성·required PR CI/Codex review 운영·main 통합·배포는 수행하지 않았다. 전체 lint의 기존46오류와
  별도 fixture/실계정 미실행 범위는 위 표 그대로 인계한다. integration-ready 판정을 대신하지 않는다.

DEPLOYMENT: REQUIRED_AFTER_MERGE — 이번 종료 범위는 push까지이며 적용·배포는 통합 담당에게 인계한다.

문서 정합: 앞선 조사와 현재 코드의 차이를 본 TODO에서 추적한다. 과거 WO/CHECK와 정본 색인은 다시 쓰지 않는다.
WORKTREE_DISPOSITION

```text
worktree: /workspace/o4o-wt/auth-token-membership-hardening-v1
branch: wo/auth-token-membership-hardening-v1
base: 3917a9522d50936e405db28d59a4ae9febff628f
main integration: NOT_EXECUTED (통합 담당 인계)
CI: 로컬 검증은 위 표 / PR gate 미판정
deployment: REQUIRED_AFTER_MERGE / NOT_EXECUTED
smoke: 로컬 Neture PC/mobile 8/8 / 실제 OAuth·SMTP 미실행
uncommitted/untracked: 소스 push 확인 시 0/0; 이 완료 기록 push 후 재확인
other session usage: 이번 전용 작업공간만 사용
branch-only commits: 소스 517c33bfb4 및 후속 완료 기록
verdict: KEEP (통합 담당의 PR·검토·후속 수정·병합 대기)
```

## 2026-10-23 통합 시 CI 계약 보완

- [x] 최신 main 동기화와 선행 lint PR #770 병합 반영. 전체 lint 오류0·기존 경고948, API 타입 검사 PASS.
- [x] 인증 PR #771의 첫 API shard2 실패를 로컬 같은 묶음에서 재현: 1 suite/1조건 FAIL,
  189 suites/3096조건 PASS·기존 fixture162조건 SKIP. 실패는 아래 정적 소유 파일 목록 한 곳이다.
- [x] `google-only-auth-cleanup.spec.ts`의 이메일 확인 토큰 소유 파일 목록에
  이번 분리 파일 `services/auth/email-auth-token.service.ts` 하나를 명시한다.
  전체 runtime 전수 검사·옛 service/entity/route 금지·account-erasure 쓰기 금지는 유지한다.
- [x] 수정 후 기존 인증 은퇴/재유입 차단 3 suites·82조건 PASS, 변경 테스트 ESLint 오류0·diff check PASS.

원인은 승인된 새 토큰 수명 모듈을 기존 소스 전수 가드의 명시 목록에 빠뜨린 것이다.
목록을 디렉터리 wildcard로 넓히거나 검사를 제외하지 않는다. runtime/auth 정책 변경은 없다.
확인된 같은 실패의 중복 실행을 피하려고 구 HEAD의 CI 재시도는 취소하고, 수정 HEAD에서 CI를 다시 실행한다.
최종 HEAD CI·Codex·main 병합·Delivery 및 실제 readiness 결과는
[PR #771](https://github.com/Renagang21/o4o-platform/pull/771)의 통합 체크리스트에서 추적한다.
