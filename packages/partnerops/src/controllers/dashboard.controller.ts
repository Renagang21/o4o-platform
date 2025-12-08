/**
 * PartnerOps Dashboard Controller
 */

import { Request, Response } from 'express';
import { DashboardService } from '../services/DashboardService';

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        res.status(400).json({ success: false, message: 'Partner ID required' });
        return;
      }

      const summary = await this.dashboardService.getSummary(tenantId, partnerId);
      res.json({ success: true, data: summary });
    } catch (error: any) {
      console.error('Dashboard summary error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default DashboardController;
