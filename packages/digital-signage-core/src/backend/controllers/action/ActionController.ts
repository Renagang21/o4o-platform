import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { ActionExecutionService } from '../../services/action/ActionExecutionService.js';
import {
  ExecuteActionDto,
  StopActionDto,
  PauseActionDto,
  ResumeActionDto,
} from '../../dto/index.js';

/**
 * ActionController
 *
 * Phase 4.5: Action execution API endpoints.
 *
 * Endpoints:
 * - POST /api/signage/actions/execute
 * - POST /api/signage/actions/:id/stop
 * - POST /api/signage/actions/:id/pause
 * - POST /api/signage/actions/:id/resume
 * - GET /api/signage/actions/slot-status/:slotId
 */
export function createActionController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ActionExecutionService(dataSource);

  /**
   * POST /api/signage/actions/execute
   * Execute an action on a display slot
   */
  router.post('/execute', async (req: Request, res: Response) => {
    try {
      const dto: ExecuteActionDto = req.body;

      // Basic validation
      if (!dto.organizationId || !dto.sourceAppId || !dto.mediaListId || !dto.displaySlotId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: organizationId, sourceAppId, mediaListId, displaySlotId',
        });
      }

      const result = await service.execute(dto);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/signage/actions/:id/stop
   * Stop an action
   */
  router.post('/:id/stop', async (req: Request, res: Response) => {
    try {
      const dto: StopActionDto = req.body;

      if (!dto.stoppedBy) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: stoppedBy',
        });
      }

      const result = await service.stop(req.params.id, dto);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/signage/actions/:id/pause
   * Pause an action
   */
  router.post('/:id/pause', async (req: Request, res: Response) => {
    try {
      const dto: PauseActionDto = req.body || {};

      const result = await service.pause(req.params.id, dto);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/signage/actions/:id/resume
   * Resume a paused action
   */
  router.post('/:id/resume', async (req: Request, res: Response) => {
    try {
      const dto: ResumeActionDto = req.body || {};

      const result = await service.resume(req.params.id, dto);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/signage/actions/slot-status/:slotId
   * Get current slot status
   */
  router.get('/slot-status/:slotId', async (req: Request, res: Response) => {
    try {
      const status = await service.getSlotStatus(req.params.slotId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/signage/actions/:id
   * Get action execution by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const execution = await service.findById(req.params.id);

      if (!execution) {
        return res.status(404).json({
          success: false,
          error: 'ActionExecution not found',
        });
      }

      res.json({
        success: true,
        data: execution,
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
