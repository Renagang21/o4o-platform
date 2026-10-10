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
운영 DB 적용·외부 앱 설정·main 통합은 구현 및 로컬 검증과 구분한다. 각 하위 단계는 별도 PR로
검증·push하고 main 통합 승인 후 다음 단계를 최신 main에서 진행한다.

## 문서·코드 조사로 수정한 TODO

| ID | 초기 항목 | 확인한 근거 | 수정한 실행 항목 / 상태 |
|---|---|---|---|
| D01 | 기존 카카오 기능 재사용 | `modules/auth/routes/auth.routes.ts`, `config/app.config.ts`: passport OAuth는 은퇴. `.env.example`의 KAKAO 이름은 실행 경로가 아니다 | 신규 서버 검증 OAuth 구현. 기존 passport·settings 경로 복원 금지 |
| D02 | 카카오 로그인 버튼 추가 | `auth-react/LoginMethods.tsx`, Neture `LoginModal.tsx`·`EmailAuthPages.tsx`: 공통 조립과 직접 Google 조립 소비처가 공존 | 공통 컴포넌트 + 모든 실제 진입점을 함께 연결; 전체관리자 제외 |
| D03 | 인증 수단 표시 | `types/auth.ts`: password만 명시; Google 발급은 claim 없음. `handoff.controller.ts`는 password가 아니면 Google로 추정 | **선행 4-A**: Google/password/Kakao 명시, 관리자 Google 긍정 판정, refresh·handoff 승계 |
| D04 | handoff 수단 보존 | `AddHandoffTokenSourceAuthMethod1790684000000`: CHECK가 Google/password만 허용 | 새 incremental migration으로 Kakao 허용. 기존 적용 migration·baseline 수정 금지; PG15 fingerprint 검증 |
| D05 | 동일 이메일이면 연결 | `google-identity.service.ts`는 sub 조회, `google-auth.service.ts`는 이메일 충돌 거절; Google 연결 라우트는 은퇴 | 새 명시적 연결 흐름: 현재 계정 재인증 + 연결할 provider 인증, 다른 users.id 연결은 충돌 거절 |
| D06 | 카카오 확인 이메일 사용 | `users.email`의 NOT NULL/UNIQUE, 메인 가입 정책의 이메일 확인·이름·모바일·약관 요구 | 카카오가 이메일 소유를 확인하지 못하면 O4O 확인 절차. 임의 이메일·provider 응답만으로 verified 처리 금지 |
| D07 | state/PKCE 구현 | 현재 카카오 코드 없음. 공식 REST 문서는 현 환경 프록시 403 | 공식 지원 확인 전 PKCE 지원을 단정하지 않음. 서버 일회용 state·브라우저 바인딩·redirect 검증을 먼저 설계; 지원 확인은 OPEN |
| D08 | 설정이 없으면 새 키 요청 | 환경 binding/변수 이름에 KAKAO 없음; deploy API도 KAKAO 참조 없음. 운영 Secret Manager 실제 존재 여부는 미확인 | 값 요청 전에 기존 운영 설정 조회 경로 조사. 공식 도메인만 초안 저장; 자격정보 미확인과 부재를 구분 |
| D09 | 기존 두 계정 병합 | 상위 WO: 연결과 두 users.id 병합은 별개 | 양쪽 소유 증명·유지 계정·가입/권한/사업자 충돌안을 별도 검토. 권한 합집합·소셜 자동 이동 금지 |
| D10 | 이전 단계 문서 완료 | PR #382 main `2002214684`, 통합 후 CI #37892227465 성공 | 단계 3 검증 기록 통합 완료. Identity V3의 오래된 로그인/카카오 제한 문구와 MYPAGE의 password UI 미구현 서술은 별도 문서 정합 TODO |

## 4-A. 세션 인증 수단·전체관리자 경계 (이번 PR)

