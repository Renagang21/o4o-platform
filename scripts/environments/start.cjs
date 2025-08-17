#!/usr/bin/env node

/**
 * Environment-aware Start Script
 * 환경에 맞는 서비스 시작
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { detectEnvironment, getEnvironmentInfo } = require('../common/detectEnvironment.cjs');
const { getWorkspaces } = require('../common/workspaceConfig.cjs');
const { parseLoggerFlags } = require('../common/logger.cjs');

const logger = parseLoggerFlags();

/**
 * PM2 설정 파일 경로 가져오기
 */
function getPM2ConfigPath(environment) {
  const configFile = `ecosystem.config.${environment}.cjs`;
  const configPath = path.resolve(__dirname, '../../', configFile);
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`PM2 config not found: ${configFile}`);
  }
  
  return configPath;
}

/**
 * PM2로 서비스 시작
 */
function startWithPM2(environment, options = {}) {
  logger.header(`Starting Services with PM2 (${environment.toUpperCase()})`);
  
  try {
    const configPath = getPM2ConfigPath(environment);
    
    // PM2 설치 확인
    try {
      execSync('pm2 --version', { stdio: 'ignore' });
    } catch {
      logger.warn('PM2 not found, installing globally...');
      execSync('npm install -g pm2', { stdio: 'inherit' });
    }
    
    // 기존 PM2 프로세스 정리 (옵션)
    if (options.restart) {
      logger.info('Stopping existing PM2 processes...');
      try {
        execSync(`pm2 delete ${configPath}`, { stdio: 'ignore' });
      } catch {
        // 프로세스가 없을 수 있음
      }
    }
    
    // PM2 시작
    logger.startTask('Starting PM2 services');
    const pm2Command = `pm2 start ${configPath}`;
    
    execSync(pm2Command, {
      stdio: options.silent ? 'ignore' : 'inherit',
      env: {
        ...process.env,
        SERVER_TYPE: environment
      }
    });
    
    logger.endTask('Starting PM2 services', true);
    
    // PM2 상태 표시
    if (!options.silent) {
      logger.info('Current PM2 status:');
      execSync('pm2 list', { stdio: 'inherit' });
    }
    
    // 로그 표시 옵션
    if (options.logs) {
      logger.info('Starting PM2 logs (Ctrl+C to exit)...');
      spawn('pm2', ['logs'], { stdio: 'inherit' });
    }
    
    return true;
  } catch (error) {
    logger.error(`Failed to start PM2: ${error.message}`);
    return false;
  }
}

/**
 * 개발 모드로 시작 (hot reload)
 */
function startDevelopment(environment, options = {}) {
  logger.header(`Starting Development Mode (${environment.toUpperCase()})`);
  
  const workspaces = getWorkspaces(environment);
  const processes = [];
  
  // 환경별 개발 서버 시작
  if (environment === 'apiserver') {
    // API 서버만
    logger.startTask('Starting API Server (dev mode)');
    const apiProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, '../../apps/api-server'),
      stdio: 'inherit'
    });
    processes.push(apiProcess);
    
  } else if (environment === 'webserver') {
    // 프론트엔드 앱들
    if (workspaces.apps.includes('admin-dashboard')) {
      logger.startTask('Starting Admin Dashboard (dev mode)');
      const adminProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.resolve(__dirname, '../../apps/admin-dashboard'),
        stdio: 'inherit'
      });
      processes.push(adminProcess);
    }
    
    if (workspaces.apps.includes('main-site')) {
      logger.startTask('Starting Main Site (dev mode)');
      const mainProcess = spawn('npm', ['run', 'dev'], {
        cwd: path.resolve(__dirname, '../../apps/main-site'),
        stdio: 'inherit'
      });
      processes.push(mainProcess);
    }
    
  } else {
    // 로컬: 전체 스택
    logger.info('Starting full stack development mode');
    
    // API 서버
    const apiProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, '../../apps/api-server'),
      stdio: 'inherit'
    });
    processes.push(apiProcess);
    
    // 프론트엔드 (별도 터미널 권장)
    logger.warn('Note: Consider running frontend apps in separate terminals for better control');
    logger.info('Commands:');
    logger.info('  Terminal 1: cd apps/api-server && npm run dev');
    logger.info('  Terminal 2: cd apps/admin-dashboard && npm run dev');
    logger.info('  Terminal 3: cd apps/main-site && npm run dev');
  }
  
  // 프로세스 종료 처리
  process.on('SIGINT', () => {
    logger.info('Shutting down development servers...');
    processes.forEach(p => p.kill());
    process.exit(0);
  });
  
  return true;
}

/**
 * 서비스 상태 확인
 */
function checkStatus(environment) {
  logger.header(`Service Status (${environment.toUpperCase()})`);
  
  // PM2 상태
  try {
    execSync('pm2 list', { stdio: 'inherit' });
  } catch {
    logger.warn('PM2 not running or not installed');
  }
  
  // 포트 사용 확인
  const ports = {
    local: [3001, 5173, 5174],
    webserver: [5173, 5174],
    apiserver: [3001]
  };
  
  logger.info('Port usage:');
  ports[environment].forEach(port => {
    try {
      execSync(`lsof -i :${port}`, { stdio: 'ignore' });
      logger.success(`Port ${port}: IN USE`);
    } catch {
      logger.warn(`Port ${port}: Available`);
    }
  });
  
  // 환경 정보
  const envInfo = getEnvironmentInfo();
  logger.info('Environment configuration:');
  logger.list(envInfo.configFiles);
}

/**
 * 메인 시작 함수
 */
async function start(options = {}) {
  const environment = options.env || detectEnvironment();
  
  logger.box(`O4O Platform Start System\nEnvironment: ${environment.toUpperCase()}`, 'info');
  
  // 환경 정보 표시
  const envInfo = getEnvironmentInfo();
  logger.info(`Node: ${envInfo.nodeVersion}`);
  logger.info(`NPM: v${envInfo.npmVersion}`);
  logger.info(`Config files: ${envInfo.configFiles.join(', ')}`);
  
  // 시작 모드 결정
  if (options.dev) {
    return startDevelopment(environment, options);
  } else if (options.status) {
    return checkStatus(environment);
  } else {
    return startWithPM2(environment, options);
  }
}

// CLI 실행
if (require.main === module) {
  const options = {
    env: process.env.START_ENV || null,
    dev: process.argv.includes('--dev') || process.argv.includes('-d'),
    restart: process.argv.includes('--restart') || process.argv.includes('-r'),
    logs: process.argv.includes('--logs') || process.argv.includes('-l'),
    status: process.argv.includes('--status') || process.argv.includes('-s'),
    silent: process.argv.includes('--silent'),
    dryRun: process.argv.includes('--dry-run')
  };
  
  // Dry-run 모드
  if (options.dryRun) {
    const environment = options.env || detectEnvironment();
    const workspaces = getWorkspaces(environment);
    logger.box('DRY RUN MODE - Services to start', 'warning');
    logger.info(`Environment: ${environment}`);
    logger.info(`Apps: ${workspaces.apps.join(', ')}`);
    logger.info(`PM2 Config: ecosystem.config.${environment}.cjs`);
    process.exit(0);
  }
  
  start(options)
    .then(success => {
      if (success) {
        logger.success('Services started successfully');
        if (!options.logs && !options.dev) {
          logger.info('Use "pm2 logs" to view logs');
          logger.info('Use "pm2 stop all" to stop all services');
        }
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error(`Start failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  startWithPM2,
  startDevelopment,
  checkStatus,
  start
};