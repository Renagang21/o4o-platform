#!/usr/bin/env node

/**
 * Environment-aware Build Script
 * 환경에 맞는 워크스페이스만 빌드
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { detectEnvironment } = require('../common/detectEnvironment');
const { getOrderedWorkspaces, getBuildScript, getEnvironmentStats } = require('../common/workspaceConfig');
const { parseLoggerFlags } = require('../common/logger');

const logger = parseLoggerFlags();

/**
 * 워크스페이스 빌드
 */
function buildWorkspace(workspace, options = {}) {
  const workspacePath = path.resolve(__dirname, '../../', workspace);
  const workspaceName = workspace.split('/').pop();
  
  // package.json 존재 확인
  const packageJsonPath = path.join(workspacePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    logger.warn(`Skipping ${workspace} - no package.json found`);
    return false;
  }
  
  // 빌드 스크립트 결정
  const buildScript = options.script || getBuildScript(workspace);
  
  logger.startTask(`Building ${workspace}`);
  
  try {
    // npm workspace 명령 사용 시도
    if (workspace.startsWith('packages/') || workspace.startsWith('apps/')) {
      const npmScript = `npm run build --workspace=@o4o/${workspaceName}`;
      logger.debug(`Executing: ${npmScript}`);
      
      execSync(npmScript, {
        stdio: options.silent ? 'ignore' : 'inherit',
        cwd: path.resolve(__dirname, '../../')
      });
    } else {
      // 직접 빌드 스크립트 실행
      logger.debug(`Executing: ${buildScript} in ${workspacePath}`);
      
      execSync(buildScript, {
        stdio: options.silent ? 'ignore' : 'inherit',
        cwd: workspacePath
      });
    }
    
    logger.endTask(`Building ${workspace}`, true);
    return true;
  } catch (error) {
    logger.endTask(`Building ${workspace}`, false);
    logger.error(`Build failed for ${workspace}: ${error.message}`);
    
    if (!options.continueOnError) {
      throw error;
    }
    return false;
  }
}

/**
 * 패키지 빌드 (의존성 순서대로)
 */
function buildPackages(environment, options = {}) {
  const workspaces = getOrderedWorkspaces(environment);
  const packages = workspaces.filter(ws => ws.startsWith('packages/'));
  
  logger.header(`Building Packages for ${environment.toUpperCase()}`);
  logger.info(`Total packages to build: ${packages.length}`);
  
  let successCount = 0;
  let failCount = 0;
  
  packages.forEach((pkg, index) => {
    logger.progress(index + 1, packages.length, 'Building packages');
    
    const success = buildWorkspace(pkg, options);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  });
  
  logger.separator();
  logger.info(`Packages build complete: ${successCount} success, ${failCount} failed`);
  
  return failCount === 0;
}

/**
 * 앱 빌드
 */
function buildApps(environment, options = {}) {
  const workspaces = getOrderedWorkspaces(environment);
  const apps = workspaces.filter(ws => ws.startsWith('apps/'));
  
  logger.header(`Building Apps for ${environment.toUpperCase()}`);
  logger.info(`Total apps to build: ${apps.length}`);
  
  let successCount = 0;
  let failCount = 0;
  
  apps.forEach((app, index) => {
    logger.progress(index + 1, apps.length, 'Building apps');
    
    const success = buildWorkspace(app, options);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  });
  
  logger.separator();
  logger.info(`Apps build complete: ${successCount} success, ${failCount} failed`);
  
  return failCount === 0;
}

/**
 * 전체 빌드 프로세스
 */
async function buildAll(environment, options = {}) {
  const timer = logger.startTimer('Total build time');
  
  logger.box(`O4O Platform Build System\nEnvironment: ${environment.toUpperCase()}`, 'info');
  
  // 환경 통계 출력
  const stats = getEnvironmentStats(environment);
  logger.info(`Configuration: ${stats.description}`);
  logger.info(`Workspaces: ${stats.total} (Apps: ${stats.apps}, Packages: ${stats.packages})`);
  if (stats.optimization !== 'Full stack') {
    logger.success(`Optimization: ${stats.optimization} reduction from full stack`);
  }
  
  // supplier-connector 의존성 수정 (Critical Issue)
  if (environment === 'apiserver') {
    fixSupplierConnectorDependency();
  }
  
  // 클린 빌드 옵션
  if (options.clean) {
    logger.header('Clean Build');
    cleanBuildArtifacts(environment);
  }
  
  // 패키지 빌드
  const packagesSuccess = buildPackages(environment, options);
  
  if (!packagesSuccess && !options.continueOnError) {
    logger.error('Package build failed, aborting apps build');
    process.exit(1);
  }
  
  // 앱 빌드
  const appsSuccess = buildApps(environment, options);
  
  // 빌드 결과
  timer.end();
  
  if (packagesSuccess && appsSuccess) {
    logger.box('Build completed successfully!', 'success');
    return 0;
  } else {
    logger.box('Build completed with errors', 'warning');
    return 1;
  }
}

/**
 * supplier-connector 의존성 수정
 */
function fixSupplierConnectorDependency() {
  const apiServerPackageJson = path.resolve(__dirname, '../../apps/api-server/package.json');
  
  try {
    const packageData = JSON.parse(fs.readFileSync(apiServerPackageJson, 'utf8'));
    
    if (!packageData.dependencies['@o4o/supplier-connector']) {
      logger.warn('Adding missing @o4o/supplier-connector dependency to api-server');
      packageData.dependencies['@o4o/supplier-connector'] = 'file:../../packages/supplier-connector';
      
      fs.writeFileSync(apiServerPackageJson, JSON.stringify(packageData, null, 2) + '\n');
      logger.success('Fixed supplier-connector dependency');
      
      // npm install to update
      execSync('npm install', {
        cwd: path.resolve(__dirname, '../../apps/api-server'),
        stdio: 'ignore'
      });
    }
  } catch (error) {
    logger.error(`Failed to fix supplier-connector dependency: ${error.message}`);
  }
}

/**
 * 빌드 아티팩트 정리
 */
function cleanBuildArtifacts(environment) {
  const workspaces = getOrderedWorkspaces(environment);
  
  logger.startTask('Cleaning build artifacts');
  
  workspaces.forEach(workspace => {
    const distPath = path.resolve(__dirname, '../../', workspace, 'dist');
    const buildPath = path.resolve(__dirname, '../../', workspace, 'build');
    
    [distPath, buildPath].forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        logger.debug(`Removed ${dir}`);
      }
    });
  });
  
  logger.endTask('Cleaning build artifacts', true);
}

// CLI 실행
if (require.main === module) {
  const environment = process.env.BUILD_ENV || detectEnvironment();
  
  const options = {
    clean: process.argv.includes('--clean'),
    continueOnError: process.argv.includes('--continue-on-error'),
    silent: process.argv.includes('--silent')
  };
  
  buildAll(environment, options)
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      logger.error(`Build failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  buildWorkspace,
  buildPackages,
  buildApps,
  buildAll
};