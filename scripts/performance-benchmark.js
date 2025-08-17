#!/usr/bin/env node

/**
 * API서버 성능 벤치마크 스크립트
 * 전체 빌드 vs 최적화 빌드 성능 비교
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

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
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  metric: (label, value, unit = '') => {
    console.log(`${colors.cyan}[METRIC]${colors.reset} ${label}: ${colors.green}${value}${unit}${colors.reset}`);
  },
};

/**
 * 명령어 실행 및 시간 측정
 */
function measureCommand(command, label) {
  log.info(`실행 중: ${label}`);
  log.info(`명령어: ${command}`);
  
  const startTime = performance.now();
  const startMemory = process.memoryUsage();
  
  try {
    execSync(command, { 
      stdio: 'pipe',
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 10 // 10MB
    });
    
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    const duration = endTime - startTime;
    const memoryUsed = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;
    
    return {
      label,
      command,
      duration,
      memoryUsed,
      success: true,
      error: null,
    };
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    return {
      label,
      command,
      duration,
      memoryUsed: 0,
      success: false,
      error: error.message,
    };
  }
}

/**
 * 빌드 캐시 정리
 */
function cleanBuildCache() {
  log.info('빌드 캐시 정리 중...');
  
  const dirsToClean = [
    'dist',
    '.turbo',
    'apps/admin-dashboard/dist',
    'apps/api-server/dist',
    'apps/storefront/dist',
    'packages/*/dist',
  ];
  
  dirsToClean.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (dir.includes('*')) {
      // 와일드카드 처리
      try {
        execSync(`rm -rf ${fullPath}`, { stdio: 'pipe' });
      } catch (e) {
        // 무시
      }
    } else if (fs.existsSync(fullPath)) {
      execSync(`rm -rf ${fullPath}`, { stdio: 'pipe' });
    }
  });
  
  log.success('캐시 정리 완료');
}

/**
 * 워크스페이스 정보 수집
 */
function getWorkspaceInfo() {
  try {
    const output = execSync('npm ls --json --depth=0', { 
      stdio: 'pipe',
      encoding: 'utf-8' 
    });
    const data = JSON.parse(output);
    
    const workspaces = {
      total: 0,
      apps: [],
      packages: [],
    };
    
    // package.json에서 워크스페이스 정보 읽기
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    if (packageJson.workspaces) {
      packageJson.workspaces.forEach(pattern => {
        if (pattern.startsWith('apps/')) {
          const appDirs = fs.readdirSync('apps').filter(dir => {
            return fs.statSync(path.join('apps', dir)).isDirectory();
          });
          workspaces.apps = appDirs;
        }
        if (pattern.startsWith('packages/')) {
          const pkgDirs = fs.readdirSync('packages').filter(dir => {
            return fs.statSync(path.join('packages', dir)).isDirectory();
          });
          workspaces.packages = pkgDirs;
        }
      });
    }
    
    workspaces.total = workspaces.apps.length + workspaces.packages.length;
    return workspaces;
  } catch (error) {
    log.error('워크스페이스 정보 수집 실패');
    return {
      total: 0,
      apps: [],
      packages: [],
    };
  }
}

/**
 * API서버 전용 빌드 벤치마크
 */
