/** PR #349: legacy service recruitments remain usable; semi-franchise rows require their own membership. No DB connection. */
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn() } }));
jest.mock('../modules/neture/entities/index.js', () => ({
  SellerRecruitment: class {}, SellerRecruitmentApplication: class {},
  RecruitmentStatus: { RECRUITING: 'recruiting' }, ExposureStatus: { APPROVED: 'approved' },
  ApplicationStatus: { PENDING: 'pending' },
  SELLER_RECRUITMENT_TABLE: 'seller_recruitments', SELLER_RECRUITMENT_APPLICATION_TABLE: 'seller_recruitment_applications',
}));
jest.mock('../modules/neture/services/service-audience.service.js', () => ({}));
jest.mock('../services/NotificationService.js', () => ({ notificationService: {} }));
jest.mock('../modules/neture/middleware/supplier-context.resolver.js', () => ({}));

import { AppDataSource } from '../database/connection.js';
import { SellerRecruitmentService } from '../modules/neture/services/seller-recruitment.service.js';

const row = (id: string, semiFranchiseId: string | null) => ({
  id, semiFranchiseId, serviceId: 'kpa-society', status: 'recruiting', exposureStatus: 'approved',
  consumerPrice: 100, commissionRate: 0,
});

describe('recruitment row membership', () => {
  let service: SellerRecruitmentService;
  let recruitmentRepo: any;
  let applicationRepo: any;
  const query = AppDataSource.query as jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
    query.mockResolvedValue([]);
    recruitmentRepo = { find: jest.fn().mockResolvedValue([row('legacy', null), row('pharmacy', 'sf-pharmacy'), row('other', 'sf-other')]), findOne: jest.fn() };
    applicationRepo = { findOne: jest.fn().mockResolvedValue(null), create: jest.fn((x) => x), save: jest.fn(async (x) => ({ ...x, id: 'application' })) };
    service = new SellerRecruitmentService();
    (service as any)._recruitmentRepo = recruitmentRepo;
    (service as any)._applicationRepo = applicationRepo;
  });

  it('unjoined KPA store still sees legacy recruitment in a mixed list', async () => {
    expect((await service.getRecruitments({ serviceKey: 'kpa-society', storeOrganizationId: 'org-a' })).map((r) => r.id)).toEqual(['legacy']);
    expect(query.mock.calls[0][1]).toEqual(['org-a']);
    expect(query.mock.calls[0][0]).toContain("npm.status = 'active'");
    expect(query.mock.calls[0][0]).toContain("sf.status = 'active'");
    expect(query.mock.calls[0][0]).toContain("sfm.status = 'active'");
  });
  it('membership in a different semi-franchise does not unlock pharmacy recruitment', async () => {
    query.mockResolvedValue([{ semi_franchise_id: 'sf-other' }]);
    expect((await service.getRecruitments({ storeOrganizationId: 'org-a' })).map((r) => r.id)).toEqual(['legacy', 'other']);
  });
  it('matching active membership unlocks exactly that row', async () => {
    query.mockResolvedValue([{ semi_franchise_id: 'sf-pharmacy' }]);
    expect((await service.getRecruitments({ storeOrganizationId: 'org-a' })).map((r) => r.id)).toEqual(['legacy', 'pharmacy']);
  });
  it('missing store context fails closed for semi-franchise rows while retaining legacy rows', async () => {
    expect((await service.getRecruitments({ storeOrganizationId: '' })).map((r) => r.id)).toEqual(['legacy']);
    expect(query).not.toHaveBeenCalled();
  });
  it('legacy-only browse needs no new ledger query', async () => {
    recruitmentRepo.find.mockResolvedValue([row('legacy', null)]);
    expect(await service.getRecruitments({ storeOrganizationId: 'org-a' })).toHaveLength(1);
    expect(query).not.toHaveBeenCalled();
  });
  it('supplier/public listing without store scope retains its existing contract', async () => {
    expect(await service.getRecruitments({ serviceKey: 'kpa-society' })).toHaveLength(3);
    expect(query).not.toHaveBeenCalled();
  });
  it('legacy application remains available without pharmacy membership', async () => {
    recruitmentRepo.findOne.mockResolvedValue(row('legacy', null));
    await expect(service.createApplication('legacy', 'user-a', 'Applicant')).resolves.toMatchObject({ id: 'application', status: 'pending' });
    expect(query).not.toHaveBeenCalled();
    expect(applicationRepo.save).toHaveBeenCalledTimes(1);
  });
  it('direct POST to semi-franchise recruitment rejects an unjoined applicant before writing', async () => {
    recruitmentRepo.findOne.mockResolvedValue(row('other', 'sf-other'));
    await expect(service.createApplication('other', 'user-a', 'Applicant')).rejects.toThrow('SEMI_FRANCHISE_MEMBERSHIP_REQUIRED');
    expect(query.mock.calls[0][1]).toEqual(['user-a', 'sf-other', ['owner', 'admin', 'manager']]);
    expect(query.mock.calls[0][0]).toContain('AND sf.id = $2');
    expect(query.mock.calls[0][0]).toContain('om.left_at IS NULL');
    expect(query.mock.calls[0][0]).toContain("npm.status = 'active'");
    expect(query.mock.calls[0][0]).toContain("sfm.status = 'active'");
    expect(query.mock.calls[0][0]).toContain("sf.status = 'active'");
    expect(applicationRepo.save).not.toHaveBeenCalled();
  });
  it('actual semi-franchise membership permits application', async () => {
    recruitmentRepo.findOne.mockResolvedValue(row('other', 'sf-other'));
    query.mockResolvedValue([{ id: 'membership' }]);
    await expect(service.createApplication('other', 'user-a', 'Applicant')).resolves.toMatchObject({ status: 'pending' });
  });
  it('membership lookup failure does not save an application', async () => {
    recruitmentRepo.findOne.mockResolvedValue(row('other', 'sf-other'));
    query.mockRejectedValueOnce(new Error('unavailable'));
    await expect(service.createApplication('other', 'user-a', 'Applicant')).rejects.toThrow('unavailable');
    expect(applicationRepo.save).not.toHaveBeenCalled();
  });
  it.each([{ status: 'closed', exposureStatus: 'approved' }, { status: 'recruiting', exposureStatus: 'pending' }])('existing exposure/status guards remain enforced: %j', async (state) => {
    recruitmentRepo.findOne.mockResolvedValue({ ...row('legacy', null), ...state });
    await expect(service.createApplication('legacy', 'user-a', 'Applicant')).rejects.toThrow();
    expect(applicationRepo.save).not.toHaveBeenCalled();
  });
});
