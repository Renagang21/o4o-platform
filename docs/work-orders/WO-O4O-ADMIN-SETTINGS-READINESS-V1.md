# Admin 설정 동작 보완 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-10 · **최종 갱신**: 2026-10-10
> **근거 WO/IR**: 사용자 요청 — TODO 작성 → 현재 코드·문서 점검 → TODO 수정 → 구현

## 최초 TODO

1. 이메일 설정 응답 처리와 조회 실패 처리 보완.
2. AI 설정의 미동작 저장과 샘플 통계 보완.
3. SMTP 저장과 실제 발송 설정 적용 계약 확인.
4. CMS 미리보기 API 연결 확인.
5. 현재 인증·라우팅과 맞지 않는 E2E 보완.

## 코드·문서 점검 후 수정한 TODO

기준: `origin/main`의 `26b98a33c`. 정본은 [AGENTS.md](../../AGENTS.md),
[SETUP.md](../../SETUP.md), [Identity Architecture V3](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md).

- [x] 이메일: 기존 `GET/PUT /api/v1/settings/email`의 `{ success, data }` 응답을 해제하고 실패 응답을 거부한다.
- [x] 이메일: 조회 실패를 빈 설정과 구분하고 재조회 전 저장을 막는다. 초기 로딩 중에도 저장하지 못한다.
- [x] SMTP: 화면 저장은 DB 설정 보관임을 표시한다. 발송기는 `packages/mail-core`의 `SMTP_*` 환경 변수로 transport를 만들고, transport가 없으면 별도 `SmtpSettings`를 조회한다. 이 화면이 쓰는 `Settings.value`와는 연결되지 않는다. 저장 안내를 실제 발송 설정 적용으로 표현하지 않는다.
- [x] AI: `AppServices`의 샘플 통계, API Key 입력, 미동작 저장·활성 토글을 제거한다. 기존 `GET /api/ai/models` 결과를 표시하고 오류·재조회 상태를 제공한다.
- [x] AI: 정책 편집은 이미 동작하는 `/settings/ai-query`로 연결한다. 신규 credential 저장 API와 통계 API는 만들지 않는다.
- [x] 검증: 이메일 조회·수정·재조회, 실패 시 저장 차단, AI 모델 조회·재조회, 서비스 역할 진입 거부를 검증한다.
- [x] E2E: 제거된 Customizer와 password 로그인 전제의 테스트를 현재 화면을 검증하는 네트워크 fixture 테스트로 교체한다. OAuth 실계정 검증과 구분한다.
- [x] E2E 안내를 현재 명령·대상·fixture 범위로 갱신한다.
- [x] 브라우저 검사에서 발견한 초기 로딩 오류 보완: `index.html`이 불완전한 React DevTools hook을 만들면서 Vite React Refresh의 `renderers.forEach`가 실패한다. 가짜 hook 초기화를 제거하고 브라우저의 실제 hook/React Refresh 초기화에 맡긴다.

## 후속 TODO

- CMS `/preview/:slug`: 현재 서버에 `/api/v1/cms/public/view/:slug`가 없다. 다만 `public.routes.tsx`와 API의 `legacy-wordpress-block-editor-retirement.spec.ts`에 명시적 보존 계약이 있다. 사용처와 lifecycle을 판정하는 별도 작업에서 API 연결 또는 route 처분을 결정한다. 이번 설정 보완에서는 변경하지 않는다.
- 실제 Google 로그인·메일 발송·운영 데이터 검증은 별도 개발용 계정과 환경에서 수행한다. 이번 작업은 운영 DB·credential·발송 runtime을 변경하지 않는다.

## 검증 결과

- 단위 테스트: Admin 18개 파일, 355개 테스트 통과(설정 회귀 10개 포함).
- Chromium 브라우저 테스트: 10개 통과. Desktop·Mobile의 조회/저장/재조회·오류 복구, 서비스 역할 거부, 미인증 진입을 네트워크 fixture로 검증했다.
- Admin TypeScript 검사 통과.
- Admin ESLint: 오류 0, 경고 311(검사 전 경고 318).
- Admin Vite production build 통과. tracked 버전 파일을 쓰는 prebuild 대신 직접 Vite build를 실행했다.
- 문서 민감정보 검사 통과. dependency/lockfile, API·DB·인증 권한 계약 변경 없음.
- 브라우저 테스트 초기 실패를 조사해 잘못된 API fixture URL 매칭과 기존 DevTools hook 초기화 오류를 수정한 뒤 재실행했다. 실패를 skip으로 바꾸지 않았다.
- 테스트는 실제 Google 로그인·운영 DB·메일 발송 검증이 아니다. Firefox/WebKit은 이번 실행 대상에 포함하지 않았다.
- main 통합·운영 배포는 별도 단계다.

## PR 검토 보완

- PR #398의 Codex 검토에서 SMTP 비밀번호 필드 불일치를 확인했다. 서버의 `smtpPassword`에 화면과 타입을 맞추고, 서버 형태의 fixture로 기존 비밀번호를 유지한 호스트 수정·저장·재조회 및 중복 `smtpPass` 키가 없는 요청을 검증한다. 테스트 비밀번호는 실행 중 임의 생성하며 문서·코드에 실제 credential을 기록하지 않는다.
