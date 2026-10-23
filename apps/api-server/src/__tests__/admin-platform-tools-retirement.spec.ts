import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const read = (path: string) => readFileSync(resolve(process.cwd(), 'src', path), 'utf8');

it('does not register the removed admin catalog or audience editing endpoints', () => {
  const routes = read('bootstrap/register-routes.ts');
  expect(routes).not.toContain('createAdminPlatformServicesRoutes');
  expect(routes).not.toContain("app.use('/api/v1/admin/platform-services'");
  expect(routes).toContain("app.use('/api/v1/platform-services', createPlatformServicesRoutes(dataSource))");
  expect(read('modules/neture/neture.routes.ts')).not.toContain('createAdminServiceAudienceController');
});
it('product supply, seller recruitment and listing flows do not consult the retired target policy', () => {
  for (const path of ['modules/neture/guards/drug-access.guard.ts', 'utils/auto-listing.utils.ts',
    'modules/neture/services/seller-recruitment.service.ts', 'modules/neture/services/supplier-offer-distribution.service.ts']) {
    const source = read(path);
    expect(source).not.toContain('service_audience_policies');
    expect(source).not.toContain('ServiceAudienceService');
    expect(source).not.toContain('c.is_regulated');
  }
});

// Other deployed service shells previously exposed the same retired editor.
it('other service entry points cannot restore role editing or advertise the removed policy page', () => {
  const readRepo = (path: string) => readFileSync(resolve(process.cwd(), '../..', path), 'utf8');
  const neture = readRepo('services/web-neture/src/App.tsx');
  expect(neture).not.toContain('<RoleManagementPage');
  expect(neture).toContain('<Route path="/admin/roles" element={<Navigate to="/admin" replace />} />');
  // WO-O4O-PHARMACY-BUSINESS-INDEPENDENCE-V1 D7: KPA 옛 운영/관리 화면(OperatorRoutes · operatorMenuGroups)은 제거됐다.
  expect(existsSync(resolve(process.cwd(), '../..', 'services/web-kpa-society/src/routes/OperatorRoutes.tsx'))).toBe(false);
  expect(readRepo('services/web-kpa-society/src/App.tsx')).not.toContain('RoleManagementPage');
  for (const app of ['web-neture']) {
    const menu = readRepo(`services/${app}/src/config/operatorMenuGroups.ts`);
    expect(menu).not.toMatch(/label: '역할 관리/);
    expect(menu).not.toContain('서비스 대상 정책 (플랫폼)');
  }
});

it('dashboard API actions do not advertise retired role editors', () => {
  expect(read('modules/neture/controllers/admin-dashboard.controller.ts')).not.toContain("link: '/admin/roles'");
  expect(read('routes/kpa/services/operator-dashboard.service.ts')).not.toContain("link: '/operator/roles'");
});
