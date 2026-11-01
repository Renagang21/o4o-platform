# O4O 업데이트·개선 요청 포럼과 운영 처리함

> 상태: ACTIVE · 작성일: 2026-11-01 (Asia/Seoul)
> 근거: 사용자 요청 — TODO 보완 및 개발, main 병합 직전까지.
> 기준: ROLE-WORKSPACE-ARCHITECTURE-V2, 기존 community 포럼·중앙 위임·알림 원장 재사용.

## 목표와 범위

커뮤니티에 공식 업데이트·오류 신고·기능 제안 포럼을 제공하고 중앙 운영 상단에서 승인·개선 요청을 놓치지 않도록 한다.
대표 관리자는 사용자가 지정한 계정이다. 개인 이메일을 코드·문서에 기록하지 않으며 실제 소유자 연결과 운영 개설은 병합·배포 후 해당 계정의 명시적 실행으로 한다.
새 전역 역할·Core 변경·의존성 변경·운영 데이터 write·배포·main 병합은 하지 않는다.

## 보완한 구현 기준

- 기존 forum_category_requests/forum_post와 metadata를 활용해 별도 게시판 원장을 만들지 않는다.
- 공식 포럼은 고정 목적 식별자로 하나만 생성하며 일반 포럼·독립 사업 데이터와 격리한다.
- 일반 회원은 오류·제안 작성, 담당자는 업데이트 안내·공식 답변·상태 처리. 기존 계정/서비스 정지와 중앙 메뉴 권한을 검사한다.
- 요청 상태: 접수/검토 중/추가 정보 요청/반영 예정/반영 완료/보류/미반영. 완료·보류·미반영은 이유 필수.
- 새 알림의 읽음과 업무 완료는 별개. 원장 기반 미처리 집계는 알림 읽음으로 사라지지 않는다.
- 미처리/장기 대기/조회 실패를 구별하고 권한 있는 작업 공간으로 연결한다.
- 공개 글은 개인정보 입력 금지 안내 및 비공개 문의 연결. 운영 답변과 내부 권한 정보는 구분한다.
- 응답의 늦은 도착·계정 변경·중복 제출·동시 상태 변경·실패 후 재시도 보호.

## TODO

