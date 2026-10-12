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

### 2026-10-11 공고 기간 확정

사용자가 이번 정책 개정의 **30일 공고 후 시행**을 선택했다. 개정 설계와 공통 이용약관 초안에
반영했다. 실제 공고일·시행일은 본문 검토와 게시 준비 후 확정하며, 초안 작성·push는 공고가 아니다.
공고 기간에는 새 약관을 조기 적용하지 않는다. 정책 DB 게시·런타임 변경은 아직 실행하지 않았다.
외부 인증 고지 근거 검토와 개정 설계의 미완료 구현 TODO는 계속 남아 있다.


### 2026-10-11 정책 개편 구현 후속

동일 WO/전용 branch를 유지하는 후속 구현이다. 계정 생성 origin의 Neture 공통 약관 선택,
물리 Neture membership 없는 계정의 요구·승낙, 요청 서비스별 차단 범위를 정렬했다. 서명된
세션 범위와 서버 소유 API 경로를 사용하며 body/query/Origin으로 요청 게이트를 우회하지 않는다.
기존 서비스 승낙 자격·Demo 예외·전체관리자 관리 경로·ID/version/hash 이력은 유지한다.

공통 UI는 서로 다른 문서를 모두 표시하고 문서 ID/version·서비스/유형이 일치한 경우에만 제출한다.
분회 앱은 이 화면이 없어 기존 workspace 공통 UI 의존성 한 건과 lockfile importer를 연결했다.
외부 패키지·버전 변경은 없다. 미래 시행일 draft는 publish 409로 거부하고 기존 게시 문서를 보존한다.
이 방어는 자동 예약 게시나 30일 공고 이력 관리의 완료가 아니다.

공통 이용약관은 기존 v1의 권리·의무·책임·분쟁 조항을, 개인정보 초안은 권리 행사·파기·안전성
조항을 보완했다. 본문과 공고는 DRAFT다. 실제 사용자 Google·카카오 인증은 사용자가 진행한다.
구현·검증 범위와 잔여 작업은 개정 설계 및 CHECK의 이번 날짜 절을 따른다. 이번 종료 범위는 push/PR이며,
운영 정책 게시·DB write·main 통합·배포는 실행하지 않는다.


최종 소비처 점검 후 이메일·Google·카카오 계정 생성 UI의 처리방침 링크도 Neture 공통
`https://neture.co.kr/privacy`로 정렬했다. 이전 서비스별 privacyHref prop은 호출 호환성만 유지하며
계정 생성에서는 서비스별 문서를 적용하지 않는다. 링크는 새 탭이며 가입 입력을 초기화하지 않는다.
서비스별 추가 수집 안내는 서비스 신청 단계의 후속 TODO다.


PR #457의 P1/P2 리뷰 지적을 반영했다. Google·Kakao 세션 응답에 같은 scoped enforcement를 적용하고,
실제 공급자 API prefix를 일반 Neture보다 먼저 선택한다. provider 응답 8건 및 기존 보안 회귀
45건이 통과했다. 공통 처리방침 링크를 포함한 세 서비스 PC/mobile 가입 회귀 18건도 통과했다.
최신 commit을 push한 뒤 CI·재리뷰·이전 스레드 해소를 확인한다. 동일 WO 연속 Phase이며
push/PR 종료 범위와 운영 정책 미게시 경계는 유지한다.


재리뷰에서 발견한 Neture 하위 공급자·펀딩 운영자 경로도 구체적인 service mount로 먼저
판정한다. 등록 경로 대조로 확인한 funding legacy API와 communities API도 연결했다.
실제 요청의 차단·승낙 후 해소 및 prefix 경계 신규 회귀 7건이 통과했다. 운영자 역할 guard와
전체관리자 예외는 유지한다. 최종 CI·리뷰는 이 후속 commit을 포함한 PR 최신 HEAD에서 확인한다.


공통 계정 약관 도입으로 전체관리자의 settings/apps/users 등 관리 API가 차단될 수 있다는
P1 리뷰도 보완했다. 최신 DB 전체관리자 역할과 서명된 admin 관리 세션을 함께 확인해 면제하며,
Google 증거·계정/세션 상태·기존 role guard와 일반 서비스 세션의 약관 요구는 유지한다.
신규 경계 회귀 11건, 보안 및 raw-source 재실행 67건과 API 타입/lint가 통과했다.
동의 기록 생성·운영 DB 수정은 없으며 이번 종료 범위는 계속 push/PR다.


