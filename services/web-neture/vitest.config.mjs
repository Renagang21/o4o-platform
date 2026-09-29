/**
 * @o4o/web-neture 테스트 설정
 *
 * WO-O4O-LOCAL-AGENT-LNA-UX-CLOSURE-V1
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config services/web-neture/vitest.config.mjs
 *
 * 루트에 이미 설치된 vitest / jsdom / @testing-library 를 그대로 쓴다.
 * 이 서비스에 테스트 의존성을 추가하지 않는다 (package.json · lockfile 무변경).
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  // 공통 패키지(@o4o/auth-react 등)와 이 앱이 react-router-dom 을 서로 다른 물리 경로에서 읽으면
  // 같은 버전이어도 Router context 가 둘이 되어 guard 테스트가 `useLocation() ... <Router>` 로 깨진다.
  // 번들(vite build)은 이미 하나로 합치므로 테스트도 같게 맞춘다 — WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1.
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
    // vite.config.ts 의 `@` → src 와 같다. `@/…` 로 import 하는 화면을 테스트에서 그대로 읽는다.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['services/web-neture/src/**/*.test.{ts,tsx}'],
    passWithNoTests: false,
  },
});
