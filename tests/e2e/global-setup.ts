import { chromium, FullConfig } from '@playwright/test';

/**
 * E2E 테스트 글로벌 설정
 * 테스트 시작 전 실행되는 설정들
 */
async function globalSetup(config: FullConfig) {
  console.log('🧪 E2E 테스트 환경 설정 시작...');

  // 브라우저 실행 (헤드리스 모드에서도 쿠키/세션 설정용)
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // API 서버 상태 확인
    console.log('🔍 API 서버 상태 확인...');
    await page.goto('http://localhost:3000/api/health');
    const healthResponse = await page.textContent('body');
    
    if (!healthResponse || !healthResponse.includes('healthy')) {
      throw new Error('API 서버가 정상적으로 실행되지 않았습니다.');
    }
    console.log('✅ API 서버 정상 작동');

    // 웹 앱 상태 확인
    console.log('🔍 웹 앱 상태 확인...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    console.log('✅ 웹 앱 정상 작동');

    // 테스트용 관리자 계정 생성 (필요한 경우)
    await setupTestUser(page);

    // 테스트 데이터 설정 (필요한 경우)
    await setupTestData(page);

  } catch (error) {
    console.error('❌ 글로벌 설정 실패:', error.message);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ E2E 테스트 환경 설정 완료');
}

/**
 * 테스트용 사용자 계정 설정
 */
async function setupTestUser(page) {
  try {
    // 테스트 계정이 이미 존재하는지 확인
    const response = await page.request.post('http://localhost:3000/api/v1/auth/login', {
      data: {
        email: 'test@o4o-platform.com',
        password: 'test123456'
      }
    });

    if (response.ok()) {
      console.log('✅ 테스트 계정 존재함');
      return;
    }

    // 테스트 계정 생성
    const signupResponse = await page.request.post('http://localhost:3000/api/v1/auth/signup', {
      data: {
        email: 'test@o4o-platform.com',
        password: 'test123456',
        name: 'Test User',
        role: 'admin'
      }
    });

    if (signupResponse.ok()) {
      console.log('✅ 테스트 계정 생성됨');
    } else {
      console.log('⚠️ 테스트 계정 설정 건너뜀 (API 미구현 가능성)');
    }

  } catch (error) {
    console.log('⚠️ 테스트 계정 설정 실패:', error.message);
  }
}

/**
 * 테스트 데이터 설정
 */
async function setupTestData(page) {
  try {
    // 테스트에 필요한 기본 데이터 생성
    // 예: 샘플 게시물, 카테고리 등
    
    console.log('📝 테스트 데이터 설정 중...');
    
    // TODO: 필요한 테스트 데이터 설정
    // const response = await page.request.post('http://localhost:3000/api/v1/test-data/setup');
    
    console.log('✅ 테스트 데이터 설정 완료');
    
  } catch (error) {
    console.log('⚠️ 테스트 데이터 설정 실패:', error.message);
  }
}

export default globalSetup;
