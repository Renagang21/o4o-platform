/**
 * WO-O4O-MAIN-SITE-APPSTORE-PARALLEL-AXIS-CENSUS-AND-RETIREMENT-V1
 *   — main-site 병렬 App Store 축 은퇴 계약 테스트
 *
 * 판정: RETIRE_CONFIRMED
 * ---------------------------------------------------
 * `apps/main-site` 안에는 현행 App management canonical 과 무관한 별도의
 * App Store 세계가 남아 있었다.
 *
 *   src/appstore/{index,types,registry,manifestLoader,loader,registryMerger}.ts
 *   src/components/ui/appstore/{AppList,AppCard,AppInstallButton,AppEnableToggle}.tsx
 *   src/shortcodes/_functions/appstore/appStoreManager.ts
 *   src/views/appstore.json
 *
 *   - route reachability 0 — `views/*.json` 라우팅은 `src/view/route-generator.ts`
 *                            가 만드는데 이를 쓰는 `src/view/loader.ts` 를 import
 *                            하는 코드가 0 이다. 실제 라우터(`src/router/index.tsx`)
 *                            는 명시적 Route 표이고 `/appstore` 가 없다.
 *   - external consumer 0  — 저장소 어디에서도 main-site 의 appstore 모듈을
 *                            import 하지 않는다.
 *   - missing package      — registry 가 가리키던 `@o4o-apps/commerce`·`customer`·
 *                            `admin` 은 존재하지 않는다(`packages/@o4o-apps/` 에는
 *                            content-app · learning-app · signage 만 있다).
 *   - NO_EFFECT            — manifest 로드 실패 시 stub manifest 로 가짜 컴포넌트를
 *                            만들어 FunctionRegistry / UIComponentRegistry 에
 *                            주입했으나, 그 레지스트리를 읽는 ViewRenderer 는
 *                            어디에서도 import 되지 않는다.
 *   - RETIRED_RUNTIME      — main-site 는 Cloud Run 서비스도 deploy workflow 도 없고
 *                            CI 에서는 build/typecheck 대상으로만 남아 있다.
 *
 * ⚠ 유지되는 축 (이 판정으로 제거하지 않는다):
 *   - `app-manifests/appsCatalog.ts` 의 `APPS_CATALOG` — App 정의 정본
 *   - `packages/**` 의 manifest — CI AppStore Guard 소비
 *   - `app_registry` · `/api/v1/admin/apps` · `/api/v1/apps/availability`
 *
 * 이 테스트는 **재등록 방지 계약**이다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SRC, '..', '..', '..');
const MAIN_SITE = path.join(REPO_ROOT, 'apps', 'main-site');
const MAIN_SITE_SRC = path.join(MAIN_SITE, 'src');

/** 은퇴한 main-site App Store 경로 (문서화 고정값) */
const RETIRED_PATHS = [
  path.join(MAIN_SITE_SRC, 'appstore'),
  path.join(MAIN_SITE_SRC, 'components', 'ui', 'appstore'),
  path.join(MAIN_SITE_SRC, 'shortcodes', '_functions', 'appstore'),
  path.join(MAIN_SITE_SRC, 'views', 'appstore.json'),
];

describe('WO-O4O-MAIN-SITE-APPSTORE-PARALLEL-AXIS-CENSUS-AND-RETIREMENT-V1', () => {
  describe('main-site 병렬 App Store 축이 되살아나지 않는다', () => {
    it.each(RETIRED_PATHS.map((p) => [path.relative(REPO_ROOT, p), p]))(
      '%s 는 존재하지 않는다',
      (_label, target) => {
        expect(fs.existsSync(target)).toBe(false);
      }
    );

    it('은퇴 경로 목록이 4개로 고정돼 있다', () => {
      expect(RETIRED_PATHS).toHaveLength(4);
    });

    it('main.tsx 가 AppStore 를 부팅에서 초기화하지 않는다', () => {
      const mainSrc = fs.readFileSync(path.join(MAIN_SITE_SRC, 'main.tsx'), 'utf-8');
      expect(mainSrc).not.toMatch(/^\s*import .*from '\.\/appstore'/m);
      expect(mainSrc).not.toMatch(/^\s*initializeAppStore\(/m);
    });

    it('retire 사유가 주석으로 남아 있다 (재등록 시 근거 확인용)', () => {
      const mainSrc = fs.readFileSync(path.join(MAIN_SITE_SRC, 'main.tsx'), 'utf-8');
      expect(mainSrc).toContain(
        'WO-O4O-MAIN-SITE-APPSTORE-PARALLEL-AXIS-CENSUS-AND-RETIREMENT-V1'
      );
    });
  });

  /**
   * WO-O4O-MAIN-SITE-NEXTGEN-VIEWRENDERER-DOMAIN-CENSUS-AND-RETIREMENT-V1:
   *   이 WO 는 registry 에서 App Store 항목만 걷어내고 registry 자체는 남겼다.
   *   후속 WO 에서 NextGen ViewRenderer 프레임워크 전체가 은퇴하면서
   *   `components/registry/` 디렉터리 자체가 사라졌다. 더 강한 상태이므로
   *   "파일이 존재하고 import 가 없다" 를 "파일 자체가 없다" 로 뒤집는다.
   *   App Store 항목이 registry 를 통해 되살아날 수 없음은 그대로 보장된다.
   */
  describe('main-site 레지스트리에 App Store 항목이 남아 있지 않다', () => {
    const registryFiles = [
      path.join(MAIN_SITE_SRC, 'components', 'registry', 'function.ts'),
      path.join(MAIN_SITE_SRC, 'components', 'registry', 'ui.tsx'),
    ];

    it.each(registryFiles.map((f) => [path.basename(f), f]))(
      '%s 는 존재하지 않는다 (registry 축 전체 은퇴)',
      (_label, target) => {
        expect(fs.existsSync(target)).toBe(false);
      }
    );

    it('components/registry 디렉터리 자체가 없다', () => {
      expect(fs.existsSync(path.join(MAIN_SITE_SRC, 'components', 'registry'))).toBe(false);
    });
  });

  describe('main-site 전체에 App Store 병렬축 참조 0', () => {
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

    it('appStoreManager 참조가 없다', () => {
      const hits = files.filter((f) => /appStoreManager/.test(codeOf(f)));
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });

    it('appstore 모듈 import 가 없다', () => {
      const hits = files.filter((f) => /from '@\/appstore|from '\.\/appstore|\/ui\/appstore\//.test(codeOf(f)));
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });

    it('존재하지 않는 @o4o-apps 패키지 참조가 없다', () => {
      const hits = files.filter((f) =>
        /@o4o-apps\/(commerce|customer|admin)\b/.test(codeOf(f))
      );
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });
  });

  describe('저장소 어디서도 main-site App Store 축을 소비하지 않는다', () => {
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

    it("'main-site' App Store 경로를 참조하는 코드가 없다", () => {
      const hits = files.filter((f) =>
        /main-site[/\\]src[/\\](appstore|views[/\\]appstore)/.test(codeOf(f))
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
