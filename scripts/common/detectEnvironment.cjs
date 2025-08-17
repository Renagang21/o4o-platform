#!/usr/bin/env node

/**
 * Environment Detection Script
 * 자동으로 현재 실행 환경을 감지
 */

const fs = require('fs');
const path = require('path');

/**
 * 환경 감지 로직
 * 우선순위: SERVER_TYPE 환경변수 > 파일 존재 여부 > 기본값(local)
 */
function detectEnvironment() {
  // 1. 환경변수 우선 확인
  if (process.env.SERVER_TYPE) {
    const validTypes = ['local', 'webserver', 'apiserver'];
    const serverType = process.env.SERVER_TYPE.toLowerCase();
    
    if (validTypes.includes(serverType)) {
      return serverType;
    }
    
    console.warn(`⚠️  Invalid SERVER_TYPE: ${process.env.SERVER_TYPE}`);
  }
  
  // 2. 환경별 설정 파일 존재 여부 확인
  const rootDir = path.resolve(__dirname, '../..');
  
  // PM2 설정 파일 기반 감지
  if (fs.existsSync(path.join(rootDir, 'ecosystem.config.webserver.cjs'))) {
    return 'webserver';
  }
  
  if (fs.existsSync(path.join(rootDir, 'ecosystem.config.apiserver.cjs'))) {
    return 'apiserver';
  }
  
  // .env 파일 기반 감지
  if (fs.existsSync(path.join(rootDir, '.env.webserver'))) {
    return 'webserver';
  }
  
  if (fs.existsSync(path.join(rootDir, '.env.apiserver'))) {
    return 'apiserver';
  }
  
  // 3. 기본값: local
  return 'local';
}

/**
 * 환경 정보 상세 조회
 */
function getEnvironmentInfo() {
  const environment = detectEnvironment();
  const rootDir = path.resolve(__dirname, '../..');
  
  const info = {
    environment,
    nodeVersion: process.version,
    npmVersion: getNpmVersion(),
    platform: process.platform,
    workingDirectory: process.cwd(),
    configFiles: []
  };
  
  // 환경별 설정 파일 확인
  const envFile = `.env.${environment}`;
  const pm2Config = `ecosystem.config.${environment}.cjs`;
  
  if (fs.existsSync(path.join(rootDir, envFile))) {
    info.configFiles.push(envFile);
  }
  
  if (fs.existsSync(path.join(rootDir, pm2Config))) {
    info.configFiles.push(pm2Config);
  }
  
  return info;
}

/**
 * NPM 버전 조회
 */
function getNpmVersion() {
  try {
    const { execSync } = require('child_process');
    return execSync('npm --version', { encoding: 'utf8' }).trim();
  } catch (error) {
    return 'unknown';
  }
}

/**
 * 환경 검증
 */
function validateEnvironment(requiredEnv) {
  const currentEnv = detectEnvironment();
  
  if (requiredEnv && currentEnv !== requiredEnv) {
    console.error(`❌ This script requires ${requiredEnv} environment, but current is ${currentEnv}`);
    return false;
  }
  
  return true;
}

// CLI로 직접 실행 시
if (require.main === module) {
  const info = getEnvironmentInfo();
  
  console.log('🔍 Environment Detection Result');
  console.log('================================');
  console.log(`📍 Environment: ${info.environment.toUpperCase()}`);
  console.log(`📦 Node: ${info.nodeVersion}`);
  console.log(`📦 NPM: v${info.npmVersion}`);
  console.log(`💻 Platform: ${info.platform}`);
  console.log(`📂 Directory: ${info.workingDirectory}`);
  
  if (info.configFiles.length > 0) {
    console.log(`📋 Config Files:`);
    info.configFiles.forEach(file => {
      console.log(`   - ${file}`);
    });
  }
}

module.exports = {
  detectEnvironment,
  getEnvironmentInfo,
  validateEnvironment
};