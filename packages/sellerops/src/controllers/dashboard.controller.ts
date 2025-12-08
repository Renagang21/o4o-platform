/**
 * Dashboard Controller
 *
 * API: /api/v1/sellerops/dashboard
 */

import { Controller, Get, Req } from '@nestjs/common';
import { DashboardService } from '../services/DashboardService.js';
import type { DashboardSummaryDto } from '../dto/index.js';

@Controller('api/v1/sellerops/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Req() req: any): Promise<DashboardSummaryDto> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    return await this.dashboardService.getDashboardSummary(sellerId);
  }
}
