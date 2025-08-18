#!/usr/bin/env node

/**
 * API서버 환경 검증 스크립트
 * 환경 설정, 빌드, PM2 설정 등을 종합적으로 검증
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// 로그 함수
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (title) => {
    console.log('\n' + '='.repeat(60));
    console.log(`  ${title}`);
    console.log('='.repeat(60));
  },
};

// 검증 결과 저장
const validationResults = {
  timestamp: new Date().toISOString(),
  serverType: process.env.SERVER_TYPE || 'unknown',
  checks: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  },
};

/**
 * 검증 체크 추가
 */
function addCheck(category, name, status, message, details = {}) {
  const check = {
    category,
    name,
    status, // 'pass', 'fail', 'warning'
    message,
    details,
  };
  
  validationResults.checks.push(check);
  validationResults.summary.total++;
  
  if (status === 'pass') {
    validationResults.summary.passed++;
    log.success(`${name}: ${message}`);
  } else if (status === 'fail') {
    validationResults.summary.failed++;
    log.error(`${name}: ${message}`);
  } else if (status === 'warning') {
    validationResults.summary.warnings++;
    log.warning(`${name}: ${message}`);
  }
  
  return check;
}

/**
 * 명령어 실행 헬퍼
 */
function execCommand(command, silent = false) {
  try {
    const output = execSync(command, { 
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf-8',
    });
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 파일 존재 확인
 */
function checkFileExists(filePath, relative = true) {
  const fullPath = relative ? path.join(process.cwd(), filePath) : filePath;
  return fs.existsSync(fullPath);
}

/**
 * 환경변수 검증
 */
function validateEnvironment() {
  log.section('환경변수 검증');
  
  // SERVER_TYPE 확인
  const serverType = process.env.SERVER_TYPE;
  if (serverType === 'apiserver') {
    addCheck('env', 'SERVER_TYPE', 'pass', 'API서버 환경으로 설정됨');
  } else if (serverType) {
    addCheck('env', 'SERVER_TYPE', 'warning', `다른 환경으로 설정됨: ${serverType}`);
  } else {
    addCheck('env', 'SERVER_TYPE', 'fail', '환경 타입이 설정되지 않음');
  }
  
  // 환경변수 파일 확인
  const envFiles = [
    { path: '.env', required: false },
    { path: '.env.local', required: false },
    { path: '.env.apiserver', required: false },
    { path: '/etc/profile.d/o4o-apiserver.sh', required: false, absolute: true },
  ];
  
  let envFileFound = false;
  envFiles.forEach(file => {
    const exists = checkFileExists(file.path, !file.absolute);
    if (exists) {
      envFileFound = true;
      addCheck('env', `환경변수 파일: ${file.path}`, 'pass', '파일 존재');
    } else if (file.required) {
      addCheck('env', `환경변수 파일: ${file.path}`, 'fail', '필수 파일 누락');
    }
  });
  
  if (!envFileFound) {
    addCheck('env', '환경변수 파일', 'warning', '환경변수 파일이 없음');
  }
  
  // 필수 환경변수 확인
  const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USERNAME',
    'DB_PASSWORD',
  ];
  
  const missingEnvVars = [];
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingEnvVars.push(varName);
    }
  });
  
  if (missingEnvVars.length === 0) {
    addCheck('env', '필수 환경변수', 'pass', '모든 필수 환경변수 설정됨');
  } else {
    addCheck('env', '필수 환경변수', 'fail', 
      `누락된 환경변수: ${missingEnvVars.join(', ')}`);
  }
  
  // 프로덕션 환경 추가 검증
  if (process.env.NODE_ENV === 'production') {
    const prodVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
    const missingProdVars = prodVars.filter(v => !process.env[v]);
    
    if (missingProdVars.length === 0) {
      addCheck('env', '프로덕션 환경변수', 'pass', '프로덕션 필수 변수 설정됨');
    } else {
      addCheck('env', '프로덕션 환경변수', 'fail', 
        `프로덕션 필수 변수 누락: ${missingProdVars.join(', ')}`);
    }
  }
}

/**
 * 프로젝트 구조 검증
 */
