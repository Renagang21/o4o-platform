/**
 * OperatorCopilotController
 *
 * WO-O4O-OPERATOR-COPILOT-DASHBOARD-V1
 *
 * GET /copilot/kpi
 * GET /copilot/stores
 * GET /copilot/suppliers
 * GET /copilot/products
 * GET /copilot/trends
 * GET /copilot/alerts
 * GET /copilot/ai-summary
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/permission.middleware.js';
import { OperatorCopilotService } from './operator-copilot.service.js';

export function createOperatorCopilotRouter(dataSource: DataSource): Router {
  const router = Router();
  const service = new OperatorCopilotService(dataSource);

  // All endpoints require admin/operator access
  router.use(authenticate);
  router.use(requireAdmin);

  // GET /copilot/kpi
  router.get('/copilot/kpi', async (_req: Request, res: Response) => {
    try {
      const data = await service.getKpiSummary();
      res.json({ success: true, data });
    } catch (error) {
      console.error('[OperatorCopilot] KPI error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /copilot/stores
  router.get('/copilot/stores', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 5, 20);
      const data = await service.getRecentStores(limit);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[OperatorCopilot] Stores error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /copilot/suppliers
  router.get('/copilot/suppliers', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 5, 20);
      const data = await service.getSupplierActivity(limit);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[OperatorCopilot] Suppliers error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /copilot/products
  router.get('/copilot/products', async (req: Request, res: Response) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 10, 50);
      const data = await service.getPendingProducts(limit);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[OperatorCopilot] Products error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /copilot/trends
  router.get('/copilot/trends', async (_req: Request, res: Response) => {
    try {
      const data = await service.getPlatformTrends();
      res.json({ success: true, data });
    } catch (error) {
      console.error('[OperatorCopilot] Trends error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /copilot/alerts
  router.get('/copilot/alerts', async (_req: Request, res: Response) => {
    try {
      const data = await service.getAlerts();
      res.json({ success: true, data });
    } catch (error) {
      console.error('[OperatorCopilot] Alerts error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // GET /copilot/ai-summary
  router.get('/copilot/ai-summary', async (req: Request, res: Response) => {
    try {
      // Gather platform context
      const kpi = await service.getKpiSummary();
      const trends = await service.getPlatformTrends();
      const alerts = await service.getAlerts();

      // Try AI insight
      try {
        const { runAIInsight } = await import('@o4o/ai-core');
        const aiResult = await runAIInsight({
          service: 'neture',
          insightType: 'platform-operations',
          contextData: {
            platform: {
              totalStores: kpi.totalStores,
              totalSuppliers: kpi.totalSuppliers,
              totalProducts: kpi.totalProducts,
              recentOrders: kpi.recentOrders,
            },
            trends: {
              orderGrowth: trends.orderGrowth,
              newStores: trends.newStores,
              newSuppliers: trends.newSuppliers,
              currentOrders: trends.currentOrders,
              previousOrders: trends.previousOrders,
            },
            alertCount: alerts.length,
            highAlerts: alerts.filter(a => a.severity === 'high').length,
          },
          user: {
            id: (req as any).user?.id || '',
            role: 'platform:operator',
          },
        });

        if (aiResult.success && aiResult.insight) {
          res.json({
            success: true,
            data: {
              insight: aiResult.insight,
              meta: {
                provider: aiResult.meta.provider,
                model: aiResult.meta.model,
                durationMs: aiResult.meta.durationMs,
              },
            },
          });
          return;
        }
      } catch {
        // AI unavailable, fall through to rule-based
      }

      // Rule-based fallback
      const summaryParts: string[] = [];
      if (kpi.totalStores > 0) summaryParts.push(`매장 ${kpi.totalStores}개 운영 중`);
      if (kpi.totalSuppliers > 0) summaryParts.push(`공급자 ${kpi.totalSuppliers}개 활성`);
      if (kpi.recentOrders > 0) summaryParts.push(`최근 7일 주문 ${kpi.recentOrders}건`);
      if (trends.orderGrowth !== 0) {
        summaryParts.push(`주문 ${trends.orderGrowth > 0 ? '증가' : '감소'} ${Math.abs(trends.orderGrowth)}%`);
      }

      const actions: string[] = [];
      if (alerts.some(a => a.severity === 'high')) actions.push('긴급 알림을 확인하세요.');
      if (trends.newStores > 0) actions.push(`신규 매장 ${trends.newStores}개가 가입했습니다.`);
      if (trends.newSuppliers > 0) actions.push(`신규 공급자 ${trends.newSuppliers}개가 등록했습니다.`);
      if (kpi.recentOrders === 0) actions.push('최근 주문이 없습니다. 플랫폼 활동을 점검하세요.');

      const riskLevel = alerts.some(a => a.severity === 'high') ? 'high'
        : alerts.some(a => a.severity === 'medium') ? 'medium'
        : 'low';

      res.json({
        success: true,
        data: {
          insight: {
            summary: summaryParts.join('. ') + '.',
            riskLevel,
            recommendedActions: actions,
            confidenceScore: 0.6,
          },
          meta: { provider: 'rule-based', model: 'operator-copilot-v1', durationMs: 0 },
        },
      });
    } catch (error) {
      console.error('[OperatorCopilot] AI Summary error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}
