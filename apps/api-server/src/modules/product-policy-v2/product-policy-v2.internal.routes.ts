/**
 * Product Policy v2 — Internal Test Endpoints
 *
 * WO-PRODUCT-POLICY-V2-INTERNAL-TEST-ENDPOINT-V1
 * WO-O4O-PRODUCT-MASTER-CORE-RESET-V1: offer_id 기준 구조 반영
 *
 * Admin 전용 테스트 엔드포인트. X-Admin-Secret 헤더 필수.
 * 기존 API 변경 없음, 기존 승인 흐름 변경 없음.
 *
 * POST /public-listing              — PUBLIC 즉시 Listing 생성
 * POST /service-approval            — SERVICE 승인 생성
 * POST /service-approval/:id/approve — SERVICE 승인 처리 + Listing 생성
 * POST /private-approval            — PRIVATE 승인 생성
 * POST /private-approval/:id/approve — PRIVATE 승인 처리 + Listing 생성
 * GET  /listings                    — offer_id 기반 Listing 조회
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { ProductApprovalV2Service } from './product-approval-v2.service.js';
import { OrganizationProductListing } from '../../routes/kpa/entities/organization-product-listing.entity.js';
import { SupplierProductOffer } from '../neture/entities/SupplierProductOffer.entity.js';
import { ProductApproval } from '../../entities/ProductApproval.js';
import logger from '../../utils/logger.js';

/**
 * Admin secret 검증 미들웨어.
 * X-Admin-Secret 헤더가 JWT_SECRET과 일치해야 통과.
 */
function requireAdminSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-admin-secret'] as string;
  const jwtSecret = process.env.JWT_SECRET;

  if (secret && jwtSecret && secret === jwtSecret) {
    next();
    return;
  }

  res.status(401).json({
    success: false,
    error: 'Invalid admin secret',
    code: 'ADMIN_SECRET_REQUIRED',
  });
}

