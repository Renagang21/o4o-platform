/**
 * Pharmacy Products Controller
 *
 * WO-PHARMACY-PRODUCT-LISTING-APPROVAL-PHASE1-V1
 * WO-O4O-API-PHARMACY-B2B-CATALOG-V1: GET /catalog 추가, POST /apply supplyProductId 확장
 *
 * GET  /catalog             — 플랫폼 B2B 상품 카탈로그 (공용공간용)
 * POST /apply              — 상품 판매 신청
 * GET  /applications       — 내 신청 목록
 * GET  /approved           — 승인된 상품 목록
 * GET  /listings           — 내 매장 진열 상품
 * PUT  /listings/:id       — 진열 상품 수정 (가격/순서/활성)
 *
 * 인증: requireAuth + pharmacy_owner 체크
 * 조직: getUserOrganizationId()로 자동 결정
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationProductApplication } from '../entities/organization-product-application.entity.js';
import { OrganizationProductListing } from '../entities/organization-product-listing.entity.js';
import { OrganizationProductChannel } from '../entities/organization-product-channel.entity.js';
import { KpaMember } from '../entities/kpa-member.entity.js';
import { KpaAuditLog } from '../entities/kpa-audit-log.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
import { ApiError } from '../../../utils/api-error.js';

type AuthMiddleware = RequestHandler;

const VALID_SERVICE_KEYS = Object.values(SERVICE_KEYS) as string[];

function resolveServiceKeyFromQuery(query: any): string {
  const requested = query?.service_key;
  if (!requested) return SERVICE_KEYS.KPA;
  if (VALID_SERVICE_KEYS.includes(requested)) return requested;
  throw new ApiError(400, `Invalid service_key: ${requested}`, 'INVALID_SERVICE_KEY');
}

function resolveServiceKeyFromBody(body: any): string {
  const requested = body?.service_key;
  if (!requested) return SERVICE_KEYS.KPA;
  if (VALID_SERVICE_KEYS.includes(requested)) return requested;
  throw new ApiError(400, `Invalid service_key: ${requested}`, 'INVALID_SERVICE_KEY');
}

/**
 * Get user's organization ID from KPA membership
 */
async function getUserOrganizationId(
  dataSource: DataSource,
  userId: string
): Promise<string | null> {
  const memberRepo = dataSource.getRepository(KpaMember);
  const member = await memberRepo.findOne({
    where: { user_id: userId },
  });
  return member?.organization_id || null;
}

/**
 * Verify pharmacy_owner role
 */
function getPharmacistRole(user: any): string | null {
  return user?.pharmacistRole || user?.pharmacist_role || null;
}