async function benchmarkApiServer() {
  console.log('\n' + '='.repeat(60));
  console.log('  API서버 빌드 성능 벤치마크');
  console.log('='.repeat(60) + '\n');
  
  const workspaces = getWorkspaceInfo();
  log.info(`전체 워크스페이스: ${workspaces.total}개`);
  log.info(`Apps: ${workspaces.apps.join(', ')}`);
  log.info(`Packages: ${workspaces.packages.join(', ')}`);
  
  const results = [];
  
  // 1. 전체 빌드 (기존 방식)
  console.log('\n--- 전체 빌드 테스트 (기존 방식) ---');
  cleanBuildCache();
  const fullBuild = measureCommand('npm run build', '전체 빌드');
  results.push(fullBuild);
  
  // 2. API서버 최적화 빌드 (2개 워크스페이스만)
  console.log('\n--- API서버 최적화 빌드 테스트 ---');
  cleanBuildCache();
  const optimizedCommands = [
    'npm run build --workspace=packages/supplier-connector',
    'npm run build --workspace=apps/api-server',
  ];
  const optimizedBuild = measureCommand(
    optimizedCommands.join(' && '),
    'API서버 최적화 빌드'
  );
  results.push(optimizedBuild);
  
  // 3. 개별 워크스페이스 빌드 시간 측정
  console.log('\n--- 개별 워크스페이스 빌드 시간 ---');
  cleanBuildCache();
  
  const individualResults = [];
  
  // supplier-connector 빌드
  const supplierBuild = measureCommand(
    'npm run build --workspace=packages/supplier-connector',
    'supplier-connector 빌드'
  );
  individualResults.push(supplierBuild);
  
  // api-server 빌드
  const apiBuild = measureCommand(
    'npm run build --workspace=apps/api-server',
    'api-server 빌드'
  );
  individualResults.push(apiBuild);
  
  // 결과 분석
  console.log('\n' + '='.repeat(60));
  console.log('  벤치마크 결과 분석');
  console.log('='.repeat(60) + '\n');
  
  // 시간 비교
  const fullTime = fullBuild.duration;
  const optimizedTime = optimizedBuild.duration;
  const improvement = ((fullTime - optimizedTime) / fullTime * 100).toFixed(1);
  const speedup = (fullTime / optimizedTime).toFixed(2);
  
  console.log('📊 빌드 시간 비교:');
  log.metric('전체 빌드', `${(fullTime / 1000).toFixed(2)}`, '초');
  log.metric('최적화 빌드', `${(optimizedTime / 1000).toFixed(2)}`, '초');
  log.metric('개선율', `${improvement}`, '%');
  log.metric('속도 향상', `${speedup}`, 'x');
  
  // 메모리 사용량 비교
  console.log('\n📊 메모리 사용량:');
  log.metric('전체 빌드', `${fullBuild.memoryUsed.toFixed(2)}`, 'MB');
  log.metric('최적화 빌드', `${optimizedBuild.memoryUsed.toFixed(2)}`, 'MB');
  
  // 개별 빌드 시간
  console.log('\n📊 개별 워크스페이스 빌드 시간:');
  individualResults.forEach(result => {
    log.metric(result.label, `${(result.duration / 1000).toFixed(2)}`, '초');
  });
  
  // 불필요한 빌드 제거 효과
  const unnecessaryWorkspaces = workspaces.total - 2;
  console.log('\n📊 최적화 효과:');
  log.metric('전체 워크스페이스', workspaces.total, '개');
  log.metric('API서버 필요 워크스페이스', '2', '개');
  log.metric('제외된 워크스페이스', unnecessaryWorkspaces, '개');
  
  // 결과 저장
  const benchmarkResult = {
    timestamp: new Date().toISOString(),
    workspaces,
    results: {
      fullBuild: {
        duration: fullTime,
        durationSeconds: fullTime / 1000,
        memoryUsed: fullBuild.memoryUsed,
      },
      optimizedBuild: {
        duration: optimizedTime,
        durationSeconds: optimizedTime / 1000,
        memoryUsed: optimizedBuild.memoryUsed,
      },
      improvement: {
        percentage: parseFloat(improvement),
        speedup: parseFloat(speedup),
        timeSaved: (fullTime - optimizedTime) / 1000,
      },
      individualBuilds: individualResults.map(r => ({
        label: r.label,
        duration: r.duration,
        durationSeconds: r.duration / 1000,
      })),
    },
  };
  
  // 결과를 파일로 저장
  const resultPath = path.join(process.cwd(), 'benchmark-results-apiserver.json');
  fs.writeFileSync(resultPath, JSON.stringify(benchmarkResult, null, 2));
  
  console.log('\n' + '='.repeat(60));
  if (improvement >= 80) {
    log.success(`🎉 목표 달성! ${improvement}% 성능 개선 확인`);
  } else if (improvement >= 60) {
    log.warning(`⚡ 양호! ${improvement}% 성능 개선 (목표: 85%)`);
  } else {
    log.warning(`⚠️  추가 최적화 필요: ${improvement}% 개선 (목표: 85%)`);
  }
  console.log('='.repeat(60) + '\n');
  
  log.info(`벤치마크 결과 저장: ${resultPath}`);
  
  return benchmarkResult;
}

