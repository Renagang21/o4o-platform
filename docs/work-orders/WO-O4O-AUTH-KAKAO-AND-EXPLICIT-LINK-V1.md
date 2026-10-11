# WO-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1

> 상태: IN PROGRESS · 2026-10-09 · 상위: [인증 리팩터링 WO](WO-O4O-AUTH-REFACTOR-V1.md) 단계 4
> 근거: 사용자의 카카오 추가·명시적 계정 연결 기획과 TODO → 코드/문서 검증 → TODO 수정 → 작업 진행 지시.
> 정책: [인증·서비스 가입](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md), [Demo](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md).

## 실행 범위

계정은 `users.id`, 소셜 식별자는 `(provider, providerId)`다. 이메일 동일성으로 자동 연결·병합하지 않는다.
가입·로그인·연결은 서비스 가입, 역할, 조직 소유권을 만들거나 합치지 않는다. 전체관리자는 Google로
실제로 인증한 세션만 사용한다. Demo는 소셜 연결·인증수단 변경 대상에서 제외한다.

상위 WO가 승인한 Auth Core/shared contract 예외 안에서 세션 수단과 provider 처리를 구현한다.
F10/F11 본문, `users`/`service_memberships`/`role_assignments` 구조는 변경하지 않는다.
운영 DB 적용·외부 앱 설정·main 통합은 구현 및 로컬 검증과 구분한다. 4-A는 PR #387로 먼저 통합·배포했다. 사용자 동시 구현 지시에 따라 4-B/4-C는 일회용 증명
원장을 공유하는 후속 PR로 함께 검증·push한다. 동일 WO의 연속 작업으로 준비된 격리 checkout을
유지하며, 최신 main 반영·필수 CI·review 후 새 PR의 main 통합 승인을 받는다.

## 문서·코드 조사로 수정한 TODO

| ID | 초기 항목 | 확인한 근거 | 수정한 실행 항목 / 상태 |
|---|---|---|---|
| D01 | 기존 카카오 기능 재사용 | `modules/auth/routes/auth.routes.ts`, `config/app.config.ts`: passport OAuth는 은퇴. `.env.example`의 KAKAO 이름은 실행 경로가 아니다 | 신규 서버 검증 OAuth 구현. 기존 passport·settings 경로 복원 금지 |
| D02 | 카카오 로그인 버튼 추가 | `auth-react/LoginMethods.tsx`, Neture `LoginModal.tsx`·`EmailAuthPages.tsx`: 공통 조립과 직접 Google 조립 소비처가 공존 | 공통 컴포넌트 + 모든 실제 진입점을 함께 연결; 전체관리자 제외 |
| D03 | 인증 수단 표시 | `types/auth.ts`: password만 명시; Google 발급은 claim 없음. `handoff.controller.ts`는 password가 아니면 Google로 추정 | **선행 4-A**: Google/password/Kakao 명시, 관리자 Google 긍정 판정, refresh·handoff 승계 |
| D04 | handoff 수단 보존 | `AddHandoffTokenSourceAuthMethod1790684000000`: CHECK가 Google/password만 허용 | 새 incremental migration으로 Kakao 허용. 기존 적용 migration·baseline 수정 금지; PG15 fingerprint 검증 |
| D05 | 동일 이메일이면 연결 | `google-identity.service.ts`는 sub 조회, `google-auth.service.ts`는 이메일 충돌 거절; Google 연결 라우트는 은퇴 | 새 명시적 연결 흐름: 현재 계정 재인증 + 연결할 provider 인증, 다른 users.id 연결은 충돌 거절 |
| D06 | 카카오 확인 이메일 사용 | `users.email`의 NOT NULL/UNIQUE, 메인 가입 정책의 이메일 확인·이름·모바일·약관 요구 | 카카오가 이메일 소유를 확인하지 못하면 O4O 확인 절차. 임의 이메일·provider 응답만으로 verified 처리 금지 |
| D07 | state/PKCE 구현 | 현재 카카오 코드 없음. 초기 공식 REST 조회는 프록시 403이었으나 2026-10-10 재조회 HTTP 200 | 공식 REST의 confidential client/code/state 계약 적용; 서버 일회용 state·브라우저 바인딩·redirect 검증 구현. 조회한 계약에 PKCE 항목이 없으므로 지원 여부는 단정하지 않음 |
| D08 | 설정이 없으면 새 키 요청 | 환경 binding/변수 이름에 KAKAO 없음; deploy API도 KAKAO 참조 없음. 운영 Secret Manager 실제 존재 여부는 미확인 | 값 요청 전에 기존 운영 설정 조회 경로 조사. 공식 도메인만 초안 저장; 자격정보 미확인과 부재를 구분 |
| D09 | 기존 두 계정 병합 | 상위 WO: 연결과 두 users.id 병합은 별개 | 양쪽 소유 증명·유지 계정·가입/권한/사업자 충돌안을 별도 검토. 권한 합집합·소셜 자동 이동 금지 |
| D10 | 이전 단계 문서 완료 | PR #382 main `2002214684`, 통합 후 CI #37892227465 성공 | 단계 3 검증 기록 통합 완료. Identity V3의 오래된 로그인/카카오 제한 문구와 MYPAGE의 password UI 미구현 서술은 별도 문서 정합 TODO |

