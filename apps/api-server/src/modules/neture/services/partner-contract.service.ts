import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  NeturePartnerRecruitment,
  NeturePartnerApplication,
  NeturePartnerDashboardItem,
  NetureSellerPartnerContract,
  ContractStatus,
  ContractTerminatedBy,
  RecruitmentStatus,
  ExposureStatus,
  ApplicationStatus,
} from '../entities/index.js';
import { NeturePartner } from '../../../routes/neture/entities/neture-partner.entity.js';
import { ServiceMembership } from '../../auth/entities/ServiceMembership.js';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
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
 * → 상대 경로만 필요(cross-domain 절대 URL 불필요). 매장 3서비스는 동일하게
 *   `/store/commerce/recruitment-applications`(basePath '/store' + subPath), Neture 는
 *   partner 영역 `/partner/recruitment-applications`. unknown/empty 는 Neture 로 fallback.
 */
const STORE_RECRUITMENT_APPLICATIONS_ROUTE = '/store/commerce/recruitment-applications';
const NETURE_RECRUITMENT_APPLICATIONS_ROUTE = '/partner/recruitment-applications';

export function resolveRecruitmentApplicationTargetUrl(serviceKey?: string): string {
  switch (serviceKey) {
    case 'kpa-society':
    case 'glycopharm':
    case 'k-cosmetics':
    case 'cosmetics': // service-catalog canonical 은 'k-cosmetics' 이나 일부 경로가 'cosmetics' 사용
      return STORE_RECRUITMENT_APPLICATIONS_ROUTE;
    default:
      // 'neture' / undefined / 알 수 없는 serviceKey → Neture partner 신청·승인 현황(안전 fallback)
      return NETURE_RECRUITMENT_APPLICATIONS_ROUTE;
  }
}

/**
 * NeturePartnerContractService
 *
 * Partner recruitment, application (approve/reject), contract CRUD.
 * Merged G5 (PartnerApplication) + G6 (Contract) because approvePartnerApplication
 * uses a transaction spanning both application and contract repositories.
 *
 * Extracted from NetureService (WO-O4O-NETURE-SERVICE-SPLIT-V1 Phase 2).
 */
export class NeturePartnerContractService {
  // Lazy repositories
  private _recruitmentRepo?: Repository<NeturePartnerRecruitment>;
  private _applicationRepo?: Repository<NeturePartnerApplication>;
  private _contractRepo?: Repository<NetureSellerPartnerContract>;
  private _partnerEntityRepo?: Repository<NeturePartner>;
  private _membershipRepo?: Repository<ServiceMembership>;

  private get recruitmentRepo(): Repository<NeturePartnerRecruitment> {
    if (!this._recruitmentRepo) {
      this._recruitmentRepo = AppDataSource.getRepository(NeturePartnerRecruitment);
    }
    return this._recruitmentRepo;
  }

  private get applicationRepo(): Repository<NeturePartnerApplication> {
    if (!this._applicationRepo) {
      this._applicationRepo = AppDataSource.getRepository(NeturePartnerApplication);
    }
    return this._applicationRepo;
  }

  private get contractRepo(): Repository<NetureSellerPartnerContract> {
    if (!this._contractRepo) {
      this._contractRepo = AppDataSource.getRepository(NetureSellerPartnerContract);
    }
    return this._contractRepo;
  }

  private get partnerEntityRepo(): Repository<NeturePartner> {
    if (!this._partnerEntityRepo) {
      this._partnerEntityRepo = AppDataSource.getRepository(NeturePartner);
    }
    return this._partnerEntityRepo;
  }

  private get membershipRepo(): Repository<ServiceMembership> {
    if (!this._membershipRepo) {
      this._membershipRepo = AppDataSource.getRepository(ServiceMembership);
    }
    return this._membershipRepo;
  }

  // ==================== User-Partner Linking (WO-NETURE-IDENTITY-DOMAIN-STATUS-SEPARATION-V1) ====================

  /**
   * Get partner by user ID
   */
  async getPartnerByUserId(userId: string): Promise<NeturePartner | null> {
    try {
      return await this.partnerEntityRepo.findOne({
        where: { userId },
      });
    } catch (error) {
      logger.error('[NeturePartnerContractService] Error finding partner by user ID:', error);
      return null;
    }
  }

  // ==================== Partner Recruitment (WO-O4O-PARTNER-RECRUITMENT-API-IMPLEMENTATION-V1) ====================

  /**
   * 파트너 모집 목록 조회
   */
  /**
   * 모집 목록 조회.
   * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1:
   *  - exposureStatus 필터(public browse 는 컨트롤러에서 APPROVED 강제 → 미승인/반려 모집 미노출)
   *  - serviceKey scope(serviceId 일치) — 누락 시 노출은 exposureStatus 게이트로만 제한
   */
  async getPartnerRecruitments(filters?: {
    status?: RecruitmentStatus;
    serviceKey?: string;
    exposureStatus?: ExposureStatus;
  }) {
    try {
      const where: Record<string, unknown> = {};
      if (filters?.status) where.status = filters.status;
      if (filters?.serviceKey) where.serviceId = filters.serviceKey;
      if (filters?.exposureStatus) where.exposureStatus = filters.exposureStatus;

      const recruitments = await this.recruitmentRepo.find({
        where,
        order: { createdAt: 'DESC' },
      });

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
    } catch (error) {
      logger.error('[NeturePartnerContractService] Error fetching partner recruitments:', error);
      throw error;
    }
  }

