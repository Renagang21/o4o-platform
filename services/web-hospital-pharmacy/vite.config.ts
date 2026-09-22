import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1 후속(2026-09-22 · 사용자 결정): 정본 진입은 **서브디렉토리**
//   https://neture.co.kr/hospital — 병원약국은 당분간 임시 서비스이므로 전용 도메인(DNS·인증서·Google origin)을 만들지 않고
//   기존 neture.co.kr 오리진에 얹는다(같은 오리진 = Neture 로그인 세션 공유). kpa-branch `/kpa` 선례와 같은 레시피.
//   asset 은 반드시 `/hospital/assets/*` 로 발행돼야 한다 — root(`/assets/*`)면 같은 host 의 default backend(web-neture)로
//   새어 나가 404 가 된다. Cloud Run 직접 URL(root 진입)도 같은 번들을 쓰므로 runner 가 dist 를 두 곳에 서빙한다(Dockerfile).
export default defineConfig({
  base: '/hospital/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: { port: 4210 },
});
