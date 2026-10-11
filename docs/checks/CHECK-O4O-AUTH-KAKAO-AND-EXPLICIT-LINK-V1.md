# CHECK-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1

> 2026-10-10 · WO-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1 · 4-B/4-C 구현·로컬/운영 검증
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

기존 운영 app/key 존재와 등록 상태는 **미확인**이다. 초기 cloud에는 GCP/Kakao binding이 없고
GitHub secret/variable metadata 조회는 403이었다. 이후 승인된 main WIF에서 실제 metadata를
조회한 결과와 운영 배포·회귀는 아래 PR #392 기록을 따른다. 권한 부족을 부재로 단정하거나
새 앱/secret을 중복 생성하지 않는다. 실제 Google/Kakao 소유자 인증과 전체관리자 재로그인은
**미실행**이며, Demo·mock 검증을 실제 외부 OAuth의 증거로 사용하지 않는다.

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

공유 resolver의 raw-source 소비처도 재검증했다. Lecture origin 계약은 로컬 변수 이름 대신
study→lecture / neture→neture / 위조 suffix→null의 실제 판정을 확인하며 substring 매칭 금지는
유지한다. 해당 7건과 deploy-risk 36건 PASS. 실제 Chromium 쿠키 정책 synthetic 시험에서는
cross-site Lax binding 미전달 / Secure None 전달을 확인했다. 외부 OAuth나 운영 키를 사용한
시험이 아니다. 최신 main을 반영한 모든 웹 bundle의 가입 UI 8/8, Neture 세션/returnTo 2/2를
재확인했다.


## PR #392 운영 통합·배포·회귀 (2026-10-10)