- [x] 최신 main 조사 및 전용 worktree/branch 준비
- [x] 공식 포럼 저장·개설·참여·운영 API와 권한/동시성 검증
- [x] 커뮤니티 메뉴·홈 진입과 공개 목록/요청 작성/공식 답변 화면
- [x] 중앙 운영 업무 연결·미처리 집계·장기 대기 우선 표시
- [x] 기존 승인 대상·읽음 분리 회귀 검증
- [x] 단위/통합·타입·빌드·desktop/mobile 기능 검증
- [x] 코드 자체 검토 (공식 상태 우회 방지·공개/운영 화면 분리·본문 escape·현재 수신 권한)
- [x] commit·push·PR 생성 — [PR #915](https://github.com/Renagang21/o4o-platform/pull/915)
- [x] 원격 CI·자동 리뷰를 같은 PR에서 추적 (최종 판정은 아래 외부 상태 조건)
- [x] 병합 전 인계 자료 준비 (main 병합·배포·운영 개설은 미실행)

## 검증 및 인계

### 구현과 운영 경로

- 공개 진입: `https://community.neture.co.kr/improvements`, 상세 `/improvements/:id`.
- 중앙 운영: `/operations/community/forums?tab=improvements`, 알림의 `improvement` query는 해당 요청 상세를 연다. 기존 포럼 개설 신청·관리는 기본 탭으로 유지한다.
- 개설은 중앙 Google 세션과 기존 `community.forums` 업무 권한으로 수행한다. 현재 실행한 계정이 기존 포럼의 requester/owner가 되며, 재실행해도 소유자를 바꾸거나 역할·서비스 가입을 만들지 않는다.
- 별도 migration·Core enum·권한 원장은 추가하지 않는다. 기존 포럼 metadata에 서명한 업무 상태와 공개 답변을 저장한다. 일반 포럼 작성·수정·삭제 경로는 이 공식 게시판에 사용할 수 없다.
- 업데이트 안내는 중앙에서만 작성·수정한다. 일반 공개 화면에서는 관리자도 중앙 작업 공간으로 이동한다. 회원은 요청·댓글·본인 글 수정이 가능하다.
- 요청자 추가 정보·수정은 접수로 돌아온다. 다른 회원의 의견은 완료 상태를 자동 변경하지 않는다. 운영팀 처리 대기는 접수/검토 중/반영 예정이며, 추가 정보 요청·완료·보류·미반영은 별도로 조회한다.
- 공식 답변에는 당시 상태·사유를 남기고 같은 포럼의 공개 업데이트 안내를 연결할 수 있다. 알림에는 공개 본문·개인 이메일을 복제하지 않는다.
- 목록은 20건 단위이고 본문·답변 전체는 상세에서 조회한다. 대기 건수는 읽음과 별개이며, 3일 이상 대기는 우선 표시한다.

### 검증 명령과 결과

- API·경로·메뉴 위임 테스트: 4 suites / 28 PASS.
- 기존 일반 포럼 작성/수정/일상 중재 회귀: 3 suites / 48 PASS (공식 포럼의 일반 수정/삭제 우회 거부 추가).
- PostgreSQL canonical schema: 6 PASS. 개설 직렬화·등록 재시도·상태 동시 변경·정지/회수·HTML 안전 저장·업데이트 링크·알림 읽음 분리 검증.
- 재사용 DB 검증: 로컬 PostgreSQL 15의 `127.0.0.1:55440`에 테스트 전용 CREATEDB 계정을 준비한다. `O4O_IMPROVEMENT_TEST_URL`은 해당 서버의 `o4o_improvements_integration`을 가리키는 비공개 환경 변수로 설정하고 `pnpm exec tsx scripts/dev/run-improvement-forum-fixture.ts`를 실행한다. DB가 이미 있으면 거부하며, wrapper가 만든 DB만 소유권 marker를 확인해 정리한다. schema PASS / tests PASS / database count 0 확인.
- web-neture 화면·홈·호스트 경계: 3 files / 72 PASS.
- 중앙 운영·알림·진입: 3 files / 23 PASS.
- Chromium: 관리자 2 PASS, 공개 커뮤니티 2 PASS. 각 1440px/390px에서 홈 진입·직접 URL·공식 답변·완료 후 대기 해소·가로 overflow 확인. 실제 운영 계정 인증이 아닌 로컬 합성 fixture 검증이다.
- 브라우저 명령: admin 디렉터리 `pnpm exec playwright test src/test/e2e/central-improvements.spec.ts --project=chromium --workers=1`; web-neture 디렉터리 `pnpm exec playwright test --config playwright.improvements.config.ts`.
- API type-check/build, web-neture/admin production build 및 변경 범위 ESLint를 실행한다. API type-check/build, 두 앱 production build PASS. 신규 변경 범위 ESLint 오류·경고 0. unsafe-route·TypeORM entity registry guard PASS.

### 병합 이후 실행 항목

실제 운영 계정 로그인·지정 계정 소유자의 공식 포럼 개설·운영 배포는 이번 작업에서 실행하지 않는다. 지정 계정으로 중앙 운영에 로그인해 `O4O 개선 요청` 탭에서 현재 계정을 확인한 뒤 공식 포럼을 개설한다. 이 최초 실행 전에는 공개 화면에 준비 중을 표시한다. 실제 로그인과 계정 권한은 운영 반영 시 별도 검증한다.

환경 게시 설정은 변경하지 않는다. main 병합·auto-merge·배포·운영 DB write는 미실행이다. 원격 PR/CI/리뷰는 다음 인계 상태에서 추적한다.


### 리뷰 보완과 최종 인계 조건

- Codex P1: 정상 서명이라도 `private`/`selected` 공개 설정이면 이 고정 전체 공개 포럼 API는 게시판·상세를 제공하지 않는다. 기존 `setCommunityPublicRead` write-path로 전환·복원하는 PostgreSQL 회귀를 추가했다. 공개 철회/권한 오류 재조회 시 이전 본문도 제거한다.
- Codex P2: 편집·공식 답변 초안은 시작 버전을 유지한다. focus/주기 재조회에서 새 버전을 발견하면 초안·선택 상태를 보존하고 저장을 막으며, 최신 내용을 확인한 뒤 명시적으로 다시 시작한다. 회귀 2건 추가.
- CI 소비처 타입 보완: 공유 UI는 Axios 전역 선언 대신 필요한 get/post/patch 구조만 받는다. 계정 ID는 wrapper에서 문자열로 정규화한다. `pnpm run type-check:frontend` 전체 소비처 PASS.
- HTTP 성공이라도 업무 응답 `success`가 아니면 성공 표시·초안 삭제를 하지 않는다. 성공한 신규 글은 정확한 상세로 이동한다.
- 최신 HEAD의 required CI PASS 및 자동 리뷰 미해결 0이 인계 완료 조건이다. 원격 실행·리뷰 상태는 [PR #915](https://github.com/Renagang21/o4o-platform/pull/915)가 정본이며, 이 문서 작성만으로 원격 PASS를 주장하지 않는다. 필수 검사 실패·미해결 finding이 남으면 병합 준비 완료로 인계하지 않는다.
