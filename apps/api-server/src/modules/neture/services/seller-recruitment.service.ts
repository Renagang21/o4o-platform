/**
 * SellerRecruitmentService — 공급자 → 판매자(매장) 모집 도메인
 *
 * WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1
 *
 * 구 `NeturePartnerContractService`(partner-contract.service.ts) 에서 **판매자 모집 업무만** 추출했다.
 * Legacy Partner(제휴마케팅) 잔재 — `neture_seller_partner_contracts` 생성/조회 · 파트너 대시보드 자동 등록 ·
 * `partner` role 부여 · membership 활성화 · `neture.neture_partners` 조회 — 는 **모두 제거**했다.
 * 모집 승인의 결과는 아래뿐이다(O4O-ROLE-WORKSPACE-ARCHITECTURE-V1 §7 · Preflight IR §B-8):
 *
 *   Store 가 모집에 신청  →  Supplier 승인/반려
 *   승인 결과 = application.status=approved
 *             + C bridge: supplier_product_offers.allowed_seller_ids += 신청자 · 매장 OPL(source_type='seller_recruitment')
 *             + in-app 알림
 *   참여 해지 = application.status=cancelled (decidedBy=공급자) + allowed_seller_ids 제거 + OPL 비활성
 *
 * 흐름(E2E 계약):
 *   Supplier 모집 생성 → Service Operator 노출 승인 → Store browse/apply → Supplier approve/reject/terminate
 *
 * 물리 테이블명(neture_partner_*)은 엔티티 파일이 격리한다(temporary legacy persistence seam).
 * 이 서비스의 raw SQL 은 상수 SELLER_RECRUITMENT_*_TABLE 만 사용한다.
 */
import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  SellerRecruitment,
  SellerRecruitmentApplication,
  RecruitmentStatus,
  ExposureStatus,
  ApplicationStatus,
  SELLER_RECRUITMENT_TABLE,
  SELLER_RECRUITMENT_APPLICATION_TABLE,
} from '../entities/index.js';
// WO-O4O-SELLER-RECRUITMENT-C-BRIDGE-BACKEND-V1: 약국 대상 서비스 정책(의약품 gate 재확인)
import { ServiceAudienceService } from './service-audience.service.js';
// WO-O4O-SELLER-RECRUITMENT-SELLER-NOTIFICATION-V1: 판매자 in-app 알림
import { notificationService } from '../../../services/NotificationService.js';
import type { NotificationType } from '../../../entities/Notification.js';
import logger from '../../../utils/logger.js';

/**
 * WO-O4O-CROSSSERVICE-SELLER-RECRUITMENT-NOTIFICATION-TARGETURL-V1
 *
 * 판매자 모집 신청·승인 현황 알림의 클릭 이동 경로(targetUrl)를 serviceKey 로 해소한다.
 * 알림은 `serviceKey` 로 필터되어 해당 서비스 앱 GlobalHeader 에서만 노출되며,
 * 헤더는 metadata.targetUrl 로 자기 도메인 내에서 react-router `navigate(target)` 한다.
 * → 상대 경로만 필요. 신청 주체는 매장이므로 모든 경로가 매장 셸 안이다.
 *   Legacy Partner 영역(`/partner/recruitment-applications`)은 은퇴했다 — fallback 도 매장 경로.
 */
const STORE_RECRUITMENT_APPLICATIONS_ROUTE = '/store/commerce/recruitment-applications';
const PHARMACY_HUB_RECRUITMENT_APPLICATIONS_ROUTE = '/store-owner/recruitment-applications';

export function resolveRecruitmentApplicationTargetUrl(serviceKey?: string): string {
  switch (serviceKey) {
    case 'pharmacy-hub':
      return PHARMACY_HUB_RECRUITMENT_APPLICATIONS_ROUTE;
    case 'kpa-society':
    case 'k-cosmetics':
    case 'cosmetics': // service-catalog canonical 은 'k-cosmetics' 이나 일부 경로가 'cosmetics' 사용
    default:
      return STORE_RECRUITMENT_APPLICATIONS_ROUTE;
  }
}

export class SellerRecruitmentService {
  private _recruitmentRepo?: Repository<SellerRecruitment>;
  private _applicationRepo?: Repository<SellerRecruitmentApplication>;

  private get recruitmentRepo(): Repository<SellerRecruitment> {
    if (!this._recruitmentRepo) this._recruitmentRepo = AppDataSource.getRepository(SellerRecruitment);
    return this._recruitmentRepo;
  }

