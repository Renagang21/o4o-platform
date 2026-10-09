# CHECK-O4O-AUTH-REFACTOR-PHASE4A-V1

> 2026-10-09 · [카카오·명시적 연결 WO](../work-orders/WO-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1.md) 4-A
> 기준 main: `01a47e6d4c` · 작업 branch: `wo/auth-refactor-phase4` · 구현·검증 기록, 운영 적용 기록 아님.

## 문제와 변경

기존 Google 발급 토큰에는 인증 수단 표식이 없고, handoff 발급은 password가 아니면 Google로
추정했다. 카카오를 그대로 추가하면 요청·refresh·handoff에서 Google 전용 전체관리자 경계를
우회하거나 카카오를 다른 수단으로 바꿀 수 있다. 현재 운영에 카카오 로그인이 있다는 주장은 아니다.

- Google의 검증된 로그인/가입 발급은 access/refresh 모두 `authMethod: 'google'`을 명시한다.
  `SessionAuthMethod`는 Google/password/Kakao를 표현한다. 카카오 OAuth endpoint는 이번 PR에 없다.
- 요청(`requireAuth`·`requirePlatformUser`·`optionalAuth`), refresh, handoff 교환은 현재 DB 역할과
  서명된 수단으로 같은 `isSessionAuthMethodAllowed` 판정을 사용한다. `admin` 귀속 또는 `platform:*`
  계정은 정확히 Google인 세션만 허용한다. service admin/operator는 이 조건의 platform 역할이 아니다.
- Google 연결 보유, 요청 본문, Origin, 미지 표식으로 Google 인증을 추정하지 않는다. password의
  기존 `PASSWORD_SESSION_NOT_ALLOWED` 계약은 유지하고, 다른 미검증 수단은 `GOOGLE_SESSION_REQUIRED`로 거절한다.
  refresh HTTP는 이 거절을 일시적 인프라 오류(503)로 바꾸지 않고 비재시도 401·쿠키 정리로 처리한다.
- refresh는 원래 수단·브라우저 ID·계정 보안 세대·서비스를 승계한다. handoff는 원장의 Google/password/Kakao를
  교환 토큰에 그대로 남긴다. 기존 원장 NULL/미지 값은 제한된 password 표식으로 읽는 호환을 유지한다.
- 이전 수단 없는 일반 서비스 세션은 유지한다. 이전 Google 전체관리자 세션은 표식이 없으므로
  적용 후 Google 재로그인이 필요하다. 일반 사용자 전체 세션을 강제로 폐기하거나 보안 세대를 회전하지 않는다.

## 문서·코드 검증 후 TODO 수정

WO의 D01–D10에 정책과 실제 소비처 근거를 연결했다. 핵심 수정은 다음과 같다.

1. 은퇴한 passport/OAuth 설정 복원이 아니라 새 서버 검증 카카오 흐름을 계획했다. `.env.example`에
   과거 변수 이름이 남았다는 사실은 앱 등록·키·실행 경로가 있다는 근거가 아니다.
2. 카카오 버튼보다 Google 긍정 세션 경계를 4-A 선행 작업으로 분리했다. DB의 handoff CHECK도
   두 수단만 허용하므로 새 incremental migration이 필요하다.
3. 공통 `LoginMethods`와 Neture 직접 Google 조립 화면을 함께 조사 대상으로 잡았다. 전체관리자에는
   카카오/비밀번호 수단을 추가하지 않는다. 대표 메인 포함 사용자 서비스 8개가 후속 화면 검증 대상이다.
4. Google/Kakao 연결은 현재 계정 재인증과 외부 인증을 모두 요구한다. 서로 다른 두 `users.id`의
   데이터·가입·역할·사업자 병합은 별도 검토이며, 이번 연결 범위에서 자동 이동/권한 합집합을 만들지 않는다.
5. state/PKCE는 카카오 공식 지원 확인을 선행 조건으로 수정했다. 공식 조회가 막힌 현재 상태에서
   PKCE 지원 또는 실접속 성공을 단정하지 않는다. 일회용 state·브라우저/용도 바인딩·redirect 검증은 후속 필수 항목이다.

## 로컬 검증 결과

