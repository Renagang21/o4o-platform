import { chromium } from '@playwright/test';

/**
 * Playwright 글로벌 티어다운
 * 테스트 후 정리 작업
 */
async function globalTeardown() {
  // console.log('🧹 E2E 테스트 환경 정리 시작...');
  
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // 테스트 데이터 정리 (필요한 경우)
    // 현재는 개발 환경이므로 데이터를 그대로 두어 디버깅에 도움이 되도록 함
    
    await browser.close();
    
    // console.log('✅ E2E 테스트 환경 정리 완료!');
    
  } catch (error: any) {
    console.error('⚠️ E2E 테스트 환경 정리 중 오류:', error);
    // 정리 오류는 테스트 실패로 이어지지 않도록 함
  }
}

export default globalTeardown;