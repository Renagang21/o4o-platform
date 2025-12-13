import { Request, Response, Router } from 'express';
import type { DataSource } from 'typeorm';
import { MetricsCalculatorService } from '../services/MetricsCalculatorService.js';
import type { MetricsResponseDto } from '../dto/index.js';

/**
 * MetricsController
 * 혈당 메트릭스 API 컨트롤러
 */
export class MetricsController {
  private metricsService: MetricsCalculatorService;

  constructor(private dataSource: DataSource) {
    this.metricsService = new MetricsCalculatorService(dataSource);
  }

  /**
   * 기간별 메트릭스 조회
   * GET /diabetes/metrics/:userId
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // 집계 메트릭스 계산
      const metrics = await this.metricsService.getAggregatedMetrics(userId, start, end);

      // 일별 메트릭스 조회
      const dailyMetrics = await this.metricsService.getMetricsForPeriod(userId, start, end);

      const response: MetricsResponseDto = {
        period: {
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          days: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        },
        summary: {
          totalReadings: metrics.totalReadings,
          avgGlucose: Math.round(metrics.meanGlucose * 10) / 10,
          medianGlucose: Math.round(metrics.medianGlucose * 10) / 10,
          minGlucose: metrics.minGlucose,
          maxGlucose: metrics.maxGlucose,
          stdDev: Math.round(metrics.stdDev * 10) / 10,
          cv: Math.round(metrics.cv * 10) / 10,
          gmi: Math.round(metrics.gmi * 10) / 10,
        },
        tir: {
          inRange: Math.round(metrics.tirPercent * 10) / 10,
          below: Math.round(metrics.tirBelowPercent * 10) / 10,
          above: Math.round(metrics.tirAbovePercent * 10) / 10,
          severeBelow: Math.round(metrics.tirSevereBelowPercent * 10) / 10,
          severeAbove: Math.round(metrics.tirSevereAbovePercent * 10) / 10,
        },
        events: {
          hypoCount: metrics.hypoEvents,
          hyperCount: metrics.hyperEvents,
          hypoMinutes: metrics.hypoMinutes,
          hyperMinutes: metrics.hyperMinutes,
        },
        dailyData: dailyMetrics.map((m) => ({
          date: m.date.toISOString().split('T')[0],
          avgGlucose: Math.round(Number(m.meanGlucose ?? 0) * 10) / 10,
          tir: Math.round(Number(m.tirPercent ?? 0) * 10) / 10,
          hypoEvents: m.hypoEvents ?? 0,
          hyperEvents: m.hyperEvents ?? 0,
        })),
        hourlyAverages: metrics.hourlyMeans,
      };

      res.json(response);
    } catch (error) {
      console.error('[MetricsController] GetMetrics error:', error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  }

  /**
   * 일일 메트릭스 계산 및 저장
   * POST /diabetes/metrics/:userId/calculate
   */
  async calculateDailyMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId || (req as any).user?.id;
      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const { date } = req.body;
      const targetDate = date ? new Date(date) : new Date();

      const metrics = await this.metricsService.calculateAndSaveDailyMetrics(userId, targetDate);

      res.json({
        success: true,
        date: targetDate.toISOString().split('T')[0],
        metrics: {
          avgGlucose: Number(metrics.meanGlucose ?? 0),
          tir: Number(metrics.tirPercent ?? 0),
          cv: Number(metrics.cv ?? 0),
          hypoEvents: metrics.hypoEvents,
          hyperEvents: metrics.hyperEvents,
        },
      });
    } catch (error) {
      console.error('[MetricsController] CalculateDailyMetrics error:', error);
      res.status(500).json({ error: 'Failed to calculate metrics' });
    }
  }

  /**
   * 라우터 생성
   */
  createRouter(): Router {
    const router = Router();

    router.get('/:userId', this.getMetrics.bind(this));
    router.post('/:userId/calculate', this.calculateDailyMetrics.bind(this));

    return router;
  }
}
