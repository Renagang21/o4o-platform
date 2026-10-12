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


### 공통 전환 전 약국 개인정보 소유권 보완

추가 review를 반영해 공통 표식 전에는 약국 가입의 terms/privacy 문서·증빙·전문 링크 모두
kpa-society 범위로 유지한다. 공통 표식이 실제 게시된 뒤 Neture의 같은 version 정책 세트로
전환한다. 이메일·Google·카카오 세 경로에서 같은 선택된 범위를 사용한다.
실제 PG의 약국 기존 정책 소유권 3건과 UI 링크·위험 URL 차단을 추가 검증했다.
최종 로컬 고유 PG 검증은 60 PASS(기존 57 + 약국 소유권 3), 공통 auth UI는 202 PASS다.
공통 정책 partial·구버전·DB 오류 rollback 및 one-use grant 재사용 방어 결과를 유지한다.


### 정책 전환 전 신청 이력 보존 (추가 review)

서비스 정책이 아직 게시되지 않은 신청도 `policies: []`로 신청별 감사 로그를 남긴다.
약국·강의 재신청과 공급자 최초 신청을 포함해 기록 누락을 없앴으며, 기존 사용자 동의 증빙을
새로 만들거나 과거 신청을 소급 채우지 않는다. 동일 신청 ID의 두 번 접수를 실제 PostgreSQL에서
검증해 감사 로그 2건·동의 증빙 0건을 확인했다. 관련 단위 55 PASS, 실제 PG 전체 61 PASS, API build PASS.


### 공통 정책 양방향 준비 판정 및 최신 main 통합 검증

privacy가 먼저 게시된 경우에도 공통 terms/privacy의 표식과 version이 함께 일치해야 한다.
선택적 privacy 참조를 생략한 legacy 클라이언트도 이 준비 판정을 우회할 수 없다. 이메일·Google·카카오
각 경로에서 privacy-first의 참조 있음/없음 6건이 account/credential/provider/동의 및 one-use grant를
부분 저장하지 않는 것을 실제 PostgreSQL로 검증했다. 최신 PG 전체 67 PASS/4 suites, 가입 단위127 PASS,
API build PASS. main #484 충돌은 리소스별428·매장 사업 현황을 함께 유지했으며 기존 공급자 관리
대표 진입이 약관 설정으로 바뀌지 않도록 화면 목록 우선순위를 보존했다. 관련 UI100 PASS/8 files,
최신 Neture build와 PC/mobile 합성 gate18 PASS. 공고·시행은 여전히 실제 배포 검증 및30일 기간 이후다.


### 가입 origin 전체의 공통 준비 판정 및 CI 소비처 보완

약국이 legacy KPA 문서를 선택하는 동안에도 Neture 공통 terms/privacy를 별도로 대조한다.
Neture privacy-first 상태에서 약국 origin의 이메일·Google·카카오 참조 있음/없음 가입 6건을 추가해
최신 실제 PG 전체73 PASS/4 suites/0 SKIP, 가입 단위156 PASS/4 suites를 확인했다.
Google 동의 화면의 정책 로딩·실패 시 다른 서비스 개인정보 링크를 노출하지 않으며, 소유권 조회 뒤
정확한 링크를 제공한다(auth UI204 PASS/17 files). 기존 controller 테스트에는 실제 현재 privacy
조회 fixture를 보완했고, stale 신청 테스트는 읽기 잠금과 write가 없음을 구분한다. 커뮤니티 탈퇴
후 재조회는 정책 조회와 access 조회를 각각 검사한다. 새 약관 관리 route가 펀딩의 주 업무 진입을
대체하지 않도록 home entry에서 보조 설정 경로를 구분했다(Neture 전체582 PASS/68 files).

한국 날짜가 넘어가 아직 공개하지 않은 공고 예정일을2026-10-12로 정정했다. 시행 예정일
2026-11-13은30일 이상을 유지한다. 실제 공개 시각 확인 전 공고 완료로 기록하지 않는다.


### 개인정보 링크 소비처 전체 보완 및 운영 배포 사전 진단

Google와 같은 미조회 정책 링크 문제를 이메일·카카오 가입에도 적용했다. 서버가 소유권을 반환하기
전에는 전문 링크를 노출하지 않으며 소유권 확인 후 해당 문서 링크를 제공한다. 공통 auth UI 전체
206 PASS/17 files, 최신 main 포함 Neture 전체597 PASS/70 files를 확인했다. API 및 Neture
최신 main 빌드도 통과했다. 공개 공고 전문의 날짜는 실제 공고 전2026-10-12(KST)로 맞췄다.

읽기 전용 Delivery 진단 run38185745396은2026-10-11T23:50:24Z에 GCP WIF
`unauthorized_client / The given credential is rejected by the attribute condition`으로 실패했다.
PH 폐기의 workflow/SHA 단독 제한 기록과 일치하며 API/Web/Admin/Report는 SKIPPED였다.
배포0·운영 정책 게시0이고 serving SHA를 확인하지 못했다. 다른 트랙의 WIF 조건을 수정하거나
배포 경계를 우회하지 않는다. PH 작업 종료·기존 조건 복원 후 canonical 배포와 운영 smoke를 재개한다.


### 정책 갱신 재동의와 공통 정책 적용 순서 (최종 review 보완)

이메일·Google·카카오 가입에서 정책 변경/재조회가 발생하면 약관과 개인정보 체크를 모두 해제한다.
새 개인정보 ID/version을 과거 체크로 제출하지 않으며 재확인 전 제출을 차단한다. 추가 회귀3건을
포함한 auth UI209 PASS/17 files를 확인했다. 공통 약관의 글로벌 요구 활성화 전에 같은 버전의
게시된 공통 개인정보 본문이 있어야 하고, 적용 중 개인정보의 삭제·불일치 버전/legacy 교체도
거부한다. draft 게시 해제와 같은 버전 복구는 허용한다. 게시·소유권49 PASS/2 suites, API build PASS.

