/**
 * WO-O4O-SERVICE-PROVISIONING-CANONICAL-CONTRACT-AND-LEGACY-API-CLOSURE-V1
 *   — Service Provisioning / Service Admin 전 축 retire 계약 테스트
 *
 * 판정: SERVICE_PROVISIONING_LEGACY_RETIRE (전 축)
 * ------------------------------------------------
 * Phase 7/8 provisioning 축은 `/api/v1/service/*`(7) 와 `/api/v1/service-admin/*`(8)
 * 두 라우터로 중복돼 있었고, **양쪽 모두** production 에서 실효가 없었다.
 *
 *   - production 실측(o4o-core-api Cloud Run, 전 revision 공통 부트 로그):
 *       [TemplateRegistry] Templates directory not found: /app/dist/templates   → 0 templates
 *       [InitPackRegistry] Init packs directory not found: /app/dist/init-packs → 0 packs
 *     Dockerfile 은 `dist/main.js` 번들 + `dist/database` + `src/assets` + `mail-templates`
 *     만 COPY 한다. `service-templates/{templates,init-packs}/*.json` 은 이미지에 들어간
 *     적이 없고, 번들의 `__dirname` 은 `/app/dist` 이므로 loader 가 볼 디렉터리 자체가 없었다.
 *     → templates read 는 항상 빈 배열, detail·preview·create·install 은 항상 404.
 *
 *   - `serviceInitializer.initializeService()` 8단계가 전부 `// TODO: Integrate with ...`
 *     + `logger.debug` 스텁이었다. 생성 개수를 반환하지만 어떤 테이블에도 쓰지 않는다.
 *   - `serviceInstaller` 의 install 은 in-memory ModuleLoader registry 만 건드리고
 *     App Store canonical 정본인 `app_registry` 테이블에는 쓰지 않았다.
 *   - `themePresetService` 는 `new Map()` 저장소였다("would be DB in production" 주석).
 *
 *   - 소비처 실측:
 *       `/api/v1/service-admin/*` = 0 (frontend · packages · scripts 전수 검색).
 *       `/api/v1/service/*` = admin-dashboard `ServiceTemplateSelector` 뿐이었고
 *       그 화면은 production 에서 항상 빈 목록이었다(AppStore READ-ONLY 계약
 *       WO-APPSTORE-UI-DEMOTION 과도 충돌) → 컴포넌트·탭·API 클라이언트까지 함께 제거.
 *       30일 Cloud Run 로그의 호출은 전부 선행 WO smoke 트래픽(유기 0).
 *
 * ⚠ App Store canonical 축(`app_registry`, `/api/v1/admin/apps` READ, `/api/v1/appstore`,
 *   `/api/v1/apps/availability`, AppManager read)은 별개 축이며 이 retire 와 무관하다.
 *   단, 여기서 "ACTIVE" 로 적었던 ModuleLoader 는 후속
 *   WO-O4O-APP-MANAGEMENT-CANONICAL-MODEL-AND-RUNTIME-RESIDUE-CLOSURE-V1 에서
 *   실효 0(dynamic route 0 · entity 0)으로 확인돼 retire 됐다.
 *
 * 이 테스트는 **재등록 방지 계약**이다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REGISTER_ROUTES = path.join(SRC, 'bootstrap', 'register-routes.ts');
const ADMIN_DASHBOARD_SRC = path.resolve(SRC, '..', '..', 'admin-dashboard', 'src');

/** retire 된 15개 endpoint (문서화 고정값 — 재등록 시 diff 로 드러난다) */
const RETIRED_PROVISIONING_PATHS = [
  'GET /api/v1/service/templates',
  'GET /api/v1/service/templates/:id',
  'GET /api/v1/service/templates/:id/preview',
  'POST /api/v1/service/templates/:id/install',
  'GET /api/v1/service/templates/recommend/:serviceGroup',
  'POST /api/v1/service/create',
  'GET /api/v1/service/stats',
];

const RETIRED_SERVICE_ADMIN_PATHS = [
  'GET /api/v1/service-admin/summary',
  'GET /api/v1/service-admin/apps',
  'GET /api/v1/service-admin/theme',
  'PUT /api/v1/service-admin/theme',
  'POST /api/v1/service-admin/theme/reset',
  'GET /api/v1/service-admin/init-preview/:templateId',
  'GET /api/v1/service-admin/templates',
  'GET /api/v1/service-admin/stats',
];