공용 Neture 하위 API의 재리뷰도 반영했다. 매장 본인 신청·취소/공용 조회는 signed session을
유지하고, 전용 관리 및 supplier 모집 심사 동작만 실제 controller 권한 경계로 소유 범위를
지정한다. 신규 회귀 7건을 포함한 보안/기존 계약 74건 및 API 타입/lint가 통과했다.
실제 서비스 신청 원장·조건 snapshot과 30일 공고/시행은 이번 구현 PASS로 완료 처리하지 않는다.


후행 slash는 기존 normalizeRequestPath가 처리하므로 리뷰의 해당 재현 가정을 정정했다.
Express 실제 route의 slash 및 uppercase supplier 동작을 검증하고 owner의 대소문자를 맞췄다.
date 입력 시행일은 한국 달력 날짜(Asia/Seoul)로 비교하며 한국 자정 및 오전 게시 경계를 보완했다.
신규 11건 포함 관련 4 suites/94 PASS이며 숫자 날짜 key 보완 뒤 게시/lifecycle 17건을 재확인했다.
이 변경은 실제 공고나 30일 공고 증빙을 대신하지 않는다. 최종 CI·재리뷰는 후속 HEAD에서 확인한다.


공급자 이미지 변경 API의 리뷰 지적은 서버 HTTP 메서드와 경로를 함께 사용해 보완했다.
공용 GET은 signed scope, 공급자 mutation은 supplier로 판정한다. 관련 controller guard를
대조해 private library와 supplier hub trigger도 포함했고, Neture 관리자 hub trigger는 분리했다.
신규 10건 포함 보안/raw-source/provider 95건 및 API 타입/lint가 통과했다. 고유 서버 회귀는
248건, UI 301건이며 실제 OAuth·운영 DB·30일 공고/시행은 완료 처리하지 않는다.
동일 WO 연속 Phase이며 push/PR 종료 경계와 최신 HEAD의 CI·리뷰 확인 조건을 유지한다.


KPA supplier mount도 일반 KPA보다 먼저 판정한다. 기존 active-supplier helper 검색뿐 아니라
실제 supplier identity 조회 소비처·등록 route를 대조했다. 제안/자료/signage/screen-set의 신규
6건 포함 관련 101건이 통과했다. 고유 서버 회귀 254건, UI 301건이며 실제 운영 검증과
공고/정책 게시를 완료 처리하지 않는다. 최신 HEAD push/CI/review로 이번 Phase를 종료한다.


재리뷰의 Store 서비스 약관 표시 deadlock과 실제 공급자 자격 공백을 보완했다. Store는 현재
catalog의 Store-capable 서비스만, 공급자는 기존 canonical resolver의 업무 자격을 사용한다.
무관 서비스 차단·membership/role 생성 없이 pending과 승낙 자격을 일치시켰다. 신규 7건 포함
관련 4 suites 126 PASS, resolver context 인자를 명시한 뒤 보안/resolver 114건을 재확인했다.
추가 resolver 18건을 포함한 고유 서버 회귀는 279건, UI 301건이다. 실제 원장/조건 snapshot,
운영 검증 및 30일 공고·시행 OPEN과 이번 push/PR 종료 범위는 유지한다.


게시 정책 본문 read 경로는 catalog의 canonical 서비스에 연결하고 관리 write·법정정보 scope는
유지했다. 조회 신규 7건과 기존 legal scope 6건이 통과했으며 고유 서버 회귀는 292건이다.
정책 관리 권한 연결·실제 신규 본문 게시/공고는 후속 TODO이며 이번 read 보완으로 완료 처리하지 않는다.


Store 문서별 전문 링크 리뷰도 보완했다. Neture 공통 문서 링크만 공통 주소를 사용하며 서비스
전문 경로가 미정이면 링크를 생략하고 실제 문서 본문은 표시한다. Store 소비처 1건 및 새 production
bundle PC/mobile 6건이 통과했다. UI 회귀 302건/서버 292건/로컬 합성 화면 42건이며 운영 검증과
구분한다. 동일 WO 연속 Phase로 최신 HEAD CI/review까지 확인하며 push/PR 경계를 유지한다.


