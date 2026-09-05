import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
//
// WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1:
//   공용 공개 URL 이 https://kpa-society.co.kr/kpa/{branchSlug} 로 확정되면서
//   번들 asset 은 반드시 `/kpa/assets/*` 로 발행돼야 한다. root(`/assets/*`)로 두면
//   같은 host 의 default backend(web-kpa-society)로 새어 나가 404 가 된다.
//
//   자체 도메인(root 진입)도 같은 번들을 쓰므로, runner 이미지가 dist 를 `/` 와 `/kpa/`
//   두 곳에 서빙한다 (Dockerfile runner stage 참조). base 는 한 값으로 고정한다.
export default defineConfig({
  base: '/kpa/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  server: {
    // 기존 서비스 포트(4201~4207) 회피
    port: 4208,
  },
})
