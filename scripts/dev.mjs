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
 * 워크스페이스 자동 탐색 (WO-O4O-VERIFICATION-COMMAND-COVERAGE-RESTORATION-V1)
 *
 * 과거에는 대상 목록이 하드코딩되어 있어 services/ 전체와 대부분의 packages 가
 * 검증에서 빠졌고, 존재하지 않는 dead entry('apps/ecommerce')가 남아 있었다.
 * package.json 이 있는 디렉터리만 워크스페이스로 인정한다.
 */
function discoverWorkspaces(basePath) {
  return getDirs(basePath)
    .filter(name => !name.endsWith('.backup'))
    .map(name => join(basePath, name).replace(/\\/g, '/'))
    .filter(rel => existsSync(join(ROOT_DIR, rel, 'package.json')));
}

/** apps + services + packages 전체 */
function allWorkspaces() {
  return [
    ...discoverWorkspaces('apps'),
    ...discoverWorkspaces('services'),
    ...discoverWorkspaces('packages'),
  ];
}

/** 워크스페이스가 선언한 type-check 계열 script 이름을 찾는다 */
function typeCheckScriptName(relPath) {
  for (const candidate of ['type-check', 'typecheck']) {
    if (hasScript(relPath, candidate)) return candidate;
  }
  return null;
}

/**
 * 워크스페이스 1개 타입체크.
 * 자체 script 가 있으면 그것을 쓰고, 없으면 tsconfig 기준 `npx tsc --noEmit`.
 */
function typeCheckWorkspace(tracker, relPath) {
  const script = typeCheckScriptName(relPath);
  if (script) {
    console.log(`  - ${relPath} (pnpm run ${script})`);
    return tracker.track(`type-check ${relPath}`, exec(`pnpm run ${script}`, join(ROOT_DIR, relPath)));
  }
  if (!hasOwnTsconfig(relPath)) {
    log.warn(`  - Skipping ${relPath} (no type-check script, no tsconfig.json)`);
    return true;
  }
  console.log(`  - ${relPath} (npx tsc --noEmit)`);
  return tracker.track(`type-check ${relPath}`, exec('npx tsc --noEmit', join(ROOT_DIR, relPath)));
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

/**
 * 실제 ESLint 실행 (WO-O4O-VERIFICATION-COMMAND-COVERAGE-RESTORATION-V1)
 *
 * 과거 구현은 아무 검사도 하지 않고 "Linting passed (skipped)" 를 반환했다.
 * 루트 eslint.config.js 로 저장소 전체를 1회 검사한다 (워크스페이스 전부 포함).
 *
 * 워크스페이스별 자체 eslint 설정을 따로 실행하지는 않는다. 루트 설정이 모든
 * 워크스페이스를 동일 기준으로 덮으며, 개별 설정은 해당 워크스페이스의 lint
 * script 로 여전히 실행할 수 있다.
 */
function runLint() {
  log.info('Running ESLint...');
  const t = createFailureTracker();

  console.log('  - repository (root eslint.config.js)');
  t.track('lint', exec('npx eslint .', ROOT_DIR));

  return t.report('lint');
}

/**
 * WO-O4O-CONTENT-EDITOR-LLM-ASSIST-PANEL-EXPORT-RECOVERY-V1
 *
 * 소비처가 **소스가 아니라 dist(.gitignore 대상)의 .d.ts 로 타입을 해석**하는 패키지를
 * type-check 직전에 빌드한다. dist 가 없거나 stale 하면 소스에 export 가 멀쩡히 있어도
 * 소비처에서 TS2459(declares locally, but it is not exported) + 그 여파의 TS7006(implicit any)
 * 가 발생한다. 실제 사례: `@o4o/content-editor` 의 `LlmAssistPanel` 을
 * `@o4o/tablet-screen-set-editor` 가 import → web-kpa-society · web-neture type-check 실패.
 *
 * - 참조 경로: web-kpa-society · web-k-cosmetics · web-pharmacy-hub 는 tsconfig paths 로,
 *   web-neture · tablet-screen-set-editor 는 package.json "types" 로 dist 를 가리킨다.
 * - 위 `packages` 목록과 달리 `npx tsc` 로 빌드할 수 없다(tsup 기반)므로 자체 build script 를 쓴다.
 * - 루트 `pnpm run build:packages` 체인에는 이미 포함되어 CI 는 영향을 받지 않는다.
 *   이 단계는 clean 상태에서 로컬 type-check 가 재현 가능하도록 보완하는 것이다.
 */
function buildDistTypedPackages(t) {
  for (const pkg of ['content-editor']) {
    const pkgPath = join(ROOT_DIR, 'packages', pkg);
    if (existsSync(pkgPath) && hasScript(`packages/${pkg}`, 'build')) {
      console.log(`  - Building @o4o/${pkg}`);
      t.track(`build packages/${pkg}`, exec('pnpm run build', pkgPath));
    }
  }
}

function runTypeCheck() {
  log.info('Running TypeScript checks...');
  const t = createFailureTracker();

  // Build packages first
  const packages = ['types', 'utils', 'ui', 'auth-client', 'auth-context', 'shortcodes', 'block-core'];

  log.info('Building packages...');
  buildDistTypedPackages(t);
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

  // Type check apps + services
  // 과거에는 apps 4개(그중 'ecommerce' 는 실재하지 않는 dead entry)만 검사하고
  // services/ 전체가 빠져 있었다. 이제 자동 탐색한 전 워크스페이스를 검사한다.
  log.info('Type checking apps...');
  for (const rel of discoverWorkspaces('apps')) {
    typeCheckWorkspace(t, rel);
  }

  log.info('Type checking services...');
  for (const rel of discoverWorkspaces('services')) {
    typeCheckWorkspace(t, rel);
  }

  return t.report('type-check');
}

function runTypeCheckFrontend() {
  log.info('Running TypeScript checks (Frontend only)...');
  const t = createFailureTracker();

  // Build packages first
  const packages = ['types', 'utils', 'ui', 'auth-client', 'auth-context', 'shortcodes'];

  log.info('Building packages...');
  buildDistTypedPackages(t);
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
  // 'ecommerce' dead entry 제거, 자동 탐색으로 전환.
  log.info('Type checking frontend apps...');
  for (const rel of discoverWorkspaces('apps')) {
    if (rel === 'apps/api-server') continue;
    typeCheckWorkspace(t, rel);
  }

  // Type check web services
  // 과거에는 web-kpa-society 1개만 검사해 나머지 운영 서비스가 전부 빠져 있었다.
  log.info('Type checking web services...');
  for (const rel of discoverWorkspaces('services')) {
    typeCheckWorkspace(t, rel);
  }

  log.warn('Skipping api-server type check (run `pnpm run type-check` for it)');
  return t.report('type-check:frontend');
}

function runTests() {
  log.info('Running tests...');
  const t = createFailureTracker();

  // apps / services / packages 중 test script 를 선언한 워크스페이스만 실행한다.
  // 과거에는 services/ 가 통째로 빠져 있었다. test script 가 없는 워크스페이스에
  // 무조건 성공하는 명령을 만들어 넣지는 않는다 (없으면 없는 대로 건너뛴다).
  const targets = allWorkspaces().filter(rel => hasScript(rel, 'test'));

  if (targets.length === 0) {
    log.warn('No workspace declares a "test" script.');
  }

  for (const rel of targets) {
    console.log(`Testing ${rel}...`);
    t.track(`test ${rel}`, exec('pnpm test', join(ROOT_DIR, rel)));
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