function validateProjectStructure() {
  log.section('프로젝트 구조 검증');
  
  // 필수 디렉토리 확인
  const requiredDirs = [
    'apps/api-server',
    'packages/supplier-connector',
    'scripts',
  ];
  
  requiredDirs.forEach(dir => {
    if (checkFileExists(dir)) {
      addCheck('structure', `디렉토리: ${dir}`, 'pass', '존재함');
    } else {
      addCheck('structure', `디렉토리: ${dir}`, 'fail', '디렉토리 누락');
    }
  });
  
  // 필수 파일 확인
  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'apps/api-server/package.json',
    'packages/supplier-connector/package.json',
  ];
  
  requiredFiles.forEach(file => {
    if (checkFileExists(file)) {
      addCheck('structure', `파일: ${file}`, 'pass', '존재함');
    } else {
      addCheck('structure', `파일: ${file}`, 'fail', '파일 누락');
    }
  });
  
  // PM2 설정 파일 확인
  const pm2Configs = [
    'ecosystem.config.apiserver.cjs',
    'ecosystem.config.local.cjs',
  ];
  
  let pm2ConfigFound = false;
  pm2Configs.forEach(config => {
    if (checkFileExists(config)) {
      pm2ConfigFound = true;
      addCheck('structure', `PM2 설정: ${config}`, 'pass', '존재함');
    }
  });
  
  if (!pm2ConfigFound) {
    addCheck('structure', 'PM2 설정', 'warning', 'PM2 설정 파일이 없음');
  }
}

/**
 * 빌드 시스템 검증
 */
function validateBuildSystem() {
  log.section('빌드 시스템 검증');
  
  // package.json 스크립트 확인
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const scripts = packageJson.scripts || {};
  
  // API서버 최적화 스크립트 확인
  const optimizedScripts = [
    'build:apiserver',
    'build:supplier-connector',
    'type-check:apiserver',
    'lint:apiserver',
    'test:apiserver',
  ];
  
  const missingScripts = optimizedScripts.filter(script => !scripts[script]);
  
  if (missingScripts.length === 0) {
    addCheck('build', 'API서버 최적화 스크립트', 'pass', 
      '모든 최적화 스크립트 존재');
  } else if (missingScripts.length < 3) {
    addCheck('build', 'API서버 최적화 스크립트', 'warning', 
      `일부 스크립트 누락: ${missingScripts.join(', ')}`);
  } else {
    addCheck('build', 'API서버 최적화 스크립트', 'fail', 
      `최적화 스크립트 미적용: ${missingScripts.join(', ')}`);
  }
  
  // TypeScript 설정 확인
  if (checkFileExists('apps/api-server/tsconfig.json')) {
    addCheck('build', 'API서버 TypeScript 설정', 'pass', '설정 파일 존재');
  } else {
    addCheck('build', 'API서버 TypeScript 설정', 'fail', 'tsconfig.json 누락');
  }
  
  // 빌드 출력 디렉토리 확인
  if (checkFileExists('apps/api-server/dist')) {
    addCheck('build', 'API서버 빌드 출력', 'pass', '빌드 디렉토리 존재');
  } else {
    addCheck('build', 'API서버 빌드 출력', 'warning', '빌드되지 않음');
  }
}

/**
 * 의존성 검증
 */
