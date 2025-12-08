/**
 * PartnerOps Settlement Controller
 */

import { Request, Response } from 'express';
import { SettlementService } from '../services/SettlementService';

export class SettlementController {
  constructor(private settlementService: SettlementService) {}

  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        res.status(400).json({ success: false, message: 'Partner ID required' });
        return;
      }

      const summary = await this.settlementService.getSummary(tenantId, partnerId);
      res.json({ success: true, data: summary });
    } catch (error: any) {
      console.error('Get settlement summary error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getBatches(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        res.status(400).json({ success: false, message: 'Partner ID required' });
        return;
      }

      const result = await this.settlementService.getBatches(tenantId, partnerId, {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 12,
      });

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Get settlement batches error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        res.status(400).json({ success: false, message: 'Partner ID required' });
        return;
      }

      const result = await this.settlementService.getTransactions(tenantId, partnerId, {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as string,
      });

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Get settlement transactions error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default SettlementController;
