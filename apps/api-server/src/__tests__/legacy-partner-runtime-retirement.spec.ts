/**
 * Legacy Partner runtime 은퇴 — dead-reference guard
 *
 * WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1
 * 상위 정본: docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md §7
 *   CURRENT PARTNER = FULL RETIREMENT / FUTURE PARTNER = GREENFIELD
 *
 * 고정하는 것:
 *   1) Legacy Partner 백엔드 모듈·라우트·엔티티·서비스 파일이 존재하지 않는다
 *   2) `/api/partner` · `/api/v1/partner` mount 가 없다 (register-routes)
 *   3) Legacy Partner 엔티티가 DataSource 에 등록되지 않는다
 *   4) `neture:partner` scope 가 security-core 에 없다
 *   5) 판매자 모집(Seller Recruitment)은 **보존**된다 — canonical mount `/seller-recruitment` + 배포 창 alias `/partner`
 *   6) 판매자 모집 승인은 Legacy Partner 계약·role·대시보드를 만들지 않는다
 *   7) Foreign Visitor Partner(Store Ops) 는 무변경 보존
 *
 * 물리 DB(테이블·컬럼·enum)·dead package(partner-core · financial-core) 는 후속
 * WO-O4O-LEGACY-PARTNER-PHYSICAL-SCHEMA-AND-DEPENDENCY-CLEANUP-V1 대상이라 여기서 고정하지 않는다.
 */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const REPO = resolve(__dirname, '../../../..');
