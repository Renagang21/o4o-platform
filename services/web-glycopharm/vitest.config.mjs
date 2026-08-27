/**
 * web-glycopharm 테스트 설정
 *
 * WO-O4O-GLYCOPHARM-CANONICAL-B2B-CART-PRODUCER-UI-ADOPTION-V1:
 *   GlycoPharm 에는 테스트 실행 경로가 없어서 "카탈로그 행 → canonical cart payload" 같은
 *   계약이 코드 리뷰로만 지켜지고 있었다. 이 축은 잘못되면 조용히 legacy 상품 id 나
 *   표시용 가격이 주문 경로로 새어 들어가므로 CI 에서 고정한다.
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config services/web-glycopharm/vitest.config.mjs
 *
 * 루트에 이미 설치된 vitest 를 그대로 쓴다 — 이 서비스에 테스트 의존성을 추가하지 않는다
 * (package.json · lockfile 무변경). `packages/ui/vitest.config.mjs` 와 동일한 방식이다.
 */
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['services/web-glycopharm/src/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
  },
});
