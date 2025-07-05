import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🔧 E2E 테스트 환경 설정 시작...')
  
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    // 1. API 서버 헬스체크
    console.log('📡 API 서버 연결 확인 중...')
    const apiResponse = await page.goto('http://localhost:4000/health')
    if (!apiResponse?.ok()) {
      throw new Error('API 서버가 응답하지 않습니다. npm run dev:api를 먼저 실행하세요.')
    }
    console.log('✅ API 서버 연결 확인됨')
    
    // 2. 메인 사이트 헬스체크
    console.log('🌐 메인 사이트 연결 확인 중...')
    const mainResponse = await page.goto('http://localhost:3000')
    if (!mainResponse?.ok()) {
      throw new Error('메인 사이트가 응답하지 않습니다. npm run dev:main-site를 먼저 실행하세요.')
    }
    console.log('✅ 메인 사이트 연결 확인됨')
    
    // 3. 관리자 대시보드 헬스체크
    console.log('👨‍💼 관리자 대시보드 연결 확인 중...')
    const adminResponse = await page.goto('http://localhost:3012')
    if (!adminResponse?.ok()) {
      throw new Error('관리자 대시보드가 응답하지 않습니다. npm run dev:admin을 먼저 실행하세요.')
    }
    console.log('✅ 관리자 대시보드 연결 확인됨')
    
    // 4. 테스트 관리자 계정 생성/확인
    console.log('👤 테스트 관리자 계정 설정 중...')
    try {
      const registerResponse = await page.request.post('http://localhost:4000/api/auth/register', {
        data: {
          email: 'test@admin.com',
          password: 'pw123',
          name: 'Test Admin',
          role: 'admin'
        }
      })
      
      if (registerResponse.ok()) {
        console.log('✅ 테스트 관리자 계정 생성됨')
      } else {
        console.log('ℹ️  테스트 관리자 계정이 이미 존재합니다')
      }
    } catch (error) {
      console.log('ℹ️  관리자 계정 확인 중 오류 (계정이 이미 존재할 수 있음)')
    }
    
    // 5. 테스트 일반 사용자 계정 생성/확인
    console.log('👥 테스트 일반 사용자 계정 설정 중...')
    try {
      const userRegisterResponse = await page.request.post('http://localhost:4000/api/auth/register', {
        data: {
          email: 'test@user.com',
          password: 'pw123',
          name: 'Test User',
          role: 'customer'
        }
      })
      
      if (userRegisterResponse.ok()) {
        console.log('✅ 테스트 일반 사용자 계정 생성됨')
      } else {
        console.log('ℹ️  테스트 일반 사용자 계정이 이미 존재합니다')
      }
    } catch (error) {
      console.log('ℹ️  일반 사용자 계정 확인 중 오류 (계정이 이미 존재할 수 있음)')
    }
    
    // 6. 데이터베이스 연결 확인
    console.log('🗃️  데이터베이스 연결 확인 중...')
    try {
      const dbResponse = await page.request.get('http://localhost:4000/health/database')
      if (dbResponse.ok()) {
        console.log('✅ 데이터베이스 연결 확인됨')
      } else {
        console.warn('⚠️  데이터베이스 연결에 문제가 있을 수 있습니다')
      }
    } catch (error) {
      console.warn('⚠️  데이터베이스 헬스체크 실패')
    }
    
    console.log('🎉 E2E 테스트 환경 설정 완료!')
    
  } catch (error) {
    console.error('❌ E2E 테스트 환경 설정 실패:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup