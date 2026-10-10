# CHECK-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1

> 2026-10-10 · WO-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1 · 4-B/4-C 구현·로컬 검증
> DEPLOYMENT = MANUAL/GATED. 실제 OAuth·운영 적용과 mock/격리 검증을 구분한다.

## 구현과 정책

Kakao REST code는 고정 client/secret/callback으로 서버에서만 교환한다. 5분 원장은 token/binding
hash만 저장하며 origin·용도·현재 사용자·browser session·security family를 함께 확인한다.
GET callback은 읽기와 고정 origin redirect만 수행한다. 프런트는 fragment를 즉시 지우고
동일 탭의 pending state와 비교한 뒤 POST로 일회 소비한다. 전체관리자는 실제 Google 인증만 허용한다.

Kakao ID로만 기존 연결을 조회한다. 가입은 이메일·이름·휴대전화·필수 약관을 요구하며,
provider가 소유를 확인한 입력 이메일만 verified로 채택한다. 그 외 O4O 확인 메일을 보내며
세션을 발급하지 않는다. 동일 이메일 충돌은 기존 계정 로그인·명시적 연결로 안내한다.

명시적 연결은 현재 계정 password/기존 provider 재인증 → 별도 target provider 인증 → 사용자
확인 후 저장한다. Google은 challenge nonce와 최근 iat를 요구한다. Kakao 재인증은 prompt=login을
사용한다. Demo 변경·다른 users.id provider 이동·기존 provider 교체를 차단한다. role·membership·
조직 소유권·security family는 변경하지 않는다. 해제·두 users.id 병합은 별도 계획 대상이다.

## 소비처 조사

auth-client/AuthClient, auth-react/useServiceAuth/LoginMethods의 import·리터럴·수정 파일 경로를
전수 조회했다. 현재 로그인 소비처는 Neture modal/가입, Store, KPA Society modal, KPA Branch
login/join이며 Lecture는 기존 Neture service-entry와 handoff를 사용한다. Neture 단일 bundle을
쓰는 supplier/community/funding/pharmacy origin도 동일 공통 컴포넌트를 사용한다. 전체관리자
Kakao UI는 추가하지 않는다. 은퇴 서비스의 코드 존재를 운영 복원 근거로 사용하지 않는다.

계정 설정 소비처는 Neture·KPA Society에 공통 연결 화면을 붙였다. Store/Lecture의 계정센터
경로는 기존 것을 사용한다. raw-source 계약은 `check-literal-consumers.mjs --source <파일>`을
수정 경로별 실행해 조회했다. 기존 retired Google link/legacy password route는 복원하지 않는다.

## 검증 결과

| 검증 | 결과 | 범위/한계 |
|---|---|---|
| review 보정 회귀 | 4 suites / 94 PASS | cross-site cookie 속성·www/legacy origin·기존 로그아웃 범위·실제 PG |
| API Kakao/Google identity·password session focused | 3 suites / 73 PASS | 서명 검증 challenge·고정 callback·외부 오류 비노출 |
| 실제 PG15 social flow/link/signup | 18 PASS | browser binding·TTL·replay·동시 충돌·원자성·로그아웃/password family·Demo·동일 이메일 |
| 최종 수정 후 Kakao identity + 실제 PG | 2 suites / 48 PASS | 신규 서비스 접근 gate 포함 소스 재검증; provider/SMTP/session issuer 일부 mock |
| auth-client | 5 files / 40 PASS | callback fragment·pending tab·proof 직렬화·one-use 401 재시도 없음 |
| auth-react | 14 files / 168 PASS (최신 main 반영 후) | 가입 동의·미인증 이메일 무세션·Demo·재인증/확인 순서 |
| Neture | 47 files / 388 PASS (최신 main 반영 후) | 새로운 returnTo·unsafe redirect 포함 |
| KPA Society | 11 files / 86 PASS (최신 main 반영 후) | 기존 로그인/가입 회귀 |
| KPA Branch | 3 files / 34 PASS | login/join 회귀 |
| API 및 웹 5개 build | PASS | Node22.18·pnpm10.25; 기존 chunk size 경고 |
| Neture/Store/KPA Society/KPA Branch type-check | PASS | 모든 수정 wrapper |
| auth raw-source 계약 | 6 suites / 110 PASS | 새 Kakao config 한 곳만 허용; password 입력 공통 컴포넌트 재사용, legacy 경로 금지 유지 |
| 수정 runtime ESLint | error 0 | 기존 warning 6개, 신규 warning 0 |
| production bundle 가입 UI PC/mobile | 8/8 PASS | provider/API mock, 실제 OAuth 아님; 분회 local preview는 `/kpa/` public base 사용 |
| Neture callback 세션·returnTo | 2/2 PASS | production bundle PC/mobile + mock session, settings 복귀·fragment 제거·1회 소비 |
| 배포 Kakao optional config Bash | 4 PASS | unset fail-closed·partial fail·고정 callback·resource reference·입력 injection 차단 |
| migration contract | 21 PASS / 0 FAIL | C22 21개 incremental 및 정확한 지문 |
| 정식 migration runner | PASS, repeat pending/executed 0 | 별도 빈 격리 PG DB, 전체 baseline+21개 |

