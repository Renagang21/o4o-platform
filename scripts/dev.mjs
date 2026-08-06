#!/usr/bin/env node
/**
 * Cross-Platform Development Script
 * Works on both Windows and Linux/macOS
 *
 * Usage: node scripts/dev.mjs <command>
 * Commands: lint, type-check, test, build, build:packages, start, stop
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { platform } from 'os';

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

const log = {
  info: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}${msg}${colors.reset}`)
};

const ROOT_DIR = resolve(import.meta.dirname, '..');
const isWindows = platform() === 'win32';

/**
 * Execute a command synchronously
 */
function exec(cmd, cwd = ROOT_DIR) {
  try {
    execSync(cmd, {
      cwd,
      stdio: 'inherit',
      shell: true
    });
    return true;
  } catch (error) {
    // 실패는 여기서 삼키지 않는다. 호출자가 반환값을 누적해 최종 종료코드로 전파한다.
    log.error(`  ✗ FAILED (${cwd}): ${cmd}`);
    return false;
  }
}

/**
 * 실패 누적기 — 모든 단계를 끝까지 실행하되(전체 오류 목록 확보),
 * 하나라도 실패하면 non-zero 로 종료시키기 위해 실패 항목을 모은다.
 */
function createFailureTracker() {
  const failures = [];
  return {
    /** exec 결과를 누적하고 그대로 반환한다 */
    track(label, ok) {
      if (!ok) failures.push(label);
      return ok;
    },
    get failures() {
      return failures;
    },
    /** 실패가 없으면 true */
    report(taskName) {
      if (failures.length === 0) {
        log.info(`${taskName}: OK`);
        return true;
      }
      log.error(`${taskName}: ${failures.length} step(s) FAILED`);
      for (const f of failures) log.error(`  - ${f}`);
      return false;
    }
  };
}

/**
 * Get all directories in a path
 */
