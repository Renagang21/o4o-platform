# Admin 설정·CMS 미리보기 브라우저 테스트

현재 Admin의 Google 전용 로그인·플랫폼 관리자 진입 경계와 설정 화면을 Playwright로 검사한다.
제거된 Customizer와 이메일·비밀번호 로그인 전제의 테스트를 대체한다.

## 범위

`settings.spec.ts`는 브라우저의 API 요청을 fixture 응답으로 대체한다. 인증 상태는
`/api/v1/auth/status`의 합성 사용자 응답으로 복원하며 실제 쿠키·OAuth 인증을 수행하지 않는다.
미등록 API 요청도 차단하므로 운영 API·DB·메일 발송·Google 로그인에 접근하지 않는다.
실계정 OAuth 검증이나 서버 저장 검증의 증거로 사용하지 않는다.

- Desktop(1280×800) · Mobile(390×844): 이메일 설정 조회 → 수정 → 저장 → 새로고침 후 재조회.
- 조회 실패 시 수정·저장 차단과 재조회 복구.
- 저장 실패 알림과 편집 값 유지.
- AI 모델 조회 실패 → 재조회, 실제 정책 편집 화면으로 이동.
- 서비스 역할의 플랫폼 설정 진입 거부.
- 미인증 사용자의 Google 전용 로그인 화면 이동.

서버 응답 봉투와 잘못된 응답 거부는 `src/tests/settings-readiness.test.tsx`에서도 검사한다.

`cms-preview.spec.ts`는 공개 `/preview/:slug` 직접 진입의 404 안내 → 재시도 → fixture 미리보기 표시를
Desktop·Mobile에서 검사한다. 현재 서버에 CMS View 조회 API가 구현됐다는 증거가 아니다.
URL 정규화·slug 인코딩·빈/잘못된 응답·권한 실패·요청 취소와 늦은 응답 차단은
`src/tests/cms-preview-readiness.test.tsx`에서 검사한다. 현행 비공개 콘텐츠 API로의 fallback은 없다.

## 실행

저장소 루트에서 [SETUP.md](../../../../../SETUP.md)의 기준 도구를 활성화한 뒤:

```bash
pnpm install --frozen-lockfile --verify-store-integrity=true
pnpm --filter '@o4o/admin-dashboard^...' run build
cd apps/admin-dashboard
pnpm exec playwright install chromium
pnpm exec playwright test --project=chromium --workers=1
```

머신에 Chromium이 이미 설치돼 있으면 다운로드 대신 해당 실행 파일을 지정할 수 있다:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm exec playwright test --project=chromium --workers=1
```

테스트는 전용 dev server(`127.0.0.1:3101`)를 시작한다. 포트가 사용 중이면 다른 프로세스를 재사용하지 않고 실패한다.
기존 개발 서버와 독립적으로 실행하며, shared package 빌드가 먼저 필요하다.
Firefox·WebKit 프로젝트는 해당 Playwright 브라우저를 설치한 경우 추가로 실행할 수 있다.
계정 비밀번호와 auth-state 파일은 필요하지 않다.

결과는 Playwright의 성공·실패·skip 수로 판단한다. 화면 선택자를 찾지 못하거나 인증 초기화가
실패했는데 성공으로 처리하는 fallback은 두지 않는다. trace·스크린샷은 실패 진단용 생성 산출물이다.