  /**
   * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1
   * 운영자 노출 승인 큐 — serviceKey/exposureStatus/status 필터. 감사 필드 포함.
   * (serviceKey 별 권한 enforcement 는 operator-UI WO 에서 결정 — 현재 neture:operator 큐.)
   */
  async getRecruitmentsForExposureReview(filters?: {
    serviceKey?: string;
    exposureStatus?: ExposureStatus;
    status?: RecruitmentStatus;
  }) {
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
   * 운영자 노출 승인/반려. RecruitmentStatus(운영 상태) 는 건드리지 않는다.
   * 이미 같은 상태면 idempotent 성공.
   */
  async setRecruitmentExposure(
    recruitmentId: string,
    operatorUserId: string,
    decision: ExposureStatus.APPROVED | ExposureStatus.REJECTED,
    note?: string,
  ) {
    const recruitment = await this.recruitmentRepo.findOne({ where: { id: recruitmentId } });
    if (!recruitment) return { success: false as const, error: 'RECRUITMENT_NOT_FOUND' };

    if (recruitment.exposureStatus === decision) {
      return { success: true as const, data: { id: recruitmentId, exposureStatus: decision, idempotent: true } };
    }

    recruitment.exposureStatus = decision;
    recruitment.exposureReviewedAt = new Date();
    recruitment.exposureReviewedBy = operatorUserId;
    recruitment.exposureReviewNote = note?.trim() || null;
    await this.recruitmentRepo.save(recruitment);
    logger.info(`[NeturePartnerContractService] recruitment exposure ${decision}: ${recruitmentId} by ${operatorUserId}`);
    return { success: true as const, data: { id: recruitment.id, exposureStatus: decision } };
  }

  /**
   * WO-O4O-SELLER-RECRUITMENT-SUPPLIER-STATUS-VIEW-V1
   *
   * 공급자(모집 주체) 본인이 생성한 모집 목록 + 신청 카운트(전체/대기/승인/반려).
   * sellerId = 공급자 user id (생성 시 저장값과 동일).
   */
  async getSellerRecruitments(sellerUserId: string) {
    const recruitments = await this.recruitmentRepo.find({
      where: { sellerId: sellerUserId },
      order: { createdAt: 'DESC' },
    });
    if (!recruitments.length) return [];

    const ids = recruitments.map((r) => r.id);
    const countRows: Array<{ recruitment_id: string; status: string; cnt: number }> = await AppDataSource.query(
      `SELECT recruitment_id, status, COUNT(*)::int AS cnt
       FROM neture_partner_applications
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
      createdAt: r.createdAt,
      applications: countMap.get(r.id) || { total: 0, pending: 0, approved: 0, rejected: 0 },
    }));
  }

  /**
   * WO-O4O-SELLER-RECRUITMENT-CLOSE-ACTION-V1
   *
   * 공급자가 본인 모집을 마감한다(신규 신청 차단). 기존 신청/승인/계약/C bridge 결과는 유지.
   * 소유권: recruitment.sellerId === sellerUserId. 이미 closed 면 idempotent 성공.
   * (신규 신청 차단은 createPartnerApplication 의 status 검증으로 이미 동작 — 본 메서드는 status 전환만.)
   */
  async closeRecruitment(recruitmentId: string, sellerUserId: string) {
    const recruitment = await this.recruitmentRepo.findOne({ where: { id: recruitmentId } });
    if (!recruitment || recruitment.sellerId !== sellerUserId) {
      return { success: false as const, error: 'NOT_FOUND' };
    }
    if (recruitment.status !== RecruitmentStatus.CLOSED) {
      recruitment.status = RecruitmentStatus.CLOSED;
      await this.recruitmentRepo.save(recruitment);
      logger.info(`[NeturePartnerContractService] Recruitment closed: ${recruitment.id}`);
    }
    return { success: true as const, data: { id: recruitment.id, status: recruitment.status } };
  }

  /**
   * WO-O4O-SELLER-RECRUITMENT-REOPEN-ACTION-V1
   *
   * 공급자가 본인 마감 모집을 재개한다(다시 신규 신청 가능). 기존 신청/승인/계약/C bridge 결과는 유지.
   * 소유권: recruitment.sellerId === sellerUserId. 이미 recruiting 이면 idempotent 성공.
   * (신규 신청 차단은 createPartnerApplication 의 status 검증으로 동작 — RECRUITING 전환 시 자동 재허용.)
   */
  async reopenRecruitment(recruitmentId: string, sellerUserId: string) {
    const recruitment = await this.recruitmentRepo.findOne({ where: { id: recruitmentId } });
    if (!recruitment || recruitment.sellerId !== sellerUserId) {
      return { success: false as const, error: 'NOT_FOUND' };
    }
    if (recruitment.status !== RecruitmentStatus.RECRUITING) {
      recruitment.status = RecruitmentStatus.RECRUITING;
      await this.recruitmentRepo.save(recruitment);
      logger.info(`[NeturePartnerContractService] Recruitment reopened: ${recruitment.id}`);
    }
    return { success: true as const, data: { id: recruitment.id, status: recruitment.status } };
  }

  /**
   * WO-O4O-SELLER-RECRUITMENT-PARTICIPATION-TERMINATION-V1
   *
   * 승인된 판매자의 모집 참여를 해지한다(= 신규 조달 노출 중단). "계약 해지 전체"가 아니라 "모집 참여 해지".
   * 정책: application 은 approved 유지(rejected 로 되돌리지 않음). RBAC 회수·주문 취소·정산 제외. 기존 주문 이력 유지.
   *  ① 소유권: recruitment.sellerId === sellerUserId, application=approved
   *  ② contract(by applicationId) ACTIVE → TERMINATED
   *  ③ offer.allowed_seller_ids 에서 partner userId 제거 (array_remove — 조달 노출/신규 주문 차단)
   *  ④ source_type='seller_recruitment' OPL is_active=false (삭제 아님, 매장 listing 노출 차단)
   * idempotent, 소유권 외 best-effort.
   */
  async terminateParticipation(applicationId: string, sellerUserId: string) {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) return { success: false as const, error: 'APPLICATION_NOT_FOUND' };
    const recruitment = await this.recruitmentRepo.findOne({ where: { id: application.recruitmentId } });
    if (!recruitment || recruitment.sellerId !== sellerUserId) return { success: false as const, error: 'NOT_OWNER' };
    if (application.status !== ApplicationStatus.APPROVED) return { success: false as const, error: 'NOT_APPROVED' };

    // ② contract TERMINATED (있을 때만, idempotent)
    const contract = await this.contractRepo.findOne({ where: { applicationId, contractStatus: ContractStatus.ACTIVE } });
    if (contract) {
      contract.contractStatus = ContractStatus.TERMINATED;
      contract.terminatedBy = ContractTerminatedBy.SELLER;
      contract.endedAt = new Date();
      await this.contractRepo.save(contract);
    }

    // ③④ offer 해소 → allowedSellerIds 제거 + seller_recruitment OPL 비활성화
    const offerRows: Array<{ id: string }> = await AppDataSource.query(
      `SELECT spo.id
       FROM supplier_product_offers spo
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       WHERE spo.master_id = $1 AND ns.user_id = $2 AND spo.deleted_at IS NULL
       ORDER BY (spo.distribution_type = 'PRIVATE') DESC, (spo.approval_status = 'APPROVED') DESC, spo.created_at DESC
       LIMIT 1`,
      [recruitment.productId, sellerUserId],
    );
    if (offerRows.length) {
      const offerId = offerRows[0].id;
      await AppDataSource.query(
        `UPDATE supplier_product_offers
         SET allowed_seller_ids = array_remove(coalesce(allowed_seller_ids, '{}'), $1), updated_at = NOW()
         WHERE id = $2`,
        [application.partnerId, offerId],
      );
      const orgRows: Array<{ organization_id: string }> = await AppDataSource.query(
        `SELECT organization_id FROM organization_members WHERE user_id = $1 AND left_at IS NULL LIMIT 1`,
        [application.partnerId],
      );
      if (orgRows.length) {
        await AppDataSource.query(
          `UPDATE organization_product_listings
           SET is_active = false, updated_at = NOW()
           WHERE offer_id = $1 AND organization_id = $2 AND source_type = 'seller_recruitment'`,
          [offerId, orgRows[0].organization_id],
        );
      }
      logger.info(`[Participation] terminated app=${applicationId} partner=${application.partnerId} offer=${offerId}`);
    } else {
      logger.warn(`[Participation] offer not found — allowedSellerIds/OPL cleanup skipped (app=${applicationId})`);
    }

    // WO-O4O-SELLER-RECRUITMENT-SELLER-NOTIFICATION-V1
    await this.notifyApplicant(
      application.partnerId,
      'recruitment.participation_terminated',
      '판매자 모집 참여가 해지되었습니다.',
      `${recruitment.productName} 모집 제품의 조달 가능 상태가 종료되었습니다. 기존 주문 이력은 유지됩니다.`,
      recruitment,
      application.id,
    );

    return { success: true as const, data: { applicationId, contractTerminated: !!contract } };
  }

  /**
   * WO-O4O-MY-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1
   *
   * 판매자(신청자) 본인이 신청한 모집 목록 + 상태(심사대기/승인/반려/참여해지).
   * partnerId = req.user.id. 참여 해지는 contract.contractStatus 로 파생(공급자 측과 동일).
   */
  async getApplicationsForPartner(partnerUserId: string) {
    const rows: Array<{
      id: string; recruitment_id: string; status: string; applied_at: Date; decided_at: Date | null; reason: string | null;
      product_id: string; product_name: string; seller_name: string | null; service_id: string | null;
      contract_status: string | null;
    }> = await AppDataSource.query(
      `SELECT a.id, a.recruitment_id, a.status, a.applied_at, a.decided_at, a.reason,
              r.product_id, r.product_name, r.seller_name, r.service_id,
              (SELECT c.contract_status FROM neture_seller_partner_contracts c
               WHERE c.application_id = a.id ORDER BY c.created_at DESC LIMIT 1) AS contract_status
       FROM neture_partner_applications a
       JOIN neture_partner_recruitments r ON r.id = a.recruitment_id
       WHERE a.partner_id = $1
       ORDER BY a.applied_at DESC`,
      [partnerUserId],
    );
    return rows.map((a) => ({
      applicationId: a.id,
      recruitmentId: a.recruitment_id,
      productId: a.product_id,
      productName: a.product_name,
      supplierName: a.seller_name || '',
      serviceId: a.service_id || '',
      status: a.status, // pending | approved | rejected | cancelled
      participationTerminated: a.contract_status === 'terminated',
      appliedAt: a.applied_at,
      decidedAt: a.decided_at,
      reason: a.reason || '',
    }));
  }

  /**
   * WO-O4O-SELLER-RECRUITMENT-APPLICATION-CANCEL-V1
   *
   * 판매자/매장 신청자 본인이 pending 신청을 직접 철회한다.
   *  - 소유권: application.partnerId === partnerUserId
   *  - pending 만 취소 가능(approved/rejected/cancelled 불가)
   *  - 이미 cancelled 이면 idempotent 성공
   *  - C bridge / contract / allowedSellerIds / OPL / RBAC 무변경(pending 단계)
   *  - 공급자 알림 미발송(이번 WO 범위 외 — 공급자는 화면에서 취소 상태 확인)
   */
  async cancelApplication(applicationId: string, partnerUserId: string) {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) return { success: false as const, error: 'APPLICATION_NOT_FOUND' };
    if (application.partnerId !== partnerUserId) return { success: false as const, error: 'NOT_OWNER' };
    if (application.status === ApplicationStatus.CANCELLED) {
      return { success: true as const, data: { applicationId, alreadyCancelled: true } };
    }
    if (application.status !== ApplicationStatus.PENDING) return { success: false as const, error: 'NOT_PENDING' };

    application.status = ApplicationStatus.CANCELLED;
    application.decidedAt = new Date();
    application.decidedBy = partnerUserId; // 신청자 본인 철회
    await this.applicationRepo.save(application);
    logger.info(`[NeturePartnerContractService] application cancelled by applicant: app=${applicationId} partner=${partnerUserId}`);
    return { success: true as const, data: { applicationId } };
  }

  /**
   * WO-O4O-SELLER-RECRUITMENT-SUPPLIER-APPLICATION-REVIEW-V1
   *
   * 공급자 본인 모집의 신청자 목록 + 모집 요약 (소유권: recruitment.sellerId === sellerUserId).
   * 미존재/타 공급자 모집 → null (controller 404).
   */
  async getRecruitmentApplications(recruitmentId: string, sellerUserId: string) {
    const recruitment = await this.recruitmentRepo.findOne({ where: { id: recruitmentId } });
    if (!recruitment || recruitment.sellerId !== sellerUserId) return null;

    const rows: Array<{
      id: string; partner_id: string; partner_name: string | null; status: string;
      applied_at: Date; decided_at: Date | null; reason: string | null;
      partner_user_name: string | null; partner_email: string | null; organization_name: string | null;
      contract_status: string | null;
    }> = await AppDataSource.query(
      `SELECT a.id, a.partner_id, a.partner_name, a.status, a.applied_at, a.decided_at, a.reason,
              u.name AS partner_user_name, u.email AS partner_email,
              (SELECT o.name FROM organization_members om
                 JOIN organizations o ON o.id = om.organization_id
               WHERE om.user_id = a.partner_id AND om.left_at IS NULL LIMIT 1) AS organization_name,
              (SELECT c.contract_status FROM neture_seller_partner_contracts c
               WHERE c.application_id = a.id ORDER BY c.created_at DESC LIMIT 1) AS contract_status
       FROM neture_partner_applications a
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
        createdAt: recruitment.createdAt,
      },
      applications: rows.map((a) => ({
        id: a.id,
        partnerId: a.partner_id,
        partnerName: a.partner_name || a.partner_user_name || '신청자',
        partnerEmail: a.partner_email || '',
        organizationName: a.organization_name || '',
        status: a.status,
        appliedAt: a.applied_at,
        decidedAt: a.decided_at,
        reason: a.reason || '',
        // WO-O4O-SELLER-RECRUITMENT-PARTICIPATION-TERMINATION-V1: 참여 해지 파생 상태(contract=terminated)
        participationTerminated: a.contract_status === 'terminated',
      })),
    };
  }

