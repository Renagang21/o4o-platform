#!/usr/bin/env node

/**
 * 테스트 데이터 생성 실행 스크립트
 * Node.js에서 직접 실행 가능
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 O4O Platform 테스트 데이터 생성 시작...\n');

try {
  // TypeScript 파일을 tsx로 실행
  const scriptPath = path.join(__dirname, 'generate-test-data.ts');
  
  console.log('📦 Installing dependencies if needed...');
  
  // tsx가 설치되어 있지 않으면 설치
  try {
    execSync('npx tsx --version', { stdio: 'ignore' });
  } catch {
    console.log('Installing tsx...');
    execSync('npm install -g tsx', { stdio: 'inherit' });
  }
  
  console.log('🏃 Running test data generation script...\n');
  
  // 환경변수 설정
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || '5432',
    DB_USERNAME: process.env.DB_USERNAME || 'postgres',
    DB_PASSWORD: process.env.DB_PASSWORD || 'password',
    DB_NAME: process.env.DB_NAME || 'o4o_platform'
  };
  
  // 먼저 API 서버 빌드
  console.log('🔨 Building API server...');
  execSync('npm run build', {
    stdio: 'inherit',
    cwd: path.join(path.dirname(__dirname), 'services', 'api-server')
  });

  // 스크립트 실행 (JavaScript 버전 사용)
  const jsScriptPath = path.join(__dirname, 'generate-test-data.js');
  execSync(`node "${jsScriptPath}"`, { 
    stdio: 'inherit', 
    env,
    cwd: path.dirname(__dirname) // 프로젝트 루트에서 실행
  });
  
  console.log('\n✅ 테스트 데이터 생성이 완료되었습니다!');
  
} catch (error) {
  console.error('\n❌ 테스트 데이터 생성 중 오류가 발생했습니다:');
  console.error(error.message);
  
  console.log('\n🔧 해결 방법:');
  console.log('1. PostgreSQL이 실행 중인지 확인하세요');
  console.log('2. 데이터베이스 연결 정보가 올바른지 확인하세요');
  console.log('3. .env 파일의 DB 설정을 확인하세요');
  console.log('\n환경변수 예시:');
  console.log('DB_HOST=localhost');
  console.log('DB_PORT=5432');
  console.log('DB_USERNAME=postgres');
  console.log('DB_PASSWORD=your_password');
  console.log('DB_NAME=o4o_platform');
  
  process.exit(1);
}