## 4-A. 세션 인증 수단·전체관리자 경계 (PR #387 통합·배포 완료)

- [x] 최신 main `01a47e6d4c`에서 새 branch `wo/auth-refactor-phase4` 시작; 준비된 격리 클라우드 checkout 사용.
- [x] 정책·token issuer·request guard·refresh·handoff 원장/교환 소비처 조사.
- [x] Google 발급 access/refresh에 `authMethod: 'google'` 명시; password 표식 유지; Kakao 타입 추가.
- [x] 요청·refresh·handoff에서 전체관리자/`platform:*`는 `authMethod === 'google'`만 허용.
- [x] 수단 없는 이전 토큰·미지 값은 Google로 승격하지 않음. 일반 서비스 기존 세션은 유지하고 관리자 재로그인 필요를 기록.
- [x] 세 인증 수단의 refresh·handoff 승계와 역할 부여 후 거절, optionalAuth의 비로그인 처리를 검증.
- [x] handoff CHECK 확장 migration·manifest·PG15 expected fingerprint·up/down 재현 검증.
- [x] Google/email 가입, 브라우저 로그아웃, 비밀번호 보안 폐기, 서비스 접근 회귀·type-check·lint·build.
- [x] [CHECK](../checks/CHECK-O4O-AUTH-REFACTOR-PHASE4A-V1.md)와 TODO를 로컬 실제 결과로 갱신; commit·push·PR 준비.
- [x] 사용자 승인 후 PR #387 main 통합 `7a11f7d201`; 통합 후 CI #38011262475 PASS, CodeQL PASS. 비필수 Sonar 중복률 실패는 OPEN으로 기록.
- [x] Promote #38011885470 성공: API migration·revision 검증·traffic 전환, 전체관리자·웹 5개 배포.
- [x] 유지 8개 서비스 PC/모바일 Demo 32/32 PASS, Neture 실제 업무 목적지 이동 4/4 PASS.
- [ ] 실제 Google 전체관리자 재로그인 (실제 소유자 인증은 미실행).

## 4-B. 카카오 로그인·가입

