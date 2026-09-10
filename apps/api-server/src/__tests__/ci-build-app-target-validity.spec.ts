/**
 * WO-O4O-STOREFRONT-DEAD-CI-BRANCH-AUDIT-AND-CLOSURE-V1
 *   — `scripts/ci-build-app.sh` 의 build target 이 전부 실재하는지 census 로 고정
 *
 * 판정 근거
 * ---------------------------------------------------------------
 *   `ci-build-app.sh` 에 `"storefront")` case 가 남아 있었고 존재하지 않는
 *   `@o4o/storefront` 를 빌드 대상으로 지정하고 있었다. 감사 결과:
 *
 *     - workspace package `@o4o/storefront` 없음 (전 이력에서 존재한 적 없음)
 *     - `pnpm-lock.yaml` importer · dependency 0건
 *     - `ci-pipeline.yml` build matrix 는 `[admin-dashboard]` 뿐
 *     - `workflow_dispatch` inputs 없음 / `workflow_call` · `repository_dispatch` 없음
 *       → workflow 입력으로 도달 불가
 *     - 배포 · 로컬 script 호출자 0건
 *     - canonical 문서에 복구 · 대체 계획 없음
 *
 *   보존 근거는 "CI 가 호출하지 않을 뿐 **수동 호출 경로로는 유효하다**" 즉 대상
 *   디렉터리·패키지가 실재하는 경우에 한한다. `@o4o/storefront` 는 수동으로도
 *   실행될 수 없어 그 근거가 적용되지 않으므로 case 를 제거했다.
 *
 *   (2026-09-10 · WO-O4O-MAIN-SITE-FULL-SOURCE-DELETION-V1: 같은 기준으로 은퇴
 *   앱 case 도 제거되었다. 본 spec 은 특정 앱이 아니라 script 의 모든 build
 *   target 이 실재하는지를 일반 계약으로 검증하므로 그대로 유지한다.)
 *
 * 고정하는 계약
 * ---------------------------------------------------------------
 *   1. `storefront` case 가 다시 들어오지 않는다
 *   2. script 의 모든 `pnpm --filter=<name>` 대상이 실재하는 워크스페이스 패키지다
 *   3. script 의 모든 `cd apps/<name>` 대상 디렉터리가 실재한다
 *   4. script 가 호출하는 루트 `pnpm run <script>` 가 루트 package.json 에 존재한다
 *   5. 미지원 app 입력은 `exit 1` 로 실패한다 (조용한 성공 금지)
 *
 * 스크립트를 실행하지 않고 raw-source 로 단언한다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SCRIPT_REL = 'scripts/ci-build-app.sh';
const script = fs.readFileSync(path.join(REPO_ROOT, ...SCRIPT_REL.split('/')), 'utf-8');

/** pnpm-workspace.yaml 과 같은 디렉터리 축 (1-depth) */
const WORKSPACE_DIRS = ['apps', 'packages', 'packages/@o4o-apps', 'services'];
const EXCLUDED = new Set(['services/mobile-app']);

const collectWorkspaceNames = (): Set<string> => {
  const names = new Set<string>();
  for (const dir of WORKSPACE_DIRS) {
    const abs = path.join(REPO_ROOT, ...dir.split('/'));
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.endsWith('.backup')) continue;
      if (EXCLUDED.has(`${dir}/${entry.name}`)) continue;
      const manifest = path.join(abs, entry.name, 'package.json');
      if (!fs.existsSync(manifest)) continue;
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf-8'));
      if (pkg.name) names.add(pkg.name);
    }
  }
  return names;
};

const workspaceNames = collectWorkspaceNames();

const rootScripts: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'),
).scripts ?? {};

/** 주석(`#`)을 뺀 실행 라인만 본다 — 주석에 적힌 이름을 오탐하지 않는다. */
const executableLines = script
  .split('\n')
  .map((line) => line.replace(/(^|\s)#.*$/, ''))
  .filter((line) => line.trim().length > 0);
const executable = executableLines.join('\n');

const matchAll = (re: RegExp) => [...executable.matchAll(re)].map((m) => m[1]);

describe('WO-O4O-STOREFRONT-DEAD-CI-BRANCH-AUDIT-AND-CLOSURE-V1 — ci-build-app.sh build target 유효성', () => {
  it('0. census 가 워크스페이스와 스크립트를 실제로 읽는다', () => {
    expect(workspaceNames.size).toBeGreaterThan(50);
    expect(executable).toContain('build_app()');
  });

  it('1. storefront case 와 @o4o/storefront 참조가 다시 들어오지 않는다', () => {
    expect(executable).not.toContain('@o4o/storefront');
    expect(executable).not.toMatch(/"storefront"\s*\)/);
  });

  it('2. --filter 대상이 전부 실재하는 워크스페이스 패키지다', () => {
    const targets = matchAll(/--filter[=\s]+"?([^"\s]+)"?/g);
    expect(targets.length).toBeGreaterThan(0);
    const missing = targets.filter((name) => !workspaceNames.has(name));
    expect(missing).toEqual([]);
  });

  it('3. cd 로 진입하는 app 디렉터리가 전부 실재한다', () => {
    const dirs = matchAll(/cd\s+(apps\/[A-Za-z0-9._-]+)/g);
    expect(dirs.length).toBeGreaterThan(0);
    const missing = dirs.filter(
      (rel) => !fs.existsSync(path.join(REPO_ROOT, ...rel.split('/'), 'package.json')),
    );
    expect(missing).toEqual([]);
  });

  it('4. 호출하는 루트 pnpm run <script> 가 루트 package.json 에 존재한다', () => {
    const names = matchAll(/pnpm run ([A-Za-z0-9:_-]+)/g);
    expect(names.length).toBeGreaterThan(0);
    // `cd apps/<x>` 이후의 `pnpm run build` 는 해당 app 의 script 이므로 제외한다.
    const missing = [...new Set(names)]
      .filter((name) => name !== 'build')
      .filter((name) => !(name in rootScripts));
    expect(missing).toEqual([]);
  });

  it('5. 미지원 app 입력은 exit 1 로 실패한다', () => {
    expect(executable).toMatch(/Unknown app/);
    expect(executable).toMatch(/Unknown app[\s\S]{0,200}exit 1/);
  });

  it('6. usage 안내가 실제 지원 case 만 나열한다', () => {
    const usage = executable.match(/Valid options: ([^"]+)"/)?.[1] ?? '';
    expect(usage.length).toBeGreaterThan(0);
    expect(usage).not.toContain('storefront');
  });
});