const read = (p: string) => readFileSync(resolve(REPO, p), 'utf8');
/** 주석 제거 — 은퇴 경위를 적은 주석은 남아 있으므로 코드 본문만 본다. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

describe('WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT — Legacy Partner runtime = 0', () => {
  it.each([
    'apps/api-server/src/modules/partner',
    'apps/api-server/src/routes/partner.routes.ts',
    'apps/api-server/src/controllers/partner',
    'apps/api-server/src/modules/neture/controllers/partner.controller.ts',
    'apps/api-server/src/modules/neture/controllers/partner-dashboard.controller.ts',
    'apps/api-server/src/modules/neture/controllers/partner-commerce.controller.ts',
    'apps/api-server/src/modules/neture/controllers/partner-recruitment.controller.ts',
    'apps/api-server/src/modules/neture/controllers/admin-partner.controller.ts',
    'apps/api-server/src/modules/neture/controllers/operator-partner.controller.ts',
    'apps/api-server/src/modules/neture/controllers/supplier-contract.controller.ts',
    'apps/api-server/src/modules/neture/services/partner.service.ts',
    'apps/api-server/src/modules/neture/services/partner-commission.service.ts',
    'apps/api-server/src/modules/neture/services/partner-contract.service.ts',
    'apps/api-server/src/modules/neture/services/partnership.service.ts',
    'apps/api-server/src/modules/neture/services/neture-partner-service-application.service.ts',
    'apps/api-server/src/modules/neture/entities/NeturePartnerRecruitment.entity.ts',
    'apps/api-server/src/modules/neture/entities/NeturePartnerApplication.entity.ts',
    'apps/api-server/src/modules/neture/entities/NeturePartnerDashboardItem.entity.ts',
    'apps/api-server/src/modules/neture/entities/NeturePartnerDashboardItemContent.entity.ts',
    'apps/api-server/src/modules/neture/entities/NeturePartnershipRequest.entity.ts',
    'apps/api-server/src/modules/neture/entities/NeturePartnershipProduct.entity.ts',
    'apps/api-server/src/modules/neture/entities/NetureSellerPartnerContract.entity.ts',
    'apps/api-server/src/routes/neture/entities/neture-partner.entity.ts',
    'packages/types/src/partner.ts',
    'packages/types/src/affiliate.ts',
    'packages/ui/src/layout/AGStorefrontLayout.tsx',
    'services/web-neture/src/pages/partner',
    'services/web-neture/src/pages/partners',
    'services/web-neture/src/components/layouts/PartnerSpaceLayout.tsx',
    'services/web-neture/src/components/layouts/PartnerAccountLayout.tsx',
    'services/web-neture/src/lib/api/partner.ts',
    'services/web-neture/src/lib/referral.ts',
    'apps/admin-dashboard/src/pages/neture/PartnerListPage.tsx',
    'apps/admin-dashboard/src/pages/neture/PartnershipRequestListPage.tsx',
  ])('은퇴 파일이 되살아나지 않는다: %s', (p) => {
    expect(existsSync(resolve(REPO, p))).toBe(false);
  });

  it('`/api/partner` · `/api/v1/partner` mount 가 없다', () => {
    const c = code('apps/api-server/src/bootstrap/register-routes.ts');
    expect(c).not.toMatch(/app\.use\(\s*['"]\/api\/partner['"]/);
    expect(c).not.toMatch(/app\.use\(\s*['"]\/api\/v1\/partner['"]/);
    expect(c).not.toMatch(/\bpartnerRoutes\b|\bpartnerDashboardRoutes\b/);
  });

  it('Legacy Partner 엔티티가 DataSource 에 등록되지 않는다', () => {
    const c = code('apps/api-server/src/database/entities.ts');
    for (const name of [
      'NeturePartner', 'NeturePartnerRecruitment', 'NeturePartnerApplication', 'NeturePartnerDashboardItem',
      'NeturePartnerDashboardItemContent', 'NeturePartnershipRequest', 'NeturePartnershipProduct',
      'NetureSellerPartnerContract', 'PartnerContent', 'PartnerEvent', 'PartnerTarget',
    ]) {
      expect(c).not.toMatch(new RegExp(`\\b${name}\\b`));
    }
  });

  it("security-core NETURE_SCOPE_CONFIG 에 'neture:partner' 가 없다", () => {
    const c = code('packages/security-core/src/service-configs.ts');
    expect(c).not.toContain("'neture:partner'");
  });

  it("roles.ts 에 partner role 카탈로그가 없다 (neture:partner · cosmetics:partner · bare partner)", () => {
    const c = code('apps/api-server/src/types/roles.ts');
    expect(c).not.toMatch(/'neture:partner'|'cosmetics:partner'|'partner':/);
  });

  it('Neture 가입 신청은 supplier 만 허용한다', () => {
    const c = code('apps/api-server/src/modules/auth/controllers/auth-register.controller.ts');
    expect(c).toContain("NETURE_ALLOWED_SIGNUP_ROLES = ['supplier']");
  });
});

describe('Seller Recruitment (판매자 모집) — Partner 가 아니므로 보존된다', () => {
  it('SellerRecruitment 엔티티 2종이 존재하고 legacy 물리 테이블을 seam 으로 격리한다', () => {
    const r = read('apps/api-server/src/modules/neture/entities/SellerRecruitment.entity.ts');
    const a = read('apps/api-server/src/modules/neture/entities/SellerRecruitmentApplication.entity.ts');
    expect(r).toContain("SELLER_RECRUITMENT_TABLE = 'neture_partner_recruitments'");
    expect(a).toContain("SELLER_RECRUITMENT_APPLICATION_TABLE = 'neture_partner_applications'");
    const ent = code('apps/api-server/src/database/entities.ts');
    expect(ent).toMatch(/\bSellerRecruitment\b/);
    expect(ent).toMatch(/\bSellerRecruitmentApplication\b/);
  });

  it('canonical mount /seller-recruitment 와 배포 창 alias /partner 가 같은 라우터를 쓴다', () => {
    // 양성 매칭이므로 주석 제거 없이 원문을 본다 (주석 안의 `/*` 경로 표기가 stripper 를 오작동시킨다)
    const c = read('apps/api-server/src/modules/neture/neture.routes.ts');
    expect(c).toMatch(/router\.use\(\s*'\/seller-recruitment',\s*sellerRecruitmentRouter\s*\)/);
    expect(c).toMatch(/router\.use\(\s*'\/partner',\s*sellerRecruitmentRouter\s*\)/);
  });

  it('SellerRecruitmentService 는 Legacy Partner 계약·role·대시보드·neture_partners 를 만들지 않는다', () => {
    const c = code('apps/api-server/src/modules/neture/services/seller-recruitment.service.ts');
    expect(c).not.toMatch(/neture_seller_partner_contracts|NetureSellerPartnerContract/);
    expect(c).not.toMatch(/NeturePartnerDashboardItem|neture_partner_dashboard_items/);
    expect(c).not.toMatch(/roleAssignmentService|assignRole/);
    expect(c).not.toMatch(/neture\.neture_partners|NeturePartner\b/);
    // 승인 결과 = C bridge (allowed_seller_ids + OPL)
    expect(c).toContain('allowed_seller_ids');
    expect(c).toContain("'seller_recruitment'");
  });

  it('매장 3서비스 web 이 새 canonical 경로를 소비한다', () => {
    for (const p of [
      'services/web-kpa-society/src/pages/pharmacy/SellerRecruitmentsBrowsePage.tsx',
      'services/web-kpa-society/src/pages/pharmacy/StoreRecruitmentApplicationsPage.tsx',
      'services/web-pharmacy-hub/src/pages/store-owner/RecruitmentApplicationsPage.tsx',
      'services/web-k-cosmetics/src/pages/store/StoreRecruitmentApplicationsPage.tsx',
      'services/web-neture/src/lib/api/supplier.ts',
    ]) {
      const c = code(p);
      expect(c).toContain('/neture/seller-recruitment/');
      expect(c).not.toContain('/neture/partner/');
    }
  });
});

describe('Foreign Visitor Partner (Store Ops) 는 무변경 보존', () => {
  it.each([
    'apps/api-server/src/modules/foreign-visitor-partner/foreign-visitor-partner.entity.ts',
    'apps/api-server/src/modules/foreign-visitor-partner/foreign-visitor-partner.routes.ts',
    'apps/api-server/src/modules/foreign-visitor-partner/foreign-visitor-partner-qr-code.routes.ts',
  ])('%s 존재', (p) => {
    expect(existsSync(resolve(REPO, p))).toBe(true);
  });

  it('mount 유지', () => {
    const c = code('apps/api-server/src/bootstrap/register-routes.ts');
    expect(c).toContain("'/api/v1/foreign-visitor/partners'");
  });
});
