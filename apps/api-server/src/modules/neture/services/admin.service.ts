/**
 * AdminService — WO-O4O-ROUTES-REFACTOR-V1
 * Extracted inline SQL from neture.routes.ts admin endpoints.
 *
 * Only contains methods that previously used raw AppDataSource.query()
 * in the route handlers. Endpoints that delegate to NetureService or
 * ProductApprovalV2Service remain as service calls in the controller.
 */
import type { DataSource } from 'typeorm';

export class AdminService {
  constructor(private dataSource: DataSource) {}

  /**
   * GET /admin/requests
   * WO-PRODUCT-POLICY-V2-SUPPLIER-REQUEST-DEPRECATION-V1: v2 product_approvals 읽기
   */
  async listAdminRequests(filters: {
    status?: string;
    supplierId?: string;
    serviceId?: string;
  }) {
    const params: unknown[] = [];
    const conditions: string[] = [`pa.approval_type = 'private'`];

    if (filters.status && typeof filters.status === 'string') {
      params.push(filters.status);
      conditions.push(`pa.approval_status = $${params.length}`);
    }
    if (filters.supplierId && typeof filters.supplierId === 'string') {
      params.push(filters.supplierId);
      conditions.push(`spo.supplier_id = $${params.length}`);
    }
    if (filters.serviceId && typeof filters.serviceId === 'string') {
      params.push(filters.serviceId);
      conditions.push(`pa.service_key = $${params.length}`);
    }

    const rows = await this.dataSource.query(
      `SELECT pa.id, pa.approval_status AS status,
              spo.supplier_id AS "supplierId", supplier_org.name AS "supplierName",
              pa.organization_id AS "sellerId",
              pa.service_key AS "serviceId",
              pm.marketing_name AS "productName", pa.offer_id AS "offerId",
              pa.created_at AS "requestedAt"
       FROM product_approvals pa
       JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers ns ON ns.id = spo.supplier_id
       LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY pa.created_at DESC`,
      params,
    );

    return rows;
  }

  /**
   * GET /admin/service-approvals
   * SERVICE 승인 요청 목록 조회
   * WO-O4O-ADMIN-UI-COMPLETION-V1
   */
  async listServiceApprovals(filters: { status?: string }) {
    const params: any[] = [];
    let whereClause = `WHERE pa.approval_type = 'service'`;
    if (filters.status && typeof filters.status === 'string') {
      params.push(filters.status);
      whereClause += ` AND pa.approval_status = $${params.length}`;
    }
    const rows = await this.dataSource.query(`
      SELECT pa.id, pa.approval_status AS status,
        pm.marketing_name AS "productName",
        supplier_org.name AS "supplierName",
        o.name AS "sellerOrg",
        pa.service_key AS "serviceId",
        pa.reason AS "rejectReason",
        pa.created_at AS "requestedAt",
        pa.decided_at AS "decidedAt"
      FROM product_approvals pa
      JOIN supplier_product_offers spo ON spo.id = pa.offer_id
      JOIN product_masters pm ON pm.id = spo.master_id
      JOIN neture_suppliers ns ON ns.id = spo.supplier_id
      LEFT JOIN organizations supplier_org ON supplier_org.id = ns.organization_id
      LEFT JOIN organizations o ON o.id = pa.organization_id
      ${whereClause}
      ORDER BY pa.created_at DESC
    `, params);
    return rows;
  }
}
