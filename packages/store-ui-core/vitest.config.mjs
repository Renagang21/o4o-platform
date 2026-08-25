/**
 * @o4o/store-ui-core 테스트 설정
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config packages/store-ui-core/vitest.config.mjs
 *
 * 루트에 이미 설치된 vitest 를 그대로 쓴다.
 * 이 패키지에 테스트용 의존성을 추가하지 않는다(package.json · lockfile 무변경).
 * `packages/operator-core-ui/vitest.config.mjs` 와 동일한 방식이다.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['packages/store-ui-core/src/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
  },
});