  private get applicationRepo(): Repository<SellerRecruitmentApplication> {
    if (!this._applicationRepo) this._applicationRepo = AppDataSource.getRepository(SellerRecruitmentApplication);
    return this._applicationRepo;
  }

  // ==================== Recruitment (browse · exposure · supplier) ====================

  /**
   * 모집 목록 조회.
   * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1:
   *  - exposureStatus 필터(public browse 는 컨트롤러에서 APPROVED 강제 → 미승인/반려 모집 미노출)
   *  - serviceKey scope(serviceId 일치) — 누락 시 노출은 exposureStatus 게이트로만 제한
   */
  async getRecruitments(filters?: { status?: RecruitmentStatus; serviceKey?: string; exposureStatus?: ExposureStatus }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.serviceKey) where.serviceId = filters.serviceKey;
    if (filters?.exposureStatus) where.exposureStatus = filters.exposureStatus;

    const recruitments = await this.recruitmentRepo.find({ where, order: { createdAt: 'DESC' } });
    return recruitments.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      manufacturer: r.manufacturer || '',
      consumerPrice: Number(r.consumerPrice),
      commissionRate: Number(r.commissionRate),
      sellerId: r.sellerId,
      sellerName: r.sellerName,
      shopUrl: r.shopUrl || '',
      serviceName: r.serviceName || '',
      serviceId: r.serviceId || '',
      imageUrl: r.imageUrl || '',
      status: r.status,
      exposureStatus: r.exposureStatus,
      createdAt: r.createdAt,
    }));
  }

  /**
   * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1
   * 운영자 노출 승인 큐 — serviceKey/exposureStatus/status 필터. 감사 필드 포함.
   */
  async getRecruitmentsForExposureReview(filters?: { serviceKey?: string; exposureStatus?: ExposureStatus; status?: RecruitmentStatus }) {
    const where: Record<string, unknown> = {};
    if (filters?.serviceKey) where.serviceId = filters.serviceKey;
    if (filters?.exposureStatus) where.exposureStatus = filters.exposureStatus;
    if (filters?.status) where.status = filters.status;

    const rows = await this.recruitmentRepo.find({ where, order: { createdAt: 'DESC' } });
    return rows.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      manufacturer: r.manufacturer || '',
      sellerId: r.sellerId,
      sellerName: r.sellerName,
      serviceId: r.serviceId || '',
      serviceName: r.serviceName || '',
      consumerPrice: Number(r.consumerPrice),
      commissionRate: Number(r.commissionRate),
      status: r.status,
      exposureStatus: r.exposureStatus,
      exposureReviewedAt: r.exposureReviewedAt,
      exposureReviewedBy: r.exposureReviewedBy,
      exposureReviewNote: r.exposureReviewNote || '',
      createdAt: r.createdAt,
    }));
  }

  /**
   * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1
   * 운영자 노출 승인/반려. RecruitmentStatus(운영 상태) 는 건드리지 않는다. 이미 같은 상태면 idempotent 성공.
   */
  async setRecruitmentExposure(
    recruitmentId: string,
    operatorUserId: string,
    decision: ExposureStatus.APPROVED | ExposureStatus.REJECTED,
    note?: string,
    // WO-O4O-SELLER-RECRUITMENT-EXPOSURE-OPERATOR-UI-V1: per-service proxy 가 자기 serviceKey 로 고정.
    serviceKey?: string,
  ) {
    const recruitment = await this.recruitmentRepo.findOne({ where: { id: recruitmentId } });
    if (!recruitment) return { success: false as const, error: 'RECRUITMENT_NOT_FOUND' };
    if (serviceKey && recruitment.serviceId !== serviceKey) {
      return { success: false as const, error: 'SERVICE_MISMATCH' };
    }
    if (recruitment.exposureStatus === decision) {
      return { success: true as const, data: { id: recruitmentId, exposureStatus: decision, idempotent: true } };
    }
    recruitment.exposureStatus = decision;
    recruitment.exposureReviewedAt = new Date();
    recruitment.exposureReviewedBy = operatorUserId;
    recruitment.exposureReviewNote = note?.trim() || null;
    await this.recruitmentRepo.save(recruitment);
    logger.info(`[SellerRecruitmentService] recruitment exposure ${decision}: ${recruitmentId} by ${operatorUserId}`);
    return { success: true as const, data: { id: recruitment.id, exposureStatus: decision } };
  }

  /**
   * WO-O4O-SELLER-RECRUITMENT-SUPPLIER-STATUS-VIEW-V1
   * 공급자(모집 주체) 본인이 생성한 모집 목록 + 신청 카운트(전체/대기/승인/반려).
   */
  async getSupplierRecruitments(supplierUserId: string) {
    const recruitments = await this.recruitmentRepo.find({
      where: { sellerId: supplierUserId },
      order: { createdAt: 'DESC' },
    });
    if (!recruitments.length) return [];

    const ids = recruitments.map((r) => r.id);
    const countRows: Array<{ recruitment_id: string; status: string; cnt: number }> = await AppDataSource.query(
      `SELECT recruitment_id, status, COUNT(*)::int AS cnt
       FROM ${SELLER_RECRUITMENT_APPLICATION_TABLE}
       WHERE recruitment_id = ANY($1)
       GROUP BY recruitment_id, status`,
      [ids],
    );
    const countMap = new Map<string, { total: number; pending: number; approved: number; rejected: number }>();
    for (const r of recruitments) countMap.set(r.id, { total: 0, pending: 0, approved: 0, rejected: 0 });
    for (const c of countRows) {
      const m = countMap.get(c.recruitment_id);
      if (!m) continue;
      const n = Number(c.cnt);
      m.total += n;
      if (c.status === ApplicationStatus.PENDING) m.pending = n;
      else if (c.status === ApplicationStatus.APPROVED) m.approved = n;
      else if (c.status === ApplicationStatus.REJECTED) m.rejected = n;
    }

    return recruitments.map((r) => ({
      id: r.id,
      productId: r.productId,
      productName: r.productName,
      serviceId: r.serviceId || '',
      serviceName: r.serviceName || '',
      commissionRate: Number(r.commissionRate),
      consumerPrice: Number(r.consumerPrice),
      status: r.status,
      exposureStatus: r.exposureStatus,
      exposureReviewedAt: r.exposureReviewedAt,
      exposureReviewedBy: r.exposureReviewedBy,
      exposureReviewNote: r.exposureReviewNote,
      createdAt: r.createdAt,
      applications: countMap.get(r.id) || { total: 0, pending: 0, approved: 0, rejected: 0 },
    }));
  }

  /** WO-O4O-SELLER-RECRUITMENT-CLOSE-ACTION-V1: 공급자가 본인 모집을 마감(신규 신청 차단). idempotent. */
  async closeRecruitment(recruitmentId: string, supplierUserId: string) {
    const recruitment = await this.recruitmentRepo.findOne({ where: { id: recruitmentId } });
    if (!recruitment || recruitment.sellerId !== supplierUserId) return { success: false as const, error: 'NOT_FOUND' };
    if (recruitment.status !== RecruitmentStatus.CLOSED) {
      recruitment.status = RecruitmentStatus.CLOSED;
      await this.recruitmentRepo.save(recruitment);
      logger.info(`[SellerRecruitmentService] Recruitment closed: ${recruitment.id}`);
    }
    return { success: true as const, data: { id: recruitment.id, status: recruitment.status } };
  }

  /** WO-O4O-SELLER-RECRUITMENT-REOPEN-ACTION-V1: 마감 모집 재개. idempotent. */
  async reopenRecruitment(recruitmentId: string, supplierUserId: string) {
    const recruitment = await this.recruitmentRepo.findOne({ where: { id: recruitmentId } });
    if (!recruitment || recruitment.sellerId !== supplierUserId) return { success: false as const, error: 'NOT_FOUND' };
    if (recruitment.status !== RecruitmentStatus.RECRUITING) {
      recruitment.status = RecruitmentStatus.RECRUITING;
      await this.recruitmentRepo.save(recruitment);
      logger.info(`[SellerRecruitmentService] Recruitment reopened: ${recruitment.id}`);
    }
    return { success: true as const, data: { id: recruitment.id, status: recruitment.status } };
  }

  /**
   * WO-O4O-SELLER-RECRUITMENT-CREATION-FLOW-V1 · WO-O4O-NETURE-SELLER-RECRUITMENT-MULTI-SERVICE-CREATE-V1
   * 공급자가 등록된 PRIVATE 제품으로 판매자 모집을 생성한다(서비스당 1 row · 원자적).
   */
  async createRecruitment(
    supplierUserId: string,
    input: { masterId?: string; serviceKey?: string; serviceKeys?: string[]; commissionRate?: number; consumerPrice?: number; shopUrl?: string; imageUrl?: string },
  ) {
    const masterId = (input.masterId || '').trim();
    const rawKeys = (input.serviceKeys && input.serviceKeys.length > 0)
      ? input.serviceKeys
      : (input.serviceKey ? [input.serviceKey] : []);
    const serviceKeys = [...new Set(rawKeys.map((k) => (k || '').trim()).filter(Boolean))];
    if (!masterId) return { success: false as const, error: 'MASTER_ID_REQUIRED' };
    if (serviceKeys.length === 0) return { success: false as const, error: 'SERVICE_KEY_REQUIRED' };

    // offer 해소 (master_id + 공급자 user_id). PRIVATE·APPROVED 우선.
    const rows: Array<{
      offer_id: string; distribution_type: string; product_name: string;
      manufacturer: string | null; is_regulated: boolean | null; seller_name: string | null;
    }> = await AppDataSource.query(
      `SELECT spo.id AS offer_id, spo.distribution_type, pm.name AS product_name,
              pm.manufacturer_name AS manufacturer, c.is_regulated, org.name AS seller_name
       FROM supplier_product_offers spo
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       JOIN product_masters pm ON pm.id = spo.master_id
       LEFT JOIN product_categories c ON c.id = pm.category_id
       LEFT JOIN organizations org ON org.id = ns.organization_id
       WHERE spo.master_id = $1 AND ns.user_id = $2 AND spo.deleted_at IS NULL
       ORDER BY (spo.distribution_type = 'PRIVATE') DESC, (spo.approval_status = 'APPROVED') DESC, spo.created_at DESC
       LIMIT 1`,
      [masterId, supplierUserId],
    );
    if (!rows.length) return { success: false as const, error: 'OFFER_NOT_FOUND' };
    const offer = rows[0];

    // [결정 1·2] 판매자 모집은 PRIVATE 유통 제품만
    if (offer.distribution_type !== 'PRIVATE') return { success: false as const, error: 'OFFER_NOT_PRIVATE' };

    // [결정 3] 의약품/규제 상품 → 약국 대상 서비스에만 (원자적)
    if (offer.is_regulated) {
      const isPharmacyAudience = await new ServiceAudienceService(AppDataSource).getPharmacyAudienceResolver();
      if (serviceKeys.some((k) => !isPharmacyAudience(k))) {
        return { success: false as const, error: 'DRUG_SERVICE_NOT_PHARMACY_AUDIENCE' };
      }
    }

    // UNIQUE(productId, sellerId, serviceId) — 서비스당 1 모집. 하나라도 이미 있으면 전체 실패(원자적).
    const existing = await this.recruitmentRepo.find({
      where: serviceKeys.map((k) => ({ productId: masterId, sellerId: supplierUserId, serviceId: k })),
    });
    if (existing.length > 0) return { success: false as const, error: 'RECRUITMENT_ALREADY_EXISTS' };

    const commissionRate = Number.isFinite(Number(input.commissionRate))
      ? Math.max(0, Math.min(100, Number(input.commissionRate)))
      : 0;
    const consumerPrice = Number.isFinite(Number(input.consumerPrice)) ? Math.max(0, Number(input.consumerPrice)) : 0;

    const created = await AppDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(SellerRecruitment);
      const out: Array<{ id: string; serviceId: string; status: RecruitmentStatus }> = [];
      for (const k of serviceKeys) {
        const recruitment = repo.create({
          productId: masterId,
          productName: offer.product_name,
          manufacturer: offer.manufacturer ?? undefined,
          sellerId: supplierUserId,
          sellerName: offer.seller_name || '공급자',
          serviceId: k,
          consumerPrice,
          commissionRate,
          shopUrl: input.shopUrl?.trim() || undefined,
          imageUrl: input.imageUrl?.trim() || undefined,
          status: RecruitmentStatus.RECRUITING,
          exposureStatus: ExposureStatus.PENDING,
        });
        const saved = await repo.save(recruitment);
        out.push({ id: saved.id, serviceId: saved.serviceId, status: saved.status });
      }
      return out;
    });
    logger.info(`[SellerRecruitmentService] Recruitment created: ${created.length} row(s) (master=${masterId}, supplierUser=${supplierUserId}, services=${serviceKeys.join(',')})`);
    return {
      success: true as const,
      data: { id: created[0].id, productId: masterId, serviceId: created[0].serviceId, status: created[0].status, recruitments: created },
    };
  }

  // ==================== Application (store/seller side) ====================

  /** Store/판매자의 모집 참여 신청 */
  async createApplication(recruitmentId: string, applicantId: string, applicantName: string) {
    const recruitment = await this.recruitmentRepo.findOne({ where: { id: recruitmentId } });
    if (!recruitment) throw new Error('RECRUITMENT_NOT_FOUND');
    if (recruitment.status !== RecruitmentStatus.RECRUITING) throw new Error('RECRUITMENT_CLOSED');
    // WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1: 노출 승인되지 않은 모집은 신청 방어 차단
    if (recruitment.exposureStatus !== ExposureStatus.APPROVED) throw new Error('RECRUITMENT_NOT_EXPOSED');

    const existing = await this.applicationRepo.findOne({ where: { recruitmentId, applicantId } });
    if (existing) throw new Error('DUPLICATE_APPLICATION');

    const saved = await this.applicationRepo.save(
      this.applicationRepo.create({ recruitmentId, applicantId, applicantName, status: ApplicationStatus.PENDING, appliedAt: new Date() }),
    );
    logger.info(`[SellerRecruitmentService] application created: ${saved.id}`);
    return { id: saved.id, status: saved.status, appliedAt: saved.appliedAt };
  }

  /**
   * WO-O4O-MY-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1
   * 신청자 본인이 신청한 모집 목록 + 상태(심사대기/승인/반려/철회/참여해지).
   */
  async getApplicationsForApplicant(applicantUserId: string) {
    const rows: Array<{
      id: string; recruitment_id: string; status: string; applied_at: Date; decided_at: Date | null; decided_by: string | null; reason: string | null;
      product_id: string; product_name: string; seller_name: string | null; service_id: string | null; seller_id: string;
    }> = await AppDataSource.query(
      `SELECT a.id, a.recruitment_id, a.status, a.applied_at, a.decided_at, a.decided_by, a.reason,
              r.product_id, r.product_name, r.seller_name, r.service_id, r.seller_id
       FROM ${SELLER_RECRUITMENT_APPLICATION_TABLE} a
       JOIN ${SELLER_RECRUITMENT_TABLE} r ON r.id = a.recruitment_id
       WHERE a.partner_id = $1
       ORDER BY a.applied_at DESC`,
      [applicantUserId],
    );
    return rows.map((a) => ({
      applicationId: a.id,
      recruitmentId: a.recruitment_id,
      productId: a.product_id,
      productName: a.product_name,
      supplierName: a.seller_name || '',
      serviceId: a.service_id || '',
      status: a.status, // pending | approved | rejected | cancelled
      participationTerminated: isParticipationTerminated(a.status, a.decided_by, a.seller_id),
      appliedAt: a.applied_at,
      decidedAt: a.decided_at,
      reason: a.reason || '',
    }));
  }

  /** WO-O4O-SELLER-RECRUITMENT-APPLICATION-CANCEL-V1: 신청자 본인 pending 철회. idempotent. */
  async cancelApplication(applicationId: string, applicantUserId: string) {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) return { success: false as const, error: 'APPLICATION_NOT_FOUND' };
    if (application.applicantId !== applicantUserId) return { success: false as const, error: 'NOT_OWNER' };
    if (application.status === ApplicationStatus.CANCELLED) {
      return { success: true as const, data: { applicationId, alreadyCancelled: true } };
    }
    if (application.status !== ApplicationStatus.PENDING) return { success: false as const, error: 'NOT_PENDING' };

    application.status = ApplicationStatus.CANCELLED;
    application.decidedAt = new Date();
    application.decidedBy = applicantUserId; // 신청자 본인 철회
    await this.applicationRepo.save(application);
    logger.info(`[SellerRecruitmentService] application cancelled by applicant: app=${applicationId}`);
    return { success: true as const, data: { applicationId } };
  }

  // ==================== Application (supplier side) ====================

  /**
   * WO-O4O-SELLER-RECRUITMENT-SUPPLIER-APPLICATION-REVIEW-V1
   * 공급자 본인 모집의 신청자 목록 + 모집 요약. 미존재/타 공급자 모집 → null (controller 404).
   */
  async getRecruitmentApplications(recruitmentId: string, supplierUserId: string) {
    const recruitment = await this.recruitmentRepo.findOne({ where: { id: recruitmentId } });
    if (!recruitment || recruitment.sellerId !== supplierUserId) return null;

    const rows: Array<{
      id: string; partner_id: string; partner_name: string | null; status: string;
      applied_at: Date; decided_at: Date | null; decided_by: string | null; reason: string | null;
      applicant_user_name: string | null; applicant_email: string | null; organization_name: string | null;
    }> = await AppDataSource.query(
      `SELECT a.id, a.partner_id, a.partner_name, a.status, a.applied_at, a.decided_at, a.decided_by, a.reason,
              u.name AS applicant_user_name, u.email AS applicant_email,
              (SELECT o.name FROM organization_members om
                 JOIN organizations o ON o.id = om.organization_id
               WHERE om.user_id = a.partner_id AND om.left_at IS NULL LIMIT 1) AS organization_name
       FROM ${SELLER_RECRUITMENT_APPLICATION_TABLE} a
       LEFT JOIN users u ON u.id = a.partner_id
       WHERE a.recruitment_id = $1
       ORDER BY a.applied_at DESC`,
      [recruitmentId],
    );

    return {
      recruitment: {
        id: recruitment.id,
        productId: recruitment.productId,
        productName: recruitment.productName,
        serviceId: recruitment.serviceId || '',
        serviceName: recruitment.serviceName || '',
        commissionRate: Number(recruitment.commissionRate),
        consumerPrice: Number(recruitment.consumerPrice),
        status: recruitment.status,
        exposureStatus: recruitment.exposureStatus,
        exposureReviewedAt: recruitment.exposureReviewedAt,
        exposureReviewedBy: recruitment.exposureReviewedBy,
        exposureReviewNote: recruitment.exposureReviewNote,
        createdAt: recruitment.createdAt,
      },
      applications: rows.map((a) => ({
        id: a.id,
        applicantId: a.partner_id,
        applicantName: a.partner_name || a.applicant_user_name || '신청자',
        applicantEmail: a.applicant_email || '',
        organizationName: a.organization_name || '',
        status: a.status,
        appliedAt: a.applied_at,
        decidedAt: a.decided_at,
        reason: a.reason || '',
        participationTerminated: isParticipationTerminated(a.status, a.decided_by, recruitment.sellerId),
      })),
    };
  }

  /**
   * 모집 신청 승인 (모집 주체 공급자).
   * 결과 = application approved + C bridge(조달 가능화) + 알림. Partner 계약·role·대시보드는 만들지 않는다.
   */
  async approveApplication(applicationId: string, supplierUserId: string) {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new Error('APPLICATION_NOT_FOUND');
    if (application.status !== ApplicationStatus.PENDING) throw new Error('INVALID_STATUS');

    const recruitment = await this.recruitmentRepo.findOne({ where: { id: application.recruitmentId } });
    if (!recruitment) throw new Error('RECRUITMENT_NOT_FOUND');
    if (recruitment.sellerId !== supplierUserId) throw new Error('NOT_RECRUITMENT_OWNER');

    application.status = ApplicationStatus.APPROVED;
    application.decidedAt = new Date();
    application.decidedBy = supplierUserId;
    await this.applicationRepo.save(application);

    // WO-O4O-SELLER-RECRUITMENT-C-BRIDGE-BACKEND-V1: 승인 → 판매자 주문 가능화 (best-effort · idempotent)
    try {
      await this.bridgeRecruitmentToOrderable(recruitment, application.applicantId);
    } catch (bridgeError) {
      logger.error(`[SellerRecruitmentService] C-bridge failed (approval kept): application=${application.id}`, bridgeError);
    }

    await this.notifyApplicant(
      application.applicantId,
      'recruitment.application_approved',
      '판매자 모집 신청이 승인되었습니다.',
      `${recruitment.productName} 판매자 모집 신청이 승인되었습니다. 해당 모집 제품을 조달 가능한 상품으로 확인할 수 있습니다.`,
      recruitment,
      application.id,
    );

    return { id: application.id, status: application.status };
  }

  /** 모집 신청 반려 (모집 주체 공급자) */
  async rejectApplication(applicationId: string, supplierUserId: string, reason?: string) {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new Error('APPLICATION_NOT_FOUND');
    if (application.status !== ApplicationStatus.PENDING) throw new Error('INVALID_STATUS');

    const recruitment = await this.recruitmentRepo.findOne({ where: { id: application.recruitmentId } });
    if (!recruitment) throw new Error('RECRUITMENT_NOT_FOUND');
    if (recruitment.sellerId !== supplierUserId) throw new Error('NOT_RECRUITMENT_OWNER');

    application.status = ApplicationStatus.REJECTED;
    application.decidedAt = new Date();
    application.decidedBy = supplierUserId;
    application.reason = reason || '';
    await this.applicationRepo.save(application);

    await this.notifyApplicant(
      application.applicantId,
      'recruitment.application_rejected',
      '판매자 모집 신청이 반려되었습니다.',
      `${recruitment.productName} 판매자 모집 신청이 반려되었습니다. 자세한 사유는 모집 신청 내역을 확인해 주세요.`,
      recruitment,
      application.id,
    );

    return { id: application.id, status: application.status };
  }

  /**
   * WO-O4O-SELLER-RECRUITMENT-PARTICIPATION-TERMINATION-V1
   * 승인된 신청자의 모집 참여를 해지한다(= 신규 조달 노출 중단). 기존 주문 이력 유지.
   *  ① 소유권: recruitment.sellerId === supplierUserId, application=approved
   *  ② application → cancelled (decidedBy=공급자) — legacy 계약 행 대신 신청 행이 종결 상태를 보유
   *  ③ offer.allowed_seller_ids 에서 신청자 userId 제거
   *  ④ source_type='seller_recruitment' OPL is_active=false
   */
  async terminateParticipation(applicationId: string, supplierUserId: string) {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) return { success: false as const, error: 'APPLICATION_NOT_FOUND' };
    const recruitment = await this.recruitmentRepo.findOne({ where: { id: application.recruitmentId } });
    if (!recruitment || recruitment.sellerId !== supplierUserId) return { success: false as const, error: 'NOT_OWNER' };
    if (application.status !== ApplicationStatus.APPROVED) return { success: false as const, error: 'NOT_APPROVED' };

    application.status = ApplicationStatus.CANCELLED;
    application.decidedAt = new Date();
    application.decidedBy = supplierUserId;
    await this.applicationRepo.save(application);

    const offerRows: Array<{ id: string }> = await AppDataSource.query(
      `SELECT spo.id
       FROM supplier_product_offers spo
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       WHERE spo.master_id = $1 AND ns.user_id = $2 AND spo.deleted_at IS NULL
       ORDER BY (spo.distribution_type = 'PRIVATE') DESC, (spo.approval_status = 'APPROVED') DESC, spo.created_at DESC
       LIMIT 1`,
      [recruitment.productId, supplierUserId],
    );
    if (offerRows.length) {
      const offerId = offerRows[0].id;
      await AppDataSource.query(
        `UPDATE supplier_product_offers
         SET allowed_seller_ids = array_remove(coalesce(allowed_seller_ids, '{}'), $1), updated_at = NOW()
         WHERE id = $2`,
        [application.applicantId, offerId],
      );
      const orgRows: Array<{ organization_id: string }> = await AppDataSource.query(
        `SELECT organization_id FROM organization_members WHERE user_id = $1 AND left_at IS NULL LIMIT 1`,
        [application.applicantId],
      );
      if (orgRows.length) {
        await AppDataSource.query(
          `UPDATE organization_product_listings
           SET is_active = false, updated_at = NOW()
           WHERE offer_id = $1 AND organization_id = $2 AND source_type = 'seller_recruitment'`,
          [offerId, orgRows[0].organization_id],
        );
      }
      logger.info(`[Participation] terminated app=${applicationId} applicant=${application.applicantId} offer=${offerId}`);
    } else {
      logger.warn(`[Participation] offer not found — allowedSellerIds/OPL cleanup skipped (app=${applicationId})`);
    }

    await this.notifyApplicant(
      application.applicantId,
      'recruitment.participation_terminated',
      '판매자 모집 참여가 해지되었습니다.',
      `${recruitment.productName} 모집 제품의 조달 가능 상태가 종료되었습니다. 기존 주문 이력은 유지됩니다.`,
      recruitment,
      application.id,
    );

    return { success: true as const, data: { applicationId, participationTerminated: true } };
  }

  // ==================== internals ====================

  /**
   * WO-O4O-SELLER-RECRUITMENT-C-BRIDGE-BACKEND-V1
   * 모집 승인된 제품을 신청자가 주문 가능한 상태로 완성한다 (best-effort, idempotent).
   */
  private async bridgeRecruitmentToOrderable(recruitment: SellerRecruitment, applicantUserId: string): Promise<void> {
    const serviceKey = recruitment.serviceId || 'neture';

    const offerRows: Array<{ id: string; master_id: string; allowed_seller_ids: string[] | null; is_regulated: boolean | null }> =
      await AppDataSource.query(
        `SELECT spo.id, spo.master_id, spo.allowed_seller_ids, c.is_regulated
         FROM supplier_product_offers spo
         JOIN neture_suppliers ns ON ns.id = spo.supplier_id
         JOIN product_masters pm ON pm.id = spo.master_id
         LEFT JOIN product_categories c ON c.id = pm.category_id
         WHERE spo.master_id = $1 AND ns.user_id = $2 AND spo.deleted_at IS NULL
         ORDER BY (spo.distribution_type = 'PRIVATE') DESC, (spo.approval_status = 'APPROVED') DESC, spo.created_at DESC
         LIMIT 1`,
        [recruitment.productId, recruitment.sellerId],
      );
    if (!offerRows.length) {
      logger.warn(`[C-Bridge] offer not found (master=${recruitment.productId}, supplierUser=${recruitment.sellerId}) — bridge skipped`);
      return;
    }
    const offer = offerRows[0];

    if (offer.is_regulated) {
      const isPharmacyAudience = await new ServiceAudienceService(AppDataSource).getPharmacyAudienceResolver();
      if (!isPharmacyAudience(serviceKey)) {
        logger.warn(`[C-Bridge] regulated product → non-pharmacy service(${serviceKey}) — bridge skipped (offer=${offer.id})`);
        return;
      }
    }

    const current = offer.allowed_seller_ids || [];
    if (!current.includes(applicantUserId)) {
      await AppDataSource.query(
        `UPDATE supplier_product_offers
         SET allowed_seller_ids = array_append(coalesce(allowed_seller_ids, '{}'), $1), updated_at = NOW()
         WHERE id = $2`,
        [applicantUserId, offer.id],
      );
      logger.info(`[C-Bridge] allowedSellerIds += applicant ${applicantUserId} (offer=${offer.id})`);
    }

    const orgRows: Array<{ organization_id: string }> = await AppDataSource.query(
      `SELECT organization_id FROM organization_members WHERE user_id = $1 AND left_at IS NULL LIMIT 1`,
      [applicantUserId],
    );
    if (!orgRows.length) {
      logger.warn(`[C-Bridge] applicant ${applicantUserId} has no organization — OPL skipped (allowedSellerIds applied)`);
      return;
    }
    await AppDataSource.query(
      `INSERT INTO organization_product_listings
        (id, organization_id, service_key, master_id, offer_id, is_active, price, source_type, source_id, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NULL, 'seller_recruitment', $5, NOW(), NOW())
       ON CONFLICT (organization_id, service_key, offer_id) DO NOTHING`,
      [orgRows[0].organization_id, serviceKey, offer.master_id, offer.id, recruitment.id],
    );
    logger.info(`[C-Bridge] OPL ensured (org=${orgRows[0].organization_id}, offer=${offer.id}, service=${serviceKey})`);
  }

  /** WO-O4O-SELLER-RECRUITMENT-SELLER-NOTIFICATION-V1: 신청자 in-app 알림 — best-effort */
  private async notifyApplicant(
    applicantUserId: string,
    type: NotificationType,
    title: string,
    message: string,
    recruitment: SellerRecruitment,
    applicationId: string,
  ): Promise<void> {
    try {
      const serviceKey = recruitment.serviceId || undefined;
      await notificationService.createNotification({
        userId: applicantUserId,
        type,
        title,
        message,
        serviceKey,
        metadata: {
          recruitmentId: recruitment.id,
          applicationId,
          productId: recruitment.productId,
          eventType: type,
          targetUrl: resolveRecruitmentApplicationTargetUrl(serviceKey),
        },
      });
    } catch (e) {
      logger.warn(`[SellerRecruitmentService] applicant notification failed (best-effort): ${type} app=${applicationId}`, e);
    }
  }
}

/** 참여 해지 = cancelled 이면서 결정자가 모집 공급자(신청자 본인 철회와 구분) */
function isParticipationTerminated(status: string, decidedBy: string | null, supplierUserId: string): boolean {
  return status === ApplicationStatus.CANCELLED && !!decidedBy && decidedBy === supplierUserId;
}