공개 전문 자산은 서비스 내부의 `.txt` 원문을 raw import하므로 Markdown 제외 패턴에 의존하지
않는다. 정본 공개 부분 대조3 PASS, Neture build PASS, 새 번들 PC/mobile 공고4 PASS
(anonymous/pending 합성 API)다. Docker 이미지 실행이나 운영 게시를 검증한 결과는 아니다.
main 통합·운영 배포 검증은 아직 진행 중이며 WIF 진단의 인증 거절 상태는 해소되지 않았다.


### 2026-10-12 운영 반영·공고·Demo 검증 및 분회 이미지 보완

- PR #457은 최종 HEAD `199de048ba`의 CI·Codex blocker 없음·미해결 스레드 0을 확인하고
  main `210529860d`로 통합했다. PR CI run38188346785와 main CI run38189055903은 SUCCESS다.
- PH 종료 후 WIF 복원을 사용자가 확인했다. 읽기 전용 인증 run38187804879와
  Delivery 진단38188246897이 SUCCESS다. 이전 WIF 거절 기록은 당시 결과이며 현재 blocker가 아니다.
- Promote38189866093은 main 이동으로 SUPERSEDED되어 실제 배포하지 않았다. 최신 문서 변경을
  포함한 Promote38190265457(target `0e1aa41eaf`)에서는 API·Neture·KPA Society·강의·매장·전체관리자
  이미지 배포 job이 SUCCESS였다. 분회는 Docker 이미지 빌드가 실패했고 전체 Report도 FAILED다.
  후속 Promote38192368264에서도 분회 빌드가 실패했다. 전체 배포 완료로 기록하지 않는다.
- 분회 package.json에 추가한 `@o4o/shared-space-ui`가 기존 Docker COPY 목록에는 빠져 있었다.
  기존 UI·content-editor의 manifest/source도 함께 복사하고 기존 build 명령을 추가하는 최소 보완이다.
  dependency·lockfile·운영 DB·WIF·workflow·트래픽 정책을 추가 변경하지 않는다.
- 실제 Docker COPY와 같은 독립 파일 집합(기존 node_modules/dist 없음)에서 workspace 의존성
  8개 closure, pnpm10.25 설치, types/auth-utils/auth-client/ui/content-editor 및 Vite build를 통과했다.
  기존 작업 폴더의 분회 type-check 포함 build도 PASS다. 로컬 Docker 이미지는 기본 설정 경로의
  읽기 전용 제한으로 미실행이며, 독립 빌드를 Docker 이미지 검증으로 바꾸어 부르지 않는다.
- 운영 공개 공고 `https://neture.co.kr/policies/account-update`는 PC1440/mobile390 HTTP200,
  전문14625자·표1개·제목46개·내부 DRAFT 미노출·모바일 overflow 없음·현행 약관 왕복 링크 PASS다.
  두 화면의 렌더 article SHA-256은 `9905a241b9f7b2f7317219b2f0f24896307731eee6bf112d26c6a58ce05b5d74`다.
  최초 보존된 전체 PC/mobile 확인 시각은2026-10-12T01:17:39.163Z(한국10:17:39)부터다.
  실제 공고일2026-10-12·시행 예정일2026-11-13은30일 이상을 확보한다.
- 유지 서비스8개(Neture·공급자·커뮤니티·펀딩·약국·매장·강의·분회)의 PC/mobile ×
  매장 경영자/공급자 실제 Demo 버튼32조건을 검증했다. 초회30/32 PASS 뒤 공급자 화면2조건은
  정확한 전역 메뉴 선택과 공급자 정보 안내의 ‘나중에 하기’ 처리로 재검증 PASS다.
  로그인/내 정보200, 전체관리자403, 역할별 업무200/403, Demo 비밀번호·연결 관리 제한,
  UI 로그아웃200 후 access/refresh401을 확인했다. Neture 매장 Demo의 매장 handoff와
  원래 Neture 세션 로그아웃 후 매장 세션 유지200도 PC/mobile에서 확인했다.
- 운영 정책 계약14건은 PASS다. 가입8 origin의 현행 terms/privacy v1·정확한 privacy 소유권·no-store,
  서비스5곳의 미적용 새 정책 배열[], Neture 공통 계정의 독립 서비스 신청 제외404를 확인했다.
  이번 실행에서 운영 정책을 게시하거나 과거 동의 증빙을 채우지 않았다.

현재 남은 조건: 분회 수정안의 최신 review/CI → main 통합 → canonical 배포 및 실제 serving SHA,
2026-11-13 시행일의 새 정책 게시·기존 회원 재동의, 사용자 본인의 실제 Google·카카오 인증,
로컬 `docs/local/TEST-ACCOUNT.txt` 확보 후 일반 계정 상태별 운영 검증이다. 해당 SSOT는 이 checkout과
기준 workspace에 없어 Demo를 미가입·대기·반려·정지·탈퇴 일반 계정의 증명으로 대체하지 않는다.
GitHub 배포 로그/자료의 `productionresultssa7.blob.core.windows.net`은 현재 프록시403으로
조회가 차단돼 실제 serving SHA 확인은 OPEN이다. 환경 초안에 도메인을 추가했으며 저장·게시 후 재확인한다.


### 2026-10-12 분회 수정 통합·배포 최종 결과

