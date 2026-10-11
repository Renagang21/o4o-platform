import { getOfferOrganizationNames, mapAdminOffer } from './offer-read-enrichment.js';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { NetureSupplier, SupplierProductOffer, OfferDistributionType, OfferApprovalStatus } from '../entities/index.js';
import logger from '../../../utils/logger.js';

/** Existing offer queries; write workflows remain in NetureOfferService. */
export class AdminOfferReadService {
  private _offerRepo?: Repository<SupplierProductOffer>;
  private get offerRepo(): Repository<SupplierProductOffer> {
    if (!this._offerRepo) this._offerRepo = AppDataSource.getRepository(SupplierProductOffer);
    return this._offerRepo;
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

      const orgNameMap = await getOfferOrganizationNames(offers.map((o) => o.supplier).filter(Boolean));

      return offers.map((o) => ({
        id: o.id,
        masterId: o.masterId,
        masterName: o.master?.name || '',
        supplierName: (o.supplier?.organizationId ? orgNameMap.get(o.supplier.organizationId) : '') || '',
        supplierId: o.supplierId,
        isPublic: o.isPublic,
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

      const orgNameMap = await getOfferOrganizationNames(offers.map((o) => o.supplier).filter(Boolean));

      return offers.map((o) => mapAdminOffer(o, orgNameMap));
    } catch (error) {
      logger.error('[NetureOfferService] Error fetching all offers:', error);
      throw error;
    }
  }


  /**
   * WO-O4O-ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION-V1
   *
   * getAllProducts 의 pagination/search/sort 지원 변형.
   * 기존 getAllProducts(array 반환)은 operator 측 소비처(operator-product-approval.controller)가
   * 있어 그대로 유지하고, admin list 표준화를 위한 신규 진입점만 additive 로 추가한다.
   *
   * - page/limit 미전달 시: 전량 반환(legacy 동작 보존). pagination meta 는 controller 에서 전체 기준 구성.
   * - page/limit 전달 시: skip/take 적용 (limit 상한 100).
   * - search: master.name ILIKE. supplierName 은 organizations enrichment 값이라 V1 검색 제외.
   * - sortBy: whitelist 외 값은 createdAt fallback. sortOrder 비정상값은 DESC fallback.
   * - relations 는 to-one 만 join 하므로 getManyAndCount 의 total 이 정확하다.
   */
  async getAllProductsPaged(options?: {
    supplierId?: string;
    distributionType?: OfferDistributionType;
    isActive?: boolean;
    approvalStatus?: OfferApprovalStatus;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: Array<Record<string, unknown>>; total: number }> {
    try {
      // sortBy whitelist — DB 컬럼만 허용 (supplierName/category 는 enrichment/relation 이라 V1 제외)
      const SORT_WHITELIST: Record<string, string> = {
        createdAt: 'offer.createdAt',
        approvalStatus: 'offer.approvalStatus',
        distributionType: 'offer.distributionType',
        priceGeneral: 'offer.priceGeneral',
        isActive: 'offer.isActive',
      };

      const qb = this.offerRepo
        .createQueryBuilder('offer')
        .leftJoinAndSelect('offer.supplier', 'supplier')
        .leftJoinAndSelect('offer.master', 'master')
        .leftJoinAndSelect('master.category', 'category');

      if (options?.supplierId) qb.andWhere('offer.supplierId = :supplierId', { supplierId: options.supplierId });
      if (options?.distributionType) qb.andWhere('offer.distributionType = :distributionType', { distributionType: options.distributionType });
      if (options?.isActive !== undefined) qb.andWhere('offer.isActive = :isActive', { isActive: options.isActive });
      if (options?.approvalStatus) qb.andWhere('offer.approvalStatus = :approvalStatus', { approvalStatus: options.approvalStatus });

      const search = options?.search?.trim();
      if (search) qb.andWhere('master.name ILIKE :search', { search: `%${search}%` });

      const sortColumn = (options?.sortBy && SORT_WHITELIST[options.sortBy]) || SORT_WHITELIST.createdAt;
      const sortDir: 'ASC' | 'DESC' = String(options?.sortOrder || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      qb.orderBy(sortColumn, sortDir);

      // page/limit 전달 시에만 pagination 적용 (legacy 전량 조회 보존)
      if (options?.page !== undefined || options?.limit !== undefined) {
        const page = Math.max(1, Math.floor(options?.page ?? 1));
        const limit = Math.min(100, Math.max(1, Math.floor(options?.limit ?? 20)));
        qb.skip((page - 1) * limit).take(limit);
      }

      const [offers, total] = await qb.getManyAndCount();

      const orgNameMap = await getOfferOrganizationNames(offers.map((o) => o.supplier).filter(Boolean) as NetureSupplier[]);

      const items = offers.map((o) => ({
        ...mapAdminOffer(o, orgNameMap),
        marketingName: o.master?.name || '',
        category: o.master?.category?.name || null,
      }));

      return { items, total };
    } catch (error) {
      logger.error('[NetureOfferService] Error fetching paged offers:', error);
      throw error;
    }
  }


  /**
   * WO-O4O-ADMIN-PRODUCT-APPROVAL-BACKEND-PAGINATION-V1
   *
   * 승인 상태별 전체 집계 — pagination 도입 후 client 전량 집계(KPI 4카드) 대체용.
   * 공통 필터(supplierId/distributionType/isActive)만 수용하고, 전체 approvalStatus 기준으로 집계한다.
   */
  async getProductsSummary(filters?: {
    supplierId?: string;
    distributionType?: OfferDistributionType;
    isActive?: boolean;
  }): Promise<{ total: number; pending: number; approved: number; rejected: number }> {
    try {
      const qb = this.offerRepo
        .createQueryBuilder('offer')
        .select('offer.approvalStatus', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('offer.approvalStatus');

      if (filters?.supplierId) qb.andWhere('offer.supplierId = :supplierId', { supplierId: filters.supplierId });
      if (filters?.distributionType) qb.andWhere('offer.distributionType = :distributionType', { distributionType: filters.distributionType });
      if (filters?.isActive !== undefined) qb.andWhere('offer.isActive = :isActive', { isActive: filters.isActive });

      const rows: Array<{ status: string; count: string }> = await qb.getRawMany();

      const summary = { total: 0, pending: 0, approved: 0, rejected: 0 };
      for (const r of rows) {
        const n = Number.parseInt(r.count, 10) || 0;
        summary.total += n;
        if (r.status === OfferApprovalStatus.PENDING) summary.pending = n;
        else if (r.status === OfferApprovalStatus.APPROVED) summary.approved = n;
        else if (r.status === OfferApprovalStatus.REJECTED) summary.rejected = n;
      }
      return summary;
    } catch (error) {
      logger.error('[NetureOfferService] Error fetching products summary:', error);
      throw error;
    }
  }
}
