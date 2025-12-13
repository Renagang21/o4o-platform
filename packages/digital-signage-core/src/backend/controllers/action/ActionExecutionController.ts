import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { ActionExecutionService } from '../../services/action/ActionExecutionService.js';

/**
 * ActionExecutionController
 *
 * 액션 실행 조회 API (조회 전용)
 *
 * 주의: Work Order Phase 4-A 규칙에 따라
 * - list/get by id 조회만 제공
 * - create/update API 없음
 * - 생성/변경은 Phase 4.5에서 구현
 */
export function createActionExecutionController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ActionExecutionService(dataSource);

  /**
   * GET /api/signage/action-executions
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { organizationId, displayId, displaySlotId, status, limit, offset } = req.query;

      const result = await service.findList({
        organizationId: organizationId as string,
        displayId: displayId as string,
        displaySlotId: displaySlotId as string,
        status: status as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      res.json({
        success: true,
        data: result.items,
        total: result.total,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/signage/action-executions/by-display/:displayId
   */
  router.get('/by-display/:displayId', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const items = await service.findRecentByDisplayId(req.params.displayId, limit);

      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/signage/action-executions/by-slot/:displaySlotId
   */
  router.get('/by-slot/:displaySlotId', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const items = await service.findRecentBySlotId(req.params.displaySlotId, limit);

      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/signage/action-executions/:id
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const item = await service.findById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'ActionExecution not found',
        });
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