전문 링크 소유 판정을 공통 gate로 올려 Store 외 Neture 소비처의 같은 문제도 해소했다.
termsServiceKey는 실제 약관 페이지 조회 key이며 Neture/KPA/lecture 소비처를 대조해 연결했다.
공통 UI 72건/Store 1건, 해당 4개 앱 타입 포함 build와 lint, 새 3개 bundle PC/mobile 18건이
통과했다. 신규 복수 서비스 경계 포함 고유 로컬 화면 48건/UI 304건/서버 292건이며 실제 운영
검증 OPEN과 동일 WO push/PR 종료 경계는 유지한다. 최신 HEAD CI/review를 확인한다.


KPA 약국 사업자는 서비스 membership 없이 실제 승인 원장으로 접근하므로 카탈로그의
semiFranchiseAccessKey와 기존 서비스 접근 resolver를 pending·승낙 자격에 재사용했다.
약국 승인만으로 서비스 가입으로 간주하지 않고 동일 조직의 기본/사업 가입 active가 필요하다.
신규 9건 포함 6 suites 148 PASS다. 고유 서버 301건/UI 304건/로컬 합성 화면 48건이며
membership/role 생성과 원장 변경은 없다. 기존 신청 snapshot/운영 검증 및 공고/게시 OPEN과
동일 WO push/PR 범위는 유지한다. 최신 HEAD CI/review를 확인한다.


공고 전 기존 Neture v1을 공통 계정 약관으로 바꾸지 않도록 rollout을 보완했다. 새 ID/version>=2/
slug=neture-account-terms 문서가 실제 게시된 뒤에만 membership 없는 공통 요구와 약국 가입
문서 전환을 적용한다. 표식 문서의 미확정 시행일·v1 게시를 거부하며 과거 동의를 옮기지 않는다.
원장 자격의 빈 pending 캐시는 사용하지 않고 일반 캐시도 게시 문서 집합에 묶었다. 신규 18건
포함 관련 6 suites 171 PASS, 고유 서버 회귀 319건/UI 304건이다. 로컬 PC/mobile 합성 검증
48건의 경계는 유지한다. PG signup/social 18건과 sessionAuthMethod 21건은 총 39 SKIP다.
30일 공고는 시작하지 않았고 실제 공고일·시행일은 미정이다.
이번 동일 WO 작업은 push/PR 범위이며 최신 HEAD CI/review를 확인한다. main 통합·배포·DB 게시는 없다.


최신 리뷰에서 기존 Neture 서비스 pending의 전역 선택과 전 사용자 cache 비활성화를 추가
보완했다. 새 공통 문서만 accountPolicy로 전역 선택하며 기존 Neture 문서는 요청 범위에 둔다.
현재 조직/legacy 공급자 관계를 EXISTS로 확인하고 관계 없는 사용자는 기존 빈 결과 cache를
활용한다. 관계 생성/승인 직후 기존 resolver 판정은 유지한다. 신규 4건 포함 관련 128 PASS,
고유 서버 323건/UI 304건이다. 모의 화면 48건·PG 39 SKIP·실제 공고/게시 OPEN·push/PR
종료 경계는 유지하며 최신 HEAD CI/review까지 확인한다.


게시 문서 slug 불변과 draft 공통 표식 추가/제거 금지를 보완했다. 새 row 등록 시에만 공통
표식을 지정해 기존 동의 ID를 공통 계약으로 재분류하지 않는다. 실제 PUT 신규 6건 포함
관련 25 PASS, 고유 서버 329건/UI 304건이다. 실제 공고/게시/운영 검증 OPEN과 push/PR
종료 경계를 유지하며 최신 HEAD CI/review를 확인한다.


My Home의 cross-service API 428은 해당 패널의 inline policy gate에 전달하고 승낙 후 조회를
재개한다. Neture 전체 pending에 무관 서비스 문서를 넣지 않으며 원장/역할·서비스 가입을
만들지 않는다. My Home 23/공통 UI 73 PASS, 고유 UI 328건이다. 새 production bundle의
PC/mobile 12건 포함 모의 화면 60건이며 실제 OAuth/운영 검증과 구분한다.
직전 CI의 supplier 경계 실패는 로컬 재현 후 canonical resolver로 후보 조회를 이동했다.
관련 API 187 PASS, 인증·정책 고유 329 + 추가 supplier 경계 41을 분리 기록한다. SonarCloud
지적의 복잡도/정렬도 보완했다. 최신 push HEAD CI/review를 확인하며 실제 공고/게시 OPEN과
이번 push/PR 범위를 유지한다.


