# WO-O4O-PARTNER-COMMUNITY-READINESS-V1

> 상태: ACTIVE · 작성일: 2026-11-01 (Asia/Seoul)
> 근거: 사용자 지시 — 다음 작업을 판단해 진행. 기존 완료 branch를 재사용하지 않고 최신 main에서 시작한다.

## 문제와 범위

커뮤니티의 게시판·가입 안내·계정·회원 상태 조회가 실패하면 페이지 전체 새로고침 외에 복구 수단이 없었다. 특히 회원 상태 조회 실패를 미가입과 구분하지 않아 기존 회원에게 가입 양식을 표시할 수 있었다. 글 목록·상세도 오류 문구만 남아 재시도할 수 없었다.

현재 V2 운영 책임 계약과 기존 API 권한 검사를 유지하며 Partner 프런트의 조회 복구만 보완한다. 게시판·정책·세션을 다시 확인하고, 회원 상태가 확인되기 전에는 미가입으로 판정하지 않는다. 게시글 조회 재시도는 현재 경로·검색어·페이지를 유지하고 쓰기 요청을 수행하지 않는다. 초기 연결 재확인은 회원 UI를 다시 검증하므로 게시글 입력 보존을 보장하는 기능과 구분한다.

사업자와 홍보자의 협의·계약·보상 판정에 관여하지 않는 기존 경계를 유지한다. 공통 인증·API·DB·role·서비스 가입 정책·의존성·배포 설정은 변경하지 않는다. 실제 운영자 지정이나 운영 데이터 생성은 이번 범위가 아니다.

## TODO

- [x] 기존 작업공간 clean 상태 확인, main fetch 후 새 전용 worktree 생성
- [x] 최신 운영 책임 V2·SETUP·문서 규칙 및 Partner 소비처 확인
- [x] 초기 연결 오류별 안내와 재확인, 실패한 회원 상태와 미가입 분리
- [x] 글 목록·상세 재시도 및 검색·페이지 유지
- [x] focused 회귀 테스트와 Partner 전체 테스트·프로덕션 빌드
- [x] 실제 Chromium 모바일·PC에서 격리된 실패/복구 흐름 확인
- [x] 변경 범위·민감정보 검사 후 commit/push 및 인계 (실제 SHA는 완료 보고로 전달)

## 검증과 재현

- `pnpm install --frozen-lockfile --ignore-scripts` 후 `pnpm --filter '@o4o/web-partner^...' run build`로 새 worktree 의존 패키지를 빌드했다. lockfile 변경 없음.
- `pnpm --dir services/web-partner test`: **7 files / 100 tests PASS**. 회귀 범위는 게시판·정책·회원 상태 실패, 정지 회원 유지, 글 목록·상세 재시도, 검색/페이지 보존이다.
- `pnpm --dir services/web-partner build` PASS. 기존 bundle 크기 advisory가 있으며 gate를 완화하지 않았다.
- 실제 Chromium 390px·1440px PASS: 회원 상태 조회 실패 시 가입 버튼 없음 → 재확인 → 목록 실패/재시도 → 상세 실패/재시도. 가로 넘침·pageerror·쓰기·외부 요청 0, 모바일 screenshot 확인.
- 브라우저 재현: `VITE_PARTNER_API_ORIGIN=http://127.0.0.1:3011 pnpm --dir services/web-partner build` → `pnpm --dir services/web-partner preview --host 127.0.0.1` → `node services/web-partner/scripts/community-recovery-browser-smoke.mjs`. 루프백 이외 대상은 거부하며 API는 Playwright 응답 fixture로 대체한다. 실제 계정/DB/운영 데이터는 사용하지 않는다.
- 첫 브라우저 시도는 production 기본 API origin을 차단해 실패했다. 테스트용 loopback origin을 명시한 build와 StrictMode 중복 조회에도 유지되는 실패 fixture로 수정한 후 재실행해 통과했다. 실제 운영 인증 성공으로 보고하지 않는다.

## 인계와 남은 범위

- base: `cf91b6aec2` · branch: `wo/partner-community-readiness-v1` · worktree: `/workspace/o4o-wt/partner-community-readiness-v1`.
- 첫 Partner Admin 지정, 실계정 로그인/handoff/가입 및 실제 권한별 사용 검증은 이번 작업의 완료 범위가 아니다. 테스트 계정 기준 파일은 새 worktree와 기준 checkout 양쪽 모두 없음을 확인했다. 환경 변수 준비 상태를 로그인 성공으로 간주하지 않는다.
- 과거 WO/PR 기록을 다시 쓰지 않는다. 이번 수정만 commit/push하며 기존 root checkout과 community-v1 작업공간·로그는 보존한다.
- PR CI·main 통합·배포는 이번 변경에 대해 미실행. DEPLOYMENT = REQUIRED (프런트 런타임 변경이며 향후 정상 통합·배포 필요).
- WORKTREE_DISPOSITION: KEEP — 통합 전 검토·추가 수정과 검증 증적 보존에 필요.
