/**
 * WO-O4O-WINDOWS-PNPM-FILTER-NOOP-GUARD-CLOSURE-V1
 *   — `package.json` script 의 `pnpm --filter` 가 Windows `cmd.exe` 에서
 *     조용히 no-op 되는 것을 저장소 전체 census 로 고정
 *
 * 판정 근거
 * ---------------------------------------------------------------
 *   `cmd.exe` 는 작은따옴표를 문자열 구분자로 취급하지 않는다. 따라서
 *   `pnpm --filter '@o4o/capabilities' run build` 는 selector 가
 *   `'@o4o/capabilities'` (따옴표 포함) 로 전달돼 어떤 패키지도 매칭하지 않고,
 *   pnpm 은 `No projects matched the filters` 를 출력한 뒤 **exit 0** 으로 끝난다.
 *   빌드 성공으로 오판되고 downstream 은 남아 있던 stale `dist` 를 소비한다.
 *
 *   Windows 실측 (pnpm 10.25.0):
 *     --filter '@o4o/capabilities'                → No projects matched / exit 0
 *     --filter "@o4o/capabilities"                → tsc 실행          / exit 0
 *     --filter "@o4o/definitely-not-a-package"    → No projects matched / exit 0
 *     --fail-if-no-match --filter "@o4o/…-not-a-package" → exit 1
 *
 *   실제 결함: `apps/api-server` 의 `build:deps` 가 작은따옴표 필터 19개를 써서
 *   Windows 에서 아무 패키지도 빌드하지 않았다.
 *
 * 고정하는 계약
 * ---------------------------------------------------------------
 *   1. 워크스페이스 `package.json` script 의 `--filter` selector 에 작은따옴표를 쓰지 않는다
 *   2. `--filter` 의 리터럴 selector 는 실재하는 워크스페이스 패키지를 가리킨다
 *      (topology `^...` / 경로 glob / `--filter=...` 형태 모두 포함)
 *   3. api-server `build:deps` 와 루트 `build:api-deps` 는 `--fail-if-no-match` 를 쓴다
 *
 * 적용 범위
 * ---------------------------------------------------------------
 *   `package.json` 의 `scripts` 만 본다. CI YAML · Dockerfile · `*.sh` 는
 *   POSIX 셸에서 실행되므로 작은따옴표가 정상이며 대상이 아니다.
 *
 * 스크립트를 실행하지 않고 raw-source 로 단언한다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

/** pnpm-workspace.yaml 과 동일한 디렉터리 축. glob 라이브러리 없이 1-depth 로 훑는다. */
const WORKSPACE_DIRS = ['apps', 'packages', 'packages/@o4o-apps', 'services'];

/** 워크스페이스에서 분리된 패키지 (pnpm-workspace.yaml 의 `!` 항목) */
const EXCLUDED = new Set(['services/mobile-app']);

type WorkspacePackage = { name: string; relDir: string; scripts: Record<string, string> };

const collectWorkspacePackages = (): WorkspacePackage[] => {
  const found: WorkspacePackage[] = [];
  for (const dir of WORKSPACE_DIRS) {
    const abs = path.join(REPO_ROOT, ...dir.split('/'));
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.endsWith('.backup')) continue;
      const relDir = `${dir}/${entry.name}`;
      if (EXCLUDED.has(relDir)) continue;
      const manifest = path.join(abs, entry.name, 'package.json');
      if (!fs.existsSync(manifest)) continue;
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf-8'));
      if (!pkg.name) continue;
      found.push({ name: pkg.name, relDir, scripts: pkg.scripts ?? {} });
    }
  }
  return found;
};

const workspacePackages = collectWorkspacePackages();
const workspaceNames = new Set(workspacePackages.map((p) => p.name));

const rootScripts: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'),
).scripts ?? {};

/** `--filter <selector>` / `--filter=<selector>` 를 selector 원문 그대로 뽑는다. */
const FILTER_RE = /--filter[=\s]+("[^"]*"|'[^']*'|\S+)/g;

