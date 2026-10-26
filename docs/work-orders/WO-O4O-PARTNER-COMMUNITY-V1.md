# WO-O4O-PARTNER-COMMUNITY-V1

> 상태: ACTIVE · 작성일: 2026-10-26
> 근거: 사용자 지시 — 로그인·운영자와 커뮤니티를 함께 구현, 커뮤니티 별도 가입

## 범위와 설계 검증

Partner의 기존 초대형 자료·활동·정산 공동공간과 회원 커뮤니티를 분리한다. 공통 O4O 계정은 재사용하고 커뮤니티 가입은 명시적 신청으로만 생성한다. 가입은 승인 대기 없이 참여 가능하며 정지 상태를 재가입으로 해제하지 않는다. 커뮤니티 글·댓글은 회원 전용으로 시작한다. 공개 첫 화면에는 소개와 게시판 안내만 표시한다.

신규 service identity는 `partner-support`다. 폐기된 Legacy Partner role·계약·수수료·Neture membership은 복원하지 않는다. 신규 운영 역할은 기존 중앙 `role_assignments`·활성 `service_memberships`·운영자 초대/본인 수락으로 판정한다. 실제 운영자 지정이나 운영 DB migration 실행은 개발 검증과 구분한다. 사업자와 홍보자의 협의·계약·보상 판정에 O4O가 관여하지 않는다.

## TODO

- [x] 기존 코드·정본·작업 경계 확인, 최신 main의 전용 worktree/branch 준비
- [x] 별도 가입·로그인/운영자 동시 구현 사용자 선택 확인
- [x] 가입·게시판·글/댓글·신고·운영 권한/API/화면 설계와 구현
- [x] 게시판 탐색·검색·페이지 이동·글/댓글 작성·수정·삭제
- [x] 회원 정지/해제·공지·게시판 관리·게시물 숨김/복구·신고 처리·운영 이력
- [x] 공통 O4O 로그인 API 연결과 회원/운영자/작업공간 탐색 통합 (실계정 검증과 구분)
- [x] 일회성 PostgreSQL의 migration·권한·경계·동시성 테스트
- [x] 프런트 테스트·타입/빌드·desktop/mobile browser 검증
- [x] 결과 기록·범위 점검·commit/push

## 검증 기준

미가입자·정지 회원은 글·댓글을 읽거나 쓸 수 없다. 다른 서비스 회원/운영자와 작업공간 소유자는 커뮤니티 운영 권한을 얻지 않는다. 일반 회원은 타인 글·공지·숨김 상태·회원 상태를 변경할 수 없다. 정지/권한 회수는 다음 요청부터 반영한다. 동시 수정은 revision 충돌로 거부한다. 숨김 글·댓글은 일반 회원 응답에서 본문을 제거한다. HTML은 텍스트로 렌더링하며 이메일·자격정보는 게시판 응답에 포함하지 않는다. 운영 계정과 업무 데이터는 만들지 않는다. 모든 운영 조치는 사유와 최소 감사 이력을 남긴다.

운영 배포·실제 계정 검증·최초 운영자 초대 수락·실제 정책 문서 게시는 구현 완료와 별도 결과로 기록한다.


## 구현 결과

- 공개 `/community` 소개·게시판 안내, `/login` 공통 계정 이메일 로그인과 기존 계정 가입 페이지 연결, 회원 전용 글/댓글·검색·20건 페이지 이동을 구현했다. 가입은 안내 확인 후 별도 요청하며 다른 서비스 membership과 기존 작업공간 ACL을 읽어 가입시키지 않는다.
- `/operator`는 Partner의 현재 유효한 중앙 역할과 활성 Partner membership을 매 요청 확인한다. 공지 작성, 게시판 생성/수정/중지, 게시물 고정·숨김·복구, 댓글 숨김·복구, 신고 검토·처리, 회원 정지/해제와 최소 운영 이력을 제공한다. 소유자/일반 회원은 운영자가 되지 않는다. 운영 조회는 최근 100건, 글당 댓글은 최대 300개다.
- 글/댓글 수정과 운영 조치는 revision을 확인하고, 회원 상태 변경은 DB timestamp의 마이크로초까지 보존한 version으로 경합을 거부한다. 정지 상태는 재가입으로 해제하지 않는다. 비공개/숨김 본문은 일반 회원 API에서 반환하지 않는다. 회원 간 표시 이름은 nickname 또는 일반 표시명이며 이메일을 게시판에 반환하지 않는다.
- 기존 `service_memberships`·`role_assignments`·중앙 초대/본인 수락·정책 동의 기록을 재사용한다. 별도의 운영자 비밀번호 발급이나 role 시스템을 만들지 않았다. 중앙 관리자 UI의 역할/서비스 표시와 RBAC 카탈로그도 신규 `partner-support` 범위로 맞췄다.
- 공통 handoff 수신 컴포넌트와 auth-client의 기존 토큰 저장·갱신 계약을 재사용했다. 직접 이메일 로그인은 쿠키를 쓰고 이전 handoff 저장 상태를 성공 후 해제한다. handoff 갱신은 자신의 refresh token을 사용하며, 로그아웃 중 늦게 도착한 갱신 응답으로 저장 상태를 복구하지 않는다. 기존 서버의 handoff 무쿠키 계약은 변경하지 않았다. auth-client workspace dependency 1개를 명시하고 frozen lockfile 설치를 확인했다.
- 기존 초대형 홍보 작업공간과 로컬 도구는 `/workspace`에서 유지한다. 커뮤니티 가입은 작업공간 자료·정산을 공개하거나 접근 권한을 만들지 않는다.

## 검증 결과

