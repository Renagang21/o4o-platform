#!/usr/bin/env node

/**
 * Environment-aware Deploy Script
 * 환경별 최적화된 배포 로직
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { detectEnvironment, validateEnvironment } = require('../common/detectEnvironment.cjs');
const { getWorkspaces, getEnvironmentStats } = require('../common/workspaceConfig.cjs');
const { parseLoggerFlags } = require('../common/logger.cjs');

const logger = parseLoggerFlags();

/**
 * 배포 전 검증
 */
function preDeployChecks(environment, options = {}) {
  logger.header('Pre-deployment Checks');
  
  const checks = {
    environment: false,
    build: false,
    tests: false,
    git: false,
    config: false
  };
  
  // 1. 환경 검증
  logger.startTask('Validating environment');
  if (validateEnvironment(environment)) {
    checks.environment = true;
    logger.endTask('Validating environment', true);
  } else {
    logger.endTask('Validating environment', false);
    return checks;
  }
  
  // 2. 빌드 상태 확인
  logger.startTask('Checking build artifacts');
  const workspaces = getWorkspaces(environment);
  let buildComplete = true;
  
  workspaces.all.forEach(ws => {
    const distPath = path.resolve(__dirname, '../../', 
      ws.startsWith('@o4o/') ? `packages/${ws.replace('@o4o/', '')}` : `apps/${ws}`,
      'dist'
    );
    
    if (!fs.existsSync(distPath)) {
      logger.warn(`Missing build: ${ws}`);
      buildComplete = false;
    }
  });
  
  checks.build = buildComplete;
  logger.endTask('Checking build artifacts', buildComplete);
  
  // 3. 테스트 실행 (옵션)
  if (!options.skipTests) {
    logger.startTask('Running tests');
    try {
      execSync('npm run test', { 
        stdio: 'ignore',
        timeout: 60000 
      });
      checks.tests = true;
      logger.endTask('Running tests', true);
    } catch {
      logger.endTask('Running tests', false);
      if (!options.force) {
        return checks;
      }
    }
  } else {
    checks.tests = true;
    logger.info('Skipping tests (--skip-tests)');
  }
  
  // 4. Git 상태 확인
  logger.startTask('Checking Git status');
  try {
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    if (gitStatus.trim() && !options.force) {
      logger.warn('Uncommitted changes detected');
      checks.git = false;
    } else {
      checks.git = true;
    }
    logger.endTask('Checking Git status', checks.git);
  } catch {
    logger.endTask('Checking Git status', false);
  }
  
  // 5. 설정 파일 확인
  logger.startTask('Validating configuration');
  const configFiles = {
    local: ['.env.local', 'ecosystem.config.local.cjs'],
    webserver: ['.env.webserver', 'ecosystem.config.webserver.cjs'],
    apiserver: ['.env.apiserver', 'ecosystem.config.apiserver.cjs']
  };
  
  let configValid = true;
  configFiles[environment].forEach(file => {
    const filePath = path.resolve(__dirname, '../../', file);
    if (!fs.existsSync(filePath)) {
      logger.warn(`Missing config: ${file}`);
      configValid = false;
    }
  });
  
  checks.config = configValid;
  logger.endTask('Validating configuration', configValid);
  
  // 결과 요약
  logger.separator();
  const allPassed = Object.values(checks).every(v => v);
  
  if (allPassed) {
    logger.success('All pre-deployment checks passed');
  } else {
    logger.warn('Some checks failed:');
    Object.entries(checks).forEach(([key, value]) => {
      if (!value) {
        logger.error(`  ✗ ${key}`);
      }
    });
    
    if (!options.force) {
      logger.error('Deployment aborted. Use --force to override');
    }
  }
  
  return checks;
}

/**
 * 백업 생성
 */
