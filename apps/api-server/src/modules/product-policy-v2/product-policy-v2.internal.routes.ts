/**
 * Product Policy v2 — Internal Test Endpoints
 *
 * WO-PRODUCT-POLICY-V2-INTERNAL-TEST-ENDPOINT-V1
 *
 * Admin 전용 테스트 엔드포인트. X-Admin-Secret 헤더 필수.
 * 기존 API 변경 없음, 기존 승인 흐름 변경 없음.
 *
 * POST /public-listing              — PUBLIC 즉시 Listing 생성
 * POST /service-approval            — SERVICE 승인 생성
 * POST /service-approval/:id/approve — SERVICE 승인 처리 + Listing 생성
 * POST /private-approval            — PRIVATE 승인 생성
 * POST /private-approval/:id/approve — PRIVATE 승인 처리 + Listing 생성
 * GET  /listings                    — product_id 기반 Listing 조회
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { ProductApprovalV2Service } from './product-approval-v2.service.js';
import { OrganizationProductListing } from '../../routes/kpa/entities/organization-product-listing.entity.js';
import { NetureSupplierProduct } from '../neture/entities/NetureSupplierProduct.entity.js';
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
  // POST /public-listing — PUBLIC 즉시 Listing 생성
  // ========================================================================
  router.post('/public-listing', async (req: Request, res: Response) => {
    try {
      const { productId, organizationId, serviceKey } = req.body;

      if (!productId || !organizationId) {
        res.status(400).json({
          success: false,
          error: 'productId and organizationId are required',
        });
        return;
      }

      const result = await service.createPublicListing(
        productId,
        organizationId,
        serviceKey || 'kpa',
      );

      logger.info('[v2-internal] createPublicListing:', {
        productId,
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
      logger.error('[v2-internal] createPublicListing error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ========================================================================
  // POST /service-approval — SERVICE 승인 생성
  // ========================================================================
  router.post('/service-approval', async (req: Request, res: Response) => {
    try {
      const { productId, organizationId, serviceKey, requestedBy } = req.body;

      if (!productId || !organizationId) {
        res.status(400).json({
          success: false,
          error: 'productId and organizationId are required',
        });
        return;
      }

      const result = await service.createServiceApproval(
        productId,
        organizationId,
        serviceKey || 'kpa',
        requestedBy || 'internal-test',
      );

      logger.info('[v2-internal] createServiceApproval:', {
        productId,
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
      logger.error('[v2-internal] approveServiceProduct error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ========================================================================
  // POST /private-approval — PRIVATE 승인 생성
  // ========================================================================
  router.post('/private-approval', async (req: Request, res: Response) => {
    try {
      const { productId, sellerOrgId, serviceKey } = req.body;

      if (!productId || !sellerOrgId) {
        res.status(400).json({
          success: false,
          error: 'productId and sellerOrgId are required',
        });
        return;
      }

      const result = await service.createPrivateApproval(
        productId,
        sellerOrgId,
        serviceKey || 'kpa',
      );

      logger.info('[v2-internal] createPrivateApproval:', {
        productId,
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
      logger.error('[v2-internal] approvePrivateProduct error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ========================================================================
  // GET /listings — product_id 기반 Listing 조회
  // ========================================================================
  router.get('/listings', async (req: Request, res: Response) => {
    try {
      const { productId, organizationId, serviceKey } = req.query;

      if (!productId) {
        res.status(400).json({
          success: false,
          error: 'productId query parameter is required',
        });
        return;
      }

      const listingRepo = dataSource.getRepository(OrganizationProductListing);

      // product_id 기반 조회만 (external_product_id 기반 제외)
      const where: Record<string, any> = {
        product_id: productId as string,
      };
      if (organizationId) where.organization_id = organizationId as string;
      if (serviceKey) where.service_key = serviceKey as string;

      const listings = await listingRepo.find({
        where,
        order: { created_at: 'DESC' },
      });

      logger.info('[v2-internal] listings query:', {
        productId,
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
  // GET /products — 테스트용 제품 조회 (distribution_type별)
  // ========================================================================
  router.get('/products', async (req: Request, res: Response) => {
    try {
      const { distributionType, limit } = req.query;
      const productRepo = dataSource.getRepository(NetureSupplierProduct);

      const qb = productRepo.createQueryBuilder('p')
        .where('p.isActive = :active', { active: true })
        .orderBy('p.createdAt', 'DESC')
        .take(Number(limit) || 5);

      if (distributionType) {
        qb.andWhere('p.distributionType = :dt', { dt: distributionType as string });
      }

      const products = await qb.getMany();

      res.json({
        success: true,
        data: products.map(p => ({
          id: p.id,
          name: p.name,
          supplierId: p.supplierId,
          distributionType: p.distributionType,
          isActive: p.isActive,
          allowedSellerIds: p.allowedSellerIds,
        })),
        count: products.length,
      });
    } catch (err: any) {
      logger.error('[v2-internal] products query error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ========================================================================
  // GET /approvals — 테스트용 승인 목록 조회
  // ========================================================================
  router.get('/approvals', async (req: Request, res: Response) => {
    try {
      const { productId, organizationId, status } = req.query;
      const approvalRepo = dataSource.getRepository(ProductApproval);

      const where: Record<string, any> = {};
      if (productId) where.product_id = productId as string;
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