  /**
   * WO-O4O-SELLER-RECRUITMENT-CREATION-FLOW-V1
   *
   * 공급자가 등록된 PRIVATE 제품으로 판매자 모집을 생성한다.
   *  - offer 해소: master_id + 공급자 user_id → PRIVATE offer (없으면 차단)
   *  - 의약품 gate: 규제 상품은 약국 대상 서비스에서만
   *  - sellerId = 공급자 user id (C bridge offer 해소 전제), productId = master_id
   *  - 가격 구조 변경 없음 (commissionRate/consumerPrice 는 모집 commission/참조값)
   */
  async createRecruitment(
    sellerUserId: string,
    input: { masterId?: string; serviceKey?: string; commissionRate?: number; consumerPrice?: number; shopUrl?: string; imageUrl?: string },
  ) {
    const masterId = (input.masterId || '').trim();
    const serviceKey = (input.serviceKey || '').trim();
    if (!masterId) return { success: false as const, error: 'MASTER_ID_REQUIRED' };
    if (!serviceKey) return { success: false as const, error: 'SERVICE_KEY_REQUIRED' };

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
      [masterId, sellerUserId],
    );
    if (!rows.length) return { success: false as const, error: 'OFFER_NOT_FOUND' };
    const offer = rows[0];

    // [결정 1·2] 판매자 모집은 PRIVATE 유통 제품만 (없으면 차단 — PRIVATE offer 자동생성은 후속)
    if (offer.distribution_type !== 'PRIVATE') {
      return { success: false as const, error: 'OFFER_NOT_PRIVATE' };
    }