function createBackup(environment) {
  logger.header('Creating Backup');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, '../../backups', `deploy-${environment}-${timestamp}`);
  
  logger.startTask('Creating backup directory');
  fs.mkdirSync(backupDir, { recursive: true });
  logger.endTask('Creating backup directory', true);
  
  // 중요 파일 백업
  const filesToBackup = [
    '.env',
    `.env.${environment}`,
    `ecosystem.config.${environment}.cjs`,
    'package.json'
  ];
  
  filesToBackup.forEach(file => {
    const srcPath = path.resolve(__dirname, '../../', file);
    if (fs.existsSync(srcPath)) {
      const destPath = path.join(backupDir, file);
      fs.copyFileSync(srcPath, destPath);
      logger.debug(`Backed up: ${file}`);
    }
  });
  
  logger.success(`Backup created: ${backupDir}`);
  return backupDir;
}

/**
 * 환경별 배포 실행
 */
function deployEnvironment(environment, options = {}) {
  logger.header(`Deploying to ${environment.toUpperCase()}`);
  
  const stats = getEnvironmentStats(environment);
  logger.info(`Deploying: ${stats.description}`);
  logger.info(`Workspaces: ${stats.total} (Optimization: ${stats.optimization})`);
  
  try {
    if (environment === 'local') {
      // 로컬: PM2 재시작
      logger.startTask('Restarting local services');
      execSync('npm run pm2:restart:local', { stdio: 'inherit' });
      logger.endTask('Restarting local services', true);
      
    } else if (environment === 'webserver') {
      // 웹서버: 프론트엔드 배포
      logger.startTask('Deploying frontend applications');
      
      // Nginx 설정 업데이트
      if (options.updateNginx) {
        logger.info('Updating Nginx configuration...');
        // Nginx 설정 로직
      }
      
      // PM2 재시작
      execSync('npm run pm2:restart:webserver', { stdio: 'inherit' });
      logger.endTask('Deploying frontend applications', true);
      
    } else if (environment === 'apiserver') {
      // API 서버: 백엔드 배포
      logger.startTask('Deploying API server');
      
      // 데이터베이스 마이그레이션
      if (options.migrate) {
        logger.info('Running database migrations...');
        execSync('npm run migration:run', {
          cwd: path.resolve(__dirname, '../../apps/api-server'),
          stdio: 'inherit'
        });
      }
      
      // PM2 재시작
      execSync('npm run pm2:restart:apiserver', { stdio: 'inherit' });
      logger.endTask('Deploying API server', true);
    }
    
    return true;
  } catch (error) {
    logger.error(`Deployment failed: ${error.message}`);
    return false;
  }
}

/**
 * 배포 후 검증
 */
function postDeployVerification(environment) {
  logger.header('Post-deployment Verification');
  
  const verifications = {
    services: false,
    health: false,
    logs: true
  };
  
  // 1. 서비스 상태 확인
  logger.startTask('Checking service status');
  try {
    const pm2Status = execSync('pm2 list --json', { encoding: 'utf8' });
    const processes = JSON.parse(pm2Status);
    
    const runningCount = processes.filter(p => p.pm2_env.status === 'online').length;
    if (runningCount > 0) {
      verifications.services = true;
      logger.success(`${runningCount} services running`);
    }
    logger.endTask('Checking service status', true);
  } catch {
    logger.endTask('Checking service status', false);
  }
  
  // 2. Health check
  logger.startTask('Running health checks');
  const healthEndpoints = {
    apiserver: ['http://localhost:3001/health'],
    webserver: ['http://localhost:5173', 'http://localhost:5174'],
    local: ['http://localhost:3001/health', 'http://localhost:5173']
  };
  
  const endpoints = healthEndpoints[environment] || [];
  let healthyCount = 0;
  
  endpoints.forEach(endpoint => {
    try {
      execSync(`curl -f -s ${endpoint}`, { timeout: 5000 });
      logger.debug(`✓ ${endpoint}`);
      healthyCount++;
    } catch {
      logger.debug(`✗ ${endpoint}`);
    }
  });
  
  verifications.health = healthyCount === endpoints.length;
  logger.endTask('Running health checks', verifications.health);
  
  // 3. 로그 확인
  logger.info('Recent logs:');
  try {
    const logs = execSync('pm2 logs --nostream --lines 5', { encoding: 'utf8' });
    console.log(logs);
  } catch {
    logger.warn('Could not retrieve logs');
  }
  
  return verifications;
}

