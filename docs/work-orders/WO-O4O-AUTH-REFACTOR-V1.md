# WO-O4O-AUTH-REFACTOR-V1

> **상태**: ACTIVE · **작성일**: 2026-10-08
> **근거**: 사용자 기획 검토 및 단계별 구현·push 승인
> **정책 정본**: [인증·서비스 가입](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md), [Identity V3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md), [Demo 계정](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md)

## 확정 정책

- 일반 로그아웃은 해당 서브도메인의 현재 브라우저 세션만 종료한다. 사용자용 전체/다른 기기 로그아웃은 제공하지 않는다.
- 비밀번호 변경·재설정은 모든 서비스의 기존 세션을 무효화한다. 이 보안 처리는 사용자용 전체 로그아웃 기능과 분리한다.
- 이메일·비밀번호, Google, 카카오 로그인을 계정 단위로 제공한다. 카카오는 새 구현 대상이다. `users.id`는 공통 주체이고, 소셜 식별자는 제공자별 고유 ID다. 같은 이메일로 자동 연결·병합하지 않는다.
- 각 사용자 서비스 로그인 화면은 일반 이메일 로그인 경로를 사용하는 공개 테스트 로그인 버튼을 제공한다. 버튼 존재뿐 아니라 로그인 후 의미 있는 샘플 데이터를 사용하는 것까지 검증한다.
- 사용자가 현재 계정과 데이터를 모두 테스트 데이터로 지정했다. 재사용할 데이터는 대표 Demo 소유권에 연결하고, 재사용하지 않는 데이터와 개발을 방해하는 계정은 정리할 수 있다. 기존 ‘실사용’ 분류는 현재 상태의 근거로 사용하지 않는다.
- `admin.neture.co.kr`의 관리 주체는 문서에서 **전체관리자**라고 부른다. 서비스 관리자·서비스 운영자와 구분하며 기술 role 코드는 바꾸지 않는다. 전체관리자 인증은 Google 전용이다. 공개 Demo에 관리 권한을 주지 않는다.

### 사용자 범위 변경 — 2026-10-09 KST

Pharmacy-Hub(`pharmacy-hub`, `services/web-pharmacy-hub`, `pharmacyhub.co.kr`)는 사용자 지정 **삭제 대상**이다. 이후 인증 리팩토링·공개 테스트 버튼·샘플 데이터 연결·운영 smoke 대상에서 제외한다. 해당 도메인 허용 설정은 인증 검증의 선행 조건으로 요청하지 않는다. 별도 약국 서비스인 `pharmacy.neture.co.kr`(`kpa-society`)는 유지하며 약국장 Demo 검증을 계속한다. 기존 단계 1의 소비처 검사 기록은 당시 실행 결과로 보존한다.

## 단계와 TODO

각 단계는 별도 PR로 검증·push한다. main 통합은 사용자 승인 후 진행하고, 다음 단계는 최신 main의 소비처를 다시 조사한다. 1단계 구현은 setup 스킬에 따라 이미 격리된 클라우드 checkout의 `wo/auth-refactor-phase1`에서 진행했다. 다른 세션의 checkout/index/runtime은 변경하지 않는다.

### 1. 정책·공개 로그아웃 계약 정리

