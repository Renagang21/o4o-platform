/**
 * PharmacyHub 퇴역 — 저장된 데이터 경로의 잔여 guard.
 *
 * 요청 경로 guard(`rejectRetiredService`)는 path · query · body 만 본다. DB 에 이미 저장된
 * 모집 · CMS 콘텐츠 · slug · 조직은 이 파일의 guard 가 막는다.
 */
jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../modules/neture/entities/index.js', () => ({
  SellerRecruitment: class {}, SellerRecruitmentApplication: class {},
  RecruitmentStatus: { RECRUITING: 'recruiting', CLOSED: 'closed' }, ExposureStatus: { APPROVED: 'approved', REJECTED: 'rejected' },
  ApplicationStatus: { PENDING: 'pending', APPROVED: 'approved', CANCELLED: 'cancelled' },
  SELLER_RECRUITMENT_TABLE: 'seller_recruitments', SELLER_RECRUITMENT_APPLICATION_TABLE: 'seller_recruitment_applications',
}));
jest.mock('../modules/neture/services/service-audience.service.js', () => ({}));
jest.mock('../services/NotificationService.js', () => ({ notificationService: { createNotification: jest.fn().mockResolvedValue({}) } }));
jest.mock('../modules/neture/middleware/supplier-context.resolver.js', () => ({ listOwnedSupplierIds: jest.fn().mockResolvedValue(['owned-supplier']) }));

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppDataSource } from '../database/connection.js';
import { SellerRecruitmentService } from '../modules/neture/services/seller-recruitment.service.js';
import { RetiredServiceError } from '../middleware/retired-service.middleware.js';
import { retiredServiceOnlyOrganizationSql } from '../utils/retired-organization.js';
import { findCmsSlotContentConflict } from '../routes/cms-content/cms-content-utils.js';
import { isRetiredOldSlugHistory } from '../utils/retired-slug-history.js';

const src = (path: string) => readFileSync(resolve(__dirname, '..', path), 'utf8');

const recruitment = (id: string, serviceId: string) => ({
  id, serviceId, semiFranchiseId: null, sellerId: 'supplier-user', status: 'recruiting', exposureStatus: 'approved',
  consumerPrice: 100, commissionRate: 0,
});

