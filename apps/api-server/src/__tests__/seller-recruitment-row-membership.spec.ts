/** 약국 미지정 모집은 pharmacy, 지정 모집은 해당 사업 가입이 필요하다. */
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), error: jest.fn() } }));
jest.mock('../modules/neture/entities/index.js', () => ({
  SellerRecruitment: class {}, SellerRecruitmentApplication: class {},
  RecruitmentStatus: { RECRUITING: 'recruiting' }, ExposureStatus: { APPROVED: 'approved' },
  ApplicationStatus: { PENDING: 'pending', CANCELLED: 'cancelled' },
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

  it('미가입 약국은 미지정 모집을 포함한 모든 사업 모집을 볼 수 없다', async () => {
    expect((await service.getRecruitments({ serviceKey: 'kpa-society', storeOrganizationId: 'org-a' })).map((r) => r.id)).toEqual([]);
    expect(query.mock.calls[0][1]).toEqual(['org-a']);
    expect(query.mock.calls[0][0]).toContain("npm.status = 'active'");
    expect(query.mock.calls[0][0]).toContain("sf.status = 'active'");
    expect(query.mock.calls[0][0]).toContain("sfm.status = 'active'");
  });
  it('membership in a different semi-franchise does not unlock pharmacy recruitment', async () => {
    query.mockResolvedValue([{ semi_franchise_id: 'sf-other' }]);
    expect((await service.getRecruitments({ storeOrganizationId: 'org-a' })).map((r) => r.id)).toEqual(['other']);
  });
  it('matching active membership unlocks exactly that row', async () => {
    query.mockResolvedValue([{ semi_franchise_id: 'sf-pharmacy', key: 'pharmacy' }]);
    expect((await service.getRecruitments({ storeOrganizationId: 'org-a' })).map((r) => r.id)).toEqual(['legacy', 'pharmacy']);
  });
  it('매장 문맥이 없으면 미지정 모집도 차단한다', async () => {
    expect((await service.getRecruitments({ storeOrganizationId: '' })).map((r) => r.id)).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
  it('미지정 모집만 있어도 pharmacy 가입을 조회한다', async () => {
    recruitmentRepo.find.mockResolvedValue([row('legacy', null)]);
    expect(await service.getRecruitments({ storeOrganizationId: 'org-a' })).toHaveLength(0);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('supplier/public listing without store scope retains its existing contract', async () => {
    expect(await service.getRecruitments({ serviceKey: 'kpa-society' })).toHaveLength(3);
    expect(query).not.toHaveBeenCalled();
  });
  it('미지정 약국 모집에 직접 신청해도 pharmacy 가입이 필요하다', async () => {
    recruitmentRepo.findOne.mockResolvedValue(row('legacy', null));
    await expect(service.createApplication('legacy', 'user-a', 'Applicant', 'org-a')).rejects.toThrow('SEMI_FRANCHISE_MEMBERSHIP_REQUIRED');
    expect(query.mock.calls[0][1][1]).toBeNull();
    expect(applicationRepo.save).not.toHaveBeenCalled();
  });
  it('direct POST to semi-franchise recruitment rejects an unjoined applicant before writing', async () => {
    recruitmentRepo.findOne.mockResolvedValue(row('other', 'sf-other'));
    await expect(service.createApplication('other', 'user-a', 'Applicant', 'org-a')).rejects.toThrow('SEMI_FRANCHISE_MEMBERSHIP_REQUIRED');
    expect(query.mock.calls[0][1]).toEqual(['user-a', 'sf-other', ['owner', 'admin', 'manager'], 'org-a']);
    expect(query.mock.calls[0][0]).toContain('sf.id = $2');
    expect(query.mock.calls[0][0]).toContain('om.left_at IS NULL');
    expect(query.mock.calls[0][0]).toContain("npm.status = 'active'");
    expect(query.mock.calls[0][0]).toContain("sfm.status = 'active'");
    expect(query.mock.calls[0][0]).toContain("sf.status = 'active'");
    expect(applicationRepo.save).not.toHaveBeenCalled();
  });
  it('actual semi-franchise membership permits application', async () => {
    recruitmentRepo.findOne.mockResolvedValue(row('other', 'sf-other'));
    query.mockResolvedValue([{ id: 'membership' }]);
    await expect(service.createApplication('other', 'user-a', 'Applicant', 'org-a')).resolves.toMatchObject({ status: 'pending' });
    expect(applicationRepo.create).toHaveBeenCalledWith(expect.objectContaining({ applicantOrganizationId: 'org-a' }));
  });
  it('authorized organizations apply independently and another user cannot duplicate the same organization', async () => {
    recruitmentRepo.findOne.mockResolvedValue(row('other', 'sf-other'));
    query.mockResolvedValue([{ id: 'membership' }]);
    const applications: any[] = [];
    applicationRepo.findOne.mockImplementation(async ({ where }: any) => applications.find(app =>
      app.recruitmentId === where.recruitmentId && app.applicantOrganizationId === where.applicantOrganizationId,
    ) ?? null);
    applicationRepo.save.mockImplementation(async (app: any) => { applications.push(app); return { ...app, id: String(applications.length) }; });
    await expect(service.createApplication('other', 'user-a', 'Applicant', 'org-a')).resolves.toHaveProperty('id', '1');
    await expect(service.createApplication('other', 'user-a', 'Applicant', 'org-b')).resolves.toHaveProperty('id', '2');
    await expect(service.createApplication('other', 'user-b', 'Applicant', 'org-a')).rejects.toThrow('DUPLICATE_APPLICATION');
    expect(applications).toHaveLength(2);
  });
  it('organization-less service applications retain user uniqueness only within their legacy scope', async () => {
    recruitmentRepo.findOne.mockResolvedValue({ ...row('legacy', null), serviceId: 'other-service' });
    applicationRepo.findOne.mockResolvedValue({ id: 'existing' });
    await expect(service.createApplication('legacy', 'user-a', 'Applicant')).rejects.toThrow('DUPLICATE_APPLICATION');
    expect(applicationRepo.findOne).toHaveBeenCalledWith({ where: {
      recruitmentId: 'legacy', applicantId: 'user-a', applicantOrganizationId: expect.objectContaining({ _type: 'isNull' }),
    } });
    expect(applicationRepo.save).not.toHaveBeenCalled();
  });
  it.each(['uq_seller_recruitment_applications_org', 'uq_seller_recruitment_applications_legacy_applicant'])('concurrent duplicate %s has the same application conflict', async constraint => {
    recruitmentRepo.findOne.mockResolvedValue(row('other', 'sf-other'));
    query.mockResolvedValue([{ id: 'membership' }]);
    applicationRepo.save.mockRejectedValue({ driverError: { code: '23505', constraint } });
    await expect(service.createApplication('other', 'user-a', 'Applicant', 'org-a')).rejects.toThrow('DUPLICATE_APPLICATION');
  });
  it('unrelated persistence failures are propagated', async () => {
    recruitmentRepo.findOne.mockResolvedValue(row('other', 'sf-other'));
    query.mockResolvedValue([{ id: 'membership' }]);
    applicationRepo.save.mockRejectedValue(new Error('storage unavailable'));
    await expect(service.createApplication('other', 'user-a', 'Applicant', 'org-a')).rejects.toThrow('storage unavailable');
  });
  it('application history binds the selected organization or the organization-less legacy scope', async () => {
    query.mockResolvedValue([]);
    await service.getApplicationsForApplicant('user-a', 'org-a');
    expect(query.mock.calls[0][1]).toEqual(['user-a', 'org-a']);
    expect(query.mock.calls[0][0]).toContain('a.applicant_organization_id = $2::uuid');
    await service.getApplicationsForApplicant('user-a');
    expect(query.mock.calls[1][1]).toEqual(['user-a', null]);
    expect(query.mock.calls[1][0]).toContain('a.applicant_organization_id IS NULL');
  });
  it('a request in another store cannot cancel even the same user’s application', async () => {
    applicationRepo.findOne.mockResolvedValue({ id: 'app', applicantId: 'user-a', applicantOrganizationId: 'org-a', status: 'pending' });
    await expect(service.cancelApplication('app', 'user-a', 'org-b')).resolves.toEqual({ success: false, error: 'NOT_OWNER' });
    expect(applicationRepo.save).not.toHaveBeenCalled();
    await expect(service.cancelApplication('app', 'user-a', 'org-a')).resolves.toMatchObject({ success: true });
    expect(applicationRepo.save).toHaveBeenCalledTimes(1);
    expect(applicationRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled', decidedBy: 'user-a' }));
  });
  it('membership lookup failure does not save an application', async () => {
    recruitmentRepo.findOne.mockResolvedValue(row('other', 'sf-other'));
    query.mockRejectedValueOnce(new Error('unavailable'));
    await expect(service.createApplication('other', 'user-a', 'Applicant', 'org-a')).rejects.toThrow('unavailable');
    expect(applicationRepo.save).not.toHaveBeenCalled();
  });
  it.each([{ status: 'closed', exposureStatus: 'approved' }, { status: 'recruiting', exposureStatus: 'pending' }])('existing exposure/status guards remain enforced: %j', async (state) => {
    recruitmentRepo.findOne.mockResolvedValue({ ...row('legacy', null), ...state });
    await expect(service.createApplication('legacy', 'user-a', 'Applicant')).rejects.toThrow();
    expect(applicationRepo.save).not.toHaveBeenCalled();
  });
});
