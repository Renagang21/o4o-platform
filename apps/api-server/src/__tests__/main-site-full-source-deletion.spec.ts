/**
 * WO-O4O-MAIN-SITE-FULL-SOURCE-DELETION-V1
 *   — 은퇴 앱 `apps/main-site` (`@o4o/main-site-nextgen`) 의 **완전 삭제 계약**
 *
 * 배경
 * ---------------------------------------------------------------
 *   선행 조사 IR-O4O-MAIN-SITE-RETIRED-SOURCE-AND-WORDPRESS-LEGACY-FULL-CENSUS-V1
 *   에서 다음이 실측으로 확정되었다.
 *
 *     MAIN_SITE_RUNTIME         = RETIRED   (Cloud Run service 0 / deploy workflow 0)
 *     MAIN_SITE_DEPLOYMENT      = ZERO
 *     MAIN_SITE_EXTERNAL_IMPORT = ZERO      (export barrel 없음 · private 패키지)
 *     MAIN_SITE_UNIQUE_FUNCTION = ZERO
 *
 *   따라서 소스·workspace·CI·문서를 한 작업에서 함께 닫고, 이 spec 이 그 결과를
 *   **단일 canonical 부재 계약**으로 고정한다.
 *
 * 이 spec 이 대체한 것
 * ---------------------------------------------------------------
 *   아래 5개 spec 은 "삭제된 앱 내부의 부분 은퇴 축" 을 지키던 것이라 앱 자체가
 *   사라진 시점에 존재 이유가 사라졌다. 부재 단언을 여러 spec 에 흩지 않기 위해
 *   전부 삭제하고 본 spec 하나로 흡수했다.
 *
 *     - main-site-ci-build-contract.spec.ts
 *     - main-site-residual-dependency-cleanup.spec.ts
 *     - main-site-residual-orphan-axis-retirement.spec.ts
 *     - main-site-nextgen-viewrenderer-retirement.spec.ts
 *     - main-site-appstore-parallel-axis-retirement.spec.ts
 *
 *   `ci-build-app-target-validity.spec.ts` 는 특정 앱이 아니라 build target 실재성을
 *   검증하는 일반 계약이므로 그대로 유지한다 (본 spec 과 중복되지 않는다).
 *
 * 고정하는 계약 (WO §4-D)
 * ---------------------------------------------------------------
 *   1. `apps/main-site` 디렉터리가 존재하지 않는다
 *   2. workspace package `@o4o/main-site-nextgen` 이 존재하지 않는다
 *      (root package.json · pnpm-lock.yaml importer · tsconfig project reference)
 *   3. CI build · deploy target 에 main-site 가 없다
 *   4. 저장소의 살아 있는 소스가 main-site 를 외부 참조하지 않는다
 *
 * 재삭제 금지 원칙: 이 spec 을 통과시키기 위해 삭제된 디렉터리를 fixture 로
 * 다시 만들지 않는다. raw-source 로만 단언하며 DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const read = (rel: string): string =>
  fs.readFileSync(path.join(REPO_ROOT, ...rel.split('/')), 'utf-8');

const walk = (dir: string): string[] => {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
};

/** 삭제 근거를 적은 주석은 남겨 두므로 주석 줄을 제거한 "실제 코드" 만 스캔한다. */
const codeOf = (file: string): string =>
  fs
    .readFileSync(file, 'utf-8')
    .split(/\r?\n/)
    .filter((line) => !/^\s*(\/\/|\/\*|\*|#)/.test(line))
    .join('\n');

describe('WO-O4O-MAIN-SITE-FULL-SOURCE-DELETION-V1', () => {
  describe('1. apps/main-site 디렉터리 = ABSENT', () => {
    it('apps/main-site 가 존재하지 않는다', () => {
      expect(fs.existsSync(path.join(REPO_ROOT, 'apps', 'main-site'))).toBe(false);
    });

    it('apps 하위에 main-site 로 시작하는 디렉터리가 없다 (사본 · archive 이동 금지)', () => {
      const appsDir = path.join(REPO_ROOT, 'apps');
      const dirs = fs
        .readdirSync(appsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
      expect(dirs.filter((d) => /main-site/.test(d))).toEqual([]);
    });

    it('스캔 기준 경로가 맞다 (REPO_ROOT 가 어긋나면 이 단언이 먼저 깨진다)', () => {
      expect(fs.existsSync(path.join(REPO_ROOT, 'pnpm-workspace.yaml'))).toBe(true);
      expect(fs.existsSync(path.join(REPO_ROOT, 'apps', 'admin-dashboard'))).toBe(true);
    });
  });

  describe('2. workspace package @o4o/main-site-nextgen = ABSENT', () => {
    it('pnpm-lock.yaml 에 apps/main-site importer 가 없다', () => {
      expect(read('pnpm-lock.yaml')).not.toContain('\n  apps/main-site:\n');
    });

    it('root package.json 에 main-site script · 의존이 없다', () => {
      expect(read('package.json')).not.toMatch(/main-site/);
    });

    it('tsconfig.base.json 의 project reference 에 main-site 가 없다', () => {
      const base = JSON.parse(read('tsconfig.base.json')) as {
        references?: Array<{ path: string }>;
      };
      const paths = (base.references ?? []).map((r) => r.path);
      expect(paths.filter((p) => /main-site/.test(p))).toEqual([]);
    });

    it('저장소의 tsconfig 계약 파일에 main-site 경로가 없다', () => {
      const roots = ['apps', 'packages', 'services'].map((d) => path.join(REPO_ROOT, d));
      const configs = roots
        .filter((d) => fs.existsSync(d))
        .flatMap(walk)
        .filter((f) => /(^|[/\\])tsconfig[^/\\]*\.json$/.test(f));
      const hits = configs.filter((f) => /main-site/.test(fs.readFileSync(f, 'utf-8')));
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });
  });

  describe('3. CI build · deploy target = ZERO', () => {
    const wfDir = path.join(REPO_ROOT, '.github', 'workflows');

    it('.github/workflows 의 어떤 workflow 도 main-site 를 대상으로 하지 않는다', () => {
      const files = fs.existsSync(wfDir)
        ? fs.readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f))
        : [];
      expect(files.length).toBeGreaterThan(0);
      const hits = files.filter((f) =>
        /main-site/.test(fs.readFileSync(path.join(wfDir, f), 'utf-8'))
      );
      expect(hits).toEqual([]);
    });

    it('scripts/ci-build-app.sh 에 main-site build case 가 없다', () => {
      expect(read('scripts/ci-build-app.sh')).not.toMatch(/main-site/);
    });

    it('scripts/** 의 실행 코드가 main-site 를 build · dev 대상으로 삼지 않는다', () => {
      const scriptsDir = path.join(REPO_ROOT, 'scripts');
      const files = walk(scriptsDir).filter((f) => /\.(sh|mjs|js|ts|cjs)$/.test(f));
      expect(files.length).toBeGreaterThan(0);
      const hits = files.filter((f) => /main-site/.test(codeOf(f)));
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });
  });

  describe('4. 외부 runtime 참조 = ZERO', () => {
    const scanRoots = ['apps', 'packages', 'services'].map((d) => path.join(REPO_ROOT, d));

    /** 본 spec 자체는 "없어야 할 문자열" 을 단언 대상으로 들고 있으므로 제외한다. */
    const files = scanRoots
      .filter((d) => fs.existsSync(d))
      .flatMap(walk)
      .filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f))
      .filter((f) => !f.endsWith('main-site-full-source-deletion.spec.ts'));

    it('스캔 대상을 실제로 찾았다', () => {
      expect(files.length).toBeGreaterThan(0);
    });

    it('살아 있는 소스가 @o4o/main-site-nextgen 을 import 하지 않는다', () => {
      const hits = files.filter((f) => /@o4o\/main-site(-nextgen)?/.test(codeOf(f)));
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });

    it('살아 있는 소스가 apps/main-site 경로를 문자열로 참조하지 않는다', () => {
      const hits = files.filter((f) => /apps[/\\]main-site/.test(codeOf(f)));
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });

    it('web-kpa-society 는 main-site 를 참조하지 않는다 (소유권 분리 확인)', () => {
      const kpa = path.join(REPO_ROOT, 'services', 'web-kpa-society', 'src');
      if (!fs.existsSync(kpa)) return;
      const hits = walk(kpa)
        .filter((f) => /\.(ts|tsx)$/.test(f))
        .filter((f) => /main-site/.test(codeOf(f)));
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });
  });
});
