/**
 * Analytics Controller
 *
 * 전환율 분석 API
 */

import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { SampleConversionService } from '../services/sample-conversion.service';

export function createAnalyticsController(dataSource: DataSource): Router {
  const router = Router();
  const service = new SampleConversionService(dataSource);

  /**
   * GET /analytics/conversion
   * 전환율 데이터 조회
   */
  router.get('/conversion', async (req: Request, res: Response) => {
    try {
      const { storeId, productId, supplierId, periodType, fromDate, toDate } = req.query;

      const conversions = await service.findAll({
        storeId: storeId as string,
        productId: productId as string,
        supplierId: supplierId as string,
        periodType: periodType as any,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
      });

      res.json(conversions);
    } catch (error) {
      console.error('Error getting conversion data:', error);
      res.status(500).json({ error: 'Failed to get conversion data' });
    }
  });

  /**
   * GET /analytics/top-stores
   * 매장 전환율 순위
   */
  router.get('/top-stores', async (req: Request, res: Response) => {
    try {
      const { supplierId, limit, fromDate, toDate } = req.query;

      const rankings = await service.rankStoresByConversion(
        supplierId as string,
        limit ? parseInt(limit as string) : 10,
        fromDate ? new Date(fromDate as string) : undefined,
        toDate ? new Date(toDate as string) : undefined
      );

      res.json(rankings);
    } catch (error) {
      console.error('Error getting top stores:', error);
      res.status(500).json({ error: 'Failed to get top stores' });
    }
  });

  /**
   * GET /analytics/trend/:storeId
   * 매장 전환율 추이
   */
  router.get('/trend/:storeId', async (req: Request, res: Response) => {
    try {
      const { days } = req.query;

      const trend = await service.getConversionTrend(
        req.params.storeId,
        days ? parseInt(days as string) : 30
      );

      res.json(trend);
    } catch (error) {
      console.error('Error getting conversion trend:', error);
      res.status(500).json({ error: 'Failed to get conversion trend' });
    }
  });

  /**
   * GET /analytics/top-products/:storeId
   * 매장 내 제품별 전환율
   */
  router.get('/top-products/:storeId', async (req: Request, res: Response) => {
    try {
      const { limit } = req.query;

      const products = await service.getTopProductsByConversion(
        req.params.storeId,
        limit ? parseInt(limit as string) : 10
      );

      res.json(products);
    } catch (error) {
      console.error('Error getting top products:', error);
      res.status(500).json({ error: 'Failed to get top products' });
    }
  });

  /**
   * GET /analytics/overall
   * 전체 통계
   */
  router.get('/overall', async (req: Request, res: Response) => {
    try {
      const { storeId } = req.query;

      const stats = await service.getOverallStats(storeId as string);
      res.json(stats);
    } catch (error) {
      console.error('Error getting overall stats:', error);
      res.status(500).json({ error: 'Failed to get overall stats' });
    }
  });

  /**
   * POST /analytics/update
   * 전환 통계 업데이트
   */
  router.post('/update', async (req: Request, res: Response) => {
    try {
      const conversion = await service.updateConversionStats(req.body);
      res.status(201).json(conversion);
    } catch (error) {
      console.error('Error updating conversion stats:', error);
      res.status(500).json({ error: 'Failed to update conversion stats' });
    }
  });

  /**
   * POST /analytics/calculate/:storeId/:productId
   * 전환율 재계산
   */
  router.post('/calculate/:storeId/:productId', async (req: Request, res: Response) => {
    try {
      const { periodType } = req.query;

      const conversion = await service.calculateConversionRate(
        req.params.storeId,
        req.params.productId,
        (periodType as any) || 'daily'
      );

      if (!conversion) {
        return res.status(404).json({ error: 'Conversion record not found' });
      }

      res.json(conversion);
    } catch (error) {
      console.error('Error calculating conversion rate:', error);
      res.status(500).json({ error: 'Failed to calculate conversion rate' });
    }
  });

  /**
   * DELETE /analytics/:id
   * 전환 기록 삭제
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const deleted = await service.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Conversion record not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting conversion record:', error);
      res.status(500).json({ error: 'Failed to delete conversion record' });
    }
  });

  return router;
}
