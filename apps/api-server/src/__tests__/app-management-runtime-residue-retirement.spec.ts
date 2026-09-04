/**
 * WO-O4O-APP-MANAGEMENT-CANONICAL-MODEL-AND-RUNTIME-RESIDUE-CLOSURE-V1
 *   — App 관리 축 canonical 고정 + runtime residue retire 계약 테스트
 *
 * 판정 1: MODULE_LOADER_RETIRE
 * ---------------------------
 * `modules/module-loader.ts` 는 부트 시 `packages` 하위 `manifest.ts` 를 glob 해서
 * dynamic import → install → activate → `app.use('/api/v1/<moduleId>')` 를 수행하도록
 * 작성돼 있었으나, **모든 환경에서 등록 결과가 0** 이었다.
 *
 *   - production: Dockerfile 은 `dist/main.js` 번들 + `dist/database` + `src/assets` +
 *     `mail-templates` 만 COPY 한다. 이미지에 `packages/` 자체가 없어 glob 결과가 0이고,
 *     번들의 `__dirname` 은 `/app/dist` 다. → dynamic route 0 · entity 0.
 *   - 로컬 재현: manifest 17개 중 13개가 top-level `id` 부재로 로더 게이트에서 거부되고,
 *     통과한 4개(signage · auth-core · cosmetics-seller-extension · platform-core)도
 *     `dist/backend/index.js` 에 named `routes` export 가 없어 router 0.
 *   - 즉 "manifest 가 있다"는 사실은 runtime active 의 근거가 아니었다.
 *
 * 판정 2: ADMIN_APPS_WRITE_RETIRE
 * ------------------------------
 * `/api/v1/admin/apps` 의 write 8종(install · activate · deactivate · uninstall ·
 * update · rollback · validate-remote · install-remote)을 은퇴했다.
 *
 *   - frontend consumer 0 (AppStore 화면은 WO-APPSTORE-UI-DEMOTION 이후 READ-ONLY).
 *   - production 30일 로그 호출 0 (동일 필터의 read endpoint 로 대조 검증함).
 *   - `app_registry` 6행 전부 `installedAt == updatedAt == 2026-01-22T04:36:28.617Z`
 *     — seed 이후 write 가 한 번도 없었다.
 *   - lifecycle 분기는 `hasManifest()` 가 항상 false 라 전부 no-op 이었다.
 *
 * ⚠ 유지되는 canonical 축 (이 WO 가 건드리지 않는다):
 *   - App 정의 metadata: `app-manifests/appsCatalog.ts` (APPS_CATALOG 17)
 *   - Package metadata:  `packages` 하위 `manifest.ts` 17개 — CI AppStore Guard 소비, 무접촉
 *   - 운영 상태:         `app_registry` 테이블 6행 — DB schema change 0 · migration 0 ·
 *                        production write 0 (행 삭제도 하지 않았다)
 *   - 운영 상태 read:    `/api/v1/apps/availability` (AppGuard · useAdminMenu 실사용)
 *   - 관리자 조회:       `/api/v1/admin/apps` READ 9종
 *   - 공개 카탈로그:     `/api/v1/appstore` GET
 *
 * 이 테스트는 **재등록 방지 계약**이다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const API_SERVER = path.resolve(SRC, '..');
const REGISTER_ROUTES = path.join(SRC, 'bootstrap', 'register-routes.ts');
const ADMIN_APPS_ROUTES = path.join(SRC, 'routes', 'admin', 'apps.routes.ts');
const ADMIN_DASHBOARD_SRC = path.resolve(SRC, '..', '..', 'admin-dashboard', 'src');

/** retire 된 admin write endpoint 8종 (문서화 고정값) */
const RETIRED_ADMIN_WRITE_PATHS = [
  'POST /api/v1/admin/apps/install',
  'POST /api/v1/admin/apps/activate',
  'POST /api/v1/admin/apps/deactivate',
  'POST /api/v1/admin/apps/uninstall',
  'POST /api/v1/admin/apps/update',
  'POST /api/v1/admin/apps/rollback',
  'POST /api/v1/admin/apps/validate-remote',
  'POST /api/v1/admin/apps/install-remote',
];

/** 유지되는 admin read endpoint 9종 */
const KEPT_ADMIN_READ_ROUTES = [
  "router.get('/market'",
  "router.get('/disabled'",
  "router.get('/'",
  "router.get('/service-groups'",
  "router.get('/service-groups/stats'",
  "router.get('/:appId'",
  "router.get('/:appId/version-info'",
  "router.get('/by-service/:serviceGroup'",
  "router.get('/:appId/compatibility'",
];

