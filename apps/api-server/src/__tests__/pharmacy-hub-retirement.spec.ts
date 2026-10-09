import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getService } from '../config/service-catalog';
import { listSupplierContentHandoffTargets } from '../modules/neture/constants/supplier-content-handoff-targets';

const root = resolve(__dirname, '../../../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('PharmacyHub retirement', () => {
  it('removes the web app and dedicated API while preserving historical migrations', () => {
    for (const path of ['services/web-pharmacy-hub/package.json', 'apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts']) {
      expect(existsSync(resolve(root, path))).toBe(false);
    }
    expect(read('apps/api-server/src/bootstrap/register-routes.ts')).not.toContain('createPharmacyHubRoutes');
    expect(existsSync(resolve(root, 'apps/api-server/src/database/migrations/20270216000000-SeedPharmacyHubServiceAndRoles.ts'))).toBe(true);
  });
  it('closes workspace and supplier entry points without deleting historical identity', () => {
    expect(getService('pharmacy-hub')).toMatchObject({ joinEnabled: false, workspace: { storeWorkspaceEnabled: false, operatorWorkspaceEnabled: false } });
    expect(listSupplierContentHandoffTargets().map(service => service.key)).not.toContain('pharmacy-hub');
    expect(read('services/web-store/src/App.tsx')).not.toContain('PhPaymentSuccessPage');
    expect(read('services/web-neture/src/App.tsx')).not.toContain('SupplierServiceDeliveryPage');
  });
  it('cannot recreate the retired web server through deployment automation', () => {
    expect(read('.github/workflows/deploy-web-services.yml')).not.toContain('deploy-pharmacy-hub:');
    expect(read('scripts/ci/deploy-risk.mjs')).not.toContain("'pharmacy-hub': 'pharmacy-hub-web'");
    expect(read('scripts/ci/detect-affected.mjs')).not.toContain("dir: 'services/web-pharmacy-hub'");
  });
});
