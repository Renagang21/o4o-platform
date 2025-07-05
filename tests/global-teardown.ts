import { FullConfig } from '@playwright/test'

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 E2E 테스트 정리 작업 시작...')
  
  try {
    // 테스트 데이터 정리는 필요에 따라 구현
    // 현재는 기본적인 로그만 출력
    
    console.log('✅ E2E 테스트 정리 완료')
    
  } catch (error) {
    console.error('❌ E2E 테스트 정리 중 오류:', error)
  }
}

export default globalTeardown