export function createProductPolicyV2InternalRouter(dataSource: DataSource): Router {
  const router = Router();
  const service = new ProductApprovalV2Service(dataSource);

  // 모든 엔드포인트에 Admin secret 검증 적용
  router.use(requireAdminSecret);

  // ========================================================================
  // POST /public-listing — 410 DEPRECATED (WO-NETURE-TIER1-AUTO-EXPANSION-BETA-V1)
  // PUBLIC listing은 상품 승인 시 자동 생성됨. 수동 생성 불필요.
  // ========================================================================
  router.post('/public-listing', (_req: Request, res: Response) => {
    res.status(410).json({
      success: false,
      error: {
        code: 'ENDPOINT_DEPRECATED',
        message: 'PUBLIC listing is now auto-created on product approval. Manual creation is no longer needed.',
      },
    });
  });

  // ========================================================================
  // POST /service-approval — SERVICE 승인 생성
  // ========================================================================
  router.post('/service-approval', async (req: Request, res: Response) => {
    try {
      const { offerId, organizationId, serviceKey, requestedBy } = req.body;

      if (!offerId || !organizationId) {
        res.status(400).json({
          success: false,
          error: 'offerId and organizationId are required',
        });
        return;
      }

      const result = await service.createServiceApproval(
        offerId,
        organizationId,
        serviceKey || 'kpa',
        requestedBy || 'internal-test',
      );

      logger.info('[v2-internal] createServiceApproval:', {
        offerId,
        organizationId,
        success: result.success,
        error: result.error,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (err: any) {
      if (err.code === '23505' || err.driverError?.code === '23505') {
        res.status(409).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'Approval already exists' } });
        return;
      }
      logger.error('[v2-internal] createServiceApproval error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ========================================================================
  // POST /service-approval/:id/approve — SERVICE 승인 처리 + Listing 생성
  // ========================================================================
  router.post('/service-approval/:id/approve', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { approvedBy } = req.body;

      const result = await service.approveServiceProduct(
        id,
        approvedBy || 'internal-test',
      );

      logger.info('[v2-internal] approveServiceProduct:', {
        approvalId: id,
        success: result.success,
        error: result.error,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (err: any) {
      if (err.code === '23505' || err.driverError?.code === '23505') {
        res.status(409).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'Listing already exists' } });
        return;
      }
      logger.error('[v2-internal] approveServiceProduct error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ========================================================================
  // POST /private-approval — PRIVATE 승인 생성
  // ========================================================================
  router.post('/private-approval', async (req: Request, res: Response) => {
    try {
      const { offerId, sellerOrgId, serviceKey } = req.body;

      if (!offerId || !sellerOrgId) {
        res.status(400).json({
          success: false,
          error: 'offerId and sellerOrgId are required',
        });
        return;
      }

      const result = await service.createPrivateApproval(
        offerId,
        sellerOrgId,
        serviceKey || 'kpa',
      );

      logger.info('[v2-internal] createPrivateApproval:', {
        offerId,
        sellerOrgId,
        success: result.success,
        error: result.error,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (err: any) {
      if (err.code === '23505' || err.driverError?.code === '23505') {
        res.status(409).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'Approval already exists' } });
        return;
      }
      logger.error('[v2-internal] createPrivateApproval error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ========================================================================
  // POST /private-approval/:id/approve — PRIVATE 승인 처리 + Listing 생성
  // ========================================================================
  router.post('/private-approval/:id/approve', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { approvedBy } = req.body;

      const result = await service.approvePrivateProduct(
        id,
        approvedBy || 'internal-test',
      );

      logger.info('[v2-internal] approvePrivateProduct:', {
        approvalId: id,
        success: result.success,
        error: result.error,
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (err: any) {
      if (err.code === '23505' || err.driverError?.code === '23505') {
        res.status(409).json({ success: false, error: { code: 'ALREADY_EXISTS', message: 'Listing already exists' } });
        return;
      }
      logger.error('[v2-internal] approvePrivateProduct error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ========================================================================
  // GET /listings — offer_id 기반 Listing 조회
  // ========================================================================
  router.get('/listings', async (req: Request, res: Response) => {
    try {
      const { offerId, organizationId, serviceKey } = req.query;

      if (!offerId) {
        res.status(400).json({
          success: false,
          error: 'offerId query parameter is required',
        });
        return;
      }

      const listingRepo = dataSource.getRepository(OrganizationProductListing);

      // offer_id 기반 조회
      const where: Record<string, any> = {
        offer_id: offerId as string,
      };
      if (organizationId) where.organization_id = organizationId as string;
      if (serviceKey) where.service_key = serviceKey as string;

      const listings = await listingRepo.find({
        where,
        order: { created_at: 'DESC' },
      });

      logger.info('[v2-internal] listings query:', {
        offerId,
        organizationId,
        serviceKey,
        count: listings.length,
      });

      res.json({
        success: true,
        data: listings,
        count: listings.length,
      });
    } catch (err: any) {
      logger.error('[v2-internal] listings query error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ========================================================================
  // GET /products — 테스트용 Offer 조회 (distribution_type별)
  // ========================================================================
  router.get('/products', async (req: Request, res: Response) => {
    try {
      const { distributionType, limit } = req.query;
      const offerRepo = dataSource.getRepository(SupplierProductOffer);

      const qb = offerRepo.createQueryBuilder('o')
        .leftJoinAndSelect('o.master', 'master')
        .where('o.isActive = :active', { active: true })
        .orderBy('o.createdAt', 'DESC')
        .take(Number(limit) || 5);

      if (distributionType) {
        qb.andWhere('o.distributionType = :dt', { dt: distributionType as string });
      }

      const offers = await qb.getMany();

      res.json({
        success: true,
        data: offers.map(o => ({
          id: o.id,
          masterId: o.masterId,
          masterName: o.master?.marketingName ?? null,
          supplierId: o.supplierId,
          distributionType: o.distributionType,
          isActive: o.isActive,
          allowedSellerIds: o.allowedSellerIds,
        })),
        count: offers.length,
      });
    } catch (err: any) {
      logger.error('[v2-internal] products query error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ========================================================================
  // PATCH /products/:id — 테스트용 Offer distributionType/allowedSellerIds 변경
  // ========================================================================
  router.patch('/products/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { distributionType, allowedSellerIds } = req.body;
      const offerRepo = dataSource.getRepository(SupplierProductOffer);

      const offer = await offerRepo.findOne({ where: { id } });
      if (!offer) {
        res.status(404).json({ success: false, error: 'PRODUCT_NOT_FOUND' });
        return;
      }

      if (distributionType) offer.distributionType = distributionType;
      if (allowedSellerIds !== undefined) offer.allowedSellerIds = allowedSellerIds;

      const saved = await offerRepo.save(offer);
      res.json({
        success: true,
        data: {
          id: saved.id,
          masterId: saved.masterId,
          distributionType: saved.distributionType,
          allowedSellerIds: saved.allowedSellerIds,
          isActive: saved.isActive,
        },
      });
    } catch (err: any) {
      logger.error('[v2-internal] product update error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ========================================================================
  // GET /approvals — 테스트용 승인 목록 조회
  // ========================================================================
  router.get('/approvals', async (req: Request, res: Response) => {
    try {
      const { offerId, organizationId, status } = req.query;
      const approvalRepo = dataSource.getRepository(ProductApproval);

      const where: Record<string, any> = {};
      if (offerId) where.offer_id = offerId as string;
      if (organizationId) where.organization_id = organizationId as string;
      if (status) where.approval_status = status as string;

      const approvals = await approvalRepo.find({
        where,
        order: { created_at: 'DESC' },
        take: 20,
      });

      res.json({ success: true, data: approvals, count: approvals.length });
    } catch (err: any) {
      logger.error('[v2-internal] approvals query error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