describe('seller recruitment — 저장된 퇴역 serviceId', () => {
  let service: SellerRecruitmentService;
  let recruitmentRepo: any;
  let applicationRepo: any;
  beforeEach(() => {
    jest.clearAllMocks();
    (AppDataSource.query as jest.Mock).mockResolvedValue([]);
    recruitmentRepo = {
      find: jest.fn().mockResolvedValue([recruitment('live', 'kpa-society'), recruitment('retired', 'pharmacy-hub')]),
      findOne: jest.fn().mockResolvedValue(recruitment('retired', 'pharmacy-hub')),
      save: jest.fn(async (x) => x),
    };
    applicationRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 'app', recruitmentId: 'retired', status: 'pending' }),
      save: jest.fn(async (x) => x),
    };
    service = new SellerRecruitmentService();
    (service as any)._recruitmentRepo = recruitmentRepo;
    (service as any)._applicationRepo = applicationRepo;
  });

  it('공개 목록 · 노출 심사 큐에서 퇴역 서비스 모집을 뺀다', async () => {
    expect((await service.getRecruitments({ publicOnly: true })).map((r) => r.id)).toEqual(['live']);
    expect((await service.getRecruitmentsForExposureReview()).map((r) => r.id)).toEqual(['live']);
  });

  it('신청 · 승인 · 재개 · 노출 결정은 SERVICE_RETIRED 로 거절하고 아무것도 저장하지 않는다', async () => {
    recruitmentRepo.findOne.mockResolvedValue({ ...recruitment('retired', 'pharmacy-hub'), status: 'closed' });
    await expect(service.reopenRecruitment('retired', 'supplier-user')).rejects.toBeInstanceOf(RetiredServiceError);
    recruitmentRepo.findOne.mockResolvedValue(recruitment('retired', 'pharmacy-hub'));
    await expect(service.closeRecruitment('retired', 'supplier-user')).rejects.toBeInstanceOf(RetiredServiceError);
    await expect(service.createApplication('retired', 'user', '사용자')).rejects.toBeInstanceOf(RetiredServiceError);
    await expect(service.approveApplication('app', 'supplier-user')).rejects.toBeInstanceOf(RetiredServiceError);
    await expect(service.setRecruitmentExposure('retired', 'operator', 'approved' as any)).rejects.toBeInstanceOf(RetiredServiceError);
    expect(recruitmentRepo.save).not.toHaveBeenCalled();
    expect(applicationRepo.save).not.toHaveBeenCalled();
  });

  it('반려 · 참여 해지 · 신청 철회도 퇴역 모집이면 거절하고 공용 offer · listing 을 건드리지 않는다', async () => {
    await expect(service.rejectApplication('app', 'supplier-user', 'r')).rejects.toBeInstanceOf(RetiredServiceError);
    applicationRepo.findOne.mockResolvedValue({ id: 'app', recruitmentId: 'retired', status: 'approved', applicantId: 'user' });
    await expect(service.terminateParticipation('app', 'supplier-user')).rejects.toBeInstanceOf(RetiredServiceError);
    applicationRepo.findOne.mockResolvedValue({ id: 'app', recruitmentId: 'retired', status: 'pending', applicantId: 'user', applicantOrganizationId: null });
    await expect(service.cancelApplication('app', 'user')).rejects.toBeInstanceOf(RetiredServiceError);
    expect(applicationRepo.save).not.toHaveBeenCalled();
    expect(AppDataSource.query).not.toHaveBeenCalled();
  });

  it('공급자 본인 모집 목록 · 신청자 상세에서도 퇴역 서비스 모집은 보이지 않는다', async () => {
    expect((await service.getSupplierRecruitments('supplier-user')).map((r) => r.id)).toEqual(['live']);
    expect(await service.getRecruitmentApplications('retired', 'supplier-user')).toBeNull();
    expect(AppDataSource.query).not.toHaveBeenCalledWith(expect.stringContaining('LEFT JOIN users u'), ['retired']);
  });

  it('신청자 본인 이력에서도 퇴역 서비스 모집 신청은 보이지 않는다', async () => {
    (AppDataSource.query as jest.Mock).mockResolvedValueOnce([
      { id: 'a-live', recruitment_id: 'live', status: 'pending', service_id: 'kpa-society', seller_id: 'supplier-user' },
      { id: 'a-retired', recruitment_id: 'retired', status: 'approved', service_id: 'pharmacy-hub', seller_id: 'supplier-user' },
    ]);
    expect((await service.getApplicationsForApplicant('user', 'org-1')).map((a) => a.applicationId)).toEqual(['a-live']);
  });

  it('controller 는 RetiredServiceError 를 410 으로 응답한다', () => {
    for (const path of [
      'modules/neture/controllers/seller-recruitment.controller.ts',
      'modules/neture/controllers/operator-recruitment-exposure.controller.ts',
      'modules/neture/controllers/service-recruitment-exposure-proxy.controller.ts',
    ]) expect(src(path)).toContain('sendRetiredServiceError(res, error)');
    // 승인 · 반려(decisionErrors) · 철회 · 참여 해지
    expect(src('modules/neture/controllers/seller-recruitment.controller.ts').match(/sendRetiredServiceError\(res, error\)/g)?.length).toBeGreaterThanOrEqual(5);
  });
});