describe('WO-O4O-SERVICE-PROVISIONING-CANONICAL-CONTRACT-AND-LEGACY-API-CLOSURE-V1', () => {
  const registerSrc = fs.readFileSync(REGISTER_ROUTES, 'utf-8');

  describe('retire 된 backend 파일이 되살아나지 않는다', () => {
    it.each([
      ['routes/service-provisioning.routes.ts', path.join(SRC, 'routes', 'service-provisioning.routes.ts')],
      ['routes/service-admin.routes.ts', path.join(SRC, 'routes', 'service-admin.routes.ts')],
      ['service-templates/ (디렉터리 전체)', path.join(SRC, 'service-templates')],
      ['validators/template-linter.ts', path.join(SRC, 'validators', 'template-linter.ts')],
      ['validators/initpack-linter.ts', path.join(SRC, 'validators', 'initpack-linter.ts')],
      ['services/theme-preset.service.ts', path.join(SRC, 'services', 'theme-preset.service.ts')],
      ['services/AppStoreService.ts (provisioning 전용 고아)', path.join(SRC, 'services', 'AppStoreService.ts')],
    ])('%s 는 존재하지 않는다', (_label, target) => {
      expect(fs.existsSync(target)).toBe(false);
    });
  });

  describe('mount 계약', () => {
    it('register-routes.ts 에 provisioning/service-admin 라우터 import 가 없다', () => {
      expect(registerSrc).not.toMatch(/from\s+'\.\.\/routes\/service-provisioning\.routes\.js'/);
      expect(registerSrc).not.toMatch(/from\s+'\.\.\/routes\/service-admin\.routes\.js'/);
    });

    it('register-routes.ts 가 service-templates 레지스트리를 import 하지 않는다', () => {
      expect(registerSrc).not.toMatch(/from\s+'\.\.\/service-templates\//);
    });

    it.each([
      ['/api/v1/service'],
      ['/api/v1/service-admin'],
    ])("'%s' 를 app.use 로 등록하지 않는다", (mountPath) => {
      const mountLines = registerSrc
        .split('\n')
        .filter((line) => /app\.use\(/.test(line) && !/^\s*\/\//.test(line));
      expect(mountLines.some((line) => line.includes(`'${mountPath}'`))).toBe(false);
    });

    it('retire 사유가 주석으로 남아 있다 (재등록 시 근거 확인용)', () => {
      expect(registerSrc).toContain('SERVICE_PROVISIONING_LEGACY_RETIRE');
    });

    it('retire 대상 endpoint 목록이 7 + 8 = 15 개로 고정돼 있다', () => {
      expect(RETIRED_PROVISIONING_PATHS).toHaveLength(7);
      expect(RETIRED_SERVICE_ADMIN_PATHS).toHaveLength(8);
    });
  });

  describe('frontend legacy 참조 0', () => {
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

    /**
     * retire 사유 주석은 남겨 둔다(재등록 시 근거 확인용).
     * 따라서 "실제 코드"만 스캔하도록 주석 줄을 제거한 뒤 검사한다.
     */
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
      ["'/service/templates'", /['"`]\/service\/templates/],
      ["'/service/create'", /['"`]\/service\/create/],
      ["'/service/stats'", /['"`]\/service\/stats/],
      ["'/service-admin/'", /['"`]\/service-admin\//],
    ])('admin-dashboard 에 %s 호출이 남아 있지 않다', (_label, pattern) => {
      const hits = files.filter((f) => pattern.test(codeOf(f)));
      expect(hits.map((f) => path.relative(ADMIN_DASHBOARD_SRC, f))).toEqual([]);
    });

    it('ServiceTemplateSelector 컴포넌트와 그 참조가 남아 있지 않다', () => {
      expect(fs.existsSync(path.join(ADMIN_DASHBOARD_SRC, 'components', 'apps', 'ServiceTemplateSelector.tsx'))).toBe(false);
      const hits = files.filter((f) => /ServiceTemplateSelector/.test(codeOf(f)));
      expect(hits.map((f) => path.relative(ADMIN_DASHBOARD_SRC, f))).toEqual([]);
    });
  });

  describe('App Store canonical 축은 영향을 받지 않는다', () => {
    it.each([
      ['/api/v1/appstore', 'appstoreRoutes'],
      ['/api/v1/apps', 'appAvailabilityRoutes'],
      ['/api/v1/admin/apps', 'adminAppsRoutes'],
    ])('%s mount 가 유지된다', (mountPath, routerName) => {
      expect(registerSrc).toContain(`app.use('${mountPath}', ${routerName});`);
    });

    // WO-O4O-APP-MANAGEMENT-CANONICAL-MODEL-AND-RUNTIME-RESIDUE-CLOSURE-V1:
    //   이 WO 당시 "별개 ACTIVE 축" 으로 유지를 단언했던 ModuleLoader 는 후속 전수조사에서
    //   모든 환경에서 dynamic route 0 · entity 0 으로 확인돼 함께 retire 됐다
    //   (production 이미지에 packages/ 가 없어 glob 결과 0, 로컬 재현에서도 17개 중 13개가
    //   manifest.id 부재로 거부되고 나머지 4개는 router export 0).
    //   따라서 "유지" 단언을 "재도입 안 함" 단언으로 뒤집는다. 근거는
    //   `app-management-runtime-residue-retirement.spec.ts` 와 CHECK 문서에 있다.
    it('ModuleLoader 는 부트 시 다시 도입되지 않는다', () => {
      expect(registerSrc).not.toContain("from '../modules/module-loader.js'");
      expect(registerSrc).not.toContain('moduleLoader.loadAll()');
    });
  });
});
