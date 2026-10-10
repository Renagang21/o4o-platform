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
- [ ] 유지 8개 서비스 PC/모바일 운영 smoke 마무리 및 실제 Google 전체관리자 재로그인 (실제 계정 인증은 미실행).

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
- [ ] 후속 PR required CI/review·main 통합 승인·API/web 운영 배포.
- [ ] 운영 Kakao 앱·REST ID·client secret ON·callback 등록·Secret Manager binding 확인 후 실제 로그인/가입/handoff PC·모바일 smoke.

## 4-C. Google·카카오 명시적 계정 연결

- [x] 현재 계정 password 또는 현재 연결된 provider 재인증; Google fresh nonce/iat, Kakao 재인증 요청. 짧은 연결 권한을 users.id·browser session·security family·origin에 바인딩.
- [x] 별도 target provider 증명 후 확인 버튼에서만 현재 users.id에 연결; GET callback은 redirect/read-only.
- [x] Demo 변경·다른 users.id provider 이동·기존 동일 provider 교체 차단; 재사용/동시 충돌/rollback/로그아웃·password family 변경 검증.
- [x] 동일/상이 이메일 모두 자동 병합 없음. role·membership·조직·security family 변경 없음.
- [x] 해제·두 users.id 병합은 구현하지 않음. 마지막 수단 제거 경로 없음.
- [x] Neture/KPA 내 설정에 공통 계정 보안 화면; Store·Lecture는 기존 계정센터 경로 유지. UI 순서·Demo 차단 회귀 검증.
- [ ] 실제 Google/Kakao 재인증·연결·취소·충돌 PC/모바일 smoke (실제 소유자 인증 필요).
- [ ] 두 기존 users.id 병합이 필요하면 별도 충돌 계획·사용자 검토.

## 환경·검증 경계

`cloud-environment-onboarding:setup`으로 준비한 격리 checkout/toolchain을 재사용한다. 현재 공식
Kakao REST 접근은 HTTP 200이다. 실행 환경에 GCP identity/Kakao credential binding은 없으며,
운영 조회·배포는 저장소의 승인된 main WIF workflow로 진행한다. GitHub secrets/variables metadata
조회 403은 키 부재 증거가 아니다. 새 optional metadata workflow는 main 통합 후 실행 가능하다.
키 값·secret version·계정 토큰을 채팅/문서/로그에 기록하지 않는다.

4-A는 운영 배포 완료다. 4-B/4-C는 격리 로컬 구현·검증이며 운영 migration 21·앱 설정·실제 OAuth는
미실행이다. 검증 상세와 OPEN 조건은 [CHECK](../checks/CHECK-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1.md)를 따른다.
