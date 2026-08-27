/**
 * @o4o/store-ui-core 테스트 설정
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1
 *
 * WO-O4O-PACKAGE-LEVEL-VITEST-CI-ADOPTION-FULL-CENSUS-AND-CLOSURE-V1:
 *   CI Pipeline / Code Quality Check 의 "Run tests (store-ui-core Vitest)" 로 연결됨(blocking).
 *   여기 include 에 잡히는 테스트는 전부 CI 에서 실행된다.
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config packages/store-ui-core/vitest.config.mjs
 *
 * WO-O4O-GLYCOPHARM-CANONICAL-B2B-CART-PRODUCER-UI-ADOPTION-V1:
 *   공급 카탈로그에 opt-in 장바구니 producer 가 붙으면서 컴포넌트 렌더 테스트가 생겼다.
 *   environment 를 node → jsdom 으로 올린다 (기존 정적 계약 테스트는 그대로 통과한다).
 *
 * 루트에 이미 설치된 vitest / jsdom / @testing-library/react 를 그대로 쓴다.
 * 이 패키지에 테스트용 의존성을 추가하지 않는다(package.json · lockfile 무변경).
 * `packages/operator-core-ui/vitest.config.mjs` 와 동일한 방식이다.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['packages/store-ui-core/src/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
  },
});
