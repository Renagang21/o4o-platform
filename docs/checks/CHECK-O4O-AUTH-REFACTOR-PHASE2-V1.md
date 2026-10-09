# CHECK-O4O-AUTH-REFACTOR-PHASE2-V1

> **작성일**: 2026-10-09 · **상태**: ACTIVE
> **작업**: [WO-O4O-AUTH-REFACTOR-V1](../work-orders/WO-O4O-AUTH-REFACTOR-V1.md) 단계 2
> **PR**: [#378](https://github.com/Renagang21/o4o-platform/pull/378) — CI/review 현황은 PR의 최신 HEAD 기준
> **branch**: `wo/auth-refactor-phase2` · **개발 기준 main**: `240a2dfd42f606f0067a5d290ed23c2ba514fece` · **승인 후 통합 기준 main**: `f1d86f4f21e97a7f5fd5f888b8524f9a3891a7f1`

세션·비밀번호는 2026-10-09 운영 적용과 아래 smoke 검증을 마쳤다. 이 기록에 후속 가입·권한 회귀 자료도 이어서 기록한다.

## 변경과 보안 계약

일반 로그아웃을 서비스 전체 epoch 증가에서 `(user_id, service_key, session_id)` 브라우저 폐기로 바꿨다. 로그인과 handoff는 새 브라우저 UUID를 발급하고 refresh는 같은 ID를 유지한다. 다른 브라우저와 다른 서브도메인은 유지한다. body와 Origin 주장으로 폐기 대상을 선택하지 못하며, 서버 폐기 실패를 성공으로 응답하지 않는다.

access·refresh·handoff는 계정의 현재 `refreshTokenFamily`와 브라우저 폐기 원장을 같은 SQL snapshot에서 확인한다. 비밀번호 추가·변경·reset은 credential 저장, reset-token 일회 소비, 계정 세대 UUID 회전을 같은 transaction에서 수행한다. 비밀번호 변경 전 인증을 마친 지연 login은 compare-and-set으로 새 세대를 덮어쓸 수 없다. refresh·handoff에는 계정 family를 저장하는 후속 write가 없다. 가입·서비스 자격을 먼저 판정하고 세션을 발급하므로 거절된 login도 family를 기록하지 않는다.

Store/KPA의 별도 fetch refresh는 auth-client coordinator를 사용한다. 같은 refresh token의 요청을 합치고, 로그아웃·다른 탭 token 삭제·새 로그인 뒤 늦게 도착한 응답은 버린다. 임시 network/DB 실패는 token을 지우지 않는다. cookie refresh의 JSON token 부재는 정상이며, 확정된 401만 화면 세션을 종료한다. 대기 요청은 실패·로그아웃 모두에서 종료된다.

Neture 계정 보안 화면에 첫 비밀번호 추가·변경을 연결했다. 저장 후 재로그인을 안내하고 Demo/전체관리자 계정은 UI와 서버 모두 변경을 막는다. 전체관리자는 서버 검증 전 캐시로 보호 화면을 열지 않으며, AuthProvider·API retry·기존 화면의 패키지 singleton 직접 import가 같은 cookie client를 사용한다. Zustand는 메모리 투영만 담당하고 별도의 저장·복원·token 소유자가 아니다. legacy API의 stale bearer 및 개발용 가짜 token도 제거했다.

최신 main의 커뮤니티 관리자·운영자 변경을 반영했다. 중앙 인증에서 최신 DB 역할을 읽는 계약을 유지하고 브라우저 폐기 검사도 함께 적용했다. 이전 epoch 컬럼과 claim은 호환 목적으로 남지만 logout 판정에는 사용하지 않는다. 관련 raw-source 테스트의 기대값도 현재 transaction 호출·세션 binding으로 갱신했다.

## 자동 review 보완

PR review의 [P1 만료 access 로그아웃](https://github.com/Renagang21/o4o-platform/pull/378#discussion_r4226447645)과 [P2 상대 refresh URL](https://github.com/Renagang21/o4o-platform/pull/378#discussion_r4226447649)을 반영했다.

logout 요청은 현재 access/refresh credential을 캡처하고 로컬 상태를 즉시 비운다. access가 만료된 요청은 body 또는 cookie의 **해당 요청 refresh snapshot**을 서버에서 검증하여 같은 브라우저 ID로 인증한 뒤, 기존 requireAuth·Origin/scope 검사를 거쳐 폐기한다. 새 token을 응답·storage·cookie에 저장하지 않는다. 이전 서버와의 호환 fallback도 캡처한 credential만 사용하며, 자동 interceptor가 새 로그인 credential로 logout을 재시도하지 않는다. 처리 중 새 로그인이 생겨도 새 token 저장소와 브라우저를 건드리지 않는 회귀 2건 PASS다.

Store/Pharmacy fetch refresh는 API base 미설정 시 기존 `/api/v1`을 유지한다. 명시된 API base를 사용하며 서로 다른 서버를 같은 coordinator 요청으로 합치지 않는다. 두 서비스 × 설정/미설정 4건 PASS다.

추가로 변경된 빌드에서 8개 서비스 × 두 Demo × PC/mobile **만료 access 상태의 실제 logout 버튼 32/32 PASS**다.

전체관리자 package singleton 직접 소비처도 별도 client 생성 없이 같은 인스턴스를 사용함을 확인했다. 동일성 회귀와 최신 main 전체관리자 전체 345 tests·type-check·production build PASS다.

추가 검증: cookie/body의 만료 access logout을 포함한 실제 PostgreSQL **10 tests PASS**, controller/서비스 경계까지 3 suites / 36 tests PASS. 영향 파일 ESLint error 0(기존 warning 2), API·auth-client 및 사용자 앱 재빌드 PASS.

## DB 및 배포

새 migration `CreateBrowserSessionRevocations1791509600000`은 브라우저 폐기 원장·만료 index·handoff 출발 세션/계정 세대 컬럼을 추가한다. 기존 사용자·역할·가입·소유권 backfill은 없다. 원장의 만료는 고정된 7일 refresh TTL보다 긴 8일이며, cleanup은 1,000행 한도로 별도 실행한다.

새 DB의 정상 migration 경로에서 기존 등록 스키마와 `pgcrypto` extension 한 줄 차이가 발견됐다. Frozen baseline·적용된 과거 migration을 고치지 않고 이번 신규 migration에 public extension 존재 검사를 추가했다. 다른 schema에 설치된 extension은 자동 이동하지 않는다. down도 기존 등록 상태에 필요한 extension을 제거하지 않는다.

격리 PostgreSQL에서 정상 entrypoint로 fresh bootstrap + 19개 incremental migration을 적용했다. 최종 fingerprint는 `49e6d7b2a2558750f52b42add1865a42495a6650d344ba916e0f464cba98dab0`, 6,176행이다. 같은 명령 재실행은 pending 0, prefix 19/19, PRE/POST fingerprint PASS다. 실패했던 별도 격리 DB는 조사 자료로 보존했고 repair/adopt로 통과시키지 않았다.

**호환 주의**: 브라우저 ID·계정 세대 없는 배포 전 token과 pending handoff는 거부된다. 배포 후 사용자는 한 번 다시 로그인해야 한다. rollback으로 이전 서버를 되돌리면 이전 세션 정책도 복귀하므로 사용자 재로그인과 서버 폐기 검사를 함께 확인해야 한다.

**DEPLOYMENT = MANUAL/GATED (LEVEL 3)**: 인증·migration 변경이므로 main 통합 후 CI 성공한 정확한 SHA로 현재 promote 정책을 따른다. 이 CHECK의 로컬 검증은 운영 migration·데이터 복구·배포를 뜻하지 않는다. 운영 배포 후 유지 서비스 8개 PC·모바일 smoke를 별도로 재실행한다.

## Shared Module Change Verification

수정 모듈: auth-client·auth-context·auth-react, API auth façade/helper/controller/middleware, 전체관리자 인증 소비처.

| 소비처 | 영향·검증 |
|---|---|
| Neture·Supplier·Community·Funding | 공통 client/Context, 계정 보안 UI, Demo 버튼; Neture production build·공통 테스트·PC/mobile 검증 |
| Pharmacy(KPA-Society) | refresh coordinator·현재 브라우저 logout; 타입 검사·build·PC/mobile 검증 |
| Store | refresh coordinator·현재 브라우저 logout; 타입 검사·build·PC/mobile 검증 |
| Study(Lecture) | 공통 client/Context; 타입 검사·build·PC/mobile 검증 |
| KPA-Branch | 공통 client/Context; 타입 검사·build·PC/mobile 검증 |
| 전체관리자 | cookie client·서버 검증·메모리 projection·API retry; 타입 검사·build·Vitest |
| API login/refresh/handoff/password | 실제 PostgreSQL·Jest·raw-source 소비처 검사 |
| operator/account/store 등의 간접 소비처 | 전체 root type-check, 기존 API 회귀 및 최신 DB 역할 테스트 |
| Pharmacy-Hub | 삭제 대상으로 유지 8개 운영 검증에서 제외; 승인 후 최신 main의 PR #375 소스·배포 대상 삭제를 통합 |
| Hospital Pharmacy | 공통 인증 runtime 소비 없음; 범위 확대 없음 |

symbol·endpoint·문구·수정 파일 경로 및 raw-source 소비처를 검색했다. `bumpServiceSessionEpoch`·`isSessionScopeLive`는 일반 logout/refresh/handoff의 활성 소비처가 없다. 제거된 `persistRefreshTokenFamily`는 이를 호출하지 않는지 확인하는 테스트 mock/negative assertion에만 남는다. 폐기된 service-token 발급 경로는 복구하지 않았다. 별도 WebSocket/guest 식별자는 사용자 브라우저 ID 계약으로 변경하지 않는다.

서비스 가입·role·조직 원장은 변경하지 않았다. 로그인 자격·전체관리자 Google 전용·약관 게이트를 유지하며, 새 공개 전 기기 logout이나 Demo 인가 우회는 없다.

## 검증 결과

- API 전체 Jest 최초 실행: 422 suites / 7,274 tests PASS, 4 suites / 31 tests FAIL, 10 suites / 84 tests skipped. 실패 4개는 구형 테스트 session fixture 및 transaction 호출 문자열이었다. 해당 84건 재검증 PASS; 새 legacy token 재로그인 회귀도 포함했다. 최초 실행을 전체 PASS로 기록하지 않는다.
- 최신 main 반영 뒤 중앙 인증·역할 회수·약관·restricted/token 경계: 5 suites / 112 tests PASS. workspace handoff 31 tests PASS.
- 세션·이메일·Google·handoff 등 집중 검사: 10 suites / 235 tests 중 새 reset rollback fixture 1건 FAIL 후 fixture transaction 주입을 바로잡았다. 실제 PostgreSQL 8 tests 재실행 PASS; 나머지 227 tests PASS. reset token을 다시 사용할 수 있고 이전 비밀번호가 유지되는지 실제 DB로 검증했다.
- auth-client 34, auth-context 16, auth-react 156, 최신 main Neture 375 tests PASS. 최신 main 전체관리자 345 tests PASS(cookie owner/expiry/failure 검증 포함).
- 전체 root type-check PASS. 공통 패키지·API·사용자 서비스 5개 앱·전체관리자 production build PASS. 기존 bundle-size 경고는 남는다.
- lint ratchet PASS: 기존 error 46 / warning 998. 처음 발견한 이번 변경의 parsing/no-useless-catch 2건을 수정하고 재실행했다. error 0으로 보고하지 않는다.
- 문서 sensitive 검사 PASS. main ruleset read-only 확인: PR 필수, required `CI Gate`, human approval 0, 삭제·non-fast-forward 금지. 기술 gate 통과와 사용자의 main 통합 승인은 별개다. 최신 CI/review 결과는 위 PR에서 확인한다.

### PC·모바일 smoke의 범위

Chromium 1440×900와 390×844에서 각 로그인 화면의 실제 약국장·공급자 Demo 버튼을 클릭했다. 변경된 API와 격리 PostgreSQL로 login·`/auth/me`·handoff·logout·이전 access/refresh 401을 확인했다. 업무 데이터 API만 fixture이므로 상품·주문·운영 데이터·Google/Kakao 실제 OAuth의 정상 여부를 증명하지 않는다. 기존 운영 smoke 결과를 이번 코드의 운영 PASS로 재사용하지 않는다.

Demo가 업무공간으로 이동하는 서비스는 원래 로그인 서브도메인의 설정 화면으로 다시 들어가 그 서브도메인의 logout도 검사한다. 분회는 `/me`에서 logout을 제공하는 공용 디렉터리 헤더로 이동한다. 업무 dashboard fixture의 잘못된 데이터 shape를 제품 결함으로 수정하지 않았다.

최신 main 반영 후 최종 **32/32 PASS**. 각 원래 로그인 서브도메인의 logout을 실제 버튼으로 검사했다.

| 유지 서비스 | PC 약국장/공급자 | 모바일 약국장/공급자 |
|---|---|---|
| Neture | 2/2 PASS | 2/2 PASS |
| Supplier | 2/2 PASS | 2/2 PASS |
| Community | 2/2 PASS | 2/2 PASS |
| Funding | 2/2 PASS | 2/2 PASS |
| Pharmacy | 2/2 PASS | 2/2 PASS |
| Store | 2/2 PASS | 2/2 PASS |
| Study | 2/2 PASS | 2/2 PASS |
| KPA-Branch | 2/2 PASS | 2/2 PASS |

운영 인증·업무 데이터 PASS로 승격하지 않는다. 격리 fixture 사용자를 종료 시 삭제하며 실제 데이터 DB는 변경하지 않았다.

## 후속·통합 기록

2026-10-09 사용자가 main 통합·배포 진행을 승인했다. 최신 main `8fa26f92934c0d19d7f69d33a24d57ef01682161`의 Pharmacy-Hub 삭제(PR #375)를 작업 branch에 merge했으며 인증 수정 경로와 중복·충돌은 없었다. 검증 중 main에 추가된 공급자 기능 변경(PR #379, `f1d86f4f21e97a7f5fd5f888b8524f9a3891a7f1`)도 인증 수정 경로와 중복·충돌 없이 반영했다. 갱신된 HEAD의 필수 CI 확인 후 PR merge와 운영 migration·배포를 진행한다. 이 기록 시점에는 운영 미적용이다. 다음 단계는 가입·권한 회귀, 그 다음 카카오·명시적 연결이다. 자동 이메일 병합과 기존 두 계정의 자동 이동은 구현하지 않는다.

## 문서 정합

인증·서비스 가입 정본, Identity V3 갱신 안내, API 문서의 현재 session contract, WO의 단계 순서를 맞췄다. Phase 1 CHECK·과거 실행 기록·Frozen baseline은 보존했다. 로컬 확인·PR·main 통합·운영 배포 완료를 각각 구분한다.

## 승인 후 운영 적용 · 2026-10-09

PR [#378](https://github.com/Renagang21/o4o-platform/pull/378)은 main `03f97298560136883c10045794d2d26fa675fe3b`로 통합됐다. [main CI](https://github.com/Renagang21/o4o-platform/actions/runs/37885883449) 성공 후 [Promote](https://github.com/Renagang21/o4o-platform/actions/runs/37886624466)를 한 번 실행했다. API의 `Run database migrations`와 전환 후 readiness 검사, 전체관리자와 Neture·Store·KPA-Society·Lecture·KPA-Branch 배포, 최종 serving SHA 보고 작업이 성공했다. API `/health/ready`도 200이다.

배포 선택은 API·전체관리자와 유지 8개 origin을 담당하는 5개 앱이다. Hospital Pharmacy는 이 작업의 대상이 아니어서 선택하지 않았다. 전체 commit status의 `NOT_SELECTED`/pending은 그 별도 대상의 보류를 포함하며, 이번 선택 대상의 배포 실패로 해석하지 않는다. 다른 서비스·설정·secret을 임의 변경하지 않았다.

- 운영 API: 유지 8개 origin × 두 Demo × 일반/refresh-only logout **32/32 PASS**. 폐기된 브라우저의 access/refresh는 401이고, 같은 origin의 다른 브라우저 및 다른 origin의 세션은 200으로 유지됐다. 검사 세션은 logout으로 정리했다.
- 운영 Chromium PC(1440×900)·모바일(390×844): 유지 8개 × 두 Demo × 두 viewport, 실제 로그인·logout 버튼 **32/32 PASS**. 메인·공급자·Pharmacy 약국장 진입의 Store handoff를 완료한 뒤 원래 origin에서도 logout을 확인했다.
- 동일한 32개 조합에서 저장된 access만 제거하고 실제 logout 버튼을 눌렀다. refresh credential로 서버 브라우저 폐기가 완료되고 원래 access/refresh가 모두 401인 **32/32 PASS**다. 실제 만료를 기다린 운영 테스트로 표현하지 않는다; 서명된 만료 access 자체의 검증은 앞서 기록한 격리 DB/browser 테스트다.
- 운영 약국장 Demo의 약국 업무 API는 200이다. 공급자 Demo에 대한 `403 STORE_OWNER_REQUIRED`는 타인의 약국 업무를 차단하는 기대 결과이며 권한을 우회해 통과시키지 않았다.

첫 browser 실행의 CA 신뢰 오류와 테스트 드라이버의 응답 envelope·비동기 이동/폐기 대기 가정을 고친 뒤 재실행했다. 실패 자료는 private 실행 공간에 보존했다. 환경의 공개 CA를 Chromium NSS에 등록했으며 TLS 검증을 끄지 않았다. 필요한 CA 초기화 helper와 `start_skill` 초안을 저장했으며, 초안 저장을 환경 게시로 보고하지 않는다. 이 검증을 위해 runtime 제품 코드를 추가 수정하지 않았다.

운영 비밀번호 변경/reset은 공개 Demo의 금지 정책 때문에 실행하지 않았다. credential 변경·원자적 rollback·reset 일회성·전역 폐기의 실제 PostgreSQL 10건은 앞선 격리 검증이다. 실제 Google/Kakao OAuth, 전체관리자 실제 로그인, 상품·주문 전체 업무의 완료를 이 smoke 결과로 주장하지 않는다.

## 가입·권한 회귀 · Phase 3

**후속 PR**: [#382](https://github.com/Renagang21/o4o-platform/pull/382) — 최신 HEAD CI/review는 PR에서 확인한다.

**기준**: 배포된 main `03f97298560136883c10045794d2d26fa675fe3b` · 작업 branch `wo/auth-refactor-phase3`. 최신 모집단은 유지 사용자 origin 8개, runtime 웹 앱 5개, 전체관리자 및 API다. Phase 2 이후 runtime 수정 없이 기존 정책과 현재 코드의 일치 여부를 검사한다. Pharmacy-Hub는 최신 main에서 제거됐으며 되살리지 않는다.

### 코드·자동 회귀

| 검증 항목 | 실제 검사·결과 |
|---|---|
| 이메일·Google 공통 계정 가입 | EmailAuthService/GoogleAuthService: 계정·credential/provider 연결만 생성, membership·role·매장 자동 생성 없음, 동의·이메일 확인, 중복 가입·실패 rollback |
| 서비스 미가입·승인 상태 | service catalog의 loginMembershipRequired는 현재 모두 false. 유지 origin에서 미가입은 공통 login 거부 사유가 아니며, pending/rejected/suspended/withdrawn의 보호 기능은 별도 membership/사업자 원장 gate가 판정 |
| 메인 가입 완료 | main membership projection과 Neture 안내 화면: 정상 계정·확인된 이메일을 기준으로 하며 과거 pending/rejected 신청 원장을 승인 대기로 사용하지 않음 |
| 약국장·공급자 | 약국 원장·조직 소유권과 공급자 관계를 사용. JWT role 문자열이나 타 서비스 active membership만으로 약국/사업장 접근을 만들지 않음 |
| 정지·탈퇴·역할 회수 | membership read guard, 종료와 Identity 분리, 역할 편집/회수, account restriction·약관 gate 검증. 계정 탈퇴와 개별 서비스 탈퇴를 혼동하지 않음 |
| 전체관리자·운영자 | password session의 전체관리자 접근 거부, 서비스/서브도메인 관리자·운영자 scope 분리, 캐시/JWT의 이전 권한만으로 통과시키지 않음 |
| Demo 보호 | registry user_id 판정·비밀번호/소셜 연결 write guard. 일반 인증·원장 기반 접근을 사용하고 관리자 권한·가입 bypass를 추가하지 않음 |

API Jest **21 suites / 483 tests PASS**: 가입·멤버십·역할 17 suites / 398건, 전체관리자 password·커뮤니티/서브도메인 scope·약관 4 suites / 85건이다.

UI Vitest **11 files / 130 tests PASS**: Pharmacy 이용 gate 18건, Neture 가입/이메일 링크/메인 안내 17건, 공통 로그인·route guard·Google·Demo 버튼 54건, 서비스 이용·신청·서브도메인 운영자 경계 41건이다. 첫 실행의 작업 디렉터리와 config include 불일치는 root에서 config별 실제 파일을 지정해 해결했다. 0-test 실행은 검증에 포함하지 않는다.

위 가입·Google identity·상태 변경 검증은 격리된 자동 회귀 테스트다. 실제 운영 사용자의 가입·승인·정지·탈퇴·역할을 변경하지 않았고 운영 SMTP/외부 OAuth 검증으로 보고하지 않는다. 새로운 runtime 결함이 확인되지 않아 인가 코드나 계약을 추가 변경하지 않았다.

### 운영 PC·모바일 권한 검증

운영 화면의 동일한 두 Demo 버튼을 새 browser context로 다시 누르고, 로그인한 원래 origin에서 read-only API의 권한을 검사한다. 전체관리자 목록 API는 두 Demo 모두 403 ROLE_REQUIRED, Demo 비밀번호 capability는 200/canManage=false다. 약국장 Demo는 약국 정보 200·공급자 상품 403 NO_SUPPLIER, 공급자 Demo는 약국 정보 403 STORE_OWNER_REQUIRED·본인 공급 상품 200을 기대한다. `error.code`와 최상위 `code`를 둘 다 읽으며 거절 응답을 로그인 실패로 해석하지 않는다. 각 검사는 실제 logout 버튼과 이전 token 401까지 포함한다.

운영 유지 8개 × 두 Demo × PC/모바일 **32/32 PASS**이며 위 4개 endpoint 권한 판정 **128/128 PASS**다. 모든 조합에서 실제 logout·기존 access/refresh 401도 확인했다. 약국장 Demo의 연결된 약국 조직 존재와 공급자 Demo의 본인 상품 5건을 집계로 확인했으며, 실제 식별자·개인정보·응답 원문은 기록하지 않는다. 상품/주문 전체 기능 테스트나 테스트 데이터 전체 정리 완료를 뜻하지 않는다.

| 서비스 | PC 약국장/공급자 | 모바일 약국장/공급자 |
|---|---|---|
| Neture | 2/2 PASS | 2/2 PASS |
| Supplier | 2/2 PASS | 2/2 PASS |
| Community | 2/2 PASS | 2/2 PASS |
| Funding | 2/2 PASS | 2/2 PASS |
| Pharmacy | 2/2 PASS | 2/2 PASS |
| Store | 2/2 PASS | 2/2 PASS |
| Study | 2/2 PASS | 2/2 PASS |
| KPA-Branch | 2/2 PASS | 2/2 PASS |

이번 후속 PR은 이 운영 적용/회귀 기록과 WO TODO만 갱신한다. runtime 변경이 없으므로 **DEPLOYMENT = NOT_APPLICABLE**이며 별도 production promote를 실행하지 않는다. PR의 최신 HEAD 필수 CI·review 상태를 확인하고 사용자 main 통합 승인 전 멈춘다.

### 다음 단계

가입·권한 회귀 다음은 카카오 로그인과 사용자 요청에 따른 명시적 계정 연결이다. 같은 이메일 자동 병합, 이미 다른 users.id에 연결된 provider의 자동 이동, 권한의 합집합은 허용하지 않는다. 실제 provider 자격정보·redirect와 연결 경로를 문서/코드 및 이용 가능한 운영 경로에서 먼저 조사한다. 별도 데이터 정리 TODO는 이번 권한 회귀 완료로 간주하지 않는다.

### 문서 정합 드리프트 · OPEN

자동 리뷰 [P2](https://github.com/Renagang21/o4o-platform/pull/382#discussion_r4226968089)가 지적한 `Identity V3`의 로그인 가입 게이트 문구를 확인했다. ACTIVE인 [Identity V3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md) §7의 기존 본문에는 `kpa-society`·`k-cosmetics`가 로그인 시 membership을 요구한다고 남아 있다. 현행 [인증·서비스 가입 정본](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md)의 **계정과 서비스 가입** 절은 서비스 미가입을 login 거부로 처리하지 않는다고 명시하며, 최신 catalog의 loginMembershipRequired=false 및 위 회귀 검사와 일치한다. 따라서 모든 ACTIVE 문서가 이미 일치한다고 판단하지 않는다.

현행 실행은 사용자가 확정한 공통 로그인/서비스 이용 자격 분리와 후자의 가입 정책을 따른다. 보호 API의 active membership·조직/사업자 관계 검사, 서비스별 승인, 전체관리자 Google 전용 경계는 유지한다. 이전 문구를 근거로 로그인 차단이나 퇴역 K-Cosmetics를 복구하지 않는다.

**미완료 후속**: Identity V3의 해당 문구·연결 참조를 현행 정본과 정렬하는 별도 문서 작업. AGENTS §8에 따라 이 기록-only PR에서 기존 canonical/Frozen 본문을 임의로 다시 쓰지 않는다. WO에 정정 TODO를 유지하며, 이번 회귀 통과를 이 문서 정정 완료로 간주하지 않는다.