describe('WO-O4O-APP-MANAGEMENT-CANONICAL-MODEL-AND-RUNTIME-RESIDUE-CLOSURE-V1', () => {
  const registerSrc = fs.readFileSync(REGISTER_ROUTES, 'utf-8');
  const adminAppsSrc = fs.readFileSync(ADMIN_APPS_ROUTES, 'utf-8');

  describe('MODULE_LOADER_RETIRE — 삭제된 plugin 런타임이 되살아나지 않는다', () => {
    it.each([
      ['modules/module-loader.ts', path.join(SRC, 'modules', 'module-loader.ts')],
      ['modules/types.ts', path.join(SRC, 'modules', 'types.ts')],
      ['modules/index.ts', path.join(SRC, 'modules', 'index.ts')],
      ['services/app-manager/app-manager.loader.ts', path.join(SRC, 'services', 'app-manager', 'app-manager.loader.ts')],
      ['services/app-manager/app-manager.execution.ts', path.join(SRC, 'services', 'app-manager', 'app-manager.execution.ts')],
      ['services/app-manager/app-manager.lifecycle.ts', path.join(SRC, 'services', 'app-manager', 'app-manager.lifecycle.ts')],
      ['services/app-manager/app-manager.types.ts', path.join(SRC, 'services', 'app-manager', 'app-manager.types.ts')],
      ['app-manifests/index.ts (빈 manifestRegistry)', path.join(SRC, 'app-manifests', 'index.ts')],
      ['app-manifests/forum.manifest.ts', path.join(SRC, 'app-manifests', 'forum.manifest.ts')],
      ['app-manifests/partnerops.manifest.ts', path.join(SRC, 'app-manifests', 'partnerops.manifest.ts')],
    ])('%s 는 존재하지 않는다', (_label, target) => {
      expect(fs.existsSync(target)).toBe(false);
    });

    it('register-routes.ts 가 moduleLoader 를 import 하거나 호출하지 않는다', () => {
      expect(registerSrc).not.toContain("from '../modules/module-loader.js'");
      expect(registerSrc).not.toMatch(
        /moduleLoader\.(loadAll|installModule|activateModule|getModuleRouter|getAllEntities)\s*\(/
      );
    });

    it('retire 사유가 주석으로 남아 있다 (재등록 시 근거 확인용)', () => {
      expect(registerSrc).toContain('MODULE_LOADER_RETIRE');
    });
  });

  describe('ADMIN_APPS_WRITE_RETIRE — write 8종이 재등록되지 않는다', () => {
    it.each([
      ['/install', /router\.post\(\s*['"]\/install['"]/],
      ['/activate', /router\.post\(\s*['"]\/activate['"]/],
      ['/deactivate', /router\.post\(\s*['"]\/deactivate['"]/],
      ['/uninstall', /router\.post\(\s*['"]\/uninstall['"]/],
      ['/update', /router\.post\(\s*['"]\/update['"]/],
      ['/rollback', /router\.post\(\s*['"]\/rollback['"]/],
      ['/validate-remote', /router\.post\(\s*['"]\/validate-remote['"]/],
      ['/install-remote', /router\.post\(\s*['"]\/install-remote['"]/],
    ])('admin/apps.routes.ts 에 POST %s 가 없다', (_label, pattern) => {
      expect(pattern.test(adminAppsSrc)).toBe(false);
    });

    it('admin/apps.routes.ts 에 어떤 변경 메서드도 등록돼 있지 않다', () => {
      expect(adminAppsSrc).not.toMatch(/router\.(post|put|patch|delete)\(/);
    });

    it('retire 대상 write endpoint 목록이 8개로 고정돼 있다', () => {
      expect(RETIRED_ADMIN_WRITE_PATHS).toHaveLength(8);
    });

    it('retire 사유가 주석으로 남아 있다', () => {
      expect(adminAppsSrc).toContain('ADMIN_APPS_WRITE_RETIRE');
    });

    it.each([
      ['services/AppDependencyResolver.ts', path.join(SRC, 'services', 'AppDependencyResolver.ts')],
      ['services/AppDataCleaner.ts', path.join(SRC, 'services', 'AppDataCleaner.ts')],
      ['services/AppTableOwnershipResolver.ts', path.join(SRC, 'services', 'AppTableOwnershipResolver.ts')],
      ['services/ExtensionMergeService.ts', path.join(SRC, 'services', 'ExtensionMergeService.ts')],
      ['services/AppSecurityValidator.ts', path.join(SRC, 'services', 'AppSecurityValidator.ts')],
      ['services/RemoteManifestLoader.ts', path.join(SRC, 'services', 'RemoteManifestLoader.ts')],
      ['services/RemoteResourcesLoader.ts', path.join(SRC, 'services', 'RemoteResourcesLoader.ts')],
      ['constants/coreTables.ts', path.join(SRC, 'constants', 'coreTables.ts')],
      ['scripts/bootstrap-install-apps.ts', path.join(API_SERVER, 'scripts', 'bootstrap-install-apps.ts')],
      ['scripts/bootstrap-install-apps.mjs', path.join(API_SERVER, 'scripts', 'bootstrap-install-apps.mjs')],
    ])('write 전용 부속 %s 가 되살아나지 않는다', (_label, target) => {
      expect(fs.existsSync(target)).toBe(false);
    });
  });

  describe('AppManager 는 read-only 다', () => {
    const facade = fs.readFileSync(path.join(SRC, 'services', 'app-manager', 'app-manager.facade.ts'), 'utf-8');
    const registry = fs.readFileSync(path.join(SRC, 'services', 'app-manager', 'app-manager.registry.ts'), 'utf-8');

    it('facade 에 install/activate/deactivate/uninstall/update/rollback 메서드가 없다', () => {
      expect(facade).not.toMatch(/\b(installApp|activateApp|deactivateApp|uninstallApp|updateApp|rollbackApp)\s*\(/);
    });

    it('registry 계층이 app_registry 에 write 하지 않는다', () => {
      for (const src of [facade, registry]) {
        expect(src).not.toMatch(/repo(sitory)?\.(save|insert|update|delete|remove)\s*\(/);
      }
    });

    it('read 5종은 유지된다', () => {
      for (const fn of ['listInstalled', 'getAppStatus', 'isAppActive', 'listActiveApps', 'getVersionInfo']) {
        expect(facade).toContain(fn);
        expect(registry).toContain(fn);
      }
    });
  });

  describe('canonical 축은 유지된다', () => {
    it.each([
      ['/api/v1/apps', 'appAvailabilityRoutes'],
      ['/api/v1/admin/apps', 'adminAppsRoutes'],
    ])('%s mount 가 유지된다', (mountPath, routerName) => {
      expect(registerSrc).toContain(`app.use('${mountPath}', ${routerName});`);
    });

    // WO-O4O-PUBLIC-APPSTORE-READ-CONTRACT-CENSUS-AND-DISPOSITION-V1:
    //   이 WO 당시 유지를 단언했던 `/api/v1/appstore` 는 후속 전수조사에서
    //   code·frontend·external consumer 0, organic traffic 0,
    //   `/admin/apps/market` 과 DUPLICATE_READ 로 확인돼 은퇴했다.
    //   근거는 `public-appstore-read-retirement.spec.ts` 와 CHECK 문서에 있다.
    it('/api/v1/appstore mount 는 되살아나지 않는다', () => {
      expect(registerSrc).not.toContain("app.use('/api/v1/appstore'");
    });

    it.each(KEPT_ADMIN_READ_ROUTES.map((r) => [r]))('admin read 라우트 %s 가 유지된다', (route) => {
      expect(adminAppsSrc).toContain(route);
    });

    it('App 정의 canonical 정본 appsCatalog.ts 가 유지된다', () => {
      expect(fs.existsSync(path.join(SRC, 'app-manifests', 'appsCatalog.ts'))).toBe(true);
      expect(fs.existsSync(path.join(SRC, 'app-manifests', 'disabled-apps.registry.ts'))).toBe(true);
    });

    it('packages 하위 manifest.ts 는 12개로 유지된다 (CI AppStore Guard 소비, 무접촉)', () => {
      const packagesDir = path.resolve(API_SERVER, '..', '..', 'packages');
      const found: string[] = [];
      const walk = (dir: string, depth = 0) => {
        if (depth > 6) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === 'node_modules' || entry.name === 'dist') continue;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) walk(full, depth + 1);
          else if (entry.name === 'manifest.ts') found.push(full);
        }
      };
      if (fs.existsSync(packagesDir)) walk(packagesDir);
      // WO-O4O-ECOMMERCE-CORE-AND-COMMERCE-RESIDUE-FINAL-CENSUS-AND-RETIREMENT-V1:
      //   ecommerce-core package 은퇴로 manifest 17 → 16.
      // WO-O4O-SIGNAGE-LEGACY-STACK-SIMPLIFICATION-AND-TABLET-AUTHORING-CLOSURE-V1:
      //   @o4o-apps/signage package 은퇴로 manifest 16 → 15.
      // WO-O4O-SIGNAGE-RESIDUAL-DEAD-RUNTIME-FINAL-RETIREMENT-V1:
      //   digital-signage-core 의 dead backend runtime(manifest/routes/controllers/services) 은퇴로 15 → 14.
      //   해당 package 는 `./entities` subpath 만 소비되며 manifest 소비처는 0 이었다.
      // WO-O4O-AUTH-RUNTIME-AND-LEGACY-PACKAGE-FINAL-CLOSURE-V1 (B축):
      //   소비처 0 이던 `packages/partnerops` 제거로 14 → 13.
      // WO-O4O-FINAL-CODE-ONLY-RETIREMENT-CLOSURE-V1 §18:
      //   runtime 소비처 0 이던 `packages/cosmetics-seller-extension` 제거로 13 → 12.
      expect(found).toHaveLength(12);
    });

    it('app_registry 를 건드리는 migration 이 이 WO 로 추가되지 않았다 (DB schema change 0)', () => {
      const migrations = path.join(SRC, 'database', 'migrations');
      const hits = fs
        .readdirSync(migrations)
        .filter((f) => /app-?management|module-?loader|runtime-?residue/i.test(f));
      expect(hits).toEqual([]);
    });
  });

  describe('frontend 에 죽은 write 참조 0', () => {
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === 'dist') continue;
          out.push(...walk(full));
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          out.push(full);
        }
      }
      return out;
    };

    const files = fs.existsSync(ADMIN_DASHBOARD_SRC) ? walk(ADMIN_DASHBOARD_SRC) : [];

    /** retire 사유 주석은 남겨 두므로 주석 줄을 제거한 "실제 코드"만 스캔한다. */
    const codeOf = (file: string): string =>
      fs
        .readFileSync(file, 'utf-8')
        .split(/\r?\n/)
        .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
        .join('\n');

    it('admin-dashboard 소스를 실제로 스캔했다 (경로가 어긋나면 이 단언이 먼저 깨진다)', () => {
      expect(files.length).toBeGreaterThan(0);
    });

    it.each([
      ["'/admin/apps/install'", /['"`]\/admin\/apps\/install/],
      ["'/admin/apps/activate'", /['"`]\/admin\/apps\/activate/],
      ["'/admin/apps/deactivate'", /['"`]\/admin\/apps\/deactivate/],
      ["'/admin/apps/uninstall'", /['"`]\/admin\/apps\/uninstall/],
      ["'/admin/apps/update'", /['"`]\/admin\/apps\/update/],
      ["'/admin/apps/rollback'", /['"`]\/admin\/apps\/rollback/],
      ["'/admin/apps/validate-remote'", /['"`]\/admin\/apps\/validate-remote/],
      ["'/admin/apps/install-remote'", /['"`]\/admin\/apps\/install-remote/],
    ])('admin-dashboard 에 %s 호출이 없다', (_label, pattern) => {
      const hits = files.filter((f) => pattern.test(codeOf(f)));
      expect(hits.map((f) => path.relative(ADMIN_DASHBOARD_SRC, f))).toEqual([]);
    });

    it('ownsTables / ownsCPT / ownsACF 참조가 남아 있지 않다', () => {
      const hits = files.filter((f) => /\bowns(Tables|CPT|ACF)\b/.test(codeOf(f)));
      expect(hits.map((f) => path.relative(ADMIN_DASHBOARD_SRC, f))).toEqual([]);
    });

    it('AppStore READ 클라이언트는 유지된다', () => {
      const client = fs.readFileSync(path.join(ADMIN_DASHBOARD_SRC, 'api', 'admin-apps.ts'), 'utf-8');
      for (const fn of ['getInstalledApps', 'getMarketApps', 'getDisabledApps', 'getServiceGroupMeta', 'appAvailabilityApi']) {
        expect(client).toContain(fn);
      }
    });
  });
});
