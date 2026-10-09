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

## 단계와 TODO

각 단계는 별도 PR로 검증·push한다. main 통합은 사용자 승인 후 진행하고, 다음 단계는 최신 main의 소비처를 다시 조사한다. 이번 클라우드는 setup 스킬에 따라 이미 격리된 checkout을 사용하며 단계 1은 `wo/auth-refactor-phase1`, 단계 2는 최신 main 기반 `wo/auth-refactor-phase2`에서 작업한다. 다른 세션의 checkout/index/runtime은 변경하지 않는다.

### 1. 정책·공개 로그아웃 계약 정리

- [x] 최신 main 및 공통 모듈·API·문자열 소비처 조사
- [x] 확정 정책, 용어, 후속 TODO를 정본·작업 문서에 반영
- [x] 사용자 화면의 전체/다른 기기 로그아웃 제거
- [x] 공통 클라이언트·Context의 `logoutAll` 제거 및 모든 소비처 갱신
- [x] 공개 `/auth/logout-all` 제거, 비밀번호 재설정의 내부 보안 폐기 유지
- [x] 영향 범위 테스트·타입 검사·lint·화면 smoke
- [x] commit·push·PR용 변경과 검증 자료 준비
- [x] 필수 CI·review 확인 및 main 통합 (PR #361, 후속 Demo 복구 PR은 별도 기록)

### 2. 세션·비밀번호

- [x] 현재 일반 logout이 `(user_id, service_key)` epoch를 올려 같은 서비스의 다른 기기까지 종료하는 동작을 브라우저 세션 단위로 교체
- [x] access token도 폐기 상태를 확인하여 비밀번호 변경·재설정 후 즉시 거부
- [x] refresh·handoff가 세션 폐기를 우회하지 못하도록 같은 판정 사용
- [x] Store/KPA 별도 refresh 경로를 공통 coordinator로 수렴; logout·재로그인 중 늦게 도착한 응답 차단
- [x] 공통 계정 보안 UI에 첫 비밀번호 추가·기존 비밀번호 변경 구현; Demo 계정 변경 차단
- [x] 전체관리자 cookie 상태와 중복 저장소 소비처 조사 후 단일화
- [x] 서비스별 일반 logout, 다른 기기 유지, 비밀번호 변경·reset 전역 폐기 회귀 검증

- [ ] 단계 2 PR 필수 CI·review, main 통합 승인 및 운영 적용
- [ ] 단계 2 배포 후 유지 서비스 8개 PC·모바일 운영 smoke (격리 검증과 별개)

### 3. 가입·권한 회귀 테스트

- [ ] 최신 main 기준 가입·로그인·서비스 이용 자격·조직 소유권·role 소비처 재조사
- [ ] 이메일·Google 계정 가입이 서비스 membership·역할·매장을 자동 생성하지 않는지 검증
- [ ] 미가입·pending·rejected·suspended·withdrawn 상태와 승인 전후 접근 검증
- [ ] 약국장·공급자 Demo 데이터 연결, 매장 원장 기반 권한 및 가입 우회 방지 검증
- [ ] 전체관리자 Google 전용, 서비스 관리자·운영자 격리, 역할 회수의 즉시 반영 검증
- [ ] 유지 8개 서비스 × 두 Demo × PC·모바일 운영 검증과 실패 응답 기록
- [ ] 검증 자료·수정·commit·push·PR 및 사용자 승인 후 main 통합

### 4. 카카오 로그인·명시적 연결

- [ ] 카카오 앱 설정·redirect origin·서버 자격정보 존재 확인 (값은 환경 설정에서만 관리)
- [ ] 서버 검증 OAuth code 교환, state/PKCE·일회 사용·redirect 검증과 카카오 ID 기반 조회
- [ ] 카카오 확인 이메일이 없으면 O4O 이메일 확인 수행; 공통 이름·모바일·약관 가입 정책 적용
- [ ] `authMethod`를 Google/password/Kakao로 명시; 전체관리자 경계는 Google 긍정 판정
- [ ] 공통 로그인 컴포넌트와 각 서비스·handoff에 카카오 방식 연결
- [ ] 기존 계정 재인증 + 외부 계정 인증을 거친 명시적 연결; Demo 소셜 연결 차단
- [ ] provider uniqueness 및 동시 연결 충돌·실패 rollback·마지막 로그인 수단 보호 검증
- [ ] 동일 이메일 자동 병합 금지 회귀 및 소셜 실접속 smoke

연결과 기존 두 O4O 계정 병합은 별개다. 다른 `users.id`에 연결된 소셜 계정을 자동 이동하지 않는다. 기존 두 계정의 병합은 양쪽 소유 증명, 유지할 계정 선택, 역할·서비스 가입·사업자 소유권 충돌 처리안을 먼저 사용자와 검토한다. 서비스/관리 권한의 단순 합집합은 금지한다.

### 5. 테스트 데이터 연결·정리

- [ ] 실제 대상 DB와 접속 경로 확인; 격리 로컬 DB와 기존 데이터 DB를 혼동하지 않음
- [ ] 계정·가입·역할·소유권·콘텐츠·상품·주문·FK 목록 조사 및 disposition 작성
- [ ] 기존 provisioning의 고정 보호 ID/과거 실사용 가정 재검토; 기본 dry-run인 명시적 대상 계획으로 교체
- [ ] 재사용 데이터 연결 → 기능 검증 → 미사용 데이터 삭제 → 마지막에 불필요 계정 삭제
- [ ] 삭제 전 복구 자료, 정확한 대상 목록, transaction·멱등성과 참조 무결성 검증
- [ ] 모든 사용자 서비스에서 두 Demo의 일반 로그인·원래 목적지 복귀·기능 체험 desktop/mobile smoke
- [ ] 테스트 계정 소셜 연결·비밀번호 변경·관리 권한 차단 회귀 검증

## 승인 범위와 실행 경계

본 대화의 승인은 위 인증 API/shared contract, 세션 및 provider 제약에 필요한 migration 코드, 테스트 seed·연결·정리 코드를 단계별로 구현하는 근거다. F10/F11 예외는 해당 인증 수단·세션 처리에 한정하고, `role_assignments` SSOT와 서비스 가입·조직·권한 분리는 유지한다. Frozen 문서 본문은 임의로 재작성하지 않는다.

기존 테스트 데이터 정리도 승인됐으나, 연결 가능한 대상 DB 확인과 복구 가능한 대상 계획 없이 삭제하지 않는다. 운영 배포/migration은 PR 통합 이후 현재 Delivery 정책을 따른다. 현재 환경에는 기존 데이터 DB 및 카카오 자격정보 binding이 없으므로 실제 데이터 정리·외부 OAuth smoke는 아직 실행할 수 없다. 비밀번호·토큰·실제 계정 정보는 문서에 기록하지 않는다.

## 완료 판단

체크된 TODO와 실제 검증 결과만 완료로 보고한다. 각 PR은 이번 변경 미커밋 0건, 작업 branch push, 필수 CI 및 review blocker 확인 후 integration-ready로 보고하고 main merge 승인 전 멈춘다. 후속 단계 TODO를 완료로 간주하지 않는다.

단계 1 로컬 검증 결과: [CHECK-O4O-AUTH-REFACTOR-PHASE1-V1](../checks/CHECK-O4O-AUTH-REFACTOR-PHASE1-V1.md).


단계 2 검증 결과: [CHECK-O4O-AUTH-REFACTOR-PHASE2-V1](../checks/CHECK-O4O-AUTH-REFACTOR-PHASE2-V1.md). 사용자 지정 순서(2026-10-09)는 세션·비밀번호 → 가입·권한 회귀 → 카카오·계정 연결이다. 데이터 연결 확인은 각 단계의 Demo 검증에 포함하고, 별도 정리 TODO를 선행 완료로 간주하지 않는다.
