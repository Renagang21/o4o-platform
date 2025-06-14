import { FullConfig } from '@playwright/test';

/**
 * E2E 테스트 글로벌 정리
 * 모든 테스트 완료 후 실행되는 정리 작업들
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 E2E 테스트 환경 정리 시작...');

  try {
    // 테스트 데이터 정리
    await cleanupTestData();

    // 임시 파일 정리
    await cleanupTempFiles();

    // 로그 정리 및 백업
    await cleanupLogs();

    console.log('✅ E2E 테스트 환경 정리 완료');

  } catch (error) {
    console.error('❌ 정리 작업 중 오류:', error.message);
    // 정리 실패는 치명적이지 않으므로 예외를 던지지 않음
  }
}

/**
 * 테스트 데이터 정리
 */
async function cleanupTestData() {
  try {
    console.log('🗑️ 테스트 데이터 정리 중...');

    // 테스트용 계정 및 데이터 정리
    // 실제 환경에서는 테스트 DB를 별도로 사용하거나
    // 테스트 데이터에 특별한 마커를 사용하여 정리
    
    // TODO: API를 통한 테스트 데이터 정리
    // await fetch('http://localhost:3000/api/v1/test-data/cleanup', {
    //   method: 'DELETE'
    // });

    console.log('✅ 테스트 데이터 정리 완료');

  } catch (error) {
    console.warn('⚠️ 테스트 데이터 정리 실패:', error.message);
  }
}

/**
 * 임시 파일 정리
 */
async function cleanupTempFiles() {
  try {
    console.log('📁 임시 파일 정리 중...');

    const fs = require('fs').promises;
    const path = require('path');

    // 테스트 중 생성된 임시 파일들 정리
    const tempDirs = [
      './test-results',
      './screenshots',
      './videos',
      './traces'
    ];

    for (const dir of tempDirs) {
      try {
        const fullPath = path.resolve(dir);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          // 7일 이상 된 파일들만 정리
          const files = await fs.readdir(fullPath);
          const now = Date.now();
          const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

          for (const file of files) {
            const filePath = path.join(fullPath, file);
            const fileStats = await fs.stat(filePath);
            
            if (fileStats.mtime.getTime() < weekAgo) {
              await fs.unlink(filePath);
            }
          }
        }
      } catch (error) {
        // 디렉토리가 없거나 접근할 수 없는 경우 무시
      }
    }

    console.log('✅ 임시 파일 정리 완료');

  } catch (error) {
    console.warn('⚠️ 임시 파일 정리 실패:', error.message);
  }
}

/**
 * 로그 정리 및 백업
 */
async function cleanupLogs() {
  try {
    console.log('📋 테스트 로그 정리 중...');

    const fs = require('fs').promises;
    const path = require('path');

    // 테스트 결과 요약 생성
    const summaryPath = path.join(process.cwd(), 'test-summary.json');
    const summary = {
      timestamp: new Date().toISOString(),
      testRun: {
        startTime: process.env.TEST_START_TIME || new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: process.env.TEST_DURATION || 'unknown'
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ci: !!process.env.CI
      }
    };

    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log('✅ 테스트 요약 생성됨:', summaryPath);

  } catch (error) {
    console.warn('⚠️ 로그 정리 실패:', error.message);
  }
}

export default globalTeardown;
