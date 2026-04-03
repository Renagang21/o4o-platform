/**
 * OperatorRecruitingController — 운영자 판매자 모집 제품 Mutation
 *
 * WO-NETURE-RECRUITING-PRODUCTS-OPERATOR-MUTATION-API-V1
 *
 * Neture operator가 GlycoPharm 모집 상품의 추천/모집 상태를 관리.
 * GlycopharmRepository 직접 사용 (glycopharm:operator 스코프 불필요).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../../middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { GlycopharmProduct } from '../../../routes/glycopharm/entities/glycopharm-product.entity.js';
import logger from '../../../utils/logger.js';

export function createOperatorRecruitingController(dataSource: DataSource): Router {
  const router = Router();

  // Auth: neture:operator 이상
  router.use(authenticate);

  /**
   * PATCH /operator/recruiting-products/:id/featured
   * 추천 토글
   */
  router.patch('/recruiting-products/:id/featured', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { is_featured } = req.body;

    if (typeof is_featured !== 'boolean') {
      res.status(400).json({ success: false, error: 'is_featured (boolean) is required' });
      return;
    }

    const repo = dataSource.getRepository(GlycopharmProduct);
    const product = await repo.findOne({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    product.is_featured = is_featured;
    await repo.save(product);

    logger.info(`[OperatorRecruiting] Featured toggled: product=${id} is_featured=${is_featured} by=${(req as any).user?.id}`);

    res.json({ success: true, data: { id: product.id, is_featured: product.is_featured } });
  }));

  /**
   * PATCH /operator/recruiting-products/:id/recruiting
   * 모집 상태 토글
   */
  router.patch('/recruiting-products/:id/recruiting', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { is_partner_recruiting } = req.body;

    if (typeof is_partner_recruiting !== 'boolean') {
      res.status(400).json({ success: false, error: 'is_partner_recruiting (boolean) is required' });
      return;
    }

    const repo = dataSource.getRepository(GlycopharmProduct);
    const product = await repo.findOne({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    product.is_partner_recruiting = is_partner_recruiting;
    await repo.save(product);

    logger.info(`[OperatorRecruiting] Recruiting toggled: product=${id} is_partner_recruiting=${is_partner_recruiting} by=${(req as any).user?.id}`);

    res.json({ success: true, data: { id: product.id, is_partner_recruiting: product.is_partner_recruiting } });
  }));

  /**
   * PATCH /operator/recruiting-products/:id/status
   * 상품 상태 변경 (active/inactive)
   */
  router.patch('/recruiting-products/:id/status', asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['active', 'inactive', 'draft', 'discontinued'];
    if (!allowed.includes(status)) {
      res.status(400).json({ success: false, error: `status must be one of: ${allowed.join(', ')}` });
      return;
    }

    const repo = dataSource.getRepository(GlycopharmProduct);
    const product = await repo.findOne({ where: { id } });
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const oldStatus = product.status;
    product.status = status;
    // 비활성화 시 모집도 해제
    if (status !== 'active') {
      product.is_partner_recruiting = false;
    }
    await repo.save(product);

    logger.info(`[OperatorRecruiting] Status changed: product=${id} ${oldStatus}→${status} by=${(req as any).user?.id}`);

    res.json({ success: true, data: { id: product.id, status: product.status, is_partner_recruiting: product.is_partner_recruiting } });
  }));

  return router;
}
