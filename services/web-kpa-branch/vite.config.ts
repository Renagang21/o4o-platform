import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1
//
// WO-O4O-KPA-BRANCH-PUBLIC-PATH-ROUTING-AND-CUSTOM-DOMAIN-BASELINE-V1:
//   번들 asset 은 `/kpa/assets/*` 로 발행한다(당시 공용 경로가 다른 앱 host 의 `/kpa` 아래였던 결정을 유지 —
//   그 도메인은 은퇴했다). root(`/assets/*`)로 바꾸려면 LB pathRule 과 Dockerfile runner 를 함께 바꿔야 한다.
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