function validateDependencies() {
  log.section('의존성 검증');
  
  // node_modules 확인
  if (checkFileExists('node_modules')) {
    addCheck('deps', 'node_modules', 'pass', '의존성 설치됨');
  } else {
    addCheck('deps', 'node_modules', 'fail', '의존성 미설치');
    return;
  }
  
  // API서버 의존성 확인
  const apiServerDeps = [
    '@nestjs/core',
    '@nestjs/common',
    '@nestjs/platform-express',
    'typeorm',
    'pg',
  ];
  
  const apiServerPkg = path.join('apps/api-server/package.json');
  if (checkFileExists(apiServerPkg)) {
    const pkg = JSON.parse(fs.readFileSync(apiServerPkg, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    const missingDeps = apiServerDeps.filter(dep => !deps[dep]);
    
    if (missingDeps.length === 0) {
      addCheck('deps', 'API서버 핵심 의존성', 'pass', '모든 핵심 의존성 존재');
    } else {
      addCheck('deps', 'API서버 핵심 의존성', 'warning', 
        `일부 의존성 누락: ${missingDeps.join(', ')}`);
    }
  }
  
  // 보안 취약점 확인 (선택적)
  log.info('npm audit 실행 중...');
  const auditResult = execCommand('npm audit --json', true);
  if (auditResult.success) {
    try {
      const audit = JSON.parse(auditResult.output);
      const vulns = audit.metadata.vulnerabilities;
      
      if (vulns.total === 0) {
        addCheck('deps', '보안 취약점', 'pass', '보안 취약점 없음');
      } else if (vulns.high + vulns.critical === 0) {
        addCheck('deps', '보안 취약점', 'warning', 
          `낮은 수준 취약점 ${vulns.total}개 발견`);
      } else {
        addCheck('deps', '보안 취약점', 'fail', 
          `높음: ${vulns.high}, 심각: ${vulns.critical}`);
      }
    } catch (e) {
      addCheck('deps', '보안 취약점', 'warning', 'audit 결과 파싱 실패');
    }
  }
}

/**
 * PM2 설정 검증
 */
function validatePM2Config() {
  log.section('PM2 설정 검증');
  
  const configFile = 'ecosystem.config.apiserver.cjs';
  
  if (!checkFileExists(configFile)) {
    addCheck('pm2', 'PM2 설정 파일', 'fail', `${configFile} 파일 없음`);
    return;
  }
  
  try {
    const config = require(path.join(process.cwd(), configFile));
    
    if (!config.apps || !Array.isArray(config.apps)) {
      addCheck('pm2', 'PM2 설정 구조', 'fail', 'apps 배열이 없음');
      return;
    }
    
    const apiApp = config.apps.find(app => app.name === 'o4o-api-apiserver');
    
    if (!apiApp) {
      addCheck('pm2', 'API서버 앱 설정', 'fail', 'API서버 앱 정의 없음');
      return;
    }
    
    // 필수 설정 확인
    const requiredFields = ['script', 'cwd', 'env'];
    const missingFields = requiredFields.filter(field => !apiApp[field]);
    
    if (missingFields.length === 0) {
      addCheck('pm2', 'PM2 필수 설정', 'pass', '모든 필수 설정 존재');
    } else {
      addCheck('pm2', 'PM2 필수 설정', 'fail', 
        `누락된 설정: ${missingFields.join(', ')}`);
    }
    
    // 환경변수 설정 확인
    if (apiApp.env && apiApp.env.NODE_ENV && apiApp.env.PORT) {
      addCheck('pm2', 'PM2 환경변수', 'pass', '환경변수 설정됨');
    } else {
      addCheck('pm2', 'PM2 환경변수', 'warning', '일부 환경변수 누락');
    }
    
    // 클러스터 모드 확인
    if (apiApp.exec_mode === 'cluster' && apiApp.instances) {
      addCheck('pm2', 'PM2 클러스터 모드', 'pass', 
        `클러스터 모드 (${apiApp.instances} 인스턴스)`);
    } else {
      addCheck('pm2', 'PM2 클러스터 모드', 'warning', '단일 인스턴스 모드');
    }
    
  } catch (error) {
    addCheck('pm2', 'PM2 설정 로드', 'fail', `설정 로드 실패: ${error.message}`);
  }
}

/**
 * 런타임 검증 (API 서버 실행 확인)
 */
async function validateRuntime() {
  log.section('런타임 검증');
  
  const port = process.env.PORT || 3001;
  const healthEndpoint = `http://localhost:${port}/health`;
  
  return new Promise((resolve) => {
    http.get(healthEndpoint, (res) => {
      if (res.statusCode === 200) {
        addCheck('runtime', 'API서버 상태', 'pass', 
          `서버 실행 중 (포트 ${port})`);
      } else {
        addCheck('runtime', 'API서버 상태', 'warning', 
          `서버 응답 이상 (상태 코드: ${res.statusCode})`);
      }
      resolve();
    }).on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        addCheck('runtime', 'API서버 상태', 'warning', 
          `서버 미실행 (포트 ${port})`);
      } else {
        addCheck('runtime', 'API서버 상태', 'fail', 
          `연결 실패: ${err.message}`);
      }
      resolve();
    });
  });
}

/**
 * 성능 최적화 검증
 */
function validateOptimization() {
  log.section('성능 최적화 검증');
  
  // 벤치마크 결과 파일 확인
  const benchmarkFile = 'benchmark-results-apiserver.json';
  
  if (!checkFileExists(benchmarkFile)) {
    addCheck('optimization', '벤치마크 결과', 'warning', 
      '벤치마크가 실행되지 않음. npm run benchmark:apiserver 실행 필요');
    return;
  }
  
  try {
    const benchmark = JSON.parse(fs.readFileSync(benchmarkFile, 'utf-8'));
    const improvement = benchmark.results.improvement.percentage;
    
    if (improvement >= 85) {
      addCheck('optimization', '빌드 성능 개선', 'pass', 
        `${improvement}% 개선 달성 (목표: 85%)`);
    } else if (improvement >= 60) {
      addCheck('optimization', '빌드 성능 개선', 'warning', 
        `${improvement}% 개선 (목표: 85%)`);
    } else {
      addCheck('optimization', '빌드 성능 개선', 'fail', 
        `${improvement}% 개선 - 최적화 필요`);
    }
    
    // 빌드 시간 확인
    const optimizedTime = benchmark.results.optimizedBuild.durationSeconds;
    if (optimizedTime < 30) {
      addCheck('optimization', '빌드 시간', 'pass', 
        `${optimizedTime.toFixed(1)}초 (매우 빠름)`);
    } else if (optimizedTime < 60) {
      addCheck('optimization', '빌드 시간', 'pass', 
        `${optimizedTime.toFixed(1)}초 (적절함)`);
    } else {
      addCheck('optimization', '빌드 시간', 'warning', 
        `${optimizedTime.toFixed(1)}초 (개선 여지 있음)`);
    }
    
  } catch (error) {
    addCheck('optimization', '벤치마크 결과', 'fail', 
      `결과 파싱 실패: ${error.message}`);
  }
}