- [x] 공식 Kakao REST 조회 HTTP 200; client secret·고정 callback·state·prompt=login 계약 확인.
- [x] 기존 배포/WIF 조회 경로 조사; optional metadata-only 조회와 Secret Manager resource binding 구현. 실제 키 존재·권한은 미확인이며 부재로 판정하지 않음.
- [x] 설정 3개가 유효할 때만 공통 버튼·enabled 공개; 전체관리자 origin에서는 비활성화.
- [x] 서버 code 교환, 고정 client/redirect, timeout·redirect 제한, 안전한 오류 응답·진단 마스킹, Kakao 고유 ID 검증.
- [x] 5분 일회용 state·HttpOnly 브라우저 binding·origin·용도 분리; 재사용·만료·동시 소비 검증.
- [x] provider ID 조회; 이름·모바일·약관 가입, provider가 확인한 입력 이메일만 verified. 그 외 기존 O4O 확인 메일·세션 미발급.
- [x] 동일 이메일 충돌 거절; 사용자·provider uniqueness 및 transaction rollback 검증.
- [x] migration 21 원장·Kakao 제약, manifest·PG15 fingerprint; up/down/up·정식 runner·멱등성 검증.
- [x] Neture modal/가입, Store, KPA Society, KPA Branch login/join 연결; Lecture는 기존 Neture 계정센터/handoff 사용. Neture callback returnTo·fragment 소비 검증.
- [x] 관련 단위·실제 PG 통합·build/type-check/lint, production bundle 가입 UI PC/모바일 8건 (API/provider mock).
- [x] 사용자 승인 후 PR #392 main `26b98a33c1` 통합; exact-head CI/review 및 post-merge CI #38019181483·CodeQL PASS. Promote #38019828704 API·전체관리자·웹 5개 운영 배포 SUCCESS.
- [x] 배포 후 유지 8개 origin × PC/mobile × 매장 경영자/공급자 Demo 32/32 PASS; 신규 소셜 계정 조회의 Demo 변경 차단, 업무 역할 경계, access/refresh 로그아웃 폐기와 다른 origin 세션 유지 확인.
- [x] 운영 앱·REST ID·고정 callback·Secret Manager binding·runtime 접근자 구성 확인; API 설정 배포 #38029009245 후 유지 8개 origin enabled=true, 전체관리자 false.
- [ ] 실제 Client Secret/provider code 교환·로그인/가입/handoff PC·모바일 smoke. 사용자의 가입 시도에서 전역 SQL 문자 검사 오류가 보고돼 수정·재배포 후 재검증 필요.
- [ ] main Sonar 비필수 Quality Gate 실패 범위 조사: PR 분석은 PASS, main 분석 hotspot 76건·중복률 14.2%·신뢰성/보안 E. 복원 후 허용 도메인 포함을 확인했으나 공개 API는 원격 HTTP 403; 상세 영향은 미확인. 접근 가능 후 인증 변경 영향부터 확인.

## 4-C. Google·카카오 명시적 계정 연결

- [x] 현재 계정 password 또는 현재 연결된 provider 재인증; Google fresh nonce/iat, Kakao 재인증 요청. 짧은 연결 권한을 users.id·browser session·security family·origin에 바인딩.
- [x] 별도 target provider 증명 후 확인 버튼에서만 현재 users.id에 연결; GET callback은 redirect/read-only.
- [x] Demo 변경·다른 users.id provider 이동·기존 동일 provider 교체 차단; 재사용/동시 충돌/rollback/로그아웃·password family 변경 검증.
- [x] 동일/상이 이메일 모두 자동 병합 없음. role·membership·조직·security family 변경 없음.
- [x] 해제·두 users.id 병합은 구현하지 않음. 마지막 수단 제거 경로 없음.
- [x] Neture/KPA 내 설정에 공통 계정 보안 화면; Store·Lecture는 기존 계정센터 경로 유지. UI 순서·Demo 차단 회귀 검증.
- [ ] 실제 Google/Kakao 재인증·연결·취소·충돌 PC/모바일 smoke (실제 소유자 인증 필요).
- [ ] 두 기존 users.id 병합이 필요하면 별도 충돌 계획·사용자 검토.

## 환경·검증 경계 (PR #392/396 당시 관측)

`cloud-environment-onboarding:setup`으로 준비한 격리 checkout/toolchain을 재사용한다. 현재 공식
Kakao REST 접근은 HTTP 200이다. 실행 환경에 GCP identity/Kakao credential binding은 없으며,
운영 조회·배포는 저장소의 승인된 main WIF workflow로 진행한다. GitHub secrets/variables metadata
조회 403은 키 부재 증거가 아니다. main WIF metadata smoke #38019189395는 GCP 인증·Cloud Run
조회에 성공했으나 `secretmanager.secrets.list` 권한 부족으로 리소스 목록을 확인하지 못했다.
조회 당시 API 리비전에는 KAKAO 설정 이름 3개가 없었고, 새 배포 후 8개 origin 모두
공개 config HTTP 200 / `enabled=false`다. 기존 앱·Secret Manager 리소스 부재로 단정하지 않는다.
키 값·secret version·계정 토큰을 채팅/문서/로그에 기록하지 않는다.

