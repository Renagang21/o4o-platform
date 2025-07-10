import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// MSW 서버 설정 (Node.js 환경용)
export const server = setupServer(...handlers);

// 테스트 헬퍼 함수들
export const mswTestUtils = {
  // 서버 시작
  start: () => server.listen({ onUnhandledRequest: 'error' }),
  
  // 서버 정지
  stop: () => server.close(),
  
  // 핸들러 리셋
  reset: () => server.resetHandlers(),
  
  // 런타임 핸들러 추가
  use: (...handlers: Parameters<typeof server.use>) => server.use(...handlers),
};