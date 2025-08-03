import { chromium, FullConfig } from '@playwright/test';

/**
 * Playwright 글로벌 셋업
 * 테스트 환경 초기화 및 데이터 준비
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  console.log('🚀 E2E 테스트 환경 셋업 시작...');
  
  // API 서버 연결 확인
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // API 헬스체크
    console.log('🔍 API 서버 연결 확인 중...');
    const apiUrl = process.env.VITE_SSO_API_URL || 'http://localhost:4000';
    const apiResponse = await page.request.get(`${apiUrl}/health`);
    if (!apiResponse.ok()) {
      throw new Error(`API 서버가 응답하지 않습니다: ${apiResponse.status()}`);
    }
    console.log('✅ API 서버 연결 확인됨');
    
    // 웹 서버 연결 확인
    console.log('🔍 웹 서버 연결 확인 중...');
    const webUrl = baseURL || process.env.VITE_DEV_SERVER_PORT ? `http://localhost:${process.env.VITE_DEV_SERVER_PORT}` : 'http://localhost:3000';
    const webResponse = await page.request.get(webUrl);
    if (!webResponse.ok()) {
      throw new Error(`웹 서버가 응답하지 않습니다: ${webResponse.status()}`);
    }
    console.log('✅ 웹 서버 연결 확인됨');
    
    // 테스트용 관리자 계정 생성 (이미 존재하면 무시)
    console.log('👤 테스트 계정 준비 중...');
    try {
      await page.request.post(`${apiUrl}/api/v1/business/auth/register`, {
        data: {
          email: 'test-admin@neture.co.kr',
          password: 'TestAdmin123!',
          name: 'Test Admin',
          role: 'admin'
        }
      });
      console.log('✅ 테스트 관리자 계정 생성됨');
    } catch (error: any) {
      console.log('ℹ️ 테스트 관리자 계정이 이미 존재합니다');
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
      console.log('✅ 테스트 사용자 계정 생성됨');
    } catch (error: any) {
      console.log('ℹ️ 테스트 사용자 계정이 이미 존재합니다');
    }
    
    await browser.close();
    
    console.log('🎉 E2E 테스트 환경 셋업 완료!');
    
  } catch (error: any) {
    console.error('❌ E2E 테스트 환경 셋업 실패:', error);
    throw error;
  }
}

export default globalSetup;