- [x] 최신 main 및 공통 모듈·API·문자열 소비처 조사
- [x] 확정 정책, 용어, 후속 TODO를 정본·작업 문서에 반영
- [x] 사용자 화면의 전체/다른 기기 로그아웃 제거
- [x] 공통 클라이언트·Context의 `logoutAll` 제거 및 모든 소비처 갱신
- [x] 공개 `/auth/logout-all` 제거, 비밀번호 재설정의 내부 보안 폐기 유지
- [x] 영향 범위 테스트·타입 검사·lint·화면 smoke
- [x] commit·push·PR용 변경과 검증 자료 준비
- [x] 필수 CI·review 확인 및 사용자 승인 후 main 통합 — [PR #361](https://github.com/Renagang21/o4o-platform/pull/361), `0795464cc5597eb995d591b99ef7587a20da7d14`

운영 배포와 2026-10-08 공개 테스트 버튼 실접속 결과는 [단계 1 CHECK의 운영 검증](../checks/CHECK-O4O-AUTH-REFACTOR-PHASE1-V1.md#운영-배포-후-공개-demo-실접속-검증--2026-10-08)을 따른다. 로그인 성공과 업무 데이터 체험 완료를 구분한다.

### 2. 세션·비밀번호

- [ ] 현재 일반 logout이 `(user_id, service_key)` epoch를 올려 같은 서비스의 다른 기기까지 종료하는 동작을 브라우저 세션 단위로 교체
- [ ] access token도 폐기 상태를 확인하여 비밀번호 변경·재설정 후 즉시 거부
- [ ] refresh·handoff가 세션 폐기를 우회하지 못하도록 같은 판정 사용
- [ ] Store/KPA 별도 refresh 경로를 공통 coordinator로 수렴; logout·재로그인 중 늦게 도착한 응답 차단
- [ ] 공통 계정 보안 UI에 첫 비밀번호 추가·기존 비밀번호 변경 구현; Demo 계정 변경 차단
- [ ] 전체관리자 cookie 상태와 중복 저장소 소비처 조사 후 단일화
- [ ] 서비스별 일반 logout, 다른 기기 유지, 비밀번호 변경·reset 전역 폐기 회귀 검증

운영 검증에서 같은 Neture 서브도메인의 다른 브라우저는 기존 access token으로 조회할 수 있었지만, logout 후 refresh가 `401 SERVICE_SESSION_REVOKED`로 거절됐다. 다른 브라우저 유지와 access token 폐기 판정을 함께 검증해야 한다. Neture logout 후 약국·Store 세션은 두 Demo 모두 refresh 및 새 access token 발급이 성공했다.

### 3. 카카오 로그인·명시적 연결

- [ ] 카카오 앱 설정·redirect origin·서버 자격정보 존재 확인 (값은 환경 설정에서만 관리)
- [ ] 서버 검증 OAuth code 교환, state/PKCE·일회 사용·redirect 검증과 카카오 ID 기반 조회
- [ ] 카카오 확인 이메일이 없으면 O4O 이메일 확인 수행; 공통 이름·모바일·약관 가입 정책 적용
- [ ] `authMethod`를 Google/password/Kakao로 명시; 전체관리자 경계는 Google 긍정 판정
- [ ] 공통 로그인 컴포넌트와 각 서비스·handoff에 카카오 방식 연결
- [ ] 기존 계정 재인증 + 외부 계정 인증을 거친 명시적 연결; Demo 소셜 연결 차단
- [ ] provider uniqueness 및 동시 연결 충돌·실패 rollback·마지막 로그인 수단 보호 검증
- [ ] 동일 이메일 자동 병합 금지 회귀 및 소셜 실접속 smoke

연결과 기존 두 O4O 계정 병합은 별개다. 다른 `users.id`에 연결된 소셜 계정을 자동 이동하지 않는다. 기존 두 계정의 병합은 양쪽 소유 증명, 유지할 계정 선택, 역할·서비스 가입·사업자 소유권 충돌 처리안을 먼저 사용자와 검토한다. 서비스/관리 권한의 단순 합집합은 금지한다.

### 4. 테스트 데이터 연결·정리

- [ ] 실제 대상 DB와 접속 경로 확인; 격리 로컬 DB와 기존 데이터 DB를 혼동하지 않음
- [ ] 계정·가입·역할·소유권·콘텐츠·상품·주문·FK 목록 조사 및 disposition 작성
- [ ] 약국장 Demo의 승인 원장·매장 ownership·진입 연결 확인 및 복구 — 운영 `/neture/home/entry`의 매장 0건, 약국 업무 API `403 STORE_OWNER_REQUIRED` 해소 후 재검증
- [ ] 메인 헤더 로그인 모달의 약국장 Demo 클릭부터 실제 매장 착지까지 회귀 검증 — 인증 HTTP 200만으로 PASS 판정하지 않음; 매장 이동 오류가 남으면 체험 FAIL
- [ ] 대표 홈의 약국 매장 진입 판정을 약국 업무 guard의 승인 원장·조직 소유 관계와 정합화 — 현재 홈의 추가 service membership/`kpa:store_owner` 조건과 합성 Demo provisioning의 `neture:store_owner` 정책 차이 검토
- [ ] 공급자 Demo에 재사용할 상품·자료 ownership 연결 — 운영 공급자 상품 0건·라이브러리 자료 0건 상태에서 실제 기능 체험이 가능한 샘플 연결
- [ ] 기존 provisioning의 고정 보호 ID/과거 실사용 가정 재검토; 기본 dry-run인 명시적 대상 계획으로 교체
- [ ] 재사용 데이터 연결 → 기능 검증 → 미사용 데이터 삭제 → 마지막에 불필요 계정 삭제
- [ ] 삭제 전 복구 자료, 정확한 대상 목록, transaction·멱등성과 참조 무결성 검증
- [ ] 유지할 사용자 서비스에서 두 Demo의 일반 로그인·원래 목적지 복귀·기능 체험 desktop/mobile smoke — 삭제 대상 Pharmacy-Hub 제외
- [ ] 테스트 계정 소셜 연결·비밀번호 변경·관리 권한 차단 회귀 검증

### 삭제 대상 서비스 정리: Pharmacy-Hub

삭제 대상 지정과 실제 제거 완료를 구분한다. 다음 항목은 아직 실행하지 않았다.

- [ ] 웹 앱·API 등록·service catalog·가입/membership·handoff·메뉴·Store의 `/pharmacy-hub` 경로 및 공통 모듈 소비처 목록 확정
- [ ] 다른 서비스가 사용하는 기능·데이터와 Pharmacy-Hub 전용 대상을 구분하고 보존·이관·삭제 계획 작성
- [ ] 확정 대상의 코드·route·catalog·빌드/배포 참조 제거 및 유지 서비스 회귀 검증
- [ ] 운영 서비스·도메인 연결·데이터의 정확한 제거 대상과 복구 자료 확인 후 현재 Delivery 정책에 따라 정리
- [ ] 활성 서비스로 기재한 canonical index·약관/개인정보 문서 및 런타임 정책 참조 정합 검토 — 게시 원문과 과거 기록을 일괄 삭제하거나 재작성하지 않음

## 승인 범위와 실행 경계

본 대화의 승인은 위 인증 API/shared contract, 세션 및 provider 제약에 필요한 migration 코드, 테스트 seed·연결·정리 코드를 단계별로 구현하는 근거다. F10/F11 예외는 해당 인증 수단·세션 처리에 한정하고, `role_assignments` SSOT와 서비스 가입·조직·권한 분리는 유지한다. Frozen 문서 본문은 임의로 재작성하지 않는다.

기존 테스트 데이터 정리도 승인됐으나, 연결 가능한 대상 DB 확인과 복구 가능한 대상 계획 없이 삭제하지 않는다. 운영 배포/migration은 PR 통합 이후 현재 Delivery 정책을 따른다. 현재 환경에는 기존 데이터 DB 및 카카오 자격정보 binding이 없으므로 실제 데이터 정리·외부 OAuth smoke는 아직 실행할 수 없다. 비밀번호·토큰·실제 계정 정보는 문서에 기록하지 않는다.

## 완료 판단

체크된 TODO와 실제 검증 결과만 완료로 보고한다. 각 PR은 이번 변경 미커밋 0건, 작업 branch push, 필수 CI 및 review blocker 확인 후 integration-ready로 보고하고 main merge 승인 전 멈춘다. 후속 단계 TODO를 완료로 간주하지 않는다.

단계 1 로컬 검증 결과: [CHECK-O4O-AUTH-REFACTOR-PHASE1-V1](../checks/CHECK-O4O-AUTH-REFACTOR-PHASE1-V1.md).
