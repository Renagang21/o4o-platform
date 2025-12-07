import { Request, Response } from 'express';
import { StatsService } from '../services/StatsService.js';

/**
 * StatsController
 *
 * 통계 API 컨트롤러
 */
export class StatsController {
  constructor(private statsService: StatsService) {}

  /**
   * GET /stats
   *
   * Query Parameters:
   * - organizationId: 조직 ID (선택적)
   */
  async getDashboardStats(req: Request, res: Response) {
    try {
      const organizationId = req.query.organizationId as string | undefined;

      const stats = await this.statsService.getDashboardStats(organizationId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}