- [PR #497](https://github.com/Renagang21/o4o-platform/pull/497)의 최신 HEAD `cdc9138614`는
  Codex 주요 지적 없음·미해결 스레드0, PR CI38194647281 SUCCESS다. 정상 PR merge로
  main `899e871cce`에 통합했고 main CI38195234125도 SUCCESS다.
- 원래 Docker manifest 파일 집합은 실제 설치에서 shared-space-ui 누락 오류로 실패했다.
  수정된 독립 파일 집합의 설치·5개 의존성/Vite build가 통과했다. 추가로
  [Promote38195979353](https://github.com/Renagang21/o4o-platform/actions/runs/38195979353)의
  실제 Docker 이미지 build/push·Cloud Run 배포·최종 Report가 모두 SUCCESS다.
- 분회 최종 serving SHA는 `899e871ccee0114f6cf7ac73999011a1d364b994`다. Report는 GCP serving을
  다시 읽고 계획된 서비스의 SHA가 target과 일치할 때만 DEPLOYED로 판정한다.
  해당 SHA의 최종 production status도 SUCCESS/DEPLOYED다.
- API·전체관리자·Neture·KPA Society·강의·매장의 실제 serving 검증은 앞선 run38190265457의
  최종 production status에서 통과한6개를 확인했다(target `0e1aa41eafab8cd3bc1b2c099f20d903ac785a18`).
  최신 Promote에서는 추가 runtime 변경이 없는6개를 재배포하지 않고 분회만 배포했다.
  앞선 전체 FAILED는 분회 실패 때문이며 이번 성공으로 그 배포 잔여가 해소됐다.
- 분회 배포 후 PC/mobile × Demo2역할4조건도 검증했다. 초회3/4 뒤 PC의 초기 카카오 버튼
  로딩 시간 초과1조건을 별도 재실행해 실제 설정 조회200·enabled·버튼 표시와 로그인/권한/로그아웃
  PASS를 확인했다. 앞선8개 origin32조건과 구분해 기록하며 새 분회 결과를 포함한 최종 범위는32/32다.
- 공개 공고 PC/mobile 및 계약14건의 결과는 이전 기록대로 유지한다. 공고 전문을 다시 쓰거나
  시행일 전 운영 정책을 게시하지 않았다. 확인한 날짜는 한국2026-10-12, 시행 예정일은2026-11-13이다.
- 상세 Actions 로그의 추가 허용 도메인은 초안 저장 상태이며 현재 실행 리비전42에는 아직 없다.
  실제 serving 증명은 허용된 GitHub 최종 status 및 Report 성공으로 확인해 그 OPEN을 해소했다.
  초안 저장을 환경 게시/적용 완료라고 기록하지 않는다.

현재 TODO는 ①30일 공고와 시행일 충족 후 새 정책 게시·기존 회원 재동의 운영 검증,
②사용자 본인의 Google·카카오 실제 인증·명시적 계정 연결 확인,
③로컬 테스트 계정 SSOT 확보 후 일반 미가입·대기·반려·정지·탈퇴 상태별 운영 검증이다.
PR #457·#497의 인증 구현/배포·공고 공개·해당 serving SHA의 Demo 검증을 완료했으며 이 세 조건을 완료로 대체하지 않는다.
현재 새 main의 개인정보 최소화·달력 보유기간 정본도 시행 전 최종 문서 대조에 포함한다.

같은 인증 WO의 연속 결과 기록으로 전용 branch를 유지한다. 배포 결과 기록만의 변경은
DEPLOYMENT=NOT_APPLICABLE이다. 자체 local static 서버와 PostgreSQL fixture는 종료했고
일반 상태 계정 SSOT/정책 시행 후속이 있어 WORKTREE_DISPOSITION=KEEP다.


#### 현재 열린 TODO

- [ ] 2026-11-13 시행 예정일과 실제30일 공고 충족 확인 → 새 정책 게시·기존 회원 재동의 운영 검증.
- [ ] 사용자 본인의 Google·카카오 실제 인증과 명시적 계정 연결 결과 확인.
- [ ] 로컬 테스트 계정 SSOT 확보 → 일반 미가입·대기·반려·정지·탈퇴 상태별 운영 검증.


#### 배포·검증 완료 범위 한정 — PR #501 review 보완

위 완료 판정은 인증 PR #457·#497의 배포 증거(API/admin/Neture/KPA Society/강의/매장 `0e1aa41eaf`,
분회 `899e871cce`)와 그 serving에서 실행한32조건에 한정한다. 저장소 최신 HEAD 전체를 배포·검증
완료로 판정하지 않는다. 이후 main에 들어온 [PR #498](https://github.com/Renagang21/o4o-platform/pull/498)
`004a42c0`의 My Home overview·업무 카드·알림 요약 runtime 변경은 해당 serving/32조건에 포함되지 않는다.
이 문서-only 기록 PR #501도 #498의 배포나 운영 smoke를 대신하지 않는다.

- [x] 별도 #498 My Home Delivery·실제 serving·소유 검증 범위 완료 기록 확인(#500, 아래 추가 결과) — 소유 트랙
  [TODO-O4O-MY-HOME-MINIMAL-OVERVIEW-V1](../work-orders/TODO-O4O-MY-HOME-MINIMAL-OVERVIEW-V1.md)에서 당시 OPEN으로 유지했고 이후 완료 기록을 아래에 확인했다.


#### 최신 My Home 소유 트랙 완료 확인 및 추가 인증 검증

위 review 보완 당시 OPEN이었던 별도 #498 항목은 이후 문서 PR #500/main `03aa2824aa`에서
소유 TODO가 COMPLETED로 갱신됐다. 구현 SHA `004a42c012ad8b67a446db373d4de33889c6f4e8`의
Delivery38196926152와 최종 production status는 Neture DEPLOYED/SUCCESS다.
이후 Neture PC/mobile × 매장 경영자/공급자 Demo4조건을 추가 실행해 새 My Home 모아보기
표시·계정 설정 링크 클릭/직접 접근과 기존 로그인·업무 권한·관리 제한·UI 로그아웃·토큰 폐기를
모두 확인했다. 기본32조건(인증 배포 SHA)과 이 최신 Neture4조건을 구분하며 합산된 별도 고유
조건으로 늘려 보고하지 않는다. 일반 상태 계정·본인 외부 OAuth 검증으로도 대체하지 않는다.

- [x] 별도 #498 Delivery·serving·소유 트랙의 명시 검증 범위 완료 기록 확인(#500).
- [x] Neture 최신 My Home의 Demo 인증·계정 설정 진입 PC/mobile4조건 추가 검증.

현재 열린 인증 TODO는30일 이후 정책 적용·본인 외부 OAuth/명시적 연결·일반 상태 계정 SSOT의
세 조건이다. My Home AI 등 소유 트랙의 제외 범위를 이 인증 작업으로 새로 구현하거나 닫지 않는다.

### 일반 계정 상태 검증 재개와 계정 안내 수정 — 2026-10-12

기준 main `63653694b3`에서 실제 공급자 화면 소비처와 상태 source를 다시 확인했다.
`ServiceApplyPanel`의 공통 계정 미완료·정지 안내가 이전 수동 가입 승인 정책을 표시하고,
대표 홈 링크가 `supplier.neture.co.kr/`의 같은 신청 화면으로 돌아가는 문제를 수정했다.
공통 계정 상태 확인 문구와 `neture.co.kr` 공개 대표 홈 주소를 사용한다. 비정상 공통 계정에
새 handoff를 발급하거나 계정·서비스 역할을 바꾸지 않는다.

- 실제 라우트는 `SupplierLandingPage`/`SupplierServiceEntry`가 패널을 사용한다.
  `ServiceUsageGate`는 현재 production 라우트에 소비처가 없다. 처음 이 컴포넌트를 대상으로
  작성한 변경·테스트는 제거했고 실제 노출 화면만 수정했다.
- 최종 서버131/131 PASS: 로그인과 서비스 가입 분리, 메인 정상 계정·이메일 확인,
  공급자 source/기존 신청 거절, DB 현재 정지 판정, 서비스 탈퇴와 공통 계정 분리.
- 최종 화면50/50 PASS: 신청 패널11, 서비스 미가입 진입18, 홈 서비스 상태11,
  역할별 업무 시나리오10. 추가한 공통 계정4조건은 수정 전 실패했고 수정 후 통과했다.
- Neture `tsc && vite build` PASS. 기존 번들 크기·Browserslist 경고는 오류가 아니다.
- 실제 로컬 production bundle × PC/mobile 합성20/20 PASS: 공급자6상태와 공통 계정
  비정상4상태를 각각 두 화면 폭에서 확인했다. canonical 대표 홈 href, 잘못된 승인 문구
  부재, 신청 금지/약관 미확인 차단, 계정 token 유지, 불필요한 POST 없음, JS 오류·모바일
  overflow 없음. 현재 source에서 나오지 않는 supplier `withdrawn`은 방어적 합성 조건뿐이다.
  미사용 gate를 대상으로 했던 최초 브라우저 시도는 timeout 후 중단했으며 PASS 수에 포함하지 않는다.
- `SETUP.md`의 Google 전용 로그인 설명을 현행 세 인증 수단과 Google 개발용 예시로 정정했다.
- `docs/local/TEST-ACCOUNT.txt`는 현재 checkout과 기준 workspace 모두 누락됐다.
  실제 일반 상태 계정의 운영 로그인·업무·상태 변경 검증은 미실행이다. Demo32조건과 위
  합성20조건으로 대신하지 않는다. 비공개 계정 출처를 요청했고 값은 로그·문서에 넣지 않는다.

동일 WO의 보존된 branch에서 실행했다. 새 정책은 게시하지 않았으며 시행 예정일
2026-11-13과 실제30일 공고 조건을 유지한다. main 통합·웹 배포·운영 검증은 별도로 기록한다.

#### PR #504의 대표 홈 세션 복귀 review 보완

초기 `926858beb0` review의 P2 지적은 direct URL이 origin별 localStorage 세션을
대표 홈에 전달하지 않는다는 내용이다. 위 초기 공개 홈 직접 링크 구현은 최종안이 아니다.
현재 사용 중인 `O4OHomeButton`을 계정 상태 안내에 연결해 로그인 중에는
`POST /auth/handoff { targetServiceKey: neture, returnPath: / }`의 검증된 주소로 이동한다.
인증 복구 중에는 버튼을 비활성화하고, 서버의 `403 ACCOUNT_NOT_ACTIVE`는 기존 공통
오류·재시도를 표시한다. 제한 계정을 승격하거나 거절 시 로그아웃하지 않는다.
공통 버튼·handoff 서버·shared contract는 수정하지 않았다.

보완 후 화면53/53 PASS(신청 패널14 + 기존3파일39), Neture tsc/Vite build PASS.
패널 회귀는 발급 성공·제한 거절 후 재시도·인증 복구 중 발급0을 실제 공통 버튼으로
확인하며 source token 유지와 불필요한 신청/logout 호출 부재를 검사한다.
초기 단순 href 검증은 로그인 유지의 증거가 아니며, 최종 브라우저 결과도 별도로 기록한다.

보완된 로컬 production bundle PC/mobile 고유24조건은 최종24/24 PASS다.
앞의20조건에 handoff 성공·계정 제한 거절4조건을 추가했다. 최초22/24에서 제한 거절2조건은
공통 버튼이 header와 패널에 동시에 오류를 표시해 selector가 중복 매칭된 harness 실패였다.
패널 내부의 alert로 범위를 한정하고 해당2조건만 재실행해2/2 PASS를 확인했다.
실제 발급 POST의 대상/returnPath·제한 시 이동 없음·버튼 재활성·source token 보존을
검사했다. 성공 조건은 합성 handoff 주소까지의 이동 확인이며 실제 서버 교환/OAuth를 증명하지 않는다.

#### 제한 계정의 실제 읽기 계약 review 보완

최신 `5a7b534a9d` 재리뷰의 P2 지적은 `users.status=pending` 제한 계정의
`GET /neture/home/entry`가 중앙 allowlist에 없어, 위처럼 주입한 `netureMain:pending`
안내에 실제로 도달하지 못한다는 내용이다. 해당4조건은 메인 이용 상태 안내 분기의 합성
회귀이며 실제 제한 로그인 계정의 HTTP 계약 증거가 아니다.

서버 allowlist는 넓히지 않았다. 실제 `useNetureServiceStates`가 정확히
`403 ACCOUNT_ACCESS_RESTRICTED`를 받으면 기존 허용 경로인 `GET /auth/me`로
본인의 `status=pending && accountAccess=restricted`를 재확인한다. 확인된 경우에도
serviceStates는 null로 유지하며 전용 계정 안내·읽기 재시도·명시적인 공개 메인 링크만
표시한다. 제한 계정에 handoff나 공급자 신청을 제공하지 않는다. 본인 조회 실패·상태 불일치·
다른403/500은 일반 조회 오류로 유지하며 미가입/정상 계정으로 추정하지 않는다.

- 실제 hook과 신청 패널을 함께 사용한 HTTP 응답 통합 회귀8/8 PASS:
  제한403/본인 확인, 확인되지 않은 상태3조건, 본인 조회 실패, 다른 오류2조건,
  서버가 정상 상태로 바뀐 뒤 읽기 재시도로 안내가 전환되는 조건. 최종 관련 화면61/61 PASS.
- 실제 `requireAuth`를 통과하는 중앙 가드 회귀25/25 PASS. 제한 계정의 me는200,
  home/entry와 POST handoff는403이며 handler에 도달하지 않는다. API runtime 수정 없음.
- 최신 로컬 production bundle × PC/mobile 합성30/30 PASS. 기존24조건에 실제 제한
  읽기 응답·본인 조회 실패·정상 전환 재조회6조건을 더했다. 서버 allowlist 계약은 위 중앙
  가드 테스트로 검증하며 브라우저 HTTP fixture는 운영 계정 검증으로 확대하지 않는다.
- Neture tsc/Vite build PASS. 공통 hook/button과 Frozen/권한/DB 구조 변경 없음.

동시에 main에 들어온 Store 직원 최종 승인 트랙 #503은 소유 트랙의 변경이다. 자기 PR에
소유 코드를 복제하지 않으며 통합 시 최신 main을 merge하고 필요한 회귀를 확인한다.
해당 트랙의 운영 rollout 진행 중에는 인증 배포를 겹쳐 실행하지 않는다.

main #503 `64b8df16f1`을 자신의 branch에 merge한 뒤 source 기준 서버7파일
156/156, 화면7파일77/77, Neture tsc/Vite build를 다시 확인했다. 화면77조건은
인증 관련61조건과 해당 main에서 바뀐 My Home·매장 구성원16조건이며 이전 실행과
합산하지 않는다. main의 Staff 승인 구현은 이 인증 PR의 구현으로 보고하지 않는다.

#### PR #504 최종 통합·Neture 웹 배포·운영 회귀 — 2026-10-12

- main #505 반영 후 서버156/156과 Neture tsc/Vite build를 재확인했다. #505는
  API/admin 변경이고 위77조건을 검증한 Neture 구현은 같으며 반복 실행을 더하지 않는다.
- 최종 PR head `c0e7688337ee791852f3af32280deeb00775afa4`의 Codex review는 새 지적 없이
  완료됐다(완료시각 2026-10-12T07:11:25Z). 이전 두 P2 스레드는 해결됐으며 required CI
  [38215572959](https://github.com/Renagang21/o4o-platform/actions/runs/38215572959)는 SUCCESS다.
  active main ruleset을 다시 확인하고 일반 PR merge로
  [#504](https://github.com/Renagang21/o4o-platform/pull/504)를 통합했다.
  main SHA는 `cbdc1619f0c012e3ded925ca02b899795947f86c`이며 post-merge CI
  [38217993155](https://github.com/Renagang21/o4o-platform/actions/runs/38217993155)도 SUCCESS다.
- 일반 Delivery38218878433는 LEVEL3 보류, read-only Promote dry-run38219899889는
  `HELD_API_NOT_DEPLOYED`였다. 판정 이유는 별도 API commit `c9b630feb`에 작업 식별 키가
  없어 관련성을 판단할 수 없다는 것이다. #505 WO에서 제외한 운영 migration을 실행하거나
  commit 이력·classifier·production status를 고쳐 자동 승격 판정을 만들지 않았다.
- 이미 승인된 Neture 웹 배포는 기존 owner 전용 `deploy-web-services.yml`의
  `service=neture, rollout_mode=verified, ref=main` 경로로 실행했다.
  [38220652882](https://github.com/Renagang21/o4o-platform/actions/runs/38220652882)의
  고정 대상 SHA는 위 `cbdc1619f0`이다. CI Gate·freeze·소유자·production ref 검사를
  유지했고 build/push, Cloud Run 배포, 신규 revision smoke와 traffic 전환, verify 단계가
  모두 SUCCESS였다. 다른 서비스는 skipped이며 이 실행의 API 배포·migration은0이다.
  workflow·IAM·freeze·환경 설정 변경이나 admin bypass는 없다.
- 운영 Neture HTML200·asset200, 실제 asset의 신규 계정 안내·제한 계정 본인 읽기 분기·
  공개 메인 label·`ACCOUNT_ACCESS_RESTRICTED` 포함을 확인했다. bundle SHA256은
  `5866714efd98eb9b33bdd8b4fe6e5c32634ea922e48b5848a3497aa51c009457`이다.
  이는 코드 서빙 증거이며 실제 제한 일반 계정 로그인 증거로 대신하지 않는다.
- 실제 로그인 화면의 Demo 버튼으로 PC/mobile × 매장 경영자/공급자4조건을 실행했다.
  최초3/4 PASS에서 PC 매장 경영자는 login200 이후 업무 화면 이동 대기 timeout이었다.
  해당1조건만 변경 없는 앱·동일25초 timeout으로 재실행해1/1 PASS, 최종 고유4/4 PASS다.
  최초 실패와 재실행을 보존했고 첫 timeout의 원인은 확정하지 않는다.
- PC 매장 경영자 재실행에서 실제 handoff200·exchange200·Store 업무 진입을 확인했다.
  네 조건에서 Neture My Home 모아보기·계정 설정 링크/직접 접근, 본인 me200,
  관리자403 `ROLE_REQUIRED`, Demo 소셜/비밀번호 관리 불가, 역할별 업무 API를 확인했다.
  매장 경영자는 Store context200이고 공급자는 `STORE_OWNER_REQUIRED`403이 기대 결과다.
  공급자 products200, 매장 경영자의 공급자 products403 `NO_SUPPLIER`도 기대 결과다.
- Neture UI logout200, source access401·refresh401, 다른 origin인 Store의 세션200을
  확인했다. smoke에서 만든 source/Store 세션만 정리했다. 카카오 설정200·버튼 노출 확인은
  본인 카카오 실제 인증·계정 연결 완료를 뜻하지 않는다.
- 배포 후 GCP serving label을 별도로 재조회한 dry-run38221323572는 SUCCESS였으나
  해당 artifact 다운로드는 프록시403으로 실패했다. 추가 권한 실행은 사용자 중단으로
  미실행됐고 동일 자료 접근을 우회하지 않았다. 따라서 exact serving label 재확인 완료로
  기록하지 않는다. 위 배포 대상·성공 및 실제 bundle·운영 동작으로 확인한 범위만 완료다.
  통합 production 상태의 별도 API/admin 보류를 전체 배포 완료로 바꾸지 않는다.

최종 열린 TODO는 일반 계정 SSOT 확보 후 실제 상태별 운영 검증, 사용자가 담당하는
본인 Google·카카오 인증·명시적 연결 결과, 2026-11-13 이후 실제30일 공고 확인과 새 정책
게시·기존 회원 재동의다. 로컬 합성30조건·운영 Demo4조건을 앞선 전체 서비스32조건에
더해 새로운 고유 조건 수로 보고하지 않는다. 일반 계정 파일은 현재 클라우드에 없고
새 정책 게시도 미실행이다. 이번 완료 기록은 문서-only/DEPLOYMENT=NOT_APPLICABLE이며
자체 local 서버 종료·테스트 소유 세션 정리 후 동일 WO 후속을 위해
WORKTREE_DISPOSITION=KEEP로 남긴다.

#### 기준 계정 파일 확보와 운영자 검증 소유 확인 — 2026-10-12 후속

사용자가 계정 원문을 다시 제공해 `docs/local/TEST-ACCOUNT.txt`를 덮어썼다.
제공 내용 일치·파일 존재·Git 추적 제외를 확인했고 기존 입력을 추측한 주소나 비밀번호로
고치지 않았다. 과거 파일 미확보 기록은 그 조사 시점의 결과다. 현재는 파일 확보 완료이며,
실제 로그인 가능 여부와 계정의 검증 용도는 별도 판정한다.

처음 일반 테스트 계정으로 해석해 제공3계정의 `POST /auth/email/login`을 확인했으나
모두401 `INVALID_CREDENTIALS`였다. Neture PC 직접 입력1조건에서도 같은 응답과 실패 안내를
확인했다. 이 응답은 계정 없음·비밀번호 수단 없음·비밀번호 불일치를 합친 계약이므로
계정 미등록·서비스 권한 문제·인증 코드 결함 중 하나로 확정하지 않는다.
로그인 실패 제한은15분 실패5회이며 반복 대입을 확대하지 않았다.

이후 사용자는 **제공 Gmail 계정은 모두 운영자이며 운영자 테스트는 사용자가 담당**한다고
확인했다. 이 최신 지시를 로컬 기준 파일의 설명과 WO에 반영하고 초기 운영자 probe helper는
재실행 시 인증 요청 없이 종료하도록 했다. 사용자 확인 이후 운영자 비밀번호 로그인,
운영자 역할 조회·변경, 실제 Google 인증은 실행하지 않았다. 이 분류는 사용자 확인이며
운영 DB의 역할·credential 상태를 조회해 입증한 결과는 아니다.

자동 검증의 대상은 현행 `packages/auth-utils/src/demoAccounts.ts`와 로그인 화면의 공개 Demo
버튼이다. 공급한 Gmail 원문을 공개 Demo 주소로 바꾸지 않았고 운영자 정보·비밀번호를
tracked 문서에 복사하지 않았다. Neture PC에서 두 Demo 버튼의 로그인·업무 진입·권한·
UI logout·세션 폐기를 비교 확인해2/2 통과했다. 아래 전체 재실행에 포함되는 같은 조건이므로
서로 더해 새 고유 조건 수로 보고하지 않는다.

유지8 origin의 비로그인 화면 PC/mobile16조건도 확인했다. 이메일 폼 표시·입력과 가로 overflow
부재, 강의의 Neture `service-entry/lecture` 진입을 확인해16/16 통과했다. 이는 로그인 완료
검증이 아니다. 이 단계의 카카오 버튼 즉시 표시 관찰값은 설정 로딩 대기·노출 검증을 거치지
않았으므로 성공/실패 판정에 쓰지 않으며 실제 Demo 회귀의 대기 후 검증과 구분한다.

#### 운영자 제외 후 공개 Demo 운영8 origin 재검증

사용자 확인 이후 운영자 계정은 자동 검증에서 제외하고 실제 화면의 두 Demo 버튼을 눌러
새 Chromium browser context로 전 조건을 실행했다. PC1440×900/mobile390×844 viewport이며
TLS 검증과 기존 프록시를 유지했다. fixture·인가 우회·계정 생성·역할/membership 변경은 없다.

| 운영 origin | PC 매장 경영자 | PC 공급자 | mobile 매장 경영자 | mobile 공급자 |
|---|---|---|---|---|
| neture.co.kr | PASS | PASS | PASS | PASS |
| supplier.neture.co.kr | PASS | PASS | PASS | PASS |
| community.neture.co.kr | PASS | PASS | PASS | PASS |
| funding.neture.co.kr | PASS | PASS | PASS | PASS |
| pharmacy.neture.co.kr | PASS | PASS | PASS | PASS |
| store.neture.co.kr | PASS | PASS | PASS | PASS |
| study.neture.co.kr | PASS | PASS | PASS | PASS |
| kpa.neture.co.kr | PASS | PASS | PASS | PASS |

- 최종 **32/32 PASS**, 해당 Demo 실행의 실패·재실행0. 초기 운영자 입력 probe와
  구분하며 비교용 Neture PC2조건·기존32조건을 더해 새로운 고유 조건 수로 늘리지 않는다.
- 모든 조건의 실제 로그인200·본인 me200, UI origin 유지와 `status/accountAccess` 계약 확인.
  Demo 설정의 소셜/비밀번호 `canManage=false`, 관리자403 `ROLE_REQUIRED` 확인.
- 매장 경영자는 Store context200·공급자 상품403 `NO_SUPPLIER`, 공급자는 상품200·
  Store context403 `STORE_OWNER_REQUIRED`. 공급자의403을 약국장 업무 실패로 판정하지 않는다.
- 실제 UI logout200, 이전 access401·refresh401. 각 조건에서 생성한 테스트 소유 세션만
  정리했다. Neture 매장 경영자의 실제 Store 이동·handoff200/exchange200와 Neture
  로그아웃 후 다른 origin인 Store의 me200을 PC/mobile에서 확인했다.
- 카카오 config200/enabled와 로딩 완료 후 실제 버튼 표시를 확인했다. 강의는 자체 소셜
  폼 대신 Neture `service-entry/lecture`로 연결된다. 실제 Google·카카오 인증이나 연결
  완료를 뜻하지 않는다. 운영자 검증과 일반 상태별 실제 계정 검증도 대신하지 않는다.
- 소스 조사/기록 기준 checkout은 main `6210fb7ed3`이며 이 SHA 전체의 runtime 배포
  확인을 뜻하지 않는다. 이번 검증은 해당 실행 시점의 실제 운영 URL·UI·API 응답에 한정한다.
  새로운 GCP serving label 조회·배포·migration은 실행하지 않았다.

현재 기준 계정 파일은 확보했다. 일반 미가입·대기·반려·정지·탈퇴의 비운영자 계정은
별도 필요하며, 운영자 및 본인 OAuth/명시적 연결은 사용자가 담당한다. 새 정책은
2026-11-13 이후 실제30일 공고를 확인하고 게시·재동의를 검증한다. 앱 코드 변경 없이
기존 WO/CHECK에만 결과를 반영했고 DEPLOYMENT=NOT_APPLICABLE이다.
같은 미완료 WO의 후속을 위해 WORKTREE_DISPOSITION=KEEP로 남긴다.

### 제공 테스트3계정 전체 전환 — 로컬 검증,2026-10-12

최신 사용자 지시는 제공 경영자·공급자·직원3개를 모두 테스트 계정으로 확정하고 버튼과 데이터 연결까지 전환하는 것이다. 앞선 운영자 분류는 이3개에 적용하지 않는다. 실제 별도 Google 운영자/OAuth 검증은 사용자가 담당한다. 비공개 원본은 `docs/local/TEST-ACCOUNT.txt`에 유지하고 Git에서 제외한다.

- 공통 config3개·Neture staff 착지·server registry type·provision/census/cleanup 소비처를 수정했다. 기본 경영자/공급자 provision과 기존 business user UUID는 유지하고, 별도 직원 reconcile로 기존 Demo 약국 staff 관계와 `kpa:store_member`만 연결한다.
- read-only plan/digest, SERIALIZABLE apply, 감사 before/after image, 충돌·특권·provider·pending operator 초대 중단, 원자 세션 family 폐기와 멱등을 구현했다. 공개 artifact에는 사용자 ID/개인정보/비밀번호/hash를 출력하지 않는다.
- API 및5웹(Neture·Store·Lecture·KPA Society·KPA Branch) build, CLI typecheck 통과. `@o4o/ui`의 stale dist로 처음 Neture build가 실패했고 최신 shared package rebuild 후 통과했다. 관련 없는 source 수정은 없다.
- Vitest UI17, 실제 격리 PostgreSQL DB9, census/cleanup24, migration contract21, 기존 배포/PH 경계114 모두 통과했다. DB9 중7은 정확한 격리 DB opt-in이며 기본 CI에서는 skip,2 gate만 실행된다.
- 정식 migration runner로 합성 빈 DB에 bootstrap+25단계를 적용해 pre/post fingerprint를 확인했다.25단계는 `9f5faca8de1ce52bffb855460715a98129326c6caa0de0bb5de4c55551e02641`,6618줄이다. down/up24/25 hash roundtrip과 staff row가 있을 때 down 거절도 통과했다. 운영 DB에는 실행하지 않았다.
- 실제 새 build 산출물을 사용한 로컬 브라우저48/48조건(8 origin×PC/mobile×3계정)에서 각 버튼·정확한 credential POST·실패 후 재시도·overflow/JS error를 확인했다. API는 합성 응답이므로 실제 운영 로그인 성공 증거는 아니다.
- origin/app 정본: neture/supplier/community/funding→Neture, pharmacy→KPA Society, store→Store, study→Lecture, kpa→KPA Branch. 최초 fixture54조건의12실패는 잘못된 community 응답과 가상 branch host/base경로였다. 정확한 정본으로 community6·pharmacy6·kpa6 재확인 후 유효48조건 모두 통과했다. 최초 실패와 수정 결과는 비공개 helper artifacts에 함께 보존했다.

현재 운영 계정 전환·migration·신규 배포·신규3계정 운영48검증은 실행0이다. 앞서 기존 Demo32운영 통과는 과거 checkpoint이며 이번3계정 전환의 운영 성공을 의미하지 않는다. 직원 migration25 앞의23/24는 [별도 개인정보 WO §10](../work-orders/WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1.md)의 운영 승인 범위 밖이다. main 통합 이후 실제 read-only plan의 schema history로 적용 필요성을 먼저 판정한다.

PR #521의 첫 리뷰 P2 두 건은 수용했다. legacy foundation provision은 활성 registry와 새 credential 주소가 다르면 어떤 쓰기보다 먼저 reconcile을 요구한다. 기존 provision의 credential·registry·관계 write도 같은 SERIALIZABLE QueryRunner transaction으로 묶어 중간 실패 시 공개 credential만 남지 않도록 했다. reconcile은 경영자·공급자의 미래/만료 role을 중단하고, 직원의 활성 기간 오류도 임의 연장/중복 부여하지 않는다. legacy registry 보호와 경영자 미래/공급자 만료 role의 실제 격리 DB 회귀3조건을 추가했다.

리뷰 수정 후 DB12/12(격리 integration10+기본 gate2), CLI3개 typecheck 및 API build를 재확인했다. 정식 foundation `--apply`도 격리 legacy registry에서 전환 필요 오류로 쓰기 전에 중단하여 target Gmail orphan0·기존 사용자2 보존을 확인했다. 최신 main의 Store bundle PC/mobile6조건도 재확인 통과했다.

최신 PR CI38266255821은 API shard2가 실패했다. 원격 로그 다운로드는 sandbox escalation 재시도도 proxy403이었으며, 로컬에서 동일 shard2를 실행해 `supplier-domain-boundary.spec.ts` §8-b의 신규 CLI legacy `user_id` lookup을 재현했다. contract/allowlist를 완화하지 않고 CLI inventory를 canonical supplier 조직의 활성 owner 관계로 한정했다. 무관한 조직의 PENDING supplier에 같은 legacy pointer가 있어도 canonical Demo inventory에 섞지 않고 해당 행을 변경하지 않는 실제 DB 회귀를 추가했다.

운영 CLI의 기존 sanitized summary를 native Actions notice에도 남겨 mode/schema history/검토 digest/변경 건수를 GitHub API에서 직접 확인할 수 있게 했다. raw snapshot·ID·credential 원문·비밀번호 hash는 공개하지 않는다. 새 DB fixture 최초 시도는 기존 unique legacy-pointer 제약에 걸렸으므로 canonical 행의 nullable legacy pointer를 비운 뒤 무관한 행의 pointer drift를 모델링하도록 수정했다. 운영 schema 제약을 바꾸지 않았다.

공급자 정본 수정 후 집중 회귀54/54(격리 DB13+공급자 경계41) 및3 CLI typecheck PASS. 기존 보호/provision source contract35도 PASS. 한국시간2026-10-13에 후속 수정 push·최신 CI/review를 진행한다. 운영 변경은 여전히0이다.

로컬 전체 shard2 진단은165 suites 중160 PASS·3 skipped·2 FAIL,2769조건 중2739 PASS·28 skipped·2 FAIL이었다. 두 실패는 신규 CLI의 공급자 legacy 조회와 은퇴 `operator_invitations` 참조였다. 후자는 현행 runtime 금지 계약에 따라 제거했다. 새 예외/기능 복구/테이블 삭제는 하지 않는다. 현행 역할·provider identity 보호와 Demo 지정 후 권한/인증수단 변경 guard는 유지한다. 최초 구현 기록의 pending 초대 보호는 최종 구현에 포함하지 않는다.

최종 집중 회귀70/70(격리 DB12·공급자 경계41·Google 은퇴 경계17), CLI3개 타입 검사 및 DB binding 누락 시 native sanitized error annotation 검증 PASS. 최종 구현의 실제 DB 조건은12개다. 전체 CI를 다시 확인하며 실패 gate를 우회하지 않는다.

최신 main 동기화 후 리뷰의 필수 서비스 연결 지적도 수용했다. 경영자/공급자/직원 모두 foundation과 동일한 required membership map을 사용한다. 없어진 연결만 생성하고 비활성/제한된 연결은 자동 복구하지 않는다. plan의 membership readiness와 mutation intent digest를 추가했다. 기존 owner Lecture 누락을 복구한 뒤 user ID·ownership 보존/멱등을 확인했고 owner·supplier suspended Lecture를 유지하는2조건도 통과했다. 집중 회귀108/108(격리 DB15+공급자41+Google 은퇴17+기존 Demo/provision35),3 CLI typecheck PASS. 동기화된 PH inventory 회귀15도 PASS. 운영 반영은 아직0이다.

최종 리뷰의 운영 후보 분류 누락 P1을 수용했다. scripts inventory에 새 reconcile entry를 ACTIVE로 등록하고 service module은 dependency임을 명시했다. 기존 foundation 생성기는 PAUSED로 기록해 이번 운영 전환에서 실행하지 않는다. Canonical Demo의 명령 설명도 같은 분류로 정합했다. 같은 사용자 지시·현재 인증 WO·기본 plan/digest/보호/transaction 및 기존 WIF DB identity를 등록 근거로 남겼다. ACTIVE/PAUSED 모두 DB_USERNAME/DB_NAME 공백을 접속 전에 거절하도록 inline 필수 검사를 보완했다. 이 등록은 별도23/24 migration이나 일반 사용자/운영자 수정의 승인이 아니다.

도구 분류 보완 후 DB identity/provision 계약44,3 CLI typecheck, username 미설정/공백의 접속 전 거절2조건, docs 민감정보 guard3878파일 모두 PASS. API scripts inventory 분류를 완화하지 않고 실행 후보와 이번 실제 운영 경로를 명시했다.

운영 관계 전수와 단일 공급자 컨텍스트 지적 P1/P2를 수용했다. 새 CLI는 기존 `findStoreOrganizationCandidates(kpa)`와 `listSupplierCandidates`를 직접 재사용한다. store owner의 다른 active 약국 admin/manager 관계도 포함해 후보1개·의도한 owner를 요구하며 canonical supplier 후보도 ACTIVE1개만 허용한다. 후보 결과는 private before-image/digest에 포함하고 공유 credential 변경 전 실패한다. 다른 약국 admin·manager2조건과 복수 supplier1조건을 실제 DB에서 재현해 사용자 주소·감사 write0을 확인했다. 집중 회귀111/111(격리 DB18+공급자41+Google 은퇴17+Demo/provision35),3 CLI typecheck PASS. 운영 write·신규 배포·신규3계정 운영 검증은 아직0이다.

main #522의 PH scoped purge workflow 추가 때문에 #521 mergeability가 dirty가 되어 CI trigger가 생성되지 않았다. 자기 branch의 승인된 main merge에서 공용 workflow4조건을 병합했다. 새 Demo는 PH purge와 동시 선택을 startup gate에서 거절하고 각 proxy/public-path/default cutover/backup의 독립 실행 제외 조건을 모두 보존했다. 실제 bash gate의 standalone Demo plan/apply 허용·PH/다른 Demo 동시 선택·다른 actor/ref/frozen write 거절, 기존 PH purge/job 안전 회귀14/14 PASS. PH 운영 run38319576225는 다른 작업이며 변경/취소하지 않았다. 이번 인증 운영 write0을 유지하고 실제 종료/정상 WIF를 확인한 후 진행한다.

반대 도메인 관계 노출 지적 P1을 수용했다. 모든 identity의 active 조직 관계가 의도한 pharmacy owner/staff 또는 supplier owner만 가리키는지 확인한다. 매장 계정의 legacy supplier pointer도 기존 resolver에 둔 read-only probe로 확인하고 공유 credential 적용 전 거절한다. 기존 resolveSupplierForUser의 fallback logger로 private ID를 출력하지 않으며 probe는 supplier를 선택하거나 접근 권한을 주지 않는다. owner의 다른 supplier 소유, supplier의 store manager 관계, owner/staff legacy pointer4조건에서 변경 전 거절을 확인했다. 집중115/115(격리 DB22+공급자41+Google 은퇴17+Demo/provision35),3 CLI typecheck PASS. runtime supplier resolver의 기존 선택·fallback·권한 동작은 변경하지 않았다.