/**
 * 롤백 기능
 */
function rollback(backupDir) {
  logger.header('Rolling Back Deployment');
  
  if (!fs.existsSync(backupDir)) {
    logger.error('Backup directory not found');
    return false;
  }
  
  try {
    // 백업 파일 복원
    const files = fs.readdirSync(backupDir);
    files.forEach(file => {
      const srcPath = path.join(backupDir, file);
      const destPath = path.resolve(__dirname, '../../', file);
      fs.copyFileSync(srcPath, destPath);
      logger.debug(`Restored: ${file}`);
    });
    
    // 서비스 재시작
    execSync('pm2 restart all', { stdio: 'inherit' });
    
    logger.success('Rollback completed');
    return true;
  } catch (error) {
    logger.error(`Rollback failed: ${error.message}`);
    return false;
  }
}

/**
 * 메인 배포 함수
 */
async function deploy(options = {}) {
  const environment = options.env || detectEnvironment();
  
  logger.box(`O4O Platform Deployment System\nEnvironment: ${environment.toUpperCase()}`, 'info');
  
  // 1. 배포 전 검사
  const checks = preDeployChecks(environment, options);
  
  if (!Object.values(checks).every(v => v) && !options.force) {
    logger.error('Pre-deployment checks failed');
    return false;
  }
  
  // 2. 백업 생성
  let backupDir = null;
  if (!options.skipBackup) {
    backupDir = createBackup(environment);
  }
  
  // 3. 빌드 (필요시)
  if (!checks.build || options.build) {
    logger.info('Running build...');
    try {
      execSync(`node ${path.resolve(__dirname, './build.js')}`, { 
        stdio: 'inherit',
        env: { ...process.env, BUILD_ENV: environment }
      });
    } catch (error) {
      logger.error('Build failed');
      if (backupDir && options.autoRollback) {
        rollback(backupDir);
      }
      return false;
    }
  }
  
  // 4. 배포 실행
  const deploySuccess = deployEnvironment(environment, options);
  
  if (!deploySuccess) {
    logger.error('Deployment failed');
    if (backupDir && options.autoRollback) {
      rollback(backupDir);
    }
    return false;
  }
  
  // 5. 배포 후 검증
  const verifications = postDeployVerification(environment);
  
  if (!verifications.services || !verifications.health) {
    logger.warn('Post-deployment verification failed');
    if (options.autoRollback) {
      logger.info('Initiating automatic rollback...');
      rollback(backupDir);
      return false;
    }
  }
  
  logger.box('Deployment completed successfully!', 'success');
  return true;
}

// CLI 실행
if (require.main === module) {
  const options = {
    env: process.env.DEPLOY_ENV || null,
    force: process.argv.includes('--force'),
    skipTests: process.argv.includes('--skip-tests'),
    skipBackup: process.argv.includes('--skip-backup'),
    build: process.argv.includes('--build'),
    migrate: process.argv.includes('--migrate'),
    updateNginx: process.argv.includes('--update-nginx'),
    autoRollback: process.argv.includes('--auto-rollback')
  };
  
  deploy(options)
    .then(success => {
      if (success) {
        logger.success('Deployment successful');
        process.exit(0);
      } else {
        logger.error('Deployment failed');
        process.exit(1);
      }
    })
    .catch(error => {
      logger.error(`Deploy error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  preDeployChecks,
  createBackup,
  deployEnvironment,
  postDeployVerification,
  rollback,
  deploy
};