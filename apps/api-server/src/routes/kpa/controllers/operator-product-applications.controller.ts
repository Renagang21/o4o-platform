/**
 * Operator Product Applications Controller
 *
 * WO-O4O-PRODUCT-APPROVAL-WORKFLOW-V1
 *
 * Operator 전용 — 상품 판매 신청 조회 + 승인/거절
 *
 * GET   /                — 전체 신청 목록 (필터: status)
 * GET   /stats           — 상태별 통계
 * PATCH /:id/approve     — 승인 + listing 자동 생성
 * PATCH /:id/reject      — 거절
 *
 * 권한: kpa:admin 또는 kpa:operator
 */

import { Router, Request, Response, RequestHandler } from 'express';
import { DataSource } from 'typeorm';
import { OrganizationProductApplication } from '../entities/organization-product-application.entity.js';
import { OrganizationProductListing } from '../entities/organization-product-listing.entity.js';
import { KpaAuditLog } from '../entities/kpa-audit-log.entity.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

type AuthMiddleware = RequestHandler;
type ScopeMiddleware = (scope: string) => RequestHandler;

export function createOperatorProductApplicationsController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware,
  requireScope: ScopeMiddleware,
): Router {
  const router = Router();
  const appRepo = dataSource.getRepository(OrganizationProductApplication);
  const listingRepo = dataSource.getRepository(OrganizationProductListing);
  const auditRepo = dataSource.getRepository(KpaAuditLog);

  // All routes require kpa:operator scope
  router.use(requireAuth, requireScope('kpa:operator'));

  // ─── GET / — 전체 상품 신청 목록 ───────────────────────────────────
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const qb = appRepo.createQueryBuilder('app')
      .select([
        'app.id',
        'app.organization_id',
        'app.service_key',
        'app.external_product_id',
        'app.product_name',
        'app.product_metadata',
        'app.status',
        'app.reject_reason',
        'app.requested_by',
        'app.requested_at',
        'app.reviewed_by',
        'app.reviewed_at',
        'app.created_at',
      ]);

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      qb.where('app.status = :status', { status });
    }

    qb.orderBy('app.requested_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    // 조직명 조인 (organizations 테이블 — lightweight)
    const orgIds = [...new Set(data.map(d => d.organization_id))];
    let orgMap: Record<string, string> = {};
    if (orgIds.length > 0) {
      const orgs = await dataSource.query(
        `SELECT id, name FROM organizations WHERE id = ANY($1::uuid[])`,
        [orgIds],
      );
      for (const o of orgs) {
        orgMap[o.id] = o.name;
      }
    }

    const enriched = data.map(app => ({
      ...app,
      organizationName: orgMap[app.organization_id] || null,
      supplierName: (app.product_metadata as any)?.supplierName || null,
    }));

    res.json({
      success: true,
      data: enriched,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }));

  // ─── GET /stats — 상태별 통계 ──────────────────────────────────────
  router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
    const rows = await dataSource.query(
      `SELECT status, COUNT(*)::int AS count
       FROM organization_product_applications
       GROUP BY status`,
    );

    const stats: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const row of rows) {
      stats[row.status] = row.count;
    }

    res.json({ success: true, data: stats });
  }));

  // ─── PATCH /:id/approve — 승인 + listing 자동 생성 ──────────────────
  router.patch('/:id/approve', asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;

    const application = await appRepo.findOne({ where: { id } });
    if (!application) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
      return;
    }

    if (application.status !== 'pending') {
      res.status(409).json({
        success: false,
        error: { code: 'ALREADY_PROCESSED', message: `Application already ${application.status}` },
      });
      return;
    }

    // 1. 승인 + listing 생성을 단일 트랜잭션으로 처리
    let approvedApplication: typeof application;
    let listing: OrganizationProductListing | null;

    try {
    ({ approvedApplication, listing } = await dataSource.transaction(async (manager) => {
      const txAppRepo = manager.getRepository(OrganizationProductApplication);
      const txListingRepo = manager.getRepository(OrganizationProductListing);

      // 승인 처리
      application.status = 'approved';
      application.reviewed_by = user.id;
      application.reviewed_at = new Date();
      await txAppRepo.save(application);

      // Supplier ACTIVE 재검증 (external_product_id → neture_supplier_products → neture_suppliers)
      const supplierCheck = await manager.query(
        `SELECT ns.status
         FROM neture_supplier_products nsp
         JOIN neture_suppliers ns ON ns.id = nsp.supplier_id
         WHERE nsp.id = $1::uuid`,
        [application.external_product_id],
      );
      if (supplierCheck.length > 0 && supplierCheck[0].status !== 'ACTIVE') {
        throw new Error('SUPPLIER_NOT_ACTIVE');
      }

      // listing 자동 생성 (중복 방지)
      const existingListing = await txListingRepo.findOne({
        where: {
          organization_id: application.organization_id,
          external_product_id: application.external_product_id,
          service_key: application.service_key,
        },
      });

      let newListing = existingListing;
      if (!existingListing) {
        newListing = txListingRepo.create({
          organization_id: application.organization_id,
          service_key: application.service_key,
          external_product_id: application.external_product_id,
          product_name: application.product_name,
          product_metadata: application.product_metadata,
          retail_price: null,
          is_active: false,
          display_order: 0,
        });
        newListing = await txListingRepo.save(newListing);
      }

      return { approvedApplication: application, listing: newListing };
    }));
    } catch (e: any) {
      if (e.message === 'SUPPLIER_NOT_ACTIVE') {
        res.status(400).json({
          success: false,
          error: { code: 'SUPPLIER_NOT_ACTIVE', message: 'Supplier is not active. Cannot approve application.' },
        });
        return;
      }
      throw e;
    }

    // 2. Audit log (트랜잭션 외부 — 실패해도 승인 유지)
    try {
      await auditRepo.save(auditRepo.create({
        operator_id: user.id,
        operator_role: (user.roles || []).find((r: string) => r.startsWith('kpa:')) || 'kpa:operator',
        action_type: 'CONTENT_UPDATED' as any,
        target_type: 'application' as any,
        target_id: approvedApplication.id,
        metadata: {
          action: 'product_application_approved',
          organizationId: approvedApplication.organization_id,
          productName: approvedApplication.product_name,
          listingId: listing?.id,
        },
      }));
    } catch (e) {
      console.error('[KPA AuditLog] Failed to write approval audit:', e);
    }

    res.json({
      success: true,
      data: {
        application: { ...approvedApplication },
        listing,
      },
    });
  }));

  // ─── PATCH /:id/reject — 거절 ──────────────────────────────────────
  router.patch('/:id/reject', asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { id } = req.params;
    const { reason } = req.body || {};

    const application = await appRepo.findOne({ where: { id } });
    if (!application) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
      return;
    }

    if (application.status !== 'pending') {
      res.status(409).json({
        success: false,
        error: { code: 'ALREADY_PROCESSED', message: `Application already ${application.status}` },
      });
      return;
    }

    application.status = 'rejected';
    application.reject_reason = reason || null;
    application.reviewed_by = user.id;
    application.reviewed_at = new Date();
    await appRepo.save(application);

    // Audit log
    try {
      await auditRepo.save(auditRepo.create({
        operator_id: user.id,
        operator_role: (user.roles || []).find((r: string) => r.startsWith('kpa:')) || 'kpa:operator',
        action_type: 'CONTENT_UPDATED' as any,
        target_type: 'application' as any,
        target_id: application.id,
        metadata: {
          action: 'product_application_rejected',
          organizationId: application.organization_id,
          productName: application.product_name,
          reason: reason || null,
        },
      }));
    } catch (e) {
      console.error('[KPA AuditLog] Failed to write rejection audit:', e);
    }

    res.json({ success: true, data: application });
  }));

  return router;
}
