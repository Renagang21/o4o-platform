/**
 * WO-O4O-PUBLIC-APPSTORE-READ-CONTRACT-CENSUS-AND-DISPOSITION-V1
 *   — 공개 App Store read API 2종 은퇴 계약 테스트
 *
 * 판정: RETIRE_CONFIRMED (PUBLIC_APPSTORE_READ_RETIRE)
 * ---------------------------------------------------
 * 은퇴 대상:
 *   GET /api/v1/appstore
 *   GET /api/v1/appstore/:appId
 *
 * 두 endpoint 는 `APPS_CATALOG` 를 무인증으로 그대로 투영하는 PURE_CATALOG_READ 였다.
 *
 *   - code consumer 0     — 저장소 전체에서 '/api/v1/appstore' 를 호출하는 코드는
 *                           mount 와 자기 자신의 테스트뿐이었다.
 *   - frontend consumer 0 — admin AppStore 화면(`AppStorePage`)은 `/admin/apps/*` 만
 *                           호출한다. main-site 의 appstore UI 는 별도 client-side
 *                           registry(`@/appstore/registry`)를 쓰고 라우팅도 없다.
 *   - external contract 0 — swagger/OpenAPI 에 appstore 경로가 등재된 적이 없고,
 *                           SDK · partner docs · public developer docs 에도 없다.
 *   - organic traffic 0   — 로그 보존 30일 관측창(2026-07-27~08-26) 전체 65건이
 *                           curl 2개 IP 의 선행 WO 검증 트래픽. 브라우저·봇·외부 0.
 *   - unique value 0      — 목록 응답은 인증된 `GET /api/v1/admin/apps/market` 이
 *                           반환하는 APPS_CATALOG 와 동일(DUPLICATE_READ),
 *                           상세는 그 부분집합이다.
 *   - 무인증으로 앱 topology · 의존 그래프 · `experimental` 상태를 노출하고 있었다.
 *
 * ⚠ 유지되는 축 (이 판정으로 제거하지 않는다):
 *   - `app-manifests/appsCatalog.ts` 의 `APPS_CATALOG` 17개 — App 정의 정본
 *   - `packages/**` 의 manifest 17개 — CI AppStore Guard 소비
 *   - `app_registry` 테이블 · `/api/v1/admin/apps` READ · `/api/v1/apps/availability`
 *
 * 이 테스트는 **재등록 방지 계약**이다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SRC, '..', '..', '..');
const REGISTER_ROUTES = path.join(SRC, 'bootstrap', 'register-routes.ts');
const APPS_CATALOG_FILE = path.join(SRC, 'app-manifests', 'appsCatalog.ts');

/** 은퇴한 public endpoint (문서화 고정값) */
const RETIRED_PUBLIC_PATHS = ['GET /api/v1/appstore', 'GET /api/v1/appstore/:appId'];

/** 카탈로그 정본을 계속 소비하는 축 — 회귀 시 여기서 먼저 깨진다 */
const CATALOG_CONSUMERS = [
  path.join(SRC, 'routes', 'admin', 'apps.routes.ts'),
  path.join(SRC, 'services', 'app-manager', 'app-manager.registry.ts'),
  path.resolve(SRC, '..', 'tests', 'multi-tenant', 'appstore.spec.ts'),
  path.resolve(SRC, '..', 'tests', 'multi-tenant', 'setup.ts'),
  path.join(REPO_ROOT, 'scripts', 'appstore-guard.ts'),
];

