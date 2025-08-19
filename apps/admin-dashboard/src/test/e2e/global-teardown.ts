import { chromium } from '@playwright/test';

/**
 * Admin Dashboard E2E 테스트 글로벌 티어다운
 * 테스트 후 정리 작업
 */
async function globalTeardown() {
  
  try {
    const browser = await chromium.launch();
    // const _page = await browser.newPage();
    
    // 테스트 세션 정리 (필요한 경우)
    // 개발 환경이므로 데이터는 보존하여 디버깅에 도움이 되도록 함
    
    await browser.close();
    
    
  } catch (error: any) {
    console.error('⚠️ Admin Dashboard E2E 테스트 환경 정리 중 오류:', error);
    // 정리 오류는 테스트 실패로 이어지지 않도록 함
  }
}

export default globalTeardown;