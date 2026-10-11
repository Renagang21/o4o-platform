import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { NetureSupplier, SupplierProductOffer, OfferDistributionType, SupplierStatus } from '../entities/index.js';
import logger from '../../../utils/logger.js';

/** Existing offer queries; write workflows remain in NetureOfferService. */
export class OperatorOfferReadService {
  private _offerRepo?: Repository<SupplierProductOffer>;
  private get offerRepo(): Repository<SupplierProductOffer> {
    return this._offerRepo ??= AppDataSource.getRepository(SupplierProductOffer);
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
      // 이미지 조회 (masterId → primaryImageUrl)
      const masterIds = [...new Set(activeOffers.map((o) => o.masterId).filter(Boolean))];
      const imageMap = new Map<string, string>();
      if (masterIds.length > 0) {
        const images: Array<{ master_id: string; image_url: string }> = await AppDataSource.query(
          `SELECT master_id, image_url FROM product_images WHERE master_id = ANY($1) AND is_primary = true`,
          [masterIds],
        );
        for (const img of images) imageMap.set(img.master_id, img.image_url);
      }

      // 카테고리 조회
      const categoryIds = [...new Set(activeOffers.map((o) => o.master?.categoryId).filter(Boolean))];
      const categoryMap = new Map<string, string>();
      if (categoryIds.length > 0) {
        const cats: Array<{ id: string; name: string }> = await AppDataSource.query(
          `SELECT id, name FROM product_categories WHERE id = ANY($1)`,
          [categoryIds],
        );
        for (const c of cats) categoryMap.set(c.id, c.name);
      }

      const orgNameMap = await this.getOrgNameMap(activeOffers.map((o) => o.supplier).filter(Boolean));
      return activeOffers.map((o) => {
        const key = `${o.supplierId}:${o.id}`;
        const request = requestMap.get(key);
        return {
          id: o.id,
          masterId: o.masterId,
          name: o.master?.name || o.master?.regulatoryName || '',
          distributionType: o.distributionType,
          supplierId: o.supplierId,
          supplierName: (o.supplier?.organizationId ? orgNameMap.get(o.supplier.organizationId) : '') || '',
          supplyStatus: request?.status || 'available',
          requestId: request?.requestId || null,
          rejectReason: request?.rejectReason || null,
          priceGeneral: o.priceGeneral ?? null,
          consumerReferencePrice: o.consumerReferencePrice ?? null,
          approvalStatus: o.approvalStatus || null,
          barcode: o.master?.barcode || null,
          specification: o.master?.specification || null,
          category: o.master?.categoryId ? categoryMap.get(o.master.categoryId) || null : null,
          primaryImageUrl: imageMap.get(o.masterId) || null,
        };
      });
    } catch (error) {
      logger.error('[NetureOfferService] Error fetching operator supply products:', error);
      throw error;
    }
  }


  // ==================== Operator All-Offers View ====================

  /**
   * WO-NETURE-OPERATOR-ALL-OFFERS-VIEW-FOUNDATION-V1
   * 전체 등록 상품 조회 (isActive/distributionType 필터 없음)
   * 운영자가 플랫폼에 등록된 모든 offer를 모니터링하기 위한 용도
   */
  async getAllRegisteredOffers(options: {
    page?: number;
    limit?: number;
    keyword?: string;
    distributionType?: string;
    isActive?: string;
    approvalStatus?: string;
    category?: string;
    regulatoryType?: string;
    sort?: string;
    order?: string;
  } = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));
    const offset = (page - 1) * limit;
    const sortOrder = options.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const validSortFields: Record<string, string> = {
      createdAt: 'spo.created_at',
      priceGeneral: 'spo.price_general',
      name: 'pm.name',
    };
    const sortField = validSortFields[options.sort || ''] || 'spo.created_at';

    // WHERE 조건 (deleted_at IS NULL 만 기본)
    const conditions: string[] = ['spo.deleted_at IS NULL'];
    const params: any[] = [];
    let idx = 1;

    if (options.keyword?.trim()) {
      conditions.push(`(pm.name ILIKE $${idx} OR pm.barcode ILIKE $${idx} OR pm.regulatory_name ILIKE $${idx} OR o.name ILIKE $${idx})`);
      params.push(`%${options.keyword.trim()}%`);
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
    // WO-NETURE-APPROVAL-REQUEST-TRUTH-ALIGNMENT-V1:
    // 승인 상태 필터도 SSOT(offer_service_approvals) 기준으로 통일.
    // 기존 spo.approval_status는 submit 경로가 갱신하지 않아 실제 상태와 다를 수 있음.
    if (options.approvalStatus === 'PENDING') {
      conditions.push(
        `EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status = 'pending')`,
      );
    } else if (options.approvalStatus === 'APPROVED') {
      conditions.push(
        `EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id)
         AND NOT EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status != 'approved')`,
      );
    } else if (options.approvalStatus === 'REJECTED') {
      conditions.push(
        `EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status = 'rejected')
         AND NOT EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id AND osa.approval_status = 'pending')`,
      );
    }
    if (options.category?.trim()) {
      conditions.push(`pc.name ILIKE $${idx}`);
      params.push(`%${options.category.trim()}%`);
      idx++;
    }
    if (options.regulatoryType) {
      conditions.push(`pm.regulatory_type = $${idx}`);
      params.push(options.regulatoryType);
      idx++;
    }

    const where = conditions.join(' AND ');

    const [countResult, rows, kpiResult] = await Promise.all([
      AppDataSource.query(
        `SELECT COUNT(*)::int AS total
         FROM supplier_product_offers spo
         JOIN product_masters pm ON pm.id = spo.master_id
         LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
         LEFT JOIN organizations o ON o.id = ns.organization_id
         LEFT JOIN product_categories pc ON pc.id = pm.category_id
         WHERE ${where}`,
        params,
      ),
      AppDataSource.query(
        `SELECT
           spo.id, spo.master_id AS "masterId",
           spo.is_active AS "isActive",
           spo.distribution_type AS "distributionType",
           spo.approval_status AS "approvalStatus",
           spo.price_general AS "priceGeneral",
           spo.consumer_reference_price AS "consumerReferencePrice",
           spo.supplier_id AS "supplierId",
           spo.created_at AS "createdAt",
           spo.consumer_short_description AS "consumerShortDescription",
           spo.consumer_detail_description AS "consumerDetailDescription",
           spo.business_short_description AS "businessShortDescription",
           spo.business_detail_description AS "businessDetailDescription",
           pm.tags,
           COALESCE(pm.name, pm.regulatory_name, '') AS name,
           pm.barcode,
           pm.specification,
           pm.category_id AS "categoryId",
           pc.name AS "categoryName",
           pm.regulatory_type AS "regulatoryType",
           pm.drug_category AS "drugCategory",
           COALESCE(b.name, pm.brand_name) AS "brandName",
           o.name AS "supplierName",
           ns.status AS "supplierStatus",
           pi_img.image_url AS "primaryImageUrl",
           svc_appr.approvals AS "serviceApprovals"
         FROM supplier_product_offers spo
         JOIN product_masters pm ON pm.id = spo.master_id
         LEFT JOIN neture_suppliers ns ON ns.id = spo.supplier_id
         LEFT JOIN organizations o ON o.id = ns.organization_id
         LEFT JOIN product_categories pc ON pc.id = pm.category_id
         LEFT JOIN brands b ON b.id = pm.brand_id
         LEFT JOIN LATERAL (
           SELECT image_url FROM product_images
           WHERE master_id = pm.id AND is_primary = true LIMIT 1
         ) pi_img ON true
         LEFT JOIN LATERAL (
           SELECT COALESCE(json_agg(json_build_object('id', osa.id, 'serviceKey', osa.service_key, 'status', osa.approval_status)), '[]'::json) AS approvals
           FROM offer_service_approvals osa WHERE osa.offer_id = spo.id
         ) svc_appr ON true
         WHERE ${where}
         ORDER BY ${sortField} ${sortOrder}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset],
      ),
      // KPI 집계 (필터 무관 전체 대상)
      // WO-NETURE-APPROVAL-REQUEST-TRUTH-ALIGNMENT-V1:
      // 승인 KPI는 SSOT인 offer_service_approvals 테이블을 기준으로 집계해야 한다.
      // 기존 spo.approval_status는 파생 필드이며 submit 경로가 갱신하지 않아 stale 상태.
      // 정의:
      //   approvalPending  = 서비스 승인 레코드 중 하나라도 pending 인 offer 수
      //   approvalApproved = offer의 모든 서비스 승인 레코드가 approved (1건 이상 존재)인 offer 수
      //   approvalRejected = 서비스 승인 레코드 중 하나라도 rejected 이면서 pending 은 없는 offer 수
      //   approvalNone     = offer_service_approvals 레코드가 하나도 없는 offer 수 (참고 — 현재 KPI 카드에는 미노출)
      AppDataSource.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE spo.is_active = true)::int AS active,
           COUNT(*) FILTER (WHERE spo.is_active = false)::int AS inactive,
           COUNT(*) FILTER (WHERE spo.distribution_type = 'PUBLIC')::int AS "distPublic",
           COUNT(*) FILTER (WHERE spo.distribution_type = 'SERVICE')::int AS "distService",
           COUNT(*) FILTER (WHERE spo.distribution_type = 'PRIVATE')::int AS "distPrivate",
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM offer_service_approvals osa
             WHERE osa.offer_id = spo.id AND osa.approval_status = 'pending'
           ))::int AS "approvalPending",
           COUNT(*) FILTER (WHERE
             EXISTS (SELECT 1 FROM offer_service_approvals osa WHERE osa.offer_id = spo.id)
             AND NOT EXISTS (
               SELECT 1 FROM offer_service_approvals osa
               WHERE osa.offer_id = spo.id AND osa.approval_status != 'approved'
             )
           )::int AS "approvalApproved",
           COUNT(*) FILTER (WHERE
             EXISTS (
               SELECT 1 FROM offer_service_approvals osa
               WHERE osa.offer_id = spo.id AND osa.approval_status = 'rejected'
             )
             AND NOT EXISTS (
               SELECT 1 FROM offer_service_approvals osa
               WHERE osa.offer_id = spo.id AND osa.approval_status = 'pending'
             )
           )::int AS "approvalRejected"
         FROM supplier_product_offers spo
         WHERE spo.deleted_at IS NULL`,
      ),
    ]);

    const total = countResult[0]?.total || 0;
    const kpi = kpiResult[0] || {};

    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      kpi: {
        total: kpi.total || 0,
        active: kpi.active || 0,
        inactive: kpi.inactive || 0,
        distPublic: kpi.distPublic || 0,
        distService: kpi.distService || 0,
        distPrivate: kpi.distPrivate || 0,
        approvalPending: kpi.approvalPending || 0,
        approvalApproved: kpi.approvalApproved || 0,
        approvalRejected: kpi.approvalRejected || 0,
      },
    };
  }


  // WO-O4O-NETURE-SUPPLIER-DEPRECATION-V1 Phase 5-C: batch org name lookup
  private async getOrgNameMap(suppliers: NetureSupplier[]): Promise<Map<string, string>> {
    const orgIds = suppliers.map((s) => s.organizationId).filter(Boolean) as string[];
    const map = new Map<string, string>();
    if (orgIds.length === 0) return map;
    try {
      const rows: Array<{ id: string; name: string }> = await AppDataSource.query(
        `SELECT id, name FROM organizations WHERE id = ANY($1)`,
        [orgIds],
      );
      for (const r of rows) map.set(r.id, r.name);
    } catch { /* non-fatal */ }
    return map;
  }
}