격리 DB는 loopback·비운영 포트 55437의 로컬 fixture만 사용했다. 운영 연결값을 받지 않는다.
PG integration은 `O4O_AUTH_SESSION_TEST_PORT=55437`로 Jest를 실행했다. 포트 미지정 시 SKIP이며
기본 CI success를 실제 PG 실행의 증거로 대신하지 않는다. fixture 사용자·flow는 테스트 후 정리한다.

## Migration 21 및 rollback

새 `CreateSocialAuthFlows1791592932097`는 auth_social_flows와 Kakao user당 제약을 추가한다.
`users`, `role_assignments`, `service_memberships`, historical baseline은 수정하지 않는다.

| 상태 | PG15 fingerprint | lines |
|---|---|---|
| 20 | `ee4c646d687460947bbb6f0fe0da6006075d1cbf4f1638c8fed588e554e2c68a` | 6176 |
| 21 | `fbfbdec4d389108b2324d679c154bf9ed5766dac6c4f2d74cfa57186343348f3` | 6199 |

up → down → 기존 20 지문 일치 → up을 확인했다. down은 Kakao identity 또는 유효한 미사용
flow가 있으면 중단하며 identity를 지우거나 다른 사용자로 이동하지 않는다. 운영 적용 후 down이
가능하다고 보장하지 않는다. 우선 이전 image rollback·provider 비활성화로 영향을 제한하고
DB rollback은 현존 identity/flow를 확인한 별도 절차로 판단한다.

## 운영 활성화 순서와 OPEN

1. 후속 PR required CI·review 및 사용자 main 통합 승인.
2. 승인된 main WIF smoke에서 `kakao_metadata=true`: Cloud Run env **이름**과 Secret Manager
   resource **이름**만 조회. 권한 부족·후보 없음·설정 부재를 각각 구분한다. secret version은 읽지 않는다.
3. 기존 Kakao 앱의 REST key, client secret ON, callback
   `https://api.neture.co.kr/api/v1/auth/social/kakao/callback` 등록을 확인한다.
4. GitHub variable `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET_NAME`에 각각 REST key와 기존 Secret
   Manager resource 이름을 연결한다. client secret 값은 GitHub/chat에 넣지 않는다.
5. main Promote → migration21 → API/web revision/traffic 검증. 둘 중 variable 하나만 설정되면
   배포 전에 실패한다. 둘 다 없으면 Kakao client ID를 비워 provider/UI를 비활성화한다.
6. 실제 소유자 Google/Kakao 로그인·가입·이메일 확인·service-entry/handoff·재인증·연결 확인·
   취소·기존 다른 사용자 연결 충돌을 8개 유지 origin의 PC/mobile에서 확인한다.

현재 운영 app/key 존재와 등록 상태는 **미확인**이다. 현재 cloud에 GCP/Kakao binding이 없고
GitHub secret/variable metadata 조회는 403이었다. 부재로 단정하거나 새 앱/secret을 중복 생성하지
않는다. feature branch에서는 main-only WIF 경계를 우회해 metadata workflow를 실행하지 않는다.
실제 Google/Kakao 소유자 인증과 전체관리자 재로그인은 **미실행**이다.

