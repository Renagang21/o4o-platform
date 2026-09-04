/**
 * WO-O4O-FINAL-CODE-ONLY-RETIREMENT-CLOSURE-V1
 *   — code-only 은퇴 4축 재도입 방지 guard
 *
 * 선행 census (`WO-O4O-POST-CLEANUP-FINAL-RESIDUE-AND-CLOSURE-CENSUS-V1`) 가
 * `RETIRE_READY` 로 남긴 code-only 축을 실행한 뒤의 계약을 고정한다.
 *
 * 축 B. Neture admin 전용 승인 표면 은퇴 (canonical = operator)
 * 축 C. stores/:slug/channels/b2c activate·deactivate route 은퇴
 *       (organization_channels 의 row 는 DB 변경 0 — schema·데이터는 그대로다)
 * 축 D·E. cosmetics-seller-extension 패키지·카탈로그 항목 은퇴는
 *       `shortcode-domain-retirement.spec.ts` 8번 describe 로 승격해 단언한다.
 *
 * 은퇴이지 교체가 아니다. 호환 shim · 우회 route · placeholder 화면을 만들지 않았다.
 * raw-source 로 단언한다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const abs = (rel: string) => path.join(REPO_ROOT, ...rel.split('/'));
const read = (rel: string) => fs.readFileSync(abs(rel), 'utf-8');
const exists = (rel: string) => fs.existsSync(abs(rel));

describe('B. Neture admin 전용 승인 표면이 은퇴했다', () => {
  const ADMIN_CONTROLLER = 'apps/api-server/src/modules/neture/controllers/admin.controller.ts';

  it('admin 승인/반려 route 가 없다', () => {
    const src = read(ADMIN_CONTROLLER);
    for (const route of [
      "'/suppliers/pending'",
      "'/suppliers/:id/approve'",
      "'/suppliers/:id/reject'",
      "'/products/pending'",
      "'/products/:id/approve'",
      "'/products/:id/reject'",
      "'/products/batch-approve'",
      "'/products/batch-reject'",
    ]) {
      expect(src).not.toContain(route);
    }
  });

  it('admin governance route 는 보존한다 (승인 축과 다른 active 기능)', () => {
    const src = read(ADMIN_CONTROLLER);
    expect(src).toContain("'/suppliers/governance'");
    expect(src).toContain("'/suppliers/:id/deactivate'");
    expect(src).toContain("'/suppliers/:id/reactivate'");
    expect(src).toContain("'/suppliers'");
  });

  it('operator canonical 승인 경로는 그대로 살아 있다', () => {
    expect(exists('apps/api-server/src/modules/neture/controllers/operator-supplier.controller.ts')).toBe(true);
    expect(exists('apps/api-server/src/modules/neture/controllers/operator-product-approval.controller.ts')).toBe(true);
    const service = read('apps/api-server/src/modules/neture/neture.service.ts');
    for (const fn of ['approveSupplier', 'rejectSupplier', 'approveProduct', 'rejectProduct']) {
      expect(service).toContain(fn);
    }
  });

  it('admin 전용 승인 화면이 없다', () => {
    expect(exists('services/web-neture/src/pages/admin/AdminProductApprovalPage.tsx')).toBe(false);
    expect(exists('apps/admin-dashboard/src/pages/neture/ProductApprovalQueuePage.tsx')).toBe(false);
    expect(read('services/web-neture/src/App.tsx')).not.toContain('/admin/product-approvals');
    expect(read('apps/admin-dashboard/src/pages/neture/NetureRouter.tsx')).not.toContain('ProductApprovalQueuePage');
  });

  it('operator 승인 화면·진입점은 보존한다', () => {
    expect(exists('services/web-neture/src/pages/operator/OperatorProductApprovalPage.tsx')).toBe(true);
    expect(read('services/web-neture/src/App.tsx')).toContain('/operator/product-approvals');
    expect(read('services/web-neture/src/config/operatorMenuGroups.ts')).toContain('/operator/product-approvals');
  });

  it('admin 승인 API client method 가 없다 (operator client 는 보존)', () => {
    const api = read('services/web-neture/src/lib/api/admin.ts');
    expect(api).not.toContain('export const adminProductApi');
    expect(api).toContain('export const operatorSupplierApi');
    expect(read('services/web-neture/src/lib/api/index.ts')).not.toContain('adminProductApi');

    const supplierList = read('apps/admin-dashboard/src/pages/neture/SupplierListPage.tsx');
    expect(supplierList).not.toContain('/approve');
    expect(supplierList).not.toContain('/reject');
    expect(supplierList).toContain('/deactivate');
  });
});

describe('C. stores/:slug/channels/b2c route 가 은퇴했다', () => {
  const STORE_POLICY = 'apps/api-server/src/routes/platform/store-policy.routes.ts';

  it('activate · deactivate route 가 없다', () => {
    const src = read(STORE_POLICY);
    expect(src).not.toContain("'/:slug/channels/b2c/activate'");
    expect(src).not.toContain("'/:slug/channels/b2c/deactivate'");
  });

  it('우회 route 를 만들지 않았다', () => {
    // 은퇴 사유 주석에는 경로 문자열이 남는다. 코드 라인만 대상으로 판정한다.
    const code = read(STORE_POLICY)
      .split(/\r?\n/)
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n');
    expect(code).not.toContain('channels/b2c');
  });

  it('policy · payment-config · slug 축은 보존한다', () => {
    const src = read(STORE_POLICY);
    expect(src).toContain("'/:slug/policies'");
    expect(src).toContain("'/:slug/payment-config'");
    expect(src).toContain("'/:slug/slug'");
  });

  it('organization_channels schema 는 코드에서 유지된다 (DB 변경 0)', () => {
    // 은퇴는 route 축뿐이다. entity/migration 을 지우면 실제 schema 와 어긋난다.
    const grepRoot = path.join(REPO_ROOT, 'apps/api-server/src/database/migrations');
    const hit = fs
      .readdirSync(grepRoot)
      .some((f) => fs.readFileSync(path.join(grepRoot, f), 'utf-8').includes('organization_channels'));
    expect(hit).toBe(true);
  });
});
