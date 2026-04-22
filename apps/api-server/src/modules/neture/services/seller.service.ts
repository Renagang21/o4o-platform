/**
 * SellerService — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted from neture.routes.ts
 *
 * Inline SQL for seller product queries, service-product applications,
 * order detail enrichment, shipment lookup, and order referral attribution.
 */
import type { DataSource } from 'typeorm';

export class SellerService {
  constructor(private dataSource: DataSource) {}

  // ========================================================================
  // 1. Seller Products — WO-S2S-FLOW-RECOVERY-PHASE3-V1 T1
  // ========================================================================

  /**
   * GET /seller/my-products
   * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals 읽기
   */
  async getMyProducts(sellerId: string) {
    const rows = await this.dataSource.query(
      `SELECT pa.id,
              spo.supplier_id AS "supplierId", supplier_org.name AS "supplierName",
              pa.offer_id AS "offerId", pm.name AS "productName",
              pm.brand_name AS "productCategory",
              pa.service_key AS "serviceId",
              pa.decided_at AS "approvedAt"
       FROM product_approvals pa
       JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
       WHERE pa.organization_id = $1
         AND pa.approval_type IN ('private', 'service')
         AND pa.approval_status = 'approved'
       ORDER BY pa.decided_at DESC`,
      [sellerId],
    );
    return rows;
  }

  // ========================================================================
  // 2. Available Supply Products — WO-NETURE-PRODUCT-DISTRIBUTION-POLICY-V1
  // ========================================================================

  /**
   * GET /seller/available-supply-products
   * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals 읽기
   * WO-O4O-STORE-CART-PAGE-V1: 가격/이미지/규격/바코드 포함
   */
  async getAvailableSupplyProducts(sellerId: string) {
    // Step 1: PUBLIC/SERVICE + PRIVATE(본인 배정) 제품 조회 (Tier 1+2+3)
    // WO-O4O-STORE-CART-PAGE-V1: 가격/이미지/규격/바코드 포함
    const products: Array<{
      id: string; name: string; category: string; description: string;
      supplier_id: string; supplier_name: string; distribution_type: string;
      price_general: string; consumer_reference_price: string | null;
      approval_status: string; barcode: string; specification: string | null;
      primary_image_url: string | null;
    }> = await this.dataSource.query(
      `SELECT spo.id, pm.name AS name, pm.brand_name AS category, '' AS description,
              spo.supplier_id, supplier_org.name AS supplier_name,
              spo.distribution_type,
              spo.price_general, spo.consumer_reference_price,
              spo.approval_status,
              pm.barcode, pm.specification,
              pi.image_url AS primary_image_url
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       LEFT JOIN organizations supplier_org ON supplier_org.id = s.organization_id
       LEFT JOIN product_images pi ON pi.master_id = pm.id AND pi.is_primary = true
       WHERE spo.is_active = true
         AND spo.approval_status = 'APPROVED'
         AND s.status = 'ACTIVE'
         AND (spo.distribution_type IN ('PUBLIC', 'SERVICE')
           OR (spo.distribution_type = 'PRIVATE' AND $1 = ANY(spo.allowed_seller_ids)))
       ORDER BY spo.created_at DESC`,
      [sellerId],
    );

    // Step 2: v2 product_approvals에서 seller의 기존 approval 조회 (SERVICE + PRIVATE)
    const approvals: Array<{
      offer_id: string; status: string; approval_id: string; reason: string | null;
    }> = await this.dataSource.query(
      `SELECT pa.offer_id, pa.approval_status AS status, pa.id AS approval_id, pa.reason
       FROM product_approvals pa
       WHERE pa.organization_id = $1 AND pa.approval_type IN ('private', 'service')`,
      [sellerId],
    );

    // Step 3: offerId → approval 상태 매핑
    const approvalMap = new Map<string, { status: string; approvalId: string; reason?: string }>();
    for (const a of approvals) {
      const existing = approvalMap.get(a.offer_id);
      if (!existing || a.status === 'pending' || a.status === 'approved') {
        approvalMap.set(a.offer_id, {
          status: a.status,
          approvalId: a.approval_id,
          reason: a.reason || undefined,
        });
      }
    }

    // Step 4: 머지하여 반환
    // WO-O4O-STORE-CART-PAGE-V1: 가격/이미지/규격/바코드 포함
    const data = products.map((product) => {
      const approval = approvalMap.get(product.id);
      return {
        id: product.id,
        name: product.name,
        category: product.category || '',
        description: product.description || '',
        distributionType: product.distribution_type,
        supplierId: product.supplier_id,
        supplierName: product.supplier_name || '',
        supplyStatus: approval?.status || 'available',
        requestId: approval?.approvalId || null,
        rejectReason: approval?.reason || null,
        priceGeneral: Number(product.price_general) || 0,
        consumerReferencePrice: product.consumer_reference_price ? Number(product.consumer_reference_price) : null,
        approvalStatus: product.approval_status || 'PENDING',
        barcode: product.barcode || '',
        specification: product.specification || null,
        primaryImageUrl: product.primary_image_url || null,
      };
    });

    return data;
  }

  // ========================================================================
  // 3. Service Applications — WO-NETURE-TIER2-SERVICE-USABILITY-BETA-V1
  // ========================================================================

  /**
   * Resolve serviceKey from organization_service_enrollments
   */
  async resolveServiceKey(organizationId: string): Promise<string> {
    const enrollment = await this.dataSource.query(
      `SELECT service_code FROM organization_service_enrollments
       WHERE organization_id = $1 AND status = 'active' LIMIT 1`,
      [organizationId],
    );
    return enrollment[0]?.service_code || 'kpa-society';
  }

