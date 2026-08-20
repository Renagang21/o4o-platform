/**
 * @o4o/operator-core-ui 테스트 설정
 *
 * WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config packages/operator-core-ui/vitest.config.mjs
 *
 * 루트에 이미 설치된 vitest / jsdom / @testing-library/react 를 그대로 쓴다.
 * 이 패키지에 테스트용 의존성을 추가하지 않는다(package.json · lockfile 무변경).
 * `packages/ui/vitest.config.mjs` 와 동일한 방식이다.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['packages/operator-core-ui/src/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
  },
});