- Partner frontend **80 tests PASS**, 프런트 typecheck/production build PASS.
- 일회성 PostgreSQL API **30 tests PASS** (신규 커뮤니티 13 + 기존 작업공간/미디어 17). 명시적 가입·중복 가입 동시성·정지/다른 서비스 권한·본인 수정·revision 충돌·비공개/숨김 본문·신고 대상/중복·운영 권한 회수·롤백 데이터 보존을 확인했다. 인증 adapter는 테스트 전용이며 실제 로그인 미들웨어/실계정 검증을 대체하지 않는다.
- 인증·카탈로그·handoff 무쿠키 회귀 **46 tests PASS**, 중앙 관리자 역할 목록 **14 tests PASS**. API typecheck/build 및 관리자 production build PASS. 새 worktree의 package dist 누락은 SETUP의 의존 패키지 사전 빌드로 해결했으며 무관한 코드를 수정하지 않았다.
- PostgreSQL 15의 canonical baseline 및 incremental **45개 prefix**를 실제 적용해 기존 지문 불변을 확인했다. 최종 fingerprint `8aca35f9a08b2f7ebb165240d8d0057e23f7e43eed4606ce7cf61b9cab4c1f01`·7305 lines. 빈 상태 down/up 지문 복원, 데이터 존재 시 rollback 거부, 실제 erasure fence의 신규 5개 테이블 쓰기 차단 PASS. migration contract **21 PASS / 0 FAIL**.
- Chromium 실제 브라우저: 공개 390/768/1440px, 회원 390px, 운영자 390/1440px PASS. fixture 로그인 → 별도 가입 → 글·댓글 → 신고 → 숨김·복구 → 정지·해제 → 게시판 생성과 기존 로컬 작업공간 진입을 확인했다. 가로 넘침·pageerror 0. 실제 외부 계정/유료 API는 사용하지 않았다.
- 표준 브라우저 체크 바이너리가 아닌 시스템 Chromium과 테스트 전용 loopback API를 사용했다. canonical DB harness는 정상 API build와 emitDecoratorMetadata를 적용해 실행했다. 초기 tsx 직접 실행은 metadata 누락으로 실패했으며 정상 build 후 실행으로 해결했다. 이전 SQL의 displayName 물리 컬럼 가정도 canonical 스키마에 있는 nickname 조회로 수정한 뒤 전체 검증했다.
- `git diff --check`·문서 민감정보 검사 PASS. 테스트 DB/브라우저 업무 데이터는 이 작업의 일회성 로컬 컨테이너에만 생성했으며 종료 시 해당 컨테이너와 임시 볼륨을 제거한다. 원격 운영 데이터는 생성하지 않았다.

## Git·운영 인계

- 새 독립 WO이며 최신 main `e18664f89a8e4a1533bfa5103b648ef491ec2956`에서 `/workspace/o4o-wt/partner-community-v1`·`wo/partner-community-v1`을 생성했다. 기존 지원 도구 branch/문서 PR #833은 수정하지 않는다.
- 변경 범위 검증 후 commit/push하며 결과 SHA는 완료 보고로 인계한다. PR CI는 PR 생성 전이므로 미실행이다.
- **DEPLOYMENT = MANUAL/GATED · 미실행.** 신규 migration·identity·운영 역할을 포함하므로 main CI와 정상 migration/verified 배포 경로를 따른다. 이번 신규 migration의 운영 적용, 실제 운영자 중앙 초대·본인 수락, 실계정 로그인·handoff·이용 안내 확인은 별도 실행 결과가 필요하다. 역할 카탈로그 생성은 사용자에게 역할을 부여한 것이 아니다.
- 기존 Partner 사이트의 앞선 배포 성공과 이번 커뮤니티 코드의 운영 반영을 혼동하지 않는다. 실제 법률 문서를 작성·게시하거나 운영 계정·외부 송금·SNS/AI 연동을 생성하지 않았다.
- WORKTREE_DISPOSITION: KEEP — 미배포 후속 통합·실계정 검증에 필요. 기존 root checkout과 다른 세션 작업은 정리하지 않는다.


## main 통합·배포 착수 — 2026-10-26

사용자 후속 지시 `Main 병합 배포`에 따라 신규 community migration을 포함한 정상 통합·운영 배포를 진행한다. 별도 운영 계정 생성·사용자에게 운영 역할 부여는 이 지시로 추정하지 않는다.

- 최신 main `64a7cd474e`와 own branch를 통합했다. incoming main의 `HardenAuthPrivacyReadiness1793010000000`을 보존하고 community migration을 그 다음으로 배치했다. 충돌 해소 범위는 manifest와 schema state 등록이며 기존 main migration/지문을 덮어쓰지 않았다.
- 새 일회성 PostgreSQL 15에서 baseline과 **46개 incremental prefix**를 재검증했다. 앞선 main 지문은 모두 일치하며 통합 후 최종 fingerprint는 `69ceb8e5089ee579f9b0f9bc905c10c1795ef59de69d03566ab33043c1b1957e`·7319 lines다. 빈 down/up 복원·실제 신규 5개 테이블 erasure fence 차단도 재검증했다. 이전 45개 prefix 기록은 통합 전 상태의 이력이다.
- PR의 required CI·Codex blocker·main 위치를 확인한 뒤 정상 PR merge를 사용한다. 배포는 main exact-SHA CI 성공 → standard Promote → migration Job → API verified rollout → Partner/관리자 웹 verified rollout 및 실제 canonical URL 읽기 검증 순서다. freeze/ref/IAM/required CI는 우회하지 않는다. 실제 실행 결과는 후속 기록으로 구분한다.
