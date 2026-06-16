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
  ApplicationStatus,
} from '../entities/index.js';
import { NeturePartner } from '../../../routes/neture/entities/neture-partner.entity.js';
import { ServiceMembership } from '../../auth/entities/ServiceMembership.js';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
// WO-O4O-SELLER-RECRUITMENT-C-BRIDGE-BACKEND-V1: 약국 대상 서비스 정책(의약품 gate 재확인)
import { ServiceAudienceService } from './service-audience.service.js';
import logger from '../../../utils/logger.js';

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
  async getPartnerRecruitments(filters?: { status?: RecruitmentStatus }) {
    try {
      const where: Record<string, unknown> = {};
      if (filters?.status) {
        where.status = filters.status;
      }

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
        createdAt: r.createdAt,
      }));
    } catch (error) {
      logger.error('[NeturePartnerContractService] Error fetching partner recruitments:', error);
      throw error;
    }
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