describe('WO-O4O-PUBLIC-APPSTORE-READ-CONTRACT-CENSUS-AND-DISPOSITION-V1', () => {
  const registerSrc = fs.readFileSync(REGISTER_ROUTES, 'utf-8');
  const catalogSrc = fs.readFileSync(APPS_CATALOG_FILE, 'utf-8');

  describe('은퇴한 public surface 가 되살아나지 않는다', () => {
    it.each([
      ['routes/appstore.routes.ts', path.join(SRC, 'routes', 'appstore.routes.ts')],
      ['routes/__tests__/appstore-auth-boundary.test.ts', path.join(SRC, 'routes', '__tests__', 'appstore-auth-boundary.test.ts')],
    ])('%s 는 존재하지 않는다', (_label, target) => {
      expect(fs.existsSync(target)).toBe(false);
    });

    it('register-routes.ts 가 appstore 라우터를 import 하지 않는다', () => {
      expect(registerSrc).not.toMatch(/from\s+'\.\.\/routes\/appstore\.routes\.js'/);
      expect(registerSrc).not.toMatch(/\bappstoreRoutes\b(?!.*\/\/)/);
    });

    it("'/api/v1/appstore' 를 app.use 로 등록하지 않는다", () => {
      const mountLines = registerSrc
        .split(/\r?\n/)
        .filter((line) => /app\.use\(/.test(line) && !/^\s*\/\//.test(line));
      expect(mountLines.some((line) => line.includes('/api/v1/appstore'))).toBe(false);
    });

    it('retire 사유가 주석으로 남아 있다 (재등록 시 근거 확인용)', () => {
      expect(registerSrc).toContain('PUBLIC_APPSTORE_READ_RETIRE');
    });

    it('은퇴 대상 endpoint 목록이 2개로 고정돼 있다', () => {
      expect(RETIRED_PUBLIC_PATHS).toHaveLength(2);
    });
  });

  describe('appstore 전용 카탈로그 helper 가 되살아나지 않는다', () => {
    it.each([['searchCatalog'], ['filterByCategory'], ['getCategories']])(
      'appsCatalog.ts 에 %s export 가 없다',
      (fn) => {
        expect(catalogSrc).not.toMatch(new RegExp(`export function ${fn}\\b`));
      }
    );
  });

  describe('APPS_CATALOG 정본은 회귀 없이 유지된다', () => {
    it('appsCatalog.ts 가 존재하고 APPS_CATALOG 를 export 한다', () => {
      expect(fs.existsSync(APPS_CATALOG_FILE)).toBe(true);
      expect(catalogSrc).toContain('export const APPS_CATALOG');
    });

    it('카탈로그 항목이 17개로 유지된다', () => {
      const entries = catalogSrc.match(/^\s{4}appId:\s*'/gm) ?? [];
      expect(entries).toHaveLength(17);
    });

    it.each([
      ['filterByServiceGroup'],
      ['getCatalogItem'],
      ['getAppsForServiceGroupWithDependencies'],
    ])('다른 축이 쓰는 helper %s 는 유지된다', (fn) => {
      expect(catalogSrc).toMatch(new RegExp(`export function ${fn}\\b`));
    });

    it.each(CATALOG_CONSUMERS.map((f) => [path.basename(f), f]))(
      '카탈로그 소비처 %s 가 유지된다',
      (_label, target) => {
        expect(fs.existsSync(target)).toBe(true);
      }
    );
  });

  describe('canonical read 축은 영향을 받지 않는다', () => {
    it.each([
      ['/api/v1/apps', 'appAvailabilityRoutes'],
      ['/api/v1/admin/apps', 'adminAppsRoutes'],
    ])('%s mount 가 유지된다', (mountPath, routerName) => {
      expect(registerSrc).toContain(`app.use('${mountPath}', ${routerName});`);
    });

    it('admin/apps 의 카탈로그 read 가 유지된다 (/market 이 대체 경로다)', () => {
      const adminApps = fs.readFileSync(path.join(SRC, 'routes', 'admin', 'apps.routes.ts'), 'utf-8');
      expect(adminApps).toContain("router.get('/market'");
      expect(adminApps).toContain('APPS_CATALOG');
    });

    it('app-availability 라우터가 유지된다', () => {
      expect(fs.existsSync(path.join(SRC, 'routes', 'app-availability.routes.ts'))).toBe(true);
    });
  });

  describe('저장소 전체에 죽은 참조 0', () => {
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

    /** retire 사유 주석은 남겨 두므로 주석 줄을 제거한 "실제 코드"만 스캔한다. */
    const codeOf = (file: string): string =>
      fs
        .readFileSync(file, 'utf-8')
        .split(/\r?\n/)
        .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
        .join('\n');

    const scanRoots = [
      path.join(REPO_ROOT, 'apps'),
      path.join(REPO_ROOT, 'packages'),
      path.join(REPO_ROOT, 'services'),
      path.join(REPO_ROOT, 'scripts'),
    ].filter((d) => fs.existsSync(d));

    /**
     * retire 계약 스펙 자체는 "없어야 할 문자열" 을 단언 대상으로 들고 있으므로
     * 스캔에서 제외한다(이들이 곧 이 계약의 guard 다).
     */
    const files = scanRoots.flatMap(walk).filter((f) => !/-retirement\.spec\.ts$/.test(f));

    it('스캔 대상을 실제로 찾았다 (경로가 어긋나면 이 단언이 먼저 깨진다)', () => {
      expect(files.length).toBeGreaterThan(0);
    });

    it("'/api/v1/appstore' 호출이 코드에 남아 있지 않다", () => {
      const hits = files.filter((f) => /['"`]\/api\/v1\/appstore/.test(codeOf(f)));
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });

    it('appstore.routes 를 import 하는 코드가 없다', () => {
      const hits = files.filter((f) => /appstore\.routes/.test(codeOf(f)));
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });

    it('은퇴한 helper 3종을 import 하는 코드가 없다', () => {
      const hits = files.filter((f) =>
        /\b(searchCatalog|filterByCategory)\b/.test(codeOf(f))
      );
      expect(hits.map((f) => path.relative(REPO_ROOT, f))).toEqual([]);
    });
  });
});
