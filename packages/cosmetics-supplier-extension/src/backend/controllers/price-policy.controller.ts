/**
 * Price Policy Controller
 *
 * 가격 정책 관리 API
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { PricePolicyService } from '../services/price-policy.service';

export function createPricePolicyController(dataSource: DataSource): Router {
  const router = Router();
  const service = new PricePolicyService(dataSource);

  /**
   * POST /price-policy
   * 가격 정책 생성
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const policy = await service.create(req.body);
      res.status(201).json(policy);
    } catch (error: any) {
      console.error('Error creating price policy:', error);
      if (error.message.includes('price')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create price policy' });
    }
  });

  /**
   * GET /price-policy/:id
   * 가격 정책 조회
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const policy = await service.findById(req.params.id);
      if (!policy) {
        return res.status(404).json({ error: 'Price policy not found' });
      }

      res.json(policy);
    } catch (error) {
      console.error('Error getting price policy:', error);
      res.status(500).json({ error: 'Failed to get price policy' });
    }
  });

  /**
   * GET /price-policy
   * 가격 정책 목록
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { supplierId, status, scope, productId, categoryId, activeOnly } = req.query;

      if (!supplierId) {
        return res.status(400).json({ error: 'supplierId is required' });
      }

      const policies = await service.findAll({
        supplierId: supplierId as string,
        status: status as any,
        scope: scope as any,
        productId: productId as string,
        categoryId: categoryId as string,
        activeOnly: activeOnly === 'true',
      });

      res.json(policies);
    } catch (error) {
      console.error('Error listing price policies:', error);
      res.status(500).json({ error: 'Failed to list price policies' });
    }
  });

  /**
   * PATCH /price-policy/:id
   * 가격 정책 수정
   */
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const policy = await service.update(req.params.id, req.body);
      if (!policy) {
        return res.status(404).json({ error: 'Price policy not found' });
      }

      res.json(policy);
    } catch (error: any) {
      console.error('Error updating price policy:', error);
      if (error.message.includes('price')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update price policy' });
    }
  });

  /**
   * POST /price-policy/:id/activate
   * 가격 정책 활성화
   */
  router.post('/:id/activate', async (req: Request, res: Response) => {
    try {
      const policy = await service.activate(req.params.id);
      if (!policy) {
        return res.status(404).json({ error: 'Price policy not found' });
      }

      res.json(policy);
    } catch (error) {
      console.error('Error activating price policy:', error);
      res.status(500).json({ error: 'Failed to activate price policy' });
    }
  });

  /**
   * POST /price-policy/:id/suspend
   * 가격 정책 중지
   */
  router.post('/:id/suspend', async (req: Request, res: Response) => {
    try {
      const policy = await service.suspend(req.params.id);
      if (!policy) {
        return res.status(404).json({ error: 'Price policy not found' });
      }

      res.json(policy);
    } catch (error) {
      console.error('Error suspending price policy:', error);
      res.status(500).json({ error: 'Failed to suspend price policy' });
    }
  });

  /**
   * POST /price-policy/check-violation
   * 가격 위반 체크
   */
  router.post('/check-violation', async (req: Request, res: Response) => {
    try {
      const { supplierId, productId, sellerId, sellerPrice } = req.body;

      if (!supplierId || !productId || !sellerId || sellerPrice === undefined) {
        return res.status(400).json({
          error: 'supplierId, productId, sellerId, and sellerPrice are required',
        });
      }

      const violation = await service.checkPriceViolation(
        supplierId,
        productId,
        sellerId,
        sellerPrice
      );

      res.json({ violation });
    } catch (error) {
      console.error('Error checking price violation:', error);
      res.status(500).json({ error: 'Failed to check price violation' });
    }
  });

  /**
   * GET /price-policy/product/:productId/active
   * 상품에 적용된 활성 정책 조회
   */
  router.get('/product/:productId/active', async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.query;

      if (!supplierId) {
        return res.status(400).json({ error: 'supplierId is required' });
      }

      const policy = await service.getActivePolicyForProduct(
        supplierId as string,
        req.params.productId
      );

      res.json(policy);
    } catch (error) {
      console.error('Error getting active policy for product:', error);
      res.status(500).json({ error: 'Failed to get active policy for product' });
    }
  });

  /**
   * GET /price-policy/stats
   * 가격 정책 통계
   */
  router.get('/stats/summary', async (req: Request, res: Response) => {
    try {
      const { supplierId } = req.query;

      if (!supplierId) {
        return res.status(400).json({ error: 'supplierId is required' });
      }

      const stats = await service.getStats(supplierId as string);
      res.json(stats);
    } catch (error) {
      console.error('Error getting price policy stats:', error);
      res.status(500).json({ error: 'Failed to get price policy stats' });
    }
  });

  /**
   * DELETE /price-policy/:id
   * 가격 정책 삭제
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await service.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Price policy not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting price policy:', error);
      res.status(500).json({ error: 'Failed to delete price policy' });
    }
  });

  return router;
}