type FilterUse = { manifest: string; script: string; rawSelector: string };

const collectFilterUses = (): FilterUse[] => {
  const uses: FilterUse[] = [];
  const push = (manifest: string, scripts: Record<string, string>) => {
    for (const [script, command] of Object.entries(scripts)) {
      if (typeof command !== 'string') continue;
      for (const match of command.matchAll(FILTER_RE)) {
        uses.push({ manifest, script, rawSelector: match[1] });
      }
    }
  };
  push('package.json', rootScripts);
  for (const pkg of workspacePackages) push(`${pkg.relDir}/package.json`, pkg.scripts);
  return uses;
};

const filterUses = collectFilterUses();

const unquote = (raw: string) =>
  raw.startsWith('"') || raw.startsWith("'") ? raw.slice(1, -1) : raw;

/** 이름 selector 가 아닌 것 — 경로 glob · 상태 selector · 변경분 selector */
const isNonNameSelector = (selector: string) =>
  selector.startsWith('.') ||
  selector.startsWith('/') ||
  selector.startsWith('[') ||
  selector.includes('*') ||
  selector.includes('{');

/** `@o4o/api-server^...` · `...@o4o/ui` 같은 토폴로지 표기에서 패키지 이름만 남긴다. */
const stripTopology = (selector: string) =>
  selector.replace(/^\.{3}/, '').replace(/\^?\.{3}$/, '').replace(/\^$/, '');

describe('WO-O4O-WINDOWS-PNPM-FILTER-NOOP-GUARD-CLOSURE-V1 — pnpm --filter Windows 안전성', () => {
  it('0. census 가 워크스페이스 패키지와 --filter 사용처를 실제로 수집한다', () => {
    // 하드코딩 문자열 1개를 검사하는 가드가 되지 않도록 모집단 자체를 먼저 단언한다.
    expect(workspacePackages.length).toBeGreaterThan(50);
    expect(workspaceNames.has('@o4o/api-server')).toBe(true);
    expect(filterUses.length).toBeGreaterThan(10);
  });

  it('1. package.json script 의 --filter selector 에 작은따옴표를 쓰지 않는다', () => {
    const offenders = filterUses
      .filter((use) => use.rawSelector.startsWith("'"))
      .map((use) => `${use.manifest} → scripts.${use.script} → --filter ${use.rawSelector}`);

    // cmd.exe 는 작은따옴표를 리터럴로 넘겨 0개 매칭 + exit 0 을 만든다.
    expect(offenders).toEqual([]);
  });

  it('2. --filter 의 이름 selector 가 실재하는 워크스페이스 패키지를 가리킨다', () => {
    const missing = filterUses
      .map((use) => ({ use, selector: unquote(use.rawSelector) }))
      .filter(({ selector }) => !isNonNameSelector(selector))
      .map(({ use, selector }) => ({ use, name: stripTopology(selector) }))
      .filter(({ name }) => name.length > 0 && !workspaceNames.has(name))
      .map(({ use, name }) => `${use.manifest} → scripts.${use.script} → ${name}`);

    // 오기 selector 는 0개 매칭 후 exit 0 이라 빌드가 통과한 것처럼 보인다.
    expect(missing).toEqual([]);
  });

  it('3. 필수 빌드 체인의 --filter 는 --fail-if-no-match 로 무매칭을 실패 처리한다', () => {
    const required: Array<[string, string]> = [
      ['package.json → build:api-deps', rootScripts['build:api-deps']],
      [
        'apps/api-server/package.json → build:deps',
        workspacePackages.find((p) => p.name === '@o4o/api-server')?.scripts['build:deps'] ?? '',
      ],
    ];

    for (const [label, command] of required) {
      expect(`${label}: ${command}`).toContain('--filter');
      const steps = command.split('&&').filter((step) => step.includes('--filter'));
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) {
        expect(`${label}: ${step.trim()}`).toContain('--fail-if-no-match');
      }
    }
  });
});