  /**
   * GET /seller/service-applications
   * 판매자의 SERVICE 승인 신청 목록 조회
   */
  async getServiceApplications(organizationId: string) {
    const rows = await this.dataSource.query(
      `SELECT pa.id, pa.approval_status AS status,
              pa.offer_id AS "offerId",
              pm.name AS "productName",
              pm.brand_name AS "productCategory",
              supplier_org.name AS "supplierName",
              spo.supplier_id AS "supplierId",
              pa.reason AS "rejectReason",
              pa.requested_by AS "requestedBy",
              pa.decided_by AS "decidedBy",
              pa.decided_at AS "decidedAt",
              pa.created_at AS "requestedAt"
       FROM product_approvals pa
       JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
       WHERE pa.organization_id = $1 AND pa.approval_type = 'service'
       ORDER BY pa.created_at DESC`,
      [organizationId],
    );
    return rows;
  }

  // ========================================================================
  // 4. Order Detail Enrichment — WO-O4O-STORE-ORDER-DETAIL-PAGE-V1
  // ========================================================================

  /**
   * Enrich order items with supplier + product master info
   * WO-O4O-STORE-ORDER-DETAIL-PAGE-V1: 공급자 + 상품 마스터 정보 보강
   */
  async enrichOrderItems(items: any[]) {
    const productIds = items.map((i: any) => i.product_id);
    const enrichments: Array<{
      offer_id: string; supplier_id: string; supplier_name: string;
      supplier_phone: string | null; supplier_website: string | null;
      brand_name: string | null; specification: string | null; barcode: string;
      primary_image_url: string | null;
    }> = await this.dataSource.query(
      `SELECT spo.id AS offer_id,
              s.id AS supplier_id, supplier_org.name AS supplier_name,
              s.contact_phone AS supplier_phone, s.contact_website AS supplier_website,
              pm.brand_name, pm.specification, pm.barcode,
              pi.image_url AS primary_image_url
       FROM supplier_product_offers spo
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       LEFT JOIN organizations supplier_org ON supplier_org.id = s.organization_id
       JOIN product_masters pm ON pm.id = spo.master_id
       LEFT JOIN product_images pi ON pi.master_id = pm.id AND pi.is_primary = true
       WHERE spo.id = ANY($1::uuid[])`,
      [productIds],
    );

    const enrichMap = new Map(enrichments.map((e) => [e.offer_id, e]));

    return items.map((item: any) => {
      const e = enrichMap.get(item.product_id);
      return {
        ...item,
        supplier_id: e?.supplier_id || null,
        supplier_name: e?.supplier_name || null,
        supplier_phone: e?.supplier_phone || null,
        supplier_website: e?.supplier_website || null,
        brand_name: e?.brand_name || null,
        specification: e?.specification || null,
        barcode: e?.barcode || null,
        primary_image_url: e?.primary_image_url || item.product_image || null,
      };
    });
  }

  // ========================================================================
  // 5. Shipment Lookup — WO-O4O-SHIPMENT-ENGINE-V1
  // ========================================================================

  /**
   * GET /seller/orders/:orderId/shipment
   * 매장(Store) 배송 조회
   */
  async getShipmentByOrderId(orderId: string) {
    const rows = await this.dataSource.query(
      `SELECT * FROM neture_shipments WHERE order_id = $1 LIMIT 1`,
      [orderId],
    );
    return rows[0] || null;
  }

  // ========================================================================
  // 6. Order Referral Attribution — WO-O4O-PARTNER-HUB-CORE-V1
  // ========================================================================

  /**
   * POST-CREATION: Referral Attribution + Commission Snapshot
   * WO-O4O-PARTNER-HUB-CORE-V1
   */
  async processReferralAttribution(
    orderId: string,
    orderNumber: string,
    referralToken: string,
  ): Promise<void> {
    const [referral] = await this.dataSource.query(
      `SELECT partner_id, product_id, store_id FROM partner_referrals WHERE referral_token = $1`,
      [referralToken],
    );

    if (!referral) return;

    // Store attribution in order metadata
    await this.dataSource.query(
      `UPDATE neture_orders SET metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb WHERE id = $2`,
      [JSON.stringify({ partner_id: referral.partner_id, referral_token: referralToken }), orderId],
    );

    // Find matching order item for referred product
    const [orderItem] = await this.dataSource.query(
      `SELECT quantity, total_price FROM neture_order_items WHERE order_id = $1 AND product_id = $2::text`,
      [orderId, referral.product_id],
    );

    if (!orderItem) return;

    // Get active commission policy
    const [policy] = await this.dataSource.query(
      `SELECT commission_per_unit FROM supplier_partner_commissions
       WHERE supplier_product_id = $1
         AND start_date <= CURRENT_DATE
         AND (end_date IS NULL OR end_date >= CURRENT_DATE)
       ORDER BY start_date DESC LIMIT 1`,
      [referral.product_id],
    );

    if (!policy) return;

    const qty = Number(orderItem.quantity);
    const commissionAmount = qty * Number(policy.commission_per_unit);
    const [offer] = await this.dataSource.query(
      `SELECT supplier_id FROM supplier_product_offers WHERE id = $1`,
      [referral.product_id],
    );

    await this.dataSource.query(
      `INSERT INTO partner_commissions
        (partner_id, supplier_id, order_id, order_number, product_id, store_id,
         quantity, commission_per_unit, commission_amount, referral_token,
         order_amount, commission_rate, contract_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, $2, 'pending')
       ON CONFLICT DO NOTHING`,
      [
        referral.partner_id, offer?.supplier_id || referral.partner_id,
        orderId, orderNumber,
        referral.product_id, referral.store_id,
        qty, policy.commission_per_unit, commissionAmount, referralToken,
        Number(orderItem.total_price),
      ],
    );
  }
}