/**
 * 비교 벤치마크 실행
 */
async function compareBenchmarks() {
  console.log('\n' + '='.repeat(60));
  console.log('  웹서버 vs API서버 빌드 성능 비교');
  console.log('='.repeat(60) + '\n');
  
  // 웹서버 벤치마크 결과 확인
  const webserverResultPath = path.join(process.cwd(), 'benchmark-results-webserver.json');
  const apiserverResultPath = path.join(process.cwd(), 'benchmark-results-apiserver.json');
  
  let webserverResult = null;
  let apiserverResult = null;
  
  // 웹서버 결과 로드 또는 생성
  if (fs.existsSync(webserverResultPath)) {
    webserverResult = JSON.parse(fs.readFileSync(webserverResultPath, 'utf-8'));
    log.info('웹서버 벤치마크 결과 로드됨');
  } else {
    log.warning('웹서버 벤치마크 결과 없음. 웹서버 벤치마크를 먼저 실행하세요.');
  }
  
  // API서버 결과 로드 또는 생성
  if (fs.existsSync(apiserverResultPath)) {
    apiserverResult = JSON.parse(fs.readFileSync(apiserverResultPath, 'utf-8'));
    log.info('API서버 벤치마크 결과 로드됨');
  } else {
    log.info('API서버 벤치마크 실행 중...');
    apiserverResult = await benchmarkApiServer();
  }
  
  if (!webserverResult || !apiserverResult) {
    log.error('비교할 벤치마크 결과가 부족합니다.');
    return;
  }
  
  // 비교 분석
  console.log('\n📊 성능 개선 비교:');
  console.log('─'.repeat(50));
  console.log(`웹서버 개선율: ${webserverResult.results.improvement.percentage}%`);
  console.log(`API서버 개선율: ${apiserverResult.results.improvement.percentage}%`);
  console.log('─'.repeat(50));
  
  console.log('\n📊 빌드 시간 비교:');
  console.log('─'.repeat(50));
  console.log('웹서버:');
  console.log(`  전체 빌드: ${webserverResult.results.fullBuild.durationSeconds.toFixed(2)}초`);
  console.log(`  최적화: ${webserverResult.results.optimizedBuild.durationSeconds.toFixed(2)}초`);
  console.log('API서버:');
  console.log(`  전체 빌드: ${apiserverResult.results.fullBuild.durationSeconds.toFixed(2)}초`);
  console.log(`  최적화: ${apiserverResult.results.optimizedBuild.durationSeconds.toFixed(2)}초`);
  console.log('─'.repeat(50));
  
  // 종합 평가
  const avgImprovement = (
    webserverResult.results.improvement.percentage + 
    apiserverResult.results.improvement.percentage
  ) / 2;
  
  console.log('\n' + '='.repeat(60));
  log.success(`종합 평균 개선율: ${avgImprovement.toFixed(1)}%`);
  
  if (avgImprovement >= 85) {
    log.success('🎉 전체 시스템 최적화 목표 달성!');
  } else {
    log.warning(`⚠️  추가 최적화 필요 (목표: 85%, 현재: ${avgImprovement.toFixed(1)}%)`);
  }
  console.log('='.repeat(60) + '\n');
}

/**
 * 메인 실행
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'apiserver';
  
  switch (command) {
    case 'apiserver':
      await benchmarkApiServer();
      break;
    case 'compare':
      await compareBenchmarks();
      break;
    case 'help':
      console.log('사용법:');
      console.log('  node scripts/performance-benchmark.js [command]');
      console.log('\n명령어:');
      console.log('  apiserver  - API서버 빌드 벤치마크 실행 (기본값)');
      console.log('  compare    - 웹서버와 API서버 벤치마크 비교');
      console.log('  help       - 도움말 표시');
      break;
    default:
      log.error(`알 수 없는 명령어: ${command}`);
      console.log('도움말을 보려면: node scripts/performance-benchmark.js help');
      process.exit(1);
  }
}

// 실행
if (require.main === module) {
  main().catch(error => {
    log.error(`벤치마크 실행 실패: ${error.message}`);
    process.exit(1);
  });
}