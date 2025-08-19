import { chromium, FullConfig } from '@playwright/test';

/**
 * Playwright 글로벌 셋업
 * 테스트 환경 초기화 및 데이터 준비
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  
  // API 서버 연결 확인
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // API 헬스체크
    const apiUrl = process.env.VITE_SSO_API_URL || 'http://localhost:4000';
    const apiResponse = await page.request.get(`${apiUrl}/health`);
    if (!apiResponse.ok()) {
      throw new Error(`API 서버가 응답하지 않습니다: ${apiResponse.status()}`);
    }
    
    // 웹 서버 연결 확인
    const webUrl = baseURL || process.env.VITE_DEV_SERVER_PORT ? `http://localhost:${process.env.VITE_DEV_SERVER_PORT}` : 'http://localhost:3000';
    const webResponse = await page.request.get(webUrl);
    if (!webResponse.ok()) {
      throw new Error(`웹 서버가 응답하지 않습니다: ${webResponse.status()}`);
    }
    
    // 테스트용 관리자 계정 생성 (이미 존재하면 무시)
    try {
      await page.request.post(`${apiUrl}/api/v1/business/auth/register`, {
        data: {
          email: 'test-admin@neture.co.kr',
          password: 'TestAdmin123!',
          name: 'Test Admin',
          role: 'admin'
        }
      });
    } catch (error: any) {
    }
    
    try {
      await page.request.post(`${apiUrl}/api/v1/business/auth/register`, {
        data: {
          email: 'test-user@neture.co.kr',
          password: 'TestUser123!',
          name: 'Test User',
          role: 'customer'
        }
      });
    } catch (error: any) {
    }
    
    await browser.close();
    
    
  } catch (error: any) {
    console.error('❌ E2E 테스트 환경 셋업 실패:', error);
    throw error;
  }
}

export default globalSetup;