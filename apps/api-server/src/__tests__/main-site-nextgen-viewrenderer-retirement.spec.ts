/**
 * WO-O4O-MAIN-SITE-NEXTGEN-VIEWRENDERER-DOMAIN-CENSUS-AND-RETIREMENT-V1
 *   — main-site NextGen ViewRenderer 프레임워크 전면 은퇴 계약 테스트
 *
 * 판정: RETIRE_CONFIRMED
 * ---------------------------------------------------
 * `apps/main-site` 에는 JSON View 스키마를 런타임에 해석해 화면을 만드는
 * 별도의 "NextGen" 화면 생성 프레임워크가 통째로 남아 있었다.
 *
 *   src/view/                      ViewRenderer core (loader · renderer · route-generator)
 *   src/views/*.json               View JSON 페이지 정의 32개
 *   src/generator/                 View JSON 생성 CLI
 *   src/ai/                        자연어 → View JSON 생성기
 *   src/shortcodes/_functions/     FunctionRegistry 등록 대상
 *   src/components/registry/       FunctionRegistry · UIComponentRegistry
 *   src/components/ViewRenderer.tsx
 *   src/components/blocks/         BlockRegistry · BlockRenderer
 *   src/components/ui/             UIComponentRegistry 등록 대상
 *   src/layouts/ (MainLayout 제외)  Default · Dashboard · Shop · Auth · Minimal
 *   src/lib/cms/ · src/lib/analytics/
 *
 *   - runtime 도달 0   — `src/main.tsx` 에서 정적으로 도달하는 파일 27개 중
 *                        NextGen 축은 0개다. 실제 라우터는 `src/router/index.tsx`
 *                        의 명시적 Route 표이며 route-generator 는 호출되지 않는다.
 *   - 번들 부재        — 빌드 산출물에서 ViewRenderer · FunctionRegistry ·
 *                        UIComponentRegistry · generateRoutes · viewGenerator ·
 *                        analyzeIntent 문자열이 모두 0회. 197개 제거 후에도
 *                        vite module count 는 2036 으로 동일했다.
 *   - 닫힌 dead loop   — generator/ · ai/ CLI 는 views/*.json 을 만들지만
 *                        그 JSON 을 렌더링하는 코드가 없다.
 *   - 외부 소비 0      — main-site 는 어떤 workspace 패키지의 의존성도 아니다.
 *                        admin-dashboard 의 `ViewPreview.tsx` 는 주석만 남았고
 *                        자체 ViewSchema 타입을 쓴다(별개 축).
 *   - 기능 변경 정지   — 마지막 기능 커밋 2025-12-08.
 *
 * ⚠ 유지되는 축 (이 판정으로 제거하지 않는다):
 *   - `apps/main-site/src/router/index.tsx` 기반 7개 라우트와 `layouts/MainLayout.tsx`
 *   - api-server CMS 의 `isCompatibleWithViewRenderer()` — server 측 별개 개념
 *   - `apps/admin-dashboard/src/pages/preview/ViewPreview.tsx`
 *   - App management canonical: `APPS_CATALOG` · `/api/v1/admin/apps` ·
 *     `/api/v1/apps/availability`
 *
 * 이 테스트는 **재등록 방지 계약**이다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SRC, '..', '..', '..');
const MAIN_SITE = path.join(REPO_ROOT, 'apps', 'main-site');
const MAIN_SITE_SRC = path.join(MAIN_SITE, 'src');

/** 은퇴한 NextGen 프레임워크 경로 (문서화 고정값) */
const RETIRED_PATHS = [
  path.join(MAIN_SITE_SRC, 'view'),
  path.join(MAIN_SITE_SRC, 'views'),
  path.join(MAIN_SITE_SRC, 'generator'),
  path.join(MAIN_SITE_SRC, 'ai'),
  path.join(MAIN_SITE_SRC, 'shortcodes'),
  path.join(MAIN_SITE_SRC, 'components', 'registry'),
  path.join(MAIN_SITE_SRC, 'components', 'ViewRenderer.tsx'),
  path.join(MAIN_SITE_SRC, 'components', 'blocks'),
  path.join(MAIN_SITE_SRC, 'components', 'ui'),
  path.join(MAIN_SITE_SRC, 'lib', 'cms'),
  path.join(MAIN_SITE_SRC, 'lib', 'analytics'),
];

