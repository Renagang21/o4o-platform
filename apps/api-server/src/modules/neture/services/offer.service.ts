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
import { ProductCategory } from '../entities/index.js';
import { ProductImportCommonService } from './product-import-common.service.js';
import { OfferServiceApprovalService } from './offer-service-approval.service.js';
import type { NetureCatalogService } from './catalog.service.js';
import { OfferErrorCode } from '../constants/offer-error-code.js';

/**
 * WO-NETURE-REGULATORY-POLICY-ENFORCEMENT-V1: 허용 규제 유형 (코드 레벨 enum, DB VARCHAR 유지)
 */
const REGULATORY_TYPES = ['DRUG', 'HEALTH_FUNCTIONAL', 'QUASI_DRUG', 'COSMETIC', 'GENERAL'] as const;
type RegulatoryType = (typeof REGULATORY_TYPES)[number];

/** 한글 입력 → 영문 코드 매핑 (하위호환) */
const REGULATORY_TYPE_ALIAS: Record<string, RegulatoryType> = {
  '의약품': 'DRUG',
  '건강기능식품': 'HEALTH_FUNCTIONAL',
  '의약외품': 'QUASI_DRUG',
  '화장품': 'COSMETIC',
  '일반': 'GENERAL',
};

function resolveRegulatoryType(raw?: string): RegulatoryType | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if ((REGULATORY_TYPES as readonly string[]).includes(trimmed)) return trimmed as RegulatoryType;
  return REGULATORY_TYPE_ALIAS[trimmed] || null;
}

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

      // WO-NETURE-REGULATORY-POLICY-ENFORCEMENT-V1: 규제 상품 permit 게이트
      const masterForApproval: Array<{
        mfds_permit_number: string | null;
        category_id: string | null;
        is_regulated: boolean | null;
      }> = await AppDataSource.query(
        `SELECT pm.mfds_permit_number, pm.category_id, pc.is_regulated
         FROM product_masters pm
         LEFT JOIN product_categories pc ON pc.id = pm.category_id
         WHERE pm.id = $1`,
        [offer.masterId],
      );
      if (masterForApproval.length > 0 && masterForApproval[0].is_regulated && !masterForApproval[0].mfds_permit_number) {
        return { success: false, error: OfferErrorCode.PERMIT_REQUIRED_FOR_APPROVAL };
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
             reason = $3,
             updated_at = NOW()
         WHERE offer_id = $1 AND approval_status = 'approved'`,
        [offerId, adminUserId, reason || 'Offer rejected by admin'],
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

      return offers.map((o) => {
        const activeServiceCount = serviceMap.get(o.id) || 0;
        const pendingRequestCount = pendingMap.get(o.id) || 0;
        const productName = o.master?.marketingName || o.master?.regulatoryName || '';

        const purpose = NetureOfferService.derivePurpose(o.isActive, activeServiceCount);

        return {
          id: o.id,
          masterId: o.masterId,
          name: productName,
          masterName: productName,
          category: o.master?.category?.name || '',
          isActive: o.isActive,
          purpose,
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
          pendingRequestCount,
          activeServiceCount,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
          barcode: o.master?.barcode || '',
          brandName: o.master?.brand?.name || o.master?.brandName || null,
          categoryName: o.master?.category?.name || null,
          specification: o.master?.specification || null,
          primaryImageUrl: imageMap.get(o.masterId) || null,
        };
      });
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
  // ==================== createSupplierOffer sub-methods (Phase3A) ====================

  /** 입력 검증: 바코드 생성, 유통타입 검증, 보안 체크, 공급자 상태 */
  private async validateCreateInput(
    data: { barcode?: string; distributionType?: OfferDistributionType; serviceKeys?: string[]; consumerShortDescription?: string | null },
    supplierId: string,
  ): Promise<{ success: false; error: string; message?: string } | { success: true; data: { barcode: string } }> {
    let barcode = data.barcode?.trim() || '';
    if (!barcode) {
      const { generateInternalBarcode } = await import('../../../utils/gtin.js');
      barcode = generateInternalBarcode(supplierId);
    }

    if (data.distributionType === OfferDistributionType.SERVICE && (!data.serviceKeys || data.serviceKeys.length === 0)) {
      return { success: false, error: 'SERVICE_REQUIRES_KEYS', message: 'SERVICE 유통 시 서비스를 선택해야 합니다.' };
    }
    if (data.distributionType === OfferDistributionType.PUBLIC) {
      data.serviceKeys = [];
    }
    if (data.distributionType === OfferDistributionType.PUBLIC && !data.consumerShortDescription?.trim()) {
      return { success: false, error: 'PUBLIC_REQUIRES_DESCRIPTION' };
    }

    if ('masterId' in (data as any)) {
      return { success: false, error: 'MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED' };
    }

    const supplier = await this.supplierRepo.findOne({ where: { id: supplierId }, select: ['id', 'status'] });
    if (!supplier || supplier.status !== SupplierStatus.ACTIVE) {
      return { success: false, error: 'SUPPLIER_NOT_ACTIVE' };
    }

    return { success: true, data: { barcode } };
  }

  /** 카테고리/규제/브랜드 해석 → Master 파이프라인 → 확장 필드 적용 */
  private async resolveProductMetadata(
    rawManualData: Record<string, any> | undefined,
    barcode: string,
    marketingName: string,
    categoryId: string | null,
    brandName: string | undefined,
  ): Promise<{ success: false; error: string; message?: string } | { success: true; data: { masterId: string; masterBarcode: string; manualData: Record<string, any> } }> {
    const resolvedCategoryId: string | null = categoryId || rawManualData?.categoryId || null;
    let isRegulated = false;
    if (resolvedCategoryId) {
      const categoryRepo = AppDataSource.getRepository(ProductCategory);
      const category = await categoryRepo.findOne({ where: { id: resolvedCategoryId } });
      if (!category) return { success: false, error: 'INVALID_CATEGORY' };
      isRegulated = category.isRegulated;
    }

    const manualData = { ...rawManualData };
    const resolvedMarketingName = marketingName || manualData.marketingName || '';

    if (isRegulated) {
      if (!manualData.regulatoryType || !manualData.regulatoryName) {
        return { success: false, error: 'REGULATED_FIELDS_REQUIRED' };
      }
      const resolved = resolveRegulatoryType(manualData.regulatoryType);
      if (!resolved) {
        return { success: false, error: 'INVALID_REGULATORY_TYPE', message: `허용 규제 유형: ${REGULATORY_TYPES.join(', ')}` };
      }
      manualData.regulatoryType = resolved;
    } else {
      const resolved = resolveRegulatoryType(manualData.regulatoryType);
      manualData.regulatoryType = resolved || 'GENERAL';
      manualData.regulatoryName = manualData.regulatoryName || resolvedMarketingName || 'UNKNOWN';
    }
    if (resolvedMarketingName) manualData.marketingName = resolvedMarketingName;

    let resolvedBrandId: string | null = manualData.brandId || null;
    if (!resolvedBrandId && brandName?.trim()) {
      const importCommon = new ProductImportCommonService(AppDataSource);
      resolvedBrandId = await importCommon.resolveBrandId(AppDataSource.manager, brandName.trim(), manualData.manufacturerName);
    }
    if (resolvedCategoryId) manualData.categoryId = resolvedCategoryId;
    if (resolvedBrandId) manualData.brandId = resolvedBrandId;

    const masterResult = await this.catalogService.resolveOrCreateMaster(barcode, manualData);
    if (!masterResult.success || !masterResult.data) {
      return { success: false, error: masterResult.error || 'MASTER_RESOLVE_FAILED' };
    }

    if (isRegulated && !masterResult.data.isMfdsVerified && !manualData.mfdsPermitNumber) {
      return { success: false, error: OfferErrorCode.PERMIT_REQUIRED_FOR_UNVERIFIED_REGULATED, message: '규제 상품은 MFDS 검증이 없는 경우 허가번호가 필수입니다.' };
    }

    const extFields: Record<string, unknown> = {};
    if (manualData.categoryId !== undefined) extFields.categoryId = manualData.categoryId;
    if (manualData.brandId !== undefined) extFields.brandId = manualData.brandId;
    if (manualData.specification !== undefined) extFields.specification = manualData.specification;
    if (manualData.originCountry !== undefined) extFields.originCountry = manualData.originCountry;
    if (manualData.tags !== undefined) extFields.tags = manualData.tags;
    if (manualData.marketingName !== undefined) extFields.marketingName = manualData.marketingName;

    if (Object.keys(extFields).length > 0) {
      await this.catalogService.updateProductMaster(masterResult.data.id, extFields);
    }

    return { success: true, data: { masterId: masterResult.data.id, masterBarcode: masterResult.data.barcode || masterResult.data.id, manualData } };
  }

  // ==================== createSupplierOffer (orchestrator) ====================

  /**
   * POST /supplier/products — 공급자 상품 등록
   *
   * masterId 외부 주입 금지 — barcode 기반 resolveOrCreateMaster() 강제 경유
   */
  async createSupplierOffer(
    supplierId: string,
    data: {
      barcode?: string;
      marketingName?: string;
      categoryId?: string;
      brandName?: string;
      manualData?: {
        regulatoryType?: string;
        regulatoryName?: string;
        manufacturerName?: string;
        marketingName?: string;
        mfdsPermitNumber?: string | null;
        categoryId?: string | null;
        brandId?: string | null;
        specification?: string | null;
        originCountry?: string | null;
        tags?: string[];
        stockQty?: number | string | null;
      };
      distributionType?: OfferDistributionType;
      serviceKeys?: string[];
      priceGeneral?: number;
      consumerReferencePrice?: number | null;
      consumerShortDescription?: string | null;
      consumerDetailDescription?: string | null;
    }
  ) {
    try {
      const validation = await this.validateCreateInput(data, supplierId);
      if ('error' in validation) return { success: false, error: validation.error, message: validation.message };
      const { barcode } = validation.data;

      const marketingName = data.marketingName || data.manualData?.marketingName || '';
      const categoryId = data.categoryId || data.manualData?.categoryId || null;

      const metadata = await this.resolveProductMetadata(data.manualData, barcode, marketingName, categoryId, data.brandName);
      if ('error' in metadata) return { success: false, error: metadata.error, message: metadata.message };

      const { masterId, masterBarcode, manualData } = metadata.data;

      // slug + stockQty + offer entity
      const slug = `${masterBarcode}-${supplierId.slice(0, 8)}-${Date.now()}`;
      const resolvedStockQty = manualData.stockQty != null ? Number(manualData.stockQty) : 0;

      const offer = this.offerRepo.create({
        supplierId,
        masterId,
        slug,
        distributionType: data.distributionType || OfferDistributionType.PRIVATE,
        isActive: false,
        approvalStatus: OfferApprovalStatus.PENDING,
        allowedSellerIds: [],
        serviceKeys: data.serviceKeys || [],
        priceGeneral: data.priceGeneral ?? 0,
        priceGold: null,
        pricePlatinum: null,
        consumerReferencePrice: data.consumerReferencePrice ?? null,
        stockQuantity: resolvedStockQty,
        consumerShortDescription: data.consumerShortDescription ?? null,
        consumerDetailDescription: data.consumerDetailDescription ?? null,
        businessShortDescription: null,
        businessDetailDescription: null,
      });

      const savedOffer = await this.offerRepo.save(offer);
      logger.info(`[NetureOfferService] Created offer ${savedOffer.id} by supplier ${supplierId} for master ${masterId} (PENDING approval)`);

      if (data.serviceKeys && data.serviceKeys.length > 0) {
        const approvalService = new OfferServiceApprovalService(AppDataSource);
        await approvalService.createPendingApprovals(savedOffer.id, data.serviceKeys);
      }

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
      consumerReferencePrice?: number | null;
      stockQuantity?: number;
      consumerShortDescription?: string | null;
      consumerDetailDescription?: string | null;
      marketingName?: string;
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
      if (updates.consumerReferencePrice !== undefined) {
        offer.consumerReferencePrice = updates.consumerReferencePrice;
      }
      if (updates.stockQuantity !== undefined) {
        offer.stockQuantity = updates.stockQuantity;
      }

      if (updates.consumerShortDescription !== undefined) {
        offer.consumerShortDescription = updates.consumerShortDescription;
      }
      if (updates.consumerDetailDescription !== undefined) {
        offer.consumerDetailDescription = updates.consumerDetailDescription;
      }

      // WO-NETURE-SUPPLIER-EDIT-UI-CONSISTENCY-FIX-V1: marketingName → master
      if (updates.marketingName !== undefined) {
        await this.catalogService.updateProductMaster(offer.masterId, { marketingName: updates.marketingName });
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
          .then((count) => logger.info(`[NetureOfferService] Auto-expanded ${count} listings for offer ${savedOffer.id} master ${savedOffer.masterId} (PUBLIC transition)`))
          .catch((err) => logger.warn(`[NetureOfferService] Auto-expand failed for offer ${savedOffer.id} master ${savedOffer.masterId}:`, err));
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

  // ==================== Paginated Supplier Products (WO-NETURE-SUPPLIER-EXCEL-LIST-V1) ====================

  // WO-NETURE-SUPPLIER-PRODUCT-COMPLETENESS-MANAGEMENT-V1: 5-item × 20pts inline score
  private static readonly COMPLETENESS_EXPR = `(
    CASE WHEN spo.price_general IS NOT NULL AND spo.price_general > 0 THEN 20 ELSE 0 END
    + CASE WHEN EXISTS (SELECT 1 FROM product_images WHERE master_id = pm.id) THEN 20 ELSE 0 END
    + CASE WHEN spo.consumer_short_description IS NOT NULL AND spo.consumer_short_description != '' THEN 20 ELSE 0 END
    + CASE WHEN spo.consumer_detail_description IS NOT NULL AND spo.consumer_detail_description != '' THEN 20 ELSE 0 END
    + CASE WHEN spo.distribution_type IS NOT NULL THEN 20 ELSE 0 END
  )`;

  /** Phase 3B: offer 상태로부터 purpose 파생 */
  private static derivePurpose(
    isActive: boolean,
    activeServiceCount: number,
  ): 'ACTIVE_SALES' | 'APPLICATION' | 'CATALOG' {
    if (isActive && activeServiceCount > 0) return 'ACTIVE_SALES';
    if (isActive) return 'APPLICATION';
    return 'CATALOG';
  }

  /** Phase 3B: approvalStatus + completenessScore로부터 completenessStatus 파생 */
  private static deriveCompletenessStatus(
    approvalStatus: string,
    completenessScore: number,
  ): 'APPROVED' | 'READY' | 'INCOMPLETE' | 'DRAFT' {
    if (approvalStatus === 'approved') return 'APPROVED';
    if (completenessScore >= 60) return 'READY';
    if (completenessScore > 0) return 'INCOMPLETE';
    return 'DRAFT';
  }

  /** Phase 3A: WHERE 조건 + 페이징/정렬 파라미터 빌드 */
  private buildPaginatedWhereClause(
    supplierId: string,
    options: {
      page?: number;
      limit?: number;
      keyword?: string;
      distributionType?: string;
      isActive?: string;
      sort?: string;
      order?: string;
      hasImage?: string;
      hasDescription?: string;
      barcodeSource?: string;
      completenessStatus?: string;
    },
  ) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));
    const offset = (page - 1) * limit;
    const keyword = options.keyword?.trim() || '';
    const sortOrder = options.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const validSortFields: Record<string, string> = {
      createdAt: 'spo.created_at',
      priceGeneral: 'spo.price_general',
      name: 'pm.marketing_name',
      completeness: NetureOfferService.COMPLETENESS_EXPR,
    };
    const sortField = validSortFields[options.sort || ''] || 'spo.created_at';

    // Build WHERE conditions
    const conditions: string[] = ['spo.supplier_id = $1'];
    const params: any[] = [supplierId];
    let idx = 2;

    if (keyword) {
      conditions.push(`(pm.marketing_name ILIKE $${idx} OR pm.barcode ILIKE $${idx} OR pm.regulatory_name ILIKE $${idx})`);
      params.push(`%${keyword}%`);
      idx++;
    }
    if (options.distributionType) {
      conditions.push(`spo.distribution_type = $${idx}`);
      params.push(options.distributionType);
      idx++;
    }
    if (options.isActive === 'true' || options.isActive === 'false') {
      conditions.push(`spo.is_active = $${idx}`);
      params.push(options.isActive === 'true');
      idx++;
    }
    if (options.hasImage === 'true') {
      conditions.push(`EXISTS (SELECT 1 FROM product_images WHERE master_id = pm.id)`);
    } else if (options.hasImage === 'false') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM product_images WHERE master_id = pm.id)`);
    }
    if (options.hasDescription === 'true') {
      conditions.push(`spo.consumer_short_description IS NOT NULL AND spo.consumer_short_description != ''`);
    } else if (options.hasDescription === 'false') {
      conditions.push(`(spo.consumer_short_description IS NULL OR spo.consumer_short_description = '')`);
    }
    if (options.barcodeSource) {
      conditions.push(`pm.barcode_source = $${idx}`);
      params.push(options.barcodeSource);
      idx++;
    }
    if (options.completenessStatus === 'DRAFT') {
      conditions.push(`${NetureOfferService.COMPLETENESS_EXPR} = 0`);
    } else if (options.completenessStatus === 'INCOMPLETE') {
      conditions.push(`${NetureOfferService.COMPLETENESS_EXPR} > 0 AND ${NetureOfferService.COMPLETENESS_EXPR} < 60`);
    } else if (options.completenessStatus === 'READY') {
      conditions.push(`${NetureOfferService.COMPLETENESS_EXPR} >= 60`);
    }

    const where = conditions.join(' AND ');

    return { page, limit, offset, sortField, sortOrder, where, params, idx };
  }

  /** Phase 3A: 페이지네이션 쿼리 결과 행 → DTO 매핑 (purpose + completenessStatus 파생) */
  private mapPaginatedRow(r: any) {
    return {
      ...r,
      purpose: NetureOfferService.derivePurpose(r.isActive, r.activeServiceCount),
      completenessStatus: NetureOfferService.deriveCompletenessStatus(r.approvalStatus, r.completenessScore || 0),
    };
  }

  async getSupplierProductsPaginated(
    supplierId: string,
    options: {
      page?: number;
      limit?: number;
      keyword?: string;
      distributionType?: string;
      isActive?: string;
      sort?: string;
      order?: string;
      hasImage?: string;
      hasDescription?: string;
      barcodeSource?: string;
      completenessStatus?: string;
    } = {},
  ) {
    const q = this.buildPaginatedWhereClause(supplierId, options);

    const [countResult, rows] = await Promise.all([
      AppDataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM supplier_product_offers spo
         JOIN product_masters pm ON pm.id = spo.master_id
         WHERE ${q.where}`,
        q.params,
      ),
      AppDataSource.query(
        `SELECT
           spo.id, spo.master_id AS "masterId", spo.is_active AS "isActive",
           spo.distribution_type AS "distributionType",
           spo.allowed_seller_ids AS "allowedSellerIds",
           spo.approval_status AS "approvalStatus",
           spo.price_general AS "priceGeneral",
           spo.price_gold AS "priceGold",
           spo.price_platinum AS "pricePlatinum",
           spo.consumer_reference_price AS "consumerReferencePrice",
           spo.consumer_short_description AS "consumerShortDescription",
           spo.consumer_detail_description AS "consumerDetailDescription",
           spo.service_keys AS "serviceKeys",
           spo.stock_quantity AS "stockQuantity",
           spo.created_at AS "createdAt",
           spo.updated_at AS "updatedAt",
           pm.tags,
           pm.marketing_name AS "masterName",
           pm.barcode,
           pm.specification,
           pm.regulatory_type AS "regulatoryType",
           pm.regulatory_name AS "regulatoryName",
           pm.mfds_permit_number AS "mfdsPermitNumber",
           pm.manufacturer_name AS "manufacturerName",
           COALESCE(pm.marketing_name, pm.regulatory_name, '') AS name,
           pc.name AS "categoryName",
           pm.brand_name AS "brandName",
           pi_img.image_url AS "primaryImageUrl",
           COALESCE(pending.cnt, 0)::int AS "pendingRequestCount",
           COALESCE(active.cnt, 0)::int AS "activeServiceCount",
           svc_appr.approvals AS "serviceApprovals",
           ${NetureOfferService.COMPLETENESS_EXPR} AS "completenessScore"
         FROM supplier_product_offers spo
         JOIN product_masters pm ON pm.id = spo.master_id
         LEFT JOIN product_categories pc ON pc.id = pm.category_id
         LEFT JOIN LATERAL (
           SELECT image_url FROM product_images
           WHERE master_id = pm.id AND is_primary = true LIMIT 1
         ) pi_img ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS cnt FROM product_approvals
           WHERE offer_id = spo.id AND approval_type = 'private' AND approval_status = 'pending'
         ) pending ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(DISTINCT service_key)::int AS cnt FROM product_approvals
           WHERE offer_id = spo.id AND approval_type = 'private' AND approval_status = 'approved'
         ) active ON true
         LEFT JOIN LATERAL (
           SELECT COALESCE(json_agg(json_build_object('serviceKey', osa.service_key, 'status', osa.approval_status)), '[]'::json) AS approvals
           FROM offer_service_approvals osa WHERE osa.offer_id = spo.id
         ) svc_appr ON true
         WHERE ${q.where}
         ORDER BY pm.id, ${q.sortField} ${q.sortOrder}
         LIMIT $${q.idx} OFFSET $${q.idx + 1}`,
        [...q.params, q.limit, q.offset],
      ),
    ]);

    const total = countResult[0]?.total || 0;
    const data = rows.map((r: any) => this.mapPaginatedRow(r));

    return {
      data,
      pagination: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) },
    };
  }

  // ==================== Batch Update (WO-NETURE-SUPPLIER-EXCEL-LIST-V1) ====================

  async batchUpdateSupplierOffers(
    supplierId: string,
    updates: Array<{
      offerId: string;
      isActive?: boolean;
      distributionType?: OfferDistributionType;
      priceGeneral?: number;
      consumerReferencePrice?: number | null;
      stockQuantity?: number;
    }>,
  ) {
    const updated: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const item of updates) {
      try {
        const result = await this.updateSupplierOffer(item.offerId, supplierId, {
          isActive: item.isActive,
          distributionType: item.distributionType,
          priceGeneral: item.priceGeneral,
          consumerReferencePrice: item.consumerReferencePrice,
          stockQuantity: item.stockQuantity,
        });
        if (result.success) {
          updated.push(item.offerId);
        } else {
          failed.push({ id: item.offerId, error: result.error || 'UNKNOWN' });
        }
      } catch (err) {
        failed.push({ id: item.offerId, error: (err as Error).message });
      }
    }

    return { updated, failed };
  }

  // ==================== Bulk Price Update (WO-NETURE-SUPPLIER-BULK-EDIT-UX-V1) ====================

  async bulkUpdatePrice(
    supplierId: string,
    offerIds: string[],
    operation: 'INCREASE' | 'DECREASE' | 'PERCENT_INCREASE' | 'PERCENT_DECREASE' | 'SET',
    value: number,
  ): Promise<{ updated: number; failed: Array<{ id: string; error: string }> }> {
    const offers = await this.offerRepo.find({
      where: { id: In(offerIds), supplierId },
    });

    const foundIds = new Set(offers.map((o) => o.id));
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of offerIds) {
      if (!foundIds.has(id)) {
        failed.push({ id, error: 'NOT_FOUND_OR_NOT_OWNED' });
      }
    }

    let updated = 0;
    for (const offer of offers) {
      const oldPrice = Number(offer.priceGeneral) || 0;
      let newPrice: number;

      switch (operation) {
        case 'INCREASE':
          newPrice = oldPrice + value;
          break;
        case 'DECREASE':
          newPrice = oldPrice - value;
          break;
        case 'PERCENT_INCREASE':
          newPrice = oldPrice * (1 + value / 100);
          break;
        case 'PERCENT_DECREASE':
          newPrice = oldPrice * (1 - value / 100);
          break;
        case 'SET':
          newPrice = value;
          break;
      }

      newPrice = Math.max(0, Math.round(newPrice));
      offer.priceGeneral = newPrice;

      try {
        await this.offerRepo.save(offer);
        updated++;
      } catch (err) {
        failed.push({ id: offer.id, error: (err as Error).message });
      }
    }

    return { updated, failed };
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
