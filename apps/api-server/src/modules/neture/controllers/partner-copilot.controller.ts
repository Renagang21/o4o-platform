/**
 * PartnerCopilotController
 *
 * WO-O4O-PARTNER-COPILOT-DASHBOARD-V1
 *
 * GET /copilot/kpi
 * GET /copilot/products/performance
 * GET /copilot/stores
 * GET /copilot/commission-trends
 * GET /copilot/alerts
 * GET /copilot/ai-summary
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import { requireLinkedPartner } from '../middleware/partner.middleware.js';
import type { PartnerRequest } from '../middleware/types.js';
import { PartnerCopilotService } from '../services/partner-copilot.service.js';

export function createPartnerCopilotRouter(dataSource: DataSource): Router {
  const router = Router();
  const service = new PartnerCopilotService(dataSource);

  // GET /copilot/kpi
  router.get('/copilot/kpi', requireAuth, requireLinkedPartner, async (req: Request, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const data = await service.getKpiSummary(partnerId);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[PartnerCopilot] KPI error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /copilot/products/performance
  router.get('/copilot/products/performance', requireAuth, requireLinkedPartner, async (req: Request, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const limit = Math.min(Number(req.query.limit) || 10, 50);
      const data = await service.getProductPerformance(partnerId, limit);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[PartnerCopilot] Performance error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /copilot/stores
  router.get('/copilot/stores', requireAuth, requireLinkedPartner, async (req: Request, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const data = await service.getStoreExpansion(partnerId);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[PartnerCopilot] Stores error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /copilot/commission-trends
  router.get('/copilot/commission-trends', requireAuth, requireLinkedPartner, async (req: Request, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const data = await service.getCommissionTrends(partnerId);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[PartnerCopilot] Trends error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /copilot/alerts
  router.get('/copilot/alerts', requireAuth, requireLinkedPartner, async (req: Request, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const data = await service.getAlerts(partnerId);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[PartnerCopilot] Alerts error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /copilot/ai-summary
  router.get('/copilot/ai-summary', requireAuth, requireLinkedPartner, async (req: Request, res: Response) => {
    try {
      const partnerId = (req as PartnerRequest).partnerId;
      const userId = (req as any).user?.id || '';
      const data = await service.getAiInsight(partnerId, userId);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[PartnerCopilot] AI Summary error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}