4-A 및 4-B/4-C 코드의 운영 배포는 완료다. migration 21을 포함한 승인 이미지의 정식 migration
Job·API revision 검증·traffic 전환과 전체관리자/웹 배포가 성공했다. 기존 Kakao 리소스 조회 권한,
앱/키 binding·callback 등록, 실제 Google/Kakao 소유자 인증·연결 smoke는 OPEN이다.
검증 상세와 OPEN 조건은 [CHECK](../checks/CHECK-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1.md)를 따른다.

후속 WIF metadata #38024302858 역시 인증·Cloud Run 조회 SUCCESS 후 Kakao metadata FAIL이다.
새 로그 저장소 host의 proxy 차단으로 이번 세부 원인은 미확인이다. 정확한 host 추가는 환경
초안에 저장했으며 게시·접근 반영은 별도다. 기존 앱·리소스 조사는 권한과 로그 확인 후 이어간다.
PR #396은 검증 기록 세 문서의 통합이며 추가 런타임 배포 대상이 아니다.

## 2026-10-10 운영 활성화 후 오류 수정 TODO

동일 WO의 연속 Phase로 기존 격리 checkout·branch를 유지한다. API 설정 배포는 완료했으나
실제 소유자 가입 성공으로 보고하지 않는다. 설정 배포 이후의 관측은 아래 및 CHECK를 따른다.

- [x] API-only verified 배포 #38029009245 (`2a92ce24cf`): CI·정식 migration Job·revision readiness·traffic 전환·전환 후 health PASS.
- [x] 실제 Demo PC/mobile 32/32 및 Neture Demo 변경 차단 2/2 PASS. Lecture는 문서대로 Neture 계정센터 진입을 검증하며 자체 카카오 버튼을 요구하지 않음.
- [x] 카카오 실제 UI 시작·provider 로그인 화면 redirect 요청 4/4 확인. 계정 소유자 인증·token 교환 완료와 구분.
- [x] 사용자 오류 경로가 고정 callback이며 code의 `--`가 차단 원인임을 확인(원문 값 저장 없음). 합성 callback 입력으로 전역 SQL 문자 오탐 재현; code뿐 아니라 generated state/flow token과 Google ID token의 같은 문자 가능성도 확인.
- [x] 등록된 소셜 method/path/field의 제한된 형식·길이만 문자 휴리스틱에서 제외. 다른 필드·경로의 검사, origin·일회용 hash flow·binding·provider 검증 유지. 수정 전 새 회귀 11 FAIL/13 PASS → 수정 후 관련 3 suites/79 PASS; type-check·lint·API build PASS.
- [x] 오류 수정 PR #401 required CI·review blocker 0 확인 → 사용자 main 통합 승인 → main `73cd907d20` → API-only Promote #38035112556 SUCCESS. post-merge CI #38034473790·CodeQL #38034473752 PASS; 운영 callback 합성 입력·Demo 재검증 PASS.
- [ ] 실제 소유자 가입·로그인·연결 재검증. callback 수정 배포와 외부 계정 인증 완료는 구분.
- [ ] 실제 취소 callback의 브라우저 복귀 재검증. 시작 4건은 성공했지만 초기 harness의 취소 UI는 1건 HTTP 400/3건 transport failure였으며, 진단용 같은 binding의 직접 GET은 303이었다. 원인을 임의 확정하거나 취소 성공으로 계산하지 않음.
- [ ] 후속 개인정보 처리방침: 사용자 제보의 읽기 어려운 표시 방식과 리팩터링 전 내용을 조사해 수정안 작성·검토. 동의 UI와 정책 문서/API 소비처를 함께 확인하고 승인된 정책 내용으로 갱신.

## 2026-10-10 홈 카카오 버튼 미노출 후속

