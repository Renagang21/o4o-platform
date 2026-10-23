# TODO-O4O-AUTH-OPERATIONAL-VERIFICATION-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-23 · **최종 갱신**: 2026-10-23 (KST)
> **근거**: 사용자의 인증 잔여 작업 진행 지시 · [인증 보완 TODO](TODO-O4O-AUTH-TOKEN-MEMBERSHIP-HARDENING-V1.md)

## 목적과 기준

가입·승인·메인 반영, 실제 인증, 메일·문의·알림의 잔여를 최신 코드와 실행 결과로 판정한다.
기준 main은 `e20c00f4531473cf110a44a8d6af3b6ff9ed16b6`이다. 이전 인증 수정은
[PR #771](https://github.com/Renagang21/o4o-platform/pull/771)에서 main 통합·API/Neture 배포를 완료했다.
과거 push-only·미배포 기록이나 이미 정비한 E2E를 새 미완료 작업으로 되돌리지 않는다.

정책은 [계정·서비스 가입 정본](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md),
[역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[기존 잔여 검증 계획](../checks/CHECK-O4O-AUTH-REMAINING-PLAN-V1.md)을 대조한다.
계정·가입·역할·소유권을 분리하며 다른 서비스의 가입이나 운영 역할로 자격을 대신하지 않는다.

## 초기 TODO와 실행 순서

- [x] 최신 main·AGENTS·정본·계정 출처·기존 검증의 현재 상태 조사.
- [x] 공개 홈·Contact Us·로그인 방법·비로그인 보호 API를 PC/mobile과 실제 HTTP로 확인(범위는 실행 표 참조).
- [x] 가입 상태 보존·승인 경쟁·메인 projection·서비스 격리의 기존 회귀와 격리 PostgreSQL 검증.
- [x] 문의 저장·담당자 범위·알림 실패 보존·처리의 기존 회귀와 격리 PostgreSQL 검증.
- [x] 확인된 결함만 최소 수정하고 관련 소비처·기존 회귀를 재검증.
- [ ] 실제 계정으로 가입/승인/메인 반영·업무 접근·로그아웃을 검증하고 원장 조건별 증거 구분.
- [ ] 사용자 브라우저에서 Google/카카오 가입·로그인·명시적 연결·취소·충돌·운영자 계정 일치 확인.
- [ ] 이메일 확인/복구/문의 회신의 실제 받은 편지함 수신과 문의함·앱 알림을 확인.
- [x] 분산 시도 제한의 현행 저장소와 선택지·작업 범위를 구체화(설계 입력, 구현 전).
- [x] 2026-11-13 KST 정책 게시 전제와 재동의 검증 절차 재확인. 시행 전 게시하지 않음.
- [x] 이메일 선택 입력·은퇴 테이블·미사용 데이터 정리의 선행 조사와 별도 실행 경계 정리.
- [ ] 코드/문서 정합·검증 결과·남은 조건을 기록하고 commit·명시 branch push.

## 조사 후 보완과 검증 경계

| 항목 | 현재 출처와 실행 경계 |
|---|---|
| 계정 출처 | 현행 기준은 `docs/local/TEST-ACCOUNTS.local.md`. 새 작업공간과 기준 checkout에 파일이 없다. `O4O_TEST_*` 연결 변수는 존재하지만 runtime readiness는 unknown이며 최신 계정 여부 확인 전 사용하지 않는다. 이전 파일·seed·Demo로 일반 상태 계정을 대체하지 않는다. |
| 공유 runtime | 실제 로그인은 세션·감사 원장 write를 수반한다. AGENTS §4-1(g)에 따라 다른 운영 배포/DB/동일 계정 검증과의 동시 사용 여부를 사용자에게 확인 중이다. 무자격 공개 조회와 로컬 fixture는 독립 진행한다. |
| 실제 OAuth | Google/카카오 제공자 인증과 계정 연결은 사용자 브라우저의 실제 결과가 필요하다. 공개 config 활성화·가짜 토큰 거절·합성 응답을 성공 로그인으로 계산하지 않는다. |
| 실제 SMTP | 발송 provider 성공과 실제 받은 편지함 수신은 별도다. 계정 파일/수신함 연결 없이 실수신 PASS로 판정하지 않는다. |
| 운영 데이터 생성 | 새 가입 신청·문의·승인 테스트는 정확한 대상·생성 데이터·허용된 정리 경로가 확정된 뒤 실행한다. 완전 정리할 수 없는 업무 데이터는 운영에서 만들지 않는다. |
| 자동 E2E | `e2e/auth-runtime`은 현행 사용자 인증과 Google 전용 전체관리자를 분리하고 frozen install·shell 구문을 이미 정비했다. 기본 무자격 검사와 승인된 실제 session smoke는 별도다. |
| 신규 구조 작업 | 분산 저장소/edge, DB schema·migration·삭제, dependency·CI 변경은 설계와 영향도를 먼저 제시한다. 기존 구조의 검증·최소 수정을 이유로 자동 실행하지 않는다. |

합성/로컬/격리 PostgreSQL/운영 공개 조회/실제 계정/OAuth/실수신 결과를 각각 기록한다.
테스트 fixture는 전용 loopback DB만 사용하고 종료 시 자기 DB 잔존 여부를 확인한다.
개인정보·credential·토큰·운영 응답 원문은 공개 문서나 로그에 남기지 않는다.

## 실행 결과

| 검증 | 결과와 한계 |
|---|---|
| 환경 | Node/pnpm은 root `package.json.volta`와 일치. frozen install·SETUP의 공통 패키지 빌드 PASS. |
| 실제 canonical schema 준비 | PG15의 새 전용 cluster에서 baseline + incremental 37개 적용, 최종 fingerprint `4a3cdac0e841e2e089f9c48ae34ee7a78c3c3b97182a4222ffe782959b4af8f3` / 6838 lines 일치. 운영 migration 없음. |
| 인증·가입·문의·알림 | 실제 PostgreSQL 10 suites / 173 PASS, SKIP 0. 비밀번호 변경/복구·토큰 단일 소비·동시 가입/승인 보존·브라우저별 로그아웃·인증수단 보존·명시적 연결/충돌·약관 원자성·문의 귀속/권한·부분 발송 실패·운영 업무함 포함. 제공자/SMTP 전송·인증 middleware 일부는 합성 대체이며 실제 OAuth/SMTP 증거가 아니다. 메인 projection은 기존 mock 회귀와 함께 검사했다. |
| Neture 화면 회귀 | 7 suites / 88 PASS. 제한 계정·미가입 안내·로그인 복귀·공개 홈 약관 gate·메인 카드·My Home 패널. 합성 응답이며 일반 운영 계정 상태별 검증을 대신하지 않는다. |
| 공개 운영 E2E 기존 검사 | PC1440/mobile390 64 PASS. 8 origin 로그인 방법·Demo 버튼 표시·Google/카카오 공개 config·전체관리자 Google 전용 표시·은퇴 API/가짜 Google 토큰 거절. 보호 화면 회귀는 기존 Neture/약국 2개 origin 대상이며 8개 서비스 전체 보호 업무를 검증한 것은 아니다. |
| 공개 홈·문의 신규 E2E | 8 origin × PC/mobile = 16 PASS. 공개 홈 → 실제 문의 메뉴 → 입력 폼, 직접 URL 재진입, 비밀번호/로그인 강제 없음, API write 요청 0. 새 테스트를 포함한 기본 suite 수집은 80개다. |
| 실제 문의 경로 | 매장 상단 메뉴는 `neture.co.kr/contact?service=store`, 분회는 `neture.co.kr/contact?service=kpa-branch`로 위임한다. 매장 자체 `/contact`도 별도 확인했다. 강의 메뉴명은 `이용 · 개설 문의`다. 분회에 없는 로컬 `/contact`를 성공 경로로 꾸미지 않는다. |
| API 타입·lint | API type-check PASS. 변경 코드 집중 ESLint 오류/경고 0. 전체 lint 오류 0 / 기존 경고 933, exit 0. 이전 기준 main의 경고 948과 구분하며 경고 감소를 이번 수정 성과로 계산하지 않는다. |
| 정리 | 이번 두 차례 runner 실행 모두 전용 DB 6개 제거·잔존 0 확인·자기 서버 종료·임시 cluster 제거. 이미 사용 중인 포트에서는 시작 전에 거절함을 별도 확인했다. |

공개 origin은 Neture·supplier·community·funding·pharmacy·store·study·kpa다.
CarePharm/MegaPharm/Pharmcoop 별도 호스트는 현재 환경의 허용 목록에 없어 브라우저 검증하지 않았다.
이들의 업무/조직 범위는 격리 DB 문의·업무함 검증과 별개로 운영 브라우저 후속에 남긴다.

Chromium은 관리 proxy CA를 직접 사용하지 못해 최초 공개 탐색에서 인증서 오류가 났다.
임시 runner에서 관리 proxy·주입 CA를 사용하는 Playwright Node request가 실제 응답을 검증한 뒤
브라우저에 그대로 전달했다. TLS 검증·proxy를 끄거나 응답을 합성하지 않았다. 이 helper와
로그/스크린샷은 checkout 밖 또는 무시된 test-results에 있으며 공개 저장소에 올리지 않는다.
제공자 호스트가 허용되지 않은 조건을 실제 OAuth 성공으로 판정하지 않는다.

### 확인한 결함과 최초 실패

1. 실제 canonical FK에서 `socialAuth.integration.test.ts`의 가입 fixture 삭제가 약관 동의 이력에
   막혔다. 최초 10 suites는 1 suite/6 FAIL·167 PASS였다. 첫 정리 실패 후 남은 소셜 연결이
   다음 조건의 unique 충돌을 만든 연쇄 실패다. 해당 fixture ID의 동의 이력 → 사용자 순서로
   같은 transaction에서 정리하고 잔존 0을 단언한다. 연결 종료는 finally로 보장한다.
   실제 정책의 FK/보존 계약이나 runtime 인증 코드는 바꾸지 않았다.
2. 수정한 소셜 suite 단독 18 PASS, 실제 baseline을 새로 마련한 전체 묶음 173 PASS.
   재현 script는 기존 서버를 재사용하지 않고 독립 cluster와 private Unix socket을 만든다.
3. 최초 프런트 검사에서 패키지 선행 빌드가 빠져 6 suites가 수집 단계에서 실패했다(실행 8 PASS).
   SETUP 전체 패키지 빌드 후 7 suites/88 PASS로 재확인했다. 최종 실행에도 기존 fixture의
   로컬 API 조회 실패 경고가 있으나 assertion 실패는 없다. 운영 장애로 확대하지 않는다.
4. 신규 공개 문의 테스트 초안은 매장 메뉴의 대표 사이트 위임과 강의의 메뉴명을 잘못 가정해
   PC/mobile 4조건 실패했다. 현재 source/실제 링크에 맞춰 기대 경로·이름을 명시한 뒤 16 PASS.
   기존 64조건은 초회 모두 PASS다. 재시도 횟수·timeout·기능 차단 단언은 완화하지 않았다.

### 재현

SETUP의 frozen install·전체 패키지 빌드 후 PG15 CLI(`initdb`, `pg_ctl`, `psql`)를 PATH에 둔다.
격리 DB 전체 검증은 다음 명령이다. 포트가 이미 사용 중이면 기존 프로세스를 중단하지 않고 실패한다.

```text
node scripts/testing/auth-operational-postgres.mjs
pnpm exec playwright test --config=e2e/auth-runtime/playwright.config.ts
```

첫 명령은 localhost의 새 전용 cluster에서만 schema를 적용하고 종료 후 자기 자원을 정리한다.
실제 DB selector·테스트 계정 환경 변수는 하위 fixture에 전달하지 않는다. 두 번째는 무자격
공개 검사이며 실제 계정 로그인·운영 문의 생성·실제 메일 전송을 하지 않는다. 환경별 proxy/CA
설정은 환경 지침을 따르며 TLS 오류를 무시하는 옵션을 넣지 않는다.

## 다음 실행에 필요한 실제 조건

| 조건 | 확인 순서와 남은 증거 |
|---|---|
| 일반 상태 계정 | 최신 계정 출처와 동시 사용 여부 확인 → 원장에 실제 존재하는 미가입/pending/active/rejected/suspended/withdrawn 조건 확정 → 로그인/me/상태 안내/메뉴·직접 주소/보호 API/다른 서비스 영향/로그아웃. 없는 상태를 임의 운영 DB write로 만들지 않는다. |
| 운영자 계정 일치 | 사용자의 Google 선택 계정으로 로그인 → My Home `/mypage/settings`의 로그인 수단과 해당 서비스 운영 메뉴·API 판정 확인. 기본 연락 이메일 차이만으로 오연결을 확정하거나 자동 병합하지 않는다. |
| 실제 OAuth | PC/mobile Google·카카오 신규 가입/기존 로그인/취소/충돌, `/mypage/settings`의 `로그인 수단 연결`에서 현재 계정 확인 → 대상 인증 → 명시적 확인. 연결 write의 대상·복구 경계를 먼저 확정한다. 전체관리자 Google 전용과 Demo 연결 변경 금지는 유지한다. |
| 실제 이메일 | 지정 수신함에서 확인·복구 메일 수신과 발신/제목/링크 목적지·만료·단일 사용·이전 링크 폐기 확인. 비밀번호 변경/reset은 대상의 기존 세션에 영향을 주므로 지정 테스트 계정에서만 실행한다. |
| 운영 문의·알림 | 정확한 서비스/사업/조합·담당 운영자·기존 메일 설정·수신함을 확정. 문의 저장 → 담당자 문의함/배지/앱 알림 → 읽음과 업무 처리 구분 → 실제 답변·메일 수신 확인. 운영 문의와 연결 기록의 허용된 완전 정리 경로가 없으면 격리 환경에서만 생성한다. |

현재 두 질문(운영 자원 동시 사용, 연결 변수의 최신 계정 여부)에 대한 사용자 답변은 아직 없다.
실제 사용자 계정·운영 역할/승인·메일 수신함을 확보하지 않은 항목은 미실행으로 유지한다.

## 구조 개선·시행일 작업의 구체적 후속

| 작업 | 코드/문서로 확인한 현황 | 다음 구현 범위 |
|---|---|---|
| 분산 제한 | `middleware/rateLimiter.ts`는 인스턴스별 MemoryStore이며 Redis는 은퇴했다. Google login/signup bucket 분리만으로 인스턴스 간 횟수가 합쳐지지 않는다. | 후보 A: 기존 PostgreSQL에 목적별 shared counter store, 후보 B: 모든 API 진입을 포함하는 edge 제한. 우선 A의 latency/부하·동시 증가·성공 decrement·만료 경계를 검증하는 설계가 적합하다. `login_attempts` 감사 이력을 mutable counter로 재사용하지 않는다. 새 table/index·key digest·실패 시 우회 금지·만료 정리·2개 프로세스 동시 제한·기존429 `RATE_LIMITED`/Retry-After 보존이 설계 대상이다. migration/운영 설정/새 의존성 범위를 구체적으로 승인받은 뒤 구현·적용하며 현재 코드에는 적용하지 않았다. |
| 정책 게시 | [개정 설계](../design/DESIGN-O4O-AUTH-LEGAL-POLICY-REFRESH-V1.md)에 실제 공고 2026-10-12·시행 예정 2026-11-13 KST가 기록되어 있다. | 시행 당일 실제 공고 30일·승인 원문/현재 version·소유 scope 재조회 → 새 공통 privacy 먼저, 같은 version terms 게시 → 신규 가입/기존 회원 재동의/버전 변경 시 입력 유지/다른 서비스 영향 검증. 2026-10-23에는 게시하지 않는다. |
| 이메일 선택 입력 | `modules/auth/entities/User.ts`의 email은 여전히 NOT NULL UNIQUE. Identity V3 REVIEW-8은 이메일 password 로그인 ID와 소셜 identity를 구분한다. | 소셜 provider가 이메일을 주지 않는 경우와 미확인 이메일/기존 연락 수단·메일 필수 기능의 기대 동작을 확정 → DTO/DB/메일/화면/정책 소비처 전수 조사 → expand/contract와 기존 계정 충돌·복구 계획. 단순 nullable migration만 적용하지 않는다. |
| 은퇴 테이블 | baseline에 `refresh_tokens`가 남지만 runtime entity/reader/writer는 은퇴했다. Identity V3 REVIEW-11/F10 후속 범위다. | 기존 FK·운영 행·보유기간·복구 자료를 읽기 전용 census → forward migration·증분 지문·raw-source guard 동시 검증. 과거 baseline/역사를 손으로 지우거나 runtime 세션 테이블로 되살리지 않는다. |
| 미사용 데이터 | Demo 연결 완료와 플랫폼 전체 콘텐츠/상품/주문/계정 disposition은 별개다. | 소유·참조·법정 보존·복구 자료로 재사용/삭제/보류 목록을 먼저 확정하고 계정은 마지막에 처리한다. 이번 트랙에서 운영 삭제·대량 update를 하지 않았다. |

위 표는 실행을 위한 조사·설계 입력이며 새 schema·Core 예외·운영 데이터 변경 승인으로 해석하지 않는다.
lint 현재 오류는 0이나 기존 ratchet script의 허용 baseline은46이다. 이 CI 기준 정비는 인증
운영 검증과 별도 infrastructure 범위로 남기고 이번 변경으로 기준이나 workflow를 수정하지 않았다.

문서 정합: 오래된 잔여 계획의 미배포·E2E 드리프트와 최신 완료 기록을 구분한다. 과거 기록·정본 색인은 재작성하지 않는다.

WORKTREE_DISPOSITION: KEEP — `wo/auth-operational-verification-v1` / `/workspace/o4o-wt/auth-operational-verification-v1`, 검증·후속 수정 진행 중.
DEPLOYMENT: NOT_APPLICABLE — 테스트·로컬 fixture runner·검증 기록만 변경. 운영 runtime·schema·dependency·workflow 변경 없음.
