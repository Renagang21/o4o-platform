/**
 * Sample Usage Controller
 *
 * 샘플 사용 로그 API
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { SampleUsageService } from '../services/sample-usage.service';

export function createUsageController(dataSource: DataSource): Router {
  const router = Router();
  const service = new SampleUsageService(dataSource);

  /**
   * POST /usage
   * 샘플 사용 로그 추가
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const log = await service.addUsageLog(req.body);
      res.status(201).json(log);
    } catch (error) {
      console.error('Error adding usage log:', error);
      res.status(500).json({ error: 'Failed to add usage log' });
    }
  });

  /**
   * GET /usage/:storeId
   * 매장 사용 로그 조회
   */
  router.get('/:storeId', async (req: Request, res: Response) => {
    try {
      const { limit } = req.query;
      const logs = await service.getRecentUsage(
        req.params.storeId,
        limit ? parseInt(limit as string) : 20
      );
      res.json(logs);
    } catch (error) {
      console.error('Error getting usage logs:', error);
      res.status(500).json({ error: 'Failed to get usage logs' });
    }
  });

  /**
   * GET /usage
   * 사용 로그 목록 조회
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { storeId, productId, fromDate, toDate, customerReaction, resultedInPurchase } =
        req.query;

      const logs = await service.listUsageLogs({
        storeId: storeId as string,
        productId: productId as string,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        customerReaction: customerReaction as any,
        resultedInPurchase: resultedInPurchase === 'true' ? true : resultedInPurchase === 'false' ? false : undefined,
      });

      res.json(logs);
    } catch (error) {
      console.error('Error listing usage logs:', error);
      res.status(500).json({ error: 'Failed to list usage logs' });
    }
  });

  /**
   * GET /usage/:storeId/aggregate
   * 매장 사용 집계
   */
  router.get('/:storeId/aggregate', async (req: Request, res: Response) => {
    try {
      const { fromDate, toDate } = req.query;

      const aggregate = await service.aggregateUsage(
        req.params.storeId,
        fromDate ? new Date(fromDate as string) : undefined,
        toDate ? new Date(toDate as string) : undefined
      );

      res.json(aggregate);
    } catch (error) {
      console.error('Error aggregating usage:', error);
      res.status(500).json({ error: 'Failed to aggregate usage' });
    }
  });

  /**
   * GET /usage/:storeId/by-product
   * 제품별 사용 집계
   */
  router.get('/:storeId/by-product', async (req: Request, res: Response) => {
    try {
      const { fromDate, toDate } = req.query;

      const aggregate = await service.aggregateByProduct(
        req.params.storeId,
        fromDate ? new Date(fromDate as string) : undefined,
        toDate ? new Date(toDate as string) : undefined
      );

      res.json(aggregate);
    } catch (error) {
      console.error('Error aggregating by product:', error);
      res.status(500).json({ error: 'Failed to aggregate by product' });
    }
  });

  /**
   * GET /usage/:storeId/daily
   * 일별 사용 요약
   */
  router.get('/:storeId/daily', async (req: Request, res: Response) => {
    try {
      const { days } = req.query;
      const summary = await service.getDailyUsage(
        req.params.storeId,
        days ? parseInt(days as string) : 7
      );
      res.json(summary);
    } catch (error) {
      console.error('Error getting daily usage:', error);
      res.status(500).json({ error: 'Failed to get daily usage' });
    }
  });

  /**
   * POST /usage/:id/purchase
   * 구매 결과 기록
   */
  router.post('/:id/purchase', async (req: Request, res: Response) => {
    try {
      const { purchaseAmount } = req.body;

      if (purchaseAmount === undefined) {
        return res.status(400).json({ error: 'purchaseAmount is required' });
      }

      const log = await service.recordPurchase(req.params.id, purchaseAmount);
      if (!log) {
        return res.status(404).json({ error: 'Usage log not found' });
      }

      res.json(log);
    } catch (error) {
      console.error('Error recording purchase:', error);
      res.status(500).json({ error: 'Failed to record purchase' });
    }
  });

  /**
   * DELETE /usage/:id
   * 사용 로그 삭제
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await service.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Usage log not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting usage log:', error);
      res.status(500).json({ error: 'Failed to delete usage log' });
    }
  });

  return router;
}
