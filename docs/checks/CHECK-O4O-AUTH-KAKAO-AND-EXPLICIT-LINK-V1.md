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
