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
 * 인증: requireAuth + store owner 체크 (WO-ROLE-NORMALIZATION-PHASE3-A-V1)
 * 조직: organization_members 기반 자동 결정
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationProductListing } from '../entities/organization-product-listing.entity.js';
import { OrganizationProductChannel } from '../entities/organization-product-channel.entity.js';
import { KpaAuditLog } from '../entities/kpa-audit-log.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
import { ApiError } from '../../../utils/api-error.js';
import { createRequireStoreOwner } from '../../../utils/store-owner.utils.js';

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

export function createPharmacyProductsController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();
  const listingRepo = dataSource.getRepository(OrganizationProductListing);
  const auditRepo = dataSource.getRepository(KpaAuditLog);

  // WO-ROLE-NORMALIZATION-PHASE3-A-V1: organization_members 기반 middleware
  const requirePharmacyOwner = createRequireStoreOwner(dataSource);

  // ─── GET /catalog — 플랫폼 B2B 상품 카탈로그 ─────────────────────
  // WO-O4O-API-PHARMACY-B2B-CATALOG-V1
  // supplier_product_offers (PUBLIC + active) + 내 신청/진열 상태 조인
  router.get('/catalog', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const category = req.query.category as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    let categoryFilter = '';
    const params: any[] = [organizationId, limit, offset];

    if (category) {
      categoryFilter = `AND pm.brand_name = $4`;
      params.push(category);
    }

    const rows = await dataSource.query(
      `SELECT
         spo.id AS "id",
         pm.marketing_name AS "name",
         pm.brand_name AS "category",
         '' AS "description",
         spo.distribution_type AS "distributionType",
         spo.created_at AS "createdAt",
         spo.updated_at AS "updatedAt",
         s.id AS "supplierId",
         s.name AS "supplierName",
         s.logo_url AS "supplierLogoUrl",
         s.category AS "supplierCategory",
         -- 내 신청/진열 상태 (v2: product_approvals)
         (EXISTS(
           SELECT 1 FROM product_approvals pa2
           WHERE pa2.organization_id = $1
             AND pa2.offer_id = spo.id
             AND pa2.approval_status IN ('pending','approved')
         )) AS "isApplied",
         (EXISTS(
           SELECT 1 FROM product_approvals pa2
           WHERE pa2.organization_id = $1
             AND pa2.offer_id = spo.id
             AND pa2.approval_status = 'approved'
         )) AS "isApproved",
         (EXISTS(
           SELECT 1 FROM organization_product_listings opl
           WHERE opl.organization_id = $1
             AND opl.offer_id = spo.id
         )) AS "isListed"
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       WHERE spo.distribution_type IN ('PUBLIC', 'SERVICE')
         AND spo.is_active = true
         AND s.status = 'ACTIVE'
         ${categoryFilter}
       ORDER BY spo.updated_at DESC
       LIMIT $2 OFFSET $3`,
      params,
    );

    // Total count (for pagination)
    const countParams: any[] = [];
    let countCategoryFilter = '';
    if (category) {
      countCategoryFilter = `AND pm.brand_name = $1`;
      countParams.push(category);
    }

    const countResult = await dataSource.query(
      `SELECT COUNT(*)::int AS total
       FROM supplier_product_offers spo
       JOIN product_masters pm ON pm.id = spo.master_id
       JOIN neture_suppliers s ON s.id = spo.supplier_id
       WHERE spo.distribution_type IN ('PUBLIC', 'SERVICE')
         AND spo.is_active = true
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

  // ─── POST /apply — 410 DEPRECATED ────────────────────────────────
  // WO-PRODUCT-POLICY-V2-APPLICATION-REMOVAL-V1: v1 application 생성 완전 차단
  router.post('/apply', requireAuth, requirePharmacyOwner, asyncHandler(async (_req: Request, res: Response) => {
    res.status(410).json({
      success: false,
      error: {
        code: 'ENDPOINT_DEPRECATED',
        message: 'Product applications are handled by v2 approval system. Use POST /api/v1/product-policy-v2/public-listing, /service-approval, or /private-approval',
      },
    });
  }));

  // ─── GET /applications — 내 신청 목록 (v2: product_approvals) ───────
  router.get('/applications', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const serviceKey = resolveServiceKeyFromQuery(req.query);

    const hasStatus = status && ['pending', 'approved', 'rejected'].includes(status);
    const statusFilter = hasStatus ? `AND pa.approval_status = $3` : '';
    const baseParams: any[] = hasStatus ? [organizationId, serviceKey, status] : [organizationId, serviceKey];

    const countResult = await dataSource.query(
      `SELECT COUNT(*)::int AS total
       FROM product_approvals pa
       WHERE pa.organization_id = $1 AND pa.service_key = $2 ${statusFilter}`,
      baseParams,
    );
    const total = countResult[0]?.total || 0;

    const limitIdx = baseParams.length + 1;
    const offsetIdx = baseParams.length + 2;
    const data = await dataSource.query(
      `SELECT pa.id, pa.organization_id, pa.service_key,
              pa.offer_id,
              pm.marketing_name AS product_name,
              pa.metadata AS product_metadata,
              pa.approval_status AS status,
              pa.reason AS reject_reason,
              pa.requested_by,
              pa.created_at AS requested_at,
              pa.decided_by AS reviewed_by,
              pa.decided_at AS reviewed_at,
              pa.created_at, pa.updated_at
       FROM product_approvals pa
       LEFT JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       LEFT JOIN product_masters pm ON pm.id = spo.master_id
       WHERE pa.organization_id = $1 AND pa.service_key = $2 ${statusFilter}
       ORDER BY pa.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...baseParams, limit, (page - 1) * limit],
    );

    res.json({
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }));

  // ─── GET /approved — 승인된 상품 목록 (v2: product_approvals) ──────
  router.get('/approved', requireAuth, requirePharmacyOwner, asyncHandler(async (req: Request, res: Response) => {
    const organizationId = (req as any).organizationId;
    const serviceKey = resolveServiceKeyFromQuery(req.query);

    const data = await dataSource.query(
      `SELECT pa.id, pa.organization_id, pa.service_key,
              pa.offer_id,
              pm.marketing_name AS product_name,
              pa.metadata AS product_metadata,
              pa.approval_status AS status,
              pa.reason AS reject_reason,
              pa.requested_by,
              pa.created_at AS requested_at,
              pa.decided_by AS reviewed_by,
              pa.decided_at AS reviewed_at,
              pa.created_at, pa.updated_at
       FROM product_approvals pa
       LEFT JOIN supplier_product_offers spo ON spo.id = pa.offer_id
       LEFT JOIN product_masters pm ON pm.id = spo.master_id
       WHERE pa.organization_id = $1
         AND pa.service_key = $2
         AND pa.approval_status = 'approved'
       ORDER BY pa.created_at DESC`,
      [organizationId, serviceKey],
    );

    res.json({ success: true, data });
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
      order: { created_at: 'DESC' },
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

    const { isActive } = req.body;

    if (isActive !== undefined) listing.is_active = isActive;

    const updated = await listingRepo.save(listing);

    // Audit log
    try {
      const log = auditRepo.create({
        operator_id: user.id,
        operator_role: (user.roles || []).find((r: string) => r.startsWith('kpa:')) || 'pharmacy_owner',
        action_type: 'CONTENT_UPDATED' as any,
        target_type: 'content' as any,
        target_id: updated.id,
        metadata: { action: 'listing_updated', changes: { isActive } },
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
