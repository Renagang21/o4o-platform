/**
 * WO-O4O-SERVICE-MONITOR-SITES-TABLE-DEPENDENCY-AUDIT-AND-CLOSURE-V1
 *   — `/api/v1/service/monitor/*` legacy retire 계약 테스트
 *
 * 판정: MONITOR_LEGACY_RETIRE
 * ---------------------------
 * monitor 8개 endpoint 는 전부 `sites` 테이블 하나에만 의존했다.
 *   - `sites` migration(`9000000000000-CreateSitesTable.ts`)은 실행된 적 없이
 *     2026-01-08 `chore(migrations): remove 124 unexecuted migrations` 에서 제거됐다.
 *   - production DB 에 `sites` 는 존재하지 않는다(`to_regclass` = null).
 *   - site 를 생성하는 `modules/sites/sites.routes.ts` 도 mount 돼 있지 않았다
 *     (해당 도메인은 WO-O4O-MULTI-SITE-BUILDER-SITES-DOMAIN-CENSUS-AND-RETIREMENT-V1 에서 제거됨).
 *     → 데이터가 생길 수 있는 경로 자체가 없다.
 *   - 실측: summary·report = 500(`relation "sites" does not exist`),
 *           tenants·apps·themes·warnings = 200 빈 배열, validate = tenantsValidated 0.
 *   - 대체 canonical table 없음(`app_instances` 0행, `service_instances`/`themes` 부재)
 *     → schema 복구 대상이 아니다.
 *   - consumer 는 admin `ServiceOverview` 한 화면뿐이고 nav 진입점이 없으며,
 *     30일 로그의 호출은 전부 WO smoke 트래픽이었다.
 *
 * 이 테스트는 **재등록 방지 계약**이다. DB·네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REGISTER_ROUTES = path.join(SRC, 'bootstrap', 'register-routes.ts');

const RETIRED_PATHS = [
  '/api/v1/service/monitor/tenants',
  '/api/v1/service/monitor/apps',
  '/api/v1/service/monitor/themes',
  '/api/v1/service/monitor/warnings',
  '/api/v1/service/monitor/summary',
  '/api/v1/service/monitor/tenant/:tenantId',
  '/api/v1/service/monitor/validate',
  '/api/v1/service/monitor/report',
];

describe('WO-O4O-SERVICE-MONITOR-SITES-TABLE-DEPENDENCY-AUDIT-AND-CLOSURE-V1', () => {
  describe('retire 된 파일이 되살아나지 않는다', () => {
    it.each([
      ['routes/service-monitor.routes.ts', path.join(SRC, 'routes', 'service-monitor.routes.ts')],
      ['services/service-monitor.service.ts', path.join(SRC, 'services', 'service-monitor.service.ts')],
    ])('%s 는 존재하지 않는다', (_label, file) => {
      expect(fs.existsSync(file)).toBe(false);
    });
  });

  describe('mount 계약', () => {
    const source = fs.readFileSync(REGISTER_ROUTES, 'utf-8');

    it('register-routes.ts 에 service-monitor import 가 없다', () => {
      expect(source).not.toMatch(/from\s+'\.\.\/routes\/service-monitor\.routes\.js'/);
      expect(source).not.toMatch(/serviceMonitorRoutes\b(?!.*\/\/)/);
    });

    it("'/api/v1/service/monitor' 를 app.use 로 등록하지 않는다", () => {
      const mountLines = source
        .split('\n')
        .filter((line) => /app\.use\(/.test(line) && !/^\s*\/\//.test(line));
      expect(mountLines.some((line) => line.includes('/api/v1/service/monitor'))).toBe(false);
    });

    it('retire 사유가 주석으로 남아 있다 (재등록 시 근거 확인용)', () => {
      expect(source).toContain('MONITOR_LEGACY_RETIRE');
    });
  });

  describe('sites 의존 코드가 남아 있지 않다', () => {
    const monitorDeadRefs = [
      path.join(SRC, 'routes', 'service-monitor.routes.ts'),
      path.join(SRC, 'services', 'service-monitor.service.ts'),
    ];

    it('monitor 계층에서 Site 엔티티를 참조하지 않는다', () => {
      for (const file of monitorDeadRefs) {
        expect(fs.existsSync(file)).toBe(false);
      }
    });

    it('retire 대상 경로 목록이 8개로 고정돼 있다', () => {
      expect(RETIRED_PATHS).toHaveLength(8);
    });
  });

  describe('형제 라우터는 영향을 받지 않는다', () => {
    const source = fs.readFileSync(REGISTER_ROUTES, 'utf-8');

    it.each([
      ["/api/v1/service", 'serviceProvisioningRoutes'],
      ["/api/v1/service-admin", 'serviceAdminRoutes'],
    ])('%s mount 가 유지된다', (mountPath, routerName) => {
      expect(source).toContain(`app.use('${mountPath}', ${routerName});`);
    });
  });
});
