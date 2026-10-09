# CHECK-O4O-AUTH-REFACTOR-PHASE2-V1

> **작성일**: 2026-10-09 · **상태**: PR 검증 자료 · 운영 미적용
> **작업**: [WO-O4O-AUTH-REFACTOR-V1](../work-orders/WO-O4O-AUTH-REFACTOR-V1.md) 단계 2
> **PR**: [#378](https://github.com/Renagang21/o4o-platform/pull/378) — CI/review 현황은 PR의 최신 HEAD 기준
> **branch**: `wo/auth-refactor-phase2` · **개발 기준 main**: `240a2dfd42f606f0067a5d290ed23c2ba514fece` · **승인 후 통합 기준 main**: `f1d86f4f21e97a7f5fd5f888b8524f9a3891a7f1`

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