    // [결정 3] 의약품/규제 상품 → 약국 대상 서비스에만
    if (offer.is_regulated) {
      const isPharmacyAudience = await new ServiceAudienceService(AppDataSource).getPharmacyAudienceResolver();
      if (!isPharmacyAudience(serviceKey)) {
        return { success: false as const, error: 'DRUG_SERVICE_NOT_PHARMACY_AUDIENCE' };
      }
    }

    // UNIQUE(productId, sellerId) — 제품당 1 모집
    const existing = await this.recruitmentRepo.findOne({ where: { productId: masterId, sellerId: sellerUserId } });
    if (existing) return { success: false as const, error: 'RECRUITMENT_ALREADY_EXISTS' };

    const commissionRate = Number.isFinite(Number(input.commissionRate))
      ? Math.max(0, Math.min(100, Number(input.commissionRate)))
      : 0;
    const consumerPrice = Number.isFinite(Number(input.consumerPrice)) ? Math.max(0, Number(input.consumerPrice)) : 0;

    const recruitment = this.recruitmentRepo.create({
      productId: masterId,
      productName: offer.product_name,
      manufacturer: offer.manufacturer ?? undefined,
      sellerId: sellerUserId, // 공급자 user id — C bridge offer 해소 전제
      sellerName: offer.seller_name || '공급자',
      serviceId: serviceKey,
      consumerPrice,
      commissionRate,
      shopUrl: input.shopUrl?.trim() || undefined,
      imageUrl: input.imageUrl?.trim() || undefined,
      status: RecruitmentStatus.RECRUITING,
      // WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1: 신규 모집은 운영자 노출 승인 대기
      exposureStatus: ExposureStatus.PENDING,
    });
    const saved = await this.recruitmentRepo.save(recruitment);
    logger.info(`[NeturePartnerContractService] Recruitment created: ${saved.id} (master=${masterId}, sellerUser=${sellerUserId}, service=${serviceKey})`);
    return { success: true as const, data: { id: saved.id, productId: saved.productId, serviceId: saved.serviceId, status: saved.status } };
  }

  /**
   * 파트너 신청
   */
  async createPartnerApplication(recruitmentId: string, partnerId: string, partnerName: string) {
    try {
      // 모집 공고 확인
      const recruitment = await this.recruitmentRepo.findOne({ where: { id: recruitmentId } });
      if (!recruitment) {
        throw new Error('RECRUITMENT_NOT_FOUND');
      }
      if (recruitment.status !== RecruitmentStatus.RECRUITING) {
        throw new Error('RECRUITMENT_CLOSED');
      }
      // WO-O4O-SELLER-RECRUITMENT-EXPOSURE-BACKEND-V1: 노출 승인되지 않은 모집은 신청 방어 차단
      if (recruitment.exposureStatus !== ExposureStatus.APPROVED) {
        throw new Error('RECRUITMENT_NOT_EXPOSED');
      }

      // 중복 신청 확인
      const existing = await this.applicationRepo.findOne({
        where: { recruitmentId, partnerId },
      });
      if (existing) {
        throw new Error('DUPLICATE_APPLICATION');
      }

      const application = this.applicationRepo.create({
        recruitmentId,
        partnerId,
        partnerName,
        status: ApplicationStatus.PENDING,
        appliedAt: new Date(),
      });

      const saved = await this.applicationRepo.save(application);
      logger.info(`[NeturePartnerContractService] Partner application created: ${saved.id}`);

      return { id: saved.id, status: saved.status, appliedAt: saved.appliedAt };
    } catch (error) {
      logger.error('[NeturePartnerContractService] Error creating partner application:', error);
      throw error;
    }
  }

  /**
   * 파트너 신청 승인 + 대시보드 자동 등록
   */
  async approvePartnerApplication(applicationId: string, sellerId: string) {
    try {
      // 사전 검증 (트랜잭션 외부 — read-only 검증)
      const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
      if (!application) {
        throw new Error('APPLICATION_NOT_FOUND');
      }
      if (application.status !== ApplicationStatus.PENDING) {
        throw new Error('INVALID_STATUS');
      }

      const recruitment = await this.recruitmentRepo.findOne({ where: { id: application.recruitmentId } });
      if (!recruitment) {
        throw new Error('RECRUITMENT_NOT_FOUND');
      }
      if (recruitment.sellerId !== sellerId) {
        throw new Error('NOT_RECRUITMENT_OWNER');
      }

      // 트랜잭션: 승인 + 계약 생성 + 대시보드 등록 (WO-NETURE-SELLER-PARTNER-CONTRACT-ATOMICITY-PATCH-V1)
      await AppDataSource.transaction(async (manager) => {
        // 1. Active 계약 중복 체크 (선행)
        const txContractRepo = manager.getRepository(NetureSellerPartnerContract);
        const existingContract = await txContractRepo.findOne({
          where: { sellerId: recruitment.sellerId, partnerId: application.partnerId, contractStatus: ContractStatus.ACTIVE },
        });
        if (existingContract) {
          throw new Error('ACTIVE_CONTRACT_EXISTS');
        }

        // 2. Application 승인
        const txApplicationRepo = manager.getRepository(NeturePartnerApplication);
        application.status = ApplicationStatus.APPROVED;
        application.decidedAt = new Date();
        application.decidedBy = sellerId;
        await txApplicationRepo.save(application);

        // 3. 계약 생성
        const contract = txContractRepo.create({
          sellerId: recruitment.sellerId,
          partnerId: application.partnerId,
          recruitmentId: recruitment.id,
          applicationId: application.id,
          commissionRate: recruitment.commissionRate,
          startedAt: new Date(),
        });
        await txContractRepo.save(contract);
        logger.info(`[NeturePartnerContractService] Contract created: ${contract.id} (seller=${recruitment.sellerId}, partner=${application.partnerId})`);

        // 4. 파트너 대시보드에 자동 등록
        const txDashboardRepo = manager.getRepository(NeturePartnerDashboardItem);
        const existingItem = await txDashboardRepo.findOne({
          where: { partnerUserId: application.partnerId, productId: recruitment.productId },
        });

        if (!existingItem) {
          const item = txDashboardRepo.create({
            partnerUserId: application.partnerId,
            productId: recruitment.productId,
            serviceId: recruitment.serviceId || 'glycopharm',
            status: 'active',
          });
          await txDashboardRepo.save(item);
          logger.info(`[NeturePartnerContractService] Auto-added dashboard item for partner ${application.partnerId}`);
        }
      });

      // WO-NETURE-PARTNER-RBAC-ASSIGNMENT-FIX-V1: Sync membership + RBAC (matches supplier approval pattern)
      if (application.partnerId) {
        // 1. Service membership: ensure active
        const membership = await this.membershipRepo.findOne({
          where: { userId: application.partnerId, serviceKey: 'neture' },
        });
        if (membership && membership.status !== 'active') {
          membership.status = 'active';
          await this.membershipRepo.save(membership);
          logger.info(`[NeturePartnerContractService] Membership activated for partner user ${application.partnerId}`);
        }

        // 2. RBAC: assign partner role (WO-NETURE-ROLE-NORMALIZATION-V1: unprefixed)
        await roleAssignmentService.assignRole({
          userId: application.partnerId,
          role: 'partner',
          assignedBy: sellerId,
        });
        logger.info(`[NeturePartnerContractService] Role partner assigned to user ${application.partnerId}`);
      }

      // WO-O4O-SELLER-RECRUITMENT-C-BRIDGE-BACKEND-V1:
      // 모집 승인 → 판매자 주문 가능화. 계약/RBAC 와 독립한 best-effort(실패해도 승인은 유지, idempotent).
      //  ① master_id + 공급자 user_id 로 offer 해소
      //  ② 의약품 gate 재확인 (모집은 createSupplierOffer 미경유 → 여기서 보강)
      //  ③ allowedSellerIds(USER id) 에 판매자 추가 = 조달 주문 가능화 (조달 쿼리는 OPL 미참조)
      //  ④ 판매자 organization OPL 생성 (매장 listing, price=NULL 옵션 A 유지)
      try {
        await this.bridgeRecruitmentToOrderable(recruitment, application.partnerId);
      } catch (bridgeError) {
        logger.error(`[NeturePartnerContractService] C-bridge failed (approval kept): application=${application.id}`, bridgeError);
      }

      // WO-O4O-SELLER-RECRUITMENT-SELLER-NOTIFICATION-V1
      await this.notifyApplicant(
        application.partnerId,
        'recruitment.application_approved',
        '판매자 모집 신청이 승인되었습니다.',
        `${recruitment.productName} 판매자 모집 신청이 승인되었습니다. 해당 모집 제품을 조달 가능한 상품으로 확인할 수 있습니다.`,
        recruitment,
        application.id,
      );

      return { id: application.id, status: application.status };
    } catch (error) {
      logger.error('[NeturePartnerContractService] Error approving partner application:', error);
      throw error;
    }
  }

  /**
   * WO-O4O-SELLER-RECRUITMENT-C-BRIDGE-BACKEND-V1
   *
   * 모집 승인된 제품을 판매자가 주문 가능한 상태로 완성한다 (best-effort, idempotent).
   *  - offer 해소: recruitment.productId(=master_id) + recruitment.sellerId(=공급자 user_id)
   *  - 의약품 gate: 규제 상품은 약국 대상 서비스에서만 (service_audience_policies)
   *  - allowedSellerIds(USER id) += 판매자 → 조달(B2B supply) 주문 가능화
   *  - 판매자 organization OPL 생성 (매장 listing, price=NULL = 가격 정책 옵션 A 유지)
   */
  private async bridgeRecruitmentToOrderable(
    recruitment: NeturePartnerRecruitment,
    partnerUserId: string,
  ): Promise<void> {
    const serviceKey = recruitment.serviceId || 'neture';

    // ① offer 해소 (master_id + 공급자 user_id). PRIVATE·APPROVED 우선.
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
      logger.warn(`[C-Bridge] offer not found (master=${recruitment.productId}, sellerUser=${recruitment.sellerId}) — bridge skipped`);
      return;
    }
    const offer = offerRows[0];

    // ② 의약품 gate 재확인 — 규제 상품은 약국 대상 서비스에만 연결
    if (offer.is_regulated) {
      const isPharmacyAudience = await new ServiceAudienceService(AppDataSource).getPharmacyAudienceResolver();
      if (!isPharmacyAudience(serviceKey)) {
        logger.warn(`[C-Bridge] regulated product → non-pharmacy service(${serviceKey}) — bridge skipped (offer=${offer.id})`);
        return;
      }
    }

    // ③ allowedSellerIds(USER id) += 판매자 (idempotent)
    const current = offer.allowed_seller_ids || [];
    if (!current.includes(partnerUserId)) {
      await AppDataSource.query(
        `UPDATE supplier_product_offers
         SET allowed_seller_ids = array_append(coalesce(allowed_seller_ids, '{}'), $1), updated_at = NOW()
         WHERE id = $2`,
        [partnerUserId, offer.id],
      );
      logger.info(`[C-Bridge] allowedSellerIds += partner ${partnerUserId} (offer=${offer.id})`);
    }

    // ④ 판매자 organization OPL 생성 (org 없으면 skip — allowedSellerIds 는 이미 적용)
    const orgRows: Array<{ organization_id: string }> = await AppDataSource.query(
      `SELECT organization_id FROM organization_members WHERE user_id = $1 AND left_at IS NULL LIMIT 1`,
      [partnerUserId],
    );
    if (!orgRows.length) {
      logger.warn(`[C-Bridge] partner ${partnerUserId} has no organization — OPL skipped (allowedSellerIds applied)`);
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

  /**
   * 파트너 신청 거절
   */
  /**
   * WO-O4O-SELLER-RECRUITMENT-SELLER-NOTIFICATION-V1
   * 판매자(신청자)에게 in-app 알림 — best-effort(실패해도 원 처리 성공 유지).
   */
  private async notifyApplicant(
    partnerUserId: string,
    type: NotificationType,
    title: string,
    message: string,
    recruitment: NeturePartnerRecruitment,
    applicationId: string,
  ): Promise<void> {
    try {
      const serviceKey = recruitment.serviceId || undefined;
      await notificationService.createNotification({
        userId: partnerUserId,
        type,
        title,
        message,
        serviceKey,
        metadata: {
          recruitmentId: recruitment.id,
          applicationId,
          productId: recruitment.productId,
          eventType: type,
          // WO-O4O-CROSSSERVICE-SELLER-RECRUITMENT-NOTIFICATION-TARGETURL-V1:
          // 알림은 serviceKey 로 필터되어 해당 서비스 앱 헤더에서만 노출되고, 헤더는
          // metadata.targetUrl 로 자기 도메인 내 상대 이동(navigate)한다. 따라서
          // serviceKey 별로 해당 앱의 신청·승인 현황 route 를 지정한다(dead link 0).
          targetUrl: resolveRecruitmentApplicationTargetUrl(serviceKey),
        },
      });
    } catch (e) {
      logger.warn(`[NeturePartnerContractService] applicant notification failed (best-effort): ${type} app=${applicationId}`, e);
    }
  }

  async rejectPartnerApplication(applicationId: string, sellerId: string, reason?: string) {
    try {
      const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
      if (!application) {
        throw new Error('APPLICATION_NOT_FOUND');
      }
      if (application.status !== ApplicationStatus.PENDING) {
        throw new Error('INVALID_STATUS');
      }

      // 모집 주체 확인
      const recruitment = await this.recruitmentRepo.findOne({ where: { id: application.recruitmentId } });
      if (!recruitment) {
        throw new Error('RECRUITMENT_NOT_FOUND');
      }
      if (recruitment.sellerId !== sellerId) {
        throw new Error('NOT_RECRUITMENT_OWNER');
      }

      application.status = ApplicationStatus.REJECTED;
      application.decidedAt = new Date();
      application.decidedBy = sellerId;
      application.reason = reason || '';
      await this.applicationRepo.save(application);

      // WO-O4O-SELLER-RECRUITMENT-SELLER-NOTIFICATION-V1
      await this.notifyApplicant(
        application.partnerId,
        'recruitment.application_rejected',
        '판매자 모집 신청이 반려되었습니다.',
        `${recruitment.productName} 판매자 모집 신청이 반려되었습니다. 자세한 사유는 모집 신청 내역을 확인해 주세요.`,
        recruitment,
        application.id,
      );

      return { id: application.id, status: application.status };
    } catch (error) {
      logger.error('[NeturePartnerContractService] Error rejecting partner application:', error);
      throw error;
    }
  }

  // ==================== Seller-Partner Contracts (WO-NETURE-SELLER-PARTNER-CONTRACT-V1) ====================

  /**
   * 계약 해지 (seller 또는 partner)
   */
  async terminateContract(
    contractId: string,
    actorId: string,
    actorType: 'seller' | 'partner',
  ) {
    const where =
      actorType === 'seller'
        ? { id: contractId, sellerId: actorId }
        : { id: contractId, partnerId: actorId };

    const contract = await this.contractRepo.findOne({ where });
    if (!contract) {
      throw new Error('CONTRACT_NOT_FOUND');
    }
    if (contract.contractStatus !== ContractStatus.ACTIVE) {
      throw new Error('CONTRACT_NOT_ACTIVE');
    }

    contract.contractStatus = ContractStatus.TERMINATED;
    contract.terminatedBy = actorType === 'seller' ? ContractTerminatedBy.SELLER : ContractTerminatedBy.PARTNER;
    contract.endedAt = new Date();
    const saved = await this.contractRepo.save(contract);

    logger.info(`[NeturePartnerContractService] Contract terminated: ${contractId} by ${actorType} ${actorId}`);
    return saved;
  }

  /**
   * Seller 계약 목록 조회
   */
  async getSellerContracts(sellerId: string, status?: string) {
    const where: { sellerId: string; contractStatus?: ContractStatus } = { sellerId };
    if (status && Object.values(ContractStatus).includes(status as ContractStatus)) {
      where.contractStatus = status as ContractStatus;
    }
    return this.contractRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  /**
   * Partner 계약 목록 조회
   */
  async getPartnerContracts(partnerId: string, status?: string) {
    const where: { partnerId: string; contractStatus?: ContractStatus } = { partnerId };
    if (status && Object.values(ContractStatus).includes(status as ContractStatus)) {
      where.contractStatus = status as ContractStatus;
    }
    return this.contractRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  /**
   * 수수료 변경 (기존 계약 terminated → 신규 계약 생성)
   */
  async updateCommissionRate(contractId: string, newRate: number, sellerId: string) {
    const existing = await this.contractRepo.findOne({
      where: { id: contractId, sellerId, contractStatus: ContractStatus.ACTIVE },
    });
    if (!existing) {
      throw new Error('ACTIVE_CONTRACT_NOT_FOUND');
    }

    // 기존 계약 종료
    existing.contractStatus = ContractStatus.TERMINATED;
    existing.terminatedBy = ContractTerminatedBy.SELLER;
    existing.endedAt = new Date();
    await this.contractRepo.save(existing);

    // 신규 계약 생성 (새 commission_rate)
    const newContract = this.contractRepo.create({
      sellerId: existing.sellerId,
      partnerId: existing.partnerId,
      recruitmentId: existing.recruitmentId,
      applicationId: existing.applicationId,
      commissionRate: newRate,
      startedAt: new Date(),
    });
    const saved = await this.contractRepo.save(newContract);

    logger.info(`[NeturePartnerContractService] Commission updated: old=${contractId} terminated, new=${saved.id} rate=${newRate}`);
    return { terminated: { id: existing.id }, created: saved };
  }
}
