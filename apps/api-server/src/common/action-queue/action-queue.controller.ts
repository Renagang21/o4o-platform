/**
 * Action Queue — Controller Factory
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 *
 * createActionQueueRouter(dataSource, config) → Router
 *   GET  /actions              — SYSTEM + AI 액션 목록
 *   POST /actions/execute/:id  — 일괄 실행
 *   POST /actions/dismiss/:id  — dismiss (사용자별)
 */

import { Router, Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import type { ServiceActionConfig } from './action-queue.types.js';
import { buildActionQueue } from './action-queue.factory.js';
import { generateAiActions } from './action-queue-ai.service.js';
import { getDismissedActionIds } from './action-queue-dismiss.js';
import logger from '../../utils/logger.js';

type AuthenticatedRequest = Request & { user?: { id: string } };

export function createActionQueueRouter(
  dataSource: DataSource,
  config: ServiceActionConfig,
): Router {
  const router = Router();

  // ── GET /actions ──
  router.get('/actions', async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).user?.id || '';

      // 1. dismiss 목록
      const dismissedIds = await getDismissedActionIds(dataSource, userId, config.serviceKey);

      // 2. count 쿼리 실행 → AI 입력
      const countResults = await Promise.all(
        config.definitions.map(async (def) => {
          try {
            const rows = await dataSource.query(def.query, def.queryParams);
            return { id: def.id, count: rows[0]?.cnt || 0 };
          } catch { return { id: def.id, count: 0 }; }
        }),
      );
      const counts: Record<string, number> = {};
      countResults.forEach((r) => { counts[r.id] = r.count; });

      // 3. AI 규칙 생성
      const aiActions = await generateAiActions(
        config.serviceKey, counts, config.aiRuleGenerator,
      );

      // 4. 통합 빌드
      const result = await buildActionQueue(
        dataSource, config.definitions, aiActions, dismissedIds,
      );

      res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error(`[${config.serviceKey} ActionQueue] Error:`, error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: error.message });
    }
  });

  // ── POST /actions/execute/:actionId ──
  router.post('/actions/execute/:actionId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) { res.status(401).json({ success: false, error: 'UNAUTHORIZED' }); return; }

      const handler = config.executeHandlers[actionId];
      if (!handler) {
        res.status(404).json({
          success: false,
          error: 'ACTION_NOT_FOUND',
          message: `No execute handler for "${actionId}"`,
        });
        return;
      }

      const result = await handler(userId);
      logger.info(`[${config.serviceKey} ActionExecute] ${actionId}: ${JSON.stringify(result)}`);
      res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error(`[${config.serviceKey} ActionExecute] Error:`, error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: error.message });
    }
  });

  // ── POST /actions/dismiss/:actionId ──
  router.post('/actions/dismiss/:actionId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { actionId } = req.params;
      const userId = (req as AuthenticatedRequest).user?.id;
      if (!userId) { res.status(401).json({ success: false, error: 'UNAUTHORIZED' }); return; }

      await dataSource.query(
        `INSERT INTO operator_action_dismissals (user_id, service_key, action_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, service_key, action_id) DO NOTHING`,
        [userId, config.serviceKey, actionId],
      );

      res.json({ success: true, data: { dismissed: true } });
    } catch (error: any) {
      logger.error(`[${config.serviceKey} ActionDismiss] Error:`, error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: error.message });
    }
  });

  return router;
}
