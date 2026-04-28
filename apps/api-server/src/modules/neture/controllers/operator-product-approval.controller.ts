/**
 * Operator Product Approval Controller
 *
 * WO-O4O-NETURE-OPERATOR-PRODUCT-API-SCOPE-FIX-V1
 *
 * operator 전용 상품 승인 API — neture:operator 스코프로 접근 가능
 *
 * Routes (mounted at /operator):
 *   GET  /products               — 전체 상품 목록 (필터: approvalStatus 등)
 *   POST /products/batch-approve — 일괄 승인
 *   POST /products/batch-reject  — 일괄 반려
 *   POST /products/:id/approve   — 단건 승인
 *   POST /products/:id/reject    — 단건 반려
 *
 * Auth: requireAuth + requireNetureScope('neture:operator')
 * Note: scopeRoleMapping['neture:operator'] = ['neture:operator', 'neture:admin']
 *       → admin 계정도 접근 가능
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { NetureService } from '../neture.service.js';
import { OfferDistributionType, OfferApprovalStatus } from '../entities/index.js';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireNetureScope } from '../../../middleware/neture-scope.middleware.js';
import { ActionLogService } from '@o4o/action-log-core';
import logger from '../../../utils/logger.js';

type AuthenticatedRequest = Request & {
  user?: { id: string; role: string };
};

export function createOperatorProductApprovalController(dataSource: DataSource): Router {
  const router = Router();
  const netureService = new NetureService();
  const actionLogService = new ActionLogService(dataSource);

  // Router-level guards
  router.use(requireAuth);
  router.use(requireNetureScope('neture:operator') as any);

  /**
   * GET /operator/products
   * 전체 상품 목록 (operator 스코프)
   */
  router.get('/products', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { supplierId, distributionType, isActive, approvalStatus } = req.query;
      const filters: {
        supplierId?: string;
        distributionType?: OfferDistributionType;
        isActive?: boolean;
        approvalStatus?: OfferApprovalStatus;
      } = {};

      if (supplierId && typeof supplierId === 'string') filters.supplierId = supplierId;
      if (
        distributionType &&
        typeof distributionType === 'string' &&
        Object.values(OfferDistributionType).includes(distributionType as OfferDistributionType)
      ) {
        filters.distributionType = distributionType as OfferDistributionType;
      }
      if (isActive === 'true') filters.isActive = true;
      if (isActive === 'false') filters.isActive = false;
      if (
        approvalStatus &&
        typeof approvalStatus === 'string' &&
        Object.values(OfferApprovalStatus).includes(approvalStatus as OfferApprovalStatus)
      ) {
        filters.approvalStatus = approvalStatus as OfferApprovalStatus;
      }

      const products = await netureService.getAllProducts(filters);
      res.json({ success: true, data: products });
    } catch (error) {
      logger.error('[Operator Product API] Error fetching products:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch products' } });
    }
  });

  /**
   * POST /operator/products/batch-approve
   * 일괄 승인 (V3 표준)
   */
  router.post('/products/batch-approve', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const operatorUserId = req.user?.id;
      if (!operatorUserId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, error: { code: 'INVALID_IDS', message: 'ids must be a non-empty array' } });
        return;
      }
      if (ids.length > 100) {
        res.status(400).json({ success: false, error: { code: 'TOO_MANY', message: 'Max 100 items per request' } });
        return;
      }

      const results: Array<{ id: string; status: string; error?: string }> = [];
      for (const id of ids) {
        try {
          const result = await netureService.approveProduct(id, operatorUserId);
          if (!result.success) {
            results.push({ id, status: 'skipped', error: result.error || 'Not pending' });
          } else {
            actionLogService.logSuccess('neture', operatorUserId, 'neture.operator.product_batch_approve', {
              meta: { productId: id },
            }).catch(() => {});
            results.push({ id, status: 'approved' });
          }
        } catch (err) {
          results.push({ id, status: 'error', error: (err as Error).message });
        }
      }

      res.json({ success: true, data: { results } });
    } catch (error) {
      logger.error('[Operator Product API] Error batch-approving products:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to batch approve products' } });
    }
  });

  /**
   * POST /operator/products/batch-reject
   * 일괄 반려 (V3 표준)
   */
  router.post('/products/batch-reject', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const operatorUserId = req.user?.id;
      if (!operatorUserId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { ids, reason } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, error: { code: 'INVALID_IDS', message: 'ids must be a non-empty array' } });
        return;
      }
      if (ids.length > 100) {
        res.status(400).json({ success: false, error: { code: 'TOO_MANY', message: 'Max 100 items per request' } });
        return;
      }

      const results: Array<{ id: string; status: string; error?: string }> = [];
      for (const id of ids) {
        try {
          const result = await netureService.rejectProduct(id, operatorUserId, reason);
          if (!result.success) {
            results.push({ id, status: 'skipped', error: result.error || 'Not pending' });
          } else {
            actionLogService.logSuccess('neture', operatorUserId, 'neture.operator.product_batch_reject', {
              meta: { productId: id, reason },
            }).catch(() => {});
            results.push({ id, status: 'rejected' });
          }
        } catch (err) {
          results.push({ id, status: 'error', error: (err as Error).message });
        }
      }

      res.json({ success: true, data: { results } });
    } catch (error) {
      logger.error('[Operator Product API] Error batch-rejecting products:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to batch reject products' } });
    }
  });

  /**
   * POST /operator/products/:id/approve
   * 단건 승인
   */
  router.post('/products/:id/approve', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const operatorUserId = req.user?.id;
      if (!operatorUserId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { id } = req.params;
      const result = await netureService.approveProduct(id, operatorUserId);
      if (!result.success) {
        const status = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 400;
        res.status(status).json({ success: false, error: { code: result.error } });
        return;
      }

      actionLogService.logSuccess('neture', operatorUserId, 'neture.operator.product_approve', {
        meta: { productId: id },
      }).catch(() => {});

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Operator Product API] Error approving product:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to approve product' } });
    }
  });

  /**
   * POST /operator/products/:id/reject
   * 단건 반려
   */
  router.post('/products/:id/reject', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const operatorUserId = req.user?.id;
      if (!operatorUserId) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
        return;
      }

      const { id } = req.params;
      const { reason } = req.body || {};
      const result = await netureService.rejectProduct(id, operatorUserId, reason);
      if (!result.success) {
        const status = result.error === 'PRODUCT_NOT_FOUND' ? 404 : 400;
        res.status(status).json({ success: false, error: { code: result.error } });
        return;
      }

      actionLogService.logSuccess('neture', operatorUserId, 'neture.operator.product_reject', {
        meta: { productId: id, reason },
      }).catch(() => {});

      res.json({ success: true, data: result.data });
    } catch (error) {
      logger.error('[Operator Product API] Error rejecting product:', error);
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reject product' } });
    }
  });

  return router;
}
