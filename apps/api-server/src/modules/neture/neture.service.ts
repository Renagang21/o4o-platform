import { In, Repository } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import {
  NetureSupplier,
  ProductMaster,
  ProductCategory,
  Brand,
  ProductImage,
  SupplierProductOffer,
  OfferDistributionType,
  OfferApprovalStatus,
  NeturePartnershipRequest,
  NeturePartnershipProduct,
  NeturePartnerRecruitment,
  NeturePartnerApplication,
  NeturePartnerDashboardItem,
  NetureSellerPartnerContract,
  ContractStatus,
  ContractTerminatedBy,
  SupplierStatus,
  PartnershipStatus,
  RecruitmentStatus,
  ApplicationStatus,
  ContactVisibility,
} from './entities/index.js';
import { NeturePartner, NeturePartnerStatus } from '../../routes/neture/entities/neture-partner.entity.js';
import logger from '../../utils/logger.js';
import { autoExpandPublicProduct } from '../../utils/auto-listing.utils.js';
import { roleAssignmentService } from '../auth/services/role-assignment.service.js';
import { ServiceMembership } from '../auth/entities/ServiceMembership.js';

export class NetureService {
  // Lazy initialization: repositories are created on first access
  private _supplierRepo?: Repository<NetureSupplier>;
  private _masterRepo?: Repository<ProductMaster>;
  private _offerRepo?: Repository<SupplierProductOffer>;
  private _partnershipRepo?: Repository<NeturePartnershipRequest>;
  private _partnershipProductRepo?: Repository<NeturePartnershipProduct>;
  private _recruitmentRepo?: Repository<NeturePartnerRecruitment>;
  private _applicationRepo?: Repository<NeturePartnerApplication>;
  private _contractRepo?: Repository<NetureSellerPartnerContract>;

  private get supplierRepo(): Repository<NetureSupplier> {
    if (!this._supplierRepo) {
      this._supplierRepo = AppDataSource.getRepository(NetureSupplier);
    }
    return this._supplierRepo;
  }

  private get masterRepo(): Repository<ProductMaster> {
    if (!this._masterRepo) {
      this._masterRepo = AppDataSource.getRepository(ProductMaster);
    }
    return this._masterRepo;
  }

  private get offerRepo(): Repository<SupplierProductOffer> {
    if (!this._offerRepo) {
      this._offerRepo = AppDataSource.getRepository(SupplierProductOffer);
    }
    return this._offerRepo;
  }

  private get partnershipRepo(): Repository<NeturePartnershipRequest> {
    if (!this._partnershipRepo) {
      this._partnershipRepo = AppDataSource.getRepository(NeturePartnershipRequest);
    }
    return this._partnershipRepo;
  }

  private get partnershipProductRepo(): Repository<NeturePartnershipProduct> {
    if (!this._partnershipProductRepo) {
      this._partnershipProductRepo = AppDataSource.getRepository(NeturePartnershipProduct);
    }
    return this._partnershipProductRepo;
  }

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

  private _categoryRepo?: Repository<ProductCategory>;
  private _brandRepo?: Repository<Brand>;
  private _imageRepo?: Repository<ProductImage>;
  private _partnerEntityRepo?: Repository<NeturePartner>;
  private _membershipRepo?: Repository<ServiceMembership>;

  private get membershipRepo(): Repository<ServiceMembership> {
    if (!this._membershipRepo) {
      this._membershipRepo = AppDataSource.getRepository(ServiceMembership);
    }
    return this._membershipRepo;
  }

  private get categoryRepo(): Repository<ProductCategory> {
    if (!this._categoryRepo) {
      this._categoryRepo = AppDataSource.getRepository(ProductCategory);
    }
    return this._categoryRepo;
  }

  private get brandRepo(): Repository<Brand> {
    if (!this._brandRepo) {
      this._brandRepo = AppDataSource.getRepository(Brand);
    }
    return this._brandRepo;
  }

  private get imageRepo(): Repository<ProductImage> {
    if (!this._imageRepo) {
      this._imageRepo = AppDataSource.getRepository(ProductImage);
    }
    return this._imageRepo;
  }

  private get partnerEntityRepo(): Repository<NeturePartner> {
    if (!this._partnerEntityRepo) {
      this._partnerEntityRepo = AppDataSource.getRepository(NeturePartner);
    }
    return this._partnerEntityRepo;
  }

  // ==================== User-Supplier Linking ====================

  /**
   * Get supplier ID by user ID
   * Used to link authenticated user to their supplier account
   */
  async getSupplierIdByUserId(userId: string): Promise<string | null> {
    try {
      const supplier = await this.supplierRepo.findOne({
        where: { userId },
        select: ['id'],
      });
      return supplier?.id || null;
    } catch (error) {
      logger.error('[NetureService] Error finding supplier by user ID:', error);
      return null;
    }
  }

