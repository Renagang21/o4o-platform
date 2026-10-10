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

각 단계는 별도 PR로 검증·push한다. main 통합은 사용자 승인 후 진행하고, 다음 단계는 최신 main의 소비처를 다시 조사한다. 이번 클라우드는 setup 스킬에 따라 이미 격리된 checkout을 사용하며 단계 1은 `wo/auth-refactor-phase1`, 단계 2는 최신 main 기반 `wo/auth-refactor-phase2`에서 작업한다. 단계 3은 배포된 최신 main `03f9729856` 기반 `wo/auth-refactor-phase3`에서 회귀 검증한다. 다른 세션의 checkout/index/runtime은 변경하지 않는다.

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

- [x] 단계 2 PR 필수 CI·review, main 통합 승인 및 운영 적용 (PR #378, main `03f9729856`, Promote #37886624466)
- [x] 단계 2 배포 후 유지 서비스 8개 PC·모바일 운영 smoke (일반 32/32, access 제거 후 logout 32/32; 운영 API 세션 격리 32/32)

### 3. 가입·권한 회귀 테스트

- [x] 최신 main 기준 가입·로그인·서비스 이용 자격·조직 소유권·role 소비처 재조사
- [x] 이메일·Google 계정 가입이 서비스 membership·역할·매장을 자동 생성하지 않는지 검증
- [x] 미가입·pending·rejected·suspended·withdrawn 상태와 승인 전후 접근 검증
- [x] 약국장·공급자 Demo 데이터 연결, 매장 원장 기반 권한 및 가입 우회 방지 검증
- [x] 전체관리자 Google 전용, 서비스 관리자·운영자 격리, 역할 회수의 즉시 반영 검증
- [x] 유지 8개 서비스 × 두 Demo × PC·모바일 운영 검증과 실패 응답 기록
- [x] 검증 자료·commit·push·PR 준비 (runtime 수정 없음)
- [x] 회귀 기록 PR #382 필수 CI·review 및 사용자 승인 후 main 통합 (`2002214684`, 통합 후 CI #37892227465 PASS)
- [ ] 별도 문서 정합 작업: Identity V3의 과거 kpa-society/k-cosmetics 로그인 membership 필수 문구를 현행 공통 로그인 정책과 정렬 (CHECK의 OPEN 드리프트; Frozen 본문 임의 수정 없음)

### 4. 카카오 로그인·명시적 연결

문서·코드 조사로 구체화한 TODO와 하위 PR 순서는 [카카오·명시적 연결 WO](WO-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1.md)를 따른다. 4-A는 세션 수단·전체관리자 경계, 4-B는 카카오 OAuth, 4-C는 재인증 기반 계정 연결이다. 기존 Google 세션의 claim 부재 및 handoff의 Google 추정부터 해소한다.

- [x] 카카오 앱·고정 callback·서버 Secret Manager binding·runtime 접근 권한 확인 및 API 설정 활성화 (#38029009245, 비밀값 기록 없음)
- [x] 서버 검증 REST code 교환, 브라우저에 바인딩한 state·일회 사용·redirect 검증과 카카오 ID 기반 조회 (PKCE 지원은 단정하지 않음)
- [x] 카카오 확인 이메일이 없으면 O4O 이메일 확인 수행; 공통 이름·모바일·약관 가입 정책 적용
- [x] `authMethod`를 Google/password/Kakao로 명시; 전체관리자 경계는 Google 긍정 판정
- [x] 공통 로그인 컴포넌트와 각 서비스·handoff에 카카오 방식 연결
- [x] 기존 계정 재인증 + 외부 계정 인증을 거친 명시적 연결; Demo 소셜 연결 차단
- [x] provider uniqueness 및 동시 연결 충돌·실패 rollback·마지막 로그인 수단 보호 검증
- [x] 동일 이메일 자동 병합 금지 로컬 회귀
- [x] PR #392 main `26b98a33c1` 통합·Promote #38019828704 운영 배포; 배포 후 실제 Demo 32/32 PASS (외부 OAuth 검증과 구분)
- [ ] 카카오 운영 설정 활성화 후 실제 Google/Kakao 실접속·명시적 연결 PC/mobile smoke (실제 소유자 인증 필요)
- [x] 운영 callback의 `Invalid request / invalid characters` 차단 수정: PR #401 main `73cd907d20` 통합, API-only Promote #38035112556 SUCCESS. 합성 opaque code/state는 401 flow 검증까지 전달, 다른 SQL 필드는 400 거절 유지. 실제 소유자 가입 완료와 구분.
- [x] 홈 카카오 config 조회 복구 UI: PR #403 main `82742b84e8` 통합·Promote #38039708401 웹 6개 배포 SUCCESS. 유지 8 origin PC/mobile 화면 16·config 장애/재시도 12·공개 API 12·Demo 32건 PASS. 사용자 브라우저 최초 조회 실패 원인은 미확정이며 실제 소유자 가입 완료와 구분.
- [ ] P1 가입 acceptance 누락 수정: 카카오 UI/client/DTO의 published 문서 ID/version과 signup transaction의 `user_policy_acceptances` 저장 부재를 canonical 위반으로 확정. ID/version 재검증·원자적 저장·rollback/gate 회귀 및 이메일/Google 동일 계약 전수 조사 필요. 실제 제보된 약관 화면 이동의 직접 원인은 별도 재현·확인하고 가입 UI 가독성/입력 보존도 검증.
- [ ] 후속 개인정보 처리방침 표시·내용 정합: 읽기 어려운 화면과 리팩터링 전 내용을 조사해 사용자 검토 후 갱신.

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

기존 테스트 데이터 정리도 승인됐으나, 연결 가능한 대상 DB 확인과 복구 가능한 대상 계획 없이 삭제하지 않는다. 운영 배포/migration은 PR 통합 이후 현재 Delivery 정책을 따른다. 현재 cloud의 직접 DB/GCP 자격정보와 별개로 운영 설정은 승인된 WIF workflow로 반영한다. 실제 데이터 정리는 대상 DB·복구 계획 확인이 필요하고, 외부 OAuth는 실제 소유자 인증 및 아래 운영 오류 수정·재배포 후 검증이 필요하다. 비밀번호·토큰·실제 계정 정보는 문서에 기록하지 않는다.

## 완료 판단

체크된 TODO와 실제 검증 결과만 완료로 보고한다. 각 PR은 이번 변경 미커밋 0건, 작업 branch push, 필수 CI 및 review blocker 확인 후 integration-ready로 보고하고 main merge 승인 전 멈춘다. 후속 단계 TODO를 완료로 간주하지 않는다.

단계 1 로컬 검증 결과: [CHECK-O4O-AUTH-REFACTOR-PHASE1-V1](../checks/CHECK-O4O-AUTH-REFACTOR-PHASE1-V1.md).


단계 2 검증 결과: [CHECK-O4O-AUTH-REFACTOR-PHASE2-V1](../checks/CHECK-O4O-AUTH-REFACTOR-PHASE2-V1.md). 사용자 지정 순서(2026-10-09)는 세션·비밀번호 → 가입·권한 회귀 → 카카오·계정 연결이다. 데이터 연결 확인은 각 단계의 Demo 검증에 포함하고, 별도 정리 TODO를 선행 완료로 간주하지 않는다.

단계 3: 같은 CHECK의 [가입·권한 회귀](../checks/CHECK-O4O-AUTH-REFACTOR-PHASE2-V1.md#가입권한-회귀--phase-3)에 API 483건·UI 130건과 운영 8개 서비스 PC/모바일 32건의 결과를 기록했다. 이 후속은 기록-only이며 추가 배포 대상이 아니다. 실제 카카오 OAuth와 계정 연결·데이터 정리는 후속 TODO다.

## 2026-10-10 단계 4 진행 (PR #392 배포 당시 및 후속 관측)

4-A PR #387 main `7a11f7d201` 통합, Promote #38011885470 API·전체관리자·웹 배포 성공.
4-B/4-C PR #392는 사용자 승인 후 main `26b98a33c1`에 통합했다. post-merge CI #38019181483와
CodeQL PASS, Promote #38019828704 API migration·전체관리자·웹 5개 배포 SUCCESS.
배포 후 유지 8개 origin × PC/mobile × 두 Demo 역할 32/32 PASS; 약국 업무의 매장 경영자 200,
공급자 업무 200, 반대 역할 거절, Demo 소셜/비밀번호 변경 불가, 로그아웃 access/refresh 401 확인.
운영 Kakao config는 8개 origin 모두 `enabled=false`다. 기존 Secret Manager 리소스 조회는
`secretmanager.secrets.list` 권한 부족으로 미확인이다. 앱/키 연결과 실제 Google/Kakao 로그인·
가입·재인증·명시적 연결, 전체관리자 실제 Google 재로그인은 OPEN으로 유지한다.
검증: [카카오·명시적 연결 CHECK](../checks/CHECK-O4O-AUTH-KAKAO-AND-EXPLICIT-LINK-V1.md).

후속 설정 배포 #38029009245는 API-only verified SUCCESS다. 유지 8개 origin Kakao
enabled=true, 전체관리자 false, 실제 Demo 32/32·Demo 변경 차단 2/2 PASS를 확인했다.
실제 소유자의 가입 시도는 문자 검사 오류가 보고돼 완료되지 않았다. 위 가입 차단 수정과
취소 callback 브라우저 복귀, 실제 계정 연결 검증은 OPEN이다. 이전 enabled=false·리소스
조회 실패 서술은 당시 관측이며 최신 설정 상태로 사용하지 않는다.

후속 PR #401은 main `73cd907d20` 통합·필수 CI 및 CodeQL PASS, API-only Promote
#38035112556 SUCCESS다. 운영 API 17/17, Demo PC/mobile 32/32, Demo 변경 차단 2/2 PASS.
취소 callback 303 뒤 복귀 주소를 UI에서 수동 따라가기 4/4 PASS이며 native API 탐색 및
실제 소유자 가입·로그인·명시적 연결 완료를 뜻하지 않는다. 이후 사용자의 메인 홈 로그인 창
카카오 버튼 미노출 제보를 별도 TODO로 유지한다. 공통 설정 조회 실패·지연의 안내/재시도
수정은 로컬 auth-react 174·Neture 모달 13·UI fixture 12 PASS; 아직 웹 배포 결과가 아니다.

사용자는 이후 새로고침 뒤 카카오 버튼 가시성을 확인했다. 새 웹 변경 배포 전의 관측이다.
버튼의 현재 미노출은 해소됐지만 조회 복구 UI 배포·실제 OAuth 완료 TODO는 유지한다.

후속 PR #403은 사용자 승인 후 main `82742b84e8`에 통합했고 post-merge CI/CodeQL PASS,
Promote #38039708401 웹 6개 대상 SUCCESS다. API/migration/IAM 변경 없음. 운영 화면 28/28,
공개 점검 12/12, 실제 Demo UI 32/32 PASS이며 업무 역할·logout 및 다른 origin 세션 유지도 확인했다.
위 미배포 서술은 과거 관측이며 조회 복구 UI 배포 TODO는 이제 완료다. 실제 소유자 인증·
추가 정보 적용 후 약관 반복 및 정책 표시/내용 갱신은 계속 OPEN이다. 최초 가입 필수
이메일·이름·개인 모바일 계약은 확인했으며 별도 ID/비밀번호 생성·SMS 본인 인증은 없다.
검증 기록과 후속 TODO는 카카오 CHECK/하위 WO를 따른다. 정책 본문/버전은 이번에 바꾸지 않았다.

검증 기록 리뷰 후 카카오 가입의 published 약관 ID/version 검증·원자적인 acceptance 저장
누락을 P1 구현 blocker로 확정했다. 이를 미확정 조사 후보로만 두지 않으며 실제 소유자
가입 완료 판정 전에 우선 수정·검증한다. Neture wrapper `TermsAcceptanceGate`와 공통
`PolicyAcceptanceGate`를 구분한다. 사용자 화면 이동의 직접 원인을 확인한 것으로 확대하지 않는다.

## 2026-10-10 가입 약관 P1 후속 구현

카카오·이메일·Google 가입이 현재 게시 약관 ID/version을 전달하고 계정/인증 수단 생성과
동일 transaction에 acceptance를 저장하도록 수정했다. origin에서 적용 약관을 결정하며
membership/권한 자동 생성 및 동일 이메일 자동 연결은 허용하지 않는다. 약관 조회 실패·버전
변경 시 가입을 차단하고 재조회/재동의하며 입력값은 보존한다. 내용 보기와 동의는 분리했다.

구현·격리 검증 완료와 main 통합/운영 배포/실제 OAuth 완료를 구분한다. 하위 WO/CHECK의
수정 TODO 및 소비처 매트릭스를 따른다. 기존 기록 PR #407을 구현 범위로 확장하며 새 runtime
범위의 통합은 required CI/review와 사용자 승인 후 진행한다. 정책 본문/버전 게시는 별도 OPEN이다.


## 2026-10-10 PR #407 운영 배포 결과

PR #407은 최신 리뷰 지적 수정·required CI 후 main `2a8b80cf24`에 통합했다.
post-merge CI/CodeQL PASS, Promote #38049884263 API 먼저 및 웹 6개 SUCCESS.
운영 게시 약관 API 9/9 PASS. 실제 Demo 최초 30/32 PASS 후 시간 초과 2건 각각 재실행 PASS.
배포 가입 화면 합성 검증 최초 13/16 PASS이며 공급자·펀딩의 기존 `/login` ↔ `/` 순환을
추가 진단 및 코드에서 확인해 후속 TODO로 추가했다. 실제 OAuth 및 새 정책 본문 게시는 OPEN.
후속 작업은 하위 카카오 WO와 CHECK의 배포 검증 절을 따른다. 최초 실패와 실제 계정 검증의
한계를 기록하며 이후 main의 별도 변경을 이번 배포 성공에 포함하지 않는다.
