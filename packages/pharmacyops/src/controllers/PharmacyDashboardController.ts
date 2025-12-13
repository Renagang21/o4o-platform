/**
 * PharmacyDashboardController
 *
 * 약국 대시보드 API
 *
 * @package @o4o/pharmacyops
 */

import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { PharmacyDashboardService } from '../services/PharmacyDashboardService.js';
import { PharmacyAuthGuard, getPharmacyId } from '../guards/PharmacyAuthGuard.js';

@Controller('pharmacyops/dashboard')
@UseGuards(PharmacyAuthGuard)
export class PharmacyDashboardController {
  constructor(private readonly dashboardService: PharmacyDashboardService) {}

  /**
   * GET /api/v1/pharmacyops/dashboard
   * 약국 대시보드 조회
   */
  @Get()
  async getDashboard(@Req() req: any) {
    const pharmacyId = getPharmacyId(req);
    return this.dashboardService.getDashboard(pharmacyId);
  }

  /**
   * GET /api/v1/pharmacyops/dashboard/statistics
   * 주문 통계 조회
   */
  @Get('statistics')
  async getStatistics(@Req() req: any) {
    const pharmacyId = getPharmacyId(req);
    return this.dashboardService.getOrderStatistics(pharmacyId);
  }

  /**
   * GET /api/v1/pharmacyops/dashboard/trend
   * 월별 구매 추이 조회
   */
  @Get('trend')
  async getMonthlyTrend(@Req() req: any) {
    const pharmacyId = getPharmacyId(req);
    return this.dashboardService.getMonthlyPurchaseTrend(pharmacyId);
  }
}
