/**
 * PartnerOps Conversions Controller
 */

import { Request, Response } from 'express';
import { ConversionService } from '../services/ConversionService';

export class ConversionsController {
  constructor(private conversionService: ConversionService) {}

  async list(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        res.status(400).json({ success: false, message: 'Partner ID required' });
        return;
      }

      const conversions = await this.conversionService.list(tenantId, partnerId, {
        status: req.query.status as string | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      });

      res.json({ success: true, data: conversions });
    } catch (error: any) {
      console.error('List conversions error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        res.status(400).json({ success: false, message: 'Partner ID required' });
        return;
      }

      const summary = await this.conversionService.getSummary(tenantId, partnerId);
      res.json({ success: true, data: summary });
    } catch (error: any) {
      console.error('Get conversion summary error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getFunnel(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const partnerId = (req as any).partnerId;

      if (!partnerId) {
        res.status(400).json({ success: false, message: 'Partner ID required' });
        return;
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const funnel = await this.conversionService.getFunnel(tenantId, partnerId, startDate, endDate);
      res.json({ success: true, data: funnel });
    } catch (error: any) {
      console.error('Get conversion funnel error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default ConversionsController;
