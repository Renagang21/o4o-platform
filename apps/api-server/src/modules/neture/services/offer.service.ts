import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  NetureSupplier,
  SupplierProductOffer,
  OfferDistributionType,
  OfferApprovalStatus,
  SupplierStatus,
} from '../entities/index.js';
import { autoExpandPublicProduct } from '../../../utils/auto-listing.utils.js';
import logger from '../../../utils/logger.js';
import type { NetureCatalogService } from './catalog.service.js';

/**
 * NetureOfferService
 *
 * Offer CRUD, approval/rejection, supplier products, operator supply dashboard.
 * Extracted from NetureService (WO-O4O-NETURE-SERVICE-SPLIT-V1).
 */
export class NetureOfferService {
  // Lazy repositories
  private _offerRepo?: Repository<SupplierProductOffer>;
  private _supplierRepo?: Repository<NetureSupplier>;

  private get offerRepo(): Repository<SupplierProductOffer> {
    if (!this._offerRepo) {
      this._offerRepo = AppDataSource.getRepository(SupplierProductOffer);
    }
    return this._offerRepo;
  }

  private get supplierRepo(): Repository<NetureSupplier> {
    if (!this._supplierRepo) {
      this._supplierRepo = AppDataSource.getRepository(NetureSupplier);
    }
    return this._supplierRepo;
  }

  constructor(private readonly catalogService: NetureCatalogService) {}

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
      logger.error('[NetureOfferService] Error fetching pending offers:', error);
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

        logger.info(`[NetureOfferService] Offer approved: ${offerId} by ${adminUserId} (autoListed: ${autoListedCount})`);

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
      logger.error('[NetureOfferService] Error approving offer:', error);
      throw error;
    }
  }

  /**
   * POST /admin/offers/bulk-approve — 일괄 승인
   * WO-O4O-NETURE-BULK-IMPORT-INTEGRATION-V1
   */
  async approveProducts(
    offerIds: string[],
    adminUserId: string,
  ): Promise<{ approved: string[]; failed: Array<{ id: string; error: string }> }> {
    const approved: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const offerId of offerIds) {
      try {
        const result = await this.approveProduct(offerId, adminUserId);
        if (result.success) {
          approved.push(offerId);
        } else {
          failed.push({ id: offerId, error: result.error || 'UNKNOWN' });
        }
      } catch (err) {
        failed.push({ id: offerId, error: (err as Error).message || 'UNKNOWN' });
      }
    }

    return { approved, failed };
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

      logger.info(`[NetureOfferService] Offer rejected with cascade: ${offerId} by ${adminUserId}`);

      return {
        success: true,
        data: { id: offer.id, masterId: offer.masterId, isActive: offer.isActive, approvalStatus: offer.approvalStatus },
      };
    } catch (error) {
      logger.error('[NetureOfferService] Error rejecting offer:', error);
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
        consumerShortDescription: o.consumerShortDescription,
        consumerDetailDescription: o.consumerDetailDescription,
        businessShortDescription: o.businessShortDescription,
        businessDetailDescription: o.businessDetailDescription,
        createdAt: o.createdAt,
      }));
    } catch (error) {
      logger.error('[NetureOfferService] Error fetching all offers:', error);
      throw error;
    }
  }

  // ==================== Supplier Products ====================

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
        // WO-NETURE-PRODUCT-DESCRIPTION-FIELDS-V1
        consumerShortDescription: o.consumerShortDescription,
        consumerDetailDescription: o.consumerDetailDescription,
        businessShortDescription: o.businessShortDescription,
        businessDetailDescription: o.businessDetailDescription,
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
      logger.error('[NetureOfferService] Error fetching supplier offers:', error);
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
      // WO-NETURE-PRODUCT-DESCRIPTION-FIELDS-V1
      consumerShortDescription?: string | null;
      consumerDetailDescription?: string | null;
      businessShortDescription?: string | null;
      businessDetailDescription?: string | null;
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
      const masterResult = await this.catalogService.resolveOrCreateMaster(data.barcode, data.manualData);
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
          await this.catalogService.updateProductMaster(masterResult.data.id, extFields);
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
        // WO-NETURE-PRODUCT-DESCRIPTION-FIELDS-V1
        consumerShortDescription: data.consumerShortDescription ?? null,
        consumerDetailDescription: data.consumerDetailDescription ?? null,
        businessShortDescription: data.businessShortDescription ?? null,
        businessDetailDescription: data.businessDetailDescription ?? null,
      });

      const savedOffer = await this.offerRepo.save(offer);

      logger.info(`[NetureOfferService] Created offer ${savedOffer.id} by supplier ${supplierId} for master ${masterResult.data.id} (PENDING approval)`);

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
      logger.error('[NetureOfferService] Error creating supplier offer:', error);
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
      // WO-NETURE-PRODUCT-DESCRIPTION-FIELDS-V1
      consumerShortDescription?: string | null;
      consumerDetailDescription?: string | null;
      businessShortDescription?: string | null;
      businessDetailDescription?: string | null;
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

      // WO-NETURE-PRODUCT-DESCRIPTION-FIELDS-V1
      if (updates.consumerShortDescription !== undefined) {
        offer.consumerShortDescription = updates.consumerShortDescription;
      }
      if (updates.consumerDetailDescription !== undefined) {
        offer.consumerDetailDescription = updates.consumerDetailDescription;
      }
      if (updates.businessShortDescription !== undefined) {
        offer.businessShortDescription = updates.businessShortDescription;
      }
      if (updates.businessDetailDescription !== undefined) {
        offer.businessDetailDescription = updates.businessDetailDescription;
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
          .then((count) => logger.info(`[NetureOfferService] Auto-expanded ${count} listings for offer ${savedOffer.id} (PUBLIC transition)`))
          .catch((err) => logger.error(`[NetureOfferService] Auto-expand failed for offer ${savedOffer.id}:`, err));
      }

      logger.info(`[NetureOfferService] Updated offer ${offerId} by supplier ${supplierId}`);

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
      logger.error('[NetureOfferService] Error updating supplier offer:', error);
      throw error;
    }
  }

  // ==================== Operator Supply Dashboard ====================

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
      logger.error('[NetureOfferService] Error fetching operator supply products:', error);
      throw error;
    }
  }
}
