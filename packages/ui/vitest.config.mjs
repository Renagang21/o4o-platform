/**
 * @o4o/ui 테스트 설정
 *
 * WO-O4O-OPERATOR-USER-DETAIL-PASSWORD-SERVICEKEY-SELECTION-V1
 *
 * WO-O4O-UI-VITEST-CI-ADOPTION-AND-PLATFORMONLY-MENU-GUARD-REGRESSION-V1:
 *   CI Pipeline / Code Quality Check 의 "Run tests (packages/ui Vitest)" 로 연결됨(blocking).
 *   여기 include 에 잡히는 테스트는 전부 CI 에서 실행된다.
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config packages/ui/vitest.config.mjs
 *
 * 루트에 이미 설치된 vitest / jsdom / @testing-library/react 를 그대로 쓴다.
 * 이 패키지에 테스트용 의존성을 추가하지 않는다(package.json · lockfile 무변경).
 * `packages/auth-react/vitest.config.mjs` 와 동일한 방식이다.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['packages/ui/src/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
  },
});