describe('CMS — 저장된 퇴역 serviceKey', () => {
  it('slot 배치 판정: 퇴역 서비스는 retired, 서로 다른 서비스는 mismatch, platform 콘텐츠·alias 는 허용', () => {
    expect(findCmsSlotContentConflict('pharmacy-hub', 'kpa-society')).toBe('retired');
    expect(findCmsSlotContentConflict('kpa-society', 'pharmacy-hub')).toBe('retired');
    expect(findCmsSlotContentConflict('neture', 'kpa-society')).toBe('mismatch');
    expect(findCmsSlotContentConflict('kpa', 'kpa-society')).toBeNull();
    expect(findCmsSlotContentConflict(null, 'kpa-society')).toBeNull();
    expect(findCmsSlotContentConflict('neture', null)).toBeNull();
  });

  it('콘텐츠 수정 · 상태 전이는 platform admin 이라도 퇴역 콘텐츠를 410 으로 거절한다', () => {
    const mutation = src('routes/cms-content/cms-content-mutation.handler.ts');
    expect(mutation).toContain('isRetiredServiceValue(content.serviceKey)');
    expect(mutation).toContain('isRetiredServiceValue(existing.serviceKey)');
    const slot = src('routes/cms-content/cms-content-slot.handler.ts');
    // 공개 조회 1 + 생성 · 수정 · 일괄 교체 3
    expect(slot.match(/findCmsSlotContentConflict\(/g)?.length).toBe(4);
    // 수정(PUT) · 삭제(DELETE) 모두 퇴역 slot 을 410 으로 거절한다
    expect(slot.match(/isRetiredServiceValue\(slot\.serviceKey\)/g)?.length).toBe(2);
  });

  it('slot 일괄 교체는 삭제 전에 기존 퇴역 slot 을 확인해 410 으로 거절한다', () => {
    const slot = src('routes/cms-content/cms-content-slot.handler.ts');
    const guard = slot.indexOf('existingScopeSlots.some((s) => isRetiredServiceValue(s.serviceKey))');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(slot.indexOf('await slotRepo.delete(scopeWhere);'));
    expect(slot).toContain('isRetiredServiceValue(serviceKey) || existingScopeSlots');
  });

  it('공개 slot 조회는 저장된 퇴역 · 타 서비스 콘텐츠를 응답에서 뺀다', () => {
    const slot = src('routes/cms-content/cms-content-slot.handler.ts');
    expect(slot).toContain('findCmsSlotContentConflict(slot.content.serviceKey, slot.serviceKey) === null');
    expect(slot).toContain(': placeableSlots;');
  });
});

describe('store slug · 조직 경로', () => {
  it('slug 와 옛 slug redirect 모두 퇴역 서비스면 410 이다', () => {
    expect(src('routes/platform/store-public/store-public-utils.ts')).toContain('isRetiredServiceValue(redirect.serviceKey)');
    const policy = src('routes/platform/store-policy.routes.ts');
    expect(policy.match(/isRetiredServiceValue\(redirect\.serviceKey\)/g)?.length).toBe(2);
    expect(policy).toContain('isRetiredServiceValue(slugRecord.serviceKey)');
    expect(policy).toContain('isRetiredServiceValue(current.serviceKey)');
    // 옛 slug 의 history 행 serviceKey 도 확인한다 (findOldSlugRedirect 는 현재 slug 의 serviceKey 만 준다)
    expect(policy.match(/await isRetiredOldSlugHistory\(dataSource, slug\)/g)?.length).toBe(2);
    expect(src('routes/platform/store-public/store-public-utils.ts')).toContain('await isRetiredOldSlugHistory(dataSource, slug)');
  });

  it('옛 slug 의 최근 history 행이 퇴역 서비스면 true, 살아 있는 서비스 · 기록 없음이면 false', async () => {
    const ds = (rows: unknown[]) => ({ query: jest.fn().mockResolvedValue(rows) }) as any;
    const retired = ds([{ service_key: 'pharmacy-hub' }]);
    expect(await isRetiredOldSlugHistory(retired, ' Old-Slug ')).toBe(true);
    expect(retired.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY changed_at DESC'), ['old-slug']);
    expect(await isRetiredOldSlugHistory(ds([{ service_key: 'kpa-society' }]), 'old')).toBe(false);
    expect(await isRetiredOldSlugHistory(ds([]), 'old')).toBe(false);
  });

  it('퇴역 서비스 전용 조직 판정은 살아 있는 연결이 있으면 퇴역으로 보지 않는다', () => {
    const sql = retiredServiceOnlyOrganizationSql('o.id');
    expect(sql).toContain("IN ('pharmacy-hub', 'pharmacy-hub-event-offer')");
    expect(sql).toContain("LIKE 'pharmacy-hub:%'");
    expect(sql).toContain("lse.status = 'active'");
    expect(sql).toContain('lss.is_active = true');
    expect(sql).toContain('neture_pharmacy_memberships');
    expect(sql).not.toMatch(/\$\d/);
  });

  it('매장 후보 · 초대 목록 · KPA 콘텐츠 fallback · 공개 QR 이 같은 판정을 쓴다', () => {
    for (const path of [
      'utils/store-organization.resolver.ts',
      'services/store/store-membership.service.ts',
      'routes/o4o-store/controllers/kpa-content-organization.ts',
      'services/store/store-qr.service.ts',
    ]) expect(src(path)).toContain('retiredServiceOnlyOrganizationSql(');
    expect(src('utils/store-organization.resolver.ts').match(/retiredServiceOnlyOrganizationSql\(/g)?.length).toBe(2);
  });

  it('태블릿 기기 토큰 경로(페어링 조회 · claim · heartbeat · 런타임)도 퇴역 조직을 막는다', () => {
    const device = src('routes/platform/store-tablet-device.routes.ts');
    expect(device.match(/retiredServiceOnlyOrganizationSql\(/g)?.length).toBe(3);
    expect(device).toMatch(/pairing_expires_at > NOW\(\)\s+AND NOT \$\{retiredServiceOnlyOrganizationSql\('d\.organization_id'\)\}/);
    expect(device).toContain("retiredServiceKeySql('service_key')");
    expect(device).toMatch(/ps\.is_active = TRUE\s+AND NOT \$\{retiredServiceKeySql\('ps\.service_key'\)\}\)\s+AND NOT \$\{retiredServiceOnlyOrganizationSql\('d\.organization_id'\)\}/);
  });
});
