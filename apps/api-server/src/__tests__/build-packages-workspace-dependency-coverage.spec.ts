/**
 * WO-O4O-PLATFORM-CORE-BUILD-PACKAGES-REPRODUCIBILITY-V1
 *   — 루트 `build:packages` 가 api-server 워크스페이스 의존을 다시 누락하지 않도록 고정
 *
 * 판정 근거
 * ---------------------------------------------------------------
 *   루트 `build:packages` 는 프론트엔드 패키지만 하드코딩으로 나열하고 있어
 *   `@o4o/platform-core` 를 포함한 api-server 워크스페이스 의존 17개가 빠져 있었다.
 *   clean 체크아웃에서 `pnpm install --frozen-lockfile && pnpm run build:packages`
 *   를 실행해도 `packages/platform-core/dist` 가 생성되지 않아 api-server type-check 가
 *   TS2307 로 실패했고, 기존 `dist` 가 남아 있는 환경에서만 통과하고 있었다.
 *   (배포 경로는 정상 — `deploy-api.yml` 이 별도 목록으로 빌드했다.)
 *
 *   하드코딩 목록은 drift 하므로 CI(`ci-pipeline.yml`)가 이미 쓰는
 *   pnpm 의존성 토폴로지 필터를 루트 `build:api-deps` 로 도입해 해결했다.
 *
 * 고정하는 계약
 * ---------------------------------------------------------------
 *   1. 루트 `build:api-deps` 가 존재하고 `@o4o/api-server^...` 토폴로지 필터를 쓴다
 *   2. `build:packages` 체인이 `build:api-deps` 를 포함한다
 *   3. api-server 의 워크스페이스 의존이 `build:packages` 체인으로 전부 커버된다
 *      (`@o4o/platform-core` 포함)
 *   4. 필터 인용부호는 Windows `cmd.exe` 에서도 동작하는 형태여야 한다
 *      (작은따옴표는 cmd 에서 리터럴로 처리돼 "No projects matched the filters" 가 된다)
 *
 * 스크립트를 실행하지 않고 raw-source 로 단언한다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const readJson = (rel: string) =>
  JSON.parse(fs.readFileSync(path.join(REPO_ROOT, ...rel.split('/')), 'utf-8'));

const rootScripts: Record<string, string> = readJson('package.json').scripts;

/** `build:packages` 가 호출하는 `pnpm run <name>` 을 재귀 전개해 실제 명령 문자열을 모은다. */
const expandChain = (entry: string, seen = new Set<string>()): string[] => {
  if (seen.has(entry)) return [];
  seen.add(entry);
  const script = rootScripts[entry];
  if (!script) return [];
  const out: string[] = [script];
  for (const step of script.split('&&').map((s) => s.trim())) {
    const m = /^pnpm run (\S+)$/.exec(step);
    if (m) out.push(...expandChain(m[1], seen));
  }
  return out;
};

const BUILD_PACKAGES_COMMANDS = expandChain('build:packages');
const TOPOLOGY_TOKEN = '@o4o/api-server^...';

/** api-server 가 workspace 프로토콜로 선언한 의존 패키지 이름. */
const apiServerWorkspaceDeps = (): string[] => {
  const pkg = readJson('apps/api-server/package.json');
  const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  return Object.entries(all)
    .filter(([, spec]) => typeof spec === 'string' && spec.startsWith('workspace:'))
    .map(([name]) => name)
    .sort();
};

describe('WO-O4O-PLATFORM-CORE-BUILD-PACKAGES-REPRODUCIBILITY-V1 — build:packages 워크스페이스 의존 커버리지', () => {
  it('1. 루트에 build:api-deps 가 있고 api-server 토폴로지 필터를 쓴다', () => {
    expect(typeof rootScripts['build:api-deps']).toBe('string');
    expect(rootScripts['build:api-deps']).toContain(TOPOLOGY_TOKEN);
  });

  it('2. build:packages 체인이 build:api-deps 를 포함한다', () => {
    expect(rootScripts['build:packages'].split('&&').map((s) => s.trim())).toContain(
      'pnpm run build:api-deps',
    );
  });

  it('3. api-server 워크스페이스 의존이 build:packages 체인으로 커버된다', () => {
    const covered = BUILD_PACKAGES_COMMANDS.join(' ; ');
    const uncovered = apiServerWorkspaceDeps().filter(
      (dep) => !covered.includes(TOPOLOGY_TOKEN) && !covered.includes(dep),
    );
    expect(uncovered).toEqual([]);
  });

  it('3-a. @o4o/platform-core 가 api-server 의존으로 선언돼 있다 (커버리지 대상 회귀 방지)', () => {
    expect(apiServerWorkspaceDeps()).toContain('@o4o/platform-core');
  });

  it('4. build:api-deps 필터가 cmd.exe 에서 깨지는 작은따옴표를 쓰지 않는다', () => {
    expect(rootScripts['build:api-deps']).not.toContain(`'${TOPOLOGY_TOKEN}'`);
    expect(rootScripts['build:api-deps']).toContain(`"${TOPOLOGY_TOKEN}"`);
  });
});