  /**
   * Get supplier by user ID
   */
  async getSupplierByUserId(userId: string): Promise<NetureSupplier | null> {
    try {
      return await this.supplierRepo.findOne({
        where: { userId },
        relations: ['offers'],
      });
    } catch (error) {
      logger.error('[NetureService] Error finding supplier by user ID:', error);
      return null;
    }
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
      logger.error('[NetureService] Error finding partner by user ID:', error);
      return null;
    }
  }

  // ==================== Supplier Onboarding (WO-NETURE-SUPPLIER-ONBOARDING-REALIGN-V1) ====================

  /**
   * POST /supplier/register — 공급자 신청 (status = PENDING)
   */
  async registerSupplier(
    userId: string,
    data: { name: string; slug: string; contactEmail?: string },
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const name = data.name?.trim();
      if (!name) {
        return { success: false, error: 'MISSING_NAME' };
      }

      const slug = data.slug?.trim().toLowerCase();
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
        return { success: false, error: 'INVALID_SLUG' };
      }

      // 중복 체크: userId 이미 연결된 supplier 존재
      const existingByUser = await this.supplierRepo.findOne({
        where: { userId },
        select: ['id'],
      });
      if (existingByUser) {
        return { success: false, error: 'USER_ALREADY_HAS_SUPPLIER' };
      }

      // 중복 체크: slug
      const existingBySlug = await this.supplierRepo.findOne({
        where: { slug },
        select: ['id'],
      });
      if (existingBySlug) {
        return { success: false, error: 'SLUG_ALREADY_EXISTS' };
      }

      const supplier = this.supplierRepo.create({
        name,
        slug,
        userId,
        contactEmail: data.contactEmail || null,
        status: SupplierStatus.PENDING,
      });
      const saved = await this.supplierRepo.save(supplier);

      logger.info(`[NetureService] Supplier registered: ${saved.id} (PENDING) by user ${userId}`);

      return {
        success: true,
        data: {
          id: saved.id,
          name: saved.name,
          slug: saved.slug,
          status: saved.status,
          createdAt: saved.createdAt,
        },
      };
    } catch (error) {
      logger.error('[NetureService] Error registering supplier:', error);
      throw error;
    }
  }

  /**
   * POST /admin/suppliers/:id/approve — 운영자 승인 (PENDING → ACTIVE)
   */
  async approveSupplier(
    supplierId: string,
    approvedByUserId: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) {
        return { success: false, error: 'SUPPLIER_NOT_FOUND' };
      }
      if (supplier.status !== SupplierStatus.PENDING) {
        return { success: false, error: 'INVALID_STATUS' };
      }

      supplier.status = SupplierStatus.ACTIVE;
      supplier.approvedBy = approvedByUserId;
      supplier.approvedAt = new Date();
      await this.supplierRepo.save(supplier);

      // WO-O4O-NETURE-SUPPLIER-APPROVAL-INTEGRATION-V1: Sync membership + RBAC
      if (supplier.userId) {
        // 1. Service membership: pending → approved
        const membership = await this.membershipRepo.findOne({
          where: { userId: supplier.userId, serviceKey: 'neture' },
        });
        if (membership && membership.status !== 'active') {
          membership.status = 'active';
          await this.membershipRepo.save(membership);
          logger.info(`[NetureService] Membership activated for user ${supplier.userId}`);
        }

        // 2. RBAC: assign neture:supplier role
        await roleAssignmentService.assignRole({
          userId: supplier.userId,
          role: 'neture:supplier',
          assignedBy: approvedByUserId,
        });
        logger.info(`[NetureService] Role neture:supplier assigned to user ${supplier.userId}`);
      }

      logger.info(`[NetureService] Supplier approved: ${supplierId} by ${approvedByUserId}`);

      return {
        success: true,
        data: {
          id: supplier.id,
          name: supplier.name,
          status: supplier.status,
          approvedBy: supplier.approvedBy,
          approvedAt: supplier.approvedAt,
        },
      };
    } catch (error) {
      logger.error('[NetureService] Error approving supplier:', error);
      throw error;
    }
  }

  /**
   * POST /admin/suppliers/:id/reject — 운영자 거절 (PENDING → REJECTED)
   */
  async rejectSupplier(
    supplierId: string,
    rejectedByUserId: string,
    reason?: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) {
        return { success: false, error: 'SUPPLIER_NOT_FOUND' };
      }
      if (supplier.status !== SupplierStatus.PENDING) {
        return { success: false, error: 'INVALID_STATUS' };
      }

      supplier.status = SupplierStatus.REJECTED;
      supplier.approvedBy = rejectedByUserId;
      supplier.approvedAt = new Date();
      supplier.rejectedReason = reason || null;
      await this.supplierRepo.save(supplier);

      // WO-O4O-NETURE-SUPPLIER-APPROVAL-INTEGRATION-V1: Sync membership + RBAC on reject
      if (supplier.userId) {
        const membership = await this.membershipRepo.findOne({
          where: { userId: supplier.userId, serviceKey: 'neture' },
        });
        if (membership) {
          membership.status = 'rejected';
          await this.membershipRepo.save(membership);
        }
        await roleAssignmentService.removeRole(supplier.userId, 'neture:supplier');
      }

      logger.info(`[NetureService] Supplier rejected: ${supplierId} by ${rejectedByUserId}`);

      return {
        success: true,
        data: {
          id: supplier.id,
          name: supplier.name,
          status: supplier.status,
          rejectedReason: supplier.rejectedReason,
        },
      };
    } catch (error) {
      logger.error('[NetureService] Error rejecting supplier:', error);
      throw error;
    }
  }

  /**
   * GET /admin/suppliers/pending — 승인 대기 공급자 목록
   */
  async getPendingSuppliers(): Promise<Array<{ id: string; name: string; slug: string; contactEmail: string | null; userId: string; identityStatus: string | null; userEmail: string | null; createdAt: Date }>> {
    try {
      const suppliers = await this.supplierRepo.find({
        where: { status: SupplierStatus.PENDING },
        order: { createdAt: 'ASC' },
      });

      // Batch-fetch user identity statuses (WO-NETURE-IDENTITY-DOMAIN-STATUS-SEPARATION-V1)
      const userIds = suppliers.map((s) => s.userId).filter(Boolean);
      const userStatusMap = new Map<string, { status: string; email: string }>();
      if (userIds.length > 0) {
        const rows: Array<{ id: string; status: string; email: string }> = await AppDataSource.query(
          `SELECT id, status, email FROM users WHERE id = ANY($1)`,
          [userIds],
        );
        for (const row of rows) {
          userStatusMap.set(row.id, { status: row.status, email: row.email });
        }
      }

      return suppliers.map((s) => {
        const userInfo = s.userId ? userStatusMap.get(s.userId) : null;
        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          contactEmail: s.contactEmail || null,
          userId: s.userId,
          identityStatus: userInfo?.status || null,
          userEmail: userInfo?.email || null,
          createdAt: s.createdAt,
        };
      });
    } catch (error) {
      logger.error('[NetureService] Error fetching pending suppliers:', error);
      throw error;
    }
  }

  // ==================== Admin: Supplier Management (WO-NETURE-SUPPLIER-AND-PRODUCT-APPROVAL-BETA-V1) ====================

  /**
   * POST /admin/suppliers/:id/deactivate — ACTIVE → INACTIVE
   */
  async deactivateSupplier(
    supplierId: string,
    adminUserId: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) {
        return { success: false, error: 'SUPPLIER_NOT_FOUND' };
      }
      if (supplier.status !== SupplierStatus.ACTIVE) {
        return { success: false, error: 'INVALID_STATUS' };
      }

      supplier.status = SupplierStatus.INACTIVE;
      await this.supplierRepo.save(supplier);

      // WO-NETURE-TIER2-SERVICE-STATE-POLICY-REALIGN-V1: 캐스케이드
      // Supplier 비활성화 → APPROVED approval → REVOKED + listing 비활성화
      const revokeResult = await AppDataSource.query(
        `UPDATE product_approvals
         SET approval_status = 'revoked',
             decided_by = $2::uuid,
             decided_at = NOW(),
             reason = 'Supplier deactivated',
             updated_at = NOW()
         WHERE offer_id IN (
           SELECT id FROM supplier_product_offers WHERE supplier_id = $1
         )
         AND approval_status = 'approved'`,
        [supplierId, adminUserId],
      );
      const revokedCount = revokeResult?.[1] ?? 0;

      await AppDataSource.query(
        `UPDATE organization_product_listings
         SET is_active = false, updated_at = NOW()
         WHERE offer_id IN (
           SELECT id FROM supplier_product_offers WHERE supplier_id = $1
         )`,
        [supplierId],
      );

      // WO-O4O-NETURE-SUPPLIER-APPROVAL-INTEGRATION-V1: Sync membership + RBAC on deactivate
      if (supplier.userId) {
        const membership = await this.membershipRepo.findOne({
          where: { userId: supplier.userId, serviceKey: 'neture' },
        });
        if (membership) {
          membership.status = 'suspended';
          await this.membershipRepo.save(membership);
        }
        await roleAssignmentService.removeRole(supplier.userId, 'neture:supplier');
      }

      logger.info(`[NetureService] Supplier deactivated: ${supplierId} by ${adminUserId} (revoked ${revokedCount} approvals, deactivated listings)`);

      return {
        success: true,
        data: { id: supplier.id, name: supplier.name, status: supplier.status },
      };
    } catch (error) {
      logger.error('[NetureService] Error deactivating supplier:', error);
      throw error;
    }
  }

  /**
   * GET /admin/suppliers — 전체 공급자 목록 (필터)
   * WO-NETURE-IDENTITY-DOMAIN-STATUS-SEPARATION-V1: identityStatus 추가
   */
  async getAllSuppliers(
    filters?: { status?: SupplierStatus },
  ): Promise<Array<{ id: string; name: string; slug: string; status: SupplierStatus; contactEmail: string; userId: string; identityStatus: string | null; userEmail: string | null; createdAt: Date; updatedAt: Date }>> {
    try {
      const where: { status?: SupplierStatus } = {};
      if (filters?.status) {
        where.status = filters.status;
      }

      const suppliers = await this.supplierRepo.find({
        where,
        order: { createdAt: 'DESC' },
      });

      // Batch-fetch user identity statuses
      const userIds = suppliers.map((s) => s.userId).filter(Boolean);
      const userStatusMap = new Map<string, { status: string; email: string }>();
      if (userIds.length > 0) {
        const rows: Array<{ id: string; status: string; email: string }> = await AppDataSource.query(
          `SELECT id, status, email FROM users WHERE id = ANY($1)`,
          [userIds],
        );
        for (const row of rows) {
          userStatusMap.set(row.id, { status: row.status, email: row.email });
        }
      }

      return suppliers.map((s) => {
        const userInfo = s.userId ? userStatusMap.get(s.userId) : null;
        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          status: s.status,
          contactEmail: s.contactEmail || '',
          userId: s.userId,
          identityStatus: userInfo?.status || null,
          userEmail: userInfo?.email || null,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        };
      });
    } catch (error) {
      logger.error('[NetureService] Error fetching all suppliers:', error);
      throw error;
    }
  }

  // ==================== Admin: Product Management (WO-NETURE-SUPPLIER-AND-PRODUCT-APPROVAL-BETA-V1) ====================

  /**
   * GET /admin/products/pending — 승인 대기 상품 목록
   */
  async getPendingProducts(): Promise<Array<{ id: string; supplierName: string; supplierId: string; distributionType: OfferDistributionType; createdAt: Date; approvalStatus: OfferApprovalStatus }>> {
    try {
      const offers = await this.offerRepo.find({
        where: { approvalStatus: OfferApprovalStatus.PENDING },
        relations: ['supplier', 'master'],
        order: { createdAt: 'ASC' },
      });

      return offers.map((o) => ({
        id: o.id,
        masterId: o.masterId,
        masterName: o.master?.marketingName || '',
        supplierName: o.supplier?.name || '',
        supplierId: o.supplierId,
        distributionType: o.distributionType,
        createdAt: o.createdAt,
        approvalStatus: o.approvalStatus,
      }));
    } catch (error) {
      logger.error('[NetureService] Error fetching pending offers:', error);
      throw error;
    }
  }

  /**
   * POST /admin/products/:id/approve — 상품 승인 (isActive=true)
   * WO-NETURE-TIER1-AUTO-EXPANSION-BETA-V1: PUBLIC 상품은 승인 시 모든 활성 조직에 자동 listing
   */
  async approveProduct(
    offerId: string,
    adminUserId: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const offer = await this.offerRepo.findOne({ where: { id: offerId } });
      if (!offer) {
        return { success: false, error: 'PRODUCT_NOT_FOUND' };
      }
      if (offer.approvalStatus !== OfferApprovalStatus.PENDING) {
        return { success: false, error: 'INVALID_APPROVAL_STATUS' };
      }

      // 트랜잭션: Offer 승인 + PUBLIC 자동 확산 (원자적)
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.startTransaction();
      try {
        offer.approvalStatus = OfferApprovalStatus.APPROVED;
        offer.isActive = true;
        await queryRunner.manager.save(offer);

        // Tier 1 (PUBLIC) 자동 확산: 모든 활성 조직에 listing 생성
        let autoListedCount = 0;
        if (offer.distributionType === OfferDistributionType.PUBLIC) {
          autoListedCount = await autoExpandPublicProduct(queryRunner, offerId, offer.masterId);
        }

        await queryRunner.commitTransaction();

        logger.info(`[NetureService] Offer approved: ${offerId} by ${adminUserId} (autoListed: ${autoListedCount})`);

        return {
          success: true,
          data: {
            id: offer.id,
            masterId: offer.masterId,
            isActive: offer.isActive,
            approvalStatus: offer.approvalStatus,
            autoListedCount,
          },
        };
      } catch (txError) {
        await queryRunner.rollbackTransaction();
        throw txError;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      logger.error('[NetureService] Error approving offer:', error);
      throw error;
    }
  }

  /**
   * POST /admin/products/:id/reject — 상품 반려 (isActive 유지 false)
   */
  async rejectProduct(
    offerId: string,
    adminUserId: string,
    reason?: string,
  ): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    try {
      const offer = await this.offerRepo.findOne({ where: { id: offerId } });
      if (!offer) {
        return { success: false, error: 'PRODUCT_NOT_FOUND' };
      }
      if (offer.approvalStatus !== OfferApprovalStatus.PENDING) {
        return { success: false, error: 'INVALID_APPROVAL_STATUS' };
      }

      offer.approvalStatus = OfferApprovalStatus.REJECTED;
      await this.offerRepo.save(offer);

      // 캐스케이드: Offer 반려 → APPROVED approval → REVOKED + listing 비활성화
      await AppDataSource.query(
        `UPDATE product_approvals
         SET approval_status = 'revoked',
             decided_by = $2::uuid,
             decided_at = NOW(),
             reason = 'Offer rejected by admin',
             updated_at = NOW()
         WHERE offer_id = $1 AND approval_status = 'approved'`,
        [offerId, adminUserId],
      );

      await AppDataSource.query(
        `UPDATE organization_product_listings
         SET is_active = false, updated_at = NOW()
         WHERE offer_id = $1`,
        [offerId],
      );

      logger.info(`[NetureService] Offer rejected with cascade: ${offerId} by ${adminUserId}`);

      return {
        success: true,
        data: { id: offer.id, masterId: offer.masterId, isActive: offer.isActive, approvalStatus: offer.approvalStatus },
      };
    } catch (error) {
      logger.error('[NetureService] Error rejecting offer:', error);
      throw error;
    }
  }

  /**
   * GET /admin/products — 전체 상품 목록 (필터)
   */
  async getAllProducts(
    filters?: { supplierId?: string; distributionType?: OfferDistributionType; isActive?: boolean; approvalStatus?: OfferApprovalStatus },
  ) {
    try {
      const where: { supplierId?: string; distributionType?: OfferDistributionType; isActive?: boolean; approvalStatus?: OfferApprovalStatus } = {};
      if (filters?.supplierId) where.supplierId = filters.supplierId;
      if (filters?.distributionType) where.distributionType = filters.distributionType;
      if (filters?.isActive !== undefined) where.isActive = filters.isActive;
      if (filters?.approvalStatus) where.approvalStatus = filters.approvalStatus;

      const offers = await this.offerRepo.find({
        where,
        relations: ['supplier', 'master'],
        order: { createdAt: 'DESC' },
      });

      return offers.map((o) => ({
        id: o.id,
        masterId: o.masterId,
        masterName: o.master?.marketingName || '',
        supplierName: o.supplier?.name || '',
        supplierId: o.supplierId,
        distributionType: o.distributionType,
        isActive: o.isActive,
        approvalStatus: o.approvalStatus,
        priceGeneral: o.priceGeneral,
        priceGold: o.priceGold,
        pricePlatinum: o.pricePlatinum,
        consumerReferencePrice: o.consumerReferencePrice,
        createdAt: o.createdAt,
      }));
    } catch (error) {
      logger.error('[NetureService] Error fetching all offers:', error);
      throw error;
    }
  }

  // ==================== Suppliers ====================

  /**
   * Compute trust signals for a supplier
   * - contactCompleteness: count of publicly visible contact fields (0-4)
   * - hasApprovedPartners: at least one approved partnership request exists
   * - recentActivity: any request activity in the last 30 days
   */
  private async computeTrustSignals(supplierId: string, supplier: NetureSupplier) {
    // Contact completeness: count non-null public contact fields
    const publicContacts = [
      supplier.contactEmail && supplier.contactEmailVisibility === ContactVisibility.PUBLIC,
      supplier.contactPhone && supplier.contactPhoneVisibility === ContactVisibility.PUBLIC,
      supplier.contactWebsite && supplier.contactWebsiteVisibility === ContactVisibility.PUBLIC,
      supplier.contactKakao && supplier.contactKakaoVisibility === ContactVisibility.PUBLIC,
    ].filter(Boolean).length;

    // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals
    const [{ count: approvedCount }] = await AppDataSource.query(
      `SELECT COUNT(*)::int AS count FROM product_approvals pa
       JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'approved'`,
      [supplierId],
    );

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [{ count: recentCount }] = await AppDataSource.query(
      `SELECT COUNT(*)::int AS count FROM product_approvals pa
       JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       WHERE spo.supplier_id = $1 AND pa.approval_type = 'private'
         AND pa.created_at >= $2`,
      [supplierId, thirtyDaysAgo],
    );

    return {
      contactCompleteness: publicContacts,
      hasApprovedPartners: approvedCount > 0,
      recentActivity: recentCount > 0,
    };
  }

  /**
   * GET /suppliers - List all suppliers
   */
  async getSuppliers(filters?: {
    category?: string;
    status?: SupplierStatus;
  }) {
    try {
      const query = this.supplierRepo
        .createQueryBuilder('supplier')
        .leftJoinAndSelect('supplier.offers', 'products');

      // Apply filters
      if (filters?.category) {
        query.andWhere('supplier.category = :category', { category: filters.category });
      }

      if (filters?.status) {
        query.andWhere('supplier.status = :status', { status: filters.status });
      } else {
        // Default: Only show ACTIVE suppliers
        query.andWhere('supplier.status = :status', { status: SupplierStatus.ACTIVE });
      }

      query.orderBy('supplier.createdAt', 'DESC');

      const suppliers = await query.getMany();

      const results = await Promise.all(
        suppliers.map(async (supplier) => {
          const trustSignals = await this.computeTrustSignals(supplier.id, supplier);
          return {
            id: supplier.id,
            slug: supplier.slug,
            name: supplier.name,
            logo: supplier.logoUrl,
            category: supplier.category,
            shortDescription: supplier.shortDescription,
            productCount: supplier.offers?.length || 0,
            trustSignals,
          };
        })
      );

      return results;
    } catch (error) {
      logger.error('[NetureService] Error fetching suppliers:', error);
      throw error;
    }
  }

  /**
   * GET /suppliers/:slug - Get supplier detail
   */
  // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals
  async hasApprovedPartnership(supplierId: string, viewerId: string): Promise<boolean> {
    try {
      const [{ count }] = await AppDataSource.query(
        `SELECT COUNT(*)::int AS count FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.organization_id = $2
           AND pa.approval_type = 'private' AND pa.approval_status = 'approved'`,
        [supplierId, viewerId],
      );
      return count > 0;
    } catch (error) {
      logger.error('[NetureService] Error checking partnership:', error);
      return false;
    }
  }

  private filterContactInfo(
    supplier: NetureSupplier,
    viewerId: string | null,
    isPartner: boolean,
    isOwner: boolean,
  ) {
    const canView = (visibility: ContactVisibility): boolean => {
      if (isOwner) return true;
      if (!viewerId) return false;
      if (visibility === ContactVisibility.PUBLIC) return true;
      if (visibility === ContactVisibility.PARTNERS) return isPartner;
      return false;
    };

    return {
      email: canView(supplier.contactEmailVisibility) ? (supplier.contactEmail || null) : null,
      phone: canView(supplier.contactPhoneVisibility) ? (supplier.contactPhone || null) : null,
      website: canView(supplier.contactWebsiteVisibility) ? (supplier.contactWebsite || null) : null,
      kakao: canView(supplier.contactKakaoVisibility) ? (supplier.contactKakao || null) : null,
    };
  }

  /**
   * Compute contact hints for the viewer
   * Tells the UI *why* each contact field is in its current state
   *
   * Possible hint values:
   * - available: contact visible and has data
   * - partner_exclusive: visible because viewer is an approved partner
   * - not_registered: supplier hasn't set this contact
   * - private: set to private by supplier
   * - partners_only: restricted to partners (viewer is not a partner)
   */
  private computeContactHints(
    supplier: NetureSupplier,
    isPartner: boolean,
    isOwner: boolean,
  ) {
    type ContactHint = 'available' | 'partner_exclusive' | 'not_registered' | 'private' | 'partners_only';

    const getHint = (value: string | null | undefined, visibility: ContactVisibility): ContactHint => {
      if (isOwner) {
        return value ? 'available' : 'not_registered';
      }
      if (!value) return 'not_registered';
      if (visibility === ContactVisibility.PUBLIC) return 'available';
      if (visibility === ContactVisibility.PARTNERS) {
        return isPartner ? 'partner_exclusive' : 'partners_only';
      }
      return 'private';
    };

    return {
      email: getHint(supplier.contactEmail, supplier.contactEmailVisibility),
      phone: getHint(supplier.contactPhone, supplier.contactPhoneVisibility),
      website: getHint(supplier.contactWebsite, supplier.contactWebsiteVisibility),
      kakao: getHint(supplier.contactKakao, supplier.contactKakaoVisibility),
    };
  }

  async getSupplierBySlug(slug: string, viewerId?: string | null) {
    try {
      const supplier = await this.supplierRepo.findOne({
        where: { slug, status: SupplierStatus.ACTIVE },
        relations: ['offers'],
      });

      if (!supplier) {
        return null;
      }

      const isOwner = !!viewerId && supplier.userId === viewerId;
      const isPartner = !!viewerId && !isOwner
        ? await this.hasApprovedPartnership(supplier.id, viewerId)
        : false;
      const contact = this.filterContactInfo(supplier, viewerId || null, isPartner, isOwner);
      const contactHints = this.computeContactHints(supplier, isPartner, isOwner);
      const trustSignals = await this.computeTrustSignals(supplier.id, supplier);

      return {
        id: supplier.id,
        slug: supplier.slug,
        name: supplier.name,
        logo: supplier.logoUrl,
        category: supplier.category,
        shortDescription: supplier.shortDescription,
        description: supplier.description,
        products: supplier.offers.map((p) => ({
          id: p.id,
          name: p.master?.marketingName || '',
          category: p.master?.brandName || '',
          description: '',
        })),
        pricingPolicy: supplier.pricingPolicy,
        moq: supplier.moq,
        shippingPolicy: {
          standard: supplier.shippingStandard,
          island: supplier.shippingIsland,
          mountain: supplier.shippingMountain,
        },
        contact,
        contactHints,
        trustSignals,
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching supplier by slug:', error);
      throw error;
    }
  }

  // ==================== Supplier Profile ====================

  async getSupplierProfile(supplierId: string) {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) return null;

      return {
        id: supplier.id,
        name: supplier.name,
        slug: supplier.slug,
        contactEmail: supplier.contactEmail || null,
        contactPhone: supplier.contactPhone || null,
        contactWebsite: supplier.contactWebsite || null,
        contactKakao: supplier.contactKakao || null,
        contactEmailVisibility: supplier.contactEmailVisibility,
        contactPhoneVisibility: supplier.contactPhoneVisibility,
        contactWebsiteVisibility: supplier.contactWebsiteVisibility,
        contactKakaoVisibility: supplier.contactKakaoVisibility,
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching supplier profile:', error);
      throw error;
    }
  }

  async updateSupplierProfile(
    supplierId: string,
    data: {
      contactEmail?: string;
      contactPhone?: string;
      contactWebsite?: string;
      contactKakao?: string;
      contactEmailVisibility?: ContactVisibility;
      contactPhoneVisibility?: ContactVisibility;
      contactWebsiteVisibility?: ContactVisibility;
      contactKakaoVisibility?: ContactVisibility;
    },
  ) {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) return null;

      if (data.contactEmail !== undefined) supplier.contactEmail = data.contactEmail || '';
      if (data.contactPhone !== undefined) supplier.contactPhone = data.contactPhone ? data.contactPhone.replace(/\D/g, '') : '';
      if (data.contactWebsite !== undefined) supplier.contactWebsite = data.contactWebsite || '';
      if (data.contactKakao !== undefined) supplier.contactKakao = data.contactKakao || '';
      if (data.contactEmailVisibility !== undefined) supplier.contactEmailVisibility = data.contactEmailVisibility;
      if (data.contactPhoneVisibility !== undefined) supplier.contactPhoneVisibility = data.contactPhoneVisibility;
      if (data.contactWebsiteVisibility !== undefined) supplier.contactWebsiteVisibility = data.contactWebsiteVisibility;
      if (data.contactKakaoVisibility !== undefined) supplier.contactKakaoVisibility = data.contactKakaoVisibility;

      await this.supplierRepo.save(supplier);

      return {
        id: supplier.id,
        contactEmail: supplier.contactEmail || null,
        contactPhone: supplier.contactPhone || null,
        contactWebsite: supplier.contactWebsite || null,
        contactKakao: supplier.contactKakao || null,
        contactEmailVisibility: supplier.contactEmailVisibility,
        contactPhoneVisibility: supplier.contactPhoneVisibility,
        contactWebsiteVisibility: supplier.contactWebsiteVisibility,
        contactKakaoVisibility: supplier.contactKakaoVisibility,
      };
    } catch (error) {
      logger.error('[NetureService] Error updating supplier profile:', error);
      throw error;
    }
  }

  // ==================== Profile Completeness (WO-O4O-SUPPLIER-PROFILE-COMPLETENESS-V1) ====================

  /**
   * GET /supplier/profile/completeness
   * Internal-only profile completeness indicator
   *
   * 8 items checked:
   * 1. name - 상호명 등록
   * 2. description - 소개글 50자 이상
   * 3. logoUrl - 프로필 이미지
   * 4. contactEmail - 이메일 (public/partners)
   * 5. contactWebsite - 웹사이트 (public/partners)
   * 6. contactKakao - 카카오톡 (public/partners)
   * 7. hasApprovedPartners - 파트너 승인 1건+
   * 8. recentActivity - 최근 30일 활동
   *
   * Phone excluded (private allowed).
   */
  async computeProfileCompleteness(supplierId: string) {
    try {
      const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
      if (!supplier) return null;

      const missing: string[] = [];

      // 1. name
      if (!supplier.name || supplier.name.trim().length === 0) {
        missing.push('name');
      }

      // 2. description (50+ chars)
      if (!supplier.description || supplier.description.trim().length < 50) {
        missing.push('description');
      }

      // 3. logoUrl
      if (!supplier.logoUrl || supplier.logoUrl.trim().length === 0) {
        missing.push('logoUrl');
      }

      // 4. email (public or partners visibility + value exists)
      if (
        !supplier.contactEmail ||
        supplier.contactEmailVisibility === ContactVisibility.PRIVATE
      ) {
        missing.push('email');
      }

      // 5. website (public or partners visibility + value exists)
      if (
        !supplier.contactWebsite ||
        supplier.contactWebsiteVisibility === ContactVisibility.PRIVATE
      ) {
        missing.push('website');
      }

      // 6. kakao (public or partners visibility + value exists)
      if (
        !supplier.contactKakao ||
        supplier.contactKakaoVisibility === ContactVisibility.PRIVATE
      ) {
        missing.push('kakao');
      }

      // 7. hasApprovedPartners (1+ approved PRIVATE approval)
      // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals
      const [{ count: pApprovedCount }] = await AppDataSource.query(
        `SELECT COUNT(*)::int AS count FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'approved'`,
        [supplierId],
      );
      if (pApprovedCount === 0) {
        missing.push('partnerApproval');
      }

      // 8. recentActivity (30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const [{ count: pRecentCount }] = await AppDataSource.query(
        `SELECT COUNT(*)::int AS count FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.approval_type = 'private'
           AND pa.created_at >= $2`,
        [supplierId, thirtyDaysAgo],
      );
      if (pRecentCount === 0) {
        missing.push('recentActivity');
      }

      const total = 8;
      const completed = total - missing.length;

      return { total, completed, missing };
    } catch (error) {
      logger.error('[NetureService] Error computing profile completeness:', error);
      throw error;
    }
  }

  // ==================== Partnership Requests ====================

  /**
   * GET /partnership/requests - List all partnership requests
   */
  async getPartnershipRequests(filters?: { status?: PartnershipStatus }) {
    try {
      const query = this.partnershipRepo
        .createQueryBuilder('request')
        .leftJoinAndSelect('request.products', 'products');

      // Apply status filter
      if (filters?.status) {
        query.andWhere('request.status = :status', { status: filters.status });
      }

      query.orderBy('request.createdAt', 'DESC');

      const requests = await query.getMany();

      return requests.map((req) => ({
        id: req.id,
        seller: {
          id: req.sellerId,
          name: req.sellerName,
          serviceType: req.sellerServiceType,
          storeUrl: req.sellerStoreUrl,
        },
        productCount: req.productCount,
        period: {
          start: req.periodStart,
          end: req.periodEnd,
        },
        revenueStructure: req.revenueStructure,
        status: req.status,
      }));
    } catch (error) {
      logger.error('[NetureService] Error fetching partnership requests:', error);
      throw error;
    }
  }

  /**
   * GET /partnership/requests/:id - Get partnership request detail
   */
  async getPartnershipRequestById(id: string) {
    try {
      const request = await this.partnershipRepo.findOne({
        where: { id },
        relations: ['products'],
      });

      if (!request) {
        return null;
      }

      return {
        id: request.id,
        seller: {
          id: request.sellerId,
          name: request.sellerName,
          serviceType: request.sellerServiceType,
          storeUrl: request.sellerStoreUrl,
        },
        productCount: request.productCount,
        period: {
          start: request.periodStart,
          end: request.periodEnd,
        },
        revenueStructure: request.revenueStructure,
        status: request.status,
        products: request.products.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
        })),
        promotionScope: {
          sns: request.promotionSns,
          content: request.promotionContent,
          banner: request.promotionBanner,
          other: request.promotionOther,
        },
        contact: {
          email: request.contactEmail,
          phone: request.contactPhone,
          kakao: request.contactKakao,
        },
        createdAt: request.createdAt,
        matchedAt: request.matchedAt,
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching partnership request by ID:', error);
      throw error;
    }
  }

  // ==================== P2: CREATE Operations ====================

  /**
   * POST /partnership/requests - Create a new partnership request
   */
  async createPartnershipRequest(data: {
    sellerId: string;
    sellerName: string;
    sellerServiceType?: string;
    sellerStoreUrl?: string;
    periodStart?: string;
    periodEnd?: string;
    revenueStructure?: string;
    promotionSns?: boolean;
    promotionContent?: boolean;
    promotionBanner?: boolean;
    promotionOther?: string;
    contactEmail?: string;
    contactPhone?: string;
    contactKakao?: string;
    products?: Array<{ name: string; category?: string }>;
  }) {
    try {
      // Create partnership request
      const request = this.partnershipRepo.create({
        sellerId: data.sellerId,
        sellerName: data.sellerName,
        sellerServiceType: data.sellerServiceType || '',
        sellerStoreUrl: data.sellerStoreUrl || '',
        productCount: data.products?.length || 0,
        periodStart: data.periodStart ? new Date(data.periodStart) : undefined,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
        revenueStructure: data.revenueStructure || '',
        status: PartnershipStatus.OPEN,
        promotionSns: data.promotionSns || false,
        promotionContent: data.promotionContent || false,
        promotionBanner: data.promotionBanner || false,
        promotionOther: data.promotionOther || '',
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone ? data.contactPhone.replace(/\D/g, '') : '',
        contactKakao: data.contactKakao || '',
      });

      const savedRequest = await this.partnershipRepo.save(request);

      // Create products if provided
      if (data.products && data.products.length > 0) {
        for (const product of data.products) {
          const partnershipProduct = this.partnershipProductRepo.create({
            partnershipRequestId: savedRequest.id,
            name: product.name,
            category: product.category || '',
          });
          await this.partnershipProductRepo.save(partnershipProduct);
        }
      }

      logger.info(`[NetureService] Created partnership request: ${savedRequest.id}`);

      return {
        id: savedRequest.id,
        status: savedRequest.status,
        createdAt: savedRequest.createdAt,
      };
    } catch (error) {
      logger.error('[NetureService] Error creating partnership request:', error);
      throw error;
    }
  }

  /**
   * PATCH /partnership/requests/:id - Update partnership request status
   */
  async updatePartnershipRequestStatus(id: string, status: PartnershipStatus) {
    try {
      const request = await this.partnershipRepo.findOne({ where: { id } });

      if (!request) {
        return null;
      }

      request.status = status;

      // Set matchedAt timestamp when status changes to MATCHED
      if (status === PartnershipStatus.MATCHED && !request.matchedAt) {
        request.matchedAt = new Date();
      }

      const updatedRequest = await this.partnershipRepo.save(request);

      logger.info(`[NetureService] Updated partnership request ${id} status to ${status}`);

      return {
        id: updatedRequest.id,
        status: updatedRequest.status,
      };
    } catch (error) {
      logger.error('[NetureService] Error updating partnership request status:', error);
      throw error;
    }
  }

  // ==================== Supplier Products (WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.2) ====================

  // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: Supplier Request methods removed.
  // All read paths migrated to inline v2 raw SQL on product_approvals.
  // All write paths deprecated to 410 Gone.
  // See: neture.routes.ts, hub-trigger.controller.ts

  /**
   * GET /supplier/products - 공급자의 제품 목록
   */
  async getSupplierProducts(supplierId: string) {
    try {
      const offers = await this.offerRepo.find({
        where: { supplierId },
        relations: ['master', 'master.category', 'master.brand'],
        order: { createdAt: 'DESC' },
      });

      // v2 product_approvals — offer_id 기준
      const pendingCountRows: Array<{ offer_id: string; cnt: number }> = await AppDataSource.query(
        `SELECT pa.offer_id, COUNT(*)::int AS cnt
         FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'pending'
         GROUP BY pa.offer_id`,
        [supplierId],
      );
      const pendingMap = new Map(pendingCountRows.map((r) => [r.offer_id, r.cnt]));

      const serviceCountRows: Array<{ offer_id: string; cnt: number }> = await AppDataSource.query(
        `SELECT pa.offer_id, COUNT(DISTINCT pa.service_key)::int AS cnt
         FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'approved'
         GROUP BY pa.offer_id`,
        [supplierId],
      );
      const serviceMap = new Map(serviceCountRows.map((r) => [r.offer_id, r.cnt]));

      // Primary images for each master
      const masterIds = offers.map((o) => o.masterId).filter(Boolean);
      const imageMap = new Map<string, string>();
      if (masterIds.length > 0) {
        const imageRows: Array<{ master_id: string; image_url: string }> = await AppDataSource.query(
          `SELECT master_id, image_url FROM product_images WHERE is_primary = true AND master_id = ANY($1::uuid[])`,
          [masterIds],
        );
        for (const row of imageRows) {
          imageMap.set(row.master_id, row.image_url);
        }
      }

      return offers.map((o) => ({
        id: o.id,
        masterId: o.masterId,
        masterName: o.master?.marketingName || o.master?.regulatoryName || '',
        isActive: o.isActive,
        distributionType: o.distributionType,
        allowedSellerIds: o.allowedSellerIds,
        approvalStatus: o.approvalStatus,
        priceGeneral: o.priceGeneral,
        priceGold: o.priceGold,
        pricePlatinum: o.pricePlatinum,
        consumerReferencePrice: o.consumerReferencePrice,
        pendingRequestCount: pendingMap.get(o.id) || 0,
        activeServiceCount: serviceMap.get(o.id) || 0,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        barcode: o.master?.barcode || '',
        brandName: o.master?.brand?.name || o.master?.brandName || null,
        categoryName: o.master?.category?.name || null,
        specification: o.master?.specification || null,
        primaryImageUrl: imageMap.get(o.masterId) || null,
      }));
    } catch (error) {
      logger.error('[NetureService] Error fetching supplier offers:', error);
      throw error;
    }
  }

  /**
   * POST /supplier/products - 공급자 Offer 생성
   *
   * WO-NETURE-LAYER2-MASTER-PIPELINE-ENFORCEMENT-V1
   * masterId 외부 주입 금지 — barcode 기반 resolveOrCreateMaster() 강제 경유
   */
  async createSupplierOffer(
    supplierId: string,
    data: {
      barcode: string;
      manualData?: {
        regulatoryType?: string;
        regulatoryName: string;
        manufacturerName: string;
        marketingName?: string;
        mfdsPermitNumber?: string | null;
        // WO-O4O-SUPPLIER-PRODUCT-CREATE-PAGE-V1: extended master fields
        categoryId?: string | null;
        brandId?: string | null;
        specification?: string | null;
        originCountry?: string | null;
        tags?: string[];
      };
      distributionType?: OfferDistributionType;
      priceGeneral?: number;
      priceGold?: number | null;
      pricePlatinum?: number | null;
      consumerReferencePrice?: number | null;
    }
  ) {
    try {
      if (!data.barcode) {
        return { success: false, error: 'MISSING_BARCODE' };
      }

      // masterId 직접 주입 차단
      if ('masterId' in (data as any)) {
        return { success: false, error: 'MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED' };
      }

      // Supplier ACTIVE guard
      const supplier = await this.supplierRepo.findOne({
        where: { id: supplierId },
        select: ['id', 'status'],
      });
      if (!supplier || supplier.status !== SupplierStatus.ACTIVE) {
        return { success: false, error: 'SUPPLIER_NOT_ACTIVE' };
      }

      // Master 파이프라인 강제 경유
      const masterResult = await this.resolveOrCreateMaster(data.barcode, data.manualData);
      if (!masterResult.success || !masterResult.data) {
        return { success: false, error: masterResult.error || 'MASTER_RESOLVE_FAILED' };
      }

      // WO-O4O-SUPPLIER-PRODUCT-CREATE-PAGE-V1: extended fields 적용 (resolveOrCreateMaster 파이프라인 변경 없음)
      if (data.manualData) {
        const extFields: Record<string, unknown> = {};
        if (data.manualData.categoryId !== undefined) extFields.categoryId = data.manualData.categoryId;
        if (data.manualData.brandId !== undefined) extFields.brandId = data.manualData.brandId;
        if (data.manualData.specification !== undefined) extFields.specification = data.manualData.specification;
        if (data.manualData.originCountry !== undefined) extFields.originCountry = data.manualData.originCountry;
        if (data.manualData.tags !== undefined) extFields.tags = data.manualData.tags;
        if (data.manualData.marketingName !== undefined) extFields.marketingName = data.manualData.marketingName;

        if (Object.keys(extFields).length > 0) {
          await this.updateProductMaster(masterResult.data.id, extFields);
        }
      }

      // P1: slug 자동 생성 (barcode-supplierId-timestamp)
      const slugBase = masterResult.data.barcode || masterResult.data.id;
      const slug = `${slugBase}-${supplierId.slice(0, 8)}-${Date.now()}`;

      const offer = this.offerRepo.create({
        supplierId,
        masterId: masterResult.data.id,
        slug,
        distributionType: data.distributionType || OfferDistributionType.PRIVATE,
        isActive: false,
        approvalStatus: OfferApprovalStatus.PENDING,
        allowedSellerIds: [],
        priceGeneral: data.priceGeneral ?? 0,
        priceGold: data.priceGold ?? null,
        pricePlatinum: data.pricePlatinum ?? null,
        consumerReferencePrice: data.consumerReferencePrice ?? null,
      });

      const savedOffer = await this.offerRepo.save(offer);

      logger.info(`[NetureService] Created offer ${savedOffer.id} by supplier ${supplierId} for master ${masterResult.data.id} (PENDING approval)`);

      return {
        success: true,
        data: {
          id: savedOffer.id,
          masterId: savedOffer.masterId,
          isActive: savedOffer.isActive,
          approvalStatus: savedOffer.approvalStatus,
          distributionType: savedOffer.distributionType,
          allowedSellerIds: savedOffer.allowedSellerIds,
          priceGeneral: savedOffer.priceGeneral,
          priceGold: savedOffer.priceGold,
          pricePlatinum: savedOffer.pricePlatinum,
          consumerReferencePrice: savedOffer.consumerReferencePrice,
          createdAt: savedOffer.createdAt,
        },
      };
    } catch (error) {
      logger.error('[NetureService] Error creating supplier offer:', error);
      throw error;
    }
  }

  /**
   * PATCH /supplier/products/:id - Offer 상태 업데이트
   *
   * 허용: isActive, distributionType, allowedSellerIds, 가격 필드
   */
  async updateSupplierOffer(
    offerId: string,
    supplierId: string,
    updates: {
      isActive?: boolean;
      distributionType?: OfferDistributionType;
      allowedSellerIds?: string[] | null;
      priceGeneral?: number;
      priceGold?: number | null;
      pricePlatinum?: number | null;
      consumerReferencePrice?: number | null;
    }
  ) {
    try {
      const offer = await this.offerRepo.findOne({
        where: { id: offerId, supplierId },
      });

      if (!offer) {
        return { success: false, error: 'PRODUCT_NOT_FOUND' };
      }

      if (updates.isActive !== undefined) {
        offer.isActive = updates.isActive;
      }

      if (updates.distributionType !== undefined) {
        offer.distributionType = updates.distributionType;
      }

      if (updates.allowedSellerIds !== undefined) {
        offer.allowedSellerIds = updates.allowedSellerIds;
      }

      if (updates.priceGeneral !== undefined) {
        offer.priceGeneral = updates.priceGeneral;
      }
      if (updates.priceGold !== undefined) {
        offer.priceGold = updates.priceGold;
      }
      if (updates.pricePlatinum !== undefined) {
        offer.pricePlatinum = updates.pricePlatinum;
      }
      if (updates.consumerReferencePrice !== undefined) {
        offer.consumerReferencePrice = updates.consumerReferencePrice;
      }

      // Validation: PRIVATE requires at least one seller ID
      if (offer.distributionType === OfferDistributionType.PRIVATE &&
          (!offer.allowedSellerIds || offer.allowedSellerIds.length === 0)) {
        return { success: false, error: 'PRIVATE_REQUIRES_SELLER_IDS' };
      }

      const savedOffer = await this.offerRepo.save(offer);

      // WO-O4O-PRODUCT-AUTO-LISTING-STABILIZATION-V1: PUBLIC 전환 시 기존 매장에 자동 Listing 확산
      if (savedOffer.distributionType === OfferDistributionType.PUBLIC
          && savedOffer.approvalStatus === OfferApprovalStatus.APPROVED
          && savedOffer.isActive) {
        autoExpandPublicProduct(AppDataSource, savedOffer.id, savedOffer.masterId)
          .then((count) => logger.info(`[NetureService] Auto-expanded ${count} listings for offer ${savedOffer.id} (PUBLIC transition)`))
          .catch((err) => logger.error(`[NetureService] Auto-expand failed for offer ${savedOffer.id}:`, err));
      }

      logger.info(`[NetureService] Updated offer ${offerId} by supplier ${supplierId}`);

      return {
        success: true,
        data: {
          id: savedOffer.id,
          isActive: savedOffer.isActive,
          distributionType: savedOffer.distributionType,
          allowedSellerIds: savedOffer.allowedSellerIds,
          priceGeneral: savedOffer.priceGeneral,
          priceGold: savedOffer.priceGold,
          pricePlatinum: savedOffer.pricePlatinum,
          consumerReferencePrice: savedOffer.consumerReferencePrice,
          updatedAt: savedOffer.updatedAt,
        },
      };
    } catch (error) {
      logger.error('[NetureService] Error updating supplier offer:', error);
      throw error;
    }
  }

  // ==================== ProductMaster — SSOT 관리 (WO-O4O-PRODUCT-MASTER-CORE-RESET-V1) ====================

  /** Immutable 필드 목록 — UPDATE 시 변경 차단 */
  private static readonly MASTER_IMMUTABLE_FIELDS: (keyof ProductMaster)[] = [
    'barcode',
    'regulatoryType',
    'regulatoryName',
    'manufacturerName',
    'mfdsPermitNumber',
    'mfdsProductId',
  ];

  /**
   * Master 조회 — barcode 기준
   */
  async getProductMasterByBarcode(barcode: string): Promise<ProductMaster | null> {
    return this.masterRepo.findOne({ where: { barcode }, relations: ['category', 'brand'] });
  }

  /**
   * Master 조회 — ID 기준
   */
  async getProductMasterById(id: string): Promise<ProductMaster | null> {
    return this.masterRepo.findOne({ where: { id }, relations: ['category', 'brand'] });
  }

  /**
   * Master 생성 파이프라인
   *
   * 1. GTIN 검증
   * 2. 내부 barcode 조회 → 이미 존재하면 반환
   * 3. MFDS stub 호출
   * 4a. MFDS 검증 성공 → MFDS 데이터로 생성 (isMfdsVerified = true)
   * 4b. MFDS 미연동(stub) + manualData 제공 → 수동 데이터로 생성 (isMfdsVerified = false)
   * 4c. 둘 다 없으면 → 에러
   *
   * 공급자가 직접 호출 불가. Admin/시스템 전용.
   */
  async resolveOrCreateMaster(
    barcode: string,
    manualData?: {
      regulatoryType?: string;
      regulatoryName: string;
      manufacturerName: string;
      marketingName?: string;
      mfdsPermitNumber?: string | null;
    }
  ): Promise<{ success: boolean; data?: ProductMaster; error?: string }> {
    // 1. GTIN 검증
    const { validateGtin } = await import('../../utils/gtin.js');
    const gtinError = validateGtin(barcode);
    if (gtinError) {
      return { success: false, error: `INVALID_GTIN: ${gtinError}` };
    }

    // 2. 내부 조회 — 이미 존재하면 반환
    const existing = await this.masterRepo.findOne({ where: { barcode } });
    if (existing) {
      return { success: true, data: existing };
    }

    // 3. MFDS 조회 (stub)
    const { verifyProductByBarcode } = await import('./services/mfds.service.js');
    const mfdsResult = await verifyProductByBarcode(barcode);

    // 4a. MFDS 검증 성공 → MFDS 데이터로 생성
    if (mfdsResult.verified && mfdsResult.product) {
      const master = this.masterRepo.create({
        barcode,
        regulatoryType: mfdsResult.product.regulatoryType,
        regulatoryName: mfdsResult.product.regulatoryName,
        marketingName: mfdsResult.product.regulatoryName,
        manufacturerName: mfdsResult.product.manufacturerName,
        mfdsPermitNumber: mfdsResult.product.permitNumber || null,
        mfdsProductId: mfdsResult.product.productId || barcode,
        isMfdsVerified: true,
        mfdsSyncedAt: new Date(),
      });

      const saved = await this.masterRepo.save(master);
      logger.info(`[NetureService] Created ProductMaster ${saved.id} for barcode ${barcode} (MFDS verified)`);
      return { success: true, data: saved };
    }

    // 4b. MFDS 미연동 + manualData 제공 → 수동 생성
    if (manualData) {
      const master = this.masterRepo.create({
        barcode,
        regulatoryType: manualData.regulatoryType || 'UNKNOWN',
        regulatoryName: manualData.regulatoryName,
        marketingName: manualData.marketingName || manualData.regulatoryName,
        manufacturerName: manualData.manufacturerName,
        mfdsPermitNumber: manualData.mfdsPermitNumber ?? null,
        mfdsProductId: barcode, // MFDS 미연동 시 barcode를 ID로 사용
        isMfdsVerified: false,
        mfdsSyncedAt: null,
      });

      const saved = await this.masterRepo.save(master);
      logger.info(`[NetureService] Created ProductMaster ${saved.id} for barcode ${barcode} (manual, MFDS unverified)`);
      return { success: true, data: saved };
    }

    // 4c. 둘 다 없음 → 에러
    return { success: false, error: mfdsResult.error || 'MFDS_VERIFICATION_FAILED' };
  }

  /**
   * Master 업데이트 — immutable 필드 변경 차단 (런타임 Guard)
   *
   * 변경 가능: marketingName, brandName, categoryId, brandId, specification, originCountry, tags
   * 변경 불가: barcode, regulatoryType, regulatoryName, manufacturerName, mfdsPermitNumber, mfdsProductId
   */
  async updateProductMaster(
    masterId: string,
    updates: Record<string, unknown>
  ): Promise<{ success: boolean; data?: ProductMaster; error?: string }> {
    // Immutable Guard — 런타임 보호
    const violatedFields = NetureService.MASTER_IMMUTABLE_FIELDS.filter(
      (field) => field in updates
    );
    if (violatedFields.length > 0) {
      return {
        success: false,
        error: `IMMUTABLE_FIELD_VIOLATION: ${violatedFields.join(', ')}`,
      };
    }

    const master = await this.masterRepo.findOne({ where: { id: masterId } });
    if (!master) {
      return { success: false, error: 'MASTER_NOT_FOUND' };
    }

    // 허용 필드만 적용
    if ('marketingName' in updates && typeof updates.marketingName === 'string') {
      master.marketingName = updates.marketingName;
    }
    if ('brandName' in updates) {
      master.brandName = updates.brandName as string | null;
    }
    // WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1: 확장 필드
    if ('categoryId' in updates) {
      master.categoryId = updates.categoryId as string | null;
    }
    if ('brandId' in updates) {
      master.brandId = updates.brandId as string | null;
    }
    if ('specification' in updates) {
      master.specification = updates.specification as string | null;
    }
    if ('originCountry' in updates) {
      master.originCountry = updates.originCountry as string | null;
    }
    if ('tags' in updates && Array.isArray(updates.tags)) {
      master.tags = updates.tags as string[];
    }

    const saved = await this.masterRepo.save(master);
    return { success: true, data: saved };
  }

  /**
   * Master 전체 목록 (Admin 전용)
   */
  async getAllProductMasters() {
    return this.masterRepo.find({ relations: ['category', 'brand'], order: { createdAt: 'DESC' } });
  }

  // ==================== ProductCategory — 카테고리 관리 (WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1) ====================

  /**
   * 카테고리 트리 (root → children, in-memory 빌드)
   */
  async getCategoryTree(): Promise<ProductCategory[]> {
    const all = await this.categoryRepo.find({ order: { depth: 'ASC', sortOrder: 'ASC', name: 'ASC' } });
    const map = new Map<string, ProductCategory & { children: ProductCategory[] }>();
    const roots: (ProductCategory & { children: ProductCategory[] })[] = [];

    for (const cat of all) {
      map.set(cat.id, { ...cat, children: [] });
    }
    for (const cat of all) {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  /**
   * 카테고리 생성 (depth 자동 계산, 최대 4단계: 0-3)
   */
  async createCategory(data: {
    name: string;
    slug: string;
    parentId?: string | null;
    sortOrder?: number;
  }): Promise<ProductCategory> {
    let depth = 0;
    if (data.parentId) {
      const parent = await this.categoryRepo.findOne({ where: { id: data.parentId } });
      if (!parent) throw new Error('PARENT_CATEGORY_NOT_FOUND');
      if (parent.depth >= 3) throw new Error('MAX_CATEGORY_DEPTH_EXCEEDED');
      depth = parent.depth + 1;
    }
    const cat = this.categoryRepo.create({
      name: data.name,
      slug: data.slug,
      parentId: data.parentId || null,
      depth,
      sortOrder: data.sortOrder || 0,
      isActive: true,
    });
    return this.categoryRepo.save(cat);
  }

  /**
   * 카테고리 수정
   */
  async updateCategory(id: string, data: Partial<{
    name: string;
    slug: string;
    sortOrder: number;
    isActive: boolean;
  }>): Promise<ProductCategory> {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new Error('CATEGORY_NOT_FOUND');
    Object.assign(cat, data);
    return this.categoryRepo.save(cat);
  }

  /**
   * 카테고리 삭제 (FK SET NULL → 자식/상품 안전)
   */
  async deleteCategory(id: string): Promise<void> {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new Error('CATEGORY_NOT_FOUND');
    await this.categoryRepo.delete(id);
  }

  // ==================== Brand — 브랜드 관리 (WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1) ====================

  /**
   * 브랜드 전체 목록
   */
  async getAllBrands(): Promise<Brand[]> {
    return this.brandRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  /**
   * 브랜드 생성
   */
  async createBrand(data: {
    name: string;
    slug: string;
    manufacturerName?: string;
    countryOfOrigin?: string;
  }): Promise<Brand> {
    const brand = this.brandRepo.create({
      name: data.name,
      slug: data.slug,
      manufacturerName: data.manufacturerName || null,
      countryOfOrigin: data.countryOfOrigin || null,
      isActive: true,
    });
    return this.brandRepo.save(brand);
  }

  /**
   * 브랜드 수정
   */
  async updateBrand(id: string, data: Partial<{
    name: string;
    slug: string;
    manufacturerName: string;
    countryOfOrigin: string;
    isActive: boolean;
  }>): Promise<Brand> {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new Error('BRAND_NOT_FOUND');
    Object.assign(brand, data);
    return this.brandRepo.save(brand);
  }

  /**
   * 브랜드 삭제 (FK SET NULL → ProductMaster 안전)
   */
  async deleteBrand(id: string): Promise<void> {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new Error('BRAND_NOT_FOUND');
    await this.brandRepo.delete(id);
  }

  // ==================== ProductImage — 상품 이미지 관리 (WO-O4O-NETURE-PRODUCT-IMAGE-STRUCTURE-V1) ====================

  /**
   * 특정 Master의 이미지 목록 조회
   */
  async getProductImages(masterId: string): Promise<ProductImage[]> {
    return this.imageRepo.find({
      where: { masterId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * 이미지 추가 — 첫 이미지면 자동 대표
   */
  async addProductImage(
    masterId: string,
    imageUrl: string,
    gcsPath: string,
    isPrimary?: boolean
  ): Promise<ProductImage> {
    // 기존 이미지 수 확인
    const existingCount = await this.imageRepo.count({ where: { masterId } });

    const image = this.imageRepo.create({
      masterId,
      imageUrl,
      gcsPath,
      isPrimary: isPrimary ?? existingCount === 0, // 첫 이미지면 자동 대표
      sortOrder: existingCount,
    });

    return this.imageRepo.save(image);
  }

  /**
   * 대표 이미지 변경
   */
  async setPrimaryImage(imageId: string, masterId: string): Promise<void> {
    // 트랜잭션: 기존 primary → false, 선택 → true
    await AppDataSource.transaction(async (manager) => {
      await manager.update(ProductImage, { masterId, isPrimary: true }, { isPrimary: false });
      await manager.update(ProductImage, { id: imageId, masterId }, { isPrimary: true });
    });
  }

  /**
   * 이미지 삭제 — gcsPath 반환 (GCS 삭제는 호출자가 수행)
   */
  async deleteProductImage(imageId: string, masterId: string): Promise<{ gcsPath: string }> {
    const image = await this.imageRepo.findOne({ where: { id: imageId, masterId } });
    if (!image) throw new Error('IMAGE_NOT_FOUND');

    const { gcsPath, isPrimary } = image;
    await this.imageRepo.delete(imageId);

    // 대표 이미지 삭제 시, 다음 이미지를 대표로 승격
    if (isPrimary) {
      const next = await this.imageRepo.findOne({
        where: { masterId },
        order: { sortOrder: 'ASC' },
      });
      if (next) {
        next.isPrimary = true;
        await this.imageRepo.save(next);
      }
    }

    return { gcsPath };
  }

  // ==================== Order Summary (WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.4, P1 §3.3) ====================

  /**
   * GET /supplier/orders/summary - 서비스별 주문 요약
   *
   * Neture는 주문을 직접 처리하지 않음.
   * 서비스별 요약 정보만 제공하고 해당 서비스로 이동 링크 제공.
   *
   * P1 §3.3 정밀화:
   * - 최근 승인 발생 시점
   * - 각 서비스 상태 정보
   * - 서비스별 담당자 연락처
   */
  async getSupplierOrdersSummary(supplierId: string) {
    try {
      // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: v2 product_approvals
      const approvedByService: Array<{ serviceId: string; serviceName: string; approvedCount: string; lastApprovedAt: string }> = await AppDataSource.query(
        `SELECT pa.service_key AS "serviceId", pa.service_key AS "serviceName",
                COUNT(*)::text AS "approvedCount",
                MAX(pa.decided_at)::text AS "lastApprovedAt"
         FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'approved'
         GROUP BY pa.service_key`,
        [supplierId],
      );

      // 서비스 설정 (실제로는 DB나 설정에서 가져와야 함)
      const serviceConfig: Record<string, {
        url: string;
        ordersPath: string;
        supportEmail?: string;
        features: string[];
      }> = {
        glycopharm: {
          url: 'https://glycopharm.neture.co.kr',
          ordersPath: '/supplier/orders',
          supportEmail: 'support@glycopharm.kr',
          features: ['주문관리', '배송조회', '반품처리'],
        },
        'k-cosmetics': {
          url: 'https://k-cosmetics.neture.co.kr',
          ordersPath: '/supplier/orders',
          supportEmail: 'support@k-cosmetics.kr',
          features: ['주문관리', '배송조회'],
        },
        glucoseview: {
          url: 'https://glucoseview.neture.co.kr',
          ordersPath: '/supplier/orders',
          supportEmail: 'support@glucoseview.kr',
          features: ['주문관리', '구독관리'],
        },
      };

      // 기본 설정 (타입 안전성을 위해)
      const defaultConfig = {
        url: '',
        ordersPath: '',
        supportEmail: '',
        features: [] as string[],
      };

      // 각 서비스에 대해 최근 이벤트 조회
      const serviceDetails = await Promise.all(
        approvedByService.map(async (svc) => {
          const config = serviceConfig[svc.serviceId] || defaultConfig;

          // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: event table dropped
          const recentEvents: Array<{ eventType: string; sellerName: string; productName: string; createdAt: Date }> = [];

          const [{ cnt: pendingCount }] = await AppDataSource.query(
            `SELECT COUNT(*)::int AS cnt FROM product_approvals pa
             JOIN supplier_product_offers spo ON spo.id = pa.offer_id
             WHERE spo.supplier_id = $1 AND pa.approval_type = 'private'
               AND pa.approval_status = 'pending' AND pa.service_key = $2`,
            [supplierId, svc.serviceId],
          );

          return {
            serviceId: svc.serviceId,
            serviceName: svc.serviceName,
            summary: {
              approvedSellerCount: parseInt(svc.approvedCount, 10),
              pendingRequestCount: pendingCount,
              lastApprovedAt: svc.lastApprovedAt || null,
            },
            navigation: {
              serviceUrl: config.url || null,
              ordersUrl: config.url ? `${config.url}${config.ordersPath}` : null,
              supportEmail: config.supportEmail || null,
            },
            features: config.features || [],
            recentActivity: recentEvents,
            notice: 'Neture에서는 주문을 직접 처리하지 않습니다. 해당 서비스에서 주문을 관리하세요.',
          };
        })
      );

      return {
        services: serviceDetails,
        totalApprovedSellers: serviceDetails.reduce((sum, s) => sum + s.summary.approvedSellerCount, 0),
        totalPendingRequests: serviceDetails.reduce((sum, s) => sum + s.summary.pendingRequestCount, 0),
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching order summary:', error);
      throw error;
    }
  }

  // ==================== Dashboard Summary API ====================

  /**
   * GET /supplier/dashboard/summary - 공급자 대시보드 통계 요약
   */
  async getSupplierDashboardSummary(supplierId: string) {
    try {
      // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: v2 product_approvals
      const [reqStats] = await AppDataSource.query(`
        SELECT COUNT(*)::int AS "totalRequests",
          COUNT(*) FILTER (WHERE pa.approval_status = 'pending')::int AS "pendingRequests",
          COUNT(*) FILTER (WHERE pa.approval_status = 'approved')::int AS "approvedRequests",
          COUNT(*) FILTER (WHERE pa.approval_status = 'rejected')::int AS "rejectedRequests"
        FROM product_approvals pa
        JOIN supplier_product_offers spo ON spo.id = pa.offer_id
        WHERE spo.supplier_id = $1 AND pa.approval_type = 'private'
      `, [supplierId]);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const [{ count: recentApprovals }] = await AppDataSource.query(`
        SELECT COUNT(*)::int AS count FROM product_approvals pa
        JOIN supplier_product_offers spo ON spo.id = pa.offer_id
        WHERE spo.supplier_id = $1 AND pa.approval_type = 'private'
          AND pa.approval_status = 'approved' AND pa.decided_at >= $2
      `, [supplierId, sevenDaysAgo]);

      // 제품 통계
      const offers = await this.offerRepo.find({ where: { supplierId } });
      const activeProducts = offers.filter((o) => o.isActive).length;
      const totalProducts = offers.length;

      // 연결된 서비스 수
      const [{ count: connectedCount }] = await AppDataSource.query(`
        SELECT COUNT(DISTINCT pa.service_key)::int AS count FROM product_approvals pa
        JOIN supplier_product_offers spo ON spo.id = pa.offer_id
        WHERE spo.supplier_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'approved'
      `, [supplierId]);

      // 서비스별 통계
      const serviceStats: Array<{ serviceId: string; serviceName: string; pending: number; approved: number; rejected: number }> = await AppDataSource.query(`
        SELECT pa.service_key AS "serviceId", pa.service_key AS "serviceName",
          SUM(CASE WHEN pa.approval_status = 'pending' THEN 1 ELSE 0 END)::int AS pending,
          SUM(CASE WHEN pa.approval_status = 'approved' THEN 1 ELSE 0 END)::int AS approved,
          SUM(CASE WHEN pa.approval_status = 'rejected' THEN 1 ELSE 0 END)::int AS rejected
        FROM product_approvals pa
        JOIN supplier_product_offers spo ON spo.id = pa.offer_id
        WHERE spo.supplier_id = $1 AND pa.approval_type = 'private'
        GROUP BY pa.service_key
      `, [supplierId]);

      return {
        stats: {
          totalRequests: reqStats.totalRequests,
          pendingRequests: reqStats.pendingRequests,
          approvedRequests: reqStats.approvedRequests,
          rejectedRequests: reqStats.rejectedRequests,
          recentApprovals: Number(recentApprovals),
          totalProducts,
          activeProducts,
          totalContents: 0,
          publishedContents: 0,
          connectedServices: Number(connectedCount),
        },
        serviceStats: serviceStats.map((s) => ({
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          pending: s.pending,
          approved: s.approved,
          rejected: s.rejected,
        })),
        recentActivity: [], // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: event table dropped
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching supplier dashboard summary:', error);
      throw error;
    }
  }

  /**
   * GET /admin/dashboard/summary - 운영자/관리자 대시보드 통계 요약
   */
  async getAdminDashboardSummary() {
    try {
      // 공급자 통계
      const totalSuppliers = await this.supplierRepo.count();
      const activeSuppliers = await this.supplierRepo.count({
        where: { status: SupplierStatus.ACTIVE },
      });
      const pendingSuppliers = await this.supplierRepo.count({
        where: { status: SupplierStatus.PENDING },
      });

      // Offer 통계 (WO-O4O-PRODUCT-MASTER-CORE-RESET-V1)
      const totalProducts = await this.offerRepo.count();
      const pendingProducts = await this.offerRepo.count({
        where: { approvalStatus: OfferApprovalStatus.PENDING },
      });
      const publicProducts = await this.offerRepo.count({ where: { distributionType: OfferDistributionType.PUBLIC } });
      const serviceProducts = await this.offerRepo.count({ where: { distributionType: OfferDistributionType.SERVICE } });
      const privateProducts = await this.offerRepo.count({ where: { distributionType: OfferDistributionType.PRIVATE } });

      // WO-NETURE-DISTRIBUTION-TIER-REALIGN-BETA-V1: 전체 approval 통계 (SERVICE + PRIVATE)
      const [adminReqStats] = await AppDataSource.query(`
        SELECT COUNT(*)::int AS "totalRequests",
          COUNT(*) FILTER (WHERE approval_status = 'pending')::int AS "pendingRequests",
          COUNT(*) FILTER (WHERE approval_status = 'approved')::int AS "approvedRequests",
          COUNT(*) FILTER (WHERE approval_status = 'rejected')::int AS "rejectedRequests"
        FROM product_approvals
      `);

      // Tier별 approval 분해 통계
      const tierStats: Array<{ approval_type: string; total: number; pending: number; approved: number; rejected: number }> = await AppDataSource.query(`
        SELECT approval_type,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE approval_status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE approval_status = 'approved')::int AS approved,
          COUNT(*) FILTER (WHERE approval_status = 'rejected')::int AS rejected
        FROM product_approvals
        GROUP BY approval_type
      `);
      const emptyTier = { total: 0, pending: 0, approved: 0, rejected: 0 };
      const serviceTier = tierStats.find((t) => t.approval_type === 'service') || emptyTier;
      const privateTier = tierStats.find((t) => t.approval_type === 'private') || emptyTier;

      // 파트너십 요청 통계
      const totalPartnershipRequests = await this.partnershipRepo.count();
      const openPartnershipRequests = await this.partnershipRepo.count({
        where: { status: PartnershipStatus.OPEN },
      });

      // 서비스별 공급자/파트너 통계 (SERVICE + PRIVATE 모두 포함)
      const serviceStats: Array<{ serviceId: string; serviceName: string; suppliers: number; partners: number }> = await AppDataSource.query(`
        SELECT pa.service_key AS "serviceId", pa.service_key AS "serviceName",
          COUNT(DISTINCT CASE WHEN pa.approval_status = 'approved' THEN spo.supplier_id END)::int AS suppliers,
          COUNT(DISTINCT CASE WHEN pa.approval_status = 'approved' THEN pa.organization_id END)::int AS partners
        FROM product_approvals pa
        JOIN supplier_product_offers spo ON spo.id = pa.offer_id
        GROUP BY pa.service_key
      `);

      // 최근 요청 (대기 중 — SERVICE + PRIVATE)
      const recentPending: Array<{ id: string; sellerId: string; createdAt: Date }> = await AppDataSource.query(`
        SELECT pa.id, pa.organization_id AS "sellerId", pa.created_at AS "createdAt"
        FROM product_approvals pa WHERE pa.approval_status = 'pending'
        ORDER BY pa.created_at DESC LIMIT 5
      `);

      // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: event table dropped
      const recentEvents: Array<{ id: string; eventType: string; sellerName: string; productName: string; serviceName: string; createdAt: Date }> = [];

      return {
        stats: {
          totalSuppliers,
          activeSuppliers,
          pendingSuppliers,
          totalRequests: adminReqStats.totalRequests,
          pendingRequests: adminReqStats.pendingRequests,
          approvedRequests: adminReqStats.approvedRequests,
          rejectedRequests: adminReqStats.rejectedRequests,
          totalPartnershipRequests,
          openPartnershipRequests,
          totalContents: 0,
          publishedContents: 0,
          totalProducts,
          pendingProducts,
          distributionTypeBreakdown: { PUBLIC: publicProducts, SERVICE: serviceProducts, PRIVATE: privateProducts },
          approvalByTier: {
            SERVICE: { total: serviceTier.total, pending: serviceTier.pending, approved: serviceTier.approved, rejected: serviceTier.rejected },
            PRIVATE: { total: privateTier.total, pending: privateTier.pending, approved: privateTier.approved, rejected: privateTier.rejected },
          },
        },
        serviceStatus: serviceStats.map((s) => ({
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          suppliers: s.suppliers,
          partners: s.partners,
          status: 'active' as const,
        })),
        recentApplications: recentPending.map((r) => ({
          id: r.id,
          name: r.sellerId,
          type: '공급자 신청',
          date: r.createdAt,
          status: '대기중',
        })),
        recentActivities: recentEvents.map((e) => ({
          id: e.id,
          type: e.eventType,
          text: `${e.sellerName} - ${e.productName} (${e.serviceName})`,
          time: e.createdAt,
        })),
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching admin dashboard summary:', error);
      throw error;
    }
  }

  /**
   * GET /admin/dashboard/partner-kpi
   * WO-O4O-NETURE-ADMIN-DASHBOARD-PARTNER-KPI-V1
   */
  async getPartnerKpiSummary() {
    try {
      const [result] = await AppDataSource.query(`
        SELECT
          (SELECT COUNT(*)::int FROM neture.neture_partners WHERE status = 'active') AS "activePartners",
          (SELECT COALESCE(SUM(commission_amount), 0)::int FROM partner_commissions WHERE status != 'cancelled') AS "totalCommission",
          (SELECT COALESCE(SUM(commission_amount), 0)::int FROM partner_commissions WHERE status = 'pending') AS "pendingCommission",
          (SELECT COUNT(*)::int FROM partner_settlements WHERE status = 'pending') AS "pendingSettlements"
      `);
      return {
        activePartners: result.activePartners ?? 0,
        totalCommission: result.totalCommission ?? 0,
        pendingCommission: result.pendingCommission ?? 0,
        pendingSettlements: result.pendingSettlements ?? 0,
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching partner KPI summary:', error);
      throw error;
    }
  }

  /**
   * GET /partner/dashboard/summary - 파트너 대시보드 통계 요약
   */
  async getPartnerDashboardSummary(userId: string) {
    try {
      // 파트너십 요청 통계
      const partnershipRequests = await this.partnershipRepo.find({
        where: { sellerId: userId },
      });

      const totalRequests = partnershipRequests.length;
      const openRequests = partnershipRequests.filter((r) => r.status === PartnershipStatus.OPEN).length;
      const matchedRequests = partnershipRequests.filter((r) => r.status === PartnershipStatus.MATCHED).length;
      const closedRequests = partnershipRequests.filter((r) => r.status === PartnershipStatus.CLOSED).length;

      // WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-REMOVAL-V1: v2 product_approvals
      const sellerApprovals: Array<{ id: string; serviceId: string; serviceName: string; createdAt: string }> = await AppDataSource.query(`
        SELECT pa.id, pa.service_key AS "serviceId", pa.service_key AS "serviceName",
               pa.created_at AS "createdAt"
        FROM product_approvals pa
        WHERE pa.organization_id = $1 AND pa.approval_type = 'private' AND pa.approval_status = 'approved'
      `, [userId]);

      // 연결된 서비스 (중복 제거)
      const connectedServicesMap = new Map<string, {
        serviceId: string;
        serviceName: string;
        supplierCount: number;
        lastActivity: Date;
      }>();

      sellerApprovals.forEach((r) => {
        const existing = connectedServicesMap.get(r.serviceId);
        if (existing) {
          existing.supplierCount++;
          if (new Date(r.createdAt) > existing.lastActivity) {
            existing.lastActivity = new Date(r.createdAt);
          }
        } else {
          connectedServicesMap.set(r.serviceId, {
            serviceId: r.serviceId,
            serviceName: r.serviceName,
            supplierCount: 1,
            lastActivity: new Date(r.createdAt),
          });
        }
      });

      const connectedServices = Array.from(connectedServicesMap.values());

      // 알림 (최근 파트너십 요청 상태 변경, 정산 등)
      const notifications: Array<{ type: string; text: string; link: string }> = [];

      const recentMatchedRequests = partnershipRequests.filter(
        (r) => r.status === PartnershipStatus.MATCHED && r.matchedAt
      );
      if (recentMatchedRequests.length > 0) {
        notifications.push({
          type: 'success',
          text: `파트너십 매칭 완료 ${recentMatchedRequests.length}건`,
          link: '/partner/collaboration',
        });
      }

      if (openRequests > 0) {
        notifications.push({
          type: 'info',
          text: `진행 중인 파트너십 요청 ${openRequests}건`,
          link: '/partner/collaboration',
        });
      }

      return {
        stats: {
          totalRequests,
          openRequests,
          matchedRequests,
          closedRequests,
          connectedServiceCount: connectedServices.length,
          totalSupplierCount: sellerApprovals.length,
        },
        connectedServices: connectedServices.map((s) => ({
          ...s,
          lastActivity: this.formatRelativeTime(s.lastActivity),
        })),
        notifications,
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching partner dashboard summary:', error);
      throw error;
    }
  }

  /**
   * 상대적 시간 포맷팅
   */
  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  }

  // ==================== Operator Supply Dashboard (WO-O4O-SERVICE-OPERATOR-SUPPLY-DASHBOARD-IMPLEMENTATION-V1) ====================

  /**
   * 운영자용 공급 가능 제품 목록 + 공급요청 상태 머지
   */
  async getOperatorSupplyProducts(operatorUserId: string) {
    try {
      // 1. 활성 PUBLIC + SERVICE Offer 조회 (Tier 1 + Tier 2)
      const allOffers = await this.offerRepo.find({
        where: { isActive: true, distributionType: In([OfferDistributionType.PUBLIC, OfferDistributionType.SERVICE]) },
        relations: ['supplier', 'master'],
        order: { createdAt: 'DESC' },
      });

      // Supplier ACTIVE 검증 (Tier 공통)
      const activeOffers = allOffers.filter((o) => o.supplier?.status === SupplierStatus.ACTIVE);

      // v2 product_approvals — offer_id 기준
      const myApprovals: Array<{ offer_id: string; supplier_id: string; status: string; id: string; reason: string | null }> = await AppDataSource.query(
        `SELECT pa.offer_id, spo.supplier_id, pa.approval_status AS status, pa.id, pa.reason
         FROM product_approvals pa
         JOIN supplier_product_offers spo ON spo.id = pa.offer_id
         WHERE pa.organization_id = $1 AND pa.approval_type IN ('private', 'service')`,
        [operatorUserId],
      );

      // offerId → 가장 관련성 높은 요청 상태 매핑
      const requestMap = new Map<string, { status: string; requestId: string; rejectReason?: string }>();
      for (const req of myApprovals) {
        const key = `${req.supplier_id}:${req.offer_id}`;
        const existing = requestMap.get(key);
        if (!existing ||
            req.status === 'pending' ||
            req.status === 'approved') {
          requestMap.set(key, {
            status: req.status,
            requestId: req.id,
            rejectReason: req.reason || undefined,
          });
        }
      }

      // 머지하여 반환
      return activeOffers.map((o) => {
        const key = `${o.supplierId}:${o.id}`;
        const request = requestMap.get(key);
        return {
          id: o.id,
          masterId: o.masterId,
          masterName: o.master?.marketingName || '',
          distributionType: o.distributionType,
          supplierId: o.supplierId,
          supplierName: o.supplier?.name || '',
          supplyStatus: request?.status || 'available',
          requestId: request?.requestId || null,
          rejectReason: request?.rejectReason || null,
        };
      });
    } catch (error) {
      logger.error('[NetureService] Error fetching operator supply products:', error);
      throw error;
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
      logger.error('[NetureService] Error fetching partner recruitments:', error);
      throw error;
    }
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
      logger.info(`[NetureService] Partner application created: ${saved.id}`);

      return { id: saved.id, status: saved.status, appliedAt: saved.appliedAt };
    } catch (error) {
      logger.error('[NetureService] Error creating partner application:', error);
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
        logger.info(`[NetureService] Contract created: ${contract.id} (seller=${recruitment.sellerId}, partner=${application.partnerId})`);

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
          logger.info(`[NetureService] Auto-added dashboard item for partner ${application.partnerId}`);
        }
      });

      return { id: application.id, status: application.status };
    } catch (error) {
      logger.error('[NetureService] Error approving partner application:', error);
      throw error;
    }
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
      logger.error('[NetureService] Error rejecting partner application:', error);
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

    logger.info(`[NetureService] Contract terminated: ${contractId} by ${actorType} ${actorId}`);
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

    logger.info(`[NetureService] Commission updated: old=${contractId} terminated, new=${saved.id} rate=${newRate}`);
    return { terminated: { id: existing.id }, created: saved };
  }

  /**
   * Seller Dashboard AI Insight — 4카드 구조
   *
   * WO-STORE-AI-V1-SELLER-INSIGHT
   *
   * ① 접근 가능 상품 (accessible / newThisWeek / notRequested)
   * ② 공급 신청 상태 (pending / approved / rejected)
   * ③ 노출 점검 (approvedButNotExposed) — Neture에 채널 없으므로 0 고정
   * ④ 운영 신호 (recentOrders7d / trend) — Neture에 주문 없으므로 0/'none' 고정
   */
  async getSellerDashboardInsight(sellerId: string) {
    try {
      // ① 접근 가능 상품
      const [accessibleRows, newThisWeekRows, notRequestedRows] = await Promise.all([
        AppDataSource.query(`
          SELECT COUNT(*)::int AS cnt
          FROM supplier_product_offers spo
          WHERE spo.is_active = true
            AND (
              spo.distribution_type = 'PUBLIC'
              OR (spo.distribution_type = 'PRIVATE' AND $1 = ANY(spo.allowed_seller_ids))
            )
        `, [sellerId]),
        AppDataSource.query(`
          SELECT COUNT(*)::int AS cnt
          FROM supplier_product_offers spo
          WHERE spo.is_active = true
            AND spo.created_at >= NOW() - INTERVAL '7 days'
            AND (
              spo.distribution_type = 'PUBLIC'
              OR (spo.distribution_type = 'PRIVATE' AND $1 = ANY(spo.allowed_seller_ids))
            )
        `, [sellerId]),
        AppDataSource.query(`
          SELECT COUNT(*)::int AS cnt
          FROM supplier_product_offers spo
          WHERE spo.is_active = true
            AND (
              spo.distribution_type = 'PUBLIC'
              OR (spo.distribution_type = 'PRIVATE' AND $1 = ANY(spo.allowed_seller_ids))
            )
            AND spo.id NOT IN (
              SELECT pa.offer_id FROM product_approvals pa
              WHERE pa.organization_id = $1 AND pa.approval_type = 'private'
            )
        `, [sellerId]),
      ]);

      const accessible = accessibleRows[0]?.cnt ?? 0;
      const newThisWeek = newThisWeekRows[0]?.cnt ?? 0;
      const notRequested = notRequestedRows[0]?.cnt ?? 0;

      // ② 공급 신청 상태 — WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals
      const [pendingRows, approvedRows, rejectedRows] = await Promise.all([
        AppDataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM product_approvals WHERE organization_id = $1 AND approval_type = 'private' AND approval_status = 'pending'`,
          [sellerId],
        ),
        AppDataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM product_approvals WHERE organization_id = $1 AND approval_type = 'private' AND approval_status = 'approved'`,
          [sellerId],
        ),
        AppDataSource.query(
          `SELECT COUNT(*)::int AS cnt FROM product_approvals WHERE organization_id = $1 AND approval_type = 'private' AND approval_status = 'rejected'`,
          [sellerId],
        ),
      ]);
      const pending = pendingRows[0]?.cnt ?? 0;
      const approved = approvedRows[0]?.cnt ?? 0;
      const rejected = rejectedRows[0]?.cnt ?? 0;

      // ③ 노출 점검 — Neture에 채널 시스템 없음, 향후 확장 대비 0 고정
      const approvedButNotExposed = 0;

      // ④ 운영 신호 — Neture에 주문 시스템 없음, 향후 서비스별 연동 시 확장
      const recentOrders7d = 0;
      const trend = 'none';

      return {
        products: {
          accessible,
          newThisWeek,
          notRequested,
          actionUrl: '/neture/seller/available-supply-products',
        },
        requests: {
          pending,
          approved,
          rejected,
          actionUrl: '/neture/seller/supply-requests',
        },
        exposure: {
          approvedButNotExposed,
          actionUrl: '/neture/seller/my-products',
        },
        operations: {
          recentOrders7d,
          trend,
          actionUrl: '/neture/seller/orders',
        },
      };
    } catch (error) {
      logger.error('[NetureService] Error fetching seller dashboard insight:', error);
      throw error;
    }
  }

}
