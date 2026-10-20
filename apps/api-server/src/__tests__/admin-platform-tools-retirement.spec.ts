import { readFileSync } from 'node:fs';
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