동일 WO의 연속 Phase로 기존 격리 checkout·branch를 유지하고 main `1652a59045`를 반영한다.
사용자 화면 origin은 지원 도메인 `https://neture.co.kr/`로 확인했다. 운영 새 browser context의
홈 modal 및 `/login` × PC/mobile 4/4는 enabled=true·버튼 visible이었다. 사용자 브라우저의
실제 응답/캐시 상태를 확인하지 않았으므로 장애 원인을 캐시나 네트워크로 확정하지 않는다.

- [x] 공통 `KakaoContinue`의 조회 실패 catch 무표시 및 지연 중 숨김 경로 확인. 새 회귀 수정 전 4 FAIL/1 PASS.
- [x] 로딩 상태·10초 응답 제한·오류 안내·명시적 조회 재시도 추가. 명시적 enabled=false 숨김 유지, 이전 응답·unmount timer 무효화; 재시도는 읽기만 수행.
- [x] auth-react 15 files/174 PASS, Neture 모달 2 files/13 PASS, 전체 frontend type-check·대상 lint·Neture/Store build PASS.
- [x] 로컬 실제 Neture 홈 modal·Store LoginMethods × PC/mobile × 실패/지연/미설정 12/12 PASS. 합성 config fixture이며 운영 OAuth 성공으로 확장하지 않음.
- [x] PR #403 required CI·review 확인 → 사용자 승인 → main `82742b84e8` 통합 → Promote #38039708401 웹 6개 대상 배포 SUCCESS. post-merge CI/CodeQL PASS; 화면 16·config 장애/재시도 12·공개 API 12·Demo 32건 PASS.
- [ ] 실제 소유자 가입·로그인·명시적 연결 완료 및 추가 정보 적용 후 약관 화면 이동 재현·수정. 설정 UI 복구 배포와 구분.

소비처 매트릭스·최초 browser harness 조건 오류와 정정은 CHECK에 기록한다. 개인정보 처리방침
표시/내용 수정 및 실제 계정 연결은 이 UI 복구 변경의 완료 항목이 아니다.

사용자 후속 확인: 새로고침 뒤 홈 카카오 버튼이 보인다. 새 UI는 아직 미배포이며 실제
조회 실패 원인은 미확정이다. 현재 사용자 버튼 가시성 확인과 PR 웹 배포 후 회귀 및
실제 OAuth 완료를 구분한다.

## 2026-10-10 PR #403 배포 완료 및 가입/약관 후속