| 검증 | 실행 결과 | 확인한 범위 |
|---|---|---|
| Auth focused Jest 12 suites | **282 PASS, skip 0** | 실제 Google 기본 issuer의 JWT 표식, 3수단 승계, 역할 재조회·경계, 계정 가입, 이메일 자동 병합 금지, 브라우저 logout/password 폐기 |
| 경계·기존 Core·schema 계약 Jest 15 suites | **305 PASS, 4 SKIP** | service/guest token 격리, pending/rejected/restricted/약관, 서비스 가입 게이트, 기존 auth 은퇴 계약, bootstrap/classifier 계약 |
| 공통 auth-utils Vitest 2 files | **31 PASS** | 관리자 재로그인 오류 안내, 이메일 credential 정책 |
| 공통 auth-client Vitest 4 files | **34 PASS** | refresh 중복·오래된 응답·logout/재로그인 경합, 토큰 저장·상대 URL |
| API·auth-utils build | **PASS** | 현재 코드의 TypeScript 컴파일; 준비된 의존성 사용 |
| 변경 runtime·test ESLint | **exit 0, error 0** | 기존 파일의 unused warning은 기존 상태; 새 코드의 unused warning은 정리 |
| migration contract guard | **21 PASS / 0 FAIL** | historical 불변·manifest 추가·expected state lockstep |
| 실제 PG15 새 DB 정식 runner | **FRESH_EMPTY → SUCCESS** | baseline + incremental 1..20, POST schema assertion PASS |
| 같은 PG15 DB runner 재실행 | **BOOTSTRAPPED → SUCCESS** | prefix 20/20, pending/executed 0, PRE/POST assertion PASS |
| PG15 20번 migration up/down/re-up | **PASS** | state 19 복원·state 20 재현; Kakao 원장 행이 남으면 down 거절·데이터 불변 |

API PASS 합계는 **587**, Vitest PASS 합계는 **65**다. 4건의 SKIP은 별도 DB URL/legacy baseline을
요구하는 기존 classifier 선택 테스트이며 PASS에 합산하지 않는다. 위 282건에는 격리 PostgreSQL의
기존 browser/password 테스트 8건과 새 method/handoff 테스트 6건이 포함된다. 카카오 provider 응답을
실제 인증한 테스트가 아니라 **서버가 검증한 수단을 저장·보존·인가하는 계약** 검증이다.

초기 검증 중 이전 Google claim 부재를 전제로 한 기대값과 새 테스트의 설정/응답 envelope를
현재 계약에 맞춰 정정했다. 실제 HTTP처럼 로그인 후 User 보안 세대 조회를 반영한다. 기존 관리자
수단 누락을 Google로 간주하는 assertion은 유지하지 않는다. 위 표는 수정 후 마지막 실행 결과다.

## DB 변경

`AllowKakaoHandoffAuthMethod1791527589096`를 manifest 끝(20번)에 추가했다. `public.handoff_tokens`
기존 인증수단 CHECK만 Google/password/Kakao로 확장한다. 테이블·컬럼·FK·role/membership 구조와
기존 적용 migration·canonical baseline은 변경하지 않는다. down은 남은 Kakao 행을 삭제/변환하지 않고
명시적으로 거절한다. 원장 행이 없을 때는 기존 CHECK를 복원한다.

PG15에서 확인한 fingerprint는 다음과 같다. 운영 지문을 채택하지 않았다.

| 상태 | fingerprint | lines |
|---|---|---|
| 19 | `49e6d7b2a2558750f52b42add1865a42495a6650d344ba916e0f464cba98dab0` | 6176 |
| 20 | `ee4c646d687460947bbb6f0fe0da6006075d1cbf4f1638c8fed588e554e2c68a` | 6176 |

## 재현 및 적용 경계

SETUP의 Node 22.18.0·pnpm 10.25.0·PG15를 사용한다. Core focused 테스트는 API 디렉터리에서
`pnpm exec jest --runInBand --runTestsByPath ...`로 실행했다. PG 통합 테스트는 로컬 fixture 준비 후
`O4O_AUTH_SESSION_TEST_PORT`에 격리 포트를 지정한다. 신규 method fixture DB 이름은
`o4o_auth_phase4a_test`, 기존 browser fixture는 `o4o_auth_phase2_test`다. 로컬 전용 `o4o_fixture` 사용자,
loopback, 비운영 포트만 허용하며 운영 연결값을 받지 않는다. fixture 계정·handoff 행은 테스트 후 제거한다.
포트 미지정이면 해당 PG 테스트는 SKIP이므로 기본 CI 통과를 실제 PG 실행 증거로 대체하지 않는다.

Vitest는 저장소 루트에서 `pnpm exec vitest run --config packages/auth-utils/vitest.config.mjs`와
`packages/auth-client/vitest.config.mjs`로 실행한다. 정식 migration runner는 별도 빈 격리 DB에서
빌드된 `dist/migrate.js`로 실행했다. CI/review/main/운영 적용의 최신 상태는 해당 PR에서 확인한다.

이번 PR은 runtime·migration 변경이므로 `DEPLOYMENT = MANUAL/GATED`다. main 승인 전 운영 migration,
API 배포, 전체관리자 재로그인·유지 8개 서비스 PC/모바일 운영 smoke는 **미실행**이다.
4-B 카카오 앱 등록·키/redirect 설정·실제 OAuth, 4-C 명시적 계정 연결은 **미구현/미검증**이다.

문서 정합: 상위 WO의 PR #382 통합 완료를 반영했다. Identity V3의 과거 로그인 게이트·카카오 금지,
MYPAGE의 이전 password UI 미구현 서술은 후속 문서 정합 대상으로 추적한다. Frozen 본문 임의 변경 없음.
