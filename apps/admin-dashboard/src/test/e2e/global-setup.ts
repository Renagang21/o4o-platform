import { chromium, FullConfig } from '@playwright/test';

/**
 * Admin Dashboard E2E 테스트 글로벌 셋업
 * 관리자 테스트 환경 초기화
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  // 🚀 Admin Dashboard E2E 테스트 환경 셋업 시작
  
  // API 서버 연결 확인
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // API 헬스체크
    // 🔍 API 서버 연결 확인 중
    const apiResponse = await page.request.get('http://localhost:4000/health');
    if (!apiResponse.ok()) {
      throw new Error(`API 서버가 응답하지 않습니다: ${apiResponse.status()}`);
    }
    // ✅ API 서버 연결 확인됨
    
    // Admin Dashboard 서버 연결 확인
    // 🔍 Admin Dashboard 서버 연결 확인 중
    const adminResponse = await page.request.get(baseURL || 'http://localhost:3001');
    if (!adminResponse.ok()) {
      throw new Error(`Admin Dashboard 서버가 응답하지 않습니다: ${adminResponse.status()}`);
    }
    // ✅ Admin Dashboard 서버 연결 확인됨
    
    // 관리자 테스트 계정 생성 (이미 존재하면 무시)
    // 👤 관리자 테스트 계정 준비 중
    try {
      await page.request.post('http://localhost:4000/api/v1/business/auth/register', {
        data: {
          email: 'admin@neture.co.kr',
          password: 'admin123!',
          name: 'Test Admin',
          role: 'admin'
        }
      });
      // ✅ 관리자 테스트 계정 생성됨
    } catch (error: any) {
      // ℹ️ 관리자 테스트 계정이 이미 존재합니다
    }
    
    // 일반 사용자 계정 생성 (권한 테스트용)
    try {
      await page.request.post('http://localhost:4000/api/v1/business/auth/register', {
        data: {
          email: 'user@neture.co.kr',
          password: 'user123!',
          name: 'Test User',
          role: 'customer'
        }
      });
      // ✅ 일반 사용자 테스트 계정 생성됨
    } catch (error: any) {
      // ℹ️ 일반 사용자 테스트 계정이 이미 존재합니다
    }
    
    await browser.close();
    
    // 🎉 Admin Dashboard E2E 테스트 환경 셋업 완료!
    
  } catch (error: any) {
    console.error('❌ Admin Dashboard E2E 테스트 환경 셋업 실패:', error);
    throw error;
  }
}

export default globalSetup;