/** 은퇴한 layout (MainLayout 만 살아 있다) */
const RETIRED_LAYOUTS = [
  'DefaultLayout.tsx',
  'DashboardLayout.tsx',
  'ShopLayout.tsx',
  'AuthLayout.tsx',
  'MinimalLayout.tsx',
  'registry.ts',
];

describe('WO-O4O-MAIN-SITE-NEXTGEN-VIEWRENDERER-DOMAIN-CENSUS-AND-RETIREMENT-V1', () => {
  describe('NextGen ViewRenderer 프레임워크가 되살아나지 않는다', () => {
    it.each(RETIRED_PATHS.map((p) => [path.relative(REPO_ROOT, p), p]))(
      '%s 는 존재하지 않는다',
      (_label, target) => {
        expect(fs.existsSync(target)).toBe(false);
      }
    );

    it('은퇴 경로 목록이 11개로 고정돼 있다', () => {
      expect(RETIRED_PATHS).toHaveLength(11);
    });

    it.each(RETIRED_LAYOUTS.map((f) => [f, path.join(MAIN_SITE_SRC, 'layouts', f)]))(
      'layouts/%s 는 존재하지 않는다',
      (_label, target) => {
        expect(fs.existsSync(target)).toBe(false);
      }
    );

    it('layouts/MainLayout.tsx 는 유지된다 (실제 라우터가 쓰는 유일한 layout)', () => {
      expect(fs.existsSync(path.join(MAIN_SITE_SRC, 'layouts', 'MainLayout.tsx'))).toBe(true);
    });
  });

  describe('main-site 빌드 진입점이 NextGen 축을 다시 끌어들이지 않는다', () => {
    const entryFiles = [
      path.join(MAIN_SITE_SRC, 'main.tsx'),
      path.join(MAIN_SITE_SRC, 'App.tsx'),
      path.join(MAIN_SITE_SRC, 'router', 'index.tsx'),
    ];

    it.each(entryFiles.map((f) => [path.relative(MAIN_SITE_SRC, f), f]))(
      '%s 가 존재한다',
      (_label, target) => {
        expect(fs.existsSync(target)).toBe(true);
      }
    );

    it('진입점이 ViewRenderer · registry · view loader 를 import 하지 않는다', () => {
      const joined = entryFiles.map((f) => fs.readFileSync(f, 'utf-8')).join('\n');
      expect(joined).not.toMatch(/from\s+'[^']*ViewRenderer'/);
      expect(joined).not.toMatch(/from\s+'@\/view\//);
      expect(joined).not.toMatch(/from\s+'@\/components\/registry/);
      expect(joined).not.toMatch(/import\.meta\.glob\([^)]*views\//);
    });
  });

  describe('main-site 전체에 NextGen 축 참조 0', () => {
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(full));
        else if (/\.(ts|tsx|json)$/.test(entry.name)) out.push(full);
      }
      return out;
    };

    /** retire 사유 주석은 남겨 두므로 주석 줄을 제거한 "실제 코드"만 스캔한다. */
    const codeOf = (file: string): string =>
      fs
        .readFileSync(file, 'utf-8')
        .split(/\r?\n/)
        .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
        .join('\n');

    const files = walk(MAIN_SITE_SRC);

    it('스캔 대상을 실제로 찾았다 (경로가 어긋나면 이 단언이 먼저 깨진다)', () => {
      expect(files.length).toBeGreaterThan(0);
    });

    it.each([
      ['ViewRenderer', /\bViewRenderer\b/],
      ['FunctionRegistry', /\bFunctionRegistry\b/],
      ['UIComponentRegistry', /\bUIComponentRegistry\b/],
      ['BlockRegistry', /\bBlockRegistry\b/],
      ['generateRoutes', /\bgenerateRoutes\b/],
    ])('%s 참조가 없다', (_label, re) => {
      const hits = files.filter((f) => re.test(codeOf(f)));
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });

    it('은퇴한 경로를 import 하는 코드가 없다', () => {
      const re =
        /from\s+'(@\/|\.{1,2}\/)[^']*(view\/|views\/|generator\/|ai\/cli|shortcodes\/|components\/registry|components\/blocks|components\/ui\/|lib\/cms|lib\/analytics)/;
      const hits = files.filter((f) => re.test(codeOf(f)));
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });
  });

  describe('main-site package.json 에 죽은 CLI 스크립트가 없다', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(MAIN_SITE, 'package.json'), 'utf-8')) as {
      scripts: Record<string, string>;
    };

    it.each([['generate:view'], ['generate:ai'], ['list:views'], ['delete:view']])(
      '%s 스크립트가 없다',
      (name) => {
        expect(pkg.scripts[name]).toBeUndefined();
      }
    );

    it('build · typecheck 는 유지된다 (CI 검증 대상)', () => {
      expect(pkg.scripts.build).toBeDefined();
      expect(pkg.scripts.typecheck).toBeDefined();
    });
  });

  describe('README 에 retire 근거가 남아 있다 (재등록 시 근거 확인용)', () => {
    it('WO 식별자와 RETIRE_CONFIRMED 가 기록돼 있다', () => {
      const readme = fs.readFileSync(path.join(MAIN_SITE, 'README.md'), 'utf-8');
      expect(readme).toContain(
        'WO-O4O-MAIN-SITE-NEXTGEN-VIEWRENDERER-DOMAIN-CENSUS-AND-RETIREMENT-V1'
      );
      expect(readme).toContain('RETIRE_CONFIRMED');
    });
  });

  describe('저장소 어디서도 main-site NextGen 축을 소비하지 않는다', () => {
    const scanRoots = [
      path.join(REPO_ROOT, 'apps'),
      path.join(REPO_ROOT, 'packages'),
      path.join(REPO_ROOT, 'services'),
      path.join(REPO_ROOT, 'scripts'),
    ].filter((d) => fs.existsSync(d));

    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(full));
        else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
      }
      return out;
    };

    const codeOf = (file: string): string =>
      fs
        .readFileSync(file, 'utf-8')
        .split(/\r?\n/)
        .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
        .join('\n');

    /** retire 계약 스펙 자체는 "없어야 할 문자열" 을 단언 대상으로 들고 있다. */
    const files = scanRoots.flatMap(walk).filter((f) => !/-retirement\.spec\.ts$/.test(f));

    it("'main-site' NextGen 경로를 참조하는 코드가 없다", () => {
      const hits = files.filter((f) =>
        /main-site[/\\]src[/\\](view|views|generator|ai|shortcodes|components[/\\](registry|blocks|ui))/.test(
          codeOf(f)
        )
      );
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });
  });

  describe('현행 App management canonical 은 영향을 받지 않는다', () => {
    it('APPS_CATALOG 정본이 유지된다', () => {
      const catalog = path.join(SRC, 'app-manifests', 'appsCatalog.ts');
      expect(fs.existsSync(catalog)).toBe(true);
      expect(fs.readFileSync(catalog, 'utf-8')).toContain('export const APPS_CATALOG');
    });

    it.each([
      ['/api/v1/apps', 'appAvailabilityRoutes'],
      ['/api/v1/admin/apps', 'adminAppsRoutes'],
    ])('%s mount 가 유지된다', (mountPath, routerName) => {
      const registerSrc = fs.readFileSync(
        path.join(SRC, 'bootstrap', 'register-routes.ts'),
        'utf-8'
      );
      expect(registerSrc).toContain(`app.use('${mountPath}', ${routerName});`);
    });
  });
});