export function createPharmacyProductsController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();
  const appRepo = dataSource.getRepository(OrganizationProductApplication);
  const listingRepo = dataSource.getRepository(OrganizationProductListing);
  const auditRepo = dataSource.getRepository(KpaAuditLog);

  /**
   * Middleware: pharmacy_owner 체크 + organization_id 주입
   */
  const requirePharmacyOwner = asyncHandler(async (req: Request, res: Response, next: any) => {
    const user = (req as any).user;
    if (!user?.id) {
      res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    const pharmacistRole = getPharmacistRole(user);
    if (pharmacistRole !== 'pharmacy_owner') {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'pharmacy_owner role required' } });
      return;
    }

    const organizationId = await getUserOrganizationId(dataSource, user.id);
    if (!organizationId) {
      res.status(404).json({ success: false, error: { code: 'NO_ORGANIZATION', message: 'No organization membership found' } });
      return;
    }

    (req as any).organizationId = organizationId;
    next();
  });

  // ─── GET /catalog — 플랫폼 B2B 상품 카탈로그 ─────────────────────
  // WO-O4O-API-PHARMACY-B2B-CATALOG-V1
  // neture_supplier_products (PUBLIC + active) + 내 신청/진열 상태 조인
  router.get('/catalog', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const category = req.query.category as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    let categoryFilter = '';
    const params: any[] = [organizationId, limit, offset];

    if (category) {
      categoryFilter = `AND sp.category = $4`;
      params.push(category);
    }

    const rows = await dataSource.query(
      `SELECT
         sp.id AS "id",
         sp.name AS "name",
         sp.category AS "category",
         sp.description AS "description",
         sp.purpose AS "purpose",
         sp.distribution_type AS "distributionType",
         sp.created_at AS "createdAt",
         sp.updated_at AS "updatedAt",
         s.id AS "supplierId",
         s.name AS "supplierName",
         s.logo_url AS "supplierLogoUrl",
         s.category AS "supplierCategory",
         -- 내 신청/진열 상태
         (EXISTS(
           SELECT 1 FROM organization_product_applications opa
           WHERE opa.organization_id = $1
             AND opa.external_product_id = sp.id::text
             AND opa.status IN ('pending','approved')
         )) AS "isApplied",
         (EXISTS(
           SELECT 1 FROM organization_product_applications opa
           WHERE opa.organization_id = $1
             AND opa.external_product_id = sp.id::text
             AND opa.status = 'approved'
         )) AS "isApproved",
         (EXISTS(
           SELECT 1 FROM organization_product_listings opl
           WHERE opl.organization_id = $1
             AND opl.external_product_id = sp.id::text
         )) AS "isListed"
       FROM neture_supplier_products sp
       JOIN neture_suppliers s ON s.id = sp.supplier_id
       WHERE sp.distribution_type = 'PUBLIC'
         AND sp.is_active = true
         AND s.status = 'ACTIVE'
         ${categoryFilter}
       ORDER BY sp.updated_at DESC
       LIMIT $2 OFFSET $3`,
      params,
    );

    // Total count (for pagination)
    const countParams: any[] = [];
    let countCategoryFilter = '';
    if (category) {
      countCategoryFilter = `AND sp.category = $1`;
      countParams.push(category);
    }

    const countResult = await dataSource.query(
      `SELECT COUNT(*)::int AS total
       FROM neture_supplier_products sp
       JOIN neture_suppliers s ON s.id = sp.supplier_id
       WHERE sp.distribution_type = 'PUBLIC'
         AND sp.is_active = true
         AND s.status = 'ACTIVE'
         ${countCategoryFilter}`,
      countParams,
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: countResult[0]?.total || 0,
        limit,
        offset,
      },
    });
  }));

  // ─── POST /apply — 상품 판매 신청 ─────────────────────────────────
  // WO-O4O-API-PHARMACY-B2B-CATALOG-V1: supplyProductId 지원 확장
  router.post('/apply', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const organizationId = (req as any).organizationId;
    let { externalProductId, productName, productMetadata } = req.body;
    const { supplyProductId } = req.body;

    // WO-O4O-API-PHARMACY-B2B-CATALOG-V1: supplyProductId로 카탈로그 기반 신청
    if (supplyProductId && !externalProductId) {
      const catalogProduct = await dataSource.query(
        `SELECT sp.id, sp.name, sp.category, sp.description, sp.distribution_type,
                s.id AS supplier_id, s.name AS supplier_name
         FROM neture_supplier_products sp
         JOIN neture_suppliers s ON s.id = sp.supplier_id
         WHERE sp.id = $1 AND sp.is_active = true AND sp.distribution_type = 'PUBLIC' AND s.status = 'ACTIVE'`,
        [supplyProductId],
      );

      if (!catalogProduct || catalogProduct.length === 0) {
        res.status(400).json({
          success: false,
          error: { code: 'CATALOG_PRODUCT_NOT_FOUND', message: 'Supply product not found or not available' },
        });
        return;
      }

      const cp = catalogProduct[0];
      externalProductId = cp.id;
      productName = cp.name;
      productMetadata = {
        ...productMetadata,
        supplyProductId: cp.id,
        supplierName: cp.supplier_name,
        supplierId: cp.supplier_id,
        category: cp.category,
      };
    }

    if (!externalProductId || !productName) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'externalProductId and productName are required (or provide supplyProductId)' },
      });
      return;
    }

    const serviceKey = resolveServiceKeyFromBody(req.body);

    // 중복 체크: 동일 조직 + 동일 상품 pending/approved 신청 존재 여부
    const existing = await appRepo.findOne({
      where: {
        organization_id: organizationId,
        external_product_id: externalProductId,
        service_key: serviceKey,
      },
    });

    if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_APPLICATION',
          message: existing.status === 'pending'
            ? 'Application already pending for this product'
            : 'Product already approved',
        },
      });
      return;
    }

    // 기존 rejected 신청이 있으면 업데이트 (재신청)
    if (existing && existing.status === 'rejected') {
      existing.status = 'pending';
      existing.product_name = productName;
      existing.product_metadata = productMetadata || {};
      existing.reject_reason = null;
      existing.requested_by = user.id;
      existing.requested_at = new Date();
      existing.reviewed_by = null;
      existing.reviewed_at = null;
      const updated = await appRepo.save(existing);

      // Audit log
      try {
        const log = auditRepo.create({
          operator_id: user.id,
          operator_role: (user.roles || []).find((r: string) => r.startsWith('kpa:')) || 'pharmacy_owner',
          action_type: 'CONTENT_CREATED' as any,
          target_type: 'application' as any,
          target_id: updated.id,
          metadata: { action: 'product_reapply', externalProductId, productName },
        });
        await auditRepo.save(log);
      } catch (e) {
        console.error('[KPA AuditLog] Failed to write product apply audit:', e);
      }

      res.status(201).json({ success: true, data: updated });
      return;
    }

    // 신규 신청
    const application = appRepo.create({
      organization_id: organizationId,
      service_key: serviceKey,
      external_product_id: externalProductId,
      product_name: productName,
      product_metadata: productMetadata || {},
      status: 'pending',
      requested_by: user.id,
      requested_at: new Date(),
    });

    const saved = await appRepo.save(application);

    // Audit log
    try {
      const log = auditRepo.create({
        operator_id: user.id,
        operator_role: (user.roles || []).find((r: string) => r.startsWith('kpa:')) || 'pharmacy_owner',
        action_type: 'CONTENT_CREATED' as any,
        target_type: 'application' as any,
        target_id: saved.id,
        metadata: { action: 'product_apply', externalProductId, productName },
      });
      await auditRepo.save(log);
    } catch (e) {
      console.error('[KPA AuditLog] Failed to write product apply audit:', e);
    }

    res.status(201).json({ success: true, data: saved });
  }));

  // ─── GET /applications — 내 신청 목록 ──────────────────────────────
  router.get('/applications', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const serviceKey = resolveServiceKeyFromQuery(req.query);
    const qb = appRepo.createQueryBuilder('app')
      .where('app.organization_id = :organizationId', { organizationId })
      .andWhere('app.service_key = :serviceKey', { serviceKey });

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      qb.andWhere('app.status = :status', { status });
    }

    qb.orderBy('app.requested_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    res.json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }));

  // ─── GET /approved — 승인된 상품 목록 (진열 가능 상품) ────────────
  router.get('/approved', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const serviceKey = resolveServiceKeyFromQuery(req.query);

    const approved = await appRepo.find({
      where: {
        organization_id: organizationId,
        service_key: serviceKey,
        status: 'approved' as any,
      },
      order: { requested_at: 'DESC' },
    });

    res.json({ success: true, data: approved });
  }));

  // ─── GET /listings — 내 매장 진열 상품 ─────────────────────────────
  // WO-O4O-STORE-DOMAIN-TABS-OPERATIONAL-READINESS-V1:
  // service_key 미전달 시 전체 도메인 반환 (all 탭 지원)
  router.get('/listings', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const requestedKey = req.query.service_key as string | undefined;

    if (requestedKey && !VALID_SERVICE_KEYS.includes(requestedKey)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SERVICE_KEY', message: `Invalid service_key: ${requestedKey}` },
      });
    }

    const where: Record<string, string> = { organization_id: organizationId };
    if (requestedKey) {
      where.service_key = requestedKey;
    }

    const listings = await listingRepo.find({
      where,
      order: { display_order: 'ASC', created_at: 'DESC' },
    });

    res.json({ success: true, data: listings });
  }));

  // ─── PUT /listings/:id — 진열 상품 수정 ────────────────────────────
  router.put('/listings/:id', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    const serviceKey = resolveServiceKeyFromBody(req.body);
    const listing = await listingRepo.findOne({
      where: { id, organization_id: organizationId, service_key: serviceKey },
    });

    if (!listing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Listing not found' },
      });
      return;
    }

    const { retailPrice, isActive, displayOrder } = req.body;

    if (retailPrice !== undefined) listing.retail_price = retailPrice;
    if (isActive !== undefined) listing.is_active = isActive;
    if (displayOrder !== undefined) listing.display_order = displayOrder;

    const updated = await listingRepo.save(listing);

    // Audit log
    try {
      const log = auditRepo.create({
        operator_id: user.id,
        operator_role: (user.roles || []).find((r: string) => r.startsWith('kpa:')) || 'pharmacy_owner',
        action_type: 'CONTENT_UPDATED' as any,
        target_type: 'content' as any,
        target_id: updated.id,
        metadata: { action: 'listing_updated', changes: { retailPrice, isActive, displayOrder } },
      });
      await auditRepo.save(log);
    } catch (e) {
      console.error('[KPA AuditLog] Failed to write listing update audit:', e);
    }

    res.json({ success: true, data: updated });
  }));

  // ─── GET /listings/:id/channels — 상품의 채널별 설정 조회 ──────────
  router.get('/listings/:id/channels', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const { id } = req.params;

    // Verify listing belongs to this organization
    const serviceKey = resolveServiceKeyFromQuery(req.query);
    const listing = await listingRepo.findOne({
      where: { id, organization_id: organizationId, service_key: serviceKey },
    });
    if (!listing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Listing not found' },
      });
      return;
    }

    // Fetch all channels for this organization with product channel mapping
    const channels = await dataSource.query(
      `SELECT
         oc.id AS "channelId",
         oc.channel_type AS "channelType",
         oc.status,
         opc.id AS "productChannelId",
         COALESCE(opc.is_active, false) AS "isVisible",
         opc.sales_limit AS "salesLimit",
         opc.display_order AS "displayOrder"
       FROM organization_channels oc
       LEFT JOIN organization_product_channels opc
         ON opc.channel_id = oc.id AND opc.product_listing_id = $1
       WHERE oc.organization_id = $2
       ORDER BY oc.created_at ASC`,
      [id, organizationId]
    );

    res.json({ success: true, data: channels });
  }));

  // ─── PUT /listings/:id/channels — 상품의 채널별 설정 저장 ──────────
  router.put('/listings/:id/channels', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const organizationId = (req as any).organizationId;
    const { id } = req.params;
    const channelSettings: Array<{
      channelId: string;
      isVisible: boolean;
      salesLimit?: number | null;
      displayOrder?: number;
    }> = req.body.channels;

    if (!Array.isArray(channelSettings)) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'channels array is required' },
      });
      return;
    }

    // Verify listing
    const serviceKey = resolveServiceKeyFromBody(req.body);
    const listing = await listingRepo.findOne({
      where: { id, organization_id: organizationId, service_key: serviceKey },
    });
    if (!listing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Listing not found' },
      });
      return;
    }

    const pcRepo = dataSource.getRepository(OrganizationProductChannel);

    for (const setting of channelSettings) {
      // Validate sales_limit: reject 0
      if (setting.salesLimit !== undefined && setting.salesLimit !== null && setting.salesLimit <= 0) {
        res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'salesLimit must be greater than 0 or null' },
        });
        return;
      }

      // Find existing mapping
      let pc = await pcRepo.findOne({
        where: { channel_id: setting.channelId, product_listing_id: id },
      });

      if (pc) {
        // Update existing
        pc.is_active = setting.isVisible;
        if (setting.salesLimit !== undefined) pc.sales_limit = setting.salesLimit;
        if (setting.displayOrder !== undefined) pc.display_order = setting.displayOrder;
        await pcRepo.save(pc);
      } else if (setting.isVisible) {
        // Create new mapping only if making visible
        pc = pcRepo.create({
          channel_id: setting.channelId,
          product_listing_id: id,
          is_active: true,
          sales_limit: setting.salesLimit ?? null,
          display_order: setting.displayOrder ?? 0,
        });
        await pcRepo.save(pc);
      }
    }

    // Audit log
    try {
      const log = auditRepo.create({
        operator_id: user.id,
        operator_role: (user.roles || []).find((r: string) => r.startsWith('kpa:')) || 'pharmacy_owner',
        action_type: 'CONTENT_UPDATED' as any,
        target_type: 'content' as any,
        target_id: id,
        metadata: { action: 'channel_settings_updated', channelCount: channelSettings.length },
      });
      await auditRepo.save(log);
    } catch (e) {
      console.error('[KPA AuditLog] Failed to write channel settings audit:', e);
    }

    res.json({ success: true, data: { updated: channelSettings.length } });
  }));

  return router;
}