문서 정합: 실행 중 WO/TODO의 로컬 구현과 운영 완료를 구분했다. Identity V3의 과거 카카오 제한과
MYPAGE의 오래된 password UI 서술은 후속 정합 TODO다. Frozen 본문·canonical index 변경 없음.

## 4-A 운영 배포 후 회귀 (2026-10-10)

선행 PR #387 main `7a11f7d2018fae7eb827a066762291298ccb2d87`에 대해
[Promote #38011885470](https://github.com/Renagang21/o4o-platform/actions/runs/38011885470)
SUCCESS, API migration·0% revision smoke·traffic 전환과 전체관리자/웹 5개 배포를 확인했다.
전체관리자 실제 Google 재로그인은 소유자 인증 없이 수행하지 않았다.

Neture/supplier/community/funding/pharmacy/store/study/kpa × PC 1440/mobile 390 × 매장 경영자/공급자
**32/32 PASS**. 로그인 화면의 실제 Demo 버튼 → email login 200 → me 200 → admin 403
ROLE_REQUIRED → 화면 로그아웃 200 → 기존 access/refresh 401을 확인했다. Neture의 매장 Demo는
Store Workspace 홈으로 실제 handoff·대상 세션 저장, 공급자 Demo는 supplier dashboard 이동을
PC/mobile 모두 확인했다. Neture/Study 8건에서는 추가로 Demo password canManage=false,
매장 경영자 pharmacy store context 200 / supplier products 403 NO_SUPPLIER, 공급자 반대
products 200 / store context 403 STORE_OWNER_REQUIRED을 확인했다.

최초 harness 실패 8건은 Neture menuitem 버튼 선택과 Study full-page reload 전에 응답 body를
읽는 방식 때문이었다. Neture 실제 button 선택, upstream 응답을 fulfill 전에 메모리로 캡처하는
방식으로 수정해 해당 사례만 재검증했다. Neture handoff 목적지는 `/store/…`가 아닌 실제 공통
Store Workspace `/`를 확인했다. 실패를 운영 성공으로 간주하지 않고 수정 후 결과로 대체했다.
추가 session isolation 1건에서는 Neture 로그아웃 후 Store 세션 me 200 유지와 source access/refresh 401을 확인하고 각 테스트 세션만 정리했다.
TLS는 route.fetch의 기본 검증을 사용했고 전역 인증서 저장소 변경·TLS 검증 해제는 하지 않았다.

PR #387의 필수 CI Gate·CodeQL·통합 후 CI는 PASS다. 비필수 SonarCloud 중복률 3.4% 실패는
OPEN이다. expected-schema-states의 선언형 registry는 C22 계약을 유지했으며 exclusions 설정이
실제 외부 분석에 적용됐다고 주장하지 않는다. 후속 #392의 실제 CI/review 상태는 PR에서 확인한다.

## PR #392 review 보정

Codex의 P2 두 건(www/legacy origin)을 확인해 수정했다. binding cookie는 기존 production
credential cookie와 동일하게 HttpOnly·Secure·SameSite=None을 사용하고 API host-only/path scope를
유지한다. JSON·CORS·state·origin·browser binding 검증을 유지하며 secret을 JS에 노출하지 않는다.
`resolveSessionServiceKey`는 catalog의 기존 서비스/legacy domain에 한해 www alias를 정규화한다.
admin/workspace 특별 호스트는 정확한 호스트만 허용한다. 로그인·link·로그아웃 판정이 같은 함수를
사용하므로 별도 소셜 전용 scope를 만들지 않는다. 4 suites 94 PASS, 해당 runtime lint error/warning 0.
배포 config 시험 4건도 기존 blocking node:test CI 단계에 연결했다 (관련 workflow 회귀 109 PASS).
브라우저 자체의 third-party cookie 차단 설정은 별개이며 실제 OAuth/device 검증은 OPEN이다.
