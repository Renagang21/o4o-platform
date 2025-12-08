/**
 * Dashboard Controller
 *
 * API: /api/v1/supplierops/dashboard
 */

import { Controller, Get, Req } from '@nestjs/common';
import { DashboardService } from '../services/DashboardService.js';
import type { DashboardSummaryDto } from '../dto/index.js';

@Controller('api/v1/supplierops/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Req() req: any): Promise<DashboardSummaryDto> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }
    return await this.dashboardService.getDashboardSummary(supplierId);
  }
}