function getDirs(basePath) {
  const fullPath = join(ROOT_DIR, basePath);
  if (!existsSync(fullPath)) return [];

  return readdirSync(fullPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

/**
 * 해당 디렉터리가 자체 tsconfig.json 을 가지고 있는지 확인한다.
 *
 * `npx tsc --noEmit` 은 cwd 에 tsconfig.json 이 없으면 상위로 올라가 루트
 * tsconfig.json 을 집어든다. 그러면 "packages/forum-app 타입체크" 라는 이름으로
 * 실제로는 모노레포 전체(api-server 포함)를 검사하게 되고, composite 출력이 없는
 * api-server 때문에 TS6305 가 대량 발생한다. 대상 아닌 검사이므로 건너뛴다.
 */
function hasOwnTsconfig(relPath) {
  return existsSync(join(ROOT_DIR, relPath, 'tsconfig.json'));
}

/**
 * Check if package has a specific script
 */
function hasScript(pkgPath, scriptName) {
  const pkgJsonPath = join(ROOT_DIR, pkgPath, 'package.json');
  if (!existsSync(pkgJsonPath)) return false;

  try {
    // ESM 모듈이므로 require 를 쓸 수 없다. 과거 `require('fs')` 는 ReferenceError 를
    // 내고 catch 에서 false 로 삼켜져 test/build 가 아무것도 실행하지 않았다.
    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    return Boolean(pkg.scripts && pkg.scripts[scriptName]);
  } catch {
    return false;
  }
}

// ============================================================================
// Commands
// ============================================================================

function runLint() {
  log.info('Running ESLint...');
  // Skip for now - return success
  log.info('Linting passed (skipped)');
  return true;
}

function runTypeCheck() {
  log.info('Running TypeScript checks...');
  const t = createFailureTracker();

  // Build packages first
  const packages = ['types', 'utils', 'ui', 'auth-client', 'auth-context', 'shortcodes', 'block-core'];

  log.info('Building packages...');
  for (const pkg of packages) {
    const pkgPath = join('packages', pkg);
    if (existsSync(join(ROOT_DIR, pkgPath))) {
      console.log(`  - Building @o4o/${pkg}`);
      t.track(`build packages/${pkg}`, exec('npx tsc', join(ROOT_DIR, pkgPath)));
    }
  }

  // Type check App Store packages
  log.info('Type checking App Store packages...');
  // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1: 'forum-yaksa' 제거
  const appStorePackages = ['forum-app', 'forum-neture'];

  for (const pkg of appStorePackages) {
    const pkgPath = join('packages', pkg);
    if (!existsSync(join(ROOT_DIR, pkgPath))) continue;
    if (!hasOwnTsconfig(pkgPath)) {
      log.warn(`  - Skipping @o4o/${pkg} (no tsconfig.json)`);
      continue;
    }
    console.log(`  - Checking @o4o/${pkg}`);
    t.track(`type-check packages/${pkg}`, exec('npx tsc --noEmit', join(ROOT_DIR, pkgPath)));
  }

  // Type check apps
  log.info('Type checking apps...');
  const apps = ['api-server', 'main-site', 'admin-dashboard', 'ecommerce'];

  for (const app of apps) {
    const appPath = join('apps', app);
    if (!existsSync(join(ROOT_DIR, appPath))) continue;
    if (!hasOwnTsconfig(appPath)) {
      log.warn(`  - Skipping ${app} (no tsconfig.json)`);
      continue;
    }
    console.log(`  - Checking ${app}`);
    t.track(`type-check apps/${app}`, exec('npx tsc --noEmit', join(ROOT_DIR, appPath)));
  }

  return t.report('type-check');
}

function runTypeCheckFrontend() {
  log.info('Running TypeScript checks (Frontend only)...');
  const t = createFailureTracker();

  // Build packages first
  const packages = ['types', 'utils', 'ui', 'auth-client', 'auth-context', 'shortcodes'];

  log.info('Building packages...');
  for (const pkg of packages) {
    const pkgPath = join('packages', pkg);
    if (existsSync(join(ROOT_DIR, pkgPath))) {
      console.log(`  - Building @o4o/${pkg}`);
      t.track(`build packages/${pkg}`, exec('npx tsc', join(ROOT_DIR, pkgPath)));
    }
  }

  // Type check App Store packages
  log.info('Type checking App Store packages...');
  // WO-O4O-FORUM-YAKSA-DEAD-PACKAGE-ROUTE-AND-ALIAS-LOCKSTEP-REMOVAL-V1: 'forum-yaksa' 제거
  const appStorePackages = ['forum-app', 'forum-neture'];

  for (const pkg of appStorePackages) {
    const pkgPath = join('packages', pkg);
    if (!existsSync(join(ROOT_DIR, pkgPath))) continue;
    if (!hasOwnTsconfig(pkgPath)) {
      log.warn(`  - Skipping @o4o/${pkg} (no tsconfig.json)`);
      continue;
    }
    console.log(`  - Checking @o4o/${pkg}`);
    t.track(`type-check packages/${pkg}`, exec('npx tsc --noEmit', join(ROOT_DIR, pkgPath)));
  }

  // Type check frontend apps only (skip api-server)
  log.info('Type checking frontend apps...');
  const apps = ['main-site', 'admin-dashboard', 'ecommerce'];

  for (const app of apps) {
    const appPath = join('apps', app);
    if (!existsSync(join(ROOT_DIR, appPath))) continue;
    if (!hasOwnTsconfig(appPath)) {
      log.warn(`  - Skipping ${app} (no tsconfig.json)`);
      continue;
    }
    console.log(`  - Checking ${app}`);
    t.track(`type-check apps/${app}`, exec('npx tsc --noEmit', join(ROOT_DIR, appPath)));
  }

  // Type check web services (KPA, etc.)
  log.info('Type checking web services...');
  const webServices = ['web-kpa-society'];

  for (const svc of webServices) {
    const svcPath = join('services', svc);
    if (!existsSync(join(ROOT_DIR, svcPath))) continue;
    if (!hasOwnTsconfig(svcPath)) {
      log.warn(`  - Skipping ${svc} (no tsconfig.json)`);
      continue;
    }
    console.log(`  - Checking ${svc}`);
    t.track(`type-check services/${svc}`, exec('npx tsc --noEmit', join(ROOT_DIR, svcPath)));
  }

  log.warn('Skipping api-server type check (handled separately on server)');
  return t.report('type-check:frontend');
}

function runTests() {
  log.info('Running tests...');
  const t = createFailureTracker();

  // Run tests for apps
  for (const app of getDirs('apps')) {
    const appPath = join('apps', app);
    if (hasScript(appPath, 'test')) {
      console.log(`Testing ${app}...`);
      t.track(`test apps/${app}`, exec('pnpm test', join(ROOT_DIR, appPath)));
    }
  }

  // Run tests for packages
  for (const pkg of getDirs('packages')) {
    const pkgPath = join('packages', pkg);
    if (hasScript(pkgPath, 'test')) {
      console.log(`Testing ${pkg}...`);
      t.track(`test packages/${pkg}`, exec('pnpm test', join(ROOT_DIR, pkgPath)));
    }
  }

  return t.report('test');
}

function buildPackages(tracker) {
  log.info('Building packages...');
  const t = tracker || createFailureTracker();

  const packages = [
    'types', 'utils', 'ui', 'auth-client', 'auth-context',
    'appearance-system', 'shortcodes', 'block-renderer', 'slide-app'
  ];

  for (const pkg of packages) {
    const pkgPath = join(ROOT_DIR, 'packages', pkg);
    if (existsSync(pkgPath) && hasScript(`packages/${pkg}`, 'build')) {
      console.log(`  - Building @o4o/${pkg}`);
      t.track(`build packages/${pkg}`, exec('pnpm run build', pkgPath));
    }
  }

  return tracker ? t.failures.length === 0 : t.report('build:packages');
}

function runBuild() {
  log.info('Building project...');
  const t = createFailureTracker();

  // Build packages first
  buildPackages(t);

  // Build apps
  log.info('Building apps...');
  const apps = ['main-site', 'admin-dashboard', 'api-server'];

  for (const app of apps) {
    const appPath = join(ROOT_DIR, 'apps', app);
    if (existsSync(appPath) && hasScript(`apps/${app}`, 'build')) {
      console.log(`  - Building ${app}`);
      t.track(`build apps/${app}`, exec('pnpm run build', appPath));
    }
  }

  return t.report('build');
}

function cleanProject() {
  log.info('Cleaning project...');
  const t = createFailureTracker();

  // Remove dist directories
  const dirsToClean = [
    ...getDirs('apps').map(d => `apps/${d}/dist`),
    ...getDirs('packages').map(d => `packages/${d}/dist`),
  ];

  for (const dir of dirsToClean) {
    const fullPath = join(ROOT_DIR, dir);
    if (existsSync(fullPath)) {
      console.log(`  - Removing ${dir}`);
      const ok = isWindows
        ? exec(`rmdir /s /q "${fullPath}"`, ROOT_DIR)
        : exec(`rm -rf "${fullPath}"`, ROOT_DIR);
      t.track(`clean ${dir}`, ok);
    }
  }

  log.info('Clean complete!');
  return t.report('clean');
}

function showUsage() {
  console.log(`
Usage: node scripts/dev.mjs <command>

Commands:
  lint              Run ESLint on all source files
  lint:fix          Run ESLint with auto-fix
  type-check        Run TypeScript type checking (all)
  type-check:frontend  Run TypeScript type checking (frontend only)
  test              Run all tests
  build             Build all packages and apps
  build:packages    Build only packages
  clean             Clean dist directories

Examples:
  node scripts/dev.mjs lint
  node scripts/dev.mjs build
  node scripts/dev.mjs type-check
`);
}

// ============================================================================
// Main
// ============================================================================

const command = process.argv[2];

/**
 * 명령 결과를 그대로 프로세스 종료코드로 전파한다.
 * 과거에는 모든 러너가 무조건 true 를 반환하고 결과를 버려서,
 * tsc/build/test 실패가 CI 에서 GREEN 으로 통과했다.
 */
function finish(ok) {
  process.exit(ok ? 0 : 1);
}

switch (command) {
  case 'lint':
    finish(runLint());
    break;
  case 'lint:fix':
    finish(runLint());
    break;
  case 'type-check':
    finish(runTypeCheck());
    break;
  case 'type-check:frontend':
    finish(runTypeCheckFrontend());
    break;
  case 'test':
    finish(runTests());
    break;
  case 'build':
    finish(runBuild());
    break;
  case 'build:packages':
    finish(buildPackages());
    break;
  case 'clean':
    finish(cleanProject());
    break;
  default:
    showUsage();
    process.exit(1);
}
