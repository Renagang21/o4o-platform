# 공통 약국 협력사업 구조에 만성질환관리 모델 추가

> **상태**: ACTIVE
> **작성일**: 2026-10-16
> **근거**: 사용자의 공통 기본 구조에 각 협력모델 서비스를 추가하는 방식 확정 및 구현 지시
> **관련 기준**: [서비스·내 약국 관계](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md#11-독립-약국-협력모델-서비스와-내-약국-2026-10-16-사용자-확정)

## 구현

- 공통 `COOPERATION_MODELS`에 pharmacy와 carepharm의 독립 목적지·참여 관리·회원 게시판·내 약국 진입을 등록한다. 이 설정은 권한을 부여하지 않는다.
- CarePharm은 공통 `CooperationMemberSpace`에 모델과 인증 API를 주입한다. 기존 사업 정보·약국 조직별 가입 신청·취소·탈퇴·콘텐츠 조회 API를 사용하며 새 가입 원장을 만들지 않는다.
- 서비스 안에서 가입·승인을 처리하고 내 약국에서는 승인된 모델의 공급 상품·자료 가져오기·주문 내역·전용 업무를 표시한다. 가입 관리는 해당 서비스로 세션을 전달하여 이동한다.
- 회원 게시판은 `business:carepharm` 사업 이름공간을 사용한다. 별도 독립 커뮤니티 가입이나 기존 pharmacy 가입으로 CarePharm 승인을 대체하지 않는다.
- 담당 운영자의 기존 회원·공급 제안 승인·콘텐츠 화면은 `businessKey=carepharm`으로 제한한다. 승인·제품 제공·자료 복사는 기존 서버의 사업·조직별 자격 판정을 그대로 사용한다.
- 인증 전달의 `sessionServiceKey=neture`는 현재 CarePharm의 플랫폼 계정 세션 경로다. CarePharm 사업 가입은 별도 `semi_franchise_memberships`로 판정하며 Neture/pharmacy 가입을 CarePharm 승인으로 취급하지 않는다.
- 최신 main의 Hero·광고 표시와 약국 경영자/직원 구분, 오래된 handoff 취소 처리를 보존한다. 서비스에 전달된 `store`는 접근 가능한 약국 목록으로 검증하고 가입·자료 API에 `X-Store-Organization-Id`로 전달한다. 여러 약국 중 임의의 약국을 선택하거나 잘못된 명시 선택을 다른 약국으로 대체하지 않는다.
- 계정·사업·선택 약국이 바뀌면 이전 자격과 콘텐츠를 제거하고 새 자격을 조회한다. 재동의가 필요한 세션은 회원 첫 화면에서도 기존 약관 게이트를 통과해야 한다.

## 검증

- 최신 main 통합 전 전체 회귀: Neture 101 파일·936 테스트, 내 매장 33 파일·372 테스트 통과.
- 최신 main 통합 전 관련 재검증: Neture 10 파일·100 테스트, 내 매장 2 파일·7 테스트 통과. 전체 회귀와 중복되므로 합산하지 않는다.
- 최신 main 통합 후: Neture 관련 10 파일·102 테스트, 운영자·CarePharm 3 파일·29 테스트, 내 매장 3 파일·18 테스트, 공통 Hero·광고 1 파일·25 테스트 통과. 묶음 사이의 중복은 합산하지 않는다.
- 최신 공통 types·UI를 재빌드한 후 두 앱의 TypeScript 검사와 production build, 변경 코드 ESLint, 문서 민감정보·diff 검사를 통과했다.
- 로컬 production bundle을 CarePharm 호스트로 매핑한 합성 브라우저에서 PC(1440)·모바일(390) 비로그인 진입, PC 참여 관리 이동, 페이지 JavaScript 오류·가로 넘침 없음을 확인했다. 실계정 운영 로그인이나 운영 배포 검증을 뜻하지 않는다.

## 운영 등록과 남은 범위

운영 DB write·배포는 실행하지 않는다. 다음 절차는 기존 관리 화면의 권한 있는 담당자가 수행한다.

1. 전체 관리자의 약국 협력사업 관리에서 key `carepharm`, 이름 `만성질환관리`로 사업을 등록하거나 기존 행을 확인한다. 참여 조건은 사업자가 확정한다. 이미 존재하는 사업·독립 커뮤니티의 회원을 자동 이전하거나 승인하지 않는다.
2. 해당 사업 담당 운영자를 지정하고 서비스에서 가입 심사·공급 제안 승인·자료 등록을 진행한다. 커뮤니티 주소가 없어도 기존 `business:carepharm` 해석 경로를 사용한다.
3. 코드 PR 통합·운영 배포 후 실제 서비스 가입 신청 → 운영자 승인 → 같은 약국의 내 약국 노출, 다른 약국·미승인 사용자 차단을 검증한다. 사업 미등록 시 화면은 조회 오류와 재시도를 제공하며 등록·자동 승인을 수행하지 않는다.

CGM 회사 API와 무료혈당기 코드 검증·사용 처리 규격이 없어 두 업무는 준비 중 안내만 제공한다. 실제 코드 입력·혈당기 지급이나 CGM 조회 성공을 흉내 내지 않는다. 공급자 자료 전달은 기존 제공 경로를 유지하며, 공급자 제출부터 사업 콘텐츠 게시까지의 전용 승인 흐름과 회원 게시글 자체의 내 약국 가져오기는 이번 구현 완료 범위에 포함하지 않는다. 사업 자료의 내 약국 사본 만들기는 기존 기능을 사용한다.

대표 홈의 준비 중 카드는 운영 개통 확인 전까지 유지한다. 이 문서와 앞선 정본 정정은 운영 개통 완료 기록이 아니다. 배포는 통합 담당자가 수행한다.

## PR #657 인계 후 P1/P2 보정 — 2026-10-16

기준 HEAD는 `e0023aa76785a864c50e3203a150641d5019138f`, 작업 branch는 기존 `wo/carepharm-cooperation-model`이다. 인계 시 main은 `13f89df0e48477509cc21128ea73cb42eb364b78`이다. 위 구현·검증 기록은 당시의 기록으로 보존하며, 다음 보정으로 기존 완료 판정의 한계를 명시한다. 기존 HEAD의 CI Gate·Sonar·CodeQL success와 Codex review completed는 이 보정 HEAD의 통과나 P1/P2 해소 승인을 뜻하지 않는다. 새 PR 생성·reopen·merge·배포는 수행하지 않는다.

### P1 — CarePharm handoff 계약 (`PRRT_kwDOOXrFm86tMNQp`)

기존 `sessionServiceKey=neture`를 그대로 handoff target으로 보내면 issuer는 대표 홈 계약을 적용하므로 CarePharm origin·참여·커뮤니티 목적지와 일치하지 않았다. 구현 전에 다음 한정된 서버 계약 확장을 보고했다.

- 계정 세션 identity는 기존 `neture`를 유지하고, 이동 대상만 `carepharm`이라는 고정 transport alias로 구분한다. 별도 서비스 회원권·가입 원장·권한을 만들지 않는다.
- issuer는 alias를 기존 Neture catalog identity로 확인하되 원장에는 alias를 보존한다. URL은 항상 `https://carepharm.neture.co.kr/handoff`이다. 클라이언트가 origin을 지정하거나 서버의 호스트 검사를 완화하지 않는다.
- returnPath는 홈·참여·자료·도구와 실제 CarePharm business forum 경로로 제한한다. 외부 경로, URL 정규화, 다른 사업 namespace, 임의 query/중복 query를 거절한다. 선택 약국 UUID 등 열거된 query만 허용한다.
- exchange는 alias 토큰을 정확한 CarePharm HTTPS origin에서만 소비하고 기존 `neture` 계정 세션을 발급한다. 출발 브라우저 세션 재확인·원자적 단일 소비·계정 상태 재확인은 유지한다. 대표 Neture 토큰은 기존 대표 origin·복귀 경로 계약을 계속 적용한다.
- `cooperationDestination`은 account session key와 handoff target alias를 구분한다. `requestServiceHandoff`의 HTTPS·expected origin·`/handoff` 검사는 변경하지 않는다. 기존 CORS의 CarePharm 허용과 catalog의 Neture session domain을 사용하며 새 host나 임의 redirect 계약을 추가하지 않는다.

### P2 — 선택 약국별 회원 업무 gate (`PRRT_kwDOOXrFm86tMNQw`)

계정 전체의 community `allowed`는 선택 약국의 승인 증명이 아니다. 신규 read-only `GET /neture/pharmacy/businesses/:key/store-access`는 기존 Store workspace·main access middleware에 이어 actor의 살아 있는 owner/admin/manager 조직 권한과 선택 약국의 해당 사업 active membership을 서버 SQL로 함께 검증한다. 사업·기본 약국 상태도 active여야 한다. 다른 약국 승인, `pharmacy` 가입, 사업 운영자 지정으로 선택 약국의 `carepharm` 승인을 대신하지 않는다.

회원 홈·도구·자료는 이 선택 약국 응답을 받은 뒤에만 렌더하고 자료를 요청한다. 가입·신청 화면에서는 미승인 소유 약국을 선택할 수 있다. 사업·계정·약국 변경 시 이전 gate와 자료를 즉시 제거하며, 늦은 응답과 다른 scope의 응답은 폐기한다. 운영자의 사업 관리 진입은 기존 운영 경로를 사용한다. 실제 자료 조회·상세·사본 API의 기존 조직·사업별 서버 검사는 그대로 유지한다.

### 검증 방법과 실행 경계

- 로컬 전용 PostgreSQL 15의 `carepharm_revision` DB에 테스트별 무작위 schema를 만들고 종료 시 삭제한다. 애플리케이션 migration이나 운영 DB를 사용하지 않는다.
- 실행: 로컬 PostgreSQL URL을 `CAREPHARM_REVIEW_DATABASE_URL`로 전달하고 API Jest의 `carepharm-handoff.integration.spec.ts`, `business-store-access.integration.spec.ts`를 실행한다. support는 localhost/127.0.0.1과 위 DB 이름만 허용한다. 환경변수가 없는 일반 실행의 skip은 이 검증의 PASS로 세지 않는다.
- handoff 통합 테스트는 실제 issuer → 실제 `requestServiceHandoff` → 실제 exchange controller 및 PostgreSQL 토큰 저장·원자적 소비·출발 세션 조회를 실행한다. 인증 서명·세션 발급 경계는 fixture로 대체하고, DB/entity/repository·역할·계정 membership 로더는 격리 DB의 실제 SQL adapter로 연결한다. 권한·origin·path 판정이나 토큰 원장 결과를 허용 mock으로 대신하지 않는다.
- 약국 gate 통합 테스트는 실제 actor/조직/사업/가입 SQL 및 기존 콘텐츠 서비스 SQL을 실행한다. A만 승인/B 미가입·pending·rejected·suspended·terminated·가입 삭제, 사업 전환, 다른 계정·접근 불가 조직·조직 탈퇴, 운영자 우회 금지를 확인한다.
- UI 테스트와 합성 브라우저는 운영 실계정 검증을 뜻하지 않는다. 운영 개통의 사업 조건 확정·사업 등록·담당 운영자 지정·실계정 승인 검증은 코드 배포와 별도이며 여전히 미수행이다.

### 보정 후 로컬 검증 결과

- 실제 로컬 PostgreSQL 계약: 2 suites / 29 tests PASS. Store 출발 CarePharm 홈·참여·커뮤니티 issuer→client→exchange, Neture 대표 홈·My Home 및 Pharmacy 회귀, 잘못된 origin/path 거절, alias와 canonical 토큰 교차 사용 거절, 재사용·출발 세션 폐기, 선택 약국 SQL gate 및 콘텐츠 SQL 거절을 포함한다. skip 없이 실행했다.
- 기존 API 회귀: 대표 복귀·Store workspace·약국 협력사업 handoff·credentials·business access·pharmacy store access 6 suites / 100 tests PASS.
- Neture 전체: 112 files / 1100 tests PASS. Store 전체: 49 files / 581 tests PASS. 공통 auth-react: 19 files / 229 tests PASS. CarePharm 최종 집중 테스트 1 file / 24 tests PASS는 전체 회귀와 중복이므로 합산하지 않는다. 승인된 다른 약국을 가진 계정, 미가입·pending·rejected·suspended·terminated, gate 지연·scope 불일치·약국 전환 늦은 응답·다른 계정 전환을 포함한다.
- API `type-check`, Neture·Store·Pharmacy(`web-kpa-society`)의 TypeScript 포함 production build PASS. 공통 UI 변경은 세 소비처의 실제 빌드에서 검사했다.
- 변경 영역 ESLint: error 0, 기존 route handler `_next` 미사용 warning 1. production build의 기존 bundle 크기·Browserslist 안내는 남아 있다. `git diff --check` PASS.
- 실제 production bundle + CarePharm host 매핑 + 합성 인증/API의 Chromium: desktop 1440×1000 / mobile 390×844 PASS. 승인 A의 자료·내 약국 버튼 표시 → 미승인 B 전환 시 둘 다 제거, B 자료 요청 0, 두 선택의 scoped gate 요청 확인, page error 0, 가로 넘침 0. 두 해상도의 승인/차단 화면을 캡처하고 확인했다. 이 합성 화면 검증을 서버 gate 권한 검증의 대체 근거로 사용하지 않는다.

### 인계 상태

두 review finding에 대한 코드 수정과 위 로컬 회귀는 완료했다. 새 HEAD의 CI·Sonar·CodeQL·Codex 재리뷰 및 해당 review thread 최종 해소 판정은 미수행이며 통합 담당이 기존 PR #657을 준비 후 reopen하여 확인한다. 이 작업은 여전히 미병합·미배포이며 branch를 보존한다. 실제 사업 등록·가입 승인·담당자 권한 부여·외부 메일·운영 DB write·migration·운영 개통 검증은 수행하지 않았다. CGM·무료혈당기 외부 API 계약과 기존에 명시한 미구현 업무 범위는 그대로 남는다.