제목/본문의 runtime 문자열·비어 있지 않음도 공통 gate에서 확인한다. ID/version이 일치해도
본문이 누락되거나 표시 불가능하면 제출하지 않는다. 신규 10건 포함 공통 UI 83/My Home 23
PASS, 고유 유관 UI 338건이다. 새 bundle PC/mobile 16건 중 신규 누락 경계 4건을 더한 모의
화면 합계는 64건이며 실제 OAuth/운영 검증으로 보지 않는다. own preview 종료·port closure를
확인했고 최신 push HEAD의 CI/review로 이번 Phase를 마무리한다. 실제 공고/게시 OPEN은 유지한다.

게시 API에도 제목/본문 검증을 추가했다. 불완전한 draft는 기존 published 강등 전에 400이며
게시 해제와 유효 본문 원문 보존은 유지한다. 신규 15건 포함 게시/수명주기 40 PASS,
고유 인증·정책 서버 344 + 추가 경계 41 PASS다. UI 338/모의 64 PASS 및 PG 39 SKIP 경계와
실제 공고/게시 OPEN을 유지한다. 이번 동일 WO의 push/PR Phase에서 최신 CI/review를 확인한다.


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

### 일반 계정 상태 검증 재개 — 2026-10-12

사용자의 남은 작업 진행 지시에 따라 동일 WO의 보존된 전용 branch를 최신 main
`63653694b3`으로 fast-forward했다. 초기 TODO의 모든 서비스에 동일한 상태를 적용한다는
전제를 아래 코드 근거로 보완했다.

| ID | 초기 TODO | 코드·문서 확인으로 보완한 실행 항목 | 현재 판정 |
|---|---|---|---|
| V01 | 일반 미가입·대기·반려·정지·탈퇴 검증 | `users`의 공통 계정 상태, 서비스 membership, 약국·공급자 별도 원장을 구분한다. 로그인 성공과 보호 업무 API 허용도 구분한다 | 조사 완료 |
| V02 | 공급자 상태별 안내 확인 | 실제 소비처는 `SupplierLandingPage`/`SupplierServiceEntry` → `ServiceApplyPanel`이다. 미사용 `ServiceUsageGate`의 문구만 바꿔 운영 개선으로 판정하지 않는다 | 실제 소비처 확인 완료 |
| V03 | 공통 계정 승인 대기 안내 | 수동 승인 문구를 제거한다. 정상 인증의 메인 이용 상태 안내는 기존 handoff로 복귀하며, 중앙 가드의 제한 계정은 허용된 `/auth/me`로만 재확인해 계정 안내·읽기 재시도를 제공한다. 제한 계정에 handoff/서비스 신청을 제공하지 않는다 | #504 main 통합·Neture 웹 배포 완료; 로컬 합성30조건·운영 Demo4조건 통과. 실제 일반 상태 계정은 V04 대기 |
| V04 | 실제 상태별 로그인·역할·업무 검증 | 8개 유지 origin × PC/mobile에서 계정 출처와 실제 원장 상태를 먼저 확인한 후 로그인, 메뉴·직접 주소, 보호 API, 상태 안내, 다른 서비스 영향, 로그아웃을 검증한다 | 기준 파일 확보. 사용자 확인상 제공3개는 최신 지시에 따른 Demo 전환 대상. 일반 상태별 계정은 별도 확보 필요 |
| V05 | 정책 적용·재동의 | 실제 공개 공고와 30일 경과를 다시 확인하고 2026-11-13 이후 새 정책을 게시·검증한다 | 시행일 대기 |
| V06 | Google·카카오 실제 인증·명시적 연결·운영자 검증 | 본인 실제 OAuth와 별도 Google 운영자 계정 검증은 사용자가 담당한다. 자동 이메일 병합 없음·연결 후 권한 합집합 없음의 실제 결과를 전달받아 기록한다 | 사용자 확인 대기 |