/**
 * 검증 결과 요약
 */
function printSummary() {
  const { total, passed, failed, warnings } = validationResults.summary;
  
  console.log('\n' + '='.repeat(60));
  console.log('  검증 결과 요약');
  console.log('='.repeat(60));
  
  console.log(`\n총 검사 항목: ${total}`);
  console.log(`${colors.green}✓ 통과: ${passed}${colors.reset}`);
  console.log(`${colors.yellow}⚠ 경고: ${warnings}${colors.reset}`);
  console.log(`${colors.red}✗ 실패: ${failed}${colors.reset}`);
  
  const successRate = (passed / total * 100).toFixed(1);
  console.log(`\n성공률: ${successRate}%`);
  
  // 전체 평가
  console.log('\n' + '─'.repeat(60));
  if (failed === 0 && warnings === 0) {
    log.success('🎉 완벽! API서버 환경이 완전히 최적화되었습니다!');
  } else if (failed === 0) {
    log.success('✅ 양호! API서버가 정상 작동 가능합니다.');
    if (warnings > 0) {
      log.warning(`   ${warnings}개의 경고 사항을 확인하세요.`);
    }
  } else if (failed <= 3) {
    log.warning('⚠️  주의! 일부 문제를 해결해야 합니다.');
    log.error(`   ${failed}개의 실패 항목을 수정하세요.`);
  } else {
    log.error('❌ 심각! API서버 환경 설정이 불완전합니다.');
    log.error(`   ${failed}개의 실패 항목을 반드시 수정하세요.`);
  }
  console.log('─'.repeat(60));
  
  // 결과 저장
  const resultFile = 'validation-results-apiserver.json';
  fs.writeFileSync(resultFile, JSON.stringify(validationResults, null, 2));
  log.info(`\n검증 결과 저장: ${resultFile}`);
}

/**
 * 특정 카테고리 검증
 */
async function validateCategory(category) {
  switch (category) {
    case 'env':
      validateEnvironment();
      break;
    case 'structure':
      validateProjectStructure();
      break;
    case 'build':
      validateBuildSystem();
      break;
    case 'deps':
      validateDependencies();
      break;
    case 'pm2':
      validatePM2Config();
      break;
    case 'runtime':
      await validateRuntime();
      break;
    case 'optimization':
      validateOptimization();
      break;
    default:
      log.error(`알 수 없는 카테고리: ${category}`);
      return false;
  }
  return true;
}

/**
 * 메인 실행
 */
async function main() {
  const args = process.argv.slice(2);
  const category = args[0];
  
  console.log('\n' + '='.repeat(60));
  console.log('  🔍 API서버 환경 검증 시작');
  console.log('='.repeat(60));
  
  if (category) {
    // 특정 카테고리만 검증
    log.info(`카테고리 검증: ${category}`);
    const valid = await validateCategory(category);
    if (!valid) {
      console.log('\n사용 가능한 카테고리:');
      console.log('  env          - 환경변수 검증');
      console.log('  structure    - 프로젝트 구조 검증');
      console.log('  build        - 빌드 시스템 검증');
      console.log('  deps         - 의존성 검증');
      console.log('  pm2          - PM2 설정 검증');
      console.log('  runtime      - 런타임 검증');
      console.log('  optimization - 최적화 검증');
      process.exit(1);
    }
  } else {
    // 전체 검증
    validateEnvironment();
    validateProjectStructure();
    validateBuildSystem();
    validateDependencies();
    validatePM2Config();
    await validateRuntime();
    validateOptimization();
  }
  
  printSummary();
}

// 실행
if (require.main === module) {
  main().catch(error => {
    log.error(`검증 실행 실패: ${error.message}`);
    process.exit(1);
  });
}