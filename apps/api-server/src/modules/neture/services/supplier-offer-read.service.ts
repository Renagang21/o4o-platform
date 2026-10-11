import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { SupplierProductOffer } from '../entities/index.js';
import logger from '../../../utils/logger.js';

/** Existing offer queries; write workflows remain in NetureOfferService. */
export class SupplierOfferReadService {
  private _offerRepo?: Repository<SupplierProductOffer>;
  private get offerRepo(): Repository<SupplierProductOffer> {
    return this._offerRepo ??= AppDataSource.getRepository(SupplierProductOffer);
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
        const productName = o.master?.name || o.master?.regulatoryName || '';

        const purpose = SupplierOfferReadService.derivePurpose(o.isActive, activeServiceCount);

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
          // WO-NETURE-PRODUCT-FIELD-GAP-FIX-V1: additional Master fields
          originCountry: o.master?.originCountry || null,
          tags: o.master?.tags || [],
          categoryId: o.master?.categoryId || null,
          brandId: o.master?.brandId || null,
          primaryImageUrl: imageMap.get(o.masterId) || null,
        };
      });
    } catch (error) {
      logger.error('[NetureOfferService] Error fetching supplier offers:', error);
      throw error;
    }
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
      serviceApprovalStatus?: string;
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
           spo.is_public AS "isPublic",
           spo.is_featured AS "isFeatured",
           spo.distribution_type AS "distributionType",
           spo.allowed_seller_ids AS "allowedSellerIds",
           spo.approval_status AS "approvalStatus",
           spo.price_general AS "priceGeneral",
           spo.price_gold AS "priceGold",
           spo.price_platinum AS "pricePlatinum",
           spo.consumer_reference_price AS "consumerReferencePrice",
           spo.consumer_short_description AS "consumerShortDescription",
           spo.consumer_detail_description AS "consumerDetailDescription",
           spo.business_short_description AS "businessShortDescription",
           spo.business_detail_description AS "businessDetailDescription",
           spo.service_keys AS "serviceKeys",
           spo.stock_quantity AS "stockQuantity",
           spo.created_at AS "createdAt",
           spo.updated_at AS "updatedAt",
           pm.tags,
           pm.name AS "masterName",
           pm.barcode,
           pm.specification,
           pm.origin_country AS "originCountry",
           pm.category_id AS "categoryId",
           pm.brand_id AS "brandId",
           pm.regulatory_type AS "regulatoryType",
           pm.drug_category AS "drugCategory",
           pm.regulatory_name AS "regulatoryName",
           pm.mfds_permit_number AS "mfdsPermitNumber",
           pm.manufacturer_name AS "manufacturerName",
           COALESCE(pm.name, pm.regulatory_name, '') AS name,
           pc.name AS "categoryName",
           COALESCE(b.name, pm.brand_name) AS "brandName",
           pi_img.image_url AS "primaryImageUrl",
           COALESCE(pending.cnt, 0)::int AS "pendingRequestCount",
           COALESCE(active.cnt, 0)::int AS "activeServiceCount",
           svc_appr.approvals AS "serviceApprovals",
           kpa_review.status AS "kpaReviewStatus",
           kpa_review.reason AS "kpaReviewReason",
           ${SupplierOfferReadService.COMPLETENESS_EXPR} AS "completenessScore"
         FROM supplier_product_offers spo
         JOIN product_masters pm ON pm.id = spo.master_id
         LEFT JOIN product_categories pc ON pc.id = pm.category_id
         LEFT JOIN brands b ON b.id = pm.brand_id
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
           SELECT COALESCE(json_agg(json_build_object('serviceKey', osa.service_key, 'status', osa.approval_status, 'reason', osa.reason)), '[]'::json) AS approvals
           FROM offer_service_approvals osa WHERE osa.offer_id = spo.id
         ) svc_appr ON true
         LEFT JOIN LATERAL (
           SELECT pa.approval_status AS status, pa.reason
           FROM product_approvals pa
           WHERE pa.offer_id = spo.id AND pa.service_key = 'kpa-society' AND pa.approval_type = 'service'
           LIMIT 1
         ) kpa_review ON true
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


  // ==================== Approval Tab Counts (WO-O4O-NETURE-PRODUCT-LIFECYCLE-FINALIZATION-V1) ====================

  // WO-NETURE-SUPPLIER-PRODUCTS-TOP-COUNT-UNREQUESTED-TAB-V1:
  // total = unrequested + pending + approved + rejected
  /**
   * 공급자 상품 승인 상태별 카운트.
   *
   * WO-NETURE-SUPPLIER-PRODUCT-LIST-APPROVAL-TAB-LABEL-AND-COUNT-ALIGN-V1:
   * 탭 카운트도 rows 쿼리와 동일한 보조 필터(검색어/이미지/설명/바코드/완성도 등)를
   * 적용하도록 수정. serviceApprovalStatus는 제외 — 5개 탭을 한 쿼리로 모두 계산.
   */
  async getSupplierProductApprovalCounts(
    supplierId: string,
    options: {
      keyword?: string;
      distributionType?: string;
      isActive?: string;
      hasImage?: string;
      hasDescription?: string;
      barcodeSource?: string;
      completenessStatus?: string;
    } = {},
  ) {
    // serviceApprovalStatus는 카운트 계산에 사용하지 않음 (FILTER로 5개 동시 집계)
    const q = this.buildPaginatedWhereClause(supplierId, {
      ...options,
      serviceApprovalStatus: undefined,
    });

    const rows: Array<{ total: number; unrequested: number; pending: number; approved: number; rejected: number }> = await AppDataSource.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE NOT EXISTS (
           SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id
         ))::int AS unrequested,
         COUNT(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM offer_service_approvals osa
           WHERE osa.offer_id = spo.id AND osa.approval_status = 'pending'
         ))::int AS pending,
         COUNT(*) FILTER (WHERE
           NOT EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status != 'approved')
           AND EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id)
         )::int AS approved,
         COUNT(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM offer_service_approvals osa
           WHERE osa.offer_id = spo.id AND osa.approval_status = 'rejected'
         ))::int AS rejected
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       WHERE ${q.where}`,
      q.params,
    );
    return rows[0] || { total: 0, unrequested: 0, pending: 0, approved: 0, rejected: 0 };
  }


  // ==================== Paginated Supplier Products (WO-NETURE-SUPPLIER-EXCEL-LIST-V1) ====================

  // WO-NETURE-COMPLETENESS-V2: 10-item × 10pts inline score (Offer + Master fields)
  private static readonly COMPLETENESS_EXPR = `(
    CASE WHEN spo.price_general IS NOT NULL AND spo.price_general > 0 THEN 10 ELSE 0 END
    + CASE WHEN EXISTS (SELECT 1 FROM product_images WHERE master_id = pm.id AND deleted_at IS NULL) THEN 10 ELSE 0 END
    + CASE WHEN spo.consumer_short_description IS NOT NULL AND spo.consumer_short_description != '' THEN 10 ELSE 0 END
    + CASE WHEN spo.consumer_detail_description IS NOT NULL AND spo.consumer_detail_description != '' THEN 10 ELSE 0 END
    + CASE WHEN spo.distribution_type IS NOT NULL THEN 10 ELSE 0 END
    + CASE WHEN pm.category_id IS NOT NULL THEN 10 ELSE 0 END
    + CASE WHEN pm.brand_id IS NOT NULL THEN 10 ELSE 0 END
    + CASE WHEN jsonb_typeof(pm.tags) = 'array'
        THEN CASE WHEN jsonb_array_length(pm.tags) > 0 THEN 10 ELSE 0 END
        ELSE 0 END
    + CASE WHEN spo.business_short_description IS NOT NULL AND spo.business_short_description != '' THEN 10 ELSE 0 END
    + CASE WHEN spo.business_detail_description IS NOT NULL AND spo.business_detail_description != '' THEN 10 ELSE 0 END
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
    if (completenessScore >= 70) return 'READY';
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
      serviceApprovalStatus?: string;
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
      name: 'pm.name',
      completeness: SupplierOfferReadService.COMPLETENESS_EXPR,
    };
    const sortField = validSortFields[options.sort || ''] || 'spo.created_at';

    // Build WHERE conditions (soft 삭제 제외)
    const conditions: string[] = ['spo.supplier_id = $1', 'spo.deleted_at IS NULL'];
    const params: any[] = [supplierId];
    let idx = 2;

    if (keyword) {
      conditions.push(`(pm.name ILIKE $${idx} OR pm.barcode ILIKE $${idx} OR pm.regulatory_name ILIKE $${idx})`);
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
      conditions.push(`EXISTS (SELECT 1 FROM product_images WHERE master_id = pm.id AND deleted_at IS NULL)`);
    } else if (options.hasImage === 'false') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM product_images WHERE master_id = pm.id AND deleted_at IS NULL)`);
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
      conditions.push(`${SupplierOfferReadService.COMPLETENESS_EXPR} = 0`);
    } else if (options.completenessStatus === 'INCOMPLETE') {
      conditions.push(`${SupplierOfferReadService.COMPLETENESS_EXPR} > 0 AND ${SupplierOfferReadService.COMPLETENESS_EXPR} < 70`);
    } else if (options.completenessStatus === 'READY') {
      conditions.push(`${SupplierOfferReadService.COMPLETENESS_EXPR} >= 70`);
    }

    // WO-NETURE-SUPPLIER-PRODUCTS-TOP-COUNT-UNREQUESTED-TAB-V1: service approval status filter
    if (options.serviceApprovalStatus === 'unrequested') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id)`);
    } else if (options.serviceApprovalStatus === 'pending') {
      conditions.push(`EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status = 'pending')`);
    } else if (options.serviceApprovalStatus === 'approved') {
      conditions.push(`NOT EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status != 'approved')`);
      conditions.push(`EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id)`);
    } else if (options.serviceApprovalStatus === 'rejected') {
      conditions.push(`EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status = 'rejected')`);
    }

    const where = conditions.join(' AND ');

    return { page, limit, offset, sortField, sortOrder, where, params, idx };
  }


  /** Phase 3A: 페이지네이션 쿼리 결과 행 → DTO 매핑 (purpose + completenessStatus 파생) */
  private mapPaginatedRow(r: any) {
    return {
      ...r,
      purpose: SupplierOfferReadService.derivePurpose(r.isActive, r.activeServiceCount),
      completenessStatus: SupplierOfferReadService.deriveCompletenessStatus(r.approvalStatus, r.completenessScore || 0),
    };
  }
}