- [x] 최신 main `01a47e6d4c`에서 새 branch `wo/auth-refactor-phase4` 시작; 준비된 격리 클라우드 checkout 사용.
- [x] 정책·token issuer·request guard·refresh·handoff 원장/교환 소비처 조사.
- [x] Google 발급 access/refresh에 `authMethod: 'google'` 명시; password 표식 유지; Kakao 타입 추가.
- [x] 요청·refresh·handoff에서 전체관리자/`platform:*`는 `authMethod === 'google'`만 허용.
- [x] 수단 없는 이전 토큰·미지 값은 Google로 승격하지 않음. 일반 서비스 기존 세션은 유지하고 관리자 재로그인 필요를 기록.
- [x] 세 인증 수단의 refresh·handoff 승계와 역할 부여 후 거절, optionalAuth의 비로그인 처리를 검증.
- [x] handoff CHECK 확장 migration·manifest·PG15 expected fingerprint·up/down 재현 검증.
- [x] Google/email 가입, 브라우저 로그아웃, 비밀번호 보안 폐기, 서비스 접근 회귀·type-check·lint·build.
- [x] [CHECK](../checks/CHECK-O4O-AUTH-REFACTOR-PHASE4A-V1.md)와 TODO를 로컬 실제 결과로 갱신; commit·push·PR 준비.
- [ ] PR 필수 CI·review 및 사용자 승인 후 main 통합 (최신 상태는 PR에서 확인).
- [ ] 사용자 승인 후 main 통합·API 운영 적용·전체관리자 재로그인·유지 8개 서비스 PC/모바일 smoke.

## 4-B. 카카오 로그인·가입

- [ ] 공식 REST/OIDC 문서와 state/PKCE 지원을 확인하고 설계를 확정.
- [ ] 기존 운영 앱 설정·REST client ID·client secret·redirect URI 조회 경로 확인; 값은 환경/Secret Manager에서만 관리.
- [ ] 서버 설정이 준비된 경우만 사용 가능한 공통 카카오 버튼·공개 enabled 설정 제공.
- [ ] 인증 code를 서버에서 교환; client/redirect 고정, timeout·실패 시 로그 마스킹, provider ID 검증.
- [ ] 일회용 state를 브라우저·요청 origin·용도(login/link)에 바인딩; 동시 소비·재사용·만료·취소·redirect 공격 검증.
- [ ] provider ID만으로 로그인 조회; 신규 가입은 확인 이메일 또는 O4O 이메일 확인·이름·모바일·약관 요구.
- [ ] provider/user당 유일성 제약 확인 및 필요한 새 migration; 충돌·실패 transaction 검증.
- [ ] 공통/직접 조립 로그인·각 서비스 return/handoff를 연결; 전체관리자에 Kakao 허용하지 않음.
- [ ] 유지 8개 서비스 PC/모바일 회귀, 운영 앱 등록 후 실제 OAuth smoke. mock 통과와 실접속 완료를 구분.

## 4-C. Google·카카오 명시적 계정 연결

- [ ] 로그인한 현재 users.id를 password 또는 현재 연결된 provider로 재인증; 세션·보안 세대에 바인딩한 짧은 일회용 연결 권한.
- [ ] 연결할 Google/Kakao 인증을 별도로 검증하고 사용자 확인 후 같은 users.id에만 연결.
- [ ] Demo 연결 차단, 다른 users.id의 provider 이동 차단, 동시 요청·중복·rollback 검증.
- [ ] 이메일 동일/상이 모두 같은 명시적 연결 원칙; 자동 가입·role·membership·ownership 변경 0.
- [ ] 마지막 로그인 수단 보호: 이번 연결 구현에서 해제/계정 병합 기능을 임의 추가하지 않음; 추후 해제에는 재인증·마지막 수단 보호 필수.
- [ ] 공통 계정 보안 화면 및 모든 소비처 안내, 회귀·실제 Google/Kakao 연결 smoke.
- [ ] 두 기존 users.id 병합이 필요한 경우 별도 충돌 계획 작성·사용자 검토.

## 환경·검증 경계

`cloud-environment-onboarding:setup`에 따라 현재 checkout/toolchain을 재사용한다. 2026-10-09
카카오 공식 조회는 proxy 403, 런타임 KAKAO 변수 binding은 확인되지 않았다. 환경 초안에는
`developers.kakao.com`, `kauth.kakao.com`, `kapi.kakao.com` 세 도메인을 기존 목록 보존 후 추가 저장했다.
초안 저장은 실행 반영·게시·앱 등록·자격정보 준비 완료가 아니다. 실제 OAuth는 OPEN이며 4-A의 로컬
검증과 분리한다. 테스트·DB는 격리 로컬을 사용한다; 운영 migration·앱 설정 변경은 이번 구현에서 실행하지 않는다.
