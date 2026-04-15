/**
 * Copilot Engine Controller
 *
 * WO-O4O-COPILOT-ENGINE-INTEGRATION-V1
 *
 * POST /api/v1/platform/copilot/summary
 *   → External/debug endpoint for Copilot Engine
 *   → Body: { service: AIServiceId, metrics: {...} }
 *   → Response: { success: true, data: { insights: AiSummaryItem[], source: 'ai'|'rule-based' } }
 *
 * Guard: requireAuth + requireAdmin
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { CopilotEngineService } from './copilot-engine.service.js';

const VALID_SERVICES = ['neture', 'glycopharm', 'cosmetics', 'kpa'] as const;

export function createCopilotEngineController(): Router {
  const router = Router();
  const engine = new CopilotEngineService();

  router.use(authenticate);
  router.use(requireAdmin);

  /**
   * POST /summary
   * Generate AI insights for a given service and metrics.
   */
  router.post('/summary', async (req: Request, res: Response): Promise<void> => {
    try {
      const { service, metrics } = req.body || {};

      // Validate service
      if (!service || !VALID_SERVICES.includes(service)) {
        res.status(400).json({
          success: false,
          error: `Invalid service. Must be one of: ${VALID_SERVICES.join(', ')}`,
        });
        return;
      }

      // Validate metrics
      if (!metrics || typeof metrics !== 'object') {
        res.status(400).json({
          success: false,
          error: 'metrics must be a non-null object',
        });
        return;
      }

      const user = {
        id: (req as any).user?.id || '',
        role: (req as any).user?.roles?.[0] || 'operator',
      };

      const result = await engine.generateInsights(service, metrics, user);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[CopilotEngine Controller] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  return router;
}