사용자의 명시적 승인 후 [PR #392](https://github.com/Renagang21/o4o-platform/pull/392)를
main `26b98a33c182e5de9f9e6df2ce9a6a6fb5696bc4`에 merge했다. 최신 main `3364d0837a`를
공개 작업 branch에 merge한 exact head `0535183bc2`에서 required CI Gate·API Jest 3개·웹/전체관리자
build·Code Quality·CodeQL·Sonar PASS, 기존 Codex 두 finding 수정 및 미해결 thread 0을 확인했다.
로컬 추가 회귀는 Kakao identity/logout 54건, 최신 main 업무/커뮤니티 46건, Neture 395건,
격리 PG15 social flow/link/signup 18건 PASS다. PG를 지정하지 않은 첫 재실행은 SKIP이었고,
그 뒤 포트 55437의 실제 격리 DB로 18건을 실행·정리하고 DB를 중지했다.

| 운영 확인 | 결과 | 근거/한계 |
|---|---|---|
| post-merge CI Pipeline | SUCCESS | [#38019181483](https://github.com/Renagang21/o4o-platform/actions/runs/38019181483), CI Gate·CodeQL PASS |
| post-merge main Sonar (비필수) | FAIL / OPEN | hotspot 76건, new-code 중복률 14.2%, 신뢰성/보안 등급 E; PR 분석 PASS와 구분 |
| Delivery 위험도 판정 | HELD_LEVEL_3 | migration/인증 변경의 자동 배포 차단 유지 |
| 사용자 승인 Promote | SUCCESS | [#38019828704](https://github.com/Renagang21/o4o-platform/actions/runs/38019828704), 승인된 정확한 main SHA |
| API | SUCCESS | migration 21 포함 승인 이미지의 정식 migration Job, traffic 0% revision smoke, traffic 전환·전환 후 검증; readiness HTTP 200 |
| 전체관리자 + 웹 5개 | SUCCESS | 선택된 deploy job 7개 전체 SUCCESS; 선택하지 않은 deploy job 25개는 SKIPPED |
| 최종 serving SHA / production status | DEPLOYED | api/admin/neture/kpa-society/lecture/store/kpa-branch 모두 확인 |
| 유지 8개 origin Demo PC/mobile | 32/32 PASS | 실제 로그인 화면 버튼; 실제 upstream HTTP, provider/API mock 없음 |
| 신규 social accounts Demo 경계 | 32/32 PASS | HTTP 200 / canManage=false; 계정 연결·수단 변경 실행 없음 |
| Demo 실제 소셜 변경 진입 차단 | 2/2 PASS | Neture 두 역할에서 잘못된 임의 password로 재인증 요청 → 403 DEMO_ACCOUNT_FORBIDDEN; 연결 권한 발급/비밀번호 변경 없음 |
| 신규 설정 UI·Kakao 비활성 UI | 2/2 PASS | Neture 실제 설정 화면의 Demo 변경 불가 안내와 Kakao 버튼 미노출 확인 |
| 약국 업무·공급자 업무 | 16 + 16 PASS | 매장 경영자: store context 200 / supplier products 403 NO_SUPPLIER; 공급자: supplier products 200 / store context 403 STORE_OWNER_REQUIRED |
| 전체관리자·비밀번호 경계 | 32/32 PASS | Demo admin 403 ROLE_REQUIRED, password canManage=false |
| UI 로그아웃과 보안 폐기 | 32/32 PASS | logout 200 후 이전 access/refresh 모두 401; Neture 매장 Demo 두 viewport에서 Store 세션은 200 유지 |
| Kakao public config | 8/8 HTTP 200 | 현재 enabled=false; 실제 Kakao 활성화/성공을 뜻하지 않음 |
| 비인증 social accounts | HTTP 401 AUTH_REQUIRED | 신규 보호 route 운영 등록 확인 |

브라우저는 PC 1440×900/mobile 390×844, Neture/supplier/community/funding/pharmacy/store/study/kpa,
매장 경영자·공급자 조합이다. 실제 Chromium의 TLS 검증을 끄지 않고 정상 CA/proxy를 사용하는
route.fetch 응답을 화면에 전달했다. 로그인 응답은 navigation 전에 메모리에서만 보관하며,
검증에서 만든 세션만 정리했다. 계정 정보·토큰·응답 원문은 공개 기록에 넣지 않는다.
이 32건은 Demo 로그인·handoff·역할·소셜 상태·로그아웃 회귀이며 모든 업무 기능이나 실제
Google/Kakao OAuth를 완료했다는 판정이 아니다. 별도 Pharmacy-Hub UI를 유지 서비스로 복원하지 않았다.

### 기존 Kakao 설정 조사와 남은 조건

main [WIF metadata smoke #38019189395](https://github.com/Renagang21/o4o-platform/actions/runs/38019189395)는
GCP 인증·Cloud Run 조회 PASS, Kakao metadata 단계 FAIL이다. 당시 API revision에는
KAKAO_CLIENT_ID/KAKAO_CLIENT_SECRET/KAKAO_REDIRECT_URI 이름이 없었고, Secret Manager 목록은
`secretmanager.secrets.list` 권한 부족으로 조회하지 못했다. 기존 리소스/앱 부재로 판정하지 않는다.
운영 배포 후 공개 config도 8개 origin에서 enabled=false다. 비밀값·secret version 접근이나
IAM 변경·새 앱/secret 생성은 수행하지 않았다.

사용자에게 metadata 조회 역할 `roles/secretmanager.viewer` 추가 경로를 안내했다. 권한 추가의
완료 확인 후 같은 read-only 조회를 재실행한다. 이후 기존 앱의 REST ID/client secret ON/고정
callback 등록, GitHub KAKAO_CLIENT_ID 및 Secret Manager resource 이름 binding을 확인해야 한다.
실제 로그인·가입·이메일 확인·handoff·Google/Kakao 현재 계정 재인증·최종 명시적 연결과
취소/충돌, 전체관리자 실제 Google 재로그인은 OPEN이다.

### main Sonar 분석 OPEN

통합 후 별도 main Sonar check `114122064212`의 Quality Gate 실패를 확인했다.
표시 조건은 Security Hotspots 76건, new-code 중복률 14.2%(기준 3%), 신뢰성·보안 등급 E다.
이는 exact-head PR 분석 PASS와 별개의 main 분석이다. hotspot 수를 확정 취약점 수로
해석하거나 이번 인증 변경/기존 코드에 귀속시키지 않는다. 적용 직전 실제 ruleset의 필수 검사는
CI Gate이고, 정식 CI·CodeQL·verified production 배포·운영 회귀는 위 결과대로 통과했다.

상세 이슈·hotspot·분석 revision을 확인하기 위해 공개 Sonar API 조회를 시도했으나 현재
`sonarcloud.io` proxy tunnel 403이다. 기존 설정을 보존하고 이 정확한 도메인을 환경 초안에
추가했다. 초안 저장 후에도 실제 조회는 403이므로 상세 원인·인증 변경 영향은 미확인이다.
접근 반영 후 범위를 조사해야 하며 분석 설정/규칙을 완화하거나 무관한 코드를 수정하지 않았다.

상세 로그 조회의 초기 proxy 403은 exact storage host를 초안에 추가한 뒤 실제 HTTP 200으로
재확인했다. setup 초안에는 두 log storage host와 TLS 검증을 유지하는 시작 안내를 저장했다.
초안 저장·실제 HTTP 접근·환경 게시 여부는 서로 다른 관측이다. 게시 완료로 단정하지 않는다.

문서 정합: 상위 WO와 4-B/4-C TODO의 main/배포 미실행 설명을 실제 결과로 정정했다.
운영 코드 배포, Kakao 설정 활성화, 실제 외부 OAuth 완료를 각각 구분하고 기존 OPEN을 유지한다.

### 후속 환경·조회 재확인 (2026-10-10)

동일 WO의 준비된 격리 checkout과 도구가 복원됐다. 실행 환경 revision 12의 현재 설정에는
앞서 추가한 두 로그 저장소 도메인과 `sonarcloud.io`가 포함돼 있고, 설정 읽기의 draft는
없는 상태였다. network 관측은 `unknown`이므로 정책 적용을 `enforced`로 단정하지 않는다.
Neture 홈과 API Kakao config의 HTTPS 요청은 HTTP 200으로 확인했다.

Sonar dashboard와 공개 API는 이번 조회에서 proxy tunnel 오류 대신 원격 HTTP 403의
HTML 오류 응답을 반환했다. 이전 tunnel 403과 구분하며 도메인 추가만으로 상세 분석이
가능해졌다고 판단하지 않는다. main 분석의 구체적인 인증 변경 영향은 계속 OPEN이다.

main WIF metadata 재조회 [#38024302858](https://github.com/Renagang21/o4o-platform/actions/runs/38024302858)는
GCP 인증·project/Cloud Run 조회 SUCCESS, Kakao metadata 단계 FAIL이다. 상세 로그의
redirect host `productionresultssa14.blob.core.windows.net`는 proxy tunnel 403으로 차단돼
이번 실패의 세부 이유는 아직 미확인이다. 이전에 확인한 목록 조회 권한 거절과 동일 원인으로
단정하지 않으며, 리소스 부재·IAM 권한 추가 완료도 주장하지 않는다. 기존 설정을 보존하고
해당 host만 새 환경 초안에 추가했다. 저장은 확인했으나 새 초안의 게시·접근 반영은 미확인이다.

PR #396 통합 준비에서 최신 main `b9f0a920cb`를 동일 WO 브랜치에 merge해 기존 커뮤니티
변경을 보존했다. main 대비 변경은 CHECK·WO 세 문서뿐이며 이 기록의 Delivery 분류는
문서 전용 `NOT_APPLICABLE`이다. Kakao 활성화를 위한 새 운영 배포와 실제 소유자 OAuth
검증은 별도이며, PR #392의 기존 운영 배포 결과를 후속 main 전체의 배포로 확장하지 않는다.

## 운영 Kakao 설정 활성화 및 문자 검사 오류 (2026-10-10)

사용자 화면에서 고정 callback 등록·GitHub 변수 이름·Secret Manager resource와 runtime의
secret-level 접근자 저장을 확인했다. WIF metadata #38028872708 SUCCESS의 상세 로그에서
예정 resource 존재를 확인했으며 값·version은 읽지 않았다. API-only verified 설정 배포
[#38029009245](https://github.com/Renagang21/o4o-platform/actions/runs/38029009245)는
main 포함 SHA `2a92ce24cf227694df46bde9a5b5a0f7668137d1`의 고정 deploy tag로 실행했다.
CI gate, 정식 migration Job, revision readiness, traffic 전환, 전환 후 health step 모두 SUCCESS다.
admin/web 배포와 force_deploy는 실행하지 않았다. 배포 job 상세 로그의 새 storage host는
proxy 차단으로 미조회이며 단계 결과와 공개 API 응답을 근거로 판정했다.

| 운영 확인 | 결과 | 한계 |
|---|---|---|
| `/health/ready` | HTTP 200 | 전환 후 공개 LB 경로 |
| Kakao config | 유지 8개 origin HTTP 200 / enabled=true; 전체관리자 enabled=false | 구성 활성화이며 Client Secret의 provider 교환 성공은 아님 |
| 비인증 social accounts | HTTP 401 | 인증 우회 없음 |
| 실제 Demo UI | PC/mobile × 8 origin × 두 역할 32/32 PASS | TLS 검증된 실제 요청; credentials/tokens 출력 없음 |
| 역할·logout | 매장 경영자 context 16/16 HTTP 200, 공급자 products 16/16 HTTP 200; 반대 역할 403; logout access/refresh 32/32 HTTP 401 | 별도로 생성한 Store 세션 유지 후 테스트 생성 세션만 정리 |
| Neture Demo 변경 거절 | 두 역할 2/2 PASS | 소셜 수단 canManage=false·재인증 변경 금지·설정 안내 |
| Kakao 시작 UI | Neture·Lecture 계정센터 × PC/mobile 4/4 HTTP 200; provider authorize 302 → accounts.kakao.com | 소유자 로그인·신규 가입·code 교환 완료를 뜻하지 않음 |
| 취소 callback 브라우저 복귀 | OPEN | 최초 4건 중 1건 HTTP 400/3건 transport failure; 직접 요청 진단은 303. 원인과 실제 브라우저 완료 미확정 |

첫 Demo harness가 Lecture 화면에 자체 카카오 버튼을 기대해 4건 timeout을 냈다.
코드·문서의 계정센터 진입 계약으로 검사 조건을 정정하고 Lecture 4/4 재실행했다.
다른 7개 서비스 28/28과 합쳐 중복 없는 32건의 실제 로그인·역할·logout 결과를 확인했다.
이를 실제 OAuth 전체 통과로 확장하지 않는다.

사용자 실제 가입 시도에서 `Invalid request / Your request contains invalid characters`가
보고됐다. 합성 callback code의 영숫자 입력은 HTTP 401 SOCIAL_FLOW_INVALID, `--` 포함
입력은 flow 검증 전에 HTTP 400 문자 오류로 재현했다. 사용자가 알려준 오류 주소에서 고정 callback 경로와 code의 `--` 문자 유형을 확인해
동일 원인을 확정했다. 실제 code/state 값은 파일·로그·문서에 저장하지 않았다. 카카오
동의 이후 callback 차단이며 O4O 계정 생성 성공을 뜻하지 않는다.

`securityMiddleware.ts`는 등록된 GET Kakao callback의 query code/state와 지정된 POST
소셜 proof·signup·link route의 body token/code/idToken만 형식·길이가 맞을 때 SQL 문자
휴리스틱에서 제외한다. 원본 입력은 그대로 전달한다. flow는 hash·parameter binding,
provider code는 URL-encoded 전송, ID token은 서명 검증으로 처리한다. origin·purpose·
cookie binding·expiry·일회성·provider ownership 검증과 다른 필드·경로의 검사는 유지한다.
retired Passport 경로 예외는 복구하지 않았다.

운영 bootstrap의 security-before-body-parser 순서는 변경하지 않았다. GET query는 그 순서로도
검증했으며 POST body 사례는 parser가 앞선 조립에서도 같은 opaque 계약을 유지하는 회귀다.
최초 middleware 행동 회귀 24건은 수정 전 11 FAIL/13 PASS였다. 운영 parser 순서의
입력 보존 사례를 추가한 최종 25건은 수정 후 25/25 PASS다. 기존 로그
redaction·Kakao identity와 합쳐 3 suites/79 PASS, API type-check·대상 lint·API build PASS.
이는 로컬 수정 결과이며 운영 오류 해결 완료가 아니다. 수정 PR의 CI/review·main 승인·
배포 후 실제 가입·취소·명시적 연결을 재검증한다. 개인정보 처리방침 표시 및 이전 내용은
사용자가 요청한 후속 조사·수정 TODO로 남겼다.

## 2026-10-10 PR #401 통합·API 배포 및 홈 버튼 후속

PR #401은 사용자 승인 후 main `73cd907d20`에 통합했다. post-merge CI #38034473790 및
CodeQL #38034473752 PASS. Delivery #38035024444는 API LEVEL_3로 배포 보류했고,
정상 통제 경로 Promote #38035112556를 같은 SHA·services=api로 실행해 SUCCESS다.
정식 migration Job·revision readiness·traffic 전환·전환 후 health·serving SHA report PASS,
production status는 DEPLOYED/api다. 웹/전체관리자는 SKIPPED, force/break-glass 태그/새 schema/IAM 변경 없음.

운영 API 17/17 PASS: 합성 `--`/`sp_`/`xp_` code와 `--` state는 문자 오탐 400 대신
401 SOCIAL_FLOW_INVALID로 거부됐다. 무관한 필드의 SQL은 400 차단 유지. 유지 8 origin
enabled=true/전체관리자 false. 실제 Demo PC/mobile × 8 origin × 두 역할 32/32 PASS,
매장 경영자 context 16/16 200·공급자 products 16/16 200·반대 역할/전체관리자 403,
logout 후 access/refresh 32/32 401, 별도 Store session 유지 2건 200. Demo 변경 차단 2/2 PASS.
실제 UI start/provider 302/callback 취소 303 뒤 복귀 주소를 UI에서 수동 따라가기 4/4 PASS.
native API 브라우저 탐색과 실제 외부 소유자 가입/로그인/연결 완료는 계속 OPEN이다.

사용자가 이후 홈 로그인 창에서 카카오 버튼 미노출을 제보했다. origin은 `https://neture.co.kr/`다.
새 브라우저의 홈 modal와 `/login` × PC/mobile 4/4는 config 200/enabled=true/버튼 visible이었다.
사용자 브라우저의 실제 요청 실패나 오래된 bundle은 확인하지 않았으므로 원인을 단정하지 않는다.
클라우드 Google script load 실패를 실제 사용자 Google 장애나 성공으로 계산하지 않는다.

### Shared Module Change Verification — Kakao config 복구

변경 모듈: `packages/auth-react/src/KakaoContinue.tsx`. config 조회 실패 catch가 오류를
표시하지 않고 초기 enabled=false를 유지하며 지연 중에도 컴포넌트가 비어 있던 결함이다.
조회 중 상태, 10초 응답 제한, 실패/잘못된 응답 안내, 사용자가 누르는 읽기 전용 재시도를 추가한다.
서버가 명시적으로 enabled=false라고 답한 경우의 버튼 숨김과 실제 provider/flow 검증은 유지한다.
늦은 이전 조회 결과는 새 조회 상태를 덮어쓰지 않고 unmount 시 timer를 해제한다.

| 소비처 | 사용/영향 | route·role·capability 영향 | 검증 |
|---|---|---|---|
| Neture·supplier·community·funding | 같은 Neture bundle의 modal 및 `/login`, 직접 사용 | origin/returnTo 보존, 정책/권한 변경 없음 | Neture 홈 modal PC/mobile fixture·모달 회귀·type-check/build PASS |
| Store | LoginMethods를 통해 사용 | 로그인 route/returnTo·role 변경 없음 | PC/mobile fixture·type-check/build PASS |
| Pharmacy (KPA Society) | LoginMethods를 통해 사용 | origin·role 변경 없음 | 전체 frontend type-check PASS, 웹 배포 후 smoke 대기 |
| KPA Branch | LoginMethods 로그인·join 사용 | route·role 변경 없음 | 전체 frontend type-check PASS, 웹 배포 후 smoke 대기 |
| Lecture/Study | 자체 KakaoContinue 사용 없음, Neture 계정센터 경유 | gateway 보존 | symbol/route 검색·전체 frontend type-check PASS |
| 전체관리자·그 밖의 auth-react 사용 앱 | KakaoContinue runtime 사용 없음 | Google 전용/기존 인가 보존 | import·symbol·path 검색, 전체 frontend type-check PASS |
| 삭제 대상 Pharmacy-Hub/K-Cosmetics | 복구 없음 | 은퇴 계약 보존 | 신규 경로/사용처 추가 없음 |

raw-source 파일 경로 검사와 symbol/label/endpoint 검색을 함께 수행했다. 기존 UI tests가 실제
소비처이며 새 config 회귀를 추가했다. 변경 전 새 5건은 4 FAIL/1 PASS; 변경 후 새 6/6 및
auth-react 전체 15 files/174 PASS. Neture modal 2 files/13 PASS, frontend type-check 및
대상 ESLint PASS. Neture·Store 실제 build PASS(기존 chunk size 경고).

로컬 실제 UI + 합성 read-only config 장애 주입은 Neture 홈 modal/Store LoginMethods ×
PC/mobile × 실패 재시도/지연 재시도/명시적 미설정 12/12 PASS, 인증 쓰기 요청 0이다.
첫 browser harness는 개발 StrictMode의 두 초기 조회 중 하나만 실패시켜 검사 조건이 맞지
않았다. 초기 조회 전체에 장애를 주고 사용자 재시도 이후만 정상 응답하도록 정정했다.
이는 초기 실패를 숨기는 assertion 완화가 아니라 fault 주입 시점 정정이며, timeout·복구 및
미설정 숨김 단언은 유지했다. Store package 필터도 실제 이름 `store-web`으로 실행해 build를 확인했다.

위 결과는 로컬 UI 변경 검증이다. 새 PR 통합·웹 배포, 사용자 화면 원인 확인 및 실제
소유자 OAuth는 대기한다. API 수정 배포를 웹 복구 배포로 혼동하지 않는다. 개인정보 처리방침
가독성·이전 내용은 후속 TODO로 유지한다.

사용자는 로그인 창을 닫고 새로고침한 뒤 "이제 버튼이 보임"이라고 확인했다. 새 UI 수정은
아직 미배포이므로 이 관측을 새 코드의 운영 효과나 캐시 원인 확정으로 계산하지 않는다.
사용자 화면의 버튼 가시성은 확인됐고, 새로 시작하는 실제 OAuth 가입/로그인 결과는 대기한다.

## 2026-10-10 PR #403 통합·웹 배포 후 검증

사용자 승인 후 PR #403을 main `82742b84e8`에 통합했다. post-merge CI #38039051314 및
CodeQL #38039051297 SUCCESS, required CI Gate PASS다. Delivery #38039592334는 LEVEL_3로
보류했고 정상 Promote #38039708401을 동일 SHA로 실행해 SUCCESS다. 전체관리자와 웹
Neture·KPA Society·Lecture·Store·KPA Branch의 build/push·새 revision 검증·traffic 전환·
전환 후 serving SHA report가 통과했다. production status는 위 6개 대상 DEPLOYED다.
API 배포·migration·schema·키/IAM 변경·force/break-glass는 실행하지 않았다.

| 배포 후 검증 | 결과 | 검증 경계 |
|---|---|---|
| 유지 8개 origin × PC/mobile 화면 진입 | 16/16 PASS | 카카오 config 200/true; Lecture는 Neture 계정센터 진입 링크, 다른 7곳은 버튼 가시성 |
| Neture 홈 modal·Store × PC/mobile × config 실패/지연/명시적 미설정 | 12/12 PASS | 읽기 전용 조회에 합성 장애 주입, 재시도는 실제 운영 200/true로 복구; 명시적 false는 숨김; 인증 쓰기 0 |
| 공개 API/전체관리자 진입 | 12/12 PASS | 유지 8 origin config true·전체관리자 false, ready 200·비인증 계정 조회 401·전체관리자 로그인 화면 200 |
| 유지 8개 origin × PC/mobile × 두 역할 Demo UI | 32/32 PASS | 실제 공개 Demo 버튼으로 로그인·Neture 목적지 이동 및 각 서비스 세션 확인 |
| 업무 역할·세션 폐기 | 매장 경영자 context 16/16 200·공급자 products 16/16 200; 반대 역할/전체관리자 403; logout 후 access/refresh 32/32 401 | Demo 소셜/비밀번호 변경 불가, 별도 Store 세션 유지 2건 200; 테스트가 만든 세션만 정리 |

화면 16건과 config 장애 12건의 합계가 28/28이며 Demo 32건과 별개다. 브라우저 요청은
정상 TLS 검증을 수행하는 `route.fetch`로 운영 upstream에 전달했다. 인증서 검증 우회 없음.
합성 config 장애는 실제 운영 장애나 소유자 OAuth 성공으로 계산하지 않는다. GitHub artifact
다운로드 redirect는 proxy 403으로 미조회이며 workflow jobs/steps와 commit status를 배포 근거로 썼다.
검증 중 이후 main에 통합된 별도 운영자 진입 변경은 이번 배포 SHA/검증 결과에 포함하지 않는다.

### 실제 소유자 가입 화면·약관 후속

사용자는 카카오 인증 후 추가 정보를 입력하고 적용했을 때 이용약관 화면으로 이동했다고
보고했다. 단순 약관 링크 클릭으로 가정하지 않는다. canonical 가입 정책·UI/DTO/backend는
최초 가입에 이메일·이름·개인 모바일을 요구하며 별도 ID/비밀번호 생성과 SMS 본인 인증은 없다.
이 필수 항목 계약은 PR #403에서 바꾸지 않았다.

코드의 signup submit은 기본 동작을 막고 API를 호출하며 응답은 session 또는 verify-email이다.
가입 API에 `/terms` redirect는 없다. LoginModal의 저장된 returnUrl 복귀와 별도
`pendingPolicyAcceptances` 경로를 조사했다. Neture의 `TermsAcceptanceGate`는 공통
`PolicyAcceptanceGate`(`@o4o/shared-space-ui`)를 조립하는 실제 wrapper다.

**P1 구현 blocker — 신규 카카오 가입의 버전별 약관 승낙 누락**: ACTIVE
[통합약관 정본](../baseline/O4O-INTEGRATED-TERMS-OF-SERVICE-V1.0.md)의 버전 추적 계약과
[가입 정렬 WO §9–10](../work-orders/WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1.md#9-신규-회원가입)은
현재 published 문서 ID/version 검증 및 가입과 원자적인 acceptance 저장을 요구한다.
그러나 `KakaoContinue`/`KakaoSignupRequest`/`SocialSignupDto`에는 해당 입력이 없고
`KakaoAuthService.signup` transaction은 `tosAcceptedAt`만 기록하며
`user_policy_acceptances`를 저장하지 않는다. 이는 코드로 확인된 canonical 위반이며
단순 미확정 조사 후보가 아니다. 서비스 membership이 있고 해당 승낙이 없으면 재동의
gate의 대상이 될 수 있다. 실제 사용자 membership/pending 상태를 조회하지 않았으므로
이 결함이 제보된 `/terms` 화면 이동의 직접 원인인지는 별도로 확인해야 한다.
가입 입력/버튼 표시와 checkbox label 내부 약관 링크도 수정안 대상이다.

- [ ] P1: 공통 카카오 가입 UI/client/DTO/API에 published 문서 ID/version을 전달·서버 재검증하고, user/provider 생성과 동일 transaction에서 acceptance 저장. 누락/이전 버전·게시 변경·저장 실패 rollback 및 가입 후 gate 회귀 검증; 가입이 서비스 membership/권한을 자동 생성하지 않는 현행 계약 유지.
- [ ] 동일 이메일/Google 가입 소비처의 published 약관 승낙 계약 누락도 전수 조사하고 같은 기준으로 수정 범위 확정.
- [ ] 추가 정보 제출·로그인·가입 완료 후 목적지와 약관 요구를 코드/브라우저로 재현하고 수정.
- [ ] 가입 입력/버튼 가독성, 별도 약관 내용 보기 및 동의, 입력 상태 보존을 검토·구현.
- [ ] 공개 약관·개인정보 처리방침 version 1의 은퇴 서비스 명칭과 리팩터링 이전 내용을 현행 서비스 기준으로 정리하고 사용자 검토 후 새 정책 버전 게시.
- [ ] 실제 소유자 Google/Kakao 가입·로그인·명시적 연결·취소·충돌 PC/mobile 검증.

정책 본문/버전은 이번에 수정·게시하지 않았다. 실제 소유자 가입/계정 연결 완료와 약관
반복 문제는 OPEN이다. 전체관리자 Google 전용 및 동일 이메일 자동 병합 금지는 유지한다.

## 2026-10-10 signup 약관 원자 저장 및 공통 UI 검증

기준 main `3d10c6a907`을 자기 branch에 반영한 동일 WO 연속 Phase다. PR #407의 기록 범위를
카카오·이메일·Google 공개 가입 수정까지 확장한다. DEPLOYMENT = MANUAL/GATED.

### 계약과 소비처

`GET /auth/signup/terms`는 no-store 공개 읽기이며 서버가 origin catalog에서 적용 약관을 결정한다.
카카오는 서버에 바인딩된 signup flow의 service_key를 사용한다. 요청 body의 serviceKey/userId/roles는
DTO에서 거부한다. 현재 published terms ID/version을 재검증하고 기존 acceptance service가 본문 hash를
계산해 계정/provider/password와 같은 transaction에 기록한다. row lock은 commit까지 유지한다.
일회 카카오 grant도 실패 시 소비되지 않는다. 역할/membership/조직 자동 생성은 추가하지 않았다.
operator 초대의 별도 `createGoogleUser` 및 전체관리자 Google-only 계약은 공개 가입으로 전환하지 않았다.

| 소비처 | 적용/확인 |
|---|---|
| auth-client / auth-react GoogleContinue·KakaoContinue·EmailSignupForm | 약관 조회·ID/version 전달 및 공통 SignupTermsAgreement; 모듈/경로/리터럴 census, React/client 회귀 |
| Neture 홈 modal·계정센터 EmailAuthPages | 실제 client loader 주입; PC/mobile 로컬 웹 번들 확인 |
| Supplier / Community / Funding | Neture 공통 bundle/계정센터 소비; 공통 코드 적용 |
| Store LoginMethods | 실제 client loader 주입; PC/mobile 로컬 웹 번들 확인 |
| KPA Society LoginModal | Society 약관 선택·loader 주입; frontend 타입 및 origin 단위 검증 |
| KPA Branch LoginPage / JoinPage | 계정센터 약관 선택·loader 주입; frontend 타입 및 origin 단위 검증 |
| Lecture/Study gateway | 기존 Neture 계정센터 사용; 자체 소셜 가입 UI 추가 없음 |
| 전체관리자 및 operator invite | 공개 signup 대상 아님; Google-only 및 초대 생성 경로 유지 |
| 은퇴 K-Cosmetics / Pharmacy-Hub | 재활성화 없음; 신규 공개 가입 origin 거부 |

공통 UI는 약관을 못 읽으면 동의/제출을 차단한다. 10초 제한·명시적 read-only retry·늦은 응답/unmount
무효화를 적용한다. 내용 보기 링크는 동의 label 밖에서 새 창을 연다. stale policy 응답에는 약관을 다시
읽고 재동의해야 하며 이름/연락처 입력을 유지한다. 공개 정책 본문/버전은 수정하지 않았다.

### 로컬 결과

- API 관련 기존 unit/DTO 127 PASS + signup policy 33 PASS(실제 격리 PostgreSQL 15 포함) + 기존 social integration 18 PASS = 서로 다른 테스트 178 PASS. provider proof/token/mail은 fixture/mock이며 운영 인증이 아니다.
- 실제 PostgreSQL에서 각 세 가입의 문서/version/hash, membership/role 생성 0, 누락/불일치/타 서비스/게시 변경/acceptance DB 오류에 따른 전체 rollback 검증. 저장 acceptance에 대한 순수 pending 판정까지 확인했으며 운영 사용자 gate 상태 조회는 미실행.
- auth-react 16 files/182 PASS; auth-client 5 files/40 PASS. 조회 실패/retry/timeout/늦은 응답/재동의 및 기존 인증 회귀 포함.
- 전체 frontend 및 API type-check PASS; API/Neture/Store production build PASS; 대상 lint 0 errors(기존 auth-client unused 경고 2건).
- Neture/Store production build × PC/mobile × 정상/조회 실패 후 retry/stale version 12/12 PASS. 합성 provider/API; version 재전달·입력 보존·이메일 확인 안내·제출 전후 같은 페이지 유지 확인.
- 최초 브라우저 harness는 Neture `/login` 진입이 홈 modal로 정규화되는 기존 동작을 무시하고 `/login`을 고정 기대해 Neture 6건 FAIL이었다. 가입 form이 열린 현재 경로와 제출 후 경로를 비교하도록 정정 후 12/12 PASS; 약관 이동 장애 재현으로 계산하지 않는다.
- 기존 social integration용 최소 fixture schema가 linked_accounts 시각 컬럼/FK cascade를 누락해 2 FAIL/16 PASS, 보완 중 1 FAIL/17 PASS였다. 전용 로컬 fixture만 보완 후 18/18 PASS; 운영 schema 및 migration 변경 없음.

### 배포 및 OPEN

기존 웹은 termsPolicy를 보내지 않으므로 API 변경을 독립 완료로 보지 않는다. main 승인 후 API 및
해당 공통 웹 bundle을 연속 배포하고, 이전 웹의 가입 차단/새 웹의 약관 조회/가입을 재확인해야 한다.
조회나 버전 검증 실패를 과거 tosAcceptedAt만으로 허용하지 않는다. 새 DB migration은 없다.

실제 소유자의 추가 정보 제출 후 이동 원인은 운영 사용자/session 상태를 조회하지 않아 미확정이다.
원자 저장 결함 수정과 합성 화면의 성공을 실제 Google/Kakao 가입·로그인·연결·취소 성공으로
확장하지 않는다. 유지 8개 운영 PC/mobile 회귀, 실제 OAuth, 승인된 새 정책 본문 게시는 OPEN이다.

### 최신 구현 리뷰 후 공유 타입 보완

Codex가 `1c8670214d`에서 P2로 공개 가입의 termsPolicy 및 getSignupTerms loader가 선택형인
타입 계약을 지적했다. 서버 DTO는 이미 필수였으므로 공유 client/React 가입 타입과 Google/Kakao/
Email 가입 loader도 필수로 맞췄다. React의 약관 참조는 client의 SignupTermsReference를 재사용한다.
모든 실제 서비스 loader는 이미 연결되어 있으며 해당 공통 mock/요청 fixture도 새 계약에 맞췄다.

직접 TypeScript compiler fixture에서 완전한 세 가입 요청 및 loader는 오류 0으로 컴파일됐다.
참조/loader를 뺀 7개 fixture는 각각 TS2741 오류가 발생해 의도한 누락 거부를 확인했다(예상 오류이며
정상 테스트 실패로 계산하지 않음). 공통 React 182·client 40 PASS 및 소비처 전체 frontend type-check를
재검증 PASS. 운영 API는 이 검토 시점 health 200·Kakao enabled=true이며 신규 배포 완료와 구분한다.


## 2026-10-10 PR #407 통합·API/웹 배포 및 운영 검증

사용자 승인 후 최신 구현의 Codex P2 타입 계약 지적을 수정했다. 최신 head `9d63a8b9b8`
재리뷰는 추가 지적 없음, 미해결 스레드 0, PR CI #38048683407 PASS였다. main의 별도
Demo relink 도구 변경을 확인·반영했으며 해당 DB 복구 workflow는 이번 작업에서 실행하지 않았다.
PR #407은 main `2a8b80cf24`에 통합됐다. post-merge CI #38049243981 및 CodeQL
#38049243931 PASS. Delivery #38049797025는 인증 변경을 HELD_LEVEL_3로 보류했다.
승인된 정확한 SHA의 Promote #38049884263은 SUCCESS이며 API 먼저, 이어서 admin·neture·
kpa-society·lecture·store·kpa-branch 웹 6개를 배포했다. API migration 단계, 새 리비전 readiness,
traffic 전환 및 전환 후 검증 PASS; 새 migration/schema 변경은 없다. 최종 production 상태는
DEPLOYED다. 검증 중 이후 main에 통합된 별도 커뮤니티 권한 변경은 이 배포 SHA의 결과에 포함하지 않는다.

| 운영 검증 | 결과 | 범위와 제한 |
| --- | --- | --- |
| 게시 가입 약관 API | 9/9 PASS | 유지 8개 origin의 현재 게시 문서/version·정책별 URL·no-store 및 전체관리자 가입 origin 거부 |
| 실제 Demo 버튼 PC/mobile × 8개 origin × 2역할 | 최초 30/32 PASS, 실패 2건 각각 재실행 PASS | 실제 이메일 로그인·me·업무 API 역할 경계·전체관리자 거부·Demo 소셜/비밀번호 변경 차단·UI logout 및 access/refresh 폐기. Neture의 Store handoff 세션은 원래 origin logout 뒤 유지 |
| 배포된 가입 UI PC/mobile × 8개 origin | 최초 13/16 PASS, 경로 안정성 3 FAIL | 실제 게시 약관 API·배포 bundle; provider complete와 가입 제출만 합성 응답, 계정 생성 없음. 실제 OAuth 완료 근거가 아님 |
| 공급자·펀딩 가입 UI 추가 진단 | 경로 순환 재현 | 각각 PC/mobile에서 문서/version 일치·제출 1회·이메일 확인 안내는 확인. `/login`과 `/`가 순환해 경로 안정성 FAIL; 약관 페이지 이동으로 오인하지 않음 |

Demo 최초 실패는 공급자 PC의 UI logout 대기와 펀딩 모바일의 refresh 요청 시간 초과였다.
둘 다 같은 조건의 독립 세션 재실행에서 전체 시나리오 PASS. 원인을 확정하거나 최초 실패를
지우지 않으며 단일 최초 전체 실행이 32/32 PASS였다고 보고하지 않는다. 매장 경영자의 업무 API는
200이고 공급자에게 반환되는 STORE_OWNER_REQUIRED 403은 의도한 반대 역할 경계다.

가입 UI 경로 순환은 기존 Neture LoginRedirect가 `/login` → `/`로 보내고, 미로그인
SupplierServiceEntry 및 MarketTrialHubPage가 `/` → `/login?returnUrl=...`로 되돌리는 코드와
일치한다. 합성 제출 전후 경로 검사에서 최초 3건 실패, 두 도메인 PC/mobile 추가 진단에서도
재현했다. 가입 acceptance의 원자 저장 수정으로 이 기존 route 상호작용까지 해결했다고 보지 않는다.
미로그인 두 도메인의 진입 경로를 안정화하고 callback 보존·Demo·logout을 다시 검증할 후속 TODO다.

실제 소유자의 Google/Kakao 가입·로그인·연결·취소와 추가 정보 적용 후 약관 gate 재확인은 OPEN.
정책 본문/version 1의 이전 서비스 내용 정리·새 버전 검토·게시는 이번 배포에서 수행하지 않았다.
동일 WO 연속 배포 검증 기록과 남은 OAuth/경로 후속 때문에 기존 branch/workspace는 KEEP한다.

기록 PR 리뷰 P2 후속: 상위 리팩터링 WO 단계 4의 acceptance 구현 TODO도 완료로 정렬했다.
compound 항목에 섞였던 실제 사용자 흐름 및 공급자/펀딩 경로 순환은 별도 OPEN으로 분리했다.

## 2026-10-10 남은 인증 TODO — 실제 OAuth 실행 매트릭스

이 절의 실제 외부 인증 항목은 **OPEN**이다. 합성 provider 응답·로컬 테스트로 완료 처리하지 않는다.
다음 구현 PR은 로그인 경로와 검증안 push 범위이며 통합·배포 뒤 실제 브라우저에서 실행한다.
유지 8개 서비스는 PC·모바일로 확인한다. study는 Neture 계정 진입, 전체관리자는 별도 Google 전용
검증 대상으로 구분한다. 모든 항목은 test 계정/승인된 본인 계정으로 실행하며 결과에는 문구 및
도메인·경로만 남긴다. OAuth query/fragment, 토큰, 이메일·전화번호·실명은 기록하지 않는다.

| 케이스 | 시작·조작 | 합격 조건 | 상태 |
| --- | --- | --- | --- |
| Google·카카오 신규 가입 | 미연결 외부 계정 인증 → 추가 정보 → 현재 약관·개인정보 동의 → 제출 | 계정 생성 1회, 입력 상태 유지, 확인 필요 시 메일 안내, 확인 후 로그인, 같은 정책 gate 반복 없음 | OPEN |
| 기존 로그인 | 연결된 Google·카카오 각각 로그인, 페이지 새로고침 | 연결 계정으로 인증; origin 세션 복구; 업무 권한은 기존 membership에 한정 | OPEN |
| 취소·거절 | provider 동의 취소, 추가 정보 취소 | 로그인 상태 생성 없음; 재시작 가능; 공급자·펀딩 경로 순환 없음 | OPEN |
| 이메일 소유 확인 | 미확인 이메일 가입 → 확인 링크, 만료/재사용 링크 | 확인 전 권한 상승 없음; 유효 링크만 확인; 만료/재사용은 명확한 안내 | OPEN |
| 명시적 연결 | 이메일 회원 로그인 → 계정 설정 → Google·카카오 연결 → 외부 재인증 | 같은 O4O 회원에 수단 추가; 이메일 일치만으로 자동 연결/계정 병합 없음 | OPEN |
| 연결 충돌 | 이미 다른 회원에 연결된 외부 계정으로 연결 시도 | 충돌 안내; 두 회원과 기존 수단·권한 보존 | OPEN |
| 해제·마지막 수단 | 여러 수단 중 하나 해제, 유일 수단 해제 시도 | 가능 수단만 해제; 마지막 로그인 수단 거부; 다음 로그인 확인 | OPEN |
| 소유자 반복 약관 사례 | 본인 카카오 인증 → 추가 정보 적용 | 제출 후 예상 다음 단계, 현재 정책 pending 없음; 새 정책이면 한 번의 정당한 재동의 | OPEN |
| 전체관리자 경계 | admin에서 Google 및 다른 로그인 진입 | 승인된 Google 관리자만 접근; 카카오·이메일·Demo 관리자 진입 거부 | OPEN |

실제 본인 카카오 가입이 아직 완료되지 않았다면 기존 회원 로그인·연결 테스트와 섞지 않는다.
이메일 확인은 실제 수신 확인을 별도 기록하며 fixture의 mailSent 응답으로 대체하지 않는다.
법률/정책 변경안은 [DRAFT 검토안](../design/DESIGN-O4O-AUTH-LEGAL-POLICY-REFRESH-V1.md)에
제시했다. 승인 전 게시 본문·version·effective date는 변경하지 않았다.


### 이번 로컬 구현·검증 결과

LoginRedirect를 독립 컴포넌트로 추출했다. 미로그인 공급자·펀딩은 `/login`에서 모달을 열고 머문다.
닫은 뒤 로그인하기로 재진입한다. 실제 SupplierServiceEntry/MarketTrialHubPage의 홈 인증 가드는
유지한다. main/community의 공개 홈 진입, 복구 중 이동 보류, 안전한 로그인 후 복귀 경로와 callback
fragment 보존은 기존 계약을 유지한다. shared auth/API·DB·권한·게시 정책 변경은 없다.

| 검증 | 결과 | 범위 |
| --- | --- | --- |
| Neture 진입/모달 단위 테스트 | 24 PASS | LoginRedirect 11, email modal 5, Demo modal 8; 실제 공급자·펀딩 홈 컴포넌트 포함 |
| 약관 조회·gate 단위 테스트 | 15 PASS | SignupTermsAgreement 8, PolicyAcceptanceGate 7. 서버 pending 갱신 후 서비스 복귀·반복 gate 없음 추가 |
| Neture production build | PASS | TypeScript + Vite; 기존 큰 chunk 경고 있음 |
| 전체 frontend type-check | PASS | 소비처 전체 타입 검증 |
| PC/mobile 가입·약관 UI | 24/24 PASS | main/supplier/funding/community × 두 화면 × success/lookup-retry/stale-version. 추가 정보 유지·재동의·메일 안내·제출 경로 안정 |
| PC/mobile 보호 홈·로그인 UI | 12/12 PASS | supplier/funding × 두 화면 × 홈/직접 login/카카오 취소; fragment 소비 및 모달 닫기/재열기 |

브라우저는 현재 로컬 production bundle을 해당 origin으로 제공하고 API/provider 응답만 fixture로
대체했다. 실제 인증·가입·메일 발송·운영 DB 변경·운영 배포 검증이 아니다. 첫 화면 검증에서는
커뮤니티 목록 fixture 누락으로 커뮤니티 PC 2건이 실패한 뒤 실행을 중단했다. 실제 API 구조의
communities 배열을 추가한 독립 전체 재실행이 24/24 PASS다. 운영 장애로 해석하지 않는다.
기존 기록의 운영 실패나 실제 OAuth OPEN은 이 로컬 성공으로 제거하지 않는다.


## 2026-10-11 공통 계정·서비스별 약관 분리 — 로컬 검증

### Shared Module Change Verification

변경: API signup-policy/terms-acceptance/policy-acceptance, 공통 PolicyAcceptanceGate.
전체관리자 관리 경로 예외·서비스 membership/role/매장 원장 guard는 유지한다. 요청 경로와 서명된
세션 범위로 서비스 pending을 선택한다. common Neture acceptance 때문에 membership/role을 만들지 않는다.
legacy 범위 미상은 전체 raw pending으로 보수적으로 처리한다. GET/POST 약관 응답은 세션 범위로 제한하며,
Demo 예외는 enforcement에만 적용하고 raw 이력은 그대로 유지한다.

| 소비처 | 변경 영향 | 검증 | 결과 |
| --- | --- | --- | --- |
| Neture 메인·공급자·커뮤니티·펀딩 | 같은 번들의 공통 gate; 무관 서비스 미동의 전역 차단 제거 | 전체 frontend 타입·Neture build; Neture PC/mobile production bundle | PASS(로컬; 각 운영 origin smoke는 이번 실행 대상 아님) |
| 약국 | 가입 문서는 Neture; 공통/약국 본문 각각 확인 | API origin·가입 회귀; 약국 build 및 PC/mobile production bundle | PASS(로컬) |
| 분회 | 공통 재동의 화면 신규 연결, 공통 workspace 의존성 한 건 | 분회 build/타입, 기존 4 files/35 tests; PC/mobile production bundle | PASS(로컬) |
| 내 매장·강의 | 기존 공통 gate 소비; 서로 다른 문서 조회·표시 계약 적용 | 전체 frontend 타입 + 공통 UI 회귀 | PASS(로컬; 이번 별도 브라우저 smoke 미실행) |
| 전체관리자 | 기존 관리 경로 exemption와 역할 guard 유지 | API admin 경로 회귀 | PASS(로컬) |
| 은퇴 K-Cosmetics/PharmacyHub | 신규 가입·운영 화면 추가 없음 | 현행 소비처 검색 | 운영 smoke 제외 |
| raw-source 계약 | auth-logout-retirement-contract의 약관 정책 경로 문자열 참조 | literal consumer 검색·raw-source 4 tests | PASS |

### 실행 결과

- API 약관·origin·미래 시행일 게시/lifecycle 및 raw-source: 5 suites, 77 PASS.
- 공통 UI: 9 files, 70 PASS. 인증 UI: 17 files, 196 PASS.
- 이메일·Google 서버 회귀: 2 suites, 117 PASS. 격리 PostgreSQL social suite 18건은
  전용 테스트 포트가 없어 SKIP(운영 DB로 대체하지 않음).
- API 타입 검사 및 전체 frontend 타입 검사 PASS. Neture·약국·분회 production build PASS.
- 브라우저: 위 3개 빌드 × PC(1440)/mobile(390) × 동의 완료/문서 버전 변경/조회 실패 = 18 PASS.
  합성 계정·API 응답을 사용했다. 실제 OAuth·운영 계정 생성·운영 DB 쓰기·공고·게시 증빙이 아니다.
- 문서 변경일은 실제 공고일이 아니다. 미래 publish 거부 시 이전 published/draft 저장이 실행되지 않음 검증.

### 미완료와 적용 경계

서비스 신청별 정책 소유권/문서 참조/조건 snapshot, 개인정보 고지 및 version 증빙,
외부 인증 고지 근거, 실제 공고 경로와 30일 경과 후 시행·재동의 운영 검증은 OPEN이다.
Neture 공통 본문과 서비스 신청 조건이 완성되기 전에 운영의 새 정책 적용 완료로 표시하지 않는다.
이번 범위는 push/PR이며 main 통합·배포·정책 DB 게시는 실행하지 않았다.


계정 생성의 처리방침 링크는 이메일·Google·카카오 UI에서 Neture 공통 주소와 새 탭을 단언했다.
다른 서비스의 privacyHref를 전달해도 공통 계정 처리방침을 선택한다. 서비스 신청에서의 추가 수집
고지·동의 기록을 이 링크 변경으로 구현 완료 처리하지 않는다.


### PR #457 리뷰 보완과 추가 회귀

- Google 로그인·가입 및 Kakao 로그인 완료·가입이 공유하는 세션 응답도
  `getEnforcedPendingForUser(userId, sessionServiceKey)`를 사용한다. 세션 발급과 같은 origin 범위로
  요구 약관과 Demo 예외를 적용한다. body의 serviceKey는 응답 범위를 바꾸지 않는다.
- 실제 공급자 mount `/api/v1/neture/supplier`를 일반 Neture 경로보다 먼저 판정한다.
  copilot 및 spot-policies의 공급자 pending이 제거되지 않음을 검증했다.
- provider 응답 회귀 8건과 약관 보안 회귀 45건, 합계 53 PASS. 앞서 77건에 포함된 보안 회귀는
  중복 합산하지 않는다. 이번 API 검증의 고유 테스트는 202 PASS(77 + 117 + provider 8)다.
- 계정 가입 PC/mobile 회귀도 Neture·약국·분회에서 18 PASS: 정상 제출, 문서 조회 실패/재시도,
  버전 변경 후 입력 보존/재동의, 공통 처리방침 새 탭, 제출 후 약관 페이지로 이동하지 않음.
  별도의 정책 gate 회귀 18건과 합계 36건이며 모두 로컬 production bundle/합성 API 응답이다.
- 최신 main의 market-trial 소스와 오래된 로컬 dist 간 차이로 API 타입 검사가 한 차례 실패했다.
  해당 workspace 의존성을 재빌드한 후 타입 검사가 통과했다. 무관한 소스는 수정하지 않았다.
- 변경 파일 lint 오류 0건. 기존 unused import 경고 2건은 남아 있다.

최종 commit의 GitHub CI 및 리뷰 결과는 PR #457의 최신 HEAD에서 확인한다. 이전 HEAD의 CI PASS를
후속 수정의 PASS로 대체하지 않는다. 실제 OAuth·운영 DB·배포·새 정책 공고/게시 검증은 별도다.


### 실제 운영자 mount의 추가 리뷰 보완

일반 Neture prefix보다 먼저 공급자 운영자·서비스 관리자 및 펀딩 운영자의 실제 하위 mount를
판정하도록 추가했다. 전체관리자 `/api/v1/admin/**` 예외와 서비스 역할 guard는 변경하지 않았다.
전체 등록 경로를 대조하며 `/api/market-trial`과 `/api/v1/communities`도 해당 서비스로 연결했다.
공유 store/forum API는 여러 소비처가 있으므로 서명된 세션 범위를 유지한다.

신규 HTTP 회귀 5건은 Neture 세션으로 호출해도 해당 서비스의 미동의는 428, 무관 Neture API는
200, 해당 문서 승낙 후 같은 요청은 200임을 확인한다. 비슷한 prefix의 이름만으로 잘못 선택하지
않는 경계 회귀 2건도 통과했다. 약관 보안 suite 52 PASS, API 타입 및 변경 파일 lint PASS.
추가 7건을 포함한 이번 고유 API 회귀는 209 PASS다. 기존 UI 301건과 로컬 브라우저 36건은
이 서버 판정 수정으로 재실행하지 않았으며 해당 검증의 범위를 그대로 유지한다.


### 전체관리자 관리 세션의 추가 리뷰 보완

전체관리자 화면은 `/api/v1/admin/**`뿐 아니라 settings·apps/availability·users 및 서비스 관리
API도 사용한다. 공통 Neture 약관을 membership 없이 요구한 변경으로 이 관리 업무가 차단될 수
있음을 확인했다. `requireAuth`의 계정/세션 상태 및 Google 인증수단 검증 후, **서명된 admin
세션 + 현재 DB platform:super_admin 역할**일 때만 약관 enforcement를 면제한다.
클라이언트 Origin/body·오래된 JWT 역할은 근거로 사용하지 않는다. 관리 API의 기존 route role
검사는 그대로 적용하며, 동일 계정의 일반 서비스 세션은 기존 공통/서비스 약관 규칙을 따른다.

추가 11건은 관리 API 6개 요청, DB 역할 없는/서비스 운영자 2건, 일반 서비스 세션 1건,
Google 증거 없는 관리자 세션 2건을 확인했다. 실제 DB·관리 데이터 변경 없이 공통 requireAuth
단계의 HTTP fixture로 검증했다. 승낙 이력을 만들지 않고 raw pending도 보존한다.
첫 실행의 raw-source 테스트 파일 확장자 오기와 음성 테스트의 예상 상태 오류(403 대신 실제
약관 차단 428)를 정정한 재실행은 보안 63 + raw-source 4 = 67 PASS다. API 타입/lint도 PASS.
이번 고유 API 회귀 합계는 220건, UI 301건, 로컬 PC/mobile 36건이다. 실제 OAuth·PG 통합과
운영 검증의 별도 OPEN은 유지하며 최종 CI·리뷰는 이 후속 commit의 PR HEAD에서 확인한다.


### Neture namespace의 공용 경로 추가 리뷰 보완

약국 소비처의 seller-recruitment 본인 신청 조회·취소와 공급자 목록 등은 Neture namespace에
있지만 여러 서비스가 공유한다. namespace 전체를 Neture 소유로 덮지 않고 서명된 세션 범위를
유지하도록 정정했다. 전용 Neture operator/admin, 공급자·펀딩 운영자 등은 구체적 소유 경로를
계속 우선 판정한다. 모집의 supplier 전용 recruitments 및 applications 승인/반려/종료 동작도
실제 controller의 requireActiveSupplier와 대조해 supplier로 판정한다. 매장 본인 신청 동작을
supplier 전용으로 묶지 않는다.

신규 7건은 supplier 전용 동작의 차단/승낙 후 해소 5건과, 공용 Neture API에서 Neture·약국
두 세션의 다른 pending 판정 2건이다. 보안 70 + raw-source 4 = 74 PASS, API 타입/lint PASS.
이번 고유 API 회귀는 227건, UI 301건, 로컬 PC/mobile 36건이다. HTTP fixture는 공통 middleware
검증이며 실제 신청 DB의 rollback·조건 snapshot 검증은 별도 TODO다.


### 경로 정규화 및 한국 시행일 경계

후행 슬래시 리뷰 지적은 재현되지 않았다. 기존 normalizeRequestPath가 이미 후행 slash를 제거한다.
실제 Express post route에서 approve/reject/terminate의 slash+query 변형이 supplier pending일 때
428, 승낙 뒤 200임을 확인했다. 추가로 Express 기본 대소문자 매칭과 owner 판정이 다르지 않도록
owner 판정 경로를 소문자로 정렬했고 uppercase 변형도 같은 결과를 확인했다(신규 3건).

관리 UI의 시행일은 date 입력이다. 게시 방어를 Asia/Seoul 달력 날짜 비교로 변경했다.
한국 시행일 직전 거부, 한국 자정/당일 오전/당일 말/다음날 허용, legacy null 및 invalid date를
확인했고 한국 자정(UTC로 전날)에 controller가 게시하는 HTTP 회귀도 추가했다(신규 8건).
이 날짜 판정은 30일 공고의 실행/증빙이나 자동 예약 게시가 아니다.

보안·raw-source·lifecycle·게시 controller 4 suites, 94 PASS. 숫자 날짜 key 보완 뒤 lifecycle/게시
17건도 재확인했다. 추가 11건을 포함해 고유 서버 회귀는 238건, UI 301건이다. 로컬 PC/mobile
36건의 합성 API/provider 범위와 PG 통합/실제 OAuth·운영 검증 OPEN은 유지한다.


### 공급자 변경 API의 HTTP 메서드 소유 범위

공용 상품 이미지 GET은 signed session scope를 유지하고, 공급자 전용 이미지 업로드·URL 등록·
대표 지정·삭제는 실제 POST/PATCH/DELETE 메서드로 supplier pending을 요구한다. body의 method나
serviceKey로 이 판정을 바꾸지 못한다. 실제 requireActiveSupplier/requireSupplierScope 및 공급자
조회 소비처를 대조해 private library와 hub trigger의 공급자 self 동작도 연결했다. Neture 관리자
hub trigger 두 동작은 Neture 범위이며 public library는 기존 비인증 경로 그대로다.

신규 10건을 포함해 보안 83 + raw-source 4 + provider 8 = 95 PASS, API 타입/lint PASS다.
관리자 hub trigger와 공용 이미지 GET의 순수 판정도 기존 경계 테스트에 포함했다. 이번 고유 서버
회귀는 248건, UI 301건이며 PC/mobile 로컬 합성 API/provider 검증 36건의 범위는 그대로다.
실제 서비스 원장·조건 snapshot, PG 통합, 실제 OAuth 및 운영 smoke의 OPEN은 유지한다.
이 후속 변경도 동일 WO의 push/PR 범위이고 최신 HEAD의 CI·재리뷰로 통합 준비 상태를 확인한다.


### KPA 하위 공급자 mount 우선순위

KPA의 supplier 하위 API는 일반 KPA보다 먼저 supplier로 판정한다. 실제 supplier identity를
소비하는 제안·자료 제출·signage media/캠페인/보고·screen-set 6개 mount를 대조하고 공통
Neture 약관만 승낙한 공급자가 해당 정책을 우회하지 못하도록 했다. 각 HTTP fixture에서
pending일 때 428 및 supplier 승낙 뒤 200을 확인했다. 관련 3 suites 101건 PASS다.
이 middleware 검증은 실제 콘텐츠/제안 원장 쓰기나 운영 smoke가 아니다. 신규 6건 포함 고유
서버 회귀는 254건, UI 301건, 로컬 PC/mobile 합성 검증 36건이며 기존 OPEN은 유지한다.


### Store 업무공간 노출 및 실제 공급자 자격 일치

Store signed scope의 공통 pending은 현재 Store-capable 서비스의 자격 기반 문서를 노출한다.
GET pending·승낙·공통 enforced pending과 KPA API 해소를 검증했으며, 무관한 공급자 pending은
raw에 남아 있어도 Store를 막지 않는다. 새 서비스 키/가입/역할을 만들지 않는다.

실제 공급자 약관 대상과 승낙 자격은 기존 canonical supplier resolver를 함께 사용한다. ACTIVE,
PENDING, 복수 후보 중 업무 자격, INACTIVE, 관계 없음 및 경고가 있는 legacy compatibility를
검증했다. 운영자 membership 없이 pending→428→승낙→해소가 가능하고 무자격 승낙은 403이다.
기존 resolver의 owner/left_at/type 및 복수/foreign context 경계 18건도 이번 검증에 포함했다.

신규 정책 경계 7건 포함 관련 4 suites 126 PASS다. 초기 타입 검사의 resolver 인자 누락을
수정해 null context로 명시했고 변경 후 보안/resolver 2 suites 114건을 재검증했다.
이번 검증의 고유 서버 회귀는 기존 254 + 신규 7 + 추가 resolver 18 = 279건, UI 301건이다.
로컬 PC/mobile 합성 36건 및 실제 OAuth/PG/운영 검증 OPEN은 유지한다. 원장 read는 합성 fixture이며
운영 원장 쓰기나 서비스 신청 조건 snapshot/rollback 검증을 실행한 것이 아니다.


공개 정책 본문 조회도 대조했다. 관리 scope의 4개 key만 받던 정책 GET은 catalog의 canonical
서비스에 대해 이미 published인 문서를 읽도록 연결했다. supplier/funding/community/kpa-branch
조회, store·미등록 key 거부, 미게시 404와 법정정보 scope 비확대를 확인했다(신규 7건).
기존 관리 legal scope 6건도 PASS다. 관리 작성/게시 권한은 그대로이며 후속 TODO다.
추가 13건 포함 고유 서버 회귀는 292건, UI 301건이다. 공개 조회는 합성 fixture이고 정책 게시나
공고를 실행하지 않았다. 이번 Phase 검증과 실제 신규 정책의 게시 준비 완료를 구분한다.

Store/원장/공개 조회 보완 후 API 타입·changed lint·API build 및 docs 민감정보 guard가 모두 통과했다.
최종 CI·전체 재리뷰는 이 후속 HEAD에서 확인하며 실제 서비스 원장 쓰기/정책 게시를 수행하지 않았다.


### Store 서비스 문서의 잘못된 전문 링크 제거

Store의 단일 Neture termsPath 전달을 제거했다. 공통 계정 문서는 공통 URL을 새 탭으로 열고,
서비스별 전문 경로가 확정되지 않은 문서는 전문 링크를 생략하며 각각의 본문/ID/version을 표시한다.
실제 Store 소비처 DOM 회귀 1건과 Store type/build PASS다. 새로운 Store production bundle에서
PC/mobile × 정상 승낙/버전 변경/조회 실패 6건을 검증했고 KPA 문서가 Neture 전문 링크로 안내되지
않는 것도 확인했다. 합성 API/provider/user이며 실제 OAuth/운영 DB 쓰기는 없다. 고유 UI 회귀는
302건, 서버 292건이며 PC/mobile 로컬 검증은 기존 36 + Store 6 = 42건이다. PG 18 SKIP와 실제
운영/서비스 원장 검증 OPEN은 유지한다. 이번에 시작한 preview 프로세스는 검증 후 종료했다.


### 공통 gate의 전문 링크 소유 서비스 명시

Store만 보완한 뒤 Neture 소비처에 동일한 전문 링크 문제가 남았음을 재리뷰로 확인했다.
공통 gate에 termsServiceKey를 추가해 termsPath가 실제로 조회하는 서비스의 terms 문서에만
링크를 표시한다. Neture/kpa-society/lecture 약관 페이지의 실제 조회 key를 대조해 세 소비처를
연결했다. 다른 서비스의 전문 경로는 임의 추정하지 않고 본문만 표시하며 공통 Neture 주소는 유지한다.

복수 Neture/supplier/community/funding 문서 및 supplier 단독 pending 신규 2건, 기존 KPA 전문
링크 유지까지 확인했다. 초기 vitest config 확장자 오기 및 전문 링크 기대값에 포함된 메인 링크를
정정한 재실행은 공통 UI 9 files/72 PASS, Store 소비처 1 PASS다. Neture/약국/Store/강의
타입 포함 build와 changed lint PASS다. 새 Neture/약국/Store production bundle의 PC/mobile
정상 승낙/버전 변경/조회 실패 18건도 PASS다. 새 Neture 복수 서비스 경계 6건을 추가한 고유
로컬 화면 검증은 48건(기존 36 + Store 6 + Neture 복수 문서 6), UI 회귀 304건, 서버 292건이다.
반복 재검증은 고유 합계에 더하지 않는다. 합성 API/provider/user 범위이며 실제 OAuth/PG/운영
검증 OPEN은 유지한다. 시작한 preview들은 종료했으며 최종 CI/review는 후속 HEAD에서 확인한다.


### membership 없는 약국 서비스 원장의 정책 자격

카탈로그 semiFranchiseAccessKey와 기존 resolveSemiFranchiseServiceAccess를 pending 산출 및
승낙 검증에 함께 적용했다. 약국 승인만으로 서비스 가입으로 보지 않으며 같은 조직의 기본 약국
신청 active ∧ 해당 세미프랜차이즈 가입 active인 실제 업무 자격이 필요하다. 기존 operator/legacy
membership 자격과 실제 사업자 원장은 합치지 않고 각각의 계약을 재사용한다.

동일 조직 두 승인, 복수 조직 중 자격 있는 조직, 서로 다른 조직에 흩어진 승인, 기본 승인만,
기본/사업 가입 대기 및 정지, 관계 없음의 신규 9건을 확인했다. membership 없이 Store 응답에
서비스 문서 노출→KPA API 428→승낙→해소가 가능하며 미자격 승낙은 403이다. 기존 resolver의
owner/admin/manager, left_at, 계정 활성·이메일 확인·Neture 정지 경계 SQL을 그대로 사용한다.
서비스 가입/역할·원장 승인 상태를 만들거나 수정하지 않는다.

보안/raw-source/provider/supplier resolver/공개 조회/legal scope 6 suites 148 PASS다.
고유 서버 회귀는 301건, UI 304건이며 PC/mobile 합성 검증 48건의 범위는 유지한다.
실제 신청 원장 쓰기·조건 snapshot/rollback, 실제 OAuth/PG/운영 검증 및 공고/게시 OPEN은
이 gate 자격 보완으로 완료 처리하지 않는다. 최신 후속 HEAD의 CI/review까지 확인한다.

약국 서비스 원장 보완 후 API 타입·changed lint·API build·docs 민감정보 guard도 PASS다.


### 공고 전 공통 약관 적용 방지와 원장 승인 캐시 보완

기존 v1·표식 없는 v2·v1 잘못된 표식은 membership 없는 공통 요구를 만들지 않는다. 새 ID의
Neture terms/version>=2/slug=neture-account-terms가 published일 때만 전환한다. 기존 slug
필드를 사용하며 migration/운영 DB 변경은 없다. 표식 문서의 version<2 또는 시행일 미정 게시는
변경 전 400으로 거부한다. 한국 미래 시행일 409 방어도 유지한다. 자동 공고·예약 게시가 아니다.

약국 공개 가입 문서의 ID/version/전문 링크를 전환 전후 대조했으며 이메일·Google·카카오의
서버 선택도 같은 resolver를 사용한다. 전환 후 오래된 약국 가입 요청은 동의 쓰기 전 409다.
원장 기반 약국/공급자 자격은 승인 직후 빈 pending 캐시로 건너뛰지 않는다. 일반 캐시는 게시
문서 ID/version/slug 집합이 같을 때만 사용하며 published 문서 TTL 60초는 유지한다.

신규 18건(rollout/캐시 7, 가입 9, 게시 2) 포함 관련 6 suites 171 PASS다. 초기 provider 응답
테스트는 새 게시 문서 조회 mock이 없어 1건 실패했으며 해당 dependency fixture를 추가한 뒤
기존 8건 모두 재실행 PASS다. API 고유 회귀는 301+18=319건, UI 304건이다. 기존 로컬
PC/mobile 합성 검증 48건은 반복 합산하지 않는다. PG fixture에 slug를 추가했지만 실제 PG
signup/social integration 18건은 DB 연결이 없어 SKIP이며, 이번 함께 실행한 sessionAuthMethod
21건도 SKIP다(총 39 SKIP). 실제 OAuth/운영 검증으로 대체 보고하지 않는다.

본문 완성·외부 인증 고지·서비스 신청 문서/snapshot·개인정보 version 증빙·8개 서비스 운영
검증 TODO는 유지한다. 실제 공고일·시행일 미정, 30일 공고 미시작, 운영 정책 미게시다.
최신 push HEAD의 CI·Codex review는 PR #457에서 확인하며 main 통합/배포는 이번 범위가 아니다.

이메일·Google 기존 서비스 회귀 117 PASS도 재확인했다(고유 319건에 이미 포함, 중복 합산 없음).
API build(실제 tsc)·타입 검사·changed lint·docs 민감정보 guard·diff check PASS다.


### 기존 Neture 서비스 pending 범위와 사용자별 캐시 후보 분리

합성 공통 requirement뿐 아니라 요청별 선택도 새 published 문서의 accountPolicy 표식을
따른다. 기존 미표식 Neture 약관은 일반 서비스 약관이므로 Neture membership이 있더라도
KPA/lecture 세션·전용 API를 막지 않는다. Neture 자체 요청의 기존 약관 요구는 유지한다.

카탈로그에 원장 서비스가 있다는 이유만으로 모든 사용자 캐시를 제거하지 않는다. 매 요청
organization_members의 현재 업무 관계 및 필요한 legacy supplier 관계를 EXISTS로 확인한다.
관계가 없는 계정은 빈 결과 cache를 재사용하며 membership/원장 resolver 조회를 반복하지 않는다.
새 관계가 생기면 다음 요청에서 cache를 건너뛴다. 관계가 있는 계정은 승인 상태를 기존 resolver로
확인한다. 이 EXISTS는 권한을 부여하는 판정이 아니며 기존 role constants를 재사용한다.
관계 확인 DB 조회 1건과 관계 있는 계정의 전체 조회 부담은 유지한다.

신규 무관 서비스 2건·관계 없는 cache 2건과 기존 승인 변경 회귀를 포함한 3 suites 128 PASS다.
고유 서버 323건/UI 304건, 로컬 PC/mobile 모의 48건이며 PG 39 SKIP 경계를 유지한다.
API build·changed lint·docs 민감정보 guard·diff check PASS다. 실제 공고/시행·정책 게시·운영
검증은 하지 않았으며 최신 HEAD CI/review를 확인한다.


### 공통 문서 표식의 기존 row 재분류 차단

published 문서의 slug도 본문/version/시행일과 함께 불변이다. 게시 해제/복원된 draft에도
공통 표식을 추가하거나 제거할 수 없고 새 row 등록 시에만 지정한다. 과거 동의 ID를 그대로
사용해 기존 서비스 문서를 공통 계약으로 재분류하는 경로를 차단한다. 실제 관리 PUT에서
published 표식 추가·제거·일반 slug 변경, draft 표식 추가·제거의 5건은 409/저장 없음이며
새 공통 draft의 표식 유지·본문 편집 1건은 정상이다. 신규 6건 포함 2 suites 25 PASS다.
고유 서버 329건/UI 304건, 모의 PC/mobile 48건/PG 39 SKIP 및 실제 공고·게시 OPEN을
유지한다. API build/lint/docs guard/diff check PASS, 최신 HEAD CI/review를 확인한다.


### My Home의 교차 서비스 428과 최종 CI 보완

Neture 세션의 /auth/me에 무관한 lecture pending을 추가하지 않는다. My Home 공통 resource
hook이 보호 API의 428/TERMS_ACCEPTANCE_REQUIRED를 문서 목록으로 보존하고 해당 패널에서
공통 gate를 표시한다. 승낙은 정확한 ID/version으로 제출하고 같은 resource를 다시 조회한다.
강의·펀딩 및 동일 hook 소비처에 적용하며 주변 패널은 유지한다. malformed 응답은 일반 조회
실패로 처리해 제출하지 않는다. account/resource 교체 시 늦은 응답을 버리는 계약도 유지한다.

패널용 gate는 비모달 region이며 복수 제목 ID를 구분한다. My Home 2 files 23 PASS, 공통 UI
9 files 73 PASS다. 이전 고유 UI 304 + 기존 집계에 없던 My Home 23 + 공통 신규 1 = 328건이다.
초기 버튼 기대 문구와 제목 selector 범위 오기를 정정한 재실행 결과다. 새 production bundle의
PC/mobile × 강의/펀딩 × 승낙/버전 변경/조회 실패 12 PASS이며 기존 48을 포함한 고유 모의
화면 검증은 60건이다. 초기 브라우저 locator가 합성 문서의 영어 제목을 찾지 못한 것을 정정했다.
모든 외부 요청을 fixture로 처리했고 실제 OAuth/운영 DB 쓰기는 없다. 시작한 preview는 종료했다.

직전 HEAD CI에서 공급자 경계 검사가 실패했다. 로컬 동일 shard 실행으로 정책 서비스의
legacy supplier 직접 조회를 재현하고 cache 후보 조회를 canonical resolver로 옮겼다. 정책
서비스는 직접 legacy 조회하지 않는다. API focused 5 suites 187 PASS(보안/raw/provider 128,
기존 supplier resolver 18, 경계 41)다. 인증·정책 고유 서버 회귀 329건과 추가 경계 41건을
구분하며 일반 shard의 다른 회귀를 이 집계에 섞지 않는다. SonarCloud가 지적한 판정 함수
복잡도는 후보 조회 helper로 분리하고 문자열 fingerprint 정렬에 localeCompare를 지정했다.

API·Neture build(타입 포함), changed lint, docs 민감정보 guard, diff check PASS다. 최신 HEAD
CI·review를 다시 확인한다. PG 39 SKIP, 실제 외부 인증/서비스 신청 원장·조건 기록/개인정보
version 증빙/8개 서비스 운영 상태 검증/30일 공고·게시 OPEN과 push/PR 종료 범위는 유지한다.


### 정책 본문의 runtime 표시 계약

공통 gate는 ID/version·서비스/유형뿐 아니라 title/content가 빈 문자열이 아닌지 확인한다.
식별 필드가 같아도 본문 누락/null/숫자/객체/빈 문자열/공백, 제목 누락/빈 문자열/숫자는
승낙을 열지 않는다. 복수 문서의 뒤 문서가 불완전해도 전체 제출을 막는다. 신규 10건 포함
공통 UI 9 files 83 PASS와 My Home 23 PASS다. 고유 유관 UI는 328+10=338건이다.

새 Neture production bundle PC/mobile × 강의/펀딩 × 승낙/버전 변경/조회 실패/본문 누락
16 PASS다. 기존 60건 중 My Home 12건은 재검증이므로 더하지 않고 신규 본문 누락 4건만
추가해 고유 모의 화면 64건이다. 외부 요청 fixture 및 실제 OAuth/DB 쓰기 없음의 경계는 유지한다.
Neture 타입 포함 build·changed lint·docs guard·diff check PASS다. own preview PID를 확인해
종료하고 4391 port가 닫힌 것도 확인했다. 서버 회귀/PG SKIP 수와 실제 공고/게시 OPEN은 그대로다.
최신 HEAD push 뒤 CI/review를 확인한다.

### 게시 문서의 표시 필드 방어

최신 리뷰에서 불완전한 draft가 게시되어 기존 공개 문서를 내릴 수 있는 경로를 확인했다.
게시 시 title/content의 비어 있지 않은 문자열 계약을 먼저 검사한다. 누락/null/숫자/객체/
빈 문자열/공백 12건, 일반 서비스 본문 1건은 400이고 강등 query builder·save·draft 변경은
없다. 불완전한 문서 게시 해제와 원문 보존 정상 게시 2건도 확인했다. 신규 15건 포함
게시/수명주기 2 suites 40 PASS다. 고유 인증·정책 서버 344 PASS와 추가 경계 41 PASS,
UI 338 PASS·로컬 모의 화면 64 PASS·PG 39 SKIP을 구분한다. 실제 운영 DB 쓰기는 없다.
API build·changed lint·docs guard·diff check PASS다. 최신 HEAD CI/review를 다시 확인한다.
30일 공고·실제 시행일/정책 게시 및 후속 TODO는 그대로 OPEN이다.


## 2026-10-11 잔여 작업 전체 Phase — 배포 준비 기록

동일 WO·branch 연속 Phase. 사용자는 남은 작업 전체와 main 통합·배포를 승인했고, 운영회사·보유기간·
위탁업체·국외 처리 계약은 기존 문서와 변경이 없다고 확인했다. 과거 push-only 종료 범위는 현재 범위가 아니다.

구현: 공통 가입 개인정보 version 증빙; 서비스별 명시 표식·독립 정책 관리; 공급자/약국/커뮤니티/
펀딩/강의 신청의 정책·조건 snapshot과 원자적 저장; 조회 실패·구버전·동시 게시 차단 및 입력 보존;
공통·서비스별 개정 전문과 공개 공고 경로. DB schema/migration/dependency 변경은 추가하지 않았다.

현재 로컬 검증: API focused 12 suites **299 PASS**, 실제 격리 PostgreSQL 4 suites **52 PASS·0 SKIP**.
이 PG 결과는 앞 단계의 PG 미연결 SKIP와 별개이며 새 signup privacy/hash, social/session 및
신청 정책의 rollback·동시 게시·개별 신청 증빙 연결을 실행했다. 운영 DB의 실제 상태별 신청 검증은 아니다.
공통 auth UI 200 PASS, shared-space UI 93 PASS(이전 실행); 최종 영향 웹 빌드·PC/mobile smoke는 별도 기록한다.
외부 Google·카카오 인증은 합성 처리이며 실제 본인 인증은 사용자 확인 범위다.

공고 URL `/policies/account-update`, 공고 예정일 2026-10-11·시행 예정일 2026-11-13(KST).
배포 전 기록이며 **공고·main 통합·운영 배포 완료 증거로 사용하지 않는다.** 운영 노출 시각과 serving SHA,
최종 CI·review·smoke는 후속 결과에 기록한다. 현행 정책 v1을 유지하며 새 정책 적용은 30일 경과 후다.

문서 정합: 공통 개정안의 운영회사·위탁·국외 처리 정보를 기존 정본과 대조했고 사용자 변경 없음 확인을 반영했다.
서비스별 본문과 현재 TODO를 보완했으며, 과거 WO/CHECK의 미완료 기록은 당시 실행 결과로 보존했다.


### 최신 전체 review 지적 처리

공고 전문의 production Docker 누락을 서비스 내부 공개 자산으로 해결했다(배포 설정 변경 없음).
terms/privacy 부분 게시·version 불일치 때 가입·신청을 503으로 차단하고, 약국 기본/사업/강의 재신청의
append-only 감사 연결을 보완했다. 커뮤니티 stale 정책 응답 형식을 UI와 정렬했다. 공고 자산 세 개와
검토 문서 공개 본문의 정합 검증을 추가했다. API build에서 발견한 커뮤니티 개설 참조 타입도 수정했다.
최종 재실행 결과와 최신 review·CI는 PR에서 검증하며 이전 숫자를 새 HEAD의 통과로 추정하지 않는다.