공급자 이용 상태의 실제 출처는 `neture-service-state.service.ts`와
`supplier-context.resolver.ts`가 해석하는 `neture_suppliers`다. 현재 source의
`PENDING/ACTIVE/REJECTED/INACTIVE`와 row 부재를 검사하며, supplier `withdrawn`은
현재 source에서 생성되지 않는 방어적 UI 분기다. 이 분기의 합성 테스트를 실제 탈퇴 계정
증거로 삼거나 DB에 임의 상태를 넣지 않는다. Store의 약국 신청 종료와 서비스 membership
탈퇴도 같은 상태명이라고 합치지 않는다.

V03 조사 당시 `docs/local/TEST-ACCOUNT.txt`는 checkout과 기준 workspace 모두에 없었다.
2026-10-12 사용자가 다시 제공한 원문을 현재 기준 파일에 저장하고 Git 추적 제외·내용 일치를
확인했다. 이후 사용자는 제공 Gmail 계정이 운영자이며 운영자 테스트를 직접 담당한다고 확인했다.
자동 검증에는 공개 Demo 버튼 정본만 사용하고 이 운영자 계정을 다시 대입하지 않는다.
일반 상태별 계정은 [SETUP.md](../../SETUP.md#테스트-계정-찾기--브라우저운영-검증-전)의
비공개 파일/환경 Secret 확보 절차를 따르며 Demo·과거 seed 계정으로 대체하지 않는다. 원본 확보 후에도
필요한 상태가 없는 조건은 미실행으로 기록한다. 상태 변경 검증은 대상·복구 방법·공유 runtime
사용 여부를 확인하고 승인된 범위에서만 실행한다.

- [x] 상태 원장과 실제 화면 소비처 조사 → TODO 보완.
- [x] V03 서버 회귀131건·초기 화면 회귀50건·Neture build·초기 PC/mobile 합성20조건 확인.
- [x] 대표 홈 직접 링크의 세션 미승계 review 지적을 기존 handoff 버튼으로 보완; 공통 계정4조건·성공/제한/복구 중3조건 회귀 확인.
- [x] review 보완 화면53건·Neture build·PC/mobile 고유 합성24조건 확인(제한 거절2조건의 selector 보완 재실행 포함).
- [x] 실제 제한 계정의 home/entry 403 → 본인 me 재확인 분기 검증; 화면61건·중앙 가드25건·로컬 PC/mobile 고유30조건 확인. allowlist·서버 인가 변경 없음.
- [x] V03 push·review·main·Neture 웹 배포·운영 Demo 검증(실제 일반 상태 계정은 V04로 분리).
- [ ] 일반 상태별 계정 확보 후 V04 운영 검증(제공3개는 아래 최신 Demo 전환 대상으로 변경; 실제 운영자는 사용자 담당).
- [ ] V05 시행일·공고 기간 확인 후 정책 적용과 재동의 운영 검증.
- [ ] V06 사용자 본인 실제 OAuth/명시적 연결·운영자 검증 결과 기록.

#### V03 통합·배포 결과 — 2026-10-12

[PR #504](https://github.com/Renagang21/o4o-platform/pull/504)의 최종 head `c0e7688337`
review는 새 지적 없이 완료됐고 앞선 두 P2 스레드는 해결됐다. required CI38215572959
통과 후 일반 PR merge로 main `cbdc1619f0`에 통합했다. main CI38217993155도 통과했다.
동시 main 변경 반영 후 서버156조건·화면77조건과 Neture build를 확인했으며 반복 실행을 합산하지 않는다.

일반 Delivery38218878433와 Promote dry-run38219899889는 별도 API 변경의 식별 키 누락으로
Neture 자동 승격을 보류했다. 해당 API #505의 운영 migration은 승인 범위 밖이므로 실행하지 않았다.
기존 owner 전용 서비스별 `verified` 웹 배포38220652882에서 대상 SHA `cbdc1619f0`의
CI·freeze·production ref 검사를 유지한 채 Neture만 빌드·신규 revision smoke·traffic 전환·검증을
완료했다. workflow·IAM·설정 변경이나 API 배포·migration 없이 실행했다.

운영 Neture HTML/asset200 및 신규 계정 안내 코드 포함을 확인했다. PC/mobile × 매장 경영자/공급자
Demo4조건은 최초3/4 통과했고 PC 매장 경영자의 이동 대기 timeout만 같은 코드·같은 timeout으로
재실행해1/1 통과했다. 실제 handoff/교환200, 약국 업무 context200, 권한별 API 제한,
Neture UI 로그아웃·access/refresh401과 다른 Store 세션200을 확인했다. 최초 timeout 원인은 확정하지 않는다.
이4조건과 로컬 합성30조건은 실제 일반 상태 계정이나 외부 OAuth의 증거가 아니다.

배포 후 별도 GCP serving label 재조회 artifact는 프록시403으로 확보하지 못했고 추가 권한 실행도
사용자 중단으로 미실행됐다. 배포 workflow의 대상/성공과 실제 bundle·기능 확인 범위만 완료로 판정한다.
전체 main/API/admin 배포 완료로 확대하지 않는다. 세부 증거는 기존 CHECK에 추가했다.

이번 후속 기록은 문서만 변경하므로 DEPLOYMENT=NOT_APPLICABLE이다. 자체 local 서버는 종료했고
운영 smoke의 테스트 소유 세션을 정리했다. V04~V06 후속을 위해 동일 WO branch/checkout을 유지한다
(WORKTREE_DISPOSITION=KEEP). 일반 계정 파일은 현재 클라우드에 여전히 없으며 새 정책도 아직 게시하지 않았다.

#### 계정 파일 확보·운영자 사용자 담당·Demo 전체 재검증 — 2026-10-12 후속

위 V03 결과 기록 이후 사용자가 계정 원문을 다시 제공해 기준 파일을 확보했다. 파일은
현재 checkout의 `docs/local/TEST-ACCOUNT.txt`에 저장했고 내용 일치·Git 추적 제외를 확인했다.
제공 Gmail 계정은 모두 운영자이며 운영자 테스트는 사용자가 담당한다는 추가 지시를 받았다.
따라서 기준 파일 미확보와 일반 상태별 검증 계정 미확보를 구분한다. 운영자 계정의
비밀번호·주소 변경, 계정 생성·역할 부여·자격 복구는 실행하지 않는다.

자동 검증은 공개 Demo 버튼의 매장 경영자·공급자다. Neture/Supplier/Community/Funding/
약국 협력사업/Store/강의/KPA Society의 운영8 origin × PC/mobile ×2계정32조건을
새 browser context로 다시 실행해 **32/32 PASS**를 확인했다. 로그인200·본인 me200,
역할별 업무 API·관리자403, Demo 계정 설정 관리 제한, 실제 UI logout200과 이전
access/refresh401을 확인했다. Neture 매장 경영자의 Store handoff 및 Neture 로그아웃 후
다른 Store 세션 유지도 PC/mobile에서 확인했다. 실제 외부 OAuth와 운영자 검증은 제외했다.

- [x] 기준 파일 재저장·원문 일치·Git 추적 제외 및 최신 운영자 검증 소유 확인.
- [x] 공개 Demo를 운영자 입력과 구분해 운영8 origin의 PC/mobile32조건 재검증.
- [x] 비로그인 화면 PC/mobile16조건의 이메일 폼·입력·강의 대표 진입 확인(로그인 성공과 구분).
- [ ] 일반 미가입·대기·반려·정지·탈퇴 상태별 비운영자 계정 확보 후 V04 검증.
- [ ] 사용자 본인 OAuth·명시적 연결 및 운영자 검증 결과 기록.
- [ ] 2026-11-13 이후 실제30일 공고 확인·정책 게시·기존 회원 재동의 검증.

이번32조건은 과거32조건과 같은 회귀 모집단이며 실행 횟수를 합산하지 않는다. 정상 Demo
검증으로 V04의 실제 일반 상태 계정 조건을 닫지 않는다. 코드 결함이 확인된 범위는 없으며
이번 변경은 기존 WO/CHECK 갱신뿐이다. DEPLOYMENT=NOT_APPLICABLE, 같은 미완료 WO의
후속을 위해 WORKTREE_DISPOSITION=KEEP다. 최신 main의 타 트랙 API/admin/DB 변경을
이번 테스트나 문서 통합으로 배포 완료했다고 판정하지 않는다.

### 제공 테스트 계정3개로 전체 전환 — 2026-10-12 최신 사용자 지시

사용자는 앞선 운영자 분류를 정정하고, 새로 제공한3개를 실제 테스트 계정으로 사용하며
전체 사용자 로그인 화면의 버튼과 데이터가 연결된 계정 등 모든 관련 부분을 수정하도록
지시했다. 이 최신 지시가 위 운영자 분류를 대체한다. 운영자/전체관리자의 Google 계정은
Demo가 아니며 운영자 검증 사용자 담당 경계는 유지한다.

| ID | 조사로 보완한 실행 TODO | 현재 상태 |
|---|---|---|
| T01 | 공통 credential·Neture 착지·Demo metadata·registry 제약·seed/repair·운영 census/cleanup의 소비처를 전수 확인 | 조사 완료 |
| T02 | 사용자 제공 경영자·공급자·직원 credential을 공통 정본으로 하고8개 사용자 origin에3버튼·기존 일반 로그인을 연결 | 코드·로컬 화면 검증 완료; 운영 전환 대기 |
| T03 | 직원 Demo의 registry 유형·보호·배지와 매장 직원 착지를 추가; 전체관리자 로그인·권한은 생성하지 않음 | 구현·격리25단계 스키마 검증 완료 |
| T04 | 기존 활성 경영자/공급자 Demo의 user ID를 유지해 주소·비밀번호를 전환; 대상 Gmail 충돌·특권·provider 연결은 먼저 조사하고 임의 병합하지 않음 | CLI 구현·격리 DB 검증 완료; 운영 plan 대기 |
| T05 | 직원 Demo를 같은 체험 약국의 활성 staff 관계와 기존 `kpa:store_member` 인가로 연결; 소유자·관리자·공급자 role은 주지 않음 | CLI 구현·실제 직원 해석기 격리 검증 완료; 운영 대기 |
| T06 | CLI 기본 read-only plan·정확한 before-image digest·트랜잭션·rollback/멱등·세션 폐기 검증; DB 변경은 지시된 Demo 범위에 한정 | 격리 DB22조건·CLI 타입검사 완료 |
| T07 | 로컬 집중 회귀·격리 DB·PC/mobile3버튼 검증 → 최신 review·CI → 정상 main 통합·운영 plan/apply·배포 | 로컬 완료:5웹/API build, UI17·DB22·운영경계114·화면48 통과. review/CI/main·운영 대기 |
| T08 | 운영8 origin × PC/mobile ×3계정48조건으로 버튼·실제 registry·연결 매장/상품·권한·로그아웃을 검증 | 대기 |

기존 ID를 유지하는 전환은 연결된 매장·공급자·상품·샘플의 user FK를 옮기지 않는다.
직원은 동일한 승인 체험 약국에 연결하며 조직이 불명확하면 임의 조직을 고르지 않는다.
대상 Gmail에 별도 identity가 있으면 일반 계정 자동 병합·권한 합집합을 실행하지 않는다.
schema migration은 신규 incremental로 등록하고 기존 적용 이력은 수정하지 않는다.
같이 pending인 타 WO의 미승인 운영 migration을 이번 Demo 지시의 승인 범위로 확대하지 않는다.
이 후속은 같은 미완료 인증 WO/branch를 유지하는 구현 단계이며 앞선 문서-only 커밋은
아직 main에 통합하지 않았다. 이전 Demo32조건은 전환 전 검증으로 보존하며 새48조건의 증거가 아니다.

운영 순서: main 통합 후 standalone `demo_accounts=true,mode=plan`으로 실제 원장과 migration history를 읽는다. 직원 registry migration25는 연속 manifest의23/24 뒤에 있다. 다른 WO의 §10은23/24 운영 migration을 아직 승인하지 않았으므로 미적용이면 이번 Demo 지시를 근거로 함께 실행하지 않는다. 실제 read-only 결과와 구체 적용 영향을 확보하고 승인/협의한다. schema 적용 후 다시 plan하여 정확한 새 digest로 계정 전환하고, 그 이후5웹 app/eight origin을 배포·검증한다. 코드 main 통합을 데이터 전환/운영 검증 완료로 기록하지 않는다.

운영 도구 분류: inventory에서 reconcile ACTIVE·구현 service module dependency·기존 foundation PAUSED로 등록했다. 현재 운영은 ACTIVE standalone plan/apply만 사용한다. 신규 foundation 생성·일반 계정/운영자 변경·별도 미승인 migration으로 범위를 넓히지 않는다.
