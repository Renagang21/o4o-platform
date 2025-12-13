/**
 * PartnerOps Dashboard Controller
 *
 * Partner-Core 기반 대시보드 컨트롤러
 *
 * @package @o4o/partnerops
 */

import { Request, Response } from 'express';
import type { DashboardService } from '../services/DashboardService.js';
import type { ApiResponseDto } from '../dto/index.js';

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  /**
   * GET /partnerops/dashboard/summary
   * 대시보드 요약 정보 조회
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const summary = await this.dashboardService.getSummary(partnerId);
      const response: ApiResponseDto<typeof summary> = {
        success: true,
        data: summary,
      };
      res.json(response);
    } catch (error: any) {
      console.error('Dashboard summary error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /partnerops/dashboard/stats
   * 기간별 통계 조회
   */
  async getStatsByPeriod(req: Request, res: Response): Promise<void> {
    try {
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        const response: ApiResponseDto<null> = {
          success: false,
          error: 'Partner ID required',
        };
        res.status(400).json(response);
        return;
      }

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30일 전
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const stats = await this.dashboardService.getStatsByPeriod(
        partnerId,
        startDate,
        endDate
      );

      const response: ApiResponseDto<typeof stats> = {
        success: true,
        data: stats,
      };
      res.json(response);
    } catch (error: any) {
      console.error('Dashboard stats error:', error);
      const response: ApiResponseDto<null> = {
        success: false,
        error: error.message,
      };
      res.status(500).json(response);
    }
  }
}

export default DashboardController;