위 미배포 서술은 당시 관측이다. 이제 PR #403의 main 통합·웹 배포·운영 회귀는 완료했다.
API/migration/IAM 변경 없이 전체관리자 및 웹 5개를 정상 Promote로 배포했다.
세부 결과는 [CHECK](../checks/CHECK-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1.md#2026-10-10-pr-403-통합웹-배포-후-검증)를 따른다.
검증 기록은 같은 WO의 연속 Phase이며 세 문서만 변경한다. 기존 branch/checkout은
실제 소유자 인증과 가입·약관 후속이 남아 KEEP한다.

- [x] 공개 Demo 버튼으로 유지 8개 origin × PC/mobile × 두 역할 32/32 확인: 매장 경영자 업무 16/16 200·공급자 업무 16/16 200, 반대 역할/전체관리자 거절, Demo 변경 차단, logout access/refresh 401 및 별도 Store 세션 유지.
- [x] 최초 가입의 이메일·이름·모바일 필수 계약 확인. 별도 ID/비밀번호 생성·SMS 본인 인증 없음; PR #403에서 계약 변경 없음.
- [x] signup submit/API의 직접 `/terms` redirect 부재와 returnUrl·pending policy gate 조사. Neture `TermsAcceptanceGate`는 공통 `PolicyAcceptanceGate` wrapper다.
- [x] P1 canonical 위반 확정: 카카오 UI/client/DTO에 published 문서 ID/version이 없고 signup transaction은 `tosAcceptedAt`만 기록하며 `user_policy_acceptances` 저장을 누락. 실제 제보된 화면 이동의 직접 원인 확인과 별개인 구현 blocker다.
- [x] P1 코드/격리 검증: 카카오·이메일·Google published 약관 ID/version 전달·서버 재검증·user/provider/credential 생성과 원자적인 acceptance 저장. 이전 버전/게시 변경/다른 서비스/저장 실패 rollback, 신규 acceptance의 pending 판정 확인. 서비스 membership/권한 자동 생성 없음. main 통합·운영 검증은 아래 별도 TODO.
- [ ] 추가 정보 적용 후 목적지·약관 gate를 재현하고 중복/반복을 수정. 실제 사용자 상태 미조회이며 원인을 단정하지 않음.
- [x] 공통 가입 입력·버튼 표시, 약관 내용 보기/동의 분리 및 입력 상태 보존 구현·로컬 PC/mobile 검증. 정책 본문은 변경하지 않음.
- [ ] 공개 약관·개인정보 처리방침 version 1의 은퇴 서비스·이전 내용 정리안 작성 → 사용자 검토 → 승인된 새 정책 버전 게시. 이번 기록 변경에서는 본문/버전 미수정.
- [ ] 실제 소유자 Google/Kakao 가입·로그인·연결·취소·충돌 PC/mobile 검증.

## 2026-10-10 가입 약관 acceptance P1 구현

동일 WO의 연속 Phase로 기존 격리 checkout/branch를 유지한다. 기존 기록 PR #407을
실제 가입 약관 수정까지 확장한다. 구현은 정본의 ID/version 재검증 및 원자 저장 계약을 따른다.

- [x] 카카오 외 이메일/Google 동일 누락 확인 및 공통 서버 저장 helper 연결.
- [x] 공개 읽기 `/auth/signup/terms`: 현재 게시 문서 ID/version 제공; origin catalog로 적용 약관 선택, 임의 body serviceKey 거부. Society는 Society 약관, 나머지 지원 가입 origin은 Neture 계정센터 약관. 전체관리자/은퇴/미등록 origin 거부.
- [x] signup transaction에서 현재 게시/type/service/version 확인 후 acceptance에 hash·시각 저장. 문서 row lock을 유지하며 실패 시 계정·provider/password·카카오 일회 grant를 함께 rollback. 기존 operator 초대의 `createGoogleUser`는 공개 가입과 별도 계약 유지.
- [x] 약관 로딩/오류/10초 제한/읽기 재시도 및 동의 비활성화; 버전 변경 시 재조회·재동의, 입력값 보존. 내용 링크와 체크박스 분리, 새 창 표시.
- [x] API 단위/격리 PostgreSQL·공통 React/client·실제 로컬 웹 build PC/mobile 검증. 상세 수치·최초 fixture 정정은 CHECK 참조.
- [x] 최신 PR head의 required CI/review 및 사용자 승인 후 main 통합·API/웹 배포. 기존 웹은 새 필수 termsPolicy를 보내지 않으므로 API/웹 연속 배포가 필요하며, 전환 중 구 웹의 가입은 fail-closed다.
- [ ] 배포 후 유지 8개 origin × PC/mobile regression 및 실제 소유자 가입/로그인/연결/취소. 합성 API/provider 검증을 실제 OAuth 완료로 계산하지 않음.
- [ ] 실제 사용자 추가 정보 제출 후 이동 원인의 운영 재검증. 원자 저장 누락 수정만으로 사용자 사례 해결을 확정하지 않음.
- [ ] 승인된 새 약관/개인정보 처리방침 본문 및 버전 게시; 이전 정책 내용 정리안 검토.

최신 구현 리뷰 P2 후속: 공개 client/React의 termsPolicy 및 가입 약관 loader를 필수 타입으로 정렬했다.
직접 compiler fixture에서 정상 계약 0 오류, 누락 7건 모두 TS2741 예상 오류를 확인했다.
소비처 타입 검사·회귀 및 새 head CI/review 후 승인된 main 통합/배포를 이어간다.


## 2026-10-10 PR #407 배포 검증 후 TODO 정합

PR #407 main `2a8b80cf24` 통합, post-merge CI/CodeQL PASS, Promote #38049884263
API 및 웹 6개 SUCCESS. 정확한 검증 경계·실패와 재실행은 CHECK의 같은 날짜 배포 절을 따른다.

- [x] 운영 게시 약관 API 9/9 확인(유지 origin 8개 + 전체관리자 거부).
- [x] 실제 Demo 32개 PC/mobile 시나리오 수행. 최초 30/32 PASS, UI/요청 시간 초과 2건 각각 재실행 PASS. 최초 전체 실행 32/32 PASS로 표현하지 않음.
- [x] 배포된 가입 화면 16건 및 공급자/펀딩 추가 진단. 최초 13/16 PASS; 두 도메인의 `/login` ↔ `/` 순환 발견. 합성 OAuth/가입 응답이며 실제 계정 생성 없음.
- [ ] 공급자·펀딩 미로그인 홈과 LoginRedirect의 경로 순환 수정. callback fragment 보존·입력/동의 유지·가입 안내·Demo·logout PC/mobile 재검증. 약관 문서/version 제출은 추가 진단에서 일치함.
- [ ] 실제 소유자 Google/Kakao 가입·로그인·명시적 연결·취소 및 추가 정보 제출 후 약관 gate 재확인.
- [ ] 승인된 새 이용약관·개인정보 처리방침 본문과 version 게시. 기존 공개 정책 내용은 이번 변경에서 수정하지 않음.

기존 동일 WO branch는 배포 검증 기록과 실제 OAuth/경로 후속 때문에 KEEP한다.

## 2026-10-10 남은 인증 작업 — TODO 조사·보완 후 실행

사용자 지시: TODO 작성 → 최신 코드·정본 검증 → TODO 보완 → 구현·검증 → push.
동일 WO의 연속 Phase로 보존한 격리 checkout/branch를 유지한다. 기준 main은 `88f63e5992`다.
위 날짜별 배포 기록은 당시 결과이며, 아래 목록이 이번 후속 작업의 완료 계약이다.

| ID | 실행할 TODO | 완료 근거 / 경계 |
| --- | --- | --- |
| AUTH-R1 | 공급자·펀딩의 미로그인 `/login` ↔ `/` 순환 해소 | 홈의 인증 보호 유지; 로그인 진입에 머물고 modal 닫기·다시 열기, 세션 복구, 안전한 목적지 복귀, OAuth fragment 일회 소비를 확인 |
| AUTH-R2 | 실제 OAuth 검증 준비 및 수행 분리 | Google/Kakao 가입·기존 로그인·취소·이메일 확인·명시적 연결·충돌·마지막 수단 보호를 실행 가능한 매트릭스로 보완. 소유자 브라우저의 실제 외부 인증은 배포 후 별도 실행 |
| AUTH-R3 | 추가 정보 제출 후 약관 반복 조사·회귀 | 새 가입의 published 약관 reference 제출 및 현재 version 동의 후 gate 통과, 확인 메일 안내 유지, stale version 재동의·입력 보존을 확인. 기존 사용자 운영 사례는 별도 OPEN |
| AUTH-R4 | 이용약관·개인정보 처리방침 수정 검토안 | 게시 v1과 현행 서비스/인증 수단을 대조해 수정할 조문·추천 문구·검토 질문·게시 순서를 제시. 실제 본문/version 게시·보유기간 변경은 포함하지 않음 |
| AUTH-R5 | 검증 후 TODO 정합 및 commit·push·PR | 실행한 검증과 fixture/실제 인증의 경계를 기록; latest head CI·review·미해결 스레드 확인. main 통합·배포는 별도 단계 |

### 코드·문서 조사로 보완한 조건

- `LoginRedirect`는 모든 미로그인 호스트를 `/`로 보내지만 `SupplierServiceEntry`와
  `MarketTrialHubPage`는 미로그인 홈을 `/login`으로 되돌린다. 두 보호 홈의 인가 조건을
  제거하지 않고 로그인 진입의 목적지를 보완한다. Neture·community의 공개 홈 진입은 함께 회귀한다.
- 이메일·이름·개인 모바일은 가입 정책의 필수 입력이다. SMS 본인 인증을 추가하거나
  Google/Kakao 이메일 동일성으로 자동 병합하지 않는다. 전체관리자는 Google 전용이다.
- `TermsAcceptanceGate`는 서버의 pending 문서 상태를 공통 `PolicyAcceptanceGate`에 전달한다.
  정상 가입 acceptance 저장은 이미 PR #407에서 수정·배포됐다. 남은 route 문제를 새 DB 보정으로 처리하지 않는다.
- 게시 v1에 남은 K-Cosmetics·PharmacyHub와 현행 도메인/표시명은 수정 검토 대상이다.
  신규 OAuth 제공자에 대해 코드가 실제 읽고 저장하는 항목과 제3자 제공/위탁/국외 이전의 법적 분류를 구분한다.

### 이번 Phase 실행 상태

- [x] AUTH-R1~R5 TODO 작성 및 최신 코드·정본으로 보완.
- [x] AUTH-R1 로그인 진입 코드 수정·회귀.
- [x] AUTH-R2 실제 OAuth 검증 매트릭스 준비. 실제 외부 인증 수행은 별도 OPEN.
- [x] AUTH-R3 로컬 추가 정보/약관 회귀. 기존 사용자 운영 사례는 별도 OPEN.
- [x] AUTH-R4 정책 조문 수정 검토안 작성. 사용자 검토·본문/version 게시는 별도 OPEN.
- [x] AUTH-R5 검증 기록·TODO 갱신 및 commit·push·PR. 최신 CI/review 판정은 PR에서 추적.


현재 실행 결과: 로그인 진입·모달·게시 약관 관련 단위 회귀 39 PASS, Neture build 및 전체 frontend
타입 검사 PASS. PC/mobile 로컬 production bundle은 가입/약관 24건 및 보호 홈·직접 로그인·카카오
취소·모달 닫기/재열기 12건 PASS. API/provider 응답은 fixture이며 운영 계정 생성·DB 수정은 없다.
실제 OAuth와 기존 소유자 반복 약관 사례, 정책 검토·새 버전 게시, main 통합·배포는 OPEN이다.
검토할 조문과 질문은 [정책 변경 검토안](../design/DESIGN-O4O-AUTH-LEGAL-POLICY-REFRESH-V1.md),
실제 브라우저 실행 목록과 검증 범위는 [CHECK](../checks/CHECK-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1.md)
의 2026-10-10 남은 인증 절을 참조한다. AUTH-R5의 CI/review 완료 여부는 PR 최신 head 결과로 확인한다.

## 2026-10-11 Neture 공통/서비스별 정책 분리 — 조사·초안

사용자는 이전 통합 서비스 설명 대신 neture.co.kr 공통 계정 정책을 사용하고, 각 서비스 가입에는
해당 서비스 내용을 넣도록 지시했다. 새 버전은 리팩터링 문서를 따르며 미흡한 부분을 논의한다.
기존 동일 WO의 정책 후속 단계이므로 전용 branch/workspace를 유지하고 최신 main을 반영했다.
[개정 설계](../design/DESIGN-O4O-AUTH-LEGAL-POLICY-REFRESH-V1.md)의 TODO로 계정 정책과
서비스 신청 조건, 계정 약관 gate·서비스별 gate, 공고·시행·재동의 시점을 분리했다.
공통 이용약관·개인정보 초안은 DRAFT이며 게시 본문·version·DB·런타임은 변경하지 않았다.

구현 조사에서 약사회 계정 생성의 별도 정책 선택, 전역 서비스 pending 차단, 일부 신청 서비스의
legal scope 부재, publish 즉시 활성화와 미래 시행일 미처리를 확인했다. 새 본문만 게시해 해결했다고
판정하지 않는다. 공고 기간과 외부 인증 고지 근거는 구체적인 논의 항목이다.
본인 계정의 실제 Google·카카오 인증은 사용자가 진행한다. 성공 증빙을 임의 작성하지 않는다.

PR #423 로그인 순환 수정은 main 통합·운영 반영 완료다. 후속 운영 실제 로그인 진입 8/8,
Demo 32/32 PASS는 이전 대화의 결과이며 이번 문서 조사에서 새로 실행한 검증은 아니다.
상위의 과거 날짜별 OPEN은 당시 기록으로 보존하고, 위 완료 항목을 신규 잔여 구현으로 보지 않는다.
