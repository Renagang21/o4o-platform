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

import { Router, Request, Response, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import type { ServiceActionConfig } from './action-queue.types.js';
import { buildActionQueue } from './action-queue.factory.js';
import { generateAiActions } from './action-queue-ai.service.js';
import { getDismissedActionIds } from './action-queue-dismiss.js';
import logger from '../../utils/logger.js';

type AuthenticatedRequest = Request & { user?: { id: string } };

/**
 * @param executeGuard — WO-O4O-ACTION-SCOPE-GUARD-V1: execute endpoint에만 적용할 scope guard middleware
 */
export function createActionQueueRouter(
  dataSource: DataSource,
  config: ServiceActionConfig,
  executeGuard?: RequestHandler,
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

      // 4. 통합 빌드 (WO-O4O-ACTION-EXECUTION-LAYER-V1: executeHandlerIds 전달)
      const executeHandlerIds = new Set(Object.keys(config.executeHandlers));
      const result = await buildActionQueue(
        dataSource, config.definitions, aiActions, dismissedIds, executeHandlerIds,
      );

      res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error(`[${config.serviceKey} ActionQueue] Error:`, error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: error.message });
    }
  });

  // ── POST /actions/execute/:actionId ──
  // WO-O4O-ACTION-SCOPE-GUARD-V1: admin scope guard (1st layer — route level)
  const executeHandler = async (req: Request, res: Response): Promise<void> => {
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

      const result = await handler(dataSource, userId);
      logger.info(`[${config.serviceKey} ActionExecute] ${actionId}: ${JSON.stringify(result)}`);

      // WO-O4O-ACTION-EXECUTION-LAYER-V1: 실행 성공 시 자동 dismiss
      try {
        await dataSource.query(
          `INSERT INTO operator_action_dismissals (user_id, service_key, action_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, service_key, action_id) DO NOTHING`,
          [userId, config.serviceKey, actionId],
        );
      } catch { /* dismiss 실패는 무시 */ }

      res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error(`[${config.serviceKey} ActionExecute] Error:`, error);
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: error.message });
    }
  };

  if (executeGuard) {
    router.post('/actions/execute/:actionId', executeGuard, executeHandler);
  } else {
    router.post('/actions/execute/:actionId', executeHandler);
  